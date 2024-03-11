export class Cache {
  private __obj: { [key: string]: any } = {};
  private __lastTime: { [key: string]: number } = {};
  get<T>(key: string, fn: () => T): T;
  get<T>(key: string, fn: () => T, cacheTime: number): T;
  get<T>(key: string, fn: () => Promise<T>): Promise<T>;
  get<T>(key: string, fn: () => Promise<T>, cacheTime: number): Promise<T>;
  get<T>(key: string, fn: (() => T) | (() => Promise<T>), cacheTime = 10000) {
    if (
      !this.__lastTime[key] ||
      Date.now() - this.__lastTime[key] > cacheTime
    ) {
      if (fn.constructor.name == "AsyncFunction") {
        const t = fn as () => Promise<T>;
        const v = t().then((value) => {
          // ztoolkit.log("异步读取", key,value,cacheTime);
          return this.set(key, value);
        });
        return v;
      } else {
        const value = fn();
        // if(!["FixedColors","FixedTags"].includes(key))
        //   ztoolkit.log("同步读取", key,value,cacheTime);
        this.set(key, value);
        return value;
      }
    } else {
      // if(!["FixedColors","FixedTags"].includes(key))
      // ztoolkit.log("缓存读取", key);
      return this.__obj[key] as T;
    }
  }

  set<T>(key: string, value: T) {
    this.__lastTime[key] = Date.now();
    this.__obj[key] = value;
    return value;
  }
  remove(key: string) {
    // ztoolkit.log("缓存删除", key, this.__obj[key], this.__lastTime[key]);
    delete this.__lastTime[key];
    delete this.__obj[key];
  }
}

export const cache = new Cache();
export const memoize = <T>(
  func: ((...args: any) => Promise<T>) | ((...args: any) => T),
  keyfn: ((...args: any) => string) | undefined = undefined,
  cacheTime = 1000,
) => {
  const cache: { [key: string]: T | undefined | Promise<T> } = {};
  const time: { [key: string]: number } = {};
  return async (...args: any) => {
    const cacheKey = keyfn ? keyfn(...args) : args.join("_");
    if (
      cache[cacheKey] === undefined ||
      Date.now() - time[cacheKey] > cacheTime
    ) {
      console.log("计算");
      time[cacheKey] = Date.now();
      if (func.constructor.name == "AsyncFunction") {
        return (cache[cacheKey] = (func(...args) as Promise<T>).then(
          (value) => (cache[cacheKey] = value),
        )); //.finally(() => (cache[cacheKey] = undefined))
      } else {
        return (cache[cacheKey] = func(...args));
      }
    }
    console.log("缓存");
    return cache[cacheKey] as T;
  };
};
