import { config } from "../../package.json";
import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { getPref, setPref } from "../utils/prefs";
import { sortAsc, sortFixedTags10AscByKey, sortFixedTags10ValuesLength, sortKey, sortValuesLength } from "../utils/sort";
import { uniqueBy } from "../utils/uniqueBy";
import {
  AnnotationRes,
  clearChild,
  convertHtml,
  createTopDiv,
  getAnnotationContent,
  getItem,
  getPublicationTags,
  memSVG,
  openAnnotation,
  setProperty,
  stopPropagation,
  str2RegExps,
  toggleProperty,
} from "../utils/zzlb";
import { getSelectedItems, createActionTag } from "./menu";
import { showTitle } from "./RelationHeader";
import { groupBy } from "../utils/groupBy";
import { getCiteItemHtmlWithPage, getCiteAnnotationHtml, getCiteItemHtml } from "./getCitationItem";
import { ProgressWindowHelper } from "zotero-plugin-toolkit/dist/helpers/progressWindow";
import { getString } from "../utils/locale";
import { createRoot } from "react-dom/client";
import { IntlProvider } from "react-intl";
import * as React from "react";
import { AnnotationMatrix, content2AnnotationMatrix } from "../component/AnnotationMatrix";
// import { groupBy } from "lodash";

export function getAllAnnotations(items: Zotero.Item[]) {
  const items1 = items.map((a) => (a.isAttachment() && a.isPDFAttachment() && a.parentItem ? a.parentItem : a));
  // ztoolkit.log(4444, items1);
  const data = uniqueBy(items1, (a) => a.key)
    .filter((f) => !f.isAttachment())
    .flatMap((item) => {
      const itemTags = item
        .getTags()
        .map((a) => a.tag)
        .sort(sortAsc)
        .join("  ");
      const author = item.getField("firstCreator");
      const year = item.getField("year");
      const title = item.getField("title");
      // ztoolkit.log(555, item);
      return Zotero.Items.get(item.getAttachments(false))
        .filter((f) => f.isAttachment() && f.isPDFAttachment())
        .flatMap((pdf) => {
          // ztoolkit.log(666, pdf);
          const pdfTitle = pdf.getDisplayTitle();
          return pdf.getAnnotations().flatMap((ann) => {
            const text = ann.annotationText || "";
            const comment = ann.annotationComment || "";
            const color = ann.annotationColor;
            const type = ann.annotationType;
            const tags = ann.getTags();
            const annotationTags = tags.map((a) => a.tag).join("  ");
            const page = ann.annotationPageLabel;
            const dateModified = ann.dateModified;
            const o = {
              item,
              pdf,
              ann,
              author,
              year,
              title,
              pdfTitle,
              text,
              color,
              type,
              comment,
              itemTags,
              page,
              dateModified,
              tag: {
                tag: "在filter使用flatMap之后才能用。例如：filter:(ans)=>ans.flatMap(an=>an.tags.map(tag=>Object.assign({},an,{tag})))",
                type: 0,
              },
              tags,
              annotationTags,
              html: "<span color='red'>等待转换：请调用convertHtml方法</span>",
            } as AnnotationRes;
            return o;
          });
        });
    });
  return data;
}

export function getTitleFromAnnotations(annotations: AnnotationRes[]) {
  const itemsLength = uniqueBy(annotations, (a) => a.item.key).length;
  // const pdfLength = uniqueBy(annotations, (a) => a.pdf.key).length;
  const annotationLength = uniqueBy(annotations, (a) => a.ann.key).length;
  // const tagLength = uniqueBy(annotations, (a) => a.tag.tag).length;
  // ${itemsLength}-${annotationLength}
  const title = `批注 (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}) ${annotationLength}`;
  return title;
}

