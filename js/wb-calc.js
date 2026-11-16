/* wb-calc.js — весільний бюджет: кошторис за статтями з резервом, розподіл бюджету за відсотками, скільки гостей вміщує бюджет; залежить від km-data.js і wb-data.js. Суми в копійках без похибок округлення */
PhysCalc.start(({ L }) => {
  const W = window.Wb, UI = window.PhysUI, IS_EN = L(false, true), DEF_SYM = L("₴", "$");
  const cn = (c) => L(c.uk, c.en);
  const DEF = {
    cost: { wcA: "", wcC: "", wcB: "", wcCf: "50", wcX: "", wcV: "", wcD: "", wcM: "", wcF: "", wcT: "", wcK: "", wcH: "", wcG: "", wcR: "", wcI: "", wcP: "", wcO: "", wcL: "", wcRes: "10", wcPd: "", wcCur: DEF_SYM },
    alloc: Object.assign({ waT: "", waG: "", waCur: DEF_SYM }, ...W.CATS.map((c, i) => ({ ["wa_" + c.k]: String(W.PRESETS.std[i]) })), { wa_res: String(W.RESERVE_PCT) }),
    guests: { wgB: "", wgP: "", wgX: "", wgF: "", wgR: "10", wgCur: DEF_SYM }
  };
  const IDS = { cost: Object.keys(DEF.cost), alloc: Object.keys(DEF.alloc), guests: Object.keys(DEF.guests) };
  const S = {}; Object.keys(DEF).forEach((k) => { S[k] = Object.assign({}, DEF[k]); });
  const CUR = { cost: "wcCur", alloc: "waCur", guests: "wgCur" };
  let curBody = null;

  const fld = (id, label, inner, full) => '<div class="ph__var' + (full ? " ph__var--full" : "") + '" id="' + id + 'W"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const sel = (id, opts) => '<select class="ph__unit ph__unit--wide" id="' + id + '" aria-label="' + id + '">' + opts.map(([v, t]) => '<option value="' + v + '">' + t + "</option>").join("") + "</select>";
  const inp = (id, ph, max) => '<input class="ph__input" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="' + (max || 14) + '" placeholder="' + ph + '" aria-label="' + id + '">';
  const hint = (t) => '<div class="ph__hint ph__mt12">' + t + "</div>";
  const box = (esc, t, strong) => '<div class="ph__hintbox ph__mt12">' + (strong ? "<b>" + esc(strong) + "</b> " : "") + esc(t) + "</div>";
  const fold = (key, title, inner, open) => '<details class="ph__details ph__fold" data-keep="' + key + '"' + (open ? " open" : "") + "><summary>" + title + '</summary><div class="ph__foldBody">' + inner + "</div></details>";
  const chipsHtml = (id, chips) => '<div class="ph__chips ph__mt12" id="' + id + '">' + chips.map(([k, t]) => '<button type="button" class="ph__mini" data-k="' + k + '">' + t + "</button>").join("") + "</div>";
  const curFld = (mk) => fld(CUR[mk], L("Валюта", "Currency"), sel(CUR[mk], W.SYMS));
  const ppl = (n) => (IS_EN ? n + (n === 1 ? " guest" : " guests") : n + " " + (n % 10 === 1 && n % 100 !== 11 ? "гість" : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? "гості" : "гостей"));
  const NOTE = L("Суми рахуються в копійках без похибок округлення. Відсотки розподілу — орієнтири зі статей порад про весільні бюджети (переважно американські: Joy, WeddingWire, GiftList), а не норма: реальні ціни залежать від країни, міста, сезону й закладу. Калькулятор нічого не знає про ваші ціни, тому всі суми вводите ви.", "Amounts are worked out in cents without rounding errors. The split percentages are rules of thumb from articles on wedding budgets (mostly American: Joy, WeddingWire, GiftList), not a norm: real prices depend on the country, city, season and venue. The calculator knows nothing about your prices, so you enter all the amounts.");
  const PRIV = L("Усе відбувається у вашому браузері, дані нікуди не надсилаються.", "Everything happens in your browser, nothing is sent anywhere.");

  // поля сум і кількостей: пробіли між тисячами під час введення (1 000, 10 000, 100 000), відсотки не чіпаємо
  const NUMF = new Set(["wcA", "wcC", "wcB", "wcX", "wcV", "wcD", "wcM", "wcF", "wcT", "wcK", "wcH", "wcG", "wcR", "wcI", "wcP", "wcO", "wcPd", "waT", "waG", "wgB", "wgP", "wgX", "wgF"]);
  const GRP = IS_EN ? "," : " ";
  const sigCount = (str, upto) => { let n = 0; for (let i = 0; i < Math.min(upto, str.length); i++) if (/[0-9.,]/.test(str[i]) && !(IS_EN && str[i] === ",")) n++; return n; };
  function groupNum(raw) {
    const cleaned = String(raw).replace(IS_EN ? /[^\d.]/g : /[^\d.,]/g, ""), m = /[.,]/.exec(cleaned);
    let ip = m ? cleaned.slice(0, m.index) : cleaned; const fp = m ? cleaned.slice(m.index + 1).replace(/[^\d]/g, "") : "";
    ip = ip.replace(/^0+(?=\d)/, "").replace(/\B(?=(\d{3})+(?!\d))/g, GRP);
    return ip + (m ? m[0] + fp : "");
  }
  function fmtField(e, ev) {
    let v = e.value, pos = e.selectionStart == null ? v.length : e.selectionStart;
    const prev = e._wbPrev;
    // Backspace чи Delete, що зачепили лише пробіл, видаляють сусідню цифру
    if (ev && prev !== undefined && /^delete(Content)?(Backward|Forward)/.test(ev.inputType || "") && sigCount(v, v.length) === sigCount(prev, prev.length) && v.length < prev.length) {
      const back = /Backward/.test(ev.inputType);
      if (back && pos > 0) { v = v.slice(0, pos - 1) + v.slice(pos); pos -= 1; } else if (!back) { v = v.slice(0, pos) + v.slice(pos + 1); }
    }
    const want = sigCount(v, pos), out = groupNum(v);
    if (out !== e.value) {
      e.value = out; let n = 0, np = out.length;
      if (want === 0) np = 0; else for (let i = 0; i < out.length; i++) { if (/[0-9.,]/.test(out[i]) && !(IS_EN && out[i] === ",")) n++; if (n === want) { np = i + 1; break; } }
      try { e.setSelectionRange(np, np); } catch (x) { /* поле без виділення */ }
    }
    e._wbPrev = e.value;
  }
  const readS = (mk, el) => { IDS[mk].forEach((id) => { if (el(id)) S[mk][id] = el(id).value; }); };
  const paint = (mk, el) => { IDS[mk].forEach((id) => { const e = el(id); if (!e) return; e.value = NUMF.has(id) ? groupNum(S[mk][id]) : S[mk][id]; if (NUMF.has(id)) e._wbPrev = e.value; }); };
  function wire(mk, body, h) {
    curBody = body;
    IDS[mk].forEach((id) => { const e = h.el(id); if (!e) return; if (NUMF.has(id)) { e.maxLength = 24; e.addEventListener("input", (ev) => fmtField(e, ev)); } const f = () => { readS(mk, h.el); h.maybeCalc(); }; e.addEventListener("input", f); e.addEventListener("change", f); });
  }
  const shareOf = (mk) => (p, h) => { readS(mk, h.el); IDS[mk].forEach((id) => { const v = String(S[mk][id] || "").trim(); if (v && v !== DEF[mk][id]) p.set(id, v.slice(0, 600)); }); };
  const applyOf = (mk) => (qs, h) => { IDS[mk].forEach((id) => { if (qs.has(id)) S[mk][id] = qs.get(id).slice(0, 600); }); paint(mk, h.el); };
  // число з поля: порожнє → 0, помилка → null; max — верхня межа
  const val = (s, id, max) => { const v = W.num(s[id]); return v === null || v > max ? null : v; };
  const MAXM = 1e9;
  const sym = (mk) => S[mk][CUR[mk]];
  const bar = (share, max) => '<div class="wb__bar"><b class="wb__track"><i style="width:' + Math.max(2, Math.round((share / (max || 1000)) * 100)) + '%"></i></b><span>' + W.pct(share) + "</span></div>";

  // ====================== кошторис ======================
  const MONEY_ITEMS = [["venue", "wcV", "Локація й оренда", "Venue and rental"], ["decor", "wcD", "Декор і квіти", "Decor and flowers"], ["music", "wcM", "Музика й ведучий", "Music and host"], ["photo", "wcF", "Фото й відео", "Photo and video"], ["attire", "wcT", "Наряди (сукня, костюм)", "Attire (dress, suit)"], ["cake", "wcK", "Торт і солодощі", "Cake and sweets"], ["beauty", "wcH", "Краса (зачіски, макіяж)", "Beauty (hair, makeup)"], ["rings", "wcG", "Обручки", "Rings"], ["ceremony", "wcR", "Церемонія й розпис", "Ceremony and registration"], ["invites", "wcI", "Запрошення й поліграфія", "Invitations and stationery"], ["transport", "wcP", "Транспорт і трансфер", "Transport and transfer"], ["other", "wcO", "Інше (одна сума)", "Other (one amount)"]];
  const MI = (k) => MONEY_ITEMS.find((m) => m[0] === k);
  const costF = (key) => { const m = MI(key); return fld(m[1], L(m[2], m[3]), inp(m[1], "0")); };
  const cost = {
    key: "cost", type: "custom", req: () => [], nameUk: "Кошторис", nameEn: "Costs",
    build(body, x, h) {
      body.innerHTML = '<div class="ph__vars">' + fld("wcA", L("Гостей (дорослих)", "Guests (adults)"), inp("wcA", "80", 5)) + fld("wcC", L("Дітей", "Children"), inp("wcC", "0", 5)) + fld("wcB", L("Банкет на дорослого гостя", "Banquet per adult guest"), inp("wcB", "1500"), true) +
        ["venue", "decor", "music", "photo", "attire", "cake"].map(costF).join("") + fld("wcRes", L("Резерв на непередбачене, %", "Contingency reserve, %"), inp("wcRes", "10", 6), true) + "</div>" +
        fold("wbMore", L("Ще статті й гості", "More items and guests"), '<div class="ph__vars">' + fld("wcCf", L("Дитячий банкет, % від дорослого", "Child banquet, % of an adult"), inp("wcCf", "50", 6)) + fld("wcX", L("Витрати на кожного гостя (сувеніри, трансфер)", "Costs per guest (favours, transfer)"), inp("wcX", "0")) + ["beauty", "rings", "ceremony", "invites", "transport", "other"].map(costF).join("") +
          fld("wcL", L("Свої статті (один рядок — «назва сума», без пробілів у сумі)", "Your own items (one line: “name amount”, no spaces inside the amount)"), '<textarea class="ph__input ph__ta" id="wcL" rows="3" maxlength="600" autocomplete="off" spellcheck="false" placeholder="' + L("Фаєр-шоу 8000\nАренда авто 5000", "Fire show 8000\nCar hire 5000") + '" aria-label="wcL"></textarea>', true) + "</div>") +
        fold("wbPay", L("Оплата й валюта", "Payment and currency"), '<div class="ph__vars">' + fld("wcPd", L("Вже сплачено", "Already paid"), inp("wcPd", "0")) + curFld("cost") + "</div>") +
        hint(L("Вводьте суми з розподілом: одну статтю можна лишити порожньою. Резерв рахується від суми всіх статей; 0 означає без резерву.", "Enter the amounts as you have them: an item can be left empty. The reserve is worked out on the sum of all items; 0 means no reserve."));
      paint("cost", h.el); wire("cost", body, h);
    },
    calc(h) {
      const { el, esc } = h; readS("cost", el); const s = S.cost, sy = sym("cost"), m = (c) => W.money(c, sy);
      const A = val(s, "wcA", 5000), Ch = val(s, "wcC", 5000); if (A === null || Ch === null || !Number.isInteger(A) || !Number.isInteger(Ch)) return { ok: false, msg: L("Кількість гостей і дітей: цілі числа від 0 до 5000.", "Guests and children: whole numbers from 0 to 5000.") };
      const num = (id, label) => { const v = val(s, id, MAXM); return v === null ? { err: label + L(": число від 0 до 1 000 000 000.", ": a number from 0 to 1,000,000,000.") } : { v }; };
      const need = [["wcB", L("Банкет на гостя", "Banquet per guest")], ["wcX", L("Витрати на гостя", "Costs per guest")]].concat(MONEY_ITEMS.map((mi) => [mi[1], L(mi[2], mi[3])])).concat([["wcPd", L("Вже сплачено", "Already paid")]]), got = {};
      for (const [id, label] of need) { const r = num(id, label); if (r.err) return { ok: false, msg: r.err }; got[id] = W.cents(r.v); }
      const cf = val(s, "wcCf", 100), rs = val(s, "wcRes", 100); if (cf === null) return { ok: false, msg: L("Дитячий банкет: відсоток від 0 до 100.", "Child banquet: a percentage from 0 to 100.") }; if (rs === null) return { ok: false, msg: L("Резерв: відсоток від 0 до 100.", "Reserve: a percentage from 0 to 100.") };
      const ln = W.parseLines(s.wcL, 30); if (ln.err) return { ok: false, msg: ln.err === "max" ? L("Не більше 30 власних статей.", "No more than 30 own items.") : L("Рядок «", "The line “") + ln.err + L("» не розпізнано: очікується «назва сума».", "” was not recognized: expected “name amount”.") };
      if (ln.rows.some((r) => r.c > W.cents(MAXM))) return { ok: false, msg: L("Сума власної статті занадто велика.", "An own item amount is too big.") };
      const items = {}; MONEY_ITEMS.forEach((mi) => { items[mi[0]] = got[mi[1]]; });
      const t = W.total({ adults: A, children: Ch, childPct: cf, banquet: got.wcB, extra: got.wcX, items, lines: ln.rows, reserve: rs, paid: got.wcPd });
      if (t.sub <= 0) return { ok: false, incomplete: true };
      const named = t.rows.map((r) => ({ name: r.k.startsWith("line") ? (r.name || L("Власна стаття", "Own item")) : r.k === "extra" ? L("Витрати на гостей (сувеніри, трансфер)", "Costs per guest (favours, transfer)") : cn(W.CATS.find((c) => c.k === r.k)), c: r.c })).filter((r) => r.c > 0).sort((a, b) => b.c - a.c);
      const sh = W.shares(named.map((r) => r.c));
      const rows = named.map((r, i) => ({ cells: [{ t: r.name, cls: "is-first" }, m(r.c), { h: bar(sh[i], sh[0]) }] }));
      const lst = UI.list([L("Стаття", "Item"), L("Сума", "Amount"), L("Частка", "Share")], rows, { w: "minmax(0, 1.5fr) minmax(0, 1fr) minmax(0, 1.2fr)" });
      const bv = t.rows.find((r) => r.k === "banquet").c + t.rows.find((r) => r.k === "venue").c, bvSh = t.sub ? (bv / t.sub) * 100 : 0;
      const adv = bv > 0 ? box(esc, L("Банкет і локація разом — ", "Banquet and venue together are ") + W.pct1(bvSh) + L(" кошторису. У порадах зі статей (Joy, WeddingWire) цю частку радять близько 40–50 %, але це орієнтир, а не правило.", " of the costs. Articles (Joy, WeddingWire) suggest about 40–50% for this share, but it is a guide, not a rule."), L("Орієнтир.", "Guide.")) : "";
      const tiles = [{ k: L("Без резерву", "Without reserve"), v: m(t.sub) }, { k: L("Резерв ", "Reserve ") + W.pct1(rs), v: m(t.res) }, { k: t.guests > 0 ? L("На гостя", "Per guest") : L("Гостей", "Guests"), v: t.guests > 0 ? m(t.perGuest) : "—" }];
      if (t.paid > 0) tiles.push({ k: t.left >= 0 ? L("Лишилось сплатити", "Left to pay") : L("Переплата", "Overpaid"), v: m(Math.abs(t.left)) });
      const steps = [
        { t: L("Банкет", "Banquet"), l: [A + " × " + m(got.wcB) + (Ch ? " + " + Ch + " × " + m(got.wcB) + " × " + W.pct1(cf) + " = " : " = ") + m(t.banquetC)], note: Ch ? L("Діти оплачуються за відсотком від дорослого банкету.", "Children are charged at a percentage of the adult banquet.") : "" },
        { t: L("Разом без резерву", "Total without the reserve"), l: [named.length + L(" статей: ", " items: ") + m(t.sub)] },
        { t: L("Резерв", "Reserve"), l: [W.pct1(rs) + L(" від ", " of ") + m(t.sub) + " = " + m(t.res)], note: L("Резерв покриває непередбачене: ціни зростають, гості додаються.", "The reserve covers the unexpected: prices rise and guests are added.") },
        { t: L("Разом і на гостя", "Total and per guest"), l: [m(t.sub) + " + " + m(t.res) + " = " + m(t.tot)].concat(t.guests > 0 ? [m(t.tot) + " / " + t.guests + " = " + m(t.perGuest)] : []) }
      ];
      const copy = named.map((r) => r.name + ": " + m(r.c)).join("\n") + "\n" + L("Резерв: ", "Reserve: ") + m(t.res) + "\n" + L("Разом: ", "Total: ") + m(t.tot) + (t.guests > 0 ? "\n" + L("На гостя: ", "Per guest: ") + m(t.perGuest) : "");
      return { ok: true, expr: (t.guests ? ppl(t.guests) + " · " : "") + L("резерв ", "reserve ") + W.pct1(rs), head: [L("разом з резервом", "total with reserve"), m(t.tot)], headSub: t.guests > 0 ? L("на гостя ", "per guest ") + m(t.perGuest) + " · " + L("без резерву ", "without reserve ") + m(t.sub) : L("без резерву ", "without reserve ") + m(t.sub), subRaw: true, tiles, extraHtml: '<div class="ph__sub">' + L("Куди йдуть гроші", "Where the money goes") + "</div>" + lst + adv + box(esc, NOTE) + box(esc, PRIV), steps, note: "", resText: copy, copyText: copy };
    },
    reset(h) { S.cost = Object.assign({}, DEF.cost); paint("cost", h.el); },
    fill(h) { S.cost = Object.assign({}, DEF.cost, { wcA: "80", wcC: "8", wcB: L("1500", "100"), wcV: L("30000", "2000"), wcD: L("20000", "1500"), wcM: L("15000", "1200"), wcF: L("18000", "1500"), wcT: L("25000", "2500"), wcK: L("5000", "300"), wcL: L("Фаєр-шоу 8000", "Fire show 500"), wcPd: L("40000", "3000") }); paint("cost", h.el); },
    share: shareOf("cost"), apply: applyOf("cost")
  };

  // ====================== розподіл ======================
  const aPresets = [["std", L("Орієнтовний", "Rule of thumb")], ["food", L("Більше на банкет", "More on the banquet")], ["visual", L("Більше на фото й декор", "More on photo and decor")]];
  const alloc = {
    key: "alloc", type: "custom", req: () => ["waT"], nameUk: "Розподіл бюджету", nameEn: "Budget split",
    build(body, x, h) {
      const rowsHtml = W.CATS.map((c) => fld("wa_" + c.k, cn(c) + ", %", inp("wa_" + c.k, "0", 6))).join("") + fld("wa_res", L("Резерв, %", "Reserve, %"), inp("wa_res", "0", 6));
      body.innerHTML = '<div class="ph__vars">' + fld("waT", L("Загальний бюджет", "Total budget"), inp("waT", L("300000", "20000"))) + fld("waG", L("Гостей (необов'язково)", "Guests (optional)"), inp("waG", "80", 5)) + curFld("alloc") + "</div>" +
        chipsHtml("waChips", aPresets) + fold("wbPct", L("Відсотки за статтями", "Percentages by item"), '<div class="ph__vars">' + rowsHtml + "</div>" + hint(L("Сума відсотків має дорівнювати 100: тоді копійки розподіляються без залишку. Початкові значення — орієнтир із порад (банкет і локація разом близько 40–50 %), їх варто змінити під себе.", "The percentages should add up to 100: then the cents are split with no remainder. The starting values are a rule of thumb from advice (banquet and venue together about 40–50%) and are worth adjusting to yourself.")), true);
      paint("alloc", h.el); wire("alloc", body, h);
      h.el("waChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; const p = W.PRESETS[b.dataset.k]; W.CATS.forEach((c, i) => { S.alloc["wa_" + c.k] = String(p[i]); }); S.alloc.wa_res = String(p[p.length - 1]); paint("alloc", h.el); h.calc(true); });
    },
    calc(h) {
      const { el, esc } = h; readS("alloc", el); const s = S.alloc, sy = sym("alloc"), m = (c) => W.money(c, sy);
      if (!s.waT.trim()) return { ok: false, incomplete: true };
      const T = val(s, "waT", MAXM); if (T === null || T <= 0) return { ok: false, msg: L("Бюджет: додатне число до 1 000 000 000.", "Budget: a positive number up to 1,000,000,000.") };
      const G = val(s, "waG", 5000); if (G === null || !Number.isInteger(G)) return { ok: false, msg: L("Гостей: ціле число від 0 до 5000.", "Guests: a whole number from 0 to 5000.") };
      const keys = W.CATS.map((c) => c.k).concat(["res"]), names = W.CATS.map((c) => cn(c)).concat([L("Резерв", "Reserve")]), pcts = [];
      for (let i = 0; i < keys.length; i++) { const v = val(s, "wa_" + keys[i], 100); if (v === null) return { ok: false, msg: names[i] + L(": відсоток від 0 до 100.", ": a percentage from 0 to 100.") }; pcts.push(v); }
      const sum = Math.round(pcts.reduce((a, b) => a + b, 0) * 100) / 100, tc = W.cents(T), exact = Math.abs(sum - 100) < 1e-9;
      const amounts = exact ? W.alloc(tc, pcts.map((p) => Math.round(p * 100))) : pcts.map((p) => Math.round((tc * p) / 100)), used = amounts.reduce((a, b) => a + b, 0);
      const idx = pcts.map((p, i) => i).filter((i) => pcts[i] > 0).sort((a, b) => amounts[b] - amounts[a]);
      const rows = idx.map((i) => ({ cells: [{ t: names[i], cls: "is-first" }, W.pct1(pcts[i]), m(amounts[i])].concat(G > 0 ? [m(Math.round(amounts[i] / G))] : []) }));
      const hd = [L("Стаття", "Item"), "%", L("Сума", "Amount")].concat(G > 0 ? [L("На гостя", "Per guest")] : []);
      const lst = UI.list(hd, rows, { w: G > 0 ? "minmax(0, 1.5fr) minmax(0, .6fr) minmax(0, 1fr) minmax(0, 1fr)" : "minmax(0, 1.5fr) minmax(0, .6fr) minmax(0, 1fr)" });
      const warn = exact ? "" : box(esc, sum < 100 ? L("Розподілено лише ", "Only ") + W.pct1(sum) + L(": лишається ", " is split: ") + W.pct1(100 - sum) + L(" (", " (") + m(tc - used) + L(") нерозподіленого.", ") remains unallocated.") : L("Відсотки в сумі дають ", "The percentages add up to ") + W.pct1(sum) + L(", це більше за 100: витрати перевищують бюджет на ", ", more than 100: the costs exceed the budget by ") + m(used - tc) + ".", L("Увага.", "Note."));
      const bi = keys.indexOf("banquet"), vi = keys.indexOf("venue"), bvAmt = amounts[bi] + amounts[vi];
      const steps = [
        { t: L("Відсотки", "Percentages"), l: [L("Сума відсотків: ", "The sum of percentages: ") + W.pct1(sum)], note: exact ? L("Рівно 100 %: копійки розподіляються за методом найбільших залишків, тому сума статей точно дорівнює бюджету.", "Exactly 100%: the cents are split by the largest remainder method, so the items add up to the budget exactly.") : "" },
        { t: L("Суми за статтями", "Amounts by item"), l: [m(tc) + L(" × відсоток", " × percentage") + " = " + L("сума статті", "the item amount")] },
        G > 0 ? { t: L("На гостя", "Per guest"), l: [m(tc) + " / " + G + " = " + m(Math.round(tc / G))] } : null
      ].filter(Boolean);
      const copy = idx.map((i) => names[i] + " " + W.pct1(pcts[i]) + ": " + m(amounts[i])).join("\n") + "\n" + L("Бюджет: ", "Budget: ") + m(tc);
      return { ok: true, expr: m(tc) + (G ? " · " + ppl(G) : ""), head: [L("бюджет", "budget"), m(tc)], headSub: L("розподілено ", "split ") + W.pct1(sum) + (G > 0 ? " · " + L("на гостя ", "per guest ") + m(Math.round(tc / G)) : ""), subRaw: true, tiles: [{ k: L("Банкет і локація", "Banquet and venue"), v: m(bvAmt) }, { k: L("Резерв", "Reserve"), v: m(amounts[keys.length - 1]) }, { k: L("Розподілено", "Split"), v: W.pct1(sum) }], extraHtml: warn + lst + box(esc, NOTE) + box(esc, PRIV), steps, note: "", resText: copy, copyText: copy };
    },
    reset(h) { S.alloc = Object.assign({}, DEF.alloc); paint("alloc", h.el); },
    fill(h) { S.alloc = Object.assign({}, DEF.alloc, { waT: L("300000", "20000"), waG: "80" }); paint("alloc", h.el); },
    share: shareOf("alloc"), apply: applyOf("alloc")
  };

  // ====================== скільки гостей ======================
  const guests = {
    key: "guests", type: "custom", req: () => ["wgB", "wgP"], nameUk: "Скільки гостей", nameEn: "How many guests",
    build(body, x, h) {
      body.innerHTML = '<div class="ph__vars">' + fld("wgB", L("Бюджет", "Budget"), inp("wgB", L("300000", "20000"))) + fld("wgP", L("Банкет на гостя", "Banquet per guest"), inp("wgP", "1500")) + fld("wgX", L("Інші витрати на гостя", "Other costs per guest"), inp("wgX", "0")) + fld("wgF", L("Фіксовані витрати (локація, декор, фото…)", "Fixed costs (venue, decor, photo…)"), inp("wgF", L("120000", "8000"))) + fld("wgR", L("Резерв, %", "Reserve, %"), inp("wgR", "10", 6)) + curFld("guests") + "</div>" +
        hint(L("Фіксовані витрати не залежать від кількості гостей: їх можна порахувати на вкладці «Кошторис». Скільки гостей вміщує бюджет, рахується з урахуванням резерву.", "Fixed costs do not depend on the number of guests: you can work them out on the “Costs” tab. How many guests the budget holds is worked out with the reserve."));
      paint("guests", h.el); wire("guests", body, h);
    },
    calc(h) {
      const { el, esc } = h; readS("guests", el); const s = S.guests, sy = sym("guests"), m = (c) => W.money(c, sy);
      if (!s.wgB.trim() || !s.wgP.trim()) return { ok: false, incomplete: true };
      const B = val(s, "wgB", MAXM), P = val(s, "wgP", MAXM), X = val(s, "wgX", MAXM), F = val(s, "wgF", MAXM), R = val(s, "wgR", 100);
      if (B === null || B <= 0) return { ok: false, msg: L("Бюджет: додатне число до 1 000 000 000.", "Budget: a positive number up to 1,000,000,000.") };
      if (P === null || X === null || F === null) return { ok: false, msg: L("Суми: числа від 0 до 1 000 000 000.", "Amounts: numbers from 0 to 1,000,000,000.") };
      if (R === null) return { ok: false, msg: L("Резерв: відсоток від 0 до 100.", "Reserve: a percentage from 0 to 100.") };
      const per = W.cents(P) + W.cents(X), fixed = W.cents(F), bc = W.cents(B), r = W.maxGuests(bc, fixed, per, R);
      if (r.err) return { ok: false, msg: L("Вартість гостя має бути більшою за нуль.", "The cost per guest must be greater than zero.") };
      const T = r.T, n = r.n;
      if (n === 0) return { ok: true, expr: m(bc) + " · " + L("резерв ", "reserve ") + W.pct1(R), head: [L("гостей", "guests"), "0"], headSub: L("фіксовані витрати з резервом перевищують бюджет на ", "fixed costs with the reserve exceed the budget by ") + m(r.short), subRaw: true, tiles: [{ k: L("Фіксовані з резервом", "Fixed with reserve"), v: m(T(0)) }, { k: L("Бюджет", "Budget"), v: m(bc) }, { k: L("Бракує", "Short by"), v: m(r.short) }], extraHtml: box(esc, L("Навіть без гостей фіксовані витрати не вміщуються в бюджет: збільште бюджет або скоротіть фіксовані витрати.", "Even with no guests the fixed costs do not fit the budget: raise the budget or cut the fixed costs."), L("Увага.", "Note.")) + box(esc, NOTE), steps: [{ t: L("Фіксовані витрати", "Fixed costs"), l: [m(fixed) + " + " + W.pct1(R) + L(" резерву = ", " reserve = ") + m(T(0))] }], note: "", resText: L("Бюджет не вміщує фіксовані витрати: бракує ", "The budget does not hold the fixed costs: short by ") + m(r.short), copyText: L("Бюджет не вміщує фіксовані витрати: бракує ", "The budget does not hold the fixed costs: short by ") + m(r.short) };
      const set = [...new Set([Math.max(1, n - 20), Math.max(1, n - 10), n, n + 10, n + 20])].sort((a, b) => a - b);
      const rows = set.map((g) => { const t = T(g), d = bc - t; return { cells: [{ t: String(g), cls: g === n ? "is-first strong" : "is-first" }, { t: m(t), cls: g === n ? "strong" : "" }, (d >= 0 ? "+" : "−") + m(Math.abs(d)).replace("−", "")] }; });
      const lst = UI.list([L("Гостей", "Guests"), L("Разом з резервом", "Total with reserve"), L("Різниця з бюджетом", "Versus the budget")], rows, { w: "minmax(0, .7fr) minmax(0, 1.2fr) minmax(0, 1.2fr)" });
      const steps = [
        { t: L("Вартість гостя", "Cost per guest"), l: [m(W.cents(P)) + " + " + m(W.cents(X)) + " = " + m(per)] },
        { t: L("Умова", "The condition"), l: ["(" + m(fixed) + " + N × " + m(per) + ") × (1 + " + W.pct1(R) + L(") ≤ ", ") ≤ ") + m(bc)] },
        { t: L("Результат", "The result"), l: [L("Найбільше N = ", "The largest N = ") + n + ": " + m(T(n)) + L(", залишок ", ", left ") + m(bc - T(n))], note: L("Ще один гість зробить кошторис ", "One more guest would make the costs ") + m(T(n + 1)) + "." }
      ];
      const copy = L("Гостей: ", "Guests: ") + n + "\n" + L("Разом з резервом: ", "Total with reserve: ") + m(T(n)) + "\n" + L("Залишок бюджету: ", "Budget left: ") + m(bc - T(n));
      return { ok: true, expr: m(bc) + " · " + L("резерв ", "reserve ") + W.pct1(R), head: [L("гостей", "guests"), String(n)], headSub: L("разом з резервом ", "total with reserve ") + m(T(n)) + " · " + L("залишок ", "left ") + m(bc - T(n)), subRaw: true, tiles: [{ k: L("На гостя", "Per guest"), v: m(per) }, { k: L("Фіксовані", "Fixed"), v: m(fixed) }, { k: L("Залишок бюджету", "Budget left"), v: m(bc - T(n)) }], extraHtml: '<div class="ph__sub">' + L("Скільки коштуватиме при інших гостях", "What it costs with other guest numbers") + "</div>" + lst + box(esc, NOTE) + box(esc, PRIV), steps, note: "", resText: copy, copyText: copy };
    },
    reset(h) { S.guests = Object.assign({}, DEF.guests); paint("guests", h.el); },
    fill(h) { S.guests = Object.assign({}, DEF.guests, { wgB: L("300000", "20000"), wgP: L("1500", "100"), wgX: L("100", "5"), wgF: L("120000", "8000") }); paint("guests", h.el); },
    share: shareOf("guests"), apply: applyOf("guests")
  };

  return { modes: [cost, alloc, guests], exactNote: false, onReset() { Object.keys(DEF).forEach((k) => { S[k] = Object.assign({}, DEF[k]); }); } };
});
