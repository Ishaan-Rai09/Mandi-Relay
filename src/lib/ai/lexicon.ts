/**
 * Multilingual produce lexicon.
 *
 * Indian agricultural speech mixes English, Hindi, Punjabi and transliterated
 * Hinglish in a single sentence ("500 kilo tamatar kal subah"). Everything the
 * parser needs to recognise — commodity aliases, spoken numerals, units,
 * relative dates and local places — is declared here so the grammar stays
 * data-driven and new languages can be added without touching the parser.
 */

export interface CommodityEntry {
  key: string;
  name: string;
  nameHi: string;
  namePa: string;
  categorySlug: string;
  aliases: string[];
  emoji: string;
}

export const COMMODITIES: CommodityEntry[] = [
  {
    key: "tomato",
    name: "Tomatoes",
    nameHi: "टमाटर",
    namePa: "ਟਮਾਟਰ",
    categorySlug: "vegetables",
    aliases: ["tomato", "tomatoes", "tamatar", "tamater", "tamaatar", "टमाटर", "ਟਮਾਟਰ"],
    emoji: "🍅",
  },
  {
    key: "onion",
    name: "Onions",
    nameHi: "प्याज़",
    namePa: "ਪਿਆਜ਼",
    categorySlug: "vegetables",
    aliases: ["onion", "onions", "pyaz", "pyaaz", "piyaz", "kanda", "प्याज", "प्याज़", "ਪਿਆਜ"],
    emoji: "🧅",
  },
  {
    key: "potato",
    name: "Potatoes",
    nameHi: "आलू",
    namePa: "ਆਲੂ",
    categorySlug: "vegetables",
    aliases: ["potato", "potatoes", "aloo", "alu", "आलू", "ਆਲੂ"],
    emoji: "🥔",
  },
  {
    key: "cauliflower",
    name: "Cauliflower",
    nameHi: "फूलगोभी",
    namePa: "ਫੁੱਲ ਗੋਭੀ",
    categorySlug: "vegetables",
    aliases: ["cauliflower", "gobhi", "phool gobhi", "phoolgobhi", "फूलगोभी", "गोभी", "ਗੋਭੀ"],
    emoji: "🥬",
  },
  {
    key: "capsicum",
    name: "Capsicum",
    nameHi: "शिमला मिर्च",
    namePa: "ਸ਼ਿਮਲਾ ਮਿਰਚ",
    categorySlug: "vegetables",
    aliases: ["capsicum", "shimla mirch", "shimlamirch", "bell pepper", "शिमला मिर्च", "ਸ਼ਿਮਲਾ ਮਿਰਚ"],
    emoji: "🫑",
  },
  {
    key: "brinjal",
    name: "Brinjal",
    nameHi: "बैंगन",
    namePa: "ਬੈਂਗਣ",
    categorySlug: "vegetables",
    aliases: ["brinjal", "baingan", "began", "eggplant", "aubergine", "बैंगन", "ਬੈਂਗਣ"],
    emoji: "🍆",
  },
  {
    key: "okra",
    name: "Okra",
    nameHi: "भिंडी",
    namePa: "ਭਿੰਡੀ",
    categorySlug: "vegetables",
    aliases: ["okra", "bhindi", "ladyfinger", "भिंडी", "ਭਿੰਡੀ"],
    emoji: "🌿",
  },
  {
    key: "cucumber",
    name: "Cucumber",
    nameHi: "खीरा",
    namePa: "ਖੀਰਾ",
    categorySlug: "vegetables",
    aliases: ["cucumber", "kheera", "khira", "खीरा", "ਖੀਰਾ"],
    emoji: "🥒",
  },
  {
    key: "carrot",
    name: "Carrots",
    nameHi: "गाजर",
    namePa: "ਗਾਜਰ",
    categorySlug: "vegetables",
    aliases: ["carrot", "carrots", "gajar", "गाजर", "ਗਾਜਰ"],
    emoji: "🥕",
  },
  {
    key: "spinach",
    name: "Spinach",
    nameHi: "पालक",
    namePa: "ਪਾਲਕ",
    categorySlug: "vegetables",
    aliases: ["spinach", "palak", "पालक", "ਪਾਲਕ"],
    emoji: "🥬",
  },
  {
    key: "peas",
    name: "Green peas",
    nameHi: "मटर",
    namePa: "ਮਟਰ",
    categorySlug: "vegetables",
    aliases: ["peas", "matar", "green peas", "मटर", "ਮਟਰ"],
    emoji: "🫛",
  },
  {
    key: "ginger",
    name: "Ginger",
    nameHi: "अदरक",
    namePa: "ਅਦਰਕ",
    categorySlug: "spices",
    aliases: ["ginger", "adrak", "अदरक", "ਅਦਰਕ"],
    emoji: "🫚",
  },
  {
    key: "garlic",
    name: "Garlic",
    nameHi: "लहसुन",
    namePa: "ਲਹਿਸਣ",
    categorySlug: "spices",
    aliases: ["garlic", "lehsun", "lahsun", "लहसुन", "ਲਹਿਸਣ"],
    emoji: "🧄",
  },
  {
    key: "chilli",
    name: "Green chilli",
    nameHi: "हरी मिर्च",
    namePa: "ਹਰੀ ਮਿਰਚ",
    categorySlug: "spices",
    aliases: ["chilli", "chili", "mirch", "mirchi", "green chilli", "मिर्च", "मिर्ची", "ਮਿਰਚ"],
    emoji: "🌶️",
  },
  {
    key: "turmeric",
    name: "Turmeric",
    nameHi: "हल्दी",
    namePa: "ਹਲਦੀ",
    categorySlug: "spices",
    aliases: ["turmeric", "haldi", "हल्दी", "ਹਲਦੀ"],
    emoji: "🟡",
  },
  {
    key: "coriander",
    name: "Coriander",
    nameHi: "धनिया",
    namePa: "ਧਨੀਆ",
    categorySlug: "spices",
    aliases: ["coriander", "dhaniya", "dhania", "धनिया", "ਧਨੀਆ"],
    emoji: "🌿",
  },
  {
    key: "wheat",
    name: "Wheat",
    nameHi: "गेहूं",
    namePa: "ਕਣਕ",
    categorySlug: "grains",
    aliases: ["wheat", "gehun", "gehu", "kanak", "गेहूं", "गेहूँ", "ਕਣਕ"],
    emoji: "🌾",
  },
  {
    key: "paddy",
    name: "Paddy (rice)",
    nameHi: "धान",
    namePa: "ਝੋਨਾ",
    categorySlug: "grains",
    aliases: ["paddy", "rice", "dhan", "chawal", "jhonha", "झोना", "धान", "चावल", "ਝੋਨਾ"],
    emoji: "🌾",
  },
  {
    key: "maize",
    name: "Maize",
    nameHi: "मक्का",
    namePa: "ਮੱਕੀ",
    categorySlug: "grains",
    aliases: ["maize", "makka", "makki", "corn", "मक्का", "ਮੱਕੀ"],
    emoji: "🌽",
  },
  {
    key: "chickpea",
    name: "Chickpea (chana)",
    nameHi: "चना",
    namePa: "ਛੋਲੇ",
    categorySlug: "pulses",
    aliases: ["chickpea", "chana", "chane", "gram", "चना", "ਛੋਲੇ"],
    emoji: "🫘",
  },
  {
    key: "moong",
    name: "Moong dal",
    nameHi: "मूंग",
    namePa: "ਮੂੰਗੀ",
    categorySlug: "pulses",
    aliases: ["moong", "mung", "green gram", "मूंग", "ਮੂੰਗੀ"],
    emoji: "🫘",
  },
  {
    key: "arhar",
    name: "Arhar (toor dal)",
    nameHi: "अरहर",
    namePa: "ਅਰਹਰ",
    categorySlug: "pulses",
    aliases: ["arhar", "toor", "tur", "pigeon pea", "अरहर", "ਤੂਰ"],
    emoji: "🫘",
  },
  {
    key: "mustard",
    name: "Mustard",
    nameHi: "सरसों",
    namePa: "ਸਰੋਂ",
    categorySlug: "pulses",
    aliases: ["mustard", "sarson", "sarso", "सरसों", "ਸਰੋਂ"],
    emoji: "🌻",
  },
  {
    key: "mango",
    name: "Mangoes",
    nameHi: "आम",
    namePa: "ਅੰਬ",
    categorySlug: "fruits",
    aliases: ["mango", "mangoes", "aam", "आम", "ਅੰਬ"],
    emoji: "🥭",
  },
  {
    key: "banana",
    name: "Bananas",
    nameHi: "केला",
    namePa: "ਕੇਲਾ",
    categorySlug: "fruits",
    aliases: ["banana", "bananas", "kela", "केला", "ਕੇਲਾ"],
    emoji: "🍌",
  },
  {
    key: "apple",
    name: "Apples",
    nameHi: "सेब",
    namePa: "ਸੇਬ",
    categorySlug: "fruits",
    aliases: ["apple", "apples", "seb", "सेब", "ਸੇਬ"],
    emoji: "🍎",
  },
  {
    key: "guava",
    name: "Guava",
    nameHi: "अमरूद",
    namePa: "ਅਮਰੂਦ",
    categorySlug: "fruits",
    aliases: ["guava", "amrud", "amrood", "अमरूद", "ਅਮਰੂਦ"],
    emoji: "🍐",
  },
  {
    key: "kinnow",
    name: "Kinnow",
    nameHi: "किन्नू",
    namePa: "ਕਿੰਨੂ",
    categorySlug: "fruits",
    aliases: ["kinnow", "kinnu", "orange", "santra", "किन्नू", "संतरा", "ਕਿੰਨੂ"],
    emoji: "🍊",
  },
  {
    key: "grapes",
    name: "Grapes",
    nameHi: "अंगूर",
    namePa: "ਅੰਗੂਰ",
    categorySlug: "fruits",
    aliases: ["grapes", "grape", "angoor", "अंगूर", "ਅੰਗੂਰ"],
    emoji: "🍇",
  },
  {
    key: "watermelon",
    name: "Watermelon",
    nameHi: "तरबूज़",
    namePa: "ਤਰਬੂਜ਼",
    categorySlug: "fruits",
    aliases: ["watermelon", "tarbooz", "tarbuj", "तरबूज", "तरबूज़", "ਤਰਬੂਜ"],
    emoji: "🍉",
  },
  {
    key: "papaya",
    name: "Papaya",
    nameHi: "पपीता",
    namePa: "ਪਪੀਤਾ",
    categorySlug: "fruits",
    aliases: ["papaya", "papita", "पपीता", "ਪਪੀਤਾ"],
    emoji: "🍈",
  },
  {
    key: "lemon",
    name: "Lemon",
    nameHi: "नींबू",
    namePa: "ਨਿੰਬੂ",
    categorySlug: "fruits",
    aliases: ["lemon", "nimbu", "नींबू", "ਨਿੰਬੂ"],
    emoji: "🍋",
  },
];

