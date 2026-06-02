const ACCESS_STORE_KEY = "spring_of_zen_access";
const ACCESS_PROTECTED_PAGES = new Set([
  "lamp.html",
  "harbor.html",
  "table.html",
  "window.html",
  "rooms.html"
]);
let v71DataPromise = null;

function normalizeAccessKey(value) {
  return String(value || "").trim().toUpperCase();
}

function currentPageName() {
  const page = window.location.pathname.split("/").filter(Boolean).pop() || "index.html";
  return page.toLowerCase();
}

function activeAccessKeys(data) {
  return new Set((data?.key_system?.sample_keys || [])
    .filter((entry) => entry.status === "active")
    .map((entry) => normalizeAccessKey(entry.key)));
}

function storedAccessKey() {
  const record = readJsonStore(ACCESS_STORE_KEY, null);
  return normalizeAccessKey(record?.key);
}

function renderAccessRequired() {
  const lang = getSharedLang();
  const zh = lang === "zh";
  document.body.classList.add("access-required-page");
  document.body.innerHTML = `
    <main class="access-required" aria-labelledby="accessRequiredTitle">
      <section class="access-required-panel">
        <p class="part-kicker">${zh ? "邀請制" : "Invitation Only"}</p>
        <h1 id="accessRequiredTitle">${zh ? "請先用鑰匙進入。" : "Please enter with a key first."}</h1>
        <p>${zh ? "Spring of Zen 目前只向受邀訪客開放。回到入口，輸入邀請鑰匙後再進入房間。" : "Spring of Zen is currently open to invited guests. Return to the entrance and use an invitation key before entering the rooms."}</p>
        <div class="access-required-actions">
          <a href="index.html?access=required">${zh ? "回到入口" : "Back to entrance"}</a>
          <a href="door.html#request-key">${zh ? "申請邀請" : "Request invitation"}</a>
        </div>
      </section>
    </main>
  `;
}

async function initAccessGate() {
  if (!ACCESS_PROTECTED_PAGES.has(currentPageName())) return true;
  const data = await loadV71Data();
  const validKeys = activeAccessKeys(data);
  if (validKeys.has(storedAccessKey())) return true;
  renderAccessRequired();
  return false;
}

function initGreeting() {
  const greeting = document.getElementById("greeting");
  if (!greeting) return;
  const hour = new Date().getHours();
  let text = "The light is still on.";
  if (hour < 5) text = "It is very late. You are still welcome.";
  else if (hour < 11) text = "The morning is quiet. So are we.";
  else if (hour < 17) text = "The afternoon light is soft today.";
  else if (hour < 21) text = "Evening. The kettle is on.";
  greeting.textContent = text;
}

function initAudioToggle() {
  const audio = document.getElementById("roomTone");
  const toggle = document.getElementById("roomToneToggle");
  const inlineToggle = document.querySelector("[data-tone-link]");
  if (!audio || !toggle) return;
  let fadeTimer = null;

  const setLabel = (playing) => {
    const text = getSharedText();
    toggle.textContent = playing ? text.listening : text.roomTone;
    toggle.setAttribute("aria-pressed", playing ? "true" : "false");
    if (inlineToggle) inlineToggle.hidden = playing;
  };

  const fadeTo = (target) => {
    window.clearInterval(fadeTimer);
    const direction = target > audio.volume ? 1 : -1;
    fadeTimer = window.setInterval(() => {
      const next = Math.max(0, Math.min(target, audio.volume + direction * 0.025));
      audio.volume = next;
      if (next === target || next === 0) {
        window.clearInterval(fadeTimer);
        if (next === 0) audio.pause();
      }
    }, 80);
  };

  const start = async () => {
    try {
      audio.volume = audio.paused ? 0 : audio.volume;
      await audio.play();
      setLabel(true);
      fadeTo(0.3);
    } catch {
      setLabel(false);
    }
  };

  const stop = () => {
    setLabel(false);
    fadeTo(0);
  };

  const toggleAudio = () => {
    if (audio.paused || toggle.getAttribute("aria-pressed") === "false") start();
    else stop();
  };

  toggle.addEventListener("click", toggleAudio);
  if (inlineToggle) inlineToggle.addEventListener("click", start);
}

