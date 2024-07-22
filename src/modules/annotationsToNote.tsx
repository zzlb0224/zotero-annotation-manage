import * as React from "react";
import { ProgressWindowHelper } from "zotero-plugin-toolkit/dist/helpers/progressWindow";
import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { config } from "../../package.json";
import { getPref, setPref } from "../utils/prefs";
import {
  sortAsc,
  sortBy,
  sortFixedTags10ValuesLength,
  sortKey,
  sortFixedTags10AscByKey,
  sortValuesLength,
  sortValuesLengthKeyAsc,
} from "../utils/sort";
import { Tab } from "../utils/tab";
import {
  ReTest,
  getChildCollections,
  groupBy,
  isDebug,
  memFixedColor,
  memSVG,
  openAnnotation,
  parseAnnotationJSON,
  promiseAllWithProgress,
  setProperty,
  str2RegExps,
  toggleProperty,
  uniqueBy,
} from "../utils/zzlb";
import { createTopDiv } from "../utils/zzlb";
import { convertHtml } from "../utils/zzlb";
import { AnnotationRes } from "../utils/zzlb";
import { showTitle } from "./RelationHeader";
import { createDialog } from "../utils/zzlb";

export let popupWin: ProgressWindowHelper | undefined = undefined;
let popupTime = -1;

const iconBaseUrl = `chrome://${config.addonRef}/content/icons/`;
function register() {
  if (!getPref("hide-in-item-menu")) ztoolkit.Menu.register("item", buildMenu("item"));
  if (!getPref("hide-in-collection-menu")) ztoolkit.Menu.register("collection", buildMenu("collection"));
}

function unregister() {
  ztoolkit.Menu.unregister(`${config.addonRef}-create-note`);
  ztoolkit.Menu.unregister(`${config.addonRef}-create-note-collection`);
}

