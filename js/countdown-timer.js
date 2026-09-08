(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const T = LANG === "en" ? {
    defaultTitle: "Countdown",
    eventReached: "🎉 The event has arrived!",
    timeSince: "Time since event",
    newYear: "New Year",
    weekend: "Weekend",
    days: "days",
    hrs: "hrs",
    min: "min",
    sec: "sec",
  } : {
    defaultTitle: "Зворотний відлік",
    eventReached: "🎉 Подія настала!",
    timeSince: "Часу минуло з події",
    newYear: "Новий рік",
    weekend: "Вихідні",
    days: "днів",
    hrs: "год",
    min: "хв",
    sec: "сек",
  };

  // ---------- DOM ----------
  const eventName = el("eventName");
  const eventDate = el("eventDate");
  const eventTime = el("eventTime");

  const btnNewYear = el("btnNewYear");
  const btnWeekend = el("btnWeekend");

  const countdownDisplay = el("countdownDisplay");
  const countdownTitle = el("countdownTitle");
  const countdownMessage = el("countdownMessage");

  const cdDays = el("cdDays");
  const cdHours = el("cdHours");
  const cdMinutes = el("cdMinutes");
  const cdSeconds = el("cdSeconds");

  const lblDays = el("lblDays");
  const lblHours = el("lblHours");
  const lblMinutes = el("lblMinutes");
  const lblSeconds = el("lblSeconds");

  if (lblDays) lblDays.textContent = T.days;
  if (lblHours) lblHours.textContent = T.hrs;
  if (lblMinutes) lblMinutes.textContent = T.min;
  if (lblSeconds) lblSeconds.textContent = T.sec;

  let timerInterval = null;

  function pad(n) {
    return String(Math.abs(n)).padStart(2, "0");
  }

  function getTargetDate() {
    const dateVal = eventDate?.value;
    if (!dateVal) return null;
    const timeVal = eventTime?.value || "00:00";
    return new Date(`${dateVal}T${timeVal}:00`);
  }

  function updateDisplay() {
    const target = getTargetDate();
    if (!target || isNaN(target.getTime())) {
      if (countdownDisplay) countdownDisplay.style.display = "none";
      return;
    }

    if (countdownDisplay) countdownDisplay.style.display = "";

    const name = (eventName?.value || "").trim();
    if (countdownTitle) countdownTitle.textContent = name || T.defaultTitle;

    const now = new Date();
    let diff = target - now;
    const isPast = diff < 0;
    diff = Math.abs(diff);

    const totalSeconds = Math.floor(diff / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (cdDays) cdDays.textContent = days;
    if (cdHours) cdHours.textContent = pad(hours);
    if (cdMinutes) cdMinutes.textContent = pad(minutes);
    if (cdSeconds) cdSeconds.textContent = pad(seconds);

    if (countdownMessage) {
      countdownMessage.textContent = isPast
        ? `${T.timeSince}: ↑`
        : (totalSeconds < 1 ? T.eventReached : "");
    }
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    updateDisplay();
    timerInterval = setInterval(updateDisplay, 1000);
  }

  function setNewYear() {
    const now = new Date();
    const year = now.getMonth() === 11 && now.getDate() === 31 ? now.getFullYear() + 1 : (now.getFullYear() + (now < new Date(now.getFullYear(), 0, 1) ? 0 : 1));
    const ny = new Date(now.getFullYear() + 1, 0, 1);
    if (now.getMonth() === 0 && now.getDate() === 1) {
      // if today is jan 1, still count to next new year
    }
    const target = new Date(now.getFullYear(), 11, 31, 24, 0, 0) > now
      ? new Date(now.getFullYear() + 1, 0, 1)
      : new Date(now.getFullYear() + 1, 0, 1);

    const nextNewYear = new Date(now.getFullYear() + 1, 0, 1);
    const thisYearPassed = new Date(now.getFullYear(), 0, 1) <= now;
    const finalTarget = thisYearPassed ? nextNewYear : new Date(now.getFullYear(), 0, 1);

    if (eventDate) eventDate.value = finalTarget.toISOString().split("T")[0];
    if (eventTime) eventTime.value = "00:00";
    if (eventName) eventName.value = T.newYear;
    startTimer();
  }

  function setWeekend() {
    const now = new Date();
    const day = now.getDay(); // 0 = sunday, 6 = saturday
    let daysUntilSaturday = (6 - day + 7) % 7;
    if (daysUntilSaturday === 0 && day === 6) daysUntilSaturday = 0;
    const target = new Date(now);
    target.setDate(now.getDate() + daysUntilSaturday);

    if (eventDate) eventDate.value = target.toISOString().split("T")[0];
    if (eventTime) eventTime.value = "00:00";
    if (eventName) eventName.value = T.weekend;
    startTimer();
  }

  // ---------- events ----------
  [eventDate, eventTime, eventName].forEach(x => x?.addEventListener("input", startTimer));
  [eventDate, eventTime].forEach(x => x?.addEventListener("change", startTimer));

  btnNewYear?.addEventListener("click", setNewYear);
  btnWeekend?.addEventListener("click", setWeekend);

  // ---------- init ----------
  updateDisplay();
})();