function initReveal() {
  const nodes = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window)) {
    nodes.forEach((node) => node.classList.add("is-revealed"));
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-revealed");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.18 });
  nodes.forEach((node) => observer.observe(node));
}

function initBreathingCircle() {
  const text = document.querySelector("[data-breathing-text]");
  if (!text) return;
  const cycle = 6000;
  const render = () => {
    const phase = Date.now() % cycle;
    text.textContent = phase < cycle / 2 ? "breathe in" : "breathe out";
    window.requestAnimationFrame(render);
  };
  render();
}

function initOneWordNote() {
  const form = document.getElementById("oneWordForm");
  const input = document.getElementById("oneWordInput");
  const panel = document.querySelector("[data-one-word-panel]");
  if (!form || !input || !panel) return;
  const showThanks = (word) => {
    const text = getSharedText();
    panel.innerHTML = `
      <div class="word-thanks">
        <blockquote>"${word.replace(/[<>&"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" }[char]))}"</blockquote>
        <p>${text.tableThanks}</p>
      </div>
    `;
  };

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    localStorage.setItem("spring_of_zen_one_word", value);
    showThanks(value);
  });

  input.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    form.requestSubmit();
  });
}

const sharedI18n = {
  en: {
    htmlLang: "en",
    navLamp: "lamp",
    navHarbor: "harbor",
    navTable: "table",
    navWindow: "window",
    navRooms: "rooms",
    navDoor: "door",
    roomTone: "room tone",
    listening: "listening",
    lampKicker: "The Lamp",
    lampTitle: "The light is still on.",
    lampLine: "One thought. No feed. No next thing.",
    recorded: "Recorded",
    lampIntroTitle: "The world is already awake.",
    lampIntroLine: "Sit for a while.",
    todayFaces: "Today the lamp faces",
    recordedOn: "recorded on",
    listenIdle: "Listen",
    listenActive: "Listening",
    listenRetry: "Try again",
    watchLive: "Watch live →",
    watchLiveTitle: "Live window",
    liveModalNote: "This window uses the uploaded daily recording.",
    openLiveSource: "Open source reference →",
    recordedNote: "This is not a live stream. A carefully selected recording from somewhere in the world.",
    leaveNote: "Leave a note at the table →",
    sceneFrom: "This scene is from",
    harborKicker: "The Harbor",
    harborTitle: "Somewhere a small dock,<br>a single light,<br>water moving without hurry.",
    harborLine: "This is what the inside of your chest can feel like, if you give it a few minutes.",
    harborLabLine: "Daily music from the Consciousness Sound Lab is playing inside Night Harbor.",
    enterNightHarbor: "Enter Night Harbor →",
    breatheIn: "breathe in",
    breatheOut: "breathe out",
    breathCycle: "six seconds, one cycle",
    harborThought: "AI can give us back our time.<br><span>But it cannot tell us what to do<br>with the silence it returns.</span>",
    turnOnRoomTone: "turn on the room tone",
    tableKicker: "The Table",
    tableTitle: "Before you go,<br>leave one word for the room.",
    tableLabel: "One word for the room",
    tablePlaceholder: "quiet",
    tableHelp: "press enter to leave it on the table",
    tableThanks: "Thank you. The room is a little warmer now.",
    windowKicker: "The Window",
    windowTitle: "What still exists that people have forgotten to notice?",
    windowLine: "A quiet street after rain. No one owns the reflection."
  },
  zh: {
    htmlLang: "zh-Hant",
    navLamp: "燈",
    navHarbor: "港灣",
    navTable: "桌子",
    navWindow: "窗",
    navRooms: "房間",
    navDoor: "門",
    roomTone: "房間聲",
    listening: "正在聽",
    lampKicker: "燈",
    lampTitle: "燈一直亮著。",
    lampLine: "一個念頭。沒有訊息流。沒有下一件事。",
    recorded: "已錄製",
    lampIntroTitle: "世界已經醒來。",
    lampIntroLine: "坐一會兒。",
    todayFaces: "今天這盞燈面向",
    recordedOn: "錄製於",
    listenIdle: "聽一會兒",
    listenActive: "正在聽",
    listenRetry: "再試一次",
    watchLive: "觀看直播 →",
    watchLiveTitle: "直播窗口",
    liveModalNote: "這個窗口播放今日上傳的錄像。",
    openLiveSource: "打開來源參考 →",
    recordedNote: "這不是直播。這是一段來自世界某處、被細心挑選的錄像。",
    leaveNote: "去桌邊留一句話 →",
    sceneFrom: "這個畫面來自",
    harborKicker: "港灣",
    harborTitle: "某處有一座小碼頭，<br>一盞燈，<br>水不著急地流動。",
    harborLine: "如果你願意給它幾分鐘，胸口裡面也可以像這樣。",
    harborLabLine: "Consciousness Sound Lab 的每日音樂正在夜港裡播放。",
    enterNightHarbor: "進入夜港 →",
    breatheIn: "吸氣",
    breatheOut: "呼氣",
    breathCycle: "六秒，一個循環",
    harborThought: "AI 可以把時間還給我們。<br><span>但它不能告訴我們<br>該如何安放被歸還的寂靜。</span>",
    turnOnRoomTone: "打開房間聲",
    tableKicker: "桌子",
    tableTitle: "離開以前，<br>留一個字給房間。",
    tableLabel: "留一個字給房間",
    tablePlaceholder: "靜",
    tableHelp: "按下 Enter，把它留在桌上",
    tableThanks: "謝謝。房間暖了一點。",
    windowKicker: "窗",
    windowTitle: "還有什麼仍然存在，只是被人忘了看見？",
    windowLine: "雨後的安靜街道。倒影不屬於任何人。"
  }
};

