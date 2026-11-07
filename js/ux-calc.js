/* ux-calc.js — unix-час: timestamp → дата (автовизначення одиниці, пояс, ISO 8601, RFC 2822), дата → timestamp, інші епохи (FILETIME, .NET, Excel, Apple, HFS+, WebKit, юліанський день) */
PhysCalc.start(({ L }) => {
  const A = window.Ag, X = window.Ux, T = window.Tz, UI = window.PhysUI;
  const IS_EN = L(false, true);
  const NOTE = L("Unix-час — кількість секунд від 1 січня 1970 року 00:00:00 UTC без урахування високосних секунд (за стандартом POSIX кожна доба має рівно 86400 секунд). Числа розбираються точно (до наносекунд), без втрати точності. Правила часових поясів беруться з бази браузера (IANA). Фрагменти коду типові, перевіряйте їх для своєї версії мови.", "Unix time is the number of seconds since January 1, 1970 00:00:00 UTC, not counting leap seconds (under POSIX every day has exactly 86,400 seconds). Numbers are parsed exactly (down to nanoseconds) with no loss of precision. Time zone rules come from the browser's database (IANA). The code snippets are typical, check them for your version of the language.");
  const WDN = L(["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"], ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
  const UN = L({ s: "секунди", ms: "мілісекунди", us: "мікросекунди", ns: "наносекунди" }, { s: "seconds", ms: "milliseconds", us: "microseconds", ns: "nanoseconds" });
  const pl = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b >= 2 && b <= 4 ? f[1] : f[2]; };
  const p2 = (n) => String(n).padStart(2, "0");
  const grpN = (s) => String(s).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const warnHtml = (ws) => ws.map((t) => hint("⚠ " + t)).join("");
  const setV = (el, id, v) => { const e = el(id); if (!e) return; e.value = String(v); e.dispatchEvent(new Event("change", { bubbles: true })); };
  const bind = (el, maybeCalc, ids) => ids.forEach((id) => { const e = el(id); e.addEventListener("input", maybeCalc); e.addEventListener("change", maybeCalc); e.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); maybeCalc(); } }); });
  const fold = (key, title, inner) => '<details class="ph__details ph__fold" data-keep="' + key + '"><summary>' + title + '</summary><div class="ph__foldBody">' + inner + "</div></details>";
  const devZone = () => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC"; } catch (e) { return "UTC"; } };
  // ----- пояси -----
  const zoneOpts = () => '<option value="UTC">UTC</option><option value="local">' + L("Мій часовий пояс (", "My time zone (") + devZone() + ')</option>' + T.REGIONS.map(([k, u, e]) => '<optgroup label="' + L(u, e) + '">' + T.ZONES.filter((z) => z[3] === k).map((z) => '<option value="' + z[0] + '">' + L(z[1], z[2]) + "</option>").join("") + "</optgroup>").join("");
  const zoneSel = (id) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + zoneOpts() + "</select>";
  const zoneId = (v) => (v === "UTC" ? "UTC" : v === "local" ? devZone() : T.zid(v));
  const zoneName = (v) => (v === "UTC" ? "UTC" : v === "local" ? L("мій часовий пояс", "my time zone") : T.zoneName(v));
  // ----- відносний час -----
  function rel(ms) {
    const diff = ms - Date.now(), a = Math.abs(diff), sec = Math.floor(a / 1000), past = diff < 0;
    if (sec < 5) return L("зараз", "now");
    const suf = (t) => (past ? L(t + " тому", t + " ago") : L("через " + t, "in " + t));
    if (sec < 60) return suf(sec + L(" с", " s"));
    if (sec < 3600) return suf(Math.floor(sec / 60) + L(" хв", " min"));
    if (sec < 86400) { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60); return suf(h + L(" год", " h") + (m ? " " + m + L(" хв", " min") : "")); }
    const a1 = Math.min(ms, Date.now()), b1 = Math.max(ms, Date.now()), da = A.dnOf(new Date(a1).getUTCFullYear(), new Date(a1).getUTCMonth() + 1, new Date(a1).getUTCDate()), db = A.dnOf(new Date(b1).getUTCFullYear(), new Date(b1).getUTCMonth() + 1, new Date(b1).getUTCDate()), r = A.ymd(da, db, "feb28"), ps = [];
    if (r.years) ps.push(r.years + " " + L(pl(r.years, ["рік", "роки", "років"]), r.years === 1 ? "year" : "years"));
    if (r.months) ps.push(r.months + " " + L(pl(r.months, ["місяць", "місяці", "місяців"]), r.months === 1 ? "month" : "months"));
    if (r.days || !ps.length) ps.push(r.days + " " + L(pl(r.days, ["день", "дні", "днів"]), r.days === 1 ? "day" : "days"));
    return suf(ps.slice(0, 3).join(" "));
  }
  const readable = (d) => { const w = d.w; return (w.y >= 0 && w.y <= 9999 ? String(w.y).padStart(4, "0") : (w.y < 0 ? "-" : "+") + String(Math.abs(w.y)).padStart(6, "0")) + "-" + p2(w.m) + "-" + p2(w.d) + " " + p2(w.h) + ":" + p2(w.mi) + ":" + p2(w.s) + (d.fracNs ? "." + d.fracNs.toString().padStart(9, "0").replace(/0+$/, "") : ""); };
  const dedupe = (rows, zone) => (zone === "UTC" ? rows.filter((r) => !(r[0].indexOf("ISO 8601 (") === 0 && r[0] !== "ISO 8601 (UTC)")) : rows);
  const fmtList = (rows) => UI.list([L("Формат", "Format"), L("Значення", "Value")], rows.map(([k, v]) => ({ cells: [{ t: k, cls: "is-first" }, v] })), { w: "minmax(0, 1fr) minmax(0, 2.2fr)" });
  const codeFold = (sec) => { const S = String(sec), rows = [["JavaScript", "new Date(" + S + " * 1000).toISOString()"], ["Python", "datetime.fromtimestamp(" + S + ", tz=timezone.utc)"], ["PHP", "gmdate('c', " + S + ");"], ["Go", "time.Unix(" + S + ", 0).UTC()"], ["Java", "Instant.ofEpochSecond(" + S + "L)"], ["C#", "DateTimeOffset.FromUnixTimeSeconds(" + S + ")"], ["Bash (GNU)", "date -u -d @" + S], ["PostgreSQL", "SELECT to_timestamp(" + S + ");"], ["MySQL", "SELECT FROM_UNIXTIME(" + S + ");"]], now = [["JavaScript", "Math.floor(Date.now() / 1000)"], ["Python", "int(time.time())"], ["PHP", "time()"], ["Go", "time.Now().Unix()"], ["Java", "Instant.now().getEpochSecond()"], ["Bash", "date +%s"]];
    return fold("uxCode", L("Як отримати в коді", "How to get it in code"), UI.list([L("Мова", "Language"), L("Timestamp → дата", "Timestamp → date")], rows.map(([k, v]) => ({ cells: [{ t: k, cls: "is-first" }, v] })), { w: "minmax(0, 1fr) minmax(0, 2.6fr)" }) + UI.list([L("Мова", "Language"), L("Поточний timestamp", "Current timestamp")], now.map(([k, v]) => ({ cells: [{ t: k, cls: "is-first" }, v] })), { w: "minmax(0, 1fr) minmax(0, 2.6fr)" })); };
  const unitOpts = () => [["auto", L("Авто (за кількістю цифр)", "Auto (by number of digits)")], ["s", L("Секунди", "Seconds")], ["ms", L("Мілісекунди", "Milliseconds")], ["us", L("Мікросекунди", "Microseconds")], ["ns", L("Наносекунди", "Nanoseconds")]];
  // живий лічильник у формі: зупиняється, коли елемент зникає
  let liveIv = 0;
  const startLive = () => { clearInterval(liveIv); const tick = () => { const e = document.getElementById("uxNow"); if (!e) { clearInterval(liveIv); return; } e.textContent = Math.floor(Date.now() / 1000); const m = document.getElementById("uxNowMs"); if (m) m.textContent = Date.now(); }; tick(); liveIv = setInterval(tick, 1000); };
  const liveHint = () => '<div class="ph__hint ph__mt12">' + L("Зараз: ", "Now: ") + '<b id="uxNow">…</b> ' + L("с", "s") + ' · <span id="uxNowMs">…</span> ' + L("мс", "ms") + "</div>";

  // ====================== timestamp → дата ======================
  const ts = {
    key: "ts", type: "custom", req: () => ["uxV"], nameUk: "Timestamp → дата", nameEn: "Timestamp → date",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      const valIn = '<input class="ph__input" type="text" inputmode="decimal" autocomplete="off" maxlength="40" id="uxV" placeholder="1700000000" aria-label="uxV">';
      body.innerHTML = '<div class="ph__vars">' + fld("uxV", "Unix timestamp", '<div class="ph__inl">' + valIn + '<button type="button" class="ph__btn ph__btn--primary ph__btn--sm" id="uxNowBtn">' + L("Зараз", "Now") + "</button></div>", true) + fld("uxU", L("Одиниця", "Unit"), sel("uxU", unitOpts(), "auto")) + fld("uxZ", L("Часовий пояс результату", "Result time zone"), zoneSel("uxZ")) + "</div>" + liveHint() + hint(L("Одиниця визначається автоматично: до 11 цифр секунди, до 14 мілісекунди, до 17 мікросекунди, більше наносекунди. Можна з мінусом (до 1970 року) і дробовою частиною.", "The unit is detected automatically: up to 11 digits seconds, up to 14 milliseconds, up to 17 microseconds, more nanoseconds. A minus sign (before 1970) and a fractional part are allowed."));
      el("uxZ").value = "UTC"; bind(el, maybeCalc, ["uxV", "uxU", "uxZ"]); startLive();
      el("uxNowBtn").addEventListener("click", () => { el("uxV").value = String(Math.floor(Date.now() / 1000)); el("uxU").value = "auto"; h.calc(true); });
    },
    calc(h) {
      const { el } = h, raw = el("uxV").value.trim();
      if (!raw) return { ok: false, incomplete: true };
      const p = X.parseNum(raw);
      if (!p) return { ok: false, msg: L("Введіть число: можна з мінусом і дробовою частиною, без літер.", "Enter a number: a minus sign and a fractional part are allowed, no letters.") };
      const uSel = el("uxU").value, u = uSel === "auto" ? X.autoUnit(p) : uSel, nsv = X.toNs(p, X.UNIT[u]), zone = el("uxZ").value, d = X.describe(nsv, zoneId(zone));
      if (!d) return { ok: false, msg: L("Значення виходить за межі дат (приблизно ±275 760 років).", "The value is outside the range of dates (about ±275,760 years).") };
      const zn = zoneName(zone), sec = X.fmtUnit(nsv, X.UNIT.s, 9), warns = [];
      if (uSel === "auto" && u !== "s") warns.push(L("Одиницю визначено автоматично: " + UN[u] + ". Якщо це секунди, оберіть «Секунди» вручну.", "The unit was detected automatically: " + UN[u] + ". If it is seconds, choose “Seconds” manually."));
      if (!d.in32) warns.push(L("Значення (" + X.fmtUnit(d.sec * 1n, 1n, 0) + " с) не вміщається в 32-бітне знакове ціле (від −2 147 483 648 до 2 147 483 647 с, тобто до 19.01.2038 03:14:07 UTC): у старих системах це переповнення (проблема 2038).", "The value (" + d.sec + " s) does not fit into a signed 32-bit integer (−2,147,483,648 to 2,147,483,647 s, i.e. up to Jan 19, 2038 03:14:07 UTC): old systems overflow here (the Year 2038 problem)."));
      const tiles = [{ k: L("Одиниця", "Unit"), v: UN[u] + (uSel === "auto" ? L(" (авто)", " (auto)") : "") }, { k: L("День тижня", "Weekday"), v: WDN[d.w.wd] }, { k: L("День року", "Day of the year"), v: String(d.doy) }, { k: L("Тиждень року (ISO)", "Week of the year (ISO)"), v: L("тиждень " + d.isoWeek.week + ", " + d.isoWeek.year, "week " + d.isoWeek.week + ", " + d.isoWeek.year) }, { k: L("32-бітне ціле", "32-bit integer"), v: d.in32 ? L("вміщається", "fits") : L("не вміщається", "does not fit") }, { k: L("Від сьогодні", "From now"), v: rel(d.ms) }];
      const rows = [["ISO 8601 (UTC)", d.isoUtc], ["ISO 8601 (" + zn + ")", d.isoZone], ["RFC 2822", d.rfcUtc], [L("HTTP-дата", "HTTP date"), d.http], ["SQL (UTC)", d.sql], [L("Секунди", "Seconds"), sec], [L("Мілісекунди", "Milliseconds"), X.fmtUnit(nsv, X.UNIT.ms, 6)], [L("Мікросекунди", "Microseconds"), X.fmtUnit(nsv, X.UNIT.us, 3)], [L("Наносекунди", "Nanoseconds"), X.fmtUnit(nsv, X.UNIT.ns, 0)]];
      const steps = [{ t: L("Розбір числа", "Parsing the number"), l: [L("значення " + raw + " як " + UN[u], "the value " + raw + " as " + UN[u])], note: L("Число розбирається точно, без округлення до десяткових JS-чисел.", "The number is parsed exactly, without rounding to JavaScript floats.") }, { t: L("В секунди від 1970-01-01 UTC", "To seconds since 1970-01-01 UTC"), l: [sec + " " + L("с", "s")] }, { t: L("Дата в зоні «" + zn + "»", "The date in “" + zn + "”"), l: [readable(d) + " (UTC" + (d.w.off >= 0 ? "+" : "−") + p2(Math.floor(Math.abs(d.w.off) / 3600)) + ":" + p2(Math.floor((Math.abs(d.w.off) % 3600) / 60)) + ")"] }];
      return { ok: true, expr: raw + " · " + UN[u], head: [L("дата й час: ", "date and time: ") + zn, readable(d)], subRaw: true, headSub: WDN[d.w.wd] + " · " + rel(d.ms), tiles, extraHtml: warnHtml(warns) + '<div class="ph__sub">' + L("Формати", "Formats") + "</div>" + fmtList(dedupe(rows, zone)) + codeFold(X.fmtUnit(nsv, X.UNIT.s, 0).replace(/\..*$/, "")), note: NOTE, steps, resText: raw + " (" + UN[u] + ") = " + d.isoUtc + " (UTC)" };
    },
    reset(h) { const { el } = h; el("uxV").value = ""; el("uxU").value = "auto"; el("uxZ").value = "UTC"; },
    fill(h) { const { el } = h; el("uxV").value = "1700000000"; el("uxU").value = "auto"; el("uxZ").value = "Europe/Kyiv"; },
    share(p, h) { const { el } = h; if (el("uxV").value.trim()) p.set("uv", el("uxV").value.trim().slice(0, 40)); p.set("uu", el("uxU").value); p.set("uz", el("uxZ").value); },
    apply(qs, h) { const { el } = h; if (qs.has("uv") && X.parseNum(qs.get("uv"))) el("uxV").value = qs.get("uv").slice(0, 40); if (["auto", "s", "ms", "us", "ns"].includes(qs.get("uu"))) el("uxU").value = qs.get("uu"); if (["UTC", "local"].includes(qs.get("uz")) || T.known(qs.get("uz"))) el("uxZ").value = qs.get("uz"); }
  };

  // ====================== дата → timestamp ======================
  const dt = {
    key: "dt", type: "custom", req: () => [], nameUk: "Дата → timestamp", nameEn: "Date → timestamp",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      const timeIn = '<input class="ph__input" type="text" inputmode="numeric" autocomplete="off" maxlength="18" id="uxT" placeholder="' + L("гг:хх:сс", "hh:mm:ss") + '" aria-label="uxT">';
      body.innerHTML = '<div class="ph__vars">' + fld("uxD", L("Дата", "Date"), '<input class="ph__input" type="date" id="uxD" min="1000-01-01" max="2999-12-31" data-default-label="' + L("Сьогодні", "Today") + '" aria-label="uxD">') + fld("uxT", L("Час (необов'язково)", "Time (optional)"), '<div class="ph__inl">' + timeIn + '<button type="button" class="ph__btn ph__btn--primary ph__btn--sm" id="uxNowBtn2">' + L("Зараз", "Now") + "</button></div>") + fld("uxZ", L("Часовий пояс введеного часу", "Time zone of the entered time"), zoneSel("uxZ"), true) + "</div>" + hint(L("Час можна вводити з секундами й дробовою частиною: 14:30:05.123. Без часу береться 00:00:00. За замовчуванням пояс UTC.", "The time can include seconds and a fractional part: 14:30:05.123. Without a time, 00:00:00 is used. The default zone is UTC."));
      el("uxZ").value = "UTC"; setV(el, "uxD", ""); bind(el, maybeCalc, ["uxD", "uxT", "uxZ"]);
      el("uxNowBtn2").addEventListener("click", () => { const w = X.wallOf(Date.now(), zoneId(el("uxZ").value)); setV(el, "uxD", w.y + "-" + p2(w.m) + "-" + p2(w.d)); el("uxT").value = p2(w.h) + ":" + p2(w.mi) + ":" + p2(w.s); h.calc(true); });
    },
    calc(h) {
      const { el } = h, zone = el("uxZ").value, zid = zoneId(zone), s = el("uxD").value.trim();
      let y, m, d; if (!s) { const w = X.wallOf(Date.now(), zid); y = w.y; m = w.m; d = w.d; } else { const dn = A.parseISO(s); if (dn === null) return { ok: false, msg: L("Дата — коректна дата.", "The date must be a valid date.") }; const p = A.parts(dn); y = p.y; m = p.m; d = p.d; }
      if (y < 1000 || y > 2999) return { ok: false, msg: L("Дата — від 1000 до 2999 року.", "The date must be from the year 1000 to 2999.") };
      const tstr = el("uxT").value.trim(), tm = tstr ? X.parseTime(tstr) : { h: 0, mi: 0, s: 0, fracNs: 0n };
      if (!tm) return { ok: false, msg: L("Час вводьте як гг:хх, гг:хх:сс або гг:хх:сс.ммм, наприклад 14:30:05.", "Enter the time as hh:mm, hh:mm:ss or hh:mm:ss.mmm, for example 14:30:05.") };
      const r = X.fromWall(y, m, d, tm.h, tm.mi, tm.s, tm.fracNs, zid, T.resolve), info = X.describe(r.ns, zid);
      if (!info) return { ok: false, msg: L("Значення виходить за межі дат.", "The value is outside the range of dates.") };
      const zn = zoneName(zone), sec = X.fmtUnit(r.ns, X.UNIT.s, 9), warns = [], inp = String(y).padStart(4, "0") + "-" + p2(m) + "-" + p2(d) + " " + p2(tm.h) + ":" + p2(tm.mi) + ":" + p2(tm.s);
      const altSec = r.alt != null ? X.fmtUnit(BigInt(r.alt) * 1000000n + BigInt(tm.s) * X.UNIT.s + tm.fracNs, X.UNIT.s, 0) : "";
      if (r.kind === "gap") warns.push(L("Часу " + inp.slice(11, 16) + " у зоні «" + zn + "» цього дня не існує (годинники переводять уперед): використано зсунутий час " + readable(info).slice(11, 16) + ".", inp.slice(11, 16) + " does not exist in “" + zn + "” on this day (the clocks go forward): the shifted time " + readable(info).slice(11, 16) + " was used."));
      if (r.kind === "fold") warns.push(L("Час " + inp.slice(11, 16) + " у зоні «" + zn + "» цього дня повторюється двічі (годинники переводять назад): використано перший варіант, другий був би на годину пізніше (" + altSec + " с).", inp.slice(11, 16) + " in “" + zn + "” happens twice on this day (the clocks go back): the first occurrence was used, the second would be an hour later (" + altSec + " s)."));
      if (!info.in32) warns.push(L("Не вміщається в 32-бітне знакове ціле (після 19.01.2038 03:14:07 UTC або до 13.12.1901).", "Does not fit into a signed 32-bit integer (after Jan 19, 2038 03:14:07 UTC or before Dec 13, 1901)."));
      const tiles = [{ k: L("Мілісекунди", "Milliseconds"), v: X.fmtUnit(r.ns, X.UNIT.ms, 6) }, { k: L("Мікросекунди", "Microseconds"), v: X.fmtUnit(r.ns, X.UNIT.us, 3) }, { k: L("Наносекунди", "Nanoseconds"), v: X.fmtUnit(r.ns, X.UNIT.ns, 0) }, { k: L("32-бітне ціле", "32-bit integer"), v: info.in32 ? L("вміщається", "fits") : L("не вміщається", "does not fit") }];
      const rows = [["ISO 8601 (UTC)", info.isoUtc], ["ISO 8601 (" + zn + ")", info.isoZone], ["RFC 2822", info.rfcUtc], [L("HTTP-дата", "HTTP date"), info.http], ["SQL (UTC)", info.sql]];
      const offTxt = X.offStr(info.w.off, true) === "Z" ? "UTC" : "UTC" + X.offStr(info.w.off, true);
      const steps = [{ t: L("Час у зоні «" + zn + "»", "The time in “" + zn + "”"), l: [inp + (tm.fracNs ? "." + tm.fracNs.toString().padStart(9, "0").replace(/0+$/, "") : "") + " (" + offTxt + ")"] }, { t: L("До UTC", "To UTC"), l: [info.isoUtc] }, { t: L("Секунди від 1970-01-01 UTC", "Seconds since 1970-01-01 UTC"), l: [L("дні від епохи × 86400 + секунди доби = ", "days since the epoch × 86400 + seconds of the day = ") + sec] }];
      return { ok: true, expr: inp + " · " + zn, head: [L("Unix timestamp (секунди)", "Unix timestamp (seconds)"), sec], subRaw: true, headSub: info.isoUtc, tiles, extraHtml: warnHtml(warns) + '<div class="ph__sub">' + L("Формати", "Formats") + "</div>" + fmtList(dedupe(rows, zone)), note: NOTE, steps, resText: inp + " (" + zn + ") = " + sec };
    },
    reset(h) { const { el } = h; setV(el, "uxD", ""); el("uxT").value = ""; el("uxZ").value = "UTC"; },
    fill(h) { const { el } = h; setV(el, "uxD", "2026-11-07"); el("uxT").value = "14:30:05"; el("uxZ").value = "Europe/Kyiv"; },
    share(p, h) { const { el } = h; if (el("uxD").value) p.set("ud", el("uxD").value); if (el("uxT").value.trim()) p.set("ut", el("uxT").value.trim()); p.set("uz", el("uxZ").value); },
    apply(qs, h) { const { el } = h; if (qs.has("ud") && A.parseISO(qs.get("ud")) !== null) setV(el, "uxD", qs.get("ud")); if (qs.has("ut") && X.parseTime(qs.get("ut"))) el("uxT").value = qs.get("ut"); if (["UTC", "local"].includes(qs.get("uz")) || T.known(qs.get("uz"))) el("uxZ").value = qs.get("uz"); }
  };

  // ====================== інші епохи ======================
  const EP = L({ unix: "Unix, секунди (від 1970-01-01)", unixms: "Unix, мілісекунди", filetime: "Windows FILETIME / LDAP (100 нс від 1601-01-01)", dotnet: ".NET ticks (100 нс від 0001-01-01)", excel: "Excel (дні від 30.12.1899)", cocoa: "Apple / Cocoa (с від 2001-01-01)", hfs: "HFS+ / classic Mac (с від 1904-01-01)", webkit: "WebKit / Chrome (мкс від 1601-01-01)", jd: "Юліанський день (дні від 4713 до н. е.)" }, { unix: "Unix, seconds (since 1970-01-01)", unixms: "Unix, milliseconds", filetime: "Windows FILETIME / LDAP (100 ns since 1601-01-01)", dotnet: ".NET ticks (100 ns since 0001-01-01)", excel: "Excel (days since 1899-12-30)", cocoa: "Apple / Cocoa (s since 2001-01-01)", hfs: "HFS+ / classic Mac (s since 1904-01-01)", webkit: "WebKit / Chrome (µs since 1601-01-01)", jd: "Julian day (days since 4713 BC)" });
  const ep = {
    key: "ep", type: "custom", req: () => ["uxV"], nameUk: "Інші епохи", nameEn: "Other epochs",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("uxE", L("Епоха вхідного значення", "Epoch of the input value"), sel("uxE", X.EPOCHS.map((e) => [e[0], EP[e[0]]]), "filetime"), true) + fld("uxV", L("Значення", "Value"), '<input class="ph__input" type="text" inputmode="decimal" autocomplete="off" maxlength="40" id="uxV" placeholder="133500000000000000" aria-label="uxV">', true) + "</div>" + hint(L("Показує те саме значення в усіх епохах і дату UTC. Для Excel (дні) і юліанського дня можна дробову частину.", "Shows the same value in all epochs and the UTC date. For Excel (days) and the Julian day a fractional part is allowed."));
      bind(el, maybeCalc, ["uxE", "uxV"]);
    },
    calc(h) {
      const { el } = h, raw = el("uxV").value.trim(), k = el("uxE").value;
      if (!raw) return { ok: false, incomplete: true };
      const p = X.parseNum(raw);
      if (!p) return { ok: false, msg: L("Введіть число: можна з мінусом і дробовою частиною, без літер.", "Enter a number: a minus sign and a fractional part are allowed, no letters.") };
      const nsv = X.fromEpoch(p, k), d = X.describe(nsv, "UTC");
      if (!d) return { ok: false, msg: L("Значення виходить за межі дат (приблизно ±275 760 років).", "The value is outside the range of dates (about ±275,760 years).") };
      const warns = [];
      const exVal = Number(X.toEpoch(nsv, "excel")); if (exVal >= 0 && exVal < 61) warns.push(L("Серійні номери Excel 1–60 зсунуті на добу: Excel вважає 1900 рік високосним (29.02.1900 не існувало), тому для цих дат значення тут рахується від 30.12.1899.", "Excel serial numbers 1–60 are off by a day: Excel treats 1900 as a leap year (29.02.1900 never existed), so for such dates the value here is counted from 1899-12-30."));
      const rows = X.EPOCHS.map((e) => ({ cells: [{ t: EP[e[0]], cls: "is-first" }, X.toEpoch(nsv, e[0])] }));
      const tiles = [{ k: L("Дата UTC (ISO 8601)", "UTC date (ISO 8601)"), v: d.isoUtc }, { k: L("День тижня", "Weekday"), v: WDN[d.w.wd] }, { k: "Unix, " + L("секунди", "seconds"), v: X.toEpoch(nsv, "unix") }];
      const steps = [{ t: L("У наносекунди від 1970-01-01 UTC", "To nanoseconds since 1970-01-01 UTC"), l: [raw + " (" + EP[k] + ") → " + nsv.toString() + " " + L("нс", "ns")] }, { t: L("У кожну епоху", "Into each epoch"), l: [L("значення = (час від 1970 − зсув епохи) / одиниця епохи", "value = (time since 1970 − epoch offset) / the epoch's unit")] }];
      return { ok: true, expr: raw + " · " + EP[k], head: [L("дата UTC", "UTC date"), readable(d)], subRaw: true, headSub: d.isoUtc, tiles, extraHtml: warnHtml(warns) + '<div class="ph__sub">' + L("Те саме значення в усіх епохах", "The same value in all epochs") + "</div>" + UI.list([L("Епоха", "Epoch"), L("Значення", "Value")], rows, { w: "minmax(0, 1.6fr) minmax(0, 1.4fr)" }), note: NOTE, steps, resText: raw + " (" + EP[k] + ") = " + d.isoUtc };
    },
    reset(h) { const { el } = h; el("uxV").value = ""; el("uxE").value = "filetime"; },
    fill(h) { const { el } = h; el("uxE").value = "filetime"; el("uxV").value = "125911584000000000"; },
    share(p, h) { const { el } = h; if (el("uxV").value.trim()) p.set("uv", el("uxV").value.trim().slice(0, 40)); p.set("ue", el("uxE").value); },
    apply(qs, h) { const { el } = h; if (qs.has("uv") && X.parseNum(qs.get("uv"))) el("uxV").value = qs.get("uv").slice(0, 40); if (X.EPOCHS.some((e) => e[0] === qs.get("ue"))) el("uxE").value = qs.get("ue"); }
  };
  return { modes: [ts, dt, ep], exactNote: false };
});
