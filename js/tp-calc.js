/* tp-calc.js — чайові й поділ рахунку: чайові з округленням, нерівний поділ за замовленнями, який відсоток; залежить від km-data.js і tp-data.js */
PhysCalc.start(({ L }) => {
  const T = window.Tp, UI = window.PhysUI, IS_EN = L(false, true), DEF_SYM = L("₴", "$");
  const S = { pct: "", fixed: "", type: "pct", tax: "", base: "before", round: "none", sym: DEF_SYM, people: "" };
  const NOTE = L("Чайові — добровільна практика, звичаї різні за країнами й закладами: перевірте, чи сервіс уже не включено до рахунку. Усі суми рахуються в копійках, без похибок округлення. Якщо сума на людину округлюється, різниця йде в чайові, а фактичний відсоток показано окремо. Податок рахується від суми рахунку, а чайові від суми до чи після податку на ваш вибір. Дані зібрано з відкритих джерел і викладено своїми словами.", "Tipping is voluntary and customs differ by country and venue: check whether service is already included in the bill. All amounts are worked out in cents without rounding errors. If the amount per person is rounded, the difference goes to the tip and the effective percentage is shown separately. Tax is worked out from the bill amount, and the tip from the amount before or after tax as you choose. The data is collected from public sources and put in our own words.");
  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const sel = (id, opts, cur) => '<select class="ph__unit ph__unit--wide" id="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (String(v) === String(cur) ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const inp = (id, ph, max) => '<input class="ph__input" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="' + (max || 12) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const fold = (key, title, inner) => '<details class="ph__details ph__fold" data-keep="' + key + '"><summary>' + title + '</summary><div class="ph__foldBody">' + inner + "</div></details>";
  const chipsHtml = (id, chips) => '<div class="ph__chips ph__mt12" id="' + id + '">' + chips.map(([k, t]) => '<button type="button" class="ph__mini" data-k="' + k + '">' + t + "</button>").join("") + "</div>";
  const bind = (el, maybeCalc, ids) => ids.forEach((id) => { const e = el(id); if (!e) return; e.addEventListener("input", maybeCalc); e.addEventListener("change", maybeCalc); });
  const box = (esc, t, strong) => '<div class="ph__hintbox ph__mt12">' + (strong ? "<b>" + esc(strong) + "</b> " : "") + esc(t) + "</div>";
  const ROUNDS = [["none", L("Без округлення", "No rounding")], ["near1", L("До найближчої цілої", "To the nearest whole")], ["up1", L("Вгору до цілої", "Up to a whole")], ["up5", L("Вгору до 5", "Up to 5")], ["up10", L("Вгору до 10", "Up to 10")]];
  const BASES = [["before", L("До податку", "Before tax")], ["after", L("Після податку", "After tax")]];
  const money = (c) => T.money(c, S.sym), p1 = (x) => T.pct(x);
  const ppl = (n) => (IS_EN ? n + (n === 1 ? " person" : " people") : n + " " + (n % 10 === 1 && n % 100 !== 11 ? "особа" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "особи" : "осіб"));
  const msgs = { bill: L("Рахунок: додатне число до 10 000 000.", "Bill: a positive number up to 10,000,000."), pct: L("Чайові: відсоток від 0 до 100.", "Tip: a percentage from 0 to 100."), fixed: L("Чайові: сума від 0 до 10 000 000.", "Tip: an amount from 0 to 10,000,000."), tax: L("Податок: відсоток від 0 до 100.", "Tax: a percentage from 0 to 100."), people: L("Кількість осіб: ціле число від 1 до 100.", "People: a whole number from 1 to 100.") };
  const parse = (str, max, whole) => { const v = T.num(str); return v === null || v > max || (whole && !Number.isInteger(v)) ? null : v; };
  const extraFold = (key) => fold(key, L("Додатково", "More"), '<div class="ph__vars">' + fld("tpT", L("Податок, %", "Tax, %"), inp("tpT", "0", 6)) + fld("tpBase", L("Чайові від суми", "Tip on the amount"), sel("tpBase", BASES, S.base)) + fld("tpR", L("Округлення суми на людину", "Rounding the amount per person"), sel("tpR", ROUNDS, S.round)) + fld("tpC", L("Валюта", "Currency"), sel("tpC", T.SYMS, S.sym)) + "</div>" + hint(L("Податок рахується додатково до рахунку. Округлення додає різницю до чайових.", "Tax is added on top of the bill. Rounding adds the difference to the tip.")));
  const syncS = (el) => { const g = (id) => (el(id) ? el(id).value : null); if (g("tpT") !== null) S.tax = g("tpT"); if (g("tpBase") !== null) S.base = g("tpBase"); if (g("tpR") !== null) S.round = g("tpR"); if (g("tpC") !== null) S.sym = g("tpC"); };
  const wireExtra = (el, h) => { el("tpT").value = S.tax; bind(el, h.maybeCalc, ["tpT", "tpBase", "tpR", "tpC"]); ["tpT", "tpBase", "tpR", "tpC"].forEach((id) => { el(id).addEventListener("input", () => syncS(el)); el(id).addEventListener("change", () => syncS(el)); }); };
  const shareExtra = (p, el) => { syncS(el); if (S.tax.trim()) p.set("tt", S.tax.trim().slice(0, 6)); if (S.base !== "before") p.set("tg", S.base); if (S.round !== "none") p.set("tr", S.round); if (S.sym !== DEF_SYM) p.set("tc", S.sym); };
  const applyExtra = (qs, el) => { if (qs.has("tt")) { S.tax = qs.get("tt").slice(0, 6); el("tpT").value = S.tax; } if (["before", "after"].includes(qs.get("tg"))) { S.base = qs.get("tg"); el("tpBase").value = S.base; } if (Object.keys(T.ROUND).includes(qs.get("tr"))) { S.round = qs.get("tr"); el("tpR").value = S.round; } if (T.SYMS.some((s) => s[0] === qs.get("tc"))) { S.sym = qs.get("tc"); el("tpC").value = S.sym; } };
  const taxOf = (el) => { const r = el("tpT").value.trim(); if (!r) return { v: 0 }; const v = parse(r, 100); return v === null ? { err: msgs.tax } : { v }; };

  // ====================== чайові й поділ ======================
  const tip = {
    key: "tip", type: "custom", req: () => ["tpB"], nameUk: "Чайові й поділ", nameEn: "Tip and split",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("tpB", L("Рахунок", "Bill"), inp("tpB", "1000", 14)) + fld("tpN", L("Кількість осіб", "Number of people"), inp("tpN", "1", 4)) + fld("tpK", L("Чайові", "Tip"), sel("tpK", [["pct", L("У відсотках", "As a percentage")], ["fixed", L("Фіксованою сумою", "A fixed amount")]], S.type), true) + fld("tpP", L("Чайові, %", "Tip, %"), inp("tpP", "15", 6)) + fld("tpX", L("Чайові, сума", "Tip amount"), inp("tpX", "100", 14)) + "</div>" + chipsHtml("tpChips", [["5", "5%"], ["10", "10%"], ["15", "15%"], ["20", "20%"]]) + extraFold("tpMore") + hint(L("Оберіть відсоток кнопкою чи введіть свій. У «Додатково» є податок, округлення й валюта.", "Pick a percentage with a button or enter your own. “More” has tax, rounding and currency."));
      el("tpP").value = S.pct; el("tpX").value = S.fixed; el("tpN").value = S.people; wireExtra(el, h);
      const vis = () => { el("tpPW").style.display = el("tpK").value === "pct" ? "" : "none"; el("tpXW").style.display = el("tpK").value === "fixed" ? "" : "none"; el("tpChips").style.display = el("tpK").value === "pct" ? "" : "none"; };
      vis(); el("tpK").addEventListener("change", () => { S.type = el("tpK").value; vis(); h.maybeCalc(); });
      ["tpP", "tpX", "tpN"].forEach((id) => el(id).addEventListener("input", () => { S.pct = el("tpP").value; S.fixed = el("tpX").value; S.people = el("tpN").value; }));
      bind(el, h.maybeCalc, ["tpB", "tpN", "tpP", "tpX", "tpK"]);
      el("tpChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; el("tpP").value = b.dataset.k; S.pct = b.dataset.k; h.calc(true); });
    },
    calc(h) {
      const { el, esc } = h; syncS(el); const rb = el("tpB").value.trim(), isPct = el("tpK").value === "pct", rv = (isPct ? el("tpP") : el("tpX")).value.trim();
      if (!rb || !rv) return { ok: false, incomplete: true };
      const bill = parse(rb, 1e7); if (bill === null || bill <= 0) return { ok: false, msg: msgs.bill };
      const val = parse(rv, isPct ? 100 : 1e7); if (val === null) return { ok: false, msg: isPct ? msgs.pct : msgs.fixed };
      const tx = taxOf(el); if (tx.err) return { ok: false, msg: tx.err };
      const rn = el("tpN").value.trim(), people = rn ? parse(rn, 100, true) : 1; if (people === null || people < 1) return { ok: false, msg: msgs.people };
      const r = T.tip({ bill, pct: isPct ? val : 0, fixed: isPct ? null : val, tax: tx.v, base: el("tpBase").value, people, round: el("tpR").value });
      const rows = [[L("Рахунок", "Bill"), r.B]]; if (r.taxC) rows.push([L("Податок ", "Tax ") + p1(tx.v), r.taxC]); rows.push([L("Чайові (вибрані)", "Tip (chosen)"), r.tipC]); if (r.extra) rows.push([L("Округлення", "Rounding"), r.extra]); rows.push([L("Разом", "Total"), r.finalTotal]);
      const list = UI.list([L("Рядок", "Line"), L("Сума", "Amount")], rows.map(([k, c], i) => ({ cells: [{ t: k, cls: i === rows.length - 1 ? "is-first strong" : "is-first" }, { t: money(c), cls: i === rows.length - 1 ? "strong" : "" }] })), { w: "minmax(0, 1.4fr) minmax(0, 1fr)" });
      const warn = r.finalTip < r.tipC ? box(esc, L("Після округлення чайові менші за вибрані: оберіть округлення вгору.", "After rounding the tip is smaller than chosen: choose rounding up."), L("Увага.", "Note.")) : "";
      const eff = L("Фактичні чайові: ", "Effective tip: ") + p1(r.effPct) + (r.extra ? " (" + L("було ", "was ") + (isPct ? p1(val) : p1(r.baseC ? (r.tipC / r.baseC) * 100 : 0)) + ")" : "");
      const steps = [{ t: L("Чайові", "The tip"), l: [isPct ? money(r.baseC) + " × " + p1(val) + " = " + money(r.tipC) : L("Фіксована сума: ", "A fixed amount: ") + money(r.tipC)], note: r.taxC ? L("База чайових: ", "Tip base: ") + BASES.find((b) => b[0] === el("tpBase").value)[1].toLowerCase() + " (" + money(r.baseC) + ")" : "" }, { t: L("Разом і на людину", "Total and per person"), l: [money(r.B) + (r.taxC ? " + " + money(r.taxC) : "") + " + " + money(r.tipC) + " = " + money(r.totalC), money(r.totalC) + " / " + people + " = " + money(Math.round(r.exactPP)) + (r.extra ? " → " + money(r.pp) + L(" після округлення", " after rounding") : "")], note: !r.extra && people > 1 && r.pp * people !== r.totalC ? L("Остача в копійках залишається в сумі, тому множення на людину може відрізнятися на кілька копійок.", "The remainder in cents stays in the total, so multiplying by the number of people can differ by a few cents.") : "" }];
      return { ok: true, expr: money(r.B) + " · " + (isPct ? p1(val) : money(r.tipC)) + " · " + ppl(people), head: [L("на людину", "per person"), money(r.pp)], headSub: L("разом ", "total ") + money(r.finalTotal) + " · " + eff, subRaw: true, tiles: [{ k: L("Чайові", "Tip"), v: money(r.finalTip) }, { k: L("Разом", "Total"), v: money(r.finalTotal) }, { k: L("Фактичний відсоток", "Effective percentage"), v: p1(r.effPct) }], extraHtml: warn + list, note: NOTE, steps, resText: L("Рахунок ", "Bill ") + money(r.B) + L(", чайові ", ", tip ") + money(r.finalTip) + " (" + p1(r.effPct) + L("), разом ", "), total ") + money(r.finalTotal) + L(", на людину ", ", per person ") + money(r.pp) };
    },
    reset(h) { const { el } = h; el("tpB").value = ""; el("tpN").value = ""; el("tpP").value = ""; el("tpX").value = ""; S.pct = ""; S.fixed = ""; S.people = ""; },
    fill(h) { const { el } = h; el("tpK").value = "pct"; S.type = "pct"; el("tpPW").style.display = ""; el("tpXW").style.display = "none"; el("tpChips").style.display = ""; el("tpB").value = "1000"; el("tpP").value = "15"; el("tpN").value = "4"; S.pct = "15"; S.people = "4"; },
    share(p, h) { const { el } = h; p.set("tb", el("tpB").value.trim().slice(0, 14)); p.set("tk", el("tpK").value); if (el("tpP").value.trim()) p.set("tp", el("tpP").value.trim().slice(0, 6)); if (el("tpX").value.trim()) p.set("tx", el("tpX").value.trim().slice(0, 14)); if (el("tpN").value.trim()) p.set("tn", el("tpN").value.trim().slice(0, 4)); shareExtra(p, el); },
    apply(qs, h) { const { el } = h; if (qs.has("tb")) el("tpB").value = qs.get("tb").slice(0, 14); if (["pct", "fixed"].includes(qs.get("tk"))) { el("tpK").value = qs.get("tk"); S.type = qs.get("tk"); el("tpPW").style.display = qs.get("tk") === "pct" ? "" : "none"; el("tpXW").style.display = qs.get("tk") === "fixed" ? "" : "none"; el("tpChips").style.display = qs.get("tk") === "pct" ? "" : "none"; } if (qs.has("tp")) { el("tpP").value = qs.get("tp").slice(0, 6); S.pct = el("tpP").value; } if (qs.has("tx")) { el("tpX").value = qs.get("tx").slice(0, 14); S.fixed = el("tpX").value; } if (qs.has("tn")) { el("tpN").value = qs.get("tn").slice(0, 4); S.people = el("tpN").value; } applyExtra(qs, el); }
  };

  // ====================== нерівний поділ ======================
  const SAMPLE = L("Оля 300\nІван 500\nМаша 250", "Olga 30\nIvan 50\nMasha 25");
  const split = {
    key: "split", type: "custom", req: () => ["tpL"], nameUk: "Нерівний поділ", nameEn: "Unequal split",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full" id="tpLW"><label class="ph__label" for="tpL">' + L("Хто що замовив (один рядок на людину)", "Who ordered what (one line per person)") + '</label><textarea class="ph__input ph__ta" id="tpL" rows="5" maxlength="1500" autocomplete="off" spellcheck="false" placeholder="' + L("Оля 300\nІван 500", "Olga 30\nIvan 50") + '" aria-label="tpL"></textarea></div>' + fld("tpS", L("Спільні страви (ділимо порівну)", "Shared dishes (split equally)"), inp("tpS", "0", 14)) + fld("tpP", L("Чайові, %", "Tip, %"), inp("tpP", "10", 6)) + "</div>" + chipsHtml("tpChips", [["5", "5%"], ["10", "10%"], ["15", "15%"], ["20", "20%"]]) + extraFold("tpMore") + hint(L("Рядок: ім'я й сума, наприклад «Оля 300». Ім'я необов'язкове. Податок і чайові діляться пропорційно частці кожного.", "A line: a name and an amount, for example “Olga 30”. The name is optional. Tax and tip are shared in proportion to each person's part."));
      el("tpP").value = S.pct; wireExtra(el, h); bind(el, h.maybeCalc, ["tpL", "tpS", "tpP"]); el("tpP").addEventListener("input", () => { S.pct = el("tpP").value; });
      el("tpChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; el("tpP").value = b.dataset.k; S.pct = b.dataset.k; h.calc(true); });
    },
    calc(h) {
      const { el, esc } = h; syncS(el); const text = el("tpL").value, rp = el("tpP").value.trim();
      if (!text.trim() || !rp) return { ok: false, incomplete: true };
      const pr = T.parseLines(text, 30); if (pr.err) return { ok: false, msg: pr.err === "max" ? L("Не більше 30 людей.", "No more than 30 people.") : L("Рядок «", "The line “") + pr.err + L("» не розпізнано: очікується ім'я й сума.", "” was not recognized: expected a name and an amount.") };
      const rows = pr.rows; if (!rows.length) return { ok: false, incomplete: true };
      if (rows.some((r) => r.v > 1e7)) return { ok: false, msg: msgs.bill };
      const pct = parse(rp, 100); if (pct === null) return { ok: false, msg: msgs.pct };
      const rs = el("tpS").value.trim(), shared = rs ? parse(rs, 1e7) : 0; if (shared === null) return { ok: false, msg: msgs.bill };
      const tx = taxOf(el); if (tx.err) return { ok: false, msg: tx.err };
      const r = T.split({ shares: rows.map((x) => x.v), shared, tax: tx.v, pct, base: el("tpBase").value, round: el("tpR").value });
      if (!(r.B > 0)) return { ok: false, msg: msgs.bill };
      const names = rows.map((x, i) => x.name || L("Гість ", "Guest ") + (i + 1));
      const lst = UI.list([L("Хто", "Who"), L("Своє + спільне", "Own + shared"), L("Податок", "Tax"), L("Чайові", "Tip"), L("Разом", "Total")], names.map((n, i) => ({ cells: [{ t: n, cls: "is-first" }, money(r.s[i]), r.taxC ? money(r.taxA[i]) : "—", money(r.tipA[i] + r.extra[i]), { t: money(r.tot[i]), cls: "strong" }] })), { w: "minmax(0, 1.1fr) minmax(0, 1fr) minmax(0, 0.8fr) minmax(0, 0.9fr) minmax(0, 1fr)" });
      const eff = p1(r.effPct);
      const steps = [{ t: L("Частки", "The parts"), l: names.map((n, i) => n + ": " + money(r.own[i]) + (r.sh[i] ? " + " + money(r.sh[i]) : "") + " = " + money(r.s[i])), note: shared ? L("Спільні страви поділено порівну.", "The shared dishes are split equally.") : "" }, { t: L("Податок і чайові", "Tax and tip"), l: [(r.taxC ? L("Податок ", "Tax ") + p1(tx.v) + " = " + money(r.taxC) + "; " : "") + L("чайові ", "tip ") + p1(pct) + " " + L("від ", "of ") + money(r.baseC) + " = " + money(r.tipC)], note: L("Діляться пропорційно частці; копійки розподілено так, щоб сума збігалася.", "Shared in proportion to the part; the cents are distributed so that the sum matches.") }];
      return { ok: true, expr: ppl(names.length) + " · " + money(r.B), head: [L("разом", "total"), money(r.sum)], headSub: L("рахунок ", "bill ") + money(r.B) + (r.taxC ? " + " + L("податок ", "tax ") + money(r.taxC) : "") + " + " + L("чайові ", "tip ") + money(r.finalTip) + " (" + eff + ")", subRaw: true, tiles: [{ k: L("Рахунок", "Bill"), v: money(r.B) }, { k: L("Чайові", "Tip"), v: money(r.finalTip) }, { k: L("Фактичний відсоток", "Effective percentage"), v: eff }], extraHtml: lst, note: NOTE, steps, resText: names.map((n, i) => n + ": " + money(r.tot[i])).join("\n") + "\n" + L("Разом ", "Total ") + money(r.sum) };
    },
    reset(h) { const { el } = h; el("tpL").value = ""; el("tpS").value = ""; el("tpP").value = ""; S.pct = ""; },
    fill(h) { const { el } = h; el("tpL").value = SAMPLE; el("tpS").value = L("200", "20"); el("tpP").value = "10"; S.pct = "10"; },
    share(p, h) { const { el } = h; if (el("tpL").value.trim()) p.set("tl", el("tpL").value.slice(0, 600)); if (el("tpS").value.trim()) p.set("ts", el("tpS").value.trim().slice(0, 14)); if (el("tpP").value.trim()) p.set("tp", el("tpP").value.trim().slice(0, 6)); shareExtra(p, el); },
    apply(qs, h) { const { el } = h; if (qs.has("tl")) el("tpL").value = qs.get("tl").slice(0, 600); if (qs.has("ts")) el("tpS").value = qs.get("ts").slice(0, 14); if (qs.has("tp")) { el("tpP").value = qs.get("tp").slice(0, 6); S.pct = el("tpP").value; } applyExtra(qs, el); }
  };

  // ====================== який відсоток ======================
  const back = {
    key: "back", type: "custom", req: () => ["tbB"], nameUk: "Який відсоток", nameEn: "What percentage",
    build(body, x, h) {
      const { el } = h;
      body.innerHTML = '<div class="ph__vars">' + fld("tbB", L("Рахунок", "Bill"), inp("tbB", "850", 14)) + fld("tbP", L("Сплачено разом", "Paid in total"), inp("tbP", "1000", 14)) + fld("tbN", L("Кількість осіб (для таблиці)", "People (for the table)"), inp("tbN", "1", 4), true) + fld("tpC", L("Валюта", "Currency"), sel("tpC", T.SYMS, S.sym), true) + "</div>" + hint(L("Скільки це чайових у відсотках, якщо ви заплатили більше за рахунок. Нижче таблиця типових відсотків для цього рахунку.", "What the tip is as a percentage if you paid more than the bill. Below is a table of common percentages for this bill."));
      bind(el, h.maybeCalc, ["tbB", "tbP", "tbN", "tpC"]); el("tpC").addEventListener("change", () => { S.sym = el("tpC").value; });
    },
    calc(h) {
      const { el } = h; S.sym = el("tpC").value; const rb = el("tbB").value.trim(), rp = el("tbP").value.trim(); if (!rb || !rp) return { ok: false, incomplete: true };
      const bill = parse(rb, 1e7), paid = parse(rp, 1e7); if (bill === null || bill <= 0) return { ok: false, msg: msgs.bill }; if (paid === null) return { ok: false, msg: msgs.bill };
      const rn = el("tbN").value.trim(), n = rn ? parse(rn, 100, true) : 1; if (n === null || n < 1) return { ok: false, msg: msgs.people };
      const B = T.cents(bill), P = T.cents(paid); if (P < B) return { ok: false, msg: L("Сплачено менше за рахунок.", "You paid less than the bill.") };
      const tipC = P - B, pc = (tipC / B) * 100;
      const rows = [5, 8, 10, 12, 15, 18, 20, 25].map((p) => { const r = T.tip({ bill, pct: p, tax: 0, base: "before", people: n, round: "none" }); return { cells: [{ t: p + "%", cls: "is-first" }, money(r.tipC), money(r.totalC), money(r.pp)] }; });
      const lst = UI.list([L("Відсоток", "Percentage"), L("Чайові", "Tip"), L("Разом", "Total"), L("На людину", "Per person")], rows, { w: "minmax(0, 0.8fr) minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1fr)" });
      return { ok: true, expr: money(B) + " → " + money(P), head: [L("чайові", "tip"), money(tipC)], headSub: p1(pc) + L(" від рахунку", " of the bill"), subRaw: true, tiles: [{ k: L("Відсоток", "Percentage"), v: p1(pc) }, { k: L("Рахунок", "Bill"), v: money(B) }, { k: L("Сплачено", "Paid"), v: money(P) }], extraHtml: '<div class="ph__sub">' + L("Типові відсотки для цього рахунку", "Common percentages for this bill") + "</div>" + lst, note: NOTE, steps: [{ t: L("Чайові", "The tip"), l: [money(P) + " − " + money(B) + " = " + money(tipC)] }, { t: L("Відсоток", "The percentage"), l: [money(tipC) + " / " + money(B) + " × 100 = " + p1(pc)] }], resText: L("Чайові ", "Tip ") + money(tipC) + " (" + p1(pc) + L(" від рахунку ", " of the bill ") + money(B) + ")" };
    },
    reset(h) { const { el } = h; el("tbB").value = ""; el("tbP").value = ""; el("tbN").value = ""; },
    fill(h) { const { el } = h; el("tbB").value = L("850", "85"); el("tbP").value = L("1000", "100"); el("tbN").value = ""; },
    share(p, h) { const { el } = h; if (el("tbB").value.trim()) p.set("bb", el("tbB").value.trim().slice(0, 14)); if (el("tbP").value.trim()) p.set("bp", el("tbP").value.trim().slice(0, 14)); if (el("tbN").value.trim()) p.set("bn", el("tbN").value.trim().slice(0, 4)); if (el("tpC").value !== DEF_SYM) p.set("tc", el("tpC").value); },
    apply(qs, h) { const { el } = h; if (qs.has("bb")) el("tbB").value = qs.get("bb").slice(0, 14); if (qs.has("bp")) el("tbP").value = qs.get("bp").slice(0, 14); if (qs.has("bn")) el("tbN").value = qs.get("bn").slice(0, 4); if (T.SYMS.some((s) => s[0] === qs.get("tc"))) { S.sym = qs.get("tc"); el("tpC").value = S.sym; } }
  };
  return { modes: [tip, split, back], exactNote: false };
});
