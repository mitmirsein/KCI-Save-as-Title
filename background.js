// background.js --- 저널, 볼륨/페이지 정보 사용 ---

console.log("Background script loaded and running! (Extended Filename Mode)");

/**
 * 파일명 금지 문자 제거/변경 (기존 함수)
 * - 공백, 쉼표, 세미콜론을 '_'로 변경
 * - 저자, 저널, 볼륨/페이지 부분에 사용 가능
 */
function sanitizeFilenamePart(part, defaultName = 'unknown') {
  if (!part) { return defaultName; }
  let sanitized = part.replace(/[\/\\:*?"<>|]/g, '_'); // 금지문자 -> _
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  sanitized = sanitized.replace(/[,;]/g, '_'); // 쉼표, 세미콜론 -> _
  sanitized = sanitized.replace(/\s+/g, '_'); // 공백 -> _
  sanitized = sanitized.replace(/^_+|_+$/g, ''); // 앞뒤 _ 제거
  // 특정 부분 길이 제한은 여기서 하지 않음 (필요시 추가)
  if (!sanitized || sanitized === '.' || sanitized === '...') { return defaultName; }
  return sanitized;
}

/**
 * 제목 부분 정리 함수 (기존 함수 - 공백 유지)
 */
function sanitizeTitlePart(title) {
  if (!title) { return 'untitled_paper'; }
  let sanitized = title.replace(/[\/\\:*?"<>|]/g, ''); // 금지문자 제거
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  sanitized = sanitized.replace(/\s+/g, ' ').trim(); // 연속 공백 -> 단일 공백
  if (!sanitized || sanitized === '.') { return 'untitled_paper'; }
  if (sanitized.length > 100) { // 길이 제한 유지
      sanitized = sanitized.substring(0, 100) + '...';
  }
  return sanitized;
}

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  const downloadUrl = downloadItem.url;
  const referrerUrl = downloadItem.referrer;
  const finalUrl = downloadItem.finalUrl;

  const kciArticlePagePattern = /kci\.go\.kr\/kciportal\/ci\/sereArticleSearch\/ciSereArtiView\.kci/i;
  const kciPdfUrlPattern = /kci\.go\.kr\/kciportal\/co\/download\/popup\/poDownload\.kci/i; // 수정된 URL 패턴
  const containsFileIdPattern = /orteFileId=KCI_FI/i;

  console.log("[Background] onDeterminingFilename triggered.");
  // console.log("  > Final URL:", finalUrl); // 로그 간소화
  // console.log("  > PDF URL Pattern Test (Final URL):", kciPdfUrlPattern.test(finalUrl));

  // 조건 확인 (이전과 동일)
  if (referrerUrl && kciArticlePagePattern.test(referrerUrl) && kciPdfUrlPattern.test(finalUrl) && (containsFileIdPattern.test(downloadUrl) || containsFileIdPattern.test(finalUrl)) ) {
    console.log("[Background] KCI PDF download DETECTED based on finalUrl!");

    // 2. 로컬 저장소에서 모든 정보 가져오기 (비동기)
    // ★★★ 가져올 항목 추가: 'kciJournal', 'kciVolPage' ★★★
    chrome.storage.local.get(['kciPaperTitle', 'kciAuthors', 'kciJournal', 'kciVolPage'], (result) => {
      // 저장소 값 삭제
      chrome.storage.local.remove(['kciPaperTitle', 'kciAuthors', 'kciJournal', 'kciVolPage']);

      if (chrome.runtime.lastError) {
        console.error(`[Background] Error retrieving data from storage: ${chrome.runtime.lastError.message}`);
        suggest();
        return;
      }

      const paperTitle = result.kciPaperTitle;
      const authors = result.kciAuthors;
      const journal = result.kciJournal; // ★★★ 저널 정보 가져오기 ★★★
      const volPage = result.kciVolPage; // ★★★ 볼륨/페이지 정보 가져오기 ★★★

      if (paperTitle) { // 제목은 필수
        console.log("[Background] Retrieved data from storage:");
        console.log("  > Raw Title:", paperTitle);
        console.log("  > Raw Authors:", authors || "Not Found");
        console.log("  > Raw Journal:", journal || "Not Found"); // ★★★ 로그 추가 ★★★
        console.log("  > Raw Vol/Page:", volPage || "Not Found"); // ★★★ 로그 추가 ★★★

        // 3. 파일명 각 부분 정리
        const safeAuthors = sanitizeFilenamePart(authors, 'unknown_author'); // 저자 (공백->_)
        const cleanTitle = sanitizeTitlePart(paperTitle);                     // 제목 (공백 유지)
        const safeJournal = sanitizeFilenamePart(journal, 'unknown_journal'); // 저널 (공백->_)
        const safeVolPage = sanitizeFilenamePart(volPage, 'unknown_volpage'); // 볼륨/페이지 (공백,쉼표->_)

        console.log("  >> Sanitized Authors:", `"${safeAuthors}"`);
        console.log("  >> Cleaned Title:", `"${cleanTitle}"`);
        console.log("  >> Sanitized Journal:", `"${safeJournal}"`); // ★★★ 로그 추가 ★★★
        console.log("  >> Sanitized Vol/Page:", `"${safeVolPage}"`); // ★★★ 로그 추가 ★★★

        // 최종 파일명 조합 (저자_제목_저널_볼륨페이지.pdf)
        const newFilename = `${safeAuthors}_${cleanTitle}_${safeJournal}_${safeVolPage}.pdf`;
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        console.log("[Background] Suggesting new filename:", newFilename);
        suggest({ filename: newFilename, conflictAction: 'uniquify' });

      } else {
        console.warn("[Background] Paper title not found in storage. Using default filename.");
        suggest();
      }
    });
    return true; // 비동기 suggest

  } else {
    // console.log("[Background] Conditions not met for PDF download renaming. Ignoring.");
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("[KCI Save as Title] Extension installed or updated. (Extended Filename Mode)");
});