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
    liveModalNote: "If the live window does not load, the source may block embedding.",
    openLiveSource: "Open original source →",
    recordedNote: "This is not a live stream. A carefully selected recording from somewhere in the world.",
    harborKicker: "The Harbor",
    harborTitle: "Somewhere a small dock,<br>a single light,<br>water moving without hurry.",
    harborLine: "This is what the inside of your chest can feel like, if you give it a few minutes.",
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
    liveModalNote: "如果直播窗口無法載入，來源網站可能不允許嵌入。",
    openLiveSource: "打開原始來源 →",
    recordedNote: "這不是直播。這是一段來自世界某處、被細心挑選的錄像。",
    harborKicker: "港灣",
    harborTitle: "某處有一座小碼頭，<br>一盞燈，<br>水不著急地流動。",
    harborLine: "如果你願意給它幾分鐘，胸口裡面也可以像這樣。",
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
}

function initSharedLanguageSwitch() {
  if (!document.querySelector("[data-lang-button]")) return;
  document.querySelectorAll("[data-lang-button]").forEach((button) => {
    button.addEventListener("click", () => applySharedLanguage(button.dataset.langButton));
  });
  applySharedLanguage(getSharedLang());
}

function formatLampDate(dateString, lang) {
  if (!dateString) return "";
  const date = new Date(`${dateString}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateString;
  return date.toLocaleDateString(lang === "zh" ? "zh-Hant" : "en", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

let currentLampData = {
  live_url: "https://www.skylinewebcams.com/en/webcam/norge/nordland/lofoten/reine.html"
};

function openLampLive() {
  const liveModal = document.querySelector("[data-live-modal]");
  const liveFrame = document.querySelector("[data-live-frame]");
  if (!liveModal || !liveFrame) return;
  liveFrame.src = currentLampData.live_url;
  liveModal.hidden = false;
}

function closeLampLive() {
  const liveModal = document.querySelector("[data-live-modal]");
  const liveFrame = document.querySelector("[data-live-frame]");
  if (liveModal) liveModal.hidden = true;
  if (liveFrame) liveFrame.src = "";
}

window.openLampLive = openLampLive;
window.closeLampLive = closeLampLive;

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
  const date = document.querySelector("[data-lamp-date]");
  const quote = document.querySelector("[data-lamp-quote]");
  const live = document.querySelector("[data-lamp-live]");
  const liveFrame = document.querySelector("[data-live-frame]");
  const liveSource = document.querySelector("[data-live-source]");
  const video = document.querySelector("[data-lamp-video]");
  const frame = document.querySelector(".lamp-video-window");
  if (title) title.textContent = data.title;
  if (country) country.textContent = data.country;
  if (date) date.textContent = formatLampDate(data.date, getSharedLang());
  if (quote) quote.textContent = data.quote;
  if (liveSource) liveSource.href = data.live_url;
  if (video && data.poster) video.setAttribute("poster", data.poster);
  if (video && data.video) {
    video.src = data.video;
    video.addEventListener("canplay", () => {
      frame?.classList.add("has-video");
      video.play().catch(() => {});
    }, { once: true });
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

initGreeting();
initAudioToggle();
initReveal();
initBreathingCircle();
initOneWordNote();
initSharedLanguageSwitch();
initEarthLamp();
