/* due-date-calculator.js — калькулятор дати пологів: ПДМ (з довжиною циклу), зачаття, ЕКЗ, УЗД (UK/EN)
   Усі дати — цілі числа днів (UTC), тому перехід на літній/зимовий час не зсуває результат.
   Початок «акушерського» терміну ga0 = очікувана дата пологів − 280 днів:
     ПДМ:      ПДП = ПДМ + 280 + (цикл − 28)            (правило Негеле з поправкою на цикл)
     Зачаття:  ПДП = зачаття + 266
     ЕКЗ:      ПДП = перенос + 266 − вік ембріона (3, 5 або 6 діб)
     УЗД:      ПДП = дата УЗД − термін на УЗД + 280
   Порівняння ПДМ і УЗД: поріг розбіжності для перегляду терміну за ACOG (за терміном на УЗД):
     до 8 тиж 6 дн — 5 днів; 9 тиж 0 дн – 15 тиж 6 дн — 7; 16 тиж 0 дн – 21 тиж 6 дн — 10; 22 тиж 0 дн – 27 тиж 6 дн — 14; від 28 тиж — 21. */
(() => {
  const el = (id) => document.getElementById(id);
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const LOCALE = IS_EN ? "en-US" : "uk-UA";

  const MONTHS = IS_EN
    ? ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
    : ["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"];
  const WEEKDAYS = IS_EN
    ? ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    : ["неділя", "понеділок", "вівторок", "середа", "четвер", "пʼятниця", "субота"];

  const T = IS_EN
    ? {
        enter: "Enter a date — the result will appear here.",
        missing: "To calculate, fill in: {list}.",
        lblLmp: "the first day of the last period", lblConc: "the conception date", lblIvf: "the transfer date", lblUs: "the scan date and the gestational age on it", lblCmp: "the scan date and the gestational age on it (comparison)",
        errDate: "Enter a valid date.",
        errFuture: "This date is in the future — check it.",
        errOld: "More than 43 weeks have passed since this date — check it.",
        errIvfFuture: "The transfer date can be at most 90 days ahead.",
        errCycle: "Cycle length must be a whole number from 21 to 45 days.",
        errUsW: "Gestational age on the scan: weeks from 4 to 42 (whole number) and days from 0 to 6.",
        errCmpFuture: "The comparison scan date is in the future.",
        errCmpAge: "The comparison scan is more than 43 weeks before today — check it.",
        mainTitle: "Estimated due date", mainMini: "{wd} · 40 weeks",
        nowTitle: "Gestational age now", nowMini: "{tri} trimester · obstetric month {m} ({c} completed)", nowFuture: "not started yet",
        leftTitle: "Days left", leftMini: "≈ {w}", leftToday: "today is the due date", leftPast: "{n} d past the due date",
        winTitle: "Likely birth window", winMini: "37–42 weeks",
        leaveTitle: "Maternity leave from", leaveMini: "70 days before the birth (30 weeks)",
        concTitle: "Approximate conception", concMini: "≈ 2 weeks after the cycle start",
        trimNames: ["1st", "2nd", "3rd"],
        chartTitle: "Pregnancy timeline",
        thEvent: "Event", thAge: "Gestational age", thDate: "Date", thStatus: "Status",
        mConc: "Approximate conception", mScreen1: "First-trimester screening window", mT2: "2nd trimester starts", mAnat: "Anatomy scan window", mT3: "3rd trimester starts",
        mLeave: "Maternity leave can start", mTerm: "Full-term pregnancy starts (37 weeks)", mEdd: "Due date", mPost: "42 weeks: post-term", mLeaveEnd: "Maternity leave ends (56 days after the birth)",
        stPast: "passed", stNow: "now", stToday: "today", stIn: "in {n} d",
        cmpTitle: "Comparison with the ultrasound", cmpSame: "The dates match.",
        cmpBig: "The difference of {n} d is more than {thr} d: guidelines (ACOG) usually suggest dating by the ultrasound — the due date would be {d}. The doctor makes the final decision.",
        cmpSmall: "The difference of {n} d is within {thr} d: the due date is usually kept as calculated here.",
        note: "An estimate for information only: it does not replace a doctor’s consultation. Only about 4–5% of babies are born on the calculated day; most births happen between 37 and 42 weeks.",
        wk: "{n} wk", dy: "{n} d",
        linkCopied: "Link copied ✅", copyFailed: "Could not copy 😕", reset: "Reset ✅", example: "Example filled in ✅", tableCopied: "Table copied ✅", csvDone: "CSV downloaded ✅", resultCopied: "Result copied ✅"
      }
    : {
        enter: "Вкажіть дату — результат зʼявиться тут.",
        missing: "Щоб розрахувати, заповніть: {list}.",
        lblLmp: "перший день останньої менструації", lblConc: "дату зачаття", lblIvf: "дату переносу", lblUs: "дату УЗД і термін на ньому", lblCmp: "дату УЗД і термін на ньому (порівняння)",
        errDate: "Вкажіть коректну дату.",
        errFuture: "Ця дата в майбутньому — перевірте її.",
        errOld: "Від цієї дати минуло понад 43 тижні — перевірте її.",
        errIvfFuture: "Дата переносу може бути не далі ніж за 90 днів уперед.",
        errCycle: "Довжина циклу — ціле число від 21 до 45 днів.",
        errUsW: "Термін на УЗД: тижні від 4 до 42 (ціле число), дні від 0 до 6.",
        errCmpFuture: "Дата УЗД для порівняння в майбутньому.",
        errCmpAge: "УЗД для порівняння було понад 43 тижні тому — перевірте дату.",
        mainTitle: "Орієнтовна дата пологів", mainMini: "{wd} · 40 тижнів",
        nowTitle: "Термін зараз", nowMini: "{tri} триместр · {m}-й акушерський місяць ({c} повних)", nowFuture: "ще не настав",
        leftTitle: "Залишилось днів", leftMini: "≈ {w}", leftToday: "сьогодні розрахована дата", leftPast: "{n} дн після розрахованої дати",
        winTitle: "Найімовірніші пологи", winMini: "37–42 тижні",
        leaveTitle: "Декретна відпустка з", leaveMini: "за 70 днів до пологів (30 тижнів)",
        concTitle: "Орієнтовне зачаття", concMini: "≈ через 2 тижні після початку циклу",
        trimNames: ["1-й", "2-й", "3-й"],
        chartTitle: "Шкала вагітності",
        thEvent: "Подія", thAge: "Термін", thDate: "Дата", thStatus: "Статус",
        mConc: "Орієнтовне зачаття", mScreen1: "Вікно скринінгу 1-го триместру", mT2: "Початок 2-го триместру", mAnat: "Вікно анатомічного УЗД", mT3: "Початок 3-го триместру",
        mLeave: "Можна оформити декретну відпустку", mTerm: "Повний термін (37 тижнів)", mEdd: "Дата пологів", mPost: "42 тижні: переношування", mLeaveEnd: "Кінець декретної відпустки (56 днів після пологів)",
        stPast: "минуло", stNow: "триває", stToday: "сьогодні", stIn: "через {n} дн",
        cmpTitle: "Порівняння з УЗД", cmpSame: "Дати збігаються.",
        cmpBig: "Розбіжність {n} дн перевищує {thr} дн: за рекомендаціями (ACOG) термін зазвичай переглядають за УЗД — дата пологів була б {d}. Остаточне рішення приймає лікар.",
        cmpSmall: "Розбіжність {n} дн не перевищує {thr} дн: дату зазвичай лишають такою, як розраховано тут.",
        note: "Орієнтовна оцінка лише для інформації: вона не замінює консультацію лікаря. Лише близько 4–5% дітей народжуються точно в розрахований день; більшість пологів припадає на 37–42 тиждень.",
        wk: "{n} тиж", dy: "{n} дн",
        linkCopied: "Посилання скопійовано ✅", copyFailed: "Не вдалось скопіювати 😕", reset: "Скинуто ✅", example: "Підставлено приклад ✅", tableCopied: "Таблицю скопійовано ✅", csvDone: "CSV завантажено ✅", resultCopied: "Результат скопійовано ✅"
      };

  // ===== helpers =====
  const fill = (s, vars) => String(s).replace(/\{(\w+)\}/g, (_, k) => (vars && vars[k] !== undefined ? vars[k] : ""));
  const blank = (id) => (el(id)?.value || "").trim() === "";
  const wkd = (days) => {
    const w = Math.floor(days / 7), d = days % 7;
    return fill(T.wk, { n: w }) + (d ? " " + fill(T.dy, { n: d }) : "");
  };
  function toast(msg) {
    const n = el("toast");
    if (!n) return;
    n.textContent = msg;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => (n.textContent = ""), 2400);
  }
  const wholeInt = (v) => {
    const s = String(v ?? "").trim();
    return /^\d{1,3}$/.test(s) ? Number(s) : NaN;
  };

  // ===== дати як цілі числа днів (UTC) =====
  const DAY = 86400000;
  const dnOf = (y, m, d) => Math.round(Date.UTC(y, m - 1, d) / DAY);
  function parseISO(s) {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || "").trim());
    if (!m) return null;
    const y = +m[1], mo = +m[2], d = +m[3];
    if (y < 1990 || y > 2100) return null;
    const n = dnOf(y, mo, d), chk = new Date(n * DAY);
    return chk.getUTCFullYear() === y && chk.getUTCMonth() === mo - 1 && chk.getUTCDate() === d ? n : null;
  }
  const isoOf = (n) => new Date(n * DAY).toISOString().slice(0, 10);
  const todayDn = () => {
    const t = new Date();
    return dnOf(t.getFullYear(), t.getMonth() + 1, t.getDate());
  };
  const dparts = (n) => {
    const d = new Date(n * DAY);
    return { y: d.getUTCFullYear(), m: d.getUTCMonth(), d: d.getUTCDate(), wd: d.getUTCDay() };
  };
  const fmtDate = (n) => {
    const p = dparts(n);
    return IS_EN ? MONTHS[p.m] + " " + p.d + ", " + p.y : p.d + " " + MONTHS[p.m] + " " + p.y;
  };
  const fmtDay = (n) => {
    const p = dparts(n);
    return IS_EN ? MONTHS[p.m] + " " + p.d : p.d + " " + MONTHS[p.m];
  };
  const fmtRange = (a, b) => {
    const pa = dparts(a), pb = dparts(b);
    return pa.y === pb.y ? fmtDay(a) + " – " + fmtDate(b) : fmtDate(a) + " – " + fmtDate(b);
  };
  const weekdayOf = (n) => WEEKDAYS[dparts(n).wd];

  const state = { mode: "lmp", emb: 5 };

  // ===== розрахунок =====
  function dateField(id, label, miss) {
    if (blank(id)) {
      miss.push(label);
      return null;
    }
    const n = parseISO(el(id).value);
    return n == null ? undefined : n;
  }

  function compute() {
    const today = todayDn();
    const miss = [];
    let ga0, primary;
    if (state.mode === "lmp") {
      const d = dateField("lmpDate", T.lblLmp, miss);
      if (miss.length) return missing(["lmpDate", "cycle"]);
      if (d === undefined) return { ok: false, msg: T.errDate };
      let cycle = 28;
      if (!blank("cycle")) {
        cycle = wholeInt(el("cycle").value);
        if (!(cycle >= 21 && cycle <= 45)) return { ok: false, msg: T.errCycle };
      }
      if (d > today) return { ok: false, msg: T.errFuture };
      ga0 = d + (cycle - 28);
      primary = { start: d, cycle };
    } else if (state.mode === "conc") {
      const d = dateField("concDate", T.lblConc, miss);
      if (miss.length) return missing(["concDate"]);
      if (d === undefined) return { ok: false, msg: T.errDate };
      if (d > today) return { ok: false, msg: T.errFuture };
      ga0 = d - 14;
      primary = { start: d };
    } else if (state.mode === "ivf") {
      const d = dateField("ivfDate", T.lblIvf, miss);
      if (miss.length) return missing(["ivfDate"]);
      if (d === undefined) return { ok: false, msg: T.errDate };
      if (d > today + 90) return { ok: false, msg: T.errIvfFuture };
      ga0 = d - 14 - state.emb;
      primary = { start: d, emb: state.emb };
    } else {
      const d = dateField("usDate", T.lblUs, miss);
      if (blank("usW")) miss.push(T.lblUs);
      if (miss.length) return missing(["usDate", "usW", "usD"]);
      if (d === undefined) return { ok: false, msg: T.errDate };
      const w = wholeInt(el("usW").value), dd = blank("usD") ? 0 : wholeInt(el("usD").value);
      if (!(w >= 4 && w <= 42 && dd >= 0 && dd <= 6)) return { ok: false, msg: T.errUsW };
      if (d > today) return { ok: false, msg: T.errFuture };
      ga0 = d - (w * 7 + dd);
      primary = { start: d, w, d: dd };
    }
    const gaDays = today - ga0;
    if (gaDays > 301) return { ok: false, msg: T.errOld };
    const edd = ga0 + 280;

    // необовʼязкове порівняння з УЗД
    let cmp = null;
    if (state.mode !== "us" && ["cmpDate", "cmpW", "cmpD"].some((id) => !blank(id))) {
      const m2 = [];
      const cd = dateField("cmpDate", T.lblCmp, m2);
      if (blank("cmpW")) m2.push(T.lblCmp);
      if (m2.length) return { ok: false, msg: fill(T.missing, { list: T.lblCmp }) };
      if (cd === undefined) return { ok: false, msg: T.errDate };
      const cw = wholeInt(el("cmpW").value), cdd = blank("cmpD") ? 0 : wholeInt(el("cmpD").value);
      if (!(cw >= 4 && cw <= 42 && cdd >= 0 && cdd <= 6)) return { ok: false, msg: T.errUsW };
      if (cd > today) return { ok: false, msg: T.errCmpFuture };
      const gaScan = cw * 7 + cdd;
      if (today - (cd - gaScan) > 301) return { ok: false, msg: T.errCmpAge };
      const usEdd = cd - gaScan + 280;
      const thr = gaScan < 63 ? 5 : gaScan < 112 ? 7 : gaScan < 154 ? 10 : gaScan < 196 ? 14 : 21;
      const diff = usEdd - edd;
      cmp = { usEdd, diff, abs: Math.abs(diff), thr, over: Math.abs(diff) > thr };
    }

    const marks = [
      { k: "conc", day: 14, label: T.mConc },
      { k: "scr", from: 77, to: 97, label: T.mScreen1 },
      { k: "t2", day: 98, label: T.mT2 },
      { k: "anat", from: 126, to: 154, label: T.mAnat },
      { k: "t3", day: 196, label: T.mT3 },
      { k: "leave", day: 210, label: T.mLeave },
      { k: "term", day: 259, label: T.mTerm },
      { k: "edd", day: 280, label: T.mEdd },
      { k: "post", day: 294, label: T.mPost },
      { k: "leaveEnd", day: 336, label: T.mLeaveEnd }
    ].map((x) => {
      const a = ga0 + (x.from != null ? x.from : x.day), b = x.to != null ? ga0 + x.to : a;
      let st;
      if (x.from != null) st = today < a ? fill(T.stIn, { n: a - today }) : today <= b ? T.stNow : T.stPast;
      else st = today < a ? fill(T.stIn, { n: a - today }) : today === a ? T.stToday : T.stPast;
      const age = x.k === "leaveEnd" ? "—" : x.from != null ? wkd(x.from) + " – " + wkd(x.to) : wkd(x.day);
      return { ...x, a, b, range: x.from != null, st, age, dateText: x.from != null ? fmtRange(a, b) : fmtDate(a), past: b < today };
    });

    return {
      ok: true, mode: state.mode, today, ga0, gaDays, edd, primary, cmp, marks,
      daysLeft: edd - today, win: [ga0 + 259, ga0 + 294], leave: ga0 + 210, conc: ga0 + 14,
      tri: gaDays < 98 ? 0 : gaDays < 196 ? 1 : 2, progress: Math.max(0, Math.min(100, (gaDays / 280) * 100))
    };
  }
  function missing(ids) {
    const any = ids.some((id) => !blank(id));
    const list = state.mode === "lmp" ? T.lblLmp : state.mode === "conc" ? T.lblConc : state.mode === "ivf" ? T.lblIvf : T.lblUs;
    return { ok: false, none: !any, msg: any ? fill(T.missing, { list }) : "" };
  }

  // ===== відображення =====
  const tile = (title, value, mini, cls = "") =>
    '<div class="due__kpi ' + cls + '"><div class="due__kpiT">' + title + '</div><div class="due__kpiV' + (String(value).length > 14 ? " due__kpiV--s" : "") + '">' + value + "</div>" + (mini ? '<div class="due__kpiM">' + mini + "</div>" : "") + "</div>";

  // шкала 0–42 тижні з триместрами, вікном 37–42 та позначкою «зараз»
  function chart(r) {
    const W = 480, H = 122, xL = 16, xR = 464, yB = 44, hB = 22;
    const x = (w) => xL + ((xR - xL) * w) / 42;
    let svg = '<svg class="due__chart" viewBox="0 0 ' + W + " " + H + '" role="img" aria-label="' + T.chartTitle + '">';
    const seg = [[0, 14, "#cfe0f7", "#1f2f55"], [14, 28, "#8fb0e3", "#1f2f55"], [28, 42, "#283b69", "#fff"]];
    seg.forEach(([a, b, f, tc], i) => {
      svg += '<rect x="' + x(a).toFixed(1) + '" y="' + yB + '" width="' + (x(b) - x(a)).toFixed(1) + '" height="' + hB + '" fill="' + f + '"/>';
      svg += '<text x="' + ((x(a) + x(b)) / 2).toFixed(1) + '" y="' + (yB + 15) + '" font-size="12" font-weight="700" fill="' + tc + '" text-anchor="middle">' + (i + 1) + "</text>";
    });
    svg += '<rect x="' + x(37).toFixed(1) + '" y="' + (yB + hB + 6) + '" width="' + (x(42) - x(37)).toFixed(1) + '" height="5" rx="2" fill="#0f8b8d"/>';
    [0, 14, 28, 37, 40, 42].forEach((w) => {
      svg += '<line x1="' + x(w).toFixed(1) + '" y1="' + (yB + hB) + '" x2="' + x(w).toFixed(1) + '" y2="' + (yB + hB + 4) + '" stroke="#9aa6c2"/>';
      svg += '<text x="' + x(w).toFixed(1) + '" y="' + (yB + hB + 28) + '" font-size="11" fill="' + (w === 40 ? "#283b69" : "#6b7280") + '"' + (w === 40 ? ' font-weight="700"' : "") + ' text-anchor="middle">' + w + "</text>";
    });
    const wNow = r.gaDays / 7;
    if (wNow >= 0 && wNow <= 42.5) {
      const px = Math.min(x(42), x(Math.max(0, wNow)));
      svg += '<path d="M' + (px - 7).toFixed(1) + " " + (yB - 14) + " L" + (px + 7).toFixed(1) + " " + (yB - 14) + " L" + px.toFixed(1) + " " + (yB - 2) + ' Z" fill="#0f8b8d"/>';
      const lab = wkd(r.gaDays), anchor = px < 70 ? "start" : px > W - 70 ? "end" : "middle";
      svg += '<text x="' + px.toFixed(1) + '" y="' + (yB - 22) + '" font-size="12" font-weight="800" fill="#0f8b8d" text-anchor="' + anchor + '">' + lab + "</text>";
    }
    svg += '<text x="' + xL + '" y="' + (H - 8) + '" font-size="11" fill="#5b6b8c">' + (IS_EN ? "weeks" : "тижні") + " · " + (IS_EN ? "teal bar: 37–42 weeks" : "бірюзова смуга: 37–42 тижні") + "</text>";
    return svg + "</svg>";
  }

  function tableHtml(r) {
    const head = "<thead><tr><th>" + T.thEvent + "</th><th>" + T.thAge + "</th><th>" + T.thDate + "</th><th>" + T.thStatus + "</th></tr></thead>";
    const body = r.marks.map((m) => '<tr' + (m.k === "edd" ? ' class="due__total"' : "") + "><td>" + m.label + "</td><td>" + m.age + "</td><td>" + m.dateText + "</td><td>" + m.st + "</td></tr>").join("");
    return '<table class="due__tbl due__tbl--sch" id="scheduleTable">' + head + "<tbody>" + body + "</tbody></table>";
  }

  let last = null;

  function render(r) {
    const box = el("result");
    const sch = el("schedule");
    if (!r.ok) {
      last = null;
      box.innerHTML = r.none || !r.msg ? T.enter : '<div class="due__hintbox">' + r.msg + "</div>";
      sch.hidden = true;
      return;
    }
    last = r;
    const nowVal = r.gaDays >= 0 ? wkd(r.gaDays) : T.nowFuture;
    // акушерський місяць = 4 тижні (28 днів): 40 тижнів = 10 місяців
    const monthsDone = Math.floor(r.gaDays / 28);
    const nowMini = r.gaDays >= 0 ? fill(T.nowMini, { tri: T.trimNames[r.tri], m: Math.min(10, monthsDone + 1), c: Math.min(10, monthsDone) }) : "";
    const left = r.daysLeft > 0 ? fill(T.dy, { n: r.daysLeft }) : r.daysLeft === 0 ? T.leftToday : fill(T.leftPast, { n: -r.daysLeft });
    const leftMini = r.daysLeft > 0 ? fill(T.leftMini, { w: wkd(r.daysLeft) }) : "";
    const tiles =
      tile(T.mainTitle, fmtDate(r.edd), fill(T.mainMini, { wd: weekdayOf(r.edd) }), "due__kpi--main due__kpi--wide") +
      tile(T.nowTitle, nowVal, nowMini) +
      tile(T.leftTitle, left, leftMini) +
      tile(T.winTitle, fmtRange(r.win[0], r.win[1]), T.winMini, "due__kpi--wide") +
      tile(T.leaveTitle, fmtDate(r.leave), T.leaveMini) +
      tile(T.concTitle, fmtDate(r.conc), T.concMini);
    let extra = "";
    if (r.cmp) {
      const c = r.cmp;
      extra += '<div class="due__warn' + (c.over ? "" : " is-ok") + '"><b>' + T.cmpTitle + ".</b> " + (c.abs === 0 ? T.cmpSame : fill(c.over ? T.cmpBig : T.cmpSmall, { n: c.abs, thr: c.thr, d: fmtDate(c.usEdd) })) + "</div>";
    }
    const prog = '<div class="due__bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="' + Math.round(r.progress) + '"><i style="width:' + r.progress.toFixed(1) + '%"></i></div>';
    box.innerHTML = '<div class="due__kpis">' + tiles + "</div>" + prog + extra + '<div class="due__sub">' + T.chartTitle + '</div><div class="due__chartScroll">' + chart(r) + '</div><div class="due__note">' + T.note + "</div>";
    el("schedBody").innerHTML = tableHtml(r);
    sch.hidden = false;
  }

  function calc() {
    render(compute());
  }

  // ===== копіювання та CSV =====
  const tableMatrix = () => {
    const t = el("scheduleTable");
    if (!t) return [];
    return Array.from(t.querySelectorAll("tr")).map((tr) => Array.from(tr.children).map((c) => c.textContent.trim()));
  };
  async function copyTable() {
    const m = tableMatrix().map((r) => r.join("\t")).join("\n");
    try {
      await navigator.clipboard.writeText(m);
      toast(T.tableCopied);
    } catch {
      toast(T.copyFailed);
    }
  }
  function downloadCsv() {
    if (!el("scheduleTable") || !last) return;
    const csv = "﻿" + tableMatrix().map((row) => row.map((c) => '"' + c.replace(/"/g, '""') + '"').join(";")).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "due-date.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast(T.csvDone);
  }
  async function copyResult() {
    if (!last) return;
    const txt = T.mainTitle + ": " + fmtDate(last.edd) + " (" + weekdayOf(last.edd) + ")";
    try {
      await navigator.clipboard.writeText(txt);
      toast(T.resultCopied);
    } catch {
      toast(T.copyFailed);
    }
  }

  // ===== режими =====
  function applyState() {
    document.querySelectorAll("[data-mode]").forEach((b) => {
      const on = b.dataset.mode === state.mode;
      b.classList.toggle("is-active", on);
      b.setAttribute("aria-pressed", String(on));
    });
    ["lmp", "conc", "ivf", "us"].forEach((m) => (el(m + "Wrap").hidden = state.mode !== m));
    el("cmpWrap").hidden = state.mode === "us";
    document.querySelectorAll("[data-emb]").forEach((b) => {
      const on = Number(b.dataset.emb) === state.emb;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
    });
  }

  // ===== кнопки =====
  const IDS = ["lmpDate", "cycle", "concDate", "ivfDate", "usDate", "usW", "usD", "cmpDate", "cmpW", "cmpD"];
  const DATE_IDS = ["lmpDate", "concDate", "usDate", "cmpDate"];

  function resetAll() {
    IDS.forEach((id) => (el(id).value = ""));
    Object.assign(state, { mode: "lmp", emb: 5 });
    el("cmpDet").open = false;
    applyState();
    render({ ok: false, none: true });
  }

  function fillExample() {
    IDS.forEach((id) => (el(id).value = ""));
    const t = todayDn();
    if (state.mode === "lmp") {
      el("lmpDate").value = isoOf(t - 22 * 7 - 3);
      el("cycle").value = "28";
    } else if (state.mode === "conc") el("concDate").value = isoOf(t - 20 * 7);
    else if (state.mode === "ivf") {
      el("ivfDate").value = isoOf(t - 18 * 7);
      state.emb = 5;
    } else {
      el("usDate").value = isoOf(t - 10 * 7);
      el("usW").value = "12";
      el("usD").value = "3";
    }
    applyState();
    calc();
    toast(T.example);
  }

  function share() {
    const p = new URLSearchParams();
    IDS.forEach((id) => {
      const v = (el(id).value || "").trim();
      if (v) p.set(id, v);
    });
    p.set("mode", state.mode);
    if (state.mode === "ivf") p.set("emb", String(state.emb));
    const url = location.origin + location.pathname + "?" + p.toString();
    navigator.clipboard?.writeText(url).then(() => toast(T.linkCopied)).catch(() => toast(T.copyFailed));
  }

  function applyFromUrl() {
    const q = new URLSearchParams(location.search);
    let any = false;
    IDS.forEach((id) => {
      if (q.has(id)) {
        el(id).value = q.get(id);
        any = true;
      }
    });
    if (["conc", "ivf", "us"].includes(q.get("mode"))) state.mode = q.get("mode");
    if (["3", "5", "6"].includes(q.get("emb"))) state.emb = Number(q.get("emb"));
    if (["cmpDate", "cmpW", "cmpD"].some((id) => !blank(id))) el("cmpDet").open = true;
    return any || q.has("mode");
  }

  window.addEventListener("DOMContentLoaded", () => {
    // дата початку не може бути в майбутньому (крім запланованого переносу ЕКЗ)
    const t = isoOf(todayDn());
    DATE_IDS.forEach((id) => el(id).setAttribute("max", t));
    IDS.forEach((id) => {
      ["input", "change"].forEach((ev) => el(id).addEventListener(ev, calc));
      el(id).addEventListener("keydown", (e) => {
        if (e.key === "Enter") calc();
      });
    });
    document.querySelectorAll("[data-mode]").forEach((b) =>
      b.addEventListener("click", () => {
        state.mode = b.dataset.mode;
        applyState();
        calc();
      })
    );
    document.querySelectorAll("[data-emb]").forEach((b) =>
      b.addEventListener("click", () => {
        state.emb = Number(b.dataset.emb);
        applyState();
        calc();
      })
    );
    el("copyTbl").addEventListener("click", copyTable);
    el("csvBtn").addEventListener("click", downloadCsv);
    el("calcBtn").addEventListener("click", () => {
      const r = compute();
      render(r);
      if (!r.ok && r.msg) toast(r.msg);
    });
    el("copyBtn").addEventListener("click", copyResult);
    el("exampleBtn").addEventListener("click", fillExample);
    el("resetBtn").addEventListener("click", () => {
      resetAll();
      toast(T.reset);
    });
    el("shareBtn").addEventListener("click", share);

    const used = applyFromUrl();
    applyState();
    if (used) calc();
    else render({ ok: false, none: true });
  });
})();
