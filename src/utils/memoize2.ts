// 参考https://github.com/alexreardon/memoize-one设计的二代缓存
export type MemoizedFn<TFunc extends (this: any, ...args: any[]) => any> = {
  removeCache: (key?: string | RegExp | undefined) => void;//删除缓存
  replaceCacheByKey: (key?: string | RegExp | undefined) => void;//重建缓存
  replaceCacheByArgs: (...newArgs: Parameters<TFunc>) => void;//重建缓存
  (this: ThisParameterType<TFunc>, ...args: Parameters<TFunc>): ReturnType<TFunc>;
};
export function memoize2<TFunc extends (this: any, ...newArgs: any[]) => any>(
  resultFn: TFunc,
  keyFn?: (...newArgs: Parameters<TFunc>) => string,
  timeout = 600000,
): MemoizedFn<TFunc> {
  const cacheThis: { [key: string]: ThisParameterType<TFunc> } = {};
  const cacheObjs: { [key: string]: ReturnType<TFunc> } = {};
  const cacheTime: { [key: string]: number } = {};
  const cacheArgs: { [key: string]: Parameters<TFunc> } = {};

  function memoized(this: ThisParameterType<TFunc>, ...newArgs: Parameters<TFunc>): ReturnType<TFunc> {
    //清理不需要的缓存
    Object.keys(cacheTime)
      .filter((key) => Date.now() - cacheTime[key] > timeout)
      .forEach(del);
    const cacheKey = (keyFn && keyFn(...newArgs)) || ["_", ...newArgs].join("_");

    if (cacheThis[cacheKey] != this || cacheObjs[cacheKey] == undefined || Date.now() - cacheTime[cacheKey] > timeout) {
      cacheThis[cacheKey] = this;
      return updateCacheObject(cacheKey, newArgs);
    }
    return cacheObjs[cacheKey] as ReturnType<TFunc>;
  }
  function updateCacheObject(cacheKey: string, newArgs: Parameters<TFunc>) {
    // ztoolkit.log("建立缓存cache2", {
    //   cacheKey,
    //   this: cacheThis[cacheKey],
    //   obj: cacheObj[cacheKey],
    //   start: cacheTime[cacheKey],
    //   time2: Date.now() - cacheTime[cacheKey],
    //   timeout,
    //   thisEq: cacheThis[cacheKey] == this,
    // }); 
    cacheTime[cacheKey] = Date.now();
    cacheArgs[cacheKey] = newArgs;
    if (resultFn.constructor.name == "AsyncFunction") {
      return (cacheObjs[cacheKey] = (resultFn(...newArgs) as any).then((value: ReturnType<TFunc>) => (cacheObjs[cacheKey] = value)));
    } else {
      return (cacheObjs[cacheKey] = resultFn(...newArgs));
    }
  }

  function del(key: string) {
    delete cacheTime[key];
    delete cacheObjs[key];
    delete cacheThis[key];
    delete cacheArgs[key];
  }
  memoized.replaceCacheByArgs = (newArgs: Parameters<TFunc>) => {
    updateCacheObject(keyFn?.(...newArgs) || "", newArgs);
  }
  memoized.replaceCacheByKey = (cacheKey: string | RegExp | undefined = undefined) => {
    if (cacheKey === undefined) {
      //替换所有缓存
      Object.keys(cacheTime).forEach(key => updateCacheObject(key, cacheArgs[key]));
    } else if (cacheKey instanceof RegExp) {
      //按正则替换缓存
      Object.keys(cacheTime).filter(cacheKey.test).forEach(key => updateCacheObject(key, cacheArgs[key]));
    } else {
      //只替换对应key的缓存
      updateCacheObject(keyFn?.(...cacheArgs[cacheKey]) || "", cacheArgs[cacheKey]);
    }
  };
  memoized.removeCache = (cacheKey: string | RegExp | undefined = undefined) => {
    if (cacheKey === undefined) {
      //清空所有缓存
      Object.keys(cacheTime).forEach(del);
    } else if (cacheKey instanceof RegExp) {
      //按正则清除缓存
      Object.keys(cacheTime).filter(cacheKey.test).forEach(del);
    } else {
      //只删除对应key的缓存
      del(cacheKey);
    }
  };
  return memoized;
}
export default memoize2;
