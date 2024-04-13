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
    const man = text2Ma(text);
    ztoolkit.log(man);
    doc.querySelector(`#${config.addonRef}-copy-annotations`)?.remove();
    if (man.length == 0) return;
    addon.data.copy = text;
    const z = ztoolkit.UI.appendElement(
      {
        id: `${config.addonRef}-copy-annotations`,
        tag: "div",
        properties: { textContent: "已复制：" },
        styles: {
          position: "fixed",
          left: "10px",
          top: "45px",
          zIndex: "9999",
          boxShadow: "#999999 0px 0px 4px 3px",
          padding: "5px",
          background: "#ffffff",
        },
        children: man.map((m, i) => ({
          tag: "span",
          properties: { textContent: i + 1 + ":" + m.text.substring(0, 7) },
          styles: {
            background: "#ffffff",
            margin: "3px",
            border: "1px solid #000000",
          },
        })),
        listeners: [
          {
            type: "click",
            listener: (e) => {
              z.remove();
            },
          },
        ],
      },
      doc.body,
    );
    setTimeout(() => {
      z.remove();
    }, 10000);
  });
}
function text2Ma(text: string) {
  /*     text = `[image] ([pdf](zotero://open-pdf/library/items/7BWQVD5L?page=6&annotation=PA2E577M))  
([Rahmani 等, 2023, p. 828](zotero://select/library/items/SKGVY3QP))`


*/
  // const reStr = ".*[(]zotero://select/library/items/(.*?)[)][()[\\s]*pdf][(]zotero://open-pdf/library/items/(.*?)[?]page=(.*?)&annotation=(.*?)[)][)]";
  const reStr =
    ".*[[]pdf][(]zotero://open-pdf/library/items/(.*?)[?]page=(.*?)&annotation=(.*?)[)][)]";
  const reG = new RegExp(reStr, "g");
  const reN = new RegExp(reStr, "");
  const mag = text.match(reG) || [];
  const man = mag
    .map((m) => m.match(reN) || [])
    .map((a) => ({
      text: a[0],
      pdfKey: a[1],
      page: a[2],
      annotationKey: a[3],
    }));
  return man;
}
