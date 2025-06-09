// offscreen.js

// 영문명 제거 함수 추가
function cleanAuthorName(authorText) {
    if (!authorText) return '';
    
    // 영문명 제거: 언더스코어나 공백으로 구분된 영문 부분 제거
    let cleanedAuthor = authorText
        .replace(/[_\s]*[A-Za-z\s,._]+[_\s]*/g, '') // 영문 부분 제거
        .replace(/^\s+|\s+$/g, '') // 앞뒤 공백 제거
        .replace(/^[,_\s]+|[,_\s]+$/g, ''); // 앞뒤 구분자 제거
    
    return cleanedAuthor;
}

// 부제 제거 함수 추가
function cleanTitle(titleText) {
    if (!titleText) return '';
    
    // 부제 제거: 하이픈으로 시작하는 부분 제거
    let cleanedTitle = titleText
        .replace(/\s*[-–—]\s*.*$/, '') // 하이픈 이후 모든 내용 제거
        .replace(/^\s+|\s+$/g, ''); // 앞뒤 공백 제거
    
    return cleanedTitle;
}

// 헬퍼 함수: 요소에서 실제 텍스트만 추출 (sup 등 불필요한 태그 제거)
function getCleanInnerText(element) {
    if (!element) return "";
    let clone = element.cloneNode(true);
    // 제거할 태그들 (필요에 따라 추가)
    clone.querySelectorAll('sup, script, style, [style*="display:none"], [style*="display: none"]').forEach(el => el.remove());
    return clone.innerText.trim();
}

// 헬퍼 함수: 선택자로 요소를 찾아 텍스트 추출 (주로 단일 요소 대상)
function getCleanTextFromDocViaSelector(doc, selector) {
    const element = doc.querySelector(selector);
    if (!element) return "";
    if (element.tagName === 'META') return element.content.trim(); // 메타 태그는 content 사용
    return getCleanInnerText(element); // 일반 요소는 getCleanInnerText 사용
}


function extractAuthorsFromDoc(doc) {
    let authorsArray = [];
    // KCI 상세 페이지의 다양한 저자 컨테이너 선택자
    const authorContainerSelectors = [
        'div.author',             // 일반적인 저자 정보 div
        'div.info_author ul',     // 다른 저자 정보 ul
        'ul.authorList',          // 또 다른 저자 목록 ul
        'p.author'                // 단락으로 된 저자 정보
    ];

    let authorsFoundFromMainElements = false;

    // 1. 페이지 요소에서 한글 저자 우선 추출
    for (const containerSel of authorContainerSelectors) {
        const containerElement = doc.querySelector(containerSel);
        if (containerElement) {
            // 컨테이너 하위의 모든 a, span 태그를 대상으로 함 (가장 일반적인 경우)
            // 실제 KCI 구조에 따라 더 구체적인 선택자로 변경될 수 있음 (예: 'li > a', 'li > span')
            const elements = containerElement.querySelectorAll('a, span');
            
            if (elements.length > 0) {
                authorsFoundFromMainElements = true; // 요소를 찾았음을 표시
                elements.forEach(el => {
                    let authorText = getCleanInnerText(el); // 개별 요소에 대해 텍스트 정제

                    authorText = authorText.replace(/\s*\(.*?\)\s*/g, '').trim(); // 괄호 안 내용 제거
                    authorText = authorText.replace(/\d+$/, '').trim();          // 끝 숫자(각주 등) 제거
                    authorText = authorText.replace(/,$/, '').trim();            // 끝 쉼표 제거
                    // 영문명 제거 적용
                    authorText = cleanAuthorName(authorText);
                    if (authorText.length >= 2 && /^[가-힣\s]+$/.test(authorText)) { // 한글 이름 (2자 이상)
                        if (!authorsArray.includes(authorText)) {
                            authorsArray.push(authorText);
                        }
                    }
                });
            }
        }
    }

    // 한글 저자 못 찾았을 때 메타 태그 시도
    if (authorsArray.length === 0) {
        const authorMetaTags = doc.querySelectorAll('meta[name="citation_author"]');
        if (authorMetaTags.length > 0) {
            authorMetaTags.forEach(tag => {
                let metaAuthorText = tag.content.trim().replace(/\s*\(.*?\)\s*/g, '').trim();
                // 영문명 제거 적용
                metaAuthorText = cleanAuthorName(metaAuthorText);
                if (metaAuthorText.length >= 2 && /^[가-힣\s]+$/.test(metaAuthorText)) { // 한글 이름
                     if (!authorsArray.includes(metaAuthorText)) authorsArray.push(metaAuthorText);
                }
            });
        }
    }

    // 그래도 저자 못 찾았으면, 이전에 요소를 찾았던 곳에서(authorsFoundFromMainElements) 괄호 제거된 모든 이름 시도 (차선책)
    if (authorsArray.length === 0 && authorsFoundFromMainElements) {
        console.log("[KCI Offscreen] No Korean authors found. Trying fallback for authors from main elements.");
        for (const containerSel of authorContainerSelectors) {
            const containerElement = doc.querySelector(containerSel);
            if (containerElement) {
                const elements = containerElement.querySelectorAll('a, span');
                 if (elements.length > 0) {
                    elements.forEach(el => {
                        let authorText = getCleanInnerText(el);
                        authorText = authorText.replace(/\s*\(.*?\)\s*/g, '').trim();
                        authorText = authorText.replace(/\d+$/, '').trim();
                        authorText = authorText.replace(/,$/, '').trim();
                        // 영문명 제거 적용
                        authorText = cleanAuthorName(authorText);
                        if (authorText.length > 0 && !authorsArray.includes(authorText)) { // 어떤 이름이든 추가
                            authorsArray.push(authorText);
                        }
                    });
                }
            }
        }
    }
    // 최후의 메타 (괄호 제거된 모든 이름)
    if (authorsArray.length === 0) {
        const authorMetaTags = doc.querySelectorAll('meta[name="citation_author"]');
        authorMetaTags.forEach(tag => {
            let metaAuthorText = tag.content.trim().replace(/\s*\(.*?\)\s*/g, '').trim();
            // 영문명 제거 적용
            metaAuthorText = cleanAuthorName(metaAuthorText);
            if (metaAuthorText.length > 0 && !authorsArray.includes(metaAuthorText)) {
                 authorsArray.push(metaAuthorText);
            }
        });
    }


    if (authorsArray.length > 0) {
        return Array.from(new Set(authorsArray)).join(", ").replace(/외\s*\d+(명|인)/gi, '').replace(/,\s*$/, '').trim();
    }
    return "저자없음";
}


