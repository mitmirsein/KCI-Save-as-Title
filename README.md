# KCI Save as Title (KCI 논문 제목으로 저장)

KCI(한국학술지인용색인) 논문을 다운로드할 때, 기본 숫자 파일명 대신 `저자명_논문제목_저널명_볼륨호페이지정보.pdf` 형식의 상세한 파일명으로 **자동 저장**해주는 크롬 확장 프로그램입니다.

## 특징
*   KCI에서 다운로드하는 PDF 파일명을 `저자명_논문제목_저널명_볼륨호페이지정보.pdf` 형식으로 자동 변경합니다.
*   논문 상세 페이지에서 저자, 제목, 학술지명, 발행연도, 볼륨, 호, 페이지 정보를 추출합니다.
*   KCI 논문 상세 페이지에서 '다운로드' 링크를 클릭하면 백그라운드에서 자동으로 작동합니다.
*   더 이상 알아보기 힘든 숫자 파일명(예: `KCI_FI00...pdf`)은 그만!

## 설치 및 사용 방법

**(설치 방법)**

1.  **코드 다운로드:** GitHub 저장소 페이지에서 "Code" 버튼을 클릭하고 "Download ZIP"을 선택합니다. 다운로드한 ZIP 파일의 압축을 컴퓨터의 원하는 위치에 해제합니다. (또는 Git을 사용하신다면 저장소를 clone 합니다).
2.  **Chrome 확장 프로그램 페이지 열기:** 크롬 브라우저를 열고 주소창에 `chrome://extensions` 를 입력하여 이동합니다.
3.  **개발자 모드 활성화:** 페이지 오른쪽 상단에 있는 "개발자 모드" 토글 스위치를 찾아 켭니다.
4.  **확장 프로그램 로드:** 왼쪽 상단에 나타나는 "압축 해제된 확장 프로그램을 로드합니다." 버튼을 클릭합니다.
5.  **폴더 선택:** 파일 선택 창에서 압축을 해제한 폴더 (내부에 `manifest.json` 파일이 직접 들어있는 폴더, 예: `KCI-Save-as-Title` 폴더)로 이동하여 선택하고 "폴더 선택" 또는 "열기" 버튼을 누릅니다.
6.  이제 확장 프로그램 목록에 "KCI Save as Title"이 나타나고 활성화됩니다.

**(사용 방법)**

1.  KCI 논문 상세 페이지에서 원문 내려받기 가능한 것만 됩니다.
2.  페이지에 있는 **기본 'KCI 원문 내려받기'**를 클릭합니다. (경우에 따라 두 번 클릭해야 할 수도 있습니다).
3.  확장 프로그램이 자동으로 다운로드를 감지하고 `저자명_논문제목_저널명_볼륨호페이지정보.pdf` 형식으로 파일명을 변경하여 저장합니다. 편리하게 사용하세요! 🎉

## 주의사항
이 확장 프로그램은 KCI 웹사이트의 현재 구조를 기반으로 논문 제목(`#artiTitle`), 저자(`div.author > a`), 학술지명(`.journalInfo p.jounal a`), 그리고 볼륨/페이지 정보(`p.vol a`)를 찾습니다. 만약 KCI 웹사이트 디자인이 변경되면, `content.js` 파일 내의 관련 CSS 선택자를 수정하기 전까지 확장 프로그램이 정상적으로 작동하지 않을 수 있습니다.

---

MSNa가 ❤️로 만들었습니다. YunseoDo의 원본 arXiv 확장 프로그램([https://github.com/DoYunseo/arXiv-save-as-Title](https://github.com/DoYunseo/arXiv-save-as-Title))에서 영감을 받았습니다.
