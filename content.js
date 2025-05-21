// content.js
function getCleanText(element) {
    if (!element) return "";
    // 각주(sup), 숨겨진 요소(display:none) 등 제외하고 텍스트 추출 시도
    let clone = element.cloneNode(true);
    clone.querySelectorAll('sup, script, style, [style*="display:none"], [style*="display: none"]').forEach(el => el.remove());
    return clone.innerText.trim();
}

function extractAuthors(containerElement, isPopup = false) {
    let authorsArray = [];
    if (!containerElement) return "저자없음";

    // 다양한 저자 표시 형식을 포괄하는 선택자 (자식 요소들 순회)
    // 팝업과 상세 페이지의 저자 구조가 다를 수 있음에 유의
    const authorElements = isPopup ?
        Array.from(containerElement.childNodes) : // 팝업은 단순 childNodes 순회 시도
        containerElement.querySelectorAll('a, span'); // 상세는 a 또는 span 태그 우선

    authorElements.forEach(el => {
        let authorText = (el.nodeType === Node.TEXT_NODE ? el.textContent : getCleanText(el)).trim();
        if (authorText) {
            // 1. 괄호와 그 안의 내용 (영문명, 이메일 등) 제거
            authorText = authorText.replace(/\s*\(.*?\)\s*/g, '').trim();
            // 2. 숫자 각주 또는 마지막 숫자 제거
            authorText = authorText.replace(/\d+$/, '').trim();
            // 3. 이름 뒤에 붙는 쉼표 제거
            authorText = authorText.replace(/,$/, '').trim();
            // 4. 한글 이름인지 확인 (2자 이상)
            if (authorText.length >= 2 && /^[가-힣\s]+$/.test(authorText)) {
                if (!authorsArray.includes(authorText)) { // 중복 방지
                    authorsArray.push(authorText);
                }
            }
        }
    });

    // 한글 저자 못 찾았을 경우, 차선책으로 괄호 제거된 모든 이름 가져오기 (중복 제거)
    if (authorsArray.length === 0) {
        console.log("[KCI Content] No Korean authors found directly. Trying fallback for authors.");
        authorElements.forEach(el => {
            let authorText = (el.nodeType === Node.TEXT_NODE ? el.textContent : getCleanText(el)).trim();
            if (authorText) {
                authorText = authorText.replace(/\s*\(.*?\)\s*/g, '').trim();
                authorText = authorText.replace(/\d+$/, '').trim();
                authorText = authorText.replace(/,$/, '').trim();
                if (authorText.length > 0 && !authorsArray.includes(authorText)) {
                    authorsArray.push(authorText);
                }
            }
        });
    }

    if (authorsArray.length > 0) {
        return Array.from(new Set(authorsArray)).join(", ").replace(/외\s*\d+(명|인)/gi, '').replace(/,\s*$/, '').trim();
    }
    return "저자없음";
}


