/* MAMA — съветници по състояния, менструален цикъл, крачкомер, неделен анализ, месечен здравен преглед. */
'use strict';

/* ─── Съветници ─────────────────────────────────────────────────────────── */
const ADV_GROUPS = [['acute', '🤒 Сега ме мъчи'], ['chronic', '🩺 Хронични състояния'], ['women', '🌸 За жената'], ['life', '🏃 Начин на живот']];
const ADV = [
  // Остри
  { id: 'flu', g: 'acute', e: '🤒', n: 'Грип или настинка', who: 'Съветник', days: 7,
    intro: 'Целта е тялото да има течности, енергия и почивка, за да се справи само.',
    eat: ['Топли супи и бульони (пилешка, зеленчукова)', 'Плодове и зеленчуци с витамин C: цитруси, чушки, киви', 'Кисело мляко', 'Леки ястия на малки порции, ако няма апетит'],
    avoid: ['Алкохол', 'Тежки, пържени и много солени храни', 'Много сладко'],
    drinks: ['Вода, чай, бульон — 2–2,5 л дневно', 'Чай от липа или лайка с мед и лимон', 'Джинджифил с лимон'],
    herbs: ['Мед и лимон', 'Липа', 'Джинджифил', 'Мащерка (чубрица мащерка)', 'Шипка'], dishes: ['pileshka', 'zelen', 'leshta', 'tr_mercimek', 'h_kurban'],
    habits: ['Почивка и сън — тренировките след като мине температурата', 'Проветряване, влажен въздух', 'Мед за кашлицата вечер (не при бебета под 1 г.)'],
    red: ['Затруднено дишане или болка в гърдите', 'Температура над 39 °C или над 3 дни', 'Обърканост, силна сънливост', 'Обезводняване: малко урина, световъртеж', 'Влошаване след първоначално подобрение'] },
  { id: 'postinf', g: 'acute', e: '🌱', n: 'Възстановяване след инфекция (грип, COVID)', who: 'Диетолог', days: 21,
    intro: 'След боледуване тялото има нужда от повече белтък, витамини и постепенно връщане към движението.',
    eat: ['Белтък на всяко хранене (1,2 г/кг): яйца, риба, птици, бобови, извара', 'Цветни зеленчуци и плодове всеки ден', 'Пълнозърнести за енергия', 'Ферментирали храни, особено след антибиотик'],
    avoid: ['Алкохол поне 1–2 седмици', 'Пропускане на хранения', 'Енергийни напитки'],
    drinks: ['Вода 1,5–2 л', 'Шипков чай', 'Айрян или кефир'],
    herbs: ['Шипка', 'Кисело мляко / айрян', 'Мурсалски чай'], dishes: ['pile_oriz', 'ryba_furna', 'yahnia_grah', 'leshta', 'bob'],
    habits: ['Разходки 10–20 мин и постепенно увеличаване', 'Сън 8–9 часа', 'Без тежки тренировки 1–2 седмици след температура'],
    red: ['Задух при леко усилие', 'Сърцебиене или болка в гърдите', 'Умора, която не отминава след 4 седмици'] },
  { id: 'stomach', g: 'acute', e: '🤢', n: 'Стомашно разстройство (диария, повръщане)', who: 'Съветник', days: 3,
    intro: 'Най-важното са течностите и солите. Храната се връща постепенно.',
    eat: ['Малки порции: ориз, варени картофи, банан, сухари, моркова супа', 'Постепенно — пилешко, яйце, кисело мляко'],
    avoid: ['Мазно, пържено, люто', 'Прясно мляко за няколко дни', 'Алкохол, кафе, газирани и сокове'],
    drinks: ['Рехидратиращ разтвор от аптеката — на малки глътки', 'Вода, бульон, чай от лайка или мента'],
    herbs: ['Лайка', 'Мента', 'Джинджифил'], dishes: ['zelen', 'pileshka', 'mlyako_oriz'],
    habits: ['Миене на ръцете', 'Почивка'],
    red: ['Кръв в изпражненията', 'Висока температура', 'Признаци на обезводняване', 'Над 2 дни без подобрение, при деца и възрастни — по-рано'] },
  { id: 'constip', g: 'acute', e: '🧻', n: 'Запек', who: 'Диетолог', days: 14,
    intro: 'Фибри, течности и движение — в този ред.',
    eat: ['Сушени сливи (5–6 на ден) — с доказан ефект', 'Пълнозърнест хляб, овес, бобови', 'Зеленчуци и плодове с кората', 'Кисело мляко'],
    avoid: ['Бял хляб и тестени изобилно', 'Твърде малко вода'],
    drinks: ['Вода 2 л', 'Топла вода сутрин на гладно', 'Ошав/компот от сушени плодове'],
    herbs: ['Овесена отвара / каша', 'Кисело мляко / айрян'], dishes: ['bob', 'leshta', 'h_oshav', 'zeleva'],
    habits: ['Увеличавайте фибрите постепенно', 'Ходене 30 мин', 'Редовен час за тоалетна след закуска'],
    red: ['Кръв в изпражненията', 'Внезапна промяна над 50 г.', 'Силна болка, повръщане, подут корем'] },
  { id: 'heartburn', g: 'acute', e: '🔥', n: 'Киселини / рефлукс', who: 'Диетолог', days: 14,
    intro: 'По-малки порции и време между вечерята и съня правят най-голямата разлика.',
    eat: ['Малки и чести хранения', 'Варени и печени ястия', 'Овес, ориз, банан, кисело мляко'],
    avoid: ['Мазно и пържено', 'Шоколад, мента, кафе, алкохол, газирани', 'Хранене 3 часа преди лягане'],
    drinks: ['Вода между храненията', 'Чай от лайка'], herbs: ['Лайка', 'Джинджифил'], dishes: ['pile_oriz', 'zelen', 'ryba_furna'],
    habits: ['Повдигнете главата на леглото с 15–20 см', 'Сваляне на тегло при наднормено', 'Без тесни колани след хранене'],
    red: ['Затруднено преглъщане', 'Отслабване без причина', 'Черни изпражнения или повръщане на кръв'] },
  { id: 'headache', g: 'acute', e: '🤕', n: 'Главоболие / мигрена', who: 'Съветник', days: 14,
    intro: 'Течности, редовно хранене и сън предотвратяват голяма част от главоболията.',
    eat: ['Редовни хранения — без гладуване', 'Храни с магнезий: ядки, семена, бобови, пълнозърнести', 'Риба и зехтин'],
    avoid: ['Пропуснато хранене', 'Много кафе или рязко спиране', 'Алкохол (особено червено вино)', 'Ако забелязвате — отлежали сирена, колбаси'],
    drinks: ['Вода 2 л — обезводняването е честа причина', 'Чай от мента'], herbs: ['Мента', 'Джинджифил'], dishes: ['ryba_furna', 'leshta'],
    habits: ['Дневник: кога и след какво започва', 'Сън по едно и също време', 'Почивка от екрана'],
    red: ['Внезапно най-силното главоболие в живота', 'С температура и схванат врат', 'Със слабост, нарушен говор или зрение', 'След удар в главата'] },
  { id: 'hangover', g: 'acute', e: '🥴', n: 'След празника (тежест, махмурлук)', who: 'Съветник', days: 2,
    intro: 'Няма „лек“ — течности, сол, лека храна и почивка.',
    eat: ['Бульон, супа, яйца', 'Банан и плодове', 'Лека храна — без мазно'],
    avoid: ['Още алкохол „за оправяне“', 'Пържено и тежко'],
    drinks: ['Вода и айрян', 'Чорба от кисело зеле (не при високо кръвно)', 'Джинджифил при гадене'],
    herbs: ['Сок от кисело зеле', 'Кисело мляко / айрян', 'Джинджифил'], dishes: ['pileshka', 'h_kurban', 'zelen'],
    habits: ['Сън', 'Без шофиране, докато не сте сигурни, че алкохолът е излязъл'],
    red: ['Повръщане, което не спира', 'Обърканост', 'Болка в горната част на корема'] },
  { id: 'antibiotic', g: 'acute', e: '💊', n: 'По време на антибиотик', who: 'Диетолог', days: 14,
    intro: 'Целта е да се подкрепи чревната флора.',
    eat: ['Кисело мляко и кефир — 2–3 часа след таблетката', 'Фибри: зеленчуци, плодове, овес, бобови', 'Кисело зеле, туршия'],
    avoid: ['Алкохол', 'Прясно мляко и калций непосредствено с някои антибиотици (тетрациклини, хинолони) — вижте листовката'],
    drinks: ['Вода'], herbs: ['Кисело мляко / айрян', 'Лайка'], dishes: ['leshta', 'zelen', 'snezhanka'],
    habits: ['Пийте антибиотика до края, по часовете в рецептата'],
    red: ['Обрив, подуване на лицето', 'Силна диария с кръв'] },
  // Хронични
  { id: 'htn', g: 'chronic', e: '❤️', n: 'Високо кръвно', who: 'Диетолог', days: 56, goal: 'bp',
    intro: 'DASH режимът и по-малко сол понижават горното кръвно с 8–14 mmHg.',
    eat: ['Зеленчуци и плодове 8–10 порции (калий)', 'Нискомаслени млечни', 'Бобови, ядки, пълнозърнести', 'Риба'],
    avoid: ['Сол над 5 г: колбаси, кубчета, саламурено сирене, туршия, чипс', 'Алкохол', 'Енергийни напитки'],
    drinks: ['Вода', 'Хибискус чай', 'Сок от цвекло'], herbs: ['Хибискус', 'Сок от цвекло', 'Чесън', 'Глог'], dishes: ['bob_yahnia', 'ryba_furna', 'leshta', 'zeleva', 'gr_fasolada'],
    habits: ['Мерете кръвното вкъщи 2× дневно по 2 измервания', '30 мин бързо ходене дневно', 'Сваляне на тегло — 1 кг ≈ 1 mmHg'],
    red: ['Над 180/110 с главоболие, гадене, нарушено зрение', 'Болка в гърдите, задух', 'Слабост в половината тяло'] },
  { id: 'hypotension', g: 'chronic', e: '🫗', n: 'Ниско кръвно', who: 'Съветник', days: 28,
    intro: 'При ниско кръвно без оплаквания лечение не е нужно. При световъртеж помагат течностите и по-малките хранения.',
    eat: ['Малки и чести хранения (след обилно хранене кръвното пада)', 'Солени храни умерено — само ако лекарят не е забранил', 'Храни с желязо и B12, ако има анемия'],
    avoid: ['Алкохол', 'Рязко изправяне', 'Дълго стоене прав на горещо'],
    drinks: ['Вода 2–2,5 л', 'Чаша вода преди ставане сутрин', 'Кафе сутрин може да помогне'], herbs: ['Мурсалски чай', 'Вода с лимон сутрин'], dishes: ['pileshka', 'kiufteta', 'mishmash'],
    habits: ['Ставайте бавно — първо седнете за минута', 'Компресивни чорапи при нужда', 'Движение за краката'],
    red: ['Припадане', 'Болка в гърдите, задух', 'Черни изпражнения', 'Ниско кръвно с объркване'] },
  { id: 'overweight', g: 'chronic', e: '⚖️', n: 'Наднормено тегло', who: 'Диетолог', days: 84, goal: 'weight',
    intro: 'Реалистично е 0,5–1 кг седмично. Още 5–10% от теглото подобряват кръвно, захар и холестерол.',
    eat: ['½ чиния зеленчуци на всяко хранене', 'Белтък на всяко хранене — засища', 'Пълнозърнести вместо бели', 'Плодове вместо сладкиши'],
    avoid: ['Сладки напитки и сокове', 'Хранене пред екран', 'Големи чинии и „довършване“', 'Алкохол'],
    drinks: ['Вода преди хранене', 'Чай без захар', 'Зелен чай'], herbs: ['Зелен чай', 'Вода с лимон сутрин'], dishes: ['pileshka', 'ryba_furna', 'shopska', 'leshta', 'cn_cabbage'],
    habits: ['8 000–10 000 крачки', '2 силови тренировки седмично', 'Претегляне веднъж седмично', 'Сън 7–9 ч — недоспиването увеличава апетита'],
    red: ['ИТМ над 35 или с диабет/високо кръвно — лекар за допълнително лечение'] },
  { id: 'hashimoto', g: 'chronic', e: '🦋', n: 'Хашимото / хипотиреоидизъм', who: 'Диетолог', days: 56,
    intro: 'Няма специална „диета за Хашимото“ с доказан ефект. Важни са балансираното хранене, достатъчно йод без излишък и правилният прием на хормона.',
    eat: ['Йодирана сол в нормално количество, риба 2× седмично', 'Селен: 1–2 бразилски ореха, яйца, риба', 'Желязо и витамин D — проверявайте ги', 'Фибри — при склонност към запек'],
    avoid: ['Хранителни добавки с йод или водорасли без лекар', 'Безглутенова диета — само ако има доказана целиакия', 'Кафе, соя, калций и желязо по-рано от 30–60 мин (калций/желязо — 4 часа) след левотироксина'],
    drinks: ['Вода', 'Кафето — поне 30–60 мин след таблетката'], herbs: ['Лайка', 'Маточина'], dishes: ['ryba_furna', 'pile_oriz', 'leshta', 'h_yaica'],
    habits: ['Левотироксин всяка сутрин на гладно с вода, по едно и също време', 'Контролен TSH на 6–8 седмици след промяна на дозата', 'Движение и сън при умора'],
    red: ['Сърцебиене, треперене — възможна предозировка', 'Силна умора, подуване, бавен пулс'] },
  { id: 'hyperthyroid', g: 'chronic', e: '⚡', n: 'Повишена функция на щитовидната жлеза', who: 'Съветник', days: 56,
    intro: 'Лечението е при ендокринолог. Храненето подкрепя теглото, костите и сърцето.',
    eat: ['Достатъчно калории и белтък — често се губи тегло', 'Калций и витамин D: млечни, риба', 'Плодове и зеленчуци'],
    avoid: ['Излишен йод: водорасли, добавки с йод, йодни разтвори', 'Много кафе и енергийни напитки — засилват сърцебиенето', 'Алкохол'],
    drinks: ['Вода', 'Безкофеинови чайове'], herbs: ['Маточина', 'Лайка'], dishes: ['pile_oriz', 'musaka', 'banica', 'mlyako_oriz'],
    habits: ['Редовни контроли на TSH и FT4', 'Почивка при сърцебиене'],
    red: ['Много бърз пулс, задух, висока температура, обърканост — спешно', 'Проблеми с очите'] },
  { id: 'diabetes', g: 'chronic', e: '🍬', n: 'Диабет / инсулинова резистентност', who: 'Диетолог', days: 84, goal: 'sugar',
    intro: 'Методът на чинията и движението след хранене стабилизират захарта.',
    eat: ['½ чиния некорени зеленчуци', 'Белтък и бобови на всяко хранене', 'Пълнозърнести в отмерена порция', 'Плодове цели, 2 порции'],
    avoid: ['Сладки напитки, сокове, бял хляб, сладкиши', 'Дълго гладуване при лечение с инсулин'],
    drinks: ['Вода', 'Чай без захар'], herbs: ['Канела', 'Овесена отвара / каша', 'Ябълков оцет'], dishes: ['leshta', 'bob', 'ryba_furna', 'in_dal', 'shopska'],
    habits: ['10–15 мин разходка след хранене', 'Мерете захарта по указание на лекаря', 'Грижа за краката'],
    red: ['Захар под 3,9 с треперене и изпотяване — 15 г бърза захар', 'Над 16,7 с жажда и повръщане — спешно'] },
  { id: 'cholesterol', g: 'chronic', e: '🧈', n: 'Висок холестерол', who: 'Диетолог', days: 84, goal: 'chol',
    intro: 'Портфолио режимът (овес, ядки, бобови, растителни мазнини) понижава LDL с до 20–30%.',
    eat: ['Овес/ечемик всеки ден', 'Шепа ядки', 'Бобови 4+ пъти седмично', 'Зехтин вместо масло', 'Риба 2×'],
    avoid: ['Колбаси, тлъсто месо, масло, кашкавал в големи количества', 'Трансмазнини: вафли, бисквити, пържено'],
    drinks: ['Вода', 'Зелен чай'], herbs: ['Овесена отвара / каша', 'Зелен чай', 'Чесън'], dishes: ['bob', 'leshta', 'ryba_furna', 'gr_fasolada', 'lb_hummus'],
    habits: ['150 мин движение седмично', 'Без цигари'], red: ['LDL над 4,9 — съмнение за фамилна хиперхолестеролемия'] },
  { id: 'anemia2', g: 'chronic', e: '🩸', n: 'Анемия / ниско желязо', who: 'Диетолог', days: 84, goal: 'iron',
    intro: 'Храната помага да се поддържат запасите, но причината се търси от лекар.',
    eat: ['Червено месо, черен дроб, яйца', 'Бобови, тиквени семки, листни зеленчуци', 'Витамин C към храненето'],
    avoid: ['Чай и кафе по време на хранене', 'Калций (мляко) едновременно с желязо'],
    drinks: ['Шипков чай', 'Портокалов фреш с храната'], herbs: ['Шипка', 'Коприва', 'Тиквени семки'], dishes: ['bob', 'leshta', 'kiufteta', 'h_agneshko'],
    habits: ['Ако е назначено желязо — на гладно или според лекаря, с витамин C'], red: ['Задух, сърцебиене, черни изпражнения'] },
  // Жени
  { id: 'period', g: 'women', e: '🌸', n: 'Менструален цикъл', who: 'Съветник', days: 28, female: true,
    intro: 'Храненето може да облекчи умората, болките и подуването в различните фази.',
    eat: ['По време на цикъла — желязо (месо, бобови, семена) + витамин C', 'Магнезий: ядки, семена, черен шоколад, бобови', 'Омега-3: риба, орехи', 'Топли ястия и супи'],
    avoid: ['Много сол — засилва подуването', 'Много кафе и алкохол', 'Пропуснати хранения'],
    drinks: ['Чай от джинджифил (с ограничени доказателства при болки)', 'Лайка', 'Вода'], herbs: ['Джинджифил', 'Лайка', 'Маточина', 'Тиквени семки'], dishes: ['leshta', 'bob', 'ryba_furna', 'tr_mercimek'],
    habits: ['Топлина на корема', 'Леко движение — разходка, йога', 'Сън'],
    red: ['Много обилно кървене (смяна на превръзка всеки час)', 'Силни болки, които не минават с обезболяващо', 'Кървене между циклите или след менопауза'] },
  { id: 'pms', g: 'women', e: '🌙', n: 'ПМС (предменструален синдром)', who: 'Диетолог', days: 28, female: true,
    intro: 'Калцият от храната има доказан ефект при ПМС.',
    eat: ['Калций: кисело мляко, сирене, сусам', 'Сложни въглехидрати: овес, пълнозърнест хляб', 'Витамин B6: банани, птици, нахут', 'Магнезий: ядки, семена'],
    avoid: ['Сол, захар, алкохол, много кафе'], drinks: ['Вода', 'Маточина'], herbs: ['Маточина', 'Лайка', 'Тиквени семки'], dishes: ['in_chana', 'pile_oriz', 'snezhanka'],
    habits: ['Аеробно движение 30 мин', 'Сън и намаляване на стреса'], red: ['Тежки промени в настроението, които пречат на живота (ПМДР) — към лекар'] },
  { id: 'menopause', g: 'women', e: '🌷', n: 'Менопауза', who: 'Диетолог', days: 84, female: true,
    intro: 'Фокус: кости, сърце, тегло и по-малко горещи вълни.',
    eat: ['Калций 1200 мг: млечни, сусам, листни зеленчуци', 'Витамин D: риба, яйца, слънце', 'Белтък 1–1,2 г/кг', 'Соеви храни — с умерен ефект върху горещите вълни'],
    avoid: ['Алкохол, люто и горещи напитки (провокират вълни)', 'Много сол'], drinks: ['Вода', 'Чай от градински чай — традиция при изпотяване'], herbs: ['Маточина', 'Лайка'], dishes: ['ryba_furna', 'snezhanka', 'leshta', 'h_yaica'],
    habits: ['Силови тренировки 2×/седм. за костите', 'Прохладна спалня'], red: ['Кървене след менопауза — към гинеколог'] },
  { id: 'pregnancy', g: 'women', e: '🤰', n: 'Бременност', who: 'Съветник', days: 280, female: true,
    intro: 'Общи правила за безопасно хранене. Конкретните добавки — само по лекар.',
    eat: ['Фолиева киселина (по назначение) и зелени листни', 'Добре сготвено месо, риба и яйца', 'Млечни продукти — пастьоризирани', 'Риба 2× седм. с ниско съдържание на живак (скумрия, сьомга)'],
    avoid: ['Алкохол — изцяло', 'Сурово/недопечено месо, сурови яйца, суши', 'Непастьоризирани сирена', 'Черен дроб (много витамин A)', 'Риба меч, акула; кофеин над 200 мг/ден', 'Много билки — само след консултация'],
    drinks: ['Вода', 'Мляко'], herbs: ['Джинджифил', 'Кисело мляко / айрян'], dishes: ['pile_oriz', 'ryba_furna', 'leshta', 'snezhanka'],
    habits: ['Миене на зеленчуците', 'Разходки', 'Контроли по график'], red: ['Кървене, силни болки, изтичане на води', 'Силно главоболие, отоци, нарушено зрение', 'Намалени движения на бебето'] },
  // Начин на живот
  { id: 'stress', g: 'life', e: '🧘', n: 'Стрес и нерви', who: 'Съветник', days: 28, goal: 'stress',
    intro: 'Рутината, сънят и движението са най-силните средства; храната ги подкрепя.',
    eat: ['Редовни хранения', 'Магнезий и омега-3: ядки, семена, риба', 'Пълнозърнести'],
    avoid: ['Много кафе, алкохол', 'Сладко „за успокоение“'], drinks: ['Маточина вечер', 'Лайка', 'Златно мляко'], herbs: ['Маточина', 'Лайка', 'Куркума („златно мляко“)', 'Орехи с мед'], dishes: ['ryba_furna', 'leshta', 'mlyako_oriz'],
    habits: ['Разходка навън 20–30 мин', 'Дишане 4-7-8 за 5 минути', 'Без телефон 30 мин преди сън'], red: ['Мисли за самонараняване — потърсете помощ веднага (112)', 'Тревожност, която пречи на работа и сън — лекар или психолог'] },
  { id: 'insomnia', g: 'life', e: '😴', n: 'Безсъние / сънливост денем', who: 'Съветник', days: 28, goal: 'sleep',
    intro: 'Навиците около съня са по-важни от всяка храна.', eat: ['Лека вечеря поне 3 ч. преди сън', 'Сложни въглехидрати вечер в малко количество', 'Кисело мляко, банан, тиквени семки'],
    avoid: ['Кафе и енергийни напитки след 14 ч.', 'Алкохол вечер — разбива съня', 'Обилна вечеря'], drinks: ['Лайка', 'Маточина', 'Топло мляко с мед'], herbs: ['Лайка', 'Маточина', 'Тиквени семки'], dishes: ['zelen', 'mlyako_oriz', 'pile_oriz'],
    habits: ['Ставане по едно и също време', 'Дневна светлина сутрин', 'Хладна, тъмна стая'], red: ['Хъркане със спиране на дишането', 'Заспиване на волана'] },
  { id: 'fatigue', g: 'life', e: '🔋', n: 'Умора и липса на енергия', who: 'Диетолог', days: 28, goal: 'energy',
    intro: 'Чести причини: недоспиване, малко движение, обезводняване, ниско желязо, B12, витамин D, щитовидна жлеза.',
    eat: ['Закуска с белтък', 'Желязо + витамин C', 'Пълнозърнести вместо захар'], avoid: ['Сладко сутрин — следва срив', 'Пропуснати хранения'], drinks: ['Вода 1,5–2 л', 'Шипка'], herbs: ['Шипка', 'Мурсалски чай', 'Орехи с мед'], dishes: ['leshta', 'h_yaica', 'pile_oriz'],
    habits: ['Разходка сутрин', '7–9 ч. сън'], red: ['Умора над 4 седмици — изследвания: кръвна картина, феритин, B12, D, TSH, захар'] },
  { id: 'active', g: 'life', e: '🏋️', n: 'Активно спортувам', who: 'Диетолог', days: 28,
    intro: 'Повече енергия, белтък и течности за възстановяване.', eat: ['Белтък 1,4–2 г/кг, разпределен в 4 хранения', 'Въглехидрати преди и след тренировка', 'Плодове, зеленчуци, ядки'],
    avoid: ['Тренировка на празен стомах при дълги натоварвания', 'Недостатъчно вода'], drinks: ['Вода + сол/електролити при над 1 ч. потене', 'Кисело мляко след тренировка'], herbs: ['Сок от цвекло', 'Кисело мляко / айрян'], dishes: ['pile_oriz', 'kiufteta', 'it_bolognese', 'es_tortilla'],
    habits: ['Сън 8 ч.', 'Ден за почивка'], red: ['Болка в гърдите при усилие'] },
  { id: 'office', g: 'life', e: '🪑', n: 'Заседнал начин на живот', who: 'Съветник', days: 28,
    intro: 'Малки промени: стани на всеки 30–60 мин и 7–8 хил. крачки.', eat: ['По-малки порции хляб и тестени', 'Зеленчуци към всяко хранене', 'Храна от вкъщи вместо закуски от автомат'],
    avoid: ['Сладки напитки на бюрото', 'Хранене пред екрана'], drinks: ['Бутилка вода на бюрото'], herbs: ['Зелен чай', 'Вода с лимон сутрин'], dishes: ['shopska', 'leshta', 'pileshka'],
    habits: ['Ставай на всеки 30–60 мин', 'Разходка 10 мин след обяд', 'Стълби вместо асансьор'], red: [] },
  { id: 'senior', g: 'life', e: '👵', n: 'Над 65 години', who: 'Диетолог', days: 56,
    intro: 'С възрастта трябват повече белтък, витамин D, калций и течности.', eat: ['Белтък 1–1,2 г/кг: яйца, млечни, риба, бобови', 'Калций и витамин D', 'Меки, лесни за дъвчене ястия при нужда'],
    avoid: ['Пропускане на хранения', 'Твърде малко течности — жаждата се усеща по-слабо'], drinks: ['Вода по часовник — 6–8 чаши', 'Мляко, кисело мляко'], herbs: ['Кисело мляко / айрян', 'Шипка'], dishes: ['pileshka', 'ryba_furna', 'mlyako_oriz', 'kartofi_yahnia'],
    habits: ['Упражнения за баланс и сила', 'Слънце 15 мин'], red: ['Отслабване без причина', 'Чести падания', 'Обърканост'] },
];
function advPersonal(a) {
  const p = DS().profile || {}; const out = [];
  const bmi = bmiOf(p); const fl = (() => { try { return drFlags(); } catch (e) { return new Map(); } })();
  if (p.sex === 'f' && p.age >= 14 && p.age <= 50 && ['fatigue', 'period', 'postinf', 'anemia2'].includes(a.id)) out.push('Като жена в детеродна възраст имаш по-голяма нужда от желязо (18 мг/ден) — включвай желязо и витамин C.');
  if (p.age >= 65) out.push('Над 65 г.: повече белтък (1–1,2 г/кг) и течности по часовник — жаждата се усеща по-слабо.');
  if (p.age && p.age < 18) out.push('Под 18 г. не се препоръчват диети с ограничение на калориите — съветът е за качество на храната.');
  if (+p.act >= 1.55) out.push('При твоята активност добави въглехидрати около тренировките и пий повече вода.');
  if (+p.act <= 1.2) out.push('Добави поне 10 мин разходка след всяко хранене — подобрява захарта и храносмилането.');
  if (bmi && bmi >= 30 && !['overweight'].includes(a.id)) out.push(`ИТМ ${bmi.toFixed(1)}: дори 5% по-малко тегло ще подобри повечето показатели.`);
  if (fl.has('ckd')) out.push('При бъбречно заболяване: сол, калий и белтък — по указание на нефролога. Без билкови смеси без консултация.');
  if (fl.has('bp') && a.drinks.some(d => /кисело зеле/i.test(d))) out.push('Внимание: сокът от кисело зеле е много солен — не е подходящ при високо кръвно.');
  if ((p.cond || []).includes('preg') && a.id !== 'pregnancy') out.push('При бременност: много билки не са подходящи — питай лекар.');
  if (P().diet === 'vegan' || P().diet === 'veg') out.push('Като вегетарианец/веган следи B12, желязо и белтък — бобови, тофу, ядки и обогатени храни.');
  return out;
}
function advDayTip(a, day) { const pool = [...a.habits, ...a.eat, ...a.drinks]; return pool[(day - 1) % pool.length]; }
function activeAdv() { const st = DS(); const x = st.active; if (!x) return null; const a = ADV.find(v => v.id === x.id); if (!a) return null; const day = Math.floor((Date.now() - new Date(x.start)) / 86400000) + 1; if (day > x.days) return null; return { a, day, days: x.days }; }

