/* stat.js — дані статистичного калькулятора (UK/EN): описова статистика, частоти й зважене середнє, кореляція й регресія, нормальний розподіл
   Обчислення на точних раціональних числах (BigInt); корені — точні радикали, де можливо; нормальний розподіл — числова функція помилок (точність ~10⁻¹²). */
PhysCalc.start(({ L, X }) => {
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const SEP = L(",", ".");
  // ----- раціональні утиліти -----
  const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
  const q = (n, d = 1n) => { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
  const R = (n) => q(BigInt(n));
  const add = (x, y) => q(x.n * y.d + y.n * x.d, x.d * y.d), sub = (x, y) => q(x.n * y.d - y.n * x.d, x.d * y.d), mul = (x, y) => q(x.n * y.n, x.d * y.d), div = (x, y) => q(x.n * y.d, x.d * y.n);
  const cmp = (x, y) => { const a = x.n * y.d, b = y.n * x.d; return a < b ? -1 : a > b ? 1 : 0; };
  const ZERO = R(0), TWO = R(2), HUNDRED = R(100);
  const dbl = (r) => Number(r.n) / Number(r.d);
  const sum = (arr) => arr.reduce((a, b) => add(a, b), ZERO);
  const MAXN = 1000;
  const method = () => { const v = document.getElementById("gval").value; return v === "inc" || v === "exc" ? v : "half"; };
  const MNAME = { half: L("медіани половин", "median of the halves"), inc: "Excel QUARTILE.INC", exc: "Excel QUARTILE.EXC" };

  // ----- розбір списку чисел -----
  function tokens(text) {
    let s = String(text || "").replace(/ /g, " ").replace(/;/g, " ");
    s = IS_EN ? s.replace(/,/g, " ") : s.replace(/,(?=\s|$)/g, " ");
    return s.split(/\s+/).filter(Boolean);
  }
  function parseList(text, h) {
    const tk = tokens(text), out = [];
    if (tk.length > MAXN) return { err: L("Забагато чисел (максимум " + MAXN + ").", "Too many numbers (the maximum is " + MAXN + ").") };
    for (const t of tk) { const r = h.parseNum(t); if (r.err || r.empty) return { err: L("«" + t.slice(0, 14) + "» не схоже на число. Розділяйте числа пробілом, переносом рядка чи крапкою з комою; кома всередині числа — десяткова (3,5).", "“" + t.slice(0, 14) + "” is not a number. Separate numbers with a space, a comma, a semicolon or a new line.") }; out.push(r.v); }
    return { vals: out };
  }

  // ----- квартилі за допомогою функції доступу A(i), 0 ≤ i < n -----
  function medOf(A, lo, hi) { const len = hi - lo; return len % 2 ? A(lo + (len - 1) / 2) : div(add(A(lo + len / 2 - 1), A(lo + len / 2)), TWO); }
  function quartiles(A, n, m) {
    if (m === "half") { if (n === 1) return { q1: A(0), q3: A(0) }; const k = Math.floor(n / 2); return { q1: medOf(A, 0, k), q3: medOf(A, n - k, n) }; }
    if (m === "inc") { const pos = (k) => q(BigInt(k) * BigInt(n - 1), 4n), val = (p) => { const i = p.n / p.d, f = q(p.n % p.d, p.d); return f.n === 0n ? A(Number(i)) : add(A(Number(i)), mul(f, sub(A(Number(i) + 1), A(Number(i))))); }; return { q1: val(pos(1)), q3: val(pos(3)) }; }
    // exc: позиція (n+1)·k/4 з 1
    if (n < 3) return null;
    const pos = (k) => q(BigInt(k) * BigInt(n + 1), 4n), val = (p) => { const i = Number(p.n / p.d), f = q(p.n % p.d, p.d); if (i < 1) return null; if (i >= n) return A(n - 1); return f.n === 0n ? A(i - 1) : add(A(i - 1), mul(f, sub(A(i), A(i - 1)))); };
    const a = val(pos(1)), b = val(pos(3)); return a && b ? { q1: a, q3: b } : null;
  }

  // ----- графіки SVG -----
  const f1 = (v) => (Math.round(v * 10) / 10).toString();
  const svg = (w, hh, body, label) => '<svg class="ph__chart" viewBox="0 0 ' + w + " " + hh + '" role="img" aria-label="' + label + '" xmlns="http://www.w3.org/2000/svg">' + body + "</svg>";
  const tx = (x, y, t, anchor, size, col) => '<text x="' + f1(x) + '" y="' + f1(y) + '" text-anchor="' + (anchor || "middle") + '" font-size="' + (size || 11) + '" fill="' + (col || "#5b6b8c") + '">' + t + "</text>";
  const nf = (v) => { const a = Math.abs(v); const s = a >= 1e6 || (a < 1e-3 && a > 0) ? v.toExponential(2) : String(Math.round(v * 1000) / 1000); return s.replace(".", SEP); };
  function histSvg(vals, mn, mx) {
    const n = vals.length, nb = Math.min(12, Math.max(3, Math.ceil(Math.log2(n)) + 1)), W = 360, H = 170, pl = 28, pr = 10, pt = 14, pb = 28, bw = (W - pl - pr) / nb;
    let counts = new Array(nb).fill(0); const wdt = mx > mn ? (mx - mn) / nb : 1;
    vals.forEach((v) => { let i = mx > mn ? Math.min(nb - 1, Math.floor((v - mn) / wdt)) : 0; counts[i]++; });
    const cm = Math.max(...counts); let b = "";
    counts.forEach((c, i) => { const hh = (c / cm) * (H - pt - pb), x = pl + i * bw; b += '<rect x="' + f1(x + 1) + '" y="' + f1(H - pb - hh) + '" width="' + f1(bw - 2) + '" height="' + f1(hh) + '" rx="3" fill="#6f8fd6"/>' + (c ? tx(x + bw / 2, H - pb - hh - 3, c, "middle", 10, "#1f2f55") : ""); });
    b += '<line x1="' + pl + '" y1="' + (H - pb) + '" x2="' + (W - pr) + '" y2="' + (H - pb) + '" stroke="#9fb0d3"/>' + tx(pl, H - 10, nf(mn), "start") + tx(W - pr, H - 10, nf(mx), "end");
    return svg(W, H, b, L("Гістограма", "Histogram"));
  }
  function boxSvg(st) {
    const W = 360, H = 90, pl = 14, pr = 14, lo = st.mn, hi = st.mx, span = hi > lo ? hi - lo : 1, X0 = (v) => pl + ((v - lo) / span) * (W - pl - pr);
    const wl = Math.max(lo, st.lf), wh = Math.min(hi, st.uf), y = 40;
    let b = '<line x1="' + f1(X0(wl)) + '" y1="' + y + '" x2="' + f1(X0(st.q1)) + '" y2="' + y + '" stroke="#4f6fb8" stroke-width="2"/><line x1="' + f1(X0(st.q3)) + '" y1="' + y + '" x2="' + f1(X0(wh)) + '" y2="' + y + '" stroke="#4f6fb8" stroke-width="2"/>' +
      '<rect x="' + f1(X0(st.q1)) + '" y="22" width="' + f1(Math.max(2, X0(st.q3) - X0(st.q1))) + '" height="36" rx="4" fill="#dfeafb" stroke="#4f6fb8" stroke-width="2"/><line x1="' + f1(X0(st.med)) + '" y1="22" x2="' + f1(X0(st.med)) + '" y2="58" stroke="#283b69" stroke-width="3"/>' +
      '<line x1="' + f1(X0(wl)) + '" y1="32" x2="' + f1(X0(wl)) + '" y2="48" stroke="#4f6fb8" stroke-width="2"/><line x1="' + f1(X0(wh)) + '" y1="32" x2="' + f1(X0(wh)) + '" y2="48" stroke="#4f6fb8" stroke-width="2"/>';
    st.out.forEach((v) => { b += '<circle cx="' + f1(X0(v)) + '" cy="' + y + '" r="3.5" fill="#d64545"/>'; });
    b += tx(X0(lo), 80, nf(lo), "start") + tx(X0(hi), 80, nf(hi), "end") + tx(X0(st.med), 14, nf(st.med), "middle", 11, "#1f2f55");
    return svg(W, H, b, L("Ящик з вусами", "Box plot"));
  }
  function scatterSvg(xs, ys, a, b) {
    const W = 360, H = 220, pl = 36, pr = 12, pt = 12, pb = 26, mnx = Math.min(...xs), mxx = Math.max(...xs), mny = Math.min(...ys), mxy = Math.max(...ys), sx = mxx > mnx ? mxx - mnx : 1, sy = mxy > mny ? mxy - mny : 1;
    const X0 = (v) => pl + ((v - mnx) / sx) * (W - pl - pr), Y0 = (v) => H - pb - ((v - mny) / sy) * (H - pt - pb);
    let s = '<line x1="' + pl + '" y1="' + (H - pb) + '" x2="' + (W - pr) + '" y2="' + (H - pb) + '" stroke="#9fb0d3"/><line x1="' + pl + '" y1="' + pt + '" x2="' + pl + '" y2="' + (H - pb) + '" stroke="#9fb0d3"/>';
    if (a !== null) { const y1 = a + b * mnx, y2 = a + b * mxx, cl = (v) => Math.max(mny - sy, Math.min(mxy + sy, v)); s += '<line x1="' + f1(X0(mnx)) + '" y1="' + f1(Y0(cl(y1))) + '" x2="' + f1(X0(mxx)) + '" y2="' + f1(Y0(cl(y2))) + '" stroke="#d64545" stroke-width="2"/>'; }
    xs.forEach((v, i) => { s += '<circle cx="' + f1(X0(v)) + '" cy="' + f1(Y0(ys[i])) + '" r="4" fill="#4f6fb8" fill-opacity=".85"/>'; });
    s += tx(pl, H - 8, nf(mnx), "start") + tx(W - pr, H - 8, nf(mxx), "end") + tx(pl - 4, H - pb, nf(mny), "end") + tx(pl - 4, pt + 8, nf(mxy), "end");
    return svg(W, H, s, L("Діаграма розсіювання", "Scatter plot"));
  }
  function bellSvg(mu, sg, lo, hi) {
    const W = 360, H = 170, pl = 10, pr = 10, pt = 10, pb = 30, a = mu - 4 * sg, b = mu + 4 * sg, X0 = (v) => pl + ((v - a) / (b - a)) * (W - pl - pr), dens = (v) => Math.exp(-0.5 * ((v - mu) / sg) ** 2), Y0 = (v) => H - pb - dens(v) * (H - pt - pb);
    let curve = "", fill = "";
    for (let i = 0; i <= 120; i++) { const v = a + ((b - a) * i) / 120; curve += (i ? "L" : "M") + f1(X0(v)) + " " + f1(Y0(v)) + " "; }
    const l = Math.max(a, lo === null ? a : lo), r = Math.min(b, hi === null ? b : hi);
    if (r > l) { fill = "M" + f1(X0(l)) + " " + (H - pb) + " "; for (let i = 0; i <= 80; i++) { const v = l + ((r - l) * i) / 80; fill += "L" + f1(X0(v)) + " " + f1(Y0(v)) + " "; } fill += "L" + f1(X0(r)) + " " + (H - pb) + " Z"; }
    let s = (fill ? '<path d="' + fill + '" fill="#6f8fd6" fill-opacity=".55"/>' : "") + '<path d="' + curve + '" fill="none" stroke="#283b69" stroke-width="2"/><line x1="' + pl + '" y1="' + (H - pb) + '" x2="' + (W - pr) + '" y2="' + (H - pb) + '" stroke="#9fb0d3"/>';
    for (let k = -3; k <= 3; k++) s += '<line x1="' + f1(X0(mu + k * sg)) + '" y1="' + (H - pb) + '" x2="' + f1(X0(mu + k * sg)) + '" y2="' + (H - pb + 4) + '" stroke="#9fb0d3"/>' + tx(X0(mu + k * sg), H - 12, k === 0 ? "μ" : (k > 0 ? "+" : "−") + Math.abs(k) + "σ", "middle", 10);
    return svg(W, H, s, L("Нормальний розподіл", "Normal distribution"));
  }

  // ----- нормальний розподіл: функція помилок -----
  function erf(x) {
    const ax = Math.abs(x); if (ax > 6) return Math.sign(x);
    if (ax < 2.5) { let sumv = 0, term = ax; for (let n = 0; n < 200; n++) { sumv += term / (2 * n + 1); term *= (-ax * ax) / (n + 1); if (Math.abs(term) < 1e-18) break; } return Math.sign(x) * (2 / Math.sqrt(Math.PI)) * sumv; }
    return Math.sign(x) * (1 - erfcCF(ax));
  }
  function erfcCF(x) { // x ≥ 2.5, неперервний дріб (Lentz)
    let f = 0; for (let k = 60; k >= 1; k--) f = (k / 2) / (x + f);
    return Math.exp(-x * x) / Math.sqrt(Math.PI) / (x + f);
  }
  const erfc = (x) => (x >= 2.5 ? erfcCF(x) : x <= -2.5 ? 2 - erfcCF(-x) : 1 - erf(x));
  const Phi = (z) => 0.5 * erfc(-z / Math.SQRT2);
  function PhiInv(p) { // Акліх + уточнення Галлея
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239], b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1], c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783], d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
    let x; const pl = 0.02425;
    if (p < pl) { const r = Math.sqrt(-2 * Math.log(p)); x = (((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) / ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1); }
    else if (p <= 1 - pl) { const r0 = p - 0.5, r = r0 * r0; x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * r0) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); }
    else { const r = Math.sqrt(-2 * Math.log(1 - p)); x = -(((((c[0] * r + c[1]) * r + c[2]) * r + c[3]) * r + c[4]) * r + c[5]) / ((((d[0] * r + d[1]) * r + d[2]) * r + d[3]) * r + 1); }
    for (let i = 0; i < 2; i++) { const e = Phi(x) - p, u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2); x -= u / (1 + (x * u) / 2); }
    return x;
  }

  // ----- загальні елементи інтерфейсу -----
  const popSel = () => '<div class="ph__var"><label class="ph__label" for="stPop">' + L("Дані — це", "The data are") + '</label><select class="ph__unit ph__unit--wide" id="stPop"><option value="s">' + L("вибірка (ділимо на n − 1)", "a sample (divide by n − 1)") + '</option><option value="p">' + L("генеральна сукупність (ділимо на n)", "a population (divide by n)") + "</option></select></div>";
  const textarea = (id, ph, label, rows) => '<textarea class="ph__input ph__ta" id="' + id + '" rows="' + (rows || 4) + '" autocomplete="off" spellcheck="false" placeholder="' + ph + '" aria-label="' + label + '"></textarea>';
  const inp = (id, ph, label, ml) => '<input class="ph__input" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="' + (ml || 20) + '" placeholder="' + ph + '" aria-label="' + label + '">';
  const lines = (arr, max) => (arr.length > max ? arr.slice(0, max).join(", ") + ", …" : arr.join(", "));

  // =====================================================================
  // 1. Описова статистика
  // =====================================================================
  const desc = {
    key: "desc", type: "custom", nameUk: "Описова статистика", nameEn: "Descriptive statistics",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full"><label class="ph__label" for="stData">' + L("Числа", "Numbers") + "</label>" + textarea("stData", L("напр.: 12; 15; 11,5; 18; 15; 22", "e.g.: 12, 15, 11.5, 18, 15, 22"), L("Числа", "Numbers"), 4) + "</div>" + popSel() + '</div><div class="ph__hint ph__mt12">' + L("Розділяйте числа пробілом, переносом рядка чи крапкою з комою. Кома всередині числа — десятковий знак (3,5); кома з пробілом — роздільник. До 1000 чисел.", "Separate numbers with a space, a comma, a semicolon or a new line. The decimal separator is a dot (3.5). Up to 1000 numbers.") + "</div>";
      el("stData").addEventListener("input", maybeCalc); el("stPop").addEventListener("change", maybeCalc);
    },
    calc(h) {
      const { el, ND, vstr, VR, decNum, esc } = h, nd = ND(), raw = el("stData").value;
      if (!raw.trim()) return { ok: false, incomplete: true };
      const pl = parseList(raw, h); if (pl.err) return { ok: false, msg: pl.err };
      const v = pl.vals, n = v.length, sorted = v.slice().sort(cmp), pop = el("stPop").value === "p", m = method();
      const S = (r) => vstr(VR(r), null, nd, true), Sx = (v2) => vstr(v2, null, nd, false);
      const A = (i) => sorted[i], total = sum(v), mean = div(total, R(n)), mn = sorted[0], mx = sorted[n - 1], range = sub(mx, mn), med = medOf(A, 0, n);
      const freq = new Map(); sorted.forEach((r) => { const k = r.n + "/" + r.d, o = freq.get(k); if (o) o.c++; else freq.set(k, { c: 1, r }); });
      const maxF = Math.max(...[...freq.values()].map((o) => o.c)), modes = [...freq.values()].filter((o) => o.c === maxF).map((o) => o.r), noMode = maxF === 1 || modes.length === freq.size;
      const qt = quartiles(A, n, m);
      if (!qt) return { ok: false, msg: L("Для методу QUARTILE.EXC потрібно щонайменше 3 числа (оберіть інший метод у налаштуваннях).", "The QUARTILE.EXC method needs at least 3 numbers (choose another method in the settings).") };
      const iqr = sub(qt.q3, qt.q1), k15 = mul(iqr, q(3n, 2n)), lf = sub(qt.q1, k15), uf = add(qt.q3, k15), outs = sorted.filter((r) => cmp(r, lf) < 0 || cmp(r, uf) > 0);
      const ss = sum(v.map((r) => { const d = sub(r, mean); return mul(d, d); })), df = pop ? n : n - 1;
      const variance = df >= 1 ? div(ss, R(df)) : null, sd = variance ? X.sqrt(VR(variance)) : null, se = sd ? X.div(sd, X.sqrt(VR(R(n)))) : null;
      const cv = sd && mean.n !== 0n ? X.mul(X.div(sd, VR(mean.n < 0n ? q(-mean.n, mean.d) : mean)), VR(HUNDRED)) : null;
      const allPos = sorted.every((r) => r.n > 0n);
      const harm = allPos ? div(R(n), sum(v.map((r) => div(R(1), r)))) : null;
      const geo = allPos ? Math.exp(v.reduce((a, r) => a + Math.log(dbl(r)), 0) / n) : null;
      // асиметрія й ексцес (доданки в дробових числах)
      const xs = v.map(dbl), mu = dbl(mean), m2 = xs.reduce((a, t) => a + (t - mu) ** 2, 0) / n, m3 = xs.reduce((a, t) => a + (t - mu) ** 3, 0) / n, m4 = xs.reduce((a, t) => a + (t - mu) ** 4, 0) / n;
      let skew = null, kurt = null;
      if (m2 > 0) { if (pop) { skew = m3 / m2 ** 1.5; kurt = m4 / m2 ** 2 - 3; } else { const s = Math.sqrt((m2 * n) / (n - 1)); if (n >= 3) skew = (n / ((n - 1) * (n - 2))) * xs.reduce((a, t) => a + ((t - mu) / s) ** 3, 0); if (n >= 4) kurt = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * xs.reduce((a, t) => a + ((t - mu) / s) ** 4, 0) - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3)); } }
      const dd = (x2) => (x2 === null || !Number.isFinite(x2) ? "—" : decNum(h.parseNum(Number(x2).toPrecision(14)).v, nd));
      const dash = L("не визначено", "undefined");
      const rowsT = [[L("Кількість n", "Count n"), String(n)], [L("Сума", "Sum"), S(total)], [L("Мінімум", "Minimum"), S(mn)], [L("Максимум", "Maximum"), S(mx)], [L("Розмах", "Range"), S(range)], [L("Середнє арифметичне", "Mean"), S(mean)], [L("Медіана", "Median"), S(med)], [L("Мода", "Mode"), noMode ? L("немає", "none") : modes.map(S).join(L("; ", "; "))], ["Q1", S(qt.q1)], ["Q3", S(qt.q3)], [L("Міжквартильний розмах IQR", "Interquartile range IQR"), S(iqr)], [pop ? L("Дисперсія σ²", "Variance σ²") : L("Дисперсія s²", "Variance s²"), variance ? S(variance) : dash], [pop ? L("Стандартне відхилення σ", "Standard deviation σ") : L("Стандартне відхилення s", "Standard deviation s"), sd ? Sx(sd) : dash], [L("Стандартна похибка середнього", "Standard error of the mean"), se ? Sx(se) : dash], [L("Коефіцієнт варіації", "Coefficient of variation"), cv ? Sx(cv) + " %" : dash], [L("Асиметрія", "Skewness"), skew === null ? dash : "≈ " + dd(skew)], [L("Ексцес (надлишковий)", "Excess kurtosis"), kurt === null ? dash : "≈ " + dd(kurt)], [L("Середнє геометричне", "Geometric mean"), geo === null ? L("лише для додатних", "positive values only") : "≈ " + dd(geo)], [L("Середнє гармонічне", "Harmonic mean"), harm ? S(harm) : L("лише для додатних", "positive values only")], [L("Викиди", "Outliers"), outs.length ? outs.map(S).join("; ") : L("немає", "none")]];
      const table = '<div class="ph__sub">' + L("Усі показники", "All measures") + '</div><div class="ph__tblWrap"><table class="ph__tbl"><thead><tr><th>' + L("Показник", "Measure") + "</th><th>" + L("Значення", "Value") + "</th></tr></thead><tbody>" + rowsT.map(([k, val]) => "<tr><th>" + esc(k) + "</th><td>" + esc(val) + "</td></tr>").join("") + "</tbody></table></div>";
      const charts = '<div class="ph__sub">' + L("Ящик з вусами", "Box plot") + "</div>" + boxSvg({ mn: dbl(mn), mx: dbl(mx), q1: dbl(qt.q1), q3: dbl(qt.q3), med: dbl(med), lf: dbl(lf), uf: dbl(uf), out: outs.map(dbl) }) + '<div class="ph__sub">' + L("Гістограма", "Histogram") + "</div>" + histSvg(xs, dbl(mn), dbl(mx));
      const steps = [];
      steps.push({ t: L("Впорядковуємо дані", "Sorting the data"), l: [lines(sorted.map(S), 30)], note: L("Кількість значень n = ", "The number of values n = ") + n + "." });
      steps.push({ t: L("Середнє арифметичне", "Mean"), l: ["Σx = " + S(total), "x̄ = Σx / n = " + S(total) + " / " + n + " = " + S(mean)] });
      steps.push({ t: L("Медіана", "Median"), l: [n % 2 ? L("n непарне: серединне значення = ", "n is odd: the middle value = ") + S(med) : L("n парне: середнє двох серединних = ", "n is even: the mean of the two middle values = ") + S(med)] });
      steps.push({ t: L("Мода", "Mode"), l: [noMode ? L("Усі значення зустрічаються однаково часто — моди немає.", "All values occur equally often — there is no mode.") : modes.map(S).join("; ") + L(" (зустрічається ", " (occurs ") + maxF + L(" р.)", " times)")] });
      steps.push({ t: L("Квартили", "Quartiles"), l: ["Q1 = " + S(qt.q1) + ",  Q3 = " + S(qt.q3) + ",  IQR = " + S(iqr)], note: L("Метод: ", "Method: ") + MNAME[m] + L(" (змінюється в налаштуваннях).", " (change it in the settings).") });
      if (variance) steps.push({ t: pop ? L("Дисперсія й відхилення (генеральна)", "Variance and deviation (population)") : L("Дисперсія й відхилення (вибірка)", "Variance and deviation (sample)"), l: ["Σ(x − x̄)² = " + S(ss), (pop ? "σ² = Σ(x − x̄)² / n = " : "s² = Σ(x − x̄)² / (n − 1) = ") + S(ss) + " / " + df + " = " + S(variance), (pop ? "σ" : "s") + " = √" + S(variance) + " = " + Sx(sd)] });
      steps.push({ t: L("Викиди за правилом 1,5·IQR", "Outliers by the 1.5·IQR rule"), l: [L("Межі: ", "Fences: ") + S(lf) + " … " + S(uf), outs.length ? L("Викиди: ", "Outliers: ") + outs.map(S).join("; ") : L("Викидів немає.", "There are no outliers.")] });
      const tiles = [{ k: "n", v: String(n) }, { k: L("Медіана", "Median"), v: S(med) }, { k: pop ? "σ" : "s", v: sd ? Sx(sd) : "—" }, { k: L("Дисперсія", "Variance"), v: variance ? S(variance) : "—" }, { k: "Q1 / Q3", v: S(qt.q1) + " / " + S(qt.q3) }, { k: "IQR", v: S(iqr) }, { k: L("Розмах", "Range"), v: S(range) }, { k: L("Викидів", "Outliers"), v: String(outs.length) }];
      return { ok: true, expr: L("Описова статистика, n = ", "Descriptive statistics, n = ") + n, head: [L("середнє", "mean"), S(mean)], headSub: L("медіана ", "median ") + S(med) + (sd ? "; " + (pop ? "σ" : "s") + " = " + Sx(sd) : ""), subRaw: true, tiles, extraHtml: table + charts, steps, resText: L("Середнє ", "Mean ") + S(mean) + L(", медіана ", ", median ") + S(med) + (sd ? ", " + (pop ? "σ" : "s") + " = " + Sx(sd) : "") + ", n = " + n };
    },
    reset(h) { h.el("stData").value = ""; h.el("stPop").value = "s"; },
    fill(h) { h.el("stData").value = L("12; 15; 11,5; 18; 15; 22; 9; 15; 40", "12, 15, 11.5, 18, 15, 22, 9, 15, 40"); h.el("stPop").value = "s"; },
    share(p, h) { if (h.el("stData").value.trim()) { p.set("d", h.el("stData").value.trim().slice(0, 4000)); p.set("pop", h.el("stPop").value); } },
    apply(qs, h) { if (qs.has("d")) h.el("stData").value = qs.get("d").slice(0, 4000); if (qs.get("pop") === "p") h.el("stPop").value = "p"; }
  };

  // =====================================================================
  // 2. Частоти й зважене середнє
  // =====================================================================
  const MAXR = 20;
  const freqM = {
    key: "freq", type: "custom", nameUk: "Частоти й зважене середнє", nameEn: "Frequencies and weighted mean",
    build(body, x, h) {
      const { el, esc, maybeCalc } = h;
      const rowsHtml = (n, keep) => Array.from({ length: n }, (_, i) => '<div class="ph__var"><label class="ph__label" for="fqV_' + i + '">' + L("Рядок ", "Row ") + (i + 1) + '</label><div class="ph__inl2">' + inp("fqV_" + i, L("значення", "value"), L("Значення, рядок ", "Value, row ") + (i + 1), 14) + inp("fqF_" + i, L("частота", "frequency"), L("Частота, рядок ", "Frequency, row ") + (i + 1), 14) + "</div></div>").join("");
      body.innerHTML = '<div class="ph__vars"><div class="ph__var"><label class="ph__label" for="fqT">' + L("Другий стовпець — це", "The second column is") + '</label><select class="ph__unit ph__unit--wide" id="fqT"><option value="f">' + L("частоти (скільки разів зустрічається)", "frequencies (how many times)") + '</option><option value="w">' + L("ваги (довільні додатні числа)", "weights (any positive numbers)") + "</option></select></div>" + popSel() + '</div><div class="ph__vars" id="fqRows">' + rowsHtml(4) + '</div><div class="ph__fnActions"><button type="button" class="ph__mini" id="fqAdd">' + L("+ Додати рядок", "+ Add a row") + '</button><button type="button" class="ph__mini" id="fqDel">' + L("− Прибрати", "− Remove") + '</button></div><div class="ph__hint ph__mt12">' + L("Частоти — цілі числа, дані розгортаються в набір; ваги (наприклад, кредити) дають лише зважене середнє, дисперсію й відхилення.", "Frequencies are whole numbers and the data are expanded into a set; weights (for example credits) give only the weighted mean, variance and deviation.") + "</div>";
      let n = 4;
      const wire = () => { for (let i = 0; i < n; i++) { el("fqV_" + i).addEventListener("input", maybeCalc); el("fqF_" + i).addEventListener("input", maybeCalc); } };
      const rebuild = (nn) => { const keep = Array.from({ length: n }, (_, i) => [el("fqV_" + i).value, el("fqF_" + i).value]); el("fqRows").innerHTML = rowsHtml(nn); n = nn; keep.forEach((k, i) => { if (i < n) { el("fqV_" + i).value = k[0]; el("fqF_" + i).value = k[1]; } }); wire(); el("fqAdd").disabled = n >= MAXR; el("fqDel").disabled = n <= 2; maybeCalc(); };
      el("fqAdd").addEventListener("click", () => { if (n < MAXR) rebuild(n + 1); }); el("fqDel").addEventListener("click", () => { if (n > 2) rebuild(n - 1); });
      el("fqT").addEventListener("change", maybeCalc); el("stPop").addEventListener("change", maybeCalc);
      wire(); body._fqN = () => n; body._fqRebuild = rebuild;
    },
    calc(h) {
      const { el, parseNum, ND, vstr, VR, esc } = h, nd = ND(), body = el("phBody"), n = body._fqN(), isF = el("fqT").value === "f", pop = el("stPop").value === "p", m = method(), errs = [];
      const rows = [];
      for (let i = 0; i < n; i++) { const a = parseNum(el("fqV_" + i).value), b = parseNum(el("fqF_" + i).value); if (a.empty && b.empty) continue; if (a.empty || b.empty) { errs.push(L("Рядок ", "Row ") + (i + 1) + ": " + L("заповніть обидва поля", "fill in both fields")); continue; } if (a.err || b.err) { errs.push(L("Рядок ", "Row ") + (i + 1) + ": " + L("введіть числа", "enter numbers")); continue; } if (cmp(b.v, ZERO) <= 0) { errs.push(L("Рядок ", "Row ") + (i + 1) + ": " + L("частота (вага) має бути додатною", "the frequency (weight) must be positive")); continue; } if (isF && b.v.d !== 1n) { errs.push(L("Рядок ", "Row ") + (i + 1) + ": " + L("частота — ціле число", "the frequency is a whole number")); continue; } rows.push({ x: a.v, f: b.v }); }
      if (errs.length) return { ok: false, msg: errs.slice(0, 3).join("; ") };
      if (!rows.length) return { ok: false, incomplete: true };
      rows.sort((a, b) => cmp(a.x, b.x));
      // об'єднуємо однакові значення
      const merged = []; rows.forEach((r) => { const last = merged[merged.length - 1]; if (last && cmp(last.x, r.x) === 0) last.f = add(last.f, r.f); else merged.push({ x: r.x, f: r.f }); });
      const S = (r) => vstr(VR(r), null, nd, true), Sx = (v) => vstr(v, null, nd, false), W = sum(merged.map((r) => r.f)), swx = sum(merged.map((r) => mul(r.f, r.x))), mean = div(swx, W);
      const ss = sum(merged.map((r) => { const d = sub(r.x, mean); return mul(r.f, mul(d, d)); }));
      const steps = [{ t: isF ? L("Сума частот і сума добутків", "The sum of frequencies and of products") : L("Сума ваг і сума добутків", "The sum of weights and of products"), l: [(isF ? "n = Σf = " : "Σw = ") + S(W), "Σ(f·x) = " + merged.map((r) => S(r.f) + "·" + S(r.x)).join(" + ").slice(0, 160) + " = " + S(swx)] }, { t: L("Середнє", "Mean"), l: ["x̄ = Σ(f·x) / " + (isF ? "n" : "Σw") + " = " + S(swx) + " / " + S(W) + " = " + S(mean)] }];
      let tiles = [{ k: isF ? "n" : "Σw", v: S(W) }, { k: L("Різних значень", "Distinct values"), v: String(merged.length) }];
      let variance, sd, extra = "", head = [L("середнє", "mean"), S(mean)], sub2 = "", resText;
      if (isF) {
        const nn = Number(W.n), A = (() => { const cum = []; let c = 0; merged.forEach((r) => { c += Number(r.f.n); cum.push(c); }); return (i) => { for (let k = 0; k < merged.length; k++) if (i < cum[k]) return merged[k].x; return merged[merged.length - 1].x; }; })();
        const med = medOf(A, 0, nn), qt = quartiles(A, nn, m), mf = Math.max(...merged.map((r) => Number(r.f.n))), modes = merged.filter((r) => Number(r.f.n) === mf).map((r) => r.x), noMode = modes.length === merged.length && merged.length > 1;
        const df = pop ? nn : nn - 1; variance = df >= 1 ? div(ss, R(df)) : null; sd = variance ? X.sqrt(VR(variance)) : null;
        steps.push({ t: L("Медіана", "Median"), l: [L("Розгорнутий набір має ", "The expanded set has ") + nn + L(" значень: медіана = ", " values: the median = ") + S(med)] });
        steps.push({ t: L("Мода", "Mode"), l: [noMode ? L("Усі значення мають однакову частоту — моди немає.", "All values have the same frequency — there is no mode.") : modes.map(S).join("; ") + L(" (частота ", " (frequency ") + mf + ")"] });
        if (variance) steps.push({ t: L("Дисперсія й відхилення", "Variance and deviation"), l: ["Σf(x − x̄)² = " + S(ss), (pop ? "σ² = " : "s² = ") + S(ss) + " / " + df + " = " + S(variance), (pop ? "σ" : "s") + " = " + Sx(sd)] });
        tiles = tiles.concat([{ k: L("Медіана", "Median"), v: S(med) }, { k: L("Мода", "Mode"), v: noMode ? L("немає", "none") : modes.map(S).join("; ") }, { k: pop ? "σ" : "s", v: sd ? Sx(sd) : "—" }, { k: L("Дисперсія", "Variance"), v: variance ? S(variance) : "—" }]);
        if (qt) tiles.push({ k: "Q1 / Q3", v: S(qt.q1) + " / " + S(qt.q3) });
        sub2 = L("медіана ", "median ") + S(med) + (sd ? "; " + (pop ? "σ" : "s") + " = " + Sx(sd) : ""); resText = L("Середнє ", "Mean ") + S(mean) + ", " + sub2;
      } else {
        variance = div(ss, W); sd = X.sqrt(VR(variance));
        steps.push({ t: L("Зважена дисперсія й відхилення", "Weighted variance and deviation"), l: ["Σw(x − x̄)² = " + S(ss), "σ² = Σw(x − x̄)² / Σw = " + S(ss) + " / " + S(W) + " = " + S(variance), "σ = " + Sx(sd)], note: L("Для ваг ділимо на Σw (це зважена генеральна дисперсія).", "For weights we divide by Σw (this is the weighted population variance).") });
        tiles = tiles.concat([{ k: L("Зважена дисперсія", "Weighted variance"), v: S(variance) }, { k: L("Зважене відхилення", "Weighted deviation"), v: Sx(sd) }]);
        sub2 = "σ = " + Sx(sd); resText = L("Зважене середнє ", "Weighted mean ") + S(mean) + ", " + sub2;
      }
      let cum = ZERO; const trs = merged.map((r) => { cum = add(cum, r.f); return "<tr><th>" + esc(S(r.x)) + "</th><td>" + esc(S(r.f)) + "</td><td>" + esc(vstr(VR(mul(div(r.f, W), HUNDRED)), null, nd, true)) + " %</td><td>" + esc(S(cum)) + "</td><td>" + esc(vstr(VR(mul(div(cum, W), HUNDRED)), null, nd, true)) + " %</td></tr>"; }).join("");
      extra = '<div class="ph__sub">' + L("Частотна таблиця", "Frequency table") + '</div><div class="ph__tblWrap"><table class="ph__tbl"><thead><tr><th>x</th><th>' + (isF ? "f" : "w") + "</th><th>" + L("Частка", "Share") + "</th><th>" + L("Накопичена", "Cumulative") + "</th><th>" + L("Накопичена частка", "Cumulative share") + "</th></tr></thead><tbody>" + trs + "</tbody></table></div>";
      return { ok: true, expr: isF ? L("Частотна таблиця", "Frequency table") : L("Зважене середнє", "Weighted mean"), head, headSub: sub2, subRaw: true, tiles: tiles.slice(0, 8), extraHtml: extra, steps, resText };
    },
    reset(h) { const b = h.el("phBody"); b._fqRebuild(4); for (let i = 0; i < b._fqN(); i++) { h.el("fqV_" + i).value = ""; h.el("fqF_" + i).value = ""; } h.el("fqT").value = "f"; h.el("stPop").value = "s"; },
    fill(h) { const b = h.el("phBody"); b._fqRebuild(5); [["2", "3"], ["3", "5"], ["4", "9"], ["5", "7"], ["6", "2"]].forEach(([v, f], i) => { h.el("fqV_" + i).value = v; h.el("fqF_" + i).value = f; }); h.el("fqT").value = "f"; h.el("stPop").value = "s"; },
    share(p, h) { const b = h.el("phBody"), n = b._fqN(); p.set("n", n); p.set("t", h.el("fqT").value); p.set("pop", h.el("stPop").value); for (let i = 0; i < n; i++) { if (h.el("fqV_" + i).value.trim() || h.el("fqF_" + i).value.trim()) p.set("r" + i, h.el("fqV_" + i).value.trim() + ":" + h.el("fqF_" + i).value.trim()); } },
    apply(qs, h) { const b = h.el("phBody"), n = Math.min(MAXR, Math.max(2, Number(qs.get("n")) || 4)); b._fqRebuild(n); if (qs.get("t") === "w") h.el("fqT").value = "w"; if (qs.get("pop") === "p") h.el("stPop").value = "p"; for (let i = 0; i < n; i++) { if (qs.has("r" + i)) { const [v, f = ""] = qs.get("r" + i).slice(0, 40).split(":"); h.el("fqV_" + i).value = v; h.el("fqF_" + i).value = f; } } }
  };

  // =====================================================================
  // 3. Кореляція й регресія
  // =====================================================================
  const corr = {
    key: "corr", type: "custom", nameUk: "Кореляція й регресія", nameEn: "Correlation and regression",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full"><label class="ph__label" for="crX">' + L("Значення X", "Values of X") + "</label>" + textarea("crX", L("напр.: 1; 2; 3; 4; 5", "e.g.: 1, 2, 3, 4, 5"), L("Значення X", "Values of X"), 3) + '</div><div class="ph__var ph__var--full"><label class="ph__label" for="crY">' + L("Значення Y (стільки ж, скільки X)", "Values of Y (as many as X)") + "</label>" + textarea("crY", L("напр.: 2; 4; 5; 4; 5", "e.g.: 2, 4, 5, 4, 5"), L("Значення Y", "Values of Y"), 3) + '</div><div class="ph__var"><label class="ph__label" for="crP">' + L("Прогноз для x (необов.)", "Prediction for x (optional)") + "</label>" + inp("crP", L("напр.: 6", "e.g.: 6"), L("Прогноз для x", "Prediction for x")) + '</div></div><div class="ph__hint ph__mt12">' + L("Кожному X відповідає Y у тому ж порядку. Калькулятор знайде коефіцієнт кореляції Пірсона, пряму регресії y = a + bx та прогноз.", "Each X is paired with the Y in the same position. The calculator finds the Pearson correlation coefficient, the regression line y = a + bx and a prediction.") + "</div>";
      ["crX", "crY", "crP"].forEach((id) => el(id).addEventListener("input", maybeCalc));
    },
    calc(h) {
      const { el, parseNum, ND, vstr, VR, esc } = h, nd = ND();
      if (!el("crX").value.trim() && !el("crY").value.trim()) return { ok: false, incomplete: true };
      const lx = parseList(el("crX").value, h), ly = parseList(el("crY").value, h);
      if (lx.err) return { ok: false, msg: "X: " + lx.err }; if (ly.err) return { ok: false, msg: "Y: " + ly.err };
      const X1 = lx.vals, Y1 = ly.vals, n = X1.length;
      if (n !== Y1.length) return { ok: false, msg: L("Чисел X (" + n + ") і Y (" + Y1.length + ") має бути порівну.", "There must be as many X values (" + n + ") as Y values (" + Y1.length + ").") };
      if (n < 2) return { ok: false, incomplete: true };
      const S = (r) => vstr(VR(r), null, nd, true), Sx = (v) => vstr(v, null, nd, false), mx = div(sum(X1), R(n)), my = div(sum(Y1), R(n));
      let sxx = ZERO, syy = ZERO, sxy = ZERO; X1.forEach((a, i) => { const dx = sub(a, mx), dy = sub(Y1[i], my); sxx = add(sxx, mul(dx, dx)); syy = add(syy, mul(dy, dy)); sxy = add(sxy, mul(dx, dy)); });
      if (sxx.n === 0n) return { ok: false, msg: L("Усі значення X однакові: пряма регресії не існує.", "All X values are equal: the regression line does not exist.") };
      const b = div(sxy, sxx), a = sub(my, mul(b, mx));
      const hasR = syy.n !== 0n, r = hasR ? X.div(VR(sxy), X.sqrt(VR(mul(sxx, syy)))) : null, r2 = hasR ? div(mul(sxy, sxy), mul(sxx, syy)) : null;
      const sse = sub(syy, mul(b, sxy)), se = n > 2 ? X.sqrt(VR(div(sse, R(n - 2)))) : null;
      const pr = parseNum(el("crP").value); if (pr.err) return { ok: false, msg: L("Прогноз: введіть число.", "Prediction: enter a number.") };
      const pred = pr.empty ? null : add(a, mul(b, pr.v));
      const rv = r ? dbl(h.vnum(r)) : 0, ar = Math.abs(rv);
      const strength = !hasR ? "—" : ar < 0.1 ? L("практично відсутній", "practically none") : ar < 0.3 ? L("слабкий", "weak") : ar < 0.7 ? L("помірний", "moderate") : L("сильний", "strong");
      const dirT = !hasR || ar < 0.1 ? "" : rv > 0 ? L(", прямий", ", positive") : L(", обернений", ", negative");
      const eq = "y = " + S(a) + (b.n < 0n ? " − " + S(q(-b.n, b.d)) : " + " + S(b)) + "·x";
      const steps = [{ t: L("Середні", "Means"), l: ["x̄ = " + S(mx), "ȳ = " + S(my)] }, { t: L("Суми відхилень", "Sums of deviations"), l: ["Sxx = Σ(x − x̄)² = " + S(sxx), "Syy = Σ(y − ȳ)² = " + S(syy), "Sxy = Σ(x − x̄)(y − ȳ) = " + S(sxy)] }, { t: L("Пряма регресії", "Regression line"), l: ["b = Sxy / Sxx = " + S(sxy) + " / " + S(sxx) + " = " + S(b), "a = ȳ − b·x̄ = " + S(my) + " − " + S(b) + " · " + S(mx) + " = " + S(a), eq] }];
      if (hasR) steps.push({ t: L("Коефіцієнт кореляції Пірсона", "Pearson correlation coefficient"), l: ["r = Sxy / √(Sxx·Syy) = " + Sx(r), "r² = " + S(r2)], note: L("Орієнтовна шкала: |r| < 0,1 — зв'язку практично немає, до 0,3 — слабкий, до 0,7 — помірний, вище — сильний.", "A rough scale: |r| < 0.1 — practically no relation, up to 0.3 — weak, up to 0.7 — moderate, above — strong.") });
      if (pred) steps.push({ t: L("Прогноз", "Prediction"), l: ["ŷ(" + S(pr.v) + ") = " + S(a) + " + " + S(b) + " · " + S(pr.v) + " = " + S(pred)] });
      const tiles = [{ k: "n", v: String(n) }, { k: L("Нахил b", "Slope b"), v: S(b) }, { k: L("Зсув a", "Intercept a"), v: S(a) }, { k: "r²", v: hasR ? S(r2) : "—" }, { k: L("Зв'язок", "Relation"), v: strength + dirT }];
      if (se) tiles.push({ k: L("Похибка оцінки", "Standard error"), v: Sx(se) }); if (pred) tiles.push({ k: "ŷ(" + S(pr.v) + ")", v: S(pred) });
      const chart = '<div class="ph__sub">' + L("Діаграма розсіювання й пряма регресії", "Scatter plot and regression line") + "</div>" + scatterSvg(X1.map(dbl), Y1.map(dbl), dbl(a), dbl(b));
      return { ok: true, expr: L("Регресія: ", "Regression: ") + eq, head: [hasR ? "r" : "b", hasR ? Sx(r) : S(b)], headSub: eq + (hasR ? "; r² = " + S(r2) : ""), subRaw: true, tiles, extraHtml: chart, steps, resText: (hasR ? "r = " + Sx(r) + ", " : "") + eq };
    },
    reset(h) { ["crX", "crY", "crP"].forEach((id) => (h.el(id).value = "")); },
    fill(h) { h.el("crX").value = L("1; 2; 3; 4; 5", "1, 2, 3, 4, 5"); h.el("crY").value = L("2; 4; 5; 4; 5", "2, 4, 5, 4, 5"); h.el("crP").value = "6"; },
    share(p, h) { if (h.el("crX").value.trim() || h.el("crY").value.trim()) { p.set("x", h.el("crX").value.trim().slice(0, 2000)); p.set("y", h.el("crY").value.trim().slice(0, 2000)); if (h.el("crP").value.trim()) p.set("p", h.el("crP").value.trim()); } },
    apply(qs, h) { if (qs.has("x")) h.el("crX").value = qs.get("x").slice(0, 2000); if (qs.has("y")) h.el("crY").value = qs.get("y").slice(0, 2000); if (qs.has("p")) h.el("crP").value = qs.get("p").slice(0, 20); }
  };

  // =====================================================================
  // 4. Нормальний розподіл
  // =====================================================================
  const NID = ["nrM", "nrS", "nrX", "nrB", "nrP"];
  const norm = {
    key: "norm", type: "custom", nameUk: "Z-оцінка й нормальний розподіл", nameEn: "Z-score and normal distribution",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var"><label class="ph__label" for="nrM">μ — ' + L("середнє", "mean") + "</label>" + inp("nrM", L("за замовч. 0", "default 0"), "μ") + '</div><div class="ph__var"><label class="ph__label" for="nrS">σ — ' + L("стандартне відхилення", "standard deviation") + "</label>" + inp("nrS", L("за замовч. 1", "default 1"), "σ") + '</div><div class="ph__var"><label class="ph__label" for="nrX">x</label>' + inp("nrX", L("напр.: 115", "e.g.: 115"), "x") + '</div><div class="ph__var"><label class="ph__label" for="nrB">' + L("друге значення b (для інтервалу)", "second value b (for an interval)") + "</label>" + inp("nrB", L("напр.: 130", "e.g.: 130"), "b") + '</div><div class="ph__var ph__var--full"><label class="ph__label" for="nrP">' + L("або ймовірність P(X < x), щоб знайти x", "or a probability P(X < x) to find x") + "</label>" + inp("nrP", L("напр.: 0,95", "e.g.: 0.95"), "P") + '</div></div><div class="ph__hint ph__mt12">' + L("Введіть μ й σ (за замовчуванням стандартний нормальний розподіл) і x — отримаєте z-оцінку та ймовірності. Додайте b, щоб знайти P(x < X < b), або ймовірність, щоб знайти значення (квантиль).", "Enter μ and σ (the standard normal by default) and x to get the z-score and the probabilities. Add b to find P(x < X < b), or a probability to find the value (the quantile).") + "</div>";
      NID.forEach((id) => el(id).addEventListener("input", maybeCalc));
    },
    calc(h) {
      const { el, parseNum, ND, decNum, vstr, VR } = h, nd = ND(), g = (id) => parseNum(el(id).value);
      const m0 = g("nrM"), s0 = g("nrS"), xv = g("nrX"), bv = g("nrB"), pv = g("nrP");
      if ([m0, s0, xv, bv, pv].some((r) => r.err)) return { ok: false, msg: L("Усі поля — числа (наприклад, 115 чи 0,95).", "All fields are numbers (for example 115 or 0.95).") };
      if (xv.empty && pv.empty) return { ok: false, incomplete: true };
      const mu = m0.empty ? ZERO : m0.v, sg = s0.empty ? R(1) : s0.v;
      if (cmp(sg, ZERO) <= 0) return { ok: false, msg: L("σ має бути додатним.", "σ must be positive.") };
      const mud = dbl(mu), sgd = dbl(sg), S = (r) => vstr(VR(r), null, nd, true), toQ = (v) => parseNum(Number(v).toPrecision(15)).v, P = (v) => decNum(toQ(v), nd), PC = (v) => decNum(toQ(v * 100), Math.max(2, nd - 2)) + " %";
      const steps = [], tiles = []; let head, headSub, resText, lo = null, hi = null;
      if (!xv.empty) {
        const z = div(sub(xv.v, mu), sg), zd = dbl(z), pl = Phi(zd), pg = Phi(-zd);
        steps.push({ t: L("Z-оцінка", "Z-score"), l: ["z = (x − μ) / σ = (" + S(xv.v) + " − " + S(mu) + ") / " + S(sg) + " = " + S(z)], note: L("z показує, на скільки стандартних відхилень x відрізняється від середнього.", "z shows by how many standard deviations x differs from the mean.") });
        steps.push({ t: L("Ймовірності через функцію розподілу Φ(z)", "Probabilities through the distribution function Φ(z)"), l: ["P(X < x) = Φ(" + S(z) + ") = " + P(pl) + " (" + PC(pl) + ")", "P(X > x) = 1 − Φ(z) = " + P(pg) + " (" + PC(pg) + ")"] });
        head = ["P(X < x)", P(pl)]; headSub = "z = " + S(z) + "; P(X > x) = " + P(pg); resText = "z = " + S(z) + ", P(X < x) = " + P(pl);
        tiles.push({ k: "z", v: S(z) }, { k: "P(X < x)", v: PC(pl) }, { k: "P(X > x)", v: PC(pg) });
        const dz = Math.abs(zd), cen = erf(dz / Math.SQRT2); tiles.push({ k: L("P(|X − μ| < |x − μ|)", "P(|X − μ| < |x − μ|)"), v: PC(cen) });
        hi = dbl(xv.v);
        if (!bv.empty) { const bb = dbl(bv.v), a2 = Math.min(dbl(xv.v), bb), b2 = Math.max(dbl(xv.v), bb), pab = Phi((b2 - mud) / sgd) - Phi((a2 - mud) / sgd); steps.push({ t: L("Імовірність інтервалу", "Probability of the interval"), l: ["P(" + decNum(toQ(a2), nd) + " < X < " + decNum(toQ(b2), nd) + ") = Φ(z₂) − Φ(z₁) = " + P(pab) + " (" + PC(pab) + ")"] }); tiles.push({ k: "P(a < X < b)", v: PC(pab) }); head = ["P(a < X < b)", P(pab)]; headSub = "z₁ = " + decNum(toQ((a2 - mud) / sgd), nd) + ", z₂ = " + decNum(toQ((b2 - mud) / sgd), nd); resText = "P(" + decNum(toQ(a2), nd) + " < X < " + decNum(toQ(b2), nd) + ") = " + P(pab); lo = a2; hi = b2; }
        else lo = null;
      }
      if (!pv.empty) {
        const pp = dbl(pv.v); if (!(pp > 0 && pp < 1)) return { ok: false, msg: L("Ймовірність — число строго між 0 і 1.", "The probability is a number strictly between 0 and 1.") };
        const zq = PhiInv(pp), xq = mud + sgd * zq;
        steps.push({ t: L("Квантиль: зворотне завдання", "Quantile: the inverse task"), l: ["z = Φ⁻¹(" + P(pp) + ") = " + decNum(toQ(zq), nd), "x = μ + z·σ = " + S(mu) + " + " + decNum(toQ(zq), nd) + " · " + S(sg) + " = " + decNum(toQ(xq), nd)] });
        tiles.push({ k: "x (P = " + P(pp) + ")", v: decNum(toQ(xq), nd) }, { k: L("z квантиля", "z of the quantile"), v: decNum(toQ(zq), nd) });
        if (xv.empty) { head = ["x", decNum(toQ(xq), nd)]; headSub = "z = " + decNum(toQ(zq), nd) + L("; P(X < x) = ", "; P(X < x) = ") + P(pp); resText = "P(X < x) = " + P(pp) + " → x = " + decNum(toQ(xq), nd); hi = xq; lo = null; }
      }
      const chart = '<div class="ph__sub">' + L("Крива нормального розподілу", "The normal curve") + "</div>" + bellSvg(mud, sgd, lo, hi);
      return { ok: true, expr: L("Нормальний розподіл N(", "Normal distribution N(") + S(mu) + "; " + S(sg) + ")", head, headSub, subRaw: true, tiles: tiles.slice(0, 8), extraHtml: chart, steps, resText };
    },
    reset(h) { NID.forEach((id) => (h.el(id).value = "")); },
    fill(h) { h.el("nrM").value = "100"; h.el("nrS").value = "15"; h.el("nrX").value = "115"; h.el("nrB").value = ""; h.el("nrP").value = ""; },
    share(p, h) { NID.forEach((id) => { if (h.el(id).value.trim()) p.set(id, h.el(id).value.trim()); }); },
    apply(qs, h) { NID.forEach((id) => { if (qs.has(id)) h.el(id).value = qs.get(id).slice(0, 20); }); }
  };
  return { modes: [desc, freqM, corr, norm], keepSet: true };
});
