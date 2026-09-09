(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const T = LANG === "en" ? {
    copied: "Text copied.",
    copyFailed: "Copy failed.",
    nothingToCopy: "Nothing to copy.",
    cleared: "Cleared.",
    min: "min",
  } : {
    copied: "Текст скопійовано.",
    copyFailed: "Не вдалося скопіювати.",
    nothingToCopy: "Немає що копіювати.",
    cleared: "Очищено.",
    min: "хв",
  };

  const WORDS_PER_MINUTE = 200;

  // ---------- DOM ----------
  const textInput = el("textInput");
  const btnClear = el("btnClear");
  const btnCopy = el("btnCopy");
  const toast = el("mToast");

  const statWords = el("statWords");
  const statCharsWithSpaces = el("statCharsWithSpaces");
  const statCharsNoSpaces = el("statCharsNoSpaces");
  const statSentences = el("statSentences");
  const statParagraphs = el("statParagraphs");
  const statReadTime = el("statReadTime");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };

  function countStats(text) {
    const trimmed = text.trim();

    const words = trimmed.length ? (trimmed.match(/\S+/g) || []).length : 0;
    const charsWithSpaces = text.length;
    const charsNoSpaces = text.replace(/\s/g, "").length;

    const sentences = trimmed.length ? (trimmed.match(/[^.!?]+[.!?]+/g) || (trimmed.length ? [trimmed] : [])).length : 0;

    const paragraphs = trimmed.length ? trimmed.split(/\n\s*\n/).filter(p => p.trim().length > 0).length : 0;

    const readMinutes = words > 0 ? Math.max(1, Math.ceil(words / WORDS_PER_MINUTE)) : 0;

    return { words, charsWithSpaces, charsNoSpaces, sentences, paragraphs, readMinutes };
  }

  function update() {
    const text = textInput?.value || "";
    const stats = countStats(text);

    if (statWords) statWords.textContent = stats.words;
    if (statCharsWithSpaces) statCharsWithSpaces.textContent = stats.charsWithSpaces;
    if (statCharsNoSpaces) statCharsNoSpaces.textContent = stats.charsNoSpaces;
    if (statSentences) statSentences.textContent = stats.sentences;
    if (statParagraphs) statParagraphs.textContent = stats.paragraphs;
    if (statReadTime) statReadTime.textContent = `${stats.readMinutes} ${T.min}`;
  }

  function clearText() {
    if (textInput) textInput.value = "";
    update();
    setToast(T.cleared);
    setTimeout(() => setToast(""), 1200);
  }

  async function copyText() {
    const text = textInput?.value || "";
    if (!text.trim()) {
      setToast(T.nothingToCopy);
      setTimeout(() => setToast(""), 1200);
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setToast(T.copied);
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(T.copyFailed);
    }
  }

  // ---------- events ----------
  textInput?.addEventListener("input", update);
  btnClear?.addEventListener("click", clearText);
  btnCopy?.addEventListener("click", copyText);

  // ---------- init ----------
  update();
})();