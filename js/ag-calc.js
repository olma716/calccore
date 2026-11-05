/* ag-calc.js — калькулятор віку: точний вік і дні народження, різниця у віці, круглі дати */
PhysCalc.start(({ L }) => {
  const A = window.Ag, UI = window.PhysUI;
  const SEP = L(",", ".");
  const fix = (x, d = 2) => x.toFixed(d).replace(".", SEP);
  const grp = A.grp;
  const NOTE = L("Розрахунок за григоріанським календарем: для дат до 1582 року (коли його запровадили) результат умовний, а для дат за юліанським календарем є окремий конвертер. Дні, тижні й місяці рахуються за календарними датами; години, хвилини й секунди показуються лише коли вказано час народження й рахуються за місцевим годинником без поправки на перехід на літній час.", "The calculation uses the Gregorian calendar: for dates before 1582 (when it was introduced) the result is nominal, and there is a separate converter for Julian dates. Days, weeks and months are counted by calendar dates; hours, minutes and seconds are shown only when a time of birth is given and use the local clock without a daylight saving adjustment.");
  const WD = L(["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"], ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
  const MG = L(["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"], ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
  const dfmt = (n) => { const p = A.parts(n); return L(p.d + " " + MG[p.m - 1] + " " + p.y, MG[p.m - 1] + " " + p.d + ", " + p.y); };
  // слово з множиною: uk — три форми, en — однина/множина
  const U = {
    y: (n) => L(A.pl(n, "рік", "роки", "років"), n === 1 ? "year" : "years"), mo: (n) => L(A.pl(n, "місяць", "місяці", "місяців"), n === 1 ? "month" : "months"),
    d: (n) => L(A.pl(n, "день", "дні", "днів"), n === 1 ? "day" : "days"), w: (n) => L(A.pl(n, "тиждень", "тижні", "тижнів"), n === 1 ? "week" : "weeks"),
    h: (n) => L(A.pl(n, "година", "години", "годин"), n === 1 ? "hour" : "hours"), mi: (n) => L(A.pl(n, "хвилина", "хвилини", "хвилин"), n === 1 ? "minute" : "minutes"),
    s: (n) => L(A.pl(n, "секунда", "секунди", "секунд"), n === 1 ? "second" : "seconds")
  };
  const ymdText = (r, full) => { const ps = []; if (r.years || full) ps.push(r.years + " " + U.y(r.years)); if (r.months || (full && r.years)) ps.push(r.months + " " + U.mo(r.months)); if (r.days || !ps.length) ps.push(r.days + " " + U.d(r.days)); return ps.join(" "); };
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const dateF = (id, label, full, def) => fld(id, label, '<input class="ph__input" type="date" id="' + id + '" min="1000-01-01" max="2999-12-31"' + (def ? ' data-default-label="' + L("Сьогодні", "Today") + '"' : "") + ' aria-label="' + id + '">', full);
  const timeF = (id, label, full) => fld(id, label, '<input class="ph__input" type="text" inputmode="numeric" autocomplete="off" maxlength="5" id="' + id + '" placeholder="' + L("гг:хх", "hh:mm") + '" aria-label="' + id + '">', full);
  const inp = (id, ph, ml) => '<input class="ph__input" id="' + id + '" type="text" inputmode="numeric" autocomplete="off" maxlength="' + (ml || 10) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const warnHtml = (ws) => ws.map((t) => hint("⚠ " + t)).join("");
  const show = (el, id, on) => { const e = el(id + "W"); if (e) e.style.display = on ? "" : "none"; };
  const setV = (el, id, v) => { const e = el(id); if (!e) return; e.value = v; e.dispatchEvent(new Event("change", { bubbles: true })); };
  const policyF = () => fld("agP", L("Народжений(а) 29 лютого: річниця в невисокосний рік", "Born on 29 February: anniversary in a non-leap year"), sel("agP", [["feb28", L("28 лютого", "28 February")], ["mar1", L("1 березня", "1 March")]], "feb28"), true);
  const isFeb29 = (el, id) => { const n = A.parseISO(el(id).value); if (n === null) return false; const p = A.parts(n); return p.m === 2 && p.d === 29; };
  const dateWarn = (b) => (A.parts(b).y < 1583 ? [L("До 1582 року в Європі діяв юліанський календар: результат рахується за григоріанським календарем, тому для таких дат він умовний.", "Before 1582 Europe used the Julian calendar: the result is calculated with the Gregorian calendar, so for such dates it is nominal.")] : []);
  const readDate = (el, id, name, optionalToday) => {
    const s = el(id).value.trim();
    if (!s) return optionalToday ? { v: A.todayDn() } : null;
    const n = A.parseISO(s); if (n === null) return { err: L(name + " — коректна дата.", name + " must be a valid date.") };
    return { v: n };
  };
  // час доби (необов'язковий): порожньо або неповно — не задано; чотири цифри мають бути коректним часом
  const readTime = (el, id) => {
    const e = el(id); if (!e) return null;
    const d = e.value.replace(/\D/g, "");
    if (d.length < 4) return null;
    const v = A.parseTime(d);
    return v === null ? { err: L("Час — у форматі гг:хх (години 00–23, хвилини 00–59).", "Time — in the hh:mm format (hours 00–23, minutes 00–59).") } : { v };
  };
  const timeOk = (el, id) => { const r = readTime(el, id); return !!(r && !r.err); };
  const hm = (sec) => A.hms(sec).slice(0, 5);
  const fmtTimeInput = (v) => String(v).replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d{2})$/, "$1:$2");
  const bindDates = (el, maybeCalc, ids, extra) => { ids.forEach((id) => { el(id).addEventListener("input", () => { extra && extra(); maybeCalc(); }); el(id).addEventListener("change", () => { extra && extra(); maybeCalc(); }); }); };
  const bindTime = (el, id, maybeCalc, extra) => el(id).addEventListener("input", () => { const e = el(id), d = e.value.replace(/\D/g, "").slice(0, 4), m = d.length > 2 ? d.slice(0, 2) + ":" + d.slice(2) : d; if (e.value !== m) e.value = m; extra && extra(); maybeCalc(); });
  const bdayTable = (rows, t) => UI.list([L("Вік", "Age"), L("Дата", "Date"), L("День тижня", "Weekday"), L("Через", "In")], rows.map((r, i) => ({ main: i === 0, cells: [{ t: String(r.age), cls: "is-first" }, { t: dfmt(r.date), cls: "chip" }, WD[r.wd], r.left === 0 ? L("сьогодні", "today") : grp(r.left) + " " + U.d(r.left)] })), { w: "70px minmax(0, 1.3fr) 130px 130px" });

  // ----- мій вік -----
  const age = {
    key: "age", type: "custom", req: ({ el }) => ["agB"], nameUk: "Мій вік", nameEn: "My age",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + dateF("agB", L("Дата народження", "Date of birth")) + timeF("agBt", L("Час народження (необов'язково)", "Time of birth (optional)")) + dateF("agT", L("Розрахувати на дату", "Calculate on"), false, true) + timeF("agTt", L("Час на цю дату (необов'язково)", "Time on that date (optional)")) + policyF() + '</div><div class="ph__hint ph__mt12">' + L("Вік на дату — за замовчуванням сьогодні. Якщо вказати час народження, додатково з'являться години, хвилини й секунди (на «Сьогодні» — на поточний момент, на іншу дату — на 00:00, якщо не вказати свій час).", "The age is calculated on a date — today by default. If you give a time of birth, hours, minutes and seconds also appear (for “Today” — at the current moment, for another date — at 00:00 unless you give a time).") + "</div>";
      const sync = () => { show(el, "agP", isFeb29(el, "agB")); show(el, "agTt", timeOk(el, "agBt")); };
      setV(el, "agT", ""); el("agP").addEventListener("change", maybeCalc); bindDates(el, maybeCalc, ["agB", "agT"], sync); bindTime(el, "agBt", maybeCalc, sync); bindTime(el, "agTt", maybeCalc); sync();
    },
    calc(h) {
      const { el } = h, bd = readDate(el, "agB", L("Дата народження", "Date of birth")), on = readDate(el, "agT", L("Дата розрахунку", "Calculation date"), true), bt = readTime(el, "agBt"), tt = readTime(el, "agTt");
      if (bd && bd.err) return { ok: false, msg: bd.err };
      if (on.err) return { ok: false, msg: on.err };
      if (bt && bt.err) return { ok: false, msg: bt.err };
      if (tt && tt.err && bt) return { ok: false, msg: tt.err };
      if (!bd) return { ok: false, incomplete: true };
      if (bd.v > on.v) return { ok: false, msg: L("Дата народження має бути не пізніше за дату розрахунку.", "The date of birth must not be later than the calculation date.") };
      const t0 = bt ? bt.v : null, onDefault = !el("agT").value.trim(), ownT = !!(tt && !tt.err), tOn = t0 === null ? null : ownT ? tt.v : onDefault ? A.nowSeconds() : 0, exact = t0 === null ? null : A.secondsBetween(bd.v, t0, on.v, tOn);
      if (exact !== null && exact < 0) return { ok: false, msg: L("Момент розрахунку раніше за момент народження: перевірте час.", "The calculation moment is earlier than the moment of birth: check the time.") };
      const pol = el("agP").value, r = A.ymd(bd.v, on.v, pol), days = on.v - bd.v, weeks = Math.floor(days / 7), tm = r.years * 12 + r.months, nb = A.nextBirthday(bd.v, on.v, pol), bwd = A.parts(bd.v).wd, warns = dateWarn(bd.v);
      if (on.v > A.todayDn()) warns.push(L("Це розрахунок на майбутню дату: вік показано таким, яким він буде в цей день.", "This is a calculation for a future date: the age shown is what it will be on that day."));
      const tiles = [{ k: L("Усього місяців", "Total months"), v: grp(tm) }, { k: L("Усього тижнів", "Total weeks"), v: grp(weeks) + " " + U.w(weeks) + (days % 7 ? " " + (days % 7) + " " + U.d(days % 7) : "") }, { k: L("Усього днів", "Total days"), v: grp(days) }];
      if (exact !== null) tiles.push({ k: L("Усього годин", "Total hours"), v: grp(Math.floor(exact / 3600)) }, { k: L("Усього хвилин", "Total minutes"), v: grp(Math.floor(exact / 60)) }, { k: L("Усього секунд", "Total seconds"), v: grp(exact) });
      tiles.push({ k: L("Народжений(а) у", "Born on a"), v: WD[bwd] + (t0 !== null ? ", " + hm(t0) : "") }, { k: L("Наступний день народження", "Next birthday"), v: dfmt(nb.date) }, { k: L("Буде років", "Turning"), v: nb.age + " " + U.y(nb.age) });
      const steps = [{ t: L("Повні роки", "Whole years"), l: [L("остання річниця — ", "the last anniversary — ") + dfmt(r.a) + " (" + r.years + " " + U.y(r.years) + ")"] }, { t: L("Повні місяці", "Whole months"), l: [L("від ", "from ") + dfmt(r.a) + L(" додаємо ", " adding ") + r.months + " " + U.mo(r.months) + " → " + dfmt(r.anchor)], note: L("Якщо в місяці немає такого числа, береться його останній день (31 січня + 1 місяць = 28 лютого).", "If the month has no such day its last day is used (31 January + 1 month = 28 February).") }, { t: L("Дні", "Days"), l: [dfmt(on.v) + " − " + dfmt(r.anchor) + " = " + r.days + " " + U.d(r.days)] }, { t: L("Усього днів", "Total days"), l: [dfmt(on.v) + " − " + dfmt(bd.v) + " = " + grp(days)], note: L("Різниця дат у днях рахується за UTC, тож перехід на літній час не впливає.", "The difference in days is calculated in UTC, so daylight saving time does not affect it.") }];
      if (exact !== null) steps.push({ t: L("Години, хвилини, секунди", "Hours, minutes, seconds"), l: [L("від ", "from ") + dfmt(bd.v) + ", " + hm(t0) + L(" до ", " to ") + dfmt(on.v) + ", " + A.hms(tOn), "= " + grp(exact) + " " + U.s(exact)], note: L("Час за місцевим годинником без поправки на перехід на літній час.", "Time by the local clock without a daylight saving adjustment.") + (onDefault && !ownT ? L(" Для «Сьогодні» — поточний момент.", " For “Today” — the current moment.") : "") });
      return { ok: true, expr: dfmt(bd.v) + (t0 !== null ? ", " + hm(t0) : "") + " → " + dfmt(on.v) + (tOn !== null ? ", " + A.hms(tOn) : ""), head: [L("вік", "age"), ymdText(r)], subRaw: true, headSub: L("Прожито ", "Lived ") + grp(days) + " " + U.d(days) + (nb.today ? L(" · сьогодні день народження!", " · today is the birthday!") : L(" · до дня народження ", " · until the birthday ") + grp(nb.left) + " " + U.d(nb.left)), tiles, extraHtml: '<details class="ph__details ph__fold" data-keep="bdays"><summary>' + L("Найближчі дні народження (10)", "Upcoming birthdays (10)") + '</summary><div class="ph__foldBody">' + bdayTable(A.upcoming(bd.v, on.v, 10, pol), on.v) + "</div></details>" + warnHtml(warns), note: NOTE, steps, resText: L("Вік на ", "Age on ") + dfmt(on.v) + ": " + ymdText(r) + L("; прожито ", "; lived ") + grp(days) + " " + U.d(days) + (exact !== null ? L(", усього секунд ", ", total seconds ") + grp(exact) : "") };
    },
    reset(h) { const { el } = h; setV(el, "agB", ""); setV(el, "agT", ""); setV(el, "agP", "feb28"); el("agBt").value = ""; el("agTt").value = ""; show(el, "agP", false); show(el, "agTt", false); },
    fill(h) { const { el } = h; setV(el, "agB", "1990-06-15"); setV(el, "agT", "2025-03-10"); setV(el, "agP", "feb28"); el("agBt").value = ""; el("agTt").value = ""; show(el, "agP", false); show(el, "agTt", false); },
    share(p, h) { const { el } = h; if (!el("agB").value) return; p.set("bd", el("agB").value); if (timeOk(el, "agBt")) p.set("bt", el("agBt").value); if (el("agT").value) p.set("on", el("agT").value); if (timeOk(el, "agBt") && timeOk(el, "agTt")) p.set("tt", el("agTt").value); if (isFeb29(el, "agB")) p.set("fp", el("agP").value); },
    apply(qs, h) { const { el } = h; if (qs.has("bd") && A.parseISO(qs.get("bd")) !== null) setV(el, "agB", qs.get("bd")); if (qs.has("bt") && A.parseTime(qs.get("bt")) !== null) el("agBt").value = fmtTimeInput(qs.get("bt")); if (qs.has("on") && A.parseISO(qs.get("on")) !== null) setV(el, "agT", qs.get("on")); if (qs.has("tt") && A.parseTime(qs.get("tt")) !== null) el("agTt").value = fmtTimeInput(qs.get("tt")); if (qs.has("fp") && ["feb28", "mar1"].includes(qs.get("fp"))) setV(el, "agP", qs.get("fp")); show(el, "agP", isFeb29(el, "agB")); show(el, "agTt", timeOk(el, "agBt")); }
  };

  // ----- різниця у віці -----
  const gap = {
    key: "gap", type: "custom", req: ({ el }) => ["agA", "agB2"], nameUk: "Різниця у віці", nameEn: "Age gap",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + dateF("agA", L("Дата народження першої людини", "First person's date of birth")) + dateF("agB2", L("Дата народження другої людини", "Second person's date of birth")) + dateF("agT", L("Показати вік на дату", "Show ages on"), true, true) + '</div><div class="ph__hint ph__mt12">' + L("Калькулятор покаже, хто старший і на скільки, а також вік кожного на вибрану дату.", "The calculator shows who is older and by how much, as well as each person's age on the chosen date.") + "</div>";
      setV(el, "agT", ""); bindDates(el, maybeCalc, ["agA", "agB2", "agT"]);
    },
    calc(h) {
      const { el } = h, a = readDate(el, "agA", L("Дата народження першої людини", "The first date of birth")), b = readDate(el, "agB2", L("Дата народження другої людини", "The second date of birth")), on = readDate(el, "agT", L("Дата", "Date"), true);
      for (const v of [a, b, on]) if (v && v.err) return { ok: false, msg: v.err };
      if (!a || !b) return { ok: false, incomplete: true };
      if (a.v > on.v || b.v > on.v) return { ok: false, msg: L("Дата народження має бути не пізніше за дату, на яку рахується вік.", "A date of birth must not be later than the date the age is calculated on.") };
      const first = a.v <= b.v ? a.v : b.v, second = a.v <= b.v ? b.v : a.v, g = A.ymd(first, second, "feb28"), gd = second - first, olderIsFirst = a.v < b.v, same = a.v === b.v;
      const ra = A.ymd(a.v, on.v, "feb28"), rb = A.ymd(b.v, on.v, "feb28"), da = on.v - a.v, db = on.v - b.v, warns = dateWarn(Math.min(a.v, b.v));
      const tiles = [{ k: L("Різниця в днях", "Gap in days"), v: grp(gd) }, { k: L("Різниця в тижнях", "Gap in weeks"), v: grp(Math.floor(gd / 7)) + " " + U.w(Math.floor(gd / 7)) + (gd % 7 ? " " + (gd % 7) + " " + U.d(gd % 7) : "") }, { k: L("Різниця в місяцях", "Gap in months"), v: grp(g.years * 12 + g.months) + (g.days ? " + " + g.days + " " + U.d(g.days) : "") }, { k: L("Вік першої людини", "First person's age"), v: ymdText(ra) }, { k: L("Вік другої людини", "Second person's age"), v: ymdText(rb) }].concat(da > 0 && db > 0 ? [{ k: L("Відношення віків", "Age ratio"), v: fix(Math.max(da, db) / Math.min(da, db), 3) }] : []);
      const steps = [{ t: L("Різниця між датами народження", "Gap between the dates of birth"), l: [dfmt(first) + " → " + dfmt(second) + " = " + ymdText(g) + " (" + grp(gd) + " " + U.d(gd) + ")"] }];
      return { ok: true, expr: dfmt(a.v) + " · " + dfmt(b.v), head: [L("різниця у віці", "age gap"), same ? L("0 днів", "0 days") : ymdText(g)], subRaw: true, headSub: same ? L("Ви однолітки: народилися в один день", "Born on the same day") : (olderIsFirst ? L("Перша людина старша за другу", "The first person is older than the second") : L("Друга людина старша за першу", "The second person is older than the first")), tiles, extraHtml: warnHtml(warns), note: NOTE, steps, resText: L("Різниця у віці: ", "Age gap: ") + (same ? L("0 днів", "0 days") : ymdText(g) + " (" + grp(gd) + " " + U.d(gd) + ")") };
    },
    reset(h) { const { el } = h; setV(el, "agA", ""); setV(el, "agB2", ""); setV(el, "agT", ""); },
    fill(h) { const { el } = h; setV(el, "agA", "1990-06-15"); setV(el, "agB2", "1994-02-28"); setV(el, "agT", "2025-03-10"); },
    share(p, h) { const { el } = h; if (!el("agA").value || !el("agB2").value) return; p.set("pa", el("agA").value); p.set("pb", el("agB2").value); if (el("agT").value) p.set("on", el("agT").value); },
    apply(qs, h) { const { el } = h; [["pa", "agA"], ["pb", "agB2"], ["on", "agT"]].forEach(([k, id]) => { if (qs.has(k) && A.parseISO(qs.get(k)) !== null) setV(el, id, qs.get(k)); }); }
  };

  // ----- круглі дати -----
  const KINDS = ["days", "weeks", "months", "years", "hours", "seconds"], LIM = { days: 60000, weeks: 9000, months: 1500, years: 150, hours: 1500000, seconds: 4000000000 };
  const kName = (k, n) => ({ days: U.d(n), weeks: U.w(n), months: U.mo(n), years: U.y(n), hours: U.h(n), seconds: U.s(n) })[k];
  const kOpts = () => [["days", L("Днів", "Days")], ["weeks", L("Тижнів", "Weeks")], ["months", L("Місяців", "Months")], ["years", L("Років", "Years")], ["hours", L("Годин (потрібен час народження)", "Hours (needs a time of birth)")], ["seconds", L("Секунд (потрібен час народження)", "Seconds (needs a time of birth)")]];
  const LIST = [["days", [5000, 10000, 15000, 20000, 25000, 30000]], ["weeks", [1000, 2000, 3000]], ["months", [250, 500, 750]], ["hours", [100000, 200000, 500000]], ["seconds", [500000000, 1000000000, 1500000000, 2000000000]]];
  const mrow = (b, kind, n, pol, t, t0) => { const m = A.milestone(b, kind, n, pol, t0); return m ? { kind, n, date: m.date, time: m.time, left: m.date - t } : null; };
  const tstr = (r) => (r.time === undefined ? "" : r.kind === "hours" || r.kind === "seconds" ? A.hms(r.time) : hm(r.time));
  const milestone = {
    key: "mile", type: "custom", req: ({ el }) => ["agB"], nameUk: "Круглі дати", nameEn: "Round dates",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + dateF("agB", L("Дата народження", "Date of birth")) + timeF("agBt", L("Час народження (необов'язково)", "Time of birth (optional)")) + dateF("agT", L("Рахувати від дати", "Count from"), false, true) + fld("agN", L("Своя величина (необов'язково)", "Your own amount (optional)"), inp("agN", L("напр.: 10000", "e.g.: 10000"))) + fld("agK", L("Одиниця", "Unit"), sel("agK", kOpts(), "days")) + policyF() + '</div><div class="ph__hint ph__mt12">' + L("Калькулятор знайде дати, коли вам виповниться кругла кількість днів, тижнів, місяців чи років, а також дату для вашої величини. Години й секунди (і точний час доби) з'являються лише коли вказано час народження.", "The calculator finds the dates when you reach a round number of days, weeks, months or years, as well as the date for your own amount. Hours and seconds (and the exact time of day) appear only when a time of birth is given.") + "</div>";
      setV(el, "agT", ""); bindDates(el, maybeCalc, ["agB", "agT"], () => show(el, "agP", isFeb29(el, "agB"))); bindTime(el, "agBt", maybeCalc); el("agN").addEventListener("input", maybeCalc); ["agK", "agP"].forEach((id) => el(id).addEventListener("change", maybeCalc)); show(el, "agP", false);
    },
    calc(h) {
      const { el } = h, bd = readDate(el, "agB", L("Дата народження", "Date of birth")), on = readDate(el, "agT", L("Дата", "Date"), true), bt = readTime(el, "agBt");
      if (bd && bd.err) return { ok: false, msg: bd.err };
      if (on.err) return { ok: false, msg: on.err };
      if (bt && bt.err) return { ok: false, msg: bt.err };
      if (!bd) return { ok: false, incomplete: true };
      if (bd.v > on.v) return { ok: false, msg: L("Дата народження має бути не пізніше за дату, від якої рахуємо.", "The date of birth must not be later than the date you count from.") };
      const t0 = bt ? bt.v : null, pol = el("agP").value, warns = dateWarn(bd.v), ns = el("agN").value.trim(), kind = el("agK").value;
      let own = null;
      if (ns) {
        if (!/^\d{1,10}$/.test(ns.replace(/\s+/g, "")) || Number(ns.replace(/\s+/g, "")) < 1) return { ok: false, msg: L("Своя величина — додатне ціле число.", "Your own amount is a positive whole number.") };
        const n = Number(ns.replace(/\s+/g, ""));
        if (n > LIM[kind]) return { ok: false, msg: L("Своя величина для цієї одиниці — до " + grp(LIM[kind]) + ".", "Your own amount for this unit is up to " + grp(LIM[kind]) + ".") };
        if ((kind === "hours" || kind === "seconds") && t0 === null) return { ok: false, msg: L("Для годин і секунд вкажіть час народження.", "For hours and seconds give a time of birth.") };
        own = mrow(bd.v, kind, n, pol, on.v, t0);
      }
      const rows = []; LIST.forEach(([k, ns2]) => ns2.forEach((n) => { const r = mrow(bd.v, k, n, pol, on.v, t0); if (r && A.parts(r.date).y <= A.parts(bd.v).y + 130) rows.push(r); }));
      rows.sort((a, b) => a.date - b.date || (a.time || 0) - (b.time || 0));
      const nextRow = rows.find((r) => r.left >= 0), label = (r) => grp(r.n) + " " + kName(r.kind, r.n);
      const when = (r) => dfmt(r.date) + (r.time !== undefined ? ", " + tstr(r) : ""), status = (r) => (r.left === 0 ? L("сьогодні", "today") : r.left > 0 ? L("через ", "in ") + grp(r.left) + " " + U.d(r.left) : grp(-r.left) + " " + U.d(-r.left) + L(" тому", " ago"));
      const list = UI.list([L("Круглий рубіж", "Milestone"), L("Дата", "Date"), L("День тижня", "Weekday"), L("Коли", "When")], rows.map((r) => ({ main: nextRow && r === nextRow, cells: [{ t: label(r), cls: "is-first" }, { t: dfmt(r.date), cls: "chip" }, WD[A.parts(r.date).wd] + (r.time !== undefined ? ", " + tstr(r) : ""), status(r)] })), { w: "minmax(0, 1.2fr) minmax(0, 1.2fr) 190px 140px" });
      const head = own ? [grp(own.n) + " " + kName(own.kind, own.n), when(own)] : nextRow ? [L("найближча: ", "next: ") + label(nextRow), when(nextRow)] : [L("наступних рубежів немає", "no more milestones"), "—"];
      const sub = own ? WD[A.parts(own.date).wd] + " · " + status(own) : nextRow ? WD[A.parts(nextRow.date).wd] + " · " + status(nextRow) : "";
      const tiles = own ? [{ k: L("Дата", "Date"), v: dfmt(own.date) }, { k: L("День тижня", "Weekday"), v: WD[A.parts(own.date).wd] }, { k: L("Коли", "When"), v: status(own) }].concat(own.time !== undefined ? [{ k: L("Час доби", "Time of day"), v: tstr(own) }] : []) : [];
      const steps = [{ t: L("Як рахуються рубежі", "How the milestones are counted"), l: [L("дні й тижні додаються до дати народження, місяці — з обмеженням по кінцю місяця; години й секунди рахуються від моменту народження", "days and weeks are added to the date of birth, months — with the end-of-month limit; hours and seconds are counted from the moment of birth")] }];
      const noTime = t0 === null ? L("Без часу народження години й секунди не показуються: вкажіть час, щоб побачити їх.", "Without a time of birth hours and seconds are not shown: give a time to see them.") : "";
      return { ok: true, expr: dfmt(bd.v) + (t0 !== null ? ", " + hm(t0) : ""), head, subRaw: true, headSub: sub, tiles, extraHtml: '<div class="ph__sub">' + L("Круглі дати життя", "Round dates of your life") + "</div>" + list + (noTime ? hint(noTime) : "") + warnHtml(warns), note: NOTE, steps, resText: head[0] + ": " + head[1] + (sub ? " (" + sub + ")" : "") };
    },
    reset(h) { const { el } = h; setV(el, "agB", ""); setV(el, "agT", ""); setV(el, "agN", ""); setV(el, "agK", "days"); setV(el, "agP", "feb28"); el("agBt").value = ""; show(el, "agP", false); },
    fill(h) { const { el } = h; setV(el, "agB", "1990-06-15"); setV(el, "agT", "2025-03-10"); setV(el, "agN", "15000"); setV(el, "agK", "days"); setV(el, "agP", "feb28"); el("agBt").value = ""; show(el, "agP", false); },
    share(p, h) { const { el } = h; if (!el("agB").value) return; p.set("bd", el("agB").value); if (timeOk(el, "agBt")) p.set("bt", el("agBt").value); if (el("agT").value) p.set("on", el("agT").value); if (el("agN").value.trim()) { p.set("nn", el("agN").value.trim()); p.set("nu", el("agK").value); } if (isFeb29(el, "agB")) p.set("fp", el("agP").value); },
    apply(qs, h) { const { el } = h; if (qs.has("bd") && A.parseISO(qs.get("bd")) !== null) setV(el, "agB", qs.get("bd")); if (qs.has("bt") && A.parseTime(qs.get("bt")) !== null) el("agBt").value = fmtTimeInput(qs.get("bt")); if (qs.has("on") && A.parseISO(qs.get("on")) !== null) setV(el, "agT", qs.get("on")); if (qs.has("nn")) el("agN").value = qs.get("nn").slice(0, 10); if (qs.has("nu") && KINDS.includes(qs.get("nu"))) el("agK").value = qs.get("nu"); if (qs.has("fp") && ["feb28", "mar1"].includes(qs.get("fp"))) setV(el, "agP", qs.get("fp")); show(el, "agP", isFeb29(el, "agB")); }
  };
  return { modes: [age, gap, milestone], exactNote: false };
});
