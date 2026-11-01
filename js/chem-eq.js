/* chem-eq.js — дані калькулятора «Балансування хімічних рівнянь»: автоматична розстановка коефіцієнтів і перевірка балансу (атоми й заряд) */
PhysCalc.start(({ L }) => {
  const C = window.Chem;
  const LET = "abcdefghijkl";
  const CHIPS = ["H2 + O2 -> H2O", "Fe + O2 -> Fe2O3", "C3H8 + O2 -> CO2 + H2O", "Al + H2SO4 -> Al2(SO4)3 + H2", "KMnO4 + HCl -> KCl + MnCl2 + Cl2 + H2O", "MnO4^- + Fe^2+ + H^+ -> Mn^2+ + Fe^3+ + H2O"];
  const HINT = L("Пишіть речовини звичайними цифрами й латинськими буквами: Fe2O3, Ca(OH)2. Між частинами — стрілка (->, → або =), між речовинами — «+». Заряд пишіть із ^: Fe^3+, SO4^2-, а електрон — e^-. Коефіцієнти, що вже є, можна залишити.", "Write substances with ordinary digits and Latin letters: Fe2O3, Ca(OH)2. Put an arrow between the two sides (->, → or =) and “+” between substances. Write a charge with ^: Fe^3+, SO4^2-, and the electron as e^-. Coefficients that are already there can stay.");
  const chipText = (f) => { const p = C.parseEquation(f); return p.ok ? C.eqStr(p.left, p.right, null) : f; };
  const inputHtml = (h, hint) => '<div class="ph__vars ph__vars--one"><div class="ph__var"><label class="ph__label" for="eqIn">' + L("Рівняння реакції", "Reaction equation") + '</label><input class="ph__input" id="eqIn" type="text" inputmode="text" autocomplete="off" spellcheck="false" maxlength="300" placeholder="' + L("напр.: Fe + O2 -> Fe2O3", "e.g.: Fe + O2 -> Fe2O3") + '"></div></div><div class="ph__fnActions" id="eqChips">' + CHIPS.map((f) => '<button type="button" class="ph__mini" data-f="' + h.esc(f) + '">' + h.esc(chipText(f)) + "</button>").join("") + '</div><div class="ph__hint ph__mt12">' + hint + "</div>";
  const wireInput = (body, h) => {
    const { el, maybeCalc } = h;
    el("eqIn").addEventListener("input", maybeCalc);
    el("eqIn").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } });
    el("eqChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-f]"); if (b) { el("eqIn").value = b.dataset.f; h.calc(true); } });
  };
  const common = {
    reset(h) { h.el("eqIn").value = ""; },
    share(p, h) { if (h.el("eqIn").value.trim()) p.set("e", h.el("eqIn").value.trim()); },
    apply(qs, h) { if (qs.has("e")) h.el("eqIn").value = qs.get("e").slice(0, 300); }
  };
  // доданки «число атомів · коефіцієнт» для одного елемента на одному боці
  const sideTerms = (info, row, from, to) => { const t = []; for (let j = from; j < to; j++) { const k = info.matrix[row][j]; if (k) t.push((Math.abs(k) === 1 ? "" : Math.abs(k) + "·") + LET[j]); } return t; };

  const bal = {
    key: "bal", type: "custom", nameUk: "Балансування рівняння", nameEn: "Balancing an equation",
    build(body, x, h) { body.innerHTML = inputHtml(h, HINT); wireInput(body, h); },
    calc(h) {
      const { el, decNum, ND } = h, raw = el("eqIn").value;
      if (!raw.trim()) return { ok: false, incomplete: true };
      const eq = C.parseEquation(raw);
      if (!eq.ok) return { ok: false, msg: C.eqErrText(eq) };
      const b = C.balance(eq.left, eq.right);
      if (!b.ok) return { ok: false, msg: C.balErrText(b) };
      const info = b.info, sp = info.sp, nl = info.nl, n = sp.length, co = b.coefs;
      const given = sp.some((s) => s.coef !== null);
      const sameAsGiven = given && sp.every((s, i) => (s.coef || 1) === co[i]);
      const unb = C.eqStr(eq.left, eq.right, null), fin = C.eqStr(eq.left, eq.right, co);
      const lhs = sp.slice(0, nl).map((s, i) => LET[i] + "·" + C.spStr(s)).join(" + "), rhs = sp.slice(nl).map((s, i) => LET[nl + i] + "·" + C.spStr(s)).join(" + ");
      const steps = [];
      steps.push({ t: L("Позначаємо коефіцієнти буквами", "Naming the coefficients with letters"), l: [lhs + " → " + rhs], note: given ? L("Коефіцієнти, які були у вашому записі, ігноруються — підбираємо їх заново.", "The coefficients in your input are ignored — they are found afresh.") : "" });
      const rowsL = info.elems.map((e, r) => {
        const lt = sideTerms(info, r, 0, nl), rt = sideTerms(info, r, nl, n);
        return (e === "charge" ? L("Заряд", "Charge") : e) + ":  " + (lt.join(" + ") || "0") + " = " + (rt.join(" + ") || "0");
      });
      steps.push({ t: L("Складаємо рівняння для кожного елемента", "An equation for each element"), l: rowsL, note: info.elems.includes("charge") ? L("Для іонних рівнянь окремо вирівнюється й сумарний заряд (електрон має заряд −1).", "For ionic equations the total charge is balanced as well (the electron has charge −1).") : L("Скільки атомів елемента ліворуч, стільки й праворуч.", "As many atoms of an element on the left as on the right.") });
      steps.push({ t: L("Розв'язуємо систему", "Solving the system"), l: [LET.slice(0, n).split("").map((ch, i) => ch + " = " + co[i]).join(",  ")], note: L("Система має єдиний розв'язок з точністю до множника: одну змінну беремо вільною, решту виражаємо точними дробами, потім множимо на спільний знаменник і ділимо на найбільший спільний дільник, щоб коефіцієнти були найменшими цілими.", "The system has a single solution up to a factor: one variable is taken free, the others are expressed in exact fractions, then everything is multiplied by the common denominator and divided by the greatest common divisor, so the coefficients are the smallest integers.") });
      const chk = info.elems.map((e, r) => { let a = 0, bb = 0; for (let j = 0; j < nl; j++) a += co[j] * info.matrix[r][j]; for (let j = nl; j < n; j++) bb += co[j] * info.matrix[r][j]; return (e === "charge" ? L("Заряд", "Charge") : e) + ":  " + a + " = " + bb + "  ✓"; });
      steps.push({ t: L("Перевірка", "Check"), l: chk });
      const trs = info.elems.map((e, r) => { let a = 0, bb = 0; for (let j = 0; j < nl; j++) a += co[j] * info.matrix[r][j]; for (let j = nl; j < n; j++) bb += co[j] * info.matrix[r][j]; return "<tr><th>" + h.esc(e === "charge" ? L("Заряд", "Charge") : e) + "</th><td>" + a + "</td><td>" + bb + "</td></tr>"; }).join("");
      const table = '<div class="ph__sub">' + L("Баланс атомів", "Atom balance") + '</div><div class="ph__tblWrap"><table class="ph__tbl"><thead><tr><th>' + L("Елемент", "Element") + "</th><th>" + L("Ліворуч", "Left") + "</th><th>" + L("Праворуч", "Right") + "</th></tr></thead><tbody>" + trs + "</tbody></table></div>";
      const tiles = [{ k: L("Сума коефіцієнтів", "Sum of the coefficients"), v: String(co.reduce((a, v) => a + v, 0)) }, { k: L("Було", "Before"), v: sameAsGiven ? L("уже збалансоване", "already balanced") : unb }];
      return { ok: true, expr: L("Збалансоване рівняння", "Balanced equation"), head: [L("рівняння", "equation"), fin], tiles: tiles.slice(0, 1), extraHtml: table, steps, resText: fin };
    },
    ...common,
    fill(h) { h.el("eqIn").value = "Fe + O2 -> Fe2O3"; }
  };

  const check = {
    key: "check", type: "custom", nameUk: "Перевірка балансу", nameEn: "Checking the balance",
    build(body, x, h) { body.innerHTML = inputHtml(h, L("Запишіть рівняння з коефіцієнтами, наприклад 2H2 + O2 -> 2H2O: калькулятор порахує атоми кожного елемента з обох боків і скаже, чи збігаються вони. Без коефіцієнтів вважаємо їх рівними 1. ", "Write the equation with coefficients, for example 2H2 + O2 -> 2H2O: the calculator counts the atoms of each element on both sides and tells whether they match. Without coefficients they are taken as 1. ") + HINT); wireInput(body, h); },
    calc(h) {
      const { el } = h, raw = el("eqIn").value;
      if (!raw.trim()) return { ok: false, incomplete: true };
      const eq = C.parseEquation(raw);
      if (!eq.ok) return { ok: false, msg: C.eqErrText(eq) };
      const sp = eq.left.concat(eq.right), nl = eq.left.length, n = sp.length, co = sp.map((s) => s.coef || 1);
      const elems = []; sp.forEach((s) => (s.p.order || []).forEach((e) => { if (!elems.includes(e)) elems.push(e); }));
      const hasCh = sp.some((s) => s.p.charge); if (hasCh) elems.push("charge");
      const cnt = (s, e) => (e === "charge" ? s.p.charge : s.p.atoms[e] || 0);
      let all = true;
      const rows = elems.map((e) => { let a = 0, b = 0; const lt = [], rt = []; sp.forEach((s, j) => { const k = cnt(s, e); if (!k) return; if (j < nl) { a += co[j] * k; lt.push(co[j] + "·" + k); } else { b += co[j] * k; rt.push(co[j] + "·" + k); } }); const ok = a === b; if (!ok) all = false; return { e, a, b, ok, lt, rt }; });
      const given = C.eqStr(eq.left, eq.right, null);
      const steps = [{ t: L("Рівняння", "The equation"), l: [given], note: sp.some((s) => s.coef !== null) ? "" : L("Коефіцієнтів не вказано — вони дорівнюють 1.", "No coefficients were given — they are all 1.") }];
      steps.push({ t: L("Рахуємо атоми кожного елемента", "Counting the atoms of each element"), l: rows.map((r) => (r.e === "charge" ? L("Заряд", "Charge") : r.e) + ":  " + (r.lt.join(" + ") || "0") + " = " + r.a + "  |  " + (r.rt.join(" + ") || "0") + " = " + r.b + "  " + (r.ok ? "✓" : "✗")), note: L("Кожен доданок — коефіцієнт · число атомів у формулі.", "Each term is the coefficient · the number of atoms in the formula.") });
      let extra = "";
      const trs = rows.map((r) => "<tr><th>" + h.esc(r.e === "charge" ? L("Заряд", "Charge") : r.e) + "</th><td>" + r.a + "</td><td>" + r.b + "</td><td>" + (r.ok ? "✓" : "✗") + "</td></tr>").join("");
      extra = '<div class="ph__sub">' + L("Баланс атомів", "Atom balance") + '</div><div class="ph__tblWrap"><table class="ph__tbl"><thead><tr><th>' + L("Елемент", "Element") + "</th><th>" + L("Ліворуч", "Left") + "</th><th>" + L("Праворуч", "Right") + "</th><th></th></tr></thead><tbody>" + trs + "</tbody></table></div>";
      let sugg = null;
      if (!all) { const b = C.balance(eq.left, eq.right); if (b.ok) { sugg = C.eqStr(eq.left, eq.right, b.coefs); steps.push({ t: L("Правильні коефіцієнти", "The correct coefficients"), l: [sugg] }); } else steps.push({ t: L("Підібрати коефіцієнти не вдалося", "The coefficients could not be found"), l: [C.balErrText(b)] }); }
      const head = all ? L("Збалансовано ✓", "Balanced ✓") : L("Не збалансовано ✗", "Not balanced ✗");
      return { ok: true, expr: given, head: [L("баланс", "balance"), head], headSub: sugg ? L("правильно: ", "correct: ") + sugg : null, subRaw: true, tiles: [{ k: L("Елементів перевірено", "Elements checked"), v: String(rows.length) }, { k: L("Не зійшлося", "Mismatches"), v: String(rows.filter((r) => !r.ok).length) }], extraHtml: extra, steps, resText: head + (sugg ? "  →  " + sugg : "") };
    },
    ...common,
    fill(h) { h.el("eqIn").value = "2H2 + O2 -> 2H2O"; }
  };
  return { modes: [bal, check] };
});
