export function median(values: readonly number[]): number {
  if (values.length === 0) {
    return Number.NaN;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Mean of |v[i] - v[i-1]|; undefined below 3 values, where it is too noisy to mean anything. */
export function meanAbsDelta(values: readonly number[]): number | undefined {
  if (values.length < 3) {
    return undefined;
  }
  let sum = 0;
  for (let i = 1; i < values.length; i++) {
    sum += Math.abs(values[i] - values[i - 1]);
  }
  return sum / (values.length - 1);
}
