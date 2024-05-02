import { groupByResult, memFixedTags } from "./zzlb";
export function sortTags(
  fixed: string[] | undefined,
  a: { key: string },
  b: { key: string },
): number;
export function sortTags(
  fixed: string[] | undefined,
  a: string,
  b: string,
): number;
export function sortTags(
  fixed: string[] | undefined,
  a: string | { key: string },
  b: string | { key: string },
) {
  if (!fixed) return 0;
  if (typeof a === "string" && typeof b === "string") {
    if (fixed.includes(a) && fixed.includes(b)) {
      return fixed.indexOf(a) - fixed.indexOf(b);
    } else if (fixed.includes(a)) {
      return -10;
    } else if (fixed.includes(b)) {
      return 10;
    }
    return 0;
  }
  if (typeof a !== "string" && typeof b !== "string")
    return sortTags(fixed, a.key, b.key);
  return 0;
}
export function sortAsc(a: string | number, b: string | number) {
  return a == b ? 0 : a < b ? -1 : 1;
}

export function sortKey(
  a: { key: string | number },
  b: { key: string | number },
) {
  return sortAsc(a.key, b.key);
}
export function sortValuesLengthKeyAsc(
  a: { key: string; values: any[] },
  b: { key: string; values: any[] },
) {
  return sortAsc(b.values.length, a.values.length) * 10 + sortAsc(a.key, b.key);
}
export function sortValuesLength(a: { values: any[] }, b: { values: any[] }) {
  return sortAsc(b.values.length, a.values.length);
}
export function sortTags10AscByKey(a: { key: string }, b: { key: string }) {
  return sortByTags10Asc(a.key, b.key);
}
export function sortByTags10Asc(a: string, b: string) {
  return sortTags(memFixedTags(), a, b) * 10 + sortAsc(a, b);
}
export function sortFixedTags10ValuesLength(
  a: { key: string; values: any[] },
  b: { key: string; values: any[] },
) {
  return (
    sortTags(memFixedTags(), a, b) * 100 +
    sortValuesLength(a, b) * 10 +
    sortKey(a, b)
  );
}
export function sortModified(
  a: { dateModified: string },
  b: { dateModified: string },
) {
  //逆序
  return sortAsc(b.dateModified, a.dateModified);
}
export function sortFixedTags100Modified10Asc(
  a: { key: string; dateModified: string },
  b: { key: string; dateModified: string },
) {
  return (
    sortTags(memFixedTags(), a, b) * 100 +
    sortModified(a, b) * 10 +
    sortKey(a, b)
  );
}
export function sortTags1000Ann100Modified10Asc(tags: string[] | undefined) {
  return (
    a: { key: string; dateModified: string },
    b: { key: string; dateModified: string },
  ) =>
    sortTags(memFixedTags(), a, b) * 1000 +
    sortTags(tags, a, b) * 100 +
    sortModified(a, b) * 10 +
    sortKey(a, b);
}
export function mapDateModified(r: {
  key: string;
  values: { dateModified: string; tag: string; type: number }[];
}) {
  return {
    key: r.key,
    dateModified: r.values
      .map((v) => v.dateModified)
      .sort((a, b) => (a > b ? -1 : 1))[0],
    values: r.values,
  };
}
export function sortByFixedTag2TagName<T>(
  a: groupByResult<T>,
  b: groupByResult<T>,
) {
  const tags = memFixedTags();
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
export function sortBy<T>(keyFunc: (a: T) => string, asc: boolean = true) {
  return (a: T, b: T) => {
    const aa = keyFunc(a);
    const bb = keyFunc(b);
    if (aa == bb) return 0;
    if (asc) return aa < bb ? -1 : 1;
    return aa < aa ? -1 : 1;
  };
}
/**
 * 不要传入async方法
 *
 * @export
 * @template {{[key:string]:any}} T
 * @param {...((keyof T)|undefined)[]} keys 不要传入async方法
 * @returns {(a: T, b: T) => number}
 */
export function compare<T extends { [key: string]: any } | number | string>(
  ...keys: (keyof T | undefined)[]
) {
  return (a: T, b: T) => {
    let r = 0;
    for (let i = 0; i < keys.length; i++) {
      const ki = keys[i];
      if (ki == undefined) {
        if (a < b) r += (keys.length - i) * -10;
        if (a > b) r += (keys.length - i) * 10;
      } else if (typeof a[ki] === "function") {
        if ((a[ki] as any)() < (b[ki] as any)()) r += (keys.length - i) * -10;
        if ((a[ki] as any)() > (b[ki] as any)()) r += (keys.length - i) * 10;
      } else {
        if (a[ki] < b[ki]) r += (keys.length - i) * -10;
        if (a[ki] > b[ki]) r += (keys.length - i) * 10;
      }
    }
    return r;
  };
}