function showAdvisor(id) {
  const a = ADV.find(x => x.id === id); if (!a) return;
  const st = DS(); const act = activeAdv(); const on = act && act.a.id === id;
  const herbs = a.herbs.map(n => HERBS.find(h => h.n === n)).filter(Boolean);
  const dishes = a.dishes.map(i => RECIPES.find(r => r.id === i)).filter(Boolean).filter(r => dietOk(r, P().diet, P().noPork));
  const pers = advPersonal(a);
  const L = (t, arr, ic) => arr.length ? `<div class="section-title" style="margin-left:0">${t}</div>${arr.map(x => `<div class="suggest"><div class="e">${ic}</div><div class="grow small">${esc(x)}</div></div>`).join('')}` : '';
  openSheet(`<div class="recipe-hero" style="background:${THEMES.teal}"><div class="emo-big">${a.e}</div><div><div class="small" style="opacity:.9">${esc(a.who)} · MAMA</div><h3 style="color:#fff">${esc(a.n)}</h3></div></div>
    <div style="margin:10px 2px">${esc(a.intro)}</div>
    ${a.id === 'period' ? cycleBox() : ''}
    ${pers.length ? `<div class="notice info" style="display:block"><b>👤 Персонално за теб</b>${pers.map(x => `<div class="small" style="margin-top:4px">• ${esc(x)}</div>`).join('')}</div>` : ''}
    ${L('✅ Яж повече', a.eat, '🥗')}${L('⛔ Ограничи', a.avoid, '✋')}${L('🥤 Напитки', a.drinks, '🍵')}
    ${herbs.length ? `<div class="section-title" style="margin-left:0">🌿 От аптеката на баба</div>${herbs.map(herbRow).join('')}` : ''}
    ${dishes.length ? `<div class="section-title" style="margin-left:0">🍽️ Подходящи ястия</div><div class="menu-grid">${dishes.map(recipeTile).join('')}</div>` : ''}
    ${L('🏃 Навици', a.habits, '✔️')}
    ${a.red.length ? `<div class="notice bad" style="display:block;margin-top:12px"><b>🚨 Към лекар, ако:</b>${a.red.map(x => `<div class="small" style="margin-top:3px">• ${esc(x)}</div>`).join('')}</div>` : ''}
    <button class="btn ${on ? 'tonal' : 'primary'} block" id="advOn" style="margin-top:12px">${on ? `✓ Активен — ден ${act.day} от ${act.days} (спри)` : `▶️ Включи съветника за ${a.days} дни`}</button>
    ${dishes.length ? `<button class="btn tonal block" id="advList" style="margin-top:8px">${I.cart} Продуктите за ястията в списъка</button>` : ''}
    ${a.goal ? `<button class="btn tonal block" id="advGoal" style="margin-top:8px">🎯 Направи програма с цел и срок</button>` : ''}
    <div class="muted small" style="margin-top:10px">Съветите са общи, по публикувани препоръки (СЗО, NHS, ESC, ADA, ETA и др.), и не заменят лекар.</div>`, el => {
    el.querySelectorAll('[data-recipe]').forEach(b => b.onclick = () => showRecipe(b.dataset.recipe));
    el.querySelector('#advOn').onclick = () => { st.active = on ? null : { id: a.id, start: todayISO(), days: a.days }; save(); closeSheet(); render(); toast(on ? 'Съветникът е спрян' : `Съветникът е включен за ${a.days} дни — ще получаваш съвети всеки ден`); };
    const l = el.querySelector('#advList'); if (l) l.onclick = () => { const n = sum(dishes.slice(0, 3).map(addIngredients)); toast(n ? `Добавени ${n} продукта` : 'Вече са в списъка'); };
    const g = el.querySelector('#advGoal'); if (g) g.onclick = () => { const gg = GOALS2.find(x => x.id === a.goal); st.goal = { id: gg.id, weeks: gg.w[Math.min(1, gg.w.length - 1)], start: todayISO() }; save(); closeSheet(); drTab = 'goal'; go('doctor'); };
    cycleBind(el);
  });
}
function drAdvisors(el) {
  const p = DS().profile || {}; const act = activeAdv();
  el.innerHTML = `${act ? `<div class="tip-banner" style="background:${THEMES.teal}" id="advAct"><div class="tip-emo">${act.a.e}</div><div class="grow"><b>${esc(act.a.n)} · ден ${act.day}/${act.days}</b><div class="small">Днес: ${esc(advDayTip(act.a, act.day))}</div></div><div class="tip-go">›</div></div>` : ''}
    <div class="notice info">🧑‍⚕️ <div>Избери какво те притеснява — диетологът и съветникът на MAMA ще ти дадат режим, храни, напитки, билки и ястия според пола, възрастта и активността ти.</div></div>
    ${ADV_GROUPS.map(([g, t]) => { const list = ADV.filter(a => a.g === g && (!a.female || p.sex !== 'm')); if (!list.length) return '';
      return `<div class="section-title">${t}</div><div class="world-grid">${list.map(a => `<button class="world-card ${act && act.a.id === a.id ? 'mine' : ''}" data-adv="${a.id}"><span class="flag" style="font-size:28px">${a.e}</span><b>${esc(a.n)}</b><small>${esc(a.who)}</small></button>`).join('')}</div>`; }).join('')}`;
  el.querySelectorAll('[data-adv]').forEach(b => b.onclick = () => showAdvisor(b.dataset.adv));
  const aa = el.querySelector('#advAct'); if (aa) aa.onclick = () => showAdvisor(act.a.id);
}

