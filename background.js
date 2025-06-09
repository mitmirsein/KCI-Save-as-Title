// background.js

const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
let creatingOffscreenPromise = null;

/**
 * 주어진 정보로 시스템에 안전한 파일명을 생성합니다.
 * 파일명 길이 제한, 유효하지 않은 문자 제거/치환, 확장자 보존 기능을 포함합니다.
 * @param {object} info - { title, authors, journalName } 객체.
 * @param {string} extension - 파일 확장자 (예: 'pdf').
 * @param {number} [maxLength=150] - 파일명(확장자 제외)의 최대 바이트 길이에 가까운 문자열 길이.
 * @returns {string} - 안전하게 처리된 최종 파일명.
 */
function createSafeFilename(info, extension, maxLength = 150) {
    const { title = "제목없음", authors = "저자없음" } = info;

    // 1. 각 부분을 정제 (파일명에 부적합한 문자 _로 변경, 연속 공백/밑줄 단일화)
    const sanitize = (str) => str.replace(/[\\/:\*\?"<>|]/g, '_').replace(/[\s_]+/g, '_').trim();

    const cleanAuthors = sanitize(authors);
    const cleanTitle = sanitize(title);
    
    // 파일명 단축을 위해 학술지명은 기본적으로 제외. 필요시 아래 주석을 활성화하세요.
    // const { journalName = "학술지없음" } = info;
    // const cleanJournalName = sanitize(journalName);
    // let baseString = `${cleanAuthors}_${cleanTitle}_${cleanJournalName}`;
    let baseString = `${cleanAuthors}_${cleanTitle}`;

    // 2. 파일명 길이 제한 (maxLength는 바이트가 아닌 문자 수 기준이므로 여유롭게 설정)
    let truncatedString = baseString;
    if (truncatedString.length > maxLength) {
        truncatedString = truncatedString.substring(0, maxLength);
    }

    // 3. 마지막이 잘린 밑줄이거나, 시작/끝에 불필요한 밑줄 제거 및 연속 밑줄 정리
    let finalString = truncatedString.replace(/__+/g, '_').replace(/^_|_$/g, '');
    
    // 4. 모든 정보가 비어있거나 유효하지 않을 경우를 대비한 기본 파일명
    if (!finalString || finalString === "_" || finalString === "저자없음_제목없음") {
        return `KCI_다운로드_${new Date().getTime()}.${extension}`;
    }

    return `${finalString}.${extension}`;
}


async function hasOffscreenDocument() {
    if (chrome.offscreen && typeof chrome.offscreen.hasDocument === 'function') {
        return await chrome.offscreen.hasDocument();
    }
    const matchedClients = await clients.matchAll();
    const offscreenUrl = chrome.runtime.getURL(OFFSCREEN_DOCUMENT_PATH);
    for (const client of matchedClients) {
        if (client.url === offscreenUrl) {
            return true;
        }
    }
    return false;
}

async function setupOffscreenDocument() {
    if (await hasOffscreenDocument()) {
        return;
    }
    if (creatingOffscreenPromise) {
        await creatingOffscreenPromise;
        return;
    }

    creatingOffscreenPromise = chrome.offscreen.createDocument({
        url: OFFSCREEN_DOCUMENT_PATH,
        reasons: [chrome.offscreen.Reason.DOM_PARSER],
        justification: 'Parse HTML string to extract KCI article details.',
    });

    try {
        await creatingOffscreenPromise;
        console.log("[KCI Background] Offscreen document created successfully.");
    } catch (error) {
        console.error("[KCI Background] Error creating offscreen document:", error);
    } finally {
        creatingOffscreenPromise = null;
    }
}

async function parseHtmlViaOffscreen(artiId, htmlText) {
    await setupOffscreenDocument();

    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.error(`[KCI Background] Timeout waiting for offscreen response for ${artiId}`);
            chrome.runtime.onMessage.removeListener(listener);
            resolve(null);
        }, 5000);

        const listener = (message) => {
            if (message.type === 'parse-html-response' && message.artiId === artiId) {
                clearTimeout(timeout);
                chrome.runtime.onMessage.removeListener(listener);
                if (message.success) {
                    resolve(message.data);
                } else {
                    console.error(`[KCI Background] Offscreen parsing failed for ${artiId}:`, message.error);
                    resolve(null);
                }
            }
        };
        chrome.runtime.onMessage.addListener(listener);

        chrome.runtime.sendMessage({
            type: 'parse-html-for-kci',
            data: { htmlText, artiId }
        }).catch(error => {
            clearTimeout(timeout);
            chrome.runtime.onMessage.removeListener(listener);
            console.error(`[KCI Background] Error sending message to offscreen for ${artiId}:`, error);
            resolve(null);
        });
    });
}


