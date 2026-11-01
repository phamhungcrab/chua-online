/**
 * Vietnamese Lunar Calendar Calculator (Thuật toán Âm Lịch Việt Nam chuẩn UTC+7)
 * Tính toán chính xác ngày âm, tháng âm, năm Can Chi, tiết khí và các ngày vía Phật giáo lớn.
 */

export interface LunarDateResult {
  lunarDay: number;
  lunarMonth: number;
  lunarYear: number;
  isLeapMonth: boolean;
  canChiYear: string;
  canChiDay: string;
  solarDateStr: string;
  lunarDateStr: string;
  festivalTitle?: string;
  isFullMoonOrNewMoon: boolean;
}

const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'] as const;
const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'] as const;

// Traditional Buddhist festivals in Vietnamese Buddhist calendar (Âm lịch)
const BUDDHIST_FESTIVALS: Record<string, string> = {
  '1/1': 'Đại Lễ Phật Đán Di Lặc · Tết Nguyên Đán',
  '15/1': 'Đại Lễ Thượng Nguyên · Rằm Tháng Giêng',
  '8/2': 'Kỷ Niệm Đức Phật Thích Ca Xuất Gia',
  '15/2': 'Kỷ Niệm Đức Phật Thích Ca Nhập Niết Bàn',
  '19/2': 'Vía Đức Bồ Tát Quán Thế Âm (Đản Sanh)',
  '15/4': 'Đại Lễ Phật Đản (Vesak Tam Hợp)',
  '19/6': 'Vía Đức Bồ Tát Quán Thế Âm (Thành Đạo)',
  '15/7': 'Đại Lễ Vu Lan Báo Hiếu · Rằm Tháng Bảy',
  '13/7': 'Vía Đức Đại Thế Chí Bồ Tát',
  '30/7': 'Vía Đức Địa Tạng Vương Bồ Tát',
  '15/8': 'Đại Lễ Trung Thu · Rằm Tháng Tám',
  '19/9': 'Vía Đức Bồ Tát Quán Thế Âm (Xuất Gia)',
  '30/9': 'Vía Đức Phật Dược Sư Lưu Ly Quang Vương',
  '15/10': 'Đại Lễ Hạ Nguyên · Rằm Tháng Mười',
  '17/11': 'Đại Lễ Vía Đức Phật A Di Đà',
  '8/12': 'Kỷ Niệm Đức Phật Thích Ca Thành Đạo'
};

/**
 * Astronomical calculation helper functions for Vietnam timezone (UTC+7)
 */
function jdFromDate(dd: number, mm: number, yy: number): number {
  const a = Math.floor((14 - mm) / 12);
  const y = yy + 4800 - a;
  const m = mm + 12 * a - 3;
  let jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  if (jd < 2299161) {
    jd = dd + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
  }
  return jd;
}

