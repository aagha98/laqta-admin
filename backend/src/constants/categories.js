// Part categories map to a salvage yard's specialty. A request inherits its
// category from the vehicle make so suppliers only get notified about cars
// they actually stock parts for.
export const CATEGORIES = ['japanese', 'korean', 'american', 'european', 'chinese', 'other'];

const MAKE_TO_CATEGORY = {
  toyota: 'japanese',
  lexus: 'japanese',
  nissan: 'japanese',
  infiniti: 'japanese',
  honda: 'japanese',
  mitsubishi: 'japanese',
  mazda: 'japanese',
  suzuki: 'japanese',
  subaru: 'japanese',
  isuzu: 'japanese',
  hyundai: 'korean',
  kia: 'korean',
  genesis: 'korean',
  ford: 'american',
  chevrolet: 'american',
  gmc: 'american',
  dodge: 'american',
  jeep: 'american',
  cadillac: 'american',
  chrysler: 'american',
  lincoln: 'american',
  'mercedes-benz': 'european',
  mercedes: 'european',
  bmw: 'european',
  audi: 'european',
  volkswagen: 'european',
  'land rover': 'european',
  porsche: 'european',
  volvo: 'european',
  peugeot: 'european',
  renault: 'european',
  mg: 'chinese',
  changan: 'chinese',
  gac: 'chinese',
  geely: 'chinese',
  byd: 'chinese',
  haval: 'chinese',
  chery: 'chinese',
  jetour: 'chinese',
  // Arabic spellings used by the app's make picker.
  'تويوتا': 'japanese',
  'لكزس': 'japanese',
  'نيسان': 'japanese',
  'إنفينيتي': 'japanese',
  'انفينيتي': 'japanese',
  'هوندا': 'japanese',
  'ميتسوبيشي': 'japanese',
  'مازدا': 'japanese',
  'سوزوكي': 'japanese',
  'هيونداي': 'korean',
  'كيا': 'korean',
  'جينيسيس': 'korean',
  'فورد': 'american',
  'شفروليه': 'american',
  'شيفروليه': 'american',
  'جي إم سي': 'american',
  'جمس': 'american',
  'دودج': 'american',
  'جيب': 'american',
  'مرسيدس بنز': 'european',
  'مرسيدس': 'european',
  'بي إم دبليو': 'european',
  'أودي': 'european',
  'اودي': 'european',
  'فولكس واجن': 'european',
  'لاند روفر': 'european',
  'إم جي': 'chinese',
  'ام جي': 'chinese',
  'شانجان': 'chinese',
  'جي إيه سي': 'chinese',
};

export function categoryForMake(make) {
  if (!make) return 'other';
  return MAKE_TO_CATEGORY[String(make).trim().toLowerCase()] || 'other';
}

export function isValidCategory(value) {
  return CATEGORIES.includes(value);
}
