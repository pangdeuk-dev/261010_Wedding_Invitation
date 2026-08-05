// =====================================================
//  모바일 청첩장 설정 — 이 파일만 수정하면 됩니다
// =====================================================

const WEDDING_CONFIG = {
  // ---- 신랑 · 신부 ----
  groom: {
    name: "도광득",
    nameEn: "Gwangdeuk",
    father: "도기보",
    mother: "정경희",
    phone: "010-5193-4324",
  },
  bride: {
    name: "김서희",
    nameEn: "Seohee",
    father: "김정인",
    mother: "김양선",
    phone: "010-8963-0931",
  },

  // ---- 예식 정보 ----
  wedding: {
    date: "2026-10-10", // YYYY-MM-DD
    time: "오후 1시",
    venue: "다비다웨딩홀",
    hall: "3F 그랜드볼룸홀",
    address: "부산광역시 연제구 연수로 86",
    mapQuery: "부산광역시 연제구 연수로 86 다비다웨딩홀",
    tel: "051-852-8001", // 예식장 대표번호
    kakaoLat: 35.1853, // 카카오맵에서 좌표 확인 후 수정
    kakaoLng: 129.0792,
  },

  // ---- 문구 ----
  // 에디토리얼 커버 상단 영문 키커
  kicker: "THE WEDDING OF",
  // 영문 축하 문구 (커버)
  tagline: "Two souls, one beautiful beginning.",
  // 인사말
  greeting: `7년간 같은 곳을 바라보며
천천히 함께 걸어온 두 사람이
이제 하나의 여행을 시작합니다.

연휴의 소중한 시간 속에서도
함께 축복해주신다면 
그마음 오래 간직하며 행복하게 살아가겠습니다.`,
  // 마무리(아웃트로) 문구
  thanksMessage: "Thank you for being\npart of our story.",

  // ---- 사진 ----
  photos: {
    cover: "images/cover.jpg", // 커버(메인) 대형 사진
    // 갤러리 — 최대 30장 (gallery-1 ~ gallery-30). 현재 25장 사용 중.
    // 사진 추가 시 length를 26~30으로 늘리고 파일을 images/ 에 넣으세요.
    gallery: Array.from({ length: 25 }, (_, i) => `images/gallery-${i + 1}.jpg`),
  },

  // 블루 듀오톤(흑백+코발트 톤). false 면 원본 컬러
  duotone: false,

  // ---- 배경음악 (선택, 없으면 src 비우기) ----
  bgm: {
    src: "audio/bgm.mp3",
    title: "Wedding BGM",
  },

  // ---- 오시는 길 ----
  // 탭으로 표시됩니다. 비워두면(빈 문자열) 해당 탭은 숨겨집니다.
  directions: {
    subway: `· 지하철 1호선 시청역 하차 2번 출구
· 도보 약 7분 (직진 후 사거리에서 우회전)`,
    bus: `· 5-1, 20, 57, 62, 63, 131, 141
· "연제구청" 정류장 하차 즉시`,
    shuttle: `· 셔틀승합 무료 운영중
    · 시청역 2번출구로 나오시고, 좌측(오르막길)으로 10M오시면 승차가능
    · 배차 간격: 7분 간격으로 운행`,
    car: `· 내비게이션: 부산광역시 연제구 연수로 86 다비다웨딩홀 주소 검색
· 건물 내 주차장 이용 
· E마트 주차장, 연제구청 3시간 무료주차
· 주차권 : 다비다1층 예약실, 2층 뷔페인포메이션 전자발권`,
  },

  // ---- 마음 전하실 곳 (축의금 계좌) ----
  // side: 신랑측 / 신부측, role: 신랑·신부·아버지·어머니
  // bank·number 가 비어 있으면 화면에 표시되지 않습니다.
  accounts: [
    { side: "신랑측", role: "신랑", bank: "농협은행", number: "352-0548-1788-63", holder: "도광득" },
    { side: "신랑측", role: "아버지", bank: "새마을금고", number: "9002-1822-0756-1", holder: "도기보" },
    { side: "신랑측", role: "어머니", bank: "신한은행", number: "110-063-872155", holder: "정경희" },
    { side: "신부측", role: "신부", bank: "우리은행", number: "1002-347-283933", holder: "김서희" },
    { side: "신부측", role: "아버지", bank: "국민은행", number: "112-240-2542-00", holder: "김정인" },
    { side: "신부측", role: "어머니", bank: "새마을금고", number: "1515-0900-4559-7", holder: "김양선" },
  ],

  // ---- 방명록 (Firebase 미설정 시 브라우저 로컬 저장) ----
  firebase: {
    apiKey: "AIzaSyBI90w5_Hg-9kxmQg_gHyzXWmrFS1BatYg",
    authDomain: "wedding-invitation-3b2e8.firebaseapp.com",
    projectId: "wedding-invitation-3b2e8",
    storageBucket: "wedding-invitation-3b2e8.firebasestorage.app",
    messagingSenderId: "690997759910",
    appId: "1:690997759910:web:092f3b0535e8dc3c414967",
  },
};
