
/* unique 采用set的比较方式*/
export function unique<T>(arr: T[]) {
  return [...new Set(arr)];
}

//uniqueBy groupBy groupByMap 三个函数，因为使用的是object的key来检查重复，所以只能使用string | number | symbol
export function uniqueBy<T>(
  arr: T[],
  fn: (item: T) => string | number | symbol,
) {
  const o = arr.reduce<Record<string | number | symbol, T>>((prev, curr) => {
    const groupKey = fn(curr);
    return { ...prev, [groupKey]: curr };
  }, {});
  return Object.values(o);
}

export function groupBy<T>(
  arr: T[],
  fn: (item: T) => string | number | symbol,
) {
  return arr.reduce<Record<string | number | symbol, T[]>>((prev, curr) => {
    const groupKey = fn(curr);
    const group = prev[groupKey] || [];
    group.push(curr);
    return { ...prev, [groupKey]: group };
  }, {});
}
export function groupByMap<T>(
  arr: T[],
  fn: (item: T) => string | number | symbol,
) {
  const g1 = groupBy(arr, fn);
  return Object.keys(g1).map((key) => ({ key, values: g1[key] }));
}
export function allWithProgress<T>(
  arr: Promise<T>[],
  callback: { (progress: number, index: number): void },
): Promise<T[]> {
  let index = 0; //不能用forEach的index，因为执行顺序不一样
  arr.forEach((item: Promise<T>) => {
    item.then(() => {
      index++;
      const progress = (index * 100) / arr.length;
      callback(progress, index);
    });
  });
  return Promise.all(arr);
}
export function getCollections(
  collections: Zotero.Collection[],
): Zotero.Collection[] {
  function getChildCollections(
    collections: Zotero.Collection[],
  ): Zotero.Collection[] {
    const cs = uniqueBy(collections, (a) => a.key).flatMap((a) =>
      a.getChildCollections(false),
    );
    if (cs.length == 0) return collections;
    return [...cs, ...getChildCollections(cs)];
  }
  return uniqueBy(
    [...collections, ...getChildCollections(collections)],
    (a) => a.key,
  );
}