export function createSearchAnnContent(dialogWindow: Window | undefined, popupDiv: HTMLElement | undefined, annotations: AnnotationRes[]) {
  const isWin = dialogWindow != undefined;
  const doc = dialogWindow?.document.documentElement || popupDiv;
  if (!doc) return;
  dialogWindow?.addEventListener("resize", (e) => {
    updatePageContentDebounce();
  });
  let text = "";
  let tag = "";
  let rowSize = (getPref("SearchAnnRowSize") as number) || 4;
  let columnSize = (getPref("SearchAnnColumnSize") as number) || 5;
  let pageSize = rowSize * columnSize;
  // let pageSize = (getPref("SearchAnnPageSize") as number) || 16;
  let pageIndex = 1;
  let fontSize = (getPref("SearchAnnFontSize") as number) || 16;
  let bShowTitle = (getPref("bShowTitle") as boolean) || false;
  let bShowTag = (getPref("bShowTag") as boolean) || false;
  let bShowRank = (getPref("bShowRank") as boolean) || false;
  let bFixedHeight = (getPref("bFixedHeight") as boolean) || false;
  const fixedHeight = (getPref("fixedHeight") as number) || 180;
  const selectedAnnotationType: string[] = [];
  let ans: AnnotationRes[] = annotations;

  const content = doc.querySelector(".content") as HTMLElement;
  const query = doc.querySelector(".query") as HTMLElement;
  const status = doc.querySelector(".status") as HTMLElement;
  ztoolkit.log(content, query, status);
  content.parentElement!.style.fontSize = fontSize + "px";
  const inputTag: TagElementProps = {
    tag: "div",
    styles: { display: "flex", flexDirection: "row", flexWrap: "wrap" },
    children: [
      { tag: "div", properties: { textContent: "" } },
      {
        tag: "div",
        properties: { textContent: "批注、笔记" },
        children: [
          {
            tag: "input",
            namespace: "html",
            properties: { placeholder: "支持正则" },
            styles: { width: "200px" },
            listeners: [
              {
                type: "keyup",
                listener: (ev: any) => {
                  stopPropagation(ev);
                  text = (ev.target as HTMLInputElement).value;
                  updateFilter();
                },
              },
            ],
          },
        ],
      },
      {
        tag: "div",
        properties: { textContent: "标签" },
        children: [
          {
            tag: "input",
            namespace: "html",
            properties: { placeholder: "支持正则" },
            styles: { width: "200px" },
            listeners: [
              {
                type: "keyup",
                listener: (ev: Event) => {
                  stopPropagation(ev);
                  tag = (ev.target as HTMLInputElement).value.trim();
                  updateFilter();
                },
              },
            ],
          },
        ],
      },
      {
        tag: "div",
        properties: { textContent: "类型：" },
        children: ["highlight", "image", "underline", "note", "ink", "text"].flatMap((a) => [
          {
            tag: "label",
            namespace: "html",
            properties: { textContent: a },
            styles: { paddingRight: "20px" },
            children: [
              {
                tag: "input",
                namespace: "html",
                properties: {
                  textContent: a,
                  placeholder: a,
                  type: "checkbox",
                },
                listeners: [
                  {
                    type: "change",
                    listener: (ev: any) => {
                      ev.stopPropagation();
                      const ck = ev.target as HTMLInputElement;
                      if (selectedAnnotationType.includes(a)) {
                        selectedAnnotationType.splice(selectedAnnotationType.indexOf(a), 1);
                        ck.checked = false;
                      } else {
                        selectedAnnotationType.push(a);
                        ck.checked = true;
                      }
                      updateFilter();
                    },
                    options: { capture: true },
                  },
                ],
              },
            ],
          },
        ]),
      },
      {
        tag: "button",
        properties: { textContent: getString("export") },
        listeners: [
          {
            type: "click",
            listener: (e) => {
              e.stopPropagation();
              //预览批注导出的按钮
              exportNote({ filter: () => ans, toText: toText1 });
              dialogWindow?.close();
              popupDiv?.remove();
            },
            options: { capture: true },
          },
        ],
      },
      {
        tag: "label",
        properties: { textContent: "列" },
        children: [
          {
            tag: "input",
            namespace: "html",
            properties: {
              placeholder: "输入数字",
              value: columnSize,
              type: "number",
            },
            styles: { width: "30px" },
            listeners: [
              {
                type: "change",
                listener: (ev: Event) => {
                  stopPropagation(ev);
                  columnSize = parseInt((ev.target as HTMLInputElement).value.trim());
                  if (columnSize <= 0) columnSize = 1;
                  (ev.target as HTMLInputElement).value = columnSize + "";
                  pageSize = rowSize * columnSize;
                  setPref("SearchAnnColumnSize", columnSize);
                  updatePageContentDebounce();
                },
              },
            ],
          },
        ],
      },
      {
        tag: "label",
        properties: { textContent: "行" },
        children: [
          {
            tag: "input",
            namespace: "html",
            properties: {
              placeholder: "输入数字",
              value: rowSize,
              type: "number",
            },
            styles: { width: "30px" },
            listeners: [
              {
                type: "change",
                listener: (ev: Event) => {
                  stopPropagation(ev);
                  rowSize = parseInt((ev.target as HTMLInputElement).value.trim());
                  if (rowSize <= 0) rowSize = 1;
                  (ev.target as HTMLInputElement).value = rowSize + "";
                  pageSize = rowSize * columnSize;
                  setPref("SearchAnnRowSize", rowSize);
                  updatePageContentDebounce();
                },
              },
            ],
          },
        ],
      },

      {
        tag: "div",
        properties: { textContent: "第几页" },
        children: [
          {
            tag: "input",
            namespace: "html",
            classList: ["pageIndex"],
            properties: {
              placeholder: "输入数字",
              value: pageIndex,
              type: "number",
            },
            styles: { width: "30px" },
            listeners: [
              {
                type: "change",
                listener: (ev: Event) => {
                  stopPropagation(ev);
                  pageIndex = parseInt((ev.target as HTMLInputElement).value.trim());
                  // if (pageIndex <= 0) pageIndex = 1;
                  if (pageIndex <= 0) {
                    pageIndex = Math.floor(ans.length / pageSize + 1);
                  } else if (pageIndex > ans.length / pageSize + 1) {
                    pageIndex = 1;
                  }
                  (ev.target as HTMLInputElement).value = pageIndex + "";
                  updateFilter();
                },
              },
            ],
          },
        ],
      },

      {
        //文字大小
        tag: "div",
        properties: { textContent: "文字大小" },
        children: [
          {
            tag: "input",
            namespace: "html",
            classList: ["fontSize"],
            properties: {
              placeholder: "输入数字",
              value: fontSize,
              type: "number",
            },
            styles: { width: "30px" },
            listeners: [
              {
                type: "change",
                listener: (ev: Event) => {
                  stopPropagation(ev);
                  const input = ev.target as HTMLInputElement;
                  fontSize = parseInt(input.value.trim());
                  if (fontSize < 6) fontSize = 6;
                  if (fontSize > 50) fontSize = 50;
                  input.value = fontSize + "";
                  setPref("SearchAnnFontSize", fontSize);
                  content.parentElement!.style.fontSize = fontSize + "px";
                },
              },
            ],
          },
        ],
      },

      {
        tag: "label",
        namespace: "html",
        properties: { textContent: "显示标题" },
        styles: { paddingRight: "20px" },
        children: [
          {
            tag: "input",
            namespace: "html",
            properties: {
              type: "checkbox",
              checked: bShowTitle,
            },
            listeners: [
              {
                type: "change",
                listener: (ev: any) => {
                  ev.stopPropagation();
                  const ck = ev.target as HTMLInputElement;
                  bShowTitle = ck.checked;
                  setPref("bShowTitle", ck.checked);
                  updatePageContentDebounce();
                },
                options: { capture: true },
              },
            ],
          },
        ],
      },

      {
        //显示标签
        tag: "label",
        namespace: "html",
        properties: { textContent: "显示标签" },
        styles: { paddingRight: "20px" },
        children: [
          {
            tag: "input",
            namespace: "html",
            properties: {
              type: "checkbox",
              checked: bShowTag,
            },
            listeners: [
              {
                type: "change",
                listener: (ev: any) => {
                  ev.stopPropagation();
                  const ck = ev.target as HTMLInputElement;
                  bShowTag = ck.checked;
                  setPref("bShowTag", ck.checked);
                  updatePageContentDebounce();
                },
                options: { capture: true },
              },
            ],
          },
        ],
      },
      {
        //显示等级
        tag: "label",
        namespace: "html",
        properties: { textContent: "显示等级" },
        styles: { paddingRight: "20px" },
        children: [
          {
            tag: "input",
            namespace: "html",
            properties: {
              type: "checkbox",
              checked: bShowRank,
            },
            listeners: [
              {
                type: "change",
                listener: (ev: any) => {
                  ev.stopPropagation();
                  const ck = ev.target as HTMLInputElement;
                  bShowRank = ck.checked;
                  setPref("bShowRank", ck.checked);
                  updatePageContentDebounce();
                },
                options: { capture: true },
              },
            ],
          },
        ],
      },
      {
        //固定高度
        tag: "label",
        namespace: "html",
        properties: { textContent: "固定高度" },
        // styles: { paddingRight: "20px" },
        children: [
          {
            tag: "input",
            namespace: "html",
            properties: {
              type: "checkbox",
              checked: bFixedHeight,
            },
            listeners: [
              {
                type: "change",
                listener: (ev: any) => {
                  ev.stopPropagation();
                  const ck = ev.target as HTMLInputElement;
                  bFixedHeight = ck.checked;
                  setPref("bFixedHeight", ck.checked);
                  updatePageContentDebounce();
                },
                options: { capture: true },
              },
            ],
          },
        ],
      },

      // { //固定高度
      //   tag: "div",
      //   properties: { textContent: "" },
      //   children: [
      //     {
      //       tag: "input",
      //       namespace: "html",
      //       classList: ["fontSize"],
      //       properties: {
      //         placeholder: "输入数字",
      //         value: fixedHeight,
      //         type: "number",
      //         step: "50"
      //       },
      //       styles: { width: "30px" },
      //       listeners: [
      //         {
      //           type: "change",
      //           listener: (ev: Event) => {
      //             stopPropagation(ev);
      //             const input = ev.target as HTMLInputElement;
      //             fixedHeight = parseInt(input.value.trim());
      //             if (fixedHeight < 6) fontSize = 6;
      //             setPref("fixedHeight", fixedHeight);
      //             updatePageContentDebounce();
      //           },
      //         },
      //       ],
      //     },
      //     {
      //       tag: "span", properties: { textContent: "px" },
      //     }
      //   ],
      // },
      // {
      //   tag: "button",
      //   properties: { textContent: "关闭" },
      //   listeners: [
      //     {
      //       type: "click",
      //       listener: (e) => {
      //         e.stopPropagation();

      //         dialogWindow?.close();
      //         popupDiv?.remove();
      //       },
      //       options: { capture: true },
      //     },
      //   ],
      // },
      // {
      //   tag: "button",
      //   properties: { textContent: "" },
      //   listeners: [
      //     {
      //       type: "click",
      //       listener: (e) => {
      //         e.stopPropagation();

      //         dialogWindow?.close();
      //         popupDiv?.remove();
      //       },
      //       options: { capture: true },
      //     },
      //   ],
      // },
    ],
  };
  ztoolkit.UI.appendElement(inputTag!, query);
  // content.addEventListener("wheel",(e)=>{ztoolkit.log("wheel",e)})
  // content.addEventListener("onmousewheel",(e)=>{ztoolkit.log("onmousewheel",e)})
  content.addEventListener("DOMMouseScroll_只要底层捕捉，上面的div不要处理这个事件", (e) => {
    // e.preventDefault()
    const DMS = e as any;
    // ztoolkit.log("DOMMouseScroll",e)
    pageIndex += DMS.detail ? 1 : -1;
    if (pageIndex <= 0) {
      pageIndex = Math.floor(ans.length / pageSize + 1);
    } else if (pageIndex > ans.length / pageSize + 1) {
      pageIndex = 1;
    }
    const pIE = query.querySelector(".pageIndex") as HTMLInputElement;
    if (pIE) {
      pIE.value = pageIndex + "";
    }
    updatePageContentDebounce();
  });

  const updatePageContentDebounce = Zotero.Utilities.debounce(updatePageContent);
  const updateFilterDebounce = Zotero.Utilities.debounce(updateFilter);
  updateFilterDebounce();
  // return { text, tag, showN: pageSize, ans };
  async function updateFilter() {
    const txtRegExp = str2RegExps(text);
    const tagRegExp = str2RegExps(tag);
    ans = annotations
      .filter((f) => txtRegExp.length == 0 || txtRegExp.some((a) => a.test(f.comment) || a.test(f.text)))
      .filter((f) => tagRegExp.length == 0 || tagRegExp.some((a) => a.test(f.annotationTags)))
      .filter((f) => selectedAnnotationType.length == 0 || selectedAnnotationType.includes(f.type))
      .sort((a, b) => {
        return (
          sortAsc(b.year, a.year) * 1000 +
          sortAsc(a.author, b.author) * 100 +
          sortAsc(a.item.key, b.item.key) * 10 +
          sortAsc(a.ann.annotationSortIndex, b.ann.annotationSortIndex)
          // sortAsc(
          //   parseInt(a.ann.annotationPageLabel),
          //   parseInt(b.ann.annotationPageLabel),
          // ) *
          //   10 +
          // sortAsc(a.ann.annotationPosition, b.ann.annotationPosition) * 1
        );
      });
    clearChild(content);
    clearChild(status);

    // ztoolkit.UI.appendElement(,status);
    await updatePageContentDebounce();
    //大小变化不需要了
    // if (isWin) (dialogWindow as any).sizeToContent();
  }
  async function updatePageContent() {
    if (!doc) return;
    const docCss = ztoolkit.getGlobal("getComputedStyle")(doc);
    if (!docCss) return;
    const docWidth = parseFloat(docCss.width);
    const docHeight = parseFloat(docCss.height);
    ztoolkit.log("画布宽度", docWidth, "高度", docHeight);
    if ((pageIndex - 1) * pageSize > ans.length) {
      pageIndex = 1;
      (query.querySelector(".pageIndex") as HTMLInputElement).value = pageIndex + "";
    }
    status.innerHTML = `总${annotations.length}条笔记，筛选出了${ans.length}条。预览${(pageIndex - 1) * pageSize + 1}-${Math.min(pageIndex * pageSize, ans.length)}条。`;
    const showAn = ans.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);
    clearChild(content);
    content.innerHTML = "";
    // await convertHtml(showAn)
    const cs = showAn.map(async (to, index) => {
      const anTo = to.ann;
      return {
        tag: "div",
        styles: {
          padding: "5px",
          // marginRight: "20px",
          display: "flex",
          alignItems: "stretch",
          flexDirection: "column",
          width: docWidth / columnSize - 15 - 15 / columnSize + "px",
          background: "#fff",
          borderRadius: "5px",
          margin: "0 0 4px 4px",
        },
        properties: { textContent: "" },
        children: [
          {
            tag: "div",
            styles: {
              display: bShowTitle ? "flex" : "none",
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
                    (await memSVG(`chrome://${config.addonRef}/content/16/annotate-${anTo.annotationType}.svg`)) || anTo.annotationType,
                },
              },
              {
                tag: "span",
                styles: {},
                properties: {
                  textContent: `${anTo.parentItem?.parentItem?.getField("firstCreator")}, ${anTo.parentItem?.parentItem?.getField("year")}, p.${anTo.annotationPageLabel}`,
                },
                listeners: [
                  {
                    type: "click",
                    listener: (e: any) => {
                      e.stopPropagation();
                      ztoolkit.log("点击", e, e.clientX, e.target);
                      showTitle(anTo, e.clientX, e.clientY, content);
                    },
                    options: { capture: true },
                  },
                  {
                    type: "mouseover",
                    listener: (e: any) => {
                      ztoolkit.log("鼠标进入", e, e.clientX, e.target);
                      showTitle(anTo, e.clientX, e.clientY, content);
                    },
                  },
                ],
              },
              {
                tag: "span",
                properties: {
                  textContent: pageIndex * pageSize - pageSize + index + 1 + "",
                },
              },
            ],
          },
          {
            tag: "div",
            listeners: [
              {
                type: "click",
                listener: (e: Event) => {
                  e.stopPropagation();
                  if (anTo.parentItemKey) openAnnotation(anTo.parentItemKey, anTo.annotationPageLabel, anTo.key);
                },
                options: { capture: true },
              },
            ],
            children: [
              {
                tag: "div",
                styles: {
                  background: anTo.annotationColor + "60", //width: "200px",
                  height: bFixedHeight ? (docHeight - 120) / rowSize - 60 + "px" : "",
                  overflowY: "overlay",
                  overflowX: "overlay", // 预览导出的注释内容显示不全，希望可以增加窗口拖动条 #93
                },
                properties: {
                  innerHTML: (await getAnnotationContent(anTo)).replaceAll(
                    `style="height:100px"><img`,
                    `style="height:${(docHeight - 120) / rowSize - 60}px"><img`,
                  ),
                },
              },
              {
                tag: "div",
                styles: {
                  background: anTo.annotationColor + "10", //width: "200px"
                  display: bShowRank || bShowTag ? "" : "none",
                },
                properties: {
                  innerHTML: `${
                    bShowTag
                      ? anTo
                          .getTags()
                          .map((a) => a.tag)
                          .join(",")
                      : ""
                  } ${bShowRank ? getPublicationTags(anTo) : ""}`,
                },
              },
            ],
          },
        ],
      };
    });
    const children = await Promise.all(cs);
    ztoolkit.UI.appendElement(
      {
        tag: "div",
        namespace: "html",
        properties: {
          // textContent: `总${annotations.length}条笔记，筛选出了${ans.length}条。预览前${showN}条。`,
        },
        styles: {
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "flex-start",
          // columnCount: "4",
          // columnGap: "10px ",
          width: "100%",
        },
        children,
      },
      content,
    );
  }
}
export async function createChooseTagsDiv(doc: Document, collectionOrItem: "collection" | "item") {
  const selectedTags: string[] = [];
  const idTags = `${config.addonRef}-ann2note-ChooseTags-root-result`; //ID.result;
  const items = await getSelectedItems(collectionOrItem);
  const annotations = getAllAnnotations(items).flatMap((f) => f.tags.map((t6) => Object.assign(f, { tag: t6 })));
  const tags = groupBy(annotations, (a) => a.tag.tag);
  tags.sort(sortFixedTags10ValuesLength);

  const tagsTag: TagElementProps = {
    tag: "div",
    styles: { display: "flex", flexDirection: "column" },
    children: [
      {
        tag: "div",
        // children: ,
      },
      {
        tag: "div",
        id: idTags,
      },
    ],
  };
  const div = createTopDiv(doc, config.addonRef + `-TopDiv`, [
    { tag: "div", classList: ["action"] },
    { tag: "div", classList: ["query"] },
    { tag: "div", classList: ["status"] },
    { tag: "div", classList: ["content"] },
  ]);
  if (div) {
    const actionTag = createActionTag(div, () => {
      if (selectedTags.length > 0) {
        exportTagsNote(selectedTags, items);
        div?.remove();
      } else {
        exportTagsNote(
          tags.map((a) => a.key),
          items,
        );
      }
    }, [
      {
        tag: "button",
        namespace: "html",
        properties: { textContent: "-点击隐藏可选标签" },
        styles: { background: "#fff", padding: "6px" },
        listeners: [
          {
            type: "click",
            listener: (ev: Event) => {
              stopPropagation(ev);
              const tp = toggleProperty((document.getElementById(idTags) as HTMLElement | undefined)?.style, "display", ["none", "flex"]);
              setProperty(ev.target as HTMLButtonElement, "textContent", tp == "none" ? "+点击展开可选标签" : "-点击隐藏可选标签");
            },
          },
        ],
      },
    ]);
    const queryTag = {
      tag: "div",
      properties: { textContent: "tag" },
      children: [
        {
          tag: "input",
          namespace: "html",
          listeners: [
            {
              type: "keyup",
              listener: (ev: Event) => {
                stopPropagation(ev);
                const value = (ev.target as HTMLInputElement).value;
                createTags(value.trim());
              },
            },
          ],
        },
      ],
    };

    for (const action of actionTag) ztoolkit.UI.appendElement(action, div!.querySelector(".action")!);
    ztoolkit.UI.appendElement(tagsTag!, div!.querySelector(".content")!);
    ztoolkit.UI.appendElement(queryTag, div!.querySelector(".query")!);

    createTags();
  }
  return div;

  function createTags(searchTag: string = "") {
    if (!div) return;
    const content = div.querySelector(".content");
    if (!content) return;
    clearChild(content);
    ztoolkit.UI.appendElement(
      {
        tag: "div",
        styles: { display: "flex", flexWrap: "wrap" },
        id: idTags,
        children: tags
          .filter((f) => new RegExp(searchTag, "i").test(f.key))
          .slice(0, 300)
          .map((t11) => ({
            tag: "div",
            properties: { textContent: `[${t11.values.length}]${t11.key}` },
            styles: {
              padding: "6px",
              background: "#099",
              margin: "1px",
            },
            listeners: [
              {
                type: "click",
                listener: (ev: Event) => {
                  stopPropagation(ev);
                  const target = ev.target as HTMLDivElement;
                  const index = selectedTags.findIndex((f) => f == t11.key);
                  if (index == -1) {
                    selectedTags.push(t11.key);
                    target.style.background = "#a00";
                  } else {
                    selectedTags.splice(index, 1);
                    target.style.background = "#099";
                  }
                },
              },
            ],
          })),
      },
      content,
    );
  }
}
export async function exportNoteByTag(isCollection: boolean = false) {
  exportNote({
    filter: (ans) => ans.flatMap((an) => an.tags.map((tag) => Object.assign({}, an, { tag }))),
    toText: (annotations) =>
      groupBy(annotations, (a) => a.tag.tag)
        .sort(sortFixedTags10AscByKey)
        .flatMap((tag, index) => {
          return [`<h1>(${index + 1}) ${tag.key} (${tag.values.length})</h1>`, ...tag.values.map((b) => `${b.html}`)];
        })
        .join("\n"),
    items: await getSelectedItems(isCollection),
  });
}
export async function exportNoteByTagPdf(isCollection: boolean = false) {
  exportNote({
    filter: (ans) => ans.flatMap((an) => an.tags.map((tag) => Object.assign({}, an, { tag }))),
    toText: (annotations) =>
      groupBy(annotations, (a) => a.tag.tag)
        .sort(sortFixedTags10ValuesLength)
        .flatMap((tag, index) => {
          return [
            `<h1> (${index + 1}) 标签：${tag.key}  (${tag.values.length})</h1>`,
            ...groupBy(tag.values, (a) => a.pdfTitle).flatMap((pdfTitle, index2) => [
              `<h2> (${index + 1}.${index2 + 1}) ${tag.key} ${pdfTitle.key} (${pdfTitle.values.length}) </h2>`,
              `${getPublicationTags(pdfTitle.values[0].item)}`,
              ...pdfTitle.values.map((b) => `${b.html}`),
            ]),
          ];
        })
        .join("\n"),
    items: await getSelectedItems(isCollection),
  });
}
export async function exportNoteByType(type: _ZoteroTypes.Annotations.AnnotationType, collectionOrItem: "collection" | "item") {
  exportNote({
    toText: (annotations) =>
      groupBy(annotations, (a) => a.pdfTitle)
        .flatMap((pdfTitle, index, aa) => [
          // `<h1> (${index + 1}/${aa.length}) ${pdfTitle.key} ${getCiteItemHtml(pdfTitle.values[0]?.item)}  (${pdfTitle.values.length})</h1>`,
          `<h1>(${index + 1}/${aa.length}) ${getCiteItemHtmlWithPage(pdfTitle.values[0].ann)} ${getPublicationTags(pdfTitle.values[0]?.item)}</h1>`,
          `${pdfTitle.key}`,
          ...pdfTitle.values.flatMap((b) => [b.html ? b.html : getCiteAnnotationHtml(b.ann)]),
        ])
        .join("\n"),
    items: await getSelectedItems(collectionOrItem),
    filter: (annotations) => {
      annotations = annotations.filter((f) => f.type == type);
      // ztoolkit.log(annotations)
      return uniqueBy(annotations, (a) => a.ann.key);
    },
  });
}
export async function exportNoteByColor(color: string, collectionOrItem: "collection" | "item") {
  exportNote({
    toText: (annotations) =>
      groupBy(annotations, (a) => a.pdfTitle)
        .flatMap((pdfTitle, index, aa) => [
          // `<h1> (${index + 1}/${aa.length}) ${pdfTitle.key} ${getCiteItemHtml(pdfTitle.values[0]?.item)}  (${pdfTitle.values.length})</h1>`,
          `<h1>(${index + 1}/${aa.length}) ${getCiteItemHtmlWithPage(pdfTitle.values[0].ann)} ${getPublicationTags(pdfTitle.values[0]?.item)}</h1>`,
          `${pdfTitle.key}`,
          ...pdfTitle.values.flatMap((b) => [b.html ? b.html : getCiteAnnotationHtml(b.ann)]),
        ])
        .join("\n"),
    items: await getSelectedItems(collectionOrItem),
    filter: (annotations) => {
      annotations = annotations.filter((f) => f.color == color);
      // ztoolkit.log(annotations)
      return uniqueBy(annotations, (a) => a.ann.key);
    },
  });
}
export async function exportScaleCsv(collectionOrItem: "collection" | "item") {
  const pw = new ztoolkit.ProgressWindow("");
  // const ans2 = await convertHtml(ans, note, pw)

  const sData = await getScaleData(collectionOrItem);
  const data = sData.map((a) => [
    a.authorYear?.author,
    a.authorYear?.year || " ",
    a.authorYear?.title || " ",
    a.variable?.text || " ",
    a.scaleItem?.text || " ",
    a.scaleItem?.comment || " ",
    a.factorLoading?.text || " ",
    a.reference?.text || " ",
    a.CR?.text || " ",
    a.CA?.text || " ",
    a.AVE?.text || " ",
    a.description?.text || " ",
    a.description?.comment || " ",
  ]);
  const csv_header = `author,year,title,variable,item,comment,factorLoading,reference,CR,CA,AVE,description,descriptionComment
`;

  const csv = [];
  const separator = ",";
  for (let i = 0; i < data.length; i++) {
    const row = [],
      cols = data[i];
    for (let j = 0; j < cols.length; j++) {
      let data = cols[j]?.replace(/(\r\n|\n|\r)/gm, "").replace(/(\s\s)/gm, " ") || "";
      data = data.replace(/"/g, '""').replaceAll("&#8296;", "").replaceAll("&#8297;", "");
      row.push('"' + data + '"');
    }
    csv.push(row.join(separator));
  }
  const csv_string = csv_header + csv.join("\n");
  ztoolkit.log(csv_string);

  const classes = Components.classes as any;
  const nsIFilePicker = Components.interfaces.nsIFilePicker;
  const fp = classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker) as nsIFilePicker;

  fp.defaultString = "Scale - " + new Date().getTime() + ".csv";
  fp.init(window as any, "Save to file", nsIFilePicker.modeSave);
  fp.appendFilter("CSV (*.csv; *.txt)", "*.csv; *.txt");
  fp.defaultExtension = "csv";

  fp.open(function () {
    // IOUtils.writeUTF8(fp.file.path, csv_string)
    const outputStream = classes["@mozilla.org/network/file-output-stream;1"].createInstance(
      Components.interfaces.nsIFileOutputStream,
    ) as nsIFileOutputStream;
    outputStream.init(fp.file, 0x04 | 0x08 | 0x20, 420, 0);
    const converter2 = classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(
      Components.interfaces.nsIConverterInputStream,
    ) as nsIConverterInputStream;

    const converter = classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(
      Components.interfaces.nsIConverterOutputStream,
    ) as nsIConverterOutputStream;
    converter.init(outputStream, "gb2312");
    converter.writeString(csv_string);
    converter.close();
    outputStream.close();
  });
  // setTimeout(() => {
  //   ztoolkit.log(fp.file)
  //   Zotero.Utilities.Internal.exec("excel", [
  //     fp.file,
  //   ]);
  // }, 1000)
}
async function getScaleData(collectionOrItem: "collection" | "item") {
  const items = await getSelectedItems(collectionOrItem);
  const ans = getAllAnnotations(items).filter((f) => f.annotationTags.includes("量表"));
  const pw = new ztoolkit.ProgressWindow("");
  const ans2group = groupBy(ans, (a) => a.item.key);
  const title = `量表来自${ans2group.length}个条目`;

  const authorYear = "authorYear";
  const variable = "variable";
  const AVE = "AVE";
  const CA = "CA";
  const CR = "CR";
  const reference = "reference";
  const scaleItem = "item";
  const factorLoading = "factorLoading";
  const description = "description";
  const data = [];
  // data.push({ authorYear, variable, factorLoading, scaleItem, reference, CR, CA, AVE, description });
  for (const item of ans2group) {
    const vars = item.values.filter((f) => f.tags.some((s) => s.tag == "量表"));
    const authorYear = item.values[0];
    const getAns = (
      type: "AVE" | "CR" | "CA" | "reference" | "item" | "factorLoading" | "description" | "itemDescription",
      ann: Zotero.Item,
    ) => item.values.filter((f) => f.tags.some((s) => s.tag == "量表" + type) && ann.relatedItems.includes(f.ann.key));
    for (const scale of vars) {
      const variable = scale;
      const description = getAns("description", scale.ann)?.[0];
      const AVE = getAns("AVE", scale.ann)?.[0];
      const CA = getAns("CA", scale.ann)?.[0];
      const CR = getAns("CR", scale.ann)?.[0];
      const reference = getAns("reference", scale.ann)?.[0];
      data.push({ authorYear, variable, reference, CR, CA, AVE, description });
      const scaleItems = getAns("item", scale.ann);

      for (const scaleItem1 of scaleItems) {
        const scaleItem = scaleItem1;
        const description = getAns("itemDescription", scaleItem1.ann)?.[0];
        const factorLoading = getAns("factorLoading", scaleItem1.ann)?.[0];
        data.push({ factorLoading, scaleItem, description });
      }
    }
  }
  return data;
}
export async function exportScaleNote(collectionOrItem: "collection" | "item") {
  const sd = await getScaleData(collectionOrItem);
  // const items = await getSelectedItems(collectionOrItem);
  // const ans = getAllAnnotations(items).filter((f) => f.annotationTags.includes("量表"));
  const note = await createNote("");
  const pw = new ztoolkit.ProgressWindow("");
  // const ans2 = await convertHtml(ans, note, pw);
  // const ans2group = groupBy(ans2, (a) => a.item.key);
  const title = `量表导出`;
  let authorYear = "authorYear";
  let variable = "variable";
  let AVE = "AVE";
  let CA = "CA";
  let CR = "CR";
  let reference = "reference";
  let scaleItem = "item";
  let factorLoading = "factorLoading";
  let description = "description";
  let res = `<h1>${title}</h1>
  <table border="0" cellspacing="1"><tr><td>${authorYear}</td><td>${variable}</td><td>${scaleItem}</td><td>${factorLoading}</td><td>${reference}</td><td>${CR}</td><td>${CA}</td><td>${AVE}</td><td>${description}</td></tr>`;
  for (const s of sd) {
    authorYear = getCiteItemHtml(s.authorYear?.item);
    description = s.description?.text || "";
    AVE = s.AVE?.text || "";
    CA = s.CA?.text || "";
    CR = s.CR?.text || "";
    reference = s.reference?.text || "";
    scaleItem = s.scaleItem?.text || "";
    factorLoading = s.factorLoading?.text || "";
    variable = s.variable?.text || "";
    res += `<tr><td>${authorYear}</td><td>${variable}</td><td>${scaleItem}</td><td>${
      factorLoading
    }</td><td>${reference}</td><td>${CR}</td><td>${CA}</td><td>${AVE}</td><td>${description}</td></tr>`;
  }
  res += "</table>";
  ztoolkit.log(res);
  await saveNote(note, res, pw);
}
//导出excel
function toExcel(exportFileContent: string) {
  //window.location.href='<%=basePath%>pmb/excelShowInfo.do';
  //获取表格
  //设置格式为Excel，表格内容通过btoa转化为base64，此方法只在文件较小时使用(小于1M)
  //exportFileContent=window.btoa(unescape(encodeURIComponent(exportFileContent)));
  //var link = "data:"+MIMEType+";base64," + exportFileContent;
  //使用Blob
  let blob = new Blob([exportFileContent], { type: "text/plain;charset=utf-8" }); //解决中文乱码问题
  blob = new Blob([String.fromCharCode(0xfeff), blob], { type: blob.type });
  //设置链接
  const link = window.URL.createObjectURL(blob);
  const a = document.createElement("a"); //创建a标签
  a.download = "企业反映问题诉求汇总表.xls"; //设置被下载的超链接目标（文件名）
  a.href = link; //设置a标签的链接
  document.documentElement.appendChild(a); //a标签添加到页面
  a.click(); //设置a标签触发单击事件
  document.documentElement.removeChild(a); //移除a标签
}
export async function exportScaleXls(collectionOrItem: "collection" | "item") {
  const sd = await getScaleData(collectionOrItem);
  const pw = new ztoolkit.ProgressWindow("");
  const title = `量表导出`;
  let authorYear = "authorYear";
  let variable = "variable";
  let AVE = "AVE";
  let CA = "CA";
  let CR = "CR";
  let reference = "reference";
  let scaleItem = "item";
  let factorLoading = "factorLoading";
  let description = "description";
  let res = `<table border="0" cellspacing="1"><tr><td>${authorYear}</td><td>${variable}</td><td>${scaleItem}</td><td>${factorLoading}</td><td>${reference}</td><td>${CR}</td><td>${CA}</td><td>${AVE}</td><td>${description}</td></tr>`;
  for (const s of sd) {
    authorYear = getCiteItemHtml(s.authorYear?.item);
    description = s.description?.text || "";
    AVE = s.AVE?.text || "";
    CA = s.CA?.text || "";
    CR = s.CR?.text || "";
    reference = s.reference?.text || "";
    scaleItem = s.scaleItem?.text || "";
    factorLoading = s.factorLoading?.text || "";
    variable = s.variable?.text || "";
    res += `<tr><td>${authorYear}</td><td>${variable}</td><td>${scaleItem}</td><td>${
      factorLoading
    }</td><td>${reference}</td><td>${CR}</td><td>${CA}</td><td>${AVE}</td><td>${description}</td></tr>`;
  }
  res += "</table>";

  const classes = Components.classes as any;
  const nsIFilePicker = Components.interfaces.nsIFilePicker;
  const fp = classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker) as nsIFilePicker;

  fp.defaultString = "Scale - " + new Date().getTime() + ".xls";
  fp.init(window as any, "Save to file", nsIFilePicker.modeSave);
  fp.appendFilter("xls (*.xls)", "*.xls");
  fp.defaultExtension = "xls";

  fp.open(function () {
    IOUtils.writeUTF8(fp.file.path, res);
    // const outputStream = classes["@mozilla.org/network/file-output-stream;1"].createInstance(Components.interfaces.nsIFileOutputStream) as nsIFileOutputStream;
    // outputStream.init(fp.file, 0x04 | 0x08 | 0x20, 420, 0);
    // const converter2 = classes["@mozilla.org/intl/converter-input-stream;1"].createInstance(Components.interfaces.nsIConverterInputStream) as nsIConverterInputStream;

    // const converter = classes["@mozilla.org/intl/converter-output-stream;1"].createInstance(Components.interfaces.nsIConverterOutputStream) as nsIConverterOutputStream;
    // converter.init(outputStream, "gb2312");
    // converter.writeString(csv_string);
    // converter.close();
    // outputStream.close();
  });
}
export async function exportSingleNote(tag: string, collectionOrItem: "collection" | "item") {
  if (tag)
    exportNote({
      filter: async (ans) => ans.filter((f) => f.tags.some((a) => tag == a.tag)),
      items: await getSelectedItems(collectionOrItem),
      toText: (ans) =>
        groupBy(ans, (a) => a.pdfTitle)
          .sort(sortKey)
          .flatMap((a, index, aa) => [
            // `<h1>(${ index + 1} /${aa.length}) ${a.key} ${getCiteItemHtmlWithPage(a.values[0].ann)} </h1> `,
            // `${ getPublicationTags(a.values[0]?.item) } `,
            `<h1>(${index + 1}/${aa.length}) ${getCiteItemHtmlWithPage(a.values[0].ann)} ${getPublicationTags(a.values[0]?.item)}</h1> `,
            `${a.key}`,
            a.values
              .map((b) => b.html ?? `<h2> ${getCiteAnnotationHtml(b.ann, b.ann.annotationText + b.ann.annotationComment)}</h2> `)
              .join(" "),
          ])
          .join(""),
    });
}
export function exportTagsNote(tags: string[], items: Zotero.Item[]) {
  if (tags.length > 0) {
    exportNote({
      filter: async (ans) => ans.filter((f) => f.tags.some((a) => tags.includes(a.tag))).map((a) => Object.assign(a, { tag: a.tag })),
      items,
      toText: toText1,
    });
  }
}
export function toText1(ans: AnnotationRes[]) {
  return [
    groupBy(
      ans.flatMap((a) => a.tags),
      (a) => a.tag,
    )
      .map((a) => `[${a.values.length}]${a.key} `)
      .join(" "),
    groupBy(ans, (a) => a.pdf.key)
      .sort(sortKey)
      .map((a) => ({ ...a, values: uniqueBy(a.values, (f) => f.ann.key) }))
      .flatMap((a, index, aa) => [
        // `<h1>(${ index + 1}/${aa.length}) ${a.key} ${getCiteItemHtmlWithPage(a.values[0].ann)}</h1> `,
        // `${ getPublicationTags(a.values[0]?.item)}`,
        `<h1>(${index + 1}/${aa.length}) ${getCiteItemHtmlWithPage(a.values[0].ann)} ${getPublicationTags(a.values[0]?.item)}</h1> `,
        `title：${a.values[0].item.getDisplayTitle()}`,
        ...a.values.flatMap((b) => b.html),
      ])
      .join("<br/>"),
  ].join("<br/>");
}
export async function exportNote({
  toText,
  filter = undefined,
  items = undefined,
  tags = undefined,
  pw = undefined,
}: {
  toText: ((arg0: AnnotationRes[]) => string) | ((arg0: AnnotationRes[]) => Promise<string>);

  filter?: ((arg0: AnnotationRes[]) => AnnotationRes[]) | ((arg0: AnnotationRes[]) => Promise<AnnotationRes[]>);
  items?: Zotero.Item[];
  tags?: string[];
  pw?: ProgressWindowHelper | undefined;
}) {
  // getPopupWin();
  // const pw = new ztoolkit.ProgressWindow(header).createLine({ text: "执行中" }).show()
  let annotations = items ? getAllAnnotations(items) : [];
  if (filter) {
    annotations = await filter(annotations);
  }
  if (annotations.length == 0) {
    pw
      ?.createLine({
        text: `没有找到标记，不创建笔记。`,
      })
      .startCloseTimer(5e3);
    return;
  }
  const title = getTitleFromAnnotations(annotations);
  //createNote 一定要在 getSelectedItems 之后，不然获取不到选择的条目
  // 另一个问题是 会创建顶层条目触发另一个插件的 closeOtherProgressWindows
  const note = await createNote(title);
  annotations = await convertHtml(annotations, note, pw);
  const getKeyGroup = (fn: (item: AnnotationRes) => string) =>
    groupBy(annotations, fn)
      .sort(sortValuesLength)
      .slice(0, 5)
      .map((t13) => `${t13.key}(${t13.values.length})`)
      .join("  ");

  const txt = await toText(annotations);
  // ztoolkit.log("输出的html", title+txt);
  if (tags) {
    tags.forEach((tag) => {
      note.addTag(tag, 0);
    });
  }
  const usedItems = uniqueBy(
    annotations.map((a) => a.item),
    (a) => a.key,
  );
  // if (usedItems.length <= 10)
  for (const item of usedItems) {
    note.addRelatedItem(item);
  }
  note.addTag(`${config.addonRef}: 引用Item${usedItems.length}个`);

  await saveNote(note, `${title}${txt}`);
}
export async function saveNote(targetNoteItem: Zotero.Item, txt: string, pw: ProgressWindowHelper | undefined = undefined) {
  //@ts-ignore Zotero.BetterNotes.api
  await Zotero.BetterNotes.api.note.insert(targetNoteItem, txt, -1);
  // const editor= await Zotero.BetterNotes.api.editor.getEditorInstance(targetNoteItem.id)
  // await Zotero.BetterNotes.api.editor.replace(editor,0,1e3,txt)
  await targetNoteItem.saveTx();
  ztoolkit.log("笔记更新完成", new Date().toLocaleTimeString());
  pw?.createLine({ text: `笔记更新完成`, type: "default" });
}
export async function createNote(txt = "", pw: ProgressWindowHelper | undefined = undefined) {
  const targetNoteItem = new Zotero.Item("note");
  targetNoteItem.libraryID = Zotero.getActiveZoteroPane().getSelectedLibraryID();
  const selected = Zotero.getActiveZoteroPane().getSelectedCollection(true);
  if (selected) targetNoteItem.setCollections([selected]);
  else {
    // 这个会破坏用户数据结构，不是必须的
    // let c = Zotero.Collections.getByLibrary(1, true).find(
    //   (f) => f.name == "导出的未分类笔记",
    // );
    // if (!c) {
    //   c = new Zotero.Collection({ libraryID: 1, name: "导出的未分类笔记" });
    //   await c.saveTx();
    // }
    // targetNoteItem.setCollections([c.key]);
  }

  if (txt) {
    //@ts-ignore Zotero.BetterNotes.api
    await Zotero.BetterNotes.api.note.insert(targetNoteItem, txt, -1);
  }
  targetNoteItem.addTag(`${config.addonRef}: 生成的笔记`, 0);
  //必须保存后面才能保存图片
  await targetNoteItem.saveTx();
  const header = "";
  // const pw = new ztoolkit.ProgressWindow(header).createLine({ text: "执行中" }).show()
  pw
    ?.createLine({
      text: "创建新笔记 ",
      type: "default",
    })
    .startCloseTimer(5000);
  return targetNoteItem;
}

export function createAnnotationMatrix(dialogWindow: Window | undefined, popupDiv: HTMLElement | undefined, annotations: AnnotationRes[]) {
  const isWin = dialogWindow != undefined;
  const doc = dialogWindow?.document.documentElement || popupDiv;
  if (!doc) return;
  dialogWindow?.addEventListener("resize", (e) => {});

  const content = doc.querySelector(".content") as HTMLElement;
  const query = doc.querySelector(".query") as HTMLElement;

  ztoolkit.log(content);
  setTimeout(async () => {
    // await convertHtml(annotations)
    content2AnnotationMatrix(content, annotations);
  });
}
