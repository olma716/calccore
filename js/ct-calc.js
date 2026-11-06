/* ct-calc.js — відлік до події (живий, з часовими поясами) і таймер на час (старт, пауза, звуковий сигнал) */
PhysCalc.start(({ L }) => {
  const A = window.Ag, C = window.Ct, F = window.Df, UI = window.PhysUI;
  const grp = A.grp, p2 = C.p2;
  const ORIG_TITLE = document.title;
  const NOTE = L("Лічильник рахує реальні секунди між поточним моментом і подією за годинником вашого пристрою, тому при переході на літній чи зимовий час доба може тривати 23 або 25 годин. Тримайте вкладку відкритою: у фоні браузер може сповільнювати сторінку, але залишок завжди рахується від поточного часу.", "The counter counts real seconds between the current moment and the event by your device clock, so when daylight saving time changes a day can last 23 or 25 hours. Keep the tab open: the browser may slow a background page down, but the remainder is always calculated from the current time.");
  const WD = L(["Неділя", "Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота"], ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
  const MG = L(["січня", "лютого", "березня", "квітня", "травня", "червня", "липня", "серпня", "вересня", "жовтня", "листопада", "грудня"], ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]);
  const dfmt = (n) => { const p = A.parts(n); return L(p.d + " " + MG[p.m - 1] + " " + p.y, MG[p.m - 1] + " " + p.d + ", " + p.y); };
  const U = { d: (n) => L(A.pl(n, "день", "дні", "днів"), n === 1 ? "day" : "days"), w: (n) => L(A.pl(n, "тиждень", "тижні", "тижнів"), n === 1 ? "week" : "weeks"), wk: (n) => L(A.pl(n, "робочий день", "робочі дні", "робочих днів"), n === 1 ? "working day" : "working days") };
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const inp = (id, ph, ml, mode) => '<input class="ph__input" id="' + id + '" type="text" inputmode="' + (mode || "numeric") + '" autocomplete="off" maxlength="' + (ml || 5) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const hint = (t, id) => '<div class="ph__hint ph__mt12"' + (id ? ' id="' + id + '"' : "") + ">" + t + "</div>";
  const setV = (el, id, v) => { const e = el(id); if (!e) return; e.value = v; e.dispatchEvent(new Event("change", { bubbles: true })); };
  const chipsHtml = (id, chips) => '<div class="ph__chips ph__mt12" id="' + id + '">' + chips.map(([k, t]) => '<button type="button" class="ph__mini" data-k="' + k + '">' + t + "</button>").join("") + "</div>";
  const fmtTimeInput = (v) => String(v).replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d{2})$/, "$1:$2");
  // кнопка «Розрахувати» й перемикач авто-розрахунку потрібні лише для відліку до події
  const showCalcUi = (on) => { const b = document.getElementById("calcBtn"), t = document.querySelector(".evc-topline"); const d = on ? "" : "none"; if (b && b.parentElement) b.parentElement.style.display = d; if (t) t.style.display = d; };
  const qa = (s) => document.querySelectorAll("#result " + s);

  // ----- заголовок вкладки: таймер важливіший за відлік -----
  const TT = { timer: null, cd: null };
  const applyTitle = () => { document.title = TT.timer || TT.cd || ORIG_TITLE; };

  // ====================== відлік до події ======================
  let cd = null, cdIv = 0;
  const dayStr = (s) => (s.d ? grp(s.d) + " " + L("дн", "d") + " " : "") + p2(s.h) + ":" + p2(s.m) + ":" + p2(s.s);
  const cdVal = (k, s) => ({ d: grp(s.d), h: p2(s.h), m: p2(s.m), s: p2(s.s), w: grp(Math.floor(s.d / 7)) + " " + U.w(Math.floor(s.d / 7)) + (s.d % 7 ? " " + (s.d % 7) + " " + U.d(s.d % 7) : ""), th: grp(Math.floor(s.tot / 3600)), tm: grp(Math.floor(s.tot / 60)), ts: grp(s.tot) })[k];
  const msgText = (past, crossed) => (!past ? "" : crossed ? L("🎉 Подія настала! Нижче показано, скільки часу минуло.", "🎉 The event has arrived! Below is how long ago it was.") : L("Подія вже відбулася: показано, скільки часу минуло.", "The event has already happened: showing how long ago it was."));
  function cdApply(s) {
    qa("[data-cd]").forEach((e) => { e.textContent = cdVal(e.dataset.cd, s); });
    const big = document.querySelector("#result .ph__big"), lab = document.querySelector("#result .ph__rt small"), msg = document.getElementById("ctMsg");
    if (big) big.textContent = dayStr(s);
    if (lab) lab.textContent = s.past ? L("минуло з події", "since the event") : L("лишилось до події", "left until the event");
    if (msg) msg.textContent = msgText(s.past, cd && cd.crossed);
    TT.cd = (s.past && cd && cd.crossed ? "🎉 " : "") + dayStr(s) + (cd && cd.name ? " — " + cd.name : "") + " | CalcCore";
    applyTitle();
  }
  function cdStop() { clearInterval(cdIv); cdIv = 0; TT.cd = null; applyTitle(); }
  function cdTick() {
    if (!document.getElementById("ctLive") || !cd) { cdStop(); return; }
    const s = C.split(cd.target - Date.now());
    if (s.past && !cd.past) cd.crossed = true;
    cd.past = s.past; cdApply(s);
  }
  const cdMode = {
    key: "cd", type: "custom", req: () => ["ctD"], nameUk: "Відлік до події", nameEn: "Event countdown",
    build(body, x, h) {
      const { el, maybeCalc } = h; showCalcUi(true);
      body.innerHTML = '<div class="ph__vars">' + fld("ctN", L("Назва події (необов'язково)", "Event name (optional)"), inp("ctN", L("Новий рік", "New Year"), 60, "text"), true) + fld("ctD", L("Дата події", "Event date"), '<input class="ph__input" type="date" id="ctD" min="1970-01-01" max="2100-12-31" aria-label="ctD">') + fld("ctT", L("Час (необов'язково)", "Time (optional)"), inp("ctT", L("гг:хх", "hh:mm"), 5)) + fld("ctZ", L("Часовий пояс події", "Event time zone"), sel("ctZ", C.ZONES.map(([v, u, e]) => [v, L(u, e)]), "local"), true) + "</div>" + chipsHtml("ctChips", [["ny", L("Новий рік", "New Year")], ["xmas", L("Різдво (25.12)", "Christmas (Dec 25)")], ["mar8", L("8 Березня", "Mar 8")], ["aug24", L("День Незалежності (24.08)", "Independence Day (Aug 24)")], ["wknd", L("Вихідні", "Weekend")]]) + hint(L("Час за замовчуванням 00:00. Якщо дата вже в минулому, покажемо, скільки часу минуло. Відлік іде щосекунди, а залишок видно й у заголовку вкладки.", "The time defaults to 00:00. If the date is already in the past we show how long ago it was. The count runs every second and the remainder is also shown in the tab title."));
      ["ctN", "ctD", "ctT"].forEach((id) => { el(id).addEventListener("input", maybeCalc); el(id).addEventListener("change", maybeCalc); });
      el("ctZ").addEventListener("change", maybeCalc);
      ["ctN", "ctT"].forEach((id) => el(id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } }));
      el("ctT").addEventListener("input", () => { const d = el("ctT").value.replace(/\D/g, "").slice(0, 4); if (el("ctT").value.indexOf(":") < 0 && d.length === 4) el("ctT").value = fmtTimeInput(d); });
      el("ctChips").addEventListener("click", (e) => {
        const b = e.target.closest("button[data-k]"); if (!b) return;
        const now = new Date(), tdn = A.todayDn(), annual = (m, d) => { let y = now.getFullYear(); if (new Date(y, m - 1, d, 0, 0, 0) <= now) y++; return A.iso(A.dnOf(y, m, d)); };
        const k = b.dataset.k, P = { ny: [L("Новий рік", "New Year"), annual(1, 1)], xmas: [L("Різдво", "Christmas"), annual(12, 25)], mar8: [L("8 Березня", "March 8"), annual(3, 8)], aug24: [L("День Незалежності", "Independence Day"), annual(8, 24)], wknd: [L("Вихідні", "Weekend"), A.iso(tdn + (((6 - A.parts(tdn).wd + 7) % 7) || 7))] }[k];
        el("ctN").value = P[0]; el("ctT").value = "00:00"; el("ctZ").value = "local"; setV(el, "ctD", P[1]); h.calc(true);
      });
    },
    calc(h) {
      const { el } = h, ds = el("ctD").value.trim();
      if (!ds) { cdStop(); return { ok: false, incomplete: true }; }
      const dn = A.parseISO(ds), py = dn === null ? 0 : A.parts(dn).y;
      if (dn === null || py < 1970 || py > 2100) return { ok: false, msg: L("Дата події — коректна дата від 1970 до 2100 року.", "The event date must be a valid date from 1970 to 2100.") };
      const ts = el("ctT").value.trim(), sec = ts ? A.parseTime(ts) : 0;
      if (sec === null) return { ok: false, msg: L("Час події вводьте як гг:хх, наприклад 18:30.", "Enter the event time as hh:mm, for example 18:30.") };
      const zone = el("ctZ").value, zr = C.ZONES.find((z) => z[0] === zone) || C.ZONES[0], p = A.parts(dn), name = el("ctN").value.trim().slice(0, 60);
      let target; try { target = C.instant(p.y, p.m, p.d, sec, zone); } catch (e) { return { ok: false, msg: L("Не вдалося визначити часовий пояс у цьому браузері.", "This browser could not resolve the time zone.") }; }
      if (!Number.isFinite(target)) return { ok: false, msg: L("Не вдалося обчислити момент події.", "Could not work out the moment of the event.") };
      const nowD = new Date(), s = C.split(target - nowD.getTime()), loc = new Date(target), ldn = A.dnOf(loc.getFullYear(), loc.getMonth() + 1, loc.getDate());
      const bz = F.business(Math.min(A.todayDn(), ldn), Math.max(A.todayDn(), ldn), F.WEEKENDS.satsun, null);
      cd = { target, name, past: s.past, crossed: false };
      const ev = dfmt(dn) + ", " + p2(Math.floor(sec / 3600)) + ":" + p2(Math.floor((sec % 3600) / 60)) + (zone !== "local" ? " (" + L(zr[1], zr[2]) + ")" : "");
      const locTxt = dfmt(ldn) + ", " + p2(loc.getHours()) + ":" + p2(loc.getMinutes()) + ":" + p2(loc.getSeconds());
      const tile = (k, v, key) => '<div class="ph__tile"><small>' + k + "</small><b" + (key ? ' data-cd="' + key + '"' : "") + ">" + v + "</b></div>";
      const live = '<div class="ph__tiles" id="ctLive">' + tile(L("Днів", "Days"), cdVal("d", s), "d") + tile(L("Годин", "Hours"), cdVal("h", s), "h") + tile(L("Хвилин", "Minutes"), cdVal("m", s), "m") + tile(L("Секунд", "Seconds"), cdVal("s", s), "s") + "</div>";
      const more = '<div class="ph__tiles">' + tile(L("Тижнів і днів", "Weeks and days"), cdVal("w", s), "w") + tile(L("Усього годин", "Total hours"), cdVal("th", s), "th") + tile(L("Усього хвилин", "Total minutes"), cdVal("tm", s), "tm") + tile(L("Усього секунд", "Total seconds"), cdVal("ts", s), "ts") + tile(L("День тижня події", "Weekday of the event"), WD[p.wd]) + tile(L("Робочих днів (пн–пт)", "Working days (Mon–Fri)"), grp(bz.work)) + "</div>";
      const steps = [{ t: L("Момент події", "Moment of the event"), l: [ev], note: zone !== "local" ? L("За вашим годинником це " + locTxt + ".", "By your clock that is " + locTxt + ".") : undefined }, { t: L("Скільки " + (s.past ? "минуло" : "лишилось"), "How much " + (s.past ? "has passed" : "is left")), l: [dayStr(s) + " = " + grp(s.tot) + " " + L("с", "s")] }, { t: L("Робочі дні", "Working days"), l: [L("від сьогодні (включно) до дня події (не включно): ", "from today (inclusive) to the event day (exclusive): ") + grp(bz.work) + " " + U.wk(bz.work)], note: L("Субота й неділя вихідні, свята не враховуються.", "Saturday and Sunday are weekends, holidays are not counted.") }];
      setTimeout(() => { clearInterval(cdIv); cdIv = setInterval(cdTick, 1000); cdTick(); }, 0);
      return { ok: true, expr: (name ? name + " · " : "") + ev, head: [s.past ? L("минуло з події", "since the event") : L("лишилось до події", "left until the event"), dayStr(s)], subRaw: true, headSub: msgText(s.past) || L("відлік іде в реальному часі", "the count runs in real time"), tiles: [], extraHtml: live + more + hint(msgText(s.past), "ctMsg"), note: NOTE, steps, resText: (name ? name + ": " : "") + (s.past ? L("минуло ", "passed ") : L("лишилось ", "left ")) + dayStr(s) + " (" + ev + ")" };
    },
    reset(h) { const { el } = h; el("ctN").value = ""; setV(el, "ctD", ""); el("ctT").value = ""; el("ctZ").value = "local"; cdStop(); },
    fill(h) { const { el } = h, now = new Date(); let y = now.getFullYear(); if (new Date(y, 0, 1) <= now) y++; el("ctN").value = L("Новий рік", "New Year"); el("ctT").value = "00:00"; el("ctZ").value = "local"; setV(el, "ctD", A.iso(A.dnOf(y, 1, 1))); },
    share(p, h) { const { el } = h; if (el("ctD").value) p.set("td", el("ctD").value); const n = el("ctN").value.trim().slice(0, 60); if (n) p.set("tn", n); if (el("ctT").value.trim()) p.set("tt", el("ctT").value.trim()); p.set("tz", el("ctZ").value); },
    apply(qs, h) { const { el } = h; if (qs.has("td") && A.parseISO(qs.get("td")) !== null) setV(el, "ctD", qs.get("td")); if (qs.has("tn")) el("ctN").value = qs.get("tn").slice(0, 60); if (qs.has("tt") && A.parseTime(qs.get("tt")) !== null) el("ctT").value = fmtTimeInput(qs.get("tt")); if (C.ZONES.some((z) => z[0] === qs.get("tz"))) el("ctZ").value = qs.get("tz"); }
  };

  // ====================== таймер на час ======================
  const tm = { st: "idle", total: 0, end: 0, rem: 0, iv: 0, ctx: null, H: null };
  const durText = (sec) => { const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60, ps = []; if (h) ps.push(h + " " + L("год", "h")); if (m) ps.push(m + " " + L("хв", "min")); if (s || !ps.length) ps.push(s + " " + L("с", "s")); return ps.join(" "); };
  const clockAt = (ms) => { const d = new Date(ms); return p2(d.getHours()) + ":" + p2(d.getMinutes()) + ":" + p2(d.getSeconds()); };
  const num = (s) => { const t = String(s || "").replace(/[\s  ]/g, ""); return t === "" ? 0 : /^\d+$/.test(t) ? +t : NaN; };
  const stateText = () => ({ idle: L("готовий до запуску", "ready to start"), run: L("іде відлік", "counting down"), pause: L("на паузі", "paused"), done: L("час вийшов", "time is up") })[tm.st];
  const remSec = () => (tm.st === "run" ? Math.max(0, Math.ceil((tm.end - Date.now()) / 1000)) : tm.st === "pause" ? Math.ceil(tm.rem / 1000) : tm.st === "done" ? 0 : tm.total);
  function beep() {
    try {
      const ctx = tm.ctx; if (!ctx) return; if (ctx.state === "suspended") ctx.resume();
      for (let i = 0; i < 3; i++) { const o = ctx.createOscillator(), g = ctx.createGain(), t0 = ctx.currentTime + i * 0.45; o.type = "sine"; o.frequency.value = 880; g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.4, t0 + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32); o.connect(g); g.connect(ctx.destination); o.start(t0); o.stop(t0 + 0.35); }
    } catch (e) { /* без звуку */ }
  }
  function tmPaint() {
    const big = document.querySelector("#result .ph__big"), go = document.getElementById("tmGo"); if (!go) return;
    const s = remSec(); if (big) big.textContent = C.hhmmss(s);
    const el = document.querySelector("#result [data-tm=end]"); if (el) el.textContent = tm.st === "run" ? clockAt(tm.end) : "—";
  }
  function tmLabels() {
    const go = document.getElementById("tmGo"), rst = document.getElementById("tmRst"); if (!go) return;
    go.querySelector("span").textContent = tm.st === "run" ? L("Пауза", "Pause") : tm.st === "pause" ? L("Продовжити", "Resume") : tm.st === "done" ? L("Ще раз", "Again") : L("Старт", "Start");
    ["tmH", "tmM", "tmS"].forEach((id) => { const e = document.getElementById(id); if (e) e.disabled = tm.st === "run" || tm.st === "pause"; });
    const chips = document.getElementById("tmChips"); if (chips) chips.querySelectorAll("button").forEach((b) => { b.disabled = tm.st === "run" || tm.st === "pause"; });
    if (rst) rst.disabled = tm.st === "idle";
  }
  function tmTick() {
    if (tm.st !== "run") return;
    const left = tm.end - Date.now(), s = Math.max(0, Math.ceil(left / 1000));
    TT.timer = C.hhmmss(s) + " · " + L("Таймер", "Timer") + " | CalcCore"; applyTitle(); tmPaint();
    if (left <= 0) {
      tm.st = "done"; clearInterval(tm.iv); tm.iv = 0; TT.timer = "⏰ " + L("Час вийшов!", "Time is up!") + " | CalcCore"; applyTitle();
      if (tm.snd) beep();
      if (tm.H && document.getElementById("tmGo")) { tm.H.calc(true); tmLabels(); }
    }
  }
  function tmReadTotal(el) {
    const v = ["tmH", "tmM", "tmS"].map((id) => num(el(id).value));
    if (v.some((x) => Number.isNaN(x))) return { err: L("Вводьте цілі числа (без дробів і мінуса).", "Enter whole numbers (no fractions or minus).") };
    const tot = v[0] * 3600 + v[1] * 60 + v[2];
    if (tot > 359999) return { err: L("Найдовший таймер — 99 годин 59 хвилин 59 секунд.", "The longest timer is 99 hours 59 minutes 59 seconds.") };
    return { tot, empty: ["tmH", "tmM", "tmS"].every((id) => !el(id).value.trim()) };
  }
  function tmGo(h) {
    const { el } = h; tm.H = h;
    if (tm.st === "idle" || tm.st === "done") {
      let tot = tm.total;
      if (tm.st === "idle") { const r = tmReadTotal(el); if (r.err) { h.calc(true); return; } tot = r.tot; if (!tot) { h.calc(true); return; } tm.total = tot; }
      tm.snd = el("tmSnd").value === "1";
      if (tm.snd) { try { tm.ctx = tm.ctx || new (window.AudioContext || window.webkitAudioContext)(); if (tm.ctx.state === "suspended") tm.ctx.resume(); } catch (e) { tm.ctx = null; } }
      tm.st = "run"; tm.end = Date.now() + tot * 1000;
    } else if (tm.st === "run") { tm.rem = Math.max(0, tm.end - Date.now()); tm.st = "pause"; clearInterval(tm.iv); tm.iv = 0; TT.timer = C.hhmmss(Math.ceil(tm.rem / 1000)) + " · " + L("Пауза", "Paused") + " | CalcCore"; applyTitle(); }
    else if (tm.st === "pause") { tm.st = "run"; tm.end = Date.now() + tm.rem; }
    if (tm.st === "run") { clearInterval(tm.iv); tm.iv = setInterval(tmTick, 250); }
    h.calc(true); tmLabels(); if (tm.st === "run") tmTick();
  }
  function tmIdle() { if (tm.st === "done") { tm.st = "idle"; TT.timer = null; applyTitle(); tmLabels(); } }
  function tmReset(h) {
    clearInterval(tm.iv); tm.iv = 0; tm.st = "idle"; tm.rem = 0; TT.timer = null; applyTitle(); tm.total = 0;
    if (document.getElementById("tmGo")) { h.calc(true); tmLabels(); }
  }
  const tmMode = {
    key: "tm", type: "custom", req: () => [], nameUk: "Таймер", nameEn: "Timer",
    build(body, x, h) {
      const { el } = h; tm.H = h; showCalcUi(false);
      body.innerHTML = '<div class="ph__vars">' + fld("tmH", L("Години", "Hours"), inp("tmH", "0", 2)) + fld("tmM", L("Хвилини", "Minutes"), inp("tmM", "5", 2)) + fld("tmS", L("Секунди", "Seconds"), inp("tmS", "0", 2)) + fld("tmSnd", L("Звуковий сигнал", "Sound alert"), sel("tmSnd", [["1", L("Увімкнено", "On")], ["0", L("Вимкнено", "Off")]], "1")) + "</div>" + chipsHtml("tmChips", [["1", L("1 хв", "1 min")], ["5", L("5 хв", "5 min")], ["10", L("10 хв", "10 min")], ["15", L("15 хв", "15 min")], ["25", L("25 хв", "25 min")], ["45", L("45 хв", "45 min")]]) + '<div class="ph__actions ph__mt12"><button class="ph__btn ph__btn--primary" id="tmGo" type="button"><span>' + L("Старт", "Start") + '</span></button><button class="ph__btn ph__btn--primary" id="tmRst" type="button"><span>' + L("Скинути", "Reset") + "</span></button></div>" + hint(L("Задайте час і натисніть «Старт». Звук спрацьовує, коли час вийде (браузер вмикає його лише після вашого кліку). Залишок видно й у заголовку вкладки.", "Set the time and press “Start”. The sound plays when time is up (the browser enables it only after your click). The remainder is also shown in the tab title."));
      ["tmH", "tmM", "tmS"].forEach((id) => { el(id).addEventListener("input", () => { tmIdle(); h.calc(false); }); el(id).addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); tmGo(h); } }); });
      el("tmSnd").addEventListener("change", () => { tm.snd = el("tmSnd").value === "1"; });
      el("tmGo").addEventListener("click", () => tmGo(h)); el("tmRst").addEventListener("click", () => tmReset(h));
      el("tmChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (!b || b.disabled) return; el("tmH").value = ""; el("tmM").value = b.dataset.k; el("tmS").value = ""; tm.st = "idle"; TT.timer = null; applyTitle(); h.calc(true); tmLabels(); });
      tmLabels();
    },
    calc(h) {
      const { el } = h; tm.H = h;
      if (tm.st === "idle") {
        const r = tmReadTotal(el); if (r.err) return { ok: false, msg: r.err };
        if (r.empty || !r.tot) return { ok: false, incomplete: true };
        tm.total = r.tot;
      }
      const sec = tm.total, rs = remSec();
      const steps = [{ t: L("Тривалість", "Duration"), l: [durText(sec) + " = " + grp(sec) + " " + L("с", "s")] }, { t: L("Як працює", "How it works"), l: [L("Старт запускає відлік від поточного моменту, пауза зберігає залишок, «Ще раз» повторює ту саму тривалість.", "Start begins the count from the current moment, pause keeps the remainder, “Again” repeats the same duration.")] }];
      const tiles = [{ k: L("Тривалість", "Duration"), v: durText(sec) }, { k: L("Стан", "State"), v: stateText() }, { k: L("Закінчиться о", "Ends at"), v: tm.st === "run" ? clockAt(tm.end) : "—" }];
      return { ok: true, expr: L("Таймер на ", "Timer for ") + durText(sec), head: [tm.st === "done" ? L("час вийшов", "time is up") : L("залишилось", "remaining"), C.hhmmss(rs)], subRaw: true, headSub: stateText() + (tm.st === "done" ? " 🔔" : ""), tiles, extraHtml: "", note: NOTE, steps, resText: L("Таймер на ", "Timer for ") + durText(sec) + ": " + stateText() };
    },
    reset(h) { const { el } = h; ["tmH", "tmM", "tmS"].forEach((id) => { el(id).value = ""; }); el("tmSnd").value = "1"; tmReset(h); },
    fill(h) { const { el } = h; if (tm.st === "run" || tm.st === "pause") return; ["tmH", "tmS"].forEach((id) => { el(id).value = ""; }); el("tmM").value = "5"; el("tmSnd").value = "1"; tm.st = "idle"; },
    share(p, h) { const { el } = h; [["th", "tmH"], ["ti", "tmM"], ["ts", "tmS"]].forEach(([k, id]) => { const v = el(id).value.replace(/\s+/g, ""); if (v) p.set(k, v.slice(0, 2)); }); p.set("tv", el("tmSnd").value); },
    apply(qs, h) { const { el } = h; [["th", "tmH"], ["ti", "tmM"], ["ts", "tmS"]].forEach(([k, id]) => { if (qs.has(k) && /^\d{1,2}$/.test(qs.get(k))) el(id).value = qs.get(k); }); if (["0", "1"].includes(qs.get("tv"))) el("tmSnd").value = qs.get("tv"); }
  };
  return { modes: [cdMode, tmMode], exactNote: false };
});