const ID = {
  root: `${config.addonRef}-ann2note-ChooseTags-root`,
  action: `${config.addonRef}-ann2note-ChooseTags-root-action`,
  input: `${config.addonRef}-ann2note-ChooseTags-root-input`,
  result: `${config.addonRef}-ann2note-ChooseTags-root-result`,
};
function buildMenu(collectionOrItem: "collection" | "item") {
  const menu: MenuitemOptions = {
    tag: "menu",
    label: "笔记管理",
    icon: iconBaseUrl + "favicon.png",
    children: [
      {
        tag: "menu",
        label: "自定义命令",
        icon: iconBaseUrl + "favicon.png",
        children: [
          {
            //复制pdf注释
            tag: "menuitem",
            label: "复制条目下pdf注释",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              const items = await getSelectedItems(collectionOrItem);
              const topItems = items.map((i) => i.parentItem ?? i);
              const d = await Promise.all(
                topItems.map(async (item) => {
                  const pdfIds = item.getAttachments();
                  const pdfs = Zotero.Items.get(pdfIds).filter((f) => f.isPDFAttachment());
                  return {
                    itemKey: item.key,
                    // item,
                    firstCreator: `${item.getField("firstCreator")}`,
                    year: `${item.getField("year")}`,
                    title: `${item.getField("title")}`,
                    pdfs: await Promise.all(
                      pdfs.map(async (pdf) => {
                        const filepath = pdf.getFilePath();
                        const displayTitle = pdf.getDisplayTitle();
                        const md5 = filepath ? Zotero.Utilities.Internal.md5(Zotero.File.pathToFile(filepath)) : "";
                        return {
                          pdfKey: pdf.key,
                          filepath,
                          displayTitle,
                          md5,
                          annotations: await Promise.all(
                            pdf.getAnnotations().map(async (annotation) => {
                              // if (pdf.key == "NoNoNo")
                              return {
                                key: annotation.key,
                                position: annotation.annotationPosition,
                                annotationJson: await parseAnnotationJSON(annotation),
                              };
                              // return annotation
                            }),
                          ),
                        };
                      }),
                    ),
                  };
                }),
              );
              ztoolkit.log(d);
              new ztoolkit.Clipboard().addText(JSON.stringify(d)).copy();
              new ztoolkit.ProgressWindow("复制成功")
                .createLine({
                  text: `${d.length}-${d.flatMap((p) => p.pdfs.length).reduce((partialSum, a) => partialSum + a, 0)}-${d.flatMap((p) => p.pdfs.flatMap((f) => f.annotations.length)).reduce((partialSum, a) => partialSum + a, 0)}`,
                })
                .show()
                .startCloseTimer(3000);
            },
          },
          {
            //粘贴pdf注释
            tag: "menuitem",
            label: "粘贴条目下pdf注释-用作者年份标题识别不同的条目",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              const items = await getSelectedItems(collectionOrItem);
              const topItems = items.map((i) => i.parentItem ?? i);

              const text = await ztoolkit.getGlobal("navigator").clipboard.readText();

              const d = JSON.parse(text) as [
                {
                  itemKey: string;
                  firstCreator: string;
                  year: string;
                  title: string;
                  pdfs: [
                    {
                      pdfKey: string;
                      filepath: string;
                      displayTitle: string;
                      md5: string;
                      annotations: [
                        {
                          key: string;
                          position: string;
                          annotationJson: _ZoteroTypes.Annotations.AnnotationJson;
                        },
                      ];
                    },
                  ];
                },
              ];
              const ds = d.flatMap((a) => a.pdfs.flatMap((b) => b.annotations.flatMap((c) => ({ ...a, ...b, ...c, annotation: c }))));

              ztoolkit.log(ds);
              for (const item of topItems) {
                const pdfIds = item.getAttachments();
                const pdfs = Zotero.Items.get(pdfIds).filter((f) => f.isPDFAttachment());
                for (const pdf of pdfs) {
                  const filepath = pdf.getFilePath();
                  const currentAnnotations = [...pdf.getAnnotations()];

                  const md5 = filepath ? Zotero.Utilities.Internal.md5(Zotero.File.pathToFile(filepath)) : "";
                  if (md5) {
                    const ans = ds.filter(
                      (
                        f, // f.md5 && f.md5 == md5 ||
                        // !f.md5 &&
                      ) =>
                        f.title == item.getField("title") &&
                        f.firstCreator == item.getField("firstCreator") &&
                        f.year == item.getField("year"),
                    ); //
                    ztoolkit.log("找到保存", ans, ds, md5);
                    for (const an of ans) {
                      if (an.pdfKey == pdf.key) {
                        ztoolkit.log("pdfKey不能保存", an);
                        continue;
                      }
                      if (currentAnnotations.find((f) => f.key == an.annotationJson.key)) {
                        ztoolkit.log("currentAnnotations key不能保存", an);
                        continue;
                      }
                      if (
                        currentAnnotations.find((f) => f.annotationType == an.annotationJson.type && f.annotationPosition == an.position)
                      ) {
                        ztoolkit.log("annotationType annotationPosition不能保存", an);
                        continue;
                      }
                      ztoolkit.log("开始保存", an);
                      an.annotationJson.key = Zotero.DataObjectUtilities.generateKey();
                      //ts-ignore annotationType
                      // an.annotationJson.annotationType = an.annotationJson.type
                      const savedAnnotation = await Zotero.Annotations.saveFromJSON(pdf, an.annotationJson);
                      await savedAnnotation.saveTx();
                      currentAnnotations.push(savedAnnotation);
                    }
                  }
                  // await Zotero.Annotations.saveFromJSON(attachment, annotation, saveOptions)
                }
              }

              new ztoolkit.ProgressWindow("正在导入")
                .createLine({ text: "" + text.length })
                .createLine({
                  text: `${d.length}-${d.flatMap((p) => p.pdfs.length).reduce((partialSum, a) => partialSum + a, 0)}-${d.flatMap((p) => p.pdfs.flatMap((f) => f.annotations.length)).reduce((partialSum, a) => partialSum + a, 0)}`,
                })
                .show()
                .startCloseTimer(3000);
            },
          },
          {
            //相同PDF合并，注释合并
            tag: "menuitem",
            label: "合并条目下所有PDF文件和注释",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              const items = await getSelectedItems(collectionOrItem);
              const topItems = items.map((i) => i.parentItem ?? i);
              const pw = new ztoolkit.ProgressWindow("合并").show();
              for (const item of topItems) {
                const pdfIds = item.getAttachments();
                const pdfs = Zotero.Items.get(pdfIds).filter((f) => f.isPDFAttachment());

                const pdfs2 = pdfs.map((pdf) => {
                  const filepath = pdf.getFilePath();
                  const displayTitle = pdf.getDisplayTitle();
                  const md5 = filepath ? Zotero.Utilities.Internal.md5(Zotero.File.pathToFile(filepath)) : "";
                  return {
                    pdf,
                    pdfKey: pdf.key,
                    filepath,
                    md5,
                  };
                });
                const pdf1 = pdfs2.filter((f) => f.md5)[0];
                if (pdf1) {
                  for (const pd of pdfs2) {
                    // ztoolkit.log(pd)
                    if (pdf1.pdfKey != pd.pdfKey) {
                      ztoolkit.log("找到另一个pdf", pd);
                      const attachment = pd.pdf;
                      const ifLinks = attachment.attachmentLinkMode == Zotero.Attachments.LINK_MODE_LINKED_FILE; // 检测是否为链接模式
                      const file = await attachment.getFilePathAsync();
                      if (file && ifLinks) {
                        // 如果文件存在(文件可能已经被删除)且为链接模式删除文件
                        try {
                          // await OS.File.remove(file); // 尝试删除文件
                          await Zotero.File.removeIfExists(file);
                          //await trash.remove(file);
                        } catch (error) {
                          // 弹出错误
                          alert("文件已打开");
                          return; // 弹出错误后终止执行
                        }
                      }
                      // await Zotero.Items.moveChildItems(
                      //   pd.pdf,
                      //   pdf1.pdf,
                      //   false
                      // );
                      const annotations = pd.pdf.getAnnotations(false);
                      let moveAnnotationLength = 0;
                      for (const annotation of annotations) {
                        if (annotation.annotationIsExternal) {
                          continue;
                        }
                        if (
                          pdf1.pdf
                            .getAnnotations()
                            .find(
                              (f) => f.annotationType == annotation.annotationType && f.annotationPosition == annotation.annotationPosition,
                            )
                        ) {
                          continue;
                        }
                        // 直接改parentItemID会出问题
                        // annotation.parentItemID = pdf1.pdf.id;
                        // await annotation.saveTx();
                        const annotationJson = await parseAnnotationJSON(annotation);
                        if (annotationJson) {
                          annotationJson.key = Zotero.DataObjectUtilities.generateKey();
                          const savedAnnotation = await Zotero.Annotations.saveFromJSON(pdf1.pdf, annotationJson);
                          await savedAnnotation.saveTx();
                        }

                        moveAnnotationLength += 1;
                      }
                      if (moveAnnotationLength > 0)
                        pw.createLine({
                          text: `移动${moveAnnotationLength}批注`,
                        });
                      pd.pdf.deleted = true;
                      pw.createLine({ text: "标记删除" });
                      pd.pdf.saveTx();
                      pw.createLine({ text: "保存" });
                    }
                  }
                  pdf1.pdf.saveTx();
                }
                item.saveTx();
                pw.createLine({ text: "保存条目。" });
              }
              pw.createLine({ text: "完成" + items.length }).startCloseTimer(5000);
            },
          },

          {
            tag: "menuitem",
            label: "拆分#标签",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              const items = await getSelectedItems(collectionOrItem);
              const ans = getAllAnnotations(items);
              funcSplitTag(items, ans);
            },
          },
          {
            tag: "menuitem",
            label: "测试 tab",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              const items = await getSelectedItems(collectionOrItem);
              funcCreateTab(items);
            },
          },
          {
            tag: "menuitem",
            label: "测试 react popover",
            icon: iconBaseUrl + "favicon.png",
            id: "react_popover_root",
            commandListener: async (ev: Event) => {
              const tabDiv = Zotero_Tabs.deck.querySelector("#" + Zotero_Tabs.selectedID) as HTMLDivElement;
              const react_popover_root =
                (tabDiv.querySelector(".react_popover_root") as HTMLDivElement) ||
                ztoolkit.UI.appendElement(
                  {
                    tag: "div",
                    styles: {
                      width: "calc(100% - 80px)",
                      height: "calc(100% - 100px)",
                      position: "fixed",
                      left: "40px",
                      top: "80px",
                      zIndex: "99999",
                      background: "#aaa",
                    },
                    classList: ["react_popover_root"],
                    children: [
                      {
                        tag: "span",
                        styles: {
                          background: "#333",
                          padding: "20px",
                          margin: "20px",
                        },
                        properties: { textContent: "关闭" },
                        listeners: [
                          {
                            type: "click",
                            listener: () => {
                              react_popover_root.remove();
                            },
                          },
                        ],
                      },

                      {
                        tag: "div",
                        styles: {
                          background: "#996",
                          padding: "20px",
                          margin: "20px",
                        },
                        properties: { textContent: "占位div" },
                      },
                    ],
                  },
                  tabDiv,
                );
              react_popover_root.querySelector(".react_popover_root_popover")?.remove();
              const popover = ztoolkit.UI.appendElement(
                {
                  tag: "div",
                  styles: {
                    background: "#996",
                    padding: "20px",
                    margin: "20px",
                  },
                  properties: { textContent: "react_popover_root_popover" },
                  classList: ["react_popover_root_popover"],
                },
                react_popover_root,
              ) as HTMLDivElement;
              ztoolkit.log(window, window.console);
              // const parentElement = Object.assign(root, { ownerDocument: { body: root } })
              createRoot(popover).render(
                <>
                  <PickerColor
                    parentElement={react_popover_root}
                    defaultColor="#aabbcc"
                    onChange={(c) => {
                      ztoolkit.log("ddddd", c);
                    }}
                  ></PickerColor>
                </>,
              );
              // createRoot(root.querySelector(".react_popover_root_popover")!).render(
              //   <>
              //     <div>{new Date().toLocaleTimeString()}</div>
              //   </>,
              // );
            },
          },
          {
            tag: "menuitem",
            label: "测试弹出窗口",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              topDialog();
            },
          },
          {
            tag: "menuitem",
            label: "测试React弹出窗口",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              topDialogRect();
            },
          },
          {
            tag: "menuitem",
            label: "重新翻译空批注",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              await funcTranslateAnnotations(collectionOrItem);
            },
          },
          {
            tag: "menuitem",
            label: "清空日期tag",
            icon: iconBaseUrl + "favicon.png",
            hidden: !getPref("debug"),
            commandListener: async (ev: Event) => {
              await DDDTagClear();
            },
          },
          {
            tag: "menuitem",
            label: "1.删除日期tag",
            icon: iconBaseUrl + "favicon.png",
            hidden: !getPref("debug"),
            commandListener: async (ev: Event) => {
              await DDDTagRemove(collectionOrItem);
            },
          },
          {
            tag: "menuitem",
            label: "2.设置日期tag",
            icon: iconBaseUrl + "favicon.png",
            hidden: !getPref("debug"),
            commandListener: async (ev: Event) => {
              await DDDTagSet(collectionOrItem);
            },
          },
        ],
      },

      {
        tag: "menuseparator",
      },
      {
        tag: "menuitem",
        label: "预览批注导出",
        icon: iconBaseUrl + "favicon.png",
        commandListener: async (ev: Event) => {
          const target = ev.target as HTMLElement;
          const doc = target.ownerDocument;
          const items = await getSelectedItems(collectionOrItem);
          const annotations = getAllAnnotations(items);
          const mainWindow = Zotero.getMainWindow();
          let header = "";
          if (collectionOrItem == "collection") {
            header = `collection:${ZoteroPane.getSelectedCollection()?.name}`;
          } else if (items.length == 1) {
            header = `单条目:${items[0].getDisplayTitle()}`;
          } else {
            header = `多条目:${items.length}个条目`;
          }
          const win = await createDialog(header, [
            { tag: "div", classList: ["query"] },
            {
              tag: "div",
              classList: ["status"],
              properties: { innerHTML: "1 0" },
            },
            {
              tag: "div",
              classList: ["content"],
              // properties: { innerHTML: "2 0" },
              styles: {
                display: "flex",
                // minHeight: "20px",
                // minWidth: "100px",
                // height: Math.max(mainWindow.innerHeight*0.7,700)+ "px",
                // width: Math.max(mainWindow.outerWidth *0.8, 700) + "px",
                // minHeight: Math.max(mainWindow.innerHeight*0.7,700)+ "px",
                // minWidth: Math.max(mainWindow.outerWidth *0.8, 700) + "px",
                // maxHeight:  Math.max(mainWindow.innerHeight*0.9,700) + "px",
                // maxWidth: Math.max(mainWindow.outerWidth -180, 700) + "px",
                flexWrap: "wrap",
                overflowY: "scroll",
              },
            },
          ]);
          createSearchAnnContent(win, undefined, annotations);
        },
      },
      {
        tag: "menuseparator",
      },
      {
        tag: "menuitem",
        label: "选择多个Tag导出",
        icon: iconBaseUrl + "favicon.png",
        commandListener: (ev: Event) => {
          const target = ev.target as HTMLElement;
          const doc = target.ownerDocument;
          const div = createChooseTagsDiv(doc, collectionOrItem);
          // ztoolkit.log("自选标签", div);
          // setTimeout(()=>d.remove(),10000)
        },
      },

      {
        tag: "menu",
        label: "选择单个Tag导出",
        icon: iconBaseUrl + "favicon.png",
        popupId: `${config.addonRef}-create-note-tag-popup-${collectionOrItem}`,
        onpopupshowing: `Zotero.${config.addonInstance}.hooks.onMenuEvent("annotationToNoteTags", { window,type:"${collectionOrItem}" })`,
      },
      {
        tag: "menuseparator",
      },
      {
        tag: "menuitem",
        label: "选择多个Type导出",
        hidden: !isDebug(),
        icon: iconBaseUrl + "favicon.png",
        commandListener: (ev: Event) => {
          const target = ev.target as HTMLElement;
          const doc = target.ownerDocument;
          // const id = getParentAttr(ev.target as HTMLElement, "id");
          // const div =
          createChooseTagsDiv(doc, collectionOrItem);
          // ztoolkit.log("自选标签", div);
          // setTimeout(()=>d.remove(),10000)
        },
      },
      {
        tag: "menu",
        label: "选择单个Type导出",
        icon: iconBaseUrl + "favicon.png",
        popupId: `${config.addonRef}-create-note-type-popup-${collectionOrItem}`,
        onpopupshowing: `Zotero.${config.addonInstance}.hooks.onMenuEvent("annotationToNoteType", { window,type:"${collectionOrItem}" })`,
      },
    ],
  };
  return menu;
}
export async function annotationToNoteType(win: Window, collectionOrItem: "collection" | "item" = "collection") {
  const doc = win.document;
  const popup = doc.querySelector(`#${config.addonRef}-create-note-type-popup-${collectionOrItem}`) as XUL.MenuPopup;
  // Remove all children in popup
  while (popup?.firstChild) {
    popup.removeChild(popup.firstChild);
  }
  // const id = getParentAttr(popup, "id");
  // const isc = id?.includes("collection");
  // ztoolkit.log("id", id);

  const ans = getAllAnnotations(await getSelectedItems(collectionOrItem)); //.flatMap((a) => a.tags.map((t2) => Object.assign({}, a, { tag: t2 })));
  const tags = groupBy(ans, (an) => an.type)
    .sort(sortValuesLength)
    .slice(0, 20);
  const maxLen = Math.max(...tags.map((a) => a.values.length));

  // Add new children
  let elemProp: TagElementProps;
  // const tags =memFixedTags()
  if (tags.length === 0) {
    elemProp = {
      tag: "menuitem",
      properties: {
        label: "没有标签",
      },
      attributes: {
        disabled: true,
      },
    };
  } else {
    elemProp = {
      tag: "fragment",
      children: tags.map((tag) => {
        const color = memFixedColor(tag.key);
        //取对数可以保留差异比较大的值
        const pre = (100 - (Math.log(tag.values.length) / Math.log(maxLen)) * 100).toFixed();
        return {
          tag: "menuitem",
          icon: iconBaseUrl + "favicon.png",
          styles: {
            background: `linear-gradient(to left, ${color},  #fff ${pre}%, ${color} ${pre}%)`,
          },
          properties: {
            label: `${tag.key}[${tag.values.length}]`,
          },
          // children:[{tag:"div",styles:{height:"2px",background:memFixedColor(tag.key),width:`${tag.values.length/maxLen*100}%`}}],
          listeners: [
            {
              type: "command",
              listener: (event: any) => {
                stopPropagation(event);
                exportNoteByType(tag.key as _ZoteroTypes.Annotations.AnnotationType, collectionOrItem);
              },
            },
          ],
        };
      }),
    };
  }
  ztoolkit.UI.appendElement(elemProp, popup);
}