/* ─── Менструален цикъл ─────────────────────────────────────────────────── */
function cyclePhase() {
  const c = DS().cycle; if (!c || !c.start) return null;
  const len = +c.len || 28; const per = +c.per || 5;
  const day = ((Math.floor((Date.now() - new Date(c.start)) / 86400000) % len) + len) % len + 1;
  const ov = len - 14;
  const ph = day <= per ? ['Менструация', '🩸', 'Желязо + витамин C, топли храни, магнезий; леко движение.']
    : day < ov - 1 ? ['Фоликуларна фаза', '🌱', 'Енергията расте — подходящо за по-интензивни тренировки; белтък и зеленчуци.']
    : day <= ov + 1 ? ['Овулация', '✨', 'Високa енергия; фибри и антиоксиданти; достатъчно вода.']
    : day > len - 5 ? ['Предменструални дни (ПМС)', '🌙', 'Калций, магнезий, сложни въглехидрати; по-малко сол, захар и кафе.']
    : ['Лутеална фаза', '🍂', 'Апетитът може да расте — белтък и фибри засищат; редовни хранения.'];
  const next = addD(new Date(c.start), Math.ceil((Date.now() - new Date(c.start)) / 86400000 / len) * len);
  return { day, len, ph, next };
}
function cycleBox() {
  const c = DS().cycle || {}; const ph = cyclePhase();
  return `<div class="card" style="box-shadow:none;background:var(--surface-2)"><b>📅 Моят цикъл</b>
    ${ph ? `<div style="margin:6px 0"><span style="font-size:22px">${ph.ph[1]}</span> <b>${esc(ph.ph[0])}</b> · ден ${ph.day} от ${ph.len}<div class="small">${esc(ph.ph[2])}</div><div class="small muted">Следващ цикъл ~${fmtDate(ph.next)}</div></div>` : '<div class="small muted">Въведи началото на последния цикъл, за да получаваш съвети по фази.</div>'}
    <div class="row" style="gap:8px;margin-top:6px"><input class="input" type="date" id="cyS" value="${c.start || ''}"><input class="input" id="cyL" inputmode="numeric" style="max-width:90px" placeholder="28" value="${c.len || ''}"></div>
    <button class="btn tonal small" id="cySave" style="margin-top:6px">Запази</button><div class="small muted" style="margin-top:4px">Данните остават само на телефона.</div></div>`;
}
function cycleBind(el) {
  const b = el.querySelector('#cySave'); if (!b) return;
  b.onclick = () => { const s = el.querySelector('#cyS').value; const l = +el.querySelector('#cyL').value || 28; if (!s) return toast('Въведи дата'); DS().cycle = { start: s, len: Math.min(45, Math.max(20, l)), per: 5 }; save(); showAdvisor('period'); };
}

