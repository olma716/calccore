(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const T = LANG === "en" ? {
    enterNumber: "Enter a number.",
    enterRoman: "Enter Roman numerals.",
    outOfRange: "Number must be between 1 and 3999.",
    invalidRoman: "Invalid Roman numeral.",
  } : {
    enterNumber: "Введи число.",
    enterRoman: "Введи римські цифри.",
    outOfRange: "Число має бути від 1 до 3999.",
    invalidRoman: "Некоректні римські цифри.",
  };

  const ROMAN_MAP = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];

  const ROMAN_VALUES = { I: 1, V: 5, X: 10, L: 50, C: 100, D: 500, M: 1000 };

  function toRoman(num) {
    let result = "";
    let remaining = num;
    for (const [value, symbol] of ROMAN_MAP) {
      while (remaining >= value) {
        result += symbol;
        remaining -= value;
      }
    }
    return result;
  }

  function fromRoman(str) {
    const s = str.toUpperCase().trim();
    if (!/^[MDCLXVI]+$/.test(s)) return null;

    let total = 0;
    for (let i = 0; i < s.length; i++) {
      const current = ROMAN_VALUES[s[i]];
      const next = ROMAN_VALUES[s[i + 1]];
      if (next && current < next) {
        total -= current;
      } else {
        total += current;
      }
    }

    // validate by round-tripping
    if (total < 1 || total > 3999 || toRoman(total) !== s) return null;
    return total;
  }

  // ---------- DOM ----------
  const arabicInput = el("arabicInput");
  const romanResult = el("romanResult");

  const romanInput = el("romanInput");
  const arabicResult = el("arabicResult");

  function updateArabicToRoman() {
    const val = arabicInput?.value.trim();
    if (!val) {
      romanResult.textContent = T.enterNumber;
      return;
    }
    const num = Number(val);
    if (!Number.isInteger(num) || num < 1 || num > 3999) {
      romanResult.textContent = T.outOfRange;
      return;
    }
    romanResult.textContent = toRoman(num);
  }

  function updateRomanToArabic() {
    const val = romanInput?.value.trim();
    if (!val) {
      arabicResult.textContent = T.enterRoman;
      return;
    }
    const num = fromRoman(val);
    if (num === null) {
      arabicResult.textContent = T.invalidRoman;
      return;
    }
    arabicResult.textContent = String(num);
  }

  // ---------- events ----------
  arabicInput?.addEventListener("input", updateArabicToRoman);
  romanInput?.addEventListener("input", updateRomanToArabic);

  // ---------- init ----------
  updateArabicToRoman();
  updateRomanToArabic();
})();