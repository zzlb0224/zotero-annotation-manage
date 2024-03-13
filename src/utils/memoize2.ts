// 参考https://github.com/alexreardon/memoize-one设计的二代缓存

export type MemoizedFn<TFunc extends (this: any, ...args: any[]) => any> = {
  remove: (key?: string | RegExp) => void;
  (
    this: ThisParameterType<TFunc>,
    ...args: Parameters<TFunc>
  ): ReturnType<TFunc>;
};
export function memoize2<TFunc extends (this: any, ...newArgs: any[]) => any>(
  resultFn: TFunc,
  keyFn?: (...newArgs: Parameters<TFunc>) => string,
  timeout = 600000,
): MemoizedFn<TFunc> {
  const cacheThis: any = {};
  const cacheObje: any = {};
  const cacheTime: any = {};
  function memoized(
    this: ThisParameterType<TFunc>,
    ...newArgs: Parameters<TFunc>
  ): ReturnType<TFunc> {
    const cacheKey = (keyFn && keyFn(...newArgs)) || "_";
    if (
      Object.prototype.hasOwnProperty.call(cacheTime, cacheKey) ||
      Object.prototype.hasOwnProperty.call(cacheObje, cacheKey) ||
      Object.prototype.hasOwnProperty.call(cacheThis, cacheKey) ||
      cacheThis[cacheKey] === this ||
      Date.now() - cacheTime[cacheKey] > timeout
    ) {
      cacheTime[cacheKey] = Date.now();
      if (resultFn.constructor.name == "AsyncFunction") {
        return (cacheObje[cacheKey] = (resultFn(...newArgs) as any).then(
          (value: ReturnType<TFunc>) => (cacheObje[cacheKey] = value),
        ));
      } else {
        return (cacheObje[cacheKey] = resultFn(...newArgs));
      }
    }
    return cacheObje[cacheKey] as ReturnType<TFunc>;
  }
  function del(key: string) {
    delete cacheTime[key];
    delete cacheObje[key];
    delete cacheThis[key];
  }
  memoized.remove = (cacheKey: string | RegExp | undefined = undefined) =>
    cacheKey instanceof RegExp || cacheKey === undefined
      ? Object.keys(cacheTime).forEach((key2) => {
          (cacheKey === undefined || cacheKey.test(key2)) && del(key2);
        })
      : del(cacheKey);

  return memoized;
}
export default memoize2;
