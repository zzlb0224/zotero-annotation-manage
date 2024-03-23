import { groupByResult, memFixedTags } from "./zzlb";

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
