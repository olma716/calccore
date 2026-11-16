/* qr-data.js — генератор QR-кодів: кодування через qr-lib.js (qrcode-generator, MIT) з вибором режиму (цифри, буквено-цифровий, байти UTF-8), автоматичний рівень виправлення, точні SVG і растр, формати Wi-Fi, vCard, mailto, SMS, tel і geo з екрануванням, перевірка кольорів і контрасту; залежить від km-data.js і qr-lib.js */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const ECCS = ["L", "M", "Q", "H"];
  // найбільша місткість версії 40 у байтовому режимі
  const MAXB = { L: 2953, M: 2331, Q: 1663, H: 1273 };
  const utf8len = (s) => new TextEncoder().encode(s).length;
  // режим кодування: цифри → Numeric, великі літери й цифри та знаки « $%*+-./:» → Alphanumeric, інше → Byte (UTF-8)
  const modeOf = (s) => (/^[0-9]+$/.test(s) ? "Numeric" : /^[0-9A-Z $%*+\-./:]+$/.test(s) ? "Alphanumeric" : "Byte");
  function tryMake(text, e, mode) {
    const lib = root.qrcode; lib.stringToBytes = lib.stringToBytesFuncs["UTF-8"];
    const q = lib(0, e); q.addData(text, mode); q.make(); return q;
  }
  // ecc: L, M, Q, H або auto (найвищий рівень, що не збільшує код)
  function make(text, ecc) {
    if (!text) return { err: "empty" };
    const mode = modeOf(text); let q, e;
    try {
      if (ecc === "auto") {
        q = tryMake(text, "L", mode); e = "L"; const n = q.getModuleCount();
        for (const c of ["H", "Q", "M"]) { try { const t = tryMake(text, c, mode); if (t.getModuleCount() === n) { q = t; e = c; break; } } catch (x) { /* не вміщується */ } }
      } else { e = ecc; q = tryMake(text, e, mode); }
    } catch (x) { return { err: "overflow", max: MAXB[ecc === "auto" ? "L" : ecc] }; }
    const n = q.getModuleCount(), m = []; let dark = 0;
    for (let r = 0; r < n; r++) { const row = new Uint8Array(n); for (let c = 0; c < n; c++) { row[c] = q.isDark(r, c) ? 1 : 0; dark += row[c]; } m.push(row); }
    return { matrix: m, count: n, version: (n - 17) / 4, ecc: e, mode, bytes: utf8len(text), dark };
  }

  // ---------- кольори ----------
  function hex(s) {
    const t = String(s || "").trim(), m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(t); if (!m) return null;
    let h = m[1]; if (h.length === 3) h = h.split("").map((c) => c + c).join("");
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const contrast = (a, b) => { const x = lum(a), y = lum(b), hi = Math.max(x, y), lo = Math.min(x, y); return (hi + 0.05) / (lo + 0.05); };
  const hexOut = (c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("");

  // ---------- SVG: темні модулі зливаються в горизонтальні відрізки ----------
  function svg(m, o) {
    const n = m.length, N = n + 2 * o.margin, fg = hexOut(o.fg), bg = hexOut(o.bg); let d = "";
    for (let r = 0; r < n; r++) { let c = 0; while (c < n) { if (m[r][c]) { let e = c; while (e < n && m[r][e]) e++; d += "M" + (c + o.margin) + " " + (r + o.margin) + "h" + (e - c) + "v1h-" + (e - c) + "z"; c = e; } else c++; } }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + N + " " + N + '" shape-rendering="crispEdges">' + (o.transparent ? "" : '<rect width="' + N + '" height="' + N + '" fill="' + bg + '"/>') + '<path fill="' + fg + '" d="' + d + '"/></svg>';
  }
  // растр RGBA: scale пікселів на модуль
  function raster(m, o) {
    const n = m.length, N = n + 2 * o.margin, W = N * o.scale, data = new Uint8ClampedArray(W * W * 4);
    for (let y = 0; y < W; y++) for (let x = 0; x < W; x++) {
      const mx = Math.floor(x / o.scale) - o.margin, my = Math.floor(y / o.scale) - o.margin, dark = mx >= 0 && my >= 0 && mx < n && my < n && m[my][mx], i = (y * W + x) * 4;
      if (dark) { data[i] = o.fg[0]; data[i + 1] = o.fg[1]; data[i + 2] = o.fg[2]; data[i + 3] = 255; }
      else if (o.transparent) { data[i + 3] = 0; } else { data[i] = o.bg[0]; data[i + 1] = o.bg[1]; data[i + 2] = o.bg[2]; data[i + 3] = 255; }
    }
    return { w: W, h: W, data };
  }

  // ---------- вміст за форматами ----------
  const escW = (s) => String(s).replace(/([\\;,:"])/g, "\\$1");
  const wifi = (o) => "WIFI:T:" + o.sec + ";S:" + escW(o.ssid) + ";" + (o.sec !== "nopass" ? "P:" + escW(o.pass) + ";" : "") + (o.hidden ? "H:true;" : "") + ";";
  const escV = (s) => String(s).replace(/\\/g, "\\\\").replace(/\r?\n/g, "\\n").replace(/([,;])/g, "\\$1");
  function vcard(o) {
    const L = ["BEGIN:VCARD", "VERSION:3.0", "N:" + escV(o.last || "") + ";" + escV(o.first || "") + ";;;", "FN:" + escV([o.first, o.last].filter(Boolean).join(" "))];
    if (o.org) L.push("ORG:" + escV(o.org)); if (o.title) L.push("TITLE:" + escV(o.title));
    if (o.tel) L.push("TEL;TYPE=CELL:" + escV(o.tel)); if (o.email) L.push("EMAIL:" + escV(o.email)); if (o.url) L.push("URL:" + escV(o.url));
    if (o.street || o.city || o.zip || o.country) L.push("ADR;TYPE=WORK:;;" + [o.street, o.city, "", o.zip, o.country].map((x) => escV(x || "")).join(";"));
    if (o.note) L.push("NOTE:" + escV(o.note));
    L.push("END:VCARD"); return L.join("\n");
  }
  const enc = encodeURIComponent;
  const mailto = (o) => { const p = []; if (o.subject) p.push("subject=" + enc(o.subject)); if (o.body) p.push("body=" + enc(o.body)); return "mailto:" + o.to + (p.length ? "?" + p.join("&") : ""); };
  const sms = (o) => "sms:" + o.to + (o.body ? "?body=" + enc(o.body) : "");
  const tel = (n) => "tel:" + n;
  const geo = (lat, lon) => "geo:" + lat + "," + lon;
  // телефон: необов'язковий плюс і від 5 до 15 цифр; повертає чисту форму чи null
  function phone(s) { const t = String(s || "").replace(/[\s()\-.]/g, ""); return /^\+?\d{5,15}$/.test(t) ? t : null; }
  const emailOk = (s) => /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(String(s || "").trim());
  function coord(s, max) { const t = String(s || "").trim().replace(",", "."); if (!/^[+-]?\d+(\.\d+)?$/.test(t)) return null; const v = Number(t); return Math.abs(v) <= max ? t.replace(/^\+/, "") : null; }

  root.Qr = { ECCS, MAXB, utf8len, modeOf, make, hex, hexOut, lum, contrast, svg, raster, escW, wifi, escV, vcard, mailto, sms, tel, geo, phone, emailOk, coord };
})();