/* ─── Крачкомер ─────────────────────────────────────────────────────────── */
function ACT() { if (!S.activity) S.activity = { goal: 8000, days: {}, last: null }; return S.activity; }
function stepsPlugin() { return window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Steps; }
async function readSteps(ask) {
  const pl = stepsPlugin(); if (!pl) return null;
  try {
    if (ask) { try { await pl.requestPermissions(); } catch (e) { /* */ } }
    const r = await pl.read(); if (!r || !r.available) return r || null;
    const a = ACT(); const d = todayISO(); const c = Math.round(r.steps);
    const day = a.days[d] || (a.days[d] = { steps: 0, man: [] });
    if (a.last) { const delta = c >= a.last.c ? c - a.last.c : c; if (delta > 0 && delta < 60000) day.steps += delta; }
    a.last = { d, c, t: Date.now() };
    const cut = iso(addD(new Date(), -120)); for (const k in a.days) if (k < cut) delete a.days[k];
    save(); return r;
  } catch (e) { return null; }
}
function stepsToday() { const d = ACT().days[todayISO()]; return d ? d.steps : 0; }
function manKcal(day) { return day && day.man ? sum(day.man.map(m => m.kcal)) : 0; }
function stepStats(day) {
  const p = DS().profile || {}; const w = latest('weight') || p.weight || 75; const h = p.height || 172;
  const st = (day && day.steps) || 0; const km = st * h * 0.415 / 100000;
  return { steps: st, km, kcal: Math.round(st * 0.0005 * w * 0.9 + manKcal(day)) };
}
const SPORTS = [['Бързо ходене', 4.3], ['Бягане', 9.8], ['Колоездене', 7.5], ['Плуване', 6], ['Фитнес / тежести', 5], ['Йога / пилатес', 3], ['Футбол', 7], ['Танци', 5], ['Градина / физическа работа', 4]];
function renderActivity(el) {
  const a = ACT(); const t = todayISO(); const day = a.days[t] || { steps: 0, man: [] }; const s = stepStats(day);
  const pct = Math.min(1, s.steps / a.goal); const R = 54, C = 2 * Math.PI * R;
  const days = []; for (let i = 13; i >= 0; i--) { const d = iso(addD(new Date(), -i)); days.push([d, a.days[d] || { steps: 0 }]); }
  const mx = Math.max(a.goal, ...days.map(x => x[1].steps || 0));
  const has = !!stepsPlugin();
  el.innerHTML = `<div class="card" style="text-align:center">
      <svg viewBox="0 0 140 140" style="width:170px;height:170px"><circle cx="70" cy="70" r="${R}" fill="none" stroke="var(--surface-2)" stroke-width="14"/><circle cx="70" cy="70" r="${R}" fill="none" stroke="url(#gS)" stroke-width="14" stroke-linecap="round" stroke-dasharray="${C}" stroke-dashoffset="${C * (1 - pct)}" transform="rotate(-90 70 70)"/>
      <defs><linearGradient id="gS"><stop offset="0" stop-color="#0b8a5f"/><stop offset="1" stop-color="#8bd34a"/></linearGradient></defs>
      <text x="70" y="66" text-anchor="middle" font-size="24" font-weight="800" fill="currentColor">${s.steps.toLocaleString('bg-BG')}</text><text x="70" y="86" text-anchor="middle" font-size="11" fill="currentColor" opacity=".6">от ${a.goal.toLocaleString('bg-BG')} крачки</text></svg>
      <div class="kpis"><div class="kpi"><b>${s.km.toFixed(1)}</b><span>км</span></div><div class="kpi"><b>${s.kcal}</b><span>kcal</span></div><div class="kpi"><b>${Math.round(pct * 100)}%</b><span>от целта</span></div></div>
      ${has ? `<button class="btn tonal small" id="stRead" style="margin-top:10px">🔄 Обнови крачките</button>` : `<div class="notice info" style="margin-top:10px;text-align:left">📱 На iPhone и в браузъра крачките не могат да се четат автоматично — добави активност ръчно или въведи крачките от часовника си.</div>`}</div>
    <div class="card"><h2>📊 Последните 14 дни</h2><div class="cols" style="height:110px">${days.map(([d, v]) => `<div class="c"><span>${v.steps ? Math.round(v.steps / 1000) + 'k' : ''}</span><i class="${(v.steps || 0) >= a.goal ? 'now' : ''}" style="height:${((v.steps || 0) / mx * 80).toFixed(0)}%"></i>${new Date(d).getDate()}</div>`).join('')}</div>
      <div class="muted small">Оранжево — изпълнена цел.</div></div>
    <div class="card"><h2>➕ Добави активност</h2>
      <div class="row" style="gap:8px"><select class="input" id="spT">${SPORTS.map((x, i) => `<option value="${i}">${x[0]}</option>`).join('')}</select><input class="input" id="spM" inputmode="numeric" placeholder="мин" style="max-width:80px"></div>
      <div class="row" style="gap:8px;margin-top:8px"><input class="input" id="stManual" inputmode="numeric" placeholder="или крачки от часовника"></div>
      <button class="btn primary block" id="spAdd" style="margin-top:10px">Добави</button>
      ${day.man && day.man.length ? `<ul class="list" style="margin-top:8px">${day.man.map(m => `<li class="li" style="cursor:default"><div class="grow">${esc(m.t)} · ${m.min} мин</div><b>${m.kcal} kcal</b></li>`).join('')}</ul>` : ''}</div>
    <div class="card"><h2>🎯 Дневна цел</h2><div class="chips">${[6000, 8000, 10000, 12000].map(g => `<button class="chip ${a.goal === g ? 'on' : ''}" data-sg="${g}">${g.toLocaleString('bg-BG')}</button>`).join('')}</div>
      <div class="muted small" style="margin-top:6px">Проучванията показват по-нисък риск за здравето с 7 000–8 000 крачки дневно; при над 60 г. ползата е видима още от 6 000.</div></div>`;
  const rb = el.querySelector('#stRead'); if (rb) rb.onclick = async () => { const r = await readSteps(true); if (r && r.available === false) toast('Телефонът няма сензор за крачки'); renderActivity(el); };
  el.querySelectorAll('[data-sg]').forEach(b => b.onclick = () => { a.goal = +b.dataset.sg; save(); renderActivity(el); });
  el.querySelector('#spAdd').onclick = () => {
    const d = a.days[t] || (a.days[t] = { steps: 0, man: [] }); d.man = d.man || [];
    const mn = +el.querySelector('#spM').value; const sp = SPORTS[+el.querySelector('#spT').value]; const ms = +el.querySelector('#stManual').value;
    const w = latest('weight') || (DS().profile || {}).weight || 75;
    if (mn > 0 && mn < 600) d.man.push({ t: sp[0], min: mn, kcal: Math.round(sp[1] * w * mn / 60) });
    if (ms > 0 && ms < 100000) d.steps = Math.max(d.steps, ms);
    save(); toast('Добавено'); renderActivity(el);
  };
}

