# KCI Save as Title (KCI 논문 제목으로 저장)

Chrome extension to automatically download KCI (Korea Citation Index) papers using a detailed filename format: `Author(s)_Paper Title_Journal Name_VolumeIssuePageInfo.pdf`, instead of the default numeric ID.

KCI(한국학술지인용색인) 논문을 다운로드할 때, 기본 숫자 파일명 대신 `저자명_논문제목_저널명_볼륨호페이지정보.pdf` 형식의 상세한 파일명으로 **자동 저장**해주는 크롬 확장 프로그램입니다.

## Features
*   Automatically renames downloaded KCI PDFs to a detailed format: `Author(s)_Paper Title_Journal Name_VolumeIssuePageInfo.pdf`.
*   Extracts author(s), paper title, journal name, year, volume, issue, and page information from the KCI details page.
*   Works seamlessly in the background when you click the standard KCI download link.
*   No more cryptic numeric filenames (e.g., `KCI_FI00...pdf`)!

## 특징
*   KCI에서 다운로드하는 PDF 파일명을 `저자명_논문제목_저널명_볼륨호페이지정보.pdf` 형식으로 자동 변경합니다.
*   논문 상세 페이지에서 저자, 제목, 학술지명, 발행연도, 볼륨, 호, 페이지 정보를 추출합니다.
*   KCI 논문 상세 페이지의 '원문보기' 또는 '다운로드' 링크를 클릭하면 백그라운드에서 자동으로 작동합니다.
*   더 이상 알아보기 힘든 숫자 파일명(예: `KCI_FI00...pdf`)은 그만!

## How to Use (Installation / 설치 방법)
(En)
1.  Download this repository as a ZIP file and unzip it. (Or clone the repository).
2.  Open `chrome://extensions` in your Chrome browser.
3.  Enable "Developer mode" (usually a toggle in the top right corner).
4.  Click "Load unpacked" and select the folder containing the extension files (where `manifest.json` is located, e.g., the `KCI-Save-as-Title` folder).

(Ko)
1.  이 저장소(repository)를 ZIP 파일로 다운로드하고 압축을 해제합니다. (또는 저장소를 clone 합니다).
2.  크롬 브라우저에서 `chrome://extensions` 주소로 접속합니다.
3.  "개발자 모드"를 활성화합니다 (보통 우측 상단에 토글 스위치가 있습니다).
4.  "압축 해제된 확장 프로그램을 로드합니다." 버튼을 클릭하고, 확장 프로그램 파일들이 있는 폴더(manifest.json 파일이 있는 폴더, 예: `KCI-Save-as-Title` 폴더)를 선택합니다.

## How to Use (Usage / 사용 방법)
(En)
1.  Go to any KCI paper details page (e.g., `https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?...`).
2.  Click the **standard KCI download link** (like "KCI 원문 내려받기" or a PDF icon). (You might need to click twice in some cases).
3.  The extension will automatically intercept the download and suggest saving the file using the format `Author(s)_Paper Title_Journal Name_VolumeIssuePageInfo.pdf`. Enjoy! 🎉

(Ko)
1.  KCI 논문 상세 페이지(예: `https://www.kci.go.kr/kciportal/ci/sereArticleSearch/ciSereArtiView.kci?...`)로 이동합니다.
2.  페이지에 있는 **기본 'KCI 원문 내려받기' 또는 PDF 다운로드 링크**를 클릭합니다. (경우에 따라 두 번 클릭해야 할 수도 있습니다).
3.  확장 프로그램이 자동으로 다운로드를 감지하고 `저자명_논문제목_저널명_볼륨호페이지정보.pdf` 형식으로 파일명을 변경하여 저장합니다. 편리하게 사용하세요! 🎉

## Important Note / 주의사항
(En) This extension relies on the current structure of the KCI website to find the paper title (`#artiTitle`), author (`div.author > a`), journal name (`.journalInfo p.jounal a`), and volume/page information (`p.vol a`). If KCI updates its website design, the extension might stop working correctly until the corresponding CSS selectors in `content.js` are updated.

(Ko) 이 확장 프로그램은 KCI 웹사이트의 현재 구조를 기반으로 논문 제목(`#artiTitle`), 저자(`div.author > a`), 학술지명(`.journalInfo p.jounal a`), 그리고 볼륨/페이지 정보(`p.vol a`)를 찾습니다. 만약 KCI 웹사이트 디자인이 변경되면, `content.js` 파일 내의 관련 CSS 선택자를 수정하기 전까지 확장 프로그램이 정상적으로 작동하지 않을 수 있습니다.

---

(En) Made with ❤️ for KCI by MSNa. Inspired by the original arXiv extension by YunseoDo ([https://github.com/DoYunseo/arXiv-save-as-Title](https://github.com/DoYunseo/arXiv-save-as-Title)).
(Ko) MSNa가 ❤️로 만들었습니다. YunseoDo의 원본 arXiv 확장 프로그램([https://github.com/DoYunseo/arXiv-save-as-Title](https://github.com/DoYunseo/arXiv-save-as-Title))에서 영감을 받았습니다.