function getSharedLang() {
  return localStorage.getItem("spring_of_zen_lang") || "en";
}

function getSharedText() {
  return sharedI18n[getSharedLang()] || sharedI18n.en;
}

function applySharedLanguage(lang) {
  const text = sharedI18n[lang] || sharedI18n.en;
  localStorage.setItem("spring_of_zen_lang", lang);
  document.documentElement.lang = text.htmlLang;
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = text[node.dataset.i18n];
  });
  document.querySelectorAll("[data-i18n-html]").forEach((node) => {
    node.innerHTML = text[node.dataset.i18nHtml];
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", text[node.dataset.i18nPlaceholder]);
  });
  const audio = document.getElementById("roomTone");
  const toggle = document.getElementById("roomToneToggle");
  if (toggle && (!audio || audio.paused)) toggle.textContent = text.roomTone;
  if (toggle && audio && !audio.paused) toggle.textContent = text.listening;
  document.querySelectorAll("[data-lang-button]").forEach((button) => {
    button.classList.toggle("active", button.dataset.langButton === lang);
  });
  updateLampDynamicLanguage(lang);
}

function initSharedLanguageSwitch() {
  if (!document.querySelector("[data-lang-button]")) return;
  document.querySelectorAll("[data-lang-button]").forEach((button) => {
    button.addEventListener("click", () => applySharedLanguage(button.dataset.langButton));
  });
  applySharedLanguage(getSharedLang());
}

function initHarborBreath() {
  const label = document.querySelector("[data-breath-label]");
  if (!label) return;
  const update = () => {
    const text = getSharedText();
    const progress = (Date.now() % 6000) / 6000;
    label.textContent = progress < 0.5 ? text.breatheIn : text.breatheOut;
  };
  update();
  window.setInterval(update, 160);
}

function formatLampDate(dateString, lang) {
  if (!dateString) return "";
  const match = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return dateString;
  const [, year, month, day] = match;
  if (lang === "zh") return `${year}年${Number(month)}月${Number(day)}日`;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];
  return `${months[Number(month) - 1]} ${Number(day)}, ${year}`;
}

let currentLampData = {
  live_url: "https://www.skylinewebcams.com/en/webcam/norge/nordland/lofoten/reine.html"
};

function updateLampDynamicLanguage(lang = getSharedLang()) {
  const date = document.querySelector("[data-lamp-date]");
  if (date && currentLampData.date) date.textContent = formatLampDate(currentLampData.date, lang);
}

function openLampLive() {
  const liveModal = document.querySelector("[data-live-modal]");
  const liveVideo = document.querySelector("[data-live-video]");
  if (!liveModal || !liveVideo || !currentLampData.video) return;
  if (liveVideo.src !== currentLampData.video) liveVideo.src = currentLampData.video;
  liveModal.hidden = false;
  liveVideo.play().catch(() => {});
}