export async function annotationToNoteTags(win: Window, collectionOrItem: "collection" | "item" = "collection") {
  const doc = win.document;
  const popup = doc.querySelector(`#${config.addonRef}-create-note-tag-popup-${collectionOrItem}`) as XUL.MenuPopup;
  // Remove all children in popup
  while (popup?.firstChild) {
    popup.removeChild(popup.firstChild);
  }
  // const id = getParentAttr(popup, "id");
  // const isc = id?.includes("collection");
  // ztoolkit.log("id", id);

  const ans = getAllAnnotations(await getSelectedItems(collectionOrItem)).flatMap((a) =>
    a.tags.map((t2) => Object.assign({}, a, { tag: t2 })),
  );
  const tags = groupBy(ans, (an) => an.tag.tag)
    .sort(sortFixedTags10ValuesLength)
    .slice(0, 20);
  const maxLen = Math.max(...tags.map((a) => a.values.length));

  // Add new children
  let elemProp: TagElementProps;
  // const tags =memFixedTags()
  if (tags.length === 0) {
    elemProp = {
      tag: "menuitem",
      properties: {
        label: "没有标签",
      },
      attributes: {
        disabled: true,
      },
    };
  } else {
    elemProp = {
      tag: "fragment",
      children: tags.map((tag) => {
        const color = memFixedColor(tag.key);
        //取对数可以保留差异比较大的值
        const pre = (100 - (Math.log(tag.values.length) / Math.log(maxLen)) * 100).toFixed();
        return {
          tag: "menuitem",
          icon: iconBaseUrl + "favicon.png",
          styles: {
            background: `linear-gradient(to left, ${color},  #fff ${pre}%, ${color} ${pre}%)`,
          },
          properties: {
            label: `${tag.key}[${tag.values.length}]`,
          },
          // children:[{tag:"div",styles:{height:"2px",background:memFixedColor(tag.key),width:`${tag.values.length/maxLen*100}%`}}],
          listeners: [
            {
              type: "command",
              listener: (event: any) => {
                stopPropagation(event);
                exportSingleNote(tag.key, collectionOrItem);
              },
            },
          ],
        };
      }),
    };
  }
  ztoolkit.UI.appendElement(elemProp, popup);
}

