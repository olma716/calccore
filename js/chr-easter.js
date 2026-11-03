/* chr-easter.js — дані калькулятора «Великдень»: православний і католицький Великдень, рухомі свята, список років і збіги */
PhysCalc.start(({ L }) => {
  const C = window.Chr;
  const IS_EN = L(false, true);
  const MN = IS_EN ? C.MONTHS_EN : C.MONTHS, DN = IS_EN ? C.DAYS_EN : C.DAYS;
  const fmt = (d) => d.d + " " + MN[d.m - 1] + " " + d.y;
  const short = (d) => d.d + " " + MN[d.m - 1];
  const wd = (d) => DN[C.weekday(C.jdn("g", d.y, d.m, d.d))];
  const J = (d) => C.jdn("g", d.y, d.m, d.d);
  const yearOf = (s) => (/^\d{4}$/.test(String(s).trim()) ? Number(String(s).trim()) : null);
  const YERR = L("Введіть рік від 1583 до 4099 (григоріанська пасхалія застосовна з 1583 р.).", "Enter a year from 1583 to 4099 (the Gregorian computus applies from 1583).");
  const OK = (y) => y !== null && y >= 1583 && y <= 4099;
  const same = (a, b) => a.m === b.m && a.d === b.d;
  const inp = (id, ph, w) => '<input class="ph__input" id="' + id + '" type="text" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="' + ph + '" aria-label="' + id + '">';
  const FEAST_O = [[-48, L("Початок Великого посту (Чистий понеділок)", "Start of Great Lent (Clean Monday)")], [-7, L("Вербна неділя", "Palm Sunday")], [-3, L("Чистий четвер", "Maundy Thursday")], [-2, L("Страсна п'ятниця", "Good Friday")], [0, L("Великдень (Пасха)", "Easter (Pascha)")], [39, L("Вознесіння Господнє", "Ascension")], [49, L("Трійця (П'ятдесятниця)", "Pentecost (Trinity)")]];
  const FEAST_C = [[-46, L("Попелець (початок Великого посту)", "Ash Wednesday")], [-7, L("Вербна неділя", "Palm Sunday")], [-3, L("Великий четвер", "Maundy Thursday")], [-2, L("Страсна п'ятниця", "Good Friday")], [0, L("Великдень", "Easter")], [39, L("Вознесіння Господнє", "Ascension")], [49, L("П'ятдесятниця", "Pentecost")]];

  // ----- за роком -----
  const one = {
    key: "year", type: "custom", nameUk: "Великдень у році", nameEn: "Easter in a year",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var"><label class="ph__label" for="esY">' + L("Рік", "Year") + "</label>" + inp("esY", "2026") + '</div></div><div class="ph__chips ph__mt12" id="esChips">' + [2025, 2026, 2027, 2028, 2030].map((y) => '<button type="button" class="ph__mini" data-y="' + y + '">' + y + "</button>").join("") + '</div><div class="ph__hint ph__mt12">' + L("Православний (і греко-католицький) Великдень рахується за юліанською пасхалією й переводиться в григоріанський календар; католицький та протестантський — за григоріанською. Не залежить від того, чи церква переходила на новоюліанський календар для нерухомих свят.", "Orthodox Easter is computed by the Julian computus and converted to the Gregorian calendar; Catholic and Protestant Easter by the Gregorian computus. It does not depend on whether a church moved fixed feasts to the Revised Julian calendar.") + "</div>";
      el("esY").addEventListener("input", maybeCalc);
      el("esY").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } });
      el("esChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-y]"); if (!b) return; el("esY").value = b.dataset.y; h.calc(true); });
    },
    calc(h) {
      const { el, esc } = h, s = el("esY").value.trim();
      if (!s) return { ok: false, incomplete: true };
      const y = yearOf(s);
      if (!OK(y)) return { ok: false, msg: YERR };
      const o = C.easterOrthodoxGreg(y), c = C.easterGregorian(y), jul = C.easterJulian(y), diff = J(o) - J(c);
      const coin = same(o, c);
      const rows = [];
      for (let i = 0; i < 7; i++) { const fo = C.addDays(o, FEAST_O[i][0]), fc = C.addDays(c, FEAST_C[i][0]); rows.push("<tr><th>" + esc(FEAST_O[i][1]) + "</th><td style=\"white-space:nowrap\">" + esc(short(fo)) + "<br><small>" + esc(wd(fo)) + "</small>" + "</td><th>" + esc(FEAST_C[i][1]) + "</th><td style=\"white-space:nowrap\">" + esc(short(fc)) + "<br><small>" + esc(wd(fc)) + "</small>" + "</td></tr>"); }
      const table = '<div class="ph__sub">' + L("Рухомі свята ", "Movable feasts ") + y + '</div><div class="ph__tblWrap"><table class="ph__tbl ph__tbl--txt"><thead><tr><th>' + L("Православні", "Orthodox") + "</th><th>" + L("Дата", "Date") + "</th><th>" + L("Католицькі", "Catholic") + "</th><th>" + L("Дата", "Date") + "</th></tr></thead><tbody>" + rows.join("") + "</tbody></table></div>";
      const steps = [{ t: L("Православна пасхалія (юліанська)", "Orthodox computus (Julian)"), l: [L("Великдень за юліанським календарем: ", "Easter in the Julian calendar: ") + jul.d + " " + MN[jul.m - 1] + L(" (ст. ст.)", " (O.S.)"), L("У григоріанському календарі: ", "In the Gregorian calendar: ") + fmt(o)], note: L("Неділя після першого весняного повного місяця, але не раніше 21 березня за юліанським календарем.", "The Sunday after the first spring full moon, but not before 21 March in the Julian calendar.") }, { t: L("Католицька пасхалія (григоріанська)", "Catholic computus (Gregorian)"), l: [L("Великдень: ", "Easter: ") + fmt(c)], note: L("Алгоритм Мейуса — Батча (Anonymous Gregorian): рахується золоте число, епакта і поправки на століття.", "The Meeus/Jones/Butcher algorithm: the golden number, the epact and century corrections are computed.") }, { t: L("Порівнюємо", "Comparing"), l: [coin ? L("Дати збігаються: ", "The dates coincide: ") + fmt(o) : L("Різниця: ", "Difference: ") + Math.abs(diff) + L(" дн. (", " days (") + (diff > 0 ? L("православний пізніше", "Orthodox is later") : L("католицький пізніше", "Catholic is later")) + ")"] }];
      return { ok: true, expr: L("Великдень ", "Easter ") + y, head: [L("православний", "Orthodox"), fmt(o)], headSub: L("католицький: ", "Catholic: ") + fmt(c) + (coin ? L(" — збіг!", " — the same day!") : ""), subRaw: true, tiles: [{ k: L("Православний", "Orthodox"), v: short(o) + ", " + wd(o) }, { k: L("Католицький", "Catholic"), v: short(c) + ", " + wd(c) }, { k: L("Різниця", "Difference"), v: coin ? L("збіг", "same day") : Math.abs(diff) + L(" дн.", " days") }, { k: L("За юліанським", "In the Julian calendar"), v: jul.d + " " + MN[jul.m - 1] }], extraHtml: table, steps, resText: L("Великдень ", "Easter ") + y + L(": православний — ", ": Orthodox — ") + fmt(o) + L(", католицький — ", ", Catholic — ") + fmt(c) };
    },
    reset(h) { h.el("esY").value = ""; },
    fill(h) { h.el("esY").value = "2026"; },
    share(p, h) { if (h.el("esY").value.trim()) p.set("y", h.el("esY").value.trim()); },
    apply(qs, h) { if (qs.has("y")) h.el("esY").value = qs.get("y").slice(0, 4); }
  };

  // ----- список років -----
  const list = {
    key: "list", type: "custom", nameUk: "Список років і збіги", nameEn: "Years list and coincidences",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var"><label class="ph__label" for="elY">' + L("Починаючи з року", "Starting from") + "</label>" + inp("elY", "2026") + '</div><div class="ph__var"><label class="ph__label" for="elN">' + L("Скільки років показати", "How many years") + '</label><select class="ph__unit ph__unit--wide" id="elN">' + [10, 20, 30, 50].map((n) => '<option value="' + n + '"' + (n === 20 ? " selected" : "") + ">" + n + "</option>").join("") + '</select></div></div><div class="ph__hint ph__mt12">' + L("Також показано найближчі роки, коли обидва Великодні збігаються (раз на кілька років; 2044 р. збігу немає).", "Also shown are the nearest years when both Easters coincide (every few years; there is no coincidence in 2044).") + "</div>";
      el("elY").addEventListener("input", maybeCalc); el("elN").addEventListener("change", maybeCalc);
    },
    calc(h) {
      const { el, esc } = h, s = el("elY").value.trim();
      if (!s) return { ok: false, incomplete: true };
      const y0 = yearOf(s), n = Number(el("elN").value);
      if (!OK(y0)) return { ok: false, msg: YERR };
      if (y0 + n - 1 > 4099) return { ok: false, msg: L("Список виходить за 4099 рік — зменште рік або кількість.", "The list goes beyond 4099 — lower the year or the count.") };
      const rows = []; let coin = 0, maxDiff = 0;
      for (let y = y0; y < y0 + n; y++) { const o = C.easterOrthodoxGreg(y), c = C.easterGregorian(y), d = J(o) - J(c); if (same(o, c)) coin++; maxDiff = Math.max(maxDiff, Math.abs(d)); rows.push({ cells: [String(y), short(o), short(c), same(o, c) ? { t: "✓ " + L("збіг", "same day"), cls: "chip ok" } : { t: Math.abs(d) + L(" дн.", " days"), cls: "muted" }], main: same(o, c) }); }
      const next = []; for (let y = y0; y <= 4099 && next.length < 6; y++) if (same(C.easterOrthodoxGreg(y), C.easterGregorian(y))) next.push(y);
      const table = '<div class="ph__sub">' + L("Великдень за роками", "Easter by year") + "</div>" + PhysUI.list([L("Рік", "Year"), L("Православний", "Orthodox"), L("Католицький", "Catholic"), L("Різниця", "Difference")], rows, { w: "70px minmax(0, 1fr) minmax(0, 1fr) 110px" });
      const steps = [{ t: L("Рахуємо обидві пасхалії для кожного року", "Computing both computus for every year"), l: [L("Років: ", "Years: ") + n + L(", збігів: ", ", coincidences: ") + coin + L(", найбільша різниця: ", ", largest difference: ") + maxDiff + L(" дн.", " days")] }, { t: L("Шукаємо найближчі збіги", "Looking for the nearest coincidences"), l: [next.join(", ") || "—"], note: L("Дати збігаються, коли перше повне місяцеве свято за двома календарями припадає на ту саму неділю.", "The dates coincide when the first full moon of the two computus lands on the same Sunday.") }];
      return { ok: true, expr: L("Великдень ", "Easter ") + y0 + "–" + (y0 + n - 1), head: [L("збігів", "coincidences"), String(coin)], headSub: L("найближчі збіги: ", "nearest coincidences: ") + (next.slice(0, 4).join(", ") || "—"), subRaw: true, tiles: [{ k: L("Років у списку", "Years in the list"), v: String(n) }, { k: L("Збіги", "Coincidences"), v: String(coin) }, { k: L("Найбільша різниця", "Largest difference"), v: maxDiff + L(" дн.", " days") }], extraHtml: table, steps, resText: L("Збіги Великодня з ", "Coincidences from ") + y0 + ": " + next.join(", ") };
    },
    reset(h) { h.el("elY").value = ""; h.el("elN").value = "20"; },
    fill(h) { h.el("elY").value = "2026"; h.el("elN").value = "20"; },
    share(p, h) { if (h.el("elY").value.trim()) { p.set("y", h.el("elY").value.trim()); p.set("n", h.el("elN").value); } },
    apply(qs, h) { if (qs.has("y")) h.el("elY").value = qs.get("y").slice(0, 4); if (qs.has("n") && [10, 20, 30, 50].includes(Number(qs.get("n")))) h.el("elN").value = qs.get("n"); }
  };

  return { modes: [one, list], exactNote: false };
});
