/**
 * Shared subscription segment logic (renewals / multi-period plans).
 * Used by memberController and Member.checkAndUpdateExpiredMemberships.
 */

/**
 * Find the subscription period that applies at `now` from subscriptionPeriods.
 * Active only when now is within [periodStart, periodEnd]. Inactive when before first period starts or after last period ends.
 * @param {Array<{ startDate: Date, endDate: Date }>} subscriptionPeriods
 * @param {Date} now
 * @returns {{ periodStart: Date, periodEnd: Date, isActive: boolean } | null} isActive true when now is inside the period
 */
function getCurrentPeriodForDate(subscriptionPeriods, now) {
  if (!Array.isArray(subscriptionPeriods) || subscriptionPeriods.length === 0) return null;
  const sorted = [...subscriptionPeriods]
    .filter((p) => p && (p.startDate != null || p.endDate != null))
    .map((p) => ({
      start: new Date(p.startDate),
      end: p.endDate ? new Date(p.endDate) : null,
    }))
    .filter((p) => p.end != null)
    .sort((a, b) => a.start.getTime() - b.start.getTime());
  if (sorted.length === 0) return null;
  for (const p of sorted) {
    if (now >= p.start && now <= p.end) return { periodStart: p.start, periodEnd: p.end, isActive: true };
    if (now < p.start) return { periodStart: p.start, periodEnd: p.end, isActive: false };
  }
  const last = sorted[sorted.length - 1];
  return { periodStart: last.start, periodEnd: last.end, isActive: false };
}

module.exports = {
  getCurrentPeriodForDate,
};
