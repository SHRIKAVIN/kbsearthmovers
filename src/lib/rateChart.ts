/*
 * Rate chart, copied verbatim from the KBS Harvester Rental Calculator
 * (kbs_calculator/src/data/rateChart.ts).
 *
 * Kept as data rather than computed from minutes * rate / 60 so the driver app and
 * the calculator can never disagree by a rupee on the same job. The values do follow
 * that formula rounded to paise, and a test asserts it - so if a row is ever edited
 * by hand here, it gets caught rather than quietly diverging from the calculator.
 */
export const rateChart = {
  2300: {
    1: 38.33, 2: 76.67, 3: 115, 4: 153.33, 5: 191.67, 6: 230, 7: 268.33, 8: 306.67, 9: 345, 10: 383.33,
    11: 421.67, 12: 460, 13: 498.33, 14: 536.67, 15: 575, 16: 613.33, 17: 651.67, 18: 690, 19: 728.33, 20: 766.67,
    21: 805, 22: 843.33, 23: 881.67, 24: 920, 25: 958.33, 26: 996.67, 27: 1035, 28: 1073.33, 29: 1111.67, 30: 1150,
    31: 1188.33, 32: 1226.67, 33: 1265, 34: 1303.33, 35: 1341.67, 36: 1380, 37: 1418.33, 38: 1456.67, 39: 1495, 40: 1533.33,
    41: 1571.67, 42: 1610, 43: 1648.33, 44: 1686.67, 45: 1725, 46: 1763.33, 47: 1801.67, 48: 1840, 49: 1878.33, 50: 1916.67,
    51: 1955, 52: 1993.33, 53: 2031.67, 54: 2070, 55: 2108.33, 56: 2146.67, 57: 2185, 58: 2223.33, 59: 2261.67, 60: 2300
  },
  2400: {
    1: 40, 2: 80, 3: 120, 4: 160, 5: 200, 6: 240, 7: 280, 8: 320, 9: 360, 10: 400,
    11: 440, 12: 480, 13: 520, 14: 560, 15: 600, 16: 640, 17: 680, 18: 720, 19: 760, 20: 800,
    21: 840, 22: 880, 23: 920, 24: 960, 25: 1000, 26: 1040, 27: 1080, 28: 1120, 29: 1160, 30: 1200,
    31: 1240, 32: 1280, 33: 1320, 34: 1360, 35: 1400, 36: 1440, 37: 1480, 38: 1520, 39: 1560, 40: 1600,
    41: 1640, 42: 1680, 43: 1720, 44: 1760, 45: 1800, 46: 1840, 47: 1880, 48: 1920, 49: 1960, 50: 2000,
    51: 2040, 52: 2080, 53: 2120, 54: 2160, 55: 2200, 56: 2240, 57: 2280, 58: 2320, 59: 2360, 60: 2400
  },
  2500: {
    1: 41.67, 2: 83.33, 3: 125, 4: 166.67, 5: 208.33, 6: 250, 7: 291.67, 8: 333.33, 9: 375, 10: 416.67,
    11: 458.33, 12: 500, 13: 541.67, 14: 583.33, 15: 625, 16: 666.67, 17: 708.33, 18: 750, 19: 791.67, 20: 833.33,
    21: 875, 22: 916.67, 23: 958.33, 24: 1000, 25: 1041.67, 26: 1083.33, 27: 1125, 28: 1166.67, 29: 1208.33, 30: 1250,
    31: 1291.67, 32: 1333.33, 33: 1375, 34: 1416.67, 35: 1458.33, 36: 1500, 37: 1541.67, 38: 1583.33, 39: 1625, 40: 1666.67,
    41: 1708.33, 42: 1750, 43: 1791.67, 44: 1833.33, 45: 1875, 46: 1916.67, 47: 1958.33, 48: 2000, 49: 2041.67, 50: 2083.33,
    51: 2125, 52: 2166.67, 53: 2208.33, 54: 2250, 55: 2291.67, 56: 2333.33, 57: 2375, 58: 2416.67, 59: 2458.33, 60: 2500
  },
  2600: {
    1: 43.33, 2: 86.67, 3: 130, 4: 173.33, 5: 216.67, 6: 260, 7: 303.33, 8: 346.67, 9: 390, 10: 433.33,
    11: 476.67, 12: 520, 13: 563.33, 14: 606.67, 15: 650, 16: 693.33, 17: 736.67, 18: 780, 19: 823.33, 20: 866.67,
    21: 910, 22: 953.33, 23: 996.67, 24: 1040, 25: 1083.33, 26: 1126.67, 27: 1170, 28: 1213.33, 29: 1256.67, 30: 1300,
    31: 1343.33, 32: 1386.67, 33: 1430, 34: 1473.33, 35: 1516.67, 36: 1560, 37: 1603.33, 38: 1646.67, 39: 1690, 40: 1733.33,
    41: 1776.67, 42: 1820, 43: 1863.33, 44: 1906.67, 45: 1950, 46: 1993.33, 47: 2036.67, 48: 2080, 49: 2123.33, 50: 2166.67,
    51: 2210, 52: 2253.33, 53: 2296.67, 54: 2340, 55: 2383.33, 56: 2426.67, 57: 2470, 58: 2513.33, 59: 2556.67, 60: 2600
  },
  2700: {
    1: 45, 2: 90, 3: 135, 4: 180, 5: 225, 6: 270, 7: 315, 8: 360, 9: 405, 10: 450,
    11: 495, 12: 540, 13: 585, 14: 630, 15: 675, 16: 720, 17: 765, 18: 810, 19: 855, 20: 900,
    21: 945, 22: 990, 23: 1035, 24: 1080, 25: 1125, 26: 1170, 27: 1215, 28: 1260, 29: 1305, 30: 1350,
    31: 1395, 32: 1440, 33: 1485, 34: 1530, 35: 1575, 36: 1620, 37: 1665, 38: 1710, 39: 1755, 40: 1800,
    41: 1845, 42: 1890, 43: 1935, 44: 1980, 45: 2025, 46: 2070, 47: 2115, 48: 2160, 49: 2205, 50: 2250,
    51: 2295, 52: 2340, 53: 2385, 54: 2430, 55: 2475, 56: 2520, 57: 2565, 58: 2610, 59: 2655, 60: 2700
  }
};

