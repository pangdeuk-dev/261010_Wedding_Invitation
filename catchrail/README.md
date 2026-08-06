# CatchRail (캐치레일)

주말 KTX·SRT 취소표를 실시간으로 감시하고, 빈자리가 나면 바로 잡아주는 **취소표 감시·예매 시뮬레이션** 웹앱입니다.

> **중요:** 이 프로젝트는 데모/학습용입니다. 코레일·SRT 공식 API를 무단으로 호출하거나 자동 예매 봇을 실제 운영하는 것은 이용약관에 위배될 수 있습니다. 실제 예매는 [코레일](https://www.letskorail.com) / [SRT](https://etk.srail.kr) 공식 채널을 이용하세요. 서버의 좌석 데이터는 모두 **모의(mock)** 입니다.

## 기능

- 출발·도착·날짜·열차 종류로 **감시 작업** 등록
- 서버가 주기적으로 모의 잔여석을 검사하고, 취소표가 나면 WebSocket으로 즉시 알림
- 원클릭 **시뮬레이션 예매** (결제·실예약 없음)
- 감시 중 / 포착 / 예매 완료 상태 대시보드

## 실행

```bash
cd catchrail
npm install
npm start
```

브라우저에서 `http://localhost:3847` 접속

## 구조

```
catchrail/
  server/          # Express + WebSocket 백엔드
  public/          # 랜딩·대시보드 UI
  package.json
```
