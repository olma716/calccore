/* txt-words.js — дані калькулятора «Число прописом»: сума й число словами (UA / EN), список чисел */
PhysCalc.start(({ L }) => {
  const T = window.Txt;
  const IS_EN = L(false, true);
  const CURS = [["uah", L("Гривні (₴)", "Hryvnias (UAH)")], ["usd", L("Долари США ($)", "US dollars (USD)")], ["eur", L("Євро (€)", "Euro (EUR)")], ["", L("Без валюти (просто число)", "No currency (just a number)")]];
  const sel = (id, opts, cur, label) => '<select class="ph__unit ph__unit--wide" id="' + id + '" aria-label="' + label + '">' + opts.map(([v, t]) => '<option value="' + v + '"' + (v === cur ? " selected" : "") + ">" + t + "</option>").join("") + "</select>";
  const field = (id, label, inner) => '<div class="ph__var"><label class="ph__label" for="' + id + '">' + label + "</label>" + inner + "</div>";
  const optsHtml = (p) => field(p + "Cur", L("Валюта", "Currency"), sel(p + "Cur", CURS, "uah", L("Валюта", "Currency"))) + field(p + "Lang", L("Мова запису", "Language of the words"), sel(p + "Lang", [["uk", L("Українська", "Ukrainian")], ["en", L("Англійська", "English")]], IS_EN ? "en" : "uk", L("Мова запису", "Language of the words"))) + field(p + "Sub", L("Копійки / центи", "Kopecks / cents"), sel(p + "Sub", [["d", L("цифрами (56 копійок)", "as digits (56 cents)")], ["w", L("словами (п'ятдесят шість копійок)", "in words (fifty-six cents)")]], "d", L("Копійки", "Cents"))) + field(p + "Cap", L("Перша літера", "First letter"), sel(p + "Cap", [["1", L("велика", "capital")], ["0", L("як є (мала)", "as is (lowercase)")]], "1", L("Перша літера", "First letter")));
  const err = (e) => ({ fmt: L("Введіть число, наприклад 1234,56 (пробіли між розрядами допустимі).", "Enter a number, for example 1234.56 (spaces between digit groups are allowed)."), big: L("Занадто велике число: підтримується до 18 цифр у цілій частині.", "The number is too large: up to 18 integer digits are supported."), frac: L("Забагато знаків після коми: для валюти — до 8 (округлюється до копійок), без валюти — до 6.", "Too many decimal digits: up to 8 for a currency (rounded to cents), up to 6 without a currency.") })[e];
  const normNum = (s) => (IS_EN && /^-?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s.trim()) ? s.trim().replace(/,/g, "") : s);
  const read = (p, el) => ({ lang: el(p + "Lang").value, cur: el(p + "Cur").value, subWords: el(p + "Sub").value === "w", cap: el(p + "Cap").value === "1" });
  const bindAll = (p, el, maybeCalc) => ["Cur", "Lang", "Sub", "Cap"].forEach((s) => el(p + s).addEventListener("change", maybeCalc));
  const resetOpts = (p, el) => { el(p + "Cur").value = "uah"; el(p + "Lang").value = IS_EN ? "en" : "uk"; el(p + "Sub").value = "d"; el(p + "Cap").value = "1"; };
  const shareOpts = (p, pr, el) => { pr.set("c", el(p + "Cur").value || "n"); pr.set("g", el(p + "Lang").value); pr.set("s", el(p + "Sub").value); pr.set("k", el(p + "Cap").value); };
  const applyOpts = (p, qs, el) => { if (qs.has("c")) { const v = qs.get("c") === "n" ? "" : qs.get("c"); if (["", "uah", "usd", "eur"].includes(v)) el(p + "Cur").value = v; } if (qs.has("g") && ["uk", "en"].includes(qs.get("g"))) el(p + "Lang").value = qs.get("g"); if (qs.has("s") && ["d", "w"].includes(qs.get("s"))) el(p + "Sub").value = qs.get("s"); if (qs.has("k") && ["0", "1"].includes(qs.get("k"))) el(p + "Cap").value = qs.get("k"); };
  const grp = (s) => String(s).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

  // ----- одна сума -----
  const one = {
    key: "one", type: "custom", nameUk: "Сума прописом", nameEn: "Amount in words",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full"><label class="ph__label" for="nwN">' + L("Число або сума", "Number or amount") + '</label><input class="ph__input" id="nwN" type="text" inputmode="decimal" autocomplete="off" maxlength="40" placeholder="' + L("напр.: 1234,56", "e.g.: 1234.56") + '" aria-label="' + L("Число або сума", "Number or amount") + '"></div>' + optsHtml("nw") + '</div><div class="ph__chips ph__mt12" id="nwChips"><button type="button" class="ph__mini" data-v="1234,56">1 234,56</button><button type="button" class="ph__mini" data-v="21">21</button><button type="button" class="ph__mini" data-v="1000000">1 000 000</button><button type="button" class="ph__mini" data-v="2,5">2,5</button></div>';
      el("nwN").addEventListener("input", maybeCalc); bindAll("nw", el, maybeCalc);
      el("nwN").addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); h.calc(true); } });
      el("nwChips").addEventListener("click", (e) => { const b = e.target.closest("button[data-v]"); if (!b) return; el("nwN").value = IS_EN ? b.dataset.v.replace(",", ".") : b.dataset.v; h.calc(true); });
    },
    calc(h) {
      const { el, esc } = h, v = normNum(el("nwN").value.trim());
      if (!v) return { ok: false, incomplete: true };
      const o = read("nw", el), r = T.amountWords(v, o);
      if (r.err) return { ok: false, msg: err(r.err) };
      const cur = o.cur, steps = [];
      if (cur) {
        const sub = String(r.sub).padStart(2, "0");
        steps.push({ t: L("Розбиваємо суму", "Splitting the amount"), l: [L("Ціла частина: ", "Integer part: ") + grp(r.int), L("Дрібна частина: ", "Fractional part: ") + sub], note: L("Дрібну частину округлено до сотих (копійок / центів).", "The fractional part is rounded to hundredths (kopecks / cents).") });
        steps.push({ t: L("Записуємо словами", "Writing it in words"), l: [r.words], note: o.lang === "uk" ? L("Числівник узгоджується з іменником: «одна гривня», «дві гривні», «п'ять гривень» — форма залежить від останніх цифр.", "In Ukrainian the numeral agrees with the noun and its form depends on the last digits.") : L("В англійській іменник стоїть у множині, крім числа один: one dollar, two dollars.", "In English the noun is plural except for exactly one: “one dollar”, “two dollars”.") });
      } else {
        steps.push({ t: L("Записуємо словами", "Writing it in words"), l: [r.words], note: o.lang === "uk" ? L("Дробове число читається як «цілих … десятих/сотих/тисячних»: «дві цілих п'ять десятих».", "A decimal is read as whole parts plus tenths, hundredths or thousandths.") : L("Англійською дріб читається по цифрах після «point»: two point five.", "A decimal is read digit by digit after “point”: “two point five”.") });
      }
      const tiles = [{ k: L("Слів у записі", "Words in the text"), v: String(r.words.split(/\s+/).length) }, { k: L("Символів", "Characters"), v: String(Array.from(r.words).length) }];
      return { ok: true, expr: v, head: [L("прописом", "in words"), r.words], headSub: (CURS.find((c) => c[0] === cur) || CURS[3])[1], subRaw: true, tiles, steps, resText: r.words };
    },
    reset(h) { h.el("nwN").value = ""; resetOpts("nw", h.el); },
    fill(h) { h.el("nwN").value = IS_EN ? "1234.56" : "1234,56"; resetOpts("nw", h.el); },
    share(p, h) { if (h.el("nwN").value.trim()) { p.set("n", h.el("nwN").value.trim()); shareOpts("nw", p, h.el); } },
    apply(qs, h) { if (qs.has("n")) h.el("nwN").value = qs.get("n").slice(0, 40); applyOpts("nw", qs, h.el); }
  };

  // ----- список -----
  const many = {
    key: "many", type: "custom", nameUk: "Список сум", nameEn: "List of amounts",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full"><label class="ph__label" for="nlT">' + L("Суми — по одній у рядку", "Amounts — one per line") + '</label><textarea class="ph__input ph__ta" id="nlT" rows="5" autocomplete="off" spellcheck="false" placeholder="' + L("напр.:\n150\n1 999,99\n25000", "e.g.:\n150\n1,999.99\n25000") + '" aria-label="' + L("Суми", "Amounts") + '"></textarea></div>' + optsHtml("nl") + "</div>";
      el("nlT").addEventListener("input", maybeCalc); bindAll("nl", el, maybeCalc);
    },
    calc(h) {
      const { el, esc } = h, lines = el("nlT").value.split("\n").map((s) => s.trim()).filter(Boolean);
      if (!lines.length) return { ok: false, incomplete: true };
      if (lines.length > 100) return { ok: false, msg: L("Не більше 100 рядків за раз.", "No more than 100 lines at a time.") };
      const o = read("nl", el), out = lines.map((s) => ({ s, r: T.amountWords(normNum(s.replace(/^\d+\s*[.)]\s+/, "")), o) }));
      const bad = out.filter((e) => e.r.err);
      const rows = out.map((e) => [e.s, e.r.err ? { h: '<span style="color:#c0392b">' + esc(err(e.r.err)) + "</span>" } : { t: e.r.words, cls: "strong" }]);
      const table = PhysUI.list([L("Сума", "Amount"), L("Прописом", "In words")], rows, { w: "minmax(0, 0.7fr) minmax(0, 1.8fr)" });
      const text = out.map((e) => (e.r.err ? e.s + " — ?" : e.s + " — " + e.r.words)).join("\n");
      return { ok: true, expr: L("Список сум", "List of amounts"), head: [L("опрацьовано", "processed"), String(out.length - bad.length) + " / " + out.length], headSub: bad.length ? L("з помилками: ", "with errors: ") + bad.length : L("усі рядки прочитано", "all lines read"), subRaw: true, extraHtml: table, steps: [{ t: L("Опрацьовуємо рядки по черзі", "Processing the lines one by one"), l: [L("Рядків: ", "Lines: ") + out.length + L(", з помилками: ", ", with errors: ") + bad.length], note: L("Однакові параметри (валюта, мова, регістр) застосовуються до всіх рядків.", "The same options (currency, language, case) apply to all lines.") }], resText: text };
    },
    reset(h) { h.el("nlT").value = ""; resetOpts("nl", h.el); },
    fill(h) { h.el("nlT").value = IS_EN ? "150\n1,999.99\n25000" : "150\n1 999,99\n25000"; resetOpts("nl", h.el); },
    share(p, h) { if (h.el("nlT").value.trim()) { p.set("n", h.el("nlT").value.trim().split("\n").slice(0, 30).join("|")); shareOpts("nl", p, h.el); } },
    apply(qs, h) { if (qs.has("n")) h.el("nlT").value = qs.get("n").slice(0, 600).split("|").join("\n"); applyOpts("nl", qs, h.el); }
  };
  return { modes: [one, many], exactNote: false };
});
