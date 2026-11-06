/* dw-calc.js — день тижня для дати (григоріанський і юліанський календарі), та сама дата в різні роки, пошук N-го дня тижня місяця й п'ятниць 13-го */
PhysCalc.start(({ L }) => {
  const C = window.Chr, D = window.Dw, UI = window.PhysUI;
  const IS_EN = L(false, true);
  const grp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const NOTE = L("Розрахунок через юліанський день: для дат до 1582 року результат за григоріанським календарем умовний (проліптичний), а календар у різних країнах змінювали в різні роки. Дні тижня між календарями безперервні: четвер 4 жовтня 1582 року за юліанським календарем, наступний день, 15 жовтня, п'ятниця за григоріанським. Вихідними вважаються субота й неділя, без державних свят.", "The calculation uses the Julian day number: for dates before 1582 the Gregorian result is nominal (proleptic), and countries changed calendars in different years. Weekdays are continuous across calendars: Thursday October 4, 1582 in the Julian calendar, then Friday October 15 in the Gregorian one. Saturday and Sunday count as weekends, with no public holidays.");
  const DAYN = IS_EN ? C.DAYS_EN : C.DAYS.map((x) => x.charAt(0).toUpperCase() + x.slice(1));
  const DAYL = IS_EN ? C.DAYS_EN : C.DAYS; // англійські назви днів тижня пишуться з великої літери
  const MG = IS_EN ? C.MONTHS_EN : C.MONTHS, MN = IS_EN ? C.MONTHS_EN : C.MONTHS_N;
  const FEM = [true, false, false, true, false, true, true]; // неділя, понеділок, вівторок, середа, четвер, п'ятниця, субота
  const PLW = [["неділя", "неділі", "неділь"], ["понеділок", "понеділки", "понеділків"], ["вівторок", "вівторки", "вівторків"], ["середа", "середи", "серед"], ["четвер", "четверги", "четвергів"], ["п'ятниця", "п'ятниці", "п'ятниць"], ["субота", "суботи", "субот"]];
  const pl = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b >= 2 && b <= 4 ? f[1] : f[2]; };
  const wdPlural = (n, wd) => (IS_EN ? DAYL[wd] + (n === 1 ? "" : "s") : pl(n, PLW[wd]));
  const ORD_M = ["перший", "другий", "третій", "четвертий", "п'ятий"], ORD_F = ["перша", "друга", "третя", "четверта", "п'ята"], ORD_EN = ["first", "second", "third", "fourth", "fifth"];
  const ordText = (n, wd) => (n === "last" ? L(FEM[wd] ? "остання" : "останній", "last") : IS_EN ? ORD_EN[n - 1] : (FEM[wd] ? ORD_F : ORD_M)[n - 1]);
  const dfmt = (y, m, d) => (IS_EN ? MG[m - 1] + " " + d + ", " + y : d + " " + MG[m - 1] + " " + y);
  const isWe = (wd) => wd === 0 || wd === 6;
  const typeTxt = (wd) => (isWe(wd) ? L("вихідний", "weekend") : L("робочий день", "working day"));
  const calName = (c) => (c === "j" ? L("юліанський", "Julian") : L("григоріанський", "Gregorian"));
  const rel = (n) => (n === 0 ? L("сьогодні", "today") : n > 0 ? L("через " + grp(n) + " " + pl(n, ["день", "дні", "днів"]), "in " + grp(n) + (n === 1 ? " day" : " days")) : L(grp(-n) + " " + pl(-n, ["день", "дні", "днів"]) + " тому", grp(-n) + (n === -1 ? " day ago" : " days ago")));
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const inp = (id, ph, ml) => '<input class="ph__input" id="' + id + '" type="text" inputmode="numeric" autocomplete="off" maxlength="' + ml + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const monthOpts = () => MN.map((m, i) => [i + 1, m]);
  const calOpts = () => [["g", L("Григоріанський (сучасний)", "Gregorian (modern)")], ["j", L("Юліанський (старий стиль)", "Julian (old style)")]];
  const wdOpts = () => [1, 2, 3, 4, 5, 6, 0].map((w) => [w, DAYN[w]]);
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const warnHtml = (ws) => ws.map((t) => hint("⚠ " + t)).join("");
  const chipsHtml = (id, chips) => '<div class="ph__chips ph__mt12" id="' + id + '">' + chips.map(([k, t]) => '<button type="button" class="ph__mini" data-k="' + k + '">' + t + "</button>").join("") + "</div>";
  const fold = (key, title, inner) => '<details class="ph__details ph__fold" data-keep="' + key + '"><summary>' + title + '</summary><div class="ph__foldBody">' + inner + "</div></details>";
  const tdy = () => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }; };
  const intOf = (s) => (/^\d{1,4}$/.test(String(s).trim()) ? Number(String(s).trim()) : null);
  const setVal = (el, id, v) => { const e = el(id); if (e) e.value = String(v); };
  const bind = (el, maybeCalc, ids) => ids.forEach((id) => { const e = el(id); e.addEventListener("input", maybeCalc); e.addEventListener("change", maybeCalc); e.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); maybeCalc(); } }); });
  const readYear = (el, id, name) => { const s = el(id).value.trim(); if (s === "") return { incomplete: true }; const y = intOf(s); return y === null || y < 1 ? { err: L(name + " — ціле число від 1 до 9999.", name + " must be a whole number from 1 to 9999.") } : { y }; };

  // ====================== день тижня ======================
  const dw = {
    key: "dw", type: "custom", req: () => ["dwD", "dwY"], nameUk: "День тижня", nameEn: "Day of the week",
    build(body, x, h) {
      const { el, maybeCalc } = h, t = tdy();
      body.innerHTML = '<div class="ph__vars">' + fld("dwC", L("Календар", "Calendar"), sel("dwC", calOpts(), "g"), true) + fld("dwD", L("День", "Day"), inp("dwD", "15", 2)) + fld("dwM", L("Місяць", "Month"), sel("dwM", monthOpts(), t.m)) + fld("dwY", L("Рік", "Year"), inp("dwY", "2026", 4), true) + "</div>" + chipsHtml("dwChips", [["today", L("Сьогодні", "Today")], ["tomorrow", L("Завтра", "Tomorrow")], ["yesterday", L("Вчора", "Yesterday")]]) + hint(L("За замовчуванням стоїть сьогоднішня дата. Для історичних дат виберіть юліанський календар: рік від 1 до 9999.", "Today's date is filled in by default. For historical dates choose the Julian calendar: the year is from 1 to 9999."));
      const setDate = (y, m, d) => { setVal(el, "dwC", "g"); setVal(el, "dwD", d); setVal(el, "dwM", m); setVal(el, "dwY", y); };
      setDate(t.y, t.m, t.d); bind(el, maybeCalc, ["dwC", "dwD", "dwM", "dwY"]);
      el("dwChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; const n = { today: 0, tomorrow: 1, yesterday: -1 }[b.dataset.k], g = C.fromJdn("g", D.todayJ() + n); setDate(g.y, g.m, g.d); h.calc(true); });
    },
    calc(h) {
      const { el } = h, cal = el("dwC").value, m = Number(el("dwM").value), y = readYear(el, "dwY", L("Рік", "The year"));
      if (el("dwD").value.trim() === "" || y.incomplete) return { ok: false, incomplete: true };
      const d = intOf(el("dwD").value);
      if (y.err) return { ok: false, msg: y.err };
      if (d === null || d < 1) return { ok: false, msg: L("День — ціле число від 1 до 31.", "The day must be a whole number from 1 to 31.") };
      if (!C.validDate(cal, y.y, m, d)) return { ok: false, msg: L("Такої дати не існує: у цьому місяці ", "There is no such date: this month has ") + C.dim(cal, y.y, m) + L(" днів (" + calName(cal) + " календар).", " days (" + calName(cal) + " calendar).") };
      const J = C.jdn(cal, y.y, m, d), wd = C.weekday(J), delta = J - D.todayJ(), other = cal === "j" ? "g" : "j", o = C.fromJdn(other, J), doy = D.dayOfYear(cal, y.y, m, d), len = D.yearLen(cal, y.y), leap = len === 366;
      const warns = [];
      if (cal === "g" && J < C.jdn("g", 1582, 10, 15)) warns.push(L("Це дата до введення григоріанського календаря (15 жовтня 1582): результат умовний, у ті часи діяв юліанський календар.", "This date is before the Gregorian calendar was introduced (October 15, 1582): the result is nominal, the Julian calendar was in use then."));
      if (cal === "g" && y.y === 1582 && m === 10 && d >= 5 && d <= 14) warns.push(L("У країнах, що перейшли на григоріанський календар у 1582 році, дат 5–14 жовтня 1582 не було.", "In the countries that switched to the Gregorian calendar in 1582 the dates October 5–14, 1582 did not exist."));
      const tiles = [{ k: L("Від сьогодні", "From today"), v: rel(delta) }, { k: L("День року", "Day of the year"), v: L(doy + "-й з " + len, "day " + doy + " of " + len) }];
      if (cal === "g") { const w = D.isoWeek(y.y, m, d); tiles.push({ k: L("Тиждень року (ISO)", "Week of the year (ISO)"), v: L("тиждень " + w.week + ", " + w.year, "week " + w.week + ", " + w.year) }); }
      tiles.push({ k: L("Квартал", "Quarter"), v: L(D.quarter(m) + " квартал", "Q" + D.quarter(m)) }, { k: L("Рік", "Year"), v: leap ? L("високосний", "leap") : L("невисокосний", "common") }, { k: L("Тип дня", "Type of day"), v: typeTxt(wd) }, { k: cal === "j" ? L("Григоріанський календар", "Gregorian calendar") : L("Юліанський календар", "Julian calendar"), v: dfmt(o.y, o.m, o.d) });
      const steps = [{ t: L("Юліанський день (JDN)", "Julian day number (JDN)"), l: [dfmt(y.y, m, d) + " (" + calName(cal) + ") → JDN " + grp(J)] }, { t: L("День тижня з JDN", "Weekday from the JDN"), l: ["(" + grp(J) + " + 1) mod 7 = " + (((J + 1) % 7) + 7) % 7, L("0 — неділя, 1 — понеділок, … 6 — субота", "0 is Sunday, 1 is Monday, … 6 is Saturday")], note: L("Тому " + dfmt(y.y, m, d) + " — " + DAYL[wd] + ".", dfmt(y.y, m, d) + " is a " + DAYL[wd] + ".") }, { t: L("Те саме число в іншому календарі", "The same day in the other calendar"), l: [dfmt(o.y, o.m, o.d) + " (" + calName(other) + ")"] }];
      return { ok: true, expr: dfmt(y.y, m, d) + (cal === "j" ? L(" (юліанський)", " (Julian)") : ""), head: [L("день тижня", "day of the week"), DAYN[wd]], subRaw: true, headSub: typeTxt(wd) + " · " + rel(delta), tiles, extraHtml: warnHtml(warns), note: NOTE, steps, resText: dfmt(y.y, m, d) + (cal === "j" ? L(" (юліанський)", " (Julian)") : "") + " — " + DAYL[wd] };
    },
    reset(h) { const { el } = h, t = tdy(); setVal(el, "dwC", "g"); setVal(el, "dwD", t.d); setVal(el, "dwM", t.m); setVal(el, "dwY", t.y); },
    fill(h) { const { el } = h; setVal(el, "dwC", "g"); setVal(el, "dwD", 20); setVal(el, "dwM", 7); setVal(el, "dwY", 1969); },
    share(p, h) { const { el } = h; p.set("wc", el("dwC").value); if (el("dwD").value.trim()) p.set("wd", el("dwD").value.trim()); p.set("wm", el("dwM").value); if (el("dwY").value.trim()) p.set("wy", el("dwY").value.trim()); },
    apply(qs, h) { const { el } = h; if (["g", "j"].includes(qs.get("wc"))) setVal(el, "dwC", qs.get("wc")); if (/^\d{1,2}$/.test(qs.get("wd") || "")) setVal(el, "dwD", qs.get("wd")); if (/^([1-9]|1[0-2])$/.test(qs.get("wm") || "")) setVal(el, "dwM", qs.get("wm")); if (/^\d{1,4}$/.test(qs.get("wy") || "")) setVal(el, "dwY", qs.get("wy")); }
  };

  // ====================== та сама дата в різні роки ======================
  const yrs = {
    key: "yrs", type: "custom", req: () => ["dwD"], nameUk: "Та сама дата в різні роки", nameEn: "The same date in different years",
    build(body, x, h) {
      const { el, maybeCalc } = h, t = tdy();
      body.innerHTML = '<div class="ph__vars">' + fld("dwC", L("Календар", "Calendar"), sel("dwC", calOpts(), "g"), true) + fld("dwD", L("День", "Day"), inp("dwD", "15", 2)) + fld("dwM", L("Місяць", "Month"), sel("dwM", monthOpts(), t.m)) + fld("dwA", L("З року", "From year"), inp("dwA", "2026", 4)) + fld("dwB", L("До року", "To year"), inp("dwB", "2035", 4)) + "</div>" + hint(L("Діапазон до 100 років. Зручно для днів народження, свят і річниць: видно, на які дні тижня вони припадатимуть. 29 лютого буває лише у високосні роки.", "The range is up to 100 years. Handy for birthdays, holidays and anniversaries: you see which weekdays they fall on. February 29 exists only in leap years."));
      setVal(el, "dwD", t.d); setVal(el, "dwA", t.y); setVal(el, "dwB", t.y + 9); bind(el, maybeCalc, ["dwC", "dwD", "dwM", "dwA", "dwB"]);
    },
    calc(h) {
      const { el } = h, cal = el("dwC").value, m = Number(el("dwM").value), a = readYear(el, "dwA", L("Початковий рік", "The first year")), b = readYear(el, "dwB", L("Кінцевий рік", "The last year"));
      if (el("dwD").value.trim() === "" || a.incomplete || b.incomplete) return { ok: false, incomplete: true };
      if (a.err) return { ok: false, msg: a.err };
      if (b.err) return { ok: false, msg: b.err };
      const d = intOf(el("dwD").value);
      if (d === null || d < 1 || d > 31 || d > (m === 2 ? 29 : C.dim("g", 2001, m))) return { ok: false, msg: L("У цьому місяці немає такого числа (найбільше " + (m === 2 ? 29 : C.dim("g", 2001, m)) + ").", "There is no such day in this month (the maximum is " + (m === 2 ? 29 : C.dim("g", 2001, m)) + ").") };
      if (a.y > b.y) return { ok: false, msg: L("Початковий рік має бути не пізніше за кінцевий.", "The first year must not be later than the last.") };
      if (b.y > 9999 || b.y - a.y > 99) return { ok: false, msg: L("Діапазон — не більше 100 років (до 9999 року).", "The range is up to 100 years (up to the year 9999).") };
      const list = D.sameDateYears(cal, d, m, a.y, b.y), have = list.filter((r) => r.wd !== null), cnt = [0, 0, 0, 0, 0, 0, 0]; have.forEach((r) => cnt[r.wd]++);
      if (!have.length) return { ok: false, msg: L("У цьому діапазоні немає жодного року з такою датою.", "No year in this range has such a date.") };
      const max = Math.max(...cnt), top = [1, 2, 3, 4, 5, 6, 0].filter((w) => cnt[w] === max), we = have.filter((r) => isWe(r.wd)).length, skipped = list.length - have.length;
      const rows = list.map((r) => ({ cells: [{ t: String(r.y), cls: "is-first" }, r.wd === null ? L("такої дати немає", "no such date") : DAYN[r.wd], r.wd === null ? "—" : typeTxt(r.wd)] }));
      const crows = [1, 2, 3, 4, 5, 6, 0].map((w) => ({ cells: [{ t: DAYN[w], cls: "is-first" }, { t: String(cnt[w]), cls: "chip" }, isWe(w) ? L("вихідний", "weekend") : L("робочий день", "working day")] }));
      const tiles = [{ k: L("Років із такою датою", "Years with the date"), v: String(have.length) }, { k: L("Вихідних", "Weekends"), v: String(we) }, { k: L("Робочих днів", "Weekdays"), v: String(have.length - we) }];
      if (skipped) tiles.push({ k: L("Років без такої дати", "Years without the date"), v: String(skipped) });
      const extra = fold("yrsTable", L("День тижня за роками", "Weekday by year"), UI.list([L("Рік", "Year"), L("День тижня", "Weekday"), L("Тип", "Type")], rows, { w: "minmax(0, 1fr) minmax(0, 1.4fr) 140px" })) + fold("yrsCount", L("Скільки разів кожен день тижня", "How many times each weekday"), UI.list([L("День тижня", "Weekday"), L("Разів", "Times"), L("Тип", "Type")], crows, { w: "minmax(0, 1.4fr) 90px 140px" }));
      const steps = [{ t: L("Дата", "The date"), l: [d + " " + MG[m - 1] + " (" + calName(cal) + L(" календар)", " calendar)")] }, { t: L("Роки", "Years"), l: [a.y + "–" + b.y + " (" + list.length + " " + L(pl(list.length, ["рік", "роки", "років"]), list.length === 1 ? "year" : "years") + ")"] }, { t: L("Частіше за все", "Most often"), l: [top.map((w) => DAYL[w]).join(", ") + " — " + max + " " + L("разів", "times") + L(" з " + have.length, " of " + have.length)] }];
      return { ok: true, expr: d + " " + MG[m - 1] + L(", ", ", ") + a.y + "–" + b.y + (cal === "j" ? L(" (юліанський)", " (Julian)") : ""), head: [L("найчастіше це", "most often it is"), top.map((w) => DAYN[w]).join(", ")], subRaw: true, headSub: max + " " + L("разів з", "times of") + " " + have.length, tiles, extraHtml: extra, note: NOTE, steps, resText: d + " " + MG[m - 1] + " " + a.y + "–" + b.y + L(": найчастіше ", ": most often ") + top.map((w) => DAYL[w]).join(", ") + " (" + max + L(" з ", " of ") + have.length + ")" };
    },
    reset(h) { const { el } = h, t = tdy(); setVal(el, "dwC", "g"); setVal(el, "dwD", t.d); setVal(el, "dwM", t.m); setVal(el, "dwA", t.y); setVal(el, "dwB", t.y + 9); },
    fill(h) { const { el } = h; setVal(el, "dwC", "g"); setVal(el, "dwD", 24); setVal(el, "dwM", 8); setVal(el, "dwA", 2026); setVal(el, "dwB", 2035); },
    share(p, h) { const { el } = h; p.set("wc", el("dwC").value); if (el("dwD").value.trim()) p.set("wd", el("dwD").value.trim()); p.set("wm", el("dwM").value); if (el("dwA").value.trim()) p.set("wa", el("dwA").value.trim()); if (el("dwB").value.trim()) p.set("wb", el("dwB").value.trim()); },
    apply(qs, h) { const { el } = h; if (["g", "j"].includes(qs.get("wc"))) setVal(el, "dwC", qs.get("wc")); if (/^\d{1,2}$/.test(qs.get("wd") || "")) setVal(el, "dwD", qs.get("wd")); if (/^([1-9]|1[0-2])$/.test(qs.get("wm") || "")) setVal(el, "dwM", qs.get("wm")); if (/^\d{1,4}$/.test(qs.get("wa") || "")) setVal(el, "dwA", qs.get("wa")); if (/^\d{1,4}$/.test(qs.get("wb") || "")) setVal(el, "dwB", qs.get("wb")); }
  };

  // ====================== знайти дату ======================
  const kindOpts = () => [["nth", L("N-й день тижня місяця (наприклад, третя неділя травня)", "The Nth weekday of a month (for example the third Sunday of May)")], ["all", L("Усі такі дні тижня в місяці", "All such weekdays in a month")], ["f13", L("П'ятниці 13-го за роки", "Friday the 13th over years")]];
  const ordOpts = () => [[1, L("перший / перша", "first")], [2, L("другий / друга", "second")], [3, L("третій / третя", "third")], [4, L("четвертий / четверта", "fourth")], [5, L("п'ятий / п'ята", "fifth")], ["last", L("останній / остання", "last")]];
  const find = {
    key: "find", type: "custom", req: () => ["dwY"], nameUk: "Знайти дату", nameEn: "Find a date",
    build(body, x, h) {
      const { el, maybeCalc } = h, t = tdy();
      body.innerHTML = '<div class="ph__vars">' + fld("dwK", L("Що шукаємо", "What to find"), sel("dwK", kindOpts(), "nth"), true) + fld("dwO", L("Який за рахунком", "Which one"), sel("dwO", ordOpts(), 3)) + fld("dwW", L("День тижня", "Weekday"), sel("dwW", wdOpts(), 0)) + fld("dwM", L("Місяць", "Month"), sel("dwM", monthOpts(), t.m)) + fld("dwY", L("Рік", "Year"), inp("dwY", "2027", 4)) + fld("dwA", L("З року", "From year"), inp("dwA", "2026", 4)) + fld("dwB", L("До року", "To year"), inp("dwB", "2035", 4)) + "</div>" + hint(L("Приклади: третя неділя травня, четвертий четвер листопада, остання п'ятниця місяця. Для п'ятниць 13-го вкажіть діапазон до 100 років. Рахується за григоріанським календарем.", "Examples: the third Sunday of May, the fourth Thursday of November, the last Friday of a month. For Friday the 13th give a range of up to 100 years. The Gregorian calendar is used."));
      setVal(el, "dwY", t.y); setVal(el, "dwA", t.y); setVal(el, "dwB", t.y + 9);
      const vis = () => { const k = el("dwK").value; const show = (id, on) => { const w = el(id + "W"); if (w) w.hidden = !on; }; show("dwO", k === "nth"); show("dwW", k !== "f13"); show("dwM", k !== "f13"); show("dwY", k !== "f13"); show("dwA", k === "f13"); show("dwB", k === "f13"); };
      vis(); el("dwK").addEventListener("change", vis); bind(el, maybeCalc, ["dwK", "dwO", "dwW", "dwM", "dwY", "dwA", "dwB"]);
    },
    calc(h) {
      const { el } = h, k = el("dwK").value;
      if (k === "f13") {
        const a = readYear(el, "dwA", L("Початковий рік", "The first year")), b = readYear(el, "dwB", L("Кінцевий рік", "The last year"));
        if (a.incomplete || b.incomplete) return { ok: false, incomplete: true };
        if (a.err) return { ok: false, msg: a.err };
        if (b.err) return { ok: false, msg: b.err };
        if (a.y > b.y) return { ok: false, msg: L("Початковий рік має бути не пізніше за кінцевий.", "The first year must not be later than the last.") };
        if (b.y > 9999 || b.y - a.y > 99) return { ok: false, msg: L("Діапазон — не більше 100 років (до 9999 року).", "The range is up to 100 years (up to the year 9999).") };
        const all = D.friday13(a.y, b.y), by = {}; all.forEach((r) => { (by[r.y] = by[r.y] || []).push(r.m); });
        const years = []; for (let y = a.y; y <= b.y; y++) years.push(y);
        const maxN = Math.max(...years.map((y) => (by[y] || []).length)), maxYears = years.filter((y) => (by[y] || []).length === maxN), none = years.filter((y) => !(by[y] || []).length).length;
        const rows = years.map((y) => ({ cells: [{ t: String(y), cls: "is-first" }, (by[y] || []).map((m) => "13 " + MG[m - 1]).join(", ") || "—", { t: String((by[y] || []).length), cls: "chip" }] }));
        const tiles = [{ k: L("Років", "Years"), v: String(years.length) }, { k: L("Найбільше за рік", "Most in a year"), v: maxN + (maxYears.length <= 4 ? " (" + maxYears.join(", ") + ")" : L(" (у " + maxYears.length + " роках)", " (in " + maxYears.length + " years)")) }, { k: L("Років без жодної", "Years with none"), v: String(none) }];
        const steps = [{ t: L("Діапазон", "The range"), l: [a.y + "–" + b.y] }, { t: L("Перевіряємо 13-те число кожного місяця", "Checking the 13th of every month"), l: [L("п'ятниця 13-го — це 13-те, що припало на п'ятницю", "Friday the 13th is a 13th that falls on a Friday")] }, { t: L("Результат", "Result"), l: [all.length + " " + L(pl(all.length, ["п'ятниця 13-го", "п'ятниці 13-го", "п'ятниць 13-го"]), all.length === 1 ? "Friday the 13th" : "Fridays the 13th")] }];
        return { ok: true, expr: L("П'ятниці 13-го, ", "Fridays the 13th, ") + a.y + "–" + b.y, head: [L("п'ятниць 13-го", "Fridays the 13th"), String(all.length)], subRaw: true, headSub: a.y + "–" + b.y + L(" · в середньому ", " · on average ") + (all.length / years.length).toFixed(2).replace(".", IS_EN ? "." : ",") + L(" на рік", " per year"), tiles, extraHtml: fold("f13Table", L("Дати за роками", "Dates by year"), UI.list([L("Рік", "Year"), L("Дати", "Dates"), L("Кількість", "Count")], rows, { w: "90px minmax(0, 1.6fr) 90px" })), note: NOTE, steps, resText: L("П'ятниць 13-го за ", "Fridays the 13th in ") + a.y + "–" + b.y + ": " + all.length };
      }
      const y = readYear(el, "dwY", L("Рік", "The year"));
      if (y.incomplete) return { ok: false, incomplete: true };
      if (y.err) return { ok: false, msg: y.err };
      const m = Number(el("dwM").value), wd = Number(el("dwW").value), days = D.weekdaysInMonth(y.y, m, wd), my = MG[m - 1] + " " + y.y, today = D.todayJ();
      const dayTile = (dd) => { const J = C.jdn("g", y.y, m, dd), w = D.isoWeek(y.y, m, dd); return { J, w, doy: D.dayOfYear("g", y.y, m, dd) }; };
      if (k === "all") {
        const rows = days.map((dd, i) => { const t = dayTile(dd); return { cells: [{ t: String(i + 1), cls: "is-first" }, dfmt(y.y, m, dd), L("тиждень " + t.w.week, "week " + t.w.week), rel(t.J - today)] }; });
        const tiles = [{ k: L("Скільки", "How many"), v: String(days.length) }, { k: L("Числа", "Dates"), v: days.join(", ") }, { k: L("Місяць", "Month"), v: L(MN[m - 1] + " " + y.y, my) }];
        const steps = [{ t: L("Перший " + DAYL[wd] + " місяця", "The first " + DAYL[wd] + " of the month"), l: [dfmt(y.y, m, days[0])] }, { t: L("Далі через 7 днів", "Then every 7 days"), l: [days.join(" → ")] }];
        return { ok: true, expr: DAYN[wd] + L(" у ", " in ") + my, head: [L("кількість: " + DAYL[wd], "count: " + DAYL[wd]), days.length + " " + wdPlural(days.length, wd)], subRaw: true, headSub: L(MN[m - 1] + " " + y.y, my), tiles, extraHtml: '<div class="ph__sub">' + L("Дати", "Dates") + "</div>" + UI.list([L("№", "#"), L("Дата", "Date"), L("Тиждень", "Week"), L("Від сьогодні", "From today")], rows, { w: "50px minmax(0, 1.4fr) minmax(0, 1fr) minmax(0, 1.2fr)" }), note: NOTE, steps, resText: DAYN[wd] + " — " + my + ": " + days.join(", ") };
      }
      const nRaw = el("dwO").value, n = nRaw === "last" ? "last" : Number(nRaw), dd = D.nthWeekday(y.y, m, n, wd);
      if (dd === null) return { ok: false, msg: L("У " + MG[m - 1] + " " + y.y + " немає " + ordText(n, wd) + " " + DAYL[wd] + ": таких днів лише " + days.length + ".", "There is no " + ordText(n, wd) + " " + DAYL[wd] + " in " + my + ": only " + days.length + " such days.") };
      const t = dayTile(dd), idx = days.indexOf(dd) + 1;
      const tiles = [{ k: L("День тижня", "Weekday"), v: DAYN[wd] }, { k: L("Від сьогодні", "From today"), v: rel(t.J - today) }, { k: L("День року", "Day of the year"), v: L(t.doy + "-й з " + D.yearLen("g", y.y), "day " + t.doy + " of " + D.yearLen("g", y.y)) }, { k: L("Тиждень року (ISO)", "Week of the year (ISO)"), v: L("тиждень " + t.w.week + ", " + t.w.year, "week " + t.w.week + ", " + t.w.year) }, { k: L("Усі такі дні місяця", "All such days of the month"), v: days.join(", ") }];
      const steps = [{ t: L("Перший " + DAYL[wd] + " місяця", "The first " + DAYL[wd] + " of the month"), l: [dfmt(y.y, m, days[0])] }, { t: n === "last" ? L("Беремо останній", "Taking the last one") : L("Додаємо по 7 днів", "Adding 7 days each time"), l: [days.join(" → ") + " (" + L("№ ", "# ") + idx + ")"] }, { t: L("Результат", "Result"), l: [dfmt(y.y, m, dd) + " (" + DAYL[wd] + ")"] }];
      const ordLabel = ordText(n, wd) + " " + DAYL[wd] + L(" ", " of ") + (IS_EN ? my : MG[m - 1] + " " + y.y);
      return { ok: true, expr: ordLabel.charAt(0).toUpperCase() + ordLabel.slice(1), head: [ordLabel, dfmt(y.y, m, dd)], subRaw: true, headSub: DAYN[wd] + " · " + rel(t.J - today), tiles, extraHtml: "", note: NOTE, steps, resText: ordLabel + " = " + dfmt(y.y, m, dd) };
    },
    reset(h) { const { el } = h, t = tdy(); setVal(el, "dwK", "nth"); setVal(el, "dwO", 3); setVal(el, "dwW", 0); setVal(el, "dwM", t.m); setVal(el, "dwY", t.y); setVal(el, "dwA", t.y); setVal(el, "dwB", t.y + 9); el("dwK").dispatchEvent(new Event("change", { bubbles: true })); },
    fill(h) { const { el } = h; setVal(el, "dwK", "nth"); setVal(el, "dwO", 3); setVal(el, "dwW", 0); setVal(el, "dwM", 5); setVal(el, "dwY", 2027); el("dwK").dispatchEvent(new Event("change", { bubbles: true })); },
    share(p, h) { const { el } = h; p.set("wk", el("dwK").value); p.set("wo", el("dwO").value); p.set("ww", el("dwW").value); p.set("wm", el("dwM").value); if (el("dwY").value.trim()) p.set("wy", el("dwY").value.trim()); if (el("dwA").value.trim()) p.set("wa", el("dwA").value.trim()); if (el("dwB").value.trim()) p.set("wb", el("dwB").value.trim()); },
    apply(qs, h) { const { el } = h; if (["nth", "all", "f13"].includes(qs.get("wk"))) setVal(el, "dwK", qs.get("wk")); if (["1", "2", "3", "4", "5", "last"].includes(qs.get("wo"))) setVal(el, "dwO", qs.get("wo")); if (/^[0-6]$/.test(qs.get("ww") || "")) setVal(el, "dwW", qs.get("ww")); if (/^([1-9]|1[0-2])$/.test(qs.get("wm") || "")) setVal(el, "dwM", qs.get("wm")); ["wy:dwY", "wa:dwA", "wb:dwB"].forEach((p) => { const [q, id] = p.split(":"); if (/^\d{1,4}$/.test(qs.get(q) || "")) setVal(el, id, qs.get(q)); }); el("dwK").dispatchEvent(new Event("change", { bubbles: true })); }
  };
  return { modes: [dw, yrs, find], exactNote: false };
});