function closeLampLive() {
  const liveModal = document.querySelector("[data-live-modal]");
  const liveVideo = document.querySelector("[data-live-video]");
  if (liveModal) liveModal.hidden = true;
  if (liveVideo) liveVideo.pause();
}

window.openLampLive = openLampLive;
window.closeLampLive = closeLampLive;
globalThis.openLampLive = openLampLive;
globalThis.closeLampLive = closeLampLive;

async function initEarthLamp() {
  const page = document.querySelector("[data-lamp-page]");
  if (!page) return;
  let data = {
    title: "Sunrise over Lofoten",
    country: "Norway",
    date: "2026-05-18",
    video: "",
    poster: "assets/img/still-water.webp",
    live_url: "https://www.skylinewebcams.com/en/webcam/norge/nordland/lofoten/reine.html",
    quote: "The world is already awake."
  };
  try {
    const response = await fetch("assets/data/lamp.json", { cache: "no-store" });
    if (response.ok) data = { ...data, ...(await response.json()) };
  } catch {
    /* The lamp keeps glowing with its built-in fallback. */
  }
  currentLampData = data;

  const title = document.querySelector("[data-lamp-title]");
  const country = document.querySelector("[data-lamp-country]");
  const place = document.querySelector("[data-lamp-place]");
  const date = document.querySelector("[data-lamp-date]");
  const quote = document.querySelector("[data-lamp-quote]");
  const live = document.querySelector("[data-lamp-live]");
  const liveVideo = document.querySelector("[data-live-video]");
  const liveSource = document.querySelector("[data-live-source]");
  const video = document.querySelector("[data-lamp-video]");
  const frame = document.querySelector(".lamp-video-window");
  if (title) title.textContent = data.title;
  if (country) country.textContent = data.country;
  if (place) place.textContent = data.country;
  updateLampDynamicLanguage();
  if (quote) quote.textContent = data.quote;
  if (liveSource) liveSource.href = data.live_url;
  if (liveVideo && data.poster) liveVideo.setAttribute("poster", data.poster);
  if (liveVideo && data.video) liveVideo.src = data.video;
  if (video && data.poster) video.setAttribute("poster", data.poster);
  if (video && data.video) {
    const showAndPlayLampVideo = () => {
      frame?.classList.add("has-video");
      video.play().catch(() => {});
    };
    video.addEventListener("loadedmetadata", showAndPlayLampVideo, { once: true });
    video.addEventListener("canplay", showAndPlayLampVideo, { once: true });
    video.src = data.video;
    video.load();
    showAndPlayLampVideo();
  }

  const intro = document.querySelector("[data-lamp-intro]");
  window.setTimeout(() => intro?.classList.add("is-faded"), 3000);

  const recorded = document.querySelector("[data-recorded-info]");
  const note = document.querySelector("[data-recorded-note]");
  const close = document.querySelector("[data-close-recorded]");
  recorded?.addEventListener("click", () => {
    if (note) note.hidden = !note.hidden;
  });
  close?.addEventListener("click", () => {
    if (note) note.hidden = true;
  });

  const liveModal = document.querySelector("[data-live-modal]");
  const closeLive = document.querySelector("[data-close-live]");
  live?.addEventListener("click", openLampLive);
  closeLive?.addEventListener("click", closeLampLive);
  liveModal?.addEventListener("click", (event) => {
    if (event.target !== liveModal) return;
    closeLampLive();
  });

  const listen = document.querySelector("[data-lamp-listen]");
  const audio = document.getElementById("roomTone");
  if (audio && data.audio) audio.src = data.audio;
  let lampFade = null;
  const fadeLampAudio = (target) => {
    if (!audio) return;
    window.clearInterval(lampFade);
    const step = target > audio.volume ? 0.025 : -0.04;
    lampFade = window.setInterval(() => {
      const next = Math.max(0, Math.min(target, audio.volume + step));
      audio.volume = next;
      if (next === target || next === 0) {
        window.clearInterval(lampFade);
        if (next === 0) audio.pause();
      }
    }, 80);
  };
  listen?.addEventListener("click", async () => {
    if (!audio) return;
    const text = getSharedText();
    if (audio.paused) {
      try {
        audio.volume = 0;
        await audio.play();
        listen.textContent = text.listenActive;
        fadeLampAudio(0.3);
      } catch {
        listen.textContent = text.listenRetry;
      }
    } else {
      listen.textContent = text.listenIdle;
      fadeLampAudio(0);
    }
  });
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[<>&"]/g, (char) => ({
    "<": "&lt;",
    ">": "&gt;",
    "&": "&amp;",
    "\"": "&quot;"
  }[char]));
}

