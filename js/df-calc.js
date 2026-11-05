/* df-calc.js — калькулятор різниці між датами: різниця в роках, місяцях, днях і робочі дні з вихідними та власними святами */
PhysCalc.start(({ L }) => {
  const A = window.Ag, F = window.Df, UI = window.PhysUI;
  const grp = A.grp;
  const NOTE = L("Розрахунок за григоріанським календарем: для дат до 1582 року результат умовний. Різниця дат у днях рахується за UTC, тож перехід на літній час не впливає. Для юридичних строків орієнтуйтеся на закон і документи: калькулятор лише пропонує варіанти «з останнім днем» і «без».", "The calculation uses the Gregorian calendar: for dates before 1582 the result is nominal. The difference in days is calculated in UTC, so daylight saving time does not affect it. For legal deadlines rely on the law and documents: the calculator only offers the “with the last day” and “without” options.");
  const WD = L(["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"], ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
  const MG = L(["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"], ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
  const dfmt = (n) => { const p = A.parts(n); return L(p.d + " " + MG[p.m - 1] + " " + p.y, MG[p.m - 1] + " " + p.d + ", " + p.y); };
  const U = {
    y: (n) => L(A.pl(n, "рік", "роки", "років"), n === 1 ? "year" : "years"), mo: (n) => L(A.pl(n, "місяць", "місяці", "місяців"), n === 1 ? "month" : "months"),
    d: (n) => L(A.pl(n, "день", "дні", "днів"), n === 1 ? "day" : "days"), w: (n) => L(A.pl(n, "тиждень", "тижні", "тижнів"), n === 1 ? "week" : "weeks")
  };
  const ymdText = (r) => { const ps = []; if (r.years) ps.push(r.years + " " + U.y(r.years)); if (r.months) ps.push(r.months + " " + U.mo(r.months)); if (r.days || !ps.length) ps.push(r.days + " " + U.d(r.days)); return ps.join(" "); };
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const dateF = (id, label, full, def) => fld(id, label, '<input class="ph__input" type="date" id="' + id + '" min="1000-01-01" max="2999-12-31"' + (def ? ' data-default-label="' + L("Сьогодні", "Today") + '"' : "") + ' aria-label="' + id + '">', full);
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const warnHtml = (ws) => ws.map((t) => hint("⚠ " + t)).join("");
  const setV = (el, id, v) => { const e = el(id); if (!e) return; e.value = v; e.dispatchEvent(new Event("change", { bubbles: true })); };
  const readDate = (el, id, name, optionalToday) => {
    const s = el(id).value.trim();
    if (!s) return optionalToday ? { v: A.todayDn() } : null;
    const n = A.parseISO(s); if (n === null) return { err: L(name + " — коректна дата.", name + " must be a valid date.") };
    return { v: n };
  };
  const bindDates = (el, maybeCalc, ids) => ids.forEach((id) => { el(id).addEventListener("input", maybeCalc); el(id).addEventListener("change", maybeCalc); });
  const dateWarn = (a) => (A.parts(a).y < 1583 ? [L("До 1582 року в Європі діяв юліанський календар: результат рахується за григоріанським календарем, тому для таких дат він умовний.", "Before 1582 Europe used the Julian calendar: the result is calculated with the Gregorian calendar, so for such dates it is nominal.")] : []);
  const MAP_D = [["fa", "dfA"], ["fb", "dfB"], ["fi", "dfI"]];
  const shareD = (p, el, extra) => { if (!el("dfA").value) return; p.set("fa", el("dfA").value); if (el("dfB").value) p.set("fb", el("dfB").value); p.set("fi", el("dfI").value); if (extra) extra(); };
  const applyD = (qs, el) => { if (qs.has("fa") && A.parseISO(qs.get("fa")) !== null) setV(el, "dfA", qs.get("fa")); if (qs.has("fb") && A.parseISO(qs.get("fb")) !== null) setV(el, "dfB", qs.get("fb")); if (qs.has("fi") && ["0", "1"].includes(qs.get("fi"))) el("dfI").value = qs.get("fi"); };

  // ----- різниця між датами -----
  const diff = {
    key: "diff", type: "custom", req: ({ el }) => ["dfA"], nameUk: "Різниця між датами", nameEn: "Date difference",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + dateF("dfA", L("Від дати", "From")) + dateF("dfB", L("До дати", "To"), false, true) + fld("dfI", L("Як рахувати", "How to count"), sel("dfI", [["0", L("Без останнього дня (звичайна різниця)", "Without the last day (plain difference)")], ["1", L("Включно з останнім днем", "Including the last day")]], "0"), true) + '</div><div class="ph__hint ph__mt12">' + L("Дати можна вводити в будь-якому порядку: калькулятор сам визначить, яка раніша. «До дати» за замовчуванням — сьогодні.", "The dates can be entered in any order: the calculator works out which is earlier. “To” is today by default.") + "</div>";
      setV(el, "dfB", ""); bindDates(el, maybeCalc, ["dfA", "dfB"]); el("dfI").addEventListener("change", maybeCalc);
    },
    calc(h) {
      const { el } = h, a = readDate(el, "dfA", L("Дата «Від»", "The “From” date")), b = readDate(el, "dfB", L("Дата «До»", "The “To” date"), true);
      if (a && a.err) return { ok: false, msg: a.err };
      if (b.err) return { ok: false, msg: b.err };
      if (!a) return { ok: false, incomplete: true };
      const incl = el("dfI").value === "1", r = F.range(a.v, b.v, incl), total = r.endExcl - r.start, x = A.ymd(r.start, r.endExcl, "feb28"), tm = x.years * 12 + x.months, weeks = Math.floor(total / 7), wd = total % 7, bz = F.business(r.start, r.endExcl, F.WEEKENDS.satsun, null), warns = dateWarn(r.start);
      const tiles = [{ k: L("Усього днів", "Total days"), v: grp(total) }, { k: L("Тижнів і днів", "Weeks and days"), v: grp(weeks) + " " + U.w(weeks) + (wd ? " " + wd + " " + U.d(wd) : "") }, { k: L("Усього місяців", "Total months"), v: grp(tm) + (x.days ? " + " + x.days + " " + U.d(x.days) : "") }, { k: L("Робочих днів (пн–пт)", "Working days (Mon–Fri)"), v: grp(bz.work) }, { k: L("Перша дата", "First date"), v: WD[A.parts(a.v).wd] }, { k: L("Друга дата", "Second date"), v: WD[A.parts(b.v).wd] }];
      const steps = [{ t: L("Порядок дат", "Order of the dates"), l: [dfmt(r.start) + " → " + dfmt(r.last) + (incl ? L(" (і ще останній день)", " (plus the last day)") : "")] }, { t: L("Повні роки", "Whole years"), l: [L("остання річниця — ", "the last anniversary — ") + dfmt(x.a) + " (" + x.years + " " + U.y(x.years) + ")"] }, { t: L("Повні місяці", "Whole months"), l: [L("від ", "from ") + dfmt(x.a) + L(" додаємо ", " adding ") + x.months + " " + U.mo(x.months) + " → " + dfmt(x.anchor)], note: L("Якщо в місяці немає такого числа, береться його останній день (31 січня + 1 місяць = 28 лютого).", "If the month has no such day its last day is used (31 January + 1 month = 28 February).") }, { t: L("Дні", "Days"), l: [dfmt(r.endExcl) + " − " + dfmt(x.anchor) + " = " + x.days + " " + U.d(x.days)] }, { t: L("Усього днів", "Total days"), l: [dfmt(r.endExcl) + " − " + dfmt(r.start) + " = " + grp(total)] }];
      return { ok: true, expr: dfmt(a.v) + " → " + dfmt(b.v), head: [L("різниця між датами", "date difference"), ymdText(x)], subRaw: true, headSub: grp(total) + " " + U.d(total) + (incl ? L(" · включно з останнім днем", " · including the last day") : "") + (r.swapped ? L(" · перша дата пізніша за другу", " · the first date is later than the second") : ""), tiles, extraHtml: warnHtml(warns), note: NOTE, steps, resText: dfmt(r.start) + " → " + dfmt(r.last) + ": " + ymdText(x) + " (" + grp(total) + " " + U.d(total) + (incl ? L(", включно з останнім днем", ", including the last day") : "") + ")" };
    },
    reset(h) { const { el } = h; setV(el, "dfA", ""); setV(el, "dfB", ""); el("dfI").value = "0"; },
    fill(h) { const { el } = h; setV(el, "dfA", "2025-01-15"); setV(el, "dfB", "2025-03-10"); el("dfI").value = "0"; },
    share(p, h) { shareD(p, h.el); },
    apply(qs, h) { applyD(qs, h.el); }
  };

  // ----- робочі дні -----
  const wkOpts = () => [["satsun", L("Субота й неділя", "Saturday and Sunday")], ["sun", L("Лише неділя", "Sunday only")], ["frisat", L("П'ятниця й субота", "Friday and Saturday")], ["none", L("Без вихідних (усі дні робочі)", "No weekend (every day is a working day)")]];
  const DOW = [1, 2, 3, 4, 5, 6, 0];
  const work = {
    key: "work", type: "custom", req: ({ el }) => ["dfA"], nameUk: "Робочі дні", nameEn: "Working days",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + dateF("dfA", L("Від дати", "From")) + dateF("dfB", L("До дати", "To"), false, true) + fld("dfW", L("Вихідні дні", "Weekend days"), sel("dfW", wkOpts(), "satsun")) + fld("dfI", L("Як рахувати", "How to count"), sel("dfI", [["1", L("Включно з обома датами", "Including both dates")], ["0", L("Без останньої дати", "Without the last date")]], "1")) + fld("dfH", L("Свята й додаткові вихідні (необов'язково)", "Holidays and extra days off (optional)"), '<textarea class="ph__input ph__textarea" id="dfH" rows="3" maxlength="1200" placeholder="' + L("напр.: 01.05.2025, 08.05.2025", "e.g.: 05/01/2025, 05/08/2025") + '" aria-label="dfH"></textarea>', true) + '</div><div class="ph__hint ph__mt12">' + L("Вихідні й свята не рахуються. Свята вводьте власним списком дат (через кому, пробіл чи з нового рядка): " + "ДД.ММ.РРРР або РРРР-ММ-ДД. Державні свята не вбудовані, бо вони змінюються.", "Weekends and holidays are not counted. Enter holidays as your own list of dates (separated by commas, spaces or new lines): MM/DD/YYYY or YYYY-MM-DD. State holidays are not built in because they change.") + "</div>";
      setV(el, "dfB", ""); bindDates(el, maybeCalc, ["dfA", "dfB"]); ["dfW", "dfI"].forEach((id) => el(id).addEventListener("change", maybeCalc)); el("dfH").addEventListener("input", maybeCalc);
    },
    calc(h) {
      const { el } = h, a = readDate(el, "dfA", L("Дата «Від»", "The “From” date")), b = readDate(el, "dfB", L("Дата «До»", "The “To” date"), true);
      if (a && a.err) return { ok: false, msg: a.err };
      if (b.err) return { ok: false, msg: b.err };
      if (!a) return { ok: false, incomplete: true };
      const hp = F.parseHolidays(el("dfH").value);
      if (hp.bad.length) return { ok: false, msg: L("Не вдалося розпізнати дати свят: " + hp.bad.slice(0, 3).join(", ") + (hp.bad.length > 3 ? " …" : "") + ". Формат: ДД.ММ.РРРР або РРРР-ММ-ДД.", "Could not recognise the holiday dates: " + hp.bad.slice(0, 3).join(", ") + (hp.bad.length > 3 ? " …" : "") + ". Format: MM/DD/YYYY or YYYY-MM-DD.") };
      if (hp.set.size > 400) return { ok: false, msg: L("Занадто багато свят: не більше 400 дат.", "Too many holidays: up to 400 dates.") };
      const incl = el("dfI").value === "1", wk = F.WEEKENDS[el("dfW").value], r = F.range(a.v, b.v, incl), res = F.business(r.start, r.endExcl, wk, hp.set), counts = F.weekdayCounts(r.start, r.endExcl), warns = dateWarn(r.start);
      let outside = 0, onWeekend = 0; hp.set.forEach((d) => { if (d < r.start || d >= r.endExcl) outside++; else if (wk.includes(F.wdOf(d))) onWeekend++; });
      if (outside) warns.push(L(outside + " " + A.pl(outside, "свято", "свята", "свят") + " поза вибраним діапазоном не враховано.", outside + (outside === 1 ? " holiday" : " holidays") + " outside the chosen range " + (outside === 1 ? "was" : "were") + " ignored."));
      if (onWeekend) warns.push(L(onWeekend + " " + A.pl(onWeekend, "свято випало", "свята випали", "свят випало") + " на вихідні, тож окремо не віднімається.", onWeekend + (onWeekend === 1 ? " holiday falls" : " holidays fall") + " on a weekend, so it is not subtracted separately."));
      const tiles = [{ k: L("Календарних днів", "Calendar days"), v: grp(res.total) }, { k: L("Вихідних днів", "Weekend days"), v: grp(res.weekends) }, { k: L("Свят у робочі дні", "Holidays on working days"), v: grp(res.holidays) }, { k: L("Робочих днів", "Working days"), v: grp(res.work) }];
      const rows = DOW.map((d) => ({ cells: [{ t: WD[d], cls: "is-first" }, { t: String(counts[d]), cls: "chip" }, wk.includes(d) ? L("вихідний", "weekend") : L("робочий", "working")] }));
      const steps = [{ t: L("Усі дні діапазону", "All days of the range"), l: [dfmt(r.start) + " → " + dfmt(r.last) + (incl ? L(" включно", " inclusive") : L(" без останньої дати", " without the last date")) + " = " + grp(res.total) + " " + U.d(res.total)] }, { t: L("Віднімаємо вихідні й свята", "Subtracting weekends and holidays"), l: [grp(res.total) + " − " + grp(res.weekends) + " − " + grp(res.holidays) + " = " + grp(res.work) + " " + L(A.pl(res.work, "робочий день", "робочі дні", "робочих днів"), res.work === 1 ? "working day" : "working days")], note: L("Свято у вихідний день не віднімається двічі.", "A holiday on a weekend is not subtracted twice.") }];
      return { ok: true, expr: dfmt(r.start) + " → " + dfmt(r.last), head: [L("робочих днів", "working days"), grp(res.work)], subRaw: true, headSub: L("з ", "of ") + grp(res.total) + " " + U.d(res.total) + L(" · вихідних ", " · weekends ") + grp(res.weekends) + L(" · свят ", " · holidays ") + grp(res.holidays) + (r.swapped ? L(" · дати поміняно місцями", " · the dates were swapped") : ""), tiles, extraHtml: '<details class="ph__details ph__fold" data-keep="wdays"><summary>' + L("Скільки днів тижня в діапазоні", "How many of each weekday in the range") + '</summary><div class="ph__foldBody">' + UI.list([L("День тижня", "Weekday"), L("Кількість", "Count"), L("Тип", "Type")], rows, { w: "minmax(0, 1.3fr) 110px 130px" }) + "</div></details>" + warnHtml(warns), note: NOTE, steps, resText: dfmt(r.start) + " → " + dfmt(r.last) + ": " + grp(res.work) + " " + L("робочих днів з ", "working days of ") + grp(res.total) + " (" + L("вихідних ", "weekends ") + grp(res.weekends) + L(", свят ", ", holidays ") + grp(res.holidays) + ")" };
    },
    reset(h) { const { el } = h; setV(el, "dfA", ""); setV(el, "dfB", ""); el("dfW").value = "satsun"; el("dfI").value = "1"; el("dfH").value = ""; },
    fill(h) { const { el } = h; setV(el, "dfA", "2025-05-01"); setV(el, "dfB", "2025-05-31"); el("dfW").value = "satsun"; el("dfI").value = "1"; el("dfH").value = L("01.05.2025, 08.05.2025", "05/01/2025, 05/08/2025"); },
    share(p, h) { const { el } = h; shareD(p, el, () => { p.set("fw", el("dfW").value); const t = el("dfH").value.trim().replace(/\s+/g, " "); if (t) p.set("fh", t.slice(0, 600)); }); },
    apply(qs, h) { const { el } = h; applyD(qs, el); if (qs.has("fw") && Object.keys(F.WEEKENDS).includes(qs.get("fw"))) el("dfW").value = qs.get("fw"); if (qs.has("fh")) el("dfH").value = qs.get("fh").slice(0, 600); }
  };
  return { modes: [diff, work], exactNote: false };
});
