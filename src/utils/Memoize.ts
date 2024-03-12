export const memoize = <T>(
  func: (...args: any) => T,
  keyfn: ((...args: any) => string) | undefined = undefined,
  cacheTime = 60000,
) => {
  const cache: { [key: string]: T | undefined | Promise<T> } = {};
  const time: { [key: string]: number } = {};
  return {
    get: (...args: any): T => {
      const cacheKey = (keyfn ? keyfn(...args) : `_${args.join("_")}_`) || "_";
      if (
        cache[cacheKey] === undefined ||
        Date.now() - time[cacheKey] > cacheTime
      ) {
        time[cacheKey] = Date.now();
        if (func.constructor.name == "AsyncFunction") {
          return (cache[cacheKey] = (func(...args) as any).then(
            (value: T) => (cache[cacheKey] = value),
          ));
        } else {
          return (cache[cacheKey] = func(...args));
        }
      }
      return cache[cacheKey] as T;
    },
    remove: (cacheKey: string | RegExp = "") =>
      cacheKey instanceof RegExp || cacheKey == ""
        ? Object.keys(cache).forEach((key) => {
            (cacheKey == "" || cacheKey.test(key)) && delete cache[key];
          })
        : delete cache[cacheKey],
  };
};
