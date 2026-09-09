(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const T = LANG === "en" ? {
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    nothingToCopy: "Nothing to copy.",
    invalidRange: "'From' must be less than or equal to 'To'.",
    notEnoughUnique: "Range too small for that many unique numbers.",
  } : {
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    nothingToCopy: "Немає що копіювати.",
    invalidRange: "\"Від\" має бути менше або дорівнювати \"До\".",
    notEnoughUnique: "Діапазон замалий для такої кількості унікальних чисел.",
  };

  // ---------- DOM ----------
  const minValue = el("minValue");
  const maxValue = el("maxValue");
  const countValue = el("countValue");
  const uniqueCheck = el("uniqueCheck");

  const btnGenerate = el("btnGenerate");
  const btnCopy = el("btnCopy");
  const toast = el("mToast");
  const randomResults = el("randomResults");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };

  let lastNumbers = [];

  function secureRandomInt(min, max) {
    // inclusive range [min, max]
    const range = max - min + 1;
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return min + (arr[0] % range);
  }

  function generate() {
    const min = Math.round(Number(minValue?.value));
    const max = Math.round(Number(maxValue?.value));
    const count = Math.max(1, Math.round(Number(countValue?.value)) || 1);
    const unique = uniqueCheck?.checked;

    if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
      setToast(T.invalidRange);
      randomResults.innerHTML = "";
      return;
    }

    const rangeSize = max - min + 1;
    if (unique && count > rangeSize) {
      setToast(T.notEnoughUnique);
      randomResults.innerHTML = "";
      return;
    }

    setToast("");
    let numbers = [];

    if (unique) {
      const pool = [];
      for (let i = min; i <= max; i++) pool.push(i);
      for (let i = pool.length - 1; i > 0; i--) {
        const j = secureRandomInt(0, i);
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      numbers = pool.slice(0, count);
    } else {
      for (let i = 0; i < count; i++) {
        numbers.push(secureRandomInt(min, max));
      }
    }

    lastNumbers = numbers;
    randomResults.innerHTML = numbers.map(n => `<div class="random-chip">${n}</div>`).join("");
  }

  async function copyResult() {
    if (!lastNumbers.length) {
      setToast(T.nothingToCopy);
      setTimeout(() => setToast(""), 1200);
      return;
    }
    try {
      await navigator.clipboard.writeText(lastNumbers.join(", "));
      setToast(T.copied);
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(T.copyFailed);
    }
  }

  // ---------- events ----------
  btnGenerate?.addEventListener("click", generate);
  btnCopy?.addEventListener("click", copyResult);
  [minValue, maxValue, countValue].forEach(x => x?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") generate();
  }));

  // ---------- init ----------
  generate();
})();