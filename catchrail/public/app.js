const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

const state = {
  meta: null,
  jobs: [],
  ws: null,
};

const STATUS_LABEL = {
  watching: "감시 중",
  found: "취소표 포착",
  booking: "예매 중",
  booked: "예매 완료",
  stopped: "중지",
  failed: "실패",
};

function toast(title, message) {
  const stack = $("#toastStack");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<strong>${escapeHtml(title)}</strong>${escapeHtml(message || "")}`;
  stack.appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function setConn(stateName, label) {
  const el = $("#connStatus");
  el.dataset.state = stateName;
  $(".conn-label", el).textContent = label;
}

async function loadMeta() {
  const res = await fetch("/api/meta");
  state.meta = await res.json();
  const from = $("#fromSelect");
  const to = $("#toSelect");
  const type = $("#typeSelect");
  from.innerHTML = "";
  to.innerHTML = "";
  for (const s of state.meta.stations) {
    from.insertAdjacentHTML("beforeend", `<option value="${s.code}">${s.name}</option>`);
    to.insertAdjacentHTML("beforeend", `<option value="${s.code}">${s.name}</option>`);
  }
  from.value = "서울";
  to.value = "부산";
  type.innerHTML = state.meta.trainTypes.map((t) => `<option value="${t}">${t}</option>`).join("");

  const date = $("#dateInput");
  const d = new Date();
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7)); // 다음 토요일
  date.value = d.toISOString().slice(0, 10);
  date.min = new Date().toISOString().slice(0, 10);
}

function renderJobs() {
  const box = $("#jobList");
  if (!state.jobs.length) {
    box.innerHTML = `<p class="empty">아직 등록된 감시가 없습니다. 위에서 노선을 추가해 보세요.</p>`;
    return;
  }
  box.innerHTML = state.jobs
    .map((job) => {
      const match = job.matchedTrain
        ? `<div class="match"><strong>${job.matchedTrain.trainType} ${job.matchedTrain.trainNo}</strong>
           · ${job.matchedTrain.departTime}→${job.matchedTrain.arriveTime}
           · 잔여 ${job.matchedTrain.available ?? "?"}석
           ${
             job.bookedSeat
               ? `<br/>좌석 ${job.bookedSeat.seats.join(", ")} · 예약번호 ${job.bookedSeat.bookingId}`
               : ""
           }</div>`
        : "";
      const logs = [...(job.logs || [])]
        .slice(-6)
        .reverse()
        .map((l) => `<li>${formatTime(l.at)} · ${escapeHtml(l.message)}</li>`)
        .join("");
      return `<article class="job" data-id="${job.id}">
        <div class="job-main">
          <h3>${escapeHtml(job.from)} → ${escapeHtml(job.to)}
            <span class="status ${job.status}">${STATUS_LABEL[job.status] || job.status}</span>
          </h3>
          <div class="meta">
            <span>${job.date}</span>
            <span>${job.trainType}</span>
            <span>${job.passengers}명</span>
            <span>${job.preferDepartFrom || "—"} ~ ${job.preferDepartTo || "—"}</span>
            <span>조회 ${job.checks}회</span>
            <span>${job.autoBook ? "자동예매 ON" : "수동"}</span>
          </div>
          ${match}
          <ul class="logs">${logs}</ul>
        </div>
        <div class="job-actions">
          ${
            job.status === "found"
              ? `<button class="btn btn-primary btn-sm" data-action="book">지금 예매</button>`
              : ""
          }
          ${
            job.status === "watching" || job.status === "found" || job.status === "booking"
              ? `<button class="btn btn-ghost btn-sm" data-action="stop">중지</button>`
              : ""
          }
          <button class="btn btn-danger btn-sm" data-action="delete">삭제</button>
        </div>
      </article>`;
    })
    .join("");
}

function upsertJob(job) {
  const i = state.jobs.findIndex((j) => j.id === job.id);
  if (i >= 0) state.jobs[i] = job;
  else state.jobs.unshift(job);
  renderJobs();
}

function connectWs() {
  const proto = location.protocol === "https:" ? "wss" : "ws";
  const ws = new WebSocket(`${proto}://${location.host}/ws`);
  state.ws = ws;
  setConn("connecting", "연결 중");

  ws.addEventListener("open", () => setConn("live", "실시간"));
  ws.addEventListener("close", () => {
    setConn("offline", "재연결 대기");
    setTimeout(connectWs, 2000);
  });
  ws.addEventListener("message", (ev) => {
    let msg;
    try {
      msg = JSON.parse(ev.data);
    } catch {
      return;
    }
    if (msg.type === "hello" || msg.type === "jobs") {
      state.jobs = msg.jobs || [];
      renderJobs();
    } else if (msg.type === "job") {
      upsertJob(msg.job);
    } else if (msg.type === "alert") {
      toast("취소표 포착", msg.message);
    } else if (msg.type === "booked") {
      toast("예매 완료", `${msg.booking.seats.join(", ")}`);
      showBookDialog(msg.booking);
    }
  });
}

