export function init() {
  const replaceLabelMap = {
    "#ffd400": "Custom Yellow",
    "#ff6666": "Custom Red",
    "#5fb236": "Custom Green",
    "#2ea8e5": "Custom Blue",
    "#a28ae5": "Custom Purple",
    "#e56eee": "Custom Magenta",
    "#f19837": "Custom Orange",
    "#aaaaaa": "Custom Grey",
  };
  //@ts-ignore 111
  function hackContextMenuLabel(event) {
    setTimeout(() => {
      event.reader._iframeWindow?.document
        .querySelectorAll(".context-menu .row")
        // @ts-ignore 111
        .forEach((e) => {
          // const color = e.querySelector("[fill]")?.getAttribute("fill");
          // zotero调整了样式 必须是path下面的fill才有颜色
          const color = e.querySelector("path[fill]")?.getAttribute("fill");
          if (!color) {
            return;
          }
          if (color in replaceLabelMap) {
            // e.innerHTML = e.querySelector("svg")?.outerHTML + replaceLabelMap[color];
            // zotero调整了样式 这段换成了div，原本svg同样有效

            e.innerHTML =
              e.querySelector("div")?.outerHTML
              // @ts-ignore 111
              + replaceLabelMap[color];
          }
        });
    }, 10);
  }

  // 取消注释可以在Run JavaScript下方便调试
  // Zotero.Reader.unregisterEventListener("createAnnotationContextMenu", hackContextMenuLabel)
  // Zotero.Reader.registerEventListener("createColorContextMenu", hackContextMenuLabel)

  Zotero.Reader.registerEventListener(
    "createAnnotationContextMenu",
    hackContextMenuLabel,
    "zoterotag@euclpts.com",
  );

  Zotero.Reader.registerEventListener(
    "createColorContextMenu",
    hackContextMenuLabel,
    "zoterotag@euclpts.com",
  );
  // "重新加载" + new Date().toLocaleTimeString()
}
