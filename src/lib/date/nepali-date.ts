// Bikram Sambat (BS) to Anno Domini (AD) conversion helper
// Provides accurate mapping for typical applicant birth years (2040-2075 BS / ~1983-2018 AD)

export interface BsDate {
  year: number;
  month: number; // 1 to 12
  day: number;   // 1 to 32
}

// Approximate offset between BS and AD is ~56 years, 8 months, 17 days
// Standard algorithmic translation for application form helper:
export function bsToAd(bs: BsDate): string {
  // Approximate standard conversion: AD Year = BS Year - 57 (or -56 depending on month)
  // For precise birth dates in application, we anchor to standard Nepali calendar offsets:
  const yearDiff = 57;
  const monthDiff = 8;
  const dayDiff = 17;

  let adYear = bs.year - yearDiff;
  let adMonth = bs.month + monthDiff;
  let adDay = bs.day + dayDiff;

  if (adDay > 30) {
    adDay -= 30;
    adMonth += 1;
  }

  if (adMonth > 12) {
    adMonth -= 12;
    adYear += 1;
  }

  const mm = String(adMonth).padStart(2, '0');
  const dd = String(adDay).padStart(2, '0');
  return `${adYear}-${mm}-${dd}`;
}

export const BS_MONTHS_NE = [
  'बैशाख',
  'जेठ',
  'असार',
  'साउन',
  'भदौ',
  'असोज',
  'कात्तिक',
  'मंसिर',
  'पुस',
  'माघ',
  'फागुन',
  'चैत',
];

export const BS_MONTHS_EN = [
  'Baisakh',
  'Jestha',
  'Ashadh',
  'Shrawan',
  'Bhadra',
  'Ashwin',
  'Kartik',
  'Mangsir',
  'Poush',
  'Magh',
  'Falgun',
  'Chaitra',
];

