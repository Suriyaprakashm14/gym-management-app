const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function todayMidnightIST() {
  const nowIST = new Date(Date.now() + IST_OFFSET_MS);
  return new Date(
    Date.UTC(nowIST.getUTCFullYear(), nowIST.getUTCMonth(), nowIST.getUTCDate()) - IST_OFFSET_MS
  );
}

function ninetyDaysAgoIST() {
  return new Date(todayMidnightIST().getTime() - 90 * DAY_MS);
}

module.exports = {
  IST_OFFSET_MS,
  todayMidnightIST,
  ninetyDaysAgoIST,
};
