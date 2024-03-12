export function memoize<T>(func: () => T): {
  get: () => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T>(
  func: () => T,
  keyfn: (() => string) | undefined | null,
): { get: () => T; remove: (cacheKey: string | RegExp) => void };
export function memoize<T>(
  func: () => T,
  keyfn: (() => string) | undefined | null,
  cacheTime: number,
): { get: () => T; remove: (cacheKey: string | RegExp) => void };
export function memoize<T, T1>(
  func: (arg1: T1) => T,
): { get: (arg1: T1) => T; remove: (cacheKey: string | RegExp) => void };
export function memoize<T, T1>(
  func: (arg1: T1) => T,
  keyfn: ((arg1: T1) => string) | undefined | null,
): { get: (arg1: T1) => T; remove: (cacheKey: string | RegExp) => void };
export function memoize<T, T1>(
  func: (arg1: T1) => T,
  keyfn: ((arg1: T1) => string) | undefined | null,
  cacheTime: number,
): { get: (arg1: T1) => T; remove: (cacheKey: string | RegExp) => void };
export function memoize<T, T1, T2>(
  func: (arg1: T1, arg2: T2) => T,
): {
  get: (arg1: T1, arg2: T2) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2>(
  func: (arg1: T1, arg2: T2) => T,
  keyfn: ((arg1: T1, arg2: T2) => string) | undefined | null,
): {
  get: (arg1: T1, arg2: T2) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2>(
  func: (arg1: T1, arg2: T2) => T,
  keyfn: ((arg1: T1, arg2: T2) => string) | undefined | null,
  cacheTime: number,
): {
  get: (arg1: T1, arg2: T2) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3>(
  func: (arg1: T1, arg2: T2, arg3: T3) => T,
): {
  get: (arg1: T1, arg2: T2, arg3: T3) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3>(
  func: (arg1: T1, arg2: T2, arg3: T3) => T,
  keyfn: ((arg1: T1, arg2: T2, arg3: T3) => string) | undefined | null,
): {
  get: (arg1: T1, arg2: T2, arg3: T3) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3>(
  func: (arg1: T1, arg2: T2, arg3: T3) => T,
  keyfn: ((arg1: T1, arg2: T2, arg3: T3) => string) | undefined | null,
  cacheTime: number,
): {
  get: (arg1: T1, arg2: T2, arg3: T3) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4>(
  func: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => T,
): {
  get: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4>(
  func: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => T,
  keyfn:
    | ((arg1: T1, arg2: T2, arg3: T3, arg4: T4) => string)
    | undefined
    | null,
): {
  get: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4>(
  func: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => T,
  keyfn:
    | ((arg1: T1, arg2: T2, arg3: T3, arg4: T4) => string)
    | undefined
    | null,
  cacheTime: number,
): {
  get: (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4, T5>(
  func: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => T,
): {
  get: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4, T5>(
  func: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => T,
  keyfn:
    | ((arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => string)
    | undefined
    | null,
): {
  get: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4, T5>(
  func: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => T,
  keyfn:
    | ((arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => string)
    | undefined
    | null,
  cacheTime: number,
): {
  get: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4, T5, T6>(
  func: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6) => T,
): {
  get: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4, T5, T6>(
  func: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6) => T,
  keyfn:
    | ((arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6) => string)
    | undefined
    | null,
): {
  get: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4, T5, T6>(
  func: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6) => T,
  keyfn:
    | ((arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6) => string)
    | undefined
    | null,
  cacheTime: number,
): {
  get: (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5, arg6: T6) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4, T5, T6, T7>(
  func: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
  ) => T,
): {
  get: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
  ) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4, T5, T6, T7>(
  func: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
  ) => T,
  keyfn:
    | ((
        arg1: T1,
        arg2: T2,
        arg3: T3,
        arg4: T4,
        arg5: T5,
        arg6: T6,
        arg7: T7,
      ) => string)
    | undefined
    | null,
): {
  get: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
  ) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4, T5, T6, T7>(
  func: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
  ) => T,
  keyfn:
    | ((
        arg1: T1,
        arg2: T2,
        arg3: T3,
        arg4: T4,
        arg5: T5,
        arg6: T6,
        arg7: T7,
      ) => string)
    | undefined
    | null,
  cacheTime: number,
): {
  get: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
  ) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4, T5, T6, T7, T8>(
  func: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
    arg8: T8,
  ) => T,
): {
  get: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
    arg8: T8,
  ) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4, T5, T6, T7, T8>(
  func: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
    arg8: T8,
  ) => T,
  keyfn:
    | ((
        arg1: T1,
        arg2: T2,
        arg3: T3,
        arg4: T4,
        arg5: T5,
        arg6: T6,
        arg7: T7,
        arg8: T8,
      ) => string)
    | undefined
    | null,
): {
  get: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
    arg8: T8,
  ) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4, T5, T6, T7, T8>(
  func: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
    arg8: T8,
  ) => T,
  keyfn:
    | ((
        arg1: T1,
        arg2: T2,
        arg3: T3,
        arg4: T4,
        arg5: T5,
        arg6: T6,
        arg7: T7,
        arg8: T8,
      ) => string)
    | undefined
    | null,
  cacheTime: number,
): {
  get: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
    arg8: T8,
  ) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4, T5, T6, T7, T8, T9>(
  func: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
    arg8: T8,
    arg9: T9,
  ) => T,
): {
  get: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
    arg8: T8,
    arg9: T9,
  ) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4, T5, T6, T7, T8, T9>(
  func: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
    arg8: T8,
    arg9: T9,
  ) => T,
  keyfn:
    | ((
        arg1: T1,
        arg2: T2,
        arg3: T3,
        arg4: T4,
        arg5: T5,
        arg6: T6,
        arg7: T7,
        arg8: T8,
        arg9: T9,
      ) => string)
    | undefined
    | null,
): {
  get: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
    arg8: T8,
    arg9: T9,
  ) => T;
  remove: (cacheKey: string | RegExp) => void;
};
export function memoize<T, T1, T2, T3, T4, T5, T6, T7, T8, T9>(
  func: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
    arg8: T8,
    arg9: T9,
  ) => T,
  keyfn:
    | ((
        arg1: T1,
        arg2: T2,
        arg3: T3,
        arg4: T4,
        arg5: T5,
        arg6: T6,
        arg7: T7,
        arg8: T8,
        arg9: T9,
      ) => string)
    | undefined
    | null,
  cacheTime: number,
): {
  get: (
    arg1: T1,
    arg2: T2,
    arg3: T3,
    arg4: T4,
    arg5: T5,
    arg6: T6,
    arg7: T7,
    arg8: T8,
    arg9: T9,
  ) => T;
  remove: (cacheKey: string | RegExp) => void;
};

export function memoize<T>(
  func: (...args: any) => T,
  keyfn: ((...args: any) => string) | undefined | null = undefined,
  cacheTime = 60000,
): { get: (...args: any) => T; remove: (cacheKey: string | RegExp) => void } {
  const cache: { [key: string]: T | undefined | Promise<T> } = {};
  const time: { [key: string]: number } = {};
  return {
    get: (...args: any): T => {
      const cacheKey = (keyfn ? keyfn(...args) : `_${args.join("_")}_`) || "_";
      if (
        time[cacheKey] === undefined ||
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
}

/*
a=(n)=>`export function memoize<T,${Array.from({length:n}).map((e,i)=>"T"+(i+1)).join(",")}>(
  func: ((${Array.from({length:n}).map((e,i)=>"arg"+(i+1)+":T"+(i+1)).join(",")}) => T)
):{get:(${Array.from({length:n}).map((e,i)=>"arg"+(i+1)+":T"+(i+1)).join(",")})=>T,remove:(cacheKey: string | RegExp )=>void}
export function memoize<T,${Array.from({length:n}).map((e,i)=>"T"+(i+1)).join(",")}>(
  func:((${Array.from({length:n}).map((e,i)=>"arg"+(i+1)+":T"+(i+1)).join(",")}) => T),
  keyfn: ((${Array.from({length:n}).map((e,i)=>"arg"+(i+1)+":T"+(i+1)).join(",")}) => string) | undefined | null 
):{get:(${Array.from({length:n}).map((e,i)=>"arg"+(i+1)+":T"+(i+1)).join(",")})=>T,remove:(cacheKey: string | RegExp )=>void}
export function memoize<T,${Array.from({length:n}).map((e,i)=>"T"+(i+1)).join(",")}>(
  func: ((${Array.from({length:n}).map((e,i)=>"arg"+(i+1)+":T"+(i+1)).join(",")}) => T),
  keyfn: ((${Array.from({length:n}).map((e,i)=>"arg"+(i+1)+":T"+(i+1)).join(",")}) => string) | undefined | null ,
  cacheTime:number
):{get:(${Array.from({length:n}).map((e,i)=>"arg"+(i+1)+":T"+(i+1)).join(",")})=>T,remove:(cacheKey: string | RegExp )=>void}
`
Array.from({length:10}).map((e,m)=>a
(m)).join("")

*/