import { createRoot } from "react-dom/client";
import { MyButton } from "./MyButton";
import { getAnnotationContent } from "../utils/zzlb";
import { getPublicationTags } from "../utils/zzlb";
import { PickerColor } from "../component/PickerColor";
import { PopoverPicker } from "../component/PopoverPicker";
import annotations from "./annotations";
import { stringify } from "querystring";
// import React = require("react");
async function topDialogRect() {
  const dialogData: { [key: string | number]: any } = {
    inputValue: "test",
    checkboxValue: true,
    loadCallback: () => {
      const content = dialogHelper.window.document.querySelector(".content");
      ztoolkit.log(dialogData, "Dialog Opened!", content);
      if (content)
        createRoot(content).render(
          <>
            <MyButton title="增加一个按钮" disabled />
            <MyButton title="可以点击" disabled={false} />
          </>,
        );
    },
    unloadCallback: () => {
      ztoolkit.log(dialogData, "Dialog closed!");
    },
  };

  const dialogWidth = Math.max(window.outerWidth * 0.6, 720);
  const dialogHeight = Math.max(window.outerHeight * 0.8, 720);
  const left = window.screenX + window.outerWidth / 2 - dialogWidth / 2;
  const top = window.screenY + window.outerHeight / 2 - dialogHeight / 2;

  const dialogHelper = new ztoolkit.Dialog(1, 1)
    .addCell(0, 0, {
      tag: "div",
      classList: ["content"],
      properties: { innerHTML: "0 0" },
    })
    .setDialogData(dialogData)
    .open("这是一个React的弹出框", {
      alwaysRaised: false,
      left,
      top,
      height: dialogHeight,
      width: dialogWidth,
      // fitContent: true,
      resizable: true,
      noDialogMode: true,
    });

  addon.data.dialog = dialogHelper;
  await dialogData.unloadLock.promise;
  addon.data.dialog = undefined;
  if (addon.data.alive) {
    //  ztoolkit.getGlobal("alert")(
    //   `Close dialog with ${dialogData._lastButtonId}.\nCheckbox: ${dialogData.checkboxValue}\nInput: ${dialogData.inputValue}.`,
    // );
  }
  ztoolkit.log(dialogData);
}
async function topDialog() {
  const dialogData: { [key: string | number]: any } = {
    inputValue: "test",
    checkboxValue: true,
    loadCallback: () => {
      ztoolkit.log(dialogData, "Dialog Opened!");
    },
    unloadCallback: () => {
      ztoolkit.log(dialogData, "Dialog closed!");
    },
  };
  const dialogHelper = new ztoolkit.Dialog(1, 1)
    .addCell(0, 0, {
      tag: "div",
      classList: ["content"],
      properties: { innerHTML: "0 0" },
    })
    .addButton("导出", "confirm")
    .addButton("取消", "cancel")
    // .addButton("Help", "help", {
    //   noClose: true,
    //   callback: (e) => {
    // dialogHelper.window?.alert(
    //   "Help Clicked! Dialog will not be closed.",
    // );
    //   },
    // })
    .setDialogData(dialogData)
    .open("Dialog Example", {
      alwaysRaised: true,
      left: 120,
      fitContent: true,
      resizable: true,
    });

  addon.data.dialog = dialogHelper;
  await dialogData.unloadLock.promise;
  addon.data.dialog = undefined;
  if (addon.data.alive) {
    //  ztoolkit.getGlobal("alert")(
    //   `Close dialog with ${dialogData._lastButtonId}.\nCheckbox: ${dialogData.checkboxValue}\nInput: ${dialogData.inputValue}.`,
    // );
  }
  ztoolkit.log(dialogData);
}

