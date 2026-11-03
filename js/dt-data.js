/* dt-data.js — DOTS (Тім Конерц, BVDK, 2019) і IPF GL Points (класичний пауерліфтинг): бали, потрібна сума, неофіційні рівні */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const KG_LB = 0.45359237;
  // коефіцієнти полінома DOTS: a·w⁴ + b·w³ + c·w² + d·w + e
  const COEF = {
    m: [-0.000001093, 0.0007391293, -0.1918759221, 24.0900756, -307.75076],
    f: [-0.0000010706, 0.0005158568, -0.1126655495, 13.6175032, -57.96288]
  };
  // діапазони ваги тіла, для яких формула вважається чинною, кг
  const VALID = { m: [40, 210], f: [40, 150] };
  // IPF GL Points, класичний (raw) пауерліфтинг, сума: 100 / (A − B·e^(−C·w)) · сума
  const GL = { m: [1199.72839, 1025.18162, 0.00921], f: [610.32796, 1045.59282, 0.03048] };
  // неофіційні орієнтири (джерела розходяться до ~50 балів): нижні межі рівнів
  const BANDS = [
    { id: "beginner", uk: "Початківець", en: "Beginner", lo: { m: 0, f: 0 } },
    { id: "intermediate", uk: "Середній рівень", en: "Intermediate", lo: { m: 200, f: 150 } },
    { id: "advanced", uk: "Просунутий", en: "Advanced", lo: { m: 300, f: 250 } },
    { id: "elite", uk: "Елітний", en: "Elite", lo: { m: 400, f: 350 } },
    { id: "world", uk: "Світовий клас", en: "World class", lo: { m: 500, f: 400 } }
  ];
  const denom = (bw, sex) => { const [a, b, c, d, e] = COEF[sex]; return a * bw ** 4 + b * bw ** 3 + c * bw ** 2 + d * bw + e; };
  const coef = (bw, sex) => 500 / denom(bw, sex);
  const dots = (total, bw, sex) => total * coef(bw, sex);
  const gl = (total, bw, sex) => { const [A, B, C] = GL[sex]; return (100 / (A - B * Math.exp(-C * bw))) * total; };
  const need = (target, bw, sex) => target / coef(bw, sex);
  const inRange = (bw, sex) => bw >= VALID[sex][0] && bw <= VALID[sex][1];
  function band(score, sex) { let i = 0; BANDS.forEach((b, k) => { if (score >= b.lo[sex]) i = k; }); const nx = BANDS[i + 1]; return { i, ...BANDS[i], lo0: BANDS[i].lo[sex], hi: nx ? nx.lo[sex] : null }; }
  root.Dt = { L, KG_LB, COEF, VALID, GL, BANDS, denom, coef, dots, gl, need, inRange, band };
})();
