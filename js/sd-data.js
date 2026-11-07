/* sd-data.js — заміна інгредієнтів: база замін із названими джерелами (USU Extension, NC State Extension, King Arthur, UW Extension, Baking Sense, America's Test Kitchen), перерахунок на вашу кількість; залежить від km-data.js */
(() => {
  const root = typeof window !== "undefined" ? window : globalThis, K = root.Km, L = K.L, IS_EN = L(false, true), DEC = IS_EN ? "." : ",";
  // джерела: код → [назва, адреса]
  const SRC = {
    USU: ["Utah State University Extension: List of Ingredient Substitutions for Cooking and Baking", "https://extension.usu.edu/archive/list-of-ingredient-substitutions-for-cooking-and-baking"],
    NCSU: ["NC State Extension (Randolph County): Baking Substitutions That Work, 2025", "https://randolph.ces.ncsu.edu/2025/05/baking-substitutions-that-work/"],
    KAF: ["King Arthur Baking: How to substitute for buttermilk, 2019", "https://www.kingarthurbaking.com/blog/2019/01/28/how-to-substitute-for-buttermilk/"],
    UWX: ["University of Wisconsin–Madison Extension: Egg Substitutes for Baking", "https://dane.extension.wisc.edu/files/2025/03/Egg-Substitutes-for-Baking-Eggs.pdf"],
    BS: ["Baking Sense: Baking Ingredient Substitutions", "https://www.baking-sense.com/baking-ingredient-substitutions/"],
    ATK: ["America's Test Kitchen: Removing the dairy from gluten-free recipes", "https://www.americastestkitchen.com/guides/gluten-free/removing-the-dairy-from-gluten-free-recipes"],
    CSU: ["Colorado State University Extension: Ingredient Substitutions", "https://extension.colostate.edu/resource/ingredient-substitutions"]
  };
  const UM = { tsp: 5, tbsp: 15, cup: 240 }; // мл в одиниці джерел (склянка США 240 мл)
  const OZ = 28.349523125;
  // P(кількість, одиниця, [укр, англ], опції): одиниці tsp, tbsp, cup, oz, pc; fill — «до» загального об'єму (to, склянок); q2 — діапазон; f — форми для pc
  const P = (q, u, w, o) => Object.assign({ q, u, w }, o || {});
  const S = (n, parts, note, src, t, o) => Object.assign({ n, parts, note, src, t: t || "" }, o || {});
  const YOLK = { uk: ["жовток", "жовтки", "жовтків", "жовтка"], en: ["yolk", "yolks"] };
  const CATS = [["egg", "Яйця", "Eggs"], ["dairy", "Молочне", "Dairy"], ["fat", "Жири", "Fats"], ["sweet", "Цукор і солодке", "Sugar and sweeteners"], ["flour", "Борошно й загусники", "Flour and thickeners"], ["leaven", "Розпушувачі", "Leaveners"], ["other", "Шоколад, спеції, інше", "Chocolate, spices, other"]].map(([id, uk, en]) => ({ id, label: L(uk, en) }));
  // база: [id, категорія, [укр, англ], основа ["pc", 1] / ["vol", кількість, одиниця] / ["wt", кількість, "oz"], заміни]
  const RAW = [
    ["egg", "egg", ["Яйце (1 велике)", "Egg (1 large)"], ["pc", 1, "pc"], [
      S(["Мелений льон або насіння чіа", "Ground flax or chia seeds"], [P(1, "tbsp", ["меленого льону або чіа", "ground flax or chia seeds"]), P(3, "tbsp", ["води", "water"])], ["Дайте постояти 5–10 хв, щоб загусло. Найкраще для хліба, печива й млинців: зв'язує, але не розпушує.", "Let it sit 5–10 min to gel. Best for breads, cookies and pancakes: it binds but does not leaven."], ["UWX", "NCSU"], "v"),
      S(["Розім'ятий банан", "Mashed banana"], [P(1 / 4, "cup", ["розім'ятого стиглого банана", "mashed ripe banana"])], ["Додає вологість і смак банана. Для вологих кексів, мафінів, млинців.", "Adds moisture and banana flavor. For moist cakes, muffins, pancakes."], ["UWX", "NCSU"], "v"),
      S(["Яблучне пюре без цукру", "Unsweetened applesauce"], [P(1 / 4, "cup", ["яблучного пюре без цукру", "unsweetened applesauce"])], ["Тримає вологість; для кексів, мафінів, швидких хлібів. Структури майже не дає, підйом трохи менший.", "Keeps things moist; for cakes, muffins, quick breads. Adds little structure and the rise is slightly lower."], ["UWX", "NCSU"], "v"),
      S(["Йогурт", "Yogurt"], [P(1 / 4, "cup", ["йогурту", "yogurt"])], ["Для мафінів і тортів. Йогурт може бути й рослинним (тоді підходить і без молочного).", "For muffins and cakes. The yogurt can be non-dairy too (then it also suits a dairy-free diet)."], ["UWX"], "e"),
      S(["Горіхова паста", "Nut butter"], [P(3, "tbsp", ["горіхової пасти (арахісової, мигдальної…)", "nut butter (peanut, almond…)"])], ["Для брауні, печива, щільної випічки. Не підходить при алергії на горіхи.", "For brownies, cookies, dense baked goods. Not for nut allergies."], ["UWX"], "v"),
      S(["Аквафаба (вода з нуту)", "Aquafaba (chickpea water)"], [P(3, "tbsp", ["збитої аквафаби", "whipped aquafaba"])], ["Для безе, брауні, печива: дає повітряну текстуру.", "For meringues, brownies, cookies: gives an airy texture."], ["UWX"], "v"),
      S(["Розпушувач + вода + олія (варіант 1)", "Baking powder + water + oil (option 1)"], [P(2, "tsp", ["розпушувача", "baking powder"]), P(2, "tbsp", ["води", "water"]), P(1, "tbsp", ["олії", "oil"])], ["Для легких і пухких тортів.", "For light and fluffy cakes."], ["UWX"], "v"),
      S(["Розпушувач + вода + олія (варіант 2)", "Baking powder + water + oil (option 2)"], [P(1.5, "tbsp", ["води", "water"]), P(1.5, "tbsp", ["олії", "oil"]), P(1, "tsp", ["розпушувача", "baking powder"])], ["Дає підйом там, де яйце потрібне для розпушування.", "Gives rise where the egg is needed for leavening."], ["NCSU"], "v"),
      S(["Газована вода", "Carbonated water"], [P(1 / 4, "cup", ["газованої води", "carbonated water"])], ["Для випічки з легкою текстурою.", "For baked goods with a light texture."], ["UWX"], "v")
    ]],
    ["milk", "dairy", ["Молоко (коров'яче), 1 склянка", "Milk (cow's), 1 cup"], ["vol", 1, "cup"], [
      S(["Рослинне молоко (мигдальне, соєве, вівсяне, кокосове, рисове)", "Plant milk (almond, soy, oat, coconut, rice)"], [P(1, "cup", ["рослинного молока", "plant milk"])], ["Джерело називає рослинне молоко заміною коров'ячого, пропорція 1:1 є орієнтиром. Для збивання не підходить.", "The source names plant milk as a substitute for cow's milk; the 1:1 ratio is a rule of thumb. Not for whipping."], ["BS"], "v", { inf: true })
    ]],
    ["buttermilk", "dairy", ["Пахта або кисле молоко, 1 склянка", "Buttermilk or sour milk, 1 cup"], ["vol", 1, "cup"], [
      S(["Молоко + оцет або лимонний сік", "Milk + vinegar or lemon juice"], [P(1, "tbsp", ["оцту або лимонного соку", "vinegar or lemon juice"]), P(0, "cup", ["молока", "milk"], { fill: true, to: 1 })], ["Дайте постояти 5–15 хв, поки трохи загусне. Добре для кексів; у коржиках і бісквітах смак може бути менш глибоким.", "Let it sit 5–15 min until slightly thickened. Works well in cakes; biscuits may taste less rich."], ["USU", "NCSU", "KAF"]),
      S(["Винний камінь + молоко", "Cream of tartar + milk"], [P(1.75, "tsp", ["винного каменю", "cream of tartar"]), P(1, "cup", ["молока", "milk"])], ["Збовтайте, щоб винний камінь розчинився.", "Shake until the cream of tartar dissolves."], ["USU", "KAF"]),
      S(["Натуральний йогурт", "Plain yogurt"], [P(1, "cup", ["натурального йогурту", "plain yogurt"])], ["Заміна без розбавлення.", "A direct swap without thinning."], ["USU", "CSU"]),
      S(["Йогурт чи сметана + молоко", "Yogurt or sour cream + milk"], [P(3 / 4, "cup", ["йогурту чи сметани", "yogurt or sour cream"]), P(1 / 4, "cup", ["молока або води", "milk or water"])], ["Дещо густіше; для млинців і мафінів.", "Slightly thicker; for pancakes and muffins."], ["BS"]),
      S(["Грецький йогурт + молоко", "Greek yogurt + milk"], [P(1 / 3, "cup", ["грецького йогурту", "Greek yogurt"]), P(2 / 3, "cup", ["молока 1% чи знежиреного", "1% or skim milk"])], ["Найкращий варіант у тесті King Arthur для простих рецептів (1 частина йогурту на 2 частини молока).", "The best option in King Arthur's test for simple recipes (1 part yogurt to 2 parts milk)."], ["KAF"]),
      S(["Соєве чи мигдальне молоко + оцет або лимонний сік", "Soy or almond milk + vinegar or lemon juice"], [P(1, "cup", ["несолодкого соєвого чи мигдального молока", "unsweetened soy or almond milk"]), P(1, "tbsp", ["білого оцту або лимонного соку", "white vinegar or lemon juice"])], ["Варіант без молочного.", "A dairy-free option."], ["ATK"], "v")
    ]],
    ["sour_cream", "dairy", ["Сметана, 1 склянка", "Sour cream, 1 cup"], ["vol", 1, "cup"], [
      S(["Натуральний йогурт", "Plain yogurt"], [P(1, "cup", ["натурального йогурту", "plain yogurt"])], ["Грецький йогурт найближчий за густиною й кислинкою; смак трохи інший.", "Greek yogurt is the closest in thickness and tang; the flavor is slightly different."], ["USU", "NCSU", "BS", "CSU"]),
      S(["Молоко + лимонний сік + масло", "Milk + lemon juice + butter"], [P(7 / 8, "cup", ["молока", "milk"]), P(1, "tbsp", ["лимонного соку", "lemon juice"]), P(2, "tbsp", ["вершкового масла або маргарину", "butter or margarine"])], ["Для випічки.", "For baking."], ["CSU"])
    ]],
    ["heavy_cream", "dairy", ["Вершки жирні (36–40%), 1 склянка", "Heavy cream (36–40%), 1 cup"], ["vol", 1, "cup"], [
      S(["Молоко + розтоплене вершкове масло", "Milk + melted butter"], [P(3 / 4, "cup", ["молока", "milk"]), P(1 / 3, "cup", ["розтопленого вершкового масла", "melted butter"])], ["Дає жирність, але не збивається: лише для випічки й готування.", "Gives the fat but will not whip: for baking and cooking only."], ["USU", "NCSU"])
    ]],
    ["half", "dairy", ["Вершки 12–16% («half and half»), 1 склянка", "Half-and-half (12–16%), 1 cup"], ["vol", 1, "cup"], [
      S(["Молоко + масло або маргарин (3 ст. л.)", "Milk + butter or margarine (3 tbsp)"], [P(7 / 8, "cup", ["молока", "milk"]), P(3, "tbsp", ["вершкового масла або маргарину", "butter or margarine"])], ["Джерела розходяться в кількості масла: 3 ст. л. чи 1 1/2 ст. л., тому показано обидва варіанти.", "The sources disagree on the amount of butter: 3 tbsp or 1 1/2 tbsp, so both options are shown."], ["USU"]),
      S(["Молоко + масло (1 1/2 ст. л.)", "Milk + butter (1 1/2 tbsp)"], [P(7 / 8, "cup", ["молока", "milk"]), P(1.5, "tbsp", ["вершкового масла", "butter"])], ["Менше масла, ніж в іншому джерелі.", "Less butter than in the other source."], ["CSU"]),
      S(["Незбиране згущене молоко без цукру", "Evaporated milk, undiluted"], [P(1, "cup", ["незбираного згущеного молока без розбавлення", "undiluted evaporated milk"])], ["", ""], ["USU", "CSU"])
    ]],
    ["butter", "fat", ["Вершкове масло, 1 склянка", "Butter, 1 cup"], ["vol", 1, "cup"], [
      S(["Маргарин", "Margarine"], [P(1, "cup", ["маргарину", "margarine"])], ["Заміна 1:1, схожа текстура. Якщо потрібно без молочного, перевірте склад: деякі маргарини містять молоко.", "A 1:1 swap with a similar texture. For a dairy-free diet check the label: some margarines contain milk."], ["USU", "NCSU"]),
      S(["Олія (варіант 3/4)", "Oil (3/4 option)"], [P(3 / 4, "cup", ["рослинної олії", "vegetable oil"])], ["Вологіше, але текстура менш пухка; не для рецептів, де масло дає структуру.", "Moister, but the texture is less light; not for recipes where butter gives structure."], ["NCSU"], "v"),
      S(["Олія (варіант 7/8)", "Oil (7/8 option)"], [P(7 / 8, "cup", ["рослинної олії", "vegetable oil"])], ["Інше джерело радить трохи більше олії; Colorado State додає 1/2 ч. л. солі.", "Another source advises slightly more oil; Colorado State adds 1/2 tsp of salt."], ["USU", "CSU"], "v"),
      S(["Рослинний кулінарний жир", "Vegetable shortening"], [P(1, "cup", ["рослинного кулінарного жиру", "vegetable shortening"])], ["Веганський варіант, заміна 1:1.", "A vegan option, a 1:1 swap."], ["BS"], "v"),
      S(["Смалець + сіль", "Lard + salt"], [P(7 / 8, "cup", ["смальцю", "lard"]), P(1 / 2, "tsp", ["солі", "salt"])], ["Без молочного й яєць, але це тваринний жир.", "Dairy- and egg-free, but an animal fat."], ["USU", "CSU"], "de"),
      S(["Пюре + масло (до половини)", "Fruit puree + butter (up to half)"], [P(1 / 2, "cup", ["яблучного чи сливового пюре (макс.)", "applesauce or prune puree (max.)"]), P(1 / 2, "cup", ["вершкового масла", "butter"])], ["До половини масла в швидких хлібах і кексах: менше жиру.", "Up to half the butter in quick breads and cakes: less fat."], ["BS"])
    ]],
    ["shortening", "fat", ["Кулінарний жир (твердий), 1 склянка", "Shortening (solid), 1 cup"], ["vol", 1, "cup"], [
      S(["Смалець", "Lard"], [P(7 / 8, "cup", ["смальцю", "lard"])], ["", ""], ["USU", "CSU"], "de"),
      S(["Вершкове масло або маргарин", "Butter or margarine"], [P(9 / 8, "cup", ["вершкового масла або маргарину", "butter or margarine"])], ["Зменште сіль у рецепті вдвічі.", "Reduce the salt in the recipe by half."], ["USU"]),
      S(["Вершкове масло або маргарин (1:1)", "Butter or margarine (1:1)"], [P(1, "cup", ["вершкового масла або маргарину", "butter or margarine"])], ["Інше джерело радить заміну 1:1.", "Another source advises a 1:1 swap."], ["CSU"])
    ]],
    ["sugar", "sweet", ["Цукор-пісок, 1 склянка", "Granulated sugar, 1 cup"], ["vol", 1, "cup"], [
      S(["Мед", "Honey"], [P(3 / 4, "cup", ["меду", "honey"])], ["Зменште іншу рідину в рецепті на 1/4 склянки; у випічці додайте 1/2 ч. л. соди на склянку меду.", "Reduce the other liquid by 1/4 cup; in baking add 1/2 tsp soda per cup of honey."], ["USU"], "de"),
      S(["Мед (13/16 склянки)", "Honey (13/16 cup)"], [P(13 / 16, "cup", ["меду (1 склянка без 3 ст. л.)", "honey (1 cup minus 3 tbsp)"])], ["Інше джерело радить трохи більше меду.", "Another source advises slightly more honey."], ["CSU"], "de"),
      S(["Кукурудзяний сироп", "Corn syrup"], [P(1, "cup", ["кукурудзяного сиропу", "corn syrup"])], ["Зменште іншу рідину в рецепті на 1/4 склянки.", "Reduce the other liquid in the recipe by 1/4 cup."], ["USU", "CSU"], "v"),
      S(["Меляса", "Molasses"], [P(1, "cup", ["меляси", "molasses"])], ["Colorado State радить додати 1/2 ч. л. соди.", "Colorado State advises adding 1/2 tsp of baking soda."], ["USU", "CSU"], "v"),
      S(["Коричневий цукор", "Brown sugar"], [P(1, "cup", ["щільно утрамбованого коричневого цукру", "firmly packed brown sugar"])], ["Додає присмак патоки й вологість.", "Adds a molasses flavor and moisture."], ["USU", "CSU"], "v")
    ]],
    ["brown_sugar", "sweet", ["Коричневий цукор (утрамбований), 1 склянка", "Brown sugar (packed), 1 cup"], ["vol", 1, "cup"], [
      S(["Цукор-пісок + меляса (1/4 склянки)", "Granulated sugar + molasses (1/4 cup)"], [P(1, "cup", ["цукру-піску", "granulated sugar"]), P(1 / 4, "cup", ["меляси", "molasses"])], ["Повертає глибокий смак і вологість.", "Restores a deep flavor and moisture."], ["NCSU"], "v"),
      S(["Білий цукор + меляса (1,5–2 ст. л.)", "White sugar + molasses (1.5–2 tbsp)"], [P(1, "cup", ["білого цукру", "white sugar"]), P(1.5, "tbsp", ["меляси", "molasses"], { q2: 2 })], ["Менше меляси для світлого коричневого цукру, більше для темного.", "Less molasses for light brown sugar, more for dark brown."], ["BS"], "v"),
      S(["Цукор-пісок", "Granulated sugar"], [P(1, "cup", ["цукру-піску", "granulated sugar"])], ["Без присмаку патоки.", "Without the molasses flavor."], ["USU", "CSU"], "v")
    ]],
    ["honey", "sweet", ["Мед, 1 склянка", "Honey, 1 cup"], ["vol", 1, "cup"], [
      S(["Цукор + вода", "Sugar + water"], [P(5 / 4, "cup", ["цукру", "sugar"]), P(1 / 4, "cup", ["води", "water"])], ["", ""], ["USU", "CSU"], "v")
    ]],
    ["corn_syrup", "sweet", ["Кукурудзяний сироп, 1 склянка", "Corn syrup, 1 cup"], ["vol", 1, "cup"], [
      S(["Цукор + вода", "Sugar + water"], [P(1, "cup", ["цукру", "sugar"]), P(1 / 4, "cup", ["води", "water"])], ["", ""], ["USU", "CSU"], "v")
    ]],
    ["molasses", "sweet", ["Меляса, 1 склянка", "Molasses, 1 cup"], ["vol", 1, "cup"], [
      S(["Цукор + винний камінь + більше рідини", "Sugar + cream of tartar + more liquid"], [P(3 / 4, "cup", ["цукру", "sugar"]), P(1.25, "tsp", ["винного каменю", "cream of tartar"]), P(5, "tbsp", ["додаткової рідини в рецепті", "extra liquid in the recipe"])], ["Відтворює солодкість і кислотність, допомагає підрум'янюванню й розпушенню.", "Matches the sweetness and acidity and helps browning and leavening."], ["NCSU"], "v")
    ]],
    ["cake_flour", "flour", ["Борошно для тортів (cake flour), 1 склянка", "Cake flour, 1 cup"], ["vol", 1, "cup"], [
      S(["Просіяне пшеничне борошно без 2 ст. л.", "Sifted all-purpose flour minus 2 tbsp"], [P(7 / 8, "cup", ["просіяного пшеничного борошна (1 склянка без 2 ст. л.)", "sifted all-purpose flour (1 cup minus 2 tbsp)"])], ["Випічка виходить легшою й ніжнішою: у борошні для тортів менше білка.", "Gives a lighter, more tender result: cake flour has less protein."], ["NCSU"])
    ]],
    ["ap_flour", "flour", ["Пшеничне борошно (просіяне), 1 склянка", "All-purpose flour (sifted), 1 cup"], ["vol", 1, "cup"], [
      S(["Борошно для тортів", "Cake flour"], [P(9 / 8, "cup", ["борошна для тортів (1 склянка і 2 ст. л.)", "cake flour (1 cup + 2 tbsp)"])], ["", ""], ["USU", "CSU"])
    ]],
    ["cornstarch", "flour", ["Кукурудзяний крохмаль (для загущення), 1 ст. л.", "Cornstarch (for thickening), 1 tbsp"], ["vol", 1, "tbsp"], [
      S(["Пшеничне борошно", "All-purpose flour"], [P(2, "tbsp", ["пшеничного борошна", "all-purpose flour"])], ["Борошно загущує слабше, тому його більше.", "Flour thickens less efficiently, so more is needed."], ["USU", "NCSU"]),
      S(["Тапіоковий крохмаль", "Tapioca starch"], [P(1, "tbsp", ["тапіокового крохмалю", "tapioca starch"])], ["Заміна 1:1, підходить без глютену.", "A 1:1 swap, a gluten-free option."], ["NCSU"], "v"),
      S(["Гранульована тапіока", "Granular tapioca"], [P(2, "tbsp", ["гранульованої тапіоки", "granular tapioca"])], ["", ""], ["USU", "CSU"], "v")
    ]],
    ["flour_thick", "flour", ["Пшеничне борошно (для загущення), 1 ст. л.", "Flour (for thickening), 1 tbsp"], ["vol", 1, "tbsp"], [
      S(["Крохмаль (кукурудзяний, картопляний, рисовий, арорут)", "Starch (corn, potato, rice, arrowroot)"], [P(1 / 2, "tbsp", ["крохмалю", "starch"])], ["", ""], ["USU", "CSU"], "v"),
      S(["Тапіока швидкого приготування", "Quick-cooking tapioca"], [P(1, "tbsp", ["тапіоки швидкого приготування", "quick-cooking tapioca"])], ["", ""], ["USU", "CSU"], "v")
    ]],
    ["baking_powder", "leaven", ["Розпушувач, 1 ч. л.", "Baking powder, 1 tsp"], ["vol", 1, "tsp"], [
      S(["Сода + винний камінь (1/2 ч. л.)", "Baking soda + cream of tartar (1/2 tsp)"], [P(1 / 4, "tsp", ["харчової соди", "baking soda"]), P(1 / 2, "tsp", ["винного каменю", "cream of tartar"])], ["Відтворює реакцію кислоти й соди, що розпушує тісто.", "Recreates the acid-base reaction that leavens."], ["BS"], "v"),
      S(["Сода + винний камінь (5/8 ч. л.)", "Baking soda + cream of tartar (5/8 tsp)"], [P(1 / 4, "tsp", ["харчової соди", "baking soda"]), P(5 / 8, "tsp", ["винного каменю", "cream of tartar"])], ["Інше джерело радить трохи більше винного каменю.", "Other sources advise slightly more cream of tartar."], ["USU", "NCSU"], "v"),
      S(["Сода + кисле молоко чи пахта", "Baking soda + soured milk or buttermilk"], [P(1 / 4, "tsp", ["харчової соди", "baking soda"]), P(1 / 2, "cup", ["кислого молока чи пахти", "soured milk or buttermilk"])], ["", ""], ["USU", "CSU"]),
      S(["Сода + оцет або лимонний сік + молоко", "Baking soda + vinegar or lemon juice + milk"], [P(1 / 4, "tsp", ["харчової соди", "baking soda"]), P(1 / 2, "tbsp", ["оцту або лимонного соку", "vinegar or lemon juice"]), P(0, "cup", ["молока", "milk"], { fill: true, to: 1 / 2 })], ["", ""], ["USU", "CSU"]),
      S(["Сода + меляса", "Baking soda + molasses"], [P(1 / 4, "tsp", ["харчової соди", "baking soda"]), P(1 / 4, "cup", ["меляси", "molasses"])], ["", ""], ["USU", "CSU"], "v")
    ]],
    ["unsweet_choc", "other", ["Шоколад несолодкий, 1 унція (28 г)", "Unsweetened chocolate, 1 oz (28 g)"], ["wt", 1, "oz"], [
      S(["Какао + жир", "Cocoa + fat"], [P(3, "tbsp", ["какао-порошку", "cocoa powder"]), P(1, "tbsp", ["вершкового масла або кулінарного жиру", "butter or shortening"])], ["", ""], ["USU", "BS"])
    ]],
    ["semisweet", "other", ["Шоколад напівсолодкий, 1 унція (28 г)", "Semisweet chocolate, 1 oz (28 g)"], ["wt", 1, "oz"], [
      S(["Какао + жир + цукор", "Cocoa + fat + sugar"], [P(3, "tbsp", ["какао-порошку", "cocoa powder"]), P(1, "tbsp", ["вершкового масла або кулінарного жиру", "butter or shortening"]), P(1, "tbsp", ["цукру", "sugar"])], ["", ""], ["BS"]),
      S(["Несолодкий шоколад + цукор", "Unsweetened chocolate + sugar"], [P(1 / 2, "oz", ["несолодкого шоколаду", "unsweetened chocolate"]), P(1, "tbsp", ["цукру", "sugar"])], ["Джерела розходяться в кількості: 1/2 унції з 1 ст. л. цукру чи 1 унція з 4 ч. л. цукру, тому показано обидва варіанти.", "The sources disagree on the amounts: 1/2 oz with 1 tbsp of sugar or 1 oz with 4 tsp of sugar, so both options are shown."], ["USU"]),
      S(["Несолодкий шоколад + цукор (варіант 2)", "Unsweetened chocolate + sugar (option 2)"], [P(1, "oz", ["несолодкого шоколаду", "unsweetened chocolate"]), P(4, "tsp", ["цукру", "sugar"])], ["", ""], ["CSU"])
    ]],
    ["allspice", "other", ["Духм'яний перець (allspice), 1 ч. л.", "Allspice, 1 tsp"], ["vol", 1, "tsp"], [
      S(["Кориця + гвоздика", "Cinnamon + ground cloves"], [P(1 / 2, "tsp", ["кориці", "cinnamon"]), P(1 / 2, "tsp", ["меленої гвоздики", "ground cloves"])], ["", ""], ["USU", "CSU"], "v")
    ]],
    ["pumpkin_spice", "other", ["Спеції для гарбузового пирога, 1 ч. л.", "Pumpkin pie spice, 1 tsp"], ["vol", 1, "tsp"], [
      S(["Кориця, імбир, духм'яний перець, мускатний горіх", "Cinnamon, ginger, allspice, nutmeg"], [P(1 / 2, "tsp", ["кориці", "cinnamon"]), P(1 / 4, "tsp", ["імбиру", "ginger"]), P(1 / 8, "tsp", ["духм'яного перцю", "allspice"]), P(1 / 8, "tsp", ["мускатного горіха", "nutmeg"])], ["", ""], ["USU", "CSU"], "v")
    ]],
    ["lemon_juice", "other", ["Лимонний сік, 1 ч. л.", "Lemon juice, 1 tsp"], ["vol", 1, "tsp"], [
      S(["Оцет", "Vinegar"], [P(1 / 2, "tsp", ["оцту", "vinegar"])], ["", ""], ["USU", "CSU"], "v")
    ]]
  ];
  const T = (a) => L(a[0], a[1]);
  const ING = RAW.map(([id, cat, name, base, subs]) => ({ id, cat, label: T(name), base, subs: subs.map((s) => ({ name: T(s.n), parts: s.parts.map((p) => Object.assign({}, p, { w: T(p.w) })), note: T(s.note), src: s.src, t: s.t, inf: !!s.inf })) }));
  const byId = {}; ING.forEach((i) => { byId[i.id] = i; });
  const ing = (id) => byId[id] || null;
  const baseMl = (b) => (b[0] === "vol" ? b[1] * UM[b[2]] : 0);

  // ---------- форматування ----------
  const FRS = [[0, ""], [1 / 8, "⅛"], [1 / 4, "¼"], [1 / 3, "⅓"], [3 / 8, "⅜"], [1 / 2, "½"], [5 / 8, "⅝"], [2 / 3, "⅔"], [3 / 4, "¾"], [7 / 8, "⅞"], [1, ""]];
  // число з практичним дробом: «1 ½», «¾», «2»; null, якщо відхилення більше tol
  function numFr(x, tol) {
    const w = Math.floor(x + 1e-9), r = x - w; let best = null;
    for (const [v, s] of FRS) { const d = Math.abs(r - v); if (d <= tol && (!best || d < best.d)) best = { d, v, s }; }
    if (!best) return null;
    const ww = w + (best.v === 1 ? 1 : 0);
    return best.s ? (ww ? ww + " " : "") + best.s : String(ww);
  }
  const dec = (x) => String(Math.round(x * 100) / 100).replace(".", DEC);
  const CUPW = L(["склянка", "склянки", "склянок", "склянки"], ["cup", "cups"]);
  function cupWord(n) { if (IS_EN) return n <= 1 ? CUPW[0] : CUPW[1]; if (!Number.isInteger(n)) return CUPW[3]; const a = n % 10, b = n % 100; return a === 1 && b !== 11 ? CUPW[0] : a >= 2 && a <= 4 && (b < 12 || b > 14) ? CUPW[1] : CUPW[2]; }
  const TB = L("ст. л.", "tbsp"), TS = L("ч. л.", "tsp");
  // об'єм у мл → «¾ склянки», «3 ст. л.», «½ ч. л.»; cupMl — склянка користувача
  // «нормальні» дроби склянки без восьмих: ¼ ⅓ ½ ⅔ ¾
  const NICE = [[0, ""], [1 / 4, "¼"], [1 / 3, "⅓"], [1 / 2, "½"], [2 / 3, "⅔"], [3 / 4, "¾"], [1, ""]];
  function numNice(x, tol) { const w = Math.floor(x + 1e-9), r = x - w; for (const [v, sy] of NICE) if (Math.abs(r - v) <= tol) { const ww = w + (v === 1 ? 1 : 0); return sy ? (ww ? ww + " " : "") + sy : String(ww); } return null; }
  // частини об'єму: {s: число, u: "cup" | "tbsp" | "tsp" | "ml", n}
  function volParts(ml, cupMl) {
    const c = ml / cupMl, tb = ml / 15, ts = ml / 5; let s;
    const mk = (s2, u, n) => ({ s: s2, u, n });
    if (ml < 15 && ml >= 0.5 && (s = numFr(ts, 0.02))) return mk(s, "tsp", ts);
    if (ml >= 55 && (s = numNice(c, 0.012))) return mk(s, "cup", /^[0-9]+$/.test(s) ? Number(s) : c);
    if (ml >= 10 && tb <= 8 && (s = numFr(tb, 0.02))) return mk(s, "tbsp", tb);
    if (ml >= 55 && (s = numFr(c, 0.012))) return mk(s, "cup", /^[0-9]+$/.test(s) ? Number(s) : c);
    if (ml >= 10 && tb <= 16 && (s = numFr(tb, 0.02))) return mk(s, "tbsp", tb);
    if (ml >= 0.5 && ts < 10 && (s = numFr(ts, 0.02))) return mk(s, "tsp", ts);
    if (ml >= 25 && ml < 200) return mk("≈ " + dec(Math.round(tb * 2) / 2), "tbsp", tb);
    if (ml >= 55) return mk("≈ " + dec(c), "cup", c);
    return mk("≈ " + Math.round(ml), "ml", ml);
  }
  const unitWord = (p) => (p.u === "cup" ? cupWord(p.n) : p.u === "tbsp" ? TB : p.u === "tsp" ? TS : L("мл", "ml"));
  const volText = (ml, cupMl) => { const p = volParts(ml, cupMl); return p.s + " " + unitWord(p); };
  // діапазон: обидва кінці в одиниці нижнього
  function rangeText(ml1, ml2, cupMl) {
    const p = volParts(ml1, cupMl); if (p.u === "ml") return volText(ml1, cupMl) + " – " + volText(ml2, cupMl);
    const div = p.u === "cup" ? cupMl : p.u === "tbsp" ? 15 : 5, x2 = ml2 / div, s2 = numFr(x2, 0.05) || dec(x2);
    return p.s + "–" + s2 + " " + unitWord({ u: p.u, n: x2 });
  }
  // «до 1 склянки» (родовий відмінок) для української
  function genCup(t) { if (IS_EN) return t; const w = t.split(" "), last = w.pop(); if (!CUPW.includes(last)) return t; const num = w.join(" "); return num + " " + (num === "1" || /[⅛¼⅓⅜½⅝⅔¾⅞]/.test(num) ? CUPW[3] : CUPW[2]); }
  function pcText(p, n) {
    const r = Math.round(n * 100) / 100, F = IS_EN ? p.f.en : p.f.uk;
    if (IS_EN) return dec(r) + " " + (r <= 1 ? F[0] : F[1]);
    if (!Number.isInteger(r)) return dec(r) + " " + F[3];
    const a = r % 10, b = r % 100; return r + " " + (a === 1 && b !== 11 ? F[0] : a >= 2 && a <= 4 && (b < 12 || b > 14) ? F[1] : F[2]);
  }
  // текст однієї частини заміни при множнику f
  function partText(p, f, o) {
    if (p.u === "pc") return pcText(p, p.q * f);
    if (p.u === "oz") { const g = p.q * f * OZ; return K.fmt(g, K.unit("g"), DEC) + " " + L("г", "g") + " (" + dec(p.q * f) + " " + L("унції", "oz") + ") " + p.w; }
    if (p.fill) return p.w + " " + L("до ", "to ") + genCup(volText(p.to * UM.cup * f, o.cupMl));
    const ml = p.q * UM[p.u] * f;
    if (p.q2 !== undefined) return rangeText(ml, p.q2 * UM[p.u] * f, o.cupMl) + " " + p.w;
    return volText(ml, o.cupMl) + " " + p.w;
  }
  const subText = (sub, f, o) => sub.parts.map((p) => partText(p, f, o)).join(" + ");
  // множник: скільки «основ» інгредієнта в кількості користувача; amt і unit: "pc", "ml", "tsp", "tbsp", "cup" (склянка користувача), "g", "oz"
  function factor(ig, amt, unit, cupMl) {
    const b = ig.base;
    if (b[0] === "pc") return amt;
    if (b[0] === "wt") return (unit === "oz" ? amt * OZ : amt) / (b[1] * OZ);
    const ml = unit === "ml" ? amt : unit === "tsp" ? amt * 5 : unit === "tbsp" ? amt * 15 : amt * cupMl;
    return ml / baseMl(b);
  }
  const TAGS = { v: L("веган", "vegan"), d: L("без молочного", "dairy-free"), e: L("без яєць", "egg-free") };
  function tagsOf(sub) { const t = sub.t; return t === "v" ? [TAGS.v, TAGS.d, TAGS.e] : t === "de" ? [TAGS.d, TAGS.e] : t === "d" ? [TAGS.d] : t === "e" ? [TAGS.e] : []; }
  // ok для обмеження r: "v", "e", "d"
  const okFor = (sub, r) => (r === "v" ? sub.t === "v" : r === "e" ? ["v", "e", "de"].includes(sub.t) : ["v", "d", "de"].includes(sub.t));
  function baseText(ig, o) {
    const b = ig.base;
    if (b[0] === "pc") return L("1 шт.", "1 pc");
    if (b[0] === "wt") return L("1 унція (28 г)", "1 oz (28 g)");
    return volText(baseMl(b), o.cupMl);
  }
  root.Sd = { SRC, CATS, ING, ing, TAGS, tagsOf, okFor, factor, subText, partText, volText, numFr, baseText, UM, cupWord };
})();
