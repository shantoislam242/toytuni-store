/** Return a copy of `arr` with the item at `index` shifted by `delta`
 *  positions. Out-of-range targets clamp to a no-op. Pure. */
export function moveInArray<T>(arr: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (index < 0 || index >= arr.length || target < 0 || target >= arr.length) return arr;
  const next = [...arr];
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}
