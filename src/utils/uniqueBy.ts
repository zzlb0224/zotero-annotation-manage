export function uniqueBy<T>(arr: T[], fn: (item: T) => string) {
    const keys: { [key: string]: number; } = {};
    const values: T[] = [];
    for (const curr of arr) {
        const groupKey = fn(curr);
        if (!keys.hasOwnProperty.call(keys, groupKey)) {
            keys[groupKey] = values.length;
            values.push(curr);
        }
    }
    return values;
}