function extractArticleInfo() {
    let artiId = null;
    const urlParams = new URLSearchParams(window.location.search);
    artiId = urlParams.get('sereArticleSearchBean.artiId') || urlParams.get('artiId');
    if (!artiId && window.location.pathname.includes('ciSereArtiView.kci')) {
        const pathParts = window.location.pathname.split('/');
        const lastPart = pathParts[pathParts.length - 1];
        if (lastPart.startsWith("ART")) artiId = lastPart;
    }

    if (!artiId) {
        console.warn("[KCI Content] Could not extract artiId from page:", window.location.href);
        return;
    }
    console.log("[KCI Content] Attempting to extract info for artiId:", artiId);

    let title = "제목없음";
    let authors = "저자없음";
    let journalName = "학술지없음";

    // 1. 팝업창 스타일 정보 추출 시도 (CSS 선택자 정확성 매우 중요!)
    const popTitleElement = document.querySelector('.po_pop_tit h1');
    const popAuthorContainer = document.querySelector('.po_pop_tit .aut');
    const popJournalSourceElement = document.querySelector('.po_pop_source span:first-of-type'); // 좀 더 구체적으로

    if (popTitleElement && popAuthorContainer && popJournalSourceElement) {
        console.log("[KCI Content] Extracting from Popup Style Elements.");
        title = getCleanText(popTitleElement);
        authors = extractAuthors(popAuthorContainer, true); // isPopup = true
        let tempJournal = getCleanText(popJournalSourceElement.querySelector('a') || popJournalSourceElement);
        journalName = tempJournal.split(/,|Vol\.|제\d+권|ISSN/)[0].trim() || "학술지없음";
    } else {
        // 2. 상세 페이지 스타일 정보 추출 시도 (CSS 선택자 정확성 매우 중요!)
        console.log("[KCI Content] Extracting from Detail Page Style Elements.");
        const detailTitleElement = document.querySelector('#artiTitle') || document.querySelector('h3.title') || document.querySelector('div.view_title h2');
        const detailAuthorContainer = document.querySelector('div.author, div.info_author ul, ul.authorList, p.author'); // 여러 저자 컨테이너 후보
        const detailJournalElement = document.querySelector('p.jounal a, .jounral_box .j_name > a, span.txt_pubName a, dd.journalInfo a');

        if (detailTitleElement) {
            title = getCleanText(detailTitleElement);
        } else {
            const metaTitle = document.querySelector('meta[name="citation_title"]');
            if (metaTitle) title = metaTitle.content.trim();
        }

        if (detailAuthorContainer) {
            authors = extractAuthors(detailAuthorContainer, false); // isPopup = false
        }
        // 상세 페이지에서 요소로 저자 못 찾았으면 메타 태그 시도 (한글 우선)
        if (authors === "저자없음") {
            const authorMetaTags = document.querySelectorAll('meta[name="citation_author"]');
            let metaAuthorsArray = [];
            if (authorMetaTags.length > 0) {
                authorMetaTags.forEach(tag => {
                    let metaAuthorText = tag.content.trim().replace(/\s*\(.*?\)\s*/g, '').trim();
                    if (metaAuthorText.length >= 2 && /^[가-힣\s]+$/.test(metaAuthorText)) {
                        if (!metaAuthorsArray.includes(metaAuthorText)) metaAuthorsArray.push(metaAuthorText);
                    }
                });
                if (metaAuthorsArray.length === 0) { // 한글 메타 저자 없으면 모든 메타 저자(괄호 제거)
                     authorMetaTags.forEach(tag => {
                        let metaAuthorText = tag.content.trim().replace(/\s*\(.*?\)\s*/g, '').trim();
                        if (metaAuthorText.length > 0 && !metaAuthorsArray.includes(metaAuthorText)) metaAuthorsArray.push(metaAuthorText);
                     });
                }
            }
            if (metaAuthorsArray.length > 0) {
                authors = Array.from(new Set(metaAuthorsArray)).join(", ").replace(/외\s*\d+(명|인)/gi, '').replace(/,\s*$/, '').trim();
            }
        }


        if (detailJournalElement) {
            let tempJournal = getCleanText(detailJournalElement);
            journalName = tempJournal.split(/,|Vol\.|제\d+권|ISSN/)[0].trim() || "학술지없음";
        } else {
            const metaJournal = document.querySelector('meta[name="citation_journal_title"]');
            if (metaJournal) journalName = metaJournal.content.trim().split(/,|Vol\.|제\d+권|ISSN/)[0].trim() || "학술지없음";
        }
    }
    if (title.length === 0) title = "제목없음";
    if (authors.length === 0) authors = "저자없음";
    if (journalName.length === 0) journalName = "학술지없음";

    const articleData = { title, authors, journalName, timestamp: new Date().getTime() };

    if (articleData.title === "제목없음" && articleData.authors === "저자없음" && articleData.journalName === "학술지없음") {
        console.warn("[KCI Content] Failed to extract any meaningful data for artiId:", artiId);
        return;
    }

    const dataToStore = {};
    dataToStore[artiId] = articleData;
    chrome.storage.local.set(dataToStore, () => {
        if (chrome.runtime.lastError) {
            console.error("[KCI Content] Error saving data for", artiId, ":", chrome.runtime.lastError.message);
        } else {
            console.log("[KCI Content] Data saved for", artiId, ":", articleData);
        }
    });
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    setTimeout(extractArticleInfo, 1000); // 페이지가 완전히 그려질 시간을 좀 더 줌
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(extractArticleInfo, 1000);
    });
}