/* unit-circle.js — одиничне коло й тригонометрія: значення sin, cos, tg, ctg для будь-якого кута (точні для кутів, кратних 15°), градуси й радіани, графік y = A·f(Bx + C) + D з амплітудою, періодом і зсувом, розв'язування sin x = a, cos x = a, tg x = a (UK/EN)
   Кут можна вводити в градусах чи радіанах, з π: 150, 150°, 5π/6, -pi/4, 3,5π. Для кутів, кратних 15°, значення записуються точно (1/2, √3/2, (√6 − √2)/4), для решти — наближено.
   Параметри графіка A, D — раціональні числа, B, C — числа або кратні π; період, зсув і ключові точки записуються точно, коли параметри точні. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const SEP = IS_EN ? "." : ",";
  const MODES = ["ci", "gr", "iv"];
  const MAXD = 30;
  let mode = "ci";
  const T = {
    enter: L("Вкажіть дані — результат з'явиться тут.", "Enter your data — the result will appear here."),
    copied: L("Результат скопійовано ✅", "Result copied ✅"),
    copyFailed: L("Не вдалось скопіювати 😕", "Could not copy 😕"),
    linkCopied: L("Посилання скопійовано ✅", "Link copied ✅"),
    reset: L("Скинуто ✅", "Reset ✅"),
    example: L("Підставлено приклад ✅", "Example filled in ✅"),
    calcFirst: L("Спочатку порахуйте результат.", "Calculate first.")
  };

  // ===== раціональні числа на BigInt =====
  const Z = 0n, O = 1n, NB = " ";
  const babs = (x) => (x < Z ? -x : x);
  const gcdB = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };
  const q = (n, d = O) => { if (d < Z) { n = -n; d = -d; } const g = gcdB(n, d) || O; return { n: n / g, d: d / g }; };
  const qadd = (x, y) => q(x.n * y.d + y.n * x.d, x.d * y.d);
  const qsub = (x, y) => q(x.n * y.d - y.n * x.d, x.d * y.d);
  const qmul = (x, y) => q(x.n * y.n, x.d * y.d);
  const qdiv = (x, y) => q(x.n * y.d, x.d * y.n);
  const qneg = (x) => ({ n: -x.n, d: x.d });
  const qz = (x) => x.n === Z;
  const qd = (x) => Number(x.n) / Number(x.d);
  const R = (n) => ({ n: BigInt(n), d: O });
  const qfloor = (x) => { let f = x.n / x.d; if (x.n < Z && f * x.d !== x.n) f -= 1n; return f; };
  const exactDec = (x) => (x.n * 10n ** 12n) % x.d === Z;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  function qdec(x, nd) {
    const ng = x.n < Z, a = babs(x.n), sc = 10n ** BigInt(nd), v = (a * sc * 2n + x.d) / (2n * x.d), s = v.toString().padStart(nd + 1, "0");
    const ip = s.slice(0, s.length - nd), fr = s.slice(s.length - nd).replace(/0+$/, "");
    return (ng && v !== Z ? "-" : "") + ip + (fr ? SEP + fr : "");
  }
  const nfq = (x) => (x.d === O ? String(x.n) : exactDec(x) ? qdec(x, 12) : x.n + "/" + x.d).replace(/^-/, "−");
  function dbl(x, nd) {
    if (!Number.isFinite(x)) return "—";
    if (Math.abs(x) >= 1e15) return x.toExponential(Math.min(nd, 6)).replace(".", SEP);
    if (Math.abs(x) < 10 ** -(nd + 1)) return "0";
    const s = x.toFixed(nd).replace(/\.?0+$/, "");
    return (s === "-0" ? "0" : s).replace(".", SEP) || "0";
  }
  const ND = () => Number(el("decs").value) || 4;
  const MN = "−";
  const neg = (s) => (s === "0" ? "0" : s[0] === MN ? s.slice(1) : MN + s);
  // кратне π: c·π → «5π/6», «π», «−π/4», «0»
  function piText(c) {
    if (qz(c)) return "0";
    const n = babs(c.n), d = c.d, sg = c.n < Z ? MN : "";
    return sg + (n === O ? "" : String(n)) + "π" + (d === O ? "" : "/" + d);
  }
  const gcdN = (a, b) => (b ? gcdN(b, a % b) : Math.abs(a));
  // «гарний» запис дійсного числа: дріб чи кратне π
  function niceX(x, nd) {
    const dec = dbl(x, nd);
    if (!Number.isFinite(x)) return { dec, ex: null };
    if (Math.abs(x) < 1e-12) return { dec: "0", ex: "0" };
    const r = Math.round(x);
    if (Math.abs(x - r) < 1e-9 * Math.max(1, Math.abs(x))) return { dec: String(r), ex: String(r) };
    for (let d = 2; d <= 24; d++) { const p = Math.round(x * d); if (Math.abs(x * d - p) < 1e-9 * d * Math.max(1, Math.abs(x)) && gcdN(p, d) === 1) return { dec, ex: (p < 0 ? MN : "") + Math.abs(p) + "/" + d }; }
    const t = x / Math.PI;
    for (let d = 1; d <= 24; d++) { const p = Math.round(t * d); if (p !== 0 && Math.abs(t * d - p) < 1e-9 * d && gcdN(p, d) === 1) return { dec, ex: piText(q(BigInt(p), BigInt(d))) }; }
    return { dec, ex: null };
  }
  const niceTxt = (x, nd) => { const n = niceX(x, nd); return n.ex && n.ex !== n.dec ? n.ex + " ≈ " + n.dec : n.dec; };

  // ===== розбір чисел і кутів =====
  const NUMRE = /^(\d+([.,]\d*)?|[.,]\d+)$/;
  function parseRat(s) {
    s = String(s).trim().replace(/[−–—]/g, "-");
    if (!s) return null;
    let sg = 1n;
    if (s[0] === "-") { sg = -1n; s = s.slice(1).trim(); } else if (s[0] === "+") s = s.slice(1).trim();
    const parts = s.split("/");
    if (parts.length > 2) return null;
    const p = parts.map((x) => { x = x.trim(); if (!NUMRE.test(x) || x.replace(/[.,]/g, "").length > MAXD) return null; const [ip, fp = ""] = x.replace(",", ".").split("."); return q(BigInt((ip || "0") + fp), 10n ** BigInt(fp.length)); });
    if (p.some((v) => v === null)) return null;
    if (p.length === 2) { if (qz(p[1])) return null; return qdiv(p[0], p[1]).n === Z ? q(0n) : q(sg * qdiv(p[0], p[1]).n, qdiv(p[0], p[1]).d); }
    return q(sg * p[0].n, p[0].d);
  }
  // число з необов'язковим π: { c: Rat, p: 0|1 } або { err }
  function parsePiNum(str, label) {
    const raw = String(str || "").trim().replace(/[−–—]/g, "-").replace(/\s+/g, "").replace(/·|\*/g, "").toLowerCase();
    if (!raw) return { empty: true };
    const bad = { err: label + ": " + L("потрібне число, дріб або кратне π (наприклад 2, 1/2, π/3).", "a number, a fraction or a multiple of π is required (for example 2, 1/2, π/3).") };
    const m = raw.match(/^(.*?)(π|pi)(.*)$/);
    if (!m) { const r = parseRat(raw); return r ? { c: r, p: 0 } : bad; }
    if (/π|pi/.test(m[3])) return bad;
    let c = q(1n);
    const pre = m[1], post = m[3];
    if (pre && pre !== "-" && pre !== "+") { const r = parseRat(pre); if (!r) return bad; c = r; } else if (pre === "-") c = q(-1n);
    if (post) { if (post[0] !== "/") return bad; const r = parseRat(post.slice(1)); if (!r) return bad; c = qdiv(c, r); }
    return { c, p: 1 };
  }
  // кут: { degQ: Rat|null, deg: число } ; одиниця за замовчуванням з налаштувань
  function parseAngle(str) {
    let raw = String(str || "").trim().replace(/[−–—]/g, "-").replace(/\s+/g, "").toLowerCase();
    if (!raw) return { empty: true };
    let unit = el("unit").value;
    if (/°$|deg$|град$/.test(raw)) { unit = "deg"; raw = raw.replace(/(°|deg|град)$/, ""); }
    else if (/rad$|рад$/.test(raw)) { unit = "rad"; raw = raw.replace(/(rad|рад)$/, ""); }
    const r = parsePiNum(raw, L("Кут", "Angle"));
    if (r.err || r.empty) return r;
    if (r.p === 1) return { degQ: qmul(r.c, R(180)), deg: qd(r.c) * 180 };
    if (unit === "deg") return { degQ: r.c, deg: qd(r.c) };
    return qz(r.c) ? { degQ: q(0n), deg: 0 } : { degQ: null, deg: (qd(r.c) * 180) / Math.PI, radNum: qd(r.c) };
  }

  // ===== точні значення для кутів, кратних 15° =====
  const S = (s, par, v) => ({ s, par: !!par, v });
  const r2 = Math.SQRT2, r3 = Math.sqrt(3), r6 = Math.sqrt(6);
  const T0 = {
    0: { sin: S("0", 0, 0), cos: S("1", 0, 1), tan: S("0", 0, 0), cot: null },
    15: { sin: S("(√6 − √2)/4", 1, (r6 - r2) / 4), cos: S("(√6 + √2)/4", 1, (r6 + r2) / 4), tan: S("2 − √3", 1, 2 - r3), cot: S("2 + √3", 1, 2 + r3) },
    30: { sin: S("1/2", 0, 0.5), cos: S("√3/2", 0, r3 / 2), tan: S("√3/3", 0, r3 / 3), cot: S("√3", 0, r3) },
    45: { sin: S("√2/2", 0, r2 / 2), cos: S("√2/2", 0, r2 / 2), tan: S("1", 0, 1), cot: S("1", 0, 1) },
    60: { sin: S("√3/2", 0, r3 / 2), cos: S("1/2", 0, 0.5), tan: S("√3", 0, r3), cot: S("√3/3", 0, r3 / 3) },
    75: { sin: S("(√6 + √2)/4", 1, (r6 + r2) / 4), cos: S("(√6 − √2)/4", 1, (r6 - r2) / 4), tan: S("2 + √3", 1, 2 + r3), cot: S("2 − √3", 1, 2 - r3) },
    90: { sin: S("1", 0, 1), cos: S("0", 0, 0), tan: null, cot: S("0", 0, 0) }
  };
  const signed = (x, sg) => (x === null ? null : sg > 0 ? x : { s: x.s === "0" ? "0" : x.par && x.s[0] !== "(" ? MN + "(" + x.s + ")" : neg(x.s), par: x.par, v: -x.v });
  // θ — ціле число градусів, кратне 15, у [0, 360)
  function exactTrig(th) {
    const quad = th === 0 ? 1 : Math.floor(th / 90) + 1;
    if (th % 90 === 0) {
      const k = th / 90;
      const tab = [{ sin: S("0", 0, 0), cos: S("1", 0, 1), tan: S("0", 0, 0), cot: null }, { sin: S("1", 0, 1), cos: S("0", 0, 0), tan: null, cot: S("0", 0, 0) }, { sin: S("0", 0, 0), cos: S(MN + "1", 0, -1), tan: S("0", 0, 0), cot: null }, { sin: S(MN + "1", 0, -1), cos: S("0", 0, 0), tan: null, cot: S("0", 0, 0) }];
      return { ...tab[k], quad: k === 0 ? 0 : k, ref: 0, axis: true };
    }
    const ref = quad === 1 ? th : quad === 2 ? 180 - th : quad === 3 ? th - 180 : 360 - th, b = T0[ref];
    const sS = quad <= 2 ? 1 : -1, cS = quad === 1 || quad === 4 ? 1 : -1, tS = quad === 1 || quad === 3 ? 1 : -1;
    return { sin: signed(b.sin, sS), cos: signed(b.cos, cS), tan: signed(b.tan, tS), cot: signed(b.cot, tS), quad, ref, axis: false };
  }
  const QNAME = [["", ""], ["I", "I"], ["II", "II"], ["III", "III"], ["IV", "IV"]];

  // ===== схема одиничного кола =====
  const label = (x, y, t, anchor, col, size) => '<text x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + (size || 13) + '" font-weight="700" fill="' + (col || "#1f2f55") + '" text-anchor="' + (anchor || "middle") + '" paint-order="stroke" stroke="#fff" stroke-width="3.5" stroke-linejoin="round">' + esc(t) + "</text>";
  const f1 = (x) => x.toFixed(1);
  function circleSvg(v) { // v: { angs:[deg...], main: deg|null, labels:{} , showTan }
    const W = 420, H = 300, cx = 210, cy = 150, Rr = 105;
    const P = (d, r = Rr) => [cx + r * Math.cos((d * Math.PI) / 180), cy - r * Math.sin((d * Math.PI) / 180)];
    let s = '<svg class="uc__svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + L("Одиничне коло", "The unit circle") + '"><rect width="' + W + '" height="' + H + '" fill="#fff"/>';
    s += '<line x1="40" y1="' + cy + '" x2="380" y2="' + cy + '" stroke="#9aa3b5" stroke-width="1.4"/><line x1="' + cx + '" y1="14" x2="' + cx + '" y2="286" stroke="#9aa3b5" stroke-width="1.4"/>';
    s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + Rr + '" fill="#f1f5fd" stroke="#4f6fb8" stroke-width="2.6"/>';
    for (let d = 0; d < 360; d += 15) { const a = P(d, Rr - 5), b = P(d, Rr + (d % 45 === 0 ? 6 : 3)); s += '<line x1="' + f1(a[0]) + '" y1="' + f1(a[1]) + '" x2="' + f1(b[0]) + '" y2="' + f1(b[1]) + '" stroke="#8aa0d4" stroke-width="' + (d % 90 === 0 ? 1.8 : 1) + '"/>'; }
    [[0, "0°", 8, 14], [90, "90°", 0, -8], [180, "180°", -8, 14], [270, "270°", 0, 20]].forEach(([d, t]) => { const p = P(d, Rr + 22); s += label(p[0], p[1] + 4, t, "middle", "#6b7a99", 12); });
    s += label(cx + 135, cy + 16, "x", "start", "#6b7a99", 12) + label(cx + 16, 24, "y", "start", "#6b7a99", 12);
    s += '<text x="' + (cx + 150) + '" y="' + (cy - 6) + '" font-size="11" fill="#9aa3b5">1</text>';
    const extra = v.angs || [];
    extra.forEach((d, i) => { const p = P(d); s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + f1(p[0]) + '" y2="' + f1(p[1]) + '" stroke="' + (i ? "#7a3fd0" : "#d85a30") + '" stroke-width="2.6"/><circle cx="' + f1(p[0]) + '" cy="' + f1(p[1]) + '" r="5.2" fill="' + (i ? "#7a3fd0" : "#d85a30") + '" stroke="#fff" stroke-width="1.6"/>'; const lp = P(d, Rr + 20); if (v.tags) s += label(lp[0], lp[1] + 4, v.tags[i] || "", "middle", i ? "#5b2eaa" : "#b4411f", 12); });
    if (v.main !== null && v.main !== undefined) {
      const d = v.main, th = (d * Math.PI) / 180, p = P(d), r = 24, e = P(d, r), big = d > 180 ? 1 : 0;
      if (d > 0.01) s += '<path d="M ' + (cx + r) + " " + cy + " A " + r + " " + r + " 0 " + big + " 0 " + f1(e[0]) + " " + f1(e[1]) + '" fill="none" stroke="#2f9d6a" stroke-width="2.6"/>';
      const lp = P(d / 2, r + 14); s += label(lp[0], lp[1] + 4, v.angLabel || "θ", "middle", "#0f6e56", 13);
      s += '<line x1="' + f1(p[0]) + '" y1="' + f1(p[1]) + '" x2="' + f1(p[0]) + '" y2="' + cy + '" stroke="#2f6fe0" stroke-width="2.2" stroke-dasharray="5 4"/>';
      s += '<line x1="' + f1(p[0]) + '" y1="' + f1(p[1]) + '" x2="' + cx + '" y2="' + f1(p[1]) + '" stroke="#d6336c" stroke-width="2.2" stroke-dasharray="5 4"/>';
      const cs = Math.cos(th), sn = Math.sin(th);
      s += label(p[0], cy + (sn > 0 ? 16 : -8), "cos", "middle", "#2f6fe0", 12) + label(cx + (cs > 0 ? -20 : 20), p[1] + 4, "sin", "middle", "#d6336c", 12);
      if (v.showTan && Math.abs(cs) > 0.08) { const t = sn / cs, y = cy - Rr * Math.max(-2.2, Math.min(2.2, t)); s += '<line x1="' + (cx + Rr) + '" y1="' + (cy - Rr * 2.4) + '" x2="' + (cx + Rr) + '" y2="' + (cy + Rr * 2.4) + '" stroke="#c9d3ea" stroke-width="1.2"/><line x1="' + (cx + Rr) + '" y1="' + cy + '" x2="' + (cx + Rr) + '" y2="' + f1(y) + '" stroke="#e0a000" stroke-width="3"/>'; s += label(cx + Rr + 12, (cy + y) / 2 + 4, "tg", "start", "#8a6400", 12); }
    }
    return s + "</svg>";
  }

  // ===== вкладка «Одиничне коло» =====
  const step = (t, lines, note) => ({ t, l: lines, note });
  const head = (rows) => '<div class="uc__forms">' + rows.map((r) => '<span class="uc__rt"><small>' + esc(r[0]) + '</small><span class="uc__big">' + esc(r[1]) + "</span></span>").join("") + "</div>";
  function modeCi() {
    const a = parseAngle(el("angle").value);
    if (a.err) return { ok: false, msg: a.err };
    if (a.empty) return { ok: false, incomplete: true };
    const nd = ND(), steps = [];
    let red, exact = false, th = null;
    if (a.degQ) {
      const k = qfloor(qdiv(a.degQ, R(360))), r = qsub(a.degQ, qmul(q(k), R(360)));
      red = qd(r);
      if (r.d === O && r.n % 15n === Z) { exact = true; th = Number(r.n); }
      steps.push(step(L("Приведення кута", "Reducing the angle"), k === Z ? [L("θ = " + nfq(a.degQ) + "° — кут уже в межах від 0° до 360°.", "θ = " + nfq(a.degQ) + "° is already between 0° and 360°.")] : ["θ = " + nfq(a.degQ) + "° = " + nfq(r) + "° + " + (k < Z ? "(" + k + ")" : k) + " · 360°", L("Тригонометричні функції мають період 360°, тому беремо кут ", "Trigonometric functions have period 360°, so we use the angle ") + nfq(r) + "°."]));
      a.red = r;
    } else {
      red = ((a.deg % 360) + 360) % 360;
      steps.push(step(L("Приведення кута", "Reducing the angle"), ["θ = " + dbl(a.radNum, nd) + " " + L("рад", "rad") + " ≈ " + dbl(a.deg, nd) + "°", L("Після віднімання повних обертів: ≈ ", "After subtracting full turns: ≈ ") + dbl(red, nd) + "°"]));
    }
    const rad = (red * Math.PI) / 180, sv = Math.sin(rad), cv = Math.cos(rad), tv = Math.abs(cv) < 1e-12 ? NaN : sv / cv, ctv = Math.abs(sv) < 1e-12 ? NaN : cv / sv;
    let E = null; if (exact) E = exactTrig(th);
    const qd0 = red === 0 ? 1 : Math.min(4, Math.floor(red / 90) + 1), axis = red % 90 === 0 && Number.isFinite(red);
    const ref = qd0 === 1 ? red : qd0 === 2 ? 180 - red : qd0 === 3 ? red - 180 : 360 - red;
    steps.push(step(L("Чверть і опорний кут", "The quadrant and the reference angle"), axis ? [L("Кут лежить на осі: ", "The angle lies on an axis: ") + (red === 0 ? "0°" : red + "°")] : [L("Чверть: ", "Quadrant: ") + QNAME[qd0][0], L("Опорний кут = ", "Reference angle = ") + (exact ? nfq(q(BigInt(Math.round(ref)))) : dbl(ref, nd)) + "°"], L("Опорний кут — гострий кут між променем і віссю x. Знаки: sin > 0 у I–II чвертях, cos > 0 у I і IV, tg > 0 у I і III.", "The reference angle is the acute angle between the ray and the x-axis. Signs: sin > 0 in quadrants I–II, cos > 0 in I and IV, tan > 0 in I and III.")));
    const valSimple = (x, numV) => (x ? (x.s === dbl(numV, nd) ? x.s : x.s + " ≈ " + dbl(numV, nd)) : L("не існує", "undefined"));
    const sinT = E ? valSimple(E.sin, sv) : "≈ " + dbl(sv, nd), cosT = E ? valSimple(E.cos, cv) : "≈ " + dbl(cv, nd);
    const tanT = E ? valSimple(E.tan, tv) : Number.isFinite(tv) ? "≈ " + dbl(tv, nd) : L("не існує", "undefined"), cotT = E ? valSimple(E.cot, ctv) : Number.isFinite(ctv) ? "≈ " + dbl(ctv, nd) : L("не існує", "undefined");
    const secT = Math.abs(cv) < 1e-12 ? L("не існує", "undefined") : dbl(1 / cv, nd), cscT = Math.abs(sv) < 1e-12 ? L("не існує", "undefined") : dbl(1 / sv, nd);
    steps.push(step(L("Значення синуса й косинуса", "Sine and cosine"), ["sin θ = " + sinT, "cos θ = " + cosT], exact ? (axis ? L("Значення на осях беруться з одиничного кола.", "The values on the axes are read from the unit circle.") : L("Значення дорівнює значенню для опорного кута " + ref + "° зі знаком чверті.", "The value equals the one for the reference angle " + ref + "° with the sign of the quadrant.")) : L("Для кутів, не кратних 15°, значення наближені.", "For angles that are not multiples of 15° the values are approximate.")));
    steps.push(step(L("Тангенс і котангенс", "Tangent and cotangent"), [L("tg", "tan") + " θ = sin θ / cos θ = " + tanT, L("ctg", "cot") + " θ = cos θ / sin θ = " + cotT, "sec θ = 1/cos θ = " + secT + ",  " + L("cosec", "csc") + " θ = 1/sin θ = " + cscT]));
    // радіани й градуси
    const conv = [];
    if (a.degQ) { const c = qdiv(a.degQ, R(180)); conv.push(nfq(a.degQ) + "° = " + piText(c) + " " + L("рад", "rad") + (qz(c) ? "" : " ≈ " + dbl(qd(c) * Math.PI, nd) + " " + L("рад", "rad"))); if (a.red && !qz(qsub(a.red, a.degQ))) conv.push(nfq(a.red) + "° = " + piText(qdiv(a.red, R(180))) + " " + L("рад", "rad")); }
    else conv.push(dbl(a.radNum, nd) + " " + L("рад", "rad") + " ≈ " + dbl(a.deg, nd) + "°");
    steps.push(step(L("Градуси й радіани", "Degrees and radians"), conv, L("π радіанів = 180°.", "π radians = 180°.")));
    const co = a.degQ ? [-360, 360].map((k) => nfq(qadd(a.red || a.degQ, R(k))) + "° (" + piText(qdiv(qadd(a.red || a.degQ, R(k)), R(180))) + ")") : [];
    if (co.length) steps.push(step(L("Співтермінальні кути", "Coterminal angles"), [L("Ті самі значення мають кути θ + 360°·k: ", "The same values belong to the angles θ + 360°·k: ") + co.join(",  ")]));
    const headRows = [["sin θ", E ? E.sin.s : dbl(sv, nd)], ["cos θ", E ? E.cos.s : dbl(cv, nd)]];
    const tl = [{ k: L("Чверть", "Quadrant"), v: axis ? L("на осі", "on an axis") : QNAME[qd0][0] }, { k: L("tg", "tan") + " θ", v: E ? (E.tan ? E.tan.s : L("не існує", "undefined")) : Number.isFinite(tv) ? dbl(tv, nd) : L("не існує", "undefined") }, { k: L("У радіанах", "In radians"), v: a.degQ ? piText(qdiv(a.degQ, R(180))) : dbl(a.radNum, nd) }];
    return { ok: true, expr: L("Кут θ = ", "Angle θ = ") + el("angle").value.trim(), head: head(headRows), tiles: tl, steps, svg: circleSvg({ angs: [red], main: red, showTan: true, angLabel: a.degQ ? "θ" : "θ" }), resText: "sin θ = " + (E ? E.sin.s : dbl(sv, nd)) + ", cos θ = " + (E ? E.cos.s : dbl(cv, nd)) + ", " + L("tg", "tan") + " θ = " + (E ? (E.tan ? E.tan.s : "—") : dbl(tv, nd)) };
  }

  // ===== вкладка «Графік y = A·f(Bx + C) + D» =====
  const FN = { sin: Math.sin, cos: Math.cos, tan: Math.tan };
  const FNLAB = { sin: "sin", cos: "cos", tan: L("tg", "tan") };
  const pv = (o) => (o.p ? qd(o.c) * Math.PI : qd(o.c));
  function modeGr() {
    const f = el("fnk").value || "sin";
    const rA = parsePiNum(el("pA").value || "1", "A"), rB = parsePiNum(el("pB").value || "1", "B"), rC = parsePiNum(el("pC").value || "0", "C"), rD = parsePiNum(el("pD").value || "0", "D");
    for (const r of [rA, rB, rC, rD]) if (r.err) return { ok: false, msg: r.err };
    if (rA.p || rD.p) return { ok: false, msg: L("A і D мають бути звичайними числами чи дробами, без π.", "A and D must be ordinary numbers or fractions, without π.") };
    if (qz(rA.c)) return { ok: false, msg: L("A не може дорівнювати нулю.", "A cannot be zero.") };
    if (qz(rB.c)) return { ok: false, msg: L("B не може дорівнювати нулю.", "B cannot be zero.") };
    const nd = ND(), A = rA.c, D = rD.c, B = rB, C = rC, aA = babs(A.n) === A.n ? A : qneg(A);
    // період і зсув: коефіцієнти при π^p
    const perBase = f === "tan" ? O : 2n, aB = { c: q(babs(B.c.n), B.c.d), p: B.p };
    const perP = 1 - B.p, perC = qdiv(R(perBase), aB.c); // T = perC · π^perP
    const T = perP === 1 ? qd(perC) * Math.PI : qd(perC);
    const shC = qneg(qdiv(C.c, B.c));
    const sp = qz(shC) ? perP : C.p - B.p; // зсув = −C/B → коефіцієнт при π^sp (нульовий зсув сумісний з будь-яким степенем)
    const ps = (sp === 0 ? qd(shC) : sp === 1 ? qd(shC) * Math.PI : qd(shC) / Math.PI);
    const psExact = sp === 0 || sp === 1, perExact = true;
    const Tt = perP === 1 ? piText(perC) : nfq(perC), pst = qz(shC) ? "0" : sp === 1 ? piText(shC) : sp === 0 ? nfq(shC) : "≈ " + dbl(ps, nd);
    const steps = [], fl = FNLAB[f];
    const Bt = (B.p ? piText(B.c) : nfq(B.c)), Ct = C.p ? piText(C.c) : nfq(C.c);
    steps.push(step(L("Функція", "The function"), ["y = " + (qz(qsub(A, R(1))) ? "" : qz(qadd(A, R(1))) ? "−" : nfq(A) + "·") + fl + "(" + (qz(qsub(B.c, R(1))) && !B.p ? "" : Bt + "·") + "x" + (qz(C.c) ? "" : (C.c.n < Z ? " − " + (C.p ? piText(qneg(C.c)) : nfq(qneg(C.c))) : " + " + Ct)) + ")" + (qz(D) ? "" : D.n < Z ? " − " + nfq(qneg(D)) : " + " + nfq(D)), "A = " + nfq(A) + ",  B = " + Bt + ",  C = " + Ct + ",  D = " + nfq(D)], L("A розтягує графік по вертикалі, B — по горизонталі, C зсуває вздовж осі x, D — уздовж осі y.", "A stretches the graph vertically, B horizontally, C shifts along the x-axis, D along the y-axis.")));
    steps.push(step(L("Період", "The period"), [(f === "tan" ? "T = π / |B| = " : "T = 2π / |B| = ") + Tt + (perP === 1 ? " ≈ " + dbl(T, nd) : "")], L("Через період графік повторюється.", "The graph repeats after one period.")));
    steps.push(step(L("Фазовий зсув", "The phase shift"), ["x₀ = −C / B = " + pst + (sp === 1 ? " ≈ " + dbl(ps, nd) : ""), ps > 1e-12 ? L("Графік зсунутий праворуч.", "The graph is shifted to the right.") : ps < -1e-12 ? L("Графік зсунутий ліворуч.", "The graph is shifted to the left.") : L("Зсуву по x немає.", "There is no shift along x.")]));
    if (f !== "tan") {
      const lo = qsub(D, aA), hi = qadd(D, aA);
      steps.push(step(L("Амплітуда й область значень", "Amplitude and range"), ["|A| = " + nfq(aA), L("Середня лінія: y = ", "Midline: y = ") + nfq(D), L("Область значень: [", "Range: [") + nfq(lo) + "; " + nfq(hi) + "]"], A.n < Z ? L("A < 0: графік відображений відносно середньої лінії.", "A < 0: the graph is reflected about the midline.") : ""));
    } else steps.push(step(L("Асимптоти й область значень", "Asymptotes and range"), [L("Область значень: усі дійсні числа.", "Range: all real numbers."), L("Вертикальні асимптоти: x = x₀ + T/2 + kT.", "Vertical asymptotes: x = x₀ + T/2 + kT."), L("Горизонтальна зміщення: y = ", "Vertical shift: y = ") + nfq(D)]));
    // ключові точки
    const kp = [];
    const fv = f === "sin" ? [0, 1, 0, -1, 0] : f === "cos" ? [1, 0, -1, 0, 1] : [-1, 0, 1];
    const ks = f === "tan" ? [-1, 0, 1] : [0, 1, 2, 3, 4];
    ks.forEach((k, i) => {
      const xE = sp === perP && (sp === 0 || sp === 1) ? qadd(shC, qmul(perC, q(BigInt(k), 4n))) : null;
      const xv = ps + (T * k) / 4, yv = qd(D) + qd(A) * fv[i];
      const xs = xE ? (sp === 1 ? piText(xE) : nfq(xE)) : dbl(xv, nd), ysq = qadd(D, qmul(A, R(fv[i])));
      kp.push([xs + (xE ? "" : ""), nfq(ysq) + (ysq.d !== O && !exactDec(ysq) ? " ≈ " + dbl(yv, nd) : "")]);
    });
    steps.push(step(L("Ключові точки на періоді", "Key points on one period"), kp.map((p) => "(" + p[0] + "; " + p[1] + ")"), L("За цими точками будується один період.", "One period is drawn through these points.")));
    // графік
    const x0 = ps - 0.5 * T, x1 = ps + 2 * T;
    const yAmp = f === "tan" ? Math.abs(qd(A)) * 3 : Math.abs(qd(A)), ylo = qd(D) - yAmp * 1.25, yhi = qd(D) + yAmp * 1.25;
    const fnJs = (x) => qd(A) * FN[f](pv(B) * x + pv(C)) + qd(D);
    const svg = graphSvg({ x0, x1, y0: ylo, y1: yhi, f: fnJs, T, ps, D: qd(D), A: qd(A), kind: f, nd });
    const tl = [{ k: L("Період T", "Period T"), v: Tt }, { k: L("Зсув x₀", "Shift x₀"), v: pst }, { k: f === "tan" ? L("Значення", "Range") : L("Амплітуда |A|", "Amplitude |A|"), v: f === "tan" ? L("усі дійсні", "all reals") : nfq(aA) }];
    return { ok: true, expr: L("Функція y = A·", "Function y = A·") + fl + L("(Bx + C) + D", "(Bx + C) + D"), head: head([["T", Tt], [L("зсув", "shift"), pst]]), tiles: tl, steps, svg, resText: "T = " + Tt + ", x₀ = " + pst };
  }
  function graphSvg(g) {
    const W = 420, H = 270, ml = 38, mr = 12, mt = 14, mb = 28;
    const X = (x) => ml + ((x - g.x0) / (g.x1 - g.x0)) * (W - ml - mr), Y = (y) => H - mb - ((y - g.y0) / (g.y1 - g.y0)) * (H - mt - mb);
    let s = '<svg class="uc__svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + L("Графік тригонометричної функції", "Graph of the trigonometric function") + '"><rect width="' + W + '" height="' + H + '" fill="#fff"/>';
    const ox = g.x0 <= 0 && g.x1 >= 0 ? X(0) : ml, oy = g.y0 <= 0 && g.y1 >= 0 ? Y(0) : H - mb;
    s += '<line x1="' + ml + '" y1="' + f1(oy) + '" x2="' + (W - mr) + '" y2="' + f1(oy) + '" stroke="#7d8aa6" stroke-width="1.4"/><line x1="' + f1(ox) + '" y1="' + mt + '" x2="' + f1(ox) + '" y2="' + (H - mb) + '" stroke="#7d8aa6" stroke-width="1.4"/>';
    // середня лінія й межі
    s += '<line x1="' + ml + '" y1="' + f1(Y(g.D)) + '" x2="' + (W - mr) + '" y2="' + f1(Y(g.D)) + '" stroke="#e0a000" stroke-width="1.6" stroke-dasharray="6 5"/>';
    if (g.kind !== "tan") [g.D + Math.abs(g.A), g.D - Math.abs(g.A)].forEach((yy) => { s += '<line x1="' + ml + '" y1="' + f1(Y(yy)) + '" x2="' + (W - mr) + '" y2="' + f1(Y(yy)) + '" stroke="#c9d3ea" stroke-width="1.2" stroke-dasharray="3 4"/>' + label(ml - 4, Y(yy) + 4, dbl(yy, 2), "end", "#5b6b8c", 11); });
    // позначки по x кожні T/4
    for (let k = -2; k <= 12; k++) { const x = g.ps + (g.T * k) / 4; if (x < g.x0 - 1e-9 || x > g.x1 + 1e-9) continue; const px = X(x); s += '<line x1="' + f1(px) + '" y1="' + (H - mb) + '" x2="' + f1(px) + '" y2="' + (H - mb + 5) + '" stroke="#7d8aa6"/>'; s += '<line x1="' + f1(px) + '" y1="' + mt + '" x2="' + f1(px) + '" y2="' + (H - mb) + '" stroke="#eef0f6"/>'; if (k % (g.kind === "tan" ? 2 : 1) === 0 || g.kind !== "tan") s += label(px, H - 10, niceX(x, 2).ex || dbl(x, 2), "middle", "#5b6b8c", 10.5); }
    if (g.kind === "tan") for (let k = -3; k <= 6; k++) { const x = g.ps + g.T / 2 + k * g.T; if (x > g.x0 && x < g.x1) s += '<line x1="' + f1(X(x)) + '" y1="' + mt + '" x2="' + f1(X(x)) + '" y2="' + (H - mb) + '" stroke="#d6336c" stroke-width="1.4" stroke-dasharray="5 4"/>'; }
    // крива
    const N = 700; let path = "", pen = false, pyp = 0;
    for (let i = 0; i <= N; i++) { const x = g.x0 + (i / N) * (g.x1 - g.x0), y = g.f(x), py = Y(y), px = X(x); if (!Number.isFinite(y) || py < mt - 400 || py > H + 400) { pen = false; continue; } if (pen && Math.abs(py - pyp) > H * 0.9) pen = false; path += (pen ? "L" : "M") + f1(px) + " " + f1(py) + " "; pen = true; pyp = py; }
    s += '<clipPath id="ucclip"><rect x="' + ml + '" y="' + mt + '" width="' + (W - ml - mr) + '" height="' + (H - mt - mb) + '"/></clipPath><path d="' + path + '" fill="none" stroke="#2f6fe0" stroke-width="2.8" stroke-linejoin="round" clip-path="url(#ucclip)"/>';
    // ключові точки
    const ks = g.kind === "tan" ? [-1, 0, 1] : [0, 1, 2, 3, 4];
    ks.forEach((k) => { const x = g.ps + (g.T * k) / 4, y = g.f(x); if (Number.isFinite(y) && x >= g.x0 && x <= g.x1) s += '<circle cx="' + f1(X(x)) + '" cy="' + f1(Y(y)) + '" r="4.4" fill="#d85a30" stroke="#fff" stroke-width="1.5"/>'; });
    s += label(W - mr - 2, Y(g.D) - 6, "y = " + dbl(g.D, 2), "end", "#8a6400", 11);
    return s + "</svg>";
  }

  // ===== вкладка «Кут за значенням» =====
  function evalExpr(str) { // числовий вираз: + − * / ^ √ sqrt ( ) π
    const s = String(str).toLowerCase().replace(/[−–—]/g, "-").replace(/\s+/g, "").replace(/,/g, ".").replace(/√/g, "sqrt").replace(/π/g, "pi");
    let i = 0;
    const err = () => { throw new Error("x"); };
    const peek = () => s[i];
    function expr() { let v = term(); for (;;) { if (peek() === "+") { i++; v += term(); } else if (peek() === "-") { i++; v -= term(); } else return v; } }
    function term() { let v = unary(); for (;;) { if (peek() === "*") { i++; v *= unary(); } else if (peek() === "/") { i++; v /= unary(); } else if (/^(sqrt|pi|\()/.test(s.slice(i))) { v *= unary(); } else return v; } }
    function unary() { if (peek() === "-") { i++; return -unary(); } if (peek() === "+") { i++; return unary(); } return pow(); }
    function pow() { const b = prim(); if (peek() === "^") { i++; return Math.pow(b, unary()); } return b; }
    function prim() {
      if (s.startsWith("sqrt", i)) { i += 4; const a = peek() === "(" ? prim() : prim(); return Math.sqrt(a); }
      if (s.startsWith("pi", i)) { i += 2; return Math.PI; }
      if (peek() === "(") { i++; const v = expr(); if (peek() !== ")") err(); i++; return v; }
      const m = s.slice(i).match(/^(\d+(\.\d+)?|\.\d+)/);
      if (!m) err();
      i += m[0].length; return Number(m[0]);
    }
    const v = expr(); if (i < s.length) err(); return v;
  }
  const DEGSET = Array.from({ length: 24 }, (_, k) => k * 15);
  function modeIv() {
    const f = el("ifn").value || "sin", raw = el("ival").value.trim();
    if (!raw) return { ok: false, incomplete: true };
    let a;
    try { a = evalExpr(raw); if (!Number.isFinite(a)) throw new Error("x"); } catch (e) { return { ok: false, msg: L("Значення «" + raw.slice(0, 20) + "» не підходить: введіть число, дріб чи вираз із √ (наприклад 1/2, √3/2, -0,5).", "The value “" + raw.slice(0, 20) + "” is not valid: enter a number, a fraction or an expression with √ (for example 1/2, √3/2, -0.5).") }; }
    if ((f === "sin" || f === "cos") && Math.abs(a) > 1 + 1e-12) return { ok: false, msg: L("Немає розв'язків: |" + (f === "sin" ? "sin" : "cos") + " x| не може бути більшим за 1.", "No solutions: |" + f + " x| cannot exceed 1.") };
    const nd = ND(), fnN = (d) => { const r = (d * Math.PI) / 180; return f === "sin" ? Math.sin(r) : f === "cos" ? Math.cos(r) : f === "tan" ? Math.tan(r) : Math.cos(r) / Math.sin(r); };
    const hit = DEGSET.filter((d) => { const v = fnN(d); return Number.isFinite(v) && Math.abs(v) < 1e8 && Math.abs(v - a) < 1e-9; });
    let sols; let exact = hit.length > 0;
    if (exact) sols = hit.slice();
    else {
      let al; // головне значення, градуси
      if (f === "sin") al = (Math.asin(a) * 180) / Math.PI; else if (f === "cos") al = (Math.acos(a) * 180) / Math.PI; else if (f === "tan") al = (Math.atan(a) * 180) / Math.PI; else al = (Math.atan(1 / a) * 180) / Math.PI;
      const norm = (x) => ((x % 360) + 360) % 360;
      sols = f === "sin" ? [norm(al), norm(180 - al)] : f === "cos" ? [norm(al), norm(-al)] : [norm(al), norm(al + 180)];
      sols = sols.filter((v, i, arr) => arr.findIndex((w) => Math.abs(w - v) < 1e-9) === i).sort((x, y) => x - y);
    }
    sols.sort((x, y) => x - y);
    const fl = { sin: "sin", cos: "cos", tan: L("tg", "tan"), cot: L("ctg", "cot") }[f];
    const steps = [];
    const aT = niceX(a, nd), aStr = aT.ex && aT.ex !== aT.dec ? aT.ex + " ≈ " + aT.dec : aT.dec;
    steps.push(step(L("Рівняння", "The equation"), [fl + " x = " + aStr], f === "sin" || f === "cos" ? L("Значення має лежати в межах від −1 до 1.", "The value must lie between −1 and 1.") : L("Тангенс і котангенс приймають будь-які значення.", "Tangent and cotangent take any value.")));
    const solTxt = sols.map((d) => exact ? d + "° = " + piText(q(BigInt(d), 180n)) + " " + L("рад", "rad") : "≈ " + dbl(d, nd) + "° ≈ " + dbl((d * Math.PI) / 180, nd) + " " + L("рад", "rad"));
    steps.push(step(L("Розв'язки на проміжку [0°; 360°)", "Solutions on [0°; 360°)"), solTxt.map((t2, i) => "x" + (i + 1) + " = " + t2), exact ? L("Точні кути знайдено за таблицею значень для кутів, кратних 15°.", "The exact angles are found from the table for multiples of 15°.") : L("Значення не збігається з табличним, тому кути наближені (через арксинус, арккосинус чи арктангенс).", "The value is not a table value, so the angles are approximate (found with arcsine, arccosine or arctangent).")));
    // загальний розв'язок
    const g = [];
    if (exact) {
      const base = sols[0];
      if (f === "sin") g.push(sols.length > 1 ? "x = " + piText(q(BigInt(sols[0]), 180n)) + " + 2πn,  x = " + piText(q(BigInt(sols[1]), 180n)) + " + 2πn,  n ∈ ℤ" : "x = " + piText(q(BigInt(sols[0]), 180n)) + " + 2πn,  n ∈ ℤ");
      else if (f === "cos") g.push(sols.length > 1 ? "x = ±" + piText(q(BigInt(sols[0]), 180n)) + " + 2πn,  n ∈ ℤ" : "x = " + piText(q(BigInt(base), 180n)) + " + 2πn,  n ∈ ℤ");
      else g.push("x = " + piText(q(BigInt(base % 180), 180n)) + " + πn,  n ∈ ℤ");
    } else {
      const al = sols[0], r0 = (al * Math.PI) / 180;
      if (f === "sin") g.push("x = (−1)ⁿ · arcsin(" + dbl(a, nd) + ") + πn ≈ (−1)ⁿ · " + dbl(Math.asin(a), nd) + " + πn,  n ∈ ℤ");
      else if (f === "cos") g.push("x = ±arccos(" + dbl(a, nd) + ") + 2πn ≈ ±" + dbl(Math.acos(a), nd) + " + 2πn,  n ∈ ℤ");
      else g.push("x = " + (f === "tan" ? "arctg(" : "arcctg(") + dbl(a, nd) + ") + πn ≈ " + dbl(r0, nd) + " + πn,  n ∈ ℤ");
    }
    steps.push(step(L("Загальний розв'язок", "The general solution"), g, L("n — довільне ціле число: додавання повних обертів не змінює значення.", "n is any whole number: adding full turns does not change the value.")));
    const tl = [{ k: L("Розв'язків на колі", "Solutions on the circle"), v: String(sols.length) }, { k: "x₁", v: exact ? sols[0] + "°" : "≈ " + dbl(sols[0], nd) + "°" }, { k: L("У радіанах", "In radians"), v: exact ? piText(q(BigInt(sols[0]), 180n)) : "≈ " + dbl((sols[0] * Math.PI) / 180, nd) }];
    const tags = sols.map((d, i) => "x" + (i + 1));
    return { ok: true, expr: fl + " x = " + raw, head: head([["x₁", exact ? sols[0] + "° = " + piText(q(BigInt(sols[0]), 180n)) : "≈ " + dbl(sols[0], nd) + "°"]].concat(sols.length > 1 ? [["x₂", exact ? sols[1] + "° = " + piText(q(BigInt(sols[1]), 180n)) : "≈ " + dbl(sols[1], nd) + "°"]] : [])), tiles: tl, steps, svg: circleSvg({ angs: sols, main: null, tags }), resText: fl + " x = " + aStr + ": " + sols.map((d) => (exact ? d + "°" : "≈ " + dbl(d, nd) + "°")).join(", ") };
  }

  // ===== відображення =====
  const CALC = { ci: modeCi, gr: modeGr, iv: modeIv };
  function stepsHtml(steps) { return '<div class="uc__sub">' + L("Розв'язання", "Solution") + "</div>" + steps.map((s, i) => '<div class="uc__step"><span class="uc__stepN">' + (i + 1) + '</span><div><b class="uc__stepT">' + esc(s.t) + "</b>" + s.l.map((x) => '<p class="uc__math">' + esc(x) + "</p>").join("") + (s.note ? '<p class="uc__stepNote">' + esc(s.note) + "</p>" : "") + "</div></div>").join(""); }
  const clean = (s) => s.replace(/ /g, "");
  function textOf(m) { return clean([m.expr + "  →  " + m.resText, ""].concat(m.steps.map((s, i) => (i + 1) + ". " + s.t + "\n   " + s.l.join("\n   "))).join("\n")); }
  let last = null;
  function render(m, strict) {
    const box = el("result");
    if (!m.ok) {
      last = null;
      if (m.incomplete && !strict) { box.innerHTML = T.enter; return; }
      box.innerHTML = '<div class="uc__hintbox">' + esc(m.msg || T.enter) + "</div>";
      return;
    }
    last = m;
    const tiles = '<div class="uc__tiles">' + m.tiles.map((t) => '<div class="uc__tile"><small>' + esc(t.k) + "</small><b>" + esc(t.v) + "</b></div>").join("") + "</div>";
    box.innerHTML = '<div class="uc__rhead"><div class="uc__expr">' + esc(m.expr) + "</div>" + m.head + "</div>" + tiles + '<div class="uc__sub">' + L("Схема", "Diagram") + '</div><div class="uc__graph">' + m.svg + "</div>" + stepsHtml(m.steps) + '<div class="uc__note">' + L("Точні значення записано дробами, радикалами й через π; десяткові наближені до обраної кількості знаків.", "Exact values are written with fractions, radicals and π; decimals are rounded to the chosen number of places.") + "</div>";
  }
  const autoOn = () => !el("autoCalc") || el("autoCalc").checked;
  function calc(strict) {
    let m;
    try { m = CALC[mode](); } catch (e) { m = { ok: false, msg: String(e && e.message ? e.message : e) }; }
    render(m, strict === true);
    return m;
  }
  function maybeCalc() { if (autoOn()) calc(); else render({ ok: false, incomplete: true }, false); }

  // ===== списки, кнопки =====
  const DDP = { fnk: "fk", ifn: "if", unit: "un", decs: "dc" };
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
  const FIELDS = ["angle", "pA", "pB", "pC", "pD", "ival"];
  const DDS = ["fnk", "ifn", "unit", "decs"];
  const PANELS = { ci: "panelCi", gr: "panelGr", iv: "panelIv" };
  function setMode(m) {
    mode = m;
    document.querySelectorAll(".uc__tab").forEach((b) => { const on = b.dataset.m === m; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
    MODES.forEach((k) => { el(PANELS[k]).hidden = k !== m; });
    maybeCalc();
  }
  const DEFAULTS = { fnk: "sin", ifn: "sin", unit: "deg", decs: "4" };
  function resetAll() { FIELDS.forEach((id) => (el(id).value = "")); DDS.forEach((k) => setDd(k, DEFAULTS[k])); maybeCalc(); }
  const put = (o) => Object.keys(o).forEach((k) => { el(k).value = o[k]; });
  const EXAMPLES = {
    ci: () => put({ angle: "150" }),
    gr: () => { setDd("fnk", "sin"); put({ pA: "2", pB: "2", pC: "-π/3", pD: "1" }); },
    iv: () => { setDd("ifn", "sin"); put({ ival: "1/2" }); }
  };
  function fillExample() { resetAll(); EXAMPLES[mode](); calc(true); toast(T.example); }
  function share() {
    const p = new URLSearchParams(); p.set("m", mode);
    DDS.forEach((k) => p.set(DDP[k], el(k).value));
    FIELDS.forEach((id) => el(id).value.trim() && p.set(id, el(id).value.trim()));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const qs = new URLSearchParams(location.search);
    if (![...qs.keys()].length) return false;
    if (MODES.includes(qs.get("m"))) mode = qs.get("m");
    DDS.forEach((k) => { if (qs.has(DDP[k])) setDd(k, qs.get(DDP[k])); });
    FIELDS.forEach((id) => { if (qs.has(id)) el(id).value = qs.get(id).slice(0, 40); });
    return true;
  }
  async function copyResult() {
    if (!last) { toast(T.calcFirst); return; }
    try { await navigator.clipboard.writeText(textOf(last)); toast(T.copied); } catch { toast(T.copyFailed); }
  }
  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".uc__tab").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.m)));
    DDS.forEach((k) => initDd(DDP[k], (v) => { setDd(k, v); maybeCalc(); }));
    FIELDS.forEach((id) => { el(id).addEventListener("input", maybeCalc); el(id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); calc(true); } }); });
    el("calcBtn").addEventListener("click", () => { const m = calc(true); if (!m.ok && m.msg) toast(m.msg); });
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => { resetAll(); toast(T.reset); });
    el("shareBtn").addEventListener("click", share);
    el("copyBtn").addEventListener("click", copyResult);
    const used = applyFromUrl();
    setMode(mode);
    if (used) calc();
  });
})();
