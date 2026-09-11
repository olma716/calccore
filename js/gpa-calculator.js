(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();
  const LOCALE = LANG === "en" ? "en-US" : "uk-UA";

  const T = LANG === "en" ? {
    enterInputs: 'Add courses and click "Calculate GPA".',
    noValidCourses: "Add at least one course with valid credits.",
    resetDone: "Reset done.",
    yourGpa: "Your GPA",
    totalCredits: "Total credits",
    coursesCount: "Number of courses",
    namePlaceholder: "e.g.: Math",
    creditsPlaceholder: "e.g.: 3",
  } : {
    enterInputs: 'Додай курси та натисни "Розрахувати GPA".',
    noValidCourses: "Додай хоча б один курс з коректними кредитами.",
    resetDone: "Скинуто.",
    yourGpa: "Твій GPA",
    totalCredits: "Всього кредитів",
    coursesCount: "Кількість курсів",
    namePlaceholder: "напр.: Математика",
    creditsPlaceholder: "напр.: 3",
  };

  const GRADE_POINTS = { A: 4.0, B: 3.0, C: 2.0, D: 1.0, F: 0.0 };
  const GRADE_LABELS = LANG === "en"
    ? { A: "A (4.0)", B: "B (3.0)", C: "C (2.0)", D: "D (1.0)", F: "F (0.0)" }
    : { A: "A (4.0)", B: "B (3.0)", C: "C (2.0)", D: "D (1.0)", F: "F (0.0)" };

  // ---------- DOM ----------
  const rowsContainer = el("gpaRows");
  const btnAddRow = el("btnAddRow");
  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  let rowCounter = 0;

  function addRow(name = "", grade = "A", credits = "") {
    rowCounter++;
    const rowId = `row_${rowCounter}`;
    const row = document.createElement("div");
    row.className = "gpa-row";
    row.dataset.rowId = rowId;

    row.innerHTML = `
      <input type="text" data-field="name" placeholder="${T.namePlaceholder}" value="${name}" />
      <select data-field="grade">
        ${Object.keys(GRADE_LABELS).map(g => `<option value="${g}" ${g === grade ? "selected" : ""}>${GRADE_LABELS[g]}</option>`).join("")}
      </select>
      <input type="text" inputmode="numeric" data-field="credits" placeholder="${T.creditsPlaceholder}" value="${credits}" />
      <button class="gpa-row-remove" type="button" aria-label="Remove">✕</button>
    `;

    row.querySelector(".gpa-row-remove").addEventListener("click", () => {
      row.remove();
    });

    rowsContainer.appendChild(row);
  }

  function calc() {
    const rows = Array.from(rowsContainer.querySelectorAll(".gpa-row"));
    let totalPoints = 0;
    let totalCredits = 0;
    let validCount = 0;

    rows.forEach(row => {
      const grade = row.querySelector('[data-field="grade"]')?.value;
      const creditsRaw = row.querySelector('[data-field="credits"]')?.value;
      const credits = Number(String(creditsRaw).replace(",", "."));

      if (Number.isFinite(credits) && credits > 0 && GRADE_POINTS[grade] !== undefined) {
        totalPoints += GRADE_POINTS[grade] * credits;
        totalCredits += credits;
        validCount++;
      }
    });

    if (validCount === 0 || totalCredits === 0) {
      setResult(T.noValidCourses, "");
      return;
    }

    const gpa = totalPoints / totalCredits;

    setResult(
      `${T.yourGpa}: ${gpa.toLocaleString(LOCALE, { maximumFractionDigits: 2 })}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.totalCredits}</div>
            <div class="m-kpi__v">${totalCredits}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.coursesCount}</div>
            <div class="m-kpi__v">${validCount}</div>
          </div>
        </div>
      `
    );
  }

  function reset() {
    rowsContainer.innerHTML = "";
    addRow();
    addRow();
    addRow();
    setToast(T.resetDone);
    setResult(T.enterInputs, "");
    setTimeout(() => setToast(""), 1200);
  }

  // ---------- events ----------
  btnAddRow?.addEventListener("click", () => addRow());
  btnCalc?.addEventListener("click", calc);
  btnReset?.addEventListener("click", reset);

  // ---------- init ----------
  addRow();
  addRow();
  addRow();
  setResult(T.enterInputs, "");
})();