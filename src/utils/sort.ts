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

export function sortTags100Modified10Asc(
  a: { key: string; dateModified: string },
  b: { key: string; dateModified: string },
) {
  return (
    sortTags(memFixedTags(), a, b) * 100 +
    sortModified(a, b) * 10 +
    sortKey(a, b)
  );
}

export function sortTags1000Ann100Modified10Asc(tags: string[]) {
  return (
    a: { key: string; dateModified: string },
    b: { key: string; dateModified: string },
  ) =>
    sortTags(memFixedTags(), a, b) * 1000 +
    sortTags(tags, a, b) * 100 +
    sortModified(a, b) * 10 +
    sortKey(a, b);
}
