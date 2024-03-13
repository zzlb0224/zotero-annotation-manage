// 参考https://github.com/alexreardon/memoize-one设计的二代缓存

export type MemoizedFn<TFunc extends (this: any, ...args: any[]) => any> = {
  remove: (key?: string | RegExp) => void;
  (
    this: ThisParameterType<TFunc>,
    ...args: Parameters<TFunc>
  ): ReturnType<TFunc>;
};

function memoize2<TFunc extends (this: any, ...newArgs: any[]) => any>(
  resultFn: TFunc,
  keyFn?: (...newArgs: Parameters<TFunc>) => string,
  timeout = 2233000, //
): MemoizedFn<TFunc> {
  const cacheThis: any = {};
  const cacheObj: any = {};
  const cacheTime: any = {};

  // breaking cache when context (this) or arguments change
  function memoized(
    this: ThisParameterType<TFunc>,
    ...newArgs: Parameters<TFunc>
  ): ReturnType<TFunc> {
    const cacheKey = (keyFn && keyFn(...newArgs)) || "_";
    if (
      cacheTime[cacheKey] === undefined ||
      cacheThis[cacheThis] === this ||
      cacheObj[cacheKey] === undefined ||
      Date.now() - cacheTime[cacheKey] > timeout
    ) {
      cacheTime[cacheKey] = Date.now();
      if (resultFn.constructor.name == "AsyncFunction") {
        return (cacheObj[cacheKey] = (resultFn(...newArgs) as any).then(
          (value: ReturnType<TFunc>) => (cacheObj[cacheKey] = value),
        ));
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
      ? Object.keys(cacheTime).forEach((key2) => {
          (cacheKey === undefined || cacheKey.test(key2)) && del(key2);
        })
      : del(cacheKey);

  return memoized;
}

export default memoize2;
