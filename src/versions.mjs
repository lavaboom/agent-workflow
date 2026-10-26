// Compares dotted version strings such as 2.0.0 and 2.1.0; a pre-release suffix sorts before its release.

export function compareVersions(a, b) {
  const [mainA, preA] = splitVersion(a);
  const [mainB, preB] = splitVersion(b);
  for (let i = 0; i < Math.max(mainA.length, mainB.length); i += 1) {
    const difference = (mainA[i] ?? 0) - (mainB[i] ?? 0);
    if (difference !== 0) return Math.sign(difference);
  }
  if (preA === preB) return 0;
  if (preA === null) return 1;
  if (preB === null) return -1;
  return preA < preB ? -1 : 1;
}

function splitVersion(version) {
  const text = String(version).trim().replace(/^v/, '');
  const dash = text.indexOf('-');
  const main = dash < 0 ? text : text.slice(0, dash);
  const pre = dash < 0 ? null : text.slice(dash + 1);
  return [main.split('.').map((part) => Number.parseInt(part, 10) || 0), pre];
}
