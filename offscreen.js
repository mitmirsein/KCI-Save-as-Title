// offscreen.js

function cleanAuthorName(authorText) {
    if (!authorText) return '';
    let cleanedAuthor = authorText
        .replace(/[_\s]*[A-Za-z\s,._]+[_\s]*/g, '')
        .replace(/^\s+|\s+$/g, '')
        .replace(/^[,_\s]+|[,_\s]+$/g, '');
    return cleanedAuthor;
}

function cleanTitle(titleText) {
    if (!titleText) return '';
    let cleanedTitle = titleText
        .replace(/\s*[-–—]\s*.*$/, '')
        .replace(/^\s+|\s+$/g, '');
    return cleanedTitle;
}

function getCleanInnerText(element) {
    if (!element) return "";
    let clone = element.cloneNode(true);
    clone.querySelectorAll('sup, script, style, [style*="display:none"], [style*="display: none"]').forEach(el => el.remove());
    return clone.innerText.trim();
}

function getCleanTextFromDocViaSelector(doc, selector) {
    const element = doc.querySelector(selector);
    if (!element) return "";
    if (element.tagName === 'META') return element.content.trim();
    return getCleanInnerText(element);
}


function extractAuthorsFromDoc(doc) {
    let authorsArray = [];
    const authorContainerSelectors = [
        'div.author', 'div.info_author ul', 'ul.authorList', 'p.author'
    ];

    let authorsFoundFromMainElements = false;

    for (const containerSel of authorContainerSelectors) {
        const containerElement = doc.querySelector(containerSel);
        if (containerElement) {
            const elements = containerElement.querySelectorAll('a, span');
            if (elements.length > 0) {
                authorsFoundFromMainElements = true;
                elements.forEach(el => {
                    let authorText = getCleanInnerText(el);
                    authorText = authorText.replace(/\s*\(.*?\)\s*/g, '').trim();
                    authorText = authorText.replace(/\d+$/, '').trim();
                    authorText = authorText.replace(/,$/, '').trim();
                    authorText = cleanAuthorName(authorText);
                    if (authorText.length >= 2 && /^[가-힣\s]+$/.test(authorText)) {
                        if (!authorsArray.includes(authorText)) {
                            authorsArray.push(authorText);
                        }
                    }
                });
            }
        }
    }

    if (authorsArray.length === 0) {
        const authorMetaTags = doc.querySelectorAll('meta[name="citation_author"]');
        if (authorMetaTags.length > 0) {
            authorMetaTags.forEach(tag => {
                let metaAuthorText = tag.content.trim().replace(/\s*\(.*?\)\s*/g, '').trim();
                metaAuthorText = cleanAuthorName(metaAuthorText);
                if (metaAuthorText.length >= 2 && /^[가-힣\s]+$/.test(metaAuthorText)) {
                     if (!authorsArray.includes(metaAuthorText)) authorsArray.push(metaAuthorText);
                }
            });
        }
    }

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
                        authorText = cleanAuthorName(authorText);
                        if (authorText.length > 0 && !authorsArray.includes(authorText)) {
                            authorsArray.push(authorText);
                        }
                    });
                }
            }
        }
    }

    if (authorsArray.length === 0) {
        const authorMetaTags = doc.querySelectorAll('meta[name="citation_author"]');
        authorMetaTags.forEach(tag => {
            let metaAuthorText = tag.content.trim().replace(/\s*\(.*?\)\s*/g, '').trim();
            metaAuthorText = cleanAuthorName(metaAuthorText);
            if (metaAuthorText.length > 0 && !authorsArray.includes(metaAuthorText)) {
                 authorsArray.push(metaAuthorText);
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
            const text = getCleanTextFromDocViaSelector(doc, selector);
            if (text && text.length > 0 && text !== "제목없음") {
                title = cleanTitle(text);
                break;
            }
        }

        const authors = extractAuthorsFromDoc(doc);

        let journalName = "학술지없음";
        const journalSelectors = [
            'p.jounal a', '.jounral_box .j_name > a', 'span.txt_pubName a', 
            'dd.journalInfo a', 'meta[name="citation_journal_title"]'
        ];
        for (const selector of journalSelectors) {
            let tempJournal = getCleanTextFromDocViaSelector(doc, selector);
            if (tempJournal && tempJournal.length > 0 && tempJournal !== "학술지없음") {
                journalName = tempJournal.split(/,|Vol\.|제\d+권|ISSN/)[0].trim();
                if (journalName && journalName.length > 0 && journalName !== "학술지없음") break;
            }
        }
        if (journalName.length === 0 || journalName === "학술지없음") {
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