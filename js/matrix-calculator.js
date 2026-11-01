/* matrix-calculator.js — калькулятор матриць: п'ять вкладок (дії; визначник; обернена матриця; ранг; розв'язання AX = B), розміри до 6×6, розв'язання по кроках зі станами матриць (UK/EN)
   Елементи — точні раціональні числа (ціле, десяткове, дріб): 2, -1,5, 3/4. Усі обчислення на BigInt без округлень.
   Дії: A ± B, A·B, B·A, k·M, Mⁿ (включно з від'ємними), Mᵀ. Визначник: розклад за рядком чи стовпцем (до 4×4), метод Гаусса, правило Саррюса / трикутника.
   Обернена: метод Гаусса–Жордана за схемою [A | E] або через алгебраїчні доповнення (до 4×4). Ранг: ступінчастий вигляд, слід, тип матриці. AX = B: для невиродженої A — через Гаусса–Жордана, для решти — аналіз за Руше–Капеллі й загальний розв'язок. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const SEP = IS_EN ? "." : ",";
  const MODES = ["op", "dt", "iv", "rk", "sx"];
  const MAXN = 6, MAXD = 30;
  let mode = "op";

  const T = {
    enter: L("Вкажіть дані — результат з'явиться тут.", "Enter your data — the result will appear here."),
    copied: L("Результат скопійовано ✅", "Result copied ✅"),
    copyFailed: L("Не вдалось скопіювати 😕", "Could not copy 😕"),
    linkCopied: L("Посилання скопійовано ✅", "Link copied ✅"),
    reset: L("Скинуто ✅", "Reset ✅"),
    example: L("Підставлено приклад ✅", "Example filled in ✅"),
    calcFirst: L("Спочатку порахуйте результат.", "Calculate first."),
    moved: L("Результат записано в матрицю ✅", "The result is placed in the matrix ✅")
  };

  // ===== раціональні числа на BigInt =====
  const Z = 0n, O = 1n;
  const babs = (x) => (x < Z ? -x : x);
  const gcd = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };
  const q = (n, d = O) => { if (d < Z) { n = -n; d = -d; } const g = gcd(n, d) || O; return { n: n / g, d: d / g }; };
  const qadd = (x, y) => q(x.n * y.d + y.n * x.d, x.d * y.d);
  const qsub = (x, y) => q(x.n * y.d - y.n * x.d, x.d * y.d);
  const qmul = (x, y) => q(x.n * y.n, x.d * y.d);
  const qdiv = (x, y) => q(x.n * y.d, x.d * y.n);
  const qneg = (x) => ({ n: -x.n, d: x.d });
  const qz = (x) => x.n === Z;
  const qone = (x) => x.n === O && x.d === O;
  const qeq = (x, y) => x.n === y.n && x.d === y.d;
  const Q0 = q(0n), Q1 = q(1n);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const MN = "−";
  function roundStr(x, nd) {
    const ng = x.n < Z, a = babs(x.n), sc = 10n ** BigInt(nd), v = (a * sc * 2n + x.d) / (2n * x.d), s = v.toString().padStart(nd + 1, "0");
    const ip = s.slice(0, s.length - nd), fr = s.slice(s.length - nd).replace(/0+$/, "");
    return (ng && v !== Z ? MN : "") + ip + (fr ? SEP + fr : "");
  }
  const ND = () => Number(el("decs").value) || 4;
  const decMode = () => el("fmt").value === "dec";
  // показ числа: дріб n/d або десяткове
  const S = (x) => (decMode() ? roundStr(x, ND()) : x.d === O ? (x.n < Z ? MN + (-x.n) : String(x.n)) : (x.n < Z ? MN : "") + babs(x.n) + "/" + x.d);
  const SP = (x) => (x.n < Z || (x.d !== O && !decMode()) ? "(" + S(x) + ")" : S(x)); // у добутках: від'ємні й дроби в дужках
  const SUB = "₀₁₂₃₄₅₆₇₈₉", sb = (n) => String(n).split("").map((d) => SUB[d]).join("");
  const rl = (i) => "R" + sb(i + 1);
  const nm = (name, i, j) => name + sb(i + 1) + sb(j + 1);

  // ===== матриці =====
  const mk = (r, c, f) => Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => f(i, j)));
  const clone = (M) => M.map((r) => r.slice());
  const rows = (M) => M.length, cols = (M) => (M.length ? M[0].length : 0);
  const mAdd = (A, B) => mk(rows(A), cols(A), (i, j) => qadd(A[i][j], B[i][j]));
  const mSub = (A, B) => mk(rows(A), cols(A), (i, j) => qsub(A[i][j], B[i][j]));
  const mScale = (A, k) => mk(rows(A), cols(A), (i, j) => qmul(A[i][j], k));
  const mT = (A) => mk(cols(A), rows(A), (i, j) => A[j][i]);
  const mI = (n) => mk(n, n, (i, j) => (i === j ? Q1 : Q0));
  function mMul(A, B) {
    return mk(rows(A), cols(B), (i, j) => { let s = Q0; for (let k = 0; k < cols(A); k++) s = qadd(s, qmul(A[i][k], B[k][j])); return s; });
  }
  const mEq = (A, B) => rows(A) === rows(B) && cols(A) === cols(B) && A.every((r, i) => r.every((x, j) => qeq(x, B[i][j])));
  const isIdent = (A) => rows(A) === cols(A) && mEq(A, mI(rows(A)));
  function detQ(M) { // визначник методом Гаусса без журналу
    const n = rows(M); let A = clone(M), sgn = 1, det = Q1;
    for (let c = 0; c < n; c++) {
      let p = -1; for (let i = c; i < n; i++) if (!qz(A[i][c])) { p = i; break; }
      if (p < 0) return Q0;
      if (p !== c) { [A[p], A[c]] = [A[c], A[p]]; sgn = -sgn; }
      det = qmul(det, A[c][c]);
      for (let i = c + 1; i < n; i++) { const f = qdiv(A[i][c], A[c][c]); if (!qz(f)) for (let j = c; j < n; j++) A[i][j] = qsub(A[i][j], qmul(f, A[c][j])); }
    }
    return sgn < 0 ? qneg(det) : det;
  }
  const minorOf = (A, i, j) => A.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j));

  // ===== метод Гаусса із журналом =====
  const mulTxt = (f) => (f.d === O ? babs(f.n) + "·" : "(" + babs(f.n) + "/" + f.d + ")·");
  function elimOp(i, r, f) { // Rᵢ → Rᵢ − f·R_r
    if (qone(f)) return rl(i) + " → " + rl(i) + " − " + rl(r);
    if (qeq(f, q(-1n))) return rl(i) + " → " + rl(i) + " + " + rl(r);
    return rl(i) + " → " + rl(i) + (f.n > Z ? " − " : " + ") + mulTxt(f) + rl(r);
  }
  function gaussRun(M, mode2, pivCols) {
    const A = clone(M), R = rows(A), groups = [], piv = [], skipped = [];
    let r = 0, swaps = 0;
    for (let c = 0; c < pivCols && r < R; c++) {
      let p = -1; for (let i = r; i < R; i++) if (!qz(A[i][c])) { p = i; break; }
      if (p < 0) { skipped.push(c); continue; }
      const ops = [];
      if (p !== r) { [A[p], A[r]] = [A[r], A[p]]; swaps++; ops.push(rl(r) + " ↔ " + rl(p)); }
      if (mode2 === "rref" && !qone(A[r][c])) {
        const pv = A[r][c];
        ops.push(qeq(pv, q(-1n)) ? rl(r) + " → −" + rl(r) : rl(r) + " → " + rl(r) + " ÷ " + SP(pv));
        for (let j = 0; j < cols(A); j++) A[r][j] = qdiv(A[r][j], pv);
      }
      for (let i = 0; i < R; i++) {
        if (i === r || (mode2 === "ref" && i < r)) continue;
        if (qz(A[i][c])) continue;
        const f = qdiv(A[i][c], A[r][c]);
        ops.push(elimOp(i, r, f));
        for (let j = 0; j < cols(A); j++) A[i][j] = qsub(A[i][j], qmul(f, A[r][j]));
      }
      groups.push({ col: c, row: r, ops, state: clone(A), pivot: [r, c] });
      piv.push([r, c]); r++;
    }
    for (let c = piv.length ? piv[piv.length - 1][1] + 1 : 0; c < pivCols; c++) if (!skipped.includes(c) && !piv.some((p) => p[1] === c)) skipped.push(c);
    return { A, groups, piv, skipped, swaps, rank: piv.length };
  }

  // ===== розбір клітинок =====
  const NUMRE = /^(\d+([.,]\d*)?|[.,]\d+)$/;
  function parseCell(str) {
    let s = String(str == null ? "" : str).trim().replace(/[−–—]/g, "-");
    if (!s) return { v: Q0 };
    let sg = 1n;
    if (s[0] === "-") { sg = -1n; s = s.slice(1).trim(); } else if (s[0] === "+") s = s.slice(1).trim();
    const parts = s.split("/");
    if (parts.length > 2) return { err: 1 };
    const p = parts.map((x) => { x = x.trim(); if (!NUMRE.test(x) || x.replace(/[.,]/g, "").length > MAXD) return null; const [ip, fp = ""] = x.replace(",", ".").split("."); return q(BigInt((ip || "0") + fp), 10n ** BigInt(fp.length)); });
    if (p.some((v) => v === null)) return { err: 1 };
    let v = p[0];
    if (p.length === 2) { if (qz(p[1])) return { err: 2 }; v = qdiv(p[0], p[1]); }
    return { v: sg < 0n ? qneg(v) : v };
  }
  const dimOf = (k) => ({ r: Number(el("r" + k).value) || 2, c: Number(el("c" + k).value) || 2 });
  function readMat(k) {
    const { r, c } = dimOf(k), M = [], errs = [];
    for (let i = 0; i < r; i++) { const row = []; for (let j = 0; j < c; j++) { const inp = el(k.toLowerCase() + "_" + i + "_" + j), res = parseCell(inp ? inp.value : ""); inp && inp.classList.toggle("is-bad", !!res.err); if (res.err) { errs.push(k + "[" + (i + 1) + "," + (j + 1) + "]: «" + String(inp.value).slice(0, 14) + "»" + (res.err === 2 ? L(" — знаменник дорівнює нулю", " — zero denominator") : "")); row.push(Q0); } else row.push(res.v); } M.push(row); }
    return { M, errs };
  }
  function clearBad() { document.querySelectorAll(".mx__mi.is-bad").forEach((x) => x.classList.remove("is-bad")); }

  // ===== побудова виводу =====
  const step = (t, lines, mats, note) => ({ t, l: lines || [], mats: mats || [], note });
  const mat = (M, o) => ({ M, ...(o || {}) });
  function matHtml(o) {
    const M = o.M, c = cols(M), sep = o.sep === undefined ? -1 : o.sep;
    let h = '<div class="mx__mwrap">' + (o.label ? '<span class="mx__mlab">' + esc(o.label) + "</span>" : "") + '<div class="mx__rm" style="grid-template-columns:repeat(' + c + ',auto)">';
    M.forEach((row, i) => row.forEach((x, j) => { const cl = "mx__rc" + (sep >= 0 && j === sep ? " mx__sepL" : "") + (o.piv && o.piv[0] === i && o.piv[1] === j ? " is-piv" : "") + (o.hi && o.hi.some((p) => p[0] === i && p[1] === j) ? " is-hi" : ""); h += '<span class="' + cl + '">' + esc(S(x)) + "</span>"; }));
    return h + "</div></div>";
  }
  const matText = (M) => M.map((r) => "[ " + r.map(S).join("  ") + " ]").join("\n   ");
  const sizeTxt = (M) => rows(M) + "×" + cols(M);
  const tile = (k, v) => ({ k, v });
  const nameOf = (k) => (k === "A" ? "A" : "B");

  // ===== вкладка «Дії» =====
  const OPLAB = { add: "A + B", sub: "A − B", mul: "A × B", mulBA: "B × A", scal: "k·M", pow: "Mⁿ", tr: "Mᵀ" };
  function target() { return el("tgt").value === "B" ? "B" : "A"; }
  function getMats(needA, needB) {
    clearBad();
    const errs = []; let A = null, B = null;
    if (needA) { const r = readMat("A"); errs.push(...r.errs); A = r.M; }
    if (needB) { const r = readMat("B"); errs.push(...r.errs); B = r.M; }
    return { A, B, errs };
  }
  const errMsg = (errs) => L("Некоректні клітинки: ", "Invalid cells: ") + errs.slice(0, 5).join("; ") + (errs.length > 5 ? "…" : "") + L(". Вводьте числа, десяткові дроби (2,5) або дроби (3/4).", ". Enter numbers, decimals (2.5) or fractions (3/4).");
  function elementLines(R0, C0, f, maxN) { // f(i,j) → рядок
    const out = []; let n = 0;
    for (let i = 0; i < R0 && n < maxN; i++) for (let j = 0; j < C0 && n < maxN; j++) { out.push(f(i, j)); n++; }
    if (R0 * C0 > maxN) out.push("…");
    return out;
  }
  function modeOp() {
    const op = el("opk").value, T0 = target();
    const two = op === "add" || op === "sub" || op === "mul" || op === "mulBA";
    const g = getMats(two || T0 === "A", two || T0 === "B");
    if (g.errs.length) return { ok: false, msg: errMsg(g.errs) };
    const Msel = T0 === "A" ? g.A : g.B, Mname = T0;
    const steps = []; let res, label, expr, tiles = [];
    if (op === "add" || op === "sub") {
      const A = g.A, B = g.B;
      if (rows(A) !== rows(B) || cols(A) !== cols(B)) return { ok: false, msg: L("Додавати й віднімати можна лише матриці однакового розміру: A — " + sizeTxt(A) + ", B — " + sizeTxt(B) + ".", "Only matrices of the same size can be added or subtracted: A is " + sizeTxt(A) + ", B is " + sizeTxt(B) + ".") };
      const pl = op === "add" ? "+" : MN;
      res = op === "add" ? mAdd(A, B) : mSub(A, B); label = "A " + pl + " B"; expr = label;
      steps.push(step(L("Вихідні матриці", "The matrices"), [L("Розмір обох: ", "Both are ") + sizeTxt(A)], [mat(A, { label: "A" }), mat(B, { label: "B" })]));
      steps.push(step(L("Поелементна дія", "Element by element"), elementLines(rows(A), cols(A), (i, j) => nm("c", i, j) + " = " + nm("a", i, j) + " " + pl + " " + nm("b", i, j) + " = " + SP(A[i][j]) + " " + pl + " " + SP(B[i][j]) + " = " + S(res[i][j]), 9), [], L("Кожен елемент результату — сума чи різниця елементів на тих самих місцях.", "Each element of the result is the sum or difference of the elements in the same positions.")));
    } else if (op === "mul" || op === "mulBA") {
      const X = op === "mul" ? g.A : g.B, Y = op === "mul" ? g.B : g.A, nx = op === "mul" ? "A" : "B", ny = op === "mul" ? "B" : "A";
      if (cols(X) !== rows(Y)) return { ok: false, msg: L("Множення " + nx + "×" + ny + " неможливе: кількість стовпців " + nx + " (" + cols(X) + ") має дорівнювати кількості рядків " + ny + " (" + rows(Y) + ").", "The product " + nx + "×" + ny + " is not defined: the number of columns of " + nx + " (" + cols(X) + ") must equal the number of rows of " + ny + " (" + rows(Y) + ").") };
      res = mMul(X, Y); label = nx + " × " + ny; expr = label;
      steps.push(step(L("Розміри", "Sizes"), [nx + ": " + sizeTxt(X) + ",  " + ny + ": " + sizeTxt(Y) + L("  →  результат ", "  →  the result is ") + sizeTxt(res)], [mat(X, { label: nx }), mat(Y, { label: ny })], L("Стовпців першої матриці стільки ж, скільки рядків другої.", "The first matrix has as many columns as the second has rows.")));
      steps.push(step(L("Елементи добутку", "The elements of the product"), elementLines(rows(res), cols(res), (i, j) => nm("c", i, j) + " = " + Array.from({ length: cols(X) }, (_, k) => SP(X[i][k]) + "·" + SP(Y[k][j])).join(" + ") + " = " + S(res[i][j]), 9), [], L("cᵢⱼ — сума добутків елементів i-го рядка першої матриці на j-й стовпець другої.", "cᵢⱼ is the sum of the products of the elements of row i of the first matrix and column j of the second.")));
    } else if (op === "scal") {
      const kp = parseCell(el("kv").value);
      if (kp.err) return { ok: false, msg: L("Число k: введіть ціле, десяткове чи дріб (наприклад 2, -1,5, 3/4).", "The number k: enter an integer, a decimal or a fraction (for example 2, -1.5, 3/4).") };
      const k = el("kv").value.trim() ? kp.v : Q1;
      res = mScale(Msel, k); label = S(k) + "·" + Mname; expr = label;
      steps.push(step(L("Матриця", "The matrix"), [Mname + ": " + sizeTxt(Msel) + ",  k = " + S(k)], [mat(Msel, { label: Mname })]));
      steps.push(step(L("Множення на число", "Multiplying by a number"), elementLines(rows(res), cols(res), (i, j) => nm("c", i, j) + " = k·" + nm("a", i, j) + " = " + SP(k) + "·" + SP(Msel[i][j]) + " = " + S(res[i][j]), 9), [], L("Кожен елемент матриці множиться на k.", "Each element of the matrix is multiplied by k.")));
    } else if (op === "tr") {
      res = mT(Msel); label = Mname + "ᵀ"; expr = label;
      steps.push(step(L("Транспонування", "Transposition"), [Mname + ": " + sizeTxt(Msel) + "  →  " + Mname + "ᵀ: " + sizeTxt(res), L("Елемент (i, j) переходить на місце (j, i): рядки стають стовпцями.", "The element (i, j) moves to the place (j, i): rows become columns.")], [mat(Msel, { label: Mname }), mat(res, { label: Mname + "ᵀ" })]));
    } else { // pow
      const M0 = Msel;
      if (rows(M0) !== cols(M0)) return { ok: false, msg: L("Степінь визначений лише для квадратних матриць: " + Mname + " — " + sizeTxt(M0) + ".", "A power is defined only for square matrices: " + Mname + " is " + sizeTxt(M0) + ".") };
      const nraw = el("nv").value.trim().replace(/[−–—]/g, "-");
      if (!/^-?\d{1,2}$/.test(nraw) || Math.abs(Number(nraw)) > 30) return { ok: false, msg: L("Показник n: введіть ціле число від −30 до 30.", "The exponent n: enter a whole number from −30 to 30.") };
      const n = Number(nraw), a = Math.abs(n);
      let base = M0;
      steps.push(step(L("Матриця", "The matrix"), [Mname + ": " + sizeTxt(M0) + ",  n = " + (n < 0 ? MN + a : n)], [mat(M0, { label: Mname })]));
      if (n < 0) {
        const gr = gaussRun(M0.map((r, i) => r.concat(mI(rows(M0))[i])), "rref", rows(M0));
        if (gr.rank < rows(M0)) return { ok: false, msg: L("Від'ємний степінь потребує оберненої матриці, а " + Mname + " вироджена (det = 0).", "A negative power needs the inverse, and " + Mname + " is singular (det = 0).") };
        base = gr.A.map((r) => r.slice(rows(M0)));
        steps.push(step(L("Обернена матриця", "The inverse matrix"), [Mname + L("⁻ⁿ = (", "⁻ⁿ = (") + Mname + "⁻¹)ⁿ"], [mat(base, { label: Mname + "⁻¹" })], L("Її знайдено методом Гаусса–Жордана (див. вкладку «Обернена матриця»).", "It is found by Gauss–Jordan elimination (see the «Inverse matrix» tab).")));
      }
      if (a === 0) res = mI(rows(M0));
      else if (a <= 5) { let cur = base; const list = [mat(base, { label: Mname + (n < 0 ? "⁻¹" : "") })]; for (let k = 2; k <= a; k++) { cur = mMul(cur, base); list.push(mat(cur, { label: (n < 0 ? Mname + "⁻" + k : Mname + "^" + k) })); } res = cur; if (a > 1) steps.push(step(L("Послідовні степені", "Successive powers"), [L("Кожен наступний степінь — добуток попереднього на основу.", "Each next power is the product of the previous one and the base.")], list)); }
      else { // двійкове піднесення
        let result = mI(rows(M0)), p = base, e = a; const sq = [mat(base, { label: "M¹" })]; let k = 1;
        const bits = [];
        while (e > 0) { if (e & 1) { result = mMul(result, p); bits.push(k); } e >>= 1; if (e > 0) { p = mMul(p, p); k *= 2; if (e > 0) sq.push(mat(p, { label: "M^" + k })); } }
        res = result;
        steps.push(step(L("Піднесення до степеня квадратами", "Exponentiation by squaring"), [L("n = ", "n = ") + a + " = " + bits.join(" + "), L("Беремо квадрати M, M², M⁴, … і перемножуємо ті, що входять у розклад n.", "We take the squares M, M², M⁴, … and multiply those that appear in the decomposition of n.")], sq.slice(0, 5)));
      }
      label = Mname + "^" + (n < 0 ? MN + a : n); expr = label;
    }
    steps.push(step(L("Результат", "The result"), [label + " " + L("— матриця ", "is a ") + sizeTxt(res) + (rows(res) === cols(res) ? L(", визначник ", ", determinant ") + S(detQ(res)) : "")], [mat(res, { label })]));
    tiles.push(tile(L("Розмір результату", "Result size"), sizeTxt(res)));
    if (rows(res) === cols(res)) tiles.push(tile(L("Визначник", "Determinant"), S(detQ(res))), tile(L("Слід", "Trace"), S(res.reduce((s, r, i) => qadd(s, r[i]), Q0))));
    return { ok: true, expr, resM: res, resLabel: label, tiles, steps, resText: label + " =\n   " + matText(res) };
  }

  // ===== вкладка «Визначник» =====
  function detSteps(A, method, ix) {
    const n = rows(A), steps = [];
    if (n === 1) { steps.push(step(L("Матриця 1×1", "A 1×1 matrix"), ["det A = a₁₁ = " + S(A[0][0])], [mat(A, { label: "A" })])); return { det: A[0][0], steps }; }
    let meth = method;
    if (meth === "sar" && n > 3) { meth = "gauss"; steps.push(step(L("Метод", "The method"), [L("Правило Саррюса й трикутника — лише для 2×2 і 3×3, тому використано метод Гаусса.", "The Sarrus and triangle rules are only for 2×2 and 3×3, so Gauss elimination is used.")])); }
    if ((meth === "row" || meth === "col") && n > 4) { meth = "gauss"; steps.push(step(L("Метод", "The method"), [L("Розклад за рядком чи стовпцем показується до 4×4, тому використано метод Гаусса.", "Cofactor expansion is shown up to 4×4, so Gauss elimination is used.")])); }
    if (n === 2 && meth !== "gauss") {
      const d = qsub(qmul(A[0][0], A[1][1]), qmul(A[0][1], A[1][0]));
      steps.push(step(L("Формула для 2×2", "The 2×2 formula"), ["det A = a₁₁a₂₂ − a₁₂a₂₁ = " + SP(A[0][0]) + "·" + SP(A[1][1]) + " − " + SP(A[0][1]) + "·" + SP(A[1][0]) + " = " + S(qmul(A[0][0], A[1][1])) + " − " + SP(qmul(A[0][1], A[1][0])) + " = " + S(d)], [mat(A, { label: "A" })], L("Добуток елементів головної діагоналі мінус добуток елементів побічної.", "The product of the main diagonal minus the product of the anti-diagonal.")));
      return { det: d, steps };
    }
    if (meth === "sar") { // 3×3
      const a = (i, j) => A[i][j], P = [[a(0, 0), a(1, 1), a(2, 2)], [a(0, 1), a(1, 2), a(2, 0)], [a(0, 2), a(1, 0), a(2, 1)], [a(0, 2), a(1, 1), a(2, 0)], [a(0, 0), a(1, 2), a(2, 1)], [a(0, 1), a(1, 0), a(2, 2)]];
      const vals = P.map((t) => qmul(qmul(t[0], t[1]), t[2])), d = qsub(qadd(qadd(vals[0], vals[1]), vals[2]), qadd(qadd(vals[3], vals[4]), vals[5]));
      steps.push(step(L("Правило Саррюса", "The Sarrus rule"), ["det A = a₁₁a₂₂a₃₃ + a₁₂a₂₃a₃₁ + a₁₃a₂₁a₃₂ − a₁₃a₂₂a₃₁ − a₁₁a₂₃a₃₂ − a₁₂a₂₁a₃₃"], [mat(A, { label: "A" })], L("Три добутки по головній діагоналі й паралелях до неї беруться з плюсом, три по побічній — з мінусом.", "Three products along the main diagonal and its parallels take a plus, three along the anti-diagonal take a minus.")));
      steps.push(step(L("Підстановка", "Substitution"), P.map((t, i) => (i < 3 ? "+ " : MN + " ") + SP(t[0]) + "·" + SP(t[1]) + "·" + SP(t[2]) + " = " + S(vals[i])).concat(["det A = " + S(d)])));
      return { det: d, steps };
    }
    if (meth === "row" || meth === "col") {
      const byRow = meth === "row", k = Math.min(Math.max(ix, 1), n) - 1;
      const terms = [], lines = [];
      for (let t = 0; t < n; t++) {
        const i = byRow ? k : t, j = byRow ? t : k, a = A[i][j], mn = detQ(minorOf(A, i, j)), sg = (i + j) % 2 === 0 ? 1 : -1, term = qmul(a, sg > 0 ? mn : qneg(mn));
        terms.push(term);
        lines.push(nm("a", i, j) + "·(−1)^(" + (i + 1) + "+" + (j + 1) + ")·" + nm("M", i, j) + " = " + SP(a) + "·(" + (sg > 0 ? "+1" : MN + "1") + ")·" + SP(mn) + " = " + S(term));
      }
      const d = terms.reduce((s, x) => qadd(s, x), Q0);
      steps.push(step(L("Розклад за " + (byRow ? "рядком " : "стовпцем ") + (k + 1), "Expansion along " + (byRow ? "row " : "column ") + (k + 1)), ["det A = Σ aᵢⱼ·(−1)^(i+j)·Mᵢⱼ"], [mat(A, { label: "A" })], L("Mᵢⱼ — мінор: визначник матриці без i-го рядка й j-го стовпця. Зручно розкладати за рядком чи стовпцем з нулями.", "Mᵢⱼ is the minor: the determinant of the matrix without row i and column j. It is convenient to expand along a row or column with zeros.")));
      if (n === 3) {
        const ml = [];
        for (let t = 0; t < n; t++) { const i = byRow ? k : t, j = byRow ? t : k, Mi = minorOf(A, i, j), v = qsub(qmul(Mi[0][0], Mi[1][1]), qmul(Mi[0][1], Mi[1][0])); ml.push(nm("M", i, j) + " = " + SP(Mi[0][0]) + "·" + SP(Mi[1][1]) + " − " + SP(Mi[0][1]) + "·" + SP(Mi[1][0]) + " = " + S(v)); }
        steps.push(step(L("Мінори", "The minors"), ml));
      } else steps.push(step(L("Мінори", "The minors"), [L("Кожен мінор — визначник 3×3, обчислений окремо.", "Each minor is a 3×3 determinant computed separately.")]));
      steps.push(step(L("Доданки", "The terms"), lines.concat(["det A = " + terms.map(S).map((s2, i) => (i ? " + " : "") + (s2[0] === MN && i ? "(" + s2 + ")" : s2)).join("") + " = " + S(d)])));
      return { det: d, steps };
    }
    // Гаусс
    const gr = gaussRun(A, "ref", n);
    steps.push(step(L("Ідея", "The idea"), [L("Зводимо матрицю до трикутного вигляду елементарними перетвореннями. Додавання до рядка іншого, помноженого на число, визначника не змінює; обмін рядків змінює знак.", "We reduce the matrix to triangular form. Adding a multiple of one row to another does not change the determinant; swapping rows changes its sign.")], [mat(A, { label: "A" })]));
    gr.groups.forEach((gp, k) => steps.push(step(L("Крок ", "Step ") + (k + 1) + L(": стовпець ", ": column ") + (gp.col + 1), gp.ops.length ? gp.ops : [L("Під ведучим елементом уже нулі.", "There are already zeros under the pivot.")], [mat(gp.state, { piv: gp.pivot })])));
    let d;
    if (gr.rank < n) { d = Q0; steps.push(step(L("Висновок", "Conclusion"), [L("У стовпці " + (gr.skipped[0] + 1) + " немає ведучого елемента (під діагоналлю самі нулі), тому det A = 0.", "Column " + (gr.skipped[0] + 1) + " has no pivot (only zeros below the diagonal), so det A = 0.")])); }
    else { const prod = gr.A.reduce((s, r, i) => qmul(s, r[i]), Q1); d = gr.swaps % 2 ? qneg(prod) : prod; steps.push(step(L("Добуток діагоналі", "The product of the diagonal"), ["det A = " + (gr.swaps % 2 ? "(−1)^" + gr.swaps + "·" : "") + gr.A.map((r, i) => SP(r[i])).join("·") + " = " + S(d)], [], gr.swaps ? L("Знак змінено, бо рядки міняли місцями " + gr.swaps + " раз(и).", "The sign changes because rows were swapped " + gr.swaps + " time(s).") : "")); }
    return { det: d, steps };
  }
  function modeDt() {
    const T0 = target(), g = getMats(T0 === "A", T0 === "B");
    if (g.errs.length) return { ok: false, msg: errMsg(g.errs) };
    const A = T0 === "A" ? g.A : g.B;
    if (rows(A) !== cols(A)) return { ok: false, msg: L("Визначник існує лише для квадратних матриць: " + T0 + " — " + sizeTxt(A) + ".", "The determinant exists only for square matrices: " + T0 + " is " + sizeTxt(A) + ".") };
    const ixr = el("ixv").value.trim(), ix = ixr ? Number(ixr) : 1;
    if ((el("dmk").value === "row" || el("dmk").value === "col") && (!Number.isInteger(ix) || ix < 1 || ix > rows(A))) return { ok: false, msg: L("Номер рядка чи стовпця має бути цілим від 1 до " + rows(A) + ".", "The row or column number must be a whole number from 1 to " + rows(A) + ".") };
    const r = detSteps(A, el("dmk").value, ix);
    const n = rows(A);
    return { ok: true, expr: "det " + T0 + " (" + sizeTxt(A) + ")", resM: null, headVal: ["det " + T0, S(r.det)], tiles: [tile(L("Визначник", "Determinant"), S(r.det)), tile(L("Матриця", "The matrix"), qz(r.det) ? L("вироджена", "singular") : L("невироджена", "non-singular")), tile(L("Розмір", "Size"), n + "×" + n)], steps: r.steps, resText: "det " + T0 + " = " + S(r.det) };
  }

  // ===== вкладка «Обернена матриця» =====
  function modeIv() {
    const T0 = target(), g = getMats(T0 === "A", T0 === "B");
    if (g.errs.length) return { ok: false, msg: errMsg(g.errs) };
    const A = T0 === "A" ? g.A : g.B, n = rows(A);
    if (n !== cols(A)) return { ok: false, msg: L("Обернена існує лише для квадратних матриць: " + T0 + " — " + sizeTxt(A) + ".", "The inverse exists only for square matrices: " + T0 + " is " + sizeTxt(A) + ".") };
    const det = detQ(A), steps = [], method = el("ivm").value;
    if (qz(det)) {
      // показуємо, де виникає виродженість
      const gr = gaussRun(A, "ref", n);
      steps.push(step(L("Вихідна матриця", "The matrix"), ["det " + T0 + " = " + S(det)], [mat(A, { label: T0 })]));
      gr.groups.forEach((gp, k) => steps.push(step(L("Крок ", "Step ") + (k + 1) + L(": стовпець ", ": column ") + (gp.col + 1), gp.ops.length ? gp.ops : [L("Під ведучим елементом уже нулі.", "There are already zeros under the pivot.")], [mat(gp.state, { piv: gp.pivot })])));
      steps.push(step(L("Висновок", "Conclusion"), [L("Визначник дорівнює нулю (стовпець " + (gr.skipped[0] + 1) + " без ведучого елемента), матриця вироджена, оберненої не існує.", "The determinant is zero (column " + (gr.skipped[0] + 1) + " has no pivot), the matrix is singular and has no inverse.")]));
      return { ok: true, expr: T0 + "⁻¹", noInverse: true, headVal: [T0 + "⁻¹", L("не існує", "does not exist")], tiles: [tile(L("Визначник", "Determinant"), "0"), tile(L("Ранг", "Rank"), String(gr.rank) + " < " + n), tile(L("Матриця", "The matrix"), L("вироджена", "singular"))], steps, resText: T0 + L("⁻¹ не існує (det = 0)", "⁻¹ does not exist (det = 0)") };
    }
    let inv;
    if (method === "adj" && n <= 4) {
      if (n === 1) { inv = [[qdiv(Q1, A[0][0])]]; steps.push(step(L("Матриця 1×1", "A 1×1 matrix"), [T0 + "⁻¹ = 1/" + SP(A[0][0]) + " = " + S(inv[0][0])], [mat(A, { label: T0 })])); }
      else {
        steps.push(step(L("Визначник", "The determinant"), ["det " + T0 + " = " + S(det) + " ≠ 0"], [mat(A, { label: T0 })], L("Обернена існує, бо визначник не нуль.", "The inverse exists because the determinant is not zero.")));
        const C = mk(n, n, (i, j) => { const m = detQ(minorOf(A, i, j)); return (i + j) % 2 ? qneg(m) : m; });
        const cl = [];
        if (n <= 3) for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) cl.push(nm("C", i, j) + " = (−1)^(" + (i + 1) + "+" + (j + 1) + ")·" + nm("M", i, j) + " = " + S(C[i][j]));
        else cl.push(L("Кожне алгебраїчне доповнення Cᵢⱼ = (−1)^(i+j)·Mᵢⱼ — визначник 3×3, обчислений окремо.", "Each cofactor Cᵢⱼ = (−1)^(i+j)·Mᵢⱼ is a 3×3 determinant computed separately."));
        steps.push(step(L("Алгебраїчні доповнення", "The cofactors"), cl, [mat(C, { label: "C" })], L("Матриця C складена з алгебраїчних доповнень елементів.", "The matrix C is made of the cofactors of the elements.")));
        const adj = mT(C);
        steps.push(step(L("Приєднана матриця", "The adjugate"), ["adj " + T0 + " = Cᵀ"], [mat(adj, { label: "adj " + T0 })], L("Це транспонована матриця доповнень.", "This is the transpose of the cofactor matrix.")));
        inv = mScale(adj, qdiv(Q1, det));
        steps.push(step(L("Обернена матриця", "The inverse"), [T0 + "⁻¹ = adj " + T0 + " / det " + T0 + " = (1/" + SP(det) + ")·adj " + T0], [mat(inv, { label: T0 + "⁻¹" })]));
      }
    } else {
      const aug = A.map((r, i) => r.concat(mI(n)[i])), gr = gaussRun(aug, "rref", n);
      steps.push(step(L("Схема", "The scheme"), [L("Записуємо [" + T0 + " | E] і елементарними перетвореннями рядків зводимо ліву частину до одиничної: тоді права стане оберненою.", "We write [" + T0 + " | E] and reduce the left part to the identity by row operations: the right part then becomes the inverse.")], [mat(aug, { label: "[" + T0 + " | E]", sep: n })], L("det " + T0 + " = " + S(det) + " ≠ 0, тому обернена існує.", "det " + T0 + " = " + S(det) + " ≠ 0, so the inverse exists.")));
      gr.groups.forEach((gp, k) => steps.push(step(L("Крок ", "Step ") + (k + 1) + L(": стовпець ", ": column ") + (gp.col + 1), gp.ops.length ? gp.ops : [L("Стовпець уже має потрібний вигляд.", "The column already has the required form.")], [mat(gp.state, { sep: n, piv: gp.pivot })])));
      inv = gr.A.map((r) => r.slice(n));
      steps.push(step(L("Обернена матриця", "The inverse"), [L("Права частина — це ", "The right part is ") + T0 + "⁻¹"], [mat(inv, { label: T0 + "⁻¹" })]));
    }
    const prod = mMul(A, inv);
    steps.push(step(L("Перевірка", "Check"), [T0 + "·" + T0 + "⁻¹ = E " + (isIdent(prod) ? "✓" : "✗")], [mat(prod, { label: T0 + "·" + T0 + "⁻¹" })]));
    return { ok: true, expr: T0 + "⁻¹ (" + sizeTxt(A) + ")", resM: inv, resLabel: T0 + "⁻¹", tiles: [tile(L("Визначник", "Determinant"), S(det)), tile(L("Ранг", "Rank"), String(n)), tile(L("Перевірка", "Check"), isIdent(prod) ? T0 + "·" + T0 + "⁻¹ = E ✓" : "✗")], steps, resText: T0 + "⁻¹ =\n   " + matText(inv) };
  }

  // ===== вкладка «Ранг» =====
  function modeRk() {
    const T0 = target(), g = getMats(T0 === "A", T0 === "B");
    if (g.errs.length) return { ok: false, msg: errMsg(g.errs) };
    const A = T0 === "A" ? g.A : g.B, R0 = rows(A), C0 = cols(A);
    const gr = gaussRun(A, "rref", C0), steps = [];
    steps.push(step(L("Ідея", "The idea"), [L("Ранг — кількість ненульових рядків у ступінчастому вигляді. Зводимо матрицю методом Гаусса–Жордана.", "The rank is the number of non-zero rows in the echelon form. We reduce the matrix by Gauss–Jordan elimination.")], [mat(A, { label: T0 })]));
    gr.groups.forEach((gp, k) => steps.push(step(L("Крок ", "Step ") + (k + 1) + L(": стовпець ", ": column ") + (gp.col + 1), gp.ops.length ? gp.ops : [L("Стовпець уже має потрібний вигляд.", "The column already has the required form.")], [mat(gp.state, { piv: gp.pivot })])));
    const rank = gr.rank;
    steps.push(step(L("Ранг", "The rank"), ["rank " + T0 + " = " + rank, L("Ведучі стовпці: ", "Pivot columns: ") + (gr.piv.length ? gr.piv.map((p) => p[1] + 1).join(", ") : "—"), L("Дефект (кількість вільних змінних): ", "Nullity (the number of free variables): ") + (C0 - rank)], [mat(gr.A, { label: L("Ступінчастий вигляд", "Echelon form") })]));
    const sq = R0 === C0, kinds = [];
    const tr = sq ? A.reduce((s, r, i) => qadd(s, r[i]), Q0) : null;
    if (sq) {
      const isSym = mEq(A, mT(A)), isSkew = mEq(A, mScale(mT(A), q(-1n))), isDiag = A.every((r, i) => r.every((x, j) => i === j || qz(x))), isUp = A.every((r, i) => r.every((x, j) => j >= i || qz(x))), isLo = A.every((r, i) => r.every((x, j) => j <= i || qz(x))), isOrt = isIdent(mMul(mT(A), A));
      if (A.every((r) => r.every(qz))) kinds.push(L("нульова", "zero"));
      if (isIdent(A)) kinds.push(L("одинична", "identity"));
      if (isDiag) kinds.push(L("діагональна", "diagonal")); else { if (isUp) kinds.push(L("верхня трикутна", "upper triangular")); if (isLo) kinds.push(L("нижня трикутна", "lower triangular")); }
      if (isSym) kinds.push(L("симетрична", "symmetric")); if (isSkew && !A.every((r) => r.every(qz))) kinds.push(L("антисиметрична", "skew-symmetric")); if (isOrt) kinds.push(L("ортогональна", "orthogonal"));
      const d = detQ(A);
      steps.push(step(L("Слід, визначник і тип", "Trace, determinant and type"), ["tr " + T0 + " = " + A.map((r, i) => SP(r[i])).join(" + ") + " = " + S(tr), "det " + T0 + " = " + S(d) + (qz(d) ? L(" (вироджена)", " (singular)") : L(" (невироджена)", " (non-singular)")), L("Тип: ", "Type: ") + (kinds.length ? kinds.join(", ") : L("загального вигляду", "general"))], [], L("Слід — сума елементів головної діагоналі.", "The trace is the sum of the main diagonal elements.")));
    }
    return { ok: true, expr: "rank " + T0 + " (" + sizeTxt(A) + ")", resM: gr.A, resLabel: L("Ступінчастий вигляд", "Echelon form"), headVal: ["rank " + T0, String(rank)], tiles: [tile(L("Ранг", "Rank"), String(rank)), tile(sq ? L("Слід", "Trace") : L("Розмір", "Size"), sq ? S(tr) : sizeTxt(A)), tile(sq ? L("Визначник", "Determinant") : L("Дефект", "Nullity"), sq ? S(detQ(A)) : String(C0 - rank))], steps, resText: "rank " + T0 + " = " + rank + "\n   " + matText(gr.A) };
  }

  // ===== вкладка «AX = B» =====
  function modeSx() {
    const g = getMats(true, true);
    if (g.errs.length) return { ok: false, msg: errMsg(g.errs) };
    const A = g.A, B = g.B, n = rows(A), m = cols(A), k = cols(B);
    if (rows(B) !== n) return { ok: false, msg: L("Матриці A і B мають мати однакову кількість рядків: A — " + sizeTxt(A) + ", B — " + sizeTxt(B) + ".", "A and B must have the same number of rows: A is " + sizeTxt(A) + ", B is " + sizeTxt(B) + ".") };
    const aug = A.map((r, i) => r.concat(B[i])), steps = [];
    const det = n === m ? detQ(A) : null;
    const gr = gaussRun(aug, "rref", m);
    steps.push(step(L("Система", "The system"), [L("AX = B, де A — " + sizeTxt(A) + ", B — " + sizeTxt(B) + ". Розширена матриця [A | B]:", "AX = B, where A is " + sizeTxt(A) + " and B is " + sizeTxt(B) + ". The augmented matrix [A | B]:")], [mat(aug, { label: "[A | B]", sep: m })], n === m ? L("det A = " + S(det) + (qz(det) ? " — вироджена." : " ≠ 0 — єдиний розв'язок."), "det A = " + S(det) + (qz(det) ? " — singular." : " ≠ 0 — a unique solution.")) : ""));
    gr.groups.forEach((gp, i) => steps.push(step(L("Крок ", "Step ") + (i + 1) + L(": стовпець ", ": column ") + (gp.col + 1), gp.ops.length ? gp.ops : [L("Стовпець уже має потрібний вигляд.", "The column already has the required form.")], [mat(gp.state, { sep: m, piv: gp.pivot })])));
    const rankA = gr.rank;
    const incons = (col) => gr.A.some((r) => r.slice(0, m).every(qz) && !qz(r[m + col]));
    if (n === m && !qz(det)) {
      const X = gr.A.map((r) => r.slice(m));
      steps.push(step(L("Розв'язок", "The solution"), [L("Ліва частина стала одиничною, права — розв'язок X = A⁻¹B.", "The left part became the identity, the right part is the solution X = A⁻¹B.")], [mat(X, { label: "X" })]));
      const ch = mMul(A, X);
      steps.push(step(L("Перевірка", "Check"), ["A·X = B " + (mEq(ch, B) ? "✓" : "✗")], [mat(ch, { label: "A·X" })]));
      const vars = X.map((r, i) => "x" + sb(i + 1) + " = " + r.map(S).join(",  ")).join("\n   ");
      return { ok: true, expr: "AX = B", resM: X, resLabel: "X", tiles: [tile(L("Розв'язок", "Solution"), L("єдиний", "unique")), tile(L("Ранг A", "Rank of A"), String(rankA)), tile("det A", S(det))], steps, resText: "X =\n   " + matText(X) + (k === 1 ? "\n   " + vars : "") };
    }
    if (k > 1) return { ok: false, msg: L("Для виродженої чи неквадратної A вкажіть один стовпець B: тоді буде повний аналіз і загальний розв'язок.", "For a singular or non-square A enter a single column B: then the full analysis and the general solution are given.") };
    if (incons(0)) {
      steps.push(step(L("Висновок", "Conclusion"), [L("З'явився рядок 0 = c, де c ≠ 0: система несумісна, розв'язків немає. Ранг A (" + rankA + ") менший за ранг [A | B] (" + (rankA + 1) + ").", "A row 0 = c with c ≠ 0 appeared: the system is inconsistent and has no solutions. rank A (" + rankA + ") is less than rank [A | B] (" + (rankA + 1) + ").")]));
      return { ok: true, expr: "AX = B", noSol: true, headVal: ["AX = B", L("розв'язків немає", "no solutions")], tiles: [tile(L("Розв'язок", "Solution"), L("немає", "none")), tile(L("Ранг A", "Rank of A"), String(rankA)), tile(L("Ранг [A|B]", "Rank [A|B]"), String(rankA + 1))], steps, resText: L("Розв'язків немає (система несумісна)", "No solutions (the system is inconsistent)") };
    }
    const pivCols = gr.piv.map((p) => p[1]), free = Array.from({ length: m }, (_, j) => j).filter((j) => !pivCols.includes(j));
    if (!free.length) { // єдиний розв'язок для неквадратної A (m ≤ n)
      const sol = Array.from({ length: m }, (_, j) => { const p = gr.piv.find((pp) => pp[1] === j); return gr.A[p[0]][m]; });
      steps.push(step(L("Розв'язок", "The solution"), sol.map((v, j) => "x" + sb(j + 1) + " = " + S(v)), [], L("Ранг A дорівнює кількості невідомих: розв'язок єдиний.", "The rank of A equals the number of unknowns: the solution is unique.")));
      return { ok: true, expr: "AX = B", resM: mk(m, 1, (i) => sol[i]), resLabel: "X", tiles: [tile(L("Розв'язок", "Solution"), L("єдиний", "unique")), tile(L("Ранг A", "Rank of A"), String(rankA)), tile(L("Невідомих", "Unknowns"), String(m))], steps, resText: sol.map((v, j) => "x" + sb(j + 1) + " = " + S(v)).join("\n   ") };
    }
    const tn = free.map((j, i) => "t" + sb(i + 1)), gen = [];
    for (let j = 0; j < m; j++) {
      const fi = free.indexOf(j);
      if (fi >= 0) { gen.push("x" + sb(j + 1) + " = " + tn[fi]); continue; }
      const p = gr.piv.find((pp) => pp[1] === j), row = gr.A[p[0]]; let s = qz(row[m]) ? "" : S(row[m]);
      free.forEach((fj, i) => { const c = row[fj]; if (qz(c)) return; const neg = c.n > Z; const ab = qone(babs2(c)) ? "" : (decMode() ? S(babs2(c)) : S(babs2(c))) + "·"; s += (s ? (neg ? " − " : " + ") : (neg ? MN : "")) + ab + tn[i]; });
      gen.push("x" + sb(j + 1) + " = " + (s || "0"));
    }
    steps.push(step(L("Загальний розв'язок", "The general solution"), gen, [], L("Вільні змінні: " + free.map((j) => "x" + sb(j + 1)).join(", ") + ". Розв'язків безліч: t — довільні числа.", "Free variables: " + free.map((j) => "x" + sb(j + 1)).join(", ") + ". There are infinitely many solutions: the t are arbitrary numbers.")));
    return { ok: true, expr: "AX = B", headVal: ["AX = B", L("безліч розв'язків", "infinitely many solutions")], tiles: [tile(L("Розв'язок", "Solution"), L("безліч", "infinite")), tile(L("Ранг A", "Rank of A"), String(rankA)), tile(L("Вільних змінних", "Free variables"), String(free.length))], steps, resText: gen.join("\n   ") };
  }
  const babs2 = (x) => ({ n: babs(x.n), d: x.d });

  // ===== відображення =====
  const CALC = { op: modeOp, dt: modeDt, iv: modeIv, rk: modeRk, sx: modeSx };
  function stepsHtml(steps) {
    return '<div class="mx__sub">' + L("Розв'язання", "Solution") + "</div>" + steps.map((s, i) => '<div class="mx__step"><span class="mx__stepN">' + (i + 1) + '</span><div class="mx__stepB"><b class="mx__stepT">' + esc(s.t) + "</b>" + s.l.map((x) => '<p class="mx__math">' + esc(x) + "</p>").join("") + (s.mats.length ? '<div class="mx__mrow">' + s.mats.map(matHtml).join("") + "</div>" : "") + (s.note ? '<p class="mx__stepNote">' + esc(s.note) + "</p>" : "") + "</div></div>").join("");
  }
  const clean = (s) => s.replace(/ /g, "");
  function textOf(m) {
    return clean([m.expr + "  →  " + m.resText, ""].concat(m.steps.map((s, i) => (i + 1) + ". " + s.t + "\n   " + s.l.join("\n   ") + (s.mats.length ? "\n   " + s.mats.map((x) => (x.label ? x.label + ":\n   " : "") + matText(x.M)).join("\n   ") : ""))).join("\n"));
  }
  let last = null;
  function render(m, strict) {
    const box = el("result"), b2a = el("toA"), b2b = el("toB");
    if (!m.ok) { last = null; if (b2a) { b2a.hidden = true; b2b.hidden = true; } box.innerHTML = '<div class="mx__hintbox">' + esc(m.msg || T.enter) + "</div>"; return; }
    last = m;
    const hasM = !!m.resM; b2a.hidden = !hasM; b2b.hidden = !hasM;
    const big = m.resM ? '<div class="mx__big">' + matHtml({ M: m.resM, label: m.resLabel }) + "</div>" : '<div class="mx__forms"><span class="mx__rt"><small>' + esc(m.headVal ? m.headVal[0] : "") + '</small><span class="mx__bigT">' + esc(m.headVal ? m.headVal[1] : "") + "</span></span></div>";
    const tiles = '<div class="mx__tiles">' + m.tiles.map((t) => '<div class="mx__tile"><small>' + esc(t.k) + "</small><b>" + esc(t.v) + "</b></div>").join("") + "</div>";
    box.innerHTML = '<div class="mx__rhead"><div class="mx__expr">' + esc(m.expr) + "</div>" + big + "</div>" + tiles + stepsHtml(m.steps) + '<div class="mx__note">' + L("Усі елементи точні: дроби не округлюються. Вигляд відповіді (дроби чи десяткові) змінюється в налаштуваннях.", "All elements are exact: fractions are not rounded. The answer format (fractions or decimals) is set in the settings.") + "</div>";
    void strict;
  }
  const autoOn = () => !el("autoCalc") || el("autoCalc").checked;
  function calc(strict) {
    let m;
    try { m = CALC[mode](); } catch (e) { m = { ok: false, msg: String(e && e.message ? e.message : e) }; }
    render(m, strict === true);
    return m;
  }
  function maybeCalc() { if (autoOn()) calc(); }

  // ===== матриці на сторінці =====
  const DDP = { rA: "ra", cA: "ca", rB: "rb", cB: "cb", opk: "ok", dmk: "dk", ivm: "im", tgt: "tg", fmt: "fm", decs: "dc" };
  function buildGrid(k, r, c) {
    const box = el("mat" + k), old = {};
    box.querySelectorAll("input").forEach((x) => { old[x.id] = x.value; });
    const mw = c <= 3 ? 56 : c === 4 ? 48 : c === 5 ? 42 : 36;
    box.innerHTML = ""; box.style.gridTemplateColumns = "repeat(" + c + ", minmax(" + mw + "px, 1fr))";
    box.classList.toggle("is-dense", c >= 5);
    for (let i = 0; i < r; i++) for (let j = 0; j < c; j++) {
      const inp = document.createElement("input"), id = k.toLowerCase() + "_" + i + "_" + j;
      inp.className = "mx__mi"; inp.type = "text"; inp.inputMode = "text"; inp.autocomplete = "off"; inp.spellcheck = false; inp.maxLength = 34; inp.id = id; inp.value = old[id] !== undefined ? old[id] : "0";
      inp.setAttribute("aria-label", k + "[" + (i + 1) + "," + (j + 1) + "]");
      inp.addEventListener("input", maybeCalc);
      inp.addEventListener("focus", () => inp.select());
      inp.addEventListener("keydown", (e) => {
        if (e.key === "Enter") { e.preventDefault(); calc(true); return; }
        const mv = { ArrowRight: [0, 1], ArrowLeft: [0, -1], ArrowDown: [1, 0], ArrowUp: [-1, 0] }[e.key];
        if (mv && !e.shiftKey && (e.key === "ArrowDown" || e.key === "ArrowUp" || inp.selectionStart === inp.selectionEnd)) { const nx = el(k.toLowerCase() + "_" + (i + mv[0]) + "_" + (j + mv[1])); if (nx) { e.preventDefault(); nx.focus(); } }
      });
      box.appendChild(inp);
    }
    el("dim" + k).textContent = r + "×" + c;
  }
  function setDd(hid, v) {
    const pre = DDP[hid], lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return false;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
    return true;
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
  const PANELS = { op: "panelOp", dt: "panelDt", iv: "panelIv", rk: "panelRk", sx: "panelSx" };
  function syncVis() {
    const op = el("opk").value, two = mode === "sx" || (mode === "op" && ["add", "sub", "mul", "mulBA"].includes(op)), t = target();
    el("boxA").hidden = !(two || t === "A"); el("boxB").hidden = !(two || t === "B");
    el("tgtFld").hidden = two;
    el("mats").classList.toggle("is-stack", Number(el("cA").value) >= 5 || Number(el("cB").value) >= 5);
    el("kFld").hidden = !(mode === "op" && op === "scal"); el("nFld").hidden = !(mode === "op" && op === "pow");
    const dm = el("dmk").value; el("ixFld").hidden = !(mode === "dt" && (dm === "row" || dm === "col"));
    el("ixLab").textContent = dm === "col" ? L("Номер стовпця", "Column number") : L("Номер рядка", "Row number");
  }
  function setMode(m) {
    mode = m;
    document.querySelectorAll(".mx__tab").forEach((b) => { const on = b.dataset.m === m; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
    MODES.forEach((k) => { el(PANELS[k]).hidden = k !== m; });
    syncVis(); maybeCalc();
  }
  const FIELDS = ["kv", "nv", "ixv"];
  const DDS = ["rA", "cA", "rB", "cB", "opk", "dmk", "ivm", "tgt", "fmt", "decs"];
  const DEFAULTS = { rA: "2", cA: "2", rB: "2", cB: "2", opk: "add", dmk: "row", ivm: "gj", tgt: "A", fmt: "frac", decs: "4" };
  function fillMat(k, rowsArr) { // rowsArr: масив рядків текстових клітинок
    const r = rowsArr.length, c = rowsArr[0].length;
    setDd("r" + k, String(r)); setDd("c" + k, String(c)); buildGrid(k, r, c);
    rowsArr.forEach((row, i) => row.forEach((v, j) => { el(k.toLowerCase() + "_" + i + "_" + j).value = v; }));
  }
  const zeros = (r, c) => Array.from({ length: r }, () => Array(c).fill("0"));
  function resetAll() {
    FIELDS.forEach((id) => (el(id).value = ""));
    DDS.forEach((k) => setDd(k, DEFAULTS[k]));
    el("matA").innerHTML = ""; el("matB").innerHTML = "";
    fillMat("A", zeros(2, 2)); fillMat("B", zeros(2, 2));
    syncVis(); render({ ok: false, msg: T.enter }, false); last = null; el("toA").hidden = true; el("toB").hidden = true;
  }
  const EXAMPLES = {
    op: () => { setDd("opk", "pow"); fillMat("A", [["1", "1"], ["1", "0"]]); el("nv").value = "10"; },
    dt: () => { fillMat("A", [["2", "1", "3"], ["0", "-1", "4"], ["1", "2", "1"]]); setDd("dmk", "row"); el("ixv").value = "1"; },
    iv: () => { fillMat("A", [["1", "2"], ["3", "4"]]); },
    rk: () => { fillMat("A", [["1", "2", "3"], ["4", "5", "6"], ["7", "8", "9"]]); },
    sx: () => { fillMat("A", [["2", "1"], ["1", "3"]]); fillMat("B", [["5"], ["10"]]); }
  };
  function fillExample() { resetAll(); EXAMPLES[mode](); syncVis(); calc(true); toast(T.example); }
  const gridStr = (k) => { const { r, c } = dimOf(k); return Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => String(el(k.toLowerCase() + "_" + i + "_" + j).value || "0").trim().replace(",", ".").replace(/[;|]/g, "")).join(",")).join(";"); };
  function share() {
    const p = new URLSearchParams(); p.set("m", mode);
    DDS.forEach((k) => p.set(DDP[k], el(k).value));
    FIELDS.forEach((id) => el(id).value.trim() && p.set(id, el(id).value.trim()));
    p.set("A", gridStr("A")); p.set("B", gridStr("B"));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const qs = new URLSearchParams(location.search);
    if (![...qs.keys()].length) return false;
    if (MODES.includes(qs.get("m"))) mode = qs.get("m");
    DDS.forEach((k) => { if (qs.has(DDP[k])) setDd(k, qs.get(DDP[k])); });
    FIELDS.forEach((id) => { if (qs.has(id)) el(id).value = qs.get(id).slice(0, 20); });
    ["A", "B"].forEach((k) => { if (qs.has(k)) { const rowsArr = qs.get(k).split(";").slice(0, MAXN).map((r) => r.split(",").slice(0, MAXN).map((x) => x.slice(0, 34))); const cw = Math.min(MAXN, Math.max(...rowsArr.map((r) => r.length))); rowsArr.forEach((r) => { while (r.length < cw) r.push("0"); }); fillMat(k, rowsArr); } });
    return true;
  }
  async function copyResult() {
    if (!last) { toast(T.calcFirst); return; }
    try { await navigator.clipboard.writeText(textOf(last)); toast(T.copied); } catch { toast(T.copyFailed); }
  }
  function toMatrix(k) {
    if (!last || !last.resM) return;
    fillMat(k, last.resM.map((r) => r.map((x) => (x.d === O ? String(x.n) : x.n + "/" + x.d))));
    syncVis(); maybeCalc(); toast(T.moved);
  }
  function swapAB() {
    const a = [], b = [];
    const grab = (k) => { const { r, c } = dimOf(k); return Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => el(k.toLowerCase() + "_" + i + "_" + j).value)); };
    const ga = grab("A"), gb = grab("B"); void a; void b;
    fillMat("A", gb); fillMat("B", ga); maybeCalc();
  }
  function toolFill(k, kind) {
    const { r, c } = dimOf(k);
    const val = kind === "id" ? (i, j) => (i === j ? "1" : "0") : kind === "zero" ? () => "0" : () => String(Math.floor(Math.random() * 15) - 5);
    fillMat(k, Array.from({ length: r }, (_, i) => Array.from({ length: c }, (_, j) => val(i, j)))); maybeCalc();
  }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".mx__tab").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.m)));
    DDS.forEach((k) => initDd(DDP[k], (v) => {
      setDd(k, v);
      if (k === "rA" || k === "cA") buildGrid("A", Number(el("rA").value), Number(el("cA").value));
      if (k === "rB" || k === "cB") buildGrid("B", Number(el("rB").value), Number(el("cB").value));
      syncVis(); maybeCalc();
    }));
    FIELDS.forEach((id) => { el(id).addEventListener("input", maybeCalc); el(id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); calc(true); } }); });
    document.querySelectorAll("[data-fill]").forEach((b) => b.addEventListener("click", () => toolFill(b.dataset.k, b.dataset.fill)));
    el("swapBtn").addEventListener("click", swapAB);
    el("toA").addEventListener("click", () => toMatrix("A")); el("toB").addEventListener("click", () => toMatrix("B"));
    el("calcBtn").addEventListener("click", () => { const m = calc(true); if (!m.ok && m.msg) toast(m.msg); });
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => { resetAll(); toast(T.reset); });
    el("shareBtn").addEventListener("click", share);
    el("copyBtn").addEventListener("click", copyResult);
    ["rA", "cA", "rB", "cB"].forEach((k) => setDd(k, "2"));
    buildGrid("A", 2, 2); buildGrid("B", 2, 2);
    const used = applyFromUrl();
    if (used) { buildGrid("A", Number(el("rA").value), Number(el("cA").value)); buildGrid("B", Number(el("rB").value), Number(el("cB").value)); }
    setMode(mode);
    if (used) calc(); else render({ ok: false, msg: T.enter }, false);
  });
})();
