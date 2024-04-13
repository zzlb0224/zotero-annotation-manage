import { config } from "../../package.json";
function register() {
  Zotero.Reader.registerEventListener(
    "renderToolbar",
    readerToolbarCallback,
    config.addonID,
  );
  Zotero.Reader.registerEventListener(
    "renderSidebarAnnotationHeader",
    renderSidebarAnnotationHeaderCallback,
    config.addonID,
  );
}
function unregister() {
  Zotero.Reader.unregisterEventListener("renderToolbar", readerToolbarCallback);
  Zotero.Reader.unregisterEventListener(
    "renderSidebarAnnotationHeader",
    renderSidebarAnnotationHeaderCallback,
  );
}
export default { register, unregister };

function readerToolbarCallback(
  event: Parameters<_ZoteroTypes.Reader.EventHandler<"renderToolbar">>[0],
) {
  const { append, doc, reader } = event;
  copyFunc(doc, "readerToolbarCallback");
}
function renderSidebarAnnotationHeaderCallback(
  event: Parameters<
    _ZoteroTypes.Reader.EventHandler<"renderSidebarAnnotationHeader">
  >[0],
): void | Promise<void> {
  const { append, doc, reader } = event;
  copyFunc(doc, "renderSidebarAnnotationHeaderCallback");
}

function copyFunc(doc: Document, copyFrom: string = "") {
  if ((doc as any)._copyFrom) return;
  (doc as any)._copyFrom = copyFrom;
  doc.addEventListener("copy", function (e) {
    // clipboardData 对象是为通过编辑菜单、快捷菜单和快捷键执行的编辑操作所保留的，也就是你复制或者剪切内容
    //@ts-ignore window.clipboardData
    const clipboardData = e.clipboardData || window.clipboardData;
    // 如果 未复制或者未剪切，直接 return
    if (!clipboardData) return;
    // Selection 对象 表示用户选择的文本范围或光标的当前位置。
    // 声明一个变量接收 -- 用户输入的剪切或者复制的文本转化为字符串
    const text = clipboardData.getData("text") as string;
    ztoolkit.log("123 copy", doc, clipboardData, clipboardData.getData("text"));
    if (!text) return;
    const reStr =
      "(.*)[(]zotero://select/library/items/(.*?)[)][()[\\s]*pdf][(]zotero://open-pdf/library/items/(.*?)[?]page=(.*?)&annotation=(.*?)[)][)]";
    const reG = new RegExp(reStr, "g");
    const reN = new RegExp(reStr, "");
    const mag = text.match(reG) || [];
    const man = mag
      .map((m) => m.match(reN) || [])
      .map((a) => ({
        text: a[0],
        itemKey: a[2],
        pdfKey: a[3],
        page: a[4],
        annotationKey: a[5],
      }));
    ztoolkit.log(man);
    doc.querySelector(`#${config.addonRef}-copy-annotations`)?.remove();
    const z = ztoolkit.UI.appendElement(
      {
        id: `${config.addonRef}-copy-annotations`,
        tag: "div",
        properties: { textContent: "已复制：" },
        styles: {
          position: "fixed",
          right: "100px",
          top: "0",
          zIndex: "9999",
          boxShadow: "#999999 0px 0px 4px 3px",
        },
        children: man.map((m) => ({
          tag: "span",
          properties: { textContent: m.text.substring(1, 10) },
          styles: { background: "#ffffff", margin: "3px" },
        })),
      },
      doc.body,
    );
    setTimeout(() => {
      z.remove();
    }, 10000);
  });
}
