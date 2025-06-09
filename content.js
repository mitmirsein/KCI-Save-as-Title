// content.js
function getCleanText(element) {
    if (!element) return "";
    // 각주(sup), 숨겨진 요소(display:none) 등 제외하고 텍스트 추출 시도
    let clone = element.cloneNode(true);
    clone.querySelectorAll('sup, script, style, [style*="display:none"], [style*="display: none"]').forEach(el => el.remove());
    return clone.innerText.trim();
}

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

function extractAuthors(containerElement, isPopup = false) {
    let authorsArray = [];
    if (!containerElement) return "저자없음";

    const authorElements = isPopup ?
        Array.from(containerElement.childNodes) :
        containerElement.querySelectorAll('a, span');

    authorElements.forEach(el => {
        let authorText = (el.nodeType === Node.TEXT_NODE ? el.textContent : getCleanText(el)).trim();
        if (authorText) {
            authorText = authorText.replace(/\s*\(.*?\)\s*/g, '').trim();
            authorText = authorText.replace(/\d+$/, '').trim();
            authorText = authorText.replace(/,$/, '').trim();
            authorText = cleanAuthorName(authorText);
            if (authorText.length >= 2 && /^[가-힣\s]+$/.test(authorText)) {
                if (!authorsArray.includes(authorText)) {
                    authorsArray.push(authorText);
                }
            }
        }
    });

    if (authorsArray.length === 0) {
        console.log("[KCI Content] No Korean authors found directly. Trying fallback for authors.");
        authorElements.forEach(el => {
            let authorText = (el.nodeType === Node.TEXT_NODE ? el.textContent : getCleanText(el)).trim();
            if (authorText) {
                authorText = authorText.replace(/\s*\(.*?\)\s*/g, '').trim();
                authorText = authorText.replace(/\d+$/, '').trim();
                authorText = authorText.replace(/,$/, '').trim();
                authorText = cleanAuthorName(authorText);
                if (authorText.length > 0 && !authorsArray.includes(authorText)) {
                    authorsArray.push(authorText);
                }
            }
        });
    }

    if (authorsArray.length > 0) {
        const uniqueAuthors = Array.from(new Set(authorsArray));
        let finalAuthorsString;
        
        // 저자가 2명 이상이면 '저자1 외' 형식으로 축약
        if (uniqueAuthors.length > 1) {
            finalAuthorsString = `${uniqueAuthors[0]} 외`;
        } else {
            finalAuthorsString = uniqueAuthors[0];
        }

        // '홍길동 외 외' 같은 중복 '외' 제거 및 후처리
        return finalAuthorsString.replace(/외\s*\d*(명|인)?/gi, '외').replace(/,\s*$/, '').trim();
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

    const popTitleElement = document.querySelector('.po_pop_tit h1');
    const popAuthorContainer = document.querySelector('.po_pop_tit .aut');
    const popJournalSourceElement = document.querySelector('.po_pop_source span:first-of-type');

    if (popTitleElement && popAuthorContainer && popJournalSourceElement) {
        console.log("[KCI Content] Extracting from Popup Style Elements.");
        title = cleanTitle(getCleanText(popTitleElement));
        authors = extractAuthors(popAuthorContainer, true);
        let tempJournal = getCleanText(popJournalSourceElement.querySelector('a') || popJournalSourceElement);
        journalName = tempJournal.split(/,|Vol\.|제\d+권|ISSN/)[0].trim() || "학술지없음";
    } else {
        console.log("[KCI Content] Extracting from Detail Page Style Elements.");
        const detailTitleElement = document.querySelector('#artiTitle') || document.querySelector('h3.title') || document.querySelector('div.view_title h2');
        const detailAuthorContainer = document.querySelector('div.author, div.info_author ul, ul.authorList, p.author');
        const detailJournalElement = document.querySelector('p.jounal a, .jounral_box .j_name > a, span.txt_pubName a, dd.journalInfo a');

        if (detailTitleElement) {
            title = cleanTitle(getCleanText(detailTitleElement));
        } else {
            const metaTitle = document.querySelector('meta[name="citation_title"]');
            if (metaTitle) title = cleanTitle(metaTitle.content.trim());
        }

        if (detailAuthorContainer) {
            authors = extractAuthors(detailAuthorContainer, false);
        }
        if (authors === "저자없음") {
            const authorMetaTags = document.querySelectorAll('meta[name="citation_author"]');
            let metaAuthorsArray = [];
            if (authorMetaTags.length > 0) {
                authorMetaTags.forEach(tag => {
                    let metaAuthorText = tag.content.trim().replace(/\s*\(.*?\)\s*/g, '').trim();
                    metaAuthorText = cleanAuthorName(metaAuthorText);
                    if (metaAuthorText.length >= 2 && /^[가-힣\s]+$/.test(metaAuthorText)) {
                        if (!metaAuthorsArray.includes(metaAuthorText)) metaAuthorsArray.push(metaAuthorText);
                    }
                });
                if (metaAuthorsArray.length === 0) {
                     authorMetaTags.forEach(tag => {
                        let metaAuthorText = tag.content.trim().replace(/\s*\(.*?\)\s*/g, '').trim();
                        metaAuthorText = cleanAuthorName(metaAuthorText);
                        if (metaAuthorText.length > 0 && !metaAuthorsArray.includes(metaAuthorText)) metaAuthorsArray.push(metaAuthorText);
                     });
                }
            }
            if (metaAuthorsArray.length > 0) {
                // 이 부분에도 저자 축약 로직 적용
                if (metaAuthorsArray.length > 1) {
                    authors = `${metaAuthorsArray[0]} 외`;
                } else {
                    authors = metaAuthorsArray[0];
                }
                authors = authors.replace(/외\s*\d*(명|인)?/gi, '외').replace(/,\s*$/, '').trim();
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
    setTimeout(extractArticleInfo, 1000);
} else {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(extractArticleInfo, 1000);
    });
}