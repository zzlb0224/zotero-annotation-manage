export function uniqueBy<T>(arr: T[], fn: (item: T) => string) {
  const obj = {} as { [key: string]: T };
  for (let i = 0; i < arr.length; i++) {
    const key = fn(arr[i]);
    obj[key] = arr[i];
  }
  return Object.values(obj);
}

export function groupBy<T>(arr: T[], fn: (item: T) => any) {
  return arr.reduce<Record<string, T[]>>((prev, curr) => {
    const groupKey = fn(curr);
    const group = prev[groupKey] || [];
    group.push(curr);
    return { ...prev, [groupKey]: group };
  }, {});
}
export function groupByMap<T>(arr: T[], fn: (item: T) => any) {
  const g1 = groupBy(arr, fn);
  return Object.keys(g1).map((key) => ({ key, values: g1[key] }));
}
