const { getCurrentPeriodForDate } = require('../utils/subscriptionPeriods');

/** Calendar midnight in local TZ (matches member expiry job). */
function localMidnight(d = new Date()) {
  const t = new Date(d);
  t.setHours(0, 0, 0, 0);
  return t;
}

function addDays(base, n) {
  const t = new Date(base.getTime());
  t.setDate(t.getDate() + n);
  return t;
}

describe('getCurrentPeriodForDate', () => {
  const today = localMidnight();
  const noonToday = new Date(today.getTime() + 12 * 60 * 60 * 1000);

  it('returns null for empty or non-array periods', () => {
    expect(getCurrentPeriodForDate(null, noonToday)).toBeNull();
    expect(getCurrentPeriodForDate(undefined, noonToday)).toBeNull();
    expect(getCurrentPeriodForDate([], noonToday)).toBeNull();
  });

  it('returns active segment when now is inside [start, end]', () => {
    const start = addDays(today, -10);
    const end = addDays(today, 20);
    const cur = getCurrentPeriodForDate([{ startDate: start, endDate: end }], noonToday);
    expect(cur.isActive).toBe(true);
    expect(cur.periodStart.getTime()).toBe(start.getTime());
    expect(cur.periodEnd.getTime()).toBe(end.getTime());
  });

  it('sorts unsorted segments and still finds the active window', () => {
    const past = { startDate: addDays(today, -40), endDate: addDays(today, -30) };
    const current = { startDate: addDays(today, -5), endDate: addDays(today, 30) };
    const future = { startDate: addDays(today, 60), endDate: addDays(today, 90) };
    const cur = getCurrentPeriodForDate([future, past, current], noonToday);
    expect(cur.isActive).toBe(true);
    expect(cur.periodStart.getTime()).toBe(current.startDate.getTime());
    expect(cur.periodEnd.getTime()).toBe(current.endDate.getTime());
  });

  it('returns upcoming segment (inactive) when now is before first period start', () => {
    const start = addDays(today, 3);
    const end = addDays(today, 33);
    const cur = getCurrentPeriodForDate([{ startDate: start, endDate: end }], noonToday);
    expect(cur.isActive).toBe(false);
    expect(noonToday.getTime()).toBeLessThan(cur.periodStart.getTime());
  });

  it('when past all periods, returns last segment as inactive (exhausted)', () => {
    const start = addDays(today, -100);
    const end = addDays(today, -10);
    const cur = getCurrentPeriodForDate([{ startDate: start, endDate: end }], noonToday);
    expect(cur.isActive).toBe(false);
    expect(cur.periodEnd.getTime()).toBe(end.getTime());
    expect(noonToday.getTime()).toBeGreaterThan(cur.periodEnd.getTime());
  });

  it('drops entries with no endDate and uses remaining valid segments', () => {
    const valid = { startDate: addDays(today, -1), endDate: addDays(today, 14) };
    const cur = getCurrentPeriodForDate(
      [{ startDate: addDays(today, -5), endDate: null }, valid],
      noonToday
    );
    expect(cur).not.toBeNull();
    expect(cur.isActive).toBe(true);
  });

  it('returns null when every segment lacks endDate', () => {
    expect(
      getCurrentPeriodForDate([{ startDate: today, endDate: null }], noonToday)
    ).toBeNull();
  });

  it('boundary: now exactly at period start is active', () => {
    const start = new Date(noonToday);
    const end = addDays(noonToday, 7);
    const cur = getCurrentPeriodForDate([{ startDate: start, endDate: end }], noonToday);
    expect(cur.isActive).toBe(true);
  });

  it('boundary: now exactly at period end is active', () => {
    const start = addDays(noonToday, -7);
    const end = new Date(noonToday);
    const cur = getCurrentPeriodForDate([{ startDate: start, endDate: end }], noonToday);
    expect(cur.isActive).toBe(true);
  });
});
