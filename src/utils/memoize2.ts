function keyFnDefault(newInputs: readonly unknown[]): string {
  return ["", ...newInputs, ""].join("_");
}

export type MemoizedFn<TFunc extends (this: any, ...args: any[]) => any> = {
  clear: () => void;
  remove: (key: string | RegExp) => void;
  (
    this: ThisParameterType<TFunc>,
    ...args: Parameters<TFunc>
  ): ReturnType<TFunc>;
};

function memoizeOne<TFunc extends (this: any, ...newArgs: any[]) => any>(
  resultFn: TFunc,
  keyFn?: (...newArgs: Parameters<TFunc>) => string,
  timeout = 60000,
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

  // Adding the ability to clear the cache of a memoized function
  memoized.clear = function clear() {
    Object.keys(cacheTime).forEach((k) => delete cacheTime[k]);
  };
  memoized.remove = function remove(key: string | RegExp) {
    key instanceof RegExp || key == ""
      ? Object.keys(cacheTime).forEach((key2) => {
          (key == "" || key.test(key2)) && delete cacheTime[key2];
        })
      : delete cacheTime[key];
  };

  return memoized;
}

export default memoizeOne;
