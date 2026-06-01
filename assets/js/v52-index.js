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

initGreeting();
initAudioToggle();
initReveal();
initBreathingCircle();
initOneWordNote();
initSharedLanguageSwitch();
