/* ux-data.js — unix-час: точний розбір чисел (BigInt, до наносекунд), автовизначення одиниці, дата й час у будь-якому поясі, формати (ISO 8601, RFC 2822), інші епохи (FILETIME, .NET, Excel, Cocoa, HFS+, WebKit, юліанський день); спирається на ct-data.js (Ct) */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const C = root.Ct;
  const MS_LIM = 8.64e15; // межа об'єкта Date, мс
  const p2 = (n) => String(n).padStart(2, "0");
  const fdiv = (a, b) => { let q = a / b; if (a % b !== 0n && (a < 0n) !== (b < 0n)) q -= 1n; return q; };
  const fmod = (a, b) => a - fdiv(a, b) * b;
  // одиниці в наносекундах
  const UNIT = { s: 1000000000n, ms: 1000000n, us: 1000n, ns: 1n };
  // розбір десяткового числа: знак, ціла частина (BigInt), дробова частина (рядок цифр); false при помилці
  function parseNum(str) {
    const t = String(str == null ? "" : str).trim().replace(/[\s_  ]/g, "").replace(/^\+/, "");
    const m = /^(-?)(\d*)(?:[.,](\d+))?$/.exec(t);
    if (!m || (m[2] === "" && (m[3] === undefined))) return null;
    return { neg: m[1] === "-", int: BigInt(m[2] || "0"), frac: m[3] || "", digits: (m[2] || "0").replace(/^0+(?=\d)/, "").length };
  }
  // автоматична одиниця за кількістю цифр цілої частини: до 11 цифр — секунди, до 14 — мс, до 17 — мкс, далі нс
  const autoUnit = (p) => (p.digits <= 11 ? "s" : p.digits <= 14 ? "ms" : p.digits <= 17 ? "us" : "ns");
  // значення (число + одиниця unitNs) у наносекундах, точно; зайві дробові розряди відкидаються
  function toNs(p, unitNs) {
    const L = p.frac.length, fracNs = L ? (BigInt(p.frac) * unitNs) / 10n ** BigInt(L) : 0n, v = p.int * unitNs + fracNs;
    return p.neg ? -v : v;
  }
  // запис значення ns, поділеного на unitNs, з не більше ніж dec дробовими знаками (без зайвих нулів)
  function fmtUnit(ns, unitNs, dec) {
    const neg = ns < 0n, a = neg ? -ns : ns, whole = a / unitNs, rem = a % unitNs; let s = whole.toString();
    if (dec > 0 && rem > 0n) { let f = ((rem * 10n ** BigInt(dec)) / unitNs).toString().padStart(dec, "0").replace(/0+$/, ""); if (f) s += "." + f; }
    return (neg && /[1-9]/.test(s) ? "-" : "") + s;
  }
  const fmtYear = (y) => (y >= 0 && y <= 9999 ? String(y).padStart(4, "0") : (y < 0 ? "-" : "+") + String(Math.abs(y)).padStart(6, "0"));
  // дата й час у зоні для моменту ms (Number); повертає поля, зсув у секундах
  function wallOf(ms, zone) {
    const o = zone === "UTC" ? 0 : C.offsetMs(zone, ms), d = new Date(ms + o);
    const sec = Math.round(o / 1000), dn = Math.floor((ms + o) / 864e5);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate(), h: d.getUTCHours(), mi: d.getUTCMinutes(), s: d.getUTCSeconds(), wd: d.getUTCDay(), off: sec, dn };
  }
  const offStr = (sec, colon) => { if (sec === 0) return colon ? "Z" : "+0000"; const s = sec < 0 ? "-" : "+", a = Math.abs(sec), h = Math.floor(a / 3600), mi = Math.floor((a % 3600) / 60), ss = a % 60; return s + p2(h) + (colon ? ":" : "") + p2(mi) + (ss ? (colon ? ":" : "") + p2(ss) : ""); };
  const dnOf = (y, m, d) => { const t = new Date(0); t.setUTCFullYear(y, m - 1, d); t.setUTCHours(0, 0, 0, 0); return Math.round(t.getTime() / 864e5); };
  function isoWeek(y, m, d, wd) { const dow = ((wd + 6) % 7) + 1, dn = dnOf(y, m, d), thu = dn - (dow - 1) + 3, ty = new Date(thu * 864e5).getUTCFullYear(); return { year: ty, week: Math.floor((thu - dnOf(ty, 1, 1)) / 7) + 1 }; }
  const WDN = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  // повний опис моменту ns у зоні; null, якщо поза межами Date
  function describe(ns, zone) {
    const msB = fdiv(ns, 1000000n), ms = Number(msB);
    if (!Number.isFinite(ms) || Math.abs(ms) > MS_LIM) return null;
    const sec = fdiv(ns, UNIT.s), fracNs = ns - sec * UNIT.s, w = wallOf(ms, zone), u = wallOf(ms, "UTC");
    let fr = fracNs.toString().padStart(9, "0").replace(/0+$/, ""); fr = fr ? "." + fr : "";
    const iso = (x, off, z) => fmtYear(x.y) + "-" + p2(x.m) + "-" + p2(x.d) + "T" + p2(x.h) + ":" + p2(x.mi) + ":" + p2(x.s) + fr + (z ? "Z" : offStr(off, true));
    const rfc = (x, off, gmt) => (x.y >= 0 && x.y <= 9999 ? WDN[x.wd] + ", " + p2(x.d) + " " + MON[x.m - 1] + " " + String(x.y).padStart(4, "0") + " " + p2(x.h) + ":" + p2(x.mi) + ":" + p2(x.s) + " " + (gmt ? "GMT" : offStr(off, false)) : "—");
    return { ns, ms, sec, fracNs, w, u, isoUtc: iso(u, 0, true), isoZone: iso(w, w.off, false), rfcUtc: rfc(u, 0, false), http: rfc(u, 0, true), sql: fmtYear(u.y).replace("+", "") + "-" + p2(u.m) + "-" + p2(u.d) + " " + p2(u.h) + ":" + p2(u.mi) + ":" + p2(u.s) + fr, doy: dnOf(w.y, w.m, w.d) - dnOf(w.y, 1, 1) + 1, isoWeek: isoWeek(w.y, w.m, w.d, w.wd), in32: sec >= -2147483648n && sec <= 2147483647n };
  }
  // настінний час (дата, секунди доби + дробова частина в наносекундах) у зоні → момент у наносекундах; kind: ok | gap | fold
  function fromWall(y, mo, d, h, mi, s, fracNs, zone, resolve) {
    let t;
    if (zone === "UTC") { const x = new Date(0); x.setUTCFullYear(y, mo - 1, d); x.setUTCHours(h, mi, 0, 0); t = x.getTime(); return { ns: BigInt(t) * 1000000n + BigInt(s) * UNIT.s + fracNs, kind: "ok" }; }
    const r = resolve(y, mo, d, h * 3600 + mi * 60, zone); return { ns: BigInt(r.t) * 1000000n + BigInt(s) * UNIT.s + fracNs, kind: r.kind, alt: r.alt };
  }
  // час «гг:хх[:сс[.дроб]]» → {h, mi, s, fracNs} або null
  function parseTime(str) {
    const m = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?$/.exec(String(str || "").trim());
    if (!m) return null; const h = +m[1], mi = +m[2], s = m[3] ? +m[3] : 0;
    if (h > 23 || mi > 59 || s > 59) return null;
    const fracNs = m[4] ? BigInt(m[4].padEnd(9, "0")) : 0n; return { h, mi, s, fracNs };
  }
  // інші епохи: [ключ, одиниця (нс), початок відліку відносно Unix (с), знаків після коми]
  const EPOCHS = [["unix", UNIT.s, 0n, 9], ["unixms", UNIT.ms, 0n, 6], ["filetime", 100n, -11644473600n, 0], ["dotnet", 100n, -62135596800n, 0], ["excel", 86400000000000n, -2209161600n, 6], ["cocoa", UNIT.s, 978307200n, 9], ["hfs", UNIT.s, -2082844800n, 9], ["webkit", UNIT.us, -11644473600n, 3], ["jd", 86400000000000n, -210866760000n, 6]];
  const epoch = (k) => EPOCHS.find((e) => e[0] === k);
  const fromEpoch = (p, k) => { const e = epoch(k); return toNs(p, e[1]) + e[2] * UNIT.s; };
  const toEpoch = (ns, k) => { const e = epoch(k); return fmtUnit(ns - e[2] * UNIT.s, e[1], e[3]); };
  root.Ux = { MS_LIM, UNIT, EPOCHS, fdiv, fmod, parseNum, autoUnit, toNs, fmtUnit, wallOf, describe, fromWall, parseTime, fromEpoch, toEpoch, offStr, isoWeek, dnOf };
})();
