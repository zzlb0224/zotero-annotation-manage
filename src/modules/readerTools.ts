import { start } from "repl";
import { config } from "../../package.json";
import {
  Relations,
  Timer,
  createTopDiv,
  getFileContent,
  getItem,
  injectCSS,
  memSVG,
  openAnnotation,
} from "../utils/zzlb";
import { getPref } from "../utils/prefs";
import { compare } from "../utils/sort";

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
  const { append, doc, reader, params } = event;
  ztoolkit.log("readerToolbarCallback reader.css");
  copyFunc(doc, "readerToolbarCallback");
  injectCSS(doc, "reader1.css");
}
function renderSidebarAnnotationHeaderCallback(
  event: Parameters<
    _ZoteroTypes.Reader.EventHandler<"renderSidebarAnnotationHeader">
  >[0],
): void | Promise<void> {
  const { append, doc, reader, params } = event;
  // copyFunc(doc, "renderSidebarAnnotationHeaderCallback");
  if (getPref("hide-annotation-link")) return;
  // ztoolkit.log(event, params.annotation.id);
  const relations = new Relations(params.annotation.id);
  // relations.getLinkRelations()
  // const relatedAnnotations= getRelatedAnnotations(ann);
  const linkAnnotations = relations.getLinkRelations();
  // ztoolkit.log("readerToolbarCallback111", params, linkAnnotations);
  const userActions: HTMLElement[] = [];
  const add = ztoolkit.UI.createElement(doc, "span", {
    id: `renderSidebarAnnotationHeader-add-${params.annotation.id}`,
    properties: { textContent: "🧷" },
    classList: ["zotero-annotation-manage-red"],
    listeners: [
      {
        type: "click",
        listener: (e) => {
          const r = new Relations(params.annotation.id);
          // const man = Relations.allOpenPdf(addon.data.copy);
          // r.addRelations(man.map((a) => a.openPdf));
          r.addRelations(Relations.openPdf2URI(addon.data.copy));
        },
      },
      {
        type: "mouseover",
        listener: (e) => {
          (e.target as HTMLElement).style.backgroundColor = "#F0F0F0";
        },
      },
      {
        type: "mouseout",
        listener: (e) => {
          (e.target as HTMLElement).style.removeProperty("background-color");
        },
      },
    ],
    enableElementRecord: false,
    ignoreIfExists: true,
  });
  userActions.push(add);
  // ztoolkit.log("userActions1", userActions);
  if (linkAnnotations && linkAnnotations.length > 0) {
    const u = ztoolkit.UI.createElement(doc, "span", {
      id:
        config.addonRef +
        `renderSidebarAnnotationHeader-link-${params.annotation.id}`,
      properties: { textContent: "🍡" },
      listeners: [
        {
          type: "click",
          listener: (e) => {
            // const r0 = relatedAnnotations[0];
            // openAnnotation(r0.parentItem!,r0.annotationPageLabel,r0.key)
            createPopupDiv(doc, params.annotation.id);
            // ztoolkit.log(m);
            // const m0 = m[0];
            // openAnnotation(m0.pdfKey, m0.page, m0.annotationKey);
            // const m=linkAnnotations[0].match(new RegExp("zotero://open-pdf/library/items/(.*?)[?]page=(.*?)&annotation=(.*)"))
            // if(m)
            // openAnnotation(Zotero.Items.get(m[1]),m[2],m[3]);
            e.preventDefault();
          },
        },
        {
          type: "mouseover",
          listener: (e) => {
            (e.target as HTMLElement).style.backgroundColor = "#F0F0F0";
            createPopupDiv(doc, params.annotation.id);
          },
        },
        {
          type: "mouseout",
          listener: (e) => {
            (e.target as HTMLElement).style.removeProperty("background-color");
          },
        },
      ],
      enableElementRecord: false,
      ignoreIfExists: true,
    });
    userActions.push(u);
  }
  // ztoolkit.log("userActions2", userActions);
  if (userActions.length > 0) append(...userActions);
}
async function createPopupDiv(doc: Document, anKey: string) {
  const anFrom = getItem(anKey);
  const div = createTopDiv(
    doc,
    config.addonRef + `-renderSidebarAnnotationHeader-TopDiv`,
    ["action", "status", "query", "content"],
  )!;
  div.className = "zotero-annotation-manage-red";
  const fromEle = doc.getElementById(
    config.addonRef + `renderSidebarAnnotationHeader-link-${anKey}`,
  )!;
  div.style.left = fromEle.offsetLeft + 20 + "px";
  const scrollTop = doc.getElementById("annotations")?.scrollTop || 0;
  div.style.top = fromEle.offsetTop - scrollTop + "px";
  ztoolkit.log("top", fromEle.offsetTop, fromEle.clientTop, fromEle.offsetTop);
  const timer = new Timer(() => div.remove());
  div.addEventListener("mouseover", () => {
    timer.clearTimer();
  });
  div.addEventListener("mouseout", () => {
    timer.startTimer();
  });
  fromEle.addEventListener("mouseover", () => {
    timer.clearTimer();
  });
  fromEle.addEventListener("mouseout", () => {
    timer.startTimer();
  });

  const anFromRelations = new Relations(anFrom);
  const fromLinkRelations = anFromRelations.getLinkRelations();
  // const m = Relations.mapOpenPdf(linkAnnotations);
  const content = div.querySelector(".content")! as HTMLElement;
  // content.style.flexDirection ="column"
  content.style.flexWrap = "wrap";
  content.style.justifyContent = "flex-start";
  div.style.background = "#eeeeee";

  const toAns = fromLinkRelations
    .map((toItemURI) => getItem(Zotero.URI.getURIItemID(toItemURI) || ""))
    .sort(
      compare(
        "parentKey",
        "annotationPageLabel",
        "annotationPosition",
        undefined,
      ),
    );
  for (const anTo of toAns) {
    const u2 = ztoolkit.UI.appendElement(
      {
        tag: "div",
        styles: {
          padding: "5px",
          marginRight: "20px",
          display: "flex",
          alignItems: "stretch",
          flexDirection: "column",
          width: "260px",
          background: "#fff",
          borderRadius: "5px",
          margin: "4px",
        },
        properties: { textContent: "" },
        children: [
          {
            tag: "div",
            listeners: [
              {
                type: "click",
                listener: (e) => {
                  e.stopPropagation();
                  if (anTo.parentItemKey)
                    openAnnotation(
                      anTo.parentItemKey,
                      anTo.annotationPageLabel,
                      anTo.key,
                    );
                },
                options: { capture: true },
              },
            ],
            children: [
              {
                tag: "div",
                styles: {
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                },
                children: [
                  {
                    tag: "span",
                    styles: { color: anTo.annotationColor },
                    properties: {
                      textContent: anTo.annotationType,
                      innerHTML:
                        (await memSVG(
                          `chrome://${config.addonRef}/content/16/annotate-${anTo.annotationType}.svg`,
                        )) || anTo.annotationType,
                    },
                  },
                  // {
                  //   tag: "span",
                  //   styles: {  },
                  //   properties: { textContent: `${anTo.parentItem?.parentItem?.getField("firstCreator")},${anTo.parentItem?.parentItem?.getField("year")}` },
                  // },
                  {
                    tag: "span",
                    styles: {},
                    properties: {
                      textContent:
                        anTo.parentItem?.parentItem
                          ?.getDisplayTitle()
                          .substring(0, 15) + "...",
                    },
                  },

                  {
                    tag: "div",
                    styles: { color: "red", fontSize: "1.5em" },
                    properties: { textContent: "🗑" },
                    listeners: [
                      {
                        type: "click",
                        listener: (e) => {
                          e.stopPropagation();
                          // ztoolkit.log("remove 1", anFromRelations.getLinkRelations());
                          anFromRelations.removeRelations([toItemURI]);
                          u2.remove();
                          // ztoolkit.log("remove 2", anFromRelations.getLinkRelations());
                          if (anFromRelations.getLinkRelations().length == 0) {
                            doc
                              .getElementById(
                                config.addonRef +
                                  `-renderSidebarAnnotationHeader-TopDiv`,
                              )
                              ?.remove();
                            fromEle.remove();
                          }
                        },
                        options: true,
                      },
                    ],
                  },
                ],
              },
              // {
              //   tag: "div",
              //   styles: {  },
              //   properties: { textContent: anTo.parentItem?.parentItem?.getDisplayTitle().substring(0,10)+"..." },
              // },
              {
                tag: "div",
                styles: {
                  background: anTo.annotationColor + "60", //width: "200px",
                  maxHeight: "100px",
                  overflowY: "scroll",
                },
                properties: { innerHTML: await getAnnotationContent(anTo) },
              },
              {
                tag: "div",
                styles: {
                  background: anTo.annotationColor + "10", //width: "200px"
                },
                properties: {
                  textContent: anTo
                    .getTags()
                    .map((a) => a.tag)
                    .join(","),
                },
              },
            ],
          },
        ],
      },
      div.querySelector(".content")!,
    );
  }
}
async function getAnnotationContent(ann: Zotero.Item) {
  const html = (await Zotero.BetterNotes.api.convert.annotations2html([ann], {
    noteItem: undefined,
  })) as string;
  return html.replace(/<img /g, '<img style="max-width: 100%;height: auto;" ');
}

