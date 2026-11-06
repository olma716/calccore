/* tz-calc.js — конвертер часових поясів: час в іншому поясі з розпізнаванням переходу на літній час і планувальник зустрічі для кількох міст зі спільним робочим вікном */
PhysCalc.start(({ L }) => {
  const A = window.Ag, C = window.Ct, T = window.Tz, UI = window.PhysUI;
  const grp = A.grp, p2 = T.p2;
  const NOTE = L("Правила часових поясів (зсуви, літній час) беруться з бази часових поясів вашого браузера (IANA), тому для далеких дат у майбутньому вони можуть змінитися, якщо країни змінять правила. Дозволені дати з 1970 до 2100 року.", "Time zone rules (offsets, daylight saving time) come from your browser's time zone database (IANA), so for far future dates they may change if countries change their rules. Dates from 1970 to 2100 are allowed.");
  const WDS = L(["нд", "пн", "вт", "ср", "чт", "пт", "сб"], ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  const WD = L(["неділя", "понеділок", "вівторок", "середа", "четвер", "п'ятниця", "субота"], ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
  const MG = L(["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"], ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
  const dfmt = (dn) => { const p = A.parts(dn); return L(p.d + " " + MG[p.m - 1] + " " + p.y, MG[p.m - 1] + " " + p.d + ", " + p.y); };
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const warnHtml = (ws) => ws.map((t) => hint("⚠ " + t)).join("");
  const setV = (el, id, v) => { const e = el(id); if (!e) return; e.value = v; e.dispatchEvent(new Event("change", { bubbles: true })); };
  const dateF = (id, label) => fld(id, label, '<input class="ph__input" type="date" id="' + id + '" min="1970-01-01" max="2100-12-31" data-default-label="' + L("Сьогодні", "Today") + '" aria-label="' + id + '">');
  const timeF = (id, label, ph, withNow) => { const inp = '<input class="ph__input" type="text" inputmode="numeric" autocomplete="off" maxlength="5" id="' + id + '" placeholder="' + (ph || L("гг:хх", "hh:mm")) + '" aria-label="' + id + '">'; return fld(id, label, withNow ? '<div class="ph__inl">' + inp + '<button type="button" class="ph__btn ph__btn--primary ph__btn--sm" id="tzNow">' + L("Зараз", "Now") + "</button></div>" : inp); };
  // «Зараз»: поточні дата й час у поясі «з» (джерелі)
  const fillNow = (el, h) => { const w = T.wall(Date.now(), el("tzF").value); setV(el, "tzA", A.iso(w.dn)); el("tzT").value = T.hm(w.min); h.calc(true); };
  const fmtTimeInput = (v) => String(v).replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d{2})$/, "$1:$2");
  const chipsHtml = (id, chips) => '<div class="ph__chips ph__mt12" id="' + id + '">' + chips.map(([k, t]) => '<button type="button" class="ph__mini" data-k="' + k + '">' + t + "</button>").join("") + "</div>";
  const offAt = (tz, dn) => Math.round(C.offsetMs(T.zid(tz), dn * 86400000 + 12 * 3600000) / 60000);
  const zoneOpts = (dn, none) => (none ? '<option value="">—</option>' : "") + T.REGIONS.map(([k, u, e]) => '<optgroup label="' + L(u, e) + '">' + T.ZONES.filter((z) => z[3] === k).map((z) => '<option value="' + z[0] + '">' + L(z[1], z[2]) + " · " + T.offLabel(offAt(z[0], dn)) + "</option>").join("") + "</optgroup>").join("");
  const zoneSel = (id, none) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + zoneOpts(A.todayDn(), none) + "</select>";
  const hourSel = (id, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + Array.from({ length: 24 }, (_, h) => '<option value="' + h + '"' + (h === cur ? " selected" : "") + ">" + p2(h) + ":00</option>").join("") + "</select>";
  const relabel = (el, ids, dn) => ids.forEach((id) => { const s = el(id); if (!s) return; Array.from(s.options).forEach((o) => { const z = T.ZONES.find((x) => x[0] === o.value); if (z) o.textContent = L(z[1], z[2]) + " · " + T.offLabel(offAt(z[0], dn)); }); });
  const devZone = () => { try { return T.norm(Intl.DateTimeFormat().resolvedOptions().timeZone) || "Europe/Kyiv"; } catch (e) { return "Europe/Kyiv"; } };
  const readDate = (el) => { const s = el("tzA").value.trim(); if (!s) return { v: A.todayDn() }; const n = A.parseISO(s); if (n === null) return { err: L("Дата — коректна дата.", "The date must be a valid date.") }; const y = A.parts(n).y; return y < 1970 || y > 2100 ? { err: L("Дата — від 1970 до 2100 року.", "The date must be from 1970 to 2100.") } : { v: n }; };
  const timeIn = (el, id) => { const s = el(id).value.trim(); if (!s) return { empty: true }; const v = A.parseTime(s); return v === null ? { err: L("Час вводьте як гг:хх, наприклад 18:30.", "Enter the time as hh:mm, for example 18:30.") } : { v }; };
  const dayMark = (diff) => (diff === 0 ? L("той самий день", "same day") : diff > 0 ? L("наступний день", "next day") : L("попередній день", "previous day"));
  const dayMarkShort = (diff) => (diff === 0 ? "" : diff > 0 ? " +1" + L(" д", " d") : " −1" + L(" д", " d"));
  const utcStr = (t) => { const d = new Date(t); return p2(d.getUTCHours()) + ":" + p2(d.getUTCMinutes()); };
  const offTxt = (tz, t) => { const w = T.wall(t, tz); return T.offLabel(w.off) + (T.isDst(tz, t) ? L(" (літній час)", " (daylight saving)") : ""); };
  const bindTime = (el, id, maybeCalc, h) => { el(id).addEventListener("input", () => { const d = el(id).value.replace(/\D/g, "").slice(0, 4); if (el(id).value.indexOf(":") < 0 && d.length === 4) el(id).value = fmtTimeInput(d); maybeCalc(); }); el(id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } }); };

  // ====================== конвертер ======================
  const conv = {
    key: "conv", type: "custom", req: () => ["tzT"], nameUk: "Конвертер", nameEn: "Converter",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + dateF("tzA", L("Дата", "Date")) + timeF("tzT", L("Час", "Time"), null, true) + fld("tzF", L("З часового поясу", "From time zone"), zoneSel("tzF"), true) + fld("tzO", L("У часовий пояс", "To time zone"), zoneSel("tzO"), true) + "</div>" + chipsHtml("tzChips", [["swap", L("⇄ Поміняти місцями", "⇄ Swap")]]) + hint(L("Дата за замовчуванням — сьогодні. Зсув кожного поясу в списку показано на вибрану дату, з урахуванням літнього часу.", "The date is today by default. The offset of each zone in the list is shown for the chosen date, including daylight saving time."));
      el("tzF").value = devZone(); el("tzO").value = el("tzF").value === "America/New_York" ? "Europe/London" : "America/New_York";
      setV(el, "tzA", ""); bindTime(el, "tzT", maybeCalc, h); el("tzNow").addEventListener("click", () => fillNow(el, h));
      ["tzA"].forEach((id) => { el(id).addEventListener("input", maybeCalc); el(id).addEventListener("change", () => { const r = readDate(el); if (r.v) relabel(el, ["tzF", "tzO"], r.v); maybeCalc(); }); });
      ["tzF", "tzO"].forEach((id) => el(id).addEventListener("change", maybeCalc));
      el("tzChips").addEventListener("click", (e) => {
        const b = e.target.closest("button[data-k]"); if (!b) return; const k = b.dataset.k;
        if (k === "swap") { const f = el("tzF").value; el("tzF").value = el("tzO").value; el("tzO").value = f; }
        h.calc(true);
      });
    },
    calc(h) {
      const { el } = h, d = readDate(el);
      if (d.err) return { ok: false, msg: d.err };
      const tm = timeIn(el, "tzT");
      if (tm.err) return { ok: false, msg: tm.err };
      if (tm.empty) return { ok: false, incomplete: true };
      const from = el("tzF").value, to = el("tzO").value, p = A.parts(d.v);
      const r = T.resolve(p.y, p.m, p.d, tm.v, from), t = r.t, wf = T.wall(t, from), wt = T.wall(t, to), diff = wt.off - wf.off, shift = wt.dn - wf.dn;
      const fromN = T.zoneName(from), toN = T.zoneName(to), inTxt = p2(Math.floor(tm.v / 3600)) + ":" + p2(Math.floor((tm.v % 3600) / 60));
      const warns = [];
      if (r.kind === "gap") warns.push(L("Часу " + inTxt + " у «" + fromN + "» " + dfmt(d.v) + " не існує: годинники переводять уперед. Показано результат для " + T.hm(wf.min) + ".", inTxt + " does not exist in “" + fromN + "” on " + dfmt(d.v) + ": the clocks go forward. The result is shown for " + T.hm(wf.min) + "."));
      if (r.kind === "fold") warns.push(L("Час " + inTxt + " у «" + fromN + "» " + dfmt(d.v) + " повторюється двічі (годинники переводять назад). Показано перший, літній, варіант; другий був би на годину пізніше: " + T.hm(T.wall(r.alt, to).min) + " у «" + toN + "».", inTxt + " in “" + fromN + "” on " + dfmt(d.v) + " happens twice (the clocks go back). The first, daylight saving, occurrence is shown; the second would be an hour later: " + T.hm(T.wall(r.alt, to).min) + " in “" + toN + "”."));
      const wtTxt = T.hm(wt.min), wtDate = dfmt(wt.dn);
      const steps = [{ t: L("Час у «" + fromN + "»", "Time in “" + fromN + "”"), l: [T.hm(wf.min) + ", " + dfmt(wf.dn) + " (" + offTxt(from, t) + ")"] }, { t: L("Переводимо в UTC", "Converting to UTC"), l: [T.hm(wf.min) + " − (" + T.offLabel(wf.off) + ") = " + utcStr(t) + " UTC"] }, { t: L("З UTC у «" + toN + "»", "From UTC to “" + toN + "”"), l: [utcStr(t) + " + (" + T.offLabel(wt.off) + ") = " + wtTxt + ", " + wtDate + " (" + WD[wt.wd] + ")"], note: offTxt(to, t) }];
      const tiles = [{ k: L("Різниця", "Difference"), v: T.diffLabel(diff) }, { k: L("День", "Day"), v: dayMark(shift) }, { k: L("За UTC", "In UTC"), v: utcStr(t) }, { k: L("Зсув «з»", "Offset “from”"), v: offTxt(from, t) }, { k: L("Зсув «у»", "Offset “to”"), v: offTxt(to, t) }];
      return { ok: true, expr: T.hm(wf.min) + ", " + dfmt(wf.dn) + " · " + fromN + " → " + toN, head: [L("час у ", "time in ") + toN, wtTxt], subRaw: true, headSub: WD[wt.wd] + ", " + wtDate + " · " + dayMark(shift), tiles, extraHtml: warnHtml(warns), note: NOTE, steps, resText: T.hm(wf.min) + " " + dfmt(wf.dn) + " (" + fromN + ") = " + wtTxt + " " + wtDate + " (" + toN + ")" };
    },
    reset(h) { const { el } = h; setV(el, "tzA", ""); el("tzT").value = ""; el("tzF").value = devZone(); el("tzO").value = el("tzF").value === "America/New_York" ? "Europe/London" : "America/New_York"; relabel(el, ["tzF", "tzO"], A.todayDn()); },
    fill(h) { const { el } = h; setV(el, "tzA", "2026-11-06"); el("tzT").value = "18:00"; el("tzF").value = "Europe/Kyiv"; el("tzO").value = "America/New_York"; relabel(el, ["tzF", "tzO"], A.parseISO("2026-11-06")); },
    share(p, h) { const { el } = h; if (el("tzA").value) p.set("za", el("tzA").value); if (el("tzT").value.trim()) p.set("zt", el("tzT").value.trim()); p.set("zf", el("tzF").value); p.set("zo", el("tzO").value); },
    apply(qs, h) { const { el } = h; if (qs.has("za") && A.parseISO(qs.get("za")) !== null) setV(el, "tzA", qs.get("za")); if (qs.has("zt") && A.parseTime(qs.get("zt")) !== null) el("tzT").value = fmtTimeInput(qs.get("zt")); if (T.known(qs.get("zf"))) el("tzF").value = qs.get("zf"); if (T.known(qs.get("zo"))) el("tzO").value = qs.get("zo"); }
  };

  // ====================== зустріч у кількох містах ======================
  const CITY_IDS = ["tzC1", "tzC2", "tzC3", "tzC4", "tzC5"];
  const meet = {
    key: "meet", type: "custom", req: () => ["tzC1"], nameUk: "Зустріч у кількох містах", nameEn: "Meeting in several cities",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + dateF("tzA", L("Дата", "Date")) + timeF("tzT", L("Час за джерелом (необов'язково)", "Time in the source zone (optional)"), null, true) + fld("tzF", L("Ваш часовий пояс (джерело)", "Your time zone (source)"), zoneSel("tzF"), true) + CITY_IDS.map((id, i) => fld(id, L("Місто " + (i + 1), "City " + (i + 1)), zoneSel(id, true))).join("") + fld("tzWs", L("Робочі години з", "Working hours from"), hourSel("tzWs", 9)) + fld("tzWe", L("Робочі години до", "Working hours until"), hourSel("tzWe", 18)) + "</div>" + hint(L("Додайте до п'яти міст учасників. Калькулятор знайде вікно, коли в усіх робочий час. Якщо вказати ще й час, покаже, котра година в кожного міста.", "Add up to five participant cities. The calculator finds the window when everyone is in working hours. If you also give a time, it shows what time it is in each city."));
      el("tzF").value = devZone(); setV(el, "tzA", ""); bindTime(el, "tzT", maybeCalc, h); el("tzNow").addEventListener("click", () => fillNow(el, h));
      el("tzA").addEventListener("input", maybeCalc); el("tzA").addEventListener("change", () => { const r = readDate(el); if (r.v) relabel(el, ["tzF"].concat(CITY_IDS), r.v); maybeCalc(); });
      ["tzF", "tzWs", "tzWe"].concat(CITY_IDS).forEach((id) => el(id).addEventListener("change", maybeCalc));
    },
    calc(h) {
      const { el } = h, d = readDate(el);
      if (d.err) return { ok: false, msg: d.err };
      const tm = timeIn(el, "tzT");
      if (tm.err) return { ok: false, msg: tm.err };
      const src = el("tzF").value, cities = CITY_IDS.map((id) => el(id).value).filter((v) => v && v !== src).filter((v, i, a) => a.indexOf(v) === i);
      if (!cities.length) return { ok: false, incomplete: true };
      const ws = +el("tzWs").value, we = +el("tzWe").value;
      if (ws >= we) return { ok: false, msg: L("Початок робочого часу має бути раніше за його кінець.", "The start of working hours must be earlier than the end.") };
      const p = A.parts(d.v), zones = [src].concat(cities), N = zones.length, names = zones.map(T.zoneName), W = T.windows(p.y, p.m, p.d, zones, ws * 60, we * 60), srcName = names[0];
      const base = T.resolve(p.y, p.m, p.d, 0, src).t, sd = T.wall(base, src).dn;
      const locTxt = (t, z) => { const w = T.wall(t, z); return { time: T.hm(w.min), mark: dayMarkShort(w.dn - sd) }; };
      let head, sub, tableHtml = "", spansTxt = "";
      if (W.best === 0) { head = [L("спільного вікна немає", "no common window"), "—"]; sub = L("жодне місто не має робочого часу цієї доби за " + srcName, "no city has working hours on this day by " + srcName); }
      else {
        const longest = W.spans.slice().sort((a, b) => (b.end - b.start) - (a.end - a.start) || (b.who[0] ? 1 : 0) - (a.who[0] ? 1 : 0))[0], s0 = locTxt(longest.start, src), e0 = locTxt(longest.end, src);
        head = [W.best === N ? L("спільне вікно (усі " + N + ")", "common window (all " + N + ")") : L("найкращий збіг: " + W.best + " з " + N, "best match: " + W.best + " of " + N), s0.time + "–" + e0.time];
        const missing = names.filter((_, i) => !longest.who[i]);
        sub = L("за «" + srcName + "», робочі години " + p2(ws) + ":00–" + p2(we) + ":00", "in “" + srcName + "”, working hours " + p2(ws) + ":00–" + p2(we) + ":00") + (missing.length ? L(" · поза робочим часом: ", " · outside working hours: ") + missing.join(", ") : "");
        const rows = zones.map((z, i) => { const a = locTxt(longest.start, z), b = locTxt(longest.end, z); return { cells: [{ t: names[i], cls: "is-first" }, a.time + a.mark + " – " + b.time + b.mark, longest.who[i] ? L("так", "yes") : L("ні", "no")] }; });
        tableHtml = '<div class="ph__sub">' + L("Вікно в кожному місті", "The window in each city") + "</div>" + UI.list([L("Місто", "City"), L("Вікно", "Window"), L("Робочий час", "Working")], rows, { w: "minmax(0, 1.3fr) minmax(0, 1.4fr) 110px" });
        if (W.spans.length > 1) spansTxt = hint(L("Усі проміжки за «" + srcName + "»: ", "All windows in “" + srcName + "”: ") + W.spans.map((s) => locTxt(s.start, src).time + "–" + locTxt(s.end, src).time).join(", ") + ".");
      }
      let timeHtml = "", warns = [];
      if (!tm.empty) {
        const r = T.resolve(p.y, p.m, p.d, tm.v, src), t = r.t;
        if (r.kind !== "ok") warns.push(r.kind === "gap" ? L("Часу " + T.hm(Math.floor(tm.v / 60)) + " у «" + srcName + "» не існує (годинники переводять уперед): показано зсунутий час.", T.hm(Math.floor(tm.v / 60)) + " does not exist in “" + srcName + "” (the clocks go forward): the shifted time is shown.") : L("Час " + T.hm(Math.floor(tm.v / 60)) + " у «" + srcName + "» повторюється двічі: показано перший варіант.", T.hm(Math.floor(tm.v / 60)) + " in “" + srcName + "” happens twice: the first occurrence is shown."));
        const rows = zones.map((z, i) => { const w = T.wall(t, z), hr = Math.floor(w.min / 60), inW = w.min >= ws * 60 && w.min < we * 60, night = hr < 6 || hr >= 22; return { cells: [{ t: names[i], cls: "is-first" }, T.hm(w.min) + dayMarkShort(w.dn - sd) + " (" + WDS[w.wd] + ")", offTxt(z, t), inW ? L("робочий", "working") : night ? L("ніч", "night") : L("поза робочим", "off hours")] }; });
        timeHtml = '<div class="ph__sub">' + L("Котра година в кожного міста", "What time it is in each city") + "</div>" + UI.list([L("Місто", "City"), L("Час", "Time"), L("Зсув", "Offset"), L("Стан", "State")], rows, { w: "minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1.3fr) 110px" });
      }
      const tiles = [{ k: L("Міст", "Cities"), v: String(N) }, { k: L("Робочі години", "Working hours"), v: p2(ws) + ":00–" + p2(we) + ":00" }, { k: L("Найкращий збіг", "Best match"), v: W.best + " " + L("з", "of") + " " + N }];
      const steps = [{ t: L("Учасники", "Participants"), l: [names.join(", ")] }, { t: L("Перевіряємо добу за «" + srcName + "»", "Checking the day in “" + srcName + "”"), l: [L("кожні 15 хвилин дивимось, у скількох містах місцевий час у межах " + p2(ws) + ":00–" + p2(we) + ":00", "every 15 minutes we count in how many cities the local time is within " + p2(ws) + ":00–" + p2(we) + ":00")] }, { t: L("Результат", "Result"), l: [head[0] + ": " + head[1]], note: sub }];
      return { ok: true, expr: dfmt(d.v) + " · " + names.join(" · "), head, subRaw: true, headSub: sub, tiles, extraHtml: tableHtml + spansTxt + timeHtml + warnHtml(warns), note: NOTE, steps, resText: head[0] + ": " + head[1] + " (" + names.join(", ") + "; " + p2(ws) + ":00–" + p2(we) + ":00)" };
    },
    reset(h) { const { el } = h; setV(el, "tzA", ""); el("tzT").value = ""; el("tzF").value = devZone(); CITY_IDS.forEach((id) => { el(id).value = ""; }); el("tzWs").value = "9"; el("tzWe").value = "18"; relabel(el, ["tzF"].concat(CITY_IDS), A.todayDn()); },
    fill(h) { const { el } = h; setV(el, "tzA", "2026-11-06"); el("tzT").value = "16:00"; el("tzF").value = "Europe/Kyiv"; ["Europe/London", "America/New_York", "", "", ""].forEach((v, i) => { el(CITY_IDS[i]).value = v; }); el("tzWs").value = "9"; el("tzWe").value = "18"; relabel(el, ["tzF"].concat(CITY_IDS), A.parseISO("2026-11-06")); },
    share(p, h) { const { el } = h; if (el("tzA").value) p.set("za", el("tzA").value); if (el("tzT").value.trim()) p.set("zt", el("tzT").value.trim()); p.set("zf", el("tzF").value); const c = CITY_IDS.map((id) => el(id).value).filter(Boolean); if (c.length) p.set("zc", c.join(",")); p.set("zs", el("tzWs").value); p.set("ze", el("tzWe").value); },
    apply(qs, h) { const { el } = h; if (qs.has("za") && A.parseISO(qs.get("za")) !== null) setV(el, "tzA", qs.get("za")); if (qs.has("zt") && A.parseTime(qs.get("zt")) !== null) el("tzT").value = fmtTimeInput(qs.get("zt")); if (T.known(qs.get("zf"))) el("tzF").value = qs.get("zf"); if (qs.has("zc")) qs.get("zc").split(",").filter(T.known).slice(0, 5).forEach((v, i) => { el(CITY_IDS[i]).value = v; }); if (/^\d{1,2}$/.test(qs.get("zs") || "") && +qs.get("zs") < 24) el("tzWs").value = qs.get("zs"); if (/^\d{1,2}$/.test(qs.get("ze") || "") && +qs.get("ze") < 24) el("tzWe").value = qs.get("ze"); }
  };
  return { modes: [conv, meet], exactNote: false };
});
