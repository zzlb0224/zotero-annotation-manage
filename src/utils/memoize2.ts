// 参考https://github.com/alexreardon/memoize-one设计的二代缓存

export type MemoizedFn<TFunc extends (this: any, ...args: any[]) => any> = {
  clear: () => void;
  remove: (key: string | RegExp) => void;
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
  memoized.clear = () => {
    memoized.remove("");
  };
  memoized.remove = (cacheKey: string | RegExp = "") =>
    cacheKey instanceof RegExp || cacheKey == ""
      ? Object.keys(cacheTime).forEach((key2) => {
          (cacheKey == "" || cacheKey.test(key2)) && delete cacheTime[key2];
        })
      : delete cacheTime[cacheKey];
  return memoized;
}

export default memoize2;
