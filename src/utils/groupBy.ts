import { Function, isEqual } from "lodash";
import { sortAsc } from "./sort";
function stringify(value: any): string {
  switch (typeof value) {
    case "symbol":
      return "m" + value.toString();
    case "string":
      return "s" + value;
    case "number":
      return "n" + value;
    case "bigint":
      return "i" + value;
    case "undefined":
      return "u";
    case "boolean":
      return value ? "b1" : "b0";
    case "function":
      return "f" + value.name + "_" + value.length;
    case "object":
      if (Array.isArray(value)) {
        return (
          "[" +
          Object.keys(value)
            .map((key, index) => stringify(value[index]))
            .join(",") +
          "]"
        );
      }
      return (
        "{" +
        Object.keys(value)
          .sort()
          .map((key) => key + "=" + stringify(value[key]))
          .join(";") +
        "}"
      );
    default:
      return "d" + value;
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