async function DDDTagClear() {
  const ProgressWindow = ztoolkit.ProgressWindow,
    d1p = getPref("date-1-pre"),
    d2p = getPref("date-2-pre"),
    d121 = getPref("date-1-2-1-pre"),
    d1210 = getPref("date-1-2-10-pre"),
    d1230 = getPref("date-1-2-30-pre");

  const starts = [d1p, d2p, d121, d1210, d1230].filter((tag) => tag) as string[];
  if (starts.length == 0) {
    return;
  }

  const libraryID = Zotero.Libraries.userLibraryID;
  const tags = await Zotero.Tags.getAll(libraryID);
  const removeIDs = tags
    .filter((a) => starts.some((start) => a.tag.startsWith(start)))
    .map((a) => Zotero.Tags.getID(a.tag))
    .filter((f) => f) as number[];
  const header = `需要删除${removeIDs.length}标签`;
  getPopupWin({ header })?.createLine({ text: "执行中" });
  await Zotero.Tags.removeFromLibrary(
    libraryID,
    removeIDs,
    (done: number, total: number) => {
      getPopupWin({ header })?.changeLine({
        idx: 0,
        progress: (done / total) * 100,
        text: `执行中:${done}/${total}`,
      });
    },
    [1],
  );
  getPopupWin({ header })?.createLine({ text: "完成" }).startCloseTimer(5000, false);
}
async function DDDTagRemove(collectionOrItem: "collection" | "item") {
  const items = await getSelectedItems(collectionOrItem);
  const ProgressWindow = ztoolkit.ProgressWindow,
    d1p = getPref("date-1-pre"),
    d2p = getPref("date-2-pre"),
    d121 = getPref("date-1-2-1-pre"),
    d1210 = getPref("date-1-2-10-pre"),
    d1230 = getPref("date-1-2-30-pre");

  const starts = [d1p, d2p, d121, d1210, d1230].filter((tag) => tag) as string[];
  if (starts.length == 0) {
    return;
  }

  const total = items.length;

  const header = `需要从${total}条目删除标签`;
  getPopupWin({ header }).createLine({ text: "执行中" });
  items.forEach((item, done) => {
    const tags = item.getTags();
    let changed = false;
    tags.forEach((tag) => {
      if (starts.some((start) => tag.tag.startsWith(start))) {
        item.removeTag(tag.tag);
        changed = true;
      }
    });
    if (changed) {
      item.saveTx();
      getPopupWin({ header }).changeLine({
        idx: 0,
        progress: (done / total) * 100,
        text: `执行中:${done}/${total}`,
      });
    }
  });

  getPopupWin({ header }).createLine({ text: "完成" }).startCloseTimer(5000, false);
}
async function DDDTagSet(collectionOrItem: "collection" | "item") {
  const items = await getSelectedItems(collectionOrItem);

  const ProgressWindow = ztoolkit.ProgressWindow,
    d1s = getPref("date-1") as string,
    d2s = getPref("date-2") as string,
    d1p = getPref("date-1-pre"),
    d2p = getPref("date-2-pre"),
    d121 = getPref("date-1-2-1-pre"),
    d1210 = getPref("date-1-2-10-pre"),
    d1230 = getPref("date-1-2-30-pre");
  //  const ProgressWindow = Zotero.ZoteroStyle.data.ztoolkit.ProgressWindow,d1s="Received[:\\s]*",d2s="Accepted[:\\s]*",d1p="",d2p="",d121="#Z1d/",d1210="",d1230="";
  if (!items) return "未选中Items";
  if (!d1s && !d2s && !d1p && !d2p && !d121 && !d1210 && !d1230) return "未配置";
  const regExpDate =
    /\d{1,2}[\s-]+(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jul|July|Jun|June|Aug|August|Sep|September|Oct|October|Nov|November|Dec|December)[\s-]+\d{2,4}/;
  const ids = items
    .map((a) => (a.parentItem ? a.parentItem : a))
    .filter((a) => !a.isAttachment())
    .flatMap((f) => f.getAttachments());
  const pdfs = Zotero.Items.get(ids).filter((f) => f.isPDFAttachment);
  const header = `找到${items.length}条目${pdfs.length}pdf`;
  getPopupWin({ header }).createLine({ text: "处理中" });
  for (let index = 0; index < pdfs.length; index++) {
    const pdf = pdfs[index];
    if (!pdf.isAttachment() || !pdf.isPDFAttachment()) continue;
    let text = "",
      extractedPages = 0,
      totalPages = 0;
    try {
      const r = await Zotero.PDFWorker.getFullText(pdf.id, 3, true);
      text = r.text;
      extractedPages = r.extractedPages;
      totalPages = r.totalPages;
    } catch (error) {
      continue;
    }
    const [d1, d2] = [d1s, d2s].map((ds) => {
      const dd = ds.split("\n").filter((f) => f);
      for (const d of dd) {
        const q = text.match(new RegExp(`${d}(${regExpDate.source})`, "i"));
        if (q) {
          return new Date(q[1]);
        }
      }
    });
    const q = text.match(new RegExp(".{15}" + regExpDate.source, "gi"));
    if (q) {
      ztoolkit.log(q, pdf.getDisplayTitle(), d1, d2);
    }
    let changed = false;
    if (d1 && d1p) {
      pdf.parentItem?.addTag(`${d1p}${d1.toLocaleDateString().replace(/\//g, "-")}`);
      changed = true;
    }
    if (d2 && d2p) {
      pdf.parentItem?.addTag(`${d2p}${d2.toLocaleDateString().replace(/\//g, "-")}`);
      changed = true;
    }
    if (d1 && d2) {
      if (d121) {
        const dd1 = Math.floor((d2.getTime() - d1.getTime()) / (24 * 3600 * 1000));

        const d12dps = `${d121}${dd1}`;
        pdf.parentItem?.addTag(d12dps);
        changed = true;
      }
      if (d1210) {
        const dd101 = Math.floor((d2.getTime() - d1.getTime()) / (24 * 3600 * 1000 * 10)) * 10;
        const dd102 = Math.ceil((d2.getTime() - d1.getTime()) / (24 * 3600 * 1000 * 10)) * 10;
        const d12dps = `${d1210}${dd101}-${dd102}`;
        pdf.parentItem?.addTag(d12dps);
        changed = true;
      }
      if (d1230) {
        const dm1 = Math.floor((d2.getTime() - d1.getTime()) / (24 * 3600 * 1000 * 30)) * 30;
        const dm2 = Math.ceil((d2.getTime() - d1.getTime()) / (24 * 3600 * 1000 * 30)) * 30;
        const d12mps = `${d1230}${dm1}-${dm2}`;
        pdf.parentItem?.addTag(d12mps);

        changed = true;
      }
    }
    if (changed) pdf.parentItem?.saveTx();
    getPopupWin({ header }).changeLine({
      idx: 0,
      progress: (index / pdfs.length) * 100,
      text: pdf.getDisplayTitle(),
    });
  }
  getPopupWin({ header }).createLine({ text: `已完成` });
}
async function funcTranslateAnnotations(isCollectionOrItem: boolean | "collection" | "item") {
  const items = await getSelectedItems(isCollectionOrItem);
  const ans = getAllAnnotations(items)
    .filter((an) => an.ann.annotationText)
    // .filter((an) => an.item.getField("language")?.includes("en"))
    .filter(
      (an) =>
        (!an.comment && !an.item.getField("language")?.includes("zh")) ||
        an.comment.includes("🔤undefined🔤") ||
        an.comment.includes("🔤[请求错误]"),
    );
  const header = `找到${items.length}条目${ans.length}笔记`;
  getPopupWin({ header }).createLine({ text: "处理中" });
  for (let index = 0; index < ans.length; index++) {
    const an = ans[index];
    const text = an.ann.annotationText;
    let r = "";
    if (an.item.getField("language")?.includes("en")) {
      const result = (
        await Zotero.PDFTranslate.api.translate(text, {
          langto: "zh",
          itemID: an.item.id,
          pluginID: config.addonID,
        })
      ).result;
      r = "🔤" + result + "🔤";
    }
    if (!an.ann.annotationComment) {
      an.ann.annotationComment = r;
    } else {
      const end = an.ann.annotationComment.indexOf("🔤", 1);
      if (end > -1) an.ann.annotationComment = an.ann.annotationComment = r + "" + an.ann.annotationComment.substring(end, 999);
    }
    // an.ann.annotationComment = !an.ann.annotationComment
    //   ? r
    //   : an.ann.annotationComment.replace(/🔤undefined🔤/, r);
    getPopupWin({ header }).changeLine({
      idx: 0,
      progress: (index / ans.length) * 100,
      text: text.substring(0, 10) + "=>" + r.substring(0, 10),
    });
    an.ann.saveTx();
    Zotero.Promise.delay(500);
  }
  getPopupWin({ header }).createLine({ text: "已完成" });
  // getPopupWin({ header }).startCloseTimer(5000);
}

