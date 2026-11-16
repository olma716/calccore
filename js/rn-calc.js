/* rn-calc.js — генератор випадкових чисел: числа (діапазон, без повторів, десяткові), кубики, монета, вибір і перемішування списку; залежить від km-data.js і rn-data.js. Результати випадкові, тому посилання на результат не створюється */
PhysCalc.start(({ L }) => {
  const R = window.Rn, UI = window.PhysUI, IS_EN = L(false, true);
  const DEF = {
    num: { from: "1", to: "100", count: "1", dec: "0", sort: "none", sep: "comma", unique: false },
    dice: { count: "2", sides: "6", custom: "30", mod: "0", rolls: "1" },
    coin: { n: "1" },
    list: { text: "", mode: "pick", count: "1" }
  };
  const F = {
    num: [["rnFrom", "from"], ["rnTo", "to"], ["rnCnt", "count"], ["rnDec", "dec"], ["rnSort", "sort"], ["rnSep", "sep"]],
    dice: [["rdCnt", "count"], ["rdSides", "sides"], ["rdCustom", "custom"], ["rdMod", "mod"], ["rdRolls", "rolls"]],
    coin: [["rcN", "n"]],
    list: [["rlText", "text"], ["rlMode", "mode"], ["rlCnt", "count"]]
  };
  const S = {}; Object.keys(DEF).forEach((k) => { S[k] = Object.assign({}, DEF[k]); });
  let curBody = null;

  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const sel = (id, opts) => '<select class="ph__unit ph__unit--wide" id="' + id + '" aria-label="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '">' + t + "</option>").join("") + "</select>";
  const inp = (id, ph, max, mode) => '<input class="ph__input" id="' + id + '" type="text" inputmode="' + (mode || "numeric") + '" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="' + (max || 6) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const togGrp = (title, items, st) => '<div class="ph__togGrp"><div class="ph__togTitle">' + title + '</div><div class="ph__togs">' + items.map(([k, t]) => '<button type="button" class="ph__tog" data-k="' + k + '" aria-pressed="' + (st[k] ? "true" : "false") + '"><i class="ph__togBox" aria-hidden="true"></i><span>' + t + "</span></button>").join("") + "</div></div>";
  const box = (esc, t, strong) => '<div class="ph__hintbox ph__mt12">' + (strong ? "<b>" + esc(strong) + "</b> " : "") + esc(t) + "</div>";
  const intIn = (s, min, max) => { const t = String(s).trim(); if (!/^[+-]?\d+$/.test(t)) return null; const v = Number(t); return v < min || v > max ? null : v; };
  const plural = (n, a, b, c) => (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? b : c);
  const NOTE = L("Числа обирає криптографічний генератор браузера (crypto.getRandomValues); значення, що порушували б рівномірність, відкидаються, тому зсуву за модулем немає. Результат не зберігається й не надсилається, а нове натискання дає незалежний результат. Для офіційних розіграшів і лотерей потрібен публічний незалежний процес із перевіркою: цей інструмент для ігор, вибірок і неформальних жеребкувань.", "Numbers are picked by the browser's cryptographic generator (crypto.getRandomValues); values that would break uniformity are rejected, so there is no modulo bias. The result is not stored or sent, and each new press gives an independent result. Official draws and lotteries need a public independent process with verification: this tool is for games, samples and informal draws.");
  const PRIV = L("Усе відбувається у вашому браузері: нічого не надсилається й не зберігається, а посилання на результат не створюється, бо результат випадковий.", "Everything happens in your browser: nothing is sent or stored, and no link to the result is created because the result is random.");

  const readS = (mk, el) => { F[mk].forEach(([id, key]) => { if (el(id)) S[mk][key] = el(id).value; }); };
  const paint = (mk, el, body) => {
    F[mk].forEach(([id, key]) => { if (el(id)) el(id).value = S[mk][key]; });
    body.querySelectorAll("button.ph__tog").forEach((b) => b.setAttribute("aria-pressed", S[mk][b.dataset.k] ? "true" : "false"));
  };
  function wire(mk, body, h) {
    curBody = body; body._rn = { mk, h };
    if (!body._rnBound) {
      body._rnBound = true;
      body.addEventListener("click", (e) => { const b = e.target.closest("button.ph__tog"); if (!b || !body._rn) return; const cur = body._rn, on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(on)); S[cur.mk][b.dataset.k] = on; cur.h.maybeCalc(); });
    }
    F[mk].forEach(([id]) => { const e = h.el(id); if (!e) return; const f = () => { readS(mk, h.el); h.maybeCalc(); }; e.addEventListener("input", f); e.addEventListener("change", f); });
  }
  const regen = (h) => h.calc(true);

  // ----- відображення -----
  const chips = (esc, strs, big) => '<div class="rn__scroll"><div class="rn__chips">' + strs.map((s) => '<span class="rn__chip' + (big ? " rn__chip--big" : "") + '">' + esc(s) + "</span>").join("") + "</div></div>";
  const stepsOf = (arr) => arr.filter(Boolean);

  // ====================== числа ======================
  const SEPS = { comma: [", ", L("Через кому", "Comma-separated")], space: [" ", L("Через пробіл", "Space-separated")], line: ["\n", L("Кожне з нового рядка", "One per line")] };
  const PRESETS = [["d10", "1–10"], ["d100", "1–100"], ["d1000", "1–1000"], ["l649", L("6 з 49", "6 of 49")], ["l536", L("5 з 36", "5 of 36")]];
  const PRESET_V = { d10: { from: "1", to: "10", count: "1", dec: "0", sort: "none", unique: false }, d100: { from: "1", to: "100", count: "1", dec: "0", sort: "none", unique: false }, d1000: { from: "1", to: "1000", count: "1", dec: "0", sort: "none", unique: false }, l649: { from: "1", to: "49", count: "6", dec: "0", sort: "asc", unique: true }, l536: { from: "1", to: "36", count: "5", dec: "0", sort: "asc", unique: true } };
  const num = {
    key: "num", type: "custom", req: () => ["rnFrom", "rnTo"], nameUk: "Числа", nameEn: "Numbers",
    build(body, x, h) {
      const { el } = h, s = S.num;
      body.innerHTML = '<div class="ph__vars">' + fld("rnFrom", L("Від", "From"), inp("rnFrom", "1", 18, "text")) + fld("rnTo", L("До", "To"), inp("rnTo", "100", 18, "text")) + fld("rnCnt", L("Скільки чисел (1–1000)", "How many numbers (1–1000)"), inp("rnCnt", "1", 4)) +
        fld("rnDec", L("Знаків після коми", "Decimal places"), sel("rnDec", [0, 1, 2, 3, 4, 5, 6].map((n) => [String(n), String(n)]))) + fld("rnSort", L("Порядок", "Order"), sel("rnSort", [["none", L("Як випало", "As drawn")], ["asc", L("За зростанням", "Ascending")], ["desc", L("За спаданням", "Descending")]])) + fld("rnSep", L("Копіювати", "Copy as"), sel("rnSep", Object.keys(SEPS).map((k) => [k, SEPS[k][1]]))) + "</div>" +
        togGrp(L("Додатково", "More"), [["unique", L("Без повторів", "No repeats")]], s) +
        '<div class="ph__chips ph__mt12" id="rnChips">' + PRESETS.map(([k, t]) => '<button type="button" class="ph__mini" data-k="' + k + '">' + t + "</button>").join("") + "</div>" +
        hint(L("Діапазон від −10¹⁵ до 10¹⁵, межі входять до діапазону. Для десяткових чисел оберіть кількість знаків після коми. «6 з 49» і «5 з 36» — лотерейні набори без повторів за зростанням.", "The range is from −10¹⁵ to 10¹⁵ and both ends are included. For decimals choose the number of decimal places. “6 of 49” and “5 of 36” are lottery-style sets with no repeats in ascending order."));
      paint("num", el, body); wire("num", body, h);
      el("rnChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; S.num = Object.assign({}, S.num, PRESET_V[b.dataset.k]); paint("num", el, body); regen(h); });
    },
    calc(h) {
      const { el, esc } = h; readS("num", el); const s = S.num, d = Number(s.dec);
      const cnt = intIn(s.count, 1, 1000); if (cnt === null) return { ok: false, msg: L("Кількість чисел: ціле число від 1 до 1000.", "How many numbers: a whole number from 1 to 1000.") };
      const E = { fmt: L("введіть число.", "enter a number."), digits: L("забагато знаків після коми для вибраної точності: збільште «Знаків після коми».", "too many decimal places for the chosen precision: raise “Decimal places”."), big: L("значення за модулем не більше 10¹⁵.", "the absolute value must not exceed 10¹⁵.") };
      const a = R.parseDec(s.from, d); if (a.err) return { ok: false, msg: L("«Від»: ", "“From”: ") + E[a.err] };
      const b = R.parseDec(s.to, d); if (b.err) return { ok: false, msg: L("«До»: ", "“To”: ") + E[b.err] };
      if (a.v > b.v) return { ok: false, msg: L("«Від» не може бути більшим за «До».", "“From” cannot be greater than “To”.") };
      const r = R.numbers({ lo: a.v, hi: b.v, d, count: cnt, unique: s.unique, sort: s.sort });
      if (r.err === "unique") return { ok: false, msg: L("У діапазоні лише ", "The range has only ") + R.group(r.R.toString()) + (IS_EN ? " values" : " " + plural(Number(r.R), "значення", "значення", "значень")) + L(": без повторів більше не отримати.", ": you cannot get more without repeats.") };
      const f = (v, g) => R.fmtDec(v, d, g), strs = r.list.map((v) => f(v, false));
      const step = d ? "0" + R.DEC + "0".repeat(d - 1) + "1" : "1";
      const tiles = cnt > 1 ? [{ k: L("Сума", "Sum"), v: f(r.sum, true) }, { k: L("Середнє", "Mean"), v: R.meanText(r.sum, cnt, d) }, { k: L("Найменше — найбільше", "Smallest – largest"), v: f(r.min, true) + " — " + f(r.max, true) }] : [{ k: L("Діапазон", "Range"), v: f(a.v, true) + " — " + f(b.v, true) }, { k: L("Можливих значень", "Possible values"), v: R.fmtBigCount(r.R) }];
      let combos = ""; if (s.unique && cnt > 1) { const c = R.binom(r.R, cnt); tiles.push({ k: L("Можливих наборів", "Possible sets"), v: R.fmtBigCount(c) }); combos = box(esc, L("Усі набори рівноймовірні: шанс вгадати конкретний дорівнює 1 до ", "All sets are equally likely: the chance to guess a particular one is 1 in ") + R.fmtBigCount(c) + L(". Ніякі «щасливі» числа цього не змінюють.", ". No “lucky” numbers change that.")); }
      const steps = stepsOf([
        { t: L("Діапазон", "The range"), l: [f(a.v, true) + " … " + f(b.v, true) + " → " + R.fmtBigCount(r.R) + L(" можливих значень", " possible values") + (d ? L(" з кроком ", " in steps of ") + step : "")] },
        { t: L("Як вибрано", "How it was drawn"), l: [L("Кожне число обирається через crypto.getRandomValues: беремо стільки біт, скільки потрібно для діапазону, і відкидаємо значення поза ним, тож усі значення рівноймовірні (без зсуву за модулем).", "Each number is drawn with crypto.getRandomValues: we take as many bits as the range needs and reject values outside it, so all values are equally likely (no modulo bias).")].concat(s.unique ? [L("Без повторів: вибірка за алгоритмом Флойда, кожен набір і порядок рівноймовірні.", "No repeats: sampling with Floyd's algorithm, every set and order is equally likely.")] : []) },
        cnt > 1 ? { t: L("Підсумок", "Summary"), l: [L("Сума = ", "Sum = ") + f(r.sum, true), L("Середнє = сума / ", "Mean = sum / ") + cnt + " = " + R.meanText(r.sum, cnt, d)] } : null
      ]);
      const head = cnt === 1 ? [L("число", "number"), f(r.list[0], true)] : [L("чисел", "numbers"), String(cnt)];
      return { ok: true, expr: f(a.v, true) + " … " + f(b.v, true) + (s.unique ? " · " + L("без повторів", "no repeats") : ""), head, headSub: cnt === 1 ? L("з діапазону ", "from the range ") + f(a.v, true) + " … " + f(b.v, true) : L("сума ", "sum ") + f(r.sum, true) + L(", середнє ", ", mean ") + R.meanText(r.sum, cnt, d), subRaw: true, afterHead: cnt === 1 ? '<div class="rn__center"><span class="rn__chip rn__chip--big">' + esc(f(r.list[0], true)) + "</span></div>" : chips(esc, strs, false), tiles, extraHtml: combos + box(esc, NOTE), steps, note: "", copyText: strs.join(SEPS[s.sep][0]), resText: "" };
    },
    reset(h) { S.num = Object.assign({}, DEF.num); paint("num", h.el, curBody); },
    fill(h) { S.num = Object.assign({}, DEF.num, PRESET_V.l649); paint("num", h.el, curBody); },
    share() {}, apply() {}
  };

  // ====================== кубики ======================
  const SIDES = [["4", "d4"], ["6", "d6"], ["8", "d8"], ["10", "d10"], ["12", "d12"], ["20", "d20"], ["100", "d100"], ["c", L("Своє число граней", "Custom number of sides")]];
  const dice = {
    key: "dice", type: "custom", req: () => [], nameUk: "Кубики", nameEn: "Dice",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("rdCnt", L("Скільки кубиків (1–20)", "How many dice (1–20)"), inp("rdCnt", "2", 2)) + fld("rdSides", L("Граней", "Sides"), sel("rdSides", SIDES)) + fld("rdCustom", L("Граней (2–1000)", "Sides (2–1000)"), inp("rdCustom", "30", 4)) + fld("rdMod", L("Модифікатор (−1000…1000)", "Modifier (−1000…1000)"), inp("rdMod", "0", 5, "text")) + fld("rdRolls", L("Скільки кидків (1–10)", "How many rolls (1–10)"), inp("rdRolls", "1", 2)) + "</div>" +
        hint(L("Запис 2d6+3 означає: кинути 2 кубики з 6 гранями й додати 3. Нижче буде точний розподіл імовірностей суми.", "The notation 2d6+3 means: roll 2 six-sided dice and add 3. Below is the exact probability distribution of the sum."));
      paint("dice", el, body); wire("dice", body, h);
      const sync = () => { el("rdCustomW").style.display = el("rdSides").value === "c" ? "" : "none"; };
      sync(); el("rdSides").addEventListener("change", sync);
    },
    calc(h) {
      const { el, esc } = h; readS("dice", el); const s = S.dice;
      const n = intIn(s.count, 1, 20); if (n === null) return { ok: false, msg: L("Кількість кубиків: від 1 до 20.", "Number of dice: from 1 to 20.") };
      const sd = s.sides === "c" ? intIn(s.custom, 2, 1000) : Number(s.sides); if (sd === null) return { ok: false, msg: L("Кількість граней: від 2 до 1000.", "Number of sides: from 2 to 1000.") };
      const md = intIn(s.mod, -1000, 1000); if (md === null) return { ok: false, msg: L("Модифікатор: ціле число від −1000 до 1000.", "Modifier: a whole number from −1000 to 1000.") };
      const rl = intIn(s.rolls, 1, 10); if (rl === null) return { ok: false, msg: L("Кількість кидків: від 1 до 10.", "Number of rolls: from 1 to 10.") };
      const sgn = (v) => (v < 0 ? "−" + -v : "+" + v), notation = n + "d" + sd + (md ? sgn(md) : "");
      const rolls = []; for (let i = 0; i < rl; i++) { const dv = R.roll(n, sd), sum = dv.reduce((a, c) => a + c, 0); rolls.push({ dv, sum, total: sum + md }); }
      const st = R.diceStats(n, sd), dist = R.diceDist(n, sd), pOf = (sum) => dist[sum - n];
      const rows = rolls.map((r, i) => '<div class="rn__roll"><span class="rn__rn">#' + (i + 1) + "</span>" + r.dv.map((v) => '<span class="rn__die">' + v + "</span>").join("") + (md ? '<span class="rn__more">' + esc(sgn(md)) + "</span>" : "") + '<span class="rn__sum">= ' + r.total + "</span></div>").join("");
      let table = "";
      if (dist.length <= 40) {
        const cur = new Set(rolls.map((r) => r.sum));
        table = '<div class="ph__sub">' + L("Імовірність кожної суми", "Probability of each sum") + "</div>" + UI.list([L("Сума", "Sum"), md ? L("З модифікатором", "With modifier") : "", L("Імовірність", "Probability")].filter(Boolean), dist.map((p, i) => ({ cells: [{ t: String(n + i), cls: cur.has(n + i) ? "is-first strong" : "is-first" }].concat(md ? [String(n + i + md)] : []).concat([{ t: R.fmtP(p), cls: cur.has(n + i) ? "strong" : "" }]) })), { w: md ? "minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1fr) minmax(0, 1fr)" });
      }
      const spread = box(esc, L("Середня сума ", "The average sum is ") + (st.mean + md) + L(", стандартне відхилення ", ", the standard deviation is ") + String(Math.round(st.sd * 100) / 100).replace(".", R.DEC) + L(": приблизно дві третини кидків дають суму від ", ": about two thirds of rolls give a sum from ") + String(Math.round((st.mean - st.sd + md) * 10) / 10).replace(".", R.DEC) + L(" до ", " to ") + String(Math.round((st.mean + st.sd + md) * 10) / 10).replace(".", R.DEC) + ".");
      const first = rolls[0], p1 = pOf(first.sum);
      const steps = stepsOf([
        { t: L("Кубики", "The dice"), l: [notation + ": " + n + L(" кубик(и) по ", " dice with ") + sd + L(" граней", " sides") + (md ? L(", модифікатор ", ", modifier ") + sgn(md) : "")] },
        { t: L("Кожен кубик", "Each die"), l: [L("Грань від 1 до ", "A face from 1 to ") + sd + L(" обирається через crypto.getRandomValues без зсуву за модулем: усі грані рівноймовірні, кубики незалежні.", " is drawn with crypto.getRandomValues without modulo bias: all faces are equally likely and the dice are independent.")] },
        { t: L("Розподіл суми", "The distribution of the sum"), l: [L("Імовірність суми рахується точно згорткою розподілів кубиків; мінімум ", "The probability of a sum is worked out exactly by convolving the dice distributions; the minimum is ") + st.min + L(", максимум ", ", the maximum ") + st.max + L(", середнє ", ", the mean ") + st.mean] }
      ]);
      const head = rl === 1 ? [L("сума", "sum"), String(first.total)] : [L("кидків", "rolls"), String(rl)];
      return { ok: true, expr: notation, head, headSub: rl === 1 && n <= 6 ? L("кубики: ", "dice: ") + first.dv.join(" + ") + (md ? " " + sgn(md) : "") : "", subRaw: true, afterHead: '<div class="rn__rolls">' + rows + "</div>", tiles: [{ k: L("Можлива сума", "Possible sum"), v: st.min + md + " — " + (st.max + md) }, { k: L("Середня", "Average"), v: String(st.mean + md).replace(".", R.DEC) }, rl === 1 ? { k: L("Імовірність такої суми", "Chance of this sum"), v: R.fmtP(p1) } : { k: L("Різних сум", "Different sums"), v: String(dist.length) }], extraHtml: table + spread + box(esc, NOTE), steps, note: "", copyText: rolls.map((r) => r.dv.join(" + ") + (md ? " " + sgn(md) : "") + " = " + r.total).join("\n"), resText: "" };
    },
    reset(h) { S.dice = Object.assign({}, DEF.dice); paint("dice", h.el, curBody); h.el("rdCustomW").style.display = "none"; },
    fill(h) { S.dice = Object.assign({}, DEF.dice, { count: "2", sides: "6", mod: "3" }); paint("dice", h.el, curBody); h.el("rdCustomW").style.display = "none"; },
    share() {}, apply() {}
  };

  // ====================== монета ======================
  const HEADS = L("Орел", "Heads"), TAILS = L("Решка", "Tails"), HL = L("О", "H"), TL = L("Р", "T");
  // об'ємна монета «золотий тризуб»: золота грань «орел» і срібна «решка» з однаковим малюнком (тризуб у вінку з колосків і «1» у колоссі), перлинний і рубчастий рант, боковина з рубчастих шарів, тінь на поверхні й підкидання з обертом
  const CPG = { hi: "#fff4b8", hi2: "#ffe98a", mid: "#f0c230", lo: "#a87a00", dark: "#5e4200" }, CPS = { hi: "#ffffff", hi2: "#f4f7fb", mid: "#cdd4e2", lo: "#7a87a6", dark: "#2f3b5c" };
  const fx = (n) => n.toFixed(1), ptc = (r, a) => [100 + r * Math.sin(a), 100 - r * Math.cos(a)];
  const lgr = (id, c) => '<linearGradient id="' + id + '" x1="0" y1="0" x2="1" y2="1">' + c.map((x, i) => '<stop offset="' + i / (c.length - 1) + '" stop-color="' + x + '"/>').join("") + "</linearGradient>";
  const arcTxt = (id, rc, txt, size, fill, stroke, ls) => { const r = rc - size * 0.36; return '<path id="' + id + '" d="M' + (100 - r) + ",100 A" + r + "," + r + " 0 0 1 " + (100 + r) + ',100" fill="none"/><text font-family="Georgia, serif" font-size="' + size + '" font-weight="700" letter-spacing="' + ls + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width=".5" text-anchor="middle"><textPath href="#' + id + '" startOffset="50%">' + txt + "</textPath></text>"; };
  const tryz = (fill, stroke, tr) => {
    const half = "M94,114 C82,110 76,102 76,88 L76,66 L82,66 L70,44 L58,66 L64,66 L64,88 C64,110 72,128 94,128Z";
    return '<g transform="' + tr + '" fill="' + fill + '" stroke="' + stroke + '" stroke-width=".9" stroke-linejoin="round"><path d="' + half + '"/><path d="' + half + '" transform="translate(200,0) scale(-1,1)"/><polygon points="100,38 109,64 91,64"/><rect x="96" y="62" width="8" height="62" rx="1.5"/><rect x="86" y="100" width="28" height="6" rx="2"/><path d="M88,124 L112,124 L112,130 L105,130 L100,158 L95,130 L88,130Z"/></g>';
  };
  const wheat = (fill, stroke) => { let g = '<rect x="-.8" y="-44" width="1.6" height="44" fill="' + stroke + '"/>'; for (let i = 0; i < 7; i++) { const y = -20 - i * 5.4; g += '<ellipse cx="-3.4" cy="' + y + '" rx="2.2" ry="4.4" transform="rotate(-26 -3.4 ' + y + ')" fill="' + fill + '" stroke="' + stroke + '" stroke-width=".5"/><ellipse cx="3.4" cy="' + y + '" rx="2.2" ry="4.4" transform="rotate(26 3.4 ' + y + ')" fill="' + fill + '" stroke="' + stroke + '" stroke-width=".5"/>'; } return g + '<ellipse cx="0" cy="-56" rx="2" ry="4.6" fill="' + fill + '" stroke="' + stroke + '" stroke-width=".5"/>'; };
  const ears = (fill, stroke) => [[-44, 1], [44, 1], [-70, 0.82], [70, 0.82]].map((t) => '<g transform="translate(100,156) rotate(' + t[0] + ") scale(" + t[1] + ')">' + wheat(fill, stroke) + "</g>").join("");
  const faceSvg = (heads) => {
    const CP = heads ? CPG : CPS, p = heads ? "rnH" : "rnT", e = "url(#" + p + "E)", d = CP.dark;
    let g = '<svg class="rn__svg" viewBox="0 0 200 200" aria-hidden="true"><defs><radialGradient id="' + p + 'F" cx="34%" cy="28%" r="92%"><stop offset="0" stop-color="' + CP.hi + '"/><stop offset=".5" stop-color="' + CP.mid + '"/><stop offset="1" stop-color="' + CP.lo + '"/></radialGradient>' + lgr(p + "R", [CP.hi, CP.mid, d]) + lgr(p + "E", [CP.hi2, CP.mid, d]) +
      '<radialGradient id="' + p + 'H" cx="30%" cy="20%" r="62%"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient><filter id="' + p + 'S" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx=".9" dy="1.3" stdDeviation=".8" flood-color="' + d + '" flood-opacity=".6"/></filter></defs>';
    g += '<circle cx="100" cy="100" r="99" fill="url(#' + p + 'R)" stroke="' + d + '" stroke-width="1.2"/><circle cx="100" cy="100" r="96" fill="url(#' + p + 'F)"/>';
    for (let i = 0; i < 64; i++) { const q = ptc(90, (2 * Math.PI * i) / 64); g += '<circle cx="' + fx(q[0]) + '" cy="' + fx(q[1]) + '" r="2.1" fill="' + e + '" stroke="' + d + '" stroke-width=".5"/>'; }
    g += '<circle cx="100" cy="100" r="84.5" fill="none" stroke="' + d + '" stroke-width=".8" opacity=".6"/><circle cx="100" cy="100" r="82" fill="none" stroke="' + CP.hi + '" stroke-width="1.2" opacity=".9"/>';
    g += '<g stroke="' + d + '" stroke-width=".5" opacity=".2">' + Array.from({ length: 90 }, (_, i) => { const a = (2 * Math.PI * i) / 90, q = ptc(30, a), w = ptc(78, a); return '<line x1="' + fx(q[0]) + '" y1="' + fx(q[1]) + '" x2="' + fx(w[0]) + '" y2="' + fx(w[1]) + '"/>'; }).join("") + "</g>";
    g += '<g filter="url(#' + p + 'S)">' + ears(e, d) + (heads ? tryz(e, d, "translate(100,98) scale(.8) translate(-100,-98)") : '<text x="100" y="122" text-anchor="middle" font-family="Georgia, serif" font-size="78" font-weight="700" fill="' + e + '" stroke="' + d + '" stroke-width="1">1</text>') + "</g>";
    g += arcTxt(p + "T", 70, "· " + (heads ? HEADS : TAILS).toUpperCase() + " ·", 17, e, d, 3);
    return g + '<ellipse cx="68" cy="52" rx="52" ry="30" transform="rotate(-30 68 52)" fill="url(#' + p + 'H)" opacity=".5"/></svg>';
  };
  const coin3d = (heads) => {
    const layers = []; for (let z = -5; z <= 5; z++) layers.push('<i style="transform:translateZ(' + z + 'px)"></i>');
    return '<div class="rn__stage" role="img" aria-label="' + (heads ? HEADS : TAILS) + '"><div class="rn__shadow"></div><div class="rn__toss"><div class="rn__coin3d ' + (heads ? "is-h" : "is-t") + '"><div class="rn__edge">' + layers.join("") + '</div><div class="rn__face rn__face--f">' + faceSvg(true) + '</div><div class="rn__face rn__face--b">' + faceSvg(false) + "</div></div></div></div>";
  };
  const coin = {
    key: "coin", type: "custom", req: () => [], nameUk: "Монета", nameEn: "Coin",
    build(body, x, h) {
      body.innerHTML = '<div class="ph__vars">' + fld("rcN", L("Скільки кидків (1–1000)", "How many flips (1–1000)"), inp("rcN", "1", 4), true) + "</div>" + hint(L("Один кидок дає орла чи решку з однаковим шансом. Для великої серії показано кількість, відсотки, найдовшу серію й імовірність такого результату.", "One flip gives heads or tails with equal chances. For a long series the counts, percentages, the longest run and the probability of such a result are shown."));
      paint("coin", h.el, body); wire("coin", body, h);
    },
    calc(h) {
      const { el, esc } = h; readS("coin", el);
      const n = intIn(S.coin.n, 1, 1000); if (n === null) return { ok: false, msg: L("Кількість кидків: ціле число від 1 до 1000.", "Number of flips: a whole number from 1 to 1000.") };
      const fl = R.flips(n), heads = fl.reduce((a, c) => a + c, 0), tails = n - heads, streak = R.longestStreak(fl), pc = (x) => (Math.round((x / n) * 1000) / 10).toString().replace(".", R.DEC) + (IS_EN ? "%" : " %");
      const seq = fl.slice(0, 200).map((v) => '<span class="rn__coin ' + (v ? "is-h" : "is-t") + '">' + (v ? HL : TL) + "</span>").join("") + (n > 200 ? '<span class="rn__more">… +' + (n - 200) + "</span>" : "");
      const after = n === 1 ? coin3d(!!heads) : '<div class="rn__scroll"><div class="rn__chips">' + seq + "</div></div>";
      let stat = ""; if (n > 1) { const pe = R.probExact(n, heads), pf = R.probAtLeastAsFar(n, heads); stat = box(esc, L("Шанс випасти рівно ", "The chance of exactly ") + heads + L(" орлів із ", " heads in ") + n + L(" кидків — ", " flips is ") + R.fmtP(pe) + L("; шанс відхилитися від ", "; the chance to stray from ") + n / 2 + L(" так само чи сильніше — ", " as far or farther is ") + R.fmtP(pf) + L(". У коротких серіях відхилення від 50/50 нормальні: монета не «пам'ятає» попередні кидки.", ". Deviations from 50/50 are normal in short series: the coin does not “remember” earlier flips.")); }
      const steps = stepsOf([
        { t: L("Кидок", "A flip"), l: [L("Кожен кидок — один випадковий біт із crypto.getRandomValues: орел і решка рівноймовірні, кидки незалежні.", "Each flip is one random bit from crypto.getRandomValues: heads and tails are equally likely and the flips are independent.")] },
        n > 1 ? { t: L("Підсумок", "Summary"), l: [HEADS + ": " + heads + " (" + pc(heads) + "), " + TAILS + ": " + tails + " (" + pc(tails) + ")", L("Найдовша серія однакових: ", "The longest run of the same side: ") + streak] } : null
      ]);
      return { ok: true, expr: n + (IS_EN ? (n === 1 ? " flip" : " flips") : " " + plural(n, "кидок", "кидки", "кидків")), head: n === 1 ? [L("випало", "result"), heads ? HEADS : TAILS] : [L("орлів", "heads"), heads + " / " + n], headSub: n === 1 ? "" : L("решок ", "tails ") + tails, subRaw: true, afterHead: after, tiles: n === 1 ? [] : [{ k: L("Орлів", "Heads"), v: heads + " · " + pc(heads) }, { k: L("Решок", "Tails"), v: tails + " · " + pc(tails) }, { k: L("Найдовша серія", "Longest run"), v: String(streak) }], extraHtml: stat + box(esc, NOTE), steps, note: "", copyText: n === 1 ? (heads ? HEADS : TAILS) : fl.map((v) => (v ? HL : TL)).join("") + "\n" + HEADS + " " + heads + ", " + TAILS + " " + tails, resText: "" };
    },
    reset(h) { S.coin = Object.assign({}, DEF.coin); paint("coin", h.el, curBody); },
    fill(h) { S.coin = Object.assign({}, DEF.coin, { n: "20" }); paint("coin", h.el, curBody); },
    share() {}, apply() {}
  };

  // ====================== зі списку ======================
  const list = {
    key: "list", type: "custom", req: () => ["rlText"], nameUk: "Зі списку", nameEn: "From a list",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full" id="rlTextW"><label class="ph__label" for="rlText">' + L("Список (один елемент у рядку, до 500)", "The list (one item per line, up to 500)") + '</label><textarea class="ph__input ph__ta" id="rlText" rows="6" maxlength="20000" autocomplete="off" spellcheck="false" placeholder="' + L("Оля\nІван\nМаша\nПетро", "Olga\nIvan\nMasha\nPeter") + '" aria-label="rlText"></textarea></div>' + fld("rlMode", L("Що зробити", "What to do"), sel("rlMode", [["pick", L("Обрати випадкові", "Pick at random")], ["shuffle", L("Перемішати весь список", "Shuffle the whole list")]])) + fld("rlCnt", L("Скільки обрати", "How many to pick"), inp("rlCnt", "1", 4)) + "</div>" +
        hint(L("Однакові рядки рахуються окремо. Обрані елементи не повторюються. Список лишається в браузері.", "Identical lines count separately. Picked items do not repeat. The list stays in your browser."));
      paint("list", el, body); wire("list", body, h);
      const sync = () => { el("rlCntW").style.display = el("rlMode").value === "pick" ? "" : "none"; };
      sync(); el("rlMode").addEventListener("change", sync);
    },
    calc(h) {
      const { el, esc } = h; readS("list", el); const s = S.list;
      if (!s.text.trim()) return { ok: false, msg: L("Введіть список: один елемент у рядку.", "Enter a list: one item per line.") };
      const p = R.parseItems(s.text, 500); if (p.err) return { ok: false, msg: L("У списку ", "The list has ") + p.n + L(" елементів: можна до 500.", " items: up to 500 are allowed.") };
      const items = p.items, N = items.length, pick = s.mode === "pick";
      let cnt = N; if (pick) { cnt = intIn(s.count, 1, N); if (cnt === null) return { ok: false, msg: L("Скільки обрати: ціле число від 1 до ", "How many to pick: a whole number from 1 to ") + N + L(" (кількість елементів у списку).", " (the number of items in the list).") }; }
      const out = pick ? R.pickItems(items, cnt) : R.shuffle(items.slice());
      const dup = new Set(items).size < N;
      const rows = '<div class="rn__items">' + out.map((t, i) => '<div class="rn__item"><span class="rn__n">' + (i + 1) + '</span><span class="rn__t">' + esc(t) + "</span></div>").join("") + "</div>";
      const chance = pick ? R.fmtP(cnt / N) : "";
      const steps = stepsOf([
        { t: L("Список", "The list"), l: [N + L(" елементів", " items") + (dup ? L(" (є однакові, вони рахуються окремо)", " (some are identical, counted separately)") : "")] },
        { t: pick ? L("Вибір", "The pick") : L("Перемішування", "The shuffle"), l: [pick ? L("Обрано ", "Picked ") + cnt + L(" різних позицій: алгоритм Флойда, кожен набір і порядок рівноймовірні.", " different positions: Floyd's algorithm, every set and order is equally likely.") : L("Перемішування Фішера — Йейтса: кожен із ", "Fisher–Yates shuffle: each of the ") + N + L("! порядків рівноймовірний.", "! orders is equally likely.")] },
        pick ? { t: L("Шанс кожного", "Chance of each item"), l: [cnt + " / " + N + " = " + chance] } : null
      ]);
      return { ok: true, expr: N + L(" елементів", " items") + " · " + (pick ? L("обрати ", "pick ") + cnt : L("перемішати", "shuffle")), head: pick ? (cnt === 1 ? [L("обрано", "picked"), out[0]] : [L("обрано", "picked"), String(cnt)]) : [L("перемішано", "shuffled"), String(N)], headSub: pick ? L("шанс кожного елемента: ", "the chance of each item: ") + chance : "", subRaw: true, afterHead: rows, tiles: pick ? [{ k: L("У списку", "In the list"), v: String(N) }, { k: L("Шанс кожного", "Chance of each"), v: chance }] : [{ k: L("У списку", "In the list"), v: String(N) }], extraHtml: (dup ? box(esc, L("У списку є однакові рядки: вони мають окремі шанси, тож однакове ім'я може випасти двічі.", "The list has identical lines: they have separate chances, so the same name may come up twice."), L("Увага.", "Note.")) : "") + box(esc, NOTE) + box(esc, PRIV), steps, note: "", copyText: out.join("\n"), resText: "" };
    },
    reset(h) { S.list = Object.assign({}, DEF.list); paint("list", h.el, curBody); h.el("rlCntW").style.display = ""; },
    fill(h) { S.list = Object.assign({}, DEF.list, { text: L("Оля\nІван\nМаша\nПетро\nСофія\nАртем", "Olga\nIvan\nMasha\nPeter\nSophie\nArthur"), count: "2" }); paint("list", h.el, curBody); h.el("rlCntW").style.display = ""; },
    share() {}, apply() {}
  };

  return { modes: [num, dice, coin, list], exactNote: false, noShare: true, autoStart: true, onReset() { Object.keys(DEF).forEach((k) => { S[k] = Object.assign({}, DEF[k]); }); } };
});
