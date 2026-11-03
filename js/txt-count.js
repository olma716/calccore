/* txt-count.js — дані калькулятора «Лічильник символів, слів і речень»: підрахунок, ліміти платформ і SMS, частотність слів */
PhysCalc.start(({ L }) => {
  const T = window.Txt;
  const SEP = L(",", ".");
  const WORD = /[\p{L}\p{N}]+(?:['’ʼ\-][\p{L}\p{N}]+)*/gu;
  const LIMITS = [
    ["SMS (" + L("один сегмент", "a single segment") + ")", 0, "sms"],
    ["X (Twitter)", 280], ["Threads", 500], ["Bluesky", 300], ["Instagram: " + L("підпис", "caption"), 2200], ["Instagram: " + L("біо", "bio"), 150], ["Telegram: " + L("повідомлення", "message"), 4096], ["Telegram: " + L("підпис до медіа", "media caption"), 1024],
    ["LinkedIn: " + L("допис", "post"), 3000], ["YouTube: " + L("назва", "title"), 100], ["YouTube: " + L("опис", "description"), 5000], ["Google: title (" + L("орієнтир", "guide") + ")", 60], ["Google: description (" + L("орієнтир", "guide") + ")", 160]
  ];
  const clip = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const fnum = (x, d = 1) => (Math.round(x * 10 ** d) / 10 ** d).toString().replace(".", SEP);
  const ta = (id, ph, label, rows) => '<textarea class="ph__input ph__ta" id="' + id + '" rows="' + rows + '" autocomplete="off" spellcheck="false" placeholder="' + ph + '" aria-label="' + label + '"></textarea>';
  const wordsOf = (s) => s.match(WORD) || [];
  const hhmmss = (min) => { const sec = Math.round(min * 60), m = Math.floor(sec / 60), s = sec % 60; return m + " " + L("хв", "min") + " " + s + " " + L("с", "s"); };
  const SAMPLE = L("Калькулятор рахує символи, слова й речення. Це приклад тексту для перевірки: скільки тут слів, речень та абзаців?\n\nДругий абзац показує, як рахуються абзаци й рядки.", "The calculator counts characters, words and sentences. This is a sample text to check it: how many words, sentences and paragraphs are here?\n\nThe second paragraph shows how paragraphs and lines are counted.");

  function analyse(text) {
    const chars = Array.from(text), noSp = chars.filter((c) => !/\s/.test(c)), words = wordsOf(text), lw = words.map((w) => w.toLowerCase().replace(/^['’ʼ-]+|['’ʼ-]+$/g, ""));
    const sentences = (text.match(/[^.!?…\n]+[.!?…]*/g) || []).filter((s) => /[\p{L}\p{N}]/u.test(s)).length;
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim()).length, lines = text.split("\n").filter((l) => l.trim()).length;
    const letters = chars.filter((c) => /\p{L}/u.test(c)).length, digits = chars.filter((c) => /\p{N}/u.test(c)).length;
    const uniq = new Set(lw), longest = words.reduce((a, w) => (Array.from(w).length > Array.from(a).length ? w : a), "");
    return { n: chars.length, noSp: noSp.length, letters, digits, spaces: chars.filter((c) => /\s/.test(c)).length, words, lw, wc: words.length, sentences, paragraphs, lines, uniq: uniq.size, longest, avgWord: words.length ? words.reduce((a, w) => a + Array.from(w).length, 0) / words.length : 0, avgSent: sentences ? words.length / sentences : 0 };
  }

  // ----- підрахунок -----
  const count = {
    key: "count", type: "custom", nameUk: "Підрахунок", nameEn: "Count",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full"><label class="ph__label" for="tcText">' + L("Текст", "Text") + "</label>" + ta("tcText", L("Вставте або введіть текст…", "Paste or type your text…"), L("Текст", "Text"), 8) + '</div><div class="ph__var"><label class="ph__label" for="tcRead">' + L("Швидкість читання, слів/хв", "Reading speed, words/min") + '</label><input class="ph__input" id="tcRead" type="text" inputmode="numeric" autocomplete="off" maxlength="4" value="200" aria-label="' + L("Швидкість читання", "Reading speed") + '"></div><div class="ph__var"><label class="ph__label" for="tcSpeak">' + L("Швидкість мовлення, слів/хв", "Speaking speed, words/min") + '</label><input class="ph__input" id="tcSpeak" type="text" inputmode="numeric" autocomplete="off" maxlength="4" value="130" aria-label="' + L("Швидкість мовлення", "Speaking speed") + '"></div></div><div class="ph__hint ph__mt12">' + L("Швидкості — орієнтовні (читання про себе близько 200 слів на хвилину, публічна промова близько 130); змініть їх під себе. Слово — послідовність літер і цифр (з апострофом чи дефісом усередині).", "The speeds are approximate (silent reading is about 200 words per minute, a public speech about 130); change them to suit you. A word is a sequence of letters and digits (with an apostrophe or a hyphen inside).") + "</div>";
      ["tcText", "tcRead", "tcSpeak"].forEach((id) => el(id).addEventListener("input", maybeCalc));
    },
    calc(h) {
      const { el, esc } = h, text = el("tcText").value;
      if (!text.trim()) return { ok: false, incomplete: true };
      const a = analyse(text), rd = Number(String(el("tcRead").value).replace(",", ".")) || 200, sp = Number(String(el("tcSpeak").value).replace(",", ".")) || 130;
      if (rd <= 0 || sp <= 0) return { ok: false, msg: L("Швидкості мають бути додатними.", "The speeds must be positive.") };
      const rt = a.wc / rd, st = a.wc / sp;
      const rows = [[L("Символів (з пробілами)", "Characters (with spaces)"), clip(a.n)], [L("Символів (без пробілів)", "Characters (without spaces)"), clip(a.noSp)], [L("Літер", "Letters"), clip(a.letters)], [L("Цифр", "Digits"), clip(a.digits)], [L("Пробілів і переносів", "Spaces and line breaks"), clip(a.spaces)], [L("Слів", "Words"), clip(a.wc)], [L("Унікальних слів", "Unique words"), clip(a.uniq)], [L("Речень", "Sentences"), clip(a.sentences)], [L("Абзаців", "Paragraphs"), clip(a.paragraphs)], [L("Рядків", "Lines"), clip(a.lines)], [L("Середня довжина слова", "Average word length"), fnum(a.avgWord) + " " + L("літер", "letters")], [L("Слів у реченні (в середньому)", "Words per sentence (average)"), fnum(a.avgSent)], [L("Найдовше слово", "Longest word"), a.longest || "—"], [L("Час читання", "Reading time"), hhmmss(rt)], [L("Час промови", "Speaking time"), hhmmss(st)]];
      const table = '<div class="ph__sub">' + L("Усі показники", "All measures") + "</div>" + PhysUI.list([], rows, { kv: true });
      const steps = [{ t: L("Рахуємо символи", "Counting characters"), l: [L("З пробілами: ", "With spaces: ") + clip(a.n) + L("; без пробілів: ", "; without spaces: ") + clip(a.noSp)], note: L("Кожен символ Unicode (зокрема емодзі) рахується за один.", "Each Unicode character (emoji included) counts as one.") }, { t: L("Рахуємо слова й речення", "Counting words and sentences"), l: [L("Слів: ", "Words: ") + clip(a.wc) + L(" (унікальних ", " (unique ") + clip(a.uniq) + ")", L("Речень: ", "Sentences: ") + clip(a.sentences) + L(", абзаців: ", ", paragraphs: ") + clip(a.paragraphs)], note: L("Речення закінчується на . ! ? або …; абзаци розділені порожнім рядком.", "A sentence ends with . ! ? or …; paragraphs are separated by an empty line.") }, { t: L("Час читання й промови", "Reading and speaking time"), l: [clip(a.wc) + " / " + rd + " = " + fnum(rt, 2) + " " + L("хв читання", "min of reading"), clip(a.wc) + " / " + sp + " = " + fnum(st, 2) + " " + L("хв промови", "min of speaking")] }];
      const tiles = [{ k: L("Символів", "Characters"), v: clip(a.n) }, { k: L("Без пробілів", "Without spaces"), v: clip(a.noSp) }, { k: L("Речень", "Sentences"), v: clip(a.sentences) }, { k: L("Абзаців", "Paragraphs"), v: clip(a.paragraphs) }, { k: L("Читання", "Reading"), v: hhmmss(rt) }, { k: L("Промова", "Speaking"), v: hhmmss(st) }];
      return { ok: true, expr: L("Підрахунок тексту", "Text count"), head: [L("слів", "words"), clip(a.wc)], headSub: clip(a.n) + L(" символів (", " characters (") + clip(a.noSp) + L(" без пробілів)", " without spaces)"), subRaw: true, tiles, extraHtml: table, steps, resText: clip(a.wc) + L(" слів, ", " words, ") + clip(a.n) + L(" символів (", " characters (") + clip(a.noSp) + L(" без пробілів), ", " without spaces), ") + clip(a.sentences) + L(" речень, ", " sentences, ") + clip(a.paragraphs) + L(" абзаців", " paragraphs") };
    },
    reset(h) { h.el("tcText").value = ""; h.el("tcRead").value = "200"; h.el("tcSpeak").value = "130"; },
    fill(h) { h.el("tcText").value = SAMPLE; h.el("tcRead").value = "200"; h.el("tcSpeak").value = "130"; },
    share(p, h) { if (h.el("tcText").value.trim()) { p.set("t", h.el("tcText").value.slice(0, 1500)); p.set("rs", h.el("tcRead").value); p.set("ss", h.el("tcSpeak").value); } },
    apply(qs, h) { if (qs.has("t")) h.el("tcText").value = qs.get("t").slice(0, 1500); if (qs.has("rs")) h.el("tcRead").value = qs.get("rs").slice(0, 4); if (qs.has("ss")) h.el("tcSpeak").value = qs.get("ss").slice(0, 4); }
  };

  // ----- ліміти й SMS -----
  const limits = {
    key: "limits", type: "custom", nameUk: "Ліміти й SMS", nameEn: "Limits and SMS",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full"><label class="ph__label" for="lmText">' + L("Текст", "Text") + "</label>" + ta("lmText", L("Вставте текст для перевірки лімітів…", "Paste a text to check the limits…"), L("Текст", "Text"), 6) + '</div></div><div class="ph__hint ph__mt12">' + L("Ліміти платформ орієнтовні й можуть змінюватися; SMS рахується за стандартом GSM-7 (160 / 153 символи) або UCS-2 для кирилиці (70 / 67 символів у сегменті).", "The platform limits are approximate and may change; SMS is counted by the GSM-7 standard (160 / 153 characters) or UCS-2 for Cyrillic (70 / 67 characters per segment).") + "</div>";
      el("lmText").addEventListener("input", maybeCalc);
    },
    calc(h) {
      const { el, esc } = h, text = el("lmText").value;
      if (!text.trim()) return { ok: false, incomplete: true };
      const n = Array.from(text).length, sms = T.smsInfo(text), left = sms.parts ? sms.per * sms.parts - sms.units : sms.single;
      const lrows = LIMITS.filter((l) => l[2] !== "sms").map(([name, lim]) => { const over = n > lim; return [name, { t: clip(lim), cls: "muted" }, clip(n), { t: over ? "−" + clip(n - lim) + " ✗" : clip(lim - n) + " ✓", cls: "chip " + (over ? "bad" : "ok") }]; });
      const table = '<div class="ph__sub">' + L("Ліміти платформ", "Platform limits") + "</div>" + PhysUI.list([L("Платформа", "Platform"), L("Ліміт", "Limit"), L("Ваш текст", "Your text"), L("Запас", "Left")], lrows, { w: "minmax(0, 1.6fr) 70px 80px 100px" });
      const smsRows = '<div class="ph__sub">SMS</div>' + PhysUI.list([], [[L("Кодування", "Encoding"), sms.enc], [L("Одиниць (символів кодування)", "Units (encoding characters)"), clip(sms.units)], [L("Ліміт одного SMS / частини складеного", "Limit of one SMS / of a part of a long one"), sms.single + " / " + sms.multi], [L("Кількість SMS", "Number of SMS"), String(sms.parts)], [L("Запас в останньому SMS", "Left in the last SMS"), String(left)]], { kv: true });
      const steps = [{ t: L("Рахуємо символи", "Counting characters"), l: [L("Символів: ", "Characters: ") + clip(n)] }, { t: L("Кодування SMS", "SMS encoding"), l: [sms.enc + ": " + clip(sms.units) + L(" одиниць → ", " units → ") + sms.parts + " SMS"], note: sms.enc === "UCS-2" ? L("Кирилиця й емодзі потребують UCS-2: 70 символів в одному SMS і по 67 у складеному.", "Cyrillic and emoji need UCS-2: 70 characters in one SMS and 67 each in a concatenated one.") : L("Лише символи GSM-7: до 160 в одному SMS і по 153 у складеному; { } [ ] ~ ^ | \\ € рахуються за два.", "Only GSM-7 characters: up to 160 in one SMS and 153 each in a concatenated one; { } [ ] ~ ^ | \\ € count as two.") }];
      const tiles = [{ k: L("Символів", "Characters"), v: clip(n) }, { k: L("Кодування SMS", "SMS encoding"), v: sms.enc }, { k: L("Кількість SMS", "Number of SMS"), v: String(sms.parts) }, { k: "X (Twitter)", v: n <= 280 ? "✓ " + (280 - n) : "✗ −" + (n - 280) }];
      return { ok: true, expr: L("Ліміти й SMS", "Limits and SMS"), head: [L("SMS", "SMS"), sms.parts + " (" + sms.enc + ")"], headSub: clip(n) + L(" символів; в останньому SMS лишилось ", " characters; left in the last SMS: ") + left, subRaw: true, tiles, extraHtml: smsRows + table, steps, resText: clip(n) + L(" символів, ", " characters, ") + sms.parts + " SMS (" + sms.enc + ")" };
    },
    reset(h) { h.el("lmText").value = ""; },
    fill(h) { h.el("lmText").value = L("Вітаємо! Ваше замовлення №12345 відправлено, очікуйте доставку завтра з 10:00 до 14:00. Дякуємо, що обрали нас!", "Hello! Your order No. 12345 has been shipped, expect delivery tomorrow between 10:00 and 14:00. Thank you for choosing us!"); },
    share(p, h) { if (h.el("lmText").value.trim()) p.set("t", h.el("lmText").value.slice(0, 1500)); },
    apply(qs, h) { if (qs.has("t")) h.el("lmText").value = qs.get("t").slice(0, 1500); }
  };

  // ----- частотність слів -----
  const freq = {
    key: "freq", type: "custom", nameUk: "Частотність слів", nameEn: "Word frequency",
    build(body, x, h) {
      const { el, maybeCalc } = h;
      body.innerHTML = '<div class="ph__vars"><div class="ph__var ph__var--full"><label class="ph__label" for="fqText">' + L("Текст", "Text") + "</label>" + ta("fqText", L("Вставте текст для аналізу…", "Paste a text to analyse…"), L("Текст", "Text"), 7) + '</div><div class="ph__var"><label class="ph__label" for="fqMin">' + L("Мінімальна довжина слова", "Minimum word length") + '</label><select class="ph__unit ph__unit--wide" id="fqMin">' + [1, 2, 3, 4, 5].map((n) => '<option value="' + n + '"' + (n === 3 ? " selected" : "") + ">" + n + L(" літер", " letters") + "</option>").join("") + '</select></div><div class="ph__var"><label class="ph__label" for="fqTop">' + L("Скільки слів показати", "How many words to show") + '</label><select class="ph__unit ph__unit--wide" id="fqTop">' + [[10, "10"], [20, "20"], [50, "50"], [1000, L("усі", "all")]].map(([v, t]) => '<option value="' + v + '"' + (v === 20 ? " selected" : "") + ">" + t + "</option>").join("") + '</select></div></div><div class="ph__hint ph__mt12">' + L("Регістр не враховується («Слово» і «слово» — те саме). Короткі службові слова можна відсіяти мінімальною довжиною.", "Case is ignored (“Word” and “word” are the same). Short function words can be filtered out with the minimum length.") + "</div>";
      el("fqText").addEventListener("input", maybeCalc); ["fqMin", "fqTop"].forEach((id) => el(id).addEventListener("change", maybeCalc));
    },
    calc(h) {
      const { el, esc } = h, text = el("fqText").value;
      if (!text.trim()) return { ok: false, incomplete: true };
      const min = Number(el("fqMin").value), top = Number(el("fqTop").value), a = analyse(text), map = new Map();
      a.lw.filter((w) => Array.from(w).length >= min).forEach((w) => map.set(w, (map.get(w) || 0) + 1));
      const all = [...map.entries()].sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0], L("uk", "en"))), tot = all.reduce((s, e) => s + e[1], 0), shown = all.slice(0, top);
      if (!all.length) return { ok: false, msg: L("У тексті немає слів потрібної довжини.", "There are no words of the required length in the text.") };
      const mx = shown[0][1], frows = shown.map(([w, c], i) => [(i + 1) + ". " + w, String(c), { h: '<span class="ph__bar" style="width:' + Math.max(4, Math.round((c / mx) * 80)) + 'px"></span>' + fnum((c / tot) * 100) + " %" }]);
      const table = '<div class="ph__sub">' + L("Найчастіші слова", "Most frequent words") + "</div>" + PhysUI.list([L("Слово", "Word"), L("Разів", "Times"), L("Частка", "Share")], frows, { w: "minmax(0, 1.5fr) 70px 150px" });
      const div = tot ? all.length / tot : 0;
      const steps = [{ t: L("Розбиваємо на слова", "Splitting into words"), l: [L("Слів: ", "Words: ") + clip(a.wc) + L("; після фільтра довжини ≥ ", "; after the length filter ≥ ") + min + ": " + clip(tot)] }, { t: L("Порівнюємо без урахування регістру й рахуємо", "Comparing ignoring case and counting"), l: [L("Різних слів: ", "Distinct words: ") + clip(all.length), L("Найчастіше: «", "The most frequent: “") + shown[0][0] + L("» — ", "” — ") + shown[0][1] + L(" р.", " times")], note: L("Лексичне різноманіття = різні слова / усі слова = ", "Lexical diversity = distinct words / all words = ") + fnum(div, 3) + "." }];
      return { ok: true, expr: L("Частотність слів", "Word frequency"), head: [L("найчастіше", "most frequent"), shown[0][0] + " × " + shown[0][1]], headSub: L("різних слів ", "distinct words ") + clip(all.length) + L(" із ", " of ") + clip(tot), subRaw: true, tiles: [{ k: L("Слів після фільтра", "Words after the filter"), v: clip(tot) }, { k: L("Різних слів", "Distinct words"), v: clip(all.length) }, { k: L("Різноманіття", "Diversity"), v: fnum(div, 3) }], extraHtml: table, steps, resText: shown.slice(0, 10).map(([w, c]) => w + " — " + c).join("; ") };
    },
    reset(h) { h.el("fqText").value = ""; h.el("fqMin").value = "3"; h.el("fqTop").value = "20"; },
    fill(h) { h.el("fqText").value = L("Мова — це ключ до культури, а культура — це ключ до розуміння. Хто знає мову, той знає культуру; хто знає культуру, той розуміє людей. Мова об'єднує, мова надихає, мова живе.", "Language is the key to culture, and culture is the key to understanding. Whoever knows the language knows the culture; whoever knows the culture understands people. Language unites, language inspires, language lives."); h.el("fqMin").value = "3"; h.el("fqTop").value = "20"; },
    share(p, h) { if (h.el("fqText").value.trim()) { p.set("t", h.el("fqText").value.slice(0, 1500)); p.set("mn", h.el("fqMin").value); p.set("tp", h.el("fqTop").value); } },
    apply(qs, h) { if (qs.has("t")) h.el("fqText").value = qs.get("t").slice(0, 1500); if (qs.has("mn") && [1, 2, 3, 4, 5].includes(Number(qs.get("mn")))) h.el("fqMin").value = qs.get("mn"); if (qs.has("tp") && [10, 20, 50, 1000].includes(Number(qs.get("tp")))) h.el("fqTop").value = qs.get("tp"); }
  };
  return { modes: [count, limits, freq], exactNote: false };
});
