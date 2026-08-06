import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import path from "path";
import { fileURLToPath } from "url";
import { STATIONS, TRAIN_TYPES, generateTimetable, SeatInventory } from "./trains.js";
import { WatchStore } from "./watchStore.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3847;

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

const inventory = new SeatInventory();
const watches = new WatchStore();

app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

function broadcast(payload) {
  const raw = JSON.stringify(payload);
  for (const client of wss.clients) {
    if (client.readyState === 1) client.send(raw);
  }
}

function pushJob(job) {
  broadcast({ type: "job", job });
}

function matchesPrefer(train, job) {
  if (job.preferDepartFrom && train.departTime < job.preferDepartFrom) return false;
  if (job.preferDepartTo && train.departTime > job.preferDepartTo) return false;
  return true;
}

function candidatesFor(job) {
  return generateTimetable(job.from, job.to, job.date, job.trainType).filter((t) =>
    matchesPrefer(t, job)
  );
}

/** 감시 중인 작업의 열차 재고를 미리 등록 */
function armInventory(job) {
  for (const train of candidatesFor(job)) {
    inventory.ensure(train.id);
  }
}

function scanJob(job) {
  if (job.status !== "watching" && job.status !== "found") return;
  job.checks += 1;
  const trains = candidatesFor(job);
  let best = null;
  for (const train of trains) {
    const available = inventory.getAvailable(train.id);
    if (available >= job.passengers) {
      best = { ...train, available };
      break;
    }
  }

  if (best) {
    const wasWatching = job.status === "watching";
    watches.update(job.id, {
      status: job.autoBook && wasWatching ? "booking" : "found",
      matchedTrain: best,
    });
    if (wasWatching) {
      watches.addLog(
        job.id,
        `취소표 포착 · ${best.trainType} ${best.trainNo} ${best.departTime} 잔여 ${best.available}석`
      );
      pushJob(watches.get(job.id));
      broadcast({
        type: "alert",
        jobId: job.id,
        message: `${job.from}→${job.to} ${best.departTime} 취소표 ${best.available}석`,
        train: best,
      });
      if (job.autoBook) {
        setTimeout(() => attemptBook(job.id), 400);
      }
    } else {
      pushJob(watches.get(job.id));
    }
  } else if (job.status === "found" && job.matchedTrain) {
    const still = inventory.getAvailable(job.matchedTrain.id);
    if (still < job.passengers) {
      watches.update(job.id, { status: "watching", matchedTrain: null });
      watches.addLog(job.id, "잔여석이 다시 매진되어 감시를 재개합니다");
      pushJob(watches.get(job.id));
    } else {
      watches.update(job.id, {
        matchedTrain: { ...job.matchedTrain, available: still },
      });
      if (job.checks % 5 === 0) pushJob(watches.get(job.id));
    }
  } else if (job.checks % 8 === 0) {
    watches.addLog(job.id, `조회 ${job.checks}회 · 아직 매진`);
    pushJob(watches.get(job.id));
  }
}

function attemptBook(jobId) {
  const job = watches.get(jobId);
  if (!job || !job.matchedTrain) return;
  if (job.status === "booked") return;

  watches.update(jobId, { status: "booking" });
  watches.addLog(jobId, "예매 시도 중…");
  pushJob(watches.get(jobId));

  const ok = inventory.tryBook(job.matchedTrain.id, job.passengers);
  if (!ok) {
    watches.update(jobId, { status: "watching", matchedTrain: null });
    watches.addLog(jobId, "아쉽게도 다른 분이 먼저 가져갔습니다. 감시 재개");
    pushJob(watches.get(jobId));
    return;
  }

  const car = 3 + Math.floor(Math.random() * 12);
  const seatStart = 1 + Math.floor(Math.random() * 14);
  const seats = Array.from({ length: job.passengers }, (_, i) => `${car}호 ${seatStart + i}A`);
  const booking = {
    bookingId: `CR${Date.now().toString(36).toUpperCase()}`,
    train: job.matchedTrain,
    seats,
    passengerName: job.passengerName,
    bookedAt: Date.now(),
    notice: "시뮬레이션 예매입니다. 실제 티켓이 발권되지 않습니다.",
  };
  watches.update(jobId, { status: "booked", bookedSeat: booking });
  watches.addLog(jobId, `예매 완료 · ${seats.join(", ")}`);
  pushJob(watches.get(jobId));
  broadcast({
    type: "booked",
    jobId,
    booking,
  });
}

// —— REST ——
app.get("/api/meta", (_req, res) => {
  res.json({
    stations: STATIONS,
    trainTypes: ["전체", ...TRAIN_TYPES],
    disclaimer:
      "본 서비스는 모의 데이터 기반 데모입니다. 코레일·SRT 공식 예매 시스템을 대체하지 않습니다.",
  });
});

app.get("/api/trains", (req, res) => {
  const { from, to, date, trainType } = req.query;
  if (!from || !to || !date) {
    return res.status(400).json({ error: "from, to, date가 필요합니다" });
  }
  const trains = generateTimetable(String(from), String(to), String(date), String(trainType || "전체")).map(
    (t) => ({
      ...t,
      available: inventory.getAvailable(t.id),
    })
  );
  res.json({ trains });
});

app.get("/api/watches", (_req, res) => {
  res.json({ jobs: watches.list() });
});

app.post("/api/watches", (req, res) => {
  const { from, to, date, trainType, preferDepartFrom, preferDepartTo, passengers, autoBook, passengerName } =
    req.body || {};
  if (!from || !to || !date) {
    return res.status(400).json({ error: "출발역, 도착역, 날짜는 필수입니다" });
  }
  if (from === to) {
    return res.status(400).json({ error: "출발역과 도착역이 같습니다" });
  }
  const job = watches.create({
    from,
    to,
    date,
    trainType,
    preferDepartFrom,
    preferDepartTo,
    passengers,
    autoBook,
    passengerName,
  });
  armInventory(job);
  pushJob(job);
  broadcast({ type: "jobs", jobs: watches.list() });
  res.status(201).json({ job });
});

app.post("/api/watches/:id/book", (req, res) => {
  const job = watches.get(req.params.id);
  if (!job) return res.status(404).json({ error: "감시 작업을 찾을 수 없습니다" });
  if (!job.matchedTrain) return res.status(400).json({ error: "아직 포착된 취소표가 없습니다" });
  if (job.status === "booked") return res.json({ job });
  attemptBook(job.id);
  res.json({ job: watches.get(job.id) });
});

app.post("/api/watches/:id/stop", (req, res) => {
  const job = watches.stop(req.params.id);
  if (!job) return res.status(404).json({ error: "없음" });
  watches.addLog(job.id, "감시를 중지했습니다");
  pushJob(job);
  res.json({ job });
});

app.delete("/api/watches/:id", (req, res) => {
  if (!watches.remove(req.params.id)) return res.status(404).json({ error: "없음" });
  broadcast({ type: "jobs", jobs: watches.list() });
  res.status(204).end();
});

wss.on("connection", (ws) => {
  ws.send(JSON.stringify({ type: "hello", jobs: watches.list() }));
});

inventory.start((trainId, available) => {
  broadcast({ type: "seat", trainId, available });
  for (const job of watches.list()) {
    if (job.status === "watching" || job.status === "found") scanJob(job);
  }
});

// 주기적 스캔 (재고 변동이 없어도 로그/카운트 갱신)
setInterval(() => {
  for (const job of watches.list()) {
    if (job.status === "watching" || job.status === "found") scanJob(job);
  }
}, 3000);

server.listen(PORT, () => {
  console.log(`CatchRail running at http://localhost:${PORT}`);
});
