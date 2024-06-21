class FixedTagColors {
  div: HTMLDivElement;
  onSave: EventListener;
  onGet: EventListener;

  constructor(div: HTMLDivElement, onGet: EventListener, onSave: EventListener) {
    this.div = div;
    this.onGet = onGet;
    this.onSave = onSave;
    div.addEventListener("get", this.onGet);
    div.addEventListener("save", this.onSave);
    div.dispatchEvent(new Event("get"));
    div.dispatchEvent(new Event("save"));
  }
}
new FixedTagColors(
  "" as any as HTMLDivElement,
  () => {},
  (ev) => {},
);
