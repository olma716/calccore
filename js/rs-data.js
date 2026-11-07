/* rs-data.js — розбір рядків рецепта й перерахунок кількостей: дроби, діапазони, одиниці й слова-лічильники з формами, підказки; залежить від km-data.js */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis, K = root.Km, L = K.L, IS_EN = L(false, true), DEC = IS_EN ? "." : ",";
  const FR = { "½": 1 / 2, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 1 / 4, "¾": 3 / 4, "⅛": 1 / 8, "⅜": 3 / 8, "⅝": 5 / 8, "⅞": 7 / 8 };
  const FRC = "½⅓⅔¼¾⅛⅜⅝⅞", SP = "[ \\t\\u00a0]";
  const reMixed = new RegExp("(\\d+)(?:" + SP + "+|-)(\\d+)/(\\d+)", "y"), reUni = new RegExp("(\\d+)?" + SP + "?([" + FRC + "])", "y"), reFrac = /(\d+)\/(\d+)/y, reDec = /\d+(?:[.,]\d+)?/y;
  const reRange = new RegExp("(?:" + SP + "*[-–—]" + SP + "*|" + SP + "+(?:до|to)" + SP + "+)", "iuy");
  const isSp = (c) => c === " " || c === "\t" || c === " ";

  // кількість у позиції i: ціле, десяткове, дріб 1/2, мішане 1 1/2 чи 1-1/2, символи ½ й 1½
  function qtyAt(s, i) {
    let m;
    reMixed.lastIndex = i; if ((m = reMixed.exec(s))) { const d = Number(m[3]); if (d) return { v: Number(m[1]) + Number(m[2]) / d, end: reMixed.lastIndex }; }
    reUni.lastIndex = i; if ((m = reUni.exec(s))) return { v: (m[1] ? Number(m[1]) : 0) + FR[m[2]], end: reUni.lastIndex };
    reFrac.lastIndex = i; if ((m = reFrac.exec(s))) { const d = Number(m[2]), n = Number(m[1]); if (d && n > 0) return { v: n / d, end: reFrac.lastIndex }; return null; }
    reDec.lastIndex = i; if ((m = reDec.exec(s))) { const v = parseFloat(m[0].replace(",", ".")); if (v > 0) return { v, end: reDec.lastIndex }; }
    return null;
  }
  // кількість або діапазон 2-3 / 2 до 3 / 2 to 3
  function qtyRange(s, i) {
    const a = qtyAt(s, i); if (!a) return null;
    reRange.lastIndex = a.end; const r = reRange.exec(s);
    if (r) { const b = qtyAt(s, reRange.lastIndex); if (b && b.v > a.v) return { v: a.v, hi: b.v, end: b.end }; }
    return { v: a.v, end: a.end };
  }

  // слова після кількості: одиниці (unit), слова-лічильники зі змінюваною формою (uk/en: [однина, кілька, багато, дробове]) і службові (skip: хвилини, градуси, %)
  const cup4 = ["склянка", "склянки", "склянок", "склянки"];
  const E = [
    { nb: true, src: "[°º%]", skip: true },
    { src: "градус\\p{L}*|хв\\p{L}*|хвилин\\p{L}*|год\\p{L}*|годин\\p{L}*|сек\\p{L}*|min(?:s|utes?)?|hours?|hrs?|seconds?|degrees?|days?|дн\\p{L}*|день", skip: true },
    { src: "столов\\p{L}*" + SP + "+ложк\\p{L}*", unit: "tbsp", uk: ["столова ложка", "столові ложки", "столових ложок", "столової ложки"] },
    { src: "чайн\\p{L}*" + SP + "+ложк\\p{L}*", unit: "tsp", uk: ["чайна ложка", "чайні ложки", "чайних ложок", "чайної ложки"] },
    { src: "десертн\\p{L}*" + SP + "+ложк\\p{L}*", unit: "dsp", uk: ["десертна ложка", "десертні ложки", "десертних ложок", "десертної ложки"] },
    { src: "ст\\.?" + SP + "?л\\.?", unit: "tbsp" }, { src: "ч\\.?" + SP + "?л\\.?", unit: "tsp" }, { src: "дес\\.?" + SP + "?л\\.?", unit: "dsp" },
    { src: "tablespoons?", unit: "tbsp", en: ["tablespoon", "tablespoons"] }, { src: "tbsp|tbs|tbl", unit: "tbsp" }, { src: "teaspoons?", unit: "tsp", en: ["teaspoon", "teaspoons"] }, { src: "tsp", unit: "tsp" },
    { src: "склянк\\p{L}*", unit: "cup", uk: cup4 }, { src: "стакан\\p{L}*", unit: "cup", uk: ["стакан", "стакани", "стаканів", "стакана"] }, { src: "скл\\.?", unit: "cup" }, { src: "cups?", unit: "cup", en: ["cup", "cups"] },
    { src: "мілілітр\\p{L}*|мл", unit: "ml" }, { src: "milliliters?|millilitres?|ml", unit: "ml" },
    { src: "кілограм\\p{L}*|кг", unit: "kg" }, { src: "kilograms?|kilos?|kg", unit: "kg" },
    { src: "грам\\p{L}*|гр|г", unit: "g" }, { src: "grams?|g", unit: "g" },
    { src: "літр\\p{L}*|л", unit: "l" }, { src: "liters?|litres?|l", unit: "l" },
    { src: "унці\\p{L}*", unit: "oz", uk: ["унція", "унції", "унцій", "унції"] }, { src: "ounces?", unit: "oz", en: ["ounce", "ounces"] }, { src: "oz", unit: "oz" },
    { src: "фунт\\p{L}*", unit: "lb", uk: ["фунт", "фунти", "фунтів", "фунта"] }, { src: "pounds?", unit: "lb", en: ["pound", "pounds"] }, { src: "lbs?", unit: "lb" },
    { src: "fl\\.?" + SP + "?oz", unit: "floz" }, { src: "pints?", unit: "pint", en: ["pint", "pints"] }, { src: "pt", unit: "pint" }, { src: "quarts?", unit: "quart", en: ["quart", "quarts"] }, { src: "qt", unit: "quart" },
    { src: "щіпк\\p{L}*", uk: ["щіпка", "щіпки", "щіпок", "щіпки"] }, { src: "пучк\\p{L}*|пучок", uk: ["пучок", "пучки", "пучків", "пучка"] }, { src: "шматк\\p{L}*|шматок", uk: ["шматок", "шматки", "шматків", "шматка"] },
    { src: "пачк\\p{L}*", count: true, uk: ["пачка", "пачки", "пачок", "пачки"] }, { src: "банк\\p{L}*", count: true, uk: ["банка", "банки", "банок", "банки"] }, { src: "головк\\p{L}*", count: true, uk: ["головка", "головки", "головок", "головки"] },
    { src: "яйц\\p{L}*|яєць", count: true, egg: true, uk: ["яйце", "яйця", "яєць", "яйця"] }, { src: "зубчик\\p{L}*", count: true, uk: ["зубчик", "зубчики", "зубчиків", "зубчика"] },
    { src: "штук\\p{L}*", count: true, uk: ["штука", "штуки", "штук", "штуки"] }, { src: "шт\\.?|pcs?\\.?", count: true }, { src: "цибулин\\p{L}*", count: true, uk: ["цибулина", "цибулини", "цибулин", "цибулини"] },
    { src: "морквин\\p{L}*", count: true, uk: ["морквина", "морквини", "морквин", "морквини"] }, { src: "картоплин\\p{L}*", count: true, uk: ["картоплина", "картоплини", "картоплин", "картоплини"] },
    { src: "помідор\\p{L}*", count: true, uk: ["помідор", "помідори", "помідорів", "помідора"] }, { src: "огірок|огірк\\p{L}*", count: true, uk: ["огірок", "огірки", "огірків", "огірка"] },
    { src: "яблук\\p{L}*|яблок\\p{L}*", count: true, uk: ["яблуко", "яблука", "яблук", "яблука"] }, { src: "лимон\\p{L}*", count: true, uk: ["лимон", "лимони", "лимонів", "лимона"] },
    { src: "банан\\p{L}*", count: true, uk: ["банан", "банани", "бананів", "банана"] }, { src: "апельсин\\p{L}*", count: true, uk: ["апельсин", "апельсини", "апельсинів", "апельсина"] },
    { src: "кабачк\\p{L}*|кабачок", count: true, uk: ["кабачок", "кабачки", "кабачків", "кабачка"] }, { src: "баклажан\\p{L}*", count: true, uk: ["баклажан", "баклажани", "баклажанів", "баклажана"] },
    { src: "eggs?", count: true, egg: true, en: ["egg", "eggs"] }, { src: "cloves?", count: true, en: ["clove", "cloves"] }, { src: "cans?", count: true, en: ["can", "cans"] }, { src: "pinch(?:es)?", en: ["pinch", "pinches"] },
    { src: "pieces?", en: ["piece", "pieces"] }, { src: "slices?", en: ["slice", "slices"] }, { src: "sticks?", en: ["stick", "sticks"] }, { src: "bunch(?:es)?", en: ["bunch", "bunches"] },
    { src: "heads?", count: true, en: ["head", "heads"] }, { src: "onions?", count: true, en: ["onion", "onions"] }, { src: "tomato(?:es)?", count: true, en: ["tomato", "tomatoes"] }, { src: "potato(?:es)?", count: true, en: ["potato", "potatoes"] },
    { src: "carrots?", count: true, en: ["carrot", "carrots"] }, { src: "apples?", count: true, en: ["apple", "apples"] }, { src: "lemons?", count: true, en: ["lemon", "lemons"] }, { src: "bananas?", count: true, en: ["banana", "bananas"] },
    { src: "oranges?", count: true, en: ["orange", "oranges"] }, { src: "packages?|packets?|packs?", count: true, en: ["package", "packages"] }, { src: "sprigs?", en: ["sprig", "sprigs"] }, { src: "stalks?", en: ["stalk", "stalks"] }
  ].map((e) => Object.assign({ re: new RegExp("(?:" + e.src + ")" + (e.nb ? "" : "(?![\\p{L}\\p{N}])"), "iuy") }, e));
  function lexAt(s, i) { for (const e of E) { e.re.lastIndex = i; const m = e.re.exec(s); if (m) return { e, text: m[0], end: e.re.lastIndex }; } return null; }

  const SPICE = /сіль|солі|сіллю|спеці|приправ|чилі|кориц|куркум|паприк|мускат|гвоздик|мелен\p{L}*\s+перець|перець\s+мелен|salt|spice|seasoning|chili|chilli|cayenne|cinnamon|cumin|paprika|turmeric|nutmeg|ground\s+(?:black\s+)?pepper|black\s+pepper/iu;
  const LEAVEN = /розпушувач|сода|соди|соду|содою|дріжд|baking\s+powder|baking\s+soda|bicarbonate|yeast/iu;

  // ---------- форматування ----------
  const dispRound = (x) => (x >= 100 ? Math.round(x) : x >= 10 ? Math.round(x * 10) / 10 : x >= 1 ? Math.round(x * 100) / 100 : Number(x.toPrecision(3)));
  const grp = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, IS_EN ? "," : " ");
  const fmtNum = (x) => { const r = dispRound(x), s = String(r); if (/e/.test(s)) return r.toFixed(6).replace(/0+$/, "").replace(/\.$/, "").replace(".", DEC); const [a, b] = s.split("."); return grp(a) + (b ? DEC + b : ""); };
  function pickForm(e, n) {
    if (e.uk) { if (!Number.isInteger(n)) return e.uk[3]; const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? e.uk[0] : a >= 2 && a <= 4 && (b < 12 || b > 14) ? e.uk[1] : e.uk[2]; }
    if (e.en) return n <= 1 ? e.en[0] : e.en[1];
    return null;
  }
  const capLike = (w, ref) => (ref.charAt(0) !== ref.charAt(0).toLowerCase() ? w.charAt(0).toUpperCase() + w.slice(1) : w);

  // ---------- розбір рядка ----------
  const BULLET = /^[ \t ]*(?:[-•*–—▪●○◦·][ \t ]+|(\d+)[.)][ \t ]+)/u;
  function afterQty(s, q) {
    let j = q.end; while (j < s.length && isSp(s[j])) j++;
    const lex = lexAt(s, j);
    if (lex) return { lex, post: s.slice(lex.end), gap: j > q.end };
    return { lex: null, post: s.slice(q.end), gap: false };
  }
  // кількість наприкінці чи після тире: «Борошно — 200 г», «Борошно 200 г», «Яйця 3»
  function trailing(s) {
    for (let p = 1; p < s.length; p++) {
      const c = s[p]; if (!(/\d/.test(c) || FRC.includes(c))) continue;
      const prev = s[p - 1]; if (!(isSp(prev) || prev === ":" || prev === "(" && false)) continue;
      let k = p - 1; while (k >= 0 && isSp(s[k])) k--;
      const sep = k >= 0 && (s[k] === ":" || ((s[k] === "-" || s[k] === "–" || s[k] === "—") && k < p - 1));
      const q = qtyRange(s, p); if (!q) continue;
      const a = afterQty(s, q), restTrim = a.post.trim();
      if (a.lex && a.lex.e.skip) continue;
      if (sep || a.lex || restTrim === "") return { q, a, p };
    }
    return null;
  }
  function parseLine(raw) {
    const line = String(raw).replace(/\r/g, "");
    if (!line.trim()) return null;
    const bm = BULLET.exec(line); let bullet = "", s = line;
    if (bm) { const rest0 = line.slice(bm[0].length); if (!bm[1] || /^[\d½⅓⅔¼¾⅛⅜⅝⅞]/.test(rest0) || trailing(rest0)) { bullet = bm[0]; s = rest0; } }
    const lead = /^[~≈≃]\s?|^(?:близько|приблизно|approx\.?|about)\s+/iu.exec(s); const leadTxt = lead ? lead[0] : "";
    const s2 = s.slice(leadTxt.length);
    let pre = bullet + leadTxt, q = qtyRange(s2, 0), a = null;
    if (q) { a = afterQty(s2, q); if (a.lex && a.lex.e.skip) return { raw: line, kind: "skip" }; }
    else { const t = trailing(s2); if (t) { q = t.q; a = t.a; pre = bullet + leadTxt + s2.slice(0, t.p); } }
    if (!q) return { raw: line, kind: "plain" };
    return { raw: line, kind: "item", pre, v: q.v, hi: q.hi, lex: a.lex, post: a.post, gap: a.gap };
  }
  function parse(text) { return String(text).split("\n").map(parseLine).filter(Boolean); }

  // кількості з одиницями в дужках: «(400 г)»
  const reParen = /\(([^)]*)\)/g, reParenNum = /(\d+(?:[.,]\d+)?)([  ]?)(кг|мл|г|л|kg|ml|g|oz|lbs?|fl\.? ?oz)(?![\p{L}\p{N}])/giu;
  const scaleParens = (t, f) => t.replace(reParen, (m, inner) => "(" + inner.replace(reParenNum, (mm, n, sp, u) => fmtNum(parseFloat(n.replace(",", ".")) * f) + sp + u) + ")");

  // ---------- підказки ----------
  const W = L({ tbsp: "ст. л.", tsp: "ч. л.", g: "г", kg: "кг", ml: "мл", l: "л", oz: "унцій", lb: "фунтів" }, { tbsp: "tbsp", tsp: "tsp", g: "g", kg: "kg", ml: "ml", l: "L", oz: "oz", lb: "lb" });
  function cupWord(n) { return IS_EN ? (n <= 1 ? "cup" : "cups") : pickForm({ uk: cup4 }, n); }
  function ozWord(n) { return IS_EN ? "oz" : pickForm({ uk: ["унція", "унції", "унцій", "унції"] }, n); }
  function lbWord(n) { return IS_EN ? "lb" : pickForm({ uk: ["фунт", "фунти", "фунтів", "фунта"] }, n); }
  const UNIT_ID = { g: "g", kg: "kg", ml: "ml", l: "l", tsp: "tsp", tbsp: "tbsp", dsp: "dsp", oz: "oz", lb: "lb", floz: "flozus", pint: "pintus", quart: "qtus" };
  function hintsFor(it, v, hi, o) {
    const out = [], e = it.lex && it.lex.e, val = dispRound(v), range = hi !== undefined;
    if (e && !range && o.simplify) {
      const id = e.unit, cupMl = K.unit(o.cup).f;
      const eq = (x, u, ap) => (ap ? "≈ " : "= ") + fmtNum(x) + " " + u;
      if (id === "g" && val >= 1000) out.push(eq(val / 1000, W.kg));
      else if (id === "kg" && val < 1) out.push(eq(val * 1000, W.g));
      else if (id === "ml" && val >= 1000) out.push(eq(val / 1000, W.l));
      else if (id === "l" && val < 1) out.push(eq(val * 1000, W.ml));
      else if (id === "oz" && val >= 16) out.push(eq(val / 16, lbWord(dispRound(val / 16))));
      else if (id === "lb" && val < 1) out.push(eq(val * 16, ozWord(dispRound(val * 16))));
      else if (id === "tsp" && val >= 3) out.push(eq(val / 3, W.tbsp));
      else if (id === "tbsp" && val < 1) out.push(eq(val * 3, W.tsp));
      else if (id === "tbsp" && val >= 4) { const c = val * 15 / cupMl, fr = K.fracText(c); out.push("≈ " + (fr || fmtNum(c)) + " " + cupWord(dispRound(c)) + " (" + fmtNum(cupMl) + " " + W.ml + ")"); }
      else if (id === "cup" && val < 0.25) out.push(eq(val * cupMl / 15, W.tbsp, true));
    }
    if (!range && !(e && e.skip) && (["cup", "tsp", "tbsp", "dsp"].includes(e && e.unit) || (e && e.count)) && !Number.isInteger(val)) { const fr = K.fracText(val); if (fr) out.push("≈ " + fr); }
    if (e && e.count && !range && Math.abs(val - Math.round(val)) > 0.01) {
      if (e.egg) out.push(L("яйце не ділиться: збийте й візьміть потрібну частину", "an egg does not divide: beat it and use the part you need"));
      else out.push(L("штучний продукт: округліть до ", "a counted item: round to ") + Math.max(1, Math.round(val)));
    }
    return out;
  }

  // ---------- перерахунок рядка ----------
  function scaleItem(it, f, o) {
    if (it.kind !== "item") return { text: it.raw, hints: [], tag: "", scaled: false };
    const v = it.v * f, hi = it.hi !== undefined ? it.hi * f : undefined, e = it.lex && it.lex.e;
    const lastV = dispRound(hi !== undefined ? hi : v);
    let amt = fmtNum(v) + (hi !== undefined ? "–" + fmtNum(hi) : "");
    let unit = "";
    if (it.lex) { const w = e.uk || e.en ? pickForm(e, lastV) : null; unit = w ? capLike(w, it.lex.text) : it.lex.text; }
    let post = scaleParens(it.post, f), glue = "";
    if (it.lex) glue = " "; else if (post && !/^[\s,.;:)!?\-–—]/.test(post)) glue = " ";
    const text = it.pre + amt + (it.lex ? glue + unit : "") + (it.lex ? post : (post ? glue + post.replace(/^[ \t ]+/, "") : ""));
    const hints = hintsFor(it, it.v * f, hi, o);
    let tag = "";
    if (o.factor >= 2 || o.factor <= 0.5) {
      const up = o.factor >= 2;
      if (LEAVEN.test(it.raw)) tag = up ? L("збільшуйте обережно: зайвий розпушувач чи сода дають гіркуватий присмак", "increase carefully: extra baking powder or soda tastes bitter") : L("відміряйте точно, не округлюйте вгору", "measure exactly, do not round up");
      else if (SPICE.test(it.raw)) tag = up ? L("додавайте поступово й куштуйте", "add gradually and taste") : L("не менше щіпки, куштуйте", "at least a pinch, taste as you go");
    }
    return { text, hints, tag, scaled: true };
  }
  const hasSpice = (items) => items.some((i) => i.kind === "item" && SPICE.test(i.raw)), hasLeaven = (items) => items.some((i) => i.kind === "item" && LEAVEN.test(i.raw));

  root.Rs = { parse, parseLine, scaleItem, qtyAt, qtyRange, fmtNum, dispRound, hasSpice, hasLeaven, UNIT_ID, pickForm, cupWord };
})();
