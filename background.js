// background.js --- 볼륨/페이지 부분 포맷 유지 ---

console.log("Background script loaded and running! (Preserve Vol/Page Formatting Mode)");

/**
 * 파일명 부분 정리 함수 (공백, 쉼표 등을 '_'로 변경)
 * - 저자, 저널명 처리에 사용
 */
function sanitizeFilenamePart(part, defaultName = 'unknown') {
  if (!part) { return defaultName; }
  let sanitized = part.replace(/[\/\\:*?"<>|]/g, '_'); // 금지문자 -> _
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  sanitized = sanitized.replace(/[,;]/g, '_');       // 쉼표, 세미콜론 -> _
  sanitized = sanitized.replace(/\s+/g, '_');         // 공백 -> _
  sanitized = sanitized.replace(/^_+|_+$/g, '');     // 앞뒤 _ 제거
  if (!sanitized || sanitized === '.' || sanitized === '...') { return defaultName; }
  return sanitized;
}

/**
 * ★★★ 포맷(공백, 쉼표, 마침표 등) 유지하며 정리하는 함수 (이름 변경 및 수정) ★★★
 * - 제목, 볼륨/페이지 정보 처리에 사용
 * - 파일명 금지 문자만 제거
 */
function sanitizePreservingFormatting(text, defaultName = 'unknown_part', maxLength = 100) {
  if (!text) { return defaultName; }
  let sanitized = text.replace(/[\/\\:*?"<>|]/g, ''); // 금지문자 제거
  sanitized = sanitized.replace(/[\x00-\x1F\x7F]/g, '');
  // 마침표(.)와 쉼표(,)는 유지하고, 연속 공백만 단일 공백으로 변경
  sanitized = sanitized.replace(/\s+/g, ' ').trim();
  if (!sanitized || sanitized === '.') { return defaultName; }
  // 길이 제한 (기본 100자, 필요시 호출 시 변경 가능)
  if (maxLength > 0 && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength) + '...';
  }
  return sanitized;
}
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

chrome.downloads.onDeterminingFilename.addListener((downloadItem, suggest) => {
  const downloadUrl = downloadItem.url;
  const referrerUrl = downloadItem.referrer;
  const finalUrl = downloadItem.finalUrl;

  const kciArticlePagePattern = /kci\.go\.kr\/kciportal\/ci\/sereArticleSearch\/ciSereArtiView\.kci/i;
  const kciPdfUrlPattern = /kci\.go\.kr\/kciportal\/co\/download\/popup\/poDownload\.kci/i;
  const containsFileIdPattern = /orteFileId=KCI_FI/i;

  // console.log("[Background] onDeterminingFilename triggered."); // 로그 간소화

  if (referrerUrl && kciArticlePagePattern.test(referrerUrl) && kciPdfUrlPattern.test(finalUrl) && (containsFileIdPattern.test(downloadUrl) || containsFileIdPattern.test(finalUrl)) ) {
    console.log("[Background] KCI PDF download DETECTED based on finalUrl!");

    chrome.storage.local.get(['kciPaperTitle', 'kciAuthors', 'kciJournal', 'kciVolPage'], (result) => {
      chrome.storage.local.remove(['kciPaperTitle', 'kciAuthors', 'kciJournal', 'kciVolPage']);

      if (chrome.runtime.lastError) {
        console.error(`[Background] Error retrieving data from storage: ${chrome.runtime.lastError.message}`);
        suggest();
        return;
      }

      const paperTitle = result.kciPaperTitle;
      const authors = result.kciAuthors;
      const journal = result.kciJournal;
      const volPage = result.kciVolPage;

      if (paperTitle) {
        console.log("[Background] Retrieved data from storage (Raw):");
        console.log("  >", paperTitle, authors, journal, volPage);

        // 3. 파일명 각 부분 정리
        const safeAuthors = sanitizeFilenamePart(authors, 'unknown_author');         // 저자 (공백->_)
        const cleanTitle = sanitizePreservingFormatting(paperTitle, 'untitled_paper', 100); // 제목 (공백유지, 100자 제한)
        const safeJournal = sanitizeFilenamePart(journal, 'unknown_journal');         // 저널 (공백->_)
        // ★★★ 볼륨/페이지 정보 처리 시 sanitizePreservingFormatting 사용 ★★★
        const cleanVolPage = sanitizePreservingFormatting(volPage, 'unknown_volpage', 0); // 볼륨/페이지 (공백/쉼표/마침표 유지, 길이 제한 없음(0))
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

        console.log("  >> Sanitized Authors:", `"${safeAuthors}"`);
        console.log("  >> Cleaned Title:", `"${cleanTitle}"`);
        console.log("  >> Sanitized Journal:", `"${safeJournal}"`);
        console.log("  >> Cleaned Vol/Page:", `"${cleanVolPage}"`); // ★★★ 변수명 변경 및 로그 추가 ★★★

        // 최종 파일명 조합
        // ★★★ 변수명 cleanVolPage 사용 ★★★
        const newFilename = `${safeAuthors}_${cleanTitle}_${safeJournal}_${cleanVolPage}.pdf`;

        // 길이 제한 로직은 일단 제거 (필요하다면 이전 버전처럼 다시 추가 가능)
        console.log("[Background] Suggesting final filename:", newFilename);
        suggest({ filename: newFilename, conflictAction: 'uniquify' });

      } else {
        console.warn("[Background] Paper title not found in storage. Using default filename.");
        suggest();
      }
    });
    return true; // 비동기 suggest

  } else {
    // console.log("[Background] Conditions not met. Ignoring.");
  }
});

chrome.runtime.onInstalled.addListener(() => {
  console.log("[KCI Save as Title] Extension installed or updated. (Preserve Vol/Page Formatting Mode)");
});