const COMMODITY_INDEX = new Map<string, CommodityEntry>();
for (const entry of COMMODITIES) {
  COMMODITY_INDEX.set(entry.key, entry);
  COMMODITY_INDEX.set(entry.name.toLowerCase(), entry);
  for (const alias of entry.aliases) {
    COMMODITY_INDEX.set(alias.toLowerCase(), entry);
  }
}

export function findCommodity(text: string): CommodityEntry | null {
  const lower = text.toLowerCase();
  // Longest alias first so "shimla mirch" wins over "mirch".
  const aliases = Array.from(COMMODITY_INDEX.keys()).sort((a, b) => b.length - a.length);
  for (const alias of aliases) {
    if (alias.length < 3) continue;
    if (new RegExp(`(^|[^\\p{L}])${escapeRegex(alias)}($|[^\\p{L}])`, "u").test(lower)) {
      return COMMODITY_INDEX.get(alias) ?? null;
    }
  }
  return null;
}

export function commodityByKey(key: string): CommodityEntry | null {
  return COMMODITY_INDEX.get(key.toLowerCase()) ?? null;
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Spoken numerals in Hindi/Punjabi-English, including fractional helpers. */
export const NUMBER_WORDS: Record<string, number> = {
  zero: 0, shunya: 0,
  one: 1, ek: 1, ik: 1, ਇੱਕ: 1, एक: 1,
  two: 2, do: 2, ਦੋ: 2, दो: 2,
  three: 3, teen: 3, tin: 3, ਤਿੰਨ: 3, तीन: 3,
  four: 4, char: 4, chaar: 4, ਚਾਰ: 4, चार: 4,
  five: 5, paanch: 5, panch: 5, ਪੰਜ: 5, पांच: 5, पाँच: 5,
  six: 6, chhe: 6, che: 6, ਛੇ: 6, छह: 6,
  seven: 7, saat: 7, sat: 7, ਸੱਤ: 7, सात: 7,
  eight: 8, aath: 8, ath: 8, ਅੱਠ: 8, आठ: 8,
  nine: 9, nau: 9, ਨੌਂ: 9, नौ: 9,
  ten: 10, das: 10, ਦਸ: 10, दस: 10,
  eleven: 11, gyarah: 11, ਗਿਆਰਾਂ: 11, ग्यारह: 11,
  twelve: 12, barah: 12, ਬਾਰਾਂ: 12, बारह: 12,
  fifteen: 15, pandrah: 15, ਪੰਦਰਾਂ: 15, पंद्रह: 15,
  twenty: 20, bees: 20, bis: 20, ਵੀਹ: 20, बीस: 20,
  twentyfive: 25, pachees: 25, pachis: 25, ਪੱਚੀ: 25, पच्चीस: 25,
  thirty: 30, tees: 30, tis: 30, ਤੀਹ: 30, तीस: 30,
  forty: 40, chalees: 40, chalis: 40, ਚਾਲੀ: 40, चालीस: 40,
  fifty: 50, pachaas: 50, pachas: 50, ਪੰਜਾਹ: 50, पचास: 50,
  sixty: 60, saath: 60, sath: 60, ਸੱਠ: 60, साठ: 60,
  seventy: 70, sattar: 70, ਸੱਤਰ: 70, सत्तर: 70,
  eighty: 80, assi: 80, asi: 80, ਅੱਸੀ: 80, अस्सी: 80,
  ninety: 90, nabbe: 90, nabbey: 90, ਨੱਬੇ: 90, नब्बे: 90,
  hundred: 100, sau: 100, so: 100, ਸੌ: 100, सौ: 100,
  thousand: 1000, hazar: 1000, hajar: 1000, hazaar: 1000, ਹਜ਼ਾਰ: 1000, हज़ार: 1000,
};

/** "dedh" = 1.5, "dhai" = 2.5, "sava" = 1.25, "paune" = -0.25 modifier. */
export const FRACTION_WORDS: Record<string, number> = {
  dedh: 1.5, ded: 1.5, dhai: 2.5, dhaai: 2.5, adha: 0.5, aadha: 0.5, ardha: 0.5,
  sava: 1.25, sawa: 1.25, paune: 0.75, pone: 0.75, teenchauthai: 0.75,
  ਡੇਢ: 1.5, ਦੋਗੁਣਾ: 2, ढाई: 2.5, डेढ़: 1.5, सवा: 1.25, पौने: 0.75,
};

export const UNIT_ALIASES: { unit: string; aliases: string[] }[] = [
  {
    unit: "quintal",
    aliases: ["quintal", "quintals", "kuntal", "क्विंटल", "ਕੁਇੰਟਲ", "ਕੁਇੰਟਲ੍"] ,
  },
  { unit: "tonne", aliases: ["tonne", "tonnes", "ton", "tons", "टन", "ਟਨ"] },
  { unit: "dozen", aliases: ["dozen", "dozens", "darjan", "दर्जन", "ਦਰਜਨ"] },
  { unit: "piece", aliases: ["piece", "pieces", "nag", "pc", "pcs", "पीस", "नग", "ਪੀਸ", "ਨਗ"] },
  {
    unit: "kg",
    aliases: [
      "kg",
      "kgs",
      "kilo",
      "kilos",
      "kilogram",
      "kilograms",
      "kilo gram",
      "किलो",
      "किलोग्राम",
      "ਕਿਲੋ",
      "ਕਿਲੋਗ੍ਰਾਮ",
    ],
  },
];

/** Every unit alias, longest first, as a regex alternation. */
export const UNIT_PATTERN = UNIT_ALIASES
  .flatMap((entry) => entry.aliases)
  .sort((a, b) => b.length - a.length)
  .map((alias) => alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
  .join("|");

export function normalizeUnit(token: string): string | null {
  const lower = token.toLowerCase();
  for (const entry of UNIT_ALIASES) {
    if (entry.aliases.includes(lower)) return entry.unit;
  }
  return null;
}

export interface PlaceEntry {
  name: string;
  district: string;
  state: string;
  lat: number;
  lng: number;
  aliases: string[];
}

/** Gazetteer of the Mohali / Punjab / Haryana / NCR sourcing belt. */
export const PLACES: PlaceEntry[] = [
  { name: "Mohali", district: "SAS Nagar", state: "Punjab", lat: 30.7046, lng: 76.7179, aliases: ["mohali", "sas nagar", "sahibzada ajit singh nagar", "mohali sahibzada", "मोहाली", "ਮੋਹਾਲੀ"] },
  { name: "Chandigarh", district: "Chandigarh", state: "Chandigarh", lat: 30.7333, lng: 76.7794, aliases: ["chandigarh", "chd", "ਚੰਡੀਗੜ੍ਹ", "चंडीगढ़"] },
  { name: "Kharar", district: "SAS Nagar", state: "Punjab", lat: 30.746, lng: 76.647, aliases: ["kharar", "ਖਰੜ", "खरड़"] },
  { name: "Zirakpur", district: "SAS Nagar", state: "Punjab", lat: 30.6425, lng: 76.8173, aliases: ["zirakpur", "ਜ਼ੀਰਕਪੁਰ", "ज़ीरकपुर"] },
  { name: "Dera Bassi", district: "SAS Nagar", state: "Punjab", lat: 30.5872, lng: 76.8421, aliases: ["dera bassi", "derabassi", "ਡੇਰਾ ਬੱਸੀ"] },
  { name: "Banur", district: "SAS Nagar", state: "Punjab", lat: 30.5544, lng: 76.7213, aliases: ["banur"] },
  { name: "Kurali", district: "SAS Nagar", state: "Punjab", lat: 30.8233, lng: 76.5783, aliases: ["kurali"] },
  { name: "Lalru", district: "SAS Nagar", state: "Punjab", lat: 30.517, lng: 76.7925, aliases: ["lalru"] },
  { name: "Morinda", district: "Rupnagar", state: "Punjab", lat: 30.7894, lng: 76.4975, aliases: ["morinda"] },
  { name: "Mullanpur", district: "SAS Nagar", state: "Punjab", lat: 30.7833, lng: 76.7, aliases: ["mullanpur", "mullanpur garibdass"] },
  { name: "Panchkula", district: "Panchkula", state: "Haryana", lat: 30.6942, lng: 76.8606, aliases: ["panchkula"] },
  { name: "Ambala", district: "Ambala", state: "Haryana", lat: 30.3782, lng: 76.7767, aliases: ["ambala", "ambala cantt"] },
  { name: "Patiala", district: "Patiala", state: "Punjab", lat: 30.3398, lng: 76.3869, aliases: ["patiala"] },
  { name: "Ludhiana", district: "Ludhiana", state: "Punjab", lat: 30.901, lng: 75.8573, aliases: ["ludhiana"] },
  { name: "Amritsar", district: "Amritsar", state: "Punjab", lat: 31.634, lng: 74.8723, aliases: ["amritsar"] },
  { name: "Jalandhar", district: "Jalandhar", state: "Punjab", lat: 31.326, lng: 75.5762, aliases: ["jalandhar", "jullundur"] },
  { name: "Bathinda", district: "Bathinda", state: "Punjab", lat: 30.211, lng: 74.9455, aliases: ["bathinda", "bhatinda"] },
  { name: "Sirsa", district: "Sirsa", state: "Haryana", lat: 29.5349, lng: 75.028, aliases: ["sirsa"] },
  { name: "Hisar", district: "Hisar", state: "Haryana", lat: 29.1492, lng: 75.7183, aliases: ["hisar", "hissar"] },
  { name: "Karnal", district: "Karnal", state: "Haryana", lat: 29.6857, lng: 76.9905, aliases: ["karnal"] },
  { name: "Panipat", district: "Panipat", state: "Haryana", lat: 29.3909, lng: 76.9635, aliases: ["panipat"] },
  { name: "Kurukshetra", district: "Kurukshetra", state: "Haryana", lat: 29.9695, lng: 76.8783, aliases: ["kurukshetra", "kurukshetra"] },
  { name: "Kaithal", district: "Kaithal", state: "Haryana", lat: 29.8015, lng: 76.3998, aliases: ["kaithal"] },
  { name: "Sonipat", district: "Sonipat", state: "Haryana", lat: 28.9931, lng: 77.0151, aliases: ["sonipat", "sonepat"] },
  { name: "Rohtak", district: "Rohtak", state: "Haryana", lat: 28.8955, lng: 76.6066, aliases: ["rohtak"] },
  { name: "Yamunanagar", district: "Yamunanagar", state: "Haryana", lat: 30.129, lng: 77.2674, aliases: ["yamunanagar", "jagadhri"] },
  { name: "Delhi", district: "Delhi", state: "Delhi", lat: 28.6139, lng: 77.209, aliases: ["delhi", "new delhi", "azadpur"] },
  { name: "Gurugram", district: "Gurugram", state: "Haryana", lat: 28.4595, lng: 77.0266, aliases: ["gurugram", "gurgaon"] },
  { name: "Faridabad", district: "Faridabad", state: "Haryana", lat: 28.4089, lng: 77.3178, aliases: ["faridabad"] },
  { name: "Noida", district: "Gautam Buddha Nagar", state: "Uttar Pradesh", lat: 28.5355, lng: 77.391, aliases: ["noida", "greater noida"] },
  { name: "Meerut", district: "Meerut", state: "Uttar Pradesh", lat: 28.9845, lng: 77.7064, aliases: ["meerut"] },
  { name: "Jaipur", district: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, aliases: ["jaipur"] },
];

export function findPlace(text: string): PlaceEntry | null {
  const lower = text.toLowerCase();
  const sorted = [...PLACES].sort((a, b) => b.name.length - a.name.length);
  for (const place of sorted) {
    for (const alias of [place.name.toLowerCase(), ...place.aliases]) {
      if (new RegExp(`(^|[^\\p{L}])${escapeRegex(alias)}($|[^\\p{L}])`, "u").test(lower)) {
        return place;
      }
    }
  }
  return null;
}

export const GRADE_WORDS: { grade: string; aliases: string[] }[] = [
  { grade: "A", aliases: ["grade a", "a grade", "premium", "export quality", "first grade"] },
  { grade: "B", aliases: ["grade b", "b grade", "second grade"] },
  { grade: "C", aliases: ["grade c", "c grade", "local grade"] },
];