function showBookDialog(booking) {
  const detail = $("#bookDetail");
  detail.innerHTML = `
    <p><strong>${escapeHtml(booking.train.from)} → ${escapeHtml(booking.train.to)}</strong></p>
    <p>${booking.train.date} · ${booking.train.trainType} ${booking.train.trainNo}<br/>
    ${booking.train.departTime} 출발 → ${booking.train.arriveTime} 도착</p>
    <p>좌석: ${escapeHtml(booking.seats.join(", "))}<br/>
    예약번호: ${escapeHtml(booking.bookingId)}<br/>
    예매자: ${escapeHtml(booking.passengerName)}</p>
    <p style="font-size:0.85rem;opacity:.8">${escapeHtml(booking.notice)}</p>
  `;
  $("#bookDialog").showModal();
}

async function refreshJobs() {
  const res = await fetch("/api/watches");
  const data = await res.json();
  state.jobs = data.jobs || [];
  renderJobs();
}

$("#watchForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const fd = new FormData(e.target);
  const payload = {
    from: fd.get("from"),
    to: fd.get("to"),
    date: fd.get("date"),
    trainType: fd.get("trainType"),
    preferDepartFrom: fd.get("preferDepartFrom") || null,
    preferDepartTo: fd.get("preferDepartTo") || null,
    passengers: Number(fd.get("passengers") || 1),
    autoBook: fd.get("autoBook") === "on",
    passengerName: fd.get("passengerName"),
  };
  const res = await fetch("/api/watches", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    toast("등록 실패", data.error || "오류");
    return;
  }
  upsertJob(data.job);
  toast("감시 시작", `${payload.from} → ${payload.to}`);
  location.hash = "#board";
});

$("#swapStations").addEventListener("click", () => {
  const from = $("#fromSelect");
  const to = $("#toSelect");
  const tmp = from.value;
  from.value = to.value;
  to.value = tmp;
});

$("#previewTrains").addEventListener("click", async () => {
  const from = $("#fromSelect").value;
  const to = $("#toSelect").value;
  const date = $("#dateInput").value;
  const trainType = $("#typeSelect").value;
  const res = await fetch(
    `/api/trains?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&date=${encodeURIComponent(date)}&trainType=${encodeURIComponent(trainType)}`
  );
  const data = await res.json();
  const box = $("#previewBox");
  const list = $("#previewList");
  box.hidden = false;
  list.innerHTML = (data.trains || [])
    .map((t) => {
      const open = t.available > 0;
      return `<li>
        <span>${t.departTime}</span>
        <span>${t.trainType}</span>
        <span>${t.trainNo} · ${t.arriveTime} 도착</span>
        <span class="seat-badge ${open ? "open" : "sold"}">${open ? `잔여 ${t.available}` : "매진"}</span>
      </li>`;
    })
    .join("");
});

$("#jobList").addEventListener("click", async (e) => {
  const btn = e.target.closest("[data-action]");
  if (!btn) return;
  const jobEl = btn.closest(".job");
  const id = jobEl?.dataset.id;
  if (!id) return;
  const action = btn.dataset.action;
  if (action === "book") {
    const res = await fetch(`/api/watches/${id}/book`, { method: "POST" });
    const data = await res.json();
    if (data.job) upsertJob(data.job);
  } else if (action === "stop") {
    const res = await fetch(`/api/watches/${id}/stop`, { method: "POST" });
    const data = await res.json();
    if (data.job) upsertJob(data.job);
  } else if (action === "delete") {
    await fetch(`/api/watches/${id}`, { method: "DELETE" });
    state.jobs = state.jobs.filter((j) => j.id !== id);
    renderJobs();
  }
});

await loadMeta();
await refreshJobs();
connectWs();
