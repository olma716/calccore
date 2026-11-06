/* ad-calc.js — додати або відняти дні до дати: роки, місяці, тижні й дні разом (кінець місяця обмежується), N-й робочий день з вихідними й власними святами */
PhysCalc.start(({ L }) => {
  const A = window.Ag, F = window.Df, D = window.Ad;
  const grp = A.grp;
  const NOTE = L("Розрахунок за григоріанським календарем: для дат до 1582 року результат умовний. Дні рахуються за UTC, тож перехід на літній час не впливає. Для юридичних строків (довіреність, гарантія, віза) орієнтуйтеся на закон і документи: калькулятор лише показує дату за календарем.", "The calculation uses the Gregorian calendar: for dates before 1582 the result is nominal. Days are counted in UTC, so daylight saving time does not affect them. For legal deadlines (power of attorney, warranty, visa) rely on the law and documents: the calculator only shows the calendar date.");
  const WD = L(["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"], ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
  const MG = L(["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"], ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
  const dfmt = (n) => { const p = A.parts(n); return L(p.d + " " + MG[p.m - 1] + " " + p.y, MG[p.m - 1] + " " + p.d + ", " + p.y); };
  const U = {
    y: (n) => L(A.pl(n, "рік", "роки", "років"), n === 1 ? "year" : "years"), mo: (n) => L(A.pl(n, "місяць", "місяці", "місяців"), n === 1 ? "month" : "months"),
    d: (n) => L(A.pl(n, "день", "дні", "днів"), n === 1 ? "day" : "days"), w: (n) => L(A.pl(n, "тиждень", "тижні", "тижнів"), n === 1 ? "week" : "weeks"),
    wk: (n) => L(A.pl(n, "робочий день", "робочі дні", "робочих днів"), n === 1 ? "working day" : "working days")
  };
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const dateF = (id, label, full, def) => fld(id, label, '<input class="ph__input" type="date" id="' + id + '" min="1000-01-01" max="2999-12-31"' + (def ? ' data-default-label="' + L("Сьогодні", "Today") + '"' : "") + ' aria-label="' + id + '">', full);
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const inp = (id, ph, ml) => '<input class="ph__input" id="' + id + '" type="text" inputmode="numeric" autocomplete="off" maxlength="' + (ml || 7) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const warnHtml = (ws) => ws.map((t) => hint("⚠ " + t)).join("");
  const setV = (el, id, v) => { const e = el(id); if (!e) return; e.value = v; e.dispatchEvent(new Event("change", { bubbles: true })); };
  const readDate = (el, id) => { const s = el(id).value.trim(); if (!s) return { v: A.todayDn() }; const n = A.parseISO(s); return n === null ? { err: L("Початкова дата — коректна дата.", "The start date must be a valid date.") } : { v: n }; };
  const bind = (el, maybeCalc, ids, evs) => ids.forEach((id) => (evs || ["input", "change"]).forEach((e) => el(id).addEventListener(e, maybeCalc)));
  const dateWarn = (a) => (A.parts(a).y < 1583 ? [L("До 1582 року в Європі діяв юліанський календар: результат рахується за григоріанським календарем, тому для таких дат він умовний.", "Before 1582 Europe used the Julian calendar: the result is calculated with the Gregorian calendar, so for such dates it is nominal.")] : []);
  const rel = (n) => (n === 0 ? L("сьогодні", "today") : n > 0 ? L("через " + grp(n) + " " + U.d(n), "in " + grp(n) + " " + U.d(n)) : L(grp(-n) + " " + U.d(-n) + " тому", grp(-n) + " " + U.d(-n) + " ago"));
  const opSel = () => sel("adO", [["add", L("Додати", "Add")], ["sub", L("Відняти", "Subtract")]], "add");
  const inclSel = () => sel("adI", [["0", L("Від початкової дати (через N днів)", "From the start date (in N days)")], ["1", L("Початкова дата — перший день", "The start date is day 1")]], "0");
  const chipsHtml = (id, chips) => '<div class="ph__chips ph__mt12" id="' + id + '">' + chips.map(([k, t]) => '<button type="button" class="ph__mini" data-k="' + k + '">' + t + "</button>").join("") + "</div>";
  const wkOpts = () => [["satsun", L("Субота й неділя", "Saturday and Sunday")], ["sun", L("Лише неділя", "Sunday only")], ["frisat", L("П'ятниця й субота", "Friday and Saturday")], ["none", L("Без вихідних (усі дні робочі)", "No weekend (every day is a working day)")]];
  const LIM = { y: 2000, mo: 24000, w: 105000, d: 1000000 };
  const num = (s) => { const t = String(s || "").replace(/[\s  ]/g, ""); return t === "" ? 0 : /^\d+$/.test(t) ? +t : NaN; };
  const desc = (o) => { const ps = []; if (o.y) ps.push(o.y + " " + U.y(o.y)); if (o.mo) ps.push(o.mo + " " + U.mo(o.mo)); if (o.w) ps.push(o.w + " " + U.w(o.w)); if (o.d) ps.push(o.d + " " + U.d(o.d)); return ps.length ? ps.join(" ") : "0 " + U.d(0); };
  const tileWd = (n) => { const w = D.isoWeek(n); return { wd: WD[A.parts(n).wd], week: L("тиждень " + w.week + ", " + w.year, "week " + w.week + ", " + w.year) }; };
  const outMsg = L("Результат виходить за межі 1000–2999 років. Зменште значення.", "The result is outside the years 1000–2999. Use a smaller value.");

  // ----- додати або відняти -----
  const add = {
    key: "add", type: "custom", req: () => [], nameUk: "Додати або відняти", nameEn: "Add or subtract",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + dateF("adA", L("Початкова дата", "Start date"), false, true) + fld("adO", L("Дія", "Operation"), opSel()) + fld("adY", L("Роки", "Years"), inp("adY", "0", 4)) + fld("adMo", L("Місяці", "Months"), inp("adMo", "0", 5)) + fld("adWk", L("Тижні", "Weeks"), inp("adWk", "0", 6)) + fld("adD", L("Дні", "Days"), inp("adD", "0", 7)) + fld("adI", L("Як рахувати", "How to count"), inclSel(), true) + "</div>" + chipsHtml("adChips", [["d7", L("7 днів", "7 days")], ["d14", L("14 днів", "14 days")], ["d30", L("30 днів", "30 days")], ["d60", L("60 днів", "60 days")], ["d90", L("90 днів", "90 days")], ["mo6", L("6 місяців", "6 months")], ["y1", L("1 рік", "1 year")]]) + hint(L("Можна поєднувати величини: наприклад, 1 рік, 3 місяці й 10 днів. Початкова дата за замовчуванням — сьогодні. Спочатку додаються роки й місяці, потім тижні й дні.", "You can combine the amounts, for example 1 year, 3 months and 10 days. The start date is today by default. Years and months are added first, then weeks and days."));
      setV(el, "adA", ""); bind(el, maybeCalc, ["adA", "adY", "adMo", "adWk", "adD"]); bind(el, maybeCalc, ["adO", "adI"], ["change"]);
      ["adY", "adMo", "adWk", "adD"].forEach((id) => el(id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } }));
      el("adChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; const k = b.dataset.k, v = +k.replace(/\D/g, ""), f = k.startsWith("mo") ? "adMo" : k.startsWith("y") ? "adY" : "adD"; ["adY", "adMo", "adWk", "adD"].forEach((id) => { el(id).value = ""; }); el(f).value = String(v); h.calc(true); });
    },
    calc(h) {
      const { el } = h, st = readDate(el, "adA");
      if (st.err) return { ok: false, msg: st.err };
      const raw = { y: num(el("adY").value), mo: num(el("adMo").value), w: num(el("adWk").value), d: num(el("adD").value) };
      if (["y", "mo", "w", "d"].some((k) => Number.isNaN(raw[k]))) return { ok: false, msg: L("Кількість вводьте цілим невід'ємним числом (без дробів і мінуса).", "Enter amounts as whole non-negative numbers (no fractions or minus).") };
      if (["y", "mo", "w", "d"].some((k) => raw[k] > LIM[k])) return { ok: false, msg: L("Занадто велике значення: роки до 2000, місяці до 24 000, тижні до 105 000, дні до 1 000 000.", "The value is too large: years up to 2,000, months up to 24,000, weeks up to 105,000, days up to 1,000,000.") };
      if (["adY", "adMo", "adWk", "adD"].every((id) => !el(id).value.trim())) return { ok: false, incomplete: true };
      const sign = el("adO").value === "sub" ? -1 : 1, incl = el("adI").value === "1", r = D.shift(st.v, raw, sign, incl);
      if (!D.inRange(r.date) || !D.inRange(r.afterM)) return { ok: false, msg: outMsg };
      const today = A.todayDn(), t = tileWd(r.date), cal = Math.abs(r.date - st.v), d0 = desc(raw), warns = dateWarn(st.v).concat(A.parts(r.date).y < 1583 && A.parts(st.v).y >= 1583 ? dateWarn(r.date) : []);
      const steps = [{ t: L("Початкова дата", "Start date"), l: [dfmt(st.v) + " (" + WD[A.parts(st.v).wd] + ")"] }];
      if (r.months) steps.push({ t: L("Роки й місяці", "Years and months"), l: [dfmt(st.v) + (sign > 0 ? " + " : " − ") + desc({ y: raw.y, mo: raw.mo, w: 0, d: 0 }) + " → " + dfmt(r.afterM)], note: r.clamped ? L("У цьому місяці немає такого числа, тому береться його останній день (31 січня + 1 місяць = 28 лютого).", "That month has no such day, so its last day is used (31 January + 1 month = 28 February).") : undefined });
      if (r.days) steps.push({ t: L("Тижні й дні", "Weeks and days"), l: [dfmt(r.afterM) + (sign > 0 ? " + " : " − ") + grp(raw.w * 7 + raw.d) + " " + U.d(raw.w * 7 + raw.d) + " → " + dfmt(r.afterD)] });
      if (r.adj) steps.push({ t: L("Початкова дата — перший день", "The start date is day 1"), l: [dfmt(r.afterD) + (r.adj < 0 ? " − 1 " : " + 1 ") + U.d(1) + " → " + dfmt(r.date)], note: L("Початкова дата сама рахується як день 1, тому результат на день ближче до неї.", "The start date itself counts as day 1, so the result is a day closer to it.") });
      steps.push({ t: L("Результат", "Result"), l: [dfmt(r.date) + " (" + t.wd + ", " + t.week + ")"] });
      const tiles = [{ k: L("День тижня", "Day of the week"), v: t.wd }, { k: L("Від сьогодні", "From today"), v: rel(r.date - today) }, { k: L("Усього днів зсуву", "Total days shifted"), v: grp(cal) + " " + U.d(cal) }, { k: L("Тиждень року (ISO)", "Week of the year (ISO)"), v: t.week }];
      return { ok: true, expr: dfmt(st.v) + (sign > 0 ? " + " : " − ") + d0, head: [(sign > 0 ? L("дата після додавання", "date after adding") : L("дата після віднімання", "date after subtracting")) + (incl ? L(" · початкова дата — день 1", " · start date is day 1") : ""), dfmt(r.date)], subRaw: true, headSub: t.wd + " · " + rel(r.date - today), tiles, extraHtml: warnHtml(warns), note: NOTE, steps, resText: dfmt(st.v) + (sign > 0 ? " + " : " − ") + d0 + " = " + dfmt(r.date) + " (" + t.wd + ")" };
    },
    reset(h) { const { el } = h; setV(el, "adA", ""); el("adO").value = "add"; ["adY", "adMo", "adWk", "adD"].forEach((id) => { el(id).value = ""; }); el("adI").value = "0"; },
    fill(h) { const { el } = h; setV(el, "adA", "2025-01-15"); el("adO").value = "add"; ["adY", "adMo", "adWk"].forEach((id) => { el(id).value = ""; }); el("adD").value = "90"; el("adI").value = "0"; },
    share(p, h) { const { el } = h; if (el("adA").value) p.set("sa", el("adA").value); p.set("so", el("adO").value); [["sy", "adY"], ["sm", "adMo"], ["sw", "adWk"], ["sd", "adD"]].forEach(([k, id]) => { const v = el(id).value.replace(/\s+/g, ""); if (v) p.set(k, v.slice(0, 8)); }); p.set("si", el("adI").value); },
    apply(qs, h) { const { el } = h; if (qs.has("sa") && A.parseISO(qs.get("sa")) !== null) setV(el, "adA", qs.get("sa")); if (["add", "sub"].includes(qs.get("so"))) el("adO").value = qs.get("so"); [["sy", "adY"], ["sm", "adMo"], ["sw", "adWk"], ["sd", "adD"]].forEach(([k, id]) => { if (qs.has(k) && /^\d{1,8}$/.test(qs.get(k))) el(id).value = qs.get(k); }); if (["0", "1"].includes(qs.get("si"))) el("adI").value = qs.get("si"); }
  };

  // ----- робочі дні -----
  const work = {
    key: "work", type: "custom", req: () => ["adN"], nameUk: "Робочі дні", nameEn: "Working days",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + dateF("adA", L("Початкова дата", "Start date"), false, true) + fld("adO", L("Дія", "Operation"), opSel()) + fld("adN", L("Кількість робочих днів", "Number of working days"), inp("adN", "10", 6), true) + fld("adWd", L("Вихідні дні", "Weekend days"), sel("adWd", wkOpts(), "satsun")) + fld("adI", L("Як рахувати", "How to count"), sel("adI", [["0", L("Початкова дата не рахується", "The start date is not counted")], ["1", L("Початкова дата — перший день", "The start date is day 1")]], "0")) + fld("adH", L("Свята й додаткові вихідні (необов'язково)", "Holidays and extra days off (optional)"), '<textarea class="ph__input ph__textarea" id="adH" rows="3" maxlength="1200" placeholder="' + L("напр.: 01.05.2025, 08.05.2025", "e.g.: 05/01/2025, 05/08/2025") + '" aria-label="adH"></textarea>', true) + "</div>" + chipsHtml("adChips", [["5", L("5 днів", "5 days")], ["10", L("10 днів", "10 days")], ["20", L("20 днів", "20 days")], ["30", L("30 днів", "30 days")], ["60", L("60 днів", "60 days")]]) + hint(L("Рахуються лише дні, які не є вихідними чи святами. Свята вводьте власним списком дат (через кому, пробіл чи з нового рядка): ДД.ММ.РРРР або РРРР-ММ-ДД. Державні свята не вбудовані, бо вони змінюються.", "Only days that are neither weekends nor holidays are counted. Enter holidays as your own list of dates (separated by commas, spaces or new lines): MM/DD/YYYY or YYYY-MM-DD. State holidays are not built in because they change."));
      setV(el, "adA", ""); bind(el, maybeCalc, ["adA", "adN"]); bind(el, maybeCalc, ["adO", "adWd", "adI"], ["change"]); el("adH").addEventListener("input", maybeCalc);
      el("adN").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } });
      el("adChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; el("adN").value = b.dataset.k; h.calc(true); });
    },
    calc(h) {
      const { el } = h, st = readDate(el, "adA");
      if (st.err) return { ok: false, msg: st.err };
      const raw = el("adN").value.trim();
      if (!raw) return { ok: false, incomplete: true };
      const n = num(raw);
      if (Number.isNaN(n) || n < 1) return { ok: false, msg: L("Кількість робочих днів — ціле число від 1.", "The number of working days must be a whole number from 1.") };
      if (n > 100000) return { ok: false, msg: L("Занадто велике значення: до 100 000 робочих днів.", "The value is too large: up to 100,000 working days.") };
      const hp = F.parseHolidays(el("adH").value);
      if (hp.bad.length) return { ok: false, msg: L("Не вдалося розпізнати дати свят: " + hp.bad.slice(0, 3).join(", ") + (hp.bad.length > 3 ? " …" : "") + ". Формат: ДД.ММ.РРРР або РРРР-ММ-ДД.", "Could not recognise the holiday dates: " + hp.bad.slice(0, 3).join(", ") + (hp.bad.length > 3 ? " …" : "") + ". Format: MM/DD/YYYY or YYYY-MM-DD.") };
      if (hp.set.size > 400) return { ok: false, msg: L("Занадто багато свят: не більше 400 дат.", "Too many holidays: up to 400 dates.") };
      const sign = el("adO").value === "sub" ? -1 : 1, incl = el("adI").value === "1", wk = F.WEEKENDS[el("adWd").value], r = D.workday(st.v, n, sign, wk, hp.set, incl);
      if (r.out) return { ok: false, msg: outMsg };
      const today = A.todayDn(), t = tileWd(r.date), lo = Math.min(st.v, r.date), hi = Math.max(st.v, r.date), warns = dateWarn(st.v);
      let outside = 0, onWeekend = 0; hp.set.forEach((d) => { if (d < lo || d > hi) outside++; else if (wk.includes(F.wdOf(d))) onWeekend++; });
      if (outside) warns.push(L(outside + " " + A.pl(outside, "свято", "свята", "свят") + " поза діапазоном від початкової дати до результату не враховано.", outside + (outside === 1 ? " holiday" : " holidays") + " outside the range from the start date to the result " + (outside === 1 ? "was" : "were") + " ignored."));
      if (onWeekend) warns.push(L(onWeekend + " " + A.pl(onWeekend, "свято випало", "свята випали", "свят випало") + " на вихідні, тож окремо не пропускається.", onWeekend + (onWeekend === 1 ? " holiday falls" : " holidays fall") + " on a weekend, so it is not skipped separately."));
      const d0 = grp(n) + " " + U.wk(n), op = sign > 0 ? " + " : " − ";
      const steps = [{ t: L("Початкова дата", "Start date"), l: [dfmt(st.v) + " (" + WD[A.parts(st.v).wd] + ")"] }, { t: L("Рахуємо робочі дні " + (sign > 0 ? "вперед" : "назад"), "Counting working days " + (sign > 0 ? "forward" : "back")), l: [L("пропущено вихідних: ", "weekend days skipped: ") + grp(r.skipW) + L(", свят: ", ", holidays: ") + grp(r.skipH), L("календарних днів від початкової дати: ", "calendar days from the start date: ") + grp(r.calendar)], note: incl ? L("Початкова дата рахується першим робочим днем, якщо вона не вихідна й не свято.", "The start date counts as the first working day if it is not a weekend or a holiday.") : L("Початкова дата не рахується: перший робочий день — наступний за нею.", "The start date is not counted: the first working day is the next one after it.") }, { t: L("Результат", "Result"), l: [dfmt(r.date) + " (" + t.wd + ", " + t.week + ")"] }];
      const tiles = [{ k: L("День тижня", "Day of the week"), v: t.wd }, { k: L("Календарних днів", "Calendar days"), v: grp(r.calendar) }, { k: L("Пропущено вихідних", "Weekend days skipped"), v: grp(r.skipW) }, { k: L("Пропущено свят", "Holidays skipped"), v: grp(r.skipH) }];
      return { ok: true, expr: dfmt(st.v) + op + d0, head: [(sign > 0 ? L("дата після додавання робочих днів", "date after adding working days") : L("дата після віднімання робочих днів", "date after subtracting working days")) + (incl ? L(" · початкова дата — день 1", " · start date is day 1") : ""), dfmt(r.date)], subRaw: true, headSub: t.wd + " · " + rel(r.date - today), tiles, extraHtml: warnHtml(warns), note: NOTE, steps, resText: dfmt(st.v) + op + d0 + " = " + dfmt(r.date) + " (" + t.wd + L("; календарних днів ", "; calendar days ") + grp(r.calendar) + ")" };
    },
    reset(h) { const { el } = h; setV(el, "adA", ""); el("adO").value = "add"; el("adN").value = ""; el("adWd").value = "satsun"; el("adI").value = "0"; el("adH").value = ""; },
    fill(h) { const { el } = h; setV(el, "adA", "2025-04-28"); el("adO").value = "add"; el("adN").value = "10"; el("adWd").value = "satsun"; el("adI").value = "0"; el("adH").value = L("01.05.2025, 08.05.2025", "05/01/2025, 05/08/2025"); },
    share(p, h) { const { el } = h; if (el("adA").value) p.set("sa", el("adA").value); p.set("so", el("adO").value); const n = el("adN").value.replace(/\s+/g, ""); if (n) p.set("sn", n.slice(0, 7)); p.set("sk", el("adWd").value); p.set("si", el("adI").value); const t = el("adH").value.trim().replace(/\s+/g, " "); if (t) p.set("sh", t.slice(0, 600)); },
    apply(qs, h) { const { el } = h; if (qs.has("sa") && A.parseISO(qs.get("sa")) !== null) setV(el, "adA", qs.get("sa")); if (["add", "sub"].includes(qs.get("so"))) el("adO").value = qs.get("so"); if (qs.has("sn") && /^\d{1,7}$/.test(qs.get("sn"))) el("adN").value = qs.get("sn"); if (Object.keys(F.WEEKENDS).includes(qs.get("sk"))) el("adWd").value = qs.get("sk"); if (["0", "1"].includes(qs.get("si"))) el("adI").value = qs.get("si"); if (qs.has("sh")) el("adH").value = qs.get("sh").slice(0, 600); }
  };
  return { modes: [add, work], exactNote: false };
});