async function funcCreateTab(items: Zotero.Item[]) {
  // const tab = new Tab(
  //   `chrome://${config.addonRef}/content/tab.xhtml`,
  //   "一个新查询",
  //   (doc) => {
  //     ztoolkit.log("可以这样读取doc", doc.querySelector("#tab-page-body"));
  //     doc.querySelector("#tab-page-body")!.innerHTML = "";
  //     createChild(doc, items);
  //   },
  // );
  const tab = await createTabDoc();
  const body = tab.document?.body as HTMLBodyElement;
  const query = ztoolkit.UI.appendElement({ tag: "div" }, body) as HTMLDivElement;
  const content = ztoolkit.UI.appendElement({ tag: "div" }, body) as HTMLDivElement;
  let searchTag = "";
  ztoolkit.UI.appendElement(
    {
      tag: "div",
      properties: { textContent: "查询" },
      children: [
        {
          tag: "input",
          listeners: [
            {
              type: "keypress",
              listener: (ev) => {
                searchTag = (ev.target as HTMLInputElement).value;
                const filterFunc = ReTest(searchTag);
                const items2 = items.filter((f) => f.getTags().findIndex((t) => filterFunc(t.tag)) != -1);
                createChild(content, items2);
              },
            },
          ],
        },
      ],
    },
    query,
  );

  createChild(content, items);

  function createChild(content: HTMLDivElement, items: Zotero.Item[]) {
    clearChild(content);
    const filterFunc = ReTest(searchTag);
    const tags = groupBy(
      items.flatMap((item) =>
        item
          .getTags()
          .map((a) => a.tag)
          .filter(filterFunc)
          .map((tag) => ({ tag, item })),
      ),
      (f) => f.tag,
    ).sort(sortValuesLengthKeyAsc);
    tags.forEach((f) => {
      ztoolkit.UI.appendElement(
        {
          tag: "div",
          properties: { textContent: `[${f.values.length}]${f.key}` },
          listeners: [
            {
              type: "click",
              listener(ev) {
                ev.stopPropagation();
                const div = ev.target as HTMLDivElement;
                if (div.children.length > 0) {
                  [...div.children].forEach((f, i) => f.remove());
                  return;
                }
                f.values.sort(sortBy((a) => a.item.getField("year"))).forEach((a) => {
                  ztoolkit.UI.appendElement(
                    {
                      tag: "div",
                      properties: {
                        textContent: `${a.item.firstCreator} ${a.item.getField("year")}  ${a.item.getField("publicationTitle")}  ${a.item.getDisplayTitle()}`,
                      },
                      children: [
                        {
                          tag: "div",
                          properties: {
                            innerHTML: getCiteItemHtml(a.item, undefined, "打开"),
                          },
                          listeners: [
                            {
                              type: "click",
                              listener(ev) {
                                ev.stopPropagation();
                                //为什么不起作用？
                                const z = Zotero.Items.get(a.item.getAttachments()).filter((f) => f.isPDFAttachment())[0];
                                if (z) {
                                  ztoolkit.log("打开", z.getDisplayTitle(), z);
                                  Zotero.FileHandlers.open(z);
                                }
                                return true;
                              },
                              options: { capture: true },
                            },
                          ],
                        },
                      ],
                      listeners: [
                        {
                          type: "click",
                          listener(ev) {
                            ev.stopPropagation();
                            return true;
                          },
                          options: { capture: true },
                        },
                      ],
                    },
                    div,
                  );
                });
                return true;
              },
              options: { capture: false },
            },
          ],
        },
        content,
      );
    });
  }
}
function createTabDoc(): Promise<Tab> {
  return new Promise((resolve, reject) => {
    const tab = new Tab(`chrome://${config.addonRef}/content/tab.xhtml`, "一个新查询", (doc) => {
      resolve(tab);
    });
  });
}
function funcSplitTag(items: Zotero.Item[], ans: AnnotationRes[]) {
  ztoolkit.log(`找到${items.length}条目${ans.length}笔记`);

  const header = `找到${items.length}条目${ans.length}笔记`;
  getPopupWin({ header }).createLine({ text: "处理中" });
  ans.forEach(async (ann, i) => {
    getPopupWin({ header }).changeLine({
      idx: 0,
      progress: (i / ans.length) * 100,
      text: "处理中",
    });
    const ts = ann.tags
      .map((tag) => tag.tag.match(/#([^/]*)\/([^/]*)[/]?/))
      .filter((f) => f != null && f.length >= 3)
      .flatMap((a) => (a != null ? [a[1], a[2]] : []));
    const tas = uniqueBy(ts, (a) => a).filter((f) => ann.tags.every((e) => e.tag != f));
    //ztoolkit.log(ann.tags,tas)
    if (tas.length > 0) {
      const tas2 = tas.map(async (a) => ann.ann.addTag(a, 0));
      ztoolkit.log(tas.length, "分割", tas);
      await promiseAllWithProgress(tas2).then(() => {
        ann.ann.saveTx();
      });
    }
  });
  getPopupWin({ header }).createLine({ text: "处理完成" });
  getPopupWin({ header }).startCloseTimer(3000);
}

function createSearchAnnContent(dialogWindow: Window | undefined, popupDiv: HTMLElement | undefined, annotations: AnnotationRes[]) {
  const isWin = dialogWindow != undefined;
  const doc = dialogWindow?.document || popupDiv;
  if (!doc) return;
  let text = "";
  let tag = "";
  let pageSize = (getPref("SearchAnnPageSize") as number) || 16;
  let pageIndex = 1;
  let fontSize = (getPref("SearchAnnFontSize") as number) || 16;
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
        tag: "div",
        properties: { textContent: "每页N条" },
        children: [
          {
            tag: "input",
            namespace: "html",
            properties: {
              placeholder: "输入数字",
              value: pageSize,
              type: "number",
            },
            styles: { width: "30px" },
            listeners: [
              {
                type: "change",
                listener: (ev: Event) => {
                  stopPropagation(ev);
                  pageSize = parseInt((ev.target as HTMLInputElement).value.trim());
                  if (pageSize <= 0) pageSize = 1;
                  (ev.target as HTMLInputElement).value = pageSize + "";
                  setPref("SearchAnnPageSize", pageSize);
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
        tag: "button",
        properties: { textContent: "导出" },
        listeners: [
          {
            type: "click",
            listener: (e) => {
              e.stopPropagation();
              exportNote({ filter: () => ans, toText: toText1 });
              dialogWindow?.close();
              popupDiv?.remove();
            },
            options: { capture: true },
          },
        ],
      },

      {
        tag: "div",
        properties: { textContent: "预览文字大小" },
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
                  height: "100px",
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
                  innerHTML:
                    anTo
                      .getTags()
                      .map((a) => a.tag)
                      .join(",") + getPublicationTags(anTo),
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

function createChild(doc: Document, items: Zotero.Item[]) {
  const annotations = getAllAnnotations(items).flatMap((f) => f.tags.map((t3) => Object.assign(f, { tag: t3 })));
  const tags = groupBy(annotations, (a) => a.tag.tag);
  tags.sort(sortFixedTags10ValuesLength);
  ztoolkit.UI.appendElement(
    {
      tag: "div",
      children: tags.map((t4) => ({
        tag: "span",
        properties: { textContent: t4.key + "[" + t4.values.length + "]" },
      })),
    },
    doc.querySelector("body")!,
  );
  ztoolkit.UI.appendElement(
    {
      tag: "div",
      children: annotations.slice(0, 300).map((t5) => ({ tag: "div", properties: { textContent: t5.text } })),
    },
    doc.querySelector("body")!,
  );
}
export function stopPropagation(e: Event) {
  const win = (e.target as any).ownerGlobal;
  e = e || win?.event || window.event;
  if (e.stopPropagation) {
    e.stopPropagation(); //W3C阻止冒泡方法
  } else {
    e.cancelBubble = true; //IE阻止冒泡方法
  }
}
async function createChooseTagsDiv(doc: Document, collectionOrItem: "collection" | "item") {
  const selectedTags: string[] = [];
  const idTags = ID.result;
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
function clearChild(ele: Element | null) {
  if (ele) {
    for (const e of ele.children) e.remove();
    ele.innerHTML = "";
  }
}

function createActionTag(div: HTMLElement | undefined, action: () => void | undefined, others: TagElementProps[] = []): TagElementProps[] {
  if (!div) return [];
  return [
    {
      tag: "button",
      namespace: "html",
      properties: { textContent: "关闭" },
      listeners: [
        {
          type: "click",
          listener: (ev: any) => {
            stopPropagation(ev);
            div.remove();
          },
        },
      ],
    },
    // {
    //   tag: "button",
    //   namespace: "html",
    //   properties: { textContent: "切换颜色" },
    //   listeners: [
    //     {
    //       type: "click",
    //       listener(ev: any) {
    //         stopPropagation(ev);
    //         ztoolkit.log(div, div.style.background);
    //         if (!div) return;
    //         div.style.background = div.style.background
    //           ? ""
    //           : getOneFixedColor();
    //       },
    //     },
    //   ],
    // },
    action
      ? {
        tag: "button",
        namespace: "html",
        properties: { textContent: "确定生成" },
        // styles: {
        //   padding: "6px",
        //   background: "#f99",
        //   margin: "1px",
        // },
        listeners: [
          {
            type: "click",
            listener: (ev: any) => {
              stopPropagation(ev);
              action();
            },
          },
        ],
      }
      : { tag: "span" },
    ...others,
  ];
}
async function saveNote(targetNoteItem: Zotero.Item, txt: string) {
  await Zotero.BetterNotes.api.note.insert(targetNoteItem, txt, -1);
  // const editor= await Zotero.BetterNotes.api.editor.getEditorInstance(targetNoteItem.id)
  // await Zotero.BetterNotes.api.editor.replace(editor,0,1e3,txt)
  await targetNoteItem.saveTx();
  ztoolkit.log("笔记更新完成", new Date().toLocaleTimeString());
  getPopupWin().createLine({ text: `笔记更新完成`, type: "default" });
}
async function createNote(txt = "") {
  const targetNoteItem = new Zotero.Item("note");
  targetNoteItem.libraryID = ZoteroPane.getSelectedLibraryID();
  const selected = ZoteroPane.getSelectedCollection(true);
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

  if (txt) await Zotero.BetterNotes.api.note.insert(targetNoteItem, txt, -1);
  targetNoteItem.addTag(`${config.addonRef}:生成的笔记`, 0);
  //必须保存后面才能保存图片
  await targetNoteItem.saveTx();
  const header = "";
  getPopupWin({ header }).createLine({
    text: "创建新笔记 ",
    type: "default",
  });
  return targetNoteItem;
}
function getAllAnnotations(items: Zotero.Item[]) {
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
const popupWinId = 1;
export function getPopupWin({
  closeTime = 5000,
  header = "整理笔记",
  lines = [],
}: { closeTime?: number; header?: string; lines?: string[] } = {}) {
  ztoolkit.log("getPopupWin", Date.now() - popupTime);
  if (!popupWin || Date.now() - popupTime > closeTime) {
    popupWin = new ztoolkit.ProgressWindow(header, {
      closeTime: closeTime,
      closeOnClick: true,
    }).show();

    // popupWin?.startCloseTimer(closeTime,false);
    const oriCloseAll = Zotero.ProgressWindowSet.closeAll;
    Zotero.ProgressWindowSet.closeAll = () => {
      popupWin = undefined;
      oriCloseAll();
      Zotero.ProgressWindowSet.closeAll = oriCloseAll;
    };
  }
  popupTime = Date.now();
  if (lines && lines.length > 0) for (const line of lines) popupWin?.createLine({ text: line });
  popupWin?.startCloseTimer(closeTime, false);
  return popupWin;
}

function getTitleFromAnnotations(annotations: AnnotationRes[]) {
  const itemsLength = uniqueBy(annotations, (a) => a.item.key).length;
  // const pdfLength = uniqueBy(annotations, (a) => a.pdf.key).length;
  const annotationLength = uniqueBy(annotations, (a) => a.ann.key).length;
  // const tagLength = uniqueBy(annotations, (a) => a.tag.tag).length;
  // ${itemsLength}-${annotationLength}
  const title = `批注 (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}) ${annotationLength}`;
  return title;
}

async function exportNote({
  toText,
  filter = undefined,
  items = undefined,
  tags = undefined,
}: {
  toText: ((arg0: AnnotationRes[]) => string) | ((arg0: AnnotationRes[]) => Promise<string>);

  filter?: ((arg0: AnnotationRes[]) => AnnotationRes[]) | ((arg0: AnnotationRes[]) => Promise<AnnotationRes[]>);
  items?: Zotero.Item[];
  tags?: string[];
}) {
  getPopupWin();
  let annotations = items ? getAllAnnotations(items) : [];
  if (filter) {
    annotations = await filter(annotations);
  }
  if (annotations.length == 0) {
    getPopupWin()
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
  annotations = await convertHtml(annotations, note);
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
  note.addTag(`${config.addonRef}:引用Item${usedItems.length}个`);

  await saveNote(note, `${title}${txt}`);
}
async function getSelectedItems(isCollectionOrItem: boolean | "collection" | "item") {
  let items: Zotero.Item[] = [];
  if (isCollectionOrItem === true || isCollectionOrItem === "collection") {
    const selected = ZoteroPane.getSelectedCollection();
    ztoolkit.log(isCollectionOrItem, selected);
    if (selected) {
      const cs = uniqueBy([selected, ...getChildCollections([selected])], (u) => u.key);
      items = cs.flatMap((f) => f.getChildItems(false, false));
      // ztoolkit.log("getSelectedItems",items,cs)
    } else {
      const itemsAll = await Zotero.Items.getAll(1, false, false, false);
      const itemTypes = ["journalArticle", "thesis"]; //期刊和博硕论文
      items = itemsAll.filter((f) => itemTypes.includes(f.itemType));
    }
  } else {
    items = ZoteroPane.getSelectedItems();
  }
  return items;
}
// function checkIsCollection(ev: Event) {
//   const isCollection =
//     getParentAttr(ev.target as HTMLElement)?.includes("collection") || false;
//   return isCollection;
// }
// async function getSelectedItemsEv(ev: Event) {
//   const isCollection = checkIsCollection(ev);
//   return getSelectedItems(isCollection);
// }

async function exportNoteByTag(isCollection: boolean = false) {
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
async function exportNoteByTagPdf(isCollection: boolean = false) {
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

async function exportNoteByType(type: _ZoteroTypes.Annotations.AnnotationType, collectionOrItem: "collection" | "item") {
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

async function exportSingleNote(tag: string, collectionOrItem: "collection" | "item") {
  if (tag)
    exportNote({
      filter: async (ans) => ans.filter((f) => f.tags.some((a) => tag == a.tag)),
      items: await getSelectedItems(collectionOrItem),
      toText: (ans) =>
        groupBy(ans, (a) => a.pdfTitle)
          .sort(sortKey)
          .flatMap((a, index, aa) => [
            // `<h1>(${index + 1}/${aa.length}) ${a.key} ${getCiteItemHtmlWithPage(a.values[0].ann)} </h1>`,
            // `${getPublicationTags(a.values[0]?.item)}`,

            `<h1>(${index + 1}/${aa.length}) ${getCiteItemHtmlWithPage(a.values[0].ann)} ${getPublicationTags(a.values[0]?.item)}</h1>`,
            `${a.key}`,
            a.values
              .map((b) => b.html ?? `<h2>${getCiteAnnotationHtml(b.ann, b.ann.annotationText + b.ann.annotationComment)}</h2>`)
              .join(" "),
          ])
          .join(""),
    });
}
function exportTagsNote(tags: string[], items: Zotero.Item[]) {
  if (tags.length > 0) {
    exportNote({
      filter: async (ans) => ans.filter((f) => f.tags.some((a) => tags.includes(a.tag))).map((a) => Object.assign(a, { tag: a.tag })),
      items,
      toText: toText1,
    });
  }
}

function toText1(ans: AnnotationRes[]) {
  return (
    groupBy(
      ans.flatMap((a) => a.tags),
      (a) => a.tag,
    )
      .map((a) => `[${a.values.length}]${a.key}`)
      .join(",") +
    "\n" +
    groupBy(ans, (a) => a.pdfTitle)
      .sort(sortKey)
      .flatMap((a, index, aa) => [
        // `<h1>(${index + 1}/${aa.length}) ${a.key} ${getCiteItemHtmlWithPage(a.values[0].ann)}</h1>`,
        // `${getPublicationTags(a.values[0]?.item)}`,
        `<h1>(${index + 1}/${aa.length}) ${getCiteItemHtmlWithPage(a.values[0].ann)} ${getPublicationTags(a.values[0]?.item)}</h1>`,
        `${a.key}`,
        ...a.values.map((b) => b.html),
        // a.values.map((b) => b.html).join("\n"),
      ])
      .join("")
  );
}
export function getColorTags(tags: string[]) {
  return tags.map(
    (t16) =>
      `<span style="background-color:${memFixedColor(t16, undefined)};box-shadow: ${memFixedColor(t16, undefined)} 0px 0px 5px 4px;">${t16}</span>`,
  );
}
export function getCiteAnnotationHtml(annotation: Zotero.Item, text = "") {
  const attachmentItem = annotation.parentItem;
  if (!attachmentItem) return "";
  const parentItem = attachmentItem.parentItem;
  if (!parentItem) return "";
  const color = annotation.annotationColor;
  const pageLabel = annotation.annotationPageLabel;
  const position = JSON.parse(annotation.annotationPosition);
  const citationItem = getCitationItem(parentItem, pageLabel);
  const storedAnnotation = {
    attachmentURI: Zotero.URI.getItemURI(attachmentItem),
    annotationKey: annotation.key,
    color,
    pageLabel,
    position,
    citationItem,
  };
  const formatted = text || annotation.annotationComment || annotation.annotationText || "没有文本，没有内容。。。";
  //class="highlight" 对应的内容必须有双引号 估计是Zotero.EditorInstanceUtilities._transformTextToHTML方法处理了这个
  return `<span class="highlight" data-annotation="${encodeURIComponent(JSON.stringify(storedAnnotation))}">"${formatted}"</span>
  `;
}
function getCitationItem(parentItem?: Zotero.Item, pageLabel: string = "") {
  if (!parentItem) return {};
  // Note: integration.js` uses `Zotero.Cite.System.prototype.retrieveItem`,
  // which produces a little bit different CSL JSON
  // @ts-ignore Item
  const itemData = Zotero.Utilities.Item.itemToCSLJSON(parentItem);
  const uris = [Zotero.URI.getItemURI(parentItem)];
  const citationItem = {
    uris,
    locator: pageLabel,
    itemData,
  };
  return citationItem;
}
function getCiteItemHtmlWithPage(annotation: Zotero.Item, text: string = "") {
  return getCiteItemHtml(annotation.parentItem?.parentItem, annotation.annotationPageLabel, text);
}
function getCiteItemHtml(parentItem?: Zotero.Item, locator: string = "", text: string = "") {
  if (!parentItem) return "";
  const citationData = {
    citationItems: [getCitationItem(parentItem, locator)],
    properties: {},
  };
  const formatted = text ? text : Zotero.EditorInstanceUtilities.formatCitation(citationData);
  return `<span class="citation" data-citation="${encodeURIComponent(JSON.stringify(citationData))}">${formatted}</span>`;
}

export default { register, unregister };
