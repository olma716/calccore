/* phys-core.js — спільний рушій фізичних калькуляторів (UK/EN)
   Кожна сторінка підключає цей файл і свій файл даних, який викликає PhysCalc.start(cfg => …).
   Режим «ланцюг формул»: користувач заповнює відомі величини (з вибором одиниць), рушій застосовує формули послідовно, доки не знайде шукану величину.
   Усі числа точні раціональні (десяткові, дроби, запис 1,5e3); корені спрощуються точно (5√2), нерозв'язні — наближено з позначкою «≈».
   Одиниці переводяться точно (1 км/год = 5/18 м/с). Окремі режими: з'єднання резисторів і середня швидкість за кількома ділянками. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const SEP = IS_EN ? "." : ",";
  const NB = " ";
  const MAXD = 30;
  const T = {
    enter: L("Вкажіть відомі величини — результат з'явиться тут.", "Enter the known quantities — the result will appear here."),
    copied: L("Результат скопійовано ✅", "Result copied ✅"),
    copyFailed: L("Не вдалось скопіювати 😕", "Could not copy 😕"),
    linkCopied: L("Посилання скопійовано ✅", "Link copied ✅"),
    reset: L("Скинуто ✅", "Reset ✅"),
    example: L("Підставлено приклад ✅", "Example filled in ✅"),
    calcFirst: L("Спочатку порахуйте результат.", "Calculate first.")
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
  const qz = (x) => x.n === Z;
  const R = (n) => ({ n: BigInt(n), d: O });
  const ONE = R(1), TWO = R(2);
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const isqrt = (n) => { if (n < 2n) return n; let x = 1n << BigInt((n.toString(2).length + 1) >> 1), y = (x + n / x) >> 1n; while (y < x) { x = y; y = (x + n / x) >> 1n; } return x; };
  const sqrtApprox = (x) => { const P = 40n; return q(isqrt((x.n * 10n ** (2n * P)) / x.d), 10n ** P); };
  const toDbl = (r) => Number(r.n) / Number(r.d);
  const exactDec = (x, k = 12) => (x.n * 10n ** BigInt(k)) % x.d === Z;
  function roundStr(x, nd) {
    const ng = x.n < Z, a = babs(x.n), sc = 10n ** BigInt(nd), v = (a * sc * 2n + x.d) / (2n * x.d), s = v.toString().padStart(nd + 1, "0");
    const ip = s.slice(0, s.length - nd), fr = s.slice(s.length - nd).replace(/0+$/, "");
    return (ng && v !== Z ? "−" : "") + ip.replace(/\B(?=(\d{3})+(?!\d))/g, NB) + (fr ? SEP + fr : "");
  }
  const SUP = "⁰¹²³⁴⁵⁶⁷⁸⁹";
  const supNum = (n) => (n < 0 ? "⁻" : "") + String(Math.abs(n)).split("").map((d) => SUP[d]).join("");
  // десяткове подання з урахуванням порядку: звичайне або наукове 1,5·10⁸
  function decNum(r, nd) {
    if (qz(r)) return "0";
    const ad = Math.abs(toDbl(r));
    if (ad >= 1e12 || ad < 1e-4) {
      let e = Math.floor(Math.log10(ad)), m = e < 0 ? qmul(r, q(10n ** BigInt(-e))) : qdiv(r, q(10n ** BigInt(e)));
      let ms = roundStr(m, nd);
      if (/^[−]?10([.,]0*)?$/.test(ms)) { e += 1; m = qdiv(m, R(10)); ms = roundStr(m, nd); }
      return ms + "·10" + supNum(e);
    }
    return roundStr(r, nd);
  }
  const ND = () => Number(el("decs").value) || 4;

  // ===== розбір чисел (десяткові, дроби, 1,5e3) =====
  const NUM = /^(\d+([.,]\d*)?|[.,]\d+)([eE][+-]?\d{1,3})?$/;
  function parseNum(str) {
    let s = String(str == null ? "" : str).trim().replace(/[−–—]/g, "-");
    if (!s) return { empty: true };
    let sg = 1n;
    if (s[0] === "-") { sg = -1n; s = s.slice(1).trim(); } else if (s[0] === "+") s = s.slice(1).trim();
    const parts = s.split("/");
    if (parts.length > 2) return { err: 1 };
    const p = parts.map((x) => {
      x = x.trim().replace(/\s+/g, "");
      if (!NUM.test(x)) return null;
      const [mant, ex = "0"] = x.toLowerCase().split("e");
      if (mant.replace(/[.,]/g, "").length > MAXD) return null;
      const [ip, fp = ""] = mant.replace(",", ".").split("."), e = Number(ex) - fp.length;
      const n = BigInt((ip || "0") + fp);
      return e >= 0 ? q(n * 10n ** BigInt(e)) : q(n, 10n ** BigInt(-e));
    });
    if (p.some((v) => v === null)) return { err: 1 };
    let v = p[0];
    if (p.length === 2) { if (qz(p[1])) return { err: 2 }; v = qdiv(p[0], p[1]); }
    return { v: sg < 0n ? { n: -v.n, d: v.d } : v };
  }
  const parseF = (s) => { const r = parseNum(String(s)); return r.v; };

  // ===== величини: c·√m (точні) або наближені =====
  function simplifyRadical(m) {
    let k = O, rem = m;
    for (let p = 2n; p <= 100000n && p * p <= rem; p++) { const p2 = p * p; while (rem % p2 === Z) { rem /= p2; k *= p; } }
    if (rem > O) { const s = isqrt(rem); if (s * s === rem) { k *= s; rem = O; } }
    return { k, m: rem === Z ? O : rem };
  }
  function sqrtRat(Qv) { if (qz(Qv)) return { c: R(0), m: O }; const { k, m } = simplifyRadical(Qv.n * Qv.d); return { c: q(k, Qv.d), m }; }
  const VR = (r) => ({ c: r, m: O, apx: false });
  const VA = (r) => ({ c: r, m: O, apx: true });
  const vnum = (v) => (v.m === O ? v.c : qmul(v.c, sqrtApprox(R(v.m))));
  const vsign = (v) => (qz(v.c) ? 0 : v.c.n < Z ? -1 : 1);
  class DErr extends Error {}
  const X = {
    VR, k: (s) => VR(typeof s === "string" ? parseF(s) : R(s)),
    mul(a, b) { if (a.apx || b.apx) return VA(qmul(vnum(a), vnum(b))); const s = simplifyRadical(a.m * b.m); return { c: qmul(qmul(a.c, b.c), R(s.k)), m: s.m, apx: false }; },
    div(a, b) {
      if (vsign(b) === 0) throw new DErr(L("ділення на нуль", "division by zero"));
      if (a.apx || b.apx) return VA(qdiv(vnum(a), vnum(b)));
      const t = sqrtRat(q(a.m, b.m)); return { c: qmul(qdiv(a.c, b.c), t.c), m: t.m, apx: false };
    },
    add(a, b) { if (!a.apx && !b.apx && a.m === b.m) return { c: qadd(a.c, b.c), m: a.m, apx: false }; return VA(qadd(vnum(a), vnum(b))); },
    sub(a, b) { if (!a.apx && !b.apx && a.m === b.m) return { c: qsub(a.c, b.c), m: a.m, apx: false }; return VA(qsub(vnum(a), vnum(b))); },
    neg(a) { return { c: { n: -a.c.n, d: a.c.d }, m: a.m, apx: a.apx }; },
    sq(a) { return a.apx ? VA(qmul(vnum(a), vnum(a))) : { c: qmul(qmul(a.c, a.c), R(a.m)), m: O, apx: false }; },
    sqrt(a) {
      if (vsign(a) < 0) throw new DErr(L("корінь із від'ємного числа", "the root of a negative number"));
      if (!a.apx && a.m === O) { const t = sqrtRat(a.c); return { c: t.c, m: t.m, apx: false }; }
      return VA(sqrtApprox(vnum(a)));
    },
    cos(deg) { // deg — значення (градуси)
      if (deg.apx || deg.m !== O) { return VA(q(BigInt(Math.round(Math.cos((toDbl(vnum(deg)) * Math.PI) / 180) * 1e30)), 10n ** 30n)); }
      const d = toDbl(deg.c);
      if (Number.isInteger(d)) {
        const r = ((d % 360) + 360) % 360, TAB = { 0: [1, 1, 1], 30: [1, 2, 3], 45: [1, 2, 2], 60: [1, 2, 1], 90: [0, 1, 1], 120: [-1, 2, 1], 135: [-1, 2, 2], 150: [-1, 2, 3], 180: [-1, 1, 1], 210: [-1, 2, 3], 225: [-1, 2, 2], 240: [-1, 2, 1], 270: [0, 1, 1], 300: [1, 2, 1], 315: [1, 2, 2], 330: [1, 2, 3] };
        const t = TAB[r];
        if (t) { const [a, b, m] = t, c = q(BigInt(a), BigInt(b)); return m === 1 ? VR(c) : { c: m === 2 ? qmul(c, q(1n, 1n)) : c, m: BigInt(m), apx: false }; }
      }
      return VA(q(BigInt(Math.round(Math.cos((d * Math.PI) / 180) * 1e30)), 10n ** 30n));
    }
  };
  // запис величини: точний (дріб/радикал) чи наближений; factor — одиниця відображення відносно СІ
  const radTxt = (c, m) => (m === O ? "" : (c.n === O ? "" : String(babs(c.n))) + "√" + m + (c.d === O ? "" : "/" + c.d));
  function dec(r, nd, trimExact) { return exactDec(r, 12) && trimExact ? decNum(r, 12) : decNum(r, nd); }
  function vstr(v, factor, nd, brief) {
    const c = factor ? qdiv(v.c, factor) : v.c, val = { c, m: v.m, apx: v.apx };
    if (v.apx) return "≈ " + decNum(vnum(val), nd);
    if (v.m !== O) { const t = c.n < Z ? "−" : ""; return t + radTxt({ n: babs(c.n), d: c.d }, v.m) + (brief ? "" : " ≈ " + decNum(vnum(val), nd)); }
    if (exactDec(c, 12) && Math.abs(toDbl(c)) < 1e12 && Math.abs(toDbl(c)) >= 1e-4 || qz(c)) return decNum(c, 12);
    if (c.d === O) return decNum(c, nd);
    return (brief ? "≈ " : c.n + "/" + c.d + " ≈ ") + decNum(c, nd);
  }
  // для підстановки в формулу: коротко
  function vsub(v) {
    if (v.apx) return decNum(vnum(v), 4);
    if (v.m !== O) return (v.c.n < Z ? "−" : "") + radTxt({ n: babs(v.c.n), d: v.c.d }, v.m);
    if (exactDec(v.c, 6)) return decNum(v.c, 6);
    return v.c.n < Z ? "−" + babs(v.c.n) + "/" + v.c.d : v.c.n + "/" + v.c.d;
  }
  const wrap = (s) => (/^[−-]/.test(s) || /[\/ ]/.test(s) || /√/.test(s) ? "(" + s + ")" : s);

  // ===== дані режимів =====
  const u = (uk, en, f) => ({ uk, en, f: parseF(String(f)) });
  const UN = {
    len: [u("м", "m", 1), u("км", "km", 1000), u("дм", "dm", "0.1"), u("см", "cm", "0.01"), u("мм", "mm", "0.001"), u("миля", "mile", "1609.344"), u("фут", "ft", "0.3048"), u("ярд", "yd", "0.9144"), u("дюйм", "in", "0.0254"), u("морська миля", "nmi", 1852)],
    time: [u("с", "s", 1), u("хв", "min", 60), u("год", "h", 3600), u("доба", "day", 86400), u("мс", "ms", "0.001")],
    mass: [u("кг", "kg", 1), u("г", "g", "0.001"), u("мг", "mg", "0.000001"), u("т", "t", 1000), u("фунт", "lb", "0.45359237")],
    vel: [u("м/с", "m/s", 1), u("км/год", "km/h", "5/18"), u("км/с", "km/s", 1000), u("см/с", "cm/s", "0.01"), u("миль/год", "mph", "0.44704"), u("вузол", "kn", "463/900"), u("фут/с", "ft/s", "0.3048")],
    acc: [u("м/с²", "m/s²", 1), u("см/с²", "cm/s²", "0.01"), u("км/год за с", "km/h per s", "5/18"), u("g (9,80665 м/с²)", "g (9.80665 m/s²)", "9.80665")],
    force: [u("Н", "N", 1), u("кН", "kN", 1000), u("МН", "MN", 1000000), u("мН", "mN", "0.001"), u("кгс", "kgf", "9.80665"), u("дин", "dyn", "0.00001")],
    energy: [u("Дж", "J", 1), u("кДж", "kJ", 1000), u("МДж", "MJ", 1000000), u("Вт·год", "W·h", 3600), u("кВт·год", "kW·h", 3600000), u("кал", "cal", "4.184"), u("ккал", "kcal", 4184)],
    power: [u("Вт", "W", 1), u("кВт", "kW", 1000), u("МВт", "MW", 1000000), u("мВт", "mW", "0.001"), u("к.с.", "hp", "735.49875")],
    volt: [u("В", "V", 1), u("мВ", "mV", "0.001"), u("кВ", "kV", 1000), u("мкВ", "µV", "0.000001")],
    amp: [u("А", "A", 1), u("мА", "mA", "0.001"), u("мкА", "µA", "0.000001"), u("кА", "kA", 1000)],
    ohm: [u("Ом", "Ω", 1), u("мОм", "mΩ", "0.001"), u("кОм", "kΩ", 1000), u("МОм", "MΩ", 1000000)],
    press: [u("Па", "Pa", 1), u("кПа", "kPa", 1000), u("МПа", "MPa", 1000000), u("бар", "bar", 100000), u("атм", "atm", 101325), u("мм рт. ст.", "mmHg", "133.322387415"), u("psi", "psi", "6894.757293168")],
    area: [u("м²", "m²", 1), u("см²", "cm²", "0.0001"), u("мм²", "mm²", "0.000001"), u("дм²", "dm²", "0.01"), u("км²", "km²", 1000000)],
    vol: [u("м³", "m³", 1), u("л", "L", "0.001"), u("см³", "cm³", "0.000001"), u("мл", "mL", "0.000001"), u("дм³", "dm³", "0.001")],
    dens: [u("кг/м³", "kg/m³", 1), u("г/см³", "g/cm³", 1000), u("т/м³", "t/m³", 1000), u("г/л", "g/L", 1), u("кг/л", "kg/L", 1000)],
    spring: [u("Н/м", "N/m", 1), u("Н/см", "N/cm", 100), u("кН/м", "kN/m", 1000), u("Н/мм", "N/mm", 1000)],
    one: [u("(число)", "(number)", 1)],
    deg: [u("°", "°", 1)],
    pct: [u("%", "%", "0.01"), u("(частка)", "(fraction)", 1)],
    money: [u("₴", "₴", 1), u("коп", "kop", "0.01")],
    tariff: [u("₴/кВт·год", "₴/kW·h", "1/3600000"), u("коп/кВт·год", "kop/kW·h", "1/360000000")]
  };
  let CFG = null, MODE = null, SETTLED = false;
  const modeOf = (k) => CFG.modes.find((m) => m.key === k);

  // ===== розв'язання ланцюгом формул =====
  function varDefs(mode) { const o = {}; mode.vars.forEach((v) => { o[v.id] = v; }); return o; }
  function symsFor(f, VD) { const map = {}; f.ins.forEach((i) => { map[VD[i].sym] = i; }); (f.consts || []).forEach((c) => { map[c] = "@" + c; }); return map; }
  function substText(f, VD, known, ctx) {
    const rhs = f.txt.split("=").slice(1).join("=").trim(), map = symsFor(f, VD), syms = Object.keys(map).sort((a, b) => b.length - a.length);
    if (!syms.length) return rhs;
    const re = new RegExp(syms.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"), "g");
    return rhs.replace(re, (t) => { const id = map[t]; if (id[0] === "@") return t === "g" ? wrap(vsub(ctx.g)) : t; const val = known[id]; return id === "al" ? vsub(val) : wrap(vsub(val)); });
  }
  function solveChain(mode, given, target) {
    const VD = varDefs(mode), known = { ...given }, log = [], problems = [], ctx = CFG.ctx();
    let changed = true, guard = 0;
    while (changed && guard++ < 60) {
      changed = false;
      for (const f of mode.formulas) {
        if (known[f.out] || !f.ins.every((i) => known[i])) continue;
        try { const v = f.f(known, X, ctx); if (!v) continue; known[f.out] = v; log.push({ f, v, text: substText(f, VD, known, ctx) }); changed = true; }
        catch (e) { if (e instanceof DErr) problems.push({ f, msg: e.message }); else throw e; }
      }
    }
    return { known, log, problems, VD };
  }
  function needText(mode, target) {
    const VD = varDefs(mode), alts = mode.formulas.filter((f) => f.out === target).map((f) => f.ins.filter((i) => !VD[i].def).map((i) => VD[i].sym).join(" " + L("і", "and") + " "));
    const uniq = alts.filter((a, i) => a && alts.indexOf(a) === i);
    return uniq.length ? uniq.slice(0, 4).join(L("; або ", "; or ")) : "";
  }

  // ===== розмітка полів =====
  const selOpts = (v, idx) => v.units.map((un, i) => '<option value="' + i + '"' + (i === idx ? " selected" : "") + ">" + esc(L(un.uk, un.en)) + "</option>").join("");
  function fieldRow(v) {
    return '<div class="ph__var" id="row_' + v.id + '"><label class="ph__label" for="v_' + v.id + '"><b class="ph__sym">' + esc(v.sym) + "</b> — " + esc(L(v.uk, v.en)) + '</label><div class="ph__inl"><input class="ph__input" id="v_' + v.id + '" type="text" inputmode="text" autocomplete="off" spellcheck="false" maxlength="40" placeholder="' + esc(v.def !== undefined ? L("за замовч. ", "default ") + v.def : v.ph || "") + '"><select class="ph__unit" id="u_' + v.id + '" aria-label="' + esc(L("Одиниця", "Unit")) + '">' + selOpts(v, 0) + "</select></div></div>";
  }
  let find = "";
  function buildMode() {
    const mode = MODE, body = el("phBody");
    document.querySelectorAll(".ph__tab").forEach((b) => { const on = b.dataset.m === mode.key; b.classList.toggle("is-active", on); b.setAttribute("aria-selected", String(on)); });
    el("findFld").hidden = mode.type !== "chain";
    const needG = mode.type === "chain" && mode.formulas.some((f) => (f.consts || []).includes("g"));
    el("gFld").hidden = !needG; el("gHint").hidden = !needG;
    if (mode.type === "chain") el("resUnit").onchange = () => { el("u_" + find).value = el("resUnit").value; maybeCalc(); };
    if (mode.type === "chain") {
      setOptions(mode.vars.map((v) => [v.id, v.sym + " — " + v.uk, v.sym + " — " + v.en]));
      find = mode.find || mode.vars[0].id; setDd("find", find);
      body.innerHTML = '<div class="ph__vars">' + mode.vars.map(fieldRow).join("") + "</div>" + (mode.hint ? '<div class="ph__hint ph__mt12">' + esc(L(mode.hint[0], mode.hint[1])) + "</div>" : "");
      mode.vars.forEach((v) => { el("v_" + v.id).addEventListener("input", maybeCalc); el("u_" + v.id).addEventListener("change", maybeCalc); el("v_" + v.id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); calc(true); } }); });
      syncFind();
    } else mode.build(body, X, helpers());
  }
  function syncFind() {
    const mode = MODE; if (mode.type !== "chain") return;
    find = el("find").value;
    mode.vars.forEach((v) => { const t = v.id === find; el("row_" + v.id).hidden = t; if (t) el("v_" + v.id).value = ""; });
    const tv = mode.vars.find((v) => v.id === find), ru = el("resUnit");
    ru.innerHTML = selOpts(tv, Number(el("u_" + find).value) || 0);
    ru.hidden = tv.units.length < 2;
  }
  const helpers = () => ({ el, L, esc, selOpts, parseNum, maybeCalc, calc, vstr, vsub, decNum, ND, X, q, R, qadd, qmul, qdiv, qz, vnum, DErr, VR, VA, ctx: CFG.ctx, roundStr });

  function modeChain(mode) {
    const VD = varDefs(mode), nd = ND(), given = {}, errs = [], si = {};
    for (const v of mode.vars) {
      if (v.id === find) continue;
      const inp = el("v_" + v.id), r = parseNum(inp.value);
      const uidx = Number(el("u_" + v.id).value) || 0, f = v.units[uidx].f;
      if (r.err) { errs.push(v.sym + ": «" + String(inp.value).slice(0, 14) + "» " + (r.err === 2 ? L("— знаменник нуль", "— zero denominator") : L("не підходить: потрібне число (2,5 або 3/4 чи 1,5e3)", "is not valid: a number is needed (2.5, 3/4 or 1.5e3)"))); continue; }
      if (r.empty) { if (v.def !== undefined) { const dv = parseF(v.def); given[v.id] = VR(dv); } continue; }
      const val = qmul(r.v, f);
      if (v.sign === "pos" && val.n <= Z) { errs.push(v.sym + ": " + L("значення має бути більше нуля", "the value must be greater than zero")); continue; }
      if (v.sign === "nn" && val.n < Z) { errs.push(v.sym + ": " + L("значення не може бути від'ємним", "the value cannot be negative")); continue; }
      given[v.id] = VR(val); si[v.id] = { raw: r.v, f, uidx };
    }
    if (errs.length) return { ok: false, msg: errs.slice(0, 4).join("; ") };
    const reallyGiven = Object.keys(si);
    if (!reallyGiven.length) return { ok: false, incomplete: true };
    const res = solveChain(mode, given, find);
    if (!res.known[find]) {
      const need = needText(mode, find), pr = res.problems.find((p) => p.f.out === find);
      return { ok: false, msg: pr ? L("Не вдалося знайти " + VD[find].sym + ": " + pr.msg + ".", "Could not find " + VD[find].sym + ": " + pr.msg + ".") : L("Для знаходження " + VD[find].sym + " бракує даних. Потрібні: " + need + ".", "There is not enough data to find " + VD[find].sym + ". Needed: " + need + ".") };
    }
    // кроки
    const steps = [];
    const conv = reallyGiven.filter((id) => !qz(si[id].raw) && si[id].f.n !== si[id].f.d).map((id) => { const v = VD[id], un = v.units[si[id].uidx]; return v.sym + " = " + decNum(si[id].raw, 8) + " " + L(un.uk, un.en) + " = " + vstr(given[id], null, 8, true) + " " + L(v.si[0], v.si[1]); });
    if (conv.length) steps.push({ t: L("Переводимо в одиниці СІ", "Converting to SI units"), l: conv, note: L("Усі розрахунки йдуть в СІ, щоб одиниці узгоджувались.", "All calculations use SI so the units agree.") });
    const ctx = CFG.ctx(), usesG = res.log.some((x) => (x.f.consts || []).includes("g"));
    if (usesG) steps.push({ t: L("Прискорення вільного падіння", "Gravitational acceleration"), l: ["g = " + vsub(ctx.g) + " " + L("м/с²", "m/s²")], note: L("Значення g можна змінити в налаштуваннях.", "The value of g can be changed in the settings.") });
    res.log.forEach((x) => { const v = VD[x.f.out]; steps.push({ t: L("Знаходимо ", "Finding ") + v.sym + " (" + L(v.uk, v.en).toLowerCase() + ")", l: [x.f.txt, v.sym + " = " + x.text + " = " + vstr(x.v, null, nd, true) + " " + L(v.si[0], v.si[1])], note: x.f.note ? L(x.f.note[0], x.f.note[1]) : "" }); });
    const tv = VD[find], tidx = Number(el("u_" + find).value) || 0, tu = tv.units[tidx];
    const showIn = (id) => { const v = VD[id], idx = Number(el("u_" + id).value) || 0, un = v.units[idx]; return vstr(res.known[id], un.f, nd, false) + " " + L(un.uk, un.en); };
    const siStr = (id) => vstr(res.known[id], null, nd, false) + " " + L(VD[id].si[0], VD[id].si[1]);
    const headVal = showIn(find), siHead = tu.f.n === tu.f.d && tu.f.d === O ? null : siStr(find);
    const rest = mode.vars.filter((v) => v.id !== find && res.known[v.id] && !(v.def !== undefined && qz(res.known[v.id].c) && !si[v.id]));
    const tiles = rest.slice(0, 6).map((v) => ({ k: v.sym + " — " + L(v.uk, v.en).toLowerCase(), v: showIn(v.id) + (si[v.id] ? "" : "") }));
    steps.push({ t: L("Результат", "The result"), l: mode.vars.filter((v) => res.known[v.id]).map((v) => v.sym + " = " + showIn(v.id) + (siStr(v.id) !== showIn(v.id) && (Number(el("u_" + v.id)?.value) || 0) !== 0 ? "  (= " + siStr(v.id) + ")" : "")) });
    return { ok: true, expr: L(mode.nameUk, mode.nameEn), head: [tv.sym, headVal], headSub: siHead, tiles, steps, resText: tv.sym + " = " + headVal };
  }

  // ===== відображення =====
  const step = (t, l, note) => ({ t, l, note });
  function stepsHtml(steps) { return '<div class="ph__sub">' + L("Розв'язання", "Solution") + "</div>" + steps.map((s, i) => '<div class="ph__step"><span class="ph__stepN">' + (i + 1) + '</span><div class="ph__stepB"><b class="ph__stepT">' + esc(s.t) + "</b>" + s.l.map((x) => '<p class="ph__math">' + esc(x) + "</p>").join("") + (s.html || "") + (s.note ? '<p class="ph__stepNote">' + esc(s.note) + "</p>" : "") + "</div></div>").join(""); }
  const clean = (s) => s.replace(/ /g, "");
  let last = null;
  function textOf(m) { return clean([m.expr + "  →  " + m.resText, ""].concat(m.steps.map((s, i) => (i + 1) + ". " + s.t + "\n   " + s.l.join("\n   "))).join("\n")); }
  function render(m, strict) {
    const box = el("result");
    if (!m.ok) { last = null; if (m.incomplete && !strict) { box.innerHTML = T.enter; return; } box.innerHTML = '<div class="ph__hintbox">' + esc(m.msg || T.enter) + "</div>"; return; }
    last = m;
    const tiles = m.tiles && m.tiles.length ? '<div class="ph__tiles">' + m.tiles.map((t) => '<div class="ph__tile"><small>' + esc(t.k) + "</small><b>" + esc(t.v) + "</b></div>").join("") + "</div>" : "";
    box.innerHTML = '<div class="ph__rhead"><div class="ph__expr">' + esc(m.expr) + '</div><div class="ph__forms"><span class="ph__rt"><small>' + esc(m.head[0]) + '</small><span class="ph__big">' + esc(m.head[1]) + "</span></span></div>" + (m.headSub ? '<div class="ph__sub2">= ' + esc(m.headSub) + "</div>" : "") + "</div>" + tiles + (m.extraHtml || "") + stepsHtml(m.steps) + '<div class="ph__note">' + L("Усі числа точні (дроби, корені не округлюються), десяткові наближені до обраної кількості знаків.", "All numbers are exact (fractions and roots are not rounded); decimals are rounded to the chosen number of places.") + "</div>";
  }
  const autoOn = () => !el("autoCalc") || el("autoCalc").checked;
  function calc(strict) {
    let m;
    try { m = MODE.type === "chain" ? modeChain(MODE) : MODE.calc(helpers()); } catch (e) { m = { ok: false, msg: String(e && e.message ? e.message : e) }; }
    render(m, strict === true);
    return m;
  }
  function maybeCalc() { if (autoOn()) calc(); }

  // ===== списки, налаштування, кнопки =====
  const DDP = { find: "fd", decs: "dc", gval: "gg" };
  function setDd(hid, v) {
    const pre = DDP[hid], lis = Array.from(document.querySelectorAll("#" + pre + "_list li")), li = lis.find((x) => x.dataset.v === String(v));
    if (!li) return false;
    el(hid).value = li.dataset.v;
    lis.forEach((x) => x.setAttribute("aria-selected", String(x === li)));
    el(pre + "_val").textContent = li.textContent;
    return true;
  }
  function setOptions(opts) {
    const ul = el("fd_list");
    ul.innerHTML = opts.map(([v, uk, en], i) => '<li role="option" tabindex="-1" data-v="' + v + '" aria-selected="' + (i === 0) + '">' + esc(L(uk, en)) + "</li>").join("");
    el("find").value = opts[0][0]; el("fd_val").textContent = L(opts[0][1], opts[0][2]);
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
  function ctxNow() { return { g: VR(parseF(el("gval").value || "9.8")) }; }
  function setMode(key) { MODE = modeOf(key); buildMode(); render({ ok: false, incomplete: true }, false); maybeCalc(); }
  function clearFields() { if (MODE.type === "chain") MODE.vars.forEach((v) => { el("v_" + v.id).value = ""; el("u_" + v.id).value = "0"; }); else if (MODE.reset) MODE.reset(helpers()); }
  function resetAll() { setDd("decs", "4"); setDd("gval", "9.8"); el("setBox").open = false; setMode(CFG.modes[0].key); render({ ok: false, incomplete: true }, false); last = null; }
  function fillExample() {
    const ex = MODE.example;
    if (MODE.type === "chain") { clearFields(); setDd("find", ex.find); syncFind(); Object.keys(ex.vals).forEach((id) => { const [val, un] = String(ex.vals[id]).split("|"); if (id !== ex.find) el("v_" + id).value = val; if (un !== undefined) el("u_" + id).value = un; }); syncFind(); }
    else MODE.fill(helpers());
    calc(true); toast(T.example);
  }
  function share() {
    const p = new URLSearchParams(); p.set("m", MODE.key); p.set("dc", el("decs").value); p.set("gg", el("gval").value);
    if (MODE.type === "chain") { p.set("fd", find); if (el("u_" + find).value !== "0") p.set("ru", el("u_" + find).value); MODE.vars.forEach((v) => { if (v.id !== find && el("v_" + v.id).value.trim()) { p.set("v_" + v.id, el("v_" + v.id).value.trim()); const ui = el("u_" + v.id).value; if (ui !== "0") p.set("u_" + v.id, ui); } }); }
    else MODE.share(p, helpers());
    navigator.clipboard?.writeText(location.origin + location.pathname + "?" + p.toString()).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }
  function applyFromUrl() {
    const qs = new URLSearchParams(location.search);
    if (![...qs.keys()].length) return false;
    const key = qs.get("m"); if (CFG.modes.some((m) => m.key === key)) MODE = modeOf(key);
    if (qs.has("dc")) setDd("decs", qs.get("dc")); if (qs.has("gg")) setDd("gval", qs.get("gg"));
    if (el("decs").value !== "4" || el("gval").value !== "9.8") el("setBox").open = true;
    buildMode();
    if (MODE.type === "chain") { if (qs.has("fd") && MODE.vars.some((v) => v.id === qs.get("fd"))) { setDd("find", qs.get("fd")); syncFind(); } MODE.vars.forEach((v) => { if (qs.has("v_" + v.id)) el("v_" + v.id).value = qs.get("v_" + v.id).slice(0, 40); if (qs.has("u_" + v.id)) { const ui = Number(qs.get("u_" + v.id)); if (ui >= 0 && ui < v.units.length) el("u_" + v.id).value = String(ui); } }); if (qs.has("ru")) { const tv = MODE.vars.find((v) => v.id === find), ui = Number(qs.get("ru")); if (tv && ui >= 0 && ui < tv.units.length) { el("u_" + find).value = String(ui); syncFind(); } } }
    else MODE.apply(qs, helpers());
    return true;
  }
  async function copyResult() { if (!last) { toast(T.calcFirst); return; } try { await navigator.clipboard.writeText(textOf(last)); toast(T.copied); } catch { toast(T.copyFailed); } }

  // ===== власний список замість рідного select.ph__unit (select лишається джерелом значення) =====
  const NATIVE_VAL = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value");
  const unitLists = [];
  function closeUnits(except) { unitLists.forEach((w) => { if (w !== except && !w._list.hidden) { w._list.hidden = true; w._btn.setAttribute("aria-expanded", "false"); } }); }
  function enhanceUnit(sel) {
    const wrap = document.createElement("div"), lab = sel.getAttribute("aria-label") || "";
    wrap.className = "ph__usel" + (sel.classList.contains("ph__unit--wide") ? " ph__usel--wide" : "");
    wrap.innerHTML = '<button type="button" class="ph__uselBtn" aria-haspopup="listbox" aria-expanded="false" aria-label="' + esc(lab) + '"><span></span><span class="ph__caret" aria-hidden="true"></span></button><ul class="ph__uselList" role="listbox" aria-label="' + esc(lab) + '" hidden></ul>';
    const btn = wrap.firstChild, list = wrap.lastChild, txt = btn.firstChild;
    wrap._btn = btn; wrap._list = list; wrap._sel = sel; wrap._sig = null;
    sel.classList.add("is-enh"); sel.after(wrap); unitLists.push(wrap);
    const items = () => Array.from(list.querySelectorAll("li"));
    const sync = () => {
      const opts = Array.from(sel.options), sig = opts.map((o) => o.value + "\u0001" + o.textContent).join("\u0002");
      if (sig !== wrap._sig) { wrap._sig = sig; list.innerHTML = opts.map((o) => '<li role="option" tabindex="-1" data-v="' + esc(o.value) + '">' + esc(o.textContent) + "</li>").join(""); }
      const cur = sel.selectedIndex, label = cur >= 0 && opts[cur] ? opts[cur].textContent : "";
      if (txt.textContent !== label) txt.textContent = label;
      items().forEach((li, i) => { const on = String(i === cur); if (li.getAttribute("aria-selected") !== on) li.setAttribute("aria-selected", on); });
      if (wrap.hidden !== sel.hidden) wrap.hidden = sel.hidden;
    };
    wrap._sync = sync;
    Object.defineProperty(sel, "value", { configurable: true, get() { return NATIVE_VAL.get.call(sel); }, set(v) { NATIVE_VAL.set.call(sel, v); sync(); } });
    const close = (f) => { list.hidden = true; btn.setAttribute("aria-expanded", "false"); if (f) btn.focus(); };
    const open = () => { closeUnits(wrap); sync(); list.hidden = false; btn.setAttribute("aria-expanded", "true"); const all = items(); (all.find((li) => li.getAttribute("aria-selected") === "true") || all[0]).focus(); };
    const pick = (li) => { NATIVE_VAL.set.call(sel, li.dataset.v); sync(); close(true); sel.dispatchEvent(new Event("change", { bubbles: true })); };
    btn.addEventListener("click", (e) => { e.stopPropagation(); if (list.hidden) open(); else close(); });
    btn.addEventListener("keydown", (e) => { if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); open(); } });
    list.addEventListener("click", (e) => { const li = e.target.closest("li[data-v]"); if (li) pick(li); });
    list.addEventListener("keydown", (e) => {
      const all = items(), i = all.indexOf(document.activeElement);
      if (e.key === "ArrowDown") { e.preventDefault(); all[Math.min(all.length - 1, i + 1)].focus(); }
      else if (e.key === "ArrowUp") { e.preventDefault(); all[Math.max(0, i - 1)].focus(); }
      else if (e.key === "Home") { e.preventDefault(); all[0].focus(); }
      else if (e.key === "End") { e.preventDefault(); all[all.length - 1].focus(); }
      else if ((e.key === "Enter" || e.key === " ") && i >= 0) { e.preventDefault(); pick(all[i]); }
      else if (e.key === "Escape") { e.preventDefault(); close(true); }
      else if (e.key === "Tab") close();
    });
    sync();
  }
  function scanUnits() {
    for (let i = unitLists.length - 1; i >= 0; i--) if (!unitLists[i].isConnected) unitLists.splice(i, 1);
    document.querySelectorAll("select.ph__unit:not(.is-enh)").forEach(enhanceUnit);
    unitLists.forEach((w) => w._sync());
  }
  function initUnits() {
    scanUnits();
    new MutationObserver(scanUnits).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden"] });
    document.addEventListener("click", (e) => { if (!e.target.closest(".ph__usel")) closeUnits(null); });
  }

  window.PhysCalc = {
    start(cfgFn) {
      CFG = cfgFn({ L, u, X, UN, parseF });
      CFG.ctx = ctxNow;
      window.addEventListener("DOMContentLoaded", () => {
        document.querySelectorAll(".ph__tab").forEach((b) => b.addEventListener("click", () => setMode(b.dataset.m)));
        initUnits();
        initDd("fd", (v) => { setDd("find", v); syncFind(); maybeCalc(); });
        initDd("dc", (v) => { setDd("decs", v); maybeCalc(); });
        initDd("gg", (v) => { setDd("gval", v); maybeCalc(); });
        el("calcBtn").addEventListener("click", () => { const m = calc(true); if (!m.ok && m.msg) toast(m.msg); });
        el("exampleBtn").addEventListener("click", fillExample);
        el("resetBtn").addEventListener("click", () => { resetAll(); toast(T.reset); });
        el("shareBtn").addEventListener("click", share);
        el("copyBtn").addEventListener("click", copyResult);
        MODE = CFG.modes[0];
        const used = applyFromUrl();
        if (!used) buildMode();
        document.querySelectorAll(".ph__tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.m === MODE.key)));
        if (used) calc(); else render({ ok: false, incomplete: true }, false);
      });
    },
    // для перевірок
    _x: X
  };
})();
