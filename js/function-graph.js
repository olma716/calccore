/* function-graph.js — графік функції: до 6 функцій y = f(x), масштаб і переміщення мишею та пальцем, нулі, екстремуми, перетини, таблиця значень, дотична й нормаль (UK/EN)
   Вираз розбирається власним парсером (без eval): + − * / ^, неявне множення (2x, 3(x+1)), функції sin cos tan cot asin acos atan sinh cosh tanh ln lg log2 exp sqrt cbrt abs sign floor ceil, константи π та e.
   Похідна знаходиться символьно (правила диференціювання з винесенням спрощень), для раціональних x₀ і поліномів чи дробів дотична записується точно. Нулі, екстремуми й перетини — числово (сканування + бісекція) з вгадуванням точного вигляду (дріб, π, √n). */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const SEP = IS_EN ? "." : ",";
  const NB = " ";
  const MODES = ["gr", "an", "tb", "tg"];
  const MAXF = 6;
  const COLORS = ["#2f6fe0", "#d85a30", "#2f9d6a", "#8a4fd0", "#d19a00", "#d6336c"];
  let mode = "gr";

  const T = {
    copied: L("Результат скопійовано ✅", "Result copied ✅"),
    copyFailed: L("Не вдалось скопіювати 😕", "Could not copy 😕"),
    linkCopied: L("Посилання скопійовано ✅", "Link copied ✅"),
    reset: L("Скинуто ✅", "Reset ✅"),
    example: L("Підставлено приклад ✅", "Example filled in ✅"),
    calcFirst: L("Спочатку введіть функцію.", "Enter a function first."),
    saved: L("Малюнок збережено ✅", "Image saved ✅")
  };

  // ===== раціональні числа на BigInt =====
  const Z = 0n, O = 1n;
  const babs = (x) => (x < Z ? -x : x);
  const gcdB = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };
  const q = (n, d = O) => { if (d < Z) { n = -n; d = -d; } const g = gcdB(n, d) || O; return { n: n / g, d: d / g }; };
  const qadd = (x, y) => q(x.n * y.d + y.n * x.d, x.d * y.d);
  const qsub = (x, y) => q(x.n * y.d - y.n * x.d, x.d * y.d);
  const qmul = (x, y) => q(x.n * y.n, x.d * y.d);
  const qdiv = (x, y) => q(x.n * y.d, x.d * y.n);
  const qneg = (x) => ({ n: -x.n, d: x.d });
  const qisZ = (x) => x.n === Z;
  const qdbl = (x) => Number(x.n) / Number(x.d);
  const exactDec = (x) => (x.n * 10n ** 12n) % x.d === Z;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function qdec(x, nd) {
    const ng = x.n < Z, a = babs(x.n), sc = 10n ** BigInt(nd), v = (a * sc * 2n + x.d) / (2n * x.d), s = v.toString().padStart(nd + 1, "0");
    const ip = s.slice(0, s.length - nd), fr = s.slice(s.length - nd).replace(/0+$/, "");
    return (ng && v !== Z ? "-" : "") + ip + (fr ? SEP + fr : "");
  }
  const nfq = (x) => (x.d === O ? String(x.n) : exactDec(x) ? qdec(x, 12) : x.n + "/" + x.d);
  function dbl(x, nd) {
    if (!Number.isFinite(x)) return "—";
    if (Math.abs(x) >= 1e15 || (x !== 0 && Math.abs(x) < 1e-9)) return x.toExponential(Math.min(nd, 6)).replace(".", SEP).replace("e", "·10^").replace("^+", "^");
    const s = x.toFixed(nd).replace(/\.?0+$/, "");
    return (s === "-0" ? "0" : s).replace(".", SEP) || "0";
  }
  const ND = () => Number(el("decs").value) || 4;
  const gcdN = (a, b) => (b ? gcdN(b, a % b) : Math.abs(a));

  // ===== розбір виразу =====
  class PErr extends Error {}
  const FN_ALIAS = { sin: "sin", cos: "cos", tan: "tan", tg: "tan", cot: "cot", ctg: "cot", cotan: "cot", asin: "asin", arcsin: "asin", acos: "acos", arccos: "acos", atan: "atan", arctan: "atan", arctg: "atan", sinh: "sinh", sh: "sinh", cosh: "cosh", ch: "cosh", tanh: "tanh", th: "tanh", ln: "ln", lg: "lg", log: "lg", lb: "lb", exp: "exp", sqrt: "sqrt", cbrt: "cbrt", abs: "abs", sign: "sign", sgn: "sign", floor: "floor", ceil: "ceil" };
  const NAMES = Object.keys(FN_ALIAS).concat(["pi", "x", "e"]).sort((a, b) => b.length - a.length);
  const TRIG = ["sin", "cos", "tan", "cot"], ITRIG = ["asin", "acos", "atan"];
  function tokenize(src) {
    let s = String(src).replace(/[−–—]/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/\*\*/g, "^").replace(/²/g, "^2").replace(/³/g, "^3").replace(/√/g, "sqrt").replace(/[хХ]/g, "x").replace(/π/g, "pi").replace(/log10/gi, "lg").replace(/log2/gi, "lb").toLowerCase();
    const t = []; let i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === " ") { i++; continue; }
      if (/[0-9.,]/.test(c)) {
        const m = s.slice(i).match(/^(\d+([.,]\d+)?|[.,]\d+)/);
        if (!m) throw new PErr(L("Некоректне число біля «" + s.slice(i, i + 6) + "».", "Invalid number near “" + s.slice(i, i + 6) + "”."));
        const str = m[0].replace(",", "."), [ip, fp = ""] = str.split(".");
        if (str.length > 24) throw new PErr(L("Занадто довге число.", "The number is too long."));
        t.push({ k: "n", q: q(BigInt((ip || "0") + fp), 10n ** BigInt(fp.length)) }); i += m[0].length; continue;
      }
      if (/[a-z]/.test(c)) {
        const m = s.slice(i).match(/^[a-z]+/)[0]; let p = 0;
        while (p < m.length) {
          const nm = NAMES.find((n) => m.startsWith(n, p));
          if (!nm) { const bad = m.slice(p); throw new PErr(bad[0] === "y" ? L("Використовуйте лише змінну x: «y» тут не підтримується.", "Use only the variable x: “y” is not supported here.") : L("Невідоме слово «" + bad + "».", "Unknown word “" + bad + "”.")); }
          if (nm === "x") t.push({ k: "x" }); else if (nm === "pi" || nm === "e") t.push({ k: "c", n: nm }); else t.push({ k: "f", n: FN_ALIAS[nm] });
          p += nm.length;
        }
        i += m.length; continue;
      }
      if ("+-*/^".includes(c)) { t.push({ k: "op", v: c }); i++; continue; }
      if (c === "(") { t.push({ k: "(" }); i++; continue; }
      if (c === ")") { t.push({ k: ")" }); i++; continue; }
      if (c === "|") { t.push({ k: "|" }); i++; continue; }
      if (c === "=") throw new PErr(L("Символ «=» тут зайвий: введіть лише вираз після y =.", "The “=” sign is not needed: enter just the expression after y =."));
      throw new PErr(L("Невідомий символ «" + c + "».", "Unknown symbol “" + c + "”."));
    }
    return t;
  }
  const mkN = (v) => ({ t: "n", q: typeof v === "number" ? q(BigInt(v)) : v });
  const C_PI = { t: "c", n: "pi" };
  function parse(src) {
    const tk = tokenize(src); let p = 0;
    const peek = () => tk[p], eat = () => tk[p++];
    const startsPrimary = (x) => x && (x.k === "n" || x.k === "x" || x.k === "c" || x.k === "f" || x.k === "(" || (x.k === "|" && !absOpen.length));
    const absOpen = [];
    function expr() {
      let a = term();
      for (;;) {
        const o = peek();
        if (o && o.k === "op" && (o.v === "+" || o.v === "-")) { eat(); const b = term(); a = { t: o.v, a, b }; } else break;
      }
      return a;
    }
    function term() {
      let a = unary();
      for (;;) {
        const o = peek();
        if (o && o.k === "op" && (o.v === "*" || o.v === "/")) { eat(); const b = unary(); a = { t: o.v, a, b }; }
        else if (startsPrimary(o) && o.k !== "|") {
          if (o.k === "n" && a.t === "n") throw new PErr(L("Між числами пропущено знак дії (десяткову частину пишіть через кому чи крапку: 1,5).", "An operator is missing between the numbers (write decimals with a comma or a point: 1.5)."));
          const b = unary(); a = { t: "*", a, b };
        }
        else break;
      }
      return a;
    }
    function unary() {
      const o = peek();
      if (o && o.k === "op" && (o.v === "-" || o.v === "+")) { eat(); const a = unary(); return o.v === "-" ? { t: "neg", a } : a; }
      return power();
    }
    function power() {
      const a = primary(), o = peek();
      if (o && o.k === "op" && o.v === "^") { eat(); const b = unary(); return { t: "^", a, b }; }
      return a;
    }
    function primary() {
      const o = eat();
      if (!o) throw new PErr(L("Вираз обривається: чогось не вистачає в кінці.", "The expression ends too early."));
      if (o.k === "n") return { t: "n", q: o.q };
      if (o.k === "x") return { t: "x" };
      if (o.k === "c") return { t: "c", n: o.n };
      if (o.k === "(") {
        const a = expr();
        if (!peek() || peek().k !== ")") throw new PErr(L("Не вистачає закритої дужки «)».", "A closing parenthesis “)” is missing."));
        eat(); return a;
      }
      if (o.k === "|") {
        absOpen.push(1); const a = expr(); absOpen.pop();
        if (!peek() || peek().k !== "|") throw new PErr(L("Не вистачає закриваючої риски «|».", "A closing bar “|” is missing."));
        eat(); return { t: "f", n: "abs", a };
      }
      if (o.k === "f") {
        let arg;
        const nx = peek();
        if (nx && nx.k === "(") { eat(); arg = expr(); if (!peek() || peek().k !== ")") throw new PErr(L("Не вистачає закритої дужки «)».", "A closing parenthesis “)” is missing.")); eat(); }
        else {
          if (!nx || !(nx.k === "n" || nx.k === "x" || nx.k === "c" || nx.k === "f" || (nx.k === "op" && (nx.v === "-" || nx.v === "+")))) throw new PErr(L("Після «" + o.n + "» потрібен аргумент.", "“" + o.n + "” needs an argument."));
          arg = power();
          for (;;) { const m = peek(); if (m && (m.k === "n" || m.k === "x" || m.k === "c")) arg = { t: "*", a: arg, b: power() }; else break; }
        }
        return { t: "f", n: o.n, a: arg };
      }
      if (o.k === ")") throw new PErr(L("Зайва закрита дужка «)».", "An extra closing parenthesis “)”."));
      if (o.k === "op") throw new PErr(L("Очікувалось число чи змінна після «" + o.v + "».", "A number or variable is expected after “" + o.v + "”."));
      throw new PErr(L("Некоректний вираз.", "Invalid expression."));
    }
    const ast = expr();
    if (p < tk.length) { const o = tk[p]; throw new PErr(o.k === ")" ? L("Зайва закрита дужка «)».", "An extra closing parenthesis “)”.") : L("Неочікуваний фрагмент у виразі.", "Unexpected part of the expression.")); }
    return ast;
  }
  // режим градусів: sin(u) → sin(u·π/180), asin(u) → 180·asin(u)/π
  function degify(a) {
    if (!a || typeof a !== "object") return a;
    const r = { ...a };
    if (a.a) r.a = degify(a.a);
    if (a.b) r.b = degify(a.b);
    if (a.t === "f" && TRIG.includes(a.n)) r.a = { t: "*", a: r.a, b: { t: "/", a: C_PI, b: mkN(180) } };
    if (a.t === "f" && ITRIG.includes(a.n)) return { t: "/", a: { t: "*", a: mkN(180), b: r }, b: C_PI };
    return r;
  }
  const hasX = (a) => a.t === "x" || (a.t !== "n" && a.t !== "c" && (hasX2(a.a) || (a.b ? hasX2(a.b) : false)));
  const hasX2 = (a) => (a ? hasX(a) : false);

  // ===== обчислення =====
  function powr(a, b) {
    if (a >= 0 || Number.isInteger(b)) return Math.pow(a, b);
    for (let d = 1; d <= 25; d += 2) { const p = Math.round(b * d); if (Math.abs(b * d - p) < 1e-9) return (Math.abs(p) % 2 === 1 ? -1 : 1) * Math.pow(-a, b); }
    return NaN;
  }
  const FNS = { sin: Math.sin, cos: Math.cos, tan: Math.tan, cot: (u) => 1 / Math.tan(u), asin: Math.asin, acos: Math.acos, atan: Math.atan, sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, ln: (u) => (u > 0 ? Math.log(u) : NaN), lg: (u) => (u > 0 ? Math.log10(u) : NaN), lb: (u) => (u > 0 ? Math.log2(u) : NaN), exp: Math.exp, sqrt: (u) => (u >= 0 ? Math.sqrt(u) : NaN), cbrt: Math.cbrt, abs: Math.abs, sign: Math.sign, floor: Math.floor, ceil: Math.ceil };
  function compile(a) {
    switch (a.t) {
      case "n": { const v = qdbl(a.q); return () => v; }
      case "x": return (x) => x;
      case "c": { const v = a.n === "pi" ? Math.PI : Math.E; return () => v; }
      case "neg": { const f = compile(a.a); return (x) => -f(x); }
      case "+": { const f = compile(a.a), g = compile(a.b); return (x) => f(x) + g(x); }
      case "-": { const f = compile(a.a), g = compile(a.b); return (x) => f(x) - g(x); }
      case "*": { const f = compile(a.a), g = compile(a.b); return (x) => f(x) * g(x); }
      case "/": { const f = compile(a.a), g = compile(a.b); return (x) => f(x) / g(x); }
      case "^": { const f = compile(a.a), g = compile(a.b); return (x) => powr(f(x), g(x)); }
      default: { const f = compile(a.a), h = FNS[a.n]; return (x) => h(f(x)); }
    }
  }
  const ipow = (b, e) => { let r = q(1n), base = e < 0 ? q(b.d, b.n) : b; for (let i = 0; i < Math.abs(e); i++) r = qmul(r, base); return r; };
  function evalQ(a, xq) { // точне значення при раціональному x (поліноми й дроби) або null
    switch (a.t) {
      case "n": return a.q;
      case "x": return xq;
      case "neg": { const v = evalQ(a.a, xq); return v && qneg(v); }
      case "+": case "-": case "*": case "/": {
        const u = evalQ(a.a, xq), w = evalQ(a.b, xq);
        if (!u || !w) return null;
        if (a.t === "+") return qadd(u, w);
        if (a.t === "-") return qsub(u, w);
        if (a.t === "*") return qmul(u, w);
        return qisZ(w) ? null : qdiv(u, w);
      }
      case "^": {
        const u = evalQ(a.a, xq), w = evalQ(a.b, xq);
        if (!u || !w || w.d !== O || babs(w.n) > 60n) return null;
        if (qisZ(u) && w.n <= Z) return null;
        return ipow(u, Number(w.n));
      }
      default: return null;
    }
  }

  // ===== похідна =====
  const isN = (a) => a.t === "n", isNv = (a, v) => a.t === "n" && a.q.d === O && a.q.n === BigInt(v);
  const mNeg = (a) => (isN(a) ? mkN(qneg(a.q)) : a.t === "neg" ? a.a : { t: "neg", a });
  const mAdd = (a, b) => (isN(a) && isN(b) ? mkN(qadd(a.q, b.q)) : isNv(a, 0) ? b : isNv(b, 0) ? a : b.t === "neg" ? { t: "-", a, b: b.a } : { t: "+", a, b });
  const mSub = (a, b) => (isN(a) && isN(b) ? mkN(qsub(a.q, b.q)) : isNv(b, 0) ? a : isNv(a, 0) ? mNeg(b) : { t: "-", a, b });
  function mMul(a, b) {
    if (isNv(a, 0) || isNv(b, 0)) return mkN(0);
    if (isNv(a, 1)) return b;
    if (isNv(b, 1)) return a;
    if (isN(a) && isN(b)) return mkN(qmul(a.q, b.q));
    if (a.t === "neg") return mNeg(mMul(a.a, b));
    if (b.t === "neg") return mNeg(mMul(a, b.a));
    if (isN(b) && !isN(a)) return mMul(b, a);
    if (isN(a) && b.t === "*" && isN(b.a)) return mMul(mkN(qmul(a.q, b.a.q)), b.b);
    if (isN(a) && isNv(a, -1)) return mNeg(b);
    return { t: "*", a, b };
  }
  const mDiv = (a, b) => (isNv(a, 0) ? mkN(0) : isNv(b, 1) ? a : isN(a) && isN(b) && !qisZ(b.q) ? mkN(qdiv(a.q, b.q)) : { t: "/", a, b });
  const mPow = (a, b) => (isNv(b, 0) ? mkN(1) : isNv(b, 1) ? a : isNv(a, 1) ? mkN(1) : isN(a) && isN(b) && b.q.d === O && babs(b.q.n) <= 20n && !(qisZ(a.q) && b.q.n < Z) ? mkN(ipow(a.q, Number(b.q.n))) : { t: "^", a, b });
  const mF = (n, a) => ({ t: "f", n, a });
  function deriv(a) {
    switch (a.t) {
      case "n": case "c": return mkN(0);
      case "x": return mkN(1);
      case "neg": return mNeg(deriv(a.a));
      case "+": return mAdd(deriv(a.a), deriv(a.b));
      case "-": return mSub(deriv(a.a), deriv(a.b));
      case "*": return mAdd(mMul(deriv(a.a), a.b), mMul(a.a, deriv(a.b)));
      case "/": return hasX(a.b) ? mDiv(mSub(mMul(deriv(a.a), a.b), mMul(a.a, deriv(a.b))), mPow(a.b, mkN(2))) : mDiv(deriv(a.a), a.b);
      case "^": {
        const u = a.a, v = a.b;
        if (!hasX(v)) return mMul(mMul(v, mPow(u, mSub(v, mkN(1)))), deriv(u));
        if (!hasX(u)) return mMul(mMul(mPow(u, v), u.t === "c" && u.n === "e" ? mkN(1) : mF("ln", u)), deriv(v));
        return mMul(mPow(u, v), mAdd(mMul(deriv(v), mF("ln", u)), mDiv(mMul(v, deriv(u)), u)));
      }
      default: {
        const u = a.a, du = deriv(u);
        switch (a.n) {
          case "sin": return mMul(mF("cos", u), du);
          case "cos": return mNeg(mMul(mF("sin", u), du));
          case "tan": return mDiv(du, mPow(mF("cos", u), mkN(2)));
          case "cot": return mNeg(mDiv(du, mPow(mF("sin", u), mkN(2))));
          case "asin": return mDiv(du, mF("sqrt", mSub(mkN(1), mPow(u, mkN(2)))));
          case "acos": return mNeg(mDiv(du, mF("sqrt", mSub(mkN(1), mPow(u, mkN(2))))));
          case "atan": return mDiv(du, mAdd(mkN(1), mPow(u, mkN(2))));
          case "sinh": return mMul(mF("cosh", u), du);
          case "cosh": return mMul(mF("sinh", u), du);
          case "tanh": return mDiv(du, mPow(mF("cosh", u), mkN(2)));
          case "ln": return mDiv(du, u);
          case "lg": return mDiv(du, mMul(u, mF("ln", mkN(10))));
          case "lb": return mDiv(du, mMul(u, mF("ln", mkN(2))));
          case "exp": return mMul(mF("exp", u), du);
          case "sqrt": return mDiv(du, mMul(mkN(2), mF("sqrt", u)));
          case "cbrt": return mDiv(du, mMul(mkN(3), mPow(mF("cbrt", u), mkN(2))));
          case "abs": return mMul(mF("sign", u), du);
          default: return mkN(0);
        }
      }
    }
  }
  // ===== запис виразу =====
  const PREC = { "+": 1, "-": 1, "*": 2, "/": 2, neg: 3, "^": 4 };
  function show(a, ctx = 0) {
    const wrap = (s, p) => (p < ctx ? "(" + s + ")" : s);
    switch (a.t) {
      case "n": return a.q.n < Z && ctx > 1 ? "(" + nfq(a.q) + ")" : nfq(a.q);
      case "x": return "x";
      case "c": return a.n === "pi" ? "π" : "e";
      case "neg": return wrap("-" + show(a.a, 3), 3);
      case "+": return wrap(show(a.a, 1) + " + " + show(a.b, 1), 1);
      case "-": return wrap(show(a.a, 1) + " − " + show(a.b, 2), 1);
      case "*": {
        if (isN(a.a) && a.a.q.d !== O) { const p = a.a.q.n, d = a.a.q.d, r = show(a.b, 3); return wrap((p === O ? r : (p === -1n ? "-" : String(p)) + r) + "/" + d, 2); }
        const l = show(a.a, 2), r = show(a.b, 3);
        return wrap(isN(a.a) && !isN(a.b) && !/^[\d(-]/.test(r) ? l + r : isN(a.a) && !isN(a.b) && a.b.t !== "neg" ? l + r : l + " · " + r, 2);
      }
      case "/": return wrap((isN(a.a) ? nfq(a.a.q) : show(a.a, 2)) + "/" + show(a.b, 3.5), 2);
      case "^": return wrap(show(a.a, 4.5) + "^" + (a.b.t === "x" || a.b.t === "c" || (isN(a.b) && a.b.q.n >= Z && (a.b.q.d === O || exactDec(a.b.q))) ? show(a.b, 0) : "(" + show(a.b, 0) + ")"), 4);
      default: return a.n + "(" + show(a.a, 0) + ")";
    }
  }

  // ===== числовий аналіз =====
  const SHIFT = 0.3127;
  function bisect(fn, lo, hi, flo) {
    for (let i = 0; i < 70; i++) { const m = (lo + hi) / 2, fm = fn(m); if (!Number.isFinite(fm)) return null; if ((fm < 0) === (flo < 0)) { lo = m; flo = fm; } else hi = m; if (hi - lo < 1e-14 * Math.max(1, Math.abs(lo))) break; }
    return (lo + hi) / 2;
  }
  function scanZeros(fn, a, b, N = 2400) {
    const zeros = [], poles = [], h = (b - a) / N;
    let px = a + SHIFT * h, py = fn(px);
    if (py === 0) zeros.push(px);
    for (let i = 1; i < N; i++) {
      const x = a + (i + SHIFT) * h, y = fn(x);
      if (Number.isFinite(py) && Number.isFinite(y)) {
        if (y === 0) zeros.push(x);
        else if (py !== 0 && (py < 0) !== (y < 0)) {
          const r = bisect(fn, px, x, py);
          if (r !== null) { const v = Math.abs(fn(r)); if (v < 1e-6) zeros.push(r); else if (v > 1e6) poles.push(r); }
        }
      }
      px = x; py = y;
    }
    return { zeros, poles };
  }
  function scanExtrema(fn, dfn, a, b, N = 2400) {
    const out = [], h = (b - a) / N;
    let px = a + SHIFT * h, py = dfn(px);
    for (let i = 1; i < N; i++) {
      const x = a + (i + SHIFT) * h, y = dfn(x);
      if (Number.isFinite(py) && Number.isFinite(y) && py !== 0 && y !== 0 && (py < 0) !== (y < 0)) {
        const r = bisect(dfn, px, x, py);
        if (r !== null) { const fv = fn(r); if (Number.isFinite(fv) && Math.abs(fv) < 1e9 && Math.abs(fn(r - h)) < 1e9 && Math.abs(fn(r + h)) < 1e9) out.push({ x: r, y: fv, type: py < 0 ? "min" : "max" }); }
      } else if (y === 0 && Number.isFinite(py) && py !== 0) {
        const nx = a + (i + 1 + SHIFT) * h, ny = dfn(nx);
        if (Number.isFinite(ny) && ny !== 0 && (py < 0) !== (ny < 0)) { const fv = fn(x); if (Number.isFinite(fv)) out.push({ x, y: fv, type: py < 0 ? "min" : "max" }); }
      }
      px = x; py = y;
    }
    return out;
  }
  const dedup = (arr, tol, key = (v) => v) => { const o = []; arr.slice().sort((p, r) => key(p) - key(r)).forEach((v) => { if (!o.length || Math.abs(key(v) - key(o[o.length - 1])) > tol) o.push(v); }); return o; };
  // «гарний» запис числа: дріб, кратне π, √n
  function nice(x, nd) {
    const dec = dbl(x, nd);
    if (!Number.isFinite(x)) return { dec: "—", ex: null };
    if (Math.abs(x) < 1e-9) return { dec: "0", ex: "0" };
    const r = Math.round(x);
    if (Math.abs(x - r) < 1e-9 * Math.max(1, Math.abs(x))) return { dec: String(r), ex: String(r) };
    for (let d = 2; d <= 24; d++) { const p = Math.round(x * d); if (Math.abs(x * d - p) < 1e-9 * d * Math.max(1, Math.abs(x)) && gcdN(p, d) === 1) return { dec, ex: p + "/" + d }; }
    const t = x / Math.PI;
    for (let d = 1; d <= 12; d++) { const p = Math.round(t * d); if (p !== 0 && Math.abs(t * d - p) < 1e-9 * d && gcdN(p, d) === 1) return { dec, ex: (p === 1 ? "" : p === -1 ? "-" : String(p)) + "π" + (d === 1 ? "" : "/" + d) }; }
    const s2 = x * x, n = Math.round(s2);
    if (n > 1 && n <= 400 && Math.abs(s2 - n) < 1e-8 * n && Math.sqrt(n) % 1 !== 0) return { dec, ex: (x < 0 ? "-" : "") + "√" + n };
    for (let d = 2; d <= 12; d++) { const m = Math.round(s2 * d * d); if (m > 1 && m <= 2000 && Math.abs(s2 * d * d - m) < 1e-8 * m && Math.sqrt(m) % 1 !== 0) { let k = 1, mm = m; for (let f = 2; f * f <= mm; f++) while (mm % (f * f) === 0) { mm /= f * f; k *= f; } const g = gcdN(k, d); return { dec, ex: (x < 0 ? "-" : "") + (k / g === 1 ? "" : k / g) + "√" + mm + (d / g === 1 ? "" : "/" + d / g) }; } }
    return { dec, ex: null };
  }
  const niceTxt = (x, nd) => { const n = nice(x, nd); return n.ex && n.ex !== n.dec ? n.ex + " ≈ " + n.dec : n.dec; };

  // ===== функції користувача =====
  const fns = []; // { text, on, ast, f, df, dast, err, vline, color }
  function buildFn(text) {
    const o = { text, on: true, ast: null, f: null, df: null, dast: null, err: null, vline: null };
    let s = String(text || "").trim();
    if (!s) return o;
    s = s.replace(/^\s*(y|f\s*\(\s*x\s*\)|f)\s*=\s*/i, "");
    const vm = s.match(/^\s*[xх]\s*=\s*(.+)$/i);
    try {
      if (vm) { const a = parse(vm[1]); if (hasX(a)) throw new PErr(L("Вертикальна пряма x = c: праворуч має бути число.", "A vertical line x = c needs a number on the right.")); o.vline = compile(a)(0); if (!Number.isFinite(o.vline)) throw new PErr(L("Некоректне значення.", "Invalid value.")); o.ast = a; return o; }
      let a = parse(s);
      if (el("angle").value === "deg") a = degify(a);
      o.ast = a; o.f = compile(a);
      o.dast = deriv(a); o.df = compile(o.dast);
    } catch (e) { o.err = e instanceof PErr ? e.message : L("Не вдалось розібрати вираз.", "Could not parse the expression."); o.ast = null; o.f = null; }
    return o;
  }
  const active = () => fns.map((f, i) => ({ f, i })).filter(({ f }) => f.f && f.on);
  const valid = () => fns.map((f, i) => ({ f, i })).filter(({ f }) => f.f);
  const sub = (i) => "₁₂₃₄₅₆"[i];

  // ===== вигляд =====
  const view = { x0: -10, x1: 10, y0: -7, y1: 7 };
  let autoY = true;
  function autoFitY() {
    const arr = [], N = 400;
    active().forEach(({ f }) => { for (let i = 0; i <= N; i++) { const y = f.f(view.x0 + (i / N) * (view.x1 - view.x0)); if (Number.isFinite(y) && Math.abs(y) < 1e12) arr.push(y); } });
    if (!arr.length) { view.y0 = -7; view.y1 = 7; return; }
    arr.sort((a, b) => a - b);
    let lo = arr[Math.floor(arr.length * 0.03)], hi = arr[Math.ceil(arr.length * 0.97) - 1];
    if (hi - lo < 1e-9) { lo -= 1; hi += 1; }
    const span = hi - lo;
    if (lo > 0 && lo < span * 0.6) lo = 0;
    if (hi < 0 && -hi < span * 0.6) hi = 0;
    const pad = (hi - lo) * 0.14;
    view.y0 = lo - pad; view.y1 = hi + pad;
  }
  const niceStep = (r) => { const raw = r / 8, mg = Math.pow(10, Math.floor(Math.log10(raw))), n = raw / mg; return (n < 1.5 ? 1 : n < 3.5 ? 2 : n < 7.5 ? 5 : 10) * mg; };
  function fmtTick(v, step) { const d = Math.max(0, Math.min(8, -Math.floor(Math.log10(step) + 1e-9))); let s = Math.abs(v) < step * 1e-6 ? "0" : v.toFixed(d); if (s.indexOf(".") >= 0) s = s.replace(/0+$/, "").replace(/\.$/, ""); return s.replace(".", SEP).replace("-", "−"); }

  // ===== особливі точки =====
  let special = [];
  function computeSpecial() {
    special = [];
    if (el("pts").value !== "on") return;
    const act = active().filter(({ f }) => !f.vline), a = view.x0, b = view.x1;
    const pointsOf = (f) => {
      const o = [], z = scanZeros(f.f, a, b, 1600);
      dedup(z.zeros, (b - a) * 1e-6).forEach((x) => o.push({ x, y: 0, k: "zero" }));
      scanExtrema(f.f, f.df, a, b, 1600).forEach((e) => { o.push({ x: e.x, y: e.y, k: e.type }); if (Math.abs(e.y) < 1e-9 * Math.max(1, Math.abs(e.x)) && !o.some((p) => p.k === "zero" && Math.abs(p.x - e.x) < (b - a) * 1e-4)) o.push({ x: e.x, y: 0, k: "zero" }); });
      return o;
    };
    act.forEach(({ f, i }) => pointsOf(f).forEach((p) => special.push({ ...p, i })));
    for (let u = 0; u < act.length; u++) for (let v = u + 1; v < act.length; v++) {
      const g = (x) => act[u].f.f(x) - act[v].f.f(x), z = scanZeros(g, a, b, 1600);
      dedup(z.zeros, (b - a) * 1e-6).forEach((x) => special.push({ x, y: act[u].f.f(x), k: "cross", i: act[u].i, j: act[v].i }));
    }
    special = special.slice(0, 60);
  }

  // ===== полотно =====
  let cv, ctx2, W = 600, H = 400, DPR = 1, hover = null, tangent = null;
  function resizeCanvas() {
    const wrap = el("plotWrap"); if (!wrap) return;
    const w = Math.max(240, Math.floor(wrap.clientWidth)), h = Math.max(260, Math.round(Math.min(w * 0.72, 520)));
    DPR = window.devicePixelRatio || 1;
    if (w !== W || h !== H || cv.width !== Math.round(w * DPR)) { W = w; H = h; cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR); cv.style.height = H + "px"; }
    draw();
  }
  const px = (x) => ((x - view.x0) / (view.x1 - view.x0)) * W, py = (y) => H - ((y - view.y0) / (view.y1 - view.y0)) * H;
  const unx = (p) => view.x0 + (p / W) * (view.x1 - view.x0), uny = (p) => view.y0 + ((H - p) / H) * (view.y1 - view.y0);
  let raf = 0;
  const draw = () => { if (raf) return; raf = requestAnimationFrame(() => { raf = 0; paint(); }); };
  function paint() {
    if (!cv) return;
    const c = ctx2; c.setTransform(DPR, 0, 0, DPR, 0, 0);
    c.fillStyle = "#fff"; c.fillRect(0, 0, W, H);
    const sx = niceStep(view.x1 - view.x0), sy = niceStep(view.y1 - view.y0), grid = el("grid").value === "on";
    c.font = "11px system-ui, sans-serif"; c.lineWidth = 1;
    const ox = Math.min(Math.max(px(0), 0), W), oy = Math.min(Math.max(py(0), 0), H);
    if (grid) {
      c.strokeStyle = "#e9edf6";
      c.beginPath();
      for (let g = Math.ceil(view.x0 / sx) * sx; g <= view.x1; g += sx) { const X = Math.round(px(g)) + 0.5; c.moveTo(X, 0); c.lineTo(X, H); }
      for (let g = Math.ceil(view.y0 / sy) * sy; g <= view.y1; g += sy) { const Y = Math.round(py(g)) + 0.5; c.moveTo(0, Y); c.lineTo(W, Y); }
      c.stroke();
    }
    c.strokeStyle = "#7d8aa6"; c.lineWidth = 1.4; c.beginPath(); c.moveTo(0, Math.round(oy) + 0.5); c.lineTo(W, Math.round(oy) + 0.5); c.moveTo(Math.round(ox) + 0.5, 0); c.lineTo(Math.round(ox) + 0.5, H); c.stroke();
    c.fillStyle = "#5b6b8c";
    c.textAlign = "center"; c.textBaseline = "top";
    for (let g = Math.ceil(view.x0 / sx) * sx; g <= view.x1; g += sx) { if (Math.abs(g) < sx * 1e-6) continue; const X = px(g), ly = oy > H - 18 ? oy - 16 : oy + 4; c.fillText(fmtTick(g, sx), Math.min(Math.max(X, 14), W - 14), ly); }
    c.textAlign = "right"; c.textBaseline = "middle";
    for (let g = Math.ceil(view.y0 / sy) * sy; g <= view.y1; g += sy) { if (Math.abs(g) < sy * 1e-6) continue; const Y = py(g), lx = ox < 34 ? ox + 34 : ox - 5; c.fillText(fmtTick(g, sy), lx, Math.min(Math.max(Y, 8), H - 8)); }
    if (ox >= 34 && oy >= 0 && oy <= H) { c.textAlign = "right"; c.textBaseline = "top"; c.fillText("0", ox - 5, oy + 4); }
    // графіки
    c.lineJoin = "round"; c.lineCap = "round";
    fns.forEach((fn, i) => {
      if (!fn.on) return;
      c.strokeStyle = COLORS[i]; c.lineWidth = 2.4;
      if (fn.vline !== null) { const X = Math.round(px(fn.vline)) + 0.5; c.beginPath(); c.moveTo(X, 0); c.lineTo(X, H); c.stroke(); return; }
      if (!fn.f) return;
      const N = Math.min(2400, Math.round(W * 1.6));
      c.beginPath(); let pen = false, ppy = 0;
      for (let k = 0; k <= N; k++) {
        const x = view.x0 + (k / N) * (view.x1 - view.x0), y = fn.f(x);
        if (!Number.isFinite(y)) { pen = false; continue; }
        const Y = Math.max(-1e5, Math.min(1e5, py(y))), X = (k / N) * W;
        if (pen && Math.abs(Y - ppy) > H * 1.1 && ((Y > H) !== (ppy > H) || (Y < 0) !== (ppy < 0))) pen = false;
        if (!pen) { c.moveTo(X, Y); pen = true; } else c.lineTo(X, Y);
        ppy = Y;
      }
      c.stroke();
    });
    // дотична й нормаль
    if (tangent) {
      c.setLineDash([7, 5]); c.lineWidth = 2.2; c.strokeStyle = "#e0701a";
      c.beginPath();
      if (tangent.k !== null) { c.moveTo(0, py(tangent.y0 + tangent.k * (view.x0 - tangent.x0))); c.lineTo(W, py(tangent.y0 + tangent.k * (view.x1 - tangent.x0))); }
      c.stroke();
      c.strokeStyle = "#7a3fd0"; c.beginPath();
      if (tangent.k === 0) { c.moveTo(px(tangent.x0), 0); c.lineTo(px(tangent.x0), H); }
      else if (tangent.k !== null) { const m = -1 / tangent.k; c.moveTo(0, py(tangent.y0 + m * (view.x0 - tangent.x0))); c.lineTo(W, py(tangent.y0 + m * (view.x1 - tangent.x0))); }
      c.stroke(); c.setLineDash([]);
      c.fillStyle = "#e0701a"; c.beginPath(); c.arc(px(tangent.x0), py(tangent.y0), 5.5, 0, 7); c.fill(); c.strokeStyle = "#fff"; c.lineWidth = 2; c.stroke();
    }
    // особливі точки
    const PC = { zero: "#1b9e5a", min: "#d6336c", max: "#d6336c", cross: "#8a4fd0" };
    special.forEach((p) => { const X = px(p.x), Y = py(p.y); if (X < -5 || X > W + 5 || Y < -5 || Y > H + 5) return; c.fillStyle = PC[p.k]; c.beginPath(); c.arc(X, Y, 4.2, 0, 7); c.fill(); c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.stroke(); });
    // курсор
    if (hover !== null) {
      c.strokeStyle = "rgba(40,59,105,.35)"; c.lineWidth = 1; c.beginPath(); c.moveTo(Math.round(hover.X) + 0.5, 0); c.lineTo(Math.round(hover.X) + 0.5, H); c.stroke();
      active().forEach(({ f, i }) => { if (!f.f) return; const y = f.f(hover.x); if (!Number.isFinite(y)) return; const Y = py(y); if (Y < -5 || Y > H + 5) return; c.fillStyle = COLORS[i]; c.beginPath(); c.arc(hover.X, Y, 4.5, 0, 7); c.fill(); c.strokeStyle = "#fff"; c.lineWidth = 1.5; c.stroke(); });
    }
  }
  function setReadout() {
    const r = el("readout");
    if (hover === null) { r.textContent = L("Наведіть курсор на графік, щоб побачити значення.", "Move the cursor over the graph to see the values."); return; }
    const nd = ND(), parts = ["x = " + dbl(hover.x, nd)];
    active().forEach(({ f, i }) => { if (f.f) parts.push("f" + sub(i) + " = " + dbl(f.f(hover.x), nd)); });
    r.textContent = parts.join("   ·   ");
  }
  function syncViewFields() { el("vx0").value = fv(view.x0); el("vx1").value = fv(view.x1); el("vy0").value = fv(view.y0); el("vy1").value = fv(view.y1); el("autoY").checked = autoY; }
  const fv = (v) => dbl(v, 4).replace(/ /g, "");
  let specTimer = 0;
  function viewChanged(redo) {
    syncViewFields(); draw();
    clearTimeout(specTimer);
    specTimer = setTimeout(() => { computeSpecial(); draw(); if (mode === "gr" || mode === "an") renderOut(); }, 160);
    void redo;
  }
  function zoomAt(fx, fy, k) { // k < 1 — наближення
    const cx = unx(fx), cy = uny(fy);
    const nx0 = cx - (cx - view.x0) * k, nx1 = cx + (view.x1 - cx) * k, ny0 = cy - (cy - view.y0) * k, ny1 = cy + (view.y1 - cy) * k;
    if (nx1 - nx0 < 1e-7 || nx1 - nx0 > 1e9 || ny1 - ny0 < 1e-7 || ny1 - ny0 > 1e9) return;
    view.x0 = nx0; view.x1 = nx1; view.y0 = ny0; view.y1 = ny1; autoY = false;
  }
  function wireCanvas() {
    const ptrs = new Map(); let last = null;
    cv.addEventListener("pointerdown", (e) => { cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x: e.offsetX, y: e.offsetY }); last = null; cv.style.cursor = "grabbing"; });
    cv.addEventListener("pointerup", (e) => { ptrs.delete(e.pointerId); cv.style.cursor = "grab"; last = null; });
    cv.addEventListener("pointercancel", (e) => { ptrs.delete(e.pointerId); last = null; });
    cv.addEventListener("pointermove", (e) => {
      const p = ptrs.get(e.pointerId);
      if (!p) { hover = { X: e.offsetX, x: unx(e.offsetX) }; setReadout(); draw(); return; }
      if (ptrs.size === 1) {
        const dx = e.offsetX - p.x, dy = e.offsetY - p.y; p.x = e.offsetX; p.y = e.offsetY;
        const rx = view.x1 - view.x0, ry = view.y1 - view.y0;
        view.x0 -= (dx / W) * rx; view.x1 -= (dx / W) * rx; view.y0 += (dy / H) * ry; view.y1 += (dy / H) * ry; autoY = false;
        hover = { X: e.offsetX, x: unx(e.offsetX) }; setReadout(); viewChanged();
      } else if (ptrs.size === 2) {
        p.x = e.offsetX; p.y = e.offsetY;
        const [a, b] = [...ptrs.values()], d = Math.hypot(a.x - b.x, a.y - b.y);
        if (last && d > 0) { zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, last / d); viewChanged(); }
        last = d;
      }
    });
    cv.addEventListener("pointerleave", () => { if (!ptrs.size) { hover = null; setReadout(); draw(); } });
    cv.addEventListener("wheel", (e) => { e.preventDefault(); zoomAt(e.offsetX, e.offsetY, Math.exp(e.deltaY * 0.0018)); viewChanged(); }, { passive: false });
    cv.addEventListener("dblclick", (e) => { zoomAt(e.offsetX, e.offsetY, 0.5); viewChanged(); });
  }

  // ===== виведення режимів =====
  const step = (t, lines, note) => ({ t, l: lines, note });
  function stepsHtml(steps) { return steps.map((s, i) => '<div class="fg__step"><span class="fg__stepN">' + (i + 1) + '</span><div><b class="fg__stepT">' + esc(s.t) + "</b>" + s.l.map((x) => '<p class="fg__math">' + esc(x) + "</p>").join("") + (s.note ? '<p class="fg__stepNote">' + esc(s.note) + "</p>" : "") + "</div></div>").join(""); }
  const tilesHtml = (tl) => '<div class="fg__tiles">' + tl.map((t) => '<div class="fg__tile"><small>' + esc(t.k) + "</small><b>" + esc(t.v) + "</b></div>").join("") + "</div>";
  function tableHtml(head, rows) { return '<div class="fg__tblWrap"><table class="fg__tbl fg__tbl--list"><thead><tr>' + head.map((h) => "<th>" + esc(h) + "</th>").join("") + "</tr></thead><tbody>" + rows.map((r) => "<tr>" + r.map((c, i) => (i === r.length - 1 && r.length > 2 && /^[^\d-]/.test(String(c)) ? '<td class="fg__tdL">' : "<td>") + esc(String(c)) + "</td>").join("") + "</tr>").join("") + "</tbody></table></div>"; }
  let lastText = "";
  const KIND = { zero: L("нуль", "zero"), min: L("мінімум", "minimum"), max: L("максимум", "maximum"), cross: L("перетин", "intersection") };
  function selFn(id) { const v = Number(el(id).value) - 1; const f = fns[v]; return f && f.f ? { f, i: v } : (valid()[0] || null); }
  function outGr() {
    const nd = ND(), act = active();
    if (!act.length) return { html: '<div class="fg__hintbox">' + esc(valid().length ? L("Усі функції приховані: увімкніть кружечок біля функції.", "All functions are hidden: switch on the dot next to a function.") : L("Введіть функцію, наприклад x^2 − 4x + 3 або sin(x).", "Enter a function, for example x^2 − 4x + 3 or sin(x).")) + "</div>", text: "" };
    let html = "", text = "";
    if (el("pts").value === "on") {
      const rows = special.slice(0, 40).map((p) => [KIND[p.k], "f" + sub(p.i) + (p.k === "cross" ? "=f" + sub(p.j) : ""), dbl(p.x, nd), dbl(p.y, nd)]);
      if (rows.length) { html += '<div class="fg__sub">' + L("Характерні точки на екрані", "Key points in view") + "</div>" + tableHtml([L("Точка", "Point"), L("Функція", "Function"), "x", "y"], rows) + (special.length > 40 ? '<div class="fg__note">' + L("Показано перші 40 точок.", "The first 40 points are shown.") + "</div>" : ""); text = rows.map((r) => r.join("\t")).join("\n"); }
      else html += '<div class="fg__note">' + L("У видимій області немає нулів, екстремумів чи перетинів. Змініть масштаб.", "There are no zeros, extrema or intersections in view. Change the scale.") + "</div>";
    }
    return { html, text };
  }
  function outAn() {
    const s = selFn("asel"); if (!s) return { html: '<div class="fg__hintbox">' + esc(L("Введіть функцію для аналізу.", "Enter a function to analyze.")) + "</div>", text: "" };
    const nd = ND(), { f, i } = s;
    if (f.vline !== null) return { html: '<div class="fg__hintbox">' + esc(L("Для вертикальної прямої аналіз не потрібен.", "No analysis is needed for a vertical line.")) + "</div>", text: "" };
    let a = view.x0, b = view.x1;
    const ra = el("aA").value.trim(), rb = el("aB").value.trim();
    if (ra || rb) { const A = parseNumInput(ra), B = parseNumInput(rb); if (A === null || B === null || !(B > A)) return { html: '<div class="fg__hintbox">' + esc(L("Інтервал: вкажіть два числа, друге більше за перше (або залиште порожнім для видимої області).", "Interval: enter two numbers, the second greater than the first (or leave empty for the visible area).")) + "</div>", text: "" }; a = A; b = B; }
    const zr = scanZeros(f.f, a, b), zeros = dedup(zr.zeros, (b - a) * 1e-7), poles = dedup(zr.poles, (b - a) * 1e-6);
    const ext = dedup(scanExtrema(f.f, f.df, a, b), (b - a) * 1e-6, (e) => e.x);
    ext.forEach((e) => { if (Math.abs(e.y) < 1e-9 * Math.max(1, Math.abs(e.x)) && !zeros.some((z) => Math.abs(z - e.x) < (b - a) * 1e-4)) zeros.push(e.x); });
    zeros.sort((p, r) => p - r);
    const steps = [];
    steps.push(step(L("Функція й похідна", "The function and its derivative"), ["f" + sub(i) + "(x) = " + show(f.ast), "f" + sub(i) + "'(x) = " + show(f.dast)], L("Похідну знайдено символьно за правилами диференціювання. Інтервал аналізу: [" + dbl(a, 4) + "; " + dbl(b, 4) + "].", "The derivative is found symbolically by the differentiation rules. Analysis interval: [" + dbl(a, 4) + "; " + dbl(b, 4) + "].")));
    const y0 = f.f(0);
    steps.push(step(L("Перетин з віссю y", "The y-intercept"), [Number.isFinite(y0) ? "f(0) = " + niceTxt(y0, nd) : L("f(0) не існує.", "f(0) does not exist.")]));
    steps.push(step(L("Нулі функції", "The zeros"), zeros.length ? zeros.map((z, k) => "x" + (k + 1) + " = " + niceTxt(z, nd)) : [L("У цьому інтервалі нулів немає.", "There are no zeros in this interval.")], L("Нулі знаходяться числово (сканування й бісекція); точний запис підказано, якщо збігається з дробом, кратним π чи √n.", "The zeros are found numerically (scanning and bisection); the exact form is suggested when it matches a fraction, a multiple of π or √n.")));
    steps.push(step(L("Екстремуми", "The extrema"), ext.length ? ext.map((e) => (e.type === "min" ? L("мінімум", "minimum") : L("максимум", "maximum")) + ": x = " + niceTxt(e.x, nd) + ",  f = " + niceTxt(e.y, nd)) : [L("Локальних екстремумів немає.", "No local extrema.")]));
    // монотонність
    const cuts = [a].concat(ext.map((e) => e.x), [b]), mono = [];
    for (let k = 0; k < cuts.length - 1; k++) { const m = (cuts[k] + cuts[k + 1]) / 2, d = f.df(m); if (Number.isFinite(d) && d !== 0) mono.push("[" + dbl(cuts[k], nd) + "; " + dbl(cuts[k + 1], nd) + "]: " + (d > 0 ? L("зростає", "increasing") : L("спадає", "decreasing"))); }
    steps.push(step(L("Зростання й спадання", "Increasing and decreasing"), mono.length ? mono : [L("Не вдалося визначити.", "Could not be determined.")]));
    // область значень
    let mn = Infinity, mx = -Infinity, bad = false;
    for (let k = 0; k <= 3000; k++) { const y = f.f(a + (k / 3000) * (b - a)); if (Number.isFinite(y)) { if (Math.abs(y) > 1e9) bad = true; mn = Math.min(mn, y); mx = Math.max(mx, y); } }
    steps.push(step(L("Значення на інтервалі", "Values on the interval"), Number.isFinite(mn) ? (bad || poles.length ? [L("Функція необмежена на цьому інтервалі.", "The function is unbounded on this interval.")] : [L("найменше ≈ ", "smallest ≈ ") + dbl(mn, nd), L("найбільше ≈ ", "largest ≈ ") + dbl(mx, nd)]) : [L("Функція не визначена на цьому інтервалі.", "The function is undefined on this interval.")]));
    if (poles.length) steps.push(step(L("Вертикальні асимптоти", "Vertical asymptotes"), poles.map((p) => "x ≈ " + niceTxt(p, nd))));
    // парність
    let even = true, odd = true, cnt = 0;
    for (const x of [0.37, 1.1, 2.3, 3.7, 5.2, 0.9, 7.1]) { const u = f.f(x), w = f.f(-x); if (!Number.isFinite(u) || !Number.isFinite(w)) continue; cnt++; const sc = 1e-9 * (1 + Math.abs(u) + Math.abs(w)); if (Math.abs(u - w) > sc) even = false; if (Math.abs(u + w) > sc) odd = false; }
    const par = cnt < 3 ? L("не визначається", "undetermined") : even && odd ? L("парна й непарна (нуль)", "even and odd (zero)") : even ? L("парна: f(−x) = f(x)", "even: f(−x) = f(x)") : odd ? L("непарна: f(−x) = −f(x)", "odd: f(−x) = −f(x)") : L("загального вигляду", "neither even nor odd");
    steps.push(step(L("Парність", "Parity"), [par], L("Перевірка в кількох точках.", "Checked at several points.")));
    // перетини з іншими
    const others = active().filter(({ i: j, f: g }) => j !== i && !g.vline), cross = [];
    others.forEach(({ f: g, i: j }) => dedup(scanZeros((x) => f.f(x) - g.f(x), a, b).zeros, (b - a) * 1e-6).forEach((x) => cross.push("f" + sub(i) + " = f" + sub(j) + ": x = " + niceTxt(x, nd) + ",  y = " + niceTxt(f.f(x), nd))));
    if (others.length) steps.push(step(L("Перетини з іншими функціями", "Intersections with other functions"), cross.length ? cross : [L("Перетинів немає.", "No intersections.")]));
    const tl = [{ k: L("Нулі", "Zeros"), v: String(zeros.length) }, { k: L("Екстремуми", "Extrema"), v: String(ext.length) }, { k: L("Парність", "Parity"), v: par.split(":")[0] }];
    const html = '<div class="fg__rhead"><div class="fg__expr">' + esc("f" + sub(i) + "(x) = " + show(f.ast)) + "</div></div>" + tilesHtml(tl) + '<div class="fg__sub">' + L("Аналіз функції", "Function analysis") + "</div>" + stepsHtml(steps);
    return { html, text: "f(x) = " + show(f.ast) + "\n\n" + steps.map((s, k) => (k + 1) + ". " + s.t + "\n   " + s.l.join("\n   ")).join("\n") };
  }
  function parseNumInput(s) { const t = String(s).trim().replace(",", ".").replace(/[−–]/g, "-"); if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(t)) return null; const v = Number(t); return Number.isFinite(v) ? v : null; }
  function parseRat(s) { const t = String(s).trim().replace(",", ".").replace(/[−–]/g, "-"), m = t.match(/^(-?)(\d+)(?:\.(\d+))?$/); if (!m) { const f = t.match(/^(-?\d+)\/(\d+)$/); return f && BigInt(f[2]) !== Z ? q(BigInt(f[1]), BigInt(f[2])) : null; } const fp = m[3] || ""; return q(BigInt(m[1] + m[2] + fp), 10n ** BigInt(fp.length)); }
  function outTb() {
    const act = active().filter(({ f }) => !f.vline);
    if (!act.length) return { html: '<div class="fg__hintbox">' + esc(L("Введіть хоча б одну функцію.", "Enter at least one function.")) + "</div>", text: "" };
    const A = parseRat(el("tbA").value || "-5"), B = parseRat(el("tbB").value || "5"), S = parseRat(el("tbS").value || "1");
    if (!A || !B || !S) return { html: '<div class="fg__hintbox">' + esc(L("Вкажіть числа від, до та крок (десяткові або дроби).", "Enter numbers for from, to and step (decimals or fractions).")) + "</div>", text: "" };
    if (S.n <= Z || qadd(A, S).n * 1n > B.n * 1n && false) return { html: '<div class="fg__hintbox">' + esc(L("Крок має бути додатним.", "The step must be positive.")) + "</div>", text: "" };
    const nd = ND(), rows = []; let x = A, cnt = 0;
    while (qsub(B, x).n >= Z && cnt < 600) { const xd = qdbl(x); rows.push([nfq(x) + (x.d !== O && !exactDec(x) ? " ≈ " + qdec(x, nd) : "")].concat(act.map(({ f }) => { const exv = evalQ(f.ast, x); const y = f.f(xd); return exv ? (exv.d === O || exactDec(exv) ? nfq(exv) : "≈ " + dbl(qdbl(exv), nd)) : Number.isFinite(y) ? dbl(y, nd) : L("не визн.", "undef."); }))); x = qadd(x, S); cnt++; }
    if (qsub(B, x).n >= Z && cnt >= 600) { /* обмеження */ }
    const head = ["x"].concat(act.map(({ i }) => "f" + sub(i) + "(x)"));
    const shown = rows.slice(0, 200);
    const html = tilesHtml([{ k: L("Рядків", "Rows"), v: String(rows.length) }, { k: L("Від", "From"), v: nfq(A) }, { k: L("Крок", "Step"), v: nfq(S) }]) + '<div class="fg__sub">' + L("Таблиця значень", "Table of values") + "</div>" + tableHtml(head, shown) + (rows.length > shown.length ? '<div class="fg__note">' + L("Показано перші 200 рядків із " + rows.length + ".", "The first 200 of " + rows.length + " rows are shown.") + "</div>" : "") + (cnt >= 600 ? '<div class="fg__note">' + L("Максимум 600 рядків: збільште крок.", "At most 600 rows: increase the step.") + "</div>" : "");
    return { html, text: head.join("\t") + "\n" + rows.map((r) => r.join("\t")).join("\n") };
  }
  // «y ≈ kx + b» без зайвих «1x» і «+ 0»
  function lineApprox(k, b, nd) {
    const kt = Math.abs(k - 1) < 1e-12 ? "x" : Math.abs(k + 1) < 1e-12 ? "-x" : Math.abs(k) < 1e-12 ? "" : dbl(k, nd) + "x";
    const bt = Math.abs(b) < 1e-12 * Math.max(1, Math.abs(k)) ? "" : b < 0 ? (kt ? " − " : "-") + dbl(-b, nd) : (kt ? " + " : "") + dbl(b, nd);
    return "y ≈ " + ((kt + bt) || "0");
  }
  function outTg() {
    tangent = null;
    const s = selFn("tsel"); if (!s) return { html: '<div class="fg__hintbox">' + esc(L("Введіть функцію й точку x₀.", "Enter a function and the point x₀.")) + "</div>", text: "" };
    const { f, i } = s, nd = ND();
    if (f.vline !== null) return { html: '<div class="fg__hintbox">' + esc(L("Для вертикальної прямої дотична не визначена.", "A tangent is not defined for a vertical line.")) + "</div>", text: "" };
    const xr = parseRat(el("tx0").value);
    if (!el("tx0").value.trim()) return { html: '<div class="fg__hintbox">' + esc(L("Вкажіть точку x₀.", "Enter the point x₀.")) + "</div>", text: "" };
    if (!xr) return { html: '<div class="fg__hintbox">' + esc(L("x₀ має бути числом або дробом.", "x₀ must be a number or a fraction.")) + "</div>", text: "" };
    const x0 = qdbl(xr), ex0 = evalQ(f.ast, xr), exk = evalQ(f.dast, xr);
    const y0 = ex0 ? qdbl(ex0) : f.f(x0), k = exk ? qdbl(exk) : f.df(x0);
    if (!Number.isFinite(y0)) return { html: '<div class="fg__hintbox">' + esc(L("У точці x₀ функція не визначена.", "The function is undefined at x₀.")) + "</div>", text: "" };
    if (!Number.isFinite(k)) return { html: '<div class="fg__hintbox">' + esc(L("У точці x₀ похідна не існує (злам, розрив чи вертикальна дотична).", "The derivative does not exist at x₀ (a corner, a break or a vertical tangent).")) + "</div>", text: "" };
    { const hh = 1e-6 * (1 + Math.abs(x0)), kl = (y0 - f.f(x0 - hh)) / hh, kr = (f.f(x0 + hh) - y0) / hh;
      if (Number.isFinite(kl) && Number.isFinite(kr) && Math.abs(kl - kr) > 1e-3 * (1 + Math.abs(kl) + Math.abs(kr))) return { html: '<div class="fg__hintbox">' + esc(L("У точці x₀ похідна не існує: ліва й права дотичні різні (злам графіка). Ліворуч нахил ≈ " + dbl(kl, nd) + ", праворуч ≈ " + dbl(kr, nd) + ".", "The derivative does not exist at x₀: the left and right tangents differ (a corner). The slope on the left is ≈ " + dbl(kl, nd) + ", on the right ≈ " + dbl(kr, nd) + ".")) + "</div>", text: "" }; }
    tangent = { x0, y0, k };
    const exact = !!(ex0 && exk);
    const sv = (e, d) => (e ? (e.d === O || exactDec(e) ? nfq(e) : nfq(e) + " ≈ " + dbl(qdbl(e), nd)) : dbl(d, nd));
    const steps = [];
    steps.push(step(L("Функція й похідна", "The function and its derivative"), ["f(x) = " + show(f.ast), "f'(x) = " + show(f.dast)], L("Похідна знайдена символьно.", "The derivative is found symbolically.")));
    steps.push(step(L("Значення в точці", "Values at the point"), ["x₀ = " + nfq(xr), "f(x₀) = " + sv(ex0, y0), "f'(x₀) = " + sv(exk, k)], L("f'(x₀) — кутовий коефіцієнт дотичної.", "f'(x₀) is the slope of the tangent.")));
    let eqT, b0;
    if (exact) { b0 = qsub(ex0, qmul(exk, xr)); const kk = exk, bb = b0; eqT = "y = " + (qisZ(kk) ? "" : (kk.n === O && kk.d === O ? "" : kk.n === -1n && kk.d === O ? "-" : nfq(kk)) + "x") + (qisZ(bb) ? (qisZ(kk) ? "0" : "") : (bb.n < Z ? (qisZ(kk) ? "-" : " − ") + nfq(qneg(bb)) : (qisZ(kk) ? "" : " + ") + nfq(bb))); }
    else eqT = lineApprox(k, y0 - k * x0, nd);
    steps.push(step(L("Рівняння дотичної", "The tangent line"), ["y = f(x₀) + f'(x₀)(x − x₀)", eqT]));
    let nrm;
    if (k === 0) nrm = "x = " + (exact ? nfq(xr) : dbl(x0, nd));
    else if (exact) { const m = qneg(qdiv(q(1n), exk)), bb = qsub(ex0, qmul(m, xr)); nrm = "y = " + (m.n === O && m.d === O ? "" : m.n === -1n && m.d === O ? "-" : nfq(m)) + "x" + (qisZ(bb) ? "" : bb.n < Z ? " − " + nfq(qneg(bb)) : " + " + nfq(bb)); }
    else { const m = -1 / k; nrm = lineApprox(m, y0 - m * x0, nd); }
    steps.push(step(L("Нормаль", "The normal line"), [nrm], L("Нормаль — пряма, перпендикулярна до дотичної в тій самій точці.", "The normal is the line perpendicular to the tangent at the same point.")));
    const ang = (Math.atan(k) * 180) / Math.PI;
    steps.push(step(L("Кут нахилу", "The angle of inclination"), ["α = arctg f'(x₀) ≈ " + dbl(ang, nd) + "°"], L("Кут між дотичною й додатним напрямком осі x.", "The angle between the tangent and the positive direction of the x-axis.")));
    const tl = [{ k: "f(x₀)", v: sv(ex0, y0) }, { k: "f'(x₀)", v: sv(exk, k) }, { k: L("Дотична", "Tangent"), v: eqT }];
    const html = '<div class="fg__rhead"><div class="fg__expr">' + esc("f" + sub(i) + "(x) = " + show(f.ast) + ",  x₀ = " + nfq(xr)) + "</div>" + '<div class="fg__forms"><span class="fg__rt"><small>' + L("Дотична", "Tangent") + '</small><span class="fg__big">' + esc(eqT) + "</span></span></div></div>" + tilesHtml(tl) + '<div class="fg__sub">' + L("Розв'язання", "Solution") + "</div>" + stepsHtml(steps);
    return { html, text: "f(x) = " + show(f.ast) + ", x₀ = " + nfq(xr) + "\n\n" + steps.map((s2, n2) => (n2 + 1) + ". " + s2.t + "\n   " + s2.l.join("\n   ")).join("\n") };
  }
  function renderOut() {
    if (mode !== "tg") tangent = null;
    const r = mode === "gr" ? outGr() : mode === "an" ? outAn() : mode === "tb" ? outTb() : outTg();
    el("modeOut").innerHTML = r.html; lastText = r.text || ""; draw();
  }

  // ===== рядки функцій =====
  function renderRows() {
    const box = el("fnList"); box.innerHTML = "";
    fns.forEach((fn, i) => {
      const row = document.createElement("div"); row.className = "fg__fn" + (fn.err ? " has-err" : "");
      row.innerHTML = '<button type="button" class="fg__sw' + (fn.on ? " is-on" : "") + '" style="--c:' + COLORS[i] + '" aria-pressed="' + fn.on + '" aria-label="' + L("Показати чи сховати функцію ", "Show or hide function ") + (i + 1) + '"></button><span class="fg__fname">f' + sub(i) + '(x) =</span><input class="fg__input fg__fnInput" id="fn' + (i + 1) + '" type="text" inputmode="text" autocomplete="off" spellcheck="false" maxlength="120" placeholder="' + L("напр.: x^2 − 4x + 3", "e.g.: x^2 − 4x + 3") + '"><button type="button" class="fg__x" aria-label="' + L("Видалити функцію", "Remove function") + '">×</button>' + (fn.err ? '<div class="fg__err">' + esc(fn.err) + "</div>" : "");
      box.appendChild(row);
      const inp = row.querySelector("input"); inp.value = fn.text;
      inp.addEventListener("input", () => { const keep = fn.on; fns[i] = buildFn(inp.value); fns[i].on = keep; updateErr(row, fns[i]); fnChanged(); });
      row.querySelector(".fg__sw").addEventListener("click", () => { fns[i].on = !fns[i].on; row.querySelector(".fg__sw").classList.toggle("is-on", fns[i].on); fnChanged(); });
      row.querySelector(".fg__x").addEventListener("click", () => { fns.splice(i, 1); if (!fns.length) fns.push(buildFn("")); renderRows(); fnChanged(); });
    });
    el("addFn").disabled = fns.length >= MAXF;
  }
  function updateErr(row, fn) {
    let e = row.querySelector(".fg__err");
    row.classList.toggle("has-err", !!fn.err);
    if (fn.err) { if (!e) { e = document.createElement("div"); e.className = "fg__err"; row.appendChild(e); } e.textContent = fn.err; } else if (e) e.remove();
  }
  function refreshSelects() {
    const v = valid(); [["asel", "as"], ["tsel", "ts"]].forEach(([hid, pre]) => {
      const cur = el(hid).value, opts = v.length ? v.map(({ f, i }) => [String(i + 1), "f" + sub(i) + "(x) = " + (f.text.length > 30 ? f.text.slice(0, 29) + "…" : f.text), "f" + sub(i) + "(x) = " + (f.text.length > 30 ? f.text.slice(0, 29) + "…" : f.text)]) : [["1", "—", "—"]];
      setOptions(hid, opts); setDd(hid, opts.some((o) => o[0] === cur) ? cur : opts[0][0]); void pre;
    });
  }
  function fnChanged() {
    if (autoY) autoFitY();
    refreshSelects(); syncViewFields(); computeSpecial(); renderOut(); setReadout(); draw();
  }
  function rebuildAll() { fns.forEach((f, i) => { const t = f.text, on = f.on; fns[i] = buildFn(t); fns[i].on = on; }); renderRows(); fnChanged(); }

  // ===== списки, кнопки =====
  const DDP = { asel: "as", tsel: "ts", decs: "dc", angle: "ag", grid: "gd", pts: "pt" };
  function setDd(hid, v) {
    const pre = DDP[hid], lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return false;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
    return true;
  }
  function setOptions(hid, opts) {
    const pre = DDP[hid], ul = el(pre + "_list");
    ul.innerHTML = opts.map(([v, uk, en], i) => '<li role="option" tabindex="-1" data-v="' + v + '" aria-selected="' + (i === 0) + '">' + esc(L(uk, en)) + "</li>").join("");
    el(hid).value = opts[0][0]; el(pre + "_val").textContent = L(opts[0][1], opts[0][2]);
  }
  function initDd(pre, onPick) {
    const btn = el(pre + "_btn"), list = el(pre + "_list");
    const items = () => Array.from(list.querySelectorAll("li"));
    const close = (f) => { list.hidden = true; btn.setAttribute("aria-expanded", "false"); if (f) btn.focus(); };
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
  function toast(msg) { const n = el("toast"); if (!n) return; n.textContent = msg; clearTimeout(toast._t); toast._t = setTimeout(() => (n.textContent = ""), 2600); }
  const PANELS = { gr: "panelGr", an: "panelAn", tb: "panelTb", tg: "panelTg" };
  function setMode(m) {
    mode = m;
    document.querySelectorAll(".fg__tab").forEach((b) => { const on = b.dataset.m === m; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
    MODES.forEach((k) => { el(PANELS[k]).hidden = k !== m; });
    renderOut();
  }
  const PRESETS = [["x^2 − 4x + 3", L("парабола", "parabola")], ["sin(x)", L("синус", "sine")], ["x^3 − 3x", L("кубічна", "cubic")], ["1/x", L("гіпербола", "hyperbola")], ["sqrt(x)", L("корінь", "root")], ["abs(x)", L("модуль", "absolute value")], ["ln(x)", L("логарифм", "logarithm")], ["tan(x)", L("тангенс", "tangent")], ["e^x", L("експонента", "exponential")]];
  function setFns(list) { fns.length = 0; list.forEach((t) => fns.push(buildFn(t))); if (!fns.length) fns.push(buildFn("")); renderRows(); }
  function applyView(x0, x1) { view.x0 = x0; view.x1 = x1; autoY = true; }
  function resetView() { applyView(-10, 10); }
  function resetAll() {
    setFns([""]); ["aA", "aB", "tx0", "tbA", "tbB", "tbS"].forEach((id) => (el(id).value = ""));
    [["decs", "4"], ["angle", "rad"], ["grid", "on"], ["pts", "on"]].forEach(([k, v]) => setDd(k, v));
    resetView(); tangent = null; fnChanged();
  }
  function fillExample() {
    const ex = { gr: ["x^2 − 4x + 3", "x − 1"], an: ["x^3 − 3x"], tb: ["x^2 − 2x"], tg: ["x^3 − 3x"] }[mode];
    setFns(ex); ["aA", "aB", "tx0", "tbA", "tbB", "tbS"].forEach((id) => (el(id).value = ""));
    if (mode === "tg") el("tx0").value = "2"; if (mode === "tb") { el("tbA").value = "-3"; el("tbB").value = "5"; el("tbS").value = "1"; }
    { const vw = { gr: [-2, 6], an: [-3, 3], tb: [-3, 5], tg: [-3, 3] }[mode]; applyView(vw[0], vw[1]); }
    fnChanged(); toast(T.example);
  }
  const SHARE_DD = ["decs", "angle", "grid", "pts"];
  function share() {
    const p = new URLSearchParams(); p.set("m", mode);
    fns.forEach((f, i) => { if (f.text.trim()) p.set("f" + (i + 1), f.text.trim()); });
    const hid = fns.map((f, i) => (f.on ? "" : i + 1)).filter(Boolean).join(""); if (hid) p.set("h", hid);
    SHARE_DD.forEach((k) => p.set(DDP[k], el(k).value));
    p.set("vx", fv(view.x0) + "," + fv(view.x1)); if (!autoY) p.set("vy", fv(view.y0) + "," + fv(view.y1));
    ["asel", "tsel"].forEach((k) => p.set(DDP[k], el(k).value));
    ["aA", "aB", "tx0", "tbA", "tbB", "tbS"].forEach((id) => el(id).value.trim() && p.set(id, el(id).value.trim()));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const qs = new URLSearchParams(location.search);
    if (![...qs.keys()].length) return false;
    if (MODES.includes(qs.get("m"))) mode = qs.get("m");
    SHARE_DD.forEach((k) => { if (qs.has(DDP[k])) setDd(k, qs.get(DDP[k])); });
    const list = []; for (let i = 1; i <= MAXF; i++) if (qs.has("f" + i)) list[i - 1] = qs.get("f" + i).slice(0, 120);
    const arr = []; for (let i = 0; i < MAXF; i++) if (list[i] !== undefined) arr.push(list[i]); else if (list.slice(i).some((v) => v !== undefined)) arr.push("");
    setFns(arr);
    const hid = qs.get("h") || ""; fns.forEach((f, i) => { if (hid.includes(String(i + 1))) f.on = false; });
    const vx = (qs.get("vx") || "").split(",").map(Number); if (vx.length === 2 && vx[1] > vx[0] && vx.every(Number.isFinite)) { view.x0 = vx[0]; view.x1 = vx[1]; }
    const vy = (qs.get("vy") || "").split(",").map(Number); if (vy.length === 2 && vy[1] > vy[0] && vy.every(Number.isFinite)) { view.y0 = vy[0]; view.y1 = vy[1]; autoY = false; }
    ["aA", "aB", "tx0", "tbA", "tbB", "tbS"].forEach((id) => { if (qs.has(id)) el(id).value = qs.get(id).slice(0, 40); });
    renderRows(); refreshSelects();
    ["asel", "tsel"].forEach((k) => { if (qs.has(DDP[k])) setDd(k, qs.get(DDP[k])); });
    return true;
  }
  async function copyResult() {
    const t = lastText || fns.filter((f) => f.text.trim()).map((f, i) => "f" + sub(i) + "(x) = " + f.text.trim()).join("\n");
    if (!t) { toast(T.calcFirst); return; }
    try { await navigator.clipboard.writeText(t.replace(/ /g, "")); toast(T.copied); } catch { toast(T.copyFailed); }
  }
  function savePng() {
    const tmp = document.createElement("canvas"); tmp.width = cv.width; tmp.height = cv.height; tmp.getContext("2d").drawImage(cv, 0, 0);
    const a = document.createElement("a"); a.download = "graph.png"; a.href = tmp.toDataURL("image/png"); document.body.appendChild(a); a.click(); a.remove(); toast(T.saved);
  }
  function viewFromFields() {
    const v = ["vx0", "vx1", "vy0", "vy1"].map((id) => parseNumInput(el(id).value));
    if (v.some((x) => x === null) || !(v[1] > v[0]) || !(v[3] > v[2])) return;
    view.x0 = v[0]; view.x1 = v[1]; view.y0 = v[2]; view.y1 = v[3]; autoY = false; el("autoY").checked = false; draw();
    clearTimeout(specTimer); specTimer = setTimeout(() => { computeSpecial(); draw(); if (mode === "gr" || mode === "an") renderOut(); }, 160);
  }

  window.addEventListener("DOMContentLoaded", () => {
    cv = el("plot"); ctx2 = cv.getContext("2d");
    document.querySelectorAll(".fg__tab").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.m)));
    DDS_INIT();
    el("presets").innerHTML = PRESETS.map(([f, nm]) => '<button type="button" class="fg__preset" data-f="' + esc(f) + '">' + esc(nm) + "</button>").join("");
    el("presets").addEventListener("click", (e) => { const b = e.target.closest(".fg__preset"); if (!b) return; const f0 = fns[0] && !fns[0].text.trim() ? 0 : fns.length < MAXF ? fns.length : 0; if (f0 === fns.length) fns.push(buildFn(b.dataset.f)); else fns[f0] = buildFn(b.dataset.f); renderRows(); fnChanged(); });
    el("addFn").addEventListener("click", () => { if (fns.length < MAXF) { fns.push(buildFn("")); renderRows(); fnChanged(); const last = el("fn" + fns.length); if (last) last.focus(); } });
    ["vx0", "vx1", "vy0", "vy1"].forEach((id) => el(id).addEventListener("change", viewFromFields));
    el("autoY").addEventListener("change", () => { autoY = el("autoY").checked; if (autoY) { autoFitY(); viewChanged(); } });
    ["aA", "aB", "tx0", "tbA", "tbB", "tbS"].forEach((id) => el(id).addEventListener("input", () => renderOut()));
    el("zoomIn").addEventListener("click", () => { zoomAt(W / 2, H / 2, 0.6); viewChanged(); });
    el("zoomOut").addEventListener("click", () => { zoomAt(W / 2, H / 2, 1 / 0.6); viewChanged(); });
    el("homeView").addEventListener("click", () => { resetView(); autoFitY(); viewChanged(); });
    el("fitY").addEventListener("click", () => { autoY = true; autoFitY(); viewChanged(); });
    el("squareView").addEventListener("click", () => { const cx = (view.x0 + view.x1) / 2, cy = (view.y0 + view.y1) / 2, ry = ((view.x1 - view.x0) * H) / W; view.y0 = cy - ry / 2; view.y1 = cy + ry / 2; autoY = false; viewChanged(); });
    el("pngBtn").addEventListener("click", savePng);
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => { resetAll(); toast(T.reset); });
    el("shareBtn").addEventListener("click", share);
    el("copyBtn").addEventListener("click", copyResult);
    wireCanvas();
    window.addEventListener("resize", resizeCanvas);
    new ResizeObserver(() => resizeCanvas()).observe(el("plotWrap"));
    const used = applyFromUrl();
    if (!used) { setFns(["x^2 − 4x + 3", "x − 1"]); applyView(-2, 6); }
    if (autoY) autoFitY();
    refreshSelects(); syncViewFields(); computeSpecial(); setMode(mode); setReadout(); resizeCanvas();
  });
  function DDS_INIT() {
    initDd("as", (v) => { setDd("asel", v); renderOut(); });
    initDd("ts", (v) => { setDd("tsel", v); renderOut(); });
    initDd("dc", (v) => { setDd("decs", v); renderOut(); setReadout(); });
    initDd("ag", (v) => { setDd("angle", v); rebuildAll(); });
    initDd("gd", (v) => { setDd("grid", v); draw(); });
    initDd("pt", (v) => { setDd("pts", v); computeSpecial(); renderOut(); });
  }
})();
