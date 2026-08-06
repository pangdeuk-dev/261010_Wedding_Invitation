/** 주요 역 · 노선 모의 데이터 */
export const STATIONS = [
  { code: "서울", name: "서울", region: "수도권" },
  { code: "용산", name: "용산", region: "수도권" },
  { code: "수서", name: "수서", region: "수도권" },
  { code: "영등포", name: "영등포", region: "수도권" },
  { code: "광명", name: "광명", region: "수도권" },
  { code: "천안아산", name: "천안아산", region: "충청" },
  { code: "오송", name: "오송", region: "충청" },
  { code: "대전", name: "대전", region: "충청" },
  { code: "김천구미", name: "김천구미", region: "경상" },
  { code: "동대구", name: "동대구", region: "경상" },
  { code: "신경주", name: "신경주", region: "경상" },
  { code: "울산", name: "울산(통도사)", region: "경상" },
  { code: "부산", name: "부산", region: "경상" },
  { code: "광주송정", name: "광주송정", region: "호남" },
  { code: "목포", name: "목포", region: "호남" },
  { code: "여수엑스포", name: "여수엑스포", region: "호남" },
  { code: "강릉", name: "강릉", region: "강원" },
  { code: "전주", name: "전주", region: "호남" },
];

export const TRAIN_TYPES = ["KTX", "SRT", "ITX-새마을", "무궁화"];

const ROUTES = [
  { from: "서울", to: "부산", durationMin: 150, types: ["KTX"] },
  { from: "서울", to: "동대구", durationMin: 105, types: ["KTX"] },
  { from: "서울", to: "대전", durationMin: 60, types: ["KTX"] },
  { from: "서울", to: "광주송정", durationMin: 95, types: ["KTX"] },
  { from: "서울", to: "강릉", durationMin: 110, types: ["KTX"] },
  { from: "용산", to: "여수엑스포", durationMin: 180, types: ["KTX"] },
  { from: "수서", to: "부산", durationMin: 145, types: ["SRT"] },
  { from: "수서", to: "동대구", durationMin: 100, types: ["SRT"] },
  { from: "수서", to: "대전", durationMin: 55, types: ["SRT"] },
  { from: "수서", to: "광주송정", durationMin: 90, types: ["SRT"] },
  { from: "서울", to: "목포", durationMin: 160, types: ["KTX"] },
  { from: "서울", to: "전주", durationMin: 100, types: ["KTX"] },
];

function pad(n) {
  return String(n).padStart(2, "0");
}

function timeOf(h, m) {
  return `${pad(h)}:${pad(m)}`;
}

function addMinutes(h, m, add) {
  const total = h * 60 + m + add;
  return timeOf(Math.floor(total / 60) % 24, total % 60);
}

/** 특정 날짜·구간의 모의 열차 시각표 생성 */
export function generateTimetable(from, to, date, trainType) {
  const route =
    ROUTES.find((r) => r.from === from && r.to === to) ||
    ROUTES.find((r) => r.from === to && r.to === from);

  const duration = route?.durationMin ?? 120;
  const types =
    trainType && trainType !== "전체"
      ? [trainType]
      : route?.types ?? ["KTX", "SRT"];

  const trains = [];
  let seq = 1;
  for (const type of types) {
    const starts = type === "SRT" ? [6, 7, 8, 9, 10, 12, 14, 16, 18, 20] : [5, 6, 7, 8, 9, 11, 13, 15, 17, 19, 21];
    for (const hour of starts) {
      const minute = (seq * 7) % 60;
      const trainNo = `${type === "SRT" ? "3" : "0"}${100 + seq}`;
      trains.push({
        id: `${date}-${from}-${to}-${type}-${trainNo}`,
        trainNo,
        trainType: type,
        from,
        to,
        date,
        departTime: timeOf(hour, minute),
        arriveTime: addMinutes(hour, minute, duration),
        durationMin: duration,
        cars: type === "무궁화" ? 8 : 18,
      });
      seq += 1;
    }
  }
  return trains.sort((a, b) => a.departTime.localeCompare(b.departTime));
}

/**
 * 좌석 재고 시뮬레이터.
 * 대부분 매진(0) → 가끔 취소표(1~3석)가 풀림.
 */
export class SeatInventory {
  constructor() {
    /** @type {Map<string, { available: number, lastChange: number }>} */
    this.stock = new Map();
    this.tickMs = 2500;
    this._timer = null;
  }

  key(trainId) {
    return trainId;
  }

  ensure(trainId) {
    const k = this.key(trainId);
    if (!this.stock.has(k)) {
      // 초기: 90% 매진, 10%는 이미 1~2석
      const available = Math.random() < 0.1 ? 1 + Math.floor(Math.random() * 2) : 0;
      this.stock.set(k, { available, lastChange: Date.now() });
    }
    return this.stock.get(k);
  }

  getAvailable(trainId) {
    return this.ensure(trainId).available;
  }

  /** 예약 시도. 성공 시 좌석 수 감소 */
  tryBook(trainId, seats = 1) {
    const row = this.ensure(trainId);
    if (row.available < seats) return false;
    row.available -= seats;
    row.lastChange = Date.now();
    return true;
  }

  start(onChange) {
    if (this._timer) return;
    this._timer = setInterval(() => {
      // 감시 중인 열차만 변동
      for (const [trainId, row] of this.stock.entries()) {
        const roll = Math.random();
        let changed = false;
        if (row.available === 0 && roll < 0.18) {
          // 취소표 출현
          row.available = 1 + Math.floor(Math.random() * 3);
          row.lastChange = Date.now();
          changed = true;
        } else if (row.available > 0 && roll < 0.12) {
          // 다른 사람이 가져감
          row.available = Math.max(0, row.available - 1);
          row.lastChange = Date.now();
          changed = true;
        }
        if (changed && onChange) onChange(trainId, row.available);
      }
    }, this.tickMs);
  }

  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
  }
}
