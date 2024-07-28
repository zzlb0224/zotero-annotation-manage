// 参考https://github.com/alexreardon/memoize-one设计的二代缓存
export type MemoizedFn<TFunc extends (this: any, ...args: any[]) => any> = {
  remove: (key?: string | RegExp | undefined) => void;
  (this: ThisParameterType<TFunc>, ...args: Parameters<TFunc>): ReturnType<TFunc>;
};
export function memoize2<TFunc extends (this: any, ...newArgs: any[]) => any>(
  resultFn: TFunc,
  keyFn?: (...newArgs: Parameters<TFunc>) => string,
  timeout = 600000,
): MemoizedFn<TFunc> {
  const cacheThis: { [key: string]: ThisParameterType<TFunc> } = {};
  const cacheObj: { [key: string]: ReturnType<TFunc> } = {};
  const cacheTime: { [key: string]: number } = {};
  function memoized(this: ThisParameterType<TFunc>, ...newArgs: Parameters<TFunc>): ReturnType<TFunc> {
    //清理不需要的缓存
    Object.keys(cacheTime).forEach((key) => {
      if (Date.now() - cacheTime[key] > timeout) {
        ztoolkit.log("超时删除缓存", key);
        del(key);
      }
    });
    const cacheKey = (keyFn && keyFn(...newArgs)) || ["_", ...newArgs].join("_");

    if (cacheThis[cacheKey] != this || cacheObj[cacheKey] == undefined || Date.now() - cacheTime[cacheKey] > timeout) {
      ztoolkit.log("建立缓存cache2", {
        cacheKey,
        this: cacheThis[cacheKey],
        obj: cacheObj[cacheKey],
        start: cacheTime[cacheKey],
        time2: Date.now() - cacheTime[cacheKey],
        timeout,
        thisEq: cacheThis[cacheKey] == this,
      });
      cacheTime[cacheKey] = Date.now();
      cacheThis[cacheKey] = this;
      if (resultFn.constructor.name == "AsyncFunction") {
        return (cacheObj[cacheKey] = (resultFn(...newArgs) as any).then((value: ReturnType<TFunc>) => (cacheObj[cacheKey] = value)));
      } else {
        return (cacheObj[cacheKey] = resultFn(...newArgs));
      }
    }
    return cacheObj[cacheKey] as ReturnType<TFunc>;
  }
  function del(key: string) {
    delete cacheTime[key];
    delete cacheObj[key];
    delete cacheThis[key];
  }
  memoized.remove = (cacheKey: string | RegExp | undefined = undefined) =>
    cacheKey instanceof RegExp || cacheKey === undefined
      ? Object.keys(cacheTime).forEach((key2) => (cacheKey === undefined || cacheKey.test(key2)) && del(key2))
      : del(cacheKey);
  return memoized;
}
export default memoize2;
