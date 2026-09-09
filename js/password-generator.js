(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const T = LANG === "en" ? {
    copied: "Password copied.",
    copyFailed: "Copy failed.",
    strengthWeak: "Weak",
    strengthFair: "Fair",
    strengthGood: "Good",
    strengthStrong: "Strong",
    strengthVeryStrong: "Very strong",
    selectAtLeastOne: "Select at least one character type.",
  } : {
    copied: "Пароль скопійовано.",
    copyFailed: "Не вдалося скопіювати.",
    strengthWeak: "Слабкий",
    strengthFair: "Задовільний",
    strengthGood: "Хороший",
    strengthStrong: "Надійний",
    strengthVeryStrong: "Дуже надійний",
    selectAtLeastOne: "Обери хоча б один тип символів.",
  };

  const CHAR_SETS = {
    uppercase: "ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    lowercase: "abcdefghijklmnopqrstuvwxyz",
    numbers: "0123456789",
    symbols: "!@#$%^&*()_+-=[]{}|;:,.<>?",
  };
  const AMBIGUOUS = "0O1lI";

  // ---------- DOM ----------
  const passwordText = el("passwordText");
  const btnCopyPassword = el("btnCopyPassword");
  const btnGenerate = el("btnGenerate");

  const strengthFill = el("strengthFill");
  const strengthLabel = el("strengthLabel");

  const lengthSlider = el("lengthSlider");
  const lengthValue = el("lengthValue");

  const optUppercase = el("optUppercase");
  const optLowercase = el("optLowercase");
  const optNumbers = el("optNumbers");
  const optSymbols = el("optSymbols");
  const optExcludeAmbiguous = el("optExcludeAmbiguous");

  const toast = el("mToast");
  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };

  function secureRandomInt(max) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % max;
  }

  function buildCharPool() {
    let pool = "";
    if (optUppercase?.checked) pool += CHAR_SETS.uppercase;
    if (optLowercase?.checked) pool += CHAR_SETS.lowercase;
    if (optNumbers?.checked) pool += CHAR_SETS.numbers;
    if (optSymbols?.checked) pool += CHAR_SETS.symbols;

    if (optExcludeAmbiguous?.checked) {
      pool = pool.split("").filter(c => !AMBIGUOUS.includes(c)).join("");
    }
    return pool;
  }

  function generatePassword() {
    const length = Number(lengthSlider?.value) || 16;
    const pool = buildCharPool();

    if (!pool) {
      setToast(T.selectAtLeastOne);
      passwordText.textContent = "————————————";
      updateStrength(0);
      return;
    }
    setToast("");

    let result = "";
    for (let i = 0; i < length; i++) {
      result += pool[secureRandomInt(pool.length)];
    }

    passwordText.textContent = result;
    updateStrengthForPassword(result, length);
  }

  function updateStrengthForPassword(password, length) {
    let poolSize = 0;
    if (optUppercase?.checked) poolSize += 26;
    if (optLowercase?.checked) poolSize += 26;
    if (optNumbers?.checked) poolSize += 10;
    if (optSymbols?.checked) poolSize += CHAR_SETS.symbols.length;

    // entropy bits = length * log2(poolSize)
    const entropy = length * Math.log2(Math.max(2, poolSize));
    updateStrength(entropy);
  }

  function updateStrength(entropy) {
    let pct, color, label;

    if (entropy < 28) {
      pct = 20; color = "#f87171"; label = T.strengthWeak;
    } else if (entropy < 40) {
      pct = 40; color = "#fb923c"; label = T.strengthFair;
    } else if (entropy < 60) {
      pct = 60; color = "#fbbf24"; label = T.strengthGood;
    } else if (entropy < 80) {
      pct = 80; color = "#34d399"; label = T.strengthStrong;
    } else {
      pct = 100; color = "#0f766e"; label = T.strengthVeryStrong;
    }

    strengthFill.style.width = pct + "%";
    strengthFill.style.background = color;
    strengthLabel.textContent = label;
  }

  async function copyPassword() {
    const txt = passwordText?.textContent || "";
    if (!txt || txt.includes("—")) return;
    try {
      await navigator.clipboard.writeText(txt);
      setToast(T.copied);
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(T.copyFailed);
    }
  }

  // ---------- events ----------
  lengthSlider?.addEventListener("input", () => {
    if (lengthValue) lengthValue.textContent = lengthSlider.value;
    generatePassword();
  });

  [optUppercase, optLowercase, optNumbers, optSymbols, optExcludeAmbiguous].forEach(x =>
    x?.addEventListener("change", generatePassword)
  );

  btnGenerate?.addEventListener("click", generatePassword);
  btnCopyPassword?.addEventListener("click", copyPassword);
  passwordText?.addEventListener("click", copyPassword);

  // ---------- init ----------
  generatePassword();
})();