async function loadV71Data() {
  if (v71DataPromise) return v71DataPromise;
  v71DataPromise = (async () => {
  try {
    const response = await fetch("assets/data/v71.json", { cache: "no-store" });
    if (response.ok) return response.json();
  } catch {
    /* v7.1 pages keep their static shell if data cannot load. */
  }
  return null;
  })();
  return v71DataPromise;
}

function readJsonStore(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJsonStore(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function currentMonthLabel() {
  const date = new Date();
  const month = date.toLocaleString("en", { month: "long" });
  return `${month} ${date.getFullYear()}`;
}

function v71VisitorId() {
  const key = "spring_of_zen_visitor_id";
  const existing = localStorage.getItem(key);
  if (existing) return existing;
  const id = `Visitor #${Math.floor(100 + Math.random() * 900)}`;
  localStorage.setItem(key, id);
  return id;
}

function incrementV71Metric(name, amount = 1) {
  const metrics = readJsonStore("spring_of_zen_v71_metrics", {
    contribution_count: 0,
    resonance: 0,
    return_visits: 1
  });
  metrics[name] = (Number(metrics[name]) || 0) + amount;
  writeJsonStore("spring_of_zen_v71_metrics", metrics);
  return metrics;
}

function renderMemoryCard(item, local = false) {
  const reflectionCount = Array.isArray(item.reflections) ? item.reflections.length : Number(item.reflections || 0);
  const meta = [
    item.visitor,
    item.length,
    item.month,
    item.state || (local ? "Pending Shelf" : "")
  ].filter(Boolean).map(escapeHtml).join(" · ");
  return `
    <article class="memory-card ${local ? "is-pending" : ""}">
      <p class="memory-type">${escapeHtml(item.type)}</p>
      <blockquote>${escapeHtml(item.body)}</blockquote>
      <p class="memory-meta">${meta}</p>
      <div class="memory-stats">
        <span>Resonance ${Number(item.resonance) || 0}</span>
        <span>Reflections ${reflectionCount}</span>
      </div>
    </article>
  `;
}

function renderArchiveCard(item) {
  return `
    <article class="archive-card">
      <p class="memory-type">${escapeHtml(item.month)}</p>
      <h3>${Number(item.contributions) || 0} Contributions</h3>
      <dl>
        <div><dt>Top Resonant Memory</dt><dd>${escapeHtml(item.top_resonant_memory)}</dd></div>
        <div><dt>Most Shared Sound</dt><dd>${escapeHtml(item.most_shared_sound)}</dd></div>
        <div><dt>Most Kept Photograph</dt><dd>${escapeHtml(item.most_kept_photograph)}</dd></div>
      </dl>
    </article>
  `;
}

async function initMemoryShelf() {
  const shelf = document.querySelector("[data-memory-shelf]");
  const archive = document.querySelector("[data-memory-archive]");
  const form = document.querySelector("[data-memory-form]");
  if (!shelf && !form) return;

  const data = await loadV71Data();
  const localItems = readJsonStore("spring_of_zen_pending_memories", []);
  const openItems = data?.memory_shelf?.items || [];
  if (shelf) shelf.innerHTML = [...localItems.map((item) => ({ ...item, local: true })), ...openItems]
    .map((item) => renderMemoryCard(item, item.local))
    .join("");
  if (archive) archive.innerHTML = (data?.archive?.months || []).map(renderArchiveCard).join("");

  const status = document.querySelector("[data-memory-status]");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const fields = new FormData(form);
    const body = String(fields.get("body") || "").trim();
    if (!body) return;
    const item = {
      id: `local-${Date.now()}`,
      type: String(fields.get("type") || "A Thought"),
      body,
      visitor: String(fields.get("visitor") || "").trim() || v71VisitorId(),
      month: currentMonthLabel(),
      state: "Pending Shelf",
      resonance: 0,
      reflections: []
    };
    const next = [item, ...readJsonStore("spring_of_zen_pending_memories", [])];
    writeJsonStore("spring_of_zen_pending_memories", next);
    incrementV71Metric("contribution_count");
    if (status) status.textContent = "Placed on the Pending Shelf. A curator can decide Open, Archive, or Private later.";
    form.reset();
    if (shelf) shelf.innerHTML = [...next.map((entry) => ({ ...entry, local: true })), ...openItems]
      .map((entry) => renderMemoryCard(entry, entry.local))
      .join("");
  });
}