chrome.runtime.onMessage.addListener(async (message) => {
    if (message.type !== 'parse-html-for-kci') {
        return;
    }
    console.log("[KCI Offscreen] Received message to parse HTML for artiId:", message.data?.artiId);

    try {
        const { htmlText, artiId } = message.data;
        if (!htmlText || !artiId) {
            throw new Error("Offscreen: htmlText or artiId missing in message data.");
        }

        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlText, "text/html");

        let title = "제목없음";
        const titleSelectors = ['#artiTitle', 'h3.title', 'div.view_title h2', 'meta[name="citation_title"]'];
        for (const selector of titleSelectors) {
            const text = getCleanTextFromDocViaSelector(doc, selector); // 수정된 헬퍼 함수 사용
            if (text && text.length > 0 && text !== "제목없음") { // 유효한 텍스트인지 확인
                title = cleanTitle(text); // 부제 제거 적용
                break;
            }
        }

        const authors = extractAuthorsFromDoc(doc);

        let journalName = "학술지없음";
        const journalSelectors = [
            'p.jounal a',
            '.jounral_box .j_name > a',
            'span.txt_pubName a',
            'dd.journalInfo a', // 상세 페이지 내 다른 학술지 위치
            'meta[name="citation_journal_title"]'
        ];
        for (const selector of journalSelectors) {
            let tempJournal = getCleanTextFromDocViaSelector(doc, selector); // 수정된 헬퍼 함수 사용
            if (tempJournal && tempJournal.length > 0 && tempJournal !== "학술지없음") { // 유효한 텍스트인지 확인
                journalName = tempJournal.split(/,|Vol\.|제\d+권|ISSN/)[0].trim();
                if (journalName && journalName.length > 0 && journalName !== "학술지없음") break; // 정제 후에도 유효하면 사용
            }
        }
        if (journalName.length === 0 || journalName === "학술지없음") { // 모든 선택자에서 못 찾았거나, 정제 후 비었으면 기본값
            journalName = "학술지없음";
        }


        if (title === "제목없음" && authors === "저자없음" && journalName === "학술지없음") {
            console.warn("[KCI Offscreen] Failed to parse any meaningful details from HTML for artiId:", artiId);
            chrome.runtime.sendMessage({ type: 'parse-html-response', success: false, artiId: artiId, error: 'Offscreen: Could not parse any details.' });
        } else {
            console.log("[KCI Offscreen] Parsed data for", artiId, ":", { title, authors, journalName });
            chrome.runtime.sendMessage({ type: 'parse-html-response', success: true, artiId: artiId, data: { title, authors, journalName } });
        }
    } catch (e) {
        console.error("[KCI Offscreen] Error processing message:", e);
        chrome.runtime.sendMessage({ type: 'parse-html-response', success: false, artiId: message.data?.artiId, error: `Offscreen error: ${e.toString()}` });
    }
});