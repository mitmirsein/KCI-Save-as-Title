// content.js --- 저널, 볼륨/페이지 정보 추출 및 저장 추가 ---

console.log("[Content Script] KCI Save as Title script injected! Storing extended info on click.");

// 1. 논문 제목 추출 함수 (변경 없음)
function getPaperTitle() {
  const titleSelector = '#artiTitle';
  console.log(`[Content Script] Attempting to find title with selector: "${titleSelector}"`);
  const titleElement = document.querySelector(titleSelector);
  if (titleElement) {
    let title = titleElement.textContent.trim();
    console.log("[Content Script] Found title using ID:", title);
    return title;
  } else {
    console.warn("[Content Script] Title element not found with specific ID selector:", titleSelector);
    return null;
  }
}

// 1-1. 저자 정보 추출 함수 (변경 없음)
function getAuthors() {
  const authorSelector = 'div.author > a';
  console.log(`[Content Script] Attempting to find authors with selector: "${authorSelector}"`);
  const authorElements = document.querySelectorAll(authorSelector);
  if (authorElements && authorElements.length > 0) {
    const authorNames = Array.from(authorElements).map(el => {
      let fullText = el.textContent.trim();
      let nameOnly = fullText.split('/')[0].trim();
      nameOnly = nameOnly.replace(/\d+$/, '');
      return nameOnly;
    });
    const uniqueAuthorNames = [...new Set(authorNames)];
    const authorsString = uniqueAuthorNames.join(', ');
    console.log("[Content Script] Found and processed unique authors:", authorsString);
    return authorsString;
  } else {
    console.warn("[Content Script] Author elements not found with selector:", authorSelector);
    return null;
  }
}

// ★★★ 1-2. 저널 정보 추출 함수 추가 ★★★
function getJournalInfo() {
  const journalSelector = '.journalInfo p.jounal a';
  console.log(`[Content Script] Attempting to find journal name with selector: "${journalSelector}"`);
  const journalElement = document.querySelector(journalSelector);
  if (journalElement) {
    // a 태그 내부에 불필요한 공백이나 개행이 있을 수 있으므로 textContent 사용 후 trim
    const journalName = journalElement.textContent.trim();
    console.log("[Content Script] Found journal name:", journalName);
    return journalName;
  } else {
    console.warn("[Content Script] Journal name element not found with selector:", journalSelector);
    return null;
  }
}
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

// ★★★ 1-3. 볼륨/페이지 정보 추출 및 처리 함수 추가 ★★★
function getVolumePageInfo() {
  const volPageSelector = 'p.vol a';
  console.log(`[Content Script] Attempting to find volume/page info with selector: "${volPageSelector}"`);
  const volPageElement = document.querySelector(volPageSelector);
  if (volPageElement) {
    let fullText = volPageElement.textContent.trim();
    console.log("[Content Script] Found raw volume/page string:", fullText);
    // "(...pages)" 부분 제거
    let cleanedText = fullText.replace(/\s*\(\d+\s*pages\)/, '').trim();
    // 예시: "2024, vol., no.40, pp. 309-337"
    // 쉼표 뒤 공백을 제거하거나, 다른 구분자로 변경할 수 있음 (파일명 생성 시 처리)
    // 여기서는 일단 정리된 텍스트 그대로 반환
    console.log("[Content Script] Cleaned volume/page string:", cleanedText);
    return cleanedText;
  } else {
    console.warn("[Content Script] Volume/page element not found with selector:", volPageSelector);
    return null;
  }
}
// ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★


// 2. 다운로드 링크/버튼 찾고 이벤트 리스너 추가 함수 (저장 로직 수정)
function addDownloadListener() {
  const downloadTriggerSelector = "li.green > a[onclick*='fncDown']"; // 이전과 동일
  console.log(`[Content Script] Attempting to find download trigger with selector: "${downloadTriggerSelector}"`);
  const downloadTrigger = document.querySelector(downloadTriggerSelector);

  if (downloadTrigger) {
    console.log("[Content Script] Found download trigger element:", downloadTrigger);

    // --- 클릭 이벤트 리스너 로직 수정 (추가 정보 저장) ---
    downloadTrigger.addEventListener('click', (event) => {
      console.log("[Content Script] Download trigger clicked!");
      // event.preventDefault(); // 기본 동작 허용

      const paperTitle = getPaperTitle();
      const authors = getAuthors();
      const journalInfo = getJournalInfo(); // ★★★ 저널 정보 가져오기 ★★★
      const volumePageInfo = getVolumePageInfo(); // ★★★ 볼륨/페이지 정보 가져오기 ★★★

      if (paperTitle) { // 제목은 필수
        console.log("[Content Script] Storing extended paper info to local storage.");
        console.log("  > Title:", paperTitle);
        console.log("  > Authors:", authors || "Not Found");
        console.log("  > Journal:", journalInfo || "Not Found"); // ★★★ 로그 추가 ★★★
        console.log("  > Vol/Page:", volumePageInfo || "Not Found"); // ★★★ 로그 추가 ★★★

        // ★★★ 모든 정보를 함께 저장 ★★★
        chrome.storage.local.set({
          kciPaperTitle: paperTitle,
          kciAuthors: authors,
          kciJournal: journalInfo, // 저널 정보 저장
          kciVolPage: volumePageInfo // 볼륨/페이지 정보 저장
        }, () => {
          if (chrome.runtime.lastError) {
            console.error(`[Content Script] Error saving data to storage: ${chrome.runtime.lastError.message}`);
          } else {
            console.log("[Content Script] Extended info saved to storage successfully.");
          }
        });
        // ★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★★

      } else {
        console.error("[Content Script] Could not get paper title at click time. Cannot save data.");
      }
    });

  } else {
    console.warn("[Content Script] Download trigger element not found with selector:", downloadTriggerSelector);
  }
}

// --- 실행 지연 시간 유지 (1.5초) ---
console.log("[Content Script] Waiting 1500ms before searching for elements...");
setTimeout(() => {
  console.log("[Content Script] Executing element search and listener attachment after extended timeout.");
  // 페이지 로드 시 모든 정보 미리 한번 찾아봄 (선택사항)
  getPaperTitle();
  getAuthors();
  getJournalInfo();
  getVolumePageInfo();
  addDownloadListener();
}, 1500);
// --- ★★★★★★★★★★★★★★★★★★★★★★ ---