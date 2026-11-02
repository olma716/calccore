/* nmt-kb.js — дані калькулятора «Конкурсний бал вступу»: розрахунок КБ за НМТ 2026/2025, 2024, 2023, порівняння четвертих предметів, потрібний бал до цільового КБ
   Формула (НМТ 2026/2025): КБ = (К1·П1 + К2·П2 + К3·П3 + К4·П4 + КТ·ТК) / (К1 + К2 + К3 + (К4макс + К4)/2 + КТ) + ОУ, далі × РК × ГК, не більше 200, округлення до тисячних. */
PhysCalc.start(({ L }) => {
  // ----- раціональні утиліти -----
  const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
  const q = (n, d = 1n) => { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
  const R = (n) => q(BigInt(n)), D = (s) => { const [ip, fp = ""] = String(s).split("."); return q(BigInt(ip + fp), 10n ** BigInt(fp.length)); };
  const add = (x, y) => q(x.n * y.d + y.n * x.d, x.d * y.d), sub = (x, y) => q(x.n * y.d - y.n * x.d, x.d * y.d), mul = (x, y) => q(x.n * y.n, x.d * y.d), div = (x, y) => q(x.n * y.d, x.d * y.n);
  const cmp = (x, y) => { const a = x.n * y.d, b = y.n * x.d; return a < b ? -1 : a > b ? 1 : 0; };
  const ZERO = R(0), TWO = R(2), LO = R(100), HI = R(200), CAP = R(200), HALF = D("0.5");
  const RKS = [["1.00", "1,00 — решта регіонів", "1.00 — other regions"], ["1.04", "1,04 — Дніпропетровська, Полтавська, Чернігівська", "1.04 — Dnipropetrovsk, Poltava, Chernihiv"], ["1.07", "1,07 — Запорізька, Миколаївська, Одеська, Сумська, Харківська", "1.07 — Zaporizhzhia, Mykolaiv, Odesa, Sumy, Kharkiv"]];
  const YEARS = [["2026", "НМТ 2026 або 2025", "NMT 2026 or 2025"], ["2024", "НМТ 2024", "NMT 2024"], ["2023", "НМТ 2023", "NMT 2023"]];
  const GKS = [["1.00", "1,00 — без підвищення", "1.00 — no increase"], ["1.02", "1,02 — пріоритети 1 і 2 на державні спеціальності", "1.02 — priorities 1 and 2 on state-supported specialties"]];
  const SUBJ = [["1", L("Українська мова", "Ukrainian language")], ["2", L("Математика", "Mathematics")], ["3", L("Історія України", "History of Ukraine")], ["4", L("Вибірковий предмет (4-й)", "Elective subject (4th)")]];

  const opts = (list, sel) => list.map(([v, uk, en]) => '<option value="' + v + '"' + (v === sel ? " selected" : "") + ">" + L(uk, en) + "</option>").join("");
  const inp = (id, ph, label, ml) => '<input class="ph__input" id="' + id + '" type="text" inputmode="decimal" autocomplete="off" maxlength="' + (ml || 7) + '" placeholder="' + ph + '" aria-label="' + label + '">';
  const subjRow = (i, withScore) => '<div class="ph__var ph__var--full"><label class="ph__label" for="ad_p' + i + '">' + SUBJ[i - 1][1] + '</label><div class="ph__inl2">' + (withScore ? inp("ad_p" + i, L("бал 100–200", "score 100–200"), SUBJ[i - 1][1] + " — " + L("бал", "score")) : "") + inp("ad_k" + i, L("вага К" + i, "weight K" + i), SUBJ[i - 1][1] + " — " + L("вага", "weight")) + "</div></div>";
  const commonHtml = (withYear) => (withYear ? '<div class="ph__var ph__var--full"><label class="ph__label" for="adY">' + L("Результати НМТ за рік", "NMT results of the year") + '</label><select class="ph__unit ph__unit--wide" id="adY">' + opts(YEARS, "2026") + "</select></div>" : "") + '<div class="ph__var"><label class="ph__label" for="adOU">' + L("ОУ — додаткові бали (0–15)", "ОУ — extra points (0–15)") + "</label>" + inp("adOU", L("напр.: 0", "e.g.: 0"), "ОУ", 5) + '</div><div class="ph__var"><label class="ph__label" for="adKT">' + L("Творчий конкурс: вага КТ і бал ТК", "Creative contest: weight КТ and score ТК") + '</label><div class="ph__inl2">' + inp("adKT", "КТ", "КТ", 5) + inp("adTK", "ТК", "ТК", 7) + '</div></div><div class="ph__var ph__var--full"><label class="ph__label" for="adRK">' + L("РК — регіональний коефіцієнт закладу", "РК — regional coefficient of the institution") + '</label><select class="ph__unit ph__unit--wide" id="adRK">' + opts(RKS, "1.00") + '</select></div><div class="ph__var ph__var--full"><label class="ph__label" for="adGK">' + L("ГК — галузевий коефіцієнт", "ГК — sector coefficient") + '</label><select class="ph__unit ph__unit--wide" id="adGK">' + opts(GKS, "1.00") + "</select></div>";
  const IDS = ["ad_p1", "ad_p2", "ad_p3", "ad_p4", "ad_k1", "ad_k2", "ad_k3", "ad_k4", "ad_k4m", "adOU", "adKT", "adTK"];
  const wire = (el, maybeCalc, calc, extra) => { IDS.concat(extra || []).forEach((id) => { const e = el(id); if (e) e.addEventListener("input", maybeCalc); }); ["adY", "adRK", "adGK"].forEach((id) => { const e = el(id); if (e) e.addEventListener("change", maybeCalc); }); document.querySelectorAll("#phBody input").forEach((e) => e.addEventListener("keydown", (ev) => { if (ev.key === "Enter") { ev.preventDefault(); calc(true); } })); };
  const SEP = L(",", "."), fixed = (h, r, d) => { let s = h.roundStr(r, d); if (d > 0) { if (!s.includes(SEP)) s += SEP; const have = s.length - s.indexOf(SEP) - 1; if (have < d) s += "0".repeat(d - have); } return s; };
  // читання числа з поля: { empty } | { err } | { v }
  const num = (h, id) => { const e = h.el(id); if (!e) return { empty: true }; const r = h.parseNum(e.value); if (r.empty) return { empty: true }; if (r.err) return { err: 1 }; return { v: r.v }; };
  // загальні множники й ОУ
  function common(h, errs) {
    const ou = num(h, "adOU"), ouV = ou.empty ? ZERO : ou.v;
    if (ou.err || cmp(ouV, ZERO) < 0 || cmp(ouV, R(15)) > 0) errs.push(L("ОУ — число від 0 до 15", "ОУ is a number from 0 to 15"));
    return { ou: ouV, rk: D(h.el("adRK").value), gk: D(h.el("adGK").value) };
  }
  function creative(h, errs) {
    const kt = num(h, "adKT"), tk = num(h, "adTK");
    if (kt.err || tk.err) { errs.push(L("КТ і ТК — числа", "КТ and ТК are numbers")); return null; }
    if (kt.empty && tk.empty) return null;
    if (kt.empty || tk.empty) { errs.push(L("Для творчого конкурсу вкажіть і КТ, і ТК", "For the creative contest give both КТ and ТК")); return null; }
    if (cmp(kt.v, ZERO) < 0 || cmp(tk.v, LO) < 0 || cmp(tk.v, HI) > 0) { errs.push(L("ТК — від 100 до 200, КТ — невід'ємне", "ТК is 100–200, КТ is non-negative")); return null; }
    return { kt: kt.v, tk: tk.v };
  }
  // чисельник/знаменник за роком; items: [{p,k}] для предметів 1..4
  function parts(year, P, K, k4m, ct) {
    let N = ZERO, Dn = ZERO;
    const n = year === "2023" ? 3 : 4;
    for (let i = 0; i < n; i++) { N = add(N, mul(K[i], P[i])); if (i < 3 || year === "2024") Dn = add(Dn, K[i]); }
    if (year === "2026") Dn = add(Dn, div(add(k4m, K[3]), TWO));
    if (ct) { N = add(N, mul(ct.kt, ct.tk)); Dn = add(Dn, ct.kt); }
    return { N, Dn };
  }
  const finish = (base, c) => { const withOu = add(base, c.ou), raw = mul(mul(withOu, c.rk), c.gk), capped = cmp(raw, CAP) > 0, final = capped ? CAP : raw; return { withOu, raw, capped, final }; };
  const THR = (h, f) => (cmp(f, R(130)) >= 0 ? L("≥ 130: проходить мінімум для бюджету", "≥ 130: meets the budget minimum") + (cmp(f, R(150)) >= 0 ? L("; ≥ 150 для спеціальностей із вищою межею", "; ≥ 150 also for specialties with the higher limit") : L(" (для частини спеціальностей межа 150)", " (some specialties have a limit of 150)")) : L("< 130: нижче мінімуму для бюджету", "< 130: below the budget minimum"));

  // ----- розрахунок КБ -----
  const kb = {
    key: "kb", type: "custom", nameUk: "Розрахунок КБ", nameEn: "Calculate the score",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars">' + commonHtml(true).replace(/(<div class="ph__var ph__var--full"><label class="ph__label" for="adY">[\s\S]*?<\/select><\/div>)/, "$1" + [1, 2, 3, 4].map((i) => subjRow(i, true)).join("") + '<div class="ph__var ph__var--full" id="adK4mBox"><label class="ph__label" for="ad_k4m">' + L("К4макс — найбільша вага серед вибіркових предметів спеціальності", "К4макс — the largest weight among the elective subjects of the specialty") + "</label>" + inp("ad_k4m", L("напр.: 0,4", "e.g.: 0.4"), "К4макс", 7) + "</div>") + '</div><div class="ph__hint ph__mt12">' + L("Бали П — це бали за шкалою 100–200 (їх дає калькулятор переведення). Вагові коефіцієнти К беріть із правил прийому вишу для вашої спеціальності: у них свої значення для кожної програми. Для НМТ 2023 четвертий предмет не потрібен.", "The scores П are on the 100–200 scale (the conversion calculator gives them). Take the weights К from the admission rules of the institution for your specialty: every programme has its own values. For NMT 2023 no fourth subject is needed.") + "</div>";
      const sync = () => { const y = el("adY").value; el("ad_p4").closest(".ph__var").hidden = y === "2023"; el("ad_k4").closest(".ph__var").hidden = false; el("adK4mBox").hidden = y !== "2026"; };
      el("adY").addEventListener("change", sync); sync(); body._adSync = sync;
      wire(el, maybeCalc, h.calc);
    },
    calc(h) {
      const { el, ND, roundStr, esc } = h, nd = ND(), year = el("adY").value, errs = [];
      const n = year === "2023" ? 3 : 4, P = [], K = [];
      for (let i = 1; i <= n; i++) { const p = num(h, "ad_p" + i), k = num(h, "ad_k" + i); if (p.empty || k.empty) return { ok: false, incomplete: true }; if (p.err || cmp(p.v, LO) < 0 || cmp(p.v, HI) > 0) errs.push(SUBJ[i - 1][1] + ": " + L("бал від 100 до 200", "a score from 100 to 200")); if (k.err || cmp(k.v, ZERO) < 0) errs.push(SUBJ[i - 1][1] + ": " + L("вага — невід'ємне число", "the weight is a non-negative number")); P.push(p.v); K.push(k.v); }
      if (n === 3) { P.push(ZERO); K.push(ZERO); }
      let k4m = K[3];
      if (year === "2026") { const m = num(h, "ad_k4m"); if (!m.empty) { if (m.err || cmp(m.v, K[3]) < 0) errs.push(L("К4макс не може бути меншою за К4", "К4макс cannot be less than К4")); else k4m = m.v; } }
      const ct = creative(h, errs), c = common(h, errs);
      if (errs.length) return { ok: false, msg: errs.slice(0, 3).join("; ") };
      const { N, Dn } = parts(year, P, K, k4m, ct);
      if (Dn.n <= 0n) return { ok: false, msg: L("Сума вагових коефіцієнтів має бути додатною.", "The sum of the weights must be positive.") };
      const base = div(N, Dn), f = finish(base, c), S = (r, d) => fixed(h, r, d === undefined ? nd : d), sx = (r) => S(r, 3);
      const terms = []; for (let i = 0; i < n; i++) terms.push(S(K[i], 3) + " · " + S(P[i], 0)); if (ct) terms.push(S(ct.kt, 3) + " · " + S(ct.tk, 0));
      const dterms = ["К1 + К2 + К3"]; if (year === "2024") dterms[0] = "К1 + К2 + К3 + К4"; if (year === "2026") dterms.push("(К4макс + К4) / 2"); if (ct) dterms.push("КТ");
      const dvals = year === "2026" ? S(K[0], 3) + " + " + S(K[1], 3) + " + " + S(K[2], 3) + " + (" + S(k4m, 3) + " + " + S(K[3], 3) + ") / 2" + (ct ? " + " + S(ct.kt, 3) : "") : K.slice(0, n).map((k) => S(k, 3)).join(" + ") + (ct ? " + " + S(ct.kt, 3) : "");
      const steps = [
        { t: L("Чисельник: сума «вага · бал»", "Numerator: the sum of “weight · score”"), l: [terms.join(" + ") + " = " + S(N, 3)] },
        { t: L("Знаменник: сума ваг", "Denominator: the sum of the weights"), l: [dterms.join(" + ") + " = " + dvals + " = " + S(Dn, 3)], note: year === "2026" ? L("Для НМТ 2026 та 2025 у знаменнику стоїть середнє між К4макс і К4.", "For NMT 2026 and 2025 the denominator holds the average of К4макс and К4.") : "" },
        { t: L("Середньозважений бал", "Weighted average"), l: [S(N, 3) + " / " + S(Dn, 3) + " = " + sx(base)] }
      ];
      if (cmp(c.ou, ZERO) > 0) steps.push({ t: L("Додаємо ОУ", "Adding ОУ"), l: [sx(base) + " + " + S(c.ou, 3) + " = " + sx(f.withOu)] });
      const mult = mul(c.rk, c.gk);
      steps.push({ t: L("Множимо на РК і ГК", "Multiplying by РК and ГК"), l: [sx(f.withOu) + " · " + S(c.rk, 2) + " · " + S(c.gk, 2) + " = " + sx(f.raw)], note: cmp(mult, R(1)) === 0 ? L("Коефіцієнти дорівнюють 1 — число не змінюється.", "Both coefficients are 1 — the number does not change.") : "" });
      steps.push({ t: L("Обмеження 200 і округлення", "The 200 cap and rounding"), l: [f.capped ? sx(f.raw) + " > 200 → 200" : sx(f.raw) + " ≤ 200 → " + sx(f.final)], note: L("Конкурсний бал округлюється до тисячних і не може перевищувати 200.", "The competitive score is rounded to thousandths and cannot exceed 200.") });
      const tiles = [{ k: L("Середньозважений бал", "Weighted average"), v: sx(base) }, { k: L("Після ОУ", "After ОУ"), v: sx(f.withOu) }, { k: L("Після РК і ГК", "After РК and ГК"), v: sx(f.raw) }, { k: L("Мінімум для бюджету", "Budget minimum"), v: cmp(f.final, R(130)) >= 0 ? L("так (≥ 130)", "yes (≥ 130)") : L("ні (< 130)", "no (< 130)") }];
      return { ok: true, expr: L("Конкурсний бал, ", "Competitive score, ") + L(YEARS.find((y) => y[0] === year)[1], YEARS.find((y) => y[0] === year)[2]), head: [L("конкурсний бал", "competitive score"), sx(f.final)], headSub: THR(h, f.final), subRaw: true, tiles, steps, resText: L("КБ = ", "CS = ") + sx(f.final) };
    },
    reset(h) { IDS.forEach((id) => { const e = h.el(id); if (e) e.value = ""; }); h.el("adY").value = "2026"; h.el("adRK").value = "1.00"; h.el("adGK").value = "1.00"; h.el("phBody")._adSync(); },
    fill(h) { ["170", "185", "160", "175"].forEach((v, i) => (h.el("ad_p" + (i + 1)).value = v)); ["0.3", "0.4", "0.2", "0.3"].forEach((v, i) => (h.el("ad_k" + (i + 1)).value = v)); h.el("ad_k4m").value = "0.4"; h.el("adOU").value = ""; h.el("adKT").value = ""; h.el("adTK").value = ""; h.el("adY").value = "2026"; h.el("adRK").value = "1.00"; h.el("adGK").value = "1.00"; h.el("phBody")._adSync(); },
    share(p, h) { p.set("y", h.el("adY").value); IDS.forEach((id) => { const e = h.el(id); if (e && e.value.trim()) p.set(id, e.value.trim()); }); p.set("rk", h.el("adRK").value); p.set("gk", h.el("adGK").value); },
    apply(qs, h) { if (YEARS.some((y) => y[0] === qs.get("y"))) h.el("adY").value = qs.get("y"); IDS.forEach((id) => { const e = h.el(id); if (e && qs.has(id)) e.value = qs.get(id).slice(0, 7); }); if (RKS.some((r) => r[0] === qs.get("rk"))) h.el("adRK").value = qs.get("rk"); if (GKS.some((r) => r[0] === qs.get("gk"))) h.el("adGK").value = qs.get("gk"); h.el("phBody")._adSync(); }
  };

  // ----- вибір четвертого предмета -----
  const MAXC = 6;
  const pick = {
    key: "pick", type: "custom", nameUk: "Який 4-й предмет вигідніший", nameEn: "Which fourth subject is better",
    build(body, x, h) {
      const { el, esc, maybeCalc } = h;
      const crow = (i) => '<div class="ph__var ph__var--full"><label class="ph__label" for="pk_n' + i + '">' + L("Варіант ", "Option ") + (i + 1) + '</label><div class="ph__inl3"><input class="ph__input" id="pk_n' + i + '" type="text" autocomplete="off" maxlength="24" placeholder="' + L("предмет", "subject") + '" aria-label="' + L("Предмет, варіант ", "Subject, option ") + (i + 1) + '">' + inp("pk_p" + i, L("бал", "score"), L("Бал, варіант ", "Score, option ") + (i + 1)) + inp("pk_k" + i, L("вага К4", "weight К4"), L("Вага, варіант ", "Weight, option ") + (i + 1)) + "</div></div>";
      body.innerHTML = '<div class="ph__vars">' + [1, 2, 3].map((i) => subjRow(i, true)).join("") + '<div class="ph__var ph__var--full"><label class="ph__label" for="ad_k4m">' + L("К4макс — найбільша вага серед вибіркових (необов.: за замовчуванням найбільша з варіантів)", "К4макс — the largest elective weight (optional: defaults to the largest option)") + "</label>" + inp("ad_k4m", L("напр.: 0,4", "e.g.: 0.4"), "К4макс", 7) + "</div>" + Array.from({ length: MAXC }, (_, i) => crow(i)).join("") + commonHtml(false) + '</div><div class="ph__hint ph__mt12">' + L("Вкажіть бали й ваги для кількох варіантів четвертого предмета (достатньо двох). Калькулятор порахує КБ для кожного й покаже найкращий. Формула НМТ 2026 / 2025.", "Enter the scores and weights for several options of the fourth subject (two are enough). The calculator computes the score for each and shows the best. The NMT 2026 / 2025 formula.") + "</div>";
      wire(el, maybeCalc, h.calc, Array.from({ length: MAXC }, (_, i) => ["pk_n" + i, "pk_p" + i, "pk_k" + i]).flat());
    },
    calc(h) {
      const { el, ND, esc } = h, nd = ND(), errs = [], P = [], K = [];
      for (let i = 1; i <= 3; i++) { const p = num(h, "ad_p" + i), k = num(h, "ad_k" + i); if (p.empty || k.empty) return { ok: false, incomplete: true }; if (p.err || cmp(p.v, LO) < 0 || cmp(p.v, HI) > 0) errs.push(SUBJ[i - 1][1] + ": " + L("бал від 100 до 200", "a score from 100 to 200")); if (k.err || cmp(k.v, ZERO) < 0) errs.push(SUBJ[i - 1][1] + ": " + L("невід'ємна вага", "a non-negative weight")); P.push(p.v); K.push(k.v); }
      const cands = [];
      for (let i = 0; i < MAXC; i++) { const p = num(h, "pk_p" + i), k = num(h, "pk_k" + i), nm = el("pk_n" + i).value.trim() || L("Варіант ", "Option ") + (i + 1); if (p.empty && k.empty) continue; if (p.empty || k.empty) { errs.push(nm + ": " + L("вкажіть і бал, і вагу", "give both the score and the weight")); continue; } if (p.err || cmp(p.v, LO) < 0 || cmp(p.v, HI) > 0 || k.err || cmp(k.v, ZERO) < 0) { errs.push(nm + ": " + L("перевірте бал (100–200) і вагу", "check the score (100–200) and the weight")); continue; } cands.push({ nm, p: p.v, k: k.v }); }
      const ct = creative(h, errs), c = common(h, errs);
      let k4m = cands.reduce((m, x) => (cmp(x.k, m) > 0 ? x.k : m), ZERO);
      const m = num(h, "ad_k4m"); if (!m.empty) { if (m.err || cmp(m.v, k4m) < 0) errs.push(L("К4макс не може бути меншою за вагу жодного варіанта", "К4макс cannot be less than the weight of any option")); else k4m = m.v; }
      if (errs.length) return { ok: false, msg: errs.slice(0, 3).join("; ") };
      if (cands.length < 1) return { ok: false, incomplete: true };
      const res = cands.map((cd) => { const { N, Dn } = parts("2026", P.concat([cd.p]), K.concat([cd.k]), k4m, ct); return { ...cd, f: finish(div(N, Dn), c), Dn }; });
      if (res.some((r) => r.Dn.n <= 0n)) return { ok: false, msg: L("Сума вагових коефіцієнтів має бути додатною.", "The sum of the weights must be positive.") };
      const order = res.slice().sort((a, b) => cmp(b.f.final, a.f.final)), best = order[0], S = (r) => fixed(h, r, nd);
      const trs = order.map((r, i) => "<tr" + (i === 0 ? ' class="ph__total"' : "") + "><th>" + esc(r.nm) + "</th><td>" + esc(fixed(h, r.p, 0)) + "</td><td>" + esc(fixed(h, r.k, 2)) + "</td><td>" + esc(S(r.f.final)) + "</td><td>" + (i === 0 ? "—" : esc("−" + S(sub(best.f.final, r.f.final)))) + "</td></tr>").join("");
      const table = '<div class="ph__sub">' + L("Порівняння варіантів", "Comparison of the options") + '</div><div class="ph__tblWrap"><table class="ph__tbl"><thead><tr><th>' + L("Предмет", "Subject") + "</th><th>" + L("Бал", "Score") + "</th><th>К4</th><th>КБ</th><th>" + L("Різниця", "Difference") + "</th></tr></thead><tbody>" + trs + "</tbody></table></div>";
      const steps = res.map((r) => ({ t: r.nm, l: ["КБ = " + S(r.f.final) + L("  (середньозважений з ОУ, РК, ГК)", "  (weighted average with ОУ, РК, ГК)")] }));
      steps.unshift({ t: L("Однакова формула для всіх варіантів", "The same formula for every option"), l: ["КБ = (К1·П1 + К2·П2 + К3·П3 + К4·П4) / (К1 + К2 + К3 + (К4макс + К4) / 2) + ОУ", "К4макс = " + fixed(h, k4m, 2)], note: L("Чим більший бал і вага К4, тим вищий КБ; у знаменнику теж змінюється К4.", "The larger the score and the weight К4, the higher the result; К4 also changes in the denominator.") });
      return { ok: true, expr: L("Порівняння четвертих предметів", "Comparing fourth subjects"), head: [L("найкращий", "best"), best.nm], headSub: "КБ = " + S(best.f.final) + (order.length > 1 ? L("; перевага над другим: ", "; ahead of the second by ") + S(sub(best.f.final, order[1].f.final)) : ""), subRaw: true, tiles: order.slice(0, 4).map((r) => ({ k: r.nm, v: S(r.f.final) })), extraHtml: table, steps, resText: L("Найкращий 4-й предмет: ", "Best fourth subject: ") + best.nm + ", КБ = " + S(best.f.final) };
    },
    reset(h) { IDS.concat(Array.from({ length: MAXC }, (_, i) => ["pk_n" + i, "pk_p" + i, "pk_k" + i]).flat()).forEach((id) => { const e = h.el(id); if (e) e.value = ""; }); h.el("adRK").value = "1.00"; h.el("adGK").value = "1.00"; },
    fill(h) { ["170", "185", "160"].forEach((v, i) => (h.el("ad_p" + (i + 1)).value = v)); ["0.3", "0.4", "0.2"].forEach((v, i) => (h.el("ad_k" + (i + 1)).value = v)); [[L("Іноземна мова", "Foreign language"), "175", "0.4"], [L("Фізика", "Physics"), "160", "0.4"], [L("Біологія", "Biology"), "190", "0.2"]].forEach((r, i) => { h.el("pk_n" + i).value = r[0]; h.el("pk_p" + i).value = r[1]; h.el("pk_k" + i).value = r[2]; }); h.el("ad_k4m").value = "0.4"; },
    share(p, h) { IDS.concat(Array.from({ length: MAXC }, (_, i) => ["pk_n" + i, "pk_p" + i, "pk_k" + i]).flat()).forEach((id) => { const e = h.el(id); if (e && e.value.trim()) p.set(id, e.value.trim()); }); p.set("rk", h.el("adRK").value); p.set("gk", h.el("adGK").value); },
    apply(qs, h) { IDS.concat(Array.from({ length: MAXC }, (_, i) => ["pk_n" + i, "pk_p" + i, "pk_k" + i]).flat()).forEach((id) => { const e = h.el(id); if (e && qs.has(id)) e.value = qs.get(id).slice(0, id.startsWith("pk_n") ? 24 : 7); }); if (RKS.some((r) => r[0] === qs.get("rk"))) h.el("adRK").value = qs.get("rk"); if (GKS.some((r) => r[0] === qs.get("gk"))) h.el("adGK").value = qs.get("gk"); }
  };

  // ----- який бал потрібен -----
  const need = {
    key: "need", type: "custom", nameUk: "Який бал потрібен", nameEn: "Which score is needed",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full"><label class="ph__label" for="nd_T">' + L("Цільовий КБ (наприклад, прохідний бал минулого року)", "Target score (for example, last year's passing score)") + "</label>" + inp("nd_T", L("напр.: 165", "e.g.: 165"), L("Цільовий КБ", "Target score")) + "</div>" + [1, 2, 3, 4].map((i) => subjRow(i, true)).join("") + '<div class="ph__var ph__var--full"><label class="ph__label" for="ad_k4m">' + L("К4макс (необов.: за замовчуванням дорівнює К4)", "К4макс (optional: defaults to К4)") + "</label>" + inp("ad_k4m", L("напр.: 0,4", "e.g.: 0.4"), "К4макс", 7) + "</div>" + commonHtml(false) + '</div><div class="ph__hint ph__mt12">' + L("Залиште порожнім бал того предмета, який шукаєте, а решту введіть разом з усіма вагами. Калькулятор знайде, який бал потрібен, щоб отримати цільовий КБ. Формула НМТ 2026 / 2025.", "Leave the score of the subject you are looking for empty and enter the rest with all the weights. The calculator finds the score needed to reach the target. The NMT 2026 / 2025 formula.") + "</div>";
      wire(el, maybeCalc, h.calc, ["nd_T"]);
    },
    calc(h) {
      const { el, ND, esc } = h, nd = ND(), errs = [], P = [], K = [];
      const T = num(h, "nd_T"); if (T.empty) return { ok: false, incomplete: true };
      if (T.err || cmp(T.v, R(100)) < 0 || cmp(T.v, CAP) > 0) return { ok: false, msg: L("Цільовий КБ — від 100 до 200.", "The target score is from 100 to 200.") };
      let unk = -1;
      for (let i = 1; i <= 4; i++) { const p = num(h, "ad_p" + i), k = num(h, "ad_k" + i); if (k.empty) return { ok: false, incomplete: true }; if (k.err || cmp(k.v, ZERO) < 0) errs.push(SUBJ[i - 1][1] + ": " + L("невід'ємна вага", "a non-negative weight")); K.push(k.v); if (p.empty) { if (unk >= 0) return { ok: false, msg: L("Залиште порожнім лише один бал — той, який шукаєте.", "Leave only one score empty — the one you are looking for.") }; unk = i - 1; P.push(ZERO); } else { if (p.err || cmp(p.v, LO) < 0 || cmp(p.v, HI) > 0) errs.push(SUBJ[i - 1][1] + ": " + L("бал від 100 до 200", "a score from 100 to 200")); P.push(p.v); } }
      if (unk < 0) return { ok: false, msg: L("Залиште порожнім бал предмета, який треба знайти.", "Leave empty the score of the subject to be found.") };
      let k4m = K[3]; const m = num(h, "ad_k4m"); if (!m.empty) { if (m.err || cmp(m.v, K[3]) < 0) errs.push(L("К4макс не може бути меншою за К4", "К4макс cannot be less than К4")); else k4m = m.v; }
      const ct = creative(h, errs), c = common(h, errs);
      if (errs.length) return { ok: false, msg: errs.slice(0, 3).join("; ") };
      if (K[unk].n === 0n) return { ok: false, msg: L("Вага шуканого предмета дорівнює 0 — він не впливає на КБ.", "The weight of the subject being found is 0 — it does not affect the score.") };
      const { N, Dn } = parts("2026", P, K, k4m, ct), mult = mul(c.rk, c.gk);
      if (Dn.n <= 0n) return { ok: false, msg: L("Сума вагових коефіцієнтів має бути додатною.", "The sum of the weights must be positive.") };
      const base = sub(div(T.v, mult), c.ou), Nn = mul(base, Dn), px = div(sub(Nn, N), K[unk]), S = (r, d) => fixed(h, r, d === undefined ? nd : d);
      const intUp = (r) => { const n = r.n / r.d; return r.n % r.d === 0n ? n : n + (r.n > 0n ? 1n : 0n); };
      const need = cmp(px, LO) < 0 ? R(100) : px, up = intUp(need), upR = q(up), feasible = cmp(px, HI) <= 0, name = SUBJ[unk][1];
      const steps = [{ t: L("Що потрібно від суми", "What the sum needs"), l: [L("Цільовий КБ ", "Target ") + S(T.v, 3) + " / (" + S(c.rk, 2) + " · " + S(c.gk, 2) + ") − ОУ " + S(c.ou, 2) + " = " + S(base, 3)], note: L("Спочатку знімаємо множники РК, ГК та додаткові бали ОУ.", "First the multipliers РК, ГК and the extra points ОУ are removed.") }, { t: L("Потрібний чисельник", "The numerator needed"), l: [S(base, 3) + " · " + S(Dn, 3) + " = " + S(Nn, 3)] }, { t: L("Бал шуканого предмета", "The score of the subject being found"), l: [name + ": (" + S(Nn, 3) + " − " + S(N, 3) + ") / " + S(K[unk], 3) + " = " + S(px, 3)] }];
      if (!feasible) return { ok: false, msg: L("Ціль недосяжна: для предмета «" + name + "» потрібно " + S(px, 2) + " — вище за максимум 200.", "The target is out of reach: for “" + name + "” you would need " + S(px, 2) + " — above the maximum 200.") };
      const check = (() => { const P2 = P.slice(); P2[unk] = upR; const pp = parts("2026", P2, K, k4m, ct); return finish(div(pp.N, pp.Dn), c).final; })();
      steps.push({ t: L("Перевірка", "Check"), l: [name + " = " + up + " → КБ = " + S(check, 3)], note: cmp(px, LO) < 0 ? L("Потрібний бал нижче порогу 100 — достатньо подолати поріг.", "The required score is below the threshold 100 — passing the threshold is enough.") : L("Бал округлюємо вгору до цілого.", "The score is rounded up to a whole number.") });
      return { ok: true, expr: L("Який бал потрібен: ", "Which score is needed: ") + name, head: [name, String(up)], headSub: L("точно: ", "exactly: ") + S(px, 3) + L("; КБ за цього балу ", "; the score then is ") + S(check, 3), subRaw: true, tiles: [{ k: L("Цільовий КБ", "Target"), v: S(T.v, 3) }, { k: L("Потрібний бал", "Required score"), v: S(px, 3) }, { k: L("Це в тестових балах", "In test points"), v: L("див. конвертер", "see the converter") }], steps, resText: name + " ≥ " + up + L(" (щоб мати КБ ", " (to reach ") + S(T.v, 3) + ")" };
    },
    reset(h) { IDS.concat(["nd_T"]).forEach((id) => { const e = h.el(id); if (e) e.value = ""; }); h.el("adRK").value = "1.00"; h.el("adGK").value = "1.00"; },
    fill(h) { h.el("nd_T").value = "170"; ["170", "185", "160", ""].forEach((v, i) => (h.el("ad_p" + (i + 1)).value = v)); ["0.3", "0.4", "0.2", "0.3"].forEach((v, i) => (h.el("ad_k" + (i + 1)).value = v)); h.el("ad_k4m").value = "0.4"; },
    share(p, h) { IDS.concat(["nd_T"]).forEach((id) => { const e = h.el(id); if (e && e.value.trim()) p.set(id, e.value.trim()); }); p.set("rk", h.el("adRK").value); p.set("gk", h.el("adGK").value); },
    apply(qs, h) { IDS.concat(["nd_T"]).forEach((id) => { const e = h.el(id); if (e && qs.has(id)) e.value = qs.get(id).slice(0, 7); }); if (RKS.some((r) => r[0] === qs.get("rk"))) h.el("adRK").value = qs.get("rk"); if (GKS.some((r) => r[0] === qs.get("gk"))) h.el("adGK").value = qs.get("gk"); }
  };
  // у прикладах десяткова крапка → кома для української версії
  [kb, pick, need].forEach((m) => { const fl = m.fill; m.fill = (h) => { fl(h); document.querySelectorAll("#phBody input").forEach((e) => { if (/^\d+\.\d+$/.test(e.value)) e.value = e.value.replace(".", SEP); }); }; });
  // англійська версія: кириличні абревіатури правил → латинські
  const IS_EN = String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const TRS = [[/К4макс/g, "K4max"], [/КТ/g, "CW"], [/ТК/g, "CC"], [/ОУ/g, "EP"], [/РК/g, "RC"], [/ГК/g, "SC"], [/КБ/g, "CS"], [/П(d)/g, "S$1"], [/К(d)/g, "K$1"], [/К/g, "K"], [/П/g, "S"]];
  const tr = (s) => TRS.reduce((acc, [re, to]) => acc.replace(re, to), s);
  const deep = (v) => (typeof v === "string" ? tr(v) : Array.isArray(v) ? v.map(deep) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, deep(x)])) : v);
  const trDom = (root) => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n; while ((n = w.nextNode())) n.textContent = tr(n.textContent); root.querySelectorAll("[placeholder],[aria-label]").forEach((e) => { ["placeholder", "aria-label"].forEach((a) => { if (e.hasAttribute(a)) e.setAttribute(a, tr(e.getAttribute(a))); }); }); };
  if (IS_EN) [kb, pick, need].forEach((m) => { const b = m.build, cc = m.calc; m.build = (body, x, h) => { b(body, x, h); trDom(body); }; m.calc = (h) => deep(cc(h)); });
  return { modes: [kb, pick, need] };
});
