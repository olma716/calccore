(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const T = LANG === "en" ? {
    enterDate: "Enter a date.",
    illumination: "Illumination",
    phases: [
      { name: "New Moon", emoji: "🌑" },
      { name: "Waxing Crescent", emoji: "🌒" },
      { name: "First Quarter", emoji: "🌓" },
      { name: "Waxing Gibbous", emoji: "🌔" },
      { name: "Full Moon", emoji: "🌕" },
      { name: "Waning Gibbous", emoji: "🌖" },
      { name: "Last Quarter", emoji: "🌗" },
      { name: "Waning Crescent", emoji: "🌘" },
    ],
  } : {
    enterDate: "Введи дату.",
    illumination: "Освітленість",
    phases: [
      { name: "Молодик", emoji: "🌑" },
      { name: "Зростаючий серп", emoji: "🌒" },
      { name: "Перша чверть", emoji: "🌓" },
      { name: "Зростаючий випуклий", emoji: "🌔" },
      { name: "Повний місяць", emoji: "🌕" },
      { name: "Спадаючий випуклий", emoji: "🌖" },
      { name: "Остання чверть", emoji: "🌗" },
      { name: "Спадаючий серп", emoji: "🌘" },
    ],
  };

  const SYNODIC_MONTH = 29.530588853; // days
  const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14, 0); // Jan 6, 2000, known new moon

  // ---------- DOM ----------
  const moonDate = el("moonDate");
  const btnCalc = el("btnCalc");
  const btnToday = el("btnToday");

  const moonResult = el("moonResult");
  const moonEmoji = el("moonEmoji");
  const moonName = el("moonName");
  const moonIllumination = el("moonIllumination");

  function getMoonPhase(date) {
    const diffDays = (date.getTime() - KNOWN_NEW_MOON) / 86400000;
    const cyclePosition = ((diffDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH;
    const phaseFraction = cyclePosition / SYNODIC_MONTH; // 0 to 1

    // illumination: 0 at new moon, 1 at full moon, back to 0
    const illumination = (1 - Math.cos(phaseFraction * 2 * Math.PI)) / 2;

    // 8 phases, each 1/8 of the cycle
    const phaseIndex = Math.round(phaseFraction * 8) % 8;

    return { phaseIndex, illumination };
  }

  function calc() {
    const val = moonDate?.value;
    if (!val) {
      if (moonResult) moonResult.style.display = "none";
      return;
    }

    const d = new Date(val + "T12:00:00Z");
    const { phaseIndex, illumination } = getMoonPhase(d);
    const phase = T.phases[phaseIndex];

    if (moonEmoji) moonEmoji.textContent = phase.emoji;
    if (moonName) moonName.textContent = phase.name;
    if (moonIllumination) moonIllumination.innerHTML = `${T.illumination}: <b>${Math.round(illumination * 100)}%</b>`;

    if (moonResult) moonResult.style.display = "";
  }

  function setToday() {
    const today = new Date().toISOString().split("T")[0];
    if (moonDate) moonDate.value = today;
    calc();
  }

  // ---------- events ----------
  moonDate?.addEventListener("change", calc);
  btnCalc?.addEventListener("click", calc);
  btnToday?.addEventListener("click", setToday);

  // ---------- init ----------
  setToday();
})();