/* ─── Неделен анализ на седмицата ───────────────────────────────────────── */
function weekReport() {
  const a = ACT(); const st = DS(); const days = []; for (let i = 6; i >= 0; i--) days.push(iso(addD(new Date(), -i)));
  const steps = days.map(d => (a.days[d] || {}).steps || 0); const tot = sum(steps); const avg = Math.round(tot / 7); const hit = steps.filter(x => x >= a.goal).length;
  const diary = days.map(d => (st.diary || {})[d]).filter(Boolean);
  const av = k => { const v = diary.map(x => x[k]).filter(Boolean); return v.length ? v.reduce((x, y) => x + y, 0) / v.length : null; };
  const wts = (st.labs.weight || []).filter(x => x.d >= days[0]); const wPrev = (st.labs.weight || []).filter(x => x.d < days[0]).slice(-1)[0];
  const wDelta = wts.length && wPrev ? wts[wts.length - 1].v - wPrev.v : null;
  const trips = S.trips.filter(t => t.date >= days[0]); const spent = sum(trips.map(t => t.amount));
  const items = trips.flatMap(t => t.items || []); const bad = items.filter(i => harmMatch(i.n, i.c, false)).length;
  const good = items.filter(i => [6, 7, 29, 30, 33, 34, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 3].includes(i.c)).length;
  let score = 50;
  score += Math.min(25, avg / a.goal * 20);
  if (av('e')) score += (av('e') - 3) * 5; if (av('s')) score += (av('s') - 3) * 5; if (av('m')) score += (av('m') - 3) * 4;
  if (items.length) score += Math.round((good - bad * 2) / items.length * 15);
  score = Math.max(0, Math.min(100, Math.round(score)));
  const tips = [];
  if (avg < a.goal) tips.push(`Средно ${avg.toLocaleString('bg-BG')} крачки — добави 15 мин разходка дневно (≈ +1 800 крачки).`); else tips.push('Браво за движението — запази ритъма!');
  if (av('s') && av('s') < 3) tips.push('Сънят е слаб — кафе до 14 ч. и вечеря поне 3 ч. преди лягане.');
  if (av('m') && av('m') < 3) tips.push('Стресът е висок — маточина вечер и 5 мин дишане 4-7-8.');
  if (av('e') && av('e') < 3) tips.push('Ниска енергия — закуска с белтък и вода сутрин; при продължителна умора — изследвания.');
  if (bad > 0) tips.push(`${bad} от покупките са от вредните храни — опитай да ги намалиш наполовина следващата седмица.`);
  if (!diary.length) tips.push('Отбелязвай в Дневника как се чувстваш — анализът ще е по-точен.');
  const act = activeAdv(); if (act) tips.push(`${act.a.e} Съветник „${act.a.n}“: ден ${act.day} от ${act.days}.`);
  return { days, steps, tot, avg, hit, av, diaryN: diary.length, wDelta, spent, tripsN: trips.length, bad, good, items: items.length, score, tips };
}
function weekPopup() {
  const r = weekReport();
  popup({ theme: 'night', emoji: '📊', key: 'week', kicker: `Анализ на седмицата · ${fmtDate(r.days[0])} – ${fmtDate(r.days[6])}`, title: `Твоята седмица: ${r.score}/100`,
    text: `👟 ${r.tot.toLocaleString('bg-BG')} крачки (средно ${r.avg.toLocaleString('bg-BG')}), цел изпълнена ${r.hit}/7 дни<br>${r.av('e') ? `⚡ Енергия ${r.av('e').toFixed(1)} · 😴 Сън ${(r.av('s') || 0).toFixed(1)} · 🧘 Спокойствие ${(r.av('m') || 0).toFixed(1)} (от 5)<br>` : ''}${r.wDelta != null ? `⚖️ Тегло ${r.wDelta > 0 ? '+' : ''}${r.wDelta.toFixed(1)} кг<br>` : ''}${r.tripsN ? `🛒 ${eur(r.spent)} в ${r.tripsN} пазарувания<br>` : ''}<br><b>За следващата седмица:</b><br>${r.tips.slice(0, 3).map(t => '• ' + esc(t)).join('<br>')}`,
    actions: [{ label: '👟 Активност', primary: true, fn: () => go('activity') }, { label: '📔 Дневник', fn: () => { drTab = 'diary'; go('doctor'); } }] });
}
function weekDue() { const d = new Date(); const wd = d.getDay(); const wk = isoWeek(); return ((wd === 0 && d.getHours() >= 12) || (wd === 1 && d.getHours() < 12)) && S.guide.weekRep !== (wd === 1 ? isoWeek(addD(d, -1)) : wk); }