export type HourlyRate = keyof typeof rateChart;
export const hourlyRateOptions: HourlyRate[] = [2300, 2400, 2500, 2600, 2700];

/**
 * The rate drivers charge. Fixed rather than chosen: a driver at the roadside quotes
 * the agreed rate, and letting them pick one invites an argument with the customer
 * and an inconsistent ledger. The other rates stay available for admin use.
 */
export const DRIVER_RATE: HourlyRate = 2600;

/**
 * Total for a job, matching calculateRentalCost() in the calculator exactly:
 * whole hours at the full rate, plus the charted cost of the leftover minutes.
 */
export function calculateRentalCost(
  hourlyRate: HourlyRate,
  hours: number,
  minutes: number
): { hoursCost: number; minutesCost: number; totalCost: number } {
  const hoursCost = (Number(hours) || 0) * hourlyRate;
  const mins = Number(minutes) || 0;
  const minutesCost =
    mins > 0 ? rateChart[hourlyRate][mins as keyof (typeof rateChart)[HourlyRate]] || 0 : 0;
  return { hoursCost, minutesCost, totalCost: hoursCost + minutesCost };
}

/**
 * Hours and minutes as the H.MM base-60 value work_entries has always stored:
 * 4h 30m becomes 4.30, not 4.5. Every existing row, export and report reads it that
 * way, so the new inputs compose into the old format rather than changing it.
 */
export function toHoursMinutesValue(hours: number, minutes: number): number {
  const h = Math.max(0, Math.floor(Number(hours) || 0));
  const m = Math.min(59, Math.max(0, Math.floor(Number(minutes) || 0)));
  return Number(`${h}.${String(m).padStart(2, '0')}`);
}

/** The inverse, for editing a job that already exists. */
export function fromHoursMinutesValue(value: number): { hours: number; minutes: number } {
  const v = Number(value) || 0;
  const hours = Math.floor(v);
  return { hours, minutes: Math.round((v - hours) * 100) };
}
