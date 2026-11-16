/* qr-calc.js — генератор QR-кодів: текст і посилання, Wi-Fi, візитка vCard, пошта, SMS, телефон і геолокація; вигляд, рівень виправлення, завантаження PNG і SVG; залежить від km-data.js, qr-lib.js і qr-data.js. Усе в браузері: дані не надсилаються, не потрапляють у посилання й сховище */
PhysCalc.start(({ L }) => {
  const Q = window.Qr, UI = window.PhysUI, IS_EN = L(false, true);
  const DEF = {
    look: { ecc: "auto", margin: "4", px: "512", fg: "#000000", bg: "#ffffff", transparent: false },
    url: { text: "" },
    wifi: { ssid: "", pass: "", sec: "WPA", hidden: false },
    card: { first: "", last: "", org: "", title: "", tel: "", email: "", url: "", street: "", city: "", zip: "", country: "", note: "" },
    msg: { type: "email", to: "", subject: "", body: "", num: "", sms: "", lat: "", lon: "" }
  };
  const LOOK = [["qlEcc", "ecc"], ["qlMargin", "margin"], ["qlPx", "px"], ["qlFg", "fg"], ["qlBg", "bg"]];
  const F = {
    url: [["quText", "text"]],
    wifi: [["qwSsid", "ssid"], ["qwPass", "pass"], ["qwSec", "sec"]],
    card: [["qcFirst", "first"], ["qcLast", "last"], ["qcOrg", "org"], ["qcTitle", "title"], ["qcTel", "tel"], ["qcEmail", "email"], ["qcUrl", "url"], ["qcStreet", "street"], ["qcCity", "city"], ["qcZip", "zip"], ["qcCountry", "country"], ["qcNote", "note"]],
    msg: [["qmType", "type"], ["qmTo", "to"], ["qmSub", "subject"], ["qmBody", "body"], ["qmNum", "num"], ["qmSms", "sms"], ["qmLat", "lat"], ["qmLon", "lon"]]
  };
  const S = {}; Object.keys(DEF).forEach((k) => { S[k] = Object.assign({}, DEF[k]); });
  let curBody = null, last = null;

  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const sel = (id, opts) => '<select class="ph__unit ph__unit--wide" id="' + id + '" aria-label="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '">' + t + "</option>").join("") + "</select>";
  const inp = (id, ph, max, mode, type) => '<input class="ph__input" id="' + id + '" type="' + (type || "text") + '" inputmode="' + (mode || "text") + '" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="' + (max || 200) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const area = (id, ph, rows, max) => '<textarea class="ph__input ph__ta" id="' + id + '" rows="' + (rows || 3) + '" maxlength="' + (max || 1000) + '" autocomplete="off" spellcheck="false" placeholder="' + ph + '" aria-label="' + id + '"></textarea>';
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const box = (esc, t, strong) => '<div class="ph__hintbox ph__mt12">' + (strong ? "<b>" + esc(strong) + "</b> " : "") + esc(t) + "</div>";
  const togGrp = (items, st) => '<div class="ph__togGrp"><div class="ph__togs">' + items.map(([k, t]) => '<button type="button" class="ph__tog" data-k="' + k + '" aria-pressed="' + ((k.startsWith("lk_") ? S.look[k.slice(3)] : st[k]) ? "true" : "false") + '"><i class="ph__togBox" aria-hidden="true"></i><span>' + t + "</span></button>").join("") + "</div></div>";
  const fold = (key, title, inner) => '<details class="ph__details ph__fold" data-keep="' + key + '"><summary>' + title + '</summary><div class="ph__foldBody">' + inner + "</div></details>";
  const PRIV = L("Усе відбувається у вашому браузері: текст, пароль Wi-Fi чи контакти не надсилаються на сервер, не потрапляють у посилання й сховище, а посилання на результат не створюється.", "Everything happens in your browser: the text, Wi-Fi password or contact details are not sent to a server and do not end up in the link or storage, and no link to the result is created.");
  const plural = (n, a, b, c) => (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? b : c);
  const bytesW = (n) => (IS_EN ? n + (n === 1 ? " byte" : " bytes") : n + " " + plural(n, "байт", "байти", "байтів"));
  const ECC_PCT = { L: 7, M: 15, Q: 25, H: 30 };

  // ----- «Вигляд» -----
  const lookHtml = () => fold("qrLook", L("Вигляд і точність", "Look and accuracy"),
    '<div class="ph__vars">' + fld("qlEcc", L("Рівень виправлення помилок", "Error correction level"), sel("qlEcc", [["auto", L("Авто: найвищий без збільшення коду", "Auto: the highest without a bigger code")], ["L", L("L — 7 %, найменший код", "L — 7%, the smallest code")], ["M", L("M — 15 %", "M — 15%")], ["Q", L("Q — 25 %", "Q — 25%")], ["H", L("H — 30 %, найстійкіший", "H — 30%, the most robust")]]), true) +
    fld("qlMargin", L("Біла рамка, модулів", "Quiet zone, modules"), sel("qlMargin", [0, 1, 2, 3, 4, 5, 6, 8].map((n) => [String(n), String(n)]))) + fld("qlPx", L("Розмір PNG, px", "PNG size, px"), sel("qlPx", ["256", "512", "1024", "2048"].map((n) => [n, n + " × " + n]))) +
    fld("qlFg", L("Колір модулів", "Modules colour"), '<input class="qr__color" id="qlFg" type="color" aria-label="qlFg">') + fld("qlBg", L("Колір тла", "Background colour"), '<input class="qr__color" id="qlBg" type="color" aria-label="qlBg">') + "</div>" +
    togGrp([["lk_transparent", L("Прозоре тло", "Transparent background")]], S.look) +
    '<div class="ph__chips ph__mt12" id="qlChips"><button type="button" class="ph__mini" data-k="bw">' + L("Чорне на білому", "Black on white") + '</button><button type="button" class="ph__mini" data-k="navy">' + L("Темно-синє", "Navy") + '</button><button type="button" class="ph__mini" data-k="green">' + L("Зелене", "Green") + '</button><button type="button" class="ph__mini" data-k="inv">' + L("Біле на чорному", "White on black") + "</button></div>" +
    hint(L("Найнадійніше — темні модулі на світлому тлі й рамка від 4 модулів. Вищий рівень виправлення терпить подряпини й логотип, але збільшує код.", "The most reliable is dark modules on a light background with a quiet zone of at least 4 modules. A higher correction level tolerates scratches and a logo but makes the code bigger.")));
  const PRESETS = { bw: { fg: "#000000", bg: "#ffffff" }, navy: { fg: "#12285c", bg: "#ffffff" }, green: { fg: "#0b5d3b", bg: "#f4fff8" }, inv: { fg: "#ffffff", bg: "#000000" } };

  // ----- стан і поля -----
  const readS = (mk, el) => { F[mk].forEach(([id, key]) => { if (el(id)) S[mk][key] = el(id).value; }); LOOK.forEach(([id, key]) => { if (el(id)) S.look[key] = el(id).value; }); };
  const paint = (mk, el, body) => {
    F[mk].forEach(([id, key]) => { if (el(id)) el(id).value = S[mk][key]; }); LOOK.forEach(([id, key]) => { if (el(id)) el(id).value = S.look[key]; });
    body.querySelectorAll("button.ph__tog").forEach((b) => { const k = b.dataset.k, on = k.startsWith("lk_") ? S.look[k.slice(3)] : S[mk][k]; b.setAttribute("aria-pressed", on ? "true" : "false"); });
  };
  function wire(mk, body, h) {
    curBody = body; body._qr = { mk, h };
    if (!body._qrBound) {
      body._qrBound = true;
      body.addEventListener("click", (e) => {
        const b = e.target.closest("button.ph__tog"); if (!b || !body._qr) return;
        const cur = body._qr, k = b.dataset.k, on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(on));
        if (k.startsWith("lk_")) S.look[k.slice(3)] = on; else S[cur.mk][k] = on;
        cur.h.maybeCalc();
      });
    }
    F[mk].concat(LOOK).forEach(([id]) => { const e = h.el(id); if (!e) return; const f = () => { readS(mk, h.el); h.maybeCalc(); }; e.addEventListener("input", f); e.addEventListener("change", f); });
    const ch = h.el("qlChips"); if (ch) ch.addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; Object.assign(S.look, PRESETS[b.dataset.k]); paint(mk, h.el, body); h.calc(true); });
  }

  // ----- завантаження й копіювання (делегування на блок результату) -----
  function canvasOf(r) { const c = document.createElement("canvas"); c.width = r.w; c.height = r.h; c.getContext("2d").putImageData(new ImageData(r.data, r.w, r.h), 0, 0); return c; }
  function save(blob, name) { const a = document.createElement("a"), u = URL.createObjectURL(blob); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 2000); }
  function flash(btn, ok, okT, failT) { const old = btn.dataset.t || btn.textContent; btn.dataset.t = old; btn.textContent = ok ? okT : failT; btn.classList.toggle("qr__ok", ok); setTimeout(() => { btn.textContent = old; btn.classList.remove("qr__ok"); }, 1400); }
  function resultHandlers(h) {
    const rb = h.el("result"); if (rb._qrBound) return; rb._qrBound = true;
    rb.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-act]"); if (!b || !last) return;
      const act = b.dataset.act;
      if (act === "svg") { save(new Blob([last.svg], { type: "image/svg+xml" }), "qr-code.svg"); flash(b, true, L("Збережено", "Saved"), ""); return; }
      const cv = canvasOf(last.raster);
      cv.toBlob((blob) => {
        if (!blob) { flash(b, false, "", L("Не вийшло", "Failed")); return; }
        if (act === "png") { save(blob, "qr-code.png"); flash(b, true, L("Збережено", "Saved"), ""); return; }
        try { navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]).then(() => flash(b, true, L("Скопійовано", "Copied"), ""), () => flash(b, false, "", L("Не вийшло", "Failed"))); } catch (x) { flash(b, false, "", L("Не підтримується", "Not supported")); }
      }, "image/png");
    });
  }

  // ----- спільна частина результату -----
  const eccName = (e) => e + " (≈ " + ECC_PCT[e] + " %)";
  function render(payload, shown, h, label) {
    const { esc } = h, s = S.look, fg = Q.hex(s.fg) || [0, 0, 0], bg = Q.hex(s.bg) || [255, 255, 255], margin = Number(s.margin), px = Number(s.px);
    const r = Q.make(payload, s.ecc);
    if (r.err === "overflow") return { ok: false, msg: L("Забагато даних для QR-коду: у вас ", "Too much data for a QR code: you have ") + bytesW(Q.utf8len(payload)) + L(", а найбільший код вміщує приблизно ", ", while the biggest code holds about ") + r.max + L(" (рівень ", " (level ") + (s.ecc === "auto" ? "L" : s.ecc) + "). " + L("Скоротіть текст чи оберіть нижчий рівень виправлення.", "Shorten the text or choose a lower correction level.") };
    const N = r.count + 2 * margin, scale = Math.max(1, Math.floor(px / N)), W = N * scale;
    const o = { margin, fg, bg, transparent: s.transparent }, svg = Q.svg(r.matrix, o), rast = Q.raster(r.matrix, Object.assign({ scale }, o));
    last = { svg, raster: rast, payload };
    const warns = [];
    if (!s.transparent) { const c = Q.contrast(fg, bg); if (Q.lum(fg) > Q.lum(bg)) warns.push([L("Інверсний код.", "An inverted code."), L("Світлі модулі на темному тлі читає не кожен сканер: надійніше темне на світлому.", "Not every scanner reads light modules on a dark background: dark on light is safer.")]); if (c < 4) warns.push([L("Низький контраст.", "Low contrast."), L("Контраст ", "The contrast is ") + (Math.round(c * 10) / 10) + ":1" + L(": для надійного читання потрібен щонайменше 4:1.", ": reliable scanning needs at least 4:1.")]); }
    else warns.push([L("Прозоре тло.", "Transparent background."), L("Код буде читатися лише на світлій основі: перевірте після розміщення.", "The code will scan only on a light base: check it after placing.")]);
    if (margin < 4) warns.push([L("Мала біла рамка.", "A small quiet zone."), L("Стандарт радить щонайменше 4 модулі: частина сканерів не прочитає код.", "The standard advises at least 4 modules: some scanners will not read the code.")]);
    if (scale < 4) warns.push([L("Дрібні модулі.", "Tiny modules."), L("Лише ", "Only ") + scale + L(" px на модуль у PNG: збільште розмір або скоротіть дані.", " px per module in the PNG: raise the size or shorten the data.")]);
    if (r.version >= 10) warns.push([L("Великий код.", "A big code."), L("Версія ", "Version ") + r.version + L(" (", " (") + r.count + "×" + r.count + L(" модулів) важко сканується здалеку: скоротіть дані чи використайте коротке посилання.", " modules) is hard to scan from a distance: shorten the data or use a short link.")]);
    const view = '<div class="qr__stage"><div class="qr__view' + (s.transparent ? " is-tr" : "") + '">' + svg.replace("<svg ", '<svg class="qr__svg" role="img" aria-label="' + esc(L("QR-код", "QR code")) + '" ') + '</div><div class="qr__btns"><button type="button" class="ph__mini" data-act="png">' + L("Завантажити PNG", "Download PNG") + '</button><button type="button" class="ph__mini" data-act="svg">' + L("Завантажити SVG", "Download SVG") + '</button><button type="button" class="ph__mini" data-act="copy">' + L("Копіювати зображення", "Copy image") + "</button></div></div>";
    const steps = [
      { t: L("Що закодовано", "What is encoded"), l: [shown.length > 220 ? shown.slice(0, 220) + "…" : shown], note: L("У QR-код записується саме цей текст.", "Exactly this text goes into the QR code.") },
      { t: L("Режим кодування", "Encoding mode"), l: [(r.mode === "Numeric" ? L("Цифри", "Numeric") : r.mode === "Alphanumeric" ? L("Великі літери, цифри й знаки", "Alphanumeric") : L("Байти UTF-8", "UTF-8 bytes")) + ": " + bytesW(r.bytes)], note: r.mode === "Byte" ? L("Кирилиця й емодзі займають 2–4 байти на знак.", "Cyrillic and emoji take 2–4 bytes per character.") : L("Цей режим щільніший за байтовий.", "This mode is denser than the byte mode.") },
      { t: L("Версія й виправлення", "Version and correction"), l: [L("Версія ", "Version ") + r.version + " (" + r.count + "×" + r.count + L(" модулів), рівень ", " modules), level ") + eccName(r.ecc)], note: s.ecc === "auto" ? L("Авто обирає найвищий рівень, що не збільшує код.", "Auto picks the highest level that does not make the code bigger.") : "" },
      { t: L("Розмір зображення", "Image size"), l: [N + " × " + N + L(" модулів з рамкою; у PNG ", " modules with the quiet zone; in the PNG ") + scale + L(" px на модуль, ", " px per module, ") + W + " × " + W + " px"], note: L("Цілий масштаб тримає краї різкими; SVG масштабується без втрат.", "A whole scale keeps the edges sharp; the SVG scales without loss.") }
    ];
    return { ok: true, expr: label, head: [L("версія", "version"), String(r.version)], headSub: r.count + "×" + r.count + L(" модулів · виправлення ", " modules · correction ") + eccName(r.ecc), subRaw: true, afterHead: view, tiles: [{ k: L("Даних", "Data"), v: bytesW(r.bytes) }, { k: L("Рівень виправлення", "Correction level"), v: eccName(r.ecc) }, { k: L("PNG", "PNG"), v: W + " × " + W + " px" }], extraHtml: warns.map((w) => box(esc, w[1], w[0])).join("") + box(esc, PRIV), steps, note: "", copyText: payload, resText: "" };
  }
  const errBox = (m) => ({ ok: false, msg: m });

  // ====================== текст і посилання ======================
  const url = {
    key: "url", type: "custom", req: () => ["quText"], nameUk: "Текст і посилання", nameEn: "Text and link",
    build(body, x, h) {
      body.innerHTML = '<div class="ph__vars">' + fld("quText", L("Посилання або текст", "Link or text"), area("quText", L("https://calccore.net", "https://calccore.net"), 4, 3000), true) + "</div>" + lookHtml() + hint(L("Для посилання пишіть повну адресу з https://, інакше телефон може прочитати її як звичайний текст. Кирилиця й емодзі підтримуються.", "For a link write the full address with https://, otherwise a phone may read it as plain text. Cyrillic and emoji are supported."));
      paint("url", h.el, body); wire("url", body, h); resultHandlers(h);
    },
    calc(h) {
      const { el } = h; readS("url", el); const t = S.url.text;
      if (!t.trim()) return { ok: false, incomplete: true };
      const res = render(t, t, h, L("текст чи посилання", "text or link"));
      if (res.ok && /^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t.trim()) && !/^[a-z][a-z0-9+.-]*:/i.test(t.trim())) res.extraHtml = box(h.esc, L("Схоже на адресу без протоколу: додайте https://, щоб телефон відкрив її як посилання.", "This looks like an address without a protocol: add https:// so a phone opens it as a link."), L("Порада.", "Tip.")) + res.extraHtml;
      return res;
    },
    reset(h) { S.url = Object.assign({}, DEF.url); S.look = Object.assign({}, DEF.look); paint("url", h.el, curBody); },
    fill(h) { S.url.text = "https://calccore.net"; paint("url", h.el, curBody); },
    share() {}, apply() {}
  };

  // ====================== Wi-Fi ======================
  const wifi = {
    key: "wifi", type: "custom", req: () => ["qwSsid"], nameUk: "Wi-Fi", nameEn: "Wi-Fi",
    build(body, x, h) {
      body.innerHTML = '<div class="ph__vars">' + fld("qwSsid", L("Назва мережі (SSID)", "Network name (SSID)"), inp("qwSsid", L("Моя_мережа", "My_network"), 64), true) + fld("qwSec", L("Захист", "Security"), sel("qwSec", [["WPA", "WPA / WPA2 / WPA3"], ["WEP", "WEP"], ["nopass", L("Без пароля", "No password")]])) + fld("qwPass", L("Пароль", "Password"), inp("qwPass", L("мінімум 8 знаків", "at least 8 characters"), 64)) + "</div>" +
        togGrp([["hidden", L("Прихована мережа", "Hidden network")]], S.wifi) + lookHtml() + hint(L("Гість наведе камеру й підключиться без введення пароля. Пароль зашито в код: не публікуйте його там, де його не повинні бачити сторонні.", "A guest points the camera and connects without typing the password. The password is built into the code: do not post it where outsiders should not see it."));
      paint("wifi", h.el, body); wire("wifi", body, h); resultHandlers(h);
      const sync = () => { h.el("qwPassW").style.display = h.el("qwSec").value === "nopass" ? "none" : ""; }; sync(); h.el("qwSec").addEventListener("change", sync);
    },
    calc(h) {
      const { el } = h; readS("wifi", el); const w = S.wifi; if (!w.ssid.trim()) return { ok: false, incomplete: true };
      if (w.sec !== "nopass" && !w.pass) return errBox(L("Введіть пароль мережі чи оберіть «Без пароля».", "Enter the network password or choose “No password”."));
      const o = { ssid: w.ssid, pass: w.pass, sec: w.sec, hidden: w.hidden }, res = render(Q.wifi(o), Q.wifi(Object.assign({}, o, { pass: w.pass ? "••••••••" : "" })), h, L("Wi-Fi: ", "Wi-Fi: ") + w.ssid);
      if (res.ok && w.sec === "WPA" && (w.pass.length < 8 || w.pass.length > 63)) res.extraHtml = box(h.esc, L("Пароль WPA має містити від 8 до 63 знаків: перевірте, чи він правильний.", "A WPA password must be 8 to 63 characters: check that it is correct."), L("Перевірте.", "Check.")) + res.extraHtml;
      return res;
    },
    reset(h) { S.wifi = Object.assign({}, DEF.wifi); S.look = Object.assign({}, DEF.look); paint("wifi", h.el, curBody); h.el("qwPassW").style.display = ""; },
    fill(h) { S.wifi = { ssid: L("Моя_мережа", "My_network"), pass: "correct-horse-1", sec: "WPA", hidden: false }; paint("wifi", h.el, curBody); h.el("qwPassW").style.display = ""; },
    share() {}, apply() {}
  };

  // ====================== візитка ======================
  const card = {
    key: "card", type: "custom", req: () => [], nameUk: "Візитка", nameEn: "Contact card",
    build(body, x, h) {
      body.innerHTML = '<div class="ph__vars">' + fld("qcFirst", L("Ім'я", "First name"), inp("qcFirst", L("Іван", "Ivan"), 60)) + fld("qcLast", L("Прізвище", "Last name"), inp("qcLast", L("Іваненко", "Ivanenko"), 60)) + fld("qcOrg", L("Компанія", "Company"), inp("qcOrg", "", 80)) + fld("qcTitle", L("Посада", "Job title"), inp("qcTitle", "", 80)) +
        fld("qcTel", L("Телефон", "Phone"), inp("qcTel", "+380501234567", 30, "tel")) + fld("qcEmail", "Email", inp("qcEmail", "name@example.com", 80, "email")) + fld("qcUrl", L("Сайт", "Website"), inp("qcUrl", "https://example.com", 120, "url"), true) + "</div>" +
        fold("qrCardMore", L("Адреса й примітка", "Address and note"), '<div class="ph__vars">' + fld("qcStreet", L("Вулиця", "Street"), inp("qcStreet", "", 100), true) + fld("qcCity", L("Місто", "City"), inp("qcCity", "", 60)) + fld("qcZip", L("Індекс", "Postal code"), inp("qcZip", "", 12)) + fld("qcCountry", L("Країна", "Country"), inp("qcCountry", "", 60), true) + fld("qcNote", L("Примітка", "Note"), area("qcNote", "", 2, 200), true) + "</div>") +
        lookHtml() + hint(L("Телефон зчитає формат vCard 3.0: контакт можна буде додати в записник одним дотиком. Чим менше полів, тим простіший код і легше сканування.", "A phone reads the vCard 3.0 format: the contact can be added to the address book with a tap. The fewer fields, the simpler the code and the easier it scans."));
      paint("card", h.el, body); wire("card", body, h); resultHandlers(h);
    },
    calc(h) {
      const { el } = h; readS("card", el); const c = S.card, t = (k) => c[k].trim();
      if (!t("first") && !t("last") && !t("org")) return { ok: false, incomplete: true };
      if (t("tel") && !Q.phone(t("tel"))) return errBox(L("Телефон: від 5 до 15 цифр, можна з плюсом, пробілами й дужками.", "Phone: 5 to 15 digits, a plus, spaces and brackets are allowed."));
      if (t("email") && !Q.emailOk(t("email"))) return errBox(L("Email виглядає неправильно: очікується name@example.com.", "The email looks wrong: expected name@example.com."));
      const p = { first: t("first"), last: t("last"), org: t("org"), title: t("title"), tel: t("tel") ? Q.phone(t("tel")) : "", email: t("email"), url: t("url"), street: t("street"), city: t("city"), zip: t("zip"), country: t("country"), note: t("note") };
      return render(Q.vcard(p), Q.vcard(p), h, L("візитка: ", "contact: ") + ([p.first, p.last].filter(Boolean).join(" ") || p.org));
    },
    reset(h) { S.card = Object.assign({}, DEF.card); S.look = Object.assign({}, DEF.look); paint("card", h.el, curBody); },
    fill(h) { S.card = Object.assign({}, DEF.card, { first: L("Іван", "Ivan"), last: L("Іваненко", "Ivanenko"), org: "CalcCore", tel: "+380501234567", email: "ivan@example.com", url: "https://calccore.net" }); paint("card", h.el, curBody); },
    share() {}, apply() {}
  };

  // ====================== пошта, SMS, телефон, геолокація ======================
  const msg = {
    key: "msg", type: "custom", req: () => [], nameUk: "Пошта, SMS, телефон", nameEn: "Email, SMS, phone",
    build(body, x, h) {
      body.innerHTML = '<div class="ph__vars">' + fld("qmType", L("Що закодувати", "What to encode"), sel("qmType", [["email", L("Лист на пошту", "An email")], ["sms", L("SMS", "An SMS")], ["tel", L("Телефонний дзвінок", "A phone call")], ["geo", L("Геолокація (точка на карті)", "A location (a map point)")]]), true) +
        fld("qmTo", L("Кому (email)", "To (email)"), inp("qmTo", "name@example.com", 100, "email"), true) + fld("qmSub", L("Тема", "Subject"), inp("qmSub", "", 150), true) + fld("qmBody", L("Текст листа", "Message"), area("qmBody", "", 3, 600), true) +
        fld("qmNum", L("Номер телефону", "Phone number"), inp("qmNum", "+380501234567", 30, "tel"), true) + fld("qmSms", L("Текст SMS", "SMS text"), area("qmSms", "", 3, 300), true) +
        fld("qmLat", L("Широта (−90…90)", "Latitude (−90…90)"), inp("qmLat", "50.4501", 12, "decimal")) + fld("qmLon", L("Довгота (−180…180)", "Longitude (−180…180)"), inp("qmLon", "30.5234", 12, "decimal")) + "</div>" + lookHtml() +
        hint(L("Телефон запропонує написати лист, надіслати SMS, зателефонувати чи відкрити точку на карті. Для SMS і дзвінка вказуйте номер із кодом країни: +380…", "A phone offers to write an email, send an SMS, call or open the point on a map. For an SMS and a call give the number with the country code: +380…"));
      paint("msg", h.el, body); wire("msg", body, h); resultHandlers(h);
      const sync = () => { const t = h.el("qmType").value, sh = (id, on) => { h.el(id + "W").style.display = on ? "" : "none"; }; sh("qmTo", t === "email"); sh("qmSub", t === "email"); sh("qmBody", t === "email"); sh("qmNum", t === "sms" || t === "tel"); sh("qmSms", t === "sms"); sh("qmLat", t === "geo"); sh("qmLon", t === "geo"); };
      sync(); h.el("qmType").addEventListener("change", sync); body._qrSync = sync;
    },
    calc(h) {
      const { el } = h; readS("msg", el); const m = S.msg, t = (k) => m[k].trim();
      if (m.type === "email") { if (!t("to")) return { ok: false, incomplete: true }; if (!Q.emailOk(t("to"))) return errBox(L("Email виглядає неправильно: очікується name@example.com.", "The email looks wrong: expected name@example.com.")); const s = Q.mailto({ to: t("to"), subject: t("subject"), body: m.body.trim() }); return render(s, s, h, L("лист: ", "email: ") + t("to")); }
      if (m.type === "sms" || m.type === "tel") { if (!t("num")) return { ok: false, incomplete: true }; const p = Q.phone(t("num")); if (!p) return errBox(L("Номер: від 5 до 15 цифр, можна з плюсом, пробілами й дужками.", "Number: 5 to 15 digits, a plus, spaces and brackets are allowed.")); const s = m.type === "sms" ? Q.sms({ to: p, body: m.sms.trim() }) : Q.tel(p); return render(s, s, h, (m.type === "sms" ? "SMS: " : L("дзвінок: ", "call: ")) + p); }
      if (!t("lat") && !t("lon")) return { ok: false, incomplete: true };
      const la = Q.coord(t("lat"), 90), lo = Q.coord(t("lon"), 180); if (la === null) return errBox(L("Широта: число від −90 до 90.", "Latitude: a number from −90 to 90.")); if (lo === null) return errBox(L("Довгота: число від −180 до 180.", "Longitude: a number from −180 to 180."));
      const s = Q.geo(la, lo); return render(s, s, h, L("точка: ", "point: ") + la + ", " + lo);
    },
    reset(h) { S.msg = Object.assign({}, DEF.msg); S.look = Object.assign({}, DEF.look); paint("msg", h.el, curBody); if (curBody._qrSync) curBody._qrSync(); },
    fill(h) { S.msg = Object.assign({}, DEF.msg, { type: "email", to: "hello@example.com", subject: L("Запитання", "A question"), body: L("Доброго дня! Маю запитання.", "Hello! I have a question.") }); paint("msg", h.el, curBody); if (curBody._qrSync) curBody._qrSync(); },
    share() {}, apply() {}
  };

  return { modes: [url, wifi, card, msg], exactNote: false, noShare: true, onReset() { Object.keys(DEF).forEach((k) => { S[k] = Object.assign({}, DEF[k]); }); last = null; } };
});
