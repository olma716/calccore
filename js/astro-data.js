/* astro-data.js — сталі й довідник небесних тіл для астрономічних калькуляторів (UK/EN)
   Сталі: CODATA / IAU (номінальні значення). Масу, радіус і прискорення вільного падіння тіл узято з довідника NASA Planetary Fact Sheet (округлені).
   Усі значення подані рядками й переводяться в точні раціональні числа BigInt. */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis;
  const IS_EN = typeof document !== "undefined" && String(document.documentElement.lang || "").toLowerCase().startsWith("en");
  const L = (u, e) => (IS_EN ? e : u);
  const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a; };
  const q = (n, d = 1n) => { if (d < 0n) { n = -n; d = -d; } const g = gcd(n, d) || 1n; return { n: n / g, d: d / g }; };
  const dec = (s) => { const [mant, ex = "0"] = String(s).toLowerCase().split("e"), [ip, fp = ""] = mant.split("."), e = Number(ex) - fp.length, n = BigInt(ip + fp); return e >= 0 ? q(n * 10n ** BigInt(e)) : q(n, 10n ** BigInt(-e)); };

  // сталі (рядки)
  const C = {
    G: "6.6743e-11", c: "299792458", AU: "149597870700", LY: "9460730472580800", PC: "30856775814913673",
    GMsun: "1.32712440018e20", Msun: "1.98847e30", Rsun: "695700", Lsun: "3.828e26", Tsun: "5772", Mbol: "4.74",
    Mearth: "5.9722e24", Rearth: "6371", sigma: "5.670374419e-8", year: "31557600", g0: "9.80665", ARCSEC: "4.84813681109536e-6"
  };
  const K = {}; Object.keys(C).forEach((k) => { K[k] = dec(C[k]); });

  // небесні тіла: id, назви, маса (кг), середній радіус (км), прискорення вільного падіння на поверхні (м/с²)
  const B = [
    ["sun", "Сонце", "Sun", "1.98847e30", "695700", "274"],
    ["mercury", "Меркурій", "Mercury", "3.3011e23", "2439.7", "3.70"],
    ["venus", "Венера", "Venus", "4.8675e24", "6051.8", "8.87"],
    ["earth", "Земля", "Earth", "5.9722e24", "6371", "9.80665"],
    ["moon", "Місяць", "Moon", "7.346e22", "1737.4", "1.62"],
    ["mars", "Марс", "Mars", "6.4171e23", "3389.5", "3.73"],
    ["jupiter", "Юпітер", "Jupiter", "1.8982e27", "69911", "24.79"],
    ["saturn", "Сатурн", "Saturn", "5.6834e26", "58232", "10.44"],
    ["uranus", "Уран", "Uranus", "8.6810e25", "25362", "8.87"],
    ["neptune", "Нептун", "Neptune", "1.02413e26", "24622", "11.15"],
    ["pluto", "Плутон", "Pluto", "1.303e22", "1188.3", "0.62"]
  ].map(([id, uk, en, M, R, g]) => ({ id, uk, en, name: L(uk, en), M, R, g, Mq: dec(M), Rq: dec(R), gq: dec(g) }));

  // орбіти планет: велика піввісь (а.о.), ексцентриситет, період (роки)
  const O = [
    ["mercury", "Меркурій", "Mercury", "0.387", "0.2056", "0.2408"],
    ["venus", "Венера", "Venus", "0.723", "0.0068", "0.6152"],
    ["earth", "Земля", "Earth", "1", "0.0167", "1"],
    ["mars", "Марс", "Mars", "1.524", "0.0934", "1.8809"],
    ["jupiter", "Юпітер", "Jupiter", "5.203", "0.0489", "11.862"],
    ["saturn", "Сатурн", "Saturn", "9.537", "0.0565", "29.457"],
    ["uranus", "Уран", "Uranus", "19.19", "0.0457", "84.011"],
    ["neptune", "Нептун", "Neptune", "30.07", "0.0113", "164.79"],
    ["pluto", "Плутон", "Pluto", "39.48", "0.2488", "247.94"]
  ].map(([id, uk, en, a, e, T]) => ({ id, uk, en, name: L(uk, en), a, e, T }));

  root.Astro = { L, C, K, dec, q, BODIES: B, ORBITS: O, body: (id) => B.find((b) => b.id === id) };
})();
