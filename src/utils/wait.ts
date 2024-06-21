/**
 * Wait until the condition is `true` or timeout.
 * The callback is triggered if condition returns `true`.
 * @param condition
 * @param callback
 * @param interval
 * @param timeout
 */
export function waitUntil(condition: () => boolean, callback: () => void, interval = 100, timeout = 10000) {
  const start = Date.now();
  const intervalId = ztoolkit.getGlobal("setInterval")(() => {
    if (condition()) {
      ztoolkit.getGlobal("clearInterval")(intervalId);
      callback();
    } else if (Date.now() - start > timeout) {
      ztoolkit.getGlobal("clearInterval")(intervalId);
    }
  }, interval);
}

/**
 * Wait async until the condition is `true` or timeout.
 * @param condition
 * @param interval
 * @param timeout
 */
export function waitUtilAsync(condition: () => boolean, interval = 100, timeout = 10000) {
  return new Promise<void>((resolve, reject) => {
    const start = Date.now();
    const intervalId = ztoolkit.getGlobal("setInterval")(() => {
      if (condition()) {
        ztoolkit.getGlobal("clearInterval")(intervalId);
        resolve();
      } else if (Date.now() - start > timeout) {
        ztoolkit.getGlobal("clearInterval")(intervalId);
        reject();
      }
    }, interval);
  });
}
export function waitFor<T>(checkAndReturn: () => T, timeout = 100000, interval = 100): Promise<T | false> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    const intervalId = setInterval(() => {
      const c = checkAndReturn();
      if (c) {
        clearInterval(intervalId);
        resolve(c);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(intervalId);
        resolve(false); //只需要成功
      }
    }, interval);
  });
}
