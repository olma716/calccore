/* chr-cal.js — дані калькулятора «Юліанський і григоріанський календар»: переведення дат, нерухомі свята за юліанським календарем, таблиця різниці */
PhysCalc.start(({ L }) => {
  const C = window.Chr;
  const IS_EN = L(false, true);
  const MN = IS_EN ? C.MONTHS_EN : C.MONTHS, DN = IS_EN ? C.DAYS_EN : C.DAYS;
  const MONTH_OPT = (sel) => (IS_EN ? C.MONTHS_EN : C.MONTHS_N).map((m, i) => '<option value="' + (i + 1) + '"' + (i + 1 === sel ? " selected" : "") + ">" + m + "</option>").join("");
  const ERA = '<option value="0">' + L("н. е.", "AD") + '</option><option value="1">' + L("до н. е.", "BC") + "</option>";
  const CALN = (c) => (c === "j" ? L("юліанський", "Julian") : L("григоріанський", "Gregorian"));
  const fmt = (d) => { const a = C.fromAstro(d.y); return d.d + " " + MN[d.m - 1] + " " + a.y + (a.bc ? L(" до н. е.", " BC") : ""); };
  const grp = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const intOf = (s) => (/^\d{1,4}$/.test(String(s).trim()) ? Number(String(s).trim()) : null);

  function readDate(el) {
    const d = intOf(el("cvD").value), y = intOf(el("cvY").value), m = Number(el("cvM").value), bc = el("cvE").value === "1";
    if (el("cvD").value.trim() === "" || el("cvY").value.trim() === "") return { incomplete: true };
    if (d === null || y === null || y < 1) return { err: L("День і рік — натуральні числа (рік від 1 до 9999).", "Day and year are natural numbers (the year is from 1 to 9999).") };
    const ay = C.toAstro(y, bc), cal = el("cvC").value;
    if (!C.validDate(cal, ay, m, d)) return { err: L("Такої дати не існує: у цьому місяці ", "There is no such date: this month has ") + (m >= 1 && m <= 12 ? C.dim(cal, ay, m) : "?") + L(" днів (" + CALN(cal) + " календар).", " days (" + CALN(cal) + " calendar).") };
    return { cal, ay, m, d };
  }

  // ----- переведення дати -----
  const conv = {
    key: "conv", type: "custom", nameUk: "Переведення дати", nameEn: "Date converter",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var"><label class="ph__label" for="cvC">' + L("Дата задана за календарем", "The date is in the calendar") + '</label><select class="ph__unit ph__unit--wide" id="cvC"><option value="j">' + L("Юліанський (старий стиль)", "Julian (old style)") + '</option><option value="g">' + L("Григоріанський (новий стиль)", "Gregorian (new style)") + '</option></select></div><div class="ph__var"><label class="ph__label" for="cvD">' + L("День", "Day") + '</label><input class="ph__input" id="cvD" type="text" inputmode="numeric" autocomplete="off" maxlength="2" placeholder="25" aria-label="' + L("День", "Day") + '"></div><div class="ph__var"><label class="ph__label" for="cvM">' + L("Місяць", "Month") + '</label><select class="ph__unit ph__unit--wide" id="cvM">' + MONTH_OPT(12) + '</select></div><div class="ph__var"><label class="ph__label" for="cvY">' + L("Рік", "Year") + '</label><input class="ph__input" id="cvY" type="text" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="2025" aria-label="' + L("Рік", "Year") + '"></div><div class="ph__var"><label class="ph__label" for="cvE">' + L("Ера", "Era") + '</label><select class="ph__unit ph__unit--wide" id="cvE">' + ERA + '</select></div></div>';
      ["cvD", "cvY"].forEach((id) => el(id).addEventListener("input", maybeCalc)); ["cvC", "cvM", "cvE"].forEach((id) => el(id).addEventListener("change", maybeCalc));
    },
    calc(h) {
      const { el, esc } = h, r = readDate(el);
      if (r.incomplete) return { ok: false, incomplete: true };
      if (r.err) return { ok: false, msg: r.err };
      const J = C.jdn(r.cal, r.ay, r.m, r.d), other = r.cal === "j" ? "g" : "j", o = C.fromJdn(other, J), src = { y: r.ay, m: r.m, d: r.d };
      const jd = r.cal === "j" ? src : o, gd = r.cal === "g" ? src : o, diff = C.jdn("j", jd.y, jd.m, jd.d) - C.jdn("g", jd.y, jd.m, jd.d);
      const wd = DN[C.weekday(J)], gap = r.cal === "g" && r.ay === 1582 && r.m === 10 && r.d >= 5 && r.d <= 14, early = r.cal === "g" && J < 2299161;
      const steps = [{ t: L("Переходимо до юліанського дня (JDN)", "Going to the Julian day number (JDN)"), l: [fmt(src) + " (" + CALN(r.cal) + ") → JDN " + grp(J)], note: L("Юліанський день — суцільний лічильник днів, спільний для обох календарів; через нього переведення виходить без накопичення помилок.", "The Julian day number is a continuous day count shared by both calendars; converting through it avoids accumulating errors.") }, { t: L("Переходимо до другого календаря", "Going to the other calendar"), l: ["JDN " + grp(J) + " → " + fmt(o) + " (" + CALN(other) + ")"], note: L("Різниця між календарями в цей час — ", "The difference between the calendars at this time is ") + Math.abs(diff) + L(" дн.", " days.") }, { t: L("День тижня", "Weekday"), l: [wd], note: L("День тижня не залежить від календаря: це та сама доба.", "The weekday does not depend on the calendar: it is the same day.") }];
      let extra = "";
      if (early || gap) extra = '<div class="ph__hint ph__mt12">' + (gap ? L("Увага: у країнах, що перейшли на григоріанський календар у 1582 р., дати 5–14 жовтня тоді було пропущено; тут використано пролептичний (продовжений назад) григоріанський календар.", "Note: in countries that switched to the Gregorian calendar in 1582 the dates 5–14 October were skipped; this calculator uses the proleptic (extended backwards) Gregorian calendar.") : L("Григоріанська дата до жовтня 1582 р. — пролептична, тобто продовжена назад за сучасними правилами.", "A Gregorian date before October 1582 is proleptic, i.e. extended backwards by the modern rules.")) + "</div>";
      const res = o;
      const resWd = wd[0].toUpperCase() + wd.slice(1);
      const tiles = [{ k: L("Юліанський календар", "Julian calendar"), v: fmt(jd) }, { k: L("Григоріанський календар", "Gregorian calendar"), v: fmt(gd) }, { k: L("День тижня", "Weekday"), v: resWd }, { k: L("Різниця календарів", "Calendar gap"), v: Math.abs(diff) + L(" дн.", " days") }, { k: L("Юліанський день (JDN)", "Julian day number (JDN)"), v: grp(J) }];
      return { ok: true, expr: fmt(src) + " (" + CALN(r.cal) + ")", head: [CALN(other), fmt(res)], headSub: resWd + L(" · різниця календарів ", " · calendar gap ") + Math.abs(diff) + L(" дн.", " days"), subRaw: true, tiles, extraHtml: extra, steps, resText: fmt(src) + " (" + CALN(r.cal) + ") = " + fmt(res) + " (" + CALN(other) + "), " + wd };
    },
    reset(h) { const { el } = h; el("cvC").value = "j"; el("cvD").value = ""; el("cvM").value = "12"; el("cvY").value = ""; el("cvE").value = "0"; },
    fill(h) { const { el } = h; el("cvC").value = "j"; el("cvD").value = "25"; el("cvM").value = "12"; el("cvY").value = "2025"; el("cvE").value = "0"; },
    share(p, h) { const { el } = h; if (!el("cvD").value.trim() || !el("cvY").value.trim()) return; p.set("c", el("cvC").value); p.set("d", el("cvD").value.trim()); p.set("mo", el("cvM").value); p.set("y", el("cvY").value.trim()); p.set("e", el("cvE").value); },
    apply(qs, h) { const { el } = h; if (qs.has("c") && ["j", "g"].includes(qs.get("c"))) el("cvC").value = qs.get("c"); if (qs.has("d")) el("cvD").value = qs.get("d").slice(0, 2); if (qs.has("mo") && Number(qs.get("mo")) >= 1 && Number(qs.get("mo")) <= 12) el("cvM").value = qs.get("mo"); if (qs.has("y")) el("cvY").value = qs.get("y").slice(0, 4); if (qs.has("e") && ["0", "1"].includes(qs.get("e"))) el("cvE").value = qs.get("e"); }
  };

  return { modes: [conv] };
});
