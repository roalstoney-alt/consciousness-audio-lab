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
    toggle.textContent = playing ? "listening" : "room tone";
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
    panel.innerHTML = `
      <div class="word-thanks">
        <blockquote>"${word.replace(/[<>&"]/g, (char) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "\"": "&quot;" }[char]))}"</blockquote>
        <p>Thank you. The room is a little warmer now.</p>
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

initGreeting();
initAudioToggle();
initReveal();
initBreathingCircle();
initOneWordNote();
