chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    // KCI PDF 다운로드 URL은 'po=common' 또는 'po=pdf' 등을 포함하는 경우가 많습니다.
    // 좀 더 확실하게 하려면 KCI 원문보기 팝업창의 URL 패턴을 확인해야 합니다.
    // 예: item.url.includes("pdfView.kci") 또는 item.url.includes("pdfDownload.kci") 등
    // 기존 로직은 item.url.includes("po=common")를 사용했으므로 이를 유지하거나 개선할 수 있습니다.
    if (item.url.includes("po=common") || item.filename.toLowerCase().endsWith(".pdf")) { // KCI PDF 다운로드 URL 특징 또는 일반 PDF
        chrome.scripting.executeScript({
            target: { tabId: item.tabId },
            func: () => {
                // 논문 제목 추출
                const titleElement = document.querySelector('.po_pop_tit h1');
                let title = titleElement ? titleElement.innerText.trim() : "제목없음";

                // 저자명 추출
                // 저자 정보는 .po_pop_tit .aut 내부에 여러 span 또는 a 태그로 나뉘어 있을 수 있습니다.
                // "홍길동, 김철수 외 2명" 같은 형태일 수 있으므로 "외 N명" 부분은 제거하는 것이 좋습니다.
                const authorContainer = document.querySelector('.po_pop_tit .aut');
                let authors = "저자없음";
                if (authorContainer) {
                    authors = Array.from(authorContainer.childNodes)
                        .map(node => node.textContent.trim())
                        .filter(text => text) // 빈 텍스트 노드 제거
                        .join(", ") // 쉼표와 공백으로 저자 구분 (예: "홍길동, 김철수")
                        .replace(/외\s*\d+명/gi, '') // "외 N명" 제거
                        .replace(/,\s*$/, '') // 맨 뒤에 남은 쉼표 제거
                        .trim();
                    if (!authors) authors = "저자없음"; // 모든 처리 후 비어있다면 기본값
                }
                
                // 학술지명 추출
                // 학술지명은 .po_pop_source 내부의 첫번째 span에 있거나, 그 안의 a 태그에 있을 가능성이 높습니다.
                let journalName = "학술지없음";
                const journalSourceElement = document.querySelector('.po_pop_source');
                if (journalSourceElement) {
                    const firstSpan = journalSourceElement.querySelector('span:first-of-type');
                    if (firstSpan) {
                        const linkInSpan = firstSpan.querySelector('a');
                        if (linkInSpan) {
                            journalName = linkInSpan.innerText.trim();
                        } else {
                            journalName = firstSpan.innerText.trim();
                            // 학술지명 뒤에 " Vol.XX No.Y, pp.111-222" 등이 붙는 경우가 있으므로,
                            // 순수 학술지명만 필요하다면 추가적인 정제 필요
                            // 예: journalName = journalName.split(' Vol.')[0].split(' 제')[0].trim();
                        }
                    }
                }

                return { title, authors, journalName };
            }
        }, (injectionResults) => {
            if (chrome.runtime.lastError) {
                console.error("KCI Filename Script Error:", chrome.runtime.lastError.message);
                suggest(); // 에러 발생 시 기본 파일명 사용
                return;
            }

            if (injectionResults && injectionResults[0] && injectionResults[0].result) {
                const { title, authors, journalName } = injectionResults[0].result;

                // 파일명으로 사용할 수 없는 문자 제거 및 공백 처리 함수
                const sanitizeFilename = (str) => {
                    if (!str) return "";
                    return str.replace(/[\\/:*?"<>|]/g, "_") // 불법 문자 '_'로 치환
                              .replace(/\s+/g, " ") // 여러 공백을 단일 공백으로
                              .trim(); 
                };
                
                const cleanAuthors = sanitizeFilename(authors);
                const cleanTitle = sanitizeFilename(title);
                const cleanJournalName = sanitizeFilename(journalName);

                let filename = `${cleanAuthors}_${cleanTitle}_${cleanJournalName}`;
                
                // 파일명 길이 제한 (OS 및 파일 시스템에 따라 다름, 예: 200자)
                // .pdf 확장자(4자)와 구분자 '_' (2자)를 고려하여 실제 내용 길이는 조금 더 짧게
                const maxLength = 240; 
                if (filename.length > maxLength) {
                    // 각 부분이 너무 길 경우를 대비해 균형있게 자르거나, 중요도에 따라 자를 수 있음
                    // 여기서는 단순하게 전체 길이를 자릅니다.
                    filename = filename.substring(0, maxLength);
                }
                
                // 마지막이 '_'로 끝나면 제거 (예: 정보 중 하나가 없을 때)
                filename = filename.replace(/_+$/, '').trim();

                if (!filename || filename === "_" || filename === "__") { // 모든 정보가 없거나 부적절한 경우
                    suggest({ filename: "KCI_다운로드.pdf" }); // 기본 대체 파일명
                } else {
                    suggest({ filename: `${filename}.pdf` });
                }
                
            } else {
                console.log("KCI Filename: 정보를 가져오지 못했습니다. 기본 파일명을 사용합니다.");
                suggest(); // 정보를 가져오지 못한 경우 기본 파일명 사용
            }
        });
        return true; // 비동기 응답을 위해 true 반환
    }
    suggest(); // KCI PDF가 아니거나 조건에 맞지 않으면 기본 파일명 사용
});