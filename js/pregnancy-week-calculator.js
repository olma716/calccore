(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const T = LANG === "en" ? {
    enterInputs: "Enter a date to calculate.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    yourWeek: "You are at week",
    trimester: "Trimester",
    daysToGo: "days to go",
    progressLabel: "of pregnancy completed",
    trimesters: ["1st trimester", "2nd trimester", "3rd trimester"],
    notStarted: "Enter a valid past date.",
  } : {
    enterInputs: "Введи дату для розрахунку.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    yourWeek: "Ти на",
    trimester: "Триместр",
    daysToGo: "днів до пологів",
    progressLabel: "вагітності пройдено",
    trimesters: ["1-й триместр", "2-й триместр", "3-й триместр"],
    notStarted: "Введи коректну дату в минулому.",
  };

  // Fruit size comparisons by week (approximate, popular references)
  const FRUIT_SIZES = LANG === "en" ? {
    4: { emoji: "🌱", text: "Poppy seed" },
    5: { emoji: "🌱", text: "Sesame seed" },
    6: { emoji: "🫛", text: "Lentil" },
    7: { emoji: "🫐", text: "Blueberry" },
    8: { emoji: "🍇", text: "Raspberry" },
    9: { emoji: "🫒", text: "Olive" },
    10: { emoji: "🍓", text: "Strawberry" },
    11: { emoji: "🟢", text: "Lime" },
    12: { emoji: "🟢", text: "Plum" },
    13: { emoji: "🍑", text: "Peach" },
    14: { emoji: "🍋", text: "Lemon" },
    15: { emoji: "🍎", text: "Apple" },
    16: { emoji: "🥑", text: "Avocado" },
    17: { emoji: "🧅", text: "Onion" },
    18: { emoji: "🫑", text: "Bell pepper" },
    19: { emoji: "🍆", text: "Tomato" },
    20: { emoji: "🍌", text: "Banana" },
    21: { emoji: "🥕", text: "Carrot" },
    22: { emoji: "🥒", text: "Papaya" },
    23: { emoji: "🌽", text: "Large mango" },
    24: { emoji: "🌽", text: "Corn cob" },
    25: { emoji: "🍆", text: "Eggplant" },
    26: { emoji: "🥦", text: "Zucchini" },
    27: { emoji: "🥬", text: "Cauliflower" },
    28: { emoji: "🍆", text: "Large eggplant" },
    29: { emoji: "🎃", text: "Butternut squash" },
    30: { emoji: "🥥", text: "Cabbage" },
    31: { emoji: "🥥", text: "Coconut" },
    32: { emoji: "🍈", text: "Jicama" },
    33: { emoji: "🍍", text: "Pineapple" },
    34: { emoji: "🍈", text: "Melon" },
    35: { emoji: "🍈", text: "Honeydew melon" },
    36: { emoji: "🥬", text: "Romaine lettuce" },
    37: { emoji: "🎃", text: "Swiss chard bunch" },
    38: { emoji: "🎃", text: "Small pumpkin" },
    39: { emoji: "🍉", text: "Mini watermelon" },
    40: { emoji: "🎃", text: "Small pumpkin" },
  } : {
    4: { emoji: "🌱", text: "Макове зернятко" },
    5: { emoji: "🌱", text: "Насінина кунжуту" },
    6: { emoji: "🫛", text: "Сочевиця" },
    7: { emoji: "🫐", text: "Чорниця" },
    8: { emoji: "🍇", text: "Малина" },
    9: { emoji: "🫒", text: "Оливка" },
    10: { emoji: "🍓", text: "Полуниця" },
    11: { emoji: "🟢", text: "Лайм" },
    12: { emoji: "🟢", text: "Слива" },
    13: { emoji: "🍑", text: "Персик" },
    14: { emoji: "🍋", text: "Лимон" },
    15: { emoji: "🍎", text: "Яблуко" },
    16: { emoji: "🥑", text: "Авокадо" },
    17: { emoji: "🧅", text: "Цибуля" },
    18: { emoji: "🫑", text: "Болгарський перець" },
    19: { emoji: "🍆", text: "Помідор" },
    20: { emoji: "🍌", text: "Банан" },
    21: { emoji: "🥕", text: "Морква" },
    22: { emoji: "🥒", text: "Папайя" },
    23: { emoji: "🌽", text: "Великий манго" },
    24: { emoji: "🌽", text: "Качан кукурудзи" },
    25: { emoji: "🍆", text: "Баклажан" },
    26: { emoji: "🥦", text: "Кабачок" },
    27: { emoji: "🥬", text: "Цвітна капуста" },
    28: { emoji: "🍆", text: "Великий баклажан" },
    29: { emoji: "🎃", text: "Гарбуз-мускат" },
    30: { emoji: "🥥", text: "Капуста" },
    31: { emoji: "🥥", text: "Кокос" },
    32: { emoji: "🍈", text: "Хікама" },
    33: { emoji: "🍍", text: "Ананас" },
    34: { emoji: "🍈", text: "Диня" },
    35: { emoji: "🍈", text: "Канталупа" },
    36: { emoji: "🥬", text: "Пучок салату ромен" },
    37: { emoji: "🎃", text: "Мангольд" },
    38: { emoji: "🎃", text: "Маленький гарбуз" },
    39: { emoji: "🍉", text: "Міні-кавун" },
    40: { emoji: "🎃", text: "Маленький гарбуз" },
  };

  // ---------- DOM ----------
  const lmpDate = el("lmpDate");
  const btnCalc = el("btnCalc");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");
  const fruitSizeEl = el("fruitSize");
  const weekProgressEl = el("weekProgress");
  const weekProgressFill = el("weekProgressFill");
  const weekProgressLabel = el("weekProgressLabel");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function getFruit(week) {
    const clamped = Math.max(4, Math.min(40, week));
    return FRUIT_SIZES[clamped] || FRUIT_SIZES[40];
  }

  function calc() {
    const val = lmpDate?.value;
    if (!val) {
      setResult(T.enterInputs, "");
      fruitSizeEl.style.display = "none";
      weekProgressEl.style.display = "none";
      return;
    }

    const lmp = new Date(val + "T00:00:00");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const gestDays = Math.floor((today - lmp) / (1000 * 60 * 60 * 24));

    if (gestDays < 0) {
      setResult(T.notStarted, "");
      fruitSizeEl.style.display = "none";
      weekProgressEl.style.display = "none";
      return;
    }

    const weeks = Math.floor(gestDays / 7);
    const days = gestDays % 7;

    let trimesterLabel = T.trimesters[2];
    if (weeks < 13) trimesterLabel = T.trimesters[0];
    else if (weeks < 27) trimesterLabel = T.trimesters[1];

    const daysToGo = Math.max(0, 280 - gestDays);
    const progressPct = Math.min(100, (gestDays / 280) * 100);

    setResult(
      `${T.yourWeek} ${weeks} ${LANG === "en" ? "wk" : "тиж"} ${days} ${LANG === "en" ? "d" : "дн"}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.trimester}</div>
            <div class="m-kpi__v" style="font-size:15px;">${trimesterLabel}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${LANG === "en" ? "Days remaining" : "Днів залишилось"}</div>
            <div class="m-kpi__v">${daysToGo}</div>
          </div>
        </div>
      `
    );

    const fruit = getFruit(weeks);
    fruitSizeEl.innerHTML = `
      <div class="fruit-size__emoji">${fruit.emoji}</div>
      <div class="fruit-size__text">${LANG === "en" ? "Baby is about the size of a" : "Малюк приблизно розміром з"} ${fruit.text.toLowerCase()}</div>
    `;
    fruitSizeEl.style.display = "";

    weekProgressFill.style.width = progressPct + "%";
    weekProgressLabel.textContent = `${Math.round(progressPct)}% ${T.progressLabel}`;
    weekProgressEl.style.display = "";
  }

  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
      setToast(T.copied);
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(T.copyFailed);
    }
  }

  // ---------- events ----------
  lmpDate?.addEventListener("change", calc);
  btnCalc?.addEventListener("click", calc);
  btnCopy?.addEventListener("click", copyResult);

  // ---------- init ----------
  setResult(T.enterInputs, "");
})();