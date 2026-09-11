(() => {
  const el = (id) => document.getElementById(id);

  const detectLang = () => {
    const htmlLang = String(document.documentElement.lang || "").toLowerCase();
    if (htmlLang.startsWith("en")) return "en";
    return "uk";
  };
  const LANG = detectLang();

  const T = LANG === "en" ? {
    result: "Result",
    sizeMismatchAddSub: "Matrices must be the same size for addition/subtraction.",
    sizeMismatchMul: "Number of columns in A must equal number of rows in B for multiplication.",
    notSquare: "Matrix A must be square for this operation.",
    determinant: "Determinant of A",
    tooLarge: "Determinant supported up to 4×4 matrices.",
  } : {
    result: "Результат",
    sizeMismatchAddSub: "Матриці мають бути однакового розміру для додавання/віднімання.",
    sizeMismatchMul: "Кількість стовпців A має дорівнювати кількості рядків B для множення.",
    notSquare: "Матриця A має бути квадратною для цієї операції.",
    determinant: "Визначник A",
    tooLarge: "Визначник підтримується лише для матриць до 4×4.",
  };

  // ---------- DOM ----------
  const sizeA = el("sizeA");
  const sizeB = el("sizeB");
  const matrixAEl = el("matrixA");
  const matrixBEl = el("matrixB");
  const opButtons = document.querySelectorAll("[data-op]");
  const toast = el("mToast");
  const resultWrap = el("matrixResultWrap");
  const resultLabel = el("resultLabel");
  const matrixResultEl = el("matrixResult");

  const setToast = (msg) => { if (toast) toast.textContent = msg || ""; };

  function parseSize(str) {
    const [r, c] = str.split("x").map(Number);
    return { rows: r, cols: c };
  }

  function buildGrid(container, rows, cols, prefix) {
    container.style.gridTemplateColumns = `repeat(${cols}, auto)`;
    container.innerHTML = "";
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const input = document.createElement("input");
        input.type = "text";
        input.inputMode = "decimal";
        input.id = `${prefix}_${i}_${j}`;
        input.value = "0";
        container.appendChild(input);
      }
    }
  }

  function readMatrix(container, rows, cols, prefix) {
    const m = [];
    for (let i = 0; i < rows; i++) {
      const row = [];
      for (let j = 0; j < cols; j++) {
        const input = el(`${prefix}_${i}_${j}`);
        const val = Number(String(input?.value ?? "0").replace(",", "."));
        row.push(Number.isFinite(val) ? val : 0);
      }
      m.push(row);
    }
    return m;
  }

  function renderResult(matrix, label) {
    resultLabel.textContent = label;
    const rows = matrix.length;
    const cols = matrix[0]?.length || 0;
    matrixResultEl.style.gridTemplateColumns = `repeat(${cols}, auto)`;
    matrixResultEl.innerHTML = "";
    matrix.forEach(row => {
      row.forEach(val => {
        const cell = document.createElement("div");
        cell.className = "matrix-cell";
        cell.textContent = Number.isInteger(val) ? val : Number(val.toFixed(3));
        matrixResultEl.appendChild(cell);
      });
    });
    resultWrap.style.display = "";
  }

  function renderScalarResult(value, label) {
    resultLabel.textContent = label;
    matrixResultEl.style.gridTemplateColumns = "auto";
    matrixResultEl.innerHTML = "";
    const cell = document.createElement("div");
    cell.className = "matrix-cell";
    cell.textContent = Number.isInteger(value) ? value : Number(value.toFixed(4));
    matrixResultEl.appendChild(cell);
    resultWrap.style.display = "";
  }

  function add(A, B) {
    return A.map((row, i) => row.map((v, j) => v + B[i][j]));
  }
  function sub(A, B) {
    return A.map((row, i) => row.map((v, j) => v - B[i][j]));
  }
  function multiply(A, B) {
    const rowsA = A.length, colsA = A[0].length, colsB = B[0].length;
    const result = Array.from({ length: rowsA }, () => Array(colsB).fill(0));
    for (let i = 0; i < rowsA; i++) {
      for (let j = 0; j < colsB; j++) {
        let sum = 0;
        for (let k = 0; k < colsA; k++) sum += A[i][k] * B[k][j];
        result[i][j] = sum;
      }
    }
    return result;
  }
  function transpose(A) {
    const rows = A.length, cols = A[0].length;
    const result = Array.from({ length: cols }, () => Array(rows).fill(0));
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) result[j][i] = A[i][j];
    return result;
  }
  function determinant(A) {
    const n = A.length;
    if (n === 1) return A[0][0];
    if (n === 2) return A[0][0] * A[1][1] - A[0][1] * A[1][0];
    // cofactor expansion for 3x3 and 4x4
    let det = 0;
    for (let col = 0; col < n; col++) {
      const minor = A.slice(1).map(row => row.filter((_, j) => j !== col));
      det += ((col % 2 === 0) ? 1 : -1) * A[0][col] * determinant(minor);
    }
    return det;
  }

  function currentDims() {
    const dA = parseSize(sizeA?.value || "2x2");
    const dB = parseSize(sizeB?.value || "2x2");
    return { dA, dB };
  }

  function rebuildGrids() {
    const { dA, dB } = currentDims();
    buildGrid(matrixAEl, dA.rows, dA.cols, "a");
    buildGrid(matrixBEl, dB.rows, dB.cols, "b");
    resultWrap.style.display = "none";
    setToast("");
  }

  function handleOp(op) {
    const { dA, dB } = currentDims();
    const A = readMatrix(matrixAEl, dA.rows, dA.cols, "a");
    const B = readMatrix(matrixBEl, dB.rows, dB.cols, "b");

    setToast("");

    if (op === "add" || op === "sub") {
      if (dA.rows !== dB.rows || dA.cols !== dB.cols) {
        setToast(T.sizeMismatchAddSub);
        resultWrap.style.display = "none";
        return;
      }
      const result = op === "add" ? add(A, B) : sub(A, B);
      renderResult(result, `A ${op === "add" ? "+" : "−"} B`);
    }

    if (op === "mul") {
      if (dA.cols !== dB.rows) {
        setToast(T.sizeMismatchMul);
        resultWrap.style.display = "none";
        return;
      }
      const result = multiply(A, B);
      renderResult(result, "A × B");
    }

    if (op === "transposeA") {
      const result = transpose(A);
      renderResult(result, "Aᵀ");
    }

    if (op === "detA") {
      if (dA.rows !== dA.cols) {
        setToast(T.notSquare);
        resultWrap.style.display = "none";
        return;
      }
      if (dA.rows > 4) {
        setToast(T.tooLarge);
        return;
      }
      const det = determinant(A);
      renderScalarResult(det, T.determinant);
    }
  }

  // ---------- events ----------
  sizeA?.addEventListener("change", rebuildGrids);
  sizeB?.addEventListener("change", rebuildGrids);

  opButtons.forEach(btn => {
    btn.addEventListener("click", () => handleOp(btn.getAttribute("data-op")));
  });

  // ---------- init ----------
  rebuildGrids();
})();