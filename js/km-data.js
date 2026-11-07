/* km-data.js — кулінарні міри: одиниці (склянки, ложки, унції, пінти), база продуктів із густиною, розбір кількості з дробами, округлення.
   Густина: для сипучих і густих продуктів із таблиці ваг King Arthur Baking («Ingredient Weight Chart», грами на американську склянку 236,588 мл), для рідин (вода, молоко, олія, мед, сиропи) — фізична густина. */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const CUST = 236.5882365; // американська склянка, мл (звичайна)
  // одиниці: [id, UK, EN, вид (v — об'єм, w — вага), мл чи грами в одиниці]
  const UNITS = [
    ["ml", "Мілілітр (мл)", "Milliliter (ml)", "v", 1], ["l", "Літр (л)", "Liter (L)", "v", 1000],
    ["tsp", "Чайна ложка (5 мл)", "Teaspoon (5 ml)", "v", 5], ["dsp", "Десертна ложка (10 мл)", "Dessert spoon (10 ml)", "v", 10], ["tbsp", "Столова ложка (15 мл)", "Tablespoon (15 ml)", "v", 15], ["tbspau", "Столова ложка, Австралія (20 мл)", "Tablespoon, Australia (20 ml)", "v", 20],
    ["cup250", "Склянка 250 мл (метрична, гранована)", "Cup 250 ml (metric)", "v", 250], ["cup200", "Склянка 200 мл", "Cup 200 ml", "v", 200], ["cupus", "Склянка US (240 мл)", "Cup, US (240 ml)", "v", 240], ["cupcust", "Склянка US звичайна (236,6 мл)", "Cup, US customary (236.6 ml)", "v", CUST], ["cupuk", "Склянка UK імперська (284 мл)", "Cup, UK imperial (284 ml)", "v", 284.130625],
    ["flozus", "Рідка унція US (29,57 мл)", "Fluid ounce, US (29.57 ml)", "v", 29.5735295625], ["flozuk", "Рідка унція UK (28,41 мл)", "Fluid ounce, UK (28.41 ml)", "v", 28.4130625], ["pintus", "Пінта US (473 мл)", "Pint, US (473 ml)", "v", 473.176473], ["pintuk", "Пінта UK (568 мл)", "Pint, UK (568 ml)", "v", 568.26125], ["qtus", "Кварта US (946 мл)", "Quart, US (946 ml)", "v", 946.352946],
    ["g", "Грам (г)", "Gram (g)", "w", 1], ["kg", "Кілограм (кг)", "Kilogram (kg)", "w", 1000], ["oz", "Унція (oz)", "Ounce (oz)", "w", 28.349523125], ["lb", "Фунт (lb)", "Pound (lb)", "w", 453.59237]
  ].map(([id, uk, en, kind, f]) => ({ id, label: L(uk, en), kind, f }));
  const unit = (id) => UNITS.find((u) => u.id === id);
  // категорії
  const CATS = [["flour", "Борошно й крохмаль", "Flour and starch"], ["grain", "Крупи й пластівці", "Grains and cereals"], ["sugar", "Цукор і підсолоджувачі", "Sugar and sweeteners"], ["fat", "Жири й олії", "Fats and oils"], ["dairy", "Молочне", "Dairy"], ["liquid", "Рідини", "Liquids"], ["nut", "Горіхи, насіння, сухофрукти, шоколад", "Nuts, seeds, dried fruit, chocolate"], ["other", "Інше: сіль, розпушувач, дріжджі", "Other: salt, leavening, yeast"]].map(([id, uk, en]) => ({ id, label: L(uk, en) }));
  // продукти: [id, категорія, UK, EN, g — грами на звичайну склянку 236,588 мл (таблиця King Arthur) або d — густина г/мл (фізична)]
  const RAW = [
    ["flour", "flour", "Пшеничне борошно", "Wheat flour (all-purpose)", { g: 120 }], ["bread", "flour", "Борошно хлібне (вищий сорт)", "Bread flour", { g: 120 }], ["cake", "flour", "Борошно для бісквіту (cake flour)", "Cake flour", { g: 120 }], ["pastry", "flour", "Борошно для випічки (pastry)", "Pastry flour", { g: 106 }], ["whole", "flour", "Цільнозернове пшеничне борошно", "Whole wheat flour", { g: 113 }], ["rye", "flour", "Житнє борошно", "Rye flour", { g: 106 }], ["cornmeal", "flour", "Кукурудзяне борошно (мелене)", "Cornmeal", { g: 138 }], ["buckflour", "flour", "Гречане борошно", "Buckwheat flour", { g: 120 }], ["oatflour", "flour", "Вівсяне борошно", "Oat flour", { g: 92 }], ["riceflour", "flour", "Рисове борошно", "Rice flour", { g: 142 }], ["almondflour", "flour", "Мигдальне борошно", "Almond flour", { g: 96 }], ["coconutflour", "flour", "Кокосове борошно", "Coconut flour", { g: 128 }], ["chickpea", "flour", "Нутове борошно", "Chickpea flour", { g: 85 }], ["cornstarch", "flour", "Кукурудзяний крохмаль", "Cornstarch", { g: 112 }], ["potatostarch", "flour", "Картопляний крохмаль", "Potato starch", { g: 152 }], ["breadcrumbs", "flour", "Панірувальні сухарі", "Dried breadcrumbs", { g: 112 }], ["panko", "flour", "Панко (японські сухарі)", "Panko breadcrumbs", { g: 50 }],
    ["rice", "grain", "Рис довгозерний (сирий)", "Long-grain rice (dry)", { g: 198 }], ["millet", "grain", "Пшоно", "Millet", { g: 206 }], ["buckwheat", "grain", "Гречана крупа", "Buckwheat groats", { g: 170 }], ["semolina", "grain", "Манна крупа", "Semolina", { g: 163 }], ["oats", "grain", "Вівсяні пластівці", "Rolled oats", { g: 89 }], ["barley", "grain", "Перлова крупа", "Pearl barley", { g: 213 }], ["bulgur", "grain", "Булгур", "Bulgur", { g: 152 }], ["quinoa", "grain", "Кіноа (сира)", "Quinoa (raw)", { g: 177 }],
    ["sugar", "sugar", "Цукор-пісок", "Granulated sugar", { g: 198 }], ["powdered", "sugar", "Цукрова пудра", "Powdered sugar", { g: 113 }], ["brown", "sugar", "Коричневий цукор (утрамбований)", "Brown sugar (packed)", { g: 213 }], ["demerara", "sugar", "Цукор демерара", "Demerara sugar", { g: 220 }], ["coconutsugar", "sugar", "Кокосовий цукор", "Coconut sugar", { g: 154 }], ["honey", "sugar", "Мед", "Honey", { d: 1.42 }], ["maple", "sugar", "Кленовий сироп", "Maple syrup", { g: 312 }], ["molasses", "sugar", "Патока (меляса)", "Molasses", { g: 340 }], ["condensed", "sugar", "Згущене молоко з цукром", "Sweetened condensed milk", { g: 312 }], ["jam", "sugar", "Джем, варення", "Jam or preserves", { g: 340 }],
    ["butter", "fat", "Вершкове масло", "Butter", { g: 227 }], ["oil", "fat", "Рослинна олія", "Vegetable oil", { d: 0.92 }], ["olive", "fat", "Оливкова олія", "Olive oil", { d: 0.91 }], ["coconutoil", "fat", "Кокосова олія (тверда)", "Coconut oil (solid)", { g: 226 }], ["lard", "fat", "Смалець", "Lard", { g: 226 }], ["mayo", "fat", "Майонез", "Mayonnaise", { g: 226 }], ["shortening", "fat", "Кулінарний жир (shortening)", "Vegetable shortening", { g: 184 }], ["peanutbutter", "fat", "Арахісова паста", "Peanut butter", { g: 270 }], ["tahini", "fat", "Тахіні", "Tahini", { g: 256 }],
    ["sourcream", "dairy", "Сметана", "Sour cream", { g: 227 }], ["yogurt", "dairy", "Йогурт", "Yogurt", { g: 227 }], ["cottage", "dairy", "Сир кисломолочний (cottage)", "Cottage cheese", { g: 226 }], ["ricotta", "dairy", "Рікотта", "Ricotta", { g: 227 }], ["creamcheese", "dairy", "Крем-сир", "Cream cheese", { g: 227 }], ["mascarpone", "dairy", "Маскарпоне", "Mascarpone", { g: 227 }], ["cheddar", "dairy", "Твердий сир (тертий)", "Grated cheddar-type cheese", { g: 113 }], ["parmesan", "dairy", "Пармезан (тертий)", "Grated Parmesan", { g: 100 }], ["feta", "dairy", "Фета (кришена)", "Feta (crumbled)", { g: 114 }], ["drymilk", "dairy", "Сухе молоко", "Dry milk powder", { g: 112 }],
    ["water", "liquid", "Вода", "Water", { d: 1.0 }], ["milk", "liquid", "Молоко", "Milk", { d: 1.03 }], ["kefir", "liquid", "Кефір, пахта", "Kefir, buttermilk", { d: 1.03 }], ["cream", "liquid", "Вершки", "Cream", { d: 1.0 }],
    ["almonds", "nut", "Мигдаль (цілий)", "Almonds (whole)", { g: 142 }], ["walnuts", "nut", "Волоські горіхи (подрібнені)", "Walnuts (chopped)", { g: 113 }], ["hazelnuts", "nut", "Фундук (цілий)", "Hazelnuts (whole)", { g: 142 }], ["cashews", "nut", "Кеш'ю", "Cashews", { g: 113 }], ["peanuts", "nut", "Арахіс (очищений)", "Peanuts (shelled)", { g: 142 }], ["pecans", "nut", "Пекан (цілий)", "Pecans (whole)", { g: 105 }], ["pinenuts", "nut", "Кедрові горіхи", "Pine nuts", { g: 142 }], ["sesame", "nut", "Кунжут", "Sesame seeds", { g: 142 }], ["poppy", "nut", "Мак", "Poppy seeds", { g: 144 }], ["sunflower", "nut", "Насіння соняшнику", "Sunflower seeds", { g: 140 }], ["pumpkinseeds", "nut", "Гарбузове насіння", "Pumpkin seeds", { g: 160 }], ["flax", "nut", "Насіння льону", "Flaxseed", { g: 140 }], ["chia", "nut", "Насіння чіа", "Chia seeds", { g: 148 }], ["coconutflakes", "nut", "Кокосова стружка (солодка)", "Shredded coconut (sweetened)", { g: 85 }], ["chocchips", "nut", "Шоколадні краплі, шоколад (подрібнений)", "Chocolate chips", { g: 170 }], ["cocoa", "nut", "Какао-порошок", "Cocoa powder (unsweetened)", { g: 84 }], ["raisins", "nut", "Родзинки", "Raisins", { g: 149 }], ["dates", "nut", "Фініки (подрібнені)", "Dates (chopped)", { g: 149 }], ["apricots", "nut", "Курага (подрібнена)", "Dried apricots (diced)", { g: 128 }], ["cranberries", "nut", "Журавлина сушена", "Dried cranberries", { g: 114 }],
    ["salt", "other", "Сіль кухонна дрібна", "Table salt", { d: 1.217 }], ["bakingpowder", "other", "Розпушувач", "Baking powder", { d: 0.812 }], ["soda", "other", "Харчова сода", "Baking soda", { d: 1.217 }], ["yeast", "other", "Сухі дріжджі швидкодіючі", "Instant yeast", { d: 0.609 }], ["tomatopaste", "other", "Томатна паста", "Tomato paste", { d: 0.981 }], ["pumpkinpuree", "other", "Гарбузове пюре", "Pumpkin purée", { g: 227 }], ["applesauce", "other", "Яблучне пюре", "Applesauce", { g: 255 }]
  ];
  const catIdx = (c) => CATS.findIndex((x) => x.id === c), COL = new Intl.Collator(IS_EN ? "en" : "uk");
  const ING = RAW.map(([id, cat, uk, en, v]) => ({ id, cat, label: L(uk, en), d: v.d !== undefined ? v.d : v.g / CUST, src: v.d !== undefined ? "phys" : "kaf" })).sort((a, b) => catIdx(a.cat) - catIdx(b.cat) || COL.compare(a.label, b.label));
  const ing = (id) => ING.find((x) => x.id === id);
  // розбір кількості: десяткове (крапка чи кома), дріб «1/2», змішане «1 1/2» або «1-1/2», символи ½ ⅓ ⅔ ¼ ¾ ⅛ ⅜ ⅝ ⅞, «1½»; null, якщо некоректно чи не додатне
  const VULGAR = { "½": 0.5, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 0.25, "¾": 0.75, "⅕": 0.2, "⅖": 0.4, "⅗": 0.6, "⅘": 0.8, "⅙": 1 / 6, "⅚": 5 / 6, "⅛": 0.125, "⅜": 0.375, "⅝": 0.625, "⅞": 0.875 };
  function parseAmount(str) {
    let t = String(str == null ? "" : str).trim().replace(/[  ]/g, " ").replace(/\s+/g, " ");
    if (!t) return null;
    let extra = 0; t = t.replace(/[½⅓⅔¼¾⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞]/g, (c) => { extra += VULGAR[c]; return ""; }).trim();
    const dec = /^(\d+(?:[.,]\d+)?)$/.exec(t), frac = /^(\d+)\s*\/\s*(\d+)$/.exec(t), mixed = /^(\d+)(?:\s+|-)(\d+)\s*\/\s*(\d+)$/.exec(t);
    let v;
    if (t === "") v = extra > 0 ? extra : null;
    else if (dec) v = Number(dec[1].replace(",", ".")) + extra;
    else if (frac) { if (Number(frac[2]) === 0) return null; v = Number(frac[1]) / Number(frac[2]) + extra; }
    else if (mixed) { if (Number(mixed[3]) === 0) return null; v = Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]) + extra; }
    else return null;
    return v !== null && Number.isFinite(v) && v > 0 && v <= 1e9 ? v : null;
  }
  // перетворення: кількість → мл і г (густина d г/мл)
  const toMl = (amt, u, d) => (u.kind === "v" ? amt * u.f : (amt * u.f) / d), toG = (amt, u, d) => (u.kind === "w" ? amt * u.f : amt * u.f * d);
  const convert = (amt, from, to, d) => (from.kind === to.kind ? (amt * from.f) / to.f : from.kind === "v" ? (amt * from.f * d) / to.f : (amt * from.f) / d / to.f);
  // округлення для показу
  const trim = (s) => (s.indexOf(".") >= 0 ? s.replace(/0+$/, "").replace(/\.$/, "") : s);
  function round(x, u) {
    const a = Math.abs(x); if (a === 0) return 0;
    if (u.id === "g") return a >= 20 ? Math.round(x) : a >= 2 ? Math.round(x * 10) / 10 : Math.round(x * 100) / 100;
    if (u.id === "ml") return a >= 20 ? Math.round(x) : a >= 2 ? Math.round(x * 10) / 10 : Math.round(x * 100) / 100;
    return Number(x.toPrecision(a >= 100 ? 4 : 3));
  }
  const fmt = (x, u, dec) => { const r = round(x, u || { id: "x" }), s = trim(String(r)); return dec === "," ? s.replace(".", ",") : s; };
  // найближчий практичний дріб (для склянок і ложок): повертає рядок на кшталт «1 ½» або null
  const FR = [[0, ""], [1 / 8, "⅛"], [1 / 4, "¼"], [1 / 3, "⅓"], [3 / 8, "⅜"], [1 / 2, "½"], [5 / 8, "⅝"], [2 / 3, "⅔"], [3 / 4, "¾"], [7 / 8, "⅞"], [1, ""]];
  function fracText(x) {
    if (!(x > 0)) return null; const w = Math.floor(x), f = x - w; let best = null; FR.forEach(([v, s], i) => { const d = Math.abs(f - v); if (!best || d < best.d) best = { d, v, s, i }; });
    if (best.d > 0.03) return null; let whole = w, s = best.s; if (best.v === 1) { whole = w + 1; s = ""; }
    if (!s) return null; return (whole ? String(whole) : "") + (whole && s ? " " : "") + s;
  }
  root.Km = { L, CUST, UNITS, unit, CATS, ING, ing, parseAmount, toMl, toG, convert, round, fmt, fracText };
})();
