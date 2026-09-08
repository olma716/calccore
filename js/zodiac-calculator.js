(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const T = LANG === "en" ? {
    enterInputs: "Enter a date of birth.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    element: "Element",
    planet: "Ruling planet",
    animal: "Chinese zodiac",
  } : {
    enterInputs: "Введи дату народження.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    element: "Стихія",
    planet: "Планета-покровитель",
    animal: "Китайський зодіак",
  };

  const WESTERN = LANG === "en" ? [
    { name: "Capricorn", emoji: "♑", from: [12, 22], to: [1, 19], element: "Earth", planet: "Saturn" },
    { name: "Aquarius", emoji: "♒", from: [1, 20], to: [2, 18], element: "Air", planet: "Uranus" },
    { name: "Pisces", emoji: "♓", from: [2, 19], to: [3, 20], element: "Water", planet: "Neptune" },
    { name: "Aries", emoji: "♈", from: [3, 21], to: [4, 19], element: "Fire", planet: "Mars" },
    { name: "Taurus", emoji: "♉", from: [4, 20], to: [5, 20], element: "Earth", planet: "Venus" },
    { name: "Gemini", emoji: "♊", from: [5, 21], to: [6, 20], element: "Air", planet: "Mercury" },
    { name: "Cancer", emoji: "♋", from: [6, 21], to: [7, 22], element: "Water", planet: "Moon" },
    { name: "Leo", emoji: "♌", from: [7, 23], to: [8, 22], element: "Fire", planet: "Sun" },
    { name: "Virgo", emoji: "♍", from: [8, 23], to: [9, 22], element: "Earth", planet: "Mercury" },
    { name: "Libra", emoji: "♎", from: [9, 23], to: [10, 22], element: "Air", planet: "Venus" },
    { name: "Scorpio", emoji: "♏", from: [10, 23], to: [11, 21], element: "Water", planet: "Pluto" },
    { name: "Sagittarius", emoji: "♐", from: [11, 22], to: [12, 21], element: "Fire", planet: "Jupiter" },
  ] : [
    { name: "Козеріг", emoji: "♑", from: [12, 22], to: [1, 19], element: "Земля", planet: "Сатурн" },
    { name: "Водолій", emoji: "♒", from: [1, 20], to: [2, 18], element: "Повітря", planet: "Уран" },
    { name: "Риби", emoji: "♓", from: [2, 19], to: [3, 20], element: "Вода", planet: "Нептун" },
    { name: "Овен", emoji: "♈", from: [3, 21], to: [4, 19], element: "Вогонь", planet: "Марс" },
    { name: "Телець", emoji: "♉", from: [4, 20], to: [5, 20], element: "Земля", planet: "Венера" },
    { name: "Близнюки", emoji: "♊", from: [5, 21], to: [6, 20], element: "Повітря", planet: "Меркурій" },
    { name: "Рак", emoji: "♋", from: [6, 21], to: [7, 22], element: "Вода", planet: "Місяць" },
    { name: "Лев", emoji: "♌", from: [7, 23], to: [8, 22], element: "Вогонь", planet: "Сонце" },
    { name: "Діва", emoji: "♍", from: [8, 23], to: [9, 22], element: "Земля", planet: "Меркурій" },
    { name: "Терези", emoji: "♎", from: [9, 23], to: [10, 22], element: "Повітря", planet: "Венера" },
    { name: "Скорпіон", emoji: "♏", from: [10, 23], to: [11, 21], element: "Вода", planet: "Плутон" },
    { name: "Стрілець", emoji: "♐", from: [11, 22], to: [12, 21], element: "Вогонь", planet: "Юпітер" },
  ];

  const CHINESE = LANG === "en"
    ? ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"]
    : ["Щур", "Бик", "Тигр", "Кролик", "Дракон", "Змія", "Кінь", "Коза", "Мавпа", "Півень", "Собака", "Свиня"];

  const CHINESE_EMOJI = ["🐀", "🐂", "🐅", "🐇", "🐉", "🐍", "🐎", "🐐", "🐒", "🐓", "🐕", "🐖"];

  // ---------- DOM ----------
  const birthDate = el("birthDate");
  const btnCalc = el("btnCalc");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const zodiacResult = el("zodiacResult");

  const westernEmoji = el("westernEmoji");
  const westernName = el("westernName");
  const westernDetails = el("westernDetails");
  const chineseEmoji = el("chineseEmoji");
  const chineseName = el("chineseName");
  const chineseDetails = el("chineseDetails");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };

  function getWesternSign(month, day) {
    for (const sign of WESTERN) {
      const [fm, fd] = sign.from;
      const [tm, td] = sign.to;
      if (fm > tm) {
        // wraps around year (Capricorn: Dec 22 - Jan 19)
        if ((month === fm && day >= fd) || (month === tm && day <= td)) return sign;
      } else {
        if ((month === fm && day >= fd) || (month === tm && day <= td) || (month > fm && month < tm)) return sign;
      }
    }
    return WESTERN[0];
  }

  function getChineseAnimal(year) {
    const idx = (year - 4) % 12; // 1900 = Rat cycle base
    return ((idx % 12) + 12) % 12;
  }

  function calc() {
    const val = birthDate?.value;
    if (!val) {
      setToast(T.enterInputs);
      if (zodiacResult) zodiacResult.style.display = "none";
      return;
    }

    const d = new Date(val + "T00:00:00");
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const year = d.getFullYear();

    const sign = getWesternSign(month, day);
    const animalIdx = getChineseAnimal(year);
    const animal = CHINESE[animalIdx];
    const animalEmoji = CHINESE_EMOJI[animalIdx];

    if (westernEmoji) westernEmoji.textContent = sign.emoji;
    if (westernName) westernName.textContent = sign.name;
    if (westernDetails) westernDetails.innerHTML = `${T.element}: <b>${sign.element}</b><br>${T.planet}: <b>${sign.planet}</b>`;

    if (chineseEmoji) chineseEmoji.textContent = animalEmoji;
    if (chineseName) chineseName.textContent = animal;
    if (chineseDetails) chineseDetails.innerHTML = `${T.animal}<br><b>${year}</b>`;

    if (zodiacResult) zodiacResult.style.display = "";
    setToast("");
  }

  async function copyResult() {
    const wn = westernName?.textContent;
    const cn = chineseName?.textContent;
    if (!wn) return;
    const txt = `${wn} / ${cn}`;
    try {
      await navigator.clipboard.writeText(txt);
      setToast(T.copied);
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(T.copyFailed);
    }
  }

  // ---------- events ----------
  birthDate?.addEventListener("change", calc);
  btnCalc?.addEventListener("click", calc);
  btnCopy?.addEventListener("click", copyResult);
})();