function getRelatedAnnotations(ann: Zotero.Item) {
  if (ann.relatedItems && ann.relatedItems.length > 0) {
    const relatedItemsA = Zotero.Items.get(ann.relatedItems);
    ztoolkit.log("getRelatedAnnotations", relatedItemsA);
    return relatedItemsA.filter((f) => f.isAnnotation());
  }
  return [];
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
    // ztoolkit.log("123 copy", doc, clipboardData, clipboardData.getData("text"));
    if (!text) return;
    // const man = text2Ma(text);
    const man = Relations.allOpenPdf(text);
    ztoolkit.log(man);
    doc.querySelector(`#${config.addonRef}-copy-annotations`)?.remove();
    if (man.length == 0) return;
    addon.data.copy = text;
    ztoolkit.log("复制内容 有效", addon.data.copy, man);
    const div = createTopDiv(doc, `${config.addonRef}-copy-annotations`, [
      "query",
      "content",
    ])!;

    div.style.left = "10px";
    div.style.top = "45px";
    div.style.boxShadow = "#999999 0px 0px 4px 3px";
    const content = div.querySelector(".content")!;
    const query = div.querySelector(".query")!;
    man
      .map((m, i) => {
        const an = getItem(m.annotationKey);
        const content =
          (an.annotationComment || "") + (an.annotationText || "") + m.text;
        return {
          tag: "span",
          properties: { textContent: i + 1 + ":" + content.substring(0, 7) },
          styles: {
            background: an.annotationColor + "80",
            margin: "3px",
            border: "1px solid #000000",
          },
        };
      })
      .forEach((f) => ztoolkit.UI.appendElement(f, content));
    const timer = new Timer(() => {
      div.remove();
    }, 10000);
    timer.startTimer();
    div.addEventListener("mouseover", () => {
      timer.clearTimer();
    });
    div.addEventListener("mouseout", () => {
      timer.startTimer(3000);
    });
    query.textContent = "已复制";
    div.addEventListener(
      "click",
      (e) => {
        if (query.textContent == "已复制") {
          query.textContent = "已清空";
          addon.data.copy = "";
        } else {
          query.textContent = "已复制";
          addon.data.copy = text;
        }
      },
      { capture: true },
    );
    // content.addEventListener("click",(e)=>{e.stopPropagation()
    //   content.textContent= content.textContent == "1已复制"?"1清空":"1已复制"},{"capture":true})
    // const z = ztoolkit.UI.appendElement(
    //   {
    //     id: `${config.addonRef}-copy-annotations`,
    //     tag: "div",
    //     properties: { textContent: "已复制：" },
    //     styles: {
    //       position: "fixed",
    //       left: "10px",
    //       top: "45px",
    //       zIndex: "9999",
    //       boxShadow: "#999999 0px 0px 4px 3px",
    //       padding: "5px",
    //       background: "#ffffff",
    //     },
    //     children: man.map((m, i) => {
    //       const an = getItem(m.annotationKey);
    //       const content =
    //         (an.annotationComment || "") + (an.annotationText || "") + m.text;
    //       return {
    //         tag: "span",
    //         properties: { textContent: i + 1 + ":" + content.substring(0, 7) },
    //         styles: {
    //           background: an.annotationColor + "80",
    //           margin: "3px",
    //           border: "1px solid #000000",
    //         },
    //       };
    //     }),
    //     listeners: [
    //       {
    //         type: "click",
    //         listener: (e) => {
    //           z.remove();
    //         },
    //       },
    //     ],
    //   },
    //   doc.body,
    // );
    // setTimeout(() => {
    //   z.remove();
    // }, 10000);
  });
}
export function text2Ma(text: string) {
  //    text = `“H2a：企业占据的结构洞数正向调节知识关键性 与网络权力的关系。 H2b：企业占据的结构洞数正向调节知识不可替 代性与网络权力的关系。 H2c：企业占据的结构洞数正向调节知识中心性 与网络权力的关系。” ([⁨刘立⁩和⁨党兴华⁩, 2014, p. 3](zotero://select/library/items/MBYKPZRC)) ([pdf](zotero://open-pdf/library/items/ALUKNMR8?page=3&annotation=UJ8F3GL4))

  // [image] ([pdf](zotero://open-pdf/library/items/ALUKNMR8?page=3&annotation=CCYZI87Y))
  // ([⁨刘立⁩和⁨党兴华⁩, 2014, p. 3](zotero://select/library/items/MBYKPZRC))

  // “知识价值性” ([⁨刘立⁩和⁨党兴华⁩, 2014, p. 5](zotero://select/library/items/MBYKPZRC)) ([pdf](zotero://open-pdf/library/items/ALUKNMR8?page=5&annotation=IL3PXPUF))`

  const reStr =
    ".*[[]pdf][(](zotero://open-pdf/library/items/(.*?)[?]page=(.*?)&annotation=(.*?))[)][)]";
  const reG = new RegExp(reStr, "g");
  const reN = new RegExp(reStr, "");
  // const reG = /.*[[]pdf][(](zotero:\/\/open-pdf\/library\/items\/(.*?)[?]page=(.*?)&annotation=(.*?))[)][)].*/g;
  // const reN = /^.*[[]pdf][(](zotero:\/\/open-pdf\/library\/items\/(.*?)[?]page=(.*?)&annotation=(.*?))[)][)].*$/;
  const mag = text.match(reG) || [];
  const man = mag
    .map((m) => m.match(reN) || [])
    .map((a) => ({
      text: a[0],
      openPdf: a[1],
      pdfKey: a[2],
      page: a[3],
      annotationKey: a[4],
    }));
  man;
  return man;
}
