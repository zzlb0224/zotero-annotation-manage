import { isEqual } from "lodash";
import { sortAsc } from "./sort";
import { groupByResultIncludeFixedTags } from './zzlb';

export function groupBy<TValue, TKey>(
  arr: TValue[],
  getKey: (item: TValue) => TKey,
) {
  const groupedKey = [] as TKey[];
  const groupedValue = [] as TValue[][];
  for (const currentValue of arr) {
    const currentKey = getKey(currentValue);
    const index = groupedKey.findIndex((f) => isEqual(currentKey, f));
    if (index == -1) {
      groupedKey.push(currentKey);
      groupedValue.push([currentValue]);
    } else {
      groupedValue[index].push(currentValue);
    }
  }
  return groupedKey.map((key, index) => ({ key, values: groupedValue[index] }))//as groupByResult<TValue, TKey>[];
}

export interface groupByResult<TValue, TKey> {
  key: TKey;
  values: TValue[];
}
// export function groupBy<T>(arr: T[], getKey: (item: T) => string) {
//   const groupedByValues: { [key: string]: T[] } = {};
//   for (const curr of arr) {
//     const groupKey = getKey(curr);
//     if (groupedByValues[groupKey]) {
//       groupedByValues[groupKey].push(curr);
//     } else {
//       groupedByValues[groupKey] = [curr];
//     }
//   }
//   return Object.keys(groupedByValues).map(
//     (key) =>
//       ({
//         key,
//         value: groupedByValues[key][0],
//         values: groupedByValues[key],
//       }) as groupByEqualResult<T, string>,
//   );
// }
// export interface groupByResult<TValue> {
//   key: string;
//   values: TValue[];
// }


export function mapDateModified(arr: { key: string; values: { dateModified: string; tag: string; type: number }[] }) {
  return {
    key: arr.key,
    dateModified: arr.values.map((v) => v.dateModified).sort(sortAsc)[0],
    values: arr.values,
  };
}
