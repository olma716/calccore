/* zd-calc.js — знаки зодіаку: західний знак за положенням Сонця (з межею знаків) і китайський знак за китайським Новим роком; таблиця знаків на рік; китайський зодіак за роками */
PhysCalc.start(({ L }) => {
  const A = window.Ag, Z = window.Zd, UI = window.PhysUI;
  const IS_EN = L(false, true);
  const NOTE = L("Астрологія не має наукового підтвердження: це розважальна й культурна традиція, а не прогноз характеру чи долі. Західні знаки рахуються за тропічним зодіаком (від весняного рівнодення), а не за сузір'ями. Час переходу Сонця в знак наближений, з похибкою приблизно ±15 хвилин, і показаний за київським часом та UTC. Китайські роки починаються з китайського Нового року (кінець січня – середина лютого), дати взято з таблиці для 1900–2100 років.", "Astrology has no scientific support: it is an entertainment and cultural tradition, not a forecast of character or fate. Western signs use the tropical zodiac (counted from the March equinox), not the constellations. The time the Sun enters a sign is approximate, within about ±15 minutes, and shown in Kyiv time and UTC. Chinese years begin at Chinese New Year (late January to mid-February); the dates come from a table for the years 1900–2100.");
  const MG = L(["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"], ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
  const dfmt = (y, m, d) => (IS_EN ? MG[m - 1] + " " + d + ", " + y : d + " " + MG[m - 1] + " " + y);
  const dnfmt = (dn) => { const p = A.parts(dn); return dfmt(p.y, p.m, p.d); };
  const SYM = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"];
  const SIGN = L(["Овен", "Телець", "Близнюки", "Рак", "Лев", "Діва", "Терези", "Скорпіон", "Стрілець", "Козеріг", "Водолій", "Риби"], ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo", "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]);
  const ELEM = L(["Вогонь", "Земля", "Повітря", "Вода"], ["Fire", "Earth", "Air", "Water"]), MODAL = L(["кардинальний", "фіксований", "змінний"], ["cardinal", "fixed", "mutable"]);
  const PLN = L(["Марс", "Венера", "Меркурій", "Місяць", "Сонце", "Меркурій", "Венера", "Плутон", "Юпітер", "Сатурн", "Уран", "Нептун"], ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Pluto", "Jupiter", "Saturn", "Uranus", "Neptune"]);
  const PLT = L(["Марс", "Венера", "Меркурій", "Місяць", "Сонце", "Меркурій", "Венера", "Марс", "Юпітер", "Сатурн", "Сатурн", "Юпітер"], ["Mars", "Venus", "Mercury", "Moon", "Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Saturn", "Jupiter"]);
  const rulers = (k) => (PLN[k] === PLT[k] ? PLN[k] : L(PLN[k] + " (сучасна), " + PLT[k] + " (традиційна)", PLN[k] + " (modern), " + PLT[k] + " (traditional)"));
  const ANI = L(["Щур", "Бик", "Тигр", "Кролик", "Дракон", "Змія", "Кінь", "Коза", "Мавпа", "Півень", "Собака", "Свиня"], ["Rat", "Ox", "Tiger", "Rabbit", "Dragon", "Snake", "Horse", "Goat", "Monkey", "Rooster", "Dog", "Pig"]);
  const ANG = ["Щура", "Бика", "Тигра", "Кролика", "Дракона", "Змії", "Коня", "Кози", "Мавпи", "Півня", "Собаки", "Свині"]; // родовий відмінок для заголовків
  const ANE = ["🐀", "🐂", "🐅", "🐇", "🐉", "🐍", "🐎", "🐐", "🐒", "🐓", "🐕", "🐖"];
  const CEL = L(["Дерево", "Вогонь", "Земля", "Метал", "Вода"], ["Wood", "Fire", "Earth", "Metal", "Water"]);
  const ceTxt = (c) => CEL[c.element] + " · " + (c.yang ? L("ян", "yang") : L("інь", "yin"));
  const aniTxt = (c) => ANE[c.animal] + " " + ANI[c.animal];
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const inp = (id, ph) => '<input class="ph__input" id="' + id + '" type="text" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="' + ph + '" aria-label="' + id + '">';
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const warnHtml = (ws) => ws.map((t) => hint("⚠ " + t)).join("");
  const setV = (el, id, v) => { const e = el(id); if (!e) return; e.value = String(v); e.dispatchEvent(new Event("change", { bubbles: true })); };
  const bind = (el, maybeCalc, ids) => ids.forEach((id) => { const e = el(id); e.addEventListener("input", maybeCalc); e.addEventListener("change", maybeCalc); e.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); maybeCalc(); } }); });
  const readYear = (el, id, name) => { const s = el(id).value.trim(); if (s === "") return { incomplete: true }; const y = /^\d{1,4}$/.test(s) ? Number(s) : null; return y === null || y < 1900 || y > 2100 ? { err: L(name + " — ціле число від 1900 до 2100.", name + " must be a whole number from 1900 to 2100.") } : { y }; };
  // час переходу: за київським часом (UA) і UTC, округлено до 5 хвилин
  const p2 = (n) => String(n).padStart(2, "0"), r5 = (t) => Math.round(t / 300000) * 300000;
  const tm = (t) => { const k = Z.kyivWall(r5(t)), u = new Date(r5(t)); return { kyiv: p2(k.h) + ":" + p2(k.mi), utc: p2(u.getUTCHours()) + ":" + p2(u.getUTCMinutes()), date: dfmt(k.y, k.m, k.d), udate: dfmt(u.getUTCFullYear(), u.getUTCMonth() + 1, u.getUTCDate()) }; };
  const when = (t) => { const x = tm(t); return IS_EN ? x.udate + ", ≈ " + x.utc + " UTC" : x.date + ", ≈ " + x.kyiv + " (Київ), ≈ " + x.utc + " UTC"; };
  const whenShort = (t) => { const x = tm(t); return IS_EN ? x.udate + " ≈ " + x.utc + " UTC" : x.date + " ≈ " + x.kyiv; };
  const today = () => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }; };

  // ====================== мій знак ======================
  const me = {
    key: "me", type: "custom", req: () => ["zdB"], nameUk: "Мій знак", nameEn: "My sign",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("zdB", L("Дата народження", "Date of birth"), '<input class="ph__input" type="date" id="zdB" min="1900-01-01" max="2100-12-31" aria-label="zdB">', true) + "</div>" + hint(L("Показує західний знак (за положенням Сонця) і китайський (за китайським Новим роком). Якщо народилися в січні чи лютому, китайський знак може бути попереднього року. Роки від 1900 до 2100.", "Shows the Western sign (by the position of the Sun) and the Chinese one (by Chinese New Year). If you were born in January or February, the Chinese sign may belong to the previous year. Years from 1900 to 2100."));
      bind(el, maybeCalc, ["zdB"]);
    },
    calc(h) {
      const { el } = h, s = el("zdB").value.trim();
      if (!s) return { ok: false, incomplete: true };
      const dn = A.parseISO(s), p = dn === null ? null : A.parts(dn);
      if (!p || p.y < 1900 || p.y > 2100) return { ok: false, msg: L("Дата — коректна дата від 1900 до 2100 року.", "The date must be a valid date from 1900 to 2100.") };
      const sg = Z.signOnDate(p.y, p.m, p.d), k = sg.k, ly = Z.lunarYear(dn), ce = Z.chinese(ly), per = Z.signPeriods(p.y), row = per[k], cnyY = Z.cnyDate(p.y), beforeCny = ly < p.y, rng = Z.lunarRange(ly);
      // дати знака: період, у який потрапив знак (для Козерога до січня береться період попереднього року)
      let st = row.start, en = row.end; if (k === 9 && p.m <= 6) { const prev = Z.signPeriods(p.y - 1)[9]; st = prev.start; en = prev.end; }
      const stK = Z.kyivWall(r5(st)), enK = Z.kyivWall(r5(en)), range = dfmt(stK.y, stK.m, stK.d) + " – " + dfmt(enK.y, enK.m, enK.d);
      const warns = [];
      if (sg.cusp) warns.push(L("Ви народилися в день, коли Сонце перейшло з «" + SIGN[sg.cusp.from] + "» у «" + SIGN[sg.cusp.to] + "»: це сталося " + when(sg.cusp.at) + ". Народжені до цього моменту — " + SIGN[sg.cusp.from] + ", після — " + SIGN[sg.cusp.to] + ". Показано знак за київським полуднем. Точний знак залежить від часу й місця народження.", "You were born on the day the Sun moved from " + SIGN[sg.cusp.from] + " to " + SIGN[sg.cusp.to] + ": it happened " + when(sg.cusp.at) + ". Those born before that moment are " + SIGN[sg.cusp.from] + ", after it " + SIGN[sg.cusp.to] + ". The sign is shown for Kyiv noon. The exact sign depends on the time and place of birth."));
      if (beforeCny) { const pa = Z.chinese(p.y); warns.push(L("Ви народилися до китайського Нового року (" + dfmt(cnyY.y, cnyY.m, cnyY.d) + "), тому за китайським календарем це ще рік " + ly + " (" + ANI[ce.animal] + "), а не " + p.y + " (" + ANI[pa.animal] + ").", "You were born before Chinese New Year (" + dfmt(cnyY.y, cnyY.m, cnyY.d) + "), so in the Chinese calendar it is still the year " + ly + " (" + ANI[ce.animal] + "), not " + p.y + " (" + ANI[pa.animal] + ").")); }
      const lon = Z.sunLon(window.Ct.instant(p.y, p.m, p.d, 12 * 3600, "Europe/Kyiv")), lonTxt = lon.toFixed(1).replace(".", IS_EN ? "." : ",");
      const tiles = [{ k: L("Стихія", "Element"), v: ELEM[k % 4] }, { k: L("Якість", "Quality"), v: MODAL[k % 3] }, { k: L("Планета-покровитель", "Ruling planet"), v: rulers(k) }, { k: L("Дати знака в цьому році", "Dates of the sign this year"), v: range }, { k: L("Китайський знак", "Chinese sign"), v: aniTxt(ce) }, { k: L("Стихія й полярність", "Element and polarity"), v: ceTxt(ce) }, { k: L("Рік тварини", "Year of the animal"), v: (rng.start === null ? L("до ", "until ") : dnfmt(rng.start) + " – ") + (rng.end === null ? "…" : dnfmt(rng.end)) }, { k: L("Китайський Новий рік " + p.y, "Chinese New Year " + p.y), v: dfmt(cnyY.y, cnyY.m, cnyY.d) }];
      const ST = ((ly - 4) % 10 + 10) % 10, AN = ((ly - 4) % 12 + 12) % 12;
      const steps = [{ t: L("Положення Сонця на " + dfmt(p.y, p.m, p.d), "The Sun on " + dfmt(p.y, p.m, p.d)), l: [L("київський полудень: довгота Сонця ≈ ", "Kyiv noon: the Sun's longitude ≈ ") + lonTxt + "°", Math.floor(lon / 30) === k ? L("знак = ціла частина (довгота / 30) = ", "sign = integer part of (longitude / 30) = ") + k + " → " + SIGN[k] : "→ " + SIGN[k]], note: L("Знаки відліковуються від весняного рівнодення (0° — Овен), по 30° на знак.", "Signs are counted from the March equinox (0° is Aries), 30° per sign.") }, { t: L("Китайський календар", "The Chinese calendar"), l: [L("Новий рік " + p.y + ": " + dfmt(cnyY.y, cnyY.m, cnyY.d) + " → ваша дата " + (beforeCny ? "раніше" : "не раніше") + ", рік " + ly, "New Year " + p.y + ": " + dfmt(cnyY.y, cnyY.m, cnyY.d) + " → your date is " + (beforeCny ? "earlier" : "not earlier") + ", the year is " + ly)] }, { t: L("Тварина й стихія", "Animal and element"), l: ["(" + ly + " − 4) mod 12 = " + AN + " → " + ANI[AN], "(" + ly + " − 4) mod 10 = " + ST + " → " + CEL[Math.floor(ST / 2)] + ", " + (ST % 2 === 0 ? L("ян", "yang") : L("інь", "yin"))] }];
      const headCh = L("Китайський знак: ", "Chinese sign: ") + aniTxt(ce) + " (" + ceTxt(ce) + ")";
      return { ok: true, expr: dfmt(p.y, p.m, p.d), head: [L("західний знак", "Western sign"), SYM[k] + " " + SIGN[k]], subRaw: true, headSub: headCh, tiles, extraHtml: warnHtml(warns), note: NOTE, steps, resText: dfmt(p.y, p.m, p.d) + ": " + SIGN[k] + ", " + aniTxt(ce) + " (" + ceTxt(ce) + ")" };
    },
    reset(h) { setV(h.el, "zdB", ""); },
    fill(h) { setV(h.el, "zdB", "2026-02-10"); },
    share(p, h) { const v = h.el("zdB").value; if (v) p.set("zb", v); },
    apply(qs, h) { if (qs.has("zb") && A.parseISO(qs.get("zb")) !== null) setV(h.el, "zdB", qs.get("zb")); }
  };

  // ====================== знаки за датами ======================
  const tbl = {
    key: "tbl", type: "custom", req: () => ["zdY"], nameUk: "Знаки за датами", nameEn: "Signs by dates",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("zdY", L("Рік", "Year"), inp("zdY", String(today().y)), true) + "</div>" + hint(L("Показує, коли Сонце входить у кожен знак у вибраному році. Дати щороку зсуваються на добу, тому однієї таблиці на всі роки недостатньо. Роки від 1900 до 2100.", "Shows when the Sun enters each sign in the chosen year. The dates shift by a day every year, so one table cannot suit all years. Years from 1900 to 2100."));
      setV(el, "zdY", today().y); bind(el, maybeCalc, ["zdY"]);
    },
    calc(h) {
      const { el } = h, y = readYear(el, "zdY", L("Рік", "The year"));
      if (y.incomplete) return { ok: false, incomplete: true };
      if (y.err) return { ok: false, msg: y.err };
      const per = Z.signPeriods(y.y);
      const rows = per.map((r) => ({ cells: [{ t: SYM[r.k] + " " + SIGN[r.k], cls: "is-first" }, whenShort(r.start), whenShort(r.end), ELEM[r.k % 4] + ", " + MODAL[r.k % 3]] }));
      const card = [[0, L("Весняне рівнодення", "March equinox")], [3, L("Літнє сонцестояння", "June solstice")], [6, L("Осіннє рівнодення", "September equinox")], [9, L("Зимове сонцестояння", "December solstice")]];
      const tiles = card.map(([k, name]) => ({ k: name + " · " + SIGN[k], v: whenShort(per[k].start) }));
      const steps = [{ t: L("Довгота Сонця", "The Sun's longitude"), l: [L("Знак змінюється, коли довгота Сонця кратна 30°: 0° — Овен, 30° — Телець, … 330° — Риби.", "The sign changes when the Sun's longitude is a multiple of 30°: 0° is Aries, 30° Taurus, … 330° Pisces.")] }, { t: L("Моменти переходу", "Moments of entry"), l: [L("Для кожного знака шукаємо момент, коли довгота досягає потрібного значення (методом поділу навпіл).", "For each sign we find the moment the longitude reaches the required value (by bisection).")], note: L("Час наближений, похибка приблизно ±15 хвилин.", "The time is approximate, with an error of about ±15 minutes.") }];
      return { ok: true, expr: L("Знаки зодіаку у " + y.y + " році", "Zodiac signs in " + y.y), head: [L("Сонце входить в Овен", "The Sun enters Aries"), whenShort(per[0].start)], subRaw: true, headSub: L("весняне рівнодення " + y.y + " року", "the March equinox of " + y.y), tiles, extraHtml: '<div class="ph__sub">' + L("12 знаків у " + y.y + " році", "The 12 signs in " + y.y) + "</div>" + UI.list([L("Знак", "Sign"), L("Починається", "Starts"), L("Закінчується", "Ends"), L("Стихія й якість", "Element and quality")], rows, { w: "minmax(0, 1.2fr) minmax(0, 1.4fr) minmax(0, 1.4fr) minmax(0, 1.4fr)" }), note: NOTE, steps, resText: L("Овен у ", "Aries in ") + y.y + ": " + whenShort(per[0].start) };
    },
    reset(h) { setV(h.el, "zdY", today().y); },
    fill(h) { setV(h.el, "zdY", 2026); },
    share(p, h) { const v = h.el("zdY").value.trim(); if (v) p.set("zy", v); },
    apply(qs, h) { if (/^\d{4}$/.test(qs.get("zy") || "")) setV(h.el, "zdY", qs.get("zy")); }
  };

  // ====================== китайський зодіак за роками ======================
  const cn = {
    key: "cn", type: "custom", req: () => ["zdA", "zdZ"], nameUk: "Китайський зодіак за роками", nameEn: "Chinese zodiac by years",
    build(body, x, h) {
      const { el, maybeCalc } = h, t = today();
      body.innerHTML = '<div class="ph__vars">' + fld("zdA", L("З року", "From year"), inp("zdA", String(t.y - 11))) + fld("zdZ", L("До року", "To year"), inp("zdZ", String(t.y))) + fld("zdC", L("Тварина", "Animal"), sel("zdC", [["", L("Усі тварини", "All animals")]].concat(ANI.map((a, i) => [i, ANE[i] + " " + a])), ""), true) + "</div>" + hint(L("Діапазон до 100 років у межах 1900–2100. Виберіть тварину, щоб побачити лише її роки. Роки рахуються від китайського Нового року, а не від 1 січня.", "A range of up to 100 years within 1900–2100. Choose an animal to see only its years. Years count from Chinese New Year, not from January 1."));
      setV(el, "zdA", t.y - 11); setV(el, "zdZ", t.y); bind(el, maybeCalc, ["zdA", "zdZ", "zdC"]);
    },
    calc(h) {
      const { el } = h, a = readYear(el, "zdA", L("Початковий рік", "The first year")), b = readYear(el, "zdZ", L("Кінцевий рік", "The last year"));
      if (a.incomplete || b.incomplete) return { ok: false, incomplete: true };
      if (a.err) return { ok: false, msg: a.err };
      if (b.err) return { ok: false, msg: b.err };
      if (a.y > b.y) return { ok: false, msg: L("Початковий рік має бути не пізніше за кінцевий.", "The first year must not be later than the last.") };
      if (b.y - a.y > 99) return { ok: false, msg: L("Діапазон — не більше 100 років.", "The range is up to 100 years.") };
      const f = el("zdC").value, ys = []; for (let y = a.y; y <= b.y; y++) { const c = Z.chinese(y); if (f === "" || c.animal === Number(f)) ys.push({ y, c, r: Z.lunarRange(y) }); }
      if (!ys.length) return { ok: false, msg: L("У цьому діапазоні немає років цієї тварини.", "No year of this animal falls in this range.") };
      const rows = ys.map((r) => ({ cells: [{ t: String(r.y), cls: "is-first" }, aniTxt(r.c), ceTxt(r.c), dnfmt(r.r.start) + " – " + (r.r.end === null ? "…" : dnfmt(r.r.end))] }));
      const byEl = [0, 0, 0, 0, 0]; ys.forEach((r) => byEl[r.c.element]++);
      const tiles = [{ k: L("Років у списку", "Years listed"), v: String(ys.length) }, { k: L("Діапазон", "Range"), v: a.y + "–" + b.y }]; if (f !== "") tiles.push({ k: L("Цикл", "Cycle"), v: L("кожні 12 років", "every 12 years") });
      const steps = [{ t: L("Початок року тварини", "The start of the animal's year"), l: [L("Рік тварини починається з китайського Нового року, а не з 1 січня.", "The animal's year starts at Chinese New Year, not on January 1.")] }, { t: L("Тварина й стихія", "Animal and element"), l: [L("тварина = (рік − 4) mod 12, стихія за (рік − 4) mod 10: парне — ян, непарне — інь", "animal = (year − 4) mod 12, element from (year − 4) mod 10: even is yang, odd is yin")], note: L("Приклад: 2026 → (2026 − 4) mod 12 = 6 → Кінь; (2026 − 4) mod 10 = 2 → Вогонь, ян.", "Example: 2026 → (2026 − 4) mod 12 = 6 → Horse; (2026 − 4) mod 10 = 2 → Fire, yang.") }];
      return { ok: true, expr: L("Китайський зодіак, ", "Chinese zodiac, ") + a.y + "–" + b.y + (f === "" ? "" : ", " + ANI[Number(f)]), head: [f === "" ? L("років у діапазоні", "years in the range") : L("років " + ANG[Number(f)].toLowerCase(), "years of the " + ANI[Number(f)]), String(ys.length)], subRaw: true, headSub: a.y + "–" + b.y, tiles, extraHtml: '<div class="ph__sub">' + L("Роки", "Years") + "</div>" + UI.list([L("Рік", "Year"), L("Тварина", "Animal"), L("Стихія", "Element"), L("Рік тварини триває", "The year runs")], rows, { w: "80px minmax(0, 1.2fr) minmax(0, 1.2fr) minmax(0, 2fr)" }), note: NOTE, steps, resText: ys.map((r) => r.y + " " + ANI[r.c.animal] + " (" + ceTxt(r.c) + ")").join("; ") };
    },
    reset(h) { const t = today(); setV(h.el, "zdA", t.y - 11); setV(h.el, "zdZ", t.y); setV(h.el, "zdC", ""); },
    fill(h) { setV(h.el, "zdA", 1990); setV(h.el, "zdZ", 2026); setV(h.el, "zdC", 6); },
    share(p, h) { const { el } = h; if (el("zdA").value.trim()) p.set("za", el("zdA").value.trim()); if (el("zdZ").value.trim()) p.set("zt", el("zdZ").value.trim()); p.set("zf", el("zdC").value); },
    apply(qs, h) { const { el } = h; if (/^\d{4}$/.test(qs.get("za") || "")) setV(el, "zdA", qs.get("za")); if (/^\d{4}$/.test(qs.get("zt") || "")) setV(el, "zdZ", qs.get("zt")); if (/^(\d|1[01])?$/.test(qs.get("zf") || "")) setV(el, "zdC", qs.get("zf") || ""); }
  };
  return { modes: [me, tbl, cn], exactNote: false };
});
