/* mp-calc.js — фази Місяця: фаза на дату з малюнком і найближчими подіями, календар фаз на місяць, усі головні фази року */
PhysCalc.start(({ L }) => {
  const A = window.Ag, M = window.Mp, UI = window.PhysUI;
  const IS_EN = L(false, true);
  M.setZone(IS_EN ? "UTC" : "Europe/Kyiv");
  const NOTE = L("Моменти фаз і положення Місяця рахуються за астрономічними формулами (Жан Меєус, «Astronomical Algorithms»): моменти головних фаз із точністю до кількох хвилин, освітленість приблизно ±0,5%. Часи показано за київським часом і UTC. Малюнок умовний: це схема фази, а не знімок. Вигляд Місяця залежить від півкулі: у південній він дзеркальний. Народні традиції (посадки, риболовля) наукового підтвердження не мають.", "The moments of the phases and the position of the Moon are calculated with astronomical formulas (Jean Meeus, “Astronomical Algorithms”): the main phases to within a few minutes, the illumination to about ±0.5%. Times are shown in UTC. The picture is schematic: a diagram of the phase, not a photograph. The look of the Moon depends on the hemisphere: in the southern one it is mirrored. Folk traditions (planting, fishing) have no scientific support.");
  const PH = L(["Молодик", "Зростаючий серп", "Перша чверть", "Зростаючий випуклий", "Повний місяць", "Спадаючий випуклий", "Остання чверть", "Спадаючий серп"], ["New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous", "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent"]);
  const EMO = ["🌑", "🌒", "🌓", "🌔", "🌕", "🌖", "🌗", "🌘"];
  const emo = (idx, south) => EMO[south ? (8 - idx) % 8 : idx];
  const MGEN = L(["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"], ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
  const MNOM = L(["Січень", "Лютий", "Березень", "Квітень", "Травень", "Червень", "Липень", "Серпень", "Вересень", "Жовтень", "Листопад", "Грудень"], ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
  const WDS = L(["нд", "пн", "вт", "ср", "чт", "пт", "сб"], ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]);
  const EVN = L(["Молодик", "Перша чверть", "Повний місяць", "Остання чверть"], ["New Moon", "First Quarter", "Full Moon", "Last Quarter"]);
  const p2 = (n) => String(n).padStart(2, "0"), dec = (x, n) => x.toFixed(n === undefined ? 1 : n).replace(".", IS_EN ? "." : ",");
  const rm = (t) => Math.round(t / 6e4) * 6e4;
  // час події: UA — київський час (+ UTC), EN — UTC
  const when = (t) => { const r = rm(t), k = M.kyivWall(r), u = new Date(r); return IS_EN ? MGEN[u.getUTCMonth()] + " " + u.getUTCDate() + ", " + u.getUTCFullYear() + ", " + p2(u.getUTCHours()) + ":" + p2(u.getUTCMinutes()) + " UTC" : k.d + " " + MGEN[k.m - 1] + " " + k.y + ", " + p2(k.h) + ":" + p2(k.mi) + " (Київ), " + p2(u.getUTCHours()) + ":" + p2(u.getUTCMinutes()) + " UTC"; };
  const whenShort = (t) => { const r = rm(t), k = M.kyivWall(r), u = new Date(r); return IS_EN ? MGEN[u.getUTCMonth()].slice(0, 3) + " " + u.getUTCDate() + ", " + p2(u.getUTCHours()) + ":" + p2(u.getUTCMinutes()) + " UTC" : k.d + " " + MGEN[k.m - 1] + ", " + p2(k.h) + ":" + p2(k.mi); };
  const dayTime = (t) => { const r = rm(t), k = M.kyivWall(r), u = new Date(r); return IS_EN ? u.getUTCDate() + ", " + p2(u.getUTCHours()) + ":" + p2(u.getUTCMinutes()) + " UTC" : k.d + ", " + p2(k.h) + ":" + p2(k.mi); };
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const inp = (id, ph) => '<input class="ph__input" id="' + id + '" type="text" inputmode="numeric" autocomplete="off" maxlength="4" placeholder="' + ph + '" aria-label="' + id + '">';
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const warnHtml = (ws) => ws.map((t) => hint("⚠ " + t)).join("");
  const setV = (el, id, v) => { const e = el(id); if (!e) return; e.value = String(v); e.dispatchEvent(new Event("change", { bubbles: true })); };
  const bind = (el, maybeCalc, ids) => ids.forEach((id) => { const e = el(id); e.addEventListener("input", maybeCalc); e.addEventListener("change", maybeCalc); e.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); maybeCalc(); } }); });
  const hemOpts = () => [["n", L("Північна (Україна, Європа, США)", "Northern (Europe, USA)")], ["s", L("Південна (Австралія, Бразилія)", "Southern (Australia, Brazil)")]];
  const fold = (key, title, inner) => '<details class="ph__details ph__fold" data-keep="' + key + '"><summary>' + title + '</summary><div class="ph__foldBody">' + inner + "</div></details>";
  const readYear = (el, id, name) => { const s = el(id).value.trim(); if (s === "") return { incomplete: true }; const y = /^\d{1,4}$/.test(s) ? Number(s) : null; return y === null || y < 1900 || y > 2100 ? { err: L(name + " — ціле число від 1900 до 2100.", name + " must be a whole number from 1900 to 2100.") } : { y }; };
  const today = () => { const t = new Date(); return { y: t.getFullYear(), m: t.getMonth() + 1, d: t.getDate() }; };
  const picture = (a, k, south, name) => '<div style="text-align:center;margin:14px 0 4px">' + M.svg(a, south, 150, L("Місяць: " + name + ", освітленість " + Math.round(k * 100) + "%", "The Moon: " + name + ", " + Math.round(k * 100) + "% illuminated")) + '<div class="ph__hint" style="margin-top:6px">' + name + " · " + Math.round(k * 100) + "%</div></div>";

  // ====================== фаза на дату ======================
  const day = {
    key: "day", type: "custom", req: () => [], nameUk: "Фаза на дату", nameEn: "Phase on a date",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      const timeIn = '<input class="ph__input" type="text" inputmode="numeric" autocomplete="off" maxlength="5" id="mpT" placeholder="' + L("гг:хх", "hh:mm") + '" aria-label="mpT">';
      body.innerHTML = '<div class="ph__vars">' + fld("mpD", L("Дата", "Date"), '<input class="ph__input" type="date" id="mpD" min="1900-01-01" max="2100-12-31" data-default-label="' + L("Сьогодні", "Today") + '" aria-label="mpD">') + fld("mpT", L("Час за Києвом (необов'язково)", "Time in UTC (optional)"), '<div class="ph__inl">' + timeIn + '<button type="button" class="ph__btn ph__btn--primary ph__btn--sm" id="mpNow">' + L("Зараз", "Now") + "</button></div>") + fld("mpH", L("Півкуля", "Hemisphere"), sel("mpH", hemOpts(), "n"), true) + "</div>" + hint(L("Дата за замовчуванням — сьогодні, час — полудень за Києвом. Якщо час не вказано, фаза береться на полудень. Рахується для років 1900–2100.", "The date is today by default and the time is UTC. If you give no time, the phase is taken at noon UTC. Years 1900–2100 are supported."));
      setV(el, "mpD", ""); bind(el, maybeCalc, ["mpD", "mpT", "mpH"]);
      el("mpT").addEventListener("input", () => { const d = el("mpT").value.replace(/\D/g, "").slice(0, 4); if (el("mpT").value.indexOf(":") < 0 && d.length === 4) el("mpT").value = d.slice(0, 2) + ":" + d.slice(2); });
      el("mpNow").addEventListener("click", () => { const n = new Date(), k = M.kyivWall(n.getTime()); setV(el, "mpD", k.y + "-" + p2(k.m) + "-" + p2(k.d)); el("mpT").value = p2(k.h) + ":" + p2(k.mi); h.calc(true); });
    },
    calc(h) {
      const { el } = h, s = el("mpD").value.trim(), south = el("mpH").value === "s";
      let y, m, d; if (!s) { const t0 = M.kyivWall(Date.now()); y = t0.y; m = t0.m; d = t0.d; } else { const dn = A.parseISO(s); if (dn === null) return { ok: false, msg: L("Дата — коректна дата.", "The date must be a valid date.") }; const p = A.parts(dn); y = p.y; m = p.m; d = p.d; }
      if (y < 1900 || y > 2100) return { ok: false, msg: L("Дата — від 1900 до 2100 року.", "The date must be from 1900 to 2100.") };
      const ts = el("mpT").value.trim(), sec = ts ? A.parseTime(ts) : 12 * 3600;
      if (sec === null) return { ok: false, msg: L("Час вводьте як гг:хх, наприклад 21:30.", "Enter the time as hh:mm, for example 21:30.") };
      const t = window.Ct.instant(y, m, d, sec, M.zoneId()), a = M.elong(t), k = (1 - Math.cos((a * Math.PI) / 180)) / 2, ph = M.phaseOf(t), ar = M.around(t), age = ar.prevNew ? (t - ar.prevNew.t) / 864e5 : null, name = PH[ph.idx];
      const NXN = L(["Наступний молодик", "Наступна перша чверть", "Наступний повний місяць", "Наступна остання чверть"], ["Next New Moon", "Next First Quarter", "Next Full Moon", "Next Last Quarter"]);
      const inDays = (e) => L("через ", "in ") + dec((e.t - t) / 864e5, 1) + L(" доби", " days");
      const evRows = (ar.prevNew ? [{ cells: [{ t: L("Попередній молодик", "Previous New Moon"), cls: "is-first" }, whenShort(ar.prevNew.t), L("було ", "was ") + dec((t - ar.prevNew.t) / 864e5, 1) + L(" доби тому", " days ago")] }] : []).concat([0, 1, 2, 3].filter((q) => ar.next[q]).sort((x, y) => ar.next[x].t - ar.next[y].t).map((q) => ({ cells: [{ t: NXN[q], cls: "is-first" }, whenShort(ar.next[q].t), inDays(ar.next[q])] })));
      const evList = '<div class="ph__sub">' + L("Найближчі події", "Nearest events") + "</div>" + UI.list([L("Подія", "Event"), L("Коли", "When"), L("Через", "In")], evRows, { w: "minmax(0, 1.5fr) minmax(0, 1.4fr) minmax(0, 1fr)" });
      const tiles = [{ k: L("Освітленість", "Illumination"), v: dec(k * 100, 1) + "%" }, { k: L("Вік Місяця", "Age of the Moon"), v: age === null ? "—" : dec(age, 1) + L(" доби", " days") }, { k: L("Кут Місяць–Сонце", "Moon–Sun angle"), v: dec(a, 1) + "°" }];
      const ml = M.moonLon(t), sl = M.sunLon(t), steps = [{ t: L("Кут між Місяцем і Сонцем", "The angle between the Moon and the Sun"), l: [L("довгота Місяця ", "Moon longitude ") + dec(ml, 1) + "° − " + L("довгота Сонця ", "Sun longitude ") + dec(sl, 1) + "° = " + dec(a, 1) + "°"], note: L("0° — молодик, 90° — перша чверть, 180° — повний місяць, 270° — остання чверть.", "0° is the New Moon, 90° the First Quarter, 180° the Full Moon, 270° the Last Quarter.") }, { t: L("Освітленість", "Illumination"), l: ["(1 − cos " + dec(a, 1) + "°) / 2 = " + dec(k * 100, 1) + "%"] }, { t: L("Вік Місяця", "Age of the Moon"), l: [ar.prevNew ? L("від молодика ", "since the New Moon ") + whenShort(ar.prevNew.t) + " " + L("минуло ", "") + dec(age, 1) + L(" доби", " days") : "—"] }, { t: L("Фаза", "Phase"), l: [name + (ph.principal ? " (" + L("точний момент ", "exact moment ") + dayTime(ph.at) + ")" : "")], note: ph.principal ? L("Головна фаза має точний момент протягом цієї доби.", "The main phase has its exact moment during this day.") : L("Між головними фазами назва залежить від кута: серп, коли освітлено менше половини, випуклий — більше.", "Between the main phases the name depends on the angle: crescent when less than half is lit, gibbous when more.") }];
      const wsarn = ph.principal ? [L("Точний момент фази «" + name + "»: " + when(ph.at) + ".", "The exact moment of the " + name + ": " + when(ph.at) + ".")] : [];
      return { ok: true, expr: (s ? "" : L("Сьогодні, ", "Today, ")) + (IS_EN ? MGEN[m - 1] + " " + d + ", " + y : d + " " + MGEN[m - 1] + " " + y) + (ts ? ", " + ts : ""), head: [L("фаза Місяця", "Moon phase"), emo(ph.idx, south) + " " + name], subRaw: true, headSub: L("освітленість ", "illumination ") + dec(k * 100, 0) + "%" + (age === null ? "" : L(" · вік ", " · age ") + dec(age, 1) + L(" доби", " days")), tiles, extraHtml: picture(a, k, south, name) + warnHtml(wsarn) + evList, note: NOTE, steps, resText: name + ", " + L("освітленість ", "illumination ") + dec(k * 100, 0) + "%, " + L("вік ", "age ") + (age === null ? "—" : dec(age, 1)) };
    },
    reset(h) { const { el } = h; setV(el, "mpD", ""); el("mpT").value = ""; el("mpH").value = "n"; },
    fill(h) { const { el } = h; setV(el, "mpD", "2024-01-25"); el("mpT").value = "21:00"; el("mpH").value = "n"; },
    share(p, h) { const { el } = h; if (el("mpD").value) p.set("pd", el("mpD").value); if (el("mpT").value.trim()) p.set("pt", el("mpT").value.trim()); p.set("ph", el("mpH").value); },
    apply(qs, h) { const { el } = h; if (qs.has("pd") && A.parseISO(qs.get("pd")) !== null) setV(el, "mpD", qs.get("pd")); if (qs.has("pt") && A.parseTime(qs.get("pt")) !== null) el("mpT").value = String(qs.get("pt")).replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d{2})$/, "$1:$2"); if (["n", "s"].includes(qs.get("ph"))) el("mpH").value = qs.get("ph"); }
  };

  // ====================== календар на місяць ======================
  const monthOpts = () => MNOM.map((m, i) => [i + 1, m]);
  const month = {
    key: "month", type: "custom", req: () => ["mpY"], nameUk: "Календар на місяць", nameEn: "Calendar for a month",
    build(body, x, h) {
      const { el, maybeCalc } = h, t = today();
      body.innerHTML = '<div class="ph__vars">' + fld("mpM", L("Місяць", "Month"), sel("mpM", monthOpts(), t.m)) + fld("mpY", L("Рік", "Year"), inp("mpY", String(t.y))) + fld("mpH", L("Півкуля", "Hemisphere"), sel("mpH", hemOpts(), "n"), true) + "</div>" + hint(L("Для кожного дня показано фазу й освітленість на полудень за Києвом, а головні фази позначено точним часом. Роки 1900–2100.", "Each day shows the phase and illumination at noon UTC, and the main phases are marked with their exact time. Years 1900–2100."));
      setV(el, "mpY", t.y); bind(el, maybeCalc, ["mpM", "mpY", "mpH"]);
    },
    calc(h) {
      const { el } = h, y = readYear(el, "mpY", L("Рік", "The year"));
      if (y.incomplete) return { ok: false, incomplete: true };
      if (y.err) return { ok: false, msg: y.err };
      const m = Number(el("mpM").value), south = el("mpH").value === "s", dim = new Date(Date.UTC(y.y, m, 0)).getUTCDate();
      const t0 = M.kyivStart(y.y, m, 1), t1 = M.kyivStart(m === 12 ? y.y + 1 : y.y, m === 12 ? 1 : m + 1, 1), evs = M.events(t0, t1);
      const rows = []; let blue = 0; evs.forEach((e) => { if (e.type === 2) blue++; });
      for (let d = 1; d <= dim; d++) { const ts = M.kyivStart(y.y, m, d), noon = ts + 12 * 3600e3, ph = M.phaseOf(noon), k = M.illum(noon), wd = new Date(Date.UTC(y.y, m - 1, d)).getUTCDay();
        rows.push({ cells: [{ t: String(d), cls: "is-first" }, WDS[wd], emo(ph.idx, south) + " " + PH[ph.idx] + (ph.principal ? " · " + dayTime(ph.at).replace(/^\d+, /, "") : ""), Math.round(k * 100) + "%"] }); }
      const full = evs.filter((e) => e.type === 2), nwm = evs.filter((e) => e.type === 0);
      const tiles = evs.map((e) => ({ k: emo(e.type * 2, south) + " " + EVN[e.type], v: whenShort(e.t) }));
      const headV = full.length ? full.map((e) => dayTime(e.t)).join(" · ") : "—";
      const warns = blue > 1 ? [L("У цьому місяці два повні місяці: другий називають «блакитним місяцем» (це не колір, а назва).", "This month has two Full Moons: the second one is called a “Blue Moon” (it is a name, not a color).")] : [];
      const steps = [{ t: L("Головні фази місяця", "The main phases of the month"), l: evs.map((e) => EVN[e.type] + ": " + when(e.t)) }, { t: L("Фаза кожного дня", "The phase of each day"), l: [L("для кожної доби береться кут Місяць–Сонце на полудень; добу з точним моментом головної фази позначено цією фазою.", "for each day the Moon–Sun angle at noon is taken; the day that holds the exact moment of a main phase is marked with that phase.")] }];
      return { ok: true, expr: MNOM[m - 1] + " " + y.y, head: [L("повний місяць", "Full Moon"), headV], subRaw: true, headSub: L("молодик: ", "New Moon: ") + (nwm.length ? nwm.map((e) => dayTime(e.t)).join(" · ") : "—") + (blue > 1 ? L(" · блакитний місяць", " · Blue Moon") : ""), tiles, extraHtml: '<div class="ph__sub">' + L("Дні місяця", "Days of the month") + "</div>" + UI.list([L("Число", "Day"), L("День", "Weekday"), L("Фаза", "Phase"), L("Освітленість", "Illumination")], rows, { w: "70px 70px minmax(0, 2fr) 120px" }) + warnHtml(warns), note: NOTE, steps, resText: MNOM[m - 1] + " " + y.y + ": " + evs.map((e) => EVN[e.type] + " " + dayTime(e.t)).join("; ") };
    },
    reset(h) { const { el } = h, t = today(); setV(el, "mpM", t.m); setV(el, "mpY", t.y); el("mpH").value = "n"; },
    fill(h) { const { el } = h; setV(el, "mpM", 5); setV(el, "mpY", 2026); el("mpH").value = "n"; },
    share(p, h) { const { el } = h; p.set("pm", el("mpM").value); if (el("mpY").value.trim()) p.set("py", el("mpY").value.trim()); p.set("ph", el("mpH").value); },
    apply(qs, h) { const { el } = h; if (/^([1-9]|1[0-2])$/.test(qs.get("pm") || "")) setV(el, "mpM", qs.get("pm")); if (/^\d{4}$/.test(qs.get("py") || "")) setV(el, "mpY", qs.get("py")); if (["n", "s"].includes(qs.get("ph"))) el("mpH").value = qs.get("ph"); }
  };

  // ====================== фази за рік ======================
  const year = {
    key: "year", type: "custom", req: () => ["mpY"], nameUk: "Фази за рік", nameEn: "Phases for a year",
    build(body, x, h) {
      const { el, maybeCalc } = h, t = today();
      body.innerHTML = '<div class="ph__vars">' + fld("mpY", L("Рік", "Year"), inp("mpY", String(t.y))) + fld("mpH", L("Півкуля", "Hemisphere"), sel("mpH", hemOpts(), "n")) + "</div>" + hint(L("Усі молодики, чверті й повні місяці року з точним часом. Місяці з двома повними місяцями позначено як блакитні. Роки 1900–2100.", "All New Moons, quarters and Full Moons of the year with exact times. Months with two Full Moons are marked as blue. Years 1900–2100."));
      setV(el, "mpY", t.y); bind(el, maybeCalc, ["mpY", "mpH"]);
    },
    calc(h) {
      const { el } = h, y = readYear(el, "mpY", L("Рік", "The year"));
      if (y.incomplete) return { ok: false, incomplete: true };
      if (y.err) return { ok: false, msg: y.err };
      const south = el("mpH").value === "s", evs = M.events(M.kyivStart(y.y, 1, 1), M.kyivStart(y.y + 1, 1, 1)), by = {}, cnt = [0, 0, 0, 0];
      evs.forEach((e) => { const w = M.kyivWall(e.t); (by[w.m] = by[w.m] || [[], [], [], []])[e.type].push(e.t); cnt[e.type]++; });
      const blueM = Object.keys(by).filter((m) => by[m][2].length > 1).map(Number);
      const rows = []; for (let m = 1; m <= 12; m++) { const r = by[m] || [[], [], [], []]; rows.push({ cells: [{ t: MNOM[m - 1] + (r[2].length > 1 ? " 🔵" : ""), cls: "is-first" }].concat([0, 1, 2, 3].map((q) => (r[q].length ? r[q].map(dayTime).join("; ") : "—"))) }); }
      const hdr = [L("Місяць", "Month")].concat([0, 1, 2, 3].map((q) => emo(q * 2, south) + " " + EVN[q]));
      const tiles = [{ k: L("Молодиків", "New Moons"), v: String(cnt[0]) }, { k: L("Повних місяців", "Full Moons"), v: String(cnt[2]) }, { k: L("Блакитний місяць", "Blue Moon"), v: blueM.length ? blueM.map((m) => MNOM[m - 1]).join(", ") : L("немає", "none") }];
      const steps = [{ t: L("Моменти фаз", "Moments of the phases"), l: [L("для кожного циклу рахується момент молодика, першої чверті, повного місяця й останньої чверті", "for each cycle the moment of the New Moon, First Quarter, Full Moon and Last Quarter is calculated")], note: L("Один цикл триває близько 29,53 доби, тож у році 12 або 13 повних місяців.", "One cycle lasts about 29.53 days, so a year has 12 or 13 Full Moons.") }];
      return { ok: true, expr: L("Фази Місяця у ", "Moon phases in ") + y.y, head: [L("повних місяців", "Full Moons"), String(cnt[2])], subRaw: true, headSub: L("молодиків: ", "New Moons: ") + cnt[0] + (blueM.length ? L(" · блакитний місяць: ", " · Blue Moon: ") + blueM.map((m) => MNOM[m - 1]).join(", ") : ""), tiles, extraHtml: '<div class="ph__sub">' + L("Головні фази за місяцями", "The main phases by month") + "</div>" + UI.list(hdr, rows, { w: "minmax(0, 1.1fr) repeat(4, minmax(0, 1fr))" }) + hint(L("Час: число й година за київським часом.", "Time: day and hour in UTC.")), note: NOTE, steps, resText: L("Фази Місяця у ", "Moon phases in ") + y.y + L(": повних місяців ", ": Full Moons ") + cnt[2] + L(", молодиків ", ", New Moons ") + cnt[0] };
    },
    reset(h) { const { el } = h, t = today(); setV(el, "mpY", t.y); el("mpH").value = "n"; },
    fill(h) { const { el } = h; setV(el, "mpY", 2026); el("mpH").value = "n"; },
    share(p, h) { const { el } = h; if (el("mpY").value.trim()) p.set("pr", el("mpY").value.trim()); p.set("ph", el("mpH").value); },
    apply(qs, h) { const { el } = h; if (/^\d{4}$/.test(qs.get("pr") || "")) setV(el, "mpY", qs.get("pr")); if (["n", "s"].includes(qs.get("ph"))) el("mpH").value = qs.get("ph"); }
  };
  return { modes: [day, month, year], exactNote: false };
});
