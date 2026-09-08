(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();
  const LOCALE = LANG === "en" ? "en-US" : "uk-UA";

  const parseNum = (val) => {
    if (val == null) return 0;
    const s = String(val).replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const fmt = (n) => Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: 2 }) : "—";
  const safeText = (s) => String(s ?? "").replace(/[<>]/g, "");

  const T = LANG === "en" ? {
    enterInputs: "Enter inputs to convert.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    tableCopied: "Table copied.",
    tableCopyFailed: "Failed to copy table.",
    equals: "equals",
  } : {
    enterInputs: "Введи дані для конвертації.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    tableCopied: "Скопійовано таблицю.",
    tableCopyFailed: "Не вдалося скопіювати таблицю.",
    equals: "дорівнює",
  };

  // Ingredients with density in g/ml
  const INGREDIENTS = LANG === "en" ? [
    { id: "flour", label: "Wheat flour", density: 0.53 },
    { id: "sugar", label: "Granulated sugar", density: 0.85 },
    { id: "powdered_sugar", label: "Powdered sugar", density: 0.56 },
    { id: "brown_sugar", label: "Brown sugar (packed)", density: 0.93 },
    { id: "butter", label: "Butter", density: 0.96 },
    { id: "milk", label: "Milk", density: 1.03 },
    { id: "water", label: "Water", density: 1.0 },
    { id: "honey", label: "Honey", density: 1.42 },
    { id: "oil", label: "Vegetable oil", density: 0.92 },
    { id: "rice", label: "Rice (uncooked)", density: 0.85 },
    { id: "cocoa", label: "Cocoa powder", density: 0.53 },
    { id: "salt", label: "Salt", density: 1.2 },
  ] : [
    { id: "flour", label: "Пшеничне борошно", density: 0.53 },
    { id: "sugar", label: "Цукор-пісок", density: 0.85 },
    { id: "powdered_sugar", label: "Цукрова пудра", density: 0.56 },
    { id: "brown_sugar", label: "Коричневий цукор (утрамбований)", density: 0.93 },
    { id: "butter", label: "Вершкове масло", density: 0.96 },
    { id: "milk", label: "Молоко", density: 1.03 },
    { id: "water", label: "Вода", density: 1.0 },
    { id: "honey", label: "Мед", density: 1.42 },
    { id: "oil", label: "Рослинна олія", density: 0.92 },
    { id: "rice", label: "Рис (сирий)", density: 0.85 },
    { id: "cocoa", label: "Какао-порошок", density: 0.53 },
    { id: "salt", label: "Сіль", density: 1.2 },
  ];

  // Units: value = how many ml this unit represents (for volume) or grams (for weight)
  const VOLUME_UNITS = LANG === "en" ? [
    { id: "cup", label: "Cup (US)", ml: 240 },
    { id: "tbsp", label: "Tablespoon", ml: 15 },
    { id: "tsp", label: "Teaspoon", ml: 5 },
    { id: "ml", label: "Milliliter (ml)", ml: 1 },
    { id: "l", label: "Liter (L)", ml: 1000 },
    { id: "floz", label: "Fluid ounce (fl oz)", ml: 29.5735 },
  ] : [
    { id: "cup", label: "Склянка (US)", ml: 240 },
    { id: "tbsp", label: "Столова ложка", ml: 15 },
    { id: "tsp", label: "Чайна ложка", ml: 5 },
    { id: "ml", label: "Мілілітр (мл)", ml: 1 },
    { id: "l", label: "Літр (л)", ml: 1000 },
    { id: "floz", label: "Рідинна унція (fl oz)", ml: 29.5735 },
  ];

  const WEIGHT_UNITS = LANG === "en" ? [
    { id: "g", label: "Gram (g)", g: 1 },
    { id: "kg", label: "Kilogram (kg)", g: 1000 },
    { id: "oz", label: "Ounce (oz)", g: 28.3495 },
    { id: "lb", label: "Pound (lb)", g: 453.592 },
  ] : [
    { id: "g", label: "Грам (г)", g: 1 },
    { id: "kg", label: "Кілограм (кг)", g: 1000 },
    { id: "oz", label: "Унція (oz)", g: 28.3495 },
    { id: "lb", label: "Фунт (lb)", g: 453.592 },
  ];

  const ALL_UNITS = [...VOLUME_UNITS.map(u => ({ ...u, type: "volume" })), ...WEIGHT_UNITS.map(u => ({ ...u, type: "weight" }))];

  // ---------- DOM ----------
  const autoCalc = el("autoCalc");
  const ingredient = el("ingredient");
  const amount = el("amount");
  const fromUnit = el("fromUnit");
  const toUnit = el("toUnit");

  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const scheduleTable = el("scheduleTable");
  const scheduleTbody = scheduleTable?.querySelector("tbody");
  const btnCopySchedule = el("btnCopySchedule");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function populateSelects() {
    if (ingredient) {
      ingredient.innerHTML = INGREDIENTS.map(i => `<option value="${i.id}">${i.label}</option>`).join("");
    }
    const unitOpts = ALL_UNITS.map(u => `<option value="${u.id}">${u.label}</option>`).join("");
    if (fromUnit) fromUnit.innerHTML = unitOpts;
    if (toUnit) toUnit.innerHTML = unitOpts;
    if (fromUnit) fromUnit.value = "cup";
    if (toUnit) toUnit.value = "g";
  }

  function getIngredient() {
    const id = ingredient?.value;
    return INGREDIENTS.find(i => i.id === id) || INGREDIENTS[0];
  }

  function getUnit(id) {
    return ALL_UNITS.find(u => u.id === id);
  }

  // Convert an amount of a given unit to grams, using ingredient density
  function toGrams(amt, unit, density) {
    if (unit.type === "weight") return amt * unit.g;
    // volume -> ml -> grams via density
    const ml = amt * unit.ml;
    return ml * density;
  }

  function fromGrams(grams, unit, density) {
    if (unit.type === "weight") return grams / unit.g;
    const ml = grams / density;
    return ml / unit.ml;
  }

  function renderAllUnitsTable(amt, fromU, density) {
    if (!scheduleTbody) return;
    const grams = toGrams(amt, fromU, density);
    const rows = ALL_UNITS.map(u => {
      const val = fromGrams(grams, u, density);
      return { label: u.label, value: fmt(val) };
    });
    scheduleTbody.innerHTML = rows.map(r => `
      <tr><td>${safeText(r.label)}</td><td>${safeText(r.value)}</td></tr>
    `).join("");
  }

  function calc({ silent = false } = {}) {
    const amt = parseNum(amount?.value);
    const fromId = fromUnit?.value;
    const toId = toUnit?.value;

    if (!(amt > 0) || !fromId || !toId) {
      setResult(T.enterInputs, "");
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      return;
    }

    const ing = getIngredient();
    const fromU = getUnit(fromId);
    const toU = getUnit(toId);

    const grams = toGrams(amt, fromU, ing.density);
    const result = fromGrams(grams, toU, ing.density);

    setResult(
      `${fmt(amt)} ${fromU.label} ${T.equals} ${fmt(result)} ${toU.label}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${LANG === "en" ? "Ingredient" : "Продукт"}</div>
            <div class="m-kpi__v" style="font-size:14px;">${ing.label}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${LANG === "en" ? "Weight" : "Вага"}</div>
            <div class="m-kpi__v">${fmt(grams)} g</div>
          </div>
        </div>
      `
    );

    renderAllUnitsTable(amt, fromU, ing.density);
  }

  function reset() {
    if (ingredient) ingredient.value = "flour";
    if (amount) amount.value = "";
    if (fromUnit) fromUnit.value = "cup";
    if (toUnit) toUnit.value = "g";

    setToast(T.resetDone);
    setResult(T.enterInputs, "");
    if (scheduleTbody) scheduleTbody.innerHTML = "";

    setTimeout(() => setToast(""), 1200);
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

  async function copySchedule() {
    if (!scheduleTable) return;
    const trs = Array.from(scheduleTable.querySelectorAll("tr"));
    const lines = trs.map((tr) =>
      Array.from(tr.children).map((td) => td.innerText.replace(/\s+/g, " ").trim()).join("\t")
    );
    try {
      await navigator.clipboard.writeText(lines.join("\n").trim());
      setToast(T.tableCopied);
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(T.tableCopyFailed);
    }
  }

  // ---------- auto calc ----------
  let autoTimer = null;
  function scheduleAuto() {
    if (!autoCalc || !autoCalc.checked) return;
    clearTimeout(autoTimer);
    autoTimer = setTimeout(() => calc({ silent: true }), 180);
  }

  [amount].forEach((x) => x?.addEventListener("input", scheduleAuto));
  [ingredient, fromUnit, toUnit].forEach((x) => x?.addEventListener("change", scheduleAuto));

  btnCalc?.addEventListener("click", () => calc({ silent: false }));
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);
  btnCopySchedule?.addEventListener("click", copySchedule);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc({ silent: false }); });

  // ---------- init ----------
  populateSelects();
  setResult(T.enterInputs, "");
})();