/* ─── Месечен здравен преглед ───────────────────────────────────────────── */
function monthPopup() {
  const st = DS(); const m = new Date().getMonth();
  const old = IND.filter(i => !['bmi', 'waist', 'weight', 'sys', 'dia', 'hr'].includes(i.k) && (st.labs[i.k] || []).length).filter(i => { const l = st.labs[i.k].slice(-1)[0]; return (Date.now() - new Date(l.d)) / 86400000 > 180; }).map(i => i.n);
  const refs = st.profile ? drReferrals().filter(r => r.v != null) : [];
  const diary = Object.entries(st.diary || {}).filter(([d]) => (Date.now() - new Date(d)) / 86400000 <= 30).map(x => x[1]);
  const avE = diary.length ? sum(diary.map(x => x.e || 0)) / diary.filter(x => x.e).length || 0 : 0;
  const lines = [];
  if (!st.profile) lines.push('Попълни профила в My Doctor — 2 минути за персонален режим.');
  if (refs.length) lines.push(`${refs.length} показателя извън нормата — провери „Към лекар“.`);
  if (old.length) lines.push(`Изследвания по-стари от 6 месеца: ${old.slice(0, 3).join(', ')}.`);
  if (!Object.keys(st.labs).some(k => !['weight', 'waist'].includes(k))) lines.push('Нямаш качени изследвания — снимай последните и MAMA ще ги анализира.');
  lines.push('Профилактичният преглед при личния лекар е безплатен веднъж годишно (НЗОК).');
  if (avE) lines.push(`Средна енергия за месеца: ${avE.toFixed(1)}/5.`);
  const adv = ADV.filter(a => a.g === 'life')[m % 4];
  popup({ theme: 'teal', emoji: '🩺', key: 'month', kicker: `Здравен преглед · ${MONTHS[m]}`, title: `${hello()} Как е здравето този месец?`,
    text: lines.map(l => '• ' + esc(l)).join('<br>') + `<br><br>💡 Темата на месеца: <b>${adv.e} ${esc(adv.n)}</b>`,
    actions: [{ label: '🩺 Към My Doctor', primary: true, fn: () => { drTab = 'plan'; go('doctor'); } }, { label: `${adv.e} Темата на месеца`, fn: () => showAdvisor(adv.id) }] });
}
function monthDue() { const k = new Date().toISOString().slice(0, 7); return S.guide.monthRep !== k && daysSince(P().onbAt) > 2; }

