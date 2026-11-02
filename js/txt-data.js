/* txt-data.js — текстові функції для лінгвістичних калькуляторів (UK/EN): числа прописом, транслітерація за КМУ 2010, SMS-сегменти, слова
   Числа — BigInt без втрати точності; транслітерація — за Постановою КМУ № 55 від 27.01.2010. */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);

  // ===== числа прописом =====
  const UA_ONES = { m: ["", "один", "два", "три", "чотири", "п'ять", "шість", "сім", "вісім", "дев'ять"], f: ["", "одна", "дві", "три", "чотири", "п'ять", "шість", "сім", "вісім", "дев'ять"], n: ["", "одне", "два", "три", "чотири", "п'ять", "шість", "сім", "вісім", "дев'ять"] };
  const UA_TEENS = ["десять", "одинадцять", "дванадцять", "тринадцять", "чотирнадцять", "п'ятнадцять", "шістнадцять", "сімнадцять", "вісімнадцять", "дев'ятнадцять"];
  const UA_TENS = ["", "", "двадцять", "тридцять", "сорок", "п'ятдесят", "шістдесят", "сімдесят", "вісімдесят", "дев'яносто"];
  const UA_HUNDS = ["", "сто", "двісті", "триста", "чотириста", "п'ятсот", "шістсот", "сімсот", "вісімсот", "дев'ятсот"];
  const UA_SCALES = [null, { f: ["тисяча", "тисячі", "тисяч"], g: "f" }, { f: ["мільйон", "мільйони", "мільйонів"], g: "m" }, { f: ["мільярд", "мільярди", "мільярдів"], g: "m" }, { f: ["трильйон", "трильйони", "трильйонів"], g: "m" }, { f: ["квадрильйон", "квадрильйони", "квадрильйонів"], g: "m" }];
  const EN_ONES = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
  const EN_TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  const EN_SCALES = ["", "thousand", "million", "billion", "trillion", "quadrillion"];
  const plural = (n, f) => { const a = n % 100, b = n % 10; return a >= 11 && a <= 19 ? f[2] : b === 1 ? f[0] : b >= 2 && b <= 4 ? f[1] : f[2]; };
  function uaTriple(n, g) {
    const h = Math.floor(n / 100), t = Math.floor((n % 100) / 10), u = n % 10, out = [];
    if (h) out.push(UA_HUNDS[h]);
    if (t === 1) out.push(UA_TEENS[u]); else { if (t) out.push(UA_TENS[t]); if (u) out.push(UA_ONES[g][u]); }
    return out.join(" ");
  }
  function enTriple(n) {
    const h = Math.floor(n / 100), r = n % 100, out = [];
    if (h) out.push(EN_ONES[h] + " hundred");
    if (r) out.push(r < 20 ? EN_ONES[r] : EN_TENS[Math.floor(r / 10)] + (r % 10 ? "-" + EN_ONES[r % 10] : ""));
    return out.join(" ");
  }
  const groups = (big) => { const g = []; let s = big.toString(); while (s.length) { g.unshift(Number(s.slice(-3))); s = s.slice(0, -3); } return g; };
  // ціле невід'ємне → слова. gender: рід іменника після числа (m/f/n) — для кінцевої групи
  function intWords(big, lang, gender) {
    big = BigInt(big);
    if (big === 0n) return lang === "en" ? "zero" : "нуль";
    const g = groups(big), n = g.length, out = [];
    if (n > 6) throw new Error("big");
    g.forEach((v, i) => {
      const sc = n - 1 - i; if (!v) return;
      if (lang === "en") out.push(enTriple(v) + (sc ? " " + EN_SCALES[sc] : ""));
      else if (sc === 0) out.push(uaTriple(v, gender || "m"));
      else out.push(uaTriple(v, UA_SCALES[sc].g) + " " + plural(v, UA_SCALES[sc].f));
    });
    return out.join(" ");
  }
  // форма іменника за числом (за останньою групою з трьох цифр)
  const nounForm = (big, forms, lang) => { big = BigInt(big); const last = Number(big % 1000n); if (lang === "en") return big === 1n ? forms[0] : forms[1]; return last === 0 ? forms[2] : plural(last, forms); };
  const CUR = {
    uah: { uk: { main: ["гривня", "гривні", "гривень"], mg: "f", sub: ["копійка", "копійки", "копійок"], sg: "f" }, en: { main: ["hryvnia", "hryvnias"], sub: ["kopiyka", "kopiykas"] }, sym: "₴" },
    usd: { uk: { main: ["долар", "долари", "доларів"], mg: "m", sub: ["цент", "центи", "центів"], sg: "m" }, en: { main: ["dollar", "dollars"], sub: ["cent", "cents"] }, sym: "$" },
    eur: { uk: { main: ["євро", "євро", "євро"], mg: "n", sub: ["євроцент", "євроценти", "євроцентів"], sg: "m" }, en: { main: ["euro", "euros"], sub: ["cent", "cents"] }, sym: "€" }
  };
  const UA_FRAC = [null, ["десята", "десятих"], ["сота", "сотих"], ["тисячна", "тисячних"], ["десятитисячна", "десятитисячних"], ["стотисячна", "стотисячних"], ["мільйонна", "мільйонних"]];
  // розбір десяткового рядка: { neg, int: BigInt, frac: "цифри" }
  function parseDec(str, maxFrac) {
    let s = String(str).trim().replace(/\s/g, "").replace(",", ".").replace("−", "-");
    const neg = s[0] === "-"; if (neg || s[0] === "+") s = s.slice(1);
    if (!/^\d+(\.\d*)?$|^\.\d+$/.test(s)) return null;
    let [i, f = ""] = s.split("."); i = i || "0";
    if (i.length > 18) return { err: "big" };
    if (f.length > maxFrac) return { err: "frac", frac: f };
    return { neg, int: BigInt(i), frac: f };
  }
  function capFirst(s) { return s ? s[0].toUpperCase() + s.slice(1) : s; }
  // сума прописом з валютою: opts { cur: "uah"|"usd"|"eur"|"", lang, subWords: bool, cap: bool }
  function amountWords(str, opts) {
    const lang = opts.lang, cur = opts.cur;
    if (cur) {
      let p = parseDec(str, 8); if (!p) return { err: "fmt" }; if (p.err === "big") return { err: "big" };
      if (p.err) return { err: "frac" };
      let int = p.int, sub = Number((p.frac + "00").slice(0, 2));
      if (p.frac.length > 2 && Number(p.frac[2]) >= 5) { sub++; if (sub === 100) { sub = 0; int += 1n; } }
      const c = CUR[cur][lang === "en" ? "en" : "uk"], gm = lang === "en" ? null : c.mg;
      let words = intWords(int, lang, gm) + " " + nounForm(int, c.main, lang);
      const subTxt = opts.subWords ? intWords(BigInt(sub), lang, lang === "en" ? null : c.sg) : String(sub).padStart(2, "0");
      words += (lang === "en" ? " and " : " ") + subTxt + " " + nounForm(BigInt(sub), c.sub, lang);
      if (p.neg && (int > 0n || sub > 0)) words = (lang === "en" ? "minus " : "мінус ") + words;
      return { words: opts.cap ? capFirst(words) : words, int, sub, neg: p.neg };
    }
    const p = parseDec(str, 6); if (!p) return { err: "fmt" }; if (p.err === "big") return { err: "big" };
    if (p.err) return { err: "frac" };
    const fr = p.frac.replace(/0+$/, "");
    let words;
    if (lang === "en") words = intWords(p.int, "en") + (fr ? " point " + fr.split("").map((d) => (d === "0" ? "zero" : EN_ONES[Number(d)])).join(" ") : "");
    else if (!fr) words = intWords(p.int, "uk", "m");
    else {
      const ip = intWords(p.int, "uk", "f"), last2 = Number(p.int % 100n), lastD = Number(p.int % 10n), whole = last2 >= 11 && last2 <= 19 ? "цілих" : lastD === 1 ? "ціла" : "цілих";
      const num = BigInt(fr), k = fr.length, nw = intWords(num, "uk", "f"), nl2 = Number(num % 100n), nld = Number(num % 10n), fw = UA_FRAC[k][nl2 >= 11 && nl2 <= 19 ? 1 : nld === 1 ? 0 : 1];
      words = ip + " " + whole + " " + nw + " " + fw;
    }
    if (p.neg && (p.int > 0n || fr)) words = (lang === "en" ? "minus " : "мінус ") + words;
    return { words: opts.cap ? capFirst(words) : words, int: p.int, neg: p.neg };
  }

  // ===== транслітерація за КМУ 2010 =====
  const TR_ANY = { а: "a", б: "b", в: "v", г: "h", ґ: "g", д: "d", е: "e", ж: "zh", з: "z", и: "y", і: "i", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts", ч: "ch", ш: "sh", щ: "shch" };
  const TR_START = { є: "ye", ї: "yi", й: "y", ю: "yu", я: "ya" }, TR_MID = { є: "ie", ї: "i", й: "i", ю: "iu", я: "ia" };
  const APOS = /['’ʼ‘`´ʹ]/;
  const isLetter = (c) => /[A-Za-zА-Яа-яІіЇїЄєҐґ]/.test(c);
  // hyphenStart — чи вважати початком слова літеру після дефіса
  function translit(text, hyphenStart) {
    const chars = Array.from(String(text)), out = [], rows = [];
    const inWord = (i) => { const p = chars[i - 1]; if (!p) return false; if (isLetter(p)) return true; if (APOS.test(p) && i > 1 && isLetter(chars[i - 2])) return true; return p === "-" && !hyphenStart && i > 1 && isLetter(chars[i - 2]); };
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i], lc = c.toLowerCase(), upper = c !== lc, nx = chars[i + 1] || "", pv = chars[i - 1] || "";
      if (lc === "з" && nx.toLowerCase() === "г") { const g = nx, gu = g !== g.toLowerCase(); out.push(upper && gu ? "ZGH" : upper ? "Zgh" : "zgh"); rows.push([c + g, "zgh"]); i++; continue; }
      let piece = null;
      if (TR_ANY[lc]) piece = TR_ANY[lc]; else if (TR_START[lc]) piece = inWord(i) ? TR_MID[lc] : TR_START[lc]; else if (lc === "ь" || APOS.test(c)) piece = "";
      if (piece === null) { out.push(c); continue; }
      const wordUpper = upper && ((nx && isLetter(nx) && nx === nx.toUpperCase()) || (pv && isLetter(pv) && pv === pv.toUpperCase()));
      out.push(upper ? (wordUpper ? piece.toUpperCase() : piece ? piece[0].toUpperCase() + piece.slice(1) : "") : piece);
      rows.push([c, piece]);
    }
    return { text: out.join(""), rows };
  }

  // ===== SMS: GSM 03.38 і UCS-2 =====
  const GSM_BASIC = "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ\u001bÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";
  const GSM_EXT = "^{}\\[~]|€\f";
  function smsInfo(text) {
    let gsm = true, septets = 0;
    for (const ch of text) { if (GSM_BASIC.includes(ch)) septets += 1; else if (GSM_EXT.includes(ch)) septets += 2; else { gsm = false; break; } }
    if (gsm) { const per = septets <= 160 ? 160 : 153, parts = septets === 0 ? 0 : septets <= 160 ? 1 : Math.ceil(septets / 153); return { enc: "GSM-7", units: septets, parts, per, single: 160, multi: 153 }; }
    let u = 0; for (const ch of text) u += ch.codePointAt(0) > 0xffff ? 2 : 1;
    const parts = u === 0 ? 0 : u <= 70 ? 1 : Math.ceil(u / 67);
    return { enc: "UCS-2", units: u, parts, per: u <= 70 ? 70 : 67, single: 70, multi: 67 };
  }

  root.Txt = { L, intWords, amountWords, parseDec, nounForm, plural, translit, smsInfo, CUR, capFirst };
})();
