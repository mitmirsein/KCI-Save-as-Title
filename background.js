// background.js
const OFFSCREEN_DOCUMENT_PATH = 'offscreen.html';
let creatingOffscreenPromise = null;

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
        // console.log("[KCI Background] Offscreen document already exists.");
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
        }, 5000); // 5초 타임아웃

        const listener = (message) => {
            if (message.type === 'parse-html-response' && message.artiId === artiId) {
                clearTimeout(timeout);
                chrome.runtime.onMessage.removeListener(listener);
                if (message.success) {
                    // console.log(`[KCI Background] Parsed via offscreen for ${artiId}:`, message.data);
                    resolve(message.data);
                } else {
                    console.error(`[KCI Background] Offscreen parsing failed for ${artiId}:`, message.error);
                    resolve(null);
                }
            }
        };
        chrome.runtime.onMessage.addListener(listener);

        // console.log(`[KCI Background] Sending HTML to offscreen for parsing, artiId: ${artiId}`);
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
    // console.log("[KCI Background] onDeterminingFilename. URL:", item.url, "Filename:", item.filename);

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

    // console.log(`[KCI Background] Extracted artiId: ${artiId}`);

    if (artiId) {
        const currentArtiId = artiId;
        chrome.storage.local.get(currentArtiId, async (storedData) => {
            if (chrome.runtime.lastError) {
                console.error("[KCI Background] Error fetching from storage for", currentArtiId, ":", chrome.runtime.lastError.message);
            }

            let articleInfo = storedData ? storedData[currentArtiId] : null;
            let infoSource = "storage";

            if (articleInfo) {
                // console.log(`[KCI Background] Data found in storage for ${currentArtiId}.`);
            } else {
                // console.log(`[KCI Background] No data in storage for ${currentArtiId}. Fetching...`);
                const detailPageUrl = `https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?sereArticleSearchBean.artiId=${currentArtiId}`;
                try {
                    const response = await fetch(detailPageUrl);
                    if (!response.ok) {
                        console.error(`[KCI Background] Failed to fetch detail page for ${currentArtiId}: ${response.status}`);
                        suggest(); return;
                    }
                    const htmlText = await response.text();
                    articleInfo = await parseHtmlViaOffscreen(currentArtiId, htmlText);
                    infoSource = "fetch_offscreen";

                    if (articleInfo) {
                        const dataToStore = {};
                        dataToStore[currentArtiId] = { ...articleInfo, timestamp: new Date().getTime() };
                        chrome.storage.local.set(dataToStore, () => {
                            if (chrome.runtime.lastError) console.error("[KCI Background] Error saving fetched data for", currentArtiId, ":", chrome.runtime.lastError.message);
                            // else console.log(`[KCI Background] Fetched data for ${currentArtiId} saved to storage.`);
                        });
                    } else {
                        console.log(`[KCI Background] Failed to parse details for ${currentArtiId} via offscreen. Using default filename.`);
                        suggest(); return;
                    }
                } catch (fetchError) {
                    console.error(`[KCI Background] Error fetching detail page for ${currentArtiId}:`, fetchError);
                    suggest(); return;
                }
            }

            if (articleInfo) {
                const { title, authors, journalName } = articleInfo;
                // console.log(`[KCI Background] Using info (source: ${infoSource}) for ${currentArtiId}: T='${title}', A='${authors}', J='${journalName}'`);

                const sanitizeFilename = (str) => str ? str.replace(/[\\/:*?"<>|]/g, "_").replace(/\s+/g, "_").trim() : ""; // 공백도 밑줄로

                const cleanAuthors = sanitizeFilename(authors);
                const cleanTitle = sanitizeFilename(title);
                const cleanJournalName = sanitizeFilename(journalName);

                let filename = `${cleanAuthors}_${cleanTitle}_${cleanJournalName}`;
                const maxLength = 200; // 파일명 길이 조금 더 줄임
                if (filename.length > maxLength) filename = filename.substring(0, maxLength);
                filename = filename.replace(/_+$/, '').replace(/^_+/, '').replace(/__+/g, '_').trim();

                if (!filename || filename === "_" || (cleanAuthors === "저자없음" && cleanTitle === "제목없음" && cleanJournalName === "학술지없음")) {
                    suggest({ filename: `KCI_다운로드_${currentArtiId || '파일'}.pdf` });
                } else {
                    suggest({ filename: `${filename}.pdf` });
                }
            } else {
                // console.log(`[KCI Background] No article info available for ${currentArtiId}. Using default filename.`);
                suggest();
            }
        });
        return true;
    } else {
        // console.log("[KCI Background] Could not extract artiId. Using default filename.");
        suggest();
    }
});