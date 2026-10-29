/* fraction.js — калькулятор дробів: шість режимів (дії з дробами, спрощення, мішане ↔ неправильний, порівняння, десятковий ↔ звичайний, спільний знаменник), розв'язання по кроках (UK/EN)
   Усі обчислення на BigInt: дріб це пара {n, d} (d > 0), після кожної дії скорочується за НСД; до 30 цифр у кожному полі.
   Дії: порядок «за правилами» (× і ÷ перед + і −, зліва направо) або «по черзі». Мішане число w n/d = (|w|·d + n)/d зі знаком цілої частини (без цілої: знак чисельника); чисельник мішаного не може бути від'ємним.
   Десятковий запис: ділення в стовпчик із пошуком повтору остачі (період у дужках), до 1000 цифр, далі округлення до 10 знаків. Періодичний десятковий → дріб: (число з періодом − число без періоду) / (дев'ятки за періодом і нулі між комою та періодом). */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const SEP = IS_EN ? "." : ",";
  const MAXD = 30;
  const MODES = ["ops", "sim", "mix", "cmp", "dec", "lcd"];
  const CFG = { ops: { max: 10, min: 2, start: 2 }, sim: { max: 1, min: 1, start: 1 }, mix: { max: 1, min: 1, start: 1 }, cmp: { max: 5, min: 2, start: 3 }, dec: { max: 1, min: 1, start: 1 }, lcd: { max: 6, min: 2, start: 3 } };
  const SLOT_PFX = { ops: "o", sim: "s", mix: "m", cmp: "c", dec: "f", lcd: "l" };
  const DDP = { order: "od", cmpOrder: "co", dir: "dr" };
  const cnt = { ops: 2, cmp: 3, lcd: 3 };
  let mode = "ops";

  const T = {
    enter: L("Вкажіть дані — результат з'явиться тут.", "Enter your data — the result will appear here."),
    copied: L("Результат скопійовано ✅", "Result copied ✅"),
    copyFailed: L("Не вдалось скопіювати 😕", "Could not copy 😕"),
    linkCopied: L("Посилання скопійовано ✅", "Link copied ✅"),
    reset: L("Скинуто ✅", "Reset ✅"),
    example: L("Підставлено приклад ✅", "Example filled in ✅"),
    calcFirst: L("Спочатку порахуйте результат.", "Calculate first.")
  };

  // ===== BigInt: дроби =====
  const Z = 0n, O = 1n;
  const babs = (x) => (x < Z ? -x : x);
  const gcd = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };
  const lcm = (a, b) => (a / gcd(a, b)) * b;
  const norm = (f) => { let n = f.n, d = f.d; if (d < Z) { n = -n; d = -d; } const g = gcd(n, d) || O; return { n: n / g, d: d / g }; };
  const S = (x) => x.toString();
  const par = (x) => (x < Z ? "(" + x + ")" : S(x));
  const fs = (f) => (f.d === O ? S(f.n) : S(f.n) + "/" + S(f.d));
  const mixParts = (f) => { const neg = f.n < Z, a = babs(f.n); return { neg, w: a / f.d, r: a % f.d, d: f.d }; };
  const mixTxt = (f) => { if (f.d === O) return S(f.n); const m = mixParts(f), sg = m.neg ? "-" : ""; if (m.w === Z) return fs(f); if (m.r === Z) return sg + m.w; return sg + m.w + " " + m.r + "/" + m.d; };
  const eqn = (a, b) => a.n === b.n && a.d === b.d;

  // десятковий запис: { text, exact, periodic, pre, per }
  function decimal(f) {
    const neg = f.n < Z, n = babs(f.n), d = f.d, ip = n / d;
    let r = n % d;
    const digits = [], seen = new Map();
    let start = -1;
    while (r !== Z && digits.length <= 1000) {
      const k = r.toString();
      if (seen.has(k)) { start = seen.get(k); break; }
      seen.set(k, digits.length);
      r *= 10n;
      digits.push((r / d).toString());
      r %= d;
    }
    const sg = neg ? "-" : "";
    if (r === Z) { const fr = digits.join(""); return { text: sg + ip + (fr ? SEP + fr : ""), exact: true, periodic: false, pre: fr, per: "" }; }
    if (start >= 0) { const pre = digits.slice(0, start).join(""), per = digits.slice(start).join(""); return { text: sg + ip + SEP + pre + "(" + per + ")", exact: true, periodic: true, pre, per }; }
    return { text: sg + ip + SEP + digits.slice(0, 10).join("") + "…", exact: false, periodic: false, pre: "", per: "" };
  }

  // ===== слоти (дріб: ціле, чисельник, знаменник) =====
  const sid = (m, i, k) => SLOT_PFX[m] + i + "_" + k;
  const raw = (id) => (el(id) ? el(id).value.trim() : "");
  function readSlot(m, i) {
    const w = raw(sid(m, i, "w")), n = raw(sid(m, i, "n")), d = raw(sid(m, i, "d"));
    if (!w && !n && !d) return { empty: true };
    const bad = [w, n, d].find((x) => x && !/^-?\d+$/.test(x));
    if (bad !== undefined) return { err: L("Число «" + bad.slice(0, 12) + "» не підходить: потрібні цілі числа.", "“" + bad.slice(0, 12) + "” is not valid: whole numbers only.") };
    if ([w, n, d].some((x) => x && x.replace("-", "").length > MAXD)) return { err: L("Не більше " + MAXD + " цифр у числі.", "At most " + MAXD + " digits in a number.") };
    if (n && !d) return { err: L("Вкажіть знаменник.", "Enter the denominator.") };
    if (!n && d) return { err: L("Вкажіть чисельник.", "Enter the numerator.") };
    if (!n && !d) { const W = BigInt(w); return { f: { n: W, d: O }, mixed: false, disp: S(W), whole: W }; }
    const N = BigInt(n), D = BigInt(d);
    if (D === Z) return { err: L("Знаменник не може дорівнювати нулю.", "The denominator cannot be zero.") };
    if (!w) { const f = norm({ n: N, d: D }); return { f, mixed: false, disp: n + "/" + d, raw: { n: N, d: D } }; }
    const W = BigInt(w);
    if (W === Z) { const f = norm({ n: N, d: D }); return { f, mixed: false, disp: n + "/" + d, raw: { n: N, d: D } }; }
    if (N < Z) return { err: L("У мішаному числі чисельник не може бути від'ємним: мінус ставте перед цілою частиною.", "In a mixed number the numerator cannot be negative: put the minus before the whole part.") };
    if (D < Z) return { err: L("У мішаному числі знаменник має бути додатним.", "In a mixed number the denominator must be positive.") };
    const sg = W < Z ? -O : O;
    const imp = { n: sg * (babs(W) * D + N), d: D };
    return { f: norm(imp), mixed: true, disp: w + " " + n + "/" + d, whole: W, mn: N, md: D, imp };
  }
  function readSlots(m, count, labels) {
    const out = [];
    for (let i = 1; i <= count; i++) {
      const r = readSlot(m, i);
      if (r.err) return { err: (labels ? labels[i - 1] + ": " : L("Дріб " + i + ": ", "Fraction " + i + ": ")) + r.err };
      if (r.empty) return { incomplete: true, msg: L("Заповніть дріб " + (labels ? labels[i - 1] : i) + ".", "Fill in fraction " + (labels ? labels[i - 1] : i) + ".") };
      out.push(r);
    }
    return { slots: out };
  }

  // ===== кроки =====
  const step = (t, lines, note) => ({ t, l: lines, note });
  function mixedStep(slots, labels) {
    const ms = slots.map((s, i) => ({ s, i })).filter((x) => x.s.mixed);
    if (!ms.length) return null;
    const lines = ms.map(({ s }) => { const sg = s.whole < Z ? "-" : ""; return s.disp + " = " + sg + "(" + babs(s.whole) + "·" + s.md + " + " + s.mn + ")/" + s.md + " = " + fs(s.imp); });
    return step(L("Мішані числа в неправильні дроби", "Mixed numbers to improper fractions"), lines, L("Ціла частина множиться на знаменник, додається чисельник.", "Multiply the whole part by the denominator and add the numerator."));
  }
  function reduceLines(rawF, lines) {
    if (rawF.n === Z) { lines.push(L("Чисельник дорівнює нулю, результат 0.", "The numerator is zero, so the result is 0.")); return { n: Z, d: O }; }
    const red = norm(rawF), g = gcd(rawF.n, rawF.d);
    if (rawF.d === O) return red;
    if (g === O) lines.push(L("НСД(" + babs(rawF.n) + "; " + rawF.d + ") = 1, дріб нескоротний.", "GCD(" + babs(rawF.n) + ", " + rawF.d + ") = 1, so it cannot be reduced."));
    else {
      lines.push(L("НСД(" + babs(rawF.n) + "; " + rawF.d + ") = " + g + ", скорочуємо:", "GCD(" + babs(rawF.n) + ", " + rawF.d + ") = " + g + ", reduce:"));
      lines.push(fs(rawF) + " = " + fs(red));
    }
    return red;
  }
  // одна дія над двома нескороченими вихідними дробами
  function operate(a, op, b) {
    const lines = [];
    const sym = { add: "+", sub: "-", mul: "×", div: "÷" }[op];
    if (op === "div") {
      if (b.n === Z) return { err: L("Ділення на нуль.", "Division by zero.") };
      const inv = norm({ n: b.d, d: b.n });
      lines.push(fs(a) + " ÷ " + fs(b) + " = " + fs(a) + " × " + fs(inv));
      const r = operate(a, "mul", inv);
      return { res: r.res, lines: lines.concat(r.lines) };
    }
    let rawF;
    if (op === "mul") {
      rawF = { n: a.n * b.n, d: a.d * b.d };
      if (a.d === O && b.d === O) lines.push(fs(a) + " × " + par(b.n) + " = " + S(rawF.n));
      else lines.push(fs(a) + " × " + fs(b) + " = (" + par(a.n) + "·" + par(b.n) + ")/(" + a.d + "·" + b.d + ") = " + fs(rawF));
    } else {
      const sign = op === "add" ? O : -O;
      if (a.d === b.d) {
        rawF = { n: a.n + sign * b.n, d: a.d };
        if (a.d === O) lines.push(S(a.n) + " " + sym + " " + par(b.n) + " = " + S(rawF.n));
        else lines.push(fs(a) + " " + sym + " " + fs(b) + " = (" + S(a.n) + " " + sym + " " + par(b.n) + ")/" + a.d + " = " + fs(rawF));
      } else {
        const Lc = lcm(a.d, b.d), k = Lc / a.d, m = Lc / b.d;
        lines.push(L("НСК(" + a.d + "; " + b.d + ") = " + Lc + ". Додаткові множники: " + k + " і " + m + ".", "LCM(" + a.d + ", " + b.d + ") = " + Lc + ". Extra factors: " + k + " and " + m + "."));
        rawF = { n: a.n * k + sign * b.n * m, d: Lc };
        lines.push(fs(a) + " " + sym + " " + fs(b) + " = " + par(a.n) + "·" + k + "/" + Lc + " " + sym + " " + par(b.n) + "·" + m + "/" + Lc + " = (" + S(a.n * k) + " " + sym + " " + par(b.n * m) + ")/" + Lc + " = " + fs(rawF));
      }
    }
    const res = reduceLines(rawF, lines);
    return { res, lines };
  }

  // ===== режими: кожен повертає модель результату =====
  function calcOps() {
    const rs = readSlots("ops", cnt.ops);
    if (rs.err) return { ok: false, msg: rs.err };
    if (rs.incomplete) return { ok: false, incomplete: true, msg: rs.msg };
    const slots = rs.slots, steps = [];
    const ops = [];
    for (let i = 1; i < cnt.ops; i++) ops.push(el("op" + i).value);
    const sym = { add: "+", sub: "-", mul: "×", div: "÷" };
    const exprTxt = slots.map((s, i) => (i ? " " + sym[ops[i - 1]] + " " : "") + s.disp).join("");
    const ms = mixedStep(slots);
    if (ms) steps.push(ms);
    let vals = slots.map((s) => ({ f: s.f, t: s.disp }));
    let oplist = ops.slice();
    const prec = el("order").value === "math" && oplist.some((o) => o === "mul" || o === "div") && oplist.some((o) => o === "add" || o === "sub");
    if (prec) steps.push(step(L("Порядок дій", "Order of operations"), [L("Спочатку виконуємо множення й ділення, потім додавання й віднімання.", "Multiplication and division first, then addition and subtraction.")]));
    let k = 0;
    const doOp = (i) => {
      const a = vals[i], b = vals[i + 1], op = oplist[i];
      const r = operate(a.f, op, b.f);
      if (r.err) return r;
      k++;
      steps.push(step(L("Дія " + k + ": " + a.t + " " + sym[op] + " " + b.t, "Step " + k + ": " + a.t + " " + sym[op] + " " + b.t), r.lines));
      vals.splice(i, 2, { f: r.res, t: fs(r.res) });
      oplist.splice(i, 1);
      return r;
    };
    if (el("order").value === "math") {
      let i = 0;
      while (i < oplist.length) {
        if (oplist[i] === "mul" || oplist[i] === "div") { const r = doOp(i); if (r.err) return { ok: false, msg: r.err }; }
        else i++;
      }
    }
    while (oplist.length) { const r = doOp(0); if (r.err) return { ok: false, msg: r.err }; }
    const res = vals[0].f;
    steps.push(formsStep(res));
    return { ok: true, kind: "single", expr: exprTxt, res, steps };
  }
  function formsStep(f) {
    const lines = [fs(f)];
    if (f.d !== O && babs(f.n) >= f.d) lines.push(L("Мішане число: ", "Mixed number: ") + mixTxt(f));
    if (f.d !== O) { const dc = decimal(f); lines.push(L("Десятковий дріб: ", "Decimal: ") + (dc.exact ? "" : "≈ ") + dc.text); }
    return step(L("Результат у різних формах", "The result in different forms"), lines);
  }
  function calcSim() {
    const r = readSlot("sim", 1);
    if (r.err) return { ok: false, msg: r.err };
    if (r.empty) return { ok: false, incomplete: true, msg: L("Заповніть дріб.", "Fill in the fraction.") };
    const steps = [], ms = mixedStep([r]);
    if (ms) steps.push(ms);
    const start = r.mixed ? r.imp : r.raw || r.f;
    const lines = [];
    if (start.n === Z) { lines.push(L("Чисельник дорівнює нулю, результат 0.", "The numerator is zero, so the result is 0.")); }
    else {
      let a = babs(start.n), b = start.d;
      const e = [];
      let x = a, y = b;
      if (x < y) [x, y] = [y, x];
      while (y !== Z) { e.push(x + " = " + x / y + "·" + y + " + " + (x % y)); [x, y] = [y, x % y]; if (e.length > 60) break; }
      lines.push(L("Алгоритм Евкліда для НСД(" + a + "; " + b + "):", "Euclid's algorithm for GCD(" + a + ", " + b + "):"));
      e.forEach((s) => lines.push(s));
      lines.push(L("НСД = " + x, "GCD = " + x));
      steps.push(step(L("Знаходимо НСД", "Find the GCD"), lines));
      const g = x;
      const red = norm(start);
      const l2 = [];
      if (g === O) l2.push(L("НСД = 1, тому дріб нескоротний.", "The GCD is 1, so the fraction cannot be reduced."));
      else l2.push(fs(start) + " = " + S(babs(start.n) / g * (start.n < Z ? -O : O)) + "/" + S(start.d / g) + (red.d === O ? " = " + red.n : ""), L("Ділимо чисельник і знаменник на " + g + ".", "Divide the numerator and the denominator by " + g + "."));
      steps.push(step(L("Скорочуємо", "Reduce"), l2));
    }
    if (start.n === Z) steps.push(step(L("Результат", "Result"), lines));
    const res = norm(start);
    steps.push(formsStep(res));
    return { ok: true, kind: "single", expr: r.disp, res, steps };
  }
  function calcMix() {
    const r = readSlot("mix", 1);
    if (r.err) return { ok: false, msg: r.err };
    if (r.empty) return { ok: false, incomplete: true, msg: L("Заповніть число.", "Fill in the number.") };
    const steps = [];
    const res = r.f;
    if (r.mixed) {
      const sg = r.whole < Z ? "-" : "";
      steps.push(step(L("Мішане число в неправильний дріб", "Mixed number to improper fraction"), [r.disp + " = " + sg + "(" + babs(r.whole) + "·" + r.md + " + " + r.mn + ")/" + r.md + " = " + fs(r.imp)], L("Ціла частина множиться на знаменник, додається чисельник, знаменник лишається.", "Multiply the whole part by the denominator, add the numerator, keep the denominator.")));
      const red = norm(r.imp);
      if (!eqn(red, r.imp)) { const ls = []; reduceLines(r.imp, ls); steps.push(step(L("Скорочуємо", "Reduce"), ls)); }
    } else {
      const f = r.raw || r.f;
      if (f.d === O || babs(f.n) < f.d) steps.push(step(L("Перевіряємо дріб", "Check the fraction"), [fs(f) + (f.d === O ? L(": ціле число, мішаного запису немає.", ": a whole number, no mixed form.") : L(": правильний дріб (чисельник менший за знаменник), ціла частина дорівнює 0.", ": a proper fraction (the numerator is less than the denominator), the whole part is 0."))]));
      else {
        const nf = norm(f), a = babs(f.n), q = a / f.d, rem = a % f.d, sg = f.n < Z ? "-" : "";
        steps.push(step(L("Неправильний дріб у мішане число", "Improper fraction to mixed number"), [a + " ÷ " + f.d + " = " + q + " " + L("і залишок", "remainder") + " " + rem, sg + a + "/" + f.d + " = " + sg + q + (rem === Z ? "" : " " + rem + "/" + f.d)], L("Цілу частину дає ділення націло, залишок стає чисельником.", "The integer division gives the whole part, the remainder becomes the numerator.")));
        if (!eqn(nf, f)) { const ls = []; reduceLines(f, ls); steps.push(step(L("Скорочуємо", "Reduce"), ls)); }
      }
    }
    steps.push(formsStep(res));
    return { ok: true, kind: "single", expr: r.disp, res, steps };
  }
  function calcCmp() {
    const labels = "ABCDE".split("").slice(0, cnt.cmp);
    const rs = readSlots("cmp", cnt.cmp, labels);
    if (rs.err) return { ok: false, msg: rs.err };
    if (rs.incomplete) return { ok: false, incomplete: true, msg: rs.msg };
    const slots = rs.slots, steps = [];
    const ms = mixedStep(slots);
    if (ms) steps.push(ms);
    const base = slots.map((s) => { const r = s.mixed ? s.imp : s.raw || s.f; return r.d < Z ? { n: -r.n, d: -r.d } : r; });
    const dens = base.map((b) => b.d);
    const Lc = dens.reduce((a, b) => lcm(a, b), O);
    steps.push(step(L("Спільний знаменник", "Common denominator"), [L("НСК(" + dens.join("; ") + ") = " + Lc, "LCM(" + dens.join(", ") + ") = " + Lc)]));
    const conv = base.map((b, i) => ({ i, lab: labels[i], f: b, k: Lc / b.d, num: b.n * (Lc / b.d) }));
    steps.push(step(L("Приводимо дроби до знаменника " + Lc, "Bring the fractions to the denominator " + Lc), conv.map((c) => labels[c.i] + ": " + fs(c.f) + " = " + par(c.f.n) + "·" + c.k + "/" + Lc + " = " + c.num + "/" + Lc), L("Порівнюємо чисельники, бо знаменники однакові.", "The denominators are equal, so compare the numerators.")));
    const asc = el("cmpOrder").value === "asc";
    const sorted = conv.slice().sort((a, b) => (a.num < b.num ? (asc ? -1 : 1) : a.num > b.num ? (asc ? 1 : -1) : a.i - b.i));
    const rel = asc ? "<" : ">";
    let chain = sorted[0].lab, items = [{ lab: sorted[0].lab, f: norm(sorted[0].f) }];
    for (let i = 1; i < sorted.length; i++) { chain += (sorted[i].num === sorted[i - 1].num ? " = " : " " + rel + " ") + sorted[i].lab; items.push({ lab: sorted[i].lab, f: norm(sorted[i].f), rel: sorted[i].num === sorted[i - 1].num ? "=" : rel }); }
    const chainVals = sorted.map((c, i) => (i ? (c.num === sorted[i - 1].num ? " = " : " " + rel + " ") : "") + fs(norm(c.f))).join("");
    steps.push(step(L(asc ? "Розташовуємо за зростанням" : "Розташовуємо за спаданням", asc ? "Order from smallest to largest" : "Order from largest to smallest"), [chain, chainVals]));
    return { ok: true, kind: "cmp", items, steps, chainVals, chain };
  }
  function calcLcd() {
    const labels = "ABCDEF".split("").slice(0, cnt.lcd);
    const rs = readSlots("lcd", cnt.lcd, labels);
    if (rs.err) return { ok: false, msg: rs.err };
    if (rs.incomplete) return { ok: false, incomplete: true, msg: rs.msg };
    const slots = rs.slots, steps = [];
    const ms = mixedStep(slots);
    if (ms) steps.push(ms);
    const base = slots.map((s) => { const r = s.mixed ? s.imp : s.raw || s.f; return r.d < Z ? { n: -r.n, d: -r.d } : r; });
    const Lc = base.reduce((a, b) => lcm(a, b.d), O);
    steps.push(step(L("Спільний знаменник", "Common denominator"), [L("НСК(" + base.map((b) => b.d).join("; ") + ") = " + Lc, "LCM(" + base.map((b) => b.d).join(", ") + ") = " + Lc)], L("Найменше спільне кратне знаменників.", "The least common multiple of the denominators.")));
    const out = base.map((b, i) => ({ lab: labels[i], f: b, k: Lc / b.d, num: b.n * (Lc / b.d) }));
    steps.push(step(L("Додаткові множники й нові чисельники", "Extra factors and new numerators"), out.map((c) => c.lab + ": " + fs(c.f) + " = " + par(c.f.n) + "·" + c.k + "/" + Lc + " = " + c.num + "/" + Lc)));
    return { ok: true, kind: "lcd", Lc, out, steps };
  }
  function calcDec() {
    const dir = el("dir").value;
    const steps = [];
    if (dir === "fr2dec") {
      const r = readSlot("dec", 1);
      if (r.err) return { ok: false, msg: r.err };
      if (r.empty) return { ok: false, incomplete: true, msg: L("Заповніть дріб.", "Fill in the fraction.") };
      const ms = mixedStep([r]);
      if (ms) steps.push(ms);
      const f = r.f, dc = decimal(f);
      const a = babs(f.n), ip = a / f.d;
      const ls = [a + " ÷ " + f.d + " = " + ip + (a % f.d === Z ? "" : " " + L("і залишок", "remainder") + " " + (a % f.d))];
      if (a % f.d !== Z) {
        ls.push(L("Дописуємо нулі до остачі й ділимо далі:", "Append zeros to the remainder and keep dividing:"));
        ls.push(fs(f) + " = " + dc.text);
        ls.push(dc.periodic ? L("Остача повторилась, тому цифри (" + dc.per + ") повторюються: це період.", "A remainder repeated, so the digits (" + dc.per + ") repeat: this is the period.") : dc.exact ? L("Остача стала нульовою, тому десятковий дріб скінченний.", "The remainder became zero, so the decimal terminates.") : L("Період довший за 1000 цифр, показано 10 знаків.", "The period is longer than 1000 digits, 10 places are shown."));
      } else ls.push(L("Ділиться націло, десяткової частини немає.", "It divides exactly, there is no fractional part."));
      steps.push(step(L("Ділимо чисельник на знаменник", "Divide the numerator by the denominator"), ls));
      return { ok: true, kind: "single", expr: r.disp, res: f, steps: steps.concat([formsStep(f)]) };
    }
    const t = raw("dec_in").replace(/\s+/g, "");
    if (!t) return { ok: false, incomplete: true, msg: L("Введіть десятковий дріб.", "Enter a decimal.") };
    const m = /^([+-]?)(\d*)(?:[.,](\d*)(?:\((\d+)\))?)?$/.exec(t);
    if (!m || (!m[2] && !m[3] && !m[4])) return { ok: false, msg: L("Формат: 0,75 або 0,(3) або 1,2(34).", "Format: 0.75 or 0.(3) or 1.2(34).") };
    const [, sg, ip0, a0 = "", p0 = ""] = m;
    const ip = ip0 || "0";
    if ((ip + a0 + p0).length > 1100) return { ok: false, msg: L("Не більше 1100 цифр.", "At most 1100 digits.") };
    const neg = sg === "-";
    const N0 = BigInt(ip + a0), den0 = 10n ** BigInt(a0.length);
    let rawF, ls = [];
    const shown = (neg ? "-" : "") + ip + (a0 || p0 ? SEP + a0 + (p0 ? "(" + p0 + ")" : "") : "");
    if (!p0) {
      rawF = { n: N0, d: den0 };
      ls.push(shown + " = " + (neg ? "-" : "") + N0 + "/" + den0, L("Знаменник це 1 з такою кількістю нулів, скільки цифр після коми.", "The denominator is 1 followed by as many zeros as there are digits after the point."));
    } else {
      const N1 = BigInt(ip + a0 + p0);
      rawF = { n: N1 - N0, d: (10n ** BigInt(p0.length) - O) * den0 };
      ls.push(L("Число з періодом: " + N1 + ", без періоду: " + N0 + ".", "With the period: " + N1 + ", without it: " + N0 + "."), shown + " = (" + N1 + " - " + N0 + ")/" + rawF.d + " = " + (neg ? "-" : "") + rawF.n + "/" + rawF.d, L("Знаменник: стільки дев'яток, скільки цифр у періоді, і стільки нулів, скільки цифр між комою й періодом.", "The denominator has as many nines as the period has digits, followed by as many zeros as there are digits between the point and the period."));
    }
    if (neg) rawF.n = -rawF.n;
    steps.push(step(L("Записуємо десятковий дріб звичайним", "Write the decimal as a fraction"), ls));
    const rl = [];
    const res = reduceLines(rawF, rl);
    steps.push(step(L("Скорочуємо", "Reduce"), rl));
    steps.push(formsStep(res));
    return { ok: true, kind: "single", expr: shown, res, steps };
  }
  const CALC = { ops: calcOps, sim: calcSim, mix: calcMix, cmp: calcCmp, dec: calcDec, lcd: calcLcd };

  // ===== відображення =====
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const vf = (f) => (f.d === O ? '<span class="frc__int">' + S(f.n) + "</span>" : '<span class="frc__f"><span class="frc__fn">' + S(f.n) + '</span><span class="frc__fd">' + S(f.d) + "</span></span>");
  const vmix = (f) => { const m = mixParts(f); return '<span class="frc__mx">' + (m.neg ? "-" : "") + '<span class="frc__int">' + m.w + "</span>" + vf({ n: m.r, d: m.d }) + "</span>"; };
  function formsHtml(f) {
    let h = vf(f);
    if (f.d !== O && babs(f.n) > f.d) h += '<span class="frc__eq">=</span>' + vmix(f);
    if (f.d !== O) { const dc = decimal(f); h += '<span class="frc__eq">' + (dc.exact ? "=" : "≈") + '</span><span class="frc__dec">' + esc(dc.text) + "</span>"; }
    return h;
  }
  function stepsHtml(steps) {
    return '<div class="frc__sub">' + L("Розв'язання", "Solution") + '</div>' + steps.map((s, i) => '<div class="frc__step"><span class="frc__stepN">' + (i + 1) + '</span><div><b class="frc__stepT">' + esc(s.t) + "</b>" + s.l.map((x) => '<p class="frc__math">' + esc(x) + "</p>").join("") + (s.note ? '<p class="frc__stepNote">' + esc(s.note) + "</p>" : "") + "</div></div>").join("");
  }
  function headHtml(m) {
    if (m.kind === "single") return '<div class="frc__rhead"><div class="frc__expr">' + esc(m.expr) + '</div><div class="frc__forms">' + formsHtml(m.res) + "</div></div>";
    if (m.kind === "cmp") return '<div class="frc__rhead"><div class="frc__expr">' + L("Порядок", "Order") + '</div><div class="frc__forms frc__forms--chain">' + m.items.map((it, i) => (i ? '<span class="frc__eq">' + it.rel + "</span>" : "") + '<span class="frc__ci"><b>' + it.lab + "</b>" + vf(it.f) + "</span>").join("") + "</div></div>";
    return '<div class="frc__rhead"><div class="frc__expr">' + L("Спільний знаменник", "Common denominator") + ": " + S(m.Lc) + '</div><div class="frc__forms frc__forms--chain">' + m.out.map((c, i) => '<span class="frc__ci"><b>' + c.lab + "</b>" + vf(c.f) + '<span class="frc__eq">=</span>' + vf({ n: c.num, d: m.Lc }) + "</span>").join("") + "</div></div>";
  }
  function textOf(m) {
    let head;
    if (m.kind === "single") { const f = m.res; head = (m.expr === fs(f) ? m.expr : m.expr + " = " + fs(f)) + (f.d !== O && babs(f.n) > f.d && mixParts(f).r !== Z ? " = " + mixTxt(f) : "") + (f.d !== O ? (decimal(f).exact ? " = " : " ≈ ") + decimal(f).text : ""); }
    else if (m.kind === "cmp") head = m.chain + "  (" + m.chainVals + ")";
    else head = L("Спільний знаменник ", "Common denominator ") + S(m.Lc) + ": " + m.out.map((c) => c.lab + " = " + c.num + "/" + m.Lc).join(", ");
    return [head, ""].concat(m.steps.map((s, i) => (i + 1) + ". " + s.t + "\n   " + s.l.join("\n   "))).join("\n");
  }

  let last = null;
  function render(m, strict) {
    const box = el("result");
    if (!m.ok) {
      last = null;
      box.innerHTML = m.incomplete && !strict ? T.enter : '<div class="frc__hintbox">' + esc(m.msg || T.enter) + "</div>";
      return;
    }
    last = m;
    box.innerHTML = headHtml(m) + stepsHtml(m.steps) + '<div class="frc__note">' + L("Усі обчислення точні (довгі цілі числа без округлення). Дріб скорочується до нескоротного.", "All calculations are exact (long integers, no rounding). The fraction is reduced to lowest terms.") + "</div>";
  }
  function calc(strict) { render(CALC[mode](), strict === true); }
  // авто-розрахунок вимикається чекбоксом; кнопка «Розрахувати» й «Приклад» рахують завжди
  const autoOn = () => !el("autoCalc") || el("autoCalc").checked;
  function maybeCalc() { if (autoOn()) calc(); else render({ ok: false, incomplete: true }, false); }

  // ===== слоти: побудова й керування =====
  function slotHtml(m, i, label) {
    const id = (k) => sid(m, i, k);
    return '<div class="frc__fr" id="' + SLOT_PFX[m] + i + '_box">' + (label ? '<span class="frc__lab">' + label + "</span>" : "") +
      '<input class="frc__w" id="' + id("w") + '" type="text" inputmode="numeric" autocomplete="off" placeholder="0" aria-label="' + L("Ціле", "Whole") + " " + i + '">' +
      '<div class="frc__frac"><input class="frc__n" id="' + id("n") + '" type="text" inputmode="numeric" autocomplete="off" placeholder="3" aria-label="' + L("Чисельник", "Numerator") + " " + i + '"><span class="frc__bar"></span><input class="frc__d" id="' + id("d") + '" type="text" inputmode="numeric" autocomplete="off" placeholder="4" aria-label="' + L("Знаменник", "Denominator") + " " + i + '"></div></div>';
  }
  const opHtml = (i) => '<select class="frc__op" id="op' + i + '" aria-label="' + L("Дія", "Operation") + '"><option value="add">+</option><option value="sub">−</option><option value="mul">×</option><option value="div">÷</option></select>';
  function buildSlots() {
    MODES.forEach((m) => {
      const host = el("slots_" + m);
      if (!host) return;
      const max = CFG[m].max;
      let h = "";
      for (let i = 1; i <= max; i++) {
        const label = m === "cmp" ? "ABCDE"[i - 1] : m === "lcd" ? "ABCDEF"[i - 1] : "";
        if (m === "ops" && i > 1) h += opHtml(i - 1);
        h += slotHtml(m, i, label);
      }
      host.innerHTML = h;
    });
  }
  function syncSlots() {
    ["ops", "cmp", "lcd"].forEach((m) => {
      for (let i = 1; i <= CFG[m].max; i++) {
        el(SLOT_PFX[m] + i + "_box").hidden = i > cnt[m];
        if (m === "ops" && i > 1) el("op" + (i - 1)).hidden = i > cnt[m];
      }
      const add = el("add_" + m), rm = el("rm_" + m);
      if (add) add.disabled = cnt[m] >= CFG[m].max;
      if (rm) rm.disabled = cnt[m] <= CFG[m].min;
      const c = el("cnt_" + m);
      if (c) c.textContent = cnt[m];
    });
    el("decFr").hidden = el("dir").value !== "fr2dec";
    el("decIn").hidden = el("dir").value !== "dec2fr";
  }
  function setMode(m) {
    mode = m;
    document.querySelectorAll(".frc__tab").forEach((b) => {
      const on = b.dataset.m === m;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-selected", String(on));
    });
    MODES.forEach((x) => (el("panel_" + x).hidden = x !== m));
    syncSlots();
    maybeCalc();
  }

  // ===== випадні списки =====
  function setDd(hid, v) {
    const pre = DDP[hid], lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
  }
  function initDd(pre, onPick) {
    const btn = el(pre + "_btn"), list = el(pre + "_list");
    const items = () => Array.from(list.querySelectorAll("li"));
    const close = (focusBtn) => { list.hidden = true; btn.setAttribute("aria-expanded", "false"); if (focusBtn) btn.focus(); };
    const open = () => { list.hidden = false; btn.setAttribute("aria-expanded", "true"); (items().find((li) => li.getAttribute("aria-selected") === "true") || items()[0]).focus(); };
    btn.addEventListener("click", (e) => { e.stopPropagation(); if (list.hidden) open(); else close(); });
    btn.addEventListener("keydown", (e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); open(); } });
    const pick = (li) => { onPick(li.dataset.v); close(true); };
    list.addEventListener("click", (e) => { const li = e.target.closest("li[data-v]"); if (li) pick(li); });
    list.addEventListener("keydown", (e) => {
      const all = items(), i = all.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); all[Math.min(all.length - 1, i + 1)].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); all[Math.max(0, i - 1)].focus(); }
      else if ((e.key === "Enter" || e.key === " ") && i >= 0) { e.preventDefault(); pick(all[i]); }
      else if (e.key === "Escape") { e.preventDefault(); close(true); }
      else if (e.key === "Tab") close();
    });
    document.addEventListener("click", (e) => { if (!e.target.closest("#" + pre + "_dd")) close(); });
  }

  // ===== кнопки: приклад, скидання, посилання, копіювання =====
  function toast(msg) {
    const n = el("toast");
    if (!n) return;
    n.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (n.textContent = ""), 2600);
  }
  const allInputs = () => Array.from(document.querySelectorAll(".frc input[type=text]"));
  function setSlot(m, i, w, n, d) { el(sid(m, i, "w")).value = w || ""; el(sid(m, i, "n")).value = n || ""; el(sid(m, i, "d")).value = d || ""; }
  function resetAll() {
    allInputs().forEach((x) => (x.value = ""));
    document.querySelectorAll(".frc select.frc__op").forEach((s) => (s.value = "add"));
    cnt.ops = CFG.ops.start; cnt.cmp = CFG.cmp.start; cnt.lcd = CFG.lcd.start;
    setDd("order", "math"); setDd("cmpOrder", "asc"); setDd("dir", "dec2fr");
    syncSlots();
    maybeCalc();
  }
  const EXAMPLES = {
    ops: () => { cnt.ops = 3; syncSlots(); setSlot("ops", 1, "", "1", "2"); setSlot("ops", 2, "", "2", "3"); setSlot("ops", 3, "", "3", "4"); el("op1").value = "add"; el("op2").value = "mul"; },
    sim: () => setSlot("sim", 1, "", "48", "18"),
    mix: () => setSlot("mix", 1, "2", "3", "5"),
    cmp: () => { cnt.cmp = 3; syncSlots(); setSlot("cmp", 1, "", "3", "4"); setSlot("cmp", 2, "", "5", "6"); setSlot("cmp", 3, "", "9", "12"); },
    dec: () => { setDd("dir", "dec2fr"); syncSlots(); el("dec_in").value = "0,58(3)".replace(",", SEP); },
    lcd: () => { cnt.lcd = 3; syncSlots(); setSlot("lcd", 1, "", "5", "6"); setSlot("lcd", 2, "", "3", "8"); setSlot("lcd", 3, "", "7", "12"); }
  };
  function fillExample() {
    resetAll();
    EXAMPLES[mode]();
    syncSlots();
    calc(true);
    toast(T.example);
  }
  function share() {
    const p = new URLSearchParams();
    p.set("m", mode);
    p.set("od", el("order").value); p.set("co", el("cmpOrder").value); p.set("dr", el("dir").value);
    ["ops", "cmp", "lcd"].forEach((m) => p.set("n" + SLOT_PFX[m], cnt[m]));
    allInputs().forEach((x) => x.value.trim() && p.set(x.id, x.value.trim()));
    document.querySelectorAll(".frc select.frc__op").forEach((s) => s.value !== "add" && p.set(s.id, s.value));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    if (![...q.keys()].length) return false;
    if (MODES.includes(q.get("m"))) mode = q.get("m");
    if (["math", "left"].includes(q.get("od"))) setDd("order", q.get("od"));
    if (["asc", "desc"].includes(q.get("co"))) setDd("cmpOrder", q.get("co"));
    if (["dec2fr", "fr2dec"].includes(q.get("dr"))) setDd("dir", q.get("dr"));
    ["ops", "cmp", "lcd"].forEach((m) => { const v = Number(q.get("n" + SLOT_PFX[m])); if (Number.isInteger(v) && v >= CFG[m].min && v <= CFG[m].max) cnt[m] = v; });
    allInputs().forEach((x) => { if (q.has(x.id)) x.value = q.get(x.id).slice(0, 1200); });
    document.querySelectorAll(".frc select.frc__op").forEach((s) => { if (["add", "sub", "mul", "div"].includes(q.get(s.id))) s.value = q.get(s.id); });
    return true;
  }
  async function copyResult() {
    if (!last) { toast(T.calcFirst); return; }
    try { await navigator.clipboard.writeText(textOf(last)); toast(T.copied); } catch { toast(T.copyFailed); }
  }

  window.addEventListener("DOMContentLoaded", () => {
    buildSlots();
    document.querySelectorAll(".frc__tab").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.m)));
    ["ops", "cmp", "lcd"].forEach((m) => {
      el("add_" + m).addEventListener("click", () => { if (cnt[m] < CFG[m].max) { cnt[m]++; syncSlots(); maybeCalc(); } });
      el("rm_" + m).addEventListener("click", () => { if (cnt[m] > CFG[m].min) { cnt[m]--; syncSlots(); maybeCalc(); } });
    });
    initDd("od", (v) => { setDd("order", v); maybeCalc(); });
    initDd("co", (v) => { setDd("cmpOrder", v); maybeCalc(); });
    initDd("dr", (v) => { setDd("dir", v); syncSlots(); maybeCalc(); });
    document.querySelector(".frc").addEventListener("input", (e) => { if (e.target.matches("input[type=text]")) maybeCalc(); });
    document.querySelector(".frc").addEventListener("change", (e) => { if (e.target.matches("select.frc__op")) maybeCalc(); });
    document.querySelector(".frc").addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("input[type=text]")) calc(true); });
    el("calcBtn").addEventListener("click", () => { const m = CALC[mode](); render(m, true); if (!m.ok && m.msg) toast(m.msg); });
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => { resetAll(); toast(T.reset); });
    el("shareBtn").addEventListener("click", share);
    el("copyBtn").addEventListener("click", copyResult);
    const used = applyFromUrl();
    setMode(mode);
    if (!used) render({ ok: false, incomplete: true }, false);
  });
})();
