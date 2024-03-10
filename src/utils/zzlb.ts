import { getPref } from "./prefs";

/* unique 采用set的比较方式*/
export function unique<T>(arr: T[]) {
  return [...new Set(arr)];
}

//uniqueBy groupBy groupByMap 三个函数，因为使用的是object的key来检查重复，所以只能使用string | number | symbol
export function uniqueBy<T>(arr: T[], fn: (item: T) => string) {
  const groupedBy: { [key: string]: T } = {};
  for (const curr of arr) {
    const groupKey = fn(curr);
    if (groupKey in groupedBy) {
      groupedBy[groupKey] = curr;
    }
  }
  return Object.values(groupedBy);
}
export interface groupByResult<T> {
  key: string;
  values: T[];
}
export function groupBy<T>(arr: T[], fn: (item: T) => string) {
  const groupedBy: { [key: string]: T[] } = {};
  for (const curr of arr) {
    const groupKey = fn(curr);
    if (groupedBy[groupKey]) {
      groupedBy[groupKey].push(curr);
    } else {
      groupedBy[groupKey] = [curr];
    }
  }
  return Object.keys(groupedBy).map(
    (key) => ({ key, values: groupedBy[key] }) as groupByResult<T>,
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

export function getFixedTags(): string[] {
  const prefTags = ((getPref("tags") as string) || "")
    .split(",")
    .map((a) => a.trim())
    .filter((f) => f);
  if (prefTags && prefTags.length > 0) return prefTags;
  return "目的,假设,框架,数据,量表,方法,理论,结论,贡献,不足,背景,现状,问题,对策".split(
    ",",
  );
}
export function getFixedColors(): string[] {
  let fixedColor = ((getPref("fixed-colors") as string) || "")
    .split(",")
    .map((a) => a.trim())
    .filter((f) => f);
  if (!fixedColor || fixedColor.length == 0)
    fixedColor =
      "#ffd400,#ff6666,#5fb236,#2ea8e5,#a28ae5,#e56eee,#f19837,#aaaaaa".split(
        ",",
      );
  const tags = getFixedTags();
  return Array.from({
    length: tags.length / fixedColor.length + 1,
  }).flatMap(() => fixedColor);
}

export function getFixedColor(tag: string, optional?: string): string {
  const tags = getFixedTags();
  if (tags.includes(tag)) {
    return getFixedColors()[tags.indexOf(tag)];
  }
  if (optional == undefined) return getPref("optional-color") as string;
  return optional;
}
