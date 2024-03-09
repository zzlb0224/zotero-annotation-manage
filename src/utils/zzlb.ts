import { getPref } from "./prefs";

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
export interface groupByResult<T> {
  key: string;
  values: T[];
}
export function groupBy<T>(
  arr: T[],
  fn: (item: T) => string | number | symbol,
) {
  const g1 = arr.reduce<Record<string | number | symbol, T[]>>((prev, curr) => {
    const groupKey = fn(curr);
    const group = prev[groupKey] || [];
    group.push(curr);
    return { ...prev, [groupKey]: group };
  }, {});
  return Object.keys(g1).map(
    (key) => ({ key, values: g1[key] }) as groupByResult<T>,
  );
}
export function promiseAllWithProgress<T>(
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
export function getChildCollections(
  collections: Zotero.Collection[],
): Zotero.Collection[] {
  const childCollections = uniqueBy(collections, (a) => a.key).flatMap((a) =>
    a.getChildCollections(false),
  );
  if (childCollections.length == 0) return [];
  return [...childCollections, ...getChildCollections(childCollections)];
}
function getCollections(collections: Zotero.Collection[]): Zotero.Collection[] {
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
export function sortByTAGs<T>(a: groupByResult<T>, b: groupByResult<T>) {
  const tags = getFixedTags();
  if (tags.includes(a.key) && tags.includes(b.key)) {
    return tags.indexOf(a.key) - tags.indexOf(b.key);
  }
  if (tags.includes(a.key)) {
    return -1;
  }
  if (tags.includes(b.key)) {
    return 1;
  }
  return b.values.length - a.values.length + (b.key > a.key ? -0.5 : 0.5);
}

export function getFixedTags() {
  const prefTags = ((getPref("tags") as string) || "")
    .split(",")
    .map((a) => a.trim())
    .filter((f) => f);
  return prefTags && prefTags.length > 0
    ? prefTags
    : "目的,假设,框架,数据,量表,方法,理论,结论,贡献,不足,背景,现状,问题,对策".split(
        ",",
      );
}
export function getFixedColors() {
  const tags = getFixedTags();
  return Array.from({
    length: tags.length / ANNOTATION_COLORS.length + 1,
  }).flatMap((a) => ANNOTATION_COLORS);
}

export function getFixedColor(tag: string, optional: string = "#f19837") {
  const tags = getFixedTags();
  if (tags.includes(tag)) {
    return getFixedColors()[tags.indexOf(tag)];
  }
  return optional;
}
const ANNOTATION_COLORS = [
  "#ffd400",
  "#ff6666",
  "#5fb236",
  "#2ea8e5",
  "#a28ae5",
  "#e56eee",
  "#f19837",
  "#aaaaaa",
];
