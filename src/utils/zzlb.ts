// import { memoize } from "./Memoize";
import { getPref } from "./prefs";
import memoize from "./memoize2";

/* unique 采用set的比较方式*/
export function unique<T>(arr: T[]) {
  return [...new Set(arr)];
}

//uniqueBy groupBy groupByMap 三个函数，因为使用的是object的key来检查重复，所以只能使用string | number | symbol
export function uniqueBy<T>(arr: T[], fn: (item: T) => string) {
  const groupedBy: { [key: string]: T } = {};
  for (const curr of arr) {
    const groupKey = fn(curr);
    if (curr && !groupedBy[groupKey]) {
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
export function sortByLength<T>(a: groupByResult<T>, b: groupByResult<T>) {
  return b.values.length - a.values.length + (b.key > a.key ? -0.5 : 0.5);
}
export function sortByFixedTag2Length<T>(
  a: groupByResult<T>,
  b: groupByResult<T>,
) {
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

export function sortByFixedTag2TagName<T>(
  a: groupByResult<T>,
  b: groupByResult<T>,
) {
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
  return b.key > a.key ? -0.5 : 0.5;
}
export const FixedTagsDefault =
  "目的,假设,框架,数据,量表,方法,理论,结论,贡献,不足,背景,现状,问题,对策";
export const FixedColorDefault =
  "#ffd400,#ff6666,#5fb236,#2ea8e5,#a28ae5,#e56eee,#f19837,#aaaaaa";

function getFixedTags_(): string[] {
  const prefTags = ((getPref("tags") as string) || "")
    .split(",")
    .map((a) => a.trim())
    .filter((f) => f);
  if (prefTags && prefTags.length > 0) return prefTags;
  return FixedTagsDefault.split(",");
}
function getFixedColors_(): string[] {
  let fixedColor = ((getPref("fixed-colors") as string) || "")
    .split(",")
    .map((a) => a.trim())
    .filter((f) => f);
  if (!fixedColor || fixedColor.length == 0)
    fixedColor = FixedColorDefault.split(",");
  const tags = getFixedTags();
  return Array.from({
    length: tags.length / fixedColor.length + 1,
  }).flatMap(() => fixedColor);
}

function getFixedColor_(tag: string, optional: string | undefined): string {
  const tags = getFixedTags();
  if (tags.includes(tag)) {
    return getFixedColors()[tags.indexOf(tag)];
  }
  if (optional == undefined) return getOptionalColor() as string;
  return optional;
}

export const COLOR = {
  red: "#ff6666",
  orange: "#f19837",
  yellow: "#ffd400",
  green: "#5fb236",
  teal: "#008080",
  blue: "#2ea8e5",
  purple: "#a28ae5",
  magenta: "#E4007F",
  violet: "#e56eee",
  maroon: "#f19837",
  gray: "#aaaaaa",
  black: "#000000",
  white: "#ffffff",
};

export const getOptionalColor = memoize(() => getPref("optional-color"));
export const getFixedColor = memoize(getFixedColor_);
export const getFixedTags = memoize(getFixedTags_);
export const getFixedColors = memoize(getFixedColors_);

export function toggleProperty<T, K extends keyof NonNullable<T>>(
  obj: NonNullable<T> | undefined,
  key: K,
  values: NonNullable<T>[K][],
) {
  if (obj) { 
   return obj[key] = values[(values.indexOf(obj[key]) + 1)%values.length];
  }  
}

export function setProperty<T, K extends keyof NonNullable<T>>(
  obj: NonNullable<T> | undefined,
  key: K,
  value: NonNullable<T>[K],
){
  if (obj) {return obj[key] = value}
}
