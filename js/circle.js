/* circle.js — калькулятор площі кола: три режими (коло: за r, d, C або S; сектор і дуга; кільце), розв'язання по кроках, схема, одиниці, значення π (UK/EN)
   Введені числа — точні раціональні (ціле, десяткове, дріб); для довжини кола, площі та кута допустимий множник π («10π», «π/3»).
   Відповіді мають точний вигляд (25π) і десяткове наближення з обраним π: точне (50 знаків), 3,14, 3,1416 або 3,14159; округлення «половина вгору» на BigInt.
   Коло: r = d/2, C = 2πr, S = πr²; з C: r = C/(2π); із S: r = √(S/π). Сектор: l = rα, S = r²α/2, хорда 2r·sin(α/2), сегмент r²(α − sin α)/2 (тригонометрія — double).
   Кільце: S = π(R² − r²) = π(R − r)(R + r). Площа переводиться в інші одиниці точно (дюйм = 25,4 мм, фут = 304,8 мм). */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const SEP = IS_EN ? "." : ",";
  const MODES = ["ci", "se", "ri"];
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
  const Z = 0n, O = 1n, NB = " ";
  const babs = (x) => (x < Z ? -x : x);
  const gcd = (a, b) => { a = babs(a); b = babs(b); while (b) [a, b] = [b, a % b]; return a; };
  const q = (n, d = O) => { if (d < Z) { n = -n; d = -d; } const g = gcd(n, d) || O; return { n: n / g, d: d / g }; };
  const add = (x, y) => q(x.n * y.d + y.n * x.d, x.d * y.d);
  const sub = (x, y) => q(x.n * y.d - y.n * x.d, x.d * y.d);
  const mul = (x, y) => q(x.n * y.n, x.d * y.d);
  const div = (x, y) => q(x.n * y.d, x.d * y.n);
  const isZ = (x) => x.n === Z;
  const R = (n) => ({ n: BigInt(n), d: O });
  const ONE = R(1), TWO = R(2);
  const nf = (x) => (x.d === O ? String(x.n) : exactDec(x) ? roundStr(x, 12) : x.n + "/" + x.d);
  const par = (x) => (x.n < Z || x.d !== O ? "(" + nf(x) + ")" : nf(x));
  const cmp = (x, y) => { const d = sub(x, y); return d.n < Z ? -1 : d.n > Z ? 1 : 0; };
  const isqrt = (n) => { if (n < 2n) return n; let x = 1n << BigInt((n.toString(2).length + 1) >> 1), y = (x + n / x) >> 1n; while (y < x) { x = y; y = (x + n / x) >> 1n; } return x; };
  const perfSq = (r) => { if (r.n < Z) return null; const sn = isqrt(r.n), sd = isqrt(r.d); return sn * sn === r.n && sd * sd === r.d ? q(sn, sd) : null; };
  const sqrtApprox = (x) => { const P = 40n; return q(isqrt((x.n * 10n ** (2n * P)) / x.d), 10n ** P); };
  const toDbl = (r) => Number(r.n) / Number(r.d);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const step = (t, lines, note) => ({ t, l: lines, note });
  const SUP2 = "²";

  // ===== число π і форматування =====
  const PI50 = "3.14159265358979323846264338327950288419716939937510";
  const PIR = (() => { const [i, f] = PI50.split("."); return q(BigInt(i + f), 10n ** BigInt(f.length)); })();
  const PI_OPTS = { exact: PIR, "314": q(314n, 100n), "31416": q(31416n, 10000n), "314159": q(314159n, 100000n) };
  const PI = () => PI_OPTS[el("piMode").value] || PIR;
  const ND = () => Number(el("decs").value) || 4;
  const piTxt = () => { const m = el("piMode").value; return m === "exact" ? "3" + SEP + "14159265…" : m === "314" ? "3" + SEP + "14" : m === "31416" ? "3" + SEP + "1416" : "3" + SEP + "14159"; };
  function roundStr(x, nd, trim = true) {
    const neg = x.n < Z, a = babs(x.n), sc = 10n ** BigInt(nd);
    const v = (a * sc * 2n + x.d) / (2n * x.d);
    const s = v.toString().padStart(nd + 1, "0");
    const ip = s.slice(0, s.length - nd);
    let fr = s.slice(s.length - nd);
    if (trim) fr = fr.replace(/0+$/, "");
    const zero = /^0+$/.test(ip) && /^0*$/.test(fr);
    return (neg && !zero ? "-" : "") + ip.replace(/\B(?=(\d{3})+(?!\d))/g, NB) + (fr ? SEP + fr : "");
  }
  const dbl = (x, nd) => { if (!Number.isFinite(x) || Math.abs(x) >= 1e15) return "—"; return x.toFixed(nd).replace(/\.?0+$/, "").replace(".", SEP) || "0"; };
  const exactDec = (x) => (x.n * 10n ** 12n) % x.d === Z;
  const kpi = (k) => (isZ(k) ? "0" : (k.d === O ? (k.n === O ? "" : String(k.n)) + "π" : (k.n === O ? "" : String(k.n)) + "π/" + k.d));
  const ksqrt = (k) => (k.d === O ? "√" + k.n : "√(" + nf(k) + ")");

  // ===== одиниці =====
  const MMF = { none: ONE, mm: ONE, cm: R(10), dm: R(100), m: R(1000), km: R(1000000), in: q(127n, 5n), ft: q(1524n, 5n) };
  const UL = { none: ["", ""], mm: [L("мм", "mm"), L("мм²", "mm²")], cm: [L("см", "cm"), L("см²", "cm²")], dm: [L("дм", "dm"), L("дм²", "dm²")], m: [L("м", "m"), L("м²", "m²")], km: [L("км", "km"), L("км²", "km²")], in: [L("дюйм", "in"), L("дюйм²", "in²")], ft: [L("фут", "ft"), L("фут²", "ft²")] };
  const unit = () => el("unit").value || "none";
  const lu = (s) => (unit() === "none" ? s : s + " " + UL[unit()][0]);
  const au = (s) => (unit() === "none" ? s : s + " " + UL[unit()][1]);

  // ===== розбір чисел (з необов'язковим π) =====
  const NUM = /^[+-]?(\d+([.,]\d*)?|[.,]\d+)$/;
  function parseDec(s) {
    if (!NUM.test(s)) return null;
    if (s.replace(/[+\-.,]/g, "").length > MAXD) return "long";
    const ng = s[0] === "-", t = s.replace(/^[+-]/, "").replace(",", "."), [ip, fp = ""] = t.split(".");
    const n = BigInt((ip || "0") + fp), d = 10n ** BigInt(fp.length);
    return q(ng ? -n : n, d);
  }
  const bad = (s) => L("«" + s.slice(0, 16) + "» не підходить: потрібне число, дріб a/b або запис із π (наприклад, 10π).", "“" + s.slice(0, 16) + "” is not valid: use a number, a fraction a/b or a form with π (for example 10π).");
  const badPlain = (s) => L("«" + s.slice(0, 16) + "» не підходить: потрібне число або дріб a/b.", "“" + s.slice(0, 16) + "” is not valid: use a number or a fraction a/b.");
  function plain(str) {
    const s = String(str || "").trim().replace(/[−–—]/g, "-");
    if (!s) return { empty: true };
    const parts = s.split("/");
    if (parts.length > 2) return { err: badPlain(s) };
    const p = parts.map((x) => parseDec(x.trim()));
    if (p.some((x) => x === null)) return { err: badPlain(s) };
    if (p.some((x) => x === "long")) return { err: L("Не більше " + MAXD + " цифр у числі.", "At most " + MAXD + " digits in a number.") };
    if (p.length === 2) { if (isZ(p[1])) return { err: L("Знаменник не може дорівнювати нулю.", "The denominator cannot be zero.") }; return { v: div(p[0], p[1]) }; }
    return { v: p[0] };
  }
  // число або k·π; allowPi вмикає запис із π
  function parseVal(str, allowPi) {
    const s0 = String(str || "").trim();
    if (!s0) return { empty: true };
    const s = s0.replace(/\s+/g, "").replace(/pi/gi, "π");
    if (!s.includes("π")) return plain(s0);
    if (!allowPi) return { err: L("Тут π не потрібне: введіть число або дріб.", "π is not needed here: enter a number or a fraction.") };
    const m = /^([^π]*)π(?:\/([^π]+))?$/.exec(s);
    if (!m) return { err: bad(s0) };
    let k = ONE;
    if (m[1]) { const a = plain(m[1]); if (a.err) return { err: bad(s0) }; k = a.v; }
    if (m[2]) { const b = plain(m[2]); if (b.err || isZ(b.v)) return { err: bad(s0) }; k = div(k, b.v); }
    return { v: k, pi: true };
  }
  const posLen = (id, label, allowPi) => { const r = parseVal(el(id).value, allowPi); if (r.err) return { err: label + ": " + r.err }; if (r.empty) return { miss: label }; if (r.v.n <= Z) return { err: label + ": " + L("значення має бути більше нуля.", "the value must be greater than zero.") }; return r; };

  // ===== обчислювальні об'єкти =====
  // величина: { ex: точний запис | null, v: наближення (раціональне), rat: чи точно раціональна }
  const item = (ex, v, rat) => ({ ex, v, rat: !!rat });
  const num = (it, nd, suf) => {
    if (it.rat) return nf(it.v) + (it.v.d !== O && !exactDec(it.v) ? " ≈ " + roundStr(it.v, nd) : "") + (suf ? " " + suf : "");
    return (it.ex ? it.ex + (suf ? " " + suf : "") + " ≈ " : "≈ ") + roundStr(it.v, nd) + (suf ? " " + suf : "");
  };
  // коротко для плиток і шапки
  const brief = (it, nd, suf) => {
    if (it.rat) return (it.v.d === O || exactDec(it.v) ? nf(it.v) : "≈ " + roundStr(it.v, nd)) + (suf ? " " + suf : "");
    return (it.ex ? it.ex + " ≈ " : "≈ ") + roundStr(it.v, nd) + (suf ? " " + suf : "");
  };

  // ===== режим «Коло» =====
  function modeCi() {
    const kn = el("known").value;
    const pv = posLen("cv", { r: L("Радіус", "Radius"), d: L("Діаметр", "Diameter"), C: L("Довжина кола", "Circumference"), S: L("Площа", "Area") }[kn], kn === "C" || kn === "S");
    if (pv.err) return { ok: false, msg: pv.err };
    if (pv.miss) return { ok: false, incomplete: true };
    const pi = PI(), nd = ND(), v = pv.v, steps = [];
    const note = piTxt();
    // радіус: rat | sqrt | num
    let r, rRat = false, rK = null;
    if (kn === "r") { r = v; rRat = true; }
    else if (kn === "d") { r = div(v, TWO); rRat = true; }
    else if (kn === "C") { if (pv.pi) { r = div(v, TWO); rRat = true; } else r = div(v, mul(TWO, pi)); }
    else if (pv.pi) { const sq = perfSq(v); if (sq) { r = sq; rRat = true; } else { rK = v; r = sqrtApprox(v); } }
    else r = sqrtApprox(div(v, pi));
    const rIt = rRat ? item(null, r, true) : item(rK ? ksqrt(rK) : null, r, false);
    // діаметр, довжина, площа
    let dIt, cIt, sIt;
    const d2 = mul(TWO, r);
    dIt = rRat ? item(null, d2, true) : item(rK ? "2" + ksqrt(rK) : null, d2, false);
    if (kn === "C" && !pv.pi) cIt = item(null, v, true);
    else if (rRat) cIt = item(kpi(mul(TWO, r)), mul(mul(TWO, r), pi), false);
    else cIt = item(rK ? "2π" + ksqrt(rK) : null, mul(mul(TWO, pi), r), false);
    if (kn === "S" && !pv.pi) sIt = item(null, v, true);
    else if (rRat) sIt = item(kpi(mul(r, r)), mul(mul(r, r), pi), false);
    else sIt = item(rK ? kpi(rK) : null, mul(pi, mul(r, r)), false);
    if (kn === "C" && pv.pi) cIt = item(kpi(v), mul(v, pi), false);
    if (kn === "S" && pv.pi) sIt = item(kpi(v), mul(v, pi), false);
    const u = unit() === "none" ? "" : UL[unit()][0], u2 = unit() === "none" ? "" : UL[unit()][1];
    const Lr = (x) => (u ? x + " " + u : x);
    const rTxt = rRat ? nf(r) : (rK ? ksqrt(rK) : roundStr(r, nd));
    // кроки
    if (el("piMode").value !== "exact" || kn === "C" || kn === "S") steps.push(step(L("Значення π", "The value of π"), ["π ≈ " + note], L("Для розрахунку взято π = " + note + ".", "π = " + note + " is used in the calculation.")));
    if (kn === "r") steps.push(step(L("Дано радіус", "The radius is given"), ["r = " + Lr(nf(r))]));
    if (kn === "d") steps.push(step(L("Радіус із діаметра", "The radius from the diameter"), ["r = d / 2 = " + nf(v) + " / 2 = " + nf(r)], L("Радіус удвічі менший за діаметр.", "The radius is half the diameter.")));
    if (kn === "C") steps.push(step(L("Радіус із довжини кола", "The radius from the circumference"), pv.pi ? ["r = C / (2π) = " + kpi(v) + " / (2π) = " + nf(r)] : ["r = C / (2π) = " + nf(v) + " / (2 · π) ≈ " + roundStr(r, nd)], L("З формули C = 2πr виражаємо r.", "From C = 2πr we express r.")));
    if (kn === "S") steps.push(step(L("Радіус із площі", "The radius from the area"), pv.pi ? ["S = πr² = " + kpi(v), "r² = " + nf(v), "r = " + (rRat ? nf(r) : ksqrt(v) + " ≈ " + roundStr(r, nd))] : ["r = √(S / π) = √(" + nf(v) + " / π) ≈ " + roundStr(r, nd)], L("З формули S = πr² виражаємо r.", "From S = πr² we express r.")));
    if (kn !== "d") steps.push(step(L("Діаметр", "The diameter"), ["d = 2r = 2 · " + rTxt + " = " + num(dIt, nd, u)]));
    if (!(kn === "C")) steps.push(step(L("Довжина кола", "The circumference"), ["C = 2πr = 2 · π · " + (rRat ? par(r) : rTxt) + " = " + num(cIt, nd, u)]));
    else if (pv.pi) steps.push(step(L("Довжина кола", "The circumference"), ["C = " + num(cIt, nd, u)]));
    steps.push(step(L("Площа кола", "The area"), kn === "S" ? ["S = " + num(sIt, nd, u2)] : ["S = πr² = π · " + (rRat ? par(r) + SUP2 + " = π · " + nf(mul(r, r)) : rK ? "(" + rTxt + ")" + SUP2 + " = π · " + nf(rK) : rTxt + SUP2) + " = " + num(sIt, nd, u2)], L("Площа кола дорівнює π, помноженому на квадрат радіуса.", "The area of a circle is π times the square of the radius.")));
    convSteps(steps, sIt.v, nd);
    const head = '<div class="cir__forms"><span class="cir__rt"><small>S</small><span class="cir__big">' + esc(brief(sIt, nd, u2)) + "</span></span></div>";
    const tiles = [{ k: L("Радіус r", "Radius r"), v: brief(rIt, nd, u) }, { k: L("Діаметр d", "Diameter d"), v: brief(dIt, nd, u) }, { k: L("Довжина кола C", "Circumference C"), v: brief(cIt, nd, u) }];
    return { ok: true, expr: L("Коло: ", "Circle: ") + { r: "r", d: "d", C: "C", S: "S" }[kn] + " = " + el("cv").value.trim() + (u ? " " + (kn === "S" ? u2 : u) : ""), head, tiles, steps, visual: { kind: "ci", r: toDbl(r), rl: roundStr(r, nd), dl: roundStr(d2, nd) }, resText: "S = " + brief(sIt, nd, u2) + "; r = " + brief(rIt, nd, u) + "; d = " + brief(dIt, nd, u) + "; C = " + brief(cIt, nd, u) };
  }

  // переведення площі в інші одиниці (точно: множники в мм)
  function convSteps(steps, S, nd) {
    const un = unit();
    if (un === "none") return;
    const f = MMF[un], mm2 = mul(S, mul(f, f));
    const list = ["mm", "cm", "dm", "m", "km", "in", "ft"].filter((k) => k !== un);
    const lines = list.map((k) => { const g = MMF[k]; return "= " + roundStr(div(mm2, mul(g, g)), 10) + " " + UL[k][1]; });
    if (["mm", "cm", "dm", "m", "km"].includes(un)) lines.push("= " + roundStr(div(mm2, R(10000000000)), 10) + " " + L("га", "ha"));
    steps.push(step(L("Площа в інших одиницях", "The area in other units"), [roundStr(S, nd) + " " + UL[un][1]].concat(lines), L("Множники точні: 1 дюйм = 25,4 мм, 1 фут = 304,8 мм, 1 га = 10 000 м².", "The factors are exact: 1 in = 25.4 mm, 1 ft = 304.8 mm, 1 ha = 10 000 m².")));
  }

  // ===== режим «Сектор і дуга» =====
  function modeSe() {
    const rr = posLen("sr", L("Радіус", "Radius"), false);
    if (rr.err) return { ok: false, msg: rr.err };
    if (rr.miss) return { ok: false, incomplete: true };
    const deg = el("angU").value === "deg";
    const av = posLen("sa", L("Кут", "Angle"), !deg);
    if (av.err) return { ok: false, msg: av.err };
    if (av.miss) return { ok: false, incomplete: true };
    const pi = PI(), nd = ND(), r = rr.v;
    // кут: у градусах D, у радіанах A
    let D, A;
    if (deg) { D = av.v; A = mul(div(D, R(180)), pi); }
    else if (av.pi) { D = mul(av.v, R(180)); A = mul(av.v, pi); }
    else { A = av.v; D = div(mul(A, R(180)), pi); }
    if (cmp(D, R(360)) > 0) return { ok: false, msg: L("Кут має бути більший за 0° і не більший за 360° (2π рад).", "The angle must be greater than 0° and at most 360° (2π rad).") };
    const u = unit() === "none" ? "" : UL[unit()][0], u2 = unit() === "none" ? "" : UL[unit()][1];
    const Lr = (x) => (u ? x + " " + u : x);
    // дуга і площа сектора: точні, коли кут у градусах або з π
    let lIt, sIt, kLen, kArea;
    const rad2 = mul(r, r);
    if (deg || av.pi) {
      const kd = deg ? div(D, R(180)) : av.v; // α = kd·π
      kLen = mul(r, kd); kArea = div(mul(rad2, kd), TWO);
      lIt = item(kpi(kLen), mul(kLen, pi), false);
      sIt = item(kpi(kArea), mul(kArea, pi), false);
    } else {
      lIt = item(null, mul(r, A), true);
      sIt = item(null, div(mul(rad2, A), TWO), true);
    }
    const ad = (toDbl(D) * Math.PI) / 180, rd = toDbl(r);
    const chord = 2 * rd * Math.sin(ad / 2);
    const seg = (rd * rd / 2) * (ad - Math.sin(ad));
    const full = cmp(D, R(360)) === 0;
    const perim = add(mul(TWO, r), lIt.v);
    const steps = [];
    if (el("piMode").value !== "exact") steps.push(step(L("Значення π", "The value of π"), ["π ≈ " + piTxt()], L("Для розрахунку взято π = " + piTxt() + ".", "π = " + piTxt() + " is used in the calculation.")));
    steps.push(step(L("Центральний кут", "The central angle"), deg ? ["α = " + nf(D) + "° = " + nf(D) + " · π / 180 = " + kpi(div(D, R(180))) + L(" рад", " rad") + " ≈ " + roundStr(A, nd) + L(" рад", " rad")] : av.pi ? ["α = " + kpi(av.v) + L(" рад", " rad") + " = " + nf(D) + "°"] : ["α = " + nf(A) + L(" рад", " rad") + " ≈ " + roundStr(D, nd) + "°"], L("180° = π радіан.", "180° = π radians.")));
    steps.push(step(L("Довжина дуги", "The arc length"), ["l = r · α = " + nf(r) + " · " + (deg ? "(" + nf(D) + " · π / 180)" : av.pi ? kpi(av.v) : nf(A)) + " = " + num(lIt, nd, u)], L("Дуга дорівнює радіусу, помноженому на кут у радіанах.", "The arc equals the radius times the angle in radians.")));
    steps.push(step(L("Площа сектора", "The sector area"), ["S = r² · α / 2 = " + nf(rad2) + " · " + (deg ? "(" + nf(D) + " · π / 180)" : av.pi ? kpi(av.v) : nf(A)) + " / 2 = " + num(sIt, nd, u2), L("або S = πr² · α / 360° = ", "or S = πr² · α / 360° = ") + roundStr(mul(mul(pi, rad2), div(D, R(360))), nd) + (u2 ? " " + u2 : "")], L("Сектор — це частка круга, пропорційна куту.", "A sector is the share of the disk proportional to the angle.")));
    steps.push(step(L("Периметр сектора", "The sector perimeter"), ["P = 2r + l = " + nf(mul(TWO, r)) + " + " + (lIt.ex || nf(lIt.v)) + " ≈ " + roundStr(perim, nd) + (u ? " " + u : "")]));
    steps.push(step(L("Хорда й сегмент", "The chord and the segment"), full ? [L("При куті 360° хорда дорівнює 0, а сегмент — це все коло.", "At 360° the chord is 0 and the segment is the whole circle.")] : ["c = 2r · sin(α / 2) ≈ " + dbl(chord, nd) + (u ? " " + u : ""), L("S сегмента", "Segment S") + " = r² · (α − sin α) / 2 ≈ " + dbl(seg, nd) + (u2 ? " " + u2 : "")], L("Хорда й сегмент обчислені з тригонометрією, тому наближено.", "The chord and the segment use trigonometry, so they are approximate.")));
    convSteps(steps, sIt.v, nd);
    const head = '<div class="cir__forms"><span class="cir__rt"><small>' + L("S сектора", "Sector S") + '</small><span class="cir__big">' + esc(brief(sIt, nd, u2)) + "</span></span></div>";
    const tiles = [{ k: L("Довжина дуги l", "Arc length l"), v: brief(lIt, nd, u) }, { k: L("Хорда c", "Chord c"), v: full ? "0" : "≈ " + dbl(chord, nd) + (u ? " " + u : "") }, { k: L("Сегмент", "Segment"), v: "≈ " + dbl(seg, nd) + (u2 ? " " + u2 : "") }];
    return { ok: true, expr: L("Сектор: r = ", "Sector: r = ") + Lr(el("sr").value.trim()) + ", α = " + el("sa").value.trim() + (deg ? "°" : L(" рад", " rad")), head, tiles, steps, visual: { kind: "se", alpha: ad, rl: roundStr(r, nd), al: roundStr(D, nd) + "°", ll: brief(lIt, nd, "") }, resText: L("S сектора = ", "Sector S = ") + brief(sIt, nd, u2) + "; l = " + brief(lIt, nd, u) };
  }

  // ===== режим «Кільце» =====
  function modeRi() {
    const Rr = posLen("rR", L("Зовнішній радіус R", "Outer radius R"), false), rr = posLen("rr", L("Внутрішній радіус r", "Inner radius r"), false);
    if (Rr.err) return { ok: false, msg: Rr.err };
    if (rr.err) return { ok: false, msg: rr.err };
    if (Rr.miss || rr.miss) return { ok: false, incomplete: true };
    const Rv = Rr.v, rv = rr.v;
    if (cmp(rv, Rv) >= 0) return { ok: false, msg: L("Внутрішній радіус має бути меншим за зовнішній.", "The inner radius must be smaller than the outer one.") };
    const pi = PI(), nd = ND();
    const u = unit() === "none" ? "" : UL[unit()][0], u2 = unit() === "none" ? "" : UL[unit()][1];
    const kS = sub(mul(Rv, Rv), mul(rv, rv)), w = sub(Rv, rv), kC1 = mul(TWO, Rv), kC2 = mul(TWO, rv), kP = add(kC1, kC2);
    const sIt = item(kpi(kS), mul(kS, pi), false), c1 = item(kpi(kC1), mul(kC1, pi), false), c2 = item(kpi(kC2), mul(kC2, pi), false), pIt = item(kpi(kP), mul(kP, pi), false);
    const steps = [];
    if (el("piMode").value !== "exact") steps.push(step(L("Значення π", "The value of π"), ["π ≈ " + piTxt()], L("Для розрахунку взято π = " + piTxt() + ".", "π = " + piTxt() + " is used in the calculation.")));
    steps.push(step(L("Площі двох кіл", "The areas of the two circles"), ["S(R) = πR² = π · " + nf(mul(Rv, Rv)) + " = " + kpi(mul(Rv, Rv)) + " ≈ " + roundStr(mul(mul(Rv, Rv), pi), nd) + (u2 ? " " + u2 : ""), "S(r) = πr² = π · " + nf(mul(rv, rv)) + " = " + kpi(mul(rv, rv)) + " ≈ " + roundStr(mul(mul(rv, rv), pi), nd) + (u2 ? " " + u2 : "")]));
    steps.push(step(L("Площа кільця", "The ring area"), ["S = πR² − πr² = π(R² − r²) = π · (" + nf(mul(Rv, Rv)) + " − " + nf(mul(rv, rv)) + ") = " + num(sIt, nd, u2), L("або S = π(R − r)(R + r) = π · ", "or S = π(R − r)(R + r) = π · ") + par(w) + " · " + par(add(Rv, rv)) + " = " + kpi(mul(w, add(Rv, rv)))], L("Від площі великого круга віднімаємо площу малого.", "Subtract the small disk from the large one.")));
    steps.push(step(L("Ширина кільця", "The ring width"), ["w = R − r = " + nf(Rv) + " − " + nf(rv) + " = " + nf(w) + (u ? " " + u : "")]));
    steps.push(step(L("Довжини меж", "The border lengths"), ["C(R) = 2πR = " + num(c1, nd, u), "C(r) = 2πr = " + num(c2, nd, u), L("Разом: ", "Total: ") + num(pIt, nd, u)]));
    convSteps(steps, sIt.v, nd);
    const head = '<div class="cir__forms"><span class="cir__rt"><small>S</small><span class="cir__big">' + esc(brief(sIt, nd, u2)) + "</span></span></div>";
    const tiles = [{ k: L("Ширина w", "Width w"), v: nf(w) + (u ? " " + u : "") }, { k: L("Зовнішня межа", "Outer border"), v: brief(c1, nd, u) }, { k: L("Внутрішня межа", "Inner border"), v: brief(c2, nd, u) }];
    return { ok: true, expr: L("Кільце: R = ", "Ring: R = ") + el("rR").value.trim() + ", r = " + el("rr").value.trim() + (u ? " " + u : ""), head, tiles, steps, visual: { kind: "ri", ratio: toDbl(div(rv, Rv)), Rl: nf(Rv), rl: nf(rv) }, resText: "S = " + brief(sIt, nd, u2) + "; w = " + nf(w) };
  }

  // ===== схеми =====
  function visual(v) {
    const W = 420, H = 260, cx = 210, cy = 130, Rp = 92;
    const label = (x, y, t, anchor, col) => '<text x="' + x + '" y="' + y + '" font-size="15" font-weight="700" fill="' + (col || "#1f2f55") + '" text-anchor="' + (anchor || "middle") + '" paint-order="stroke" stroke="#fff" stroke-width="3.5" stroke-linejoin="round">' + esc(t) + "</text>";
    let s = '<svg class="cir__svg" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + L("Схема", "Diagram") + '"><rect width="' + W + '" height="' + H + '" fill="#fff"/>';
    if (v.kind === "ci") {
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + Rp + '" fill="#e8efff" stroke="#4f6fb8" stroke-width="3"/>';
      s += '<line x1="' + (cx - Rp) + '" y1="' + cy + '" x2="' + (cx + Rp) + '" y2="' + cy + '" stroke="#9aa9d4" stroke-width="1.5" stroke-dasharray="5 4"/>';
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Rp) + '" y2="' + cy + '" stroke="#d85a30" stroke-width="3" stroke-linecap="round"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="4.5" fill="#283b69"/>' + label(cx + Rp / 2, cy - 9, "r = " + v.rl, "middle", "#b4411f") + label(cx - 8, cy + 20, "O", "end", "#4b5563") + label(cx, cy + Rp + 22, "d = " + v.dl, "middle", "#283b69");
    } else if (v.kind === "se") {
      const a = v.alpha, ex = cx + Rp * Math.cos(a), ey = cy - Rp * Math.sin(a), large = a > Math.PI ? 1 : 0;
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + Rp + '" fill="none" stroke="#c9d6f5" stroke-width="2" stroke-dasharray="4 4"/>';
      if (a >= Math.PI * 2 - 1e-9) s += '<circle cx="' + cx + '" cy="' + cy + '" r="' + Rp + '" fill="#e8efff" stroke="#4f6fb8" stroke-width="3"/>';
      else s += '<path d="M ' + cx + " " + cy + " L " + (cx + Rp) + " " + cy + " A " + Rp + " " + Rp + " 0 " + large + " 0 " + ex.toFixed(2) + " " + ey.toFixed(2) + ' Z" fill="#e8efff" stroke="#4f6fb8" stroke-width="3" stroke-linejoin="round"/>';
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Rp) + '" y2="' + cy + '" stroke="#d85a30" stroke-width="3" stroke-linecap="round"/>';
      const am = Math.min(a, Math.PI * 2) / 2, rl = 30;
      s += '<path d="M ' + (cx + rl) + " " + cy + " A " + rl + " " + rl + " 0 " + large + " 0 " + (cx + rl * Math.cos(a)).toFixed(2) + " " + (cy - rl * Math.sin(a)).toFixed(2) + '" fill="none" stroke="#2f9d6a" stroke-width="2.4"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="4.5" fill="#283b69"/>' + label(cx + Rp / 2, cy + 18, "r = " + v.rl, "middle", "#b4411f") + label(cx + (rl + 18) * Math.cos(am), cy - (rl + 18) * Math.sin(am) + 5, "α", "middle", "#0f6e56") + label(cx, H - 10, "α = " + v.al + "  ·  l = " + v.ll, "middle", "#283b69");
    } else {
      const rin = Rp * Math.max(0.02, Math.min(0.98, v.ratio));
      s += '<path fill-rule="evenodd" d="M ' + (cx - Rp) + " " + cy + " a " + Rp + " " + Rp + " 0 1 0 " + 2 * Rp + " 0 a " + Rp + " " + Rp + " 0 1 0 " + -2 * Rp + " 0 Z M " + (cx - rin) + " " + cy + " a " + rin + " " + rin + " 0 1 0 " + 2 * rin + " 0 a " + rin + " " + rin + " 0 1 0 " + -2 * rin + ' 0 Z" fill="#e8efff" stroke="#4f6fb8" stroke-width="3"/>';
      s += '<line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + Rp) + '" y2="' + cy + '" stroke="#d85a30" stroke-width="3" stroke-linecap="round"/><line x1="' + cx + '" y1="' + cy + '" x2="' + (cx + rin) + '" y2="' + cy + '" stroke="#2f9d6a" stroke-width="3" stroke-linecap="round"/>';
      s += '<circle cx="' + cx + '" cy="' + cy + '" r="4.5" fill="#283b69"/>' + label(cx + (rin + Rp) / 2, cy - 9, "R = " + v.Rl, "middle", "#b4411f") + label(cx + rin / 2, cy + 21, "r = " + v.rl, "middle", "#0f6e56");
    }
    return s + "</svg>";
  }

  // ===== відображення =====
  const CALC = { ci: modeCi, se: modeSe, ri: modeRi };
  function stepsHtml(steps) {
    return '<div class="cir__sub">' + L("Розв'язання", "Solution") + "</div>" + steps.map((s, i) => '<div class="cir__step"><span class="cir__stepN">' + (i + 1) + '</span><div><b class="cir__stepT">' + esc(s.t) + "</b>" + s.l.map((x) => '<p class="cir__math">' + esc(x) + "</p>").join("") + (s.note ? '<p class="cir__stepNote">' + esc(s.note) + "</p>" : "") + "</div></div>").join("");
  }
  const clean = (s) => s.replace(/ /g, "");
  function textOf(m) {
    return clean([m.expr + "  →  " + m.resText, ""].concat(m.steps.map((s, i) => (i + 1) + ". " + s.t + "\n   " + s.l.join("\n   "))).join("\n"));
  }
  let last = null;
  function render(m, strict) {
    const box = el("result");
    if (!m.ok) {
      last = null;
      if (m.incomplete && !strict) { box.innerHTML = T.enter; return; }
      box.innerHTML = '<div class="cir__hintbox">' + esc(m.msg || T.enter) + "</div>";
      return;
    }
    last = m;
    const tiles = '<div class="cir__tiles">' + m.tiles.map((t) => '<div class="cir__tile"><small>' + esc(t.k) + "</small><b>" + esc(t.v) + "</b></div>").join("") + "</div>";
    box.innerHTML = '<div class="cir__rhead"><div class="cir__expr">' + esc(m.expr) + "</div>" + m.head + "</div>" + tiles + '<div class="cir__sub">' + L("Схема", "Diagram") + '</div><div class="cir__graph">' + visual(m.visual) + "</div>" + stepsHtml(m.steps) + '<div class="cir__note">' + L("Точні значення записано через π; десяткові наближені до обраної кількості знаків.", "Exact values are written with π; decimals are rounded to the chosen number of places.") + "</div>";
  }
  const autoOn = () => !el("autoCalc") || el("autoCalc").checked;
  function calc(strict) {
    let m;
    try { m = CALC[mode](); } catch (e) { m = { ok: false, msg: String(e && e.message ? e.message : e) }; }
    render(m, strict === true);
    return m;
  }
  function maybeCalc() { if (autoOn()) calc(); else render({ ok: false, incomplete: true }, false); }

  // ===== режими, списки, кнопки =====
  const DDP = { known: "kn", angU: "au", unit: "ut", piMode: "pm", decs: "dc" };
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
  const FIELDS = ["cv", "sr", "sa", "rR", "rr"];
  const DDS = ["known", "angU", "unit", "piMode", "decs"];
  const PANELS = { ci: "panelCi", se: "panelSe", ri: "panelRi" };
  function setMode(m) {
    mode = m;
    document.querySelectorAll(".cir__tab").forEach((b) => { const on = b.dataset.m === m; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
    MODES.forEach((k) => { el(PANELS[k]).hidden = k !== m; });
    maybeCalc();
  }
  const DEFAULTS = { known: "r", angU: "deg", unit: "none", piMode: "exact", decs: "4" };
  function resetAll() { FIELDS.forEach((id) => (el(id).value = "")); DDS.forEach((k) => setDd(k, DEFAULTS[k])); maybeCalc(); }
  const EXAMPLES = {
    ci: () => { setDd("known", "r"); el("cv").value = "5"; },
    se: () => { el("sr").value = "6"; setDd("angU", "deg"); el("sa").value = "60"; },
    ri: () => { el("rR").value = "5"; el("rr").value = "3"; }
  };
  function fillExample() { resetAll(); EXAMPLES[mode](); calc(true); toast(T.example); }
  function share() {
    const p = new URLSearchParams();
    p.set("m", mode);
    DDS.forEach((k) => p.set(DDP[k], el(k).value));
    FIELDS.forEach((id) => el(id).value.trim() && p.set(id, el(id).value.trim()));
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const qs = new URLSearchParams(location.search);
    if (![...qs.keys()].length) return false;
    if (MODES.includes(qs.get("m"))) mode = qs.get("m");
    DDS.forEach((k) => { if (qs.has(DDP[k])) setDd(k, qs.get(DDP[k])); });
    FIELDS.forEach((id) => { if (qs.has(id)) el(id).value = qs.get(id).slice(0, 80); });
    return true;
  }
  async function copyResult() {
    if (!last) { toast(T.calcFirst); return; }
    try { await navigator.clipboard.writeText(textOf(last)); toast(T.copied); } catch { toast(T.copyFailed); }
  }
  const LABELS = { ci: { r: ["Радіус r", "Radius r"], d: ["Діаметр d", "Diameter d"], C: ["Довжина кола C (можна 10π)", "Circumference C (10π allowed)"], S: ["Площа S (можна 25π)", "Area S (25π allowed)"] } };
  function syncKnown() { const kn = el("known").value, l = LABELS.ci[kn]; const lab = el("cvLabel"); if (lab) lab.textContent = L(l[0], l[1]); const ph = { r: "5", d: "10", C: "10π", S: "25π" }[kn]; el("cv").placeholder = L("напр.: ", "e.g.: ") + ph; }

  window.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".cir__tab").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.m)));
    DDS.forEach((k) => initDd(DDP[k], (v) => { setDd(k, v); if (k === "known") syncKnown(); maybeCalc(); }));
    FIELDS.forEach((id) => { el(id).addEventListener("input", maybeCalc); el(id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); calc(true); } }); });
    el("calcBtn").addEventListener("click", () => { const m = calc(true); if (!m.ok && m.msg) toast(m.msg); });
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => { resetAll(); syncKnown(); toast(T.reset); });
    el("shareBtn").addEventListener("click", share);
    el("copyBtn").addEventListener("click", copyResult);
    const used = applyFromUrl();
    syncKnown();
    setMode(mode);
    if (used) calc();
  });
})();
