# 모바일 청첩장 설정 가이드

> 2026년 10월 10일 예식이 끝나 공개 페이지를 닫았습니다.
> `index.html`은 종료 안내만 보여주고, `admin.html`은 응답 목록을 열지 않습니다.
> `config.js`에서 연락처, 계좌번호, Firebase 연결 정보를 뺐습니다.
> GitHub Pages는 이 변경이 `main`에 반영된 뒤에 닫힌 화면으로 바뀝니다.
> 아래 1~6번은 예식 전에 쓰던 설정 기록입니다. 데이터베이스를 닫는 절차는 7번입니다.

## 1. 내용 수정

`config.js` 파일만 열어서 아래 항목을 실제 정보로 바꿔 주세요.

- 신랑·신부 이름, 부모님 성함, 연락처
- 예식 일시, 장소, 주소
- 인사말
- 축의금 계좌번호
- 사진·음악 파일 경로

## 2. 사진 넣기

`images/` 폴더에 사진을 넣습니다. (확장자는 jpg·png·jpeg·webp 무엇이든 자동 인식)

| 파일명          | 용도        |
|----------------|-------------|
| `cover`        | 커버(메인) 대형 사진 |
| `gallery-1` ~ `gallery-23` | 갤러리 (23장) |

권장: 가로 1200px 이상, JPG/WEBP, 파일당 500KB 이하  
갤러리 장수를 바꾸려면 `config.js`의 `gallery` 배열 길이를 수정하세요.

## 3. 배경음악 (선택)

`audio/bgm.mp3` 파일을 넣고 `config.js`의 `bgm.src`를 확인하세요.  
없으면 `bgm: null` 로 두거나 `src`를 비우면 음악 버튼이 숨겨집니다.

## 4. 로컬에서 미리보기

### 방법 A — VS Code / Cursor Live Server

1. Live Server 확장 설치
2. `index.html` 우클릭 → **Open with Live Server**
3. 휴대폰과 같은 Wi-Fi에서 `http://[PC IP]:5500` 으로 접속

### 방법 B — Python

```bash
cd mobile-wedding-invitation
python -m http.server 8080
```

브라우저에서 `http://localhost:8080` 접속

## 5. 인터넷에 올리기 (QR 코드용 URL)

**추천: GitHub Pages (무료, 안정적)**

1. [GitHub](https://github.com) 계정 생성
2. 새 저장소(repository) 생성 — 이름 예: `wedding-invitation`
3. 이 폴더 전체를 업로드하거나 `git push`
4. 저장소 **Settings → Pages**
   - Source: `Deploy from a branch`
   - Branch: `main` / `/ (root)`
5. 몇 분 후 주소 확인:  
   `https://[사용자명].github.io/wedding-invitation/`

**대안: Netlify (드래그 앤 드롭)**

1. [netlify.com](https://www.netlify.com) 가입
2. 사이트 추가 → 폴더를 드래그 앤 드롭
3. `https://랜덤이름.netlify.app` 주소 발급
4. Site settings → Domain 에서 이름 변경 가능

## 6. QR 코드 만들기

배포된 URL이 정해지면:

- [QR Code Generator](https://www.qr-code-generator.com/)
- 또는 네이버/카카오 "QR코드 만들기"

에 **최종 URL**을 넣어 PNG/SVG로 저장 후 종이 청첩장에 인쇄하세요.

## 7. 데이터베이스 닫기 (Firebase 콘솔에서 직접)

저장소 수정만으로는 Firestore가 닫히지 않습니다. 프로젝트 `wedding-invitation-3b2e8`의 보안 규칙이 아직 열려 있으면, 예전 페이지 주소와 저장소 기록만으로도 `rsvp`(참석 응답)와 `guestbook`(방명록)을 읽고 쓸 수 있습니다. 청첩장 동의 문구대로 예식 후 응답을 없애려면 아래 순서대로 진행하세요.

1. [Firestore 규칙](https://console.firebase.google.com/project/wedding-invitation-3b2e8/firestore/rules)을 열고 아래 내용으로 바꾼 뒤 **게시**합니다. 이 단계가 외부 읽기·쓰기를 즉시 막습니다.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

2. 규칙을 게시한 뒤, 응답을 더 보관하지 않는다면 [프로젝트 설정](https://console.firebase.google.com/project/wedding-invitation-3b2e8/settings/general) 맨 아래에서 프로젝트 `wedding-invitation-3b2e8`를 삭제합니다.
3. 삭제 전에 응답 사본이 필요하면, 규칙을 닫기 전 Firebase 콘솔의 Firestore 화면에서 `rsvp` 컬렉션만 내려받으세요. 그 파일에는 하객 이름과 연락처가 있으니 청첩장 저장소나 메신저에 올리지 마세요.

## 8. 카카오맵 좌표 찾기

1. [map.kakao.com](https://map.kakao.com) 에서 예식장 검색
2. 공유 → URL에 `latitude,longitude` 형태로 포함됨
3. `config.js`의 `kakaoLat`, `kakaoLng`에 입력
