import { isEqual } from 'lodash';
import { sortAsc } from './sort';

export function groupByEqual<TValue, TKey>(arr: TValue[], getKey: (item: TValue) => TKey, equal: ((o1: TKey, o2: TKey) => boolean) = isEqual) {
    const groupedByValues: { [key: string]: TValue[]; } = {};
    const groupedKey = [] as TKey[];
    const groupedValue = [] as TValue[][];
    for (const currentValue of arr) {
        const currentKey = getKey(currentValue);
        const index = groupedKey.findIndex(f => equal(currentKey, f));
        if (index == -1) {
            groupedKey.push(currentKey);
            groupedValue.push([currentValue]);
        } else {
            groupedValue[index].push(currentValue);
        }
    }
    return groupedKey.map((key, index) => ({ key, values: groupedValue[index] })) as groupByEqualResult<TValue, TKey>[];
} export interface groupByEqualResult<TValue, TKey> {
    key: TKey;
    values: TValue[];
}
export function groupBy<T>(arr: T[], getKey: (item: T) => string) {
    const groupedByValues: { [key: string]: T[]; } = {};
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
        }) as groupByResult<T>
    );
}
export interface groupByResult<T> {
    key: string;
    value?: T;
    values: T[];
}
// import { isEqual } from "lodash"
/* unique 采用set的比较方式*/
export function unique<T>(arr: T[]) {
    return [...new Set(arr)];
}
export function mapDateModified(r: { key: string; values: { dateModified: string; tag: string; type: number; }[]; }) {
    return {
        key: r.key,
        dateModified: r.values.map((v) => v.dateModified).sort(sortAsc)[0],
        values: r.values,
    };
}

