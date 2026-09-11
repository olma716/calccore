(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const T = LANG === "en" ? {
    enterNames: "Enter both names to calculate.",
    comments: [
      { max: 20, text: "Hmm, might be more of a friendship vibe. 😅" },
      { max: 40, text: "There's some spark, but it needs work! 🌱" },
      { max: 60, text: "Decent potential — worth exploring! 😊" },
      { max: 80, text: "Great match! Things could really click. 💫" },
      { max: 101, text: "Wow, practically written in the stars! 💕" },
    ],
  } : {
    enterNames: "Введи обидва імені для розрахунку.",
    comments: [
      { max: 20, text: "Хм, більше схоже на дружбу. 😅" },
      { max: 40, text: "Є трохи іскри, але треба попрацювати! 🌱" },
      { max: 60, text: "Непоганий потенціал — варто спробувати! 😊" },
      { max: 80, text: "Чудова пара! Все може вийти. 💫" },
      { max: 101, text: "Ого, написано на зірках! 💕" },
    ],
  };

  // ---------- DOM ----------
  const name1Input = el("name1");
  const name2Input = el("name2");
  const btnCalc = el("btnCalc");

  const resultEl = el("loveResult");
  const percentEl = el("lovePercent");
  const barFillEl = el("loveBarFill");
  const commentEl = el("loveComment");

  // Deterministic hash-based percentage from two names
  function computeCompatibility(name1, name2) {
    const combined = (name1 + name2).toLowerCase().replace(/[^a-zа-яіїєґ]/gi, "");
    if (!combined) return 0;

    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      hash = (hash * 31 + combined.charCodeAt(i)) % 1000000007;
    }

    // map hash to 0-100 range, biased slightly toward middle-high for fun factor
    const raw = hash % 101;
    return raw;
  }

  function getComment(pct) {
    for (const c of T.comments) {
      if (pct <= c.max) return c.text;
    }
    return T.comments[T.comments.length - 1].text;
  }

  function calc() {
    const name1 = (name1Input?.value || "").trim();
    const name2 = (name2Input?.value || "").trim();

    if (!name1 || !name2) {
      resultEl.style.display = "none";
      return;
    }

    const pct = computeCompatibility(name1, name2);

    percentEl.textContent = `${pct}%`;
    commentEl.textContent = getComment(pct);
    resultEl.style.display = "";

    // animate bar fill
    barFillEl.style.width = "0%";
    requestAnimationFrame(() => {
      setTimeout(() => { barFillEl.style.width = `${pct}%`; }, 50);
    });
  }

  // ---------- events ----------
  btnCalc?.addEventListener("click", calc);
  [name1Input, name2Input].forEach(x => {
    x?.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });
  });
})();