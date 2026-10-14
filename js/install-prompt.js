// Пропозиція встановити сайт як додаток (PWA) для нових відвідувачів.
// Chrome/Edge/Android — власне вікно + нативний запит; iOS Safari — коротка інструкція.
// Показується один раз через ~15 с; "Не зараз" ховає на 30 днів; у встановленому додатку не з'являється.
(() => {
  const KEY = "cc_install_v1";
  const DELAY_MS = 15 * 1000;
  const SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

  const isEn = location.pathname.startsWith("/en/");
  const TEXT = isEn
    ? {
        title: "Install CalcCore",
        text: "Calculators and exchange rates one tap away from your home screen — no app store needed.",
        iosText: "Add CalcCore to your home screen: tap “Share”, then choose “Add to Home Screen”.",
        install: "Install",
        later: "Not now",
        ok: "Got it",
        close: "Close"
      }
    : {
        title: "Встановіть CalcCore",
        text: "Калькулятори та курси валют — під рукою на головному екрані, без App Store.",
        iosText: "Додайте CalcCore на головний екран: натисніть «Поділитися», потім «На початковий екран».",
        install: "Встановити",
        later: "Не зараз",
        ok: "Зрозуміло",
        close: "Закрити"
      };

  // ---- стан у localStorage (усе в try/catch: у приватному режимі може кидати помилку) ----
  function readState() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  }
  function writeState(patch) {
    try { localStorage.setItem(KEY, JSON.stringify({ ...readState(), ...patch })); } catch {}
  }

  const track = (name) => {
    try { if (typeof window.gtag === "function") window.gtag("event", name); } catch {}
  };

  // ---- коли не показувати ----
  const standalone =
    (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
    window.navigator.standalone === true;
  if (standalone) return;

  const state = readState();
  if (state.installed) return;
  if (state.dismissedAt && Date.now() - state.dismissedAt < SNOOZE_MS) return;

  const ua = navigator.userAgent || "";
  const isIOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  // у вбудованих браузерах (Facebook, Instagram тощо) "На початковий екран" недоступний
  const inApp = /FBAN|FBAV|Instagram|Line\/|Telegram|TikTok/i.test(ua);

  let deferred = null;
  let panel = null;
  let timer = null;
  let armed = false;

  function build(ios) {
    const el = document.createElement("div");
    el.className = "cc-install";
    el.setAttribute("role", "dialog");
    el.setAttribute("aria-live", "polite");
    el.setAttribute("aria-label", TEXT.title);

    const primary = ios
      ? `<button type="button" class="cc-install__btn cc-install__btn--primary" data-act="later">${TEXT.ok}</button>`
      : `<button type="button" class="cc-install__btn cc-install__btn--later" data-act="later">${TEXT.later}</button>` +
        `<button type="button" class="cc-install__btn cc-install__btn--primary" data-act="install">${TEXT.install}</button>`;

    el.innerHTML =
      `<img class="cc-install__ico" src="/assets/android-chrome-192x192.png" width="44" height="44" alt="">` +
      `<div class="cc-install__body">` +
      `<p class="cc-install__title">${TEXT.title}</p>` +
      `<p class="cc-install__text">${ios ? TEXT.iosText : TEXT.text}</p>` +
      `</div>` +
      `<div class="cc-install__actions">${primary}</div>` +
      `<button type="button" class="cc-install__x" data-act="later" aria-label="${TEXT.close}">×</button>`;

    el.addEventListener("click", (e) => {
      const b = e.target.closest("[data-act]");
      if (!b) return;
      if (b.dataset.act === "install") install();
      else dismiss();
    });
    return el;
  }

  function show(ios) {
    if (panel || document.hidden) return;
    panel = build(ios);
    document.body.appendChild(panel);
    // кадр на початковий стан для анімації появи
    requestAnimationFrame(() => panel && panel.classList.add("is-open"));
    document.addEventListener("keydown", onKey);
    track("pwa_prompt_shown");
  }

  function hide() {
    document.removeEventListener("keydown", onKey);
    if (!panel) return;
    const p = panel;
    panel = null;
    p.classList.remove("is-open");
    setTimeout(() => p.remove(), 250);
  }

  function onKey(e) {
    if (e.key === "Escape") dismiss();
  }

  function dismiss() {
    writeState({ dismissedAt: Date.now() });
    track("pwa_prompt_dismissed");
    hide();
  }

  async function install() {
    if (!deferred) return dismiss();
    const ev = deferred;
    deferred = null;
    hide();
    try {
      await ev.prompt();
      const choice = await ev.userChoice;
      if (choice && choice.outcome === "accepted") {
        writeState({ installed: true });
        track("pwa_install_accepted");
      } else {
        writeState({ dismissedAt: Date.now() });
        track("pwa_install_declined");
      }
    } catch {
      writeState({ dismissedAt: Date.now() });
    }
  }

  // показуємо через DELAY_MS після завантаження; якщо вкладка у фоні — чекаємо повернення
  function arm(ios) {
    if (armed) return;
    armed = true;
    timer = setTimeout(function tick() {
      if (document.hidden) {
        document.addEventListener("visibilitychange", function once() {
          if (document.hidden) return;
          document.removeEventListener("visibilitychange", once);
          show(ios);
        });
        return;
      }
      show(ios);
    }, DELAY_MS);
  }

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    arm(false);
  });

  window.addEventListener("appinstalled", () => {
    writeState({ installed: true });
    track("pwa_installed");
    clearTimeout(timer);
    hide();
  });

  // iOS Safari не має beforeinstallprompt — показуємо інструкцію
  if (isIOS && !inApp) arm(true);

  // стилі підвантажуються лише коли вікно справді потрібне
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "/css/install-prompt.css?v=1";
  document.head.appendChild(css);
})();