chrome.downloads.onDeterminingFilename.addListener((item, suggest) => {
    let artiId = null;
    try {
        const urlObj = new URL(item.url);
        const params = new URLSearchParams(urlObj.search);
        artiId = params.get('sereArticleSearchBean.artiId') || params.get('artiId') || params.get('krFileNo') || params.get('fileDownSn');

        if (!artiId && item.filename) {
            if (item.filename.startsWith("KCI_FI")) {
                artiId = item.filename.split('.')[0];
            } else {
                const match = item.filename.match(/^(ART\d+)/);
                if (match) artiId = match[1];
            }
        }
    } catch (e) {
        // console.warn("[KCI Background] Could not parse URL/filename for artiId:", e.message);
    }

    if (artiId) {
        const currentArtiId = artiId;
        chrome.storage.local.get(currentArtiId, async (storedData) => {
            if (chrome.runtime.lastError) {
                console.error("[KCI Background] Error fetching from storage for", currentArtiId, ":", chrome.runtime.lastError.message);
            }

            let articleInfo = storedData ? storedData[currentArtiId] : null;

            if (!articleInfo) {
                const detailPageUrl = `https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=${currentArtiId}`;
                try {
                    const response = await fetch(detailPageUrl);
                    if (!response.ok) {
                        console.error(`[KCI Background] Failed to fetch detail page for ${currentArtiId}: ${response.status}`);
                        suggest({ conflictAction: 'uniquify' }); return;
                    }
                    const htmlText = await response.text();
                    articleInfo = await parseHtmlViaOffscreen(currentArtiId, htmlText);

                    if (articleInfo) {
                        const dataToStore = {};
                        dataToStore[currentArtiId] = { ...articleInfo, timestamp: new Date().getTime() };
                        chrome.storage.local.set(dataToStore, () => {
                            if (chrome.runtime.lastError) console.error("[KCI Background] Error saving fetched data for", currentArtiId, ":", chrome.runtime.lastError.message);
                        });
                    } else {
                        console.log(`[KCI Background] Failed to parse details for ${currentArtiId} via offscreen. Using default filename.`);
                        suggest({ conflictAction: 'uniquify' }); return;
                    }
                } catch (fetchError) {
                    console.error(`[KCI Background] Error fetching detail page for ${currentArtiId}:`, fetchError);
                    suggest({ conflictAction: 'uniquify' }); return;
                }
            }

            if (articleInfo) {
                // 새로 만든 함수를 호출하여 안전한 파일명을 한 번에 생성합니다.
                const newFilename = createSafeFilename(articleInfo, 'pdf', 150); // maxLength는 100~150 사이에서 조절

                console.log(`[KCI Background] Original Info: T='${articleInfo.title}', A='${articleInfo.authors}'`);
                console.log(`[KCI Background] Generated Safe Filename: ${newFilename}`);
                
                suggest({ filename: newFilename,
                          conflictAction: 'uniquify' 
                });
            } else {
                console.log(`[KCI Background] No article info available for ${currentArtiId}. Using default.`);
                suggest({ filename: `KCI_다운로드_${currentArtiId || '파일'}.pdf`, conflictAction: 'uniquify' });
            }
        });
        return true; // 비동기 작업을 위해 항상 true 반환
    } else {
        suggest(); // artiId가 없을 경우 기본 동작
    }
});