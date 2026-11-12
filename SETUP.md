# 모바일 청첩장 설정 가이드

> 2026년 10월 10일 예식이 끝나 공개 페이지를 닫았습니다.
> `index.html`은 종료 안내만 보여주고, `admin.html`은 응답 목록을 열지 않습니다.
> `config.js`에서 연락처, 계좌번호, Firebase 연결 정보를 뺐습니다.
> GitHub Pages는 이 변경이 `main`에 반영된 뒤에 닫힌 화면으로 바뀝니다.
> Firebase 프로젝트 `wedding-invitation-3b2e8`는 2026년 11월 12일에 삭제했습니다. 외부에서 참석 응답과 방명록을 읽으면 권한이 거부됩니다.
> 아래 1~6번은 예식 전에 쓰던 설정 기록입니다.

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

## 7. 데이터베이스

Firebase 프로젝트 `wedding-invitation-3b2e8`는 2026년 11월 12일에 삭제했습니다. 참석 응답(`rsvp`)과 방명록(`guestbook`)은 바깥에서 더 이상 열리지 않습니다.

Google은 삭제한 프로젝트를 약 30일 동안 복구할 수 있는 상태로 보관합니다. 그 기간이 지나면 프로젝트와 안의 데이터가 사라집니다. 실수로 지운 것이 아니라면 복구하지 않으면 됩니다.

## 8. 카카오맵 좌표 찾기

1. [map.kakao.com](https://map.kakao.com) 에서 예식장 검색
2. 공유 → URL에 `latitude,longitude` 형태로 포함됨
3. `config.js`의 `kakaoLat`, `kakaoLng`에 입력
