/* =====================================================
   모바일 청첩장 — 앱 로직 (Editorial)
   ===================================================== */
(function () {
  "use strict";

  const cfg = typeof WEDDING_CONFIG !== "undefined" ? WEDDING_CONFIG : {};
  const groom = cfg.groom || {};
  const bride = cfg.bride || {};
  const wd = cfg.wedding || {};
  const photos = cfg.photos || {};
  const gallery = photos.gallery || [];

  // Firebase (설정이 있으면 공유 저장, 없으면 로컬 저장으로 폴백)
  let fbDb = null;
  function initFirebase() {
    const fb = cfg.firebase;
    if (fb && fb.projectId && typeof firebase !== "undefined") {
      try {
        firebase.initializeApp(fb);
        fbDb = firebase.firestore();
      } catch (e) {
        console.warn("[wedding] Firebase 초기화 실패, 로컬 저장으로 전환합니다:", e);
        fbDb = null;
      }
    }
  }

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

  // ---------- 유틸 ----------
  const KO_DAYS = ["일", "월", "화", "수", "목", "금", "토"];
  const EN_MONTHS = ["JAN","FEB","MAR","APR","MAY","JUN","JUL","AUG","SEP","OCT","NOV","DEC"];

  function weddingDate() {
    return wd.date ? new Date(wd.date + "T00:00:00") : null;
  }

  function setText(sel, txt) {
    const el = $(sel);
    if (el) el.textContent = txt || "";
  }

  function escapeHtml(str) {
    const d = document.createElement("div");
    d.textContent = str == null ? "" : String(str);
    return d.innerHTML;
  }

  function placeholder(label, w, h) {
    w = w || 800; h = h || 1000;
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}' viewBox='0 0 ${w} ${h}'>
      <rect width='${w}' height='${h}' fill='#eceae2'/>
      <text x='50%' y='48%' text-anchor='middle' fill='#1f2ad6' font-family='Fraunces, serif' font-size='${Math.round(w/16)}' opacity='0.5'>${label}</text>
      <text x='50%' y='54%' text-anchor='middle' fill='#9a9aa2' font-family='sans-serif' font-size='${Math.round(w/34)}'>사진을 넣어주세요</text>
    </svg>`;
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  // 확장자가 jpg/png/jpeg/webp 무엇이든 자동으로 찾아 로드. 모두 실패하면 자리표시.
  const IMG_EXTS = ["jpg", "jpeg", "png", "webp", "JPG", "JPEG", "PNG", "WEBP"];
  function smartImg(img, src, label, w, h) {
    if (!src) { img.src = placeholder(label, w, h); return; }
    const base = src.replace(/\.[^./\\]+$/, "");
    const given = (src.match(/\.([^./\\]+)$/) || [])[1];
    const exts = [];
    if (given) exts.push(given);
    IMG_EXTS.forEach((e) => { if (!exts.includes(e)) exts.push(e); });
    const candidates = exts.map((e) => `${base}.${e}`);
    candidates.push(base); // 확장자 없는 파일도 마지막으로 시도
    let i = 0;
    function next() {
      if (i >= candidates.length) {
        img.onerror = null;
        img.src = placeholder(label, w, h);
        return;
      }
      img.src = candidates[i++];
    }
    img.onerror = next;
    next();
  }

  function toast(msg) {
    const el = $("#toast");
    if (!el) return;
    el.textContent = msg;
    el.classList.remove("hidden");
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.add("hidden"), 2400);
  }

  function copy(text) {
    if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
    const ta = document.createElement("textarea");
    ta.value = text; ta.style.position = "fixed"; ta.style.left = "-9999px";
    document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); } finally { document.body.removeChild(ta); }
    return Promise.resolve();
  }

  function telLink(phone, type) {
    const n = (phone || "").replace(/[^0-9]/g, "");
    return (type === "sms" ? "sms:" : "tel:") + n;
  }

  // 공용 모달 — 입력값(string) / 확인(true) / 취소(null) 을 Promise 로 반환
  function openModal(opts) {
    return new Promise((resolve) => {
      const m = $("#modal"), title = $("#modal-title"), desc = $("#modal-desc"),
        input = $("#modal-input"), ok = $("#modal-ok"), cancel = $("#modal-cancel");
      if (!m) { resolve(null); return; }

      title.textContent = opts.title || "";
      if (opts.desc) { desc.textContent = opts.desc; desc.classList.remove("hidden"); }
      else desc.classList.add("hidden");
      if (opts.input) { input.classList.remove("hidden"); input.value = ""; }
      else input.classList.add("hidden");
      ok.textContent = opts.okText || "확인";
      m.classList.add("open");
      if (opts.input) setTimeout(() => input.focus(), 120);

      function cleanup(result) {
        m.classList.remove("open");
        ok.removeEventListener("click", onOk);
        cancel.removeEventListener("click", onCancel);
        m.removeEventListener("click", onBackdrop);
        input.removeEventListener("keydown", onKey);
        resolve(result);
      }
      const onOk = () => cleanup(opts.input ? input.value.trim() : true);
      const onCancel = () => cleanup(null);
      const onBackdrop = (e) => { if (e.target === m) cleanup(null); };
      const onKey = (e) => { if (e.key === "Enter") onOk(); };
      ok.addEventListener("click", onOk);
      cancel.addEventListener("click", onCancel);
      m.addEventListener("click", onBackdrop);
      input.addEventListener("keydown", onKey);
    });
  }

  // ---------- COVER ----------
  function renderCover() {
    if (cfg.duotone) document.body.classList.add("duotone");

    setText("#cover-kicker", cfg.kicker || "THE WEDDING OF");
    setText("#cover-groom", groom.nameEn || groom.name);
    setText("#cover-bride", bride.nameEn || bride.name);
    setText("#cover-tagline", cfg.tagline || "");

    const d = weddingDate();
    if (d) {
      setText("#cover-date", `${EN_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`);
    }
    setText("#cover-venue", wd.venue || "");

    const img = $("#cover-img");
    if (img) {
      smartImg(img, photos.cover || "images/cover.jpg", "Cover");
    }
  }

  // ---------- INVITATION ----------
  function renderInvitation() {
    setText("#greeting", cfg.greeting || "");
    setText("#p-groom", `${groom.father} · ${groom.mother}`);
    setText("#p-groom-name", groom.name);
    setText("#p-bride", `${bride.father} · ${bride.mother}`);
    setText("#p-bride-name", bride.name);
  }

  // ---------- SAVE THE DATE ----------
  function renderDate() {
    const d = weddingDate();
    if (!d) return;
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");

    const big = $("#date-big");
    if (big) big.innerHTML = `${mm}.${dd}<span class="yr">${d.getFullYear()}</span>`;

    setText("#date-sub",
      `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 ${KO_DAYS[d.getDay()]}요일 ${wd.time || ""}`.trim()
    );

    renderCalendar(d);
    startCountdown(d);
  }

  function renderCalendar(d) {
    const grid = $("#cal-grid");
    if (!grid) return;
    const year = d.getFullYear(), month = d.getMonth(), markDay = d.getDate();
    const first = new Date(year, month, 1).getDay();
    const days = new Date(year, month + 1, 0).getDate();

    let html = "";
    KO_DAYS.forEach((w, i) => {
      html += `<div class="cell head${i === 0 ? " sun" : ""}">${w}</div>`;
    });
    for (let i = 0; i < first; i++) html += `<div class="cell muted"></div>`;
    for (let day = 1; day <= days; day++) {
      const dow = (first + day - 1) % 7;
      const cls = ["cell"];
      if (dow === 0) cls.push("sun");
      if (day === markDay) cls.push("mark");
      html += `<div class="${cls.join(" ")}">${day}</div>`;
    }
    grid.innerHTML = html;
  }

  function startCountdown(d) {
    const target = d.getTime();
    function tick() {
      let diff = Math.max(0, target - Date.now());
      const day = Math.floor(diff / 864e5); diff -= day * 864e5;
      const h = Math.floor(diff / 36e5); diff -= h * 36e5;
      const m = Math.floor(diff / 6e4); diff -= m * 6e4;
      const s = Math.floor(diff / 1e3);
      setText("#dd-d", String(day));
      setText("#dd-h", String(h).padStart(2, "0"));
      setText("#dd-m", String(m).padStart(2, "0"));
      setText("#dd-s", String(s).padStart(2, "0"));
    }
    tick();
    setInterval(tick, 1000);
  }

  // ---------- GALLERY ----------
  function renderGallery() {
    const prev = $("#gallery-preview");
    setText("#gallery-count", String(gallery.length));
    setText("#v-total", `/ ${gallery.length}`);

    if (prev) {
      prev.innerHTML = "";
      gallery.slice(0, 5).forEach((src, i) => {
        const gp = document.createElement("div");
        gp.className = "gp" + (i === 0 ? " tall" : "");
        const img = document.createElement("img");
        img.loading = "lazy";
        smartImg(img, src, String(i + 1), 600, 600);
        gp.appendChild(img);
        gp.addEventListener("click", () => openViewer(i));
        prev.appendChild(gp);
      });
    }

    $("#gallery-more")?.addEventListener("click", () => openViewer(0));
    buildViewer();
  }

  // ---------- GALLERY VIEWER (swipe) ----------
  let vIndex = 0;
  function buildViewer() {
    const track = $("#v-track");
    const thumbs = $("#v-thumbs");
    if (!track || !thumbs) return;
    track.innerHTML = ""; thumbs.innerHTML = "";

    gallery.forEach((src, i) => {
      const slide = document.createElement("div");
      slide.className = "viewer-slide";
      const img = document.createElement("img");
      img.loading = "lazy";
      smartImg(img, src, String(i + 1), 1000, 1200);
      slide.appendChild(img);
      track.appendChild(slide);

      const vt = document.createElement("div");
      vt.className = "vt";
      const ti = document.createElement("img");
      ti.loading = "lazy";
      smartImg(ti, src, String(i + 1), 120, 120);
      vt.appendChild(ti);
      vt.addEventListener("click", () => goTo(i));
      thumbs.appendChild(vt);
    });

    $("#v-close")?.addEventListener("click", closeViewer);
    $("#v-prev")?.addEventListener("click", () => goTo(vIndex - 1));
    $("#v-next")?.addEventListener("click", () => goTo(vIndex + 1));
    document.addEventListener("keydown", (e) => {
      if (!$("#viewer").classList.contains("open")) return;
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowLeft") goTo(vIndex - 1);
      if (e.key === "ArrowRight") goTo(vIndex + 1);
    });

    setupSwipe(track);
  }

  function goTo(i) {
    const n = gallery.length;
    vIndex = Math.max(0, Math.min(n - 1, i));
    const track = $("#v-track");
    track.style.transform = `translateX(${-vIndex * 100}%)`;
    setText("#v-cur", String(vIndex + 1));
    $$("#v-thumbs .vt").forEach((t, idx) => t.classList.toggle("active", idx === vIndex));
    const active = $$("#v-thumbs .vt")[vIndex];
    active?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }

  function openViewer(i) {
    $("#viewer").classList.add("open");
    document.body.style.overflow = "hidden";
    goTo(i);
  }

  function closeViewer() {
    $("#viewer").classList.remove("open");
    document.body.style.overflow = "";
  }

  function setupSwipe(track) {
    let startX = 0, dx = 0, dragging = false, w = 0;
    const onDown = (e) => {
      dragging = true; startX = (e.touches ? e.touches[0].clientX : e.clientX);
      w = track.offsetWidth; track.classList.add("dragging");
    };
    const onMove = (e) => {
      if (!dragging) return;
      dx = (e.touches ? e.touches[0].clientX : e.clientX) - startX;
      track.style.transform = `translateX(calc(${-vIndex * 100}% + ${dx}px))`;
    };
    const onUp = () => {
      if (!dragging) return;
      dragging = false; track.classList.remove("dragging");
      if (Math.abs(dx) > w * 0.18) goTo(vIndex + (dx < 0 ? 1 : -1));
      else goTo(vIndex);
      dx = 0;
    };
    track.addEventListener("touchstart", onDown, { passive: true });
    track.addEventListener("touchmove", onMove, { passive: true });
    track.addEventListener("touchend", onUp);
    track.addEventListener("mousedown", onDown);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // ---------- LOCATION ----------
  function renderLocation() {
    setText("#loc-venue", [wd.venue, wd.hall].filter(Boolean).join(" "));
    setText("#loc-addr", wd.address);
    setText("#loc-tel", wd.tel ? `T. ${wd.tel}` : "");

    const q = encodeURIComponent(wd.mapQuery || wd.address || "");
    const naver = $("#map-naver"), kakao = $("#map-kakao"), tmap = $("#map-tmap");
    if (naver) naver.href = `https://map.naver.com/v5/search/${q}`;
    if (kakao) kakao.href = `https://map.kakao.com/?q=${q}`;
    if (tmap) tmap.href = `https://apis.openapi.sk.com/tmap/app/routes?name=${q}`;

    const embed = $("#map-embed");
    if (embed) {
      const q2 = encodeURIComponent(wd.mapQuery || wd.address || wd.venue || "");
      embed.innerHTML = `<iframe title="map" loading="lazy" src="https://maps.google.com/maps?q=${q2}&z=16&output=embed"></iframe>`;
    }

    renderTabs();
  }

  function renderTabs() {
    const dir = cfg.directions || {};
    const order = [
      { key: "subway", label: "지하철" },
      { key: "bus", label: "버스" },
      { key: "shuttle", label: "셔틀버스" },
      { key: "car", label: "자가용·주차" },
    ];
    const items = order.filter((o) => dir[o.key] && dir[o.key].trim());
    const heads = $("#tab-heads"), body = $("#tab-body");
    if (!heads || !body || !items.length) return;

    heads.innerHTML = ""; 
    items.forEach((it, i) => {
      const b = document.createElement("button");
      b.className = "tab-head" + (i === 0 ? " active" : "");
      b.textContent = it.label;
      b.addEventListener("click", () => {
        $$(".tab-head", heads).forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        body.textContent = dir[it.key];
        body.classList.remove("active"); void body.offsetWidth; body.classList.add("active");
      });
      heads.appendChild(b);
    });
    body.textContent = dir[items[0].key];
    body.classList.add("active");
  }

  // ---------- ACCOUNTS ----------
  function renderAccounts() {
    const wrap = $("#acc-group");
    if (!wrap) return;
    const accounts = cfg.accounts || [];
    wrap.innerHTML = "";
    accounts.forEach((a) => {
      const item = document.createElement("div");
      item.className = "acc-item";
      item.innerHTML = `
        <div class="acc-info">
          <div class="acc-side">${escapeHtml(a.side || "")}</div>
          <div class="acc-num">${escapeHtml(a.number || "")}</div>
          <div class="acc-bank">${escapeHtml(a.bank || "")} · ${escapeHtml(a.holder || "")}</div>
        </div>
        <button class="acc-copy" type="button">COPY</button>`;
      item.querySelector(".acc-copy").addEventListener("click", () => {
        copy(a.number || "").then(() => toast("계좌번호가 복사되었습니다"));
      });
      wrap.appendChild(item);
    });
  }

  // ---------- RSVP ----------
  const RSVP_DONE_KEY = "wedding_rsvp_done";

  function rsvpGoStep(step) {
    const s1 = $("#rsvp-step-1"), s2 = $("#rsvp-step-2");
    if (!s1 || !s2) return;
    s1.classList.toggle("hidden", step !== 1);
    s2.classList.toggle("hidden", step !== 2);
    const sheet = $(".rsvp-sheet");
    if (sheet) sheet.scrollTop = 0;
  }
  function openRsvpModal() {
    const m = $("#rsvp-modal");
    if (!m) return;
    rsvpGoStep(1); // 열 때는 항상 첫 화면부터
    m.classList.add("open");
    document.body.style.overflow = "hidden";
  }
  function closeRsvpModal() {
    const m = $("#rsvp-modal");
    if (!m) return;
    m.classList.remove("open");
    document.body.style.overflow = "";
  }

  function initRsvp() {
    const form = $("#rsvp-form");
    const modal = $("#rsvp-modal");
    if (!modal) return;

    // 팝업 정보 채우기 (config 기준)
    const d = weddingDate();
    setText("#rsvp-info-people", `신랑 ${groom.name} & 신부 ${bride.name}`);
    if (d) {
      const dateStr = `${wd.date} ${KO_DAYS[d.getDay()]}요일${wd.time ? " " + wd.time : ""}`;
      setText("#rsvp-info-date", dateStr);
    }
    setText("#rsvp-info-place", [wd.address, wd.venue].filter(Boolean).join(" "));

    // 닫기 동작
    $("#rsvp-modal-close")?.addEventListener("click", closeRsvpModal);
    modal.addEventListener("click", (e) => { if (e.target === modal) closeRsvpModal(); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal.classList.contains("open")) closeRsvpModal();
    });

    // 단계 전환
    $("#rsvp-next")?.addEventListener("click", () => rsvpGoStep(2));
    $("#rsvp-back")?.addEventListener("click", () => rsvpGoStep(1));

    // 접속 시 자동 표시 (이미 제출했으면 생략)
    if (localStorage.getItem(RSVP_DONE_KEY) !== "1") {
      setTimeout(openRsvpModal, 700);
    }

    if (form) {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        if (!$("#rsvp-consent")?.checked) {
          toast("개인정보 수집·이용에 동의해 주세요");
          return;
        }
        const fd = new FormData(form);
        const entry = {
          name: fd.get("name"),
          attendance: fd.get("attendance"),
          side: fd.get("side"),
          consent: true,
          consentAt: new Date().toISOString(),
          at: new Date().toISOString(),
        };
        try {
          if (fbDb) {
            await fbDb.collection("rsvp").add(entry);
          } else {
            const list = JSON.parse(localStorage.getItem("wedding_rsvp") || "[]");
            list.push(entry);
            localStorage.setItem("wedding_rsvp", JSON.stringify(list));
          }
          localStorage.setItem(RSVP_DONE_KEY, "1");
          form.classList.add("hidden");
          $("#rsvp-ok")?.classList.remove("hidden");
          toast("참석 여부가 전달되었습니다");
          setTimeout(closeRsvpModal, 1600);
        } catch (err) {
          console.warn(err);
          toast("전송 중 오류가 발생했습니다");
        }
      });
    }
  }

  // ---------- GUESTBOOK ----------
  const GB_PAGE = 5;
  let gbVisible = GB_PAGE;
  let gbEditing = null;
  let gbData = [];

  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

  function loadGb() {
    try { return JSON.parse(localStorage.getItem("wedding_gb") || "[]"); }
    catch { return []; }
  }
  function saveGb(list) { localStorage.setItem("wedding_gb", JSON.stringify(list)); }
  function gbRefreshLocal() {
    gbData = loadGb().sort((a, b) => new Date(b.at) - new Date(a.at));
    renderGbList();
  }

  // 저장소 추상화 — Firebase 있으면 공유, 없으면 로컬
  async function gbAdd(entry) {
    if (fbDb) {
      await fbDb.collection("guestbook").add(entry);
    } else {
      const all = loadGb();
      all.push({ id: genId(), ...entry });
      saveGb(all);
      gbRefreshLocal();
    }
  }
  async function gbUpdate(id, fields) {
    if (fbDb) {
      await fbDb.collection("guestbook").doc(id).update(fields);
    } else {
      const all = loadGb();
      const i = all.findIndex((e) => e.id === id);
      if (i >= 0) { Object.assign(all[i], fields); saveGb(all); }
      gbRefreshLocal();
    }
  }
  async function gbRemove(id) {
    if (fbDb) {
      await fbDb.collection("guestbook").doc(id).delete();
    } else {
      saveGb(loadGb().filter((e) => e.id !== id));
      gbRefreshLocal();
    }
  }

  function gbItemHtml(it) {
    const d = new Date(it.at).toLocaleDateString("ko-KR", { month: "long", day: "numeric" });
    if (it.id === gbEditing) {
      return `<li class="gb-item">
        <div class="gb-top"><span class="gb-name">${escapeHtml(it.name)}</span><span class="gb-date">${d}</span></div>
        <div class="gb-edit">
          <textarea data-id="${it.id}" rows="3" maxlength="500">${escapeHtml(it.message)}</textarea>
          <div class="gb-edit-acts">
            <button class="cancel" data-id="${it.id}" type="button">취소</button>
            <button class="save" data-id="${it.id}" type="button">저장</button>
          </div>
        </div>
      </li>`;
    }
    return `<li class="gb-item">
      <div class="gb-top"><span class="gb-name">${escapeHtml(it.name)}</span><span class="gb-date">${d}</span></div>
      <p class="gb-msg">${escapeHtml(it.message)}</p>
      <div class="gb-actions">
        <button class="gb-edit-btn" data-id="${it.id}" type="button">수정</button>
        <button class="gb-del-btn" data-id="${it.id}" type="button">삭제</button>
      </div>
    </li>`;
  }

  function renderGbList() {
    const ul = $("#gb-list"), more = $("#gb-more");
    if (!ul) return;
    const all = gbData;

    if (!all.length) {
      ul.innerHTML = `<li class="gb-empty">첫 번째 축하 메시지를 남겨주세요</li>`;
      more?.classList.add("hidden");
      return;
    }

    ul.innerHTML = all.slice(0, gbVisible).map(gbItemHtml).join("");

    $$("#gb-list .gb-edit-btn").forEach((b) => b.addEventListener("click", () => gbStartEdit(b.dataset.id)));
    $$("#gb-list .gb-del-btn").forEach((b) => b.addEventListener("click", () => gbDelete(b.dataset.id)));
    $$("#gb-list .save").forEach((b) => b.addEventListener("click", () => gbSaveEdit(b.dataset.id)));
    $$("#gb-list .cancel").forEach((b) => b.addEventListener("click", () => { gbEditing = null; renderGbList(); }));

    if (more) {
      if (all.length > gbVisible) {
        more.classList.remove("hidden");
        more.textContent = `더 보기 (${all.length - gbVisible})`;
      } else {
        more.classList.add("hidden");
      }
    }
  }

  async function gbVerify(entry) {
    if (!entry.pw) return true;
    const v = await openModal({
      title: "비밀번호 확인",
      desc: "작성 시 입력한 비밀번호를 입력해주세요.",
      input: true, okText: "확인",
    });
    if (v == null) return false;
    if (String(v) !== String(entry.pw)) { toast("비밀번호가 일치하지 않습니다"); return false; }
    return true;
  }

  async function gbStartEdit(id) {
    const entry = gbData.find((e) => e.id === id);
    if (!entry) return;
    if (!(await gbVerify(entry))) return;
    gbEditing = id;
    renderGbList();
    $(`#gb-list textarea[data-id="${id}"]`)?.focus();
  }

  async function gbSaveEdit(id) {
    const ta = $(`#gb-list textarea[data-id="${id}"]`);
    if (!ta) return;
    const msg = ta.value.trim();
    if (!msg) { toast("메시지를 입력해주세요"); return; }
    gbEditing = null;
    try {
      await gbUpdate(id, { message: msg });
      renderGbList();
      toast("메시지가 수정되었습니다");
    } catch (err) {
      console.warn(err);
      toast("수정 중 오류가 발생했습니다");
    }
  }

  async function gbDelete(id) {
    const entry = gbData.find((e) => e.id === id);
    if (!entry) return;
    if (!(await gbVerify(entry))) return;
    const ok = await openModal({
      title: "삭제할까요?",
      desc: "삭제한 메시지는 되돌릴 수 없습니다.",
      okText: "삭제",
    });
    if (ok == null) return;
    try {
      await gbRemove(id);
      toast("메시지가 삭제되었습니다");
    } catch (err) {
      console.warn(err);
      toast("삭제 중 오류가 발생했습니다");
    }
  }

  function initGb() {
    const form = $("#gb-form");
    if (!form) return;

    if (fbDb) {
      // Firebase 실시간 구독 — 모든 기기에서 공유
      fbDb.collection("guestbook").orderBy("at", "desc").onSnapshot(
        (snap) => {
          gbData = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          renderGbList();
        },
        (err) => {
          console.warn("[wedding] 방명록 구독 오류:", err);
          toast("방명록을 불러오지 못했습니다");
        }
      );
    } else {
      // 로컬 저장 — 예전 데이터에 id 없으면 부여
      const list = loadGb();
      let changed = false;
      list.forEach((e) => { if (!e.id) { e.id = genId(); changed = true; } });
      if (changed) saveGb(list);
      gbRefreshLocal();
    }

    $("#gb-more")?.addEventListener("click", () => { gbVisible += GB_PAGE; renderGbList(); });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name = $("#gb-name").value.trim();
      const message = $("#gb-msg").value.trim();
      const pw = ($("#gb-pw")?.value || "").trim();
      if (!name || !message) return;
      try {
        await gbAdd({ name, message, pw, at: new Date().toISOString() });
        form.reset();
        gbVisible = GB_PAGE;
        toast("메시지가 등록되었습니다");
      } catch (err) {
        console.warn(err);
        toast("등록 중 오류가 발생했습니다");
      }
    });
  }

  // ---------- OUTRO ----------
  function renderOutro() {
    setText("#outro-thanks", cfg.thanksMessage || "Thank you");
    setText("#outro-groom", groom.nameEn || groom.name);
    setText("#outro-bride", bride.nameEn || bride.name);
    const d = weddingDate();
    if (d) setText("#outro-date", `${EN_MONTHS[d.getMonth()]} ${d.getDate()}. ${d.getFullYear()}`);
  }

  // ---------- BGM ----------
  function initBgm() {
    const bgm = cfg.bgm, audio = $("#bgm-audio"), btn = $("#bgm-toggle");
    if (!bgm || !bgm.src || !audio || !btn) { btn?.classList.add("hidden"); return; }

    audio.src = bgm.src;
    audio.setAttribute("playsinline", "");
    audio.setAttribute("webkit-playsinline", "");

    let playing = false;
    let userPaused = false; // 사용자가 버튼으로 끈 경우 자동재생 안 함

    function ui() {
      btn.classList.toggle("playing", playing);
      btn.querySelector(".icon-music")?.classList.toggle("hidden", !playing);
      btn.querySelector(".icon-muted")?.classList.toggle("hidden", playing);
    }

    function tryPlay(isAuto) {
      if (userPaused && isAuto) return Promise.resolve();
      return audio.play().catch(() => {
        if (!isAuto) toast("음악을 재생할 수 없습니다");
      });
    }

    // 페이지 로드 시 자동 재생 시도 (PC·일부 환경에서 바로 재생됨)
    tryPlay(true);

    // 모바일: 자동재생이 막혀 있으면 첫 터치·스크롤·클릭 때 재생
    function unlockAutoplay() {
      if (!userPaused && audio.paused) tryPlay(true);
    }
    ["touchstart", "touchend", "click", "scroll"].forEach((ev) => {
      document.addEventListener(ev, unlockAutoplay, { once: true, passive: true });
    });

    btn.addEventListener("click", () => {
      if (playing) {
        userPaused = true;
        audio.pause();
      } else {
        userPaused = false;
        tryPlay(false);
      }
    });

    audio.addEventListener("play", () => { playing = true; ui(); });
    audio.addEventListener("pause", () => { playing = false; ui(); });
  }

  // ---------- 커버: 스크롤 시 왼쪽으로 사라지기 ----------
  function initCoverParallax() {
    const cover = $("#ch-cover");
    const photo = cover?.querySelector(".cover-photo");
    const inner = cover?.querySelector(".cover-inner");
    const cue = cover?.querySelector(".scroll-cue");
    if (!cover || !photo) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let ticking = false;
    function update() {
      const h = cover.offsetHeight || window.innerHeight;
      const p = Math.min(1, Math.max(0, window.scrollY / h));
      const x = -p * 64; // 왼쪽으로 이동(%)
      photo.style.transform = `translateX(${x}%)`;
      photo.style.opacity = String(Math.max(0, 1 - p * 0.9));
      if (inner) {
        inner.style.transform = `translateX(${x * 0.55}%)`;
        inner.style.opacity = String(Math.max(0, 1 - p * 1.15));
      }
      if (cue) cue.style.opacity = String(Math.max(0, 1 - p * 2.5));
      ticking = false;
    }
    window.addEventListener("scroll", () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });
    update();
  }

  // ---------- 스크롤 리빌 + 챕터 전환 ----------
  function initReveal() {
    const els = $$(".reveal, .reveal-line");
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("in"));
      return;
    }
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const d = en.target.getAttribute("data-d");
          if (d) en.target.style.setProperty("--d", d + "ms");
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
    els.forEach((el) => io.observe(el));
  }

  // ---------- 진행 도트 + 프로그레스 바 ----------
  function initNav() {
    const chapters = $$("[data-chapter]");
    const dots = $("#dots");
    const bar = $("#scroll-progress");

    if (dots) {
      chapters.forEach((sec) => {
        const b = document.createElement("button");
        b.setAttribute("aria-label", sec.dataset.chapter);
        b.title = sec.dataset.chapter;
        b.addEventListener("click", () =>
          sec.scrollIntoView({ behavior: "smooth", block: "start" })
        );
        dots.appendChild(b);
      });
    }
    const dotBtns = dots ? $$("button", dots) : [];

    const active = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          const idx = chapters.indexOf(en.target);
          dotBtns.forEach((d, i) => d.classList.toggle("active", i === idx));
        }
      });
    }, { threshold: 0.5 });
    chapters.forEach((c) => active.observe(c));

    function onScroll() {
      if (!bar) return;
      const h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + "%";
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  // ---------- INIT ----------
  function init() {
    initFirebase();
    renderCover();
    renderInvitation();
    renderDate();
    renderGallery();
    renderLocation();
    renderAccounts();
    initRsvp();
    initGb();
    renderOutro();
    initBgm();
    initCoverParallax();
    initReveal();
    initNav();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
