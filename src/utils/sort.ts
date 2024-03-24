import { memFixedTags } from "./zzlb";
export function sortTags(
  fixed: string[],
  a: { key: string },
  b: { key: string },
): number;
export function sortTags(fixed: string[], a: string, b: string): number;
export function sortTags(
  fixed: string[],
  a: string | { key: string },
  b: string | { key: string },
) {
  if (typeof a === "string" && typeof b === "string") {
    if (fixed.includes(a) && fixed.includes(b)) {
      return fixed.indexOf(a) - fixed.indexOf(b);
    } else if (fixed.includes(a)) {
      return -100;
    } else if (fixed.includes(b)) {
      return 100;
    }
    return 0;
  }
  if (typeof a !== "string" && typeof b !== "string")
    return sortTags(fixed, a.key, b.key);

  return 0;
}
export function sortTagsKey(
  fixed: string[],
  a: { key: string },
  b: { key: string },
) {
  return sortTags(fixed, a.key, b.key);
}
export function sortAsc(a: string | number, b: string | number) {
  return a == b ? 0 : a > b ? -1 : 1;
}
function sortDesc(a: string | number, b: string | number) {
  return a == b ? 0 : a > b ? -1 : 1;
}

export function sortKey(
  a: { key: string | number },
  b: { key: string | number },
) {
  return a.key == b.key ? 0 : a.key > b.key ? -1 : 1;
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
export function sortTags10ValuesLength(
  a: { key: string; values: string | any[] },
  b: { key: string; values: string | any[] },
) {
  return (
    sortTags(memFixedTags(), a.key, b.key) * 100 +
    sortDesc(a.values.length, b.values.length)
  );
}

export function sortModified(
  a: { dateModified: string },
  b: { dateModified: string },
) {
  return sortAsc(b.dateModified, a.dateModified);
}
