# 모바일 청첩장 설정 가이드

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

## 7. 방명록 · 참석여부 공유 저장 (Firebase — 무료)

`config.js`의 `firebase` 항목이 **비어 있으면** 방명록·참석여부는 방문자 각자의 브라우저(localStorage)에만 저장됩니다(= 서로 공유 안 됨). 모든 하객이 함께 보는 방명록과 신랑·신부가 응답을 모으려면 아래처럼 **Firebase**를 연결하세요. (무료 범위로 충분)

### 7-1. 프로젝트 만들기

1. [console.firebase.google.com](https://console.firebase.google.com) 접속 → **프로젝트 만들기**
2. 이름 입력(예: `our-wedding`) → 애널리틱스는 꺼도 됨 → 생성

### 7-2. 웹 앱 등록 & 설정값 복사

1. 프로젝트 개요 화면에서 **웹 아이콘 `</>`** 클릭
2. 앱 닉네임 입력 → 등록
3. 나오는 `firebaseConfig` 값을 복사해서 `config.js`의 `firebase`에 붙여넣기:

```js
firebase: {
  apiKey: "AIza...",
  authDomain: "our-wedding.firebaseapp.com",
  projectId: "our-wedding",
  storageBucket: "our-wedding.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef",
},
```

### 7-3. Firestore 데이터베이스 만들기

1. 왼쪽 메뉴 **빌드 → Firestore Database** → **데이터베이스 만들기**
2. 위치는 `asia-northeast3 (서울)` 권장 → **프로덕션 모드**로 시작

### 7-4. 보안 규칙 설정 (중요)

Firestore의 **규칙(Rules)** 탭에서 아래로 교체 후 게시:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 방명록: 누구나 읽기/쓰기 (예식 전후 한정 운영 권장)
    match /guestbook/{doc} {
      allow read, create, update, delete: if true;
    }
    // 참석여부: 작성만 허용, 열람은 콘솔에서만
    match /rsvp/{doc} {
      allow create: if true;
      allow read, update, delete: if false;
    }
  }
}
```

> 위 규칙은 누구나 쓸 수 있는 **공개** 설정입니다. 결혼식 시즌에만 열어두고, 끝난 뒤에는 `if false`로 닫는 것을 권장합니다.

### 7-5. 확인

- `config.js`를 저장하고 페이지를 새로고침하면, 방명록이 **실시간으로 모든 기기에서 공유**됩니다.
- 참석여부 응답은 Firebase 콘솔 **Firestore → `rsvp` 컬렉션**에서 확인하세요.
- 설정을 비워두면 코드가 자동으로 **로컬 저장 모드**로 동작합니다(데모용).

### (참고) 로컬 저장 모드에서 내 데이터 확인

```javascript
JSON.parse(localStorage.getItem('wedding_rsvp'))   // 참석여부
JSON.parse(localStorage.getItem('wedding_gb'))     // 방명록
```

(같은 브라우저에서 작성한 것만 보입니다.)

## 8. 카카오맵 좌표 찾기

1. [map.kakao.com](https://map.kakao.com) 에서 예식장 검색
2. 공유 → URL에 `latitude,longitude` 형태로 포함됨
3. `config.js`의 `kakaoLat`, `kakaoLng`에 입력
