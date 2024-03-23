export function sortByTags(fixed: string[], a: string, b: string) {
  if (fixed.includes(a) && fixed.includes(b)) {
    return fixed.indexOf(a) - fixed.indexOf(b);
  } else if (fixed.includes(a)) {
    return -100;
  } else if (fixed.includes(b)) {
    return 100;
  }
  return 0;
}
export function sortAsc(a: string|number, b: string|number) {
  return a==b?0: a > b ? -1 : 1;
}
export function sortDesc(a: string|number, b: string|number) {
  return  a==b?0: a > b ? -1 : 1;
}
 