/* txt-translit.js — дані калькулятора «Транслітерація»: українська → латиниця за КМУ 2010 (постанова № 55), текст і ПІБ для документів */
PhysCalc.start(({ L }) => {
  const T = window.Txt;
  const TABLE = [["А", "A"], ["Б", "B"], ["В", "V"], ["Г", "H"], ["Ґ", "G"], ["Д", "D"], ["Е", "E"], ["Є", "Ye / ie"], ["Ж", "Zh"], ["З", "Z"], ["И", "Y"], ["І", "I"], ["Ї", "Yi / i"], ["Й", "Y / i"], ["К", "K"], ["Л", "L"], ["М", "M"], ["Н", "N"], ["О", "O"], ["П", "P"], ["Р", "R"], ["С", "S"], ["Т", "T"], ["У", "U"], ["Ф", "F"], ["Х", "Kh"], ["Ц", "Ts"], ["Ч", "Ch"], ["Ш", "Sh"], ["Щ", "Shch"], ["Ю", "Yu / iu"], ["Я", "Ya / ia"], ["Ь, ʼ", L("не передаються", "omitted")], ["ЗГ", "Zgh"]];
  const tableHtml = (esc) => '<details class="ph__det"><summary>' + L("Таблиця відповідності літер (КМУ 2010)", "Letter correspondence table (CMU 2010)") + '</summary><div style="max-height:360px;overflow:auto">' + PhysUI.list([], TABLE, { kv: true }) + "</div></details>";
  const hypSel = (id) => '<select class="ph__unit ph__unit--wide" id="' + id + '" aria-label="' + L("Дефіс", "Hyphen") + '"><option value="1">' + L("після дефіса — як початок слова (Yurii-Yavorskyi)", "after a hyphen — as a word start (Boiko-Yavorskyi)") + '</option><option value="0">' + L("після дефіса — як усередині слова (Boiko-Iavorskyi)", "after a hyphen — as inside a word (Boiko-Iavorskyi)") + "</option></select>";
  const pick = (cond, a, b) => (cond ? a : b);
  const SAMPLE = "Тарас Шевченко народився в селі Моринці. Київ, Львів, Запоріжжя, Згорани, Єнакієве.";

  // ----- текст -----
  const text = {
    key: "text", type: "custom", nameUk: "Текст", nameEn: "Text",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full"><label class="ph__label" for="trT">' + L("Український текст", "Ukrainian text") + '</label><textarea class="ph__input ph__ta" id="trT" rows="5" autocomplete="off" spellcheck="false" placeholder="' + L("напр.: Київ, Юрій, Запоріжжя", "e.g.: Київ, Юрій, Запоріжжя") + '" aria-label="' + L("Український текст", "Ukrainian text") + '"></textarea></div><div class="ph__var ph__var--full"><label class="ph__label" for="trH">' + L("Літера після дефіса", "A letter after a hyphen") + "</label>" + hypSel("trH") + '</div></div><div class="ph__hint ph__mt12">' + L("Правила — Постанова КМУ № 55 від 27.01.2010: Є, Ї, Й, Ю, Я на початку слова передаються як Ye, Yi, Y, Yu, Ya, а всередині — як ie, i, i, iu, ia; «зг» → «zgh»; м'який знак і апостроф опускаються.", "Rules — Resolution No. 55 of the Cabinet of Ministers of Ukraine of 27 Jan 2010: Є, Ї, Й, Ю, Я at the start of a word become Ye, Yi, Y, Yu, Ya, and inside a word ie, i, i, iu, ia; “зг” → “zgh”; the soft sign and the apostrophe are dropped.") + "</div>";
      el("trT").addEventListener("input", maybeCalc); el("trH").addEventListener("change", maybeCalc);
    },
    calc(h) {
      const { el, esc } = h, src = el("trT").value;
      if (!src.trim()) return { ok: false, incomplete: true };
      const r = T.translit(src, el("trH").value === "1"), cyr = (src.match(/[А-Яа-яІіЇїЄєҐґ]/g) || []).length;
      if (!cyr) return { ok: false, msg: L("У тексті немає української кирилиці — нічого перетворювати.", "There is no Ukrainian Cyrillic in the text — nothing to convert.") };
      const out = r.text, words = (out.match(/[A-Za-z]+/g) || []).length;
      const used = []; r.rows.forEach(([a, b]) => { if (!used.some((u) => u[0] === a.toLowerCase())) used.push([a.toLowerCase(), b.toLowerCase()]); });
      const steps = [{ t: L("Переводимо літера за літерою", "Converting letter by letter"), l: [L("Кирилічних літер: ", "Cyrillic letters: ") + cyr], note: L("Літери Є, Ї, Й, Ю, Я залежать від місця в слові, а «зг» читається окремо.", "The letters Є, Ї, Й, Ю, Я depend on their position in the word, and “зг” is handled separately.") }, { t: L("Які правила спрацювали", "Which rules were applied"), l: [used.slice(0, 18).map((u) => u[0] + " → " + (u[1] || "∅")).join(";  ")] }];
      return { ok: true, expr: L("Транслітерація КМУ 2010", "CMU 2010 transliteration"), head: [L("латиницею", "in Latin"), out.length > 70 ? out.slice(0, 70) + "…" : out], headSub: cyr + L(" літер у ", " letters in ") + words + L(" словах", " words"), subRaw: true, tiles: [{ k: L("Результат", "Result"), v: out.length > 40 ? out.slice(0, 40) + "…" : out }, { k: L("Літер", "Letters"), v: String(cyr) }], extraHtml: '<div class="ph__sub">' + L("Повний результат", "Full result") + '</div><div class="ph__pre" style="white-space:pre-wrap;word-break:break-word;font-weight:700;line-height:1.5">' + esc(out) + "</div>" + tableHtml(esc), steps, resText: out };
    },
    reset(h) { h.el("trT").value = ""; h.el("trH").value = "1"; },
    fill(h) { h.el("trT").value = SAMPLE; h.el("trH").value = "1"; },
    share(p, h) { if (h.el("trT").value.trim()) { p.set("t", h.el("trT").value.slice(0, 1500)); p.set("hy", h.el("trH").value); } },
    apply(qs, h) { if (qs.has("t")) h.el("trT").value = qs.get("t").slice(0, 1500); if (qs.has("hy") && ["0", "1"].includes(qs.get("hy"))) h.el("trH").value = qs.get("hy"); }
  };

  // ----- ПІБ для документів -----
  const fio = {
    key: "fio", type: "custom", nameUk: "ПІБ для документів", nameEn: "Full name for documents",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      const f = (id, lab, ph) => '<div class="ph__var"><label class="ph__label" for="' + id + '">' + lab + '</label><input class="ph__input" id="' + id + '" type="text" autocomplete="off" maxlength="40" placeholder="' + ph + '" aria-label="' + lab + '"></div>';
      body.innerHTML = '<div class="ph__vars">' + f("fiS", L("Прізвище", "Surname"), L("Шевченко", "Шевченко")) + f("fiN", L("Ім'я", "Given name"), L("Тарас", "Тарас")) + f("fiP", L("По батькові (необов'язково)", "Patronymic (optional)"), L("Григорович", "Григорович")) + '<div class="ph__var"><label class="ph__label" for="fiC">' + L("Регістр", "Letter case") + '</label><select class="ph__unit ph__unit--wide" id="fiC"><option value="up">' + L("ВЕЛИКІ (як у паспорті)", "CAPITALS (as in a passport)") + '</option><option value="cap">' + L("Перша велика (Shevchenko)", "Capitalised (Shevchenko)") + '</option></select></div><div class="ph__var ph__var--full"><label class="ph__label" for="fiH">' + L("Подвійне прізвище з дефісом", "Double surname with a hyphen") + "</label>" + hypSel("fiH") + '</div></div><div class="ph__hint ph__mt12">' + L("У закордонному паспорті пишуть прізвище та ім'я; по батькові додають, якщо потрібно для інших документів. Введіть слова кирилицею.", "A foreign passport shows the surname and given name; add the patronymic if another document requires it. Enter the words in Cyrillic.") + "</div>";
      ["fiS", "fiN", "fiP"].forEach((id) => el(id).addEventListener("input", maybeCalc)); ["fiC", "fiH"].forEach((id) => el(id).addEventListener("change", maybeCalc));
    },
    calc(h) {
      const { el, esc } = h, v = (id) => el(id).value.trim(), up = el("fiC").value === "up", hy = el("fiH").value === "1";
      const s = v("fiS"), n = v("fiN"), p = v("fiP");
      if (!s && !n && !p) return { ok: false, incomplete: true };
      const conv = (w) => { if (!w) return ""; const r = T.translit(w, hy).text; return up ? r.toUpperCase() : r.charAt(0).toUpperCase() + r.slice(1); };
      const parts = [["S", s], ["N", n], ["P", p]].filter((e) => e[1]).map(([k, w]) => ({ k, src: w, out: conv(w) }));
      if (parts.some((e) => !/[А-Яа-яІіЇїЄєҐґ]/.test(e.src))) return { ok: false, msg: L("Введіть слова українською (кирилицею).", "Enter the words in Ukrainian (Cyrillic).") };
      const nameFull = parts.filter((e) => e.k !== "P").map((e) => e.out).join(" "), full = parts.map((e) => e.out).join(" ");
      const lab = { S: L("Прізвище", "Surname"), N: L("Ім'я", "Given name"), P: L("По батькові", "Patronymic") };
      const table = PhysUI.list([L("Поле", "Field"), L("Кирилицею", "Cyrillic"), L("Латиницею", "Latin")], parts.map((e) => [lab[e.k], e.src, { t: e.out, cls: "chip" }]), { w: "minmax(0, 1fr) minmax(0, 1.3fr) minmax(0, 1.5fr)" });
      const steps = parts.map((e) => ({ t: lab[e.k], l: [e.src + " → " + e.out] }));
      return { ok: true, expr: L("ПІБ латиницею", "Name in Latin"), head: [L("для документа", "for a document"), nameFull || full], headSub: pick(p, L("з по батькові: ", "with patronymic: ") + full, L("прізвище та ім'я", "surname and given name")), subRaw: true, tiles: [{ k: L("Прізвище та ім'я", "Surname and given name"), v: nameFull || "—" }, { k: L("Повністю", "Full"), v: full }], extraHtml: table, steps, resText: full };
    },
    reset(h) { ["fiS", "fiN", "fiP"].forEach((id) => (h.el(id).value = "")); h.el("fiC").value = "up"; h.el("fiH").value = "1"; },
    fill(h) { h.el("fiS").value = "Бойко-Юрченко"; h.el("fiN").value = "Юрій"; h.el("fiP").value = "Григорович"; h.el("fiC").value = "up"; h.el("fiH").value = "1"; },
    share(p, h) { const { el } = h; if (!el("fiS").value.trim() && !el("fiN").value.trim() && !el("fiP").value.trim()) return; p.set("s", el("fiS").value.trim()); p.set("n", el("fiN").value.trim()); p.set("p", el("fiP").value.trim()); p.set("cs", el("fiC").value); p.set("hy", el("fiH").value); },
    apply(qs, h) { const { el } = h; ["s:fiS", "n:fiN", "p:fiP"].forEach((m) => { const [k, id] = m.split(":"); if (qs.has(k)) el(id).value = qs.get(k).slice(0, 40); }); if (qs.has("cs") && ["up", "cap"].includes(qs.get("cs"))) el("fiC").value = qs.get("cs"); if (qs.has("hy") && ["0", "1"].includes(qs.get("hy"))) el("fiH").value = qs.get("hy"); }
  };
  return { modes: [text, fio], exactNote: false };
});