function renderWindowItem(item) {
  const state = readJsonStore(`spring_of_zen_window_${item.id}`, { resonance: 0, reflections: [], kept: false });
  const resonance = (Number(item.resonance) || 0) + (Number(state.resonance) || 0);
  const reflectionCount = (Number(item.reflections) || 0) + (Array.isArray(state.reflections) ? state.reflections.length : 0);
  const kept = (Number(item.kept) || 0) + (state.kept ? 1 : 0);
  return `
    <article class="window-item" data-window-item="${escapeHtml(item.id)}">
      <p class="memory-type">${escapeHtml(item.type)} · ${escapeHtml(item.source)}</p>
      <h2>${escapeHtml(item.title)}</h2>
      <p>${escapeHtml(item.summary)}</p>
      <div class="memory-stats">
        <span data-resonance-count>Resonance ${resonance}</span>
        <span data-reflection-count>Reflections ${reflectionCount}</span>
        <span data-keep-count>Kept ${kept}</span>
      </div>
      <div class="window-actions">
        <button type="button" data-window-resonate>Resonance</button>
        <button type="button" data-window-reflect>Reflection</button>
        <button type="button" data-window-keep>${state.kept ? "Kept" : "Keep"}</button>
        <a href="${escapeHtml(item.href)}">Open</a>
      </div>
      <form class="reflection-form" data-reflection-form hidden>
        <textarea rows="3" maxlength="260" placeholder="What did this open in you?"></textarea>
        <button type="submit">Leave Reflection</button>
      </form>
    </article>
  `;
}

async function initCuratedWindow() {
  const root = document.querySelector("[data-window-items]");
  if (!root) return;
  const data = await loadV71Data();
  const items = (data?.window?.items || []).slice(0, 3);
  root.innerHTML = items.map(renderWindowItem).join("");
  root.addEventListener("click", (event) => {
    const card = event.target.closest("[data-window-item]");
    if (!card) return;
    const id = card.dataset.windowItem;
    const stateKey = `spring_of_zen_window_${id}`;
    const state = readJsonStore(stateKey, { resonance: 0, reflections: [], kept: false });
    let handled = false;
    if (event.target.matches("[data-window-resonate]")) {
      state.resonance = (Number(state.resonance) || 0) + 1;
      incrementV71Metric("resonance");
      handled = true;
    }
    if (event.target.matches("[data-window-keep]")) {
      state.kept = true;
      handled = true;
    }
    if (event.target.matches("[data-window-reflect]")) {
      const form = card.querySelector("[data-reflection-form]");
      if (form) form.hidden = !form.hidden;
      return;
    }
    if (!handled) return;
    writeJsonStore(stateKey, state);
    const source = items.find((item) => item.id === id);
    if (source) card.outerHTML = renderWindowItem(source);
  });
  root.addEventListener("submit", (event) => {
    const form = event.target.closest("[data-reflection-form]");
    const card = event.target.closest("[data-window-item]");
    if (!form || !card) return;
    event.preventDefault();
    const text = form.querySelector("textarea").value.trim();
    if (!text) return;
    const id = card.dataset.windowItem;
    const stateKey = `spring_of_zen_window_${id}`;
    const state = readJsonStore(stateKey, { resonance: 0, reflections: [], kept: false });
    state.reflections = Array.isArray(state.reflections) ? state.reflections : [];
    state.reflections.push(text);
    writeJsonStore(stateKey, state);
    incrementV71Metric("contribution_count");
    const source = items.find((item) => item.id === id);
    if (source) card.outerHTML = renderWindowItem(source);
  });
}

