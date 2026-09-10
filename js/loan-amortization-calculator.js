(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();
  const LOCALE = LANG === "en" ? "en-US" : "uk-UA";

  const parseNum = (val) => {
    if (val == null) return 0;
    const s = String(val).replace(/\s+/g, "").replace(/,/g, ".").replace(/[^\d.]/g, "");
    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
  };

  const fmt = (n) => Number.isFinite(n) ? n.toLocaleString(LOCALE, { maximumFractionDigits: 0 }) : "—";
  const safeText = (s) => String(s ?? "").replace(/[<>]/g, "");

  const T = LANG === "en" ? {
    enterInputs: "Enter inputs to calculate.",
    resetDone: "Reset done.",
    copied: "Result copied.",
    copyFailed: "Copy failed.",
    tableCopied: "Table copied.",
    tableCopyFailed: "Failed to copy table.",
    csvDownloaded: "CSV downloaded.",
    monthlyPayment: "Monthly payment",
    totalInterest: "Total interest paid",
    totalPaid: "Total amount paid",
  } : {
    enterInputs: "Введи дані для розрахунку.",
    resetDone: "Скинуто.",
    copied: "Скопійовано результат.",
    copyFailed: "Не вдалося скопіювати.",
    tableCopied: "Скопійовано таблицю.",
    tableCopyFailed: "Не вдалося скопіювати таблицю.",
    csvDownloaded: "CSV завантажено.",
    monthlyPayment: "Щомісячний платіж",
    totalInterest: "Всього сплачено відсотків",
    totalPaid: "Всього сплачено",
  };

  // ---------- DOM ----------
  const loanAmount = el("loanAmount");
  const rate = el("rate");
  const termMonths = el("termMonths");

  const btnCalc = el("btnCalc");
  const btnReset = el("btnReset");
  const btnCopy = el("btnCopy");

  const toast = el("mToast");
  const resultEl = el("mResult");
  const detailsEl = el("mDetails");

  const scheduleTable = el("scheduleTable");
  const scheduleTbody = scheduleTable?.querySelector("tbody");
  const btnCopySchedule = el("btnCopySchedule");
  const btnDownloadCSV = el("btnDownloadCSV");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };
  const setResult = (mainText, extraHtml = "") => {
    if (resultEl) resultEl.textContent = mainText || "";
    if (detailsEl) detailsEl.innerHTML = extraHtml || "";
  };

  function calc() {
    const P = parseNum(loanAmount?.value);
    const annualRate = parseNum(rate?.value);
    const n = Math.round(parseNum(termMonths?.value));

    if (!(P > 0) || !(n > 0)) {
      setResult(T.enterInputs, "");
      if (scheduleTbody) scheduleTbody.innerHTML = "";
      return;
    }

    const r = (annualRate / 100) / 12;
    let payment;
    if (r === 0) {
      payment = P / n;
    } else {
      payment = P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
    }

    let balance = P;
    let totalInterest = 0;
    const rows = [];

    for (let m = 1; m <= n; m++) {
      const interestPart = balance * r;
      let principalPart = payment - interestPart;
      if (m === n) principalPart = balance; // final adjustment to zero out
      balance = Math.max(0, balance - principalPart);
      totalInterest += interestPart;

      rows.push({
        month: m,
        payment: fmt(principalPart + interestPart),
        interest: fmt(interestPart),
        principal: fmt(principalPart),
        balance: fmt(balance),
      });
    }

    const totalPaid = P + totalInterest;

    setResult(
      `${T.monthlyPayment}: ${fmt(payment)}`,
      `
        <div class="m-kpis">
          <div class="m-kpi">
            <div class="m-kpi__k">${T.totalInterest}</div>
            <div class="m-kpi__v">${fmt(totalInterest)}</div>
          </div>
          <div class="m-kpi">
            <div class="m-kpi__k">${T.totalPaid}</div>
            <div class="m-kpi__v">${fmt(totalPaid)}</div>
          </div>
        </div>
      `
    );

    if (scheduleTbody) {
      scheduleTbody.innerHTML = rows.map(row => `
        <tr>
          <td>${row.month}</td>
          <td>${safeText(row.payment)}</td>
          <td>${safeText(row.interest)}</td>
          <td>${safeText(row.principal)}</td>
          <td>${safeText(row.balance)}</td>
        </tr>
      `).join("");
    }
  }

  function reset() {
    [loanAmount, rate, termMonths].forEach(x => { if (x) x.value = ""; });
    setToast(T.resetDone);
    setResult(T.enterInputs, "");
    if (scheduleTbody) scheduleTbody.innerHTML = "";
    setTimeout(() => setToast(""), 1200);
  }

  async function copyResult() {
    const txt = (resultEl?.textContent || "").trim();
    if (!txt) return;
    try {
      await navigator.clipboard.writeText(txt);
      setToast(T.copied);
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(T.copyFailed);
    }
  }

  async function copySchedule() {
    if (!scheduleTable) return;
    const trs = Array.from(scheduleTable.querySelectorAll("tr"));
    const lines = trs.map((tr) =>
      Array.from(tr.children).map((td) => td.innerText.replace(/\s+/g, " ").trim()).join("\t")
    );
    try {
      await navigator.clipboard.writeText(lines.join("\n").trim());
      setToast(T.tableCopied);
      setTimeout(() => setToast(""), 1500);
    } catch {
      setToast(T.tableCopyFailed);
    }
  }

  function downloadCSV() {
    if (!scheduleTable) return;
    const rowsCSV = Array.from(scheduleTable.querySelectorAll("tr")).map((tr) =>
      Array.from(tr.children).map((td) => `"${td.innerText.replace(/"/g, '""').trim()}"`).join(",")
    );
    const csv = rowsCSV.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "loan-amortization.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    setToast(T.csvDownloaded);
    setTimeout(() => setToast(""), 1500);
  }

  // ---------- events ----------
  btnCalc?.addEventListener("click", calc);
  btnReset?.addEventListener("click", reset);
  btnCopy?.addEventListener("click", copyResult);
  btnCopySchedule?.addEventListener("click", copySchedule);
  btnDownloadCSV?.addEventListener("click", downloadCSV);

  document.addEventListener("keydown", (e) => { if (e.key === "Enter") calc(); });

  // ---------- init ----------
  setResult(T.enterInputs, "");
})();