function jdToDate(jd: number): [number, number, number] {
  let a = jd;
  if (jd > 2299160) {
    const alpha = Math.floor((jd - 1867216.25) / 36524.25);
    a = jd + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  return [day, month, year];
}

function getNewMoonDay(k: number, timeZone = 7): number {
  const T = k / 1236.85;
  const T2 = T * T;
  const T3 = T2 * T;
  const dr = Math.PI / 180;
  let Jd1 =
    2415020.75933 +
    29.53058868 * k +
    0.0001178 * T2 -
    0.000000155 * T3 +
    0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
  const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
  const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
  const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
  const C1 =
    (0.1734 - 0.000393 * T) * Math.sin(M * dr) +
    0.0021 * Math.sin(2 * dr * M) -
    0.4068 * Math.sin(Mpr * dr) +
    0.0161 * Math.sin(2 * dr * Mpr) -
    0.0004 * Math.sin(3 * dr * Mpr) +
    0.0104 * Math.sin(2 * dr * F) -
    0.0051 * Math.sin((M + Mpr) * dr) -
    0.0074 * Math.sin((M - Mpr) * dr) +
    0.0004 * Math.sin((2 * F + M) * dr) -
    0.0004 * Math.sin((2 * F - M) * dr) -
    0.0006 * Math.sin((2 * F + Mpr) * dr) +
    0.001 * Math.sin((2 * F - Mpr) * dr) +
    0.0005 * Math.sin((2 * Mpr + M) * dr);
  const Jd = Jd1 + C1;
  return Math.floor(Jd + 0.5 + timeZone / 24);
}

function getSunLongitude(jdn: number, timeZone = 7): number {
  const T = (jdn - 2451545.5 - timeZone / 24) / 36525;
  const dr = Math.PI / 180;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const C =
    (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(M * dr) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * M * dr) +
    0.000289 * Math.sin(3 * M * dr);
  let theta = L0 + C;
  theta = theta * dr;
  theta = theta - Math.PI * 2 * Math.floor(theta / (Math.PI * 2));
  return Math.floor((theta / Math.PI) * 6);
}

function getLunarMonth11(yy: number, timeZone = 7): number {
  const off = jdFromDate(31, 12, yy) - 2415021;
  const k = Math.floor(off / 29.530588853);
  let nm = getNewMoonDay(k, timeZone);
  const sunLong = getSunLongitude(nm, timeZone);
  if (sunLong >= 9) {
    nm = getNewMoonDay(k - 1, timeZone);
  }
  return nm;
}

export function convertSolarToLunar(dd: number, mm: number, yy: number, timeZone = 7): [number, number, number, boolean] {
  const dayNumber = jdFromDate(dd, mm, yy);
  const k = Math.floor((dayNumber - 2415021.076998695) / 29.530588853);
  let lastNewMoon = getNewMoonDay(k, timeZone);
  if (lastNewMoon > dayNumber) {
    lastNewMoon = getNewMoonDay(k - 1, timeZone);
  }
  const nextNewMoon = getNewMoonDay(k + 1, timeZone);

  let a11 = getLunarMonth11(yy, timeZone);
  let b11 = a11;
  let lunarYear: number;
  if (a11 >= lastNewMoon) {
    lunarYear = yy;
    a11 = getLunarMonth11(yy - 1, timeZone);
  } else {
    lunarYear = yy + 1;
    b11 = getLunarMonth11(yy + 1, timeZone);
  }

  const lunarDay = dayNumber - lastNewMoon + 1;
  const diff = Math.floor((lastNewMoon - a11) / 29);
  let lunarMonth = diff + 11;
  let isLeap = false;

  if (b11 - a11 > 365) {
    const leapMonthDiff = Math.floor((b11 - a11) / 29.53);
    if (diff >= leapMonthDiff) {
      lunarMonth = diff + 10;
      if (diff === leapMonthDiff) isLeap = true;
    }
  }

  if (lunarMonth > 12) {
    lunarMonth -= 12;
  }
  if (lunarMonth >= 11 && diff < 4) {
    lunarYear -= 1;
  }

  return [lunarDay, lunarMonth, lunarYear, isLeap];
}

export function getCanChiYear(lunarYear: number): string {
  const canIndex = (lunarYear + 6) % 10;
  const chiIndex = (lunarYear + 8) % 12;
  return `${CAN[canIndex]} ${CHI[chiIndex]}`;
}

export function getCanChiDay(jd: number): string {
  const canIndex = (jd + 9) % 10;
  const chiIndex = (jd + 1) % 12;
  return `${CAN[canIndex]} ${CHI[chiIndex]}`;
}

/**
 * Returns comprehensive lunar information for today or a specific Date in Vietnam.
 */
export function getVietnameseLunarInfo(date = new Date()): LunarDateResult {
  // Convert to UTC+7 Vietnam time
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const vnDate = new Date(utc + 7 * 3600000);
  const dd = vnDate.getDate();
  const mm = vnDate.getMonth() + 1;
  const yy = vnDate.getFullYear();

  const jd = jdFromDate(dd, mm, yy);
  const [lunarDay, lunarMonth, lunarYear, isLeapMonth] = convertSolarToLunar(dd, mm, yy, 7);
  const canChiYear = getCanChiYear(lunarYear);
  const canChiDay = getCanChiDay(jd);

  const festKey = `${lunarDay}/${lunarMonth}`;
  let festivalTitle = BUDDHIST_FESTIVALS[festKey];

  if (!festivalTitle) {
    if (lunarDay === 1) {
      festivalTitle = `Mùng Một Đầu Tháng (Sóc) · Tiết Lễ Cầu An`;
    } else if (lunarDay === 15) {
      festivalTitle = `Ngày Rằm Tịnh Tâm (Vọng) · Khai Mở Đại Lễ Hoa Đăng`;
    } else if (lunarDay === 14) {
      festivalTitle = `Ngày Mười Bốn · Tiền Lễ Hoa Đăng`;
    } else if (lunarDay === 30 || lunarDay === 29) {
      festivalTitle = `Ngày Cuối Tháng (Hối) · Tạ Lễ Tam Bảo`;
    }
  }

  const isFullMoonOrNewMoon = lunarDay === 1 || lunarDay === 15;

  return {
    lunarDay,
    lunarMonth,
    lunarYear,
    isLeapMonth,
    canChiYear,
    canChiDay,
    solarDateStr: `${dd < 10 ? '0' : ''}${dd}/${mm < 10 ? '0' : ''}${mm}/${yy}`,
    lunarDateStr: `Ngày ${lunarDay} tháng ${lunarMonth}${isLeapMonth ? ' (Nhuận)' : ''} năm ${canChiYear}`,
    festivalTitle,
    isFullMoonOrNewMoon
  };
}