/* ─── Включване ────────────────────────────────────────────────────────── */
(function wire3() {
  TITLES.activity = ['Активност', 'Крачки, разстояние, калории'];
  const base = render;
  render = function () {
    if (current === 'activity') { renderActivity($('#s-activity')); return; }
    base();
    if (current === 'home') {
      const h = $('#s-home');
      if (h && !h.querySelector('#stepCard')) {
        const s = stepStats(ACT().days[todayISO()]); const g = ACT().goal; const act = activeAdv(); const ph = (DS().profile || {}).sex === 'f' ? cyclePhase() : null;
        const card = `<div class="card" id="stepCard" style="cursor:pointer"><div class="row between"><div><div class="small muted">👟 Крачки днес</div><div class="big" style="font-size:26px">${s.steps.toLocaleString('bg-BG')}</div><div class="small muted">${s.km.toFixed(1)} км · ${s.kcal} kcal</div></div>
          <div style="width:120px"><div class="track" style="height:10px;background:var(--surface-2);border-radius:6px;overflow:hidden"><div style="height:100%;width:${Math.min(100, s.steps / g * 100)}%;background:linear-gradient(90deg,#0b8a5f,#8bd34a)"></div></div><div class="small muted" style="text-align:right;margin-top:4px">цел ${g.toLocaleString('bg-BG')}</div></div></div></div>`
          + (act ? `<div class="tip-banner" style="background:${THEMES.teal}" id="homeAdv"><div class="tip-emo">${act.a.e}</div><div class="grow"><b>${esc(act.a.n)} · ден ${act.day}/${act.days}</b><div class="small">${esc(advDayTip(act.a, act.day))}</div></div><div class="tip-go">›</div></div>` : '')
          + (ph ? `<div class="tip-banner" style="background:${THEMES.pink}" id="homeCyc"><div class="tip-emo">${ph.ph[1]}</div><div class="grow"><b>${esc(ph.ph[0])} · ден ${ph.day}</b><div class="small">${esc(ph.ph[2])}</div></div><div class="tip-go">›</div></div>` : '');
        const anchor = h.querySelector('.card.hero'); if (anchor) anchor.insertAdjacentHTML('afterend', card); else h.insertAdjacentHTML('beforeend', card);
        h.querySelector('#stepCard').onclick = () => go('activity');
        const ha = h.querySelector('#homeAdv'); if (ha) ha.onclick = () => showAdvisor(act.a.id);
        const hc = h.querySelector('#homeCyc'); if (hc) hc.onclick = () => showAdvisor('period');
      }
    }
    if (current === 'more') {
      const ul = $('#s-more .list');
      if (ul && !ul.querySelector('[data-go2="activity"]')) {
        ul.insertAdjacentHTML('afterbegin', `<li class="li" data-go2="activity"><div class="lead">👟</div><div class="grow"><div class="title">Активност</div><div class="muted small">Крачки, км, калории, спорт</div></div><span class="muted">›</span></li>
          <li class="li" data-adv-open="1"><div class="lead">🧑‍⚕️</div><div class="grow"><div class="title">Съветници</div><div class="muted small">Грип, кръвно, щитовидна жлеза, цикъл, стрес и още</div></div><span class="muted">›</span></li>`);
        ul.querySelector('[data-go2="activity"]').onclick = () => go('activity');
        ul.querySelector('[data-adv-open]').onclick = () => { drTab = 'adv'; go('doctor'); };
      }
    }
  };
  // „Съветници“ като раздел в My Doctor
  const baseDoc = renderDoctor;
  renderDoctor = function (el) {
    if (drTab === 'adv' && !DS().profile) {
      el.innerHTML = `<div class="notice info">🩺 <div>Попълни кратък профил (пол, възраст, активност), за да са съветите персонални. <button class="btn primary small" id="advProf" style="margin-top:6px">Попълни профил</button></div></div><div id="drBody"></div>`;
      el.querySelector('#advProf').onclick = () => drWizard(0); drAdvisors(el.querySelector('#drBody')); return;
    }
    if (drTab === 'adv') { drTab = 'plan'; baseDoc(el); drTab = 'adv'; el.querySelectorAll('[data-drt]').forEach(b => b.classList.remove('on')); }
    else baseDoc(el);
    const ch = el.querySelector('.chips');
    if (ch && !ch.querySelector('[data-drt="adv"]')) {
      ch.insertAdjacentHTML('afterbegin', `<button class="chip ${drTab === 'adv' ? 'on' : ''}" data-drt="adv">🧑‍⚕️ Съветници</button>`);
      ch.querySelector('[data-drt="adv"]').onclick = () => { drTab = 'adv'; renderDoctor(el); };
    }
    if (drTab === 'adv') { const body = el.querySelector('#drBody'); if (body) drAdvisors(body); }
  };
  // съветниците работят и без профил
  // предложенията за ястия следват активния съветник
  const basePick = pickDish;
  pickDish = function (exclude = []) {
    const act = activeAdv();
    if (act) { const ok = act.a.dishes.map(i => RECIPES.find(r => r.id === i)).filter(r => r && !exclude.includes(r.id) && prefRecipeOk(r, false)); if (ok.length) return ok[Math.floor(Math.random() * ok.length)]; }
    return basePick(exclude);
  };
  const baseCand = candidates;
  candidates = function () {
    const c = baseCand();
    if (weekDue()) c.push({ pr: 97, fn: () => { const d = new Date(); S.guide.weekRep = d.getDay() === 1 ? isoWeek(addD(d, -1)) : isoWeek(); save(); weekPopup(); } });
    if (monthDue()) c.push({ pr: 92, fn: () => { S.guide.monthRep = new Date().toISOString().slice(0, 7); save(); monthPopup(); } });
    const act = activeAdv();
    if (act && S.guide.advTip !== todayISO()) c.push({ pr: 88, fn: () => { S.guide.advTip = todayISO(); save(); popup({ theme: 'teal', emoji: act.a.e, key: 'adv', kicker: `${act.a.who} · ${act.a.n} · ден ${act.day}/${act.days}`, title: 'Съветът за днес', text: esc(advDayTip(act.a, act.day)), actions: [{ label: 'Виж целия план', primary: true, fn: () => showAdvisor(act.a.id) }, { label: 'ОК', fn: null }] }); } });
    return c.sort((a, b) => b.pr - a.pr);
  };
  // известия: неделя 18:00 анализ, 1-во число 10:00 здравен преглед
  const baseSch = scheduleExtras;
  scheduleExtras = async function () {
    await baseSch();
    const ln = LN(); if (!ln || !P().notif) return;
    try {
      const st = await ln.checkPermissions(); if (st.display !== 'granted') return;
      await ln.cancel({ notifications: [{ id: 500 }, { id: 501 }] }).catch(() => {});
      const sun = nextAt(0, 18, 0); const m1 = new Date(); m1.setMonth(m1.getMonth() + 1, 1); m1.setHours(10, 0, 0, 0);
      await ln.schedule({ notifications: [
        { id: 500, channelId: 'mama', title: '📊 Анализ на седмицата', body: 'Виж крачките, съня, енергията и покупките си за седмицата + 3 съвета за следващата.', schedule: { at: sun, allowWhileIdle: true }, extra: { week: 1 }, smallIcon: 'ic_stat_mama', iconColor: '#0B8A5F' },
        { id: 501, channelId: 'mama', title: '🩺 Месечен здравен преглед', body: 'Как е здравето този месец? Изследвания, показатели и темата на месеца.', schedule: { at: m1, allowWhileIdle: true }, extra: { month: 1 }, smallIcon: 'ic_stat_mama', iconColor: '#0B8A5F' },
      ] });
    } catch (e) { /* */ }
  };
  const ln = LN();
  if (ln) ln.addListener('localNotificationActionPerformed', x => {
    const e = (x && x.notification && x.notification.extra) || {};
    if (e.week) setTimeout(() => { S.guide.weekRep = isoWeek(); save(); weekPopup(); }, 800);
    if (e.month) setTimeout(() => { S.guide.monthRep = new Date().toISOString().slice(0, 7); save(); monthPopup(); }, 800);
  });
})();

document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => readSteps(false).then(() => { if (current === 'home' || current === 'activity') { const h = $('#stepCard'); if (h) h.remove(); render(); } }), 1500);
  setInterval(() => { if (document.visibilityState === 'visible') readSteps(false); }, 60000);
  const again = () => setTimeout(() => readSteps(false), 500);
  if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.App) window.Capacitor.Plugins.App.addListener('resume', again);
});
