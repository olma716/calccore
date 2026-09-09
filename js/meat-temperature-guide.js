(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const T = LANG === "en" ? {
    headers: ["Item", "Temperature", "Rest time"],
  } : {
    headers: ["Продукт", "Температура", "Час відпочинку"],
  };

  const DATA = LANG === "en" ? {
    poultry: {
      label: "Poultry",
      rows: [
        { name: "Whole chicken/turkey", temp: "74°C / 165°F", rest: "10-20 min" },
        { name: "Chicken breast", temp: "74°C / 165°F", rest: "5 min" },
        { name: "Chicken thighs/legs", temp: "74°C / 165°F", rest: "5 min" },
        { name: "Ground poultry", temp: "74°C / 165°F", rest: "No rest needed", warning: true },
      ],
    },
    beef_lamb: {
      label: "Beef & Lamb",
      rows: [
        { name: "Rare", temp: "52-54°C / 125-130°F", rest: "5-10 min" },
        { name: "Medium rare", temp: "57-60°C / 135-140°F", rest: "5-10 min" },
        { name: "Medium", temp: "63-66°C / 145-150°F", rest: "5-10 min" },
        { name: "Well done", temp: "71°C+ / 160°F+", rest: "5-10 min" },
        { name: "Ground beef/lamb", temp: "71°C / 160°F", rest: "No rest needed", warning: true },
      ],
    },
    pork: {
      label: "Pork",
      rows: [
        { name: "Pork chops/roast", temp: "63°C / 145°F", rest: "3 min" },
        { name: "Ground pork", temp: "71°C / 160°F", rest: "No rest needed", warning: true },
        { name: "Ham (fresh)", temp: "63°C / 145°F", rest: "3 min" },
        { name: "Ham (pre-cooked, reheating)", temp: "60°C / 140°F", rest: "No rest needed" },
      ],
    },
    fish: {
      label: "Fish & Seafood",
      rows: [
        { name: "Fish (fin fish)", temp: "63°C / 145°F", rest: "No rest needed" },
        { name: "Shrimp/lobster/crab", temp: "Flesh pearly & opaque", rest: "No rest needed" },
        { name: "Scallops", temp: "Milky white, firm", rest: "No rest needed" },
        { name: "Clams/mussels/oysters", temp: "Shells open during cooking", rest: "No rest needed" },
      ],
    },
    eggs: {
      label: "Eggs & Leftovers",
      rows: [
        { name: "Egg dishes", temp: "71°C / 160°F", rest: "No rest needed" },
        { name: "Leftovers (reheating)", temp: "74°C / 165°F", rest: "No rest needed" },
        { name: "Casseroles", temp: "74°C / 165°F", rest: "No rest needed" },
      ],
    },
  } : {
    poultry: {
      label: "Птиця",
      rows: [
        { name: "Ціла курка/індичка", temp: "74°C", rest: "10-20 хв" },
        { name: "Куряче філе (грудка)", temp: "74°C", rest: "5 хв" },
        { name: "Стегна/гомілки", temp: "74°C", rest: "5 хв" },
        { name: "Фарш з птиці", temp: "74°C", rest: "Відпочинок не потрібен", warning: true },
      ],
    },
    beef_lamb: {
      label: "Яловичина та баранина",
      rows: [
        { name: "З кров'ю (rare)", temp: "52-54°C", rest: "5-10 хв" },
        { name: "Слабо прожарене (medium rare)", temp: "57-60°C", rest: "5-10 хв" },
        { name: "Середньо прожарене (medium)", temp: "63-66°C", rest: "5-10 хв" },
        { name: "Добре прожарене (well done)", temp: "71°C+", rest: "5-10 хв" },
        { name: "Фарш з яловичини/баранини", temp: "71°C", rest: "Відпочинок не потрібен", warning: true },
      ],
    },
    pork: {
      label: "Свинина",
      rows: [
        { name: "Свинячі відбивні/запечена", temp: "63°C", rest: "3 хв" },
        { name: "Фарш зі свинини", temp: "71°C", rest: "Відпочинок не потрібен", warning: true },
        { name: "Шинка (свіжа)", temp: "63°C", rest: "3 хв" },
        { name: "Шинка (готова, розігрів)", temp: "60°C", rest: "Відпочинок не потрібен" },
      ],
    },
    fish: {
      label: "Риба та морепродукти",
      rows: [
        { name: "Риба (з плавцями)", temp: "63°C", rest: "Відпочинок не потрібен" },
        { name: "Креветки/лобстер/краб", temp: "М'якуш перламутровий, непрозорий", rest: "Відпочинок не потрібен" },
        { name: "Гребінці", temp: "Молочно-білий, пружний", rest: "Відпочинок не потрібен" },
        { name: "Мушлі/устриці", temp: "Стулки відкрились під час готування", rest: "Відпочинок не потрібен" },
      ],
    },
    eggs: {
      label: "Яйця та залишки їжі",
      rows: [
        { name: "Страви з яєць", temp: "71°C", rest: "Відпочинок не потрібен" },
        { name: "Залишки їжі (розігрів)", temp: "74°C", rest: "Відпочинок не потрібен" },
        { name: "Запіканки", temp: "74°C", rest: "Відпочинок не потрібен" },
      ],
    },
  };

  // ---------- DOM ----------
  const categorySelect = el("categorySelect");
  const meatTableWrap = el("meatTableWrap");

  function populateSelect() {
    if (!categorySelect) return;
    const keys = Object.keys(DATA);
    categorySelect.innerHTML = keys.map(k => `<option value="${k}">${DATA[k].label}</option>`).join("");
    categorySelect.value = keys[0];
  }

  function render() {
    const key = categorySelect?.value;
    const item = DATA[key];
    if (!item || !meatTableWrap) return;

    const rowsHtml = item.rows.map(r => `
      <tr class="${r.warning ? "meat-table__row--warning" : ""}">
        <td>${r.name}</td>
        <td class="meat-table__temp">${r.temp}</td>
        <td>${r.rest}</td>
      </tr>
    `).join("");

    meatTableWrap.innerHTML = `
      <table class="meat-table">
        <thead>
          <tr>
            <th>${T.headers[0]}</th>
            <th>${T.headers[1]}</th>
            <th>${T.headers[2]}</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    `;
  }

  // ---------- events ----------
  categorySelect?.addEventListener("change", render);

  // ---------- init ----------
  populateSelect();
  render();
})();