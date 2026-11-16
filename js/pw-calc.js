/* pw-calc.js — генератор паролів, парольних фраз, PIN, логінів і ніків та перевірка пароля; залежить від km-data.js, pw-words.js, pw-data.js, pw-names.js. Пароль живе лише в пам'яті сторінки: не потрапляє в посилання, сховище й аналітику */
PhysCalc.start(({ L }) => {
  const P = window.Pw, N = window.PwNames, UI = window.PhysUI, IS_EN = L(false, true);
  const DEF = {
    gen: { len: "16", lower: true, upper: true, digits: true, syms: true, symset: "all", noAmbig: false, each: true, exclude: "", count: "1" },
    ph: { words: "6", sep: "dash", cap: false, num: false, count: "1" },
    pin: { len: "4", filter: true, count: "1" },
    lg: { name: "", words: "2", sep: "_", digits: "2", max: "20", count: "6", lang: "en" },
    nk: { lang: IS_EN ? "en" : "uk", script: "cyr", theme: "all", struct: "an", style: "camel", digits: "0", max: "20", count: "8" }
  };
  const F = {
    gen: [["pgLen", "len"], ["pgSet", "symset"], ["pgEx", "exclude"], ["pgCnt", "count"]],
    ph: [["ppWords", "words"], ["ppSep", "sep"], ["ppCnt", "count"]],
    pin: [["pnLen", "len"], ["pnCnt", "count"]],
    lg: [["plName", "name"], ["plWords", "words"], ["plSep", "sep"], ["plDig", "digits"], ["plMax", "max"], ["plCnt", "count"]].concat(IS_EN ? [] : [["plLang", "lang"]]),
    nk: [["pkTheme", "theme"], ["pkStruct", "struct"], ["pkStyle", "style"], ["pkDig", "digits"], ["pkMax", "max"], ["pkCnt", "count"]].concat(IS_EN ? [] : [["pkLang", "lang"], ["pkScript", "script"]])
  };
  const S = { hide: false, list: [] };
  Object.keys(DEF).forEach((k) => { S[k] = Object.assign({}, DEF[k]); });

  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const sel = (id, opts) => '<select class="ph__unit ph__unit--wide" id="' + id + '" aria-label="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '">' + t + "</option>").join("") + "</select>";
  const inp = (id, ph, max, mode) => '<input class="ph__input" id="' + id + '" type="text" inputmode="' + (mode || "numeric") + '" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="' + (max || 4) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const togGrp = (title, items, st) => '<div class="ph__togGrp"><div class="ph__togTitle">' + title + '</div><div class="ph__togs">' + items.map(([k, t]) => '<button type="button" class="ph__tog" data-k="' + k + '" aria-pressed="' + (st[k] ? "true" : "false") + '"><i class="ph__togBox" aria-hidden="true"></i><span>' + t + "</span></button>").join("") + "</div></div>";
  const box = (esc, t, strong) => '<div class="ph__hintbox ph__mt12">' + (strong ? "<b>" + esc(strong) + "</b> " : "") + esc(t) + "</div>";
  const num = (s, min, max) => { const t = String(s).trim(); if (!/^\d+$/.test(t)) return null; const v = Number(t); return v < min || v > max ? null : v; };
  const plural = (n, a, b, c) => (n % 10 === 1 && n % 100 !== 11 ? a : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? b : c);
  const chars = (n) => (IS_EN ? n + (n === 1 ? " character" : " characters") : n + " " + plural(n, "символ", "символи", "символів"));
  const digitsW = (n) => (IS_EN ? n + (n === 1 ? " digit" : " digits") : n + " " + plural(n, "цифра", "цифри", "цифр"));
  const wordsW = (n) => (IS_EN ? n + (n === 1 ? " word" : " words") : n + " " + plural(n, "слово", "слова", "слів"));
  const DISC = L("Час підбору — лише орієнтовна оцінка за середньою кількістю спроб (половина всіх варіантів) і умовною швидкістю. Реальні швидкості залежать від того, як сервіс зберігає пароль: повільні алгоритми (bcrypt, Argon2) роблять підбір у тисячі разів довшим, а швидкі й застарілі (MD5, SHA-1 без солі) — коротшим. Ці розрахунки не гарантують безпеки: головні ризики — фішинг, витік бази й повторне використання пароля.", "The cracking time is only a rough estimate from the average number of guesses (half of all possibilities) and an assumed speed. Real speeds depend on how the service stores the password: slow algorithms (bcrypt, Argon2) make guessing thousands of times longer, while fast and outdated ones (unsalted MD5, SHA-1) make it shorter. These figures do not guarantee security: the main risks are phishing, a database leak and reusing the password.");
  const PRIV = L("Усе відбувається в браузері: паролі не надсилаються на сервер, не потрапляють у посилання, сховище браузера й аналітику.", "Everything happens in your browser: passwords are not sent to a server and do not end up in the link, browser storage or analytics.");
  const ERR = {
    noclass: L("Оберіть хоча б один тип знаків.", "Choose at least one type of characters."),
    emptyclass: L("Після виключення знаків один з обраних типів став порожнім: приберіть виключення чи вимкніть цей тип.", "After excluding characters one of the chosen types is empty: remove the exclusion or turn that type off."),
    short: L("Довжина менша за кількість обраних типів: збільште довжину чи зніміть вимогу «кожного типу».", "The length is less than the number of chosen types: increase the length or turn off the “each type” requirement."),
    fail: L("Не вдалося згенерувати пароль за такими умовами: послабте обмеження.", "Could not generate a password with these conditions: relax the restrictions.")
  };

  // ----- стан і поля -----
  const readS = (mk, el) => { F[mk].forEach(([id, key]) => { if (el(id)) S[mk][key] = el(id).value; }); };
  const paint = (mk, el, body) => {
    F[mk].forEach(([id, key]) => { if (el(id)) el(id).value = S[mk][key]; });
    body.querySelectorAll("button.ph__tog").forEach((b) => b.setAttribute("aria-pressed", S[mk][b.dataset.k] ? "true" : "false"));
  };
  function wire(mk, body, h, ids) {
    curBody = body; body._pw = { mk, h };
    if (!body._pwBound) {
      body._pwBound = true;
      body.addEventListener("click", (e) => { const b = e.target.closest("button.ph__tog"); if (!b || !body._pw) return; const cur = body._pw, on = b.getAttribute("aria-pressed") !== "true"; b.setAttribute("aria-pressed", String(on)); S[cur.mk][b.dataset.k] = on; cur.h.maybeCalc(); });
    }
    ids.forEach((id) => { const e = h.el(id); if (!e) return; const f = () => { readS(mk, h.el); h.maybeCalc(); }; e.addEventListener("input", f); e.addEventListener("change", f); });
  }
  let curBody = null; const bodyOf = () => curBody;
  async function copyText(t) {
    try { await navigator.clipboard.writeText(t); return true; } catch (e) {
      try { const ta = document.createElement("textarea"); ta.value = t; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok; } catch (e2) { return false; }
    }
  }
  function resultHandlers(h) {
    const rb = h.el("result"); if (rb._pwBound) return; rb._pwBound = true;
    rb.addEventListener("click", (e) => {
      const cp = e.target.closest(".pw__cp");
      if (cp) { const s = S.list[Number(cp.dataset.i)]; if (s === undefined) return; copyText(s).then((ok) => { const old = cp.textContent; cp.textContent = ok ? L("Скопійовано", "Copied") : L("Не вийшло", "Failed"); if (ok) cp.classList.add("pw__ok"); setTimeout(() => { cp.textContent = old; cp.classList.remove("pw__ok"); }, 1300); }); return; }
      const eye = e.target.closest(".pw__eye");
      if (eye) { S.hide = !S.hide; rb.classList.toggle("pw--hide", S.hide); eye.textContent = S.hide ? L("Показати", "Show") : L("Сховати", "Hide"); }
    });
    rb.classList.toggle("pw--hide", S.hide);
  }

  // ----- відображення -----
  const colorize = (esc, s) => Array.from(s).map((ch) => (/[0-9]/.test(ch) ? '<i class="pw__d">' + esc(ch) + "</i>" : /[^A-Za-z0-9]/.test(ch) ? '<i class="pw__s">' + esc(ch) + "</i>" : esc(ch))).join("");
  const rowsHtml = (esc, list, secret) => '<div class="pw__list">' + list.map((s, i) => '<div class="pw__row">' + (secret ? '<code class="pw__val">' + colorize(esc, s) + '</code><span class="pw__mask" aria-hidden="true">' + "•".repeat(Math.min(Array.from(s).length, 20)) + "</span>" : '<span class="pw__nm">' + esc(s) + "</span>") + '<button type="button" class="ph__mini pw__cp" data-i="' + i + '">' + L("Копіювати", "Copy") + "</button></div>").join("") + "</div>";
  const meter = (i) => '<div class="pw__meter" role="img" aria-label="' + L("Шкала сили: ", "Strength meter: ") + (i + 1) + '/6">' + [0, 1, 2, 3, 4, 5].map((k) => "<i" + (k <= i ? ' class="on' + i + '"' : "") + "></i>").join("") + "</div>";
  const eyeBtn = () => '<button type="button" class="ph__mini pw__eye">' + (S.hide ? L("Показати", "Show") : L("Сховати", "Hide")) + "</button>";
  const afterHead = (esc, list, o) => '<div class="pw__bar">' + (o.level !== undefined ? meter(o.level) : "") + (o.secret ? eyeBtn() : "") + "</div>" + rowsHtml(esc, list, o.secret);
  const scenTable = (bits) => UI.list([L("Сценарій підбору", "Guessing scenario"), L("Орієнтовний час", "Approximate time")], P.SCEN.map((s) => ({ cells: [{ t: L(s.uk, s.en), cls: "is-first" }, P.fmtTime(P.seconds(bits, s.rate))] })), { w: "minmax(0, 1.7fr) minmax(0, 1fr)" });
  const bitsTxt = (b) => P.num1(b, 1) + " " + L("біт", "bits");
  const strengthTiles = (bits, pool) => [{ k: L("Ентропія", "Entropy"), v: bitsTxt(bits) }, { k: pool ? L("Набір знаків", "Character pool") : L("Сила", "Strength"), v: pool ? String(pool) : P.strength(bits).name }, { k: L("Підбір на швидкому ПК", "Guessing on a fast PC"), v: P.fmtTime(P.seconds(bits, 1e10)) }];

  // ====================== пароль ======================
  const gen = {
    key: "gen", type: "custom", req: () => [], nameUk: "Пароль", nameEn: "Password",
    build(body, x, h) {
      const { el } = h, s = S.gen;
      body.innerHTML = fld("pgLen", L("Довжина (4–128)", "Length (4–128)"), '<div class="pw__lenRow"><input class="pw__range" id="pgR" type="range" min="4" max="128" step="1" aria-label="' + L("Довжина", "Length") + '">' + inp("pgLen", "16", 3) + "</div>", true) +
        togGrp(L("Які знаки", "Which characters"), [["lower", L("Малі літери a–z", "Lowercase a–z")], ["upper", L("Великі літери A–Z", "Uppercase A–Z")], ["digits", L("Цифри 0–9", "Digits 0–9")], ["syms", L("Символи", "Symbols")]], s) +
        '<div class="ph__vars ph__mt12">' + fld("pgSet", L("Набір символів", "Symbol set"), sel("pgSet", [["all", L("Усі: !@#$%^&*()-_=+[]{};:,.<>?/", "All: !@#$%^&*()-_=+[]{};:,.<>?/")], ["safe", L("Безпечні для форм: !@#$%&*?-_", "Form-safe: !@#$%&*?-_")], ["mini", L("Мінімальні: - _ .", "Minimal: - _ .")]])) + fld("pgCnt", L("Скільки паролів (1–10)", "How many (1–10)"), inp("pgCnt", "1", 2)) + "</div>" +
        togGrp(L("Додатково", "More"), [["noAmbig", L("Без схожих знаків 0 O 1 l I", "No look-alikes 0 O 1 l I")], ["each", L("Хоча б по одному знаку кожного типу", "At least one of each type")]], s) +
        '<div class="ph__vars ph__mt12">' + fld("pgEx", L("Виключити знаки (необов'язково)", "Exclude characters (optional)"), inp("pgEx", L("наприклад: {}[]", "for example: {}[]"), 30, "text"), true) + "</div>" +
        hint(L("Пароль створюється у вашому браузері криптографічним генератором. Чим довший пароль, тим краще; для облікових записів достатньо 14–16 знаків, для менеджера паролів беріть 20 і більше.", "The password is created in your browser by a cryptographic generator. The longer the better: 14–16 characters are enough for accounts, take 20 or more for a password manager."));
      paint("gen", el, body); el("pgR").value = el("pgLen").value;
      el("pgR").addEventListener("input", () => { el("pgLen").value = el("pgR").value; readS("gen", el); h.maybeCalc(); });
      el("pgLen").addEventListener("input", () => { const v = num(el("pgLen").value, 4, 128); if (v !== null) el("pgR").value = v; });
      wire("gen", body, h, ["pgLen", "pgSet", "pgEx", "pgCnt"]); resultHandlers(h);
    },
    calc(h) {
      const { el, esc } = h; readS("gen", el); const s = S.gen;
      const len = num(s.len, 4, 128); if (len === null) return { ok: false, msg: L("Довжина: ціле число від 4 до 128.", "Length: a whole number from 4 to 128.") };
      const cnt = num(s.count, 1, 10); if (cnt === null) return { ok: false, msg: L("Кількість паролів: від 1 до 10.", "Number of passwords: from 1 to 10.") };
      const o = { len, lower: s.lower, upper: s.upper, digits: s.digits, syms: s.syms, symset: s.symset, noAmbig: s.noAmbig, each: s.each, exclude: s.exclude };
      const r = P.passwords(o, cnt); if (r.err) return { ok: false, msg: ERR[r.err] };
      S.list = r.list;
      const st = P.strength(r.bits), kinds = [s.lower, s.upper, s.digits, s.syms].filter(Boolean).length, cl = P.classes(o);
      const names = [], sizes = []; [[s.lower, L("малі", "lower")], [s.upper, L("великі", "upper")], [s.digits, L("цифри", "digits")], [s.syms, L("символи", "symbols")]].forEach(([on, n]) => { if (on) names.push(n); });
      cl.forEach((c) => sizes.push(c.length));
      const steps = [
        { t: L("Набір знаків", "Character pool"), l: [names.map((n, i) => n + " (" + sizes[i] + ")").join(" + ") + " = " + r.pool], note: s.noAmbig || s.exclude ? L("Виключені знаки вже не входять до набору.", "Excluded characters are no longer in the pool.") : "" },
        { t: L("Ентропія", "Entropy"), l: [len + " × log₂(" + r.pool + ") = " + bitsTxt(len * Math.log2(r.pool))], note: s.each && kinds > 1 ? L("Через вимогу «кожного типу» допустимих паролів трохи менше, тому ентропія точніше: log₂(кількість допустимих) = ", "Because of the “each type” requirement there are slightly fewer valid passwords, so the exact entropy is log₂(number of valid ones) = ") + bitsTxt(r.bits) : "" },
        { t: L("Випадковість", "Randomness"), l: [L("Знаки обираються через crypto.getRandomValues; значення з «неповного хвоста» відкидаються, тому кожен знак рівноймовірний (без зсуву за модулем).", "Characters are chosen with crypto.getRandomValues; values from the incomplete tail are rejected, so every character is equally likely (no modulo bias).")] },
        { t: L("Час підбору", "Guessing time"), l: [L("у середньому 2^(", "on average 2^(") + P.num1(r.bits, 1) + L(" − 1) / швидкість спроб", " − 1) / guesses per second")] }
      ];
      return { ok: true, expr: chars(len) + " · " + L("типів: ", "types: ") + kinds, head: [L("сила пароля", "password strength"), st.name], headSub: bitsTxt(r.bits) + L(" ентропії", " of entropy"), subRaw: true, afterHead: afterHead(esc, r.list, { secret: true, level: st.i }), tiles: strengthTiles(r.bits, r.pool), extraHtml: '<div class="ph__sub">' + L("Скільки часу піде на підбір", "How long guessing takes") + "</div>" + scenTable(r.bits) + box(esc, DISC) + box(esc, PRIV), steps, note: "", copyText: r.list.join("\n"), resText: "" };
    },
    reset(h) { S.gen = Object.assign({}, DEF.gen); paint("gen", h.el, bodyOf(h, "pgLen")); h.el("pgR").value = S.gen.len; },
    fill(h) { S.gen = Object.assign({}, DEF.gen, { len: "20", count: "3" }); paint("gen", h.el, bodyOf(h, "pgLen")); h.el("pgR").value = "20"; },
    share() {}, apply() {}
  };

  // ====================== парольна фраза ======================
  const ph = {
    key: "ph", type: "custom", req: () => [], nameUk: "Парольна фраза", nameEn: "Passphrase",
    build(body, x, h) {
      const { el } = h, s = S.ph;
      body.innerHTML = '<div class="ph__vars">' + fld("ppWords", L("Кількість слів (3–10)", "Number of words (3–10)"), inp("ppWords", "5", 2)) + fld("ppCnt", L("Скільки фраз (1–10)", "How many (1–10)"), inp("ppCnt", "1", 2)) + fld("ppSep", L("Роздільник", "Separator"), sel("ppSep", [["dash", L("Дефіс (-)", "Hyphen (-)")], ["space", L("Пробіл", "Space")], ["dot", L("Крапка (.)", "Period (.)")], ["under", L("Підкреслення (_)", "Underscore (_)")], ["none", L("Без роздільника", "No separator")]]), true) + "</div>" +
        togGrp(L("Додатково", "More"), [["cap", L("Слова з великої літери", "Capitalize the words")], ["num", L("Додати двоцифрове число в кінці", "Add a two-digit number at the end")]], s) +
        hint(L("Слова беруться з короткого списку EFF (1296 слів, ліцензія CC BY 3.0), кожне слово додає близько 10,3 біта. Фраза з 5 слів легша для запам'ятовування, ніж випадковий набір знаків такої самої сили. Слова англійські: це стандартний перевірений список.", "The words come from the EFF short list (1296 words, CC BY 3.0 licence); each word adds about 10.3 bits. A five-word phrase is easier to remember than a random string of the same strength."));
      paint("ph", el, body); wire("ph", body, h, ["ppWords", "ppSep", "ppCnt"]); resultHandlers(h);
    },
    calc(h) {
      const { el, esc } = h; readS("ph", el); const s = S.ph;
      const w = num(s.words, 3, 10); if (w === null) return { ok: false, msg: L("Кількість слів: ціле число від 3 до 10.", "Number of words: a whole number from 3 to 10.") };
      const cnt = num(s.count, 1, 10); if (cnt === null) return { ok: false, msg: L("Кількість фраз: від 1 до 10.", "Number of phrases: from 1 to 10.") };
      const r = P.phrases({ words: w, sep: s.sep, cap: s.cap, num: s.num }, cnt); S.list = r.list;
      const st = P.strength(r.bits);
      const steps = [
        { t: L("Список слів", "The word list"), l: [L("EFF Short Wordlist #1: ", "EFF Short Wordlist #1: ") + r.size + L(" слів, кожне обирається випадково й рівноймовірно (з поверненням).", " words, each picked at random with equal probability (with replacement).")] },
        { t: L("Ентропія", "Entropy"), l: [w + " × log₂(" + r.size + ") = " + bitsTxt(w * Math.log2(r.size))].concat(s.num ? ["+ log₂(100) = " + bitsTxt(Math.log2(100)) + L(" за число; разом ", " for the number; total ") + bitsTxt(r.bits)] : []), note: L("Великі літери й роздільник не додають ентропії: їх зафіксовано.", "Capital letters and the separator add no entropy: they are fixed.") },
        { t: L("Час підбору", "Guessing time"), l: [L("у середньому 2^(", "on average 2^(") + P.num1(r.bits, 1) + L(" − 1) / швидкість спроб", " − 1) / guesses per second")] }
      ];
      return { ok: true, expr: wordsW(w) + (s.num ? " + " + L("число", "number") : ""), head: [L("сила фрази", "phrase strength"), st.name], headSub: bitsTxt(r.bits) + L(" ентропії", " of entropy"), subRaw: true, afterHead: afterHead(esc, r.list, { secret: true, level: st.i }), tiles: strengthTiles(r.bits, 0).slice(0, 1).concat([{ k: L("Слів у списку", "Words in the list"), v: String(r.size) }, { k: L("Підбір на швидкому ПК", "Guessing on a fast PC"), v: P.fmtTime(P.seconds(r.bits, 1e10)) }]), extraHtml: '<div class="ph__sub">' + L("Скільки часу піде на підбір", "How long guessing takes") + "</div>" + scenTable(r.bits) + box(esc, DISC) + box(esc, PRIV), steps, note: "", copyText: r.list.join("\n"), resText: "" };
    },
    reset(h) { S.ph = Object.assign({}, DEF.ph); paint("ph", h.el, bodyOf(h, "ppWords")); },
    fill(h) { S.ph = Object.assign({}, DEF.ph, { words: "7", cap: true, num: true }); paint("ph", h.el, bodyOf(h, "ppWords")); },
    share() {}, apply() {}
  };

  // ====================== PIN ======================
  const pin = {
    key: "pin", type: "custom", req: () => [], nameUk: "PIN-код", nameEn: "PIN",
    build(body, x, h) {
      const { el } = h, s = S.pin;
      body.innerHTML = '<div class="ph__vars">' + fld("pnLen", L("Кількість цифр (4–12)", "Number of digits (4–12)"), inp("pnLen", "4", 2)) + fld("pnCnt", L("Скільки PIN (1–10)", "How many (1–10)"), inp("pnCnt", "1", 2)) + "</div>" +
        togGrp(L("Додатково", "More"), [["filter", L("Без очевидних: 111, 123, 321 поспіль", "No obvious ones: 111, 123, 321 in a row")]], s) +
        hint(L("PIN має мало варіантів, тому його захищає не складність, а ліміт спроб: банкомат чи телефон блокуються після кількох помилок. Не використовуйте дати народження й той самий PIN для різних карток.", "A PIN has few possibilities, so it is protected not by complexity but by a limit on attempts: an ATM or a phone locks after a few mistakes. Do not use birth dates or the same PIN for different cards."));
      paint("pin", el, body); wire("pin", body, h, ["pnLen", "pnCnt"]); resultHandlers(h);
    },
    calc(h) {
      const { el, esc } = h; readS("pin", el); const s = S.pin;
      const len = num(s.len, 4, 12); if (len === null) return { ok: false, msg: L("Кількість цифр: ціле число від 4 до 12.", "Number of digits: a whole number from 4 to 12.") };
      const cnt = num(s.count, 1, 10); if (cnt === null) return { ok: false, msg: L("Кількість PIN: від 1 до 10.", "Number of PINs: from 1 to 10.") };
      const r = P.pins({ len, filter: s.filter }, cnt); S.list = r.list;
      const three = Math.min(100, (3 / r.count) * 100), pc = three < 0.01 ? "< 0" + P.DEC + "01 %" : P.num1(three, three < 1 ? 2 : 1) + " %";
      const steps = [
        { t: L("Кількість варіантів", "Number of possibilities"), l: [s.filter ? L("Рахуємо точно, виключаючи три однакові цифри поспіль і три цифри підряд за зростанням чи спаданням: ", "Counted exactly, excluding three equal digits in a row and three consecutive ascending or descending digits: ") + P.grp(r.count) : "10^" + len + " = " + P.grp(r.count)] },
        { t: L("Ентропія", "Entropy"), l: ["log₂(" + P.grp(r.count) + ") = " + bitsTxt(r.bits)], note: L("Фільтр трохи зменшує кількість варіантів, але прибирає найпоширеніші шаблони, які підбирають першими.", "The filter slightly reduces the number of possibilities but removes the most common patterns, which are guessed first.") }
      ];
      return { ok: true, expr: digitsW(len) + (s.filter ? " · " + L("без очевидних", "no obvious ones") : ""), head: [L("можливих PIN", "possible PINs"), P.grp(r.count)], headSub: bitsTxt(r.bits) + L(" ентропії", " of entropy"), subRaw: true, afterHead: afterHead(esc, r.list, { secret: true }), tiles: [{ k: L("Ентропія", "Entropy"), v: bitsTxt(r.bits) }, { k: L("Шанс вгадати за 3 спроби", "Chance to guess in 3 tries"), v: pc }, { k: L("100 спроб на годину", "100 tries an hour"), v: P.fmtTime(P.seconds(r.bits, 100 / 3600)) }], extraHtml: box(esc, L("Оцінка «за 3 спроби» й «100 спроб на годину» стосується пристроїв і банків, що обмежують спроби. Якщо ліміту немає, будь-який PIN підбирається за секунди, тому використовуйте пароль чи фразу.", "The “3 tries” and “100 tries an hour” figures apply to devices and banks that limit attempts. Without a limit any PIN is guessed in seconds, so use a password or a phrase instead.")) + box(esc, PRIV), steps, note: "", copyText: r.list.join("\n"), resText: "" };
    },
    reset(h) { S.pin = Object.assign({}, DEF.pin); paint("pin", h.el, bodyOf(h, "pnLen")); },
    fill(h) { S.pin = Object.assign({}, DEF.pin, { len: "6", count: "3" }); paint("pin", h.el, bodyOf(h, "pnLen")); },
    share() {}, apply() {}
  };

  // ====================== перевірка пароля ======================
  const WARN = {
    short: [L("Менше 8 знаків", "Under 8 characters"), L("такі паролі підбираються дуже швидко навіть без словників.", "such passwords are guessed very fast even without dictionaries.")],
    digits: [L("Лише цифри", "Digits only"), L("простір варіантів дуже малий: додайте літери й довжину.", "the space of possibilities is small: add letters and length.")],
    letters: [L("Лише літери", "Letters only"), L("додайте цифри чи символи або збільште довжину.", "add digits or symbols or make it longer.")],
    common: [L("Схоже на поширений пароль", "Looks like a common password"), L("такі паролі перевіряють першими; змініть його повністю.", "such passwords are tried first; replace it completely.")],
    repeat: [L("Є повтори одного знака", "Repeated characters"), L("ряд однакових знаків майже не додає стійкості.", "a run of identical characters adds almost no strength.")],
    seq: [L("Є послідовність", "A sequence"), L("abc, 123 чи cba вгадуються легко; у консервативній оцінці рахуються за два знаки.", "abc, 123 or cba are easy to guess; the conservative estimate counts each as two characters.")],
    kb: [L("Є рядок клавіатури", "A keyboard row"), L("qwerty, asdf чи йцукен відомі підбірникам; рахуються за два знаки.", "qwerty, asdf or similar rows are known to crackers; counted as two characters.")],
    year: [L("Закінчується роком", "Ends with a year"), L("рік наприкінці — дуже типовий шаблон, який вгадують у перших спробах.", "a year at the end is a very typical pattern guessed in the first tries.")]
  };
  const chk = {
    key: "chk", type: "custom", req: () => ["pcP"], nameUk: "Перевірка", nameEn: "Check",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full" id="pcPW"><label class="ph__label" for="pcP">' + L("Ваш пароль (не надсилається нікуди)", "Your password (never sent anywhere)") + '</label><div class="pw__pwWrap"><input class="ph__input" id="pcP" type="password" autocomplete="off" autocapitalize="off" spellcheck="false" maxlength="256" aria-label="pcP"><button type="button" class="ph__mini" id="pcEye">' + L("Показати", "Show") + "</button></div></div></div>" +
        hint(L("Перевірка рахує ентропію за формулою й шукає типові слабкі шаблони. Вона не порівнює пароль із базами витоків і не бачить слів зі словника, тож гарна оцінка не гарантує безпеки. Не вводьте пароль, який використовуєте сьогодні: достатньо схожого за структурою.", "The check works out entropy by a formula and looks for typical weak patterns. It does not compare the password with leak databases and does not see dictionary words, so a good score does not guarantee safety. Do not enter a password you use today: one of a similar structure is enough."));
      el("pcP").addEventListener("input", h.maybeCalc);
      el("pcEye").addEventListener("click", () => { const p = el("pcP"), show = p.type === "password"; p.type = show ? "text" : "password"; el("pcEye").textContent = show ? L("Сховати", "Hide") : L("Показати", "Show"); });
    },
    calc(h) {
      const { el, esc } = h; const p = el("pcP").value; if (!p) return { ok: false, msg: L("Введіть пароль, який хочете перевірити.", "Enter the password you want to check.") };
      const a = P.analyze(p), st = P.strength(a.cons), c = a.classes;
      const nm = []; if (c.lower) nm.push(L("малі латинські (26)", "lowercase (26)")); if (c.upper) nm.push(L("великі латинські (26)", "uppercase (26)")); if (c.digit) nm.push(L("цифри (10)", "digits (10)")); if (c.sym) nm.push(L("символи (33)", "symbols (33)")); if (c.cyr) nm.push(L("кирилиця (66)", "Cyrillic (66)")); if (c.other) nm.push(L("інші знаки (100)", "other characters (100)"));
      const warns = a.warn.map((k) => '<div class="ph__hintbox ph__mt12"><b>' + esc(WARN[k][0]) + ".</b> " + esc(WARN[k][1]) + "</div>").join("");
      const good = a.warn.length ? "" : box(esc, L("Типових слабких шаблонів не знайдено. Це не гарантує сили: словникові слова й особисті дані ця перевірка не бачить.", "No typical weak patterns found. This does not guarantee strength: this check cannot see dictionary words or personal data."), L("Добре.", "Good."));
      const tbl = UI.list([L("Сценарій підбору", "Guessing scenario"), L("За формулою", "By formula"), L("Консервативно", "Conservative")], P.SCEN.map((s) => ({ cells: [{ t: L(s.uk, s.en), cls: "is-first" }, P.fmtTime(P.seconds(a.naive, s.rate)), P.fmtTime(P.seconds(a.cons, s.rate))] })), { w: "minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1fr)" });
      const steps = [
        { t: L("Набір знаків", "Character pool"), l: [nm.join(" + ") + " = " + a.pool] },
        { t: L("Ентропія за формулою", "Entropy by the formula"), l: [a.len + " × log₂(" + a.pool + ") = " + bitsTxt(a.naive)], note: L("Це верхня межа: вона була б правдою, якби знаки обирались випадково.", "This is an upper bound: it would be true if the characters were chosen at random.") },
        { t: L("Консервативна оцінка", "Conservative estimate"), l: [L("ефективна довжина ", "effective length ") + a.eff + " (" + L("повтори, послідовності й рядки клавіатури рахуються як 1–2 знаки", "repeats, sequences and keyboard rows count as 1–2 characters") + "): " + a.eff + " × log₂(" + a.pool + ") = " + bitsTxt(a.cons)], note: a.common ? L("Пароль схожий на поширений, тому оцінку обмежено 14 бітами.", "The password looks like a common one, so the estimate is capped at 14 bits.") : "" }
      ];
      return { ok: true, expr: chars(a.len), head: [L("сила пароля", "password strength"), st.name], headSub: bitsTxt(a.cons) + L(" (консервативно), ", " (conservative), ") + bitsTxt(a.naive) + L(" за формулою", " by the formula"), subRaw: true, afterHead: '<div class="pw__bar">' + meter(st.i) + "</div>", tiles: [{ k: L("Довжина", "Length"), v: String(a.len) }, { k: L("Ефективна довжина", "Effective length"), v: String(a.eff) }, { k: L("Консервативна ентропія", "Conservative entropy"), v: bitsTxt(a.cons) }], extraHtml: warns + good + '<div class="ph__sub">' + L("Скільки часу піде на підбір", "How long guessing takes") + "</div>" + tbl + box(esc, DISC) + box(esc, PRIV), steps, note: "", copyText: L("Сила: ", "Strength: ") + st.name + " (" + bitsTxt(a.cons) + L(" консервативно, ", " conservative, ") + bitsTxt(a.naive) + L(" за формулою)", " by the formula)"), resText: "" };
    },
    reset(h) { h.el("pcP").value = ""; },
    fill(h) { h.el("pcP").value = "Qwerty2024!"; },
    share() {}, apply() {}
  };

  // ====================== логіни ======================
  const DIG_OPTS = [["0", L("Без цифр", "No digits")], ["2", L("2 цифри", "2 digits")], ["3", L("3 цифри", "3 digits")], ["4", L("4 цифри", "4 digits")]];
  const NAME_ERR = { name: L("У полі імені немає літер чи цифр.", "The name field has no letters or digits."), maxlen: L("Жоден варіант не вкладається у максимальну довжину: збільште її або зменште кількість слів чи цифр.", "No option fits the maximum length: raise it or reduce the words or digits.") };
  const lg = {
    key: "lg", type: "custom", req: () => [], nameUk: "Логіни", nameEn: "Usernames",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("plName", L("Ім'я та прізвище (необов'язково)", "First and last name (optional)"), inp("plName", L("Олег Махновець", "Oleh Makhnovets"), 60, "text"), true) +
        fld("plWords", L("Слів у логіні", "Words in the username"), sel("plWords", [["1", L("Одне слово", "One word")], ["2", L("Два слова", "Two words")], ["3", L("Три слова", "Three words")]])) + fld("plSep", L("Роздільник", "Separator"), sel("plSep", [["", L("Без роздільника", "No separator")], [".", L("Крапка (.)", "Period (.)")], ["_", L("Підкреслення (_)", "Underscore (_)")], ["-", L("Дефіс (-)", "Hyphen (-)")]])) +
        fld("plDig", L("Цифри в кінці", "Digits at the end"), sel("plDig", DIG_OPTS)) + fld("plMax", L("Макс. довжина (6–32)", "Max length (6–32)"), inp("plMax", "20", 2)) + fld("plCnt", L("Скільки варіантів (1–20)", "How many (1–20)"), inp("plCnt", "6", 2)) +
        (IS_EN ? "" : fld("plLang", L("Слова для логіна", "Words for the username"), sel("plLang", [["en", L("Англійські слова", "English words")], ["uk", L("Українські слова латиницею", "Ukrainian words in Latin letters")]]), true)) + "</div>" +
        hint(L("Якщо ввести ім'я, логіни складаються з нього: oleh.makhnovets, o.makhnovets, makhnovets_oleh. Кирилиця транслітерується за правилами КМУ 2010. Без імені логіни складаються з випадкових слів, наприклад quiet_river42. Ім'я нікуди не надсилається.", "If you enter a name, the usernames are built from it: oleh.makhnovets, o.makhnovets, makhnovets_oleh. Without a name they are made of random words, for example quiet_river42. The name is not sent anywhere."));
      paint("lg", el, body); wire("lg", body, h, F.lg.map((f) => f[0])); resultHandlers(h);
    },
    calc(h) {
      const { el, esc } = h; readS("lg", el); const s = S.lg;
      const mx = num(s.max, 6, 32); if (mx === null) return { ok: false, msg: L("Максимальна довжина: від 6 до 32.", "Maximum length: from 6 to 32.") };
      const cnt = num(s.count, 1, 20); if (cnt === null) return { ok: false, msg: L("Кількість варіантів: від 1 до 20.", "Number of options: from 1 to 20.") };
      const r = N.logins({ lang: IS_EN ? "en" : s.lang, theme: "all", words: Number(s.words), sep: s.sep, digits: Number(s.digits), max: mx, count: cnt, name: s.name });
      if (r.err) return { ok: false, msg: NAME_ERR[r.err] };
      S.list = r.list; const lens = r.list.map((x) => x.length), byName = !!s.name.trim();
      const steps = [
        { t: L("Як складено", "How it is built"), l: [byName ? L("з ім'я та прізвища: повне ім'я, ініціал і прізвище, прізвище й ім'я у вибраному роздільнику", "from the first and last name: full name, initial and surname, surname and name with the chosen separator") : L("з випадкових слів (", "from random words (") + s.words + L(")", ")") + (Number(s.digits) ? " + " + s.digits + L(" випадкові цифри", " random digits") : "")] },
        { t: L("Кількість варіантів", "Number of options"), l: ["≈ " + P.fmtCount(r.space)], note: r.short ? L("Різних варіантів за такими умовами менше, ніж ви просили: додайте цифри чи слова.", "There are fewer distinct options with these settings than you asked for: add digits or words.") : "" },
        { t: L("Випадковість", "Randomness"), l: [L("Слова й цифри обираються через crypto.getRandomValues без зсуву за модулем.", "Words and digits are picked with crypto.getRandomValues without modulo bias.")] }
      ];
      return { ok: true, expr: (byName ? L("з імені", "from a name") : L("з випадкових слів", "from random words")) + " · " + L("макс. довжина ", "max length ") + mx, head: [L("логінів", "usernames"), String(r.list.length)], headSub: L("можливих варіантів: ≈ ", "possible options: ≈ ") + P.fmtCount(r.space), subRaw: true, afterHead: rowsHtml(esc, r.list, false), tiles: [{ k: L("Довжина", "Length"), v: Math.min(...lens) === Math.max(...lens) ? String(lens[0]) : Math.min(...lens) + "–" + Math.max(...lens) }, { k: L("Варіантів", "Options"), v: "≈ " + P.fmtCount(r.space) }], extraHtml: box(esc, L("Логін — не секрет, але й не пароль: не вставляйте в нього пароль чи особисті дані, яких не хочете показувати. Перевірте, чи логін вільний і чи сервіс дозволяє крапки, підкреслення й дефіси та яка в нього довжина.", "A username is not a secret but not a password either: do not put a password or private data in it. Check whether the username is free and whether the service allows periods, underscores and hyphens and what length it accepts.")), steps, note: "", copyText: r.list.join("\n"), resText: "" };
    },
    reset(h) { S.lg = Object.assign({}, DEF.lg); paint("lg", h.el, bodyOf(h, "plName")); },
    fill(h) { S.lg = Object.assign({}, DEF.lg, { name: L("Олег Махновець", "Oleh Makhnovets"), sep: ".", digits: "0" }); paint("lg", h.el, bodyOf(h, "plName")); },
    share() {}, apply() {}
  };

  // ====================== ніки ======================
  const nk = {
    key: "nk", type: "custom", req: () => [], nameUk: "Ніки", nameEn: "Nicknames",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + (IS_EN ? "" : fld("pkLang", L("Мова слів", "Words"), sel("pkLang", [["uk", "Українські слова"], ["en", "English words"]])) + fld("pkScript", L("Письмо", "Script"), sel("pkScript", [["cyr", "Кирилицею"], ["lat", "Латиницею"]]))) +
        fld("pkTheme", L("Тема", "Theme"), sel("pkTheme", [["all", L("Усі теми", "All themes")], ["animals", L("Тварини", "Animals")], ["nature", L("Природа", "Nature")], ["space", L("Космос", "Space")], ["fantasy", L("Фентезі й міфи", "Fantasy and myths")], ["history", L("Історія", "History")], ["tech", L("Технології", "Technology")]])) +
        fld("pkStruct", L("З чого складається", "Structure"), sel("pkStruct", [["an", L("Прикметник + іменник", "Adjective + noun")], ["n", L("Лише іменник", "Noun only")], ["nn", L("Два іменники", "Two nouns")]])) +
        fld("pkStyle", L("Вигляд", "Style"), sel("pkStyle", [["camel", L("З великих літер разом", "CamelCase together")], ["spaced", L("З пробілами", "With spaces")], ["snake", "snake_case"], ["lower", L("Малими літерами разом", "lowercase together")]])) +
        fld("pkDig", L("Цифри в кінці", "Digits at the end"), sel("pkDig", DIG_OPTS)) + fld("pkMax", L("Макс. довжина (8–30)", "Max length (8–30)"), inp("pkMax", "20", 2)) + fld("pkCnt", L("Скільки варіантів (1–20)", "How many (1–20)"), inp("pkCnt", "8", 2)) + "</div>" +
        hint(L("Нік складається зі слів із наших списків: у прикметника й іменника збігається рід (Швидкий Лис, Тиха Сова). Для латиниці українські слова транслітеруються за правилами КМУ 2010.", "A nickname is made of words from our lists, for example SwiftFox or silent_owl."));
      paint("nk", el, body); wire("nk", body, h, F.nk.map((f) => f[0])); resultHandlers(h);
      const sync = () => { if (!IS_EN && el("pkScriptW")) el("pkScriptW").style.display = el("pkLang").value === "uk" ? "" : "none"; };
      sync(); if (!IS_EN) el("pkLang").addEventListener("change", sync);
    },
    calc(h) {
      const { el, esc } = h; readS("nk", el); const s = S.nk;
      const mx = num(s.max, 8, 30); if (mx === null) return { ok: false, msg: L("Максимальна довжина: від 8 до 30.", "Maximum length: from 8 to 30.") };
      const cnt = num(s.count, 1, 20); if (cnt === null) return { ok: false, msg: L("Кількість варіантів: від 1 до 20.", "Number of options: from 1 to 20.") };
      const lang = IS_EN ? "en" : s.lang, r = N.nicks({ lang, script: s.script, theme: s.theme, struct: s.struct, style: s.style, digits: Number(s.digits), max: mx, count: cnt });
      if (r.err) return { ok: false, msg: NAME_ERR.maxlen };
      S.list = r.list; const lens = r.list.map((x) => x.length);
      const steps = [
        { t: L("Слова", "Words"), l: [L("Слова беруться з власних списків: ", "Words come from our own lists: ") + (lang === "uk" ? N.UA_ADJ.length + " " + L("прикметників і 20 іменників у кожній темі", "adjectives and 20 nouns in each theme") : N.EN_ADJ.length + L(" прикметників і 20 іменників у кожній темі", " adjectives and 20 nouns in each theme"))], note: lang === "uk" ? L("Прикметник узгоджується з родом іменника.", "") : "" },
        { t: L("Кількість варіантів", "Number of options"), l: ["≈ " + P.fmtCount(r.space)], note: r.short ? L("Різних варіантів за такими умовами менше, ніж ви просили: послабте довжину чи додайте цифри.", "There are fewer distinct options with these settings than you asked for: relax the length or add digits.") : "" },
        { t: L("Випадковість", "Randomness"), l: [L("Слова й цифри обираються через crypto.getRandomValues без зсуву за модулем.", "Words and digits are picked with crypto.getRandomValues without modulo bias.")] }
      ];
      return { ok: true, expr: L("макс. довжина ", "max length ") + mx, head: [L("ніків", "nicknames"), String(r.list.length)], headSub: L("можливих варіантів: ≈ ", "possible options: ≈ ") + P.fmtCount(r.space), subRaw: true, afterHead: rowsHtml(esc, r.list, false), tiles: [{ k: L("Довжина", "Length"), v: Math.min(...lens) === Math.max(...lens) ? String(lens[0]) : Math.min(...lens) + "–" + Math.max(...lens) }, { k: L("Варіантів", "Options"), v: "≈ " + P.fmtCount(r.space) }], extraHtml: box(esc, L("Нік — це псевдонім для ігор, форумів і соцмереж. Подібний нік може бути зайнятий: перевірте його на потрібному сервісі й не вказуйте в ніку особисті дані.", "A nickname is an alias for games, forums and social networks. A similar one may be taken: check it on the service you need and do not put personal data in it.")), steps, note: "", copyText: r.list.join("\n"), resText: "" };
    },
    reset(h) { S.nk = Object.assign({}, DEF.nk); paint("nk", h.el, bodyOf(h, "pkTheme")); },
    fill(h) { S.nk = Object.assign({}, DEF.nk, { theme: "animals" }); paint("nk", h.el, bodyOf(h, "pkTheme")); },
    share() {}, apply() {}
  };
  return { modes: [gen, ph, pin, chk, lg, nk], exactNote: false, noShare: true, autoStart: true, onReset() { Object.keys(DEF).forEach((k) => { S[k] = Object.assign({}, DEF[k]); }); S.hide = false; S.list = []; const rb = document.getElementById("result"); if (rb) rb.classList.remove("pw--hide"); } };
});
