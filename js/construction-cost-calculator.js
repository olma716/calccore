/* construction-cost-calculator.js — калькулятор вартості будівництва з режимами «Будинок», «Ремонт квартири», «Фундамент», «Паркан», «Гараж і господарські споруди» (UK/EN, UAH/USD/EUR)
   Бюджет = сума етапів «обсяг × ваша ціна» + резерв + ПДВ + додаткові витрати. Вбудованих цін немає: їх вводить користувач.
   Будинок: фундамент і дах — за площею забудови S, решта — за загальною площею S × поверхи; склад етапів залежить від готовності.
   Ремонт: усі етапи — за площею квартири; склад залежить від обсягу робіт.
   Дах: якщо вказано кут α, площа даху = площа забудови / cos(α), інакше — площа забудови.
   Фундамент: стрічковий V = (2(L+W) + внутрішні) × b × h; плитний V = L × W × t; опалубка — стрічковий 2 × довжина × h, плитний 2(L+W) × t; арматура = кг/м³ × V.
   Паркан: стовпи = ціле вгору (довжина / крок) + 1; заповнення = довжина × висота; фундамент і монтаж — за довжиною; ворота й хвіртки — за кількістю.
   Гараж і споруди: фундамент, підлога, дах — за площею забудови L × W; стіни й внутрішнє оздоблення — за площею стін 2(L+W) × H (без віднімання прорізів); ворота, двері, обладнання — за кількістю.
   Резерв = база × r; ПДВ = (база + резерв) × v; додаткові — окремим рядком. Суми таблиці округлюються через накопичені значення, тож рядки дають підсумок до одиниці. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOC = IS_EN ? "en-US" : "uk-UA";
  const SYM = { UAH: "₴", USD: "$", EUR: "€" };
  const LIM = { price: { UAH: 1000000, USD: 25000, EUR: 25000 }, extras: 10000000000 };
  const COLORS = ["#283b69", "#3d5a9e", "#5b7bbf", "#86a0d6", "#aec1e6", "#c9d6f0", "#dbe4f5", "#e8eefa", "#f1f5fc"];
  const GT = ["garage", "shed", "bath"];

  // етапи режимів: k — ключ (id поля ціни r_<k>), lv — для яких рівнів входить, basis — ключ обсягу, opt — ціна необовʼязкова, err — повідомлення, якщо обсягу немає
  const DEFS = {
    house: [
      { k: "foundation", lv: ["shell", "rough", "turnkey"], basis: "fp", unit: "m2" },
      { k: "walls", lv: ["shell", "rough", "turnkey"], basis: "tot", unit: "m2" },
      { k: "roof", lv: ["shell", "rough", "turnkey"], basis: "roofQ", unit: "m2" },
      { k: "windows", lv: ["rough", "turnkey"], basis: "tot", unit: "m2" },
      { k: "engineering", lv: ["rough", "turnkey"], basis: "tot", unit: "m2" },
      { k: "interior", lv: ["turnkey"], basis: "tot", unit: "m2" }
    ],
    reno: [
      { k: "demolition", lv: ["capital"], basis: "area", unit: "m2" },
      { k: "rough", lv: ["capital"], basis: "area", unit: "m2" },
      { k: "electrics", lv: ["capital"], basis: "area", unit: "m2" },
      { k: "plumbing", lv: ["capital"], basis: "area", unit: "m2" },
      { k: "finishing", lv: ["cosmetic", "capital"], basis: "area", unit: "m2" },
      { k: "floor", lv: ["cosmetic", "capital"], basis: "area", unit: "m2" },
      { k: "doors", lv: ["cosmetic", "capital"], basis: "area", unit: "m2" }
    ],
    found: [
      { k: "concrete", lv: ["strip", "slab"], basis: "concrete", unit: "m3" },
      { k: "rebar", lv: ["strip", "slab"], basis: "rebarKg", unit: "kg", opt: 1, err: "errRebar" },
      { k: "formwork", lv: ["strip", "slab"], basis: "formwork", unit: "m2", opt: 1 },
      { k: "excavation", lv: ["strip", "slab"], basis: "excav", unit: "m3", opt: 1, err: "errDepth" },
      { k: "cushion", lv: ["strip", "slab"], basis: "cush", unit: "m3", opt: 1, err: "errCush" },
      { k: "works", lv: ["strip", "slab"], basis: "concrete", unit: "m3", opt: 1 }
    ],
    fence: [
      { k: "ffoundation", lv: ["all"], basis: "len", unit: "m", opt: 1 },
      { k: "posts", lv: ["all"], basis: "posts", unit: "pcs", opt: 1, err: "errStep" },
      { k: "fill", lv: ["all"], basis: "fillArea", unit: "m2" },
      { k: "fgate", lv: ["all"], basis: "gates", unit: "pcs", opt: 1, err: "errGates" },
      { k: "wicket", lv: ["all"], basis: "wickets", unit: "pcs", opt: 1, err: "errWickets" },
      { k: "fworks", lv: ["all"], basis: "len", unit: "m", opt: 1 }
    ],
    garage: [
      { k: "gfoundation", lv: GT, basis: "fp", unit: "m2" },
      { k: "gfloor", lv: GT, basis: "fp", unit: "m2", opt: 1 },
      { k: "gwalls", lv: GT, basis: "wallArea", unit: "m2" },
      { k: "groof", lv: GT, basis: "roofQ", unit: "m2" },
      { k: "ggate", lv: ["garage"], basis: "gates", unit: "pcs", opt: 1, err: "errGates" },
      { k: "gdoor", lv: ["shed", "bath"], basis: "doors", unit: "pcs", opt: 1, err: "errDoors" },
      { k: "ginterior", lv: ["bath"], basis: "wallArea", unit: "m2", opt: 1 },
      { k: "gequip", lv: ["bath"], basis: "equip", unit: "pcs", opt: 1, err: "errEquip" },
      { k: "gelectrics", lv: GT, basis: "fp", unit: "m2", opt: 1 }
    ]
  };
  const DIMS = {
    house: ["footprint", "roofAngle"], reno: ["area"],
    found: ["fL", "fW", "fExtra", "fB", "fH", "fT", "fDepth", "fCush", "fRebar"],
    fence: ["pL", "pH", "pStep", "pGates", "pWickets"],
    garage: ["gL", "gW", "gH", "gRoofAngle", "gGates", "gDoors", "gEquip"]
  };
  const STAGE_KEYS = [].concat(...Object.values(DEFS).map((d) => d.map((x) => x.k)));
  const SAMPLE = {
    house: { footprint: "100", floors: "2", ready: "shell", r: { foundation: "90", walls: "130", roof: "70" } },
    reno: { area: "60", level: "capital", r: { demolition: "10", rough: "25", electrics: "20", plumbing: "20", finishing: "35", floor: "25", doors: "10" } },
    found: { ftype: "strip", fL: "10", fW: "8", fExtra: "6", fB: "0.4", fH: "0.8", fDepth: "1", fRebar: "80", r: { concrete: "100", rebar: "1.2", formwork: "8", excavation: "10", works: "40" } },
    fence: { pL: "40", pH: "2", pStep: "2.5", pGates: "1", pWickets: "1", r: { ffoundation: "40", posts: "25", fill: "15", fgate: "400", wicket: "120", fworks: "10" } },
    garage: { gtype: "garage", gL: "6", gW: "4", gH: "2.5", gGates: "1", r: { gfoundation: "60", gfloor: "25", gwalls: "45", groof: "35", ggate: "450", gelectrics: "10" } }
  };

  const T = IS_EN
    ? {
        enter: "Enter your data — the result will appear here.",
        missing: "Fill in: {list}.",
        errNum: "Enter a valid number in the field “{f}”.",
        errRange: "“{f}” must be between {a} and {b} {u}.",
        errInt: "“{f}” must be a whole number.",
        errPrice: "The price must be positive and not above {max}.",
        errRes: "The contingency must be between 0 and 50%.",
        errVat: "VAT must be between 0 and 30%.",
        errExtras: "The extra costs must be zero or a reasonable positive amount.",
        errNeed: "Enter the price of at least one stage.",
        errRebar: "For the rebar price enter the kg of rebar per m³ of concrete.",
        errDepth: "For the excavation price enter the depth.",
        errCush: "For the cushion price enter its thickness.",
        errStep: "For the posts price enter the post spacing.",
        errGates: "For the gate price enter the number of gates.",
        errWickets: "For the wicket price enter the number of wickets.",
        errDoors: "For the door price enter the number of doors.",
        errEquip: "For the equipment price enter the number of pieces.",
        lbl: { footprint: "Building footprint", floors: "Floors", ready: "Readiness", area: "Flat area", level: "Scope of work", ftype: "Foundation type", fL: "Length", fW: "Width", fExtra: "Inner walls length", fB: "Strip width", fH: "Strip height", fT: "Slab thickness", fDepth: "Depth", fCush: "Cushion thickness", fRebar: "Rebar per m³ of concrete", roofAngle: "Roof pitch", gRoofAngle: "Roof pitch", pL: "Fence length", pH: "Fence height", pStep: "Post spacing", pGates: "Gates", pWickets: "Wickets", gtype: "Type of building", gL: "Length", gW: "Width", gH: "Wall height", gGates: "Gates", gDoors: "Doors", gEquip: "Equipment", reserve: "Contingency", vat: "VAT", extras: "Extra costs" },
        units: { footprint: "m²", area: "m²", fL: "m", fW: "m", fExtra: "m", fB: "m", fH: "m", fT: "m", fDepth: "m", fCush: "m", fRebar: "kg", roofAngle: "°", gRoofAngle: "°", pL: "m", pH: "m", pStep: "m", pGates: "pcs", pWickets: "pcs", gL: "m", gW: "m", gH: "m", gGates: "pcs", gDoors: "pcs", gEquip: "pcs" },
        st: { foundation: "Foundation", walls: "Walls and floors", roof: "Roof", windows: "Windows, doors, facade", engineering: "Utilities", interior: "Interior finishing", demolition: "Demolition", rough: "Rough work (screed, plaster)", electrics: "Electrics", plumbing: "Plumbing and heating", finishing: "Walls and ceiling finishing", floor: "Flooring", doors: "Doors, skirting, small work", concrete: "Concrete", rebar: "Rebar", formwork: "Formwork", excavation: "Earthworks", cushion: "Sand and gravel cushion", works: "Pouring work", ffoundation: "Fence foundation", posts: "Posts", fill: "Infill (sections, sheets, pickets)", fgate: "Gates", wicket: "Wicket", fworks: "Installation work", gfoundation: "Foundation", gfloor: "Floor", gwalls: "Walls", groof: "Roof", ggate: "Garage gates", gdoor: "Doors", ginterior: "Interior lining and insulation", gequip: "Equipment (stove, boiler)", gelectrics: "Electrics" },
        qu: { m2: "m²", m3: "m³", kg: "kg", m: "m", pcs: "pcs" },
        perRoof: "per m² of roof", perFp: "per m² of footprint",
        total: "Total cost", totalArea: "total area {a} m²", flatArea: "{a} m² flat", concVol: "{v} m³ of concrete", fenceLine: "{a} m of fence", garageLine: "{a} m² footprint",
        perHouse: "Per m² of total area", perReno: "Per m² of the flat", perFound: "Per m³ of concrete", perFoundArea: "Per m² of footprint", perFence: "Per metre of fence", perGarage: "Per m² of footprint",
        base: "Base", baseMini: "sum of the stages", reserve: "Contingency {p}%", vat: "VAT {p}%", extras: "Extra costs", conc: "Concrete volume", posts: "Posts", postsU: "pcs", infill: "Infill area",
        incl: "Included: {a}.", notIncl: "Not included: {a}.",
        eq: "≈ {v} at the NBU rate as of {d}",
        barTitle: "What the budget consists of", bar: "Budget structure",
        thStage: "Stage", thQty: "Quantity × price", thBase: "Base", thWith: "With markups", thCum: "Cumulative", rowExtras: "Extra costs", rowTotal: "Total",
        noteHouse: "The foundation and the roof are counted by the footprint, the rest by the total area of all floors. If the roof pitch is given, the roof is counted as the footprint ÷ cos(pitch). An approximate estimate, not a bill of quantities.",
        noteReno: "All stages are counted by the area of the flat; enter the price of work, with materials if your quote includes them. An approximate estimate.",
        noteFound: "The volume is counted from the dimensions you entered; formwork is the two sides of the strip or the edge of the slab. An approximate estimate.",
        noteFence: "Posts = length ÷ spacing rounded up + 1; the infill area = length × height. An approximate estimate.",
        noteGarage: "The foundation, floor and roof are counted by the footprint, walls and lining by the wall area without deducting openings; with a roof pitch the roof is counted as the footprint ÷ cos(pitch). An approximate estimate.",
        totalAreaLine: "Total area: {a} m²",
        rateOff: "The NBU rate is unavailable — the amounts were not converted, check them.",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Illustrative example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅"
      }
    : {
        enter: "Вкажіть дані — результат зʼявиться тут.",
        missing: "Заповніть: {list}.",
        errNum: "Вкажіть коректне число в полі «{f}».",
        errRange: "«{f}» має бути від {a} до {b} {u}.",
        errInt: "«{f}» має бути цілим числом.",
        errPrice: "Ціна має бути додатною й не більшою за {max}.",
        errRes: "Резерв має бути від 0 до 50%.",
        errVat: "ПДВ має бути від 0 до 30%.",
        errExtras: "Додаткові витрати мають бути нулем або розумною додатною сумою.",
        errNeed: "Вкажіть ціну хоча б одного етапу.",
        errRebar: "Для ціни арматури вкажіть кг арматури на м³ бетону.",
        errDepth: "Для ціни земляних робіт вкажіть глибину.",
        errCush: "Для ціни подушки вкажіть її товщину.",
        errStep: "Для ціни стовпів вкажіть крок стовпів.",
        errGates: "Для ціни воріт вкажіть кількість воріт.",
        errWickets: "Для ціни хвіртки вкажіть кількість хвірток.",
        errDoors: "Для ціни дверей вкажіть кількість дверей.",
        errEquip: "Для ціни обладнання вкажіть кількість.",
        lbl: { footprint: "Площа забудови", floors: "Поверхів", ready: "Готовність", area: "Площа квартири", level: "Обсяг робіт", ftype: "Тип фундаменту", fL: "Довжина", fW: "Ширина", fExtra: "Довжина внутрішніх стін", fB: "Ширина стрічки", fH: "Висота стрічки", fT: "Товщина плити", fDepth: "Глибина", fCush: "Товщина подушки", fRebar: "Арматури на м³ бетону", roofAngle: "Кут даху", gRoofAngle: "Кут даху", pL: "Довжина паркану", pH: "Висота паркану", pStep: "Крок стовпів", pGates: "Воріт", pWickets: "Хвірток", gtype: "Тип споруди", gL: "Довжина", gW: "Ширина", gH: "Висота стін", gGates: "Воріт", gDoors: "Дверей", gEquip: "Обладнання", reserve: "Резерв", vat: "ПДВ", extras: "Додаткові витрати" },
        units: { footprint: "м²", area: "м²", fL: "м", fW: "м", fExtra: "м", fB: "м", fH: "м", fT: "м", fDepth: "м", fCush: "м", fRebar: "кг", roofAngle: "°", gRoofAngle: "°", pL: "м", pH: "м", pStep: "м", pGates: "шт", pWickets: "шт", gL: "м", gW: "м", gH: "м", gGates: "шт", gDoors: "шт", gEquip: "шт" },
        st: { foundation: "Фундамент", walls: "Стіни та перекриття", roof: "Дах", windows: "Вікна, двері, фасад", engineering: "Інженерні системи", interior: "Внутрішнє оздоблення", demolition: "Демонтаж", rough: "Чорнові роботи (стяжка, штукатурка)", electrics: "Електрика", plumbing: "Сантехніка й опалення", finishing: "Оздоблення стін і стелі", floor: "Підлога", doors: "Двері, плінтуси, дрібні роботи", concrete: "Бетон", rebar: "Арматура", formwork: "Опалубка", excavation: "Земляні роботи", cushion: "Піщано-щебенева подушка", works: "Роботи із заливання", ffoundation: "Фундамент під паркан", posts: "Стовпи", fill: "Заповнення (секції, профнастил, штакетник)", fgate: "Ворота", wicket: "Хвіртка", fworks: "Монтаж і роботи", gfoundation: "Фундамент", gfloor: "Підлога", gwalls: "Стіни", groof: "Дах", ggate: "Гаражні ворота", gdoor: "Двері", ginterior: "Внутрішня обшивка й утеплення", gequip: "Обладнання (піч, котел)", gelectrics: "Електрика" },
        qu: { m2: "м²", m3: "м³", kg: "кг", m: "м", pcs: "шт" },
        perRoof: "за м² даху", perFp: "за м² забудови",
        total: "Загальна вартість", totalArea: "загальна площа {a} м²", flatArea: "квартира {a} м²", concVol: "{v} м³ бетону", fenceLine: "{a} м паркану", garageLine: "забудова {a} м²",
        perHouse: "За м² загальної площі", perReno: "За м² квартири", perFound: "За м³ бетону", perFoundArea: "За м² забудови", perFence: "За погонний метр паркану", perGarage: "За м² забудови",
        base: "База", baseMini: "сума етапів", reserve: "Резерв {p}%", vat: "ПДВ {p}%", extras: "Додаткові витрати", conc: "Об'єм бетону", posts: "Стовпів", postsU: "шт", infill: "Площа заповнення",
        incl: "Входить: {a}.", notIncl: "Не входить: {a}.",
        eq: "≈ {v} за курсом НБУ на {d}",
        barTitle: "З чого складається бюджет", bar: "Структура бюджету",
        thStage: "Етап", thQty: "Обсяг × ціна", thBase: "База", thWith: "З надбавками", thCum: "Накопичено", rowExtras: "Додаткові витрати", rowTotal: "Разом",
        noteHouse: "Фундамент і дах рахуються за площею забудови, решта — за загальною площею всіх поверхів. Якщо вказано кут даху, дах рахується за площею забудови ÷ cos(кут). Орієнтовна оцінка, а не кошторис за обсягами робіт.",
        noteReno: "Усі етапи рахуються за площею квартири; вказуйте ціну робіт, а з матеріалами — якщо їх включено в пропозицію. Орієнтовна оцінка.",
        noteFound: "Об'єм рахується за введеними розмірами; опалубка — дві сторони стрічки або торець плити. Орієнтовна оцінка.",
        noteFence: "Стовпів = довжина ÷ крок з округленням угору + 1; площа заповнення = довжина × висота. Орієнтовна оцінка.",
        noteGarage: "Фундамент, підлога й дах рахуються за площею забудови, стіни й обшивка — за площею стін без віднімання прорізів; з кутом даху дах рахується за площею забудови ÷ cos(кут). Орієнтовна оцінка.",
        totalAreaLine: "Загальна площа: {a} м²",
        rateOff: "Курс НБУ недоступний — суми не переведено, перевірте їх.",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено умовний приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅"
      };

  // ===== helpers =====
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ""));
  const nf = (x, d = 0) => (Math.round(x * 10 ** d) / 10 ** d + 0).toLocaleString(LOC, { minimumFractionDigits: d, maximumFractionDigits: d });
  const q1 = (x) => nf(x, Math.abs(x - Math.round(x)) < 0.0005 ? 0 : x < 10 ? 2 : 1);
  const pct = (x) => nf(x, x % 1 ? 1 : 0);
  let cur = "USD", mode = "house";
  const money = (x, c = cur) => (IS_EN ? SYM[c] + nf(x) : nf(x) + " " + SYM[c]);
  const moneyP = (x, c = cur) => {
    const d = x < 1000 && Math.abs(x - Math.round(x)) >= 0.05 ? 1 : 0;
    return IS_EN ? SYM[c] + nf(x, d) : nf(x, d) + " " + SYM[c];
  };
  function toast(msg) {
    const n = el("toast");
    if (!n) return;
    n.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (n.textContent = ""), 2600);
  }
  const raw = (id) => (el(id).value || "").trim();
  function num(id) {
    const s = raw(id).replace(/\s+/g, "").replace(",", ".");
    if (s === "") return null;
    return /^\d+(\.\d+)?$/.test(s) ? Number(s) : NaN;
  }
  const sel = (id) => el(id).value;
  const level = () => (mode === "house" ? sel("ready") : mode === "reno" ? sel("level") : mode === "found" ? sel("ftype") : mode === "garage" ? sel("gtype") : "all");

  // ===== курс НБУ (лише для рядка «≈ в іншій валюті») =====
  const rates = { USD: null, EUR: null, date: "" };
  async function loadRate(code) {
    try {
      const r = await fetch("/api/nbu-history?code=" + code, { cache: "no-store" });
      if (!r.ok) throw new Error("rate");
      const pts = (await r.json()).pts;
      const p = pts[pts.length - 1];
      if (p && p[1] > 0) {
        rates[code] = p[1];
        const d = new Date(p[0]);
        rates.date = String(d.getUTCDate()).padStart(2, "0") + "." + String(d.getUTCMonth() + 1).padStart(2, "0") + "." + d.getUTCFullYear();
      }
    } catch {
      /* без курсу сторінка працює, лише без рядка еквіваленту */
    }
  }

  // ===== модель =====
  const lim = (x) => (x % 1 ? String(x).replace(".", IS_EN ? "." : ",") : nf(x));
  // перевірка числа з діапазоном: повертає {v}, {miss} або {err}
  function val(id, lo, hi, required, int) {
    const label = T.lbl[id], v = num(id);
    if (v === null) return required ? { miss: label } : { v: null };
    if (Number.isNaN(v)) return { err: fill(T.errNum, { f: label }) };
    if (int && v % 1) return { err: fill(T.errInt, { f: label }) };
    if (v < lo || v > hi) return { err: fill(T.errRange, { f: label, a: lim(lo), b: lim(hi), u: T.units[id] || "" }) };
    return { v };
  }

  function compute() {
    const miss = [];
    let err = null;
    const get = (id, lo, hi, required = true, int = false) => {
      const r = val(id, lo, hi, required, int);
      if (r.miss) miss.push(r.miss);
      if (r.err && !err) err = r.err;
      return r;
    };
    let headline = {}, Q = {};
    if (mode === "house") {
      const fp = get("footprint", 5, 10000);
      const tot = (fp.v || 0) * Number(sel("floors"));
      const ang = get("roofAngle", 0, 60, false);
      Q = { fp: fp.v, tot, roofQ: ang.v ? fp.v / Math.cos((ang.v * Math.PI) / 180) : fp.v };
      headline = { area: tot, perLabel: T.perHouse, areaLine: fill(T.totalArea, { a: q1(tot) }) };
    } else if (mode === "reno") {
      const a = get("area", 10, 1000);
      Q = { area: a.v };
      headline = { area: a.v, perLabel: T.perReno, areaLine: fill(T.flatArea, { a: q1(a.v || 0) }) };
    } else if (mode === "found") {
      const strip = sel("ftype") === "strip";
      const L = get("fL", 1, 100), W = get("fW", 1, 100);
      const ex = strip ? get("fExtra", 0, 1000, false) : { v: 0 };
      const B = strip ? get("fB", 0.2, 2) : { v: 0 }, H = strip ? get("fH", 0.2, 3) : { v: 0 }, Th = strip ? { v: 0 } : get("fT", 0.1, 1);
      const dep = get("fDepth", 0.1, 5, false), cu = get("fCush", 0.05, 1.5, false), rb = get("fRebar", 1, 300, false);
      if (!err && !miss.length) {
        const tot = strip ? 2 * (L.v + W.v) + (ex.v || 0) : 0;
        const V = strip ? tot * B.v * H.v : L.v * W.v * Th.v;
        Q = {
          concrete: V, rebarKg: rb.v ? V * rb.v : null,
          formwork: strip ? 2 * tot * H.v : 2 * (L.v + W.v) * Th.v,
          excav: dep.v ? (strip ? tot * B.v * dep.v : L.v * W.v * dep.v) : null,
          cush: cu.v ? (strip ? tot * B.v * cu.v : L.v * W.v * cu.v) : null
        };
        headline = { area: V, perLabel: T.perFound, conc: V, plan: L.v * W.v, areaLine: fill(T.concVol, { v: q1(V) }) };
      }
    } else if (mode === "fence") {
      const Ln = get("pL", 1, 5000), H = get("pH", 0.5, 6);
      const step = get("pStep", 0.5, 6, false), gates = get("pGates", 0, 50, false, true), wick = get("pWickets", 0, 50, false, true);
      if (!err && !miss.length) {
        Q = { len: Ln.v, fillArea: Ln.v * H.v, posts: step.v ? Math.ceil(Ln.v / step.v - 1e-9) + 1 : null, gates: gates.v || null, wickets: wick.v || null };
        headline = { area: Ln.v, perLabel: T.perFence, areaLine: fill(T.fenceLine, { a: q1(Ln.v) }), posts: Q.posts, fill: Q.fillArea };
      }
    } else {
      const L = get("gL", 1, 100), W = get("gW", 1, 100), H = get("gH", 1.5, 8);
      const ang = get("gRoofAngle", 0, 60, false);
      const gates = get("gGates", 0, 20, false, true), doors = get("gDoors", 0, 20, false, true), equip = get("gEquip", 0, 20, false, true);
      if (!err && !miss.length) {
        const fp = L.v * W.v;
        Q = { fp, roofQ: ang.v ? fp / Math.cos((ang.v * Math.PI) / 180) : fp, wallArea: 2 * (L.v + W.v) * H.v, gates: gates.v || null, doors: doors.v || null, equip: equip.v || null };
        headline = { area: fp, perLabel: T.perGarage, areaLine: fill(T.garageLine, { a: q1(fp) }) };
      }
    }
    // спільні поля
    const resV = num("reserve") === null ? 0 : num("reserve"), vatV = num("vat") === null ? 0 : num("vat"), extV = num("extras") === null ? 0 : num("extras");
    [[resV, T.lbl.reserve], [vatV, T.lbl.vat], [extV, T.lbl.extras]].forEach(([v, l]) => !err && Number.isNaN(v) && (err = fill(T.errNum, { f: l })));
    if (!err && resV > 50) err = T.errRes;
    if (!err && vatV > 30) err = T.errVat;
    if (!err && extV > LIM.extras) err = T.errExtras;
    // ціни етапів
    const lvl = level();
    const defs = DEFS[mode].filter((d) => d.lv.includes(lvl));
    const lines = [];
    for (const d of defs) {
      const rv = num("r_" + d.k);
      if (rv === null) {
        if (!d.opt) miss.push(T.st[d.k]);
        continue;
      }
      if (Number.isNaN(rv)) { err = err || fill(T.errNum, { f: T.st[d.k] }); continue; }
      if (rv <= 0 || rv > LIM.price[cur]) { err = err || fill(T.errPrice, { max: money(LIM.price[cur]) }); continue; }
      if (miss.length || err) continue;
      const qty = Q[d.basis];
      if (!qty) { err = T[d.err] || T.errNeed; continue; }
      lines.push({ key: d.k, qty, unit: d.unit, rate: rv, base: qty * rv });
    }
    if (miss.length) {
      const empty = !DIMS[mode].some((i) => raw(i)) && !defs.some((d) => raw("r_" + d.k)) && raw("extras") === "";
      return { ok: false, incomplete: true, none: empty, msg: fill(T.missing, { list: miss.join(", ") }) };
    }
    if (err) return { ok: false, msg: err };
    if (!lines.length) return { ok: false, msg: T.errNeed };
    const base = lines.reduce((s, x) => s + x.base, 0);
    const reserve = (base * resV) / 100, vatAmt = ((base + reserve) * vatV) / 100, works = base + reserve + vatAmt, total = works + extV;
    const k = (1 + resV / 100) * (1 + vatV / 100);
    let cb = 0, cw = 0, pb = 0, pw = 0;
    const rows = lines.map((x) => {
      cb += x.base;
      cw += x.base * k;
      const rb = Math.round(cb), rw = Math.round(cw);
      const row = { ...x, withM: x.base * k, baseR: rb - pb, withR: rw - pw, cum: rw };
      pb = rb;
      pw = rw;
      return row;
    });
    const incl = rows.map((x) => T.st[x.key]);
    const notIncl = mode === "house" || mode === "reno" ? DEFS[mode].filter((d) => !d.lv.includes(lvl)).map((d) => T.st[d.k]) : [];
    return { ok: true, cur, mode, lvl, res: resV, vat: vatV, ext: extV, base, reserve, vatAmt, works, total, rows, headline, perUnit: total / headline.area, incl, notIncl };
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="cst__kpi ' + cls + '"><div class="cst__kpiT">' + title + '</div><div class="cst__kpiV' + (String(value).length > 14 ? " cst__kpiV--s" : "") + '">' + value + "</div>" + (mini ? '<div class="cst__kpiM">' + mini + "</div>" : "") + "</div>";

  function eqLine(r) {
    if (r.cur === "UAH") return rates.USD ? fill(T.eq, { v: money(r.total / rates.USD, "USD"), d: rates.date }) : "";
    return rates[r.cur] ? fill(T.eq, { v: money(r.total * rates[r.cur], "UAH"), d: rates.date }) : "";
  }
  const worksR = (r) => (r.rows.length ? r.rows[r.rows.length - 1].cum : 0);
  const totalR = (r) => worksR(r) + Math.round(r.ext);

  function barHtml(r) {
    const parts = r.rows.map((x, i) => ({ name: T.st[x.key], v: x.withM, c: COLORS[i % COLORS.length] }));
    if (r.ext > 0) parts.push({ name: T.extras, v: r.ext, c: "#16a34a" });
    const seg = parts.map((p) => '<div style="width:' + ((p.v / r.total) * 100).toFixed(3) + "%;background:" + p.c + '" title="' + p.name + ": " + money(p.v) + '"></div>').join("");
    const leg = parts.map((p) => '<span><i style="background:' + p.c + '"></i>' + p.name + " " + pct(Math.round((p.v / r.total) * 1000) / 10) + "%</span>").join("");
    return '<div class="cst__bar" role="img" aria-label="' + T.bar + '">' + seg + '</div><div class="cst__legend">' + leg + "</div>";
  }

  function tableHtml(r) {
    const head = "<thead><tr><th>" + T.thStage + "</th><th>" + T.thQty + "</th><th>" + T.thBase + "</th><th>" + T.thWith + "</th><th>" + T.thCum + "</th></tr></thead>";
    let body = r.rows.map((x) => "<tr><td>" + T.st[x.key] + "</td><td>" + q1(x.qty) + " " + T.qu[x.unit] + " × " + money(x.rate, r.cur) + "</td><td>" + money(x.baseR) + "</td><td>" + money(x.withR) + "</td><td>" + money(x.cum) + "</td></tr>").join("");
    const tot = totalR(r);
    if (r.ext > 0) body += "<tr><td>" + T.rowExtras + "</td><td></td><td></td><td>" + money(r.ext) + "</td><td>" + money(tot) + "</td></tr>";
    body += '<tr class="cst__total"><td>' + T.rowTotal + "</td><td></td><td>" + money(r.rows.reduce((s, x) => s + x.baseR, 0)) + "</td><td>" + money(tot) + "</td><td>" + money(tot) + "</td></tr>";
    return '<table class="cst__tbl cst__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + "</tbody></table>";
  }

  let last = null;
  const NOTE = { house: "noteHouse", reno: "noteReno", found: "noteFound", fence: "noteFence", garage: "noteGarage" };

  function render(r, strict) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || (r.incomplete && !strict) || !r.msg ? T.enter : '<div class="cst__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const eq = eqLine(r), tot = totalR(r);
    let tiles = tile(T.base, money(r.base), T.baseMini) + tile(fill(T.reserve, { p: pct(r.res) }), money(r.reserve));
    if (r.vat > 0) tiles += tile(fill(T.vat, { p: pct(r.vat) }), money(r.vatAmt));
    tiles += tile(T.extras, money(r.ext));
    if (r.mode === "found") tiles = tile(T.conc, q1(r.headline.conc) + " " + T.qu.m3) + tiles;
    const per2 = r.mode === "found" ? '<div class="cst__kpiT cst__mt6">' + T.perFoundArea + '</div><div class="cst__perV cst__perV--s">' + moneyP(r.total / r.headline.plan) + "</div>" : "";
    const lists = [r.incl.length ? fill(T.incl, { a: r.incl.join(", ").toLowerCase() }) : "", r.notIncl.length ? fill(T.notIncl, { a: r.notIncl.join(", ").toLowerCase() }) : ""].filter(Boolean).join(" ");
    box.innerHTML =
      '<div class="cst__head"><div><div class="cst__kpiT">' + T.total + " · " + r.headline.areaLine + '</div><div class="cst__big">' + money(tot) + "</div>" + (eq ? '<div class="cst__eq">' + eq + "</div>" : "") + '</div><div class="cst__per"><div class="cst__kpiT">' + r.headline.perLabel + '</div><div class="cst__perV">' + moneyP(r.perUnit) + "</div>" + per2 + "</div></div>" +
      '<div class="cst__sub">' + T.barTitle + "</div>" + barHtml(r) +
      '<div class="cst__kpis cst__kpis--' + (r.mode === "found" || r.vat > 0 ? 4 : 3) + '">' + tiles + "</div>" +
      (lists ? '<div class="cst__lists">' + lists + "</div>" : "") +
      '<div class="cst__note">' + T[NOTE[r.mode]] + "</div>";
    el("schedBody").innerHTML = tableHtml(r);
    sch.hidden = false;
  }

  function calc(strict) {
    render(compute(), strict === true);
  }

  // ===== копіювання, CSV =====
  const tableMatrix = () => {
    const t = el("scheduleTable");
    if (!t) return [];
    return Array.from(t.querySelectorAll("tr")).map((tr) => Array.from(tr.children).map((c) => c.textContent.replace(/ /g, " ").trim()));
  };
  async function copyTable() {
    try {
      await navigator.clipboard.writeText(tableMatrix().map((r) => r.join("\t")).join("\n"));
      toast(T.tableCopied);
    } catch {
      toast(T.copyFailed);
    }
  }
  function downloadCsv() {
    if (!el("scheduleTable") || !last) return;
    const csv = "﻿" + tableMatrix().map((row) => row.map((c) => '"' + c.replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "construction-cost.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    const txt = T.total + " (" + last.headline.areaLine + "): " + money(totalR(last)) + "; " + last.headline.perLabel + ": " + moneyP(last.perUnit) + "; " + T.base + ": " + money(last.base) + "; " + fill(T.reserve, { p: pct(last.res) }) + ": " + money(last.reserve) + (last.vat > 0 ? "; " + fill(T.vat, { p: pct(last.vat) }) + ": " + money(last.vatAmt) : "") + "; " + T.extras + ": " + money(last.ext);
    try {
      await navigator.clipboard.writeText(txt);
      toast(T.resultCopied);
    } catch {
      toast(T.copyFailed);
    }
  }

  // ===== власні випадні списки =====
  function initDd(pre, onPick) {
    const btn = el(pre + "_btn"), list = el(pre + "_list");
    const items = () => Array.from(list.querySelectorAll("li"));
    const close = (focusBtn) => {
      list.hidden = true;
      btn.setAttribute("aria-expanded", "false");
      if (focusBtn) btn.focus();
    };
    const open = () => {
      list.hidden = false;
      btn.setAttribute("aria-expanded", "true");
      (items().find((li) => li.getAttribute("aria-selected") === "true") || items()[0]).focus();
    };
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (list.hidden) open();
      else close();
    });
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        open();
      }
    });
    const pick = (li) => {
      onPick(li.dataset.v);
      close(true);
    };
    list.addEventListener("click", (e) => {
      const li = e.target.closest("li[data-v]");
      if (li) pick(li);
    });
    list.addEventListener("keydown", (e) => {
      const all = items(), i = all.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); all[Math.min(all.length - 1, i + 1)].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); all[Math.max(0, i - 1)].focus(); }
      else if (e.key === "Home") { e.preventDefault(); all[0].focus(); }
      else if (e.key === "End") { e.preventDefault(); all[all.length - 1].focus(); }
      else if ((e.key === "Enter" || e.key === " ") && i >= 0) { e.preventDefault(); pick(all[i]); }
      else if (e.key === "Escape") { e.preventDefault(); close(true); }
      else if (e.key === "Tab") close();
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#" + pre + "_dd")) close();
    });
  }
  // select-подібне поле: прихований input (значення) + список; DD[id] — префікс списку
  const DD = { floors: "fl", ready: "rd", level: "lv", ftype: "ft", gtype: "gt" };
  const DD_MODE = { floors: "house", ready: "house", level: "reno", ftype: "found", gtype: "garage" };
  function setDd(hid, v) {
    const pre = DD[hid], lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
  }

  // ===== режими й видимість =====
  function setMode(m) {
    if (!DEFS[m]) m = "house";
    mode = m;
    document.querySelectorAll(".cst__mcard").forEach((b) => {
      const on = b.dataset.mode === m;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== m));
    syncVisibility();
  }
  function syncVisibility() {
    const lvl = level();
    DEFS[mode].forEach((d) => {
      const f = el("f_" + d.k);
      if (f) f.hidden = !d.lv.includes(lvl);
    });
    const panel = document.querySelector('[data-panel="' + mode + '"]');
    if (panel) panel.querySelectorAll("[data-for]").forEach((f) => (f.hidden = !f.dataset.for.split(" ").includes(lvl)));
    document.querySelectorAll("[data-roofper]").forEach((s) => {
      const v = num(s.dataset.roofper);
      s.textContent = v > 0 ? T.perRoof : T.perFp;
    });
    const tip = el("houseTip");
    if (tip) tip.hidden = !(mode === "house" && lvl === "shell");
    const t = el("houseTotal");
    if (t) {
      const fp = num("footprint");
      t.textContent = fp && !Number.isNaN(fp) ? fill(T.totalAreaLine, { a: q1(fp * Number(sel("floors"))) }) : "";
    }
  }

  // ===== валюта =====
  async function setCur(next, convert) {
    if (next === cur) return;
    const prev = cur;
    if (convert) {
      const need = [prev, next].filter((c) => c !== "UAH");
      await Promise.all(need.filter((c) => !rates[c]).map(loadRate));
      const ids = STAGE_KEYS.map((k) => "r_" + k).concat(["extras"]);
      if (need.every((c) => rates[c])) {
        const toUah = (v, c) => (c === "UAH" ? v : v * rates[c]);
        const fromUah = (v, c) => (c === "UAH" ? v : v / rates[c]);
        ids.forEach((id) => {
          const v = num(id);
          if (v !== null && !Number.isNaN(v)) {
            const x = fromUah(toUah(v, prev), next);
            el(id).value = String(x >= 100 ? Math.round(x) : Math.round(x * 100) / 100);
          }
        });
      } else if (ids.some((id) => num(id) !== null)) toast(T.rateOff);
    }
    cur = next;
    syncCur();
  }
  function syncCur() {
    document.querySelectorAll("[data-wu]").forEach((n) => (n.textContent = SYM[cur]));
    el("cur_flag").src = "/assets/flags/" + { UAH: "ua", USD: "us", EUR: "eu" }[cur] + ".png";
    el("cur_code").textContent = cur;
    document.querySelectorAll("#cur_list li").forEach((li) => li.setAttribute("aria-selected", String(li.dataset.code === cur)));
  }

  // ===== кнопки =====
  const ALL_IDS = [].concat(...Object.values(DIMS)).concat(STAGE_KEYS.map((k) => "r_" + k), ["reserve", "vat", "extras"]);

  function resetAll() {
    ALL_IDS.forEach((id) => (el(id).value = ""));
    el("reserve").value = "10";
    syncVisibility();
    render({ ok: false, none: true });
  }
  function fillExample() {
    const s = SAMPLE[mode];
    ALL_IDS.forEach((id) => (el(id).value = ""));
    el("reserve").value = "10";
    Object.keys(s).forEach((k) => {
      if (k === "r") Object.keys(s.r).forEach((rk) => (el("r_" + rk).value = s.r[rk]));
      else if (DD[k]) setDd(k, s[k]);
      else el(k).value = s[k];
    });
    if (mode === "house") el("extras").value = "3000";
    if (cur !== "USD") setCur("USD", false);
    syncVisibility();
    calc(true);
    toast(T.example);
  }
  function share() {
    const p = new URLSearchParams();
    p.set("mode", mode);
    p.set("cur", cur);
    Object.keys(DD).forEach((k) => DD_MODE[k] === mode && p.set(k, sel(k)));
    DIMS[mode].concat(DEFS[mode].map((d) => "r_" + d.k), ["reserve", "vat", "extras"]).forEach((id) => raw(id) && p.set(id, raw(id)));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    let any = false;
    if (["UAH", "USD", "EUR"].includes(q.get("cur"))) {
      cur = q.get("cur");
      syncCur();
    }
    if (DEFS[q.get("mode")]) {
      mode = q.get("mode");
      any = true;
    }
    Object.keys(DD).forEach((k) => q.has(k) && setDd(k, q.get(k)));
    ALL_IDS.forEach((id) => {
      if (q.has(id)) {
        el(id).value = q.get(id).slice(0, 14);
        any = true;
      }
    });
    return any;
  }

  window.addEventListener("DOMContentLoaded", () => {
    ALL_IDS.forEach((id) => {
      el(id).addEventListener("input", () => {
        if (id === "footprint" || id === "roofAngle" || id === "gRoofAngle") syncVisibility();
        calc();
      });
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc(true);
      });
    });
    Object.keys(DD).forEach((hid) =>
      initDd(DD[hid], (v) => {
        setDd(hid, v);
        syncVisibility();
        calc();
      })
    );
    document.querySelectorAll(".cst__mcard").forEach((b) =>
      b.addEventListener("click", () => {
        setMode(b.dataset.mode);
        calc();
      })
    );
    // валюта: випадний список із прапорцем, як у фінансових калькуляторах
    const curBtn = el("cur_btn"), curList = el("cur_list");
    const closeCur = () => {
      curList.hidden = true;
      curBtn.setAttribute("aria-expanded", "false");
    };
    curBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = curList.hidden;
      curList.hidden = !open;
      curBtn.setAttribute("aria-expanded", String(open));
    });
    curList.addEventListener("click", async (e) => {
      const li = e.target.closest("li[data-code]");
      if (!li) return;
      closeCur();
      await setCur(li.dataset.code, true);
      calc();
    });
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#cur_dd")) closeCur();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCur();
    });
    el("copyTbl").addEventListener("click", copyTable);
    el("csvBtn").addEventListener("click", downloadCsv);
    el("calcBtn").addEventListener("click", () => {
      const r = compute();
      render(r, true);
      if (!r.ok && r.msg) toast(r.msg);
    });
    el("copyBtn").addEventListener("click", copyResult);
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => {
      resetAll();
      toast(T.reset);
    });
    el("shareBtn").addEventListener("click", share);

    syncCur();
    const used = applyFromUrl();
    setMode(mode);
    // курс потрібен для рядка еквіваленту: підтягуємо після першого показу
    Promise.all(["USD", "EUR"].map(loadRate)).then(() => last && render(last));
    if (used) calc();
    else render({ ok: false, none: true });
  });
})();
