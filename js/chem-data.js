/* chem-data.js — довідник хімічних елементів, розбір формул і рівнянь, балансування (спільний для хімічних калькуляторів, UK/EN)
   Атомні маси — стислі стандартні значення IUPAC (для важких радіоактивних — масове число найстійкішого ізотопу) і шкільні (округлені, Cl = 35,5).
   Усі обчислення на точних раціональних числах (BigInt): маса речовини — точна сума, коефіцієнти рівнянь — точний розв'язок системи. */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);

  // ===== раціональні числа =====
  const Z = 0n, O = 1n;
  const babs = (x) => (x < Z ? -x : x);
  const gcd = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };
  const q = (n, d = O) => { if (d < Z) { n = -n; d = -d; } const g = gcd(n, d) || O; return { n: n / g, d: d / g }; };
  const qadd = (x, y) => q(x.n * y.d + y.n * x.d, x.d * y.d);
  const qsub = (x, y) => q(x.n * y.d - y.n * x.d, x.d * y.d);
  const qmul = (x, y) => q(x.n * y.n, x.d * y.d);
  const qdiv = (x, y) => q(x.n * y.d, x.d * y.n);
  const qz = (x) => x.n === Z;
  const R = (n) => ({ n: BigInt(n), d: O });
  const dec = (s) => { const [mant, ex = "0"] = String(s).toLowerCase().split("e"), [ip, fp = ""] = mant.split("."), e = Number(ex) - fp.length, n = BigInt(ip + fp); return e >= 0 ? q(n * 10n ** BigInt(e)) : q(n, 10n ** BigInt(-e)); };

  // ===== елементи: Z порядково, символ|англійська назва|українська назва|маса =====
  const RAW = ("H|Hydrogen|Водень|1.008;He|Helium|Гелій|4.0026;Li|Lithium|Літій|6.94;Be|Beryllium|Берилій|9.0122;B|Boron|Бор|10.81;C|Carbon|Вуглець|12.011;N|Nitrogen|Азот|14.007;O|Oxygen|Кисень|15.999;F|Fluorine|Фтор|18.998;Ne|Neon|Неон|20.180;" +
    "Na|Sodium|Натрій|22.990;Mg|Magnesium|Магній|24.305;Al|Aluminium|Алюміній|26.982;Si|Silicon|Силіцій|28.085;P|Phosphorus|Фосфор|30.974;S|Sulfur|Сірка|32.06;Cl|Chlorine|Хлор|35.45;Ar|Argon|Аргон|39.948;K|Potassium|Калій|39.098;Ca|Calcium|Кальцій|40.078;" +
    "Sc|Scandium|Скандій|44.956;Ti|Titanium|Титан|47.867;V|Vanadium|Ванадій|50.942;Cr|Chromium|Хром|51.996;Mn|Manganese|Манган|54.938;Fe|Iron|Ферум (залізо)|55.845;Co|Cobalt|Кобальт|58.933;Ni|Nickel|Нікель|58.693;Cu|Copper|Купрум (мідь)|63.546;Zn|Zinc|Цинк|65.38;" +
    "Ga|Gallium|Галій|69.723;Ge|Germanium|Германій|72.630;As|Arsenic|Арсен|74.922;Se|Selenium|Селен|78.971;Br|Bromine|Бром|79.904;Kr|Krypton|Криптон|83.798;Rb|Rubidium|Рубідій|85.468;Sr|Strontium|Стронцій|87.62;Y|Yttrium|Ітрій|88.906;Zr|Zirconium|Цирконій|91.224;" +
    "Nb|Niobium|Ніобій|92.906;Mo|Molybdenum|Молібден|95.95;Tc|Technetium|Технецій|98;Ru|Ruthenium|Рутеній|101.07;Rh|Rhodium|Родій|102.91;Pd|Palladium|Паладій|106.42;Ag|Silver|Аргентум (срібло)|107.87;Cd|Cadmium|Кадмій|112.41;In|Indium|Індій|114.82;Sn|Tin|Станум (олово)|118.71;" +
    "Sb|Antimony|Стибій (сурма)|121.76;Te|Tellurium|Телур|127.60;I|Iodine|Йод|126.90;Xe|Xenon|Ксенон|131.29;Cs|Caesium|Цезій|132.91;Ba|Barium|Барій|137.33;La|Lanthanum|Лантан|138.91;Ce|Cerium|Церій|140.12;Pr|Praseodymium|Празеодим|140.91;Nd|Neodymium|Неодим|144.24;" +
    "Pm|Promethium|Прометій|145;Sm|Samarium|Самарій|150.36;Eu|Europium|Європій|151.96;Gd|Gadolinium|Гадоліній|157.25;Tb|Terbium|Тербій|158.93;Dy|Dysprosium|Диспрозій|162.50;Ho|Holmium|Гольмій|164.93;Er|Erbium|Ербій|167.26;Tm|Thulium|Тулій|168.93;Yb|Ytterbium|Ітербій|173.05;" +
    "Lu|Lutetium|Лютецій|174.97;Hf|Hafnium|Гафній|178.49;Ta|Tantalum|Тантал|180.95;W|Tungsten|Вольфрам|183.84;Re|Rhenium|Реній|186.21;Os|Osmium|Осмій|190.23;Ir|Iridium|Іридій|192.22;Pt|Platinum|Платина|195.08;Au|Gold|Аурум (золото)|196.97;Hg|Mercury|Гідраргірум (ртуть)|200.59;" +
    "Tl|Thallium|Талій|204.38;Pb|Lead|Плюмбум (свинець)|207.2;Bi|Bismuth|Бісмут|208.98;Po|Polonium|Полоній|209;At|Astatine|Астат|210;Rn|Radon|Радон|222;Fr|Francium|Францій|223;Ra|Radium|Радій|226;Ac|Actinium|Актиній|227;Th|Thorium|Торій|232.04;" +
    "Pa|Protactinium|Протактиній|231.04;U|Uranium|Уран|238.03;Np|Neptunium|Нептуній|237;Pu|Plutonium|Плутоній|244;Am|Americium|Америцій|243;Cm|Curium|Кюрій|247;Bk|Berkelium|Берклій|247;Cf|Californium|Каліфорній|251;Es|Einsteinium|Ейнштейній|252;Fm|Fermium|Фермій|257;" +
    "Md|Mendelevium|Менделевій|258;No|Nobelium|Нобелій|259;Lr|Lawrencium|Лоуренсій|266;Rf|Rutherfordium|Резерфордій|267;Db|Dubnium|Дубній|268;Sg|Seaborgium|Сіборгій|269;Bh|Bohrium|Борій|270;Hs|Hassium|Гасій|277;Mt|Meitnerium|Мейтнерій|278;Ds|Darmstadtium|Дармштадтій|281;" +
    "Rg|Roentgenium|Рентгеній|282;Cn|Copernicium|Коперницій|285;Nh|Nihonium|Ніхоній|286;Fl|Flerovium|Флеровій|289;Mc|Moscovium|Московій|290;Lv|Livermorium|Ліверморій|293;Ts|Tennessine|Теннессин|294;Og|Oganesson|Оганесон|294").split(";");
  const EL = {};
  const LIST = RAW.map((s, i) => { const [sym, en, uk, ar] = s.split("|"); const e = { z: i + 1, sym, en, uk, ar, iupac: dec(ar), school: dec(sym === "Cl" ? "35.5" : String(Math.round(Number(ar)))) }; EL[sym] = e; return e; });

  // ===== налаштування: набір атомних мас і сталі =====
  const setNow = () => { const e = typeof document !== "undefined" ? document.getElementById("gval") : null; return e && e.value === "school" ? "school" : "iupac"; };
  const massOf = (sym, set) => EL[sym][set || setNow()];
  const NA = (set) => ((set || setNow()) === "school" ? dec("6.02e23") : dec("6.02214076e23"));
  const VM = (set) => ((set || setNow()) === "school" ? dec("22.4") : dec("22.414"));

  // ===== нормалізація тексту формули =====
  const CYR = { "А": "A", "В": "B", "С": "C", "Е": "E", "Н": "H", "К": "K", "М": "M", "О": "O", "Р": "P", "Т": "T", "Х": "X", "а": "a", "с": "c", "е": "e", "о": "o", "р": "p", "х": "x" };
  const SUB = "₀₁₂₃₄₅₆₇₈₉", SUPD = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  function norm(s) {
    s = String(s == null ? "" : s).replace(/[А-Яа-я]/g, (c) => CYR[c] || c).replace(/[₀-₉]/g, (c) => String(SUB.indexOf(c)));
    s = s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g, (m) => "^" + m.split("").map((c) => (c === "⁺" ? "+" : c === "⁻" ? "-" : String(SUPD.indexOf(c)))).join(""));
    return s.replace(/[−–—]/g, "-").replace(/\s+/g, "");
  }
  const SUBS = (n) => String(n).split("").map((d) => SUB[d]).join("");
  const SUPS = (s) => s.split("").map((c) => (c === "+" ? "⁺" : c === "-" ? "⁻" : SUPD[c])).join("");
  // гарний запис формули: індекси внизу, заряд угорі, крапка гідрату
  function pretty(raw) {
    const s = norm(raw), m = s.match(/^(.*?)\^([\d+-]+)$/), body = m ? m[1] : s, ch = m ? m[2] : "";
    let out = "", afterLetter = false;
    for (const c of body) {
      if (/\d/.test(c)) out += afterLetter ? SUB[c] : c;
      else { out += c === "*" ? "·" : c; afterLetter = /[A-Za-z)\]}]/.test(c); }
    }
    return out + (ch ? SUPS(ch) : "");
  }

  // ===== розбір формули =====
  const ERR = (code, val) => ({ ok: false, code, val });
  function parseFormula(input) {
    let s = norm(input);
    if (!s) return ERR("empty");
    if (s.length > 80) return ERR("long");
    if (s === "e" || s === "e-" || s === "e^-") return { ok: true, atoms: {}, order: [], charge: -1, raw: "e^-", electron: true };
    let charge = 0, m = s.match(/\^(\d*)([+-])$/);
    if (m) { charge = (m[1] ? Number(m[1]) : 1) * (m[2] === "+" ? 1 : -1); s = s.slice(0, m.index); } else if ((m = s.match(/\^([+-])(\d+)$/))) { charge = Number(m[2]) * (m[1] === "+" ? 1 : -1); s = s.slice(0, m.index); }
    else if (/\^/.test(s)) return ERR("charge");
    if (!s) return ERR("empty");
    const rawBody = s;
    let pos = 0, total = 0;
    const order = [];
    const num = () => { let t = ""; while (pos < s.length && /\d/.test(s[pos])) t += s[pos++]; if (t.length > 4) throw ERR("big"); return t ? Number(t) : null; };
    const CL = { "(": ")", "[": "]", "{": "}" };
    function seq(close, depth) {
      const map = {};
      while (pos < s.length) {
        const c = s[pos];
        if (close && c === close) return map;
        if (CL[c]) {
          if (depth > 8) throw ERR("deep");
          pos++; const inner = seq(CL[c], depth + 1);
          if (s[pos] !== CL[c]) throw ERR("paren");
          pos++; const k = num() || 1;
          Object.keys(inner).forEach((e) => { map[e] = (map[e] || 0) + inner[e] * k; total += inner[e] * (k - 1); });
          if (total > 200000) throw ERR("big");
          continue;
        }
        if (c === ")" || c === "]" || c === "}") throw ERR("paren");
        if (/[A-Z]/.test(c)) {
          let sym = c;
          if (/[a-z]/.test(s[pos + 1] || "") && EL[c + s[pos + 1]]) sym = c + s[pos + 1];
          if (!EL[sym]) throw ERR("el", sym + (/[a-z]/.test(s[pos + 1] || "") && sym.length === 1 ? s[pos + 1] : ""));
          pos += sym.length; const k = num() || 1;
          if (!(sym in map)) { if (!order.includes(sym)) order.push(sym); }
          map[sym] = (map[sym] || 0) + k; total += k; if (total > 200000) throw ERR("big");
          continue;
        }
        if (/[a-z]/.test(c)) throw ERR("el", c);
        if (/\d/.test(c)) throw ERR("num", c);
        if (/[·*•∙.]/.test(c) && !close) return map;
        throw ERR("char", c);
      }
      if (close) throw ERR("paren");
      return map;
    }
    try {
      const atoms = {};
      let first = true;
      while (pos < s.length) {
        if (!first) { if (!/[·*•∙.]/.test(s[pos])) throw ERR("char", s[pos]); pos++; }
        first = false;
        const k = num() || 1, part = seq(null, 0);
        if (!Object.keys(part).length) throw ERR("empty");
        Object.keys(part).forEach((e) => { atoms[e] = (atoms[e] || 0) + part[e] * k; });
      }
      return { ok: true, atoms, order, charge, raw: rawBody.replace(/[·•∙]/g, "*") + (charge ? "^" + (Math.abs(charge) === 1 ? "" : Math.abs(charge)) + (charge > 0 ? "+" : "-") : "") };
    } catch (e) { if (e && e.ok === false) return e; throw e; }
  }
  function errText(e) {
    const v = e.val ? "«" + e.val + "»" : "";
    switch (e.code) {
      case "empty": return L("Введіть формулу речовини.", "Enter a chemical formula.");
      case "long": return L("Формула задовга.", "The formula is too long.");
      case "el": return L("Невідомий елемент " + v + ". Символ елемента починається з великої літери (NaCl, а не nacl).", "Unknown element " + v + ". An element symbol starts with a capital letter (NaCl, not nacl).");
      case "paren": return L("Дужки у формулі не збігаються.", "The brackets in the formula do not match.");
      case "deep": return L("Забагато вкладених дужок.", "Too many nested brackets.");
      case "big": return L("Забагато атомів або завеликий індекс (до 4 цифр).", "Too many atoms or too large an index (up to 4 digits).");
      case "num": return L("Цифра " + v + " стоїть там, де не може бути індексу.", "The digit " + v + " is where no index can be.");
      case "charge": return L("Заряд пишіть так: Fe^3+, SO4^2-, H^+.", "Write a charge like this: Fe^3+, SO4^2-, H^+.");
      default: return L("Не зрозуміло символ " + v + " у формулі.", "Cannot understand the symbol " + v + " in the formula.");
    }
  }

  // ===== молярна маса =====
  function molar(input, set) {
    const p = parseFormula(input);
    if (!p.ok) return p;
    const rows = [];
    let M = R(0);
    Object.keys(p.atoms).sort((a, b) => p.order.indexOf(a) - p.order.indexOf(b)).forEach((sym) => {
      const ar = massOf(sym, set), cnt = p.atoms[sym], sub = qmul(ar, R(cnt));
      rows.push({ sym, count: cnt, ar, sub }); M = qadd(M, sub);
    });
    return { ok: true, p, rows, M, pretty: pretty(p.raw) };
  }

  // ===== розбір рівняння =====
  const STATE = /\((g|l|s|aq)\)$/;
  function splitSide(str) {
    const parts = []; let buf = "";
    for (let i = 0; i < str.length; i++) {
      const c = str[i];
      if (c === "+") {
        if (/\^\d*$/.test(buf)) { buf += c; continue; }
        parts.push(buf); buf = "";
      } else buf += c;
    }
    parts.push(buf);
    return parts;
  }
  function parseSpecies(token) {
    let s = norm(token).replace(/[↑↓]/g, "");
    let coef = null, m = s.match(/^(\d+)(?=[A-Z(\[{e])/);
    if (m && !(s === "e")) { coef = Number(m[1]); s = s.slice(m[1].length); if (coef <= 0 || coef > 9999) return ERR("coef", m[1]); }
    let state = ""; const st = s.match(STATE); if (st) { state = st[1]; s = s.slice(0, st.index); }
    const p = parseFormula(s);
    if (!p.ok) return p;
    return { ok: true, raw: p.raw, coef, state, p };
  }
  function parseEquation(input) {
    let s = String(input == null ? "" : input).trim();
    if (!s) return { ok: false, code: "empty" };
    if (s.length > 300) return { ok: false, code: "long" };
    s = s.replace(/[−–—]/g, "-");
    const arr = /\s*(<=>|<->|⇄|⇌|-->|->|=>|⇒|⟶|⟹|→|==|=)\s*/g, found = [...s.matchAll(arr)];
    if (found.length !== 1) return { ok: false, code: found.length ? "arrows" : "noarrow" };
    const at = found[0].index, L0 = s.slice(0, at), R0 = s.slice(at + found[0][0].length);
    const sides = [L0, R0].map((side) => splitSide(norm2(side)).map((t) => t.trim()));
    const out = [[], []];
    for (let k = 0; k < 2; k++) {
      for (const t of sides[k]) {
        if (!t) return { ok: false, code: "emptyspecies" };
        const sp = parseSpecies(t);
        if (!sp.ok) return { ok: false, code: "species", err: sp, token: t };
        out[k].push(sp);
      }
    }
    if (out[0].length + out[1].length > 12) return { ok: false, code: "many" };
    return { ok: true, left: out[0], right: out[1] };
  }
  // нормалізація без видалення пробілів (щоб відрізнити роздільник «+» від заряду)
  function norm2(s) {
    s = String(s).replace(/[А-Яа-я]/g, (c) => CYR[c] || c).replace(/[₀-₉]/g, (c) => String(SUB.indexOf(c)));
    return s.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹⁺⁻]+/g, (m) => "^" + m.split("").map((c) => (c === "⁺" ? "+" : c === "⁻" ? "-" : String(SUPD.indexOf(c)))).join(""));
  }
  function eqErrText(e) {
    switch (e.code) {
      case "empty": return L("Введіть рівняння реакції, наприклад H2 + O2 -> H2O.", "Enter a reaction equation, for example H2 + O2 -> H2O.");
      case "long": return L("Рівняння задовге.", "The equation is too long.");
      case "noarrow": return L("Поставте між частинами стрілку: ->, → або =.", "Put an arrow between the two sides: ->, → or =.");
      case "arrows": return L("У рівнянні має бути одна стрілка.", "There must be exactly one arrow in the equation.");
      case "emptyspecies": return L("Між знаками «+» пропущена речовина.", "A substance is missing between the “+” signs.");
      case "many": return L("Забагато речовин (до 12).", "Too many substances (up to 12).");
      case "coef": return L("Недопустимий коефіцієнт.", "Invalid coefficient.");
      case "species": return errText(e.err) + " (" + e.token.trim() + ")";
      default: return L("Не вдалося розібрати рівняння.", "Could not parse the equation.");
    }
  }

  // ===== балансування: нуль-простір матриці елементів у точних дробах =====
  function balance(left, right) {
    const sp = left.concat(right), n = sp.length, nl = left.length;
    const elems = [];
    sp.forEach((s) => (s.p.order || []).forEach((e) => { if (!elems.includes(e)) elems.push(e); }));
    const hasCharge = sp.some((s) => s.p.charge);
    const rowsLbl = elems.slice().concat(hasCharge ? ["charge"] : []);
    const cnt = (s, e) => (e === "charge" ? s.p.charge : s.p.atoms[e] || 0);
    const raw = rowsLbl.map((e) => sp.map((s, j) => (j < nl ? 1 : -1) * cnt(s, e)));
    const info = { elems: rowsLbl, sp, nl, matrix: rowsLbl.map((e) => sp.map((s) => cnt(s, e))) };
    for (const e of elems) {
      const lt = left.reduce((a, s) => a + (s.p.atoms[e] || 0), 0), rt = right.reduce((a, s) => a + (s.p.atoms[e] || 0), 0);
      if (!lt || !rt) return { ok: false, why: "oneside", el: e, info };
    }
    // RREF
    const M = raw.map((r) => r.map((v) => R(v)));
    const piv = []; let rr = 0;
    for (let c = 0; c < n && rr < M.length; c++) {
      let p = -1; for (let r = rr; r < M.length; r++) if (!qz(M[r][c])) { p = r; break; }
      if (p < 0) continue;
      [M[rr], M[p]] = [M[p], M[rr]];
      const inv = M[rr][c]; M[rr] = M[rr].map((v) => qdiv(v, inv));
      for (let r = 0; r < M.length; r++) if (r !== rr && !qz(M[r][c])) { const f = M[r][c]; M[r] = M[r].map((v, k) => qsub(v, qmul(f, M[rr][k]))); }
      piv.push(c); rr++;
    }
    const free = []; for (let c = 0; c < n; c++) if (!piv.includes(c)) free.push(c);
    info.rank = piv.length; info.rref = M; info.piv = piv; info.free = free;
    if (!free.length) return { ok: false, why: "none", info };
    if (free.length > 1) return { ok: false, why: "many", info };
    const f = free[0], v = Array.from({ length: n }, () => R(0));
    v[f] = R(1); piv.forEach((c, r) => { v[c] = { n: -M[r][f].n, d: M[r][f].d }; });
    let lcm = O; v.forEach((x) => { lcm = (lcm / gcd(lcm, x.d)) * x.d; });
    let ints = v.map((x) => (x.n * lcm) / x.d), g = ints.reduce((a, b) => gcd(a, b), Z);
    ints = ints.map((x) => x / g);
    if (ints[0] < Z) ints = ints.map((x) => -x);
    if (ints.some((x) => x <= Z)) return { ok: false, why: "neg", info, ints };
    return { ok: true, coefs: ints.map((x) => Number(x)), info };
  }
  function balErrText(r) {
    switch (r.why) {
      case "oneside": return L("Елемент " + r.el + " є лише з одного боку рівняння — збалансувати неможливо. Перевірте формули.", "The element " + r.el + " appears on one side only, so the equation cannot be balanced. Check the formulas.");
      case "none": return L("Таке рівняння не можна збалансувати з цими формулами. Перевірте, чи правильно записані речовини.", "This equation cannot be balanced with these formulas. Check that the substances are written correctly.");
      case "many": return L("Рівняння має кілька незалежних розв'язків (речовин забагато або реакції дві в одній). Приберіть зайві речовини або розбийте на окремі реакції.", "The equation has several independent solutions (too many substances, or two reactions in one). Remove extra substances or split it into separate reactions.");
      default: return L("Коефіцієнти виходять недодатними — така реакція неможлива з цими речовинами. Перевірте, з якого боку стоїть кожна речовина.", "The coefficients come out non-positive, so this reaction is impossible with these substances. Check which side each substance is on.");
    }
  }
  const spStr = (s) => pretty(s.raw) + (s.state ? "(" + s.state + ")" : "");
  function eqStr(left, right, coefs) {
    const side = (arr, off) => arr.map((s, i) => { const c = coefs ? coefs[off + i] : s.coef; return (c && c !== 1 ? c : "") + spStr(s); }).join(" + ");
    return side(left, 0) + " → " + side(right, left.length);
  }

  root.Chem = { L, EL, LIST, massOf, setNow, NA, VM, norm, pretty, parseFormula, errText, molar, parseEquation, eqErrText, balance, balErrText, spStr, eqStr, SUBS, q, qadd, qsub, qmul, qdiv, qz, R, dec, gcd };
})();
