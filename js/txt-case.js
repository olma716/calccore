/* txt-case.js — дані калькулятора «Регістр і очищення тексту»: зміна регістру, стилі іменування, чистка пробілів, рядків і розділових знаків */
PhysCalc.start(({ L }) => {
  const clip = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const WORD = /[\p{L}\p{N}]+/gu;
  const ta = (id, ph, label, rows) => '<textarea class="ph__input ph__ta" id="' + id + '" rows="' + rows + '" autocomplete="off" spellcheck="false" placeholder="' + ph + '" aria-label="' + label + '"></textarea>';
  const outBox = (text, esc) => '<div class="ph__sub">' + L("Результат", "Result") + '</div><textarea class="ph__input ph__ta ph__out" readonly rows="6" aria-label="' + L("Результат", "Result") + '">' + esc(text) + "</textarea>";
  const up1 = (w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w);
  const words = (s) => s.match(WORD) || [];

  const CASES = [
    ["upper", L("ВЕЛИКІ ЛІТЕРИ", "UPPERCASE"), (s) => s.toUpperCase()],
    ["lower", L("малі літери", "lowercase"), (s) => s.toLowerCase()],
    ["sentence", L("Як у реченні (перша велика)", "Sentence case"), (s) => s.toLowerCase().replace(/(^|[.!?…]\s+|\n\s*)(\p{L})/gu, (m, a, b) => a + b.toUpperCase()).replace(/^(\s*)(\p{L})/u, (m, a, b) => a + b.toUpperCase())],
    ["title", L("Кожне Слово З Великої", "Title Case"), (s) => s.toLowerCase().replace(/(^|[\s\-–—"«(\[])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())],
    ["swap", L("іНВЕРТУВАТИ рЕГІСТР", "iNVERT cASE"), (s) => Array.from(s).map((c) => (c === c.toUpperCase() ? c.toLowerCase() : c.toUpperCase())).join("")],
    ["camel", "camelCase", (s) => words(s).map((w, i) => (i ? up1(w.toLowerCase()) : w.toLowerCase())).join("")],
    ["pascal", "PascalCase", (s) => words(s).map((w) => up1(w.toLowerCase())).join("")],
    ["snake", "snake_case", (s) => words(s).map((w) => w.toLowerCase()).join("_")],
    ["kebab", "kebab-case", (s) => words(s).map((w) => w.toLowerCase()).join("-")],
    ["const", "CONSTANT_CASE", (s) => words(s).map((w) => w.toUpperCase()).join("_")]
  ];

  const CLEAN = [
    ["trim", L("Обрізати пробіли на краях рядків", "Trim spaces at line ends"), (s) => s.split("\n").map((l) => l.trim()).join("\n")],
    ["spaces", L("Кілька пробілів → один", "Multiple spaces → one"), (s) => s.replace(/[ \t ]{2,}/g, " ")],
    ["punctsp", L("Пробіли навколо розділових знаків", "Spaces around punctuation"), (s) => s.replace(/\s+([,.;:!?…)»])/g, "$1").replace(/([,;:!?])(?=[\p{L}\p{N}])/gu, "$1 ").replace(/([(«])\s+/g, "$1")],
    ["empty", L("Прибрати порожні рядки", "Remove empty lines"), (s) => s.split("\n").filter((l) => l.trim()).join("\n")],
    ["dups", L("Прибрати рядки, що повторюються", "Remove duplicate lines"), (s) => { const seen = new Set(); return s.split("\n").filter((l) => { const k = l.trim().toLowerCase(); if (!k) return true; if (seen.has(k)) return false; seen.add(k); return true; }).join("\n"); }],
    ["join", L("З'єднати рядки в один абзац", "Join lines into one paragraph"), (s) => s.split("\n").map((l) => l.trim()).filter(Boolean).join(" ")],
    ["quotes", L("Прямі лапки → «ялинки» / “дужки”", "Straight quotes → curly quotes"), (s) => (L(true, false) ? s.replace(/(^|[\s(\[—–-])"/g, "$1«").replace(/"/g, "»") : s.replace(/(^|[\s(\[—–-])"/g, "$1“").replace(/"/g, "”"))],
    ["dash", L("Дефіс між пробілами → тире (—)", "Hyphen between spaces → dash (—)"), (s) => s.replace(/ [-–] /g, " — ")],
    ["digits", L("Видалити цифри", "Remove digits"), (s) => s.replace(/\p{N}/gu, "")],
    ["punct", L("Видалити розділові знаки", "Remove punctuation"), (s) => s.replace(/[\p{P}\p{S}]/gu, "")],
    ["sortAZ", L("Відсортувати рядки за алфавітом", "Sort lines alphabetically"), (s) => s.split("\n").sort((a, b) => a.localeCompare(b, L("uk", "en"))).join("\n")]
  ];
  const GROUPS = [[L("Пробіли", "Spaces"), ["trim", "spaces", "punctsp"]], [L("Рядки", "Lines"), ["empty", "dups", "sortAZ", "join"]], [L("Знаки й символи", "Characters"), ["quotes", "dash", "digits", "punct"]]];
  CLEAN.sort((a, b) => GROUPS.flatMap((g) => g[1]).indexOf(a[0]) - GROUPS.flatMap((g) => g[1]).indexOf(b[0]));
  const togHtml = () => GROUPS.map(([title, keys]) => '<div class="ph__togGrp"><div class="ph__togTitle">' + title + '</div><div class="ph__togs">' + keys.map((k) => { const c = CLEAN.find((e) => e[0] === k); return '<button type="button" class="ph__tog" data-k="' + k + '" aria-pressed="' + (DEFAULT_ON.includes(k) ? "true" : "false") + '"><i class="ph__togBox" aria-hidden="true"></i><span>' + c[1] + "</span></button>"; }).join("") + "</div></div>").join("");
  const DEFAULT_ON =["trim", "spaces", "empty"];
  const SAMPLE = L("  Це   тестовий текст ,у якому багато  зайвих   пробілів .\n\n\nПовторюваний рядок\nПовторюваний рядок\n  Ще один рядок !", "  This   is a test text ,with a lot of  extra   spaces .\n\n\nRepeated line\nRepeated line\n  Another line !");
  const SAMPLE_CASE = L("перший рядок прикладу. другий рядок: ПЕРЕВІРКА регістру! чи правильно?", "the first line of the sample. the second line: CHECKING the case! is it right?");

  // ----- регістр -----
  const cases = {
    key: "case", type: "custom", nameUk: "Регістр", nameEn: "Letter case",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full"><label class="ph__label" for="csT">' + L("Текст", "Text") + "</label>" + ta("csT", L("Вставте або введіть текст…", "Paste or type your text…"), L("Текст", "Text"), 6) + '</div><div class="ph__var ph__var--full"><label class="ph__label" for="csK">' + L("Перетворення", "Conversion") + '</label><select class="ph__unit ph__unit--wide" id="csK">' + CASES.map((c) => '<option value="' + c[0] + '">' + c[1] + "</option>").join("") + "</select></div></div>";
      el("csT").addEventListener("input", maybeCalc); el("csK").addEventListener("change", maybeCalc);
    },
    calc(h) {
      const { el, esc } = h, s = el("csT").value;
      if (!s.trim()) return { ok: false, incomplete: true };
      const c = CASES.find((e) => e[0] === el("csK").value), out = c[2](s);
      const steps = [{ t: L("Застосовуємо перетворення", "Applying the conversion"), l: [c[1]], note: ["camel", "pascal", "snake", "kebab", "const"].includes(c[0]) ? L("Для стилів іменування текст розбивається на слова (літери й цифри), решта знаків відкидається.", "For naming styles the text is split into words (letters and digits), other characters are dropped.") : L("Перетворення працює з будь-якою мовою, зокрема з українською кирилицею.", "The conversion works with any language, including Ukrainian Cyrillic.") }];
      return { ok: true, expr: c[1], head: [L("символів у результаті", "characters in the result"), clip(Array.from(out).length)], headSub: c[1], subRaw: true, tiles: [{ k: L("Було символів", "Characters before"), v: clip(Array.from(s).length) }, { k: L("Стало", "After"), v: clip(Array.from(out).length) }, { k: L("Слів", "Words"), v: clip(words(out).length) }], extraHtml: outBox(out, esc), steps, resText: out };
    },
    reset(h) { h.el("csT").value = ""; h.el("csK").value = "upper"; },
    fill(h) { h.el("csT").value = SAMPLE_CASE; h.el("csK").value = "sentence"; },
    share(p, h) { if (h.el("csT").value.trim()) { p.set("t", h.el("csT").value.slice(0, 1500)); p.set("k", h.el("csK").value); } },
    apply(qs, h) { if (qs.has("t")) h.el("csT").value = qs.get("t").slice(0, 1500); if (qs.has("k") && CASES.some((c) => c[0] === qs.get("k"))) h.el("csK").value = qs.get("k"); }
  };

  // ----- очищення -----
  const clean = {
    key: "clean", type: "custom", nameUk: "Очищення", nameEn: "Cleanup",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full"><label class="ph__label" for="clT">' + L("Текст", "Text") + "</label>" + ta("clT", L("Вставте текст, який треба почистити…", "Paste the text to clean up…"), L("Текст", "Text"), 7) + '</div></div><div class="ph__sub ph__mt12">' + L("Що зробити (групи виконуються зверху вниз)", "What to do (groups are applied from top to bottom)") + '</div><div id="clTogs">' + togHtml() + "</div>";
      el("clT").addEventListener("input", maybeCalc);
      el("clTogs").addEventListener("click", (e) => { const b = e.target.closest("button[data-k]"); if (!b) return; b.setAttribute("aria-pressed", b.getAttribute("aria-pressed") === "true" ? "false" : "true"); h.calc(true); });
    },
    calc(h) {
      const { el, esc } = h, s = el("clT").value, on = [...el("clTogs").querySelectorAll("button[aria-pressed=true]")].map((b) => b.dataset.k);
      if (!s.trim()) return { ok: false, incomplete: true };
      if (!on.length) return { ok: false, msg: L("Оберіть хоча б одну дію.", "Pick at least one action.") };
      let cur = s; const steps = [];
      CLEAN.filter((c) => on.includes(c[0])).forEach((c) => { const before = Array.from(cur).length, next = c[2](cur); steps.push({ t: c[1], l: [clip(before) + " → " + clip(Array.from(next).length) + L(" символів", " characters")] }); cur = next; });
      const n0 = Array.from(s).length, n1 = Array.from(cur).length, lines0 = s.split("\n").length, lines1 = cur.split("\n").length;
      return { ok: true, expr: L("Очищення тексту", "Text cleanup"), head: [L("символів у результаті", "characters in the result"), clip(n1)], headSub: L("видалено ", "removed ") + clip(n0 - n1) + L(" символів", " characters"), subRaw: true, tiles: [{ k: L("Було символів", "Characters before"), v: clip(n0) }, { k: L("Стало", "After"), v: clip(n1) }, { k: L("Було рядків", "Lines before"), v: String(lines0) }, { k: L("Стало рядків", "Lines after"), v: String(lines1) }], extraHtml: outBox(cur, esc), steps, resText: cur };
    },
    reset(h) { h.el("clT").value = ""; h.el("clTogs").querySelectorAll("button[data-k]").forEach((b) => b.setAttribute("aria-pressed", DEFAULT_ON.includes(b.dataset.k) ? "true" : "false")); },
    fill(h) { h.el("clT").value = SAMPLE; h.el("clTogs").querySelectorAll("button[data-k]").forEach((b) => b.setAttribute("aria-pressed", ["trim", "spaces", "punctsp", "empty", "dups"].includes(b.dataset.k) ? "true" : "false")); },
    share(p, h) { if (!h.el("clT").value.trim()) return; p.set("t", h.el("clT").value.slice(0, 1500)); p.set("o", [...h.el("clTogs").querySelectorAll("button[aria-pressed=true]")].map((b) => b.dataset.k).join(",")); },
    apply(qs, h) { if (qs.has("t")) h.el("clT").value = qs.get("t").slice(0, 1500); if (qs.has("o")) { const on = qs.get("o").split(",").filter((k) => CLEAN.some((c) => c[0] === k)); h.el("clTogs").querySelectorAll("button[data-k]").forEach((b) => b.setAttribute("aria-pressed", on.includes(b.dataset.k) ? "true" : "false")); } }
  };
  return { modes: [cases, clean] };
});
