/* un-data.js — конвертер одиниць: 12 категорій із точними визначеннями (SI/BIPM, NIST SP 811), температура зі зсувом, форматування значущих цифр; залежить від km-data.js (мова) */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis, K = root.Km, L = K.L, IS_EN = L(false, true), DEC = IS_EN ? "." : ",", SEP = IS_EN ? "," : " ";
  const SRC = {
    NIST: ["NIST Special Publication 811: Guide for the Use of the International System of Units", "https://www.nist.gov/pml/special-publication-811"],
    BIPM: ["BIPM: The International System of Units (SI Brochure)", "https://www.bipm.org/en/publications/si-brochure"],
    H44: ["NIST Handbook 44, Appendix C: General Tables of Units of Measurement", "https://www.nist.gov/pml/owm/nist-handbook-44-current-edition"]
  };
  const GRP = { si: L("Метричні й SI", "Metric and SI"), us: L("США", "US"), uk: L("Британські", "British"), ot: L("Інші", "Other") };
  const IN = 0.0254, FT = 0.3048, LB = 0.45359237, GAL_US = 3.785411784, TSP_US = 4.92892159375 / 1000;
  // категорії: [id, укр, англ, [[id, укр, англ, коефіцієнт до базової одиниці, група, наближено?]]]
  const RAW = [
    ["length", "Довжина", "Length", [
      ["nm", "Нанометр (нм)", "Nanometer (nm)", 1e-9, "si"], ["um", "Мікрометр (мкм)", "Micrometer (µm)", 1e-6, "si"], ["mm", "Міліметр (мм)", "Millimeter (mm)", 1e-3, "si"], ["cm", "Сантиметр (см)", "Centimeter (cm)", 1e-2, "si"], ["dm", "Дециметр (дм)", "Decimeter (dm)", 0.1, "si"], ["m", "Метр (м)", "Meter (m)", 1, "si"], ["km", "Кілометр (км)", "Kilometer (km)", 1000, "si"],
      ["in", "Дюйм (in)", "Inch (in)", IN, "us"], ["ft", "Фут (ft)", "Foot (ft)", FT, "us"], ["yd", "Ярд (yd)", "Yard (yd)", 0.9144, "us"], ["mi", "Миля (mi)", "Mile (mi)", 1609.344, "us"], ["nmi", "Морська миля (nmi)", "Nautical mile (nmi)", 1852, "ot"],
      ["au", "Астрономічна одиниця (а.о.)", "Astronomical unit (au)", 149597870700, "ot"], ["ly", "Світловий рік (св. рік)", "Light year (ly)", 9460730472580800, "ot"], ["pc", "Парсек (пк)", "Parsec (pc)", 648000 / Math.PI * 149597870700, "ot", true]
    ]],
    ["mass", "Маса й вага", "Mass and weight", [
      ["ug", "Мікрограм (мкг)", "Microgram (µg)", 1e-9, "si"], ["mg", "Міліграм (мг)", "Milligram (mg)", 1e-6, "si"], ["g", "Грам (г)", "Gram (g)", 1e-3, "si"], ["kg", "Кілограм (кг)", "Kilogram (kg)", 1, "si"], ["t", "Тонна (т)", "Metric ton (t)", 1000, "si"], ["ct", "Карат (кар)", "Carat (ct)", 2e-4, "ot"],
      ["gr", "Гран (gr)", "Grain (gr)", 0.00006479891, "us"], ["oz", "Унція (oz)", "Ounce (oz)", LB / 16, "us"], ["lb", "Фунт (lb)", "Pound (lb)", LB, "us"], ["st", "Стоун (st)", "Stone (st)", 14 * LB, "uk"], ["ston", "Коротка тонна (США)", "Short ton (US)", 2000 * LB, "us"], ["lton", "Довга тонна (Британія)", "Long ton (UK)", 2240 * LB, "uk"]
    ]],
    ["volume", "Об'єм", "Volume", [
      ["ml", "Мілілітр (мл)", "Milliliter (ml)", 1e-3, "si"], ["cl", "Сантилітр (сл)", "Centiliter (cl)", 1e-2, "si"], ["l", "Літр (л)", "Liter (L)", 1, "si"], ["m3", "Кубічний метр (м³)", "Cubic meter (m³)", 1000, "si"], ["tspm", "Чайна ложка 5 мл", "Teaspoon, 5 ml", 5e-3, "si"], ["tbspm", "Столова ложка 15 мл", "Tablespoon, 15 ml", 15e-3, "si"],
      ["cupm", "Склянка 250 мл (метрична)", "Cup, 250 ml (metric)", 0.25, "si"], ["cup200", "Склянка 200 мл", "Cup, 200 ml", 0.2, "si"],
      ["tspus", "Чайна ложка (США)", "Teaspoon (US)", TSP_US, "us"], ["tbspus", "Столова ложка (США)", "Tablespoon (US)", 3 * TSP_US, "us"], ["flozus", "Рідинна унція (США)", "Fluid ounce (US)", GAL_US / 128, "us"], ["cupus", "Склянка 240 мл (США)", "Cup, 240 ml (US legal)", 0.24, "us"], ["cupcust", "Склянка США звичайна (236,6 мл)", "Cup (US customary, 236.6 ml)", GAL_US / 16, "us"], ["ptus", "Пінта (США)", "Pint (US)", GAL_US / 8, "us"], ["qtus", "Кварта (США)", "Quart (US)", GAL_US / 4, "us"], ["galus", "Галон (США)", "Gallon (US)", GAL_US, "us"],
      ["flozuk", "Рідинна унція (Британія)", "Fluid ounce (UK)", 4.54609 / 160, "uk"], ["cupuk", "Склянка (Британія, 284,1 мл)", "Cup (UK, 284.1 ml)", 4.54609 / 16, "uk"], ["ptuk", "Пінта (Британія)", "Pint (UK)", 4.54609 / 8, "uk"], ["qtuk", "Кварта (Британія)", "Quart (UK)", 4.54609 / 4, "uk"], ["galuk", "Галон (Британія)", "Gallon (UK)", 4.54609, "uk"]
    ]],
    ["area", "Площа", "Area", [
      ["mm2", "Квадратний міліметр (мм²)", "Square millimeter (mm²)", 1e-6, "si"], ["cm2", "Квадратний сантиметр (см²)", "Square centimeter (cm²)", 1e-4, "si"], ["m2", "Квадратний метр (м²)", "Square meter (m²)", 1, "si"], ["ar", "Ар, сотка (100 м²)", "Are (100 m²)", 100, "si"], ["ha", "Гектар (га)", "Hectare (ha)", 1e4, "si"], ["km2", "Квадратний кілометр (км²)", "Square kilometer (km²)", 1e6, "si"],
      ["in2", "Квадратний дюйм (in²)", "Square inch (in²)", IN * IN, "us"], ["ft2", "Квадратний фут (ft²)", "Square foot (ft²)", FT * FT, "us"], ["yd2", "Квадратний ярд (yd²)", "Square yard (yd²)", 0.9144 * 0.9144, "us"], ["ac", "Акр (ac)", "Acre (ac)", 4046.8564224, "us"], ["mi2", "Квадратна миля (mi²)", "Square mile (mi²)", 1609.344 * 1609.344, "us"]
    ]],
    ["speed", "Швидкість", "Speed", [
      ["cms", "Сантиметр за секунду (см/с)", "Centimeter per second (cm/s)", 0.01, "si"], ["ms", "Метр за секунду (м/с)", "Meter per second (m/s)", 1, "si"], ["kmh", "Кілометр за годину (км/год)", "Kilometer per hour (km/h)", 1 / 3.6, "si"], ["fts", "Фут за секунду (ft/s)", "Foot per second (ft/s)", FT, "us"], ["mph", "Миля за годину (mph)", "Mile per hour (mph)", 0.44704, "us"], ["kn", "Вузол (kn)", "Knot (kn)", 1852 / 3600, "ot"], ["c", "Швидкість світла (c)", "Speed of light (c)", 299792458, "ot"]
    ]],
    ["temp", "Температура", "Temperature", [
      ["c", "Цельсій (°C)", "Celsius (°C)", 0, "si"], ["f", "Фаренгейт (°F)", "Fahrenheit (°F)", 0, "us"], ["k", "Кельвін (K)", "Kelvin (K)", 0, "si"], ["r", "Ранкін (°R)", "Rankine (°R)", 0, "us"]
    ]],
    ["time", "Час", "Time", [
      ["ns", "Наносекунда (нс)", "Nanosecond (ns)", 1e-9, "si"], ["us", "Мікросекунда (мкс)", "Microsecond (µs)", 1e-6, "si"], ["msec", "Мілісекунда (мс)", "Millisecond (ms)", 1e-3, "si"], ["s", "Секунда (с)", "Second (s)", 1, "si"], ["min", "Хвилина (хв)", "Minute (min)", 60, "ot"], ["h", "Година (год)", "Hour (h)", 3600, "ot"], ["d", "Доба (день)", "Day (d)", 86400, "ot"], ["wk", "Тиждень", "Week", 604800, "ot"],
      ["mo", "Місяць (середній, 30,4375 діб)", "Month (average, 30.4375 days)", 31557600 / 12, "ot", true], ["yr", "Рік (юліанський, 365,25 діб)", "Year (Julian, 365.25 days)", 31557600, "ot"]
    ]],
    ["pressure", "Тиск", "Pressure", [
      ["pa", "Паскаль (Па)", "Pascal (Pa)", 1, "si"], ["hpa", "Гектопаскаль (гПа)", "Hectopascal (hPa)", 100, "si"], ["kpa", "Кілопаскаль (кПа)", "Kilopascal (kPa)", 1000, "si"], ["mpa", "Мегапаскаль (МПа)", "Megapascal (MPa)", 1e6, "si"], ["bar", "Бар (bar)", "Bar (bar)", 1e5, "si"], ["mbar", "Мілібар (mbar)", "Millibar (mbar)", 100, "si"], ["atm", "Атмосфера (atm)", "Atmosphere (atm)", 101325, "ot"],
      ["at", "Технічна атмосфера (кгс/см²)", "Technical atmosphere (kgf/cm²)", 98066.5, "ot"], ["mmhg", "Міліметр ртутного стовпа (мм рт. ст.)", "Millimeter of mercury (mmHg)", 133.322387415, "ot"], ["torr", "Торр (Torr)", "Torr", 101325 / 760, "ot"], ["psi", "Фунт на квадратний дюйм (psi)", "Pound per square inch (psi)", 4.4482216152605 / (IN * IN), "us"]
    ]],
    ["energy", "Енергія", "Energy", [
      ["j", "Джоуль (Дж)", "Joule (J)", 1, "si"], ["kj", "Кілоджоуль (кДж)", "Kilojoule (kJ)", 1000, "si"], ["mj", "Мегаджоуль (МДж)", "Megajoule (MJ)", 1e6, "si"], ["wh", "Ват-година (Вт·год)", "Watt-hour (Wh)", 3600, "si"], ["kwh", "Кіловат-година (кВт·год)", "Kilowatt-hour (kWh)", 3.6e6, "si"],
      ["cal", "Калорія (cal, термохімічна)", "Calorie (cal, thermochemical)", 4.184, "ot"], ["kcal", "Кілокалорія (ккал)", "Kilocalorie (kcal)", 4184, "ot"], ["ev", "Електронвольт (еВ)", "Electronvolt (eV)", 1.602176634e-19, "ot"], ["btu", "Британська теплова одиниця (BTU)", "British thermal unit (BTU)", 1055.05585262, "us"], ["ftlbf", "Фут-фунт-сила (ft·lbf)", "Foot-pound force (ft·lbf)", 4.4482216152605 * FT, "us"]
    ]],
    ["power", "Потужність", "Power", [
      ["w", "Ват (Вт)", "Watt (W)", 1, "si"], ["kw", "Кіловат (кВт)", "Kilowatt (kW)", 1000, "si"], ["mw", "Мегават (МВт)", "Megawatt (MW)", 1e6, "si"], ["ps", "Кінська сила (метрична, к. с.)", "Metric horsepower (PS)", 735.49875, "ot"], ["hp", "Кінська сила (механічна, hp)", "Mechanical horsepower (hp)", 33000 * 4.4482216152605 * FT / 60, "us"], ["btuh", "BTU за годину", "BTU per hour", 1055.05585262 / 3600, "us"], ["kcalh", "Ккал за годину", "Kcal per hour", 4184 / 3600, "ot"]
    ]],
    ["angle", "Кут", "Angle", [
      ["deg", "Градус (°)", "Degree (°)", 1 / 360, "si"], ["rad", "Радіан (рад)", "Radian (rad)", 1 / (2 * Math.PI), "si"], ["mrad", "Мілірадіан (мрад)", "Milliradian (mrad)", 1 / (2000 * Math.PI), "si"], ["grad", "Град (гон)", "Gradian (gon)", 1 / 400, "ot"], ["amin", "Кутова хвилина (′)", "Arcminute (′)", 1 / 21600, "ot"], ["asec", "Кутова секунда (″)", "Arcsecond (″)", 1 / 1296000, "ot"], ["turn", "Оберт", "Turn", 1, "ot"]
    ]],
    ["data", "Цифрові дані", "Digital data", [
      ["bit", "Біт (bit)", "Bit", 1 / 8, "ot"], ["b", "Байт (B)", "Byte (B)", 1, "ot"], ["kb", "Кілобайт (КБ, 1000 Б)", "Kilobyte (kB, 1000 B)", 1e3, "si"], ["mb", "Мегабайт (МБ)", "Megabyte (MB)", 1e6, "si"], ["gb", "Гігабайт (ГБ)", "Gigabyte (GB)", 1e9, "si"], ["tb", "Терабайт (ТБ)", "Terabyte (TB)", 1e12, "si"], ["pb", "Петабайт (ПБ)", "Petabyte (PB)", 1e15, "si"],
      ["kib", "Кібібайт (КіБ, 1024 Б)", "Kibibyte (KiB, 1024 B)", 1024, "ot"], ["mib", "Мебібайт (МіБ)", "Mebibyte (MiB)", 1048576, "ot"], ["gib", "Гібібайт (ГіБ)", "Gibibyte (GiB)", 1073741824, "ot"], ["tib", "Тебібайт (ТіБ)", "Tebibyte (TiB)", 2 ** 40, "ot"], ["pib", "Пебібайт (ПіБ)", "Pebibyte (PiB)", 2 ** 50, "ot"],
      ["kbit", "Кілобіт (кбіт)", "Kilobit (kbit)", 125, "si"], ["mbit", "Мегабіт (Мбіт)", "Megabit (Mbit)", 125000, "si"], ["gbit", "Гігабіт (Гбіт)", "Gigabit (Gbit)", 125000000, "si"]
    ]]
  ];
  const CATS = RAW.map(([id, uk, en, units]) => ({ id, label: L(uk, en), units: units.map(([uid, ul, ue, f, g, ap]) => ({ id: uid, label: L(ul, ue), f, g, ap: !!ap })) }));
  const cat = (id) => CATS.find((c) => c.id === id) || null;
  const unit = (cid, uid) => { const c = cat(cid); return c ? c.units.find((u) => u.id === uid) || null : null; };
  // температура: через кельвін
  const TK = { c: [(x) => x + 273.15, (k) => k - 273.15], f: [(x) => (x + 459.67) * 5 / 9, (k) => k * 9 / 5 - 459.67], k: [(x) => x, (k) => k], r: [(x) => x * 5 / 9, (k) => k * 9 / 5] };
  function convert(cid, x, from, to) {
    if (cid === "temp") return TK[to][1](TK[from][0](x));
    return (x * unit(cid, from).f) / unit(cid, to).f;
  }
  // ---------- форматування ----------
  const SUP = { "-": "⁻", 0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹" };
  const sup = (n) => String(n).split("").map((c) => SUP[c]).join("");
  const grp = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, SEP);
  function fmt(x, sig) {
    if (!Number.isFinite(x)) return "—";
    if (x === 0 || Object.is(x, -0)) return "0";
    const s = x < 0 ? "−" : "", a = Math.abs(x);
    if (a >= 1e15 || a < 1e-6) { const [m, e] = a.toExponential(Math.max(0, sig - 1)).split("e"), mt = m.replace(/\.?0+$/, "").replace(".", DEC); return s + mt + " × 10" + sup(Number(e)); }
    const r = Number(a.toPrecision(sig)), parts = String(r).split(".");
    return s + grp(parts[0]) + (parts[1] ? DEC + parts[1] : "");
  }
  const isApprox = (x, sig) => Number.isFinite(x) && x !== 0 && Math.abs(Number(x.toPrecision(sig)) - x) > Math.abs(x) * 1e-12;
  // число з поля: знак, пробіли, кома чи крапка, запис 1e-3
  function parse(str) {
    const s = String(str || "").trim().replace(/[\s ]/g, "").replace(/−/g, "-").replace(",", ".");
    if (!/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)) return null;
    const v = Number(s); return Number.isFinite(v) && Math.abs(v) <= 1e300 ? v : null;
  }
  root.Un = { SRC, GRP, CATS, cat, unit, convert, fmt, isApprox, parse, TK };
})();
