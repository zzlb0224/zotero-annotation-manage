import { Function, isEqual } from "lodash";
import { sortAsc } from "./sort";
function stringify(o3: any): string {
  switch (typeof o3) {
    case "function":
      return "f" + o3.name + "(" + o3.length + ")";
    case "object":
      return (
        "{" +
        Object.keys(o3)
          .sort()
          .map((a2) => a2 + "=" + stringify(o3[a2]))
          .join(";") +
        "}"
      );
    default:
      return o3 + "";
  }
}
export function groupBy<TValue, TKey>(arr: TValue[], getKey: (item: TValue) => TKey) {
  const groupedKey = [] as TKey[];
  const groupedKeyStr = [] as string[];
  const groupedKeyIndex: { [key: string]: number } = {};
  const groupedValue = [] as TValue[][];
  for (const currentValue of arr) {
    const currentKey = getKey(currentValue);
    const currentKeyStr = stringify(currentKey);
    if (groupedKeyIndex[currentKeyStr] > -1) {
      groupedValue[groupedKeyIndex[currentKeyStr]].push(currentValue);
    } else {
      groupedKeyIndex[currentKeyStr] = groupedValue.length;
      groupedValue.push([currentValue]);
      groupedKey.push(currentKey);
    }
  }
  return groupedKey.map((key, index) => ({ key, values: groupedValue[index] })); //as groupByResult<TValue, TKey>[];
}

export interface groupByResult<TValue, TKey> {
  key: TKey;
  values: TValue[];
}
export function groupBy2<TValue>(arr: TValue[], getKey: (item: TValue) => string) {
  const groupedByValues: { [key: string]: TValue[] } = {};

  for (const curr of arr) {
    const groupKey = getKey(curr);
    if (groupedByValues[groupKey]) {
      groupedByValues[groupKey].push(curr);
    } else {
      groupedByValues[groupKey] = [curr];
    }
  }
  return Object.keys(groupedByValues).map(
    (key) => ({
      key,
      value: groupedByValues[key][0],
      values: groupedByValues[key],
    }), //as groupByEqualResult<T, string>,
  );
}
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
