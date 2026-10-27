// UTC date helpers. Every date the CLI stores or compares is UTC.

export function utcDateString(date) {
  return date.toISOString().slice(0, 10);
}

// ISO timestamp without milliseconds, e.g. 2026-10-26T15:00:00Z.
export function utcTimestamp(date) {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && utcDateString(parsed) === value;
}

export function addDays(isoDate, days) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return utcDateString(date);
}

// Whole days from one ISO date to a later one (negative when `to` is earlier).
export function daysBetween(fromIsoDate, toIsoDate) {
  return Math.round((Date.parse(`${toIsoDate}T00:00:00Z`) - Date.parse(`${fromIsoDate}T00:00:00Z`)) / 86400000);
}