function renderRoomCard(room) {
  const isOpen = room.status === "open";
  return `
    <article class="room-card ${isOpen ? "is-open" : "is-future"}" id="${escapeHtml(room.id)}">
      <p class="memory-type">${isOpen ? "Open Room" : "Future Room"}</p>
      <h2>${escapeHtml(room.name)}</h2>
      <dl>
        <div><dt>Atmosphere</dt><dd>${escapeHtml(room.atmosphere)}</dd></div>
        <div><dt>Visual Identity</dt><dd>${escapeHtml(room.visual_identity)}</dd></div>
        <div><dt>Curator</dt><dd>${escapeHtml(room.curator)}</dd></div>
      </dl>
      <a class="room-link" href="${escapeHtml(room.href)}">${isOpen ? "Enter Room" : "Open A Room"}</a>
    </article>
  `;
}

async function initRooms() {
  const root = document.querySelector("[data-room-list]");
  const principle = document.querySelector("[data-room-principle]");
  if (!root) return;
  const data = await loadV71Data();
  if (principle && data?.rooms?.principle) principle.textContent = data.rooms.principle;
  root.innerHTML = (data?.rooms?.items || []).map(renderRoomCard).join("");
}

async function initDoor() {
  const pathsRoot = document.querySelector("[data-door-paths]");
  const form = document.querySelector("[data-door-form]");
  const residentRoot = document.querySelector("[data-resident-panel]");
  if (!pathsRoot && !form && !residentRoot) return;
  const data = await loadV71Data();
  if (pathsRoot) {
    pathsRoot.innerHTML = (data?.door?.paths || []).map((path) => `
      <article class="door-path" id="${escapeHtml(path.id)}">
        <p class="part-kicker">The Door</p>
        <h2>${escapeHtml(path.title)}</h2>
        <p>${escapeHtml(path.body)}</p>
      </article>
    `).join("");
  }
  if (residentRoot) {
    const thresholds = data?.resident_creator?.thresholds || {};
    const metrics = readJsonStore("spring_of_zen_v71_metrics", {
      contribution_count: 0,
      resonance: 0,
      return_visits: 1
    });
    residentRoot.innerHTML = `
      <p>${escapeHtml(data?.resident_creator?.message || "You have been noticed.")}</p>
      <p>${escapeHtml(data?.resident_creator?.invitation || "Would you like to open a room?")}</p>
      <div class="resident-metrics">
        <span>Contributions ${Number(metrics.contribution_count) || 0}/${Number(thresholds.contribution_count) || 10}</span>
        <span>Resonance ${Number(metrics.resonance) || 0}/${Number(thresholds.resonance) || 100}</span>
        <span>Return Visits ${Number(metrics.return_visits) || 1}/${Number(thresholds.return_visits) || 5}</span>
      </div>
    `;
  }
  const status = document.querySelector("[data-door-status]");
  form?.addEventListener("submit", (event) => {
    event.preventDefault();
    const request = Object.fromEntries(new FormData(form).entries());
    request.created_at = new Date().toISOString();
    const next = [request, ...readJsonStore("spring_of_zen_door_requests", [])];
    writeJsonStore("spring_of_zen_door_requests", next);
    if (status) status.textContent = "Request held at the Door. The next version can send this to the curator inbox.";
    form.reset();
  });
}

function initV71Metrics() {
  const key = "spring_of_zen_last_return_day";
  const today = new Date().toISOString().slice(0, 10);
  if (localStorage.getItem(key) !== today) {
    localStorage.setItem(key, today);
    incrementV71Metric("return_visits");
  }
}

async function bootstrapSpringOfZen() {
  const canEnter = await initAccessGate();
  if (!canEnter) return;
  initGreeting();
  initAudioToggle();
  initReveal();
  initBreathingCircle();
  initOneWordNote();
  initSharedLanguageSwitch();
  initHarborBreath();
  initEarthLamp();
  initV71Metrics();
  initMemoryShelf();
  initCuratedWindow();
  initRooms();
  initDoor();
}

bootstrapSpringOfZen();
