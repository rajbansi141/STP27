// Exact Bikram Sambat (BS) <-> Gregorian (AD) Astronomical Conversion & Utilities
// Accurate calendar lookup covering 2000 BS to 2090 BS (~1943 AD to 2034 AD)

export interface BsDate {
  year: number;
  month: number; // 1 to 12
  day: number;   // 1 to 32
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
  'पौष',
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

export const AD_MONTHS_EN = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export const AD_MONTHS_NE = [
  'जनवरी',
  'फेब्रुअरी',
  'मार्च',
  'अप्रिल',
  'मे',
  'जुन',
  'जुलाई',
  'अगस्ट',
  'सेप्टेम्बर',
  'अक्टोबर',
  'नोभेम्बर',
  'डिसेम्बर',
];

// Official Nepali Calendar Days in Month mapping (2000 BS - 2090 BS)
// Array format: [ year, Baisakh, Jestha, ..., Chaitra ]
const BS_CALENDAR_DATA: number[][] = [
  [ 2000, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31 ],
  [ 2001, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2002, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30 ],
  [ 2003, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31 ],
  [ 2004, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31 ],
  [ 2005, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2006, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30 ],
  [ 2007, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31 ],
  [ 2008, 31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31 ],
  [ 2009, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2010, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30 ],
  [ 2011, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31 ],
  [ 2012, 31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30 ],
  [ 2013, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2014, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30 ],
  [ 2015, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31 ],
  [ 2016, 31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30 ],
  [ 2017, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2018, 31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30 ],
  [ 2019, 31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31 ],
  [ 2020, 31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2021, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2022, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30 ],
  [ 2023, 31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31 ],
  [ 2024, 31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2025, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2026, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31 ],
  [ 2027, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31 ],
  [ 2028, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2029, 31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30 ],
  [ 2030, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31 ],
  [ 2031, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31 ],
  [ 2032, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2033, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30 ],
  [ 2034, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31 ],
  [ 2035, 30, 32, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31 ],
  [ 2036, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2037, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30 ],
  [ 2038, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31 ],
  [ 2039, 31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30 ],
  [ 2040, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2041, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30 ],
  [ 2042, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31 ],
  [ 2043, 31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30 ],
  [ 2044, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2045, 31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30 ],
  [ 2046, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31 ],
  [ 2047, 31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2048, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2049, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30 ],
  [ 2050, 31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31 ],
  [ 2051, 31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2052, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2053, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30 ],
  [ 2054, 31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31 ],
  [ 2055, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2056, 31, 31, 32, 31, 32, 30, 30, 29, 30, 29, 30, 30 ],
  [ 2057, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31 ],
  [ 2058, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31 ],
  [ 2059, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2060, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30 ],
  [ 2061, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31 ],
  [ 2062, 30, 32, 31, 32, 31, 31, 29, 30, 29, 30, 29, 31 ],
  [ 2063, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2064, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30 ],
  [ 2065, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31 ],
  [ 2066, 31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 29, 31 ],
  [ 2067, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2068, 31, 31, 32, 32, 31, 30, 30, 29, 30, 29, 30, 30 ],
  [ 2069, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31 ],
  [ 2070, 31, 31, 31, 32, 31, 31, 29, 30, 30, 29, 30, 30 ],
  [ 2071, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2072, 31, 32, 31, 32, 31, 30, 30, 29, 30, 29, 30, 30 ],
  [ 2073, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 31 ],
  [ 2074, 31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2075, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2076, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30 ],
  [ 2077, 31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31 ],
  [ 2078, 31, 31, 31, 32, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2079, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2080, 31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30 ],
  [ 2081, 31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 31 ],
  [ 2082, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2083, 31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30 ],
  [ 2084, 31, 31, 32, 31, 31, 30, 30, 30, 29, 30, 30, 30 ],
  [ 2085, 31, 32, 31, 32, 30, 31, 30, 30, 29, 30, 30, 30 ],
  [ 2086, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30 ],
  [ 2087, 31, 31, 32, 31, 31, 31, 30, 30, 29, 30, 30, 30 ],
  [ 2088, 30, 31, 32, 32, 30, 31, 30, 30, 29, 30, 30, 30 ],
  [ 2089, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30 ],
  [ 2090, 30, 32, 31, 32, 31, 30, 30, 30, 29, 30, 30, 30 ]
];

function isLeapYear(year: number): boolean {
  if (year % 100 === 0) {
    return year % 400 === 0;
  }
  return year % 4 === 0;
}

/**
 * Exact astronomical conversion from Bikram Sambat (BS) to Gregorian (AD) Date string YYYY-MM-DD
 */
export function bsToAd(bs: BsDate): string {
  if (!bs || bs.year < 2000 || bs.year > 2090 || bs.month < 1 || bs.month > 12 || bs.day < 1) {
    return '';
  }

  const defEyy = 1943;
  const defEmm = 4;
  const defEdd = 14 - 1; // 13
  const defNyy = 2000;

  let totalNdays = 0;
  let k = 0;

  // Count total days up to target year
  for (let i = 0; i < bs.year - defNyy; i++) {
    for (let j = 1; j <= 12; j++) {
      totalNdays += BS_CALENDAR_DATA[k][j];
    }
    k++;
  }

  // Count total days in current year up to target month
  for (let j = 1; j < bs.month; j++) {
    totalNdays += BS_CALENDAR_DATA[k][j];
  }
  totalNdays += bs.day;

  let totalEdays = defEdd;
  let m = defEmm;
  let y = defEyy;

  const month = [0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const lmonth = [0, 31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  while (totalNdays !== 0) {
    const maxDays = isLeapYear(y) ? lmonth[m] : month[m];
    totalEdays++;
    if (totalEdays > maxDays) {
      m++;
      totalEdays = 1;
      if (m > 12) {
        y++;
        m = 1;
      }
    }
    totalNdays--;
  }

  return `${y}-${String(m).padStart(2, '0')}-${String(totalEdays).padStart(2, '0')}`;
}

/**
 * Exact astronomical conversion from Gregorian (AD) ISO string to Bikram Sambat (BS)
 */
export function adToBs(adDateStr: string): BsDate | null {
  if (!adDateStr || !/^\d{4}-\d{2}-\d{2}$/.test(adDateStr)) {
    return null;
  }

  const [yy, mm, dd] = adDateStr.split('-').map(Number);
  if (!yy || !mm || !dd || yy < 1944 || yy > 2033) {
    return null;
  }

  const month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const lmonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

  const defEyy = 1944;
  const defNyy = 2000;
  const defNmm = 9;
  const defNdd = 17 - 1; // 16

  let totalEdays = 0;

  for (let i = 0; i < yy - defEyy; i++) {
    const isLeap = isLeapYear(defEyy + i);
    for (let j = 0; j < 12; j++) {
      totalEdays += isLeap ? lmonth[j] : month[j];
    }
  }

  for (let i = 0; i < mm - 1; i++) {
    totalEdays += isLeapYear(yy) ? lmonth[i] : month[i];
  }
  totalEdays += dd;

  let i = 0;
  let j = defNmm;
  let totalNdays = defNdd;
  let m = defNmm;
  let y = defNyy;

  while (totalEdays !== 0) {
    const a = BS_CALENDAR_DATA[i][j];
    totalNdays++;
    if (totalNdays > a) {
      m++;
      totalNdays = 1;
      j++;
    }
    if (m > 12) {
      y++;
      m = 1;
    }
    if (j > 12) {
      j = 1;
      i++;
    }
    totalEdays--;
  }

  return { year: y, month: m, day: totalNdays };
}

/**
 * Calculate candidate age from Date of Birth (AD ISO string)
 */
export function calculateAge(dobAd: string): {
  years: number;
  months: number;
  isEligible: boolean;
  messageEn: string;
  messageNe: string;
} {
  if (!dobAd || !/^\d{4}-\d{2}-\d{2}$/.test(dobAd)) {
    return {
      years: 0,
      months: 0,
      isEligible: false,
      messageEn: 'Invalid date',
      messageNe: 'अमान्य मिति',
    };
  }

  const birthDate = new Date(dobAd);
  const today = new Date();

  if (isNaN(birthDate.getTime())) {
    return {
      years: 0,
      months: 0,
      isEligible: false,
      messageEn: 'Invalid date',
      messageNe: 'अमान्य मिति',
    };
  }

  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();

  if (months < 0 || (months === 0 && today.getDate() < birthDate.getDate())) {
    years--;
    months += 12;
  }

  const isEligible = years >= 18 && years <= 45;

  let messageEn = `${years} yrs old`;
  let messageNe = `${years} वर्ष`;

  if (years < 18) {
    messageEn = `${years} yrs (Min 18)`;
    messageNe = `${years} वर्ष (न्यूनतम १८)`;
  } else if (years > 45) {
    messageEn = `${years} yrs`;
    messageNe = `${years} वर्ष`;
  }

  return { years, months, isEligible, messageEn, messageNe };
}

/**
 * Formats BS Date nicely for display
 */
export function formatBsDate(bs: BsDate | null, isNe = false): string {
  if (!bs) return '—';
  const monthName = isNe
    ? BS_MONTHS_NE[bs.month - 1] || `${bs.month}`
    : BS_MONTHS_EN[bs.month - 1] || `${bs.month}`;

  return isNe
    ? `${bs.year} ${monthName} ${bs.day}`
    : `${monthName} ${bs.day}, ${bs.year} BS`;
}

/**
 * Formats AD Date nicely for display
 */
export function formatAdDate(adDateStr: string, isNe = false): string {
  if (!adDateStr) return '—';
  try {
    const d = new Date(adDateStr);
    if (isNaN(d.getTime())) return adDateStr;
    const months = isNe ? AD_MONTHS_NE : AD_MONTHS_EN;
    const day = d.getDate();
    const month = months[d.getMonth()];
    const year = d.getFullYear();
    return `${month} ${day}, ${year}`;
  } catch {
    return adDateStr;
  }
}

/**
 * Converts English digits (0-9) to Devanagari / Nepali digits
 */
export function toNepaliDigits(input: string | number): string {
  const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  return String(input).replace(/[0-9]/g, (char) => nepaliDigits[Number(char)] || char);
}
