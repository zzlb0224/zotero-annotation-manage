interface FixedTagColorsEventMap {
  // extends
  // GlobalEventHandlersEventMap,
  // OnErrorEventHandlerForNodesEventMap,
  // TouchEventHandlersEventMap
  fullscreenchange1: Event;
  fullscreenerror: Event;
}
class FixedTagColors extends EventTarget {
  div: HTMLDivElement;
  addEventListener<K extends keyof FixedTagColorsEventMap>(
    type: K,
    listener: (this: FixedTagColors, ev: FixedTagColorsEventMap[K]) => any,
    options?: boolean | AddEventListenerOptions,
  ): void {}

  constructor(div: HTMLDivElement, onGet: EventListener, onSave: EventListener) {
    super();
    this.div = div;
    // div.dispatchEvent(new Event("get"));
    // div.dispatchEvent(new Event("save"));
    this.dispatchEvent(new Event("fullscreenchange1"));
  }
}
const a = new FixedTagColors(
  "" as any as HTMLDivElement,
  () => {},
  (ev) => {},
);
a.addEventListener("fullscreenchange1", (e) => {});

class DOMEventTarget {
  listeners: Map<any, any>;
  constructor() {
    this.listeners = new Map();
  }
  addEventListener(type: string, listener: { (e: any): void; bind?: any }) {
    this.listeners.set(listener.bind(this), {
      type,
      listener,
    });
  }
  removeEventListener(type: any, listener: any) {
    for (const [key, value] of this.listeners) {
      if (value.type !== type || listener !== value.listener) {
        continue;
      }
      this.listeners.delete(key);
    }
  }
  dispatchEvent(event: Event) {
    Object.defineProperty(event, "target", { value: this });

    for (const [key, value] of this.listeners) {
      if (value.type !== event.type) {
        continue;
      }
      key(event);
    }
  }
}

const eventEmitter = new DOMEventTarget();
eventEmitter.addEventListener("test", (e: any) => {
  console.log("addEventListener works");
});
eventEmitter.dispatchEvent(new Event("test"));
