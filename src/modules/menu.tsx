import * as React from "react";
import { createRoot } from "react-dom/client";
import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { config } from "../../package.json";
// import { PickerColor } from "../component/PickerColor";
import { groupBy } from "../utils/groupBy";
import { getPref } from "../utils/prefs";
import { sortBy, sortValuesLengthKeyAsc } from "../utils/sort";
import { Tab } from "../utils/tab";
import { uniqueBy } from "../utils/uniqueBy";
import { ReTest, clearChild, createDialog, getChildCollections, isDebug, memFixedColor, stopPropagation } from "../utils/zzlb";
import {
  createAnnotationMatrix,
  createChooseTagsDiv,
  createSearchAnnContent,
  exportNote,
  exportScaleCsv,
  exportScaleNote,
  exportScaleXls,
  getAllAnnotations,
} from "./AnnotationsToNote";
import { copyAnnotations, mergePdfs, pasteAnnotations } from "./BackupAnnotation";
import { DDDTagClear, DDDTagRemove, DDDTagSet } from "./DDD";
import { getCiteItemHtml } from "./getCitationItem";
import { funcSplitTag, funcTranslateAnnotations } from "./menuTools";
import { MyButton } from "./MyButton";
import { getString } from "../utils/locale";
import { waitFor, waitUtilAsync } from "../utils/wait";

const iconBaseUrl = `chrome://${config.addonRef}/content/icons/`;
function register() {
  if (!getPref("hide-in-item-menu")) ztoolkit.Menu.register("item", buildMenu("item"));
  if (!getPref("hide-in-collection-menu")) ztoolkit.Menu.register("collection", buildMenu("collection"));
}

function unregister() {
  ztoolkit.Menu.unregister(`${config.addonRef}-create-note`);
  ztoolkit.Menu.unregister(`${config.addonRef}-create-note-collection`);
}

function buildMenu(collectionOrItem: "collection" | "item") {
  const menu: MenuitemOptions = {
    tag: "menu",
    label: getString("menu-annotationManage") + " - in " + collectionOrItem,

    icon: iconBaseUrl + "favicon.png",
    children: [
      {
        //自定义命令
        tag: "menu",
        label: getString("menu-customMenu"), // "自定义命令",
        icon: iconBaseUrl + "favicon.png",
        children: [
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
            tag: "menu",
            label: "日期管理",
            icon: iconBaseUrl + "favicon.png",
            hidden: !getPref("debug"),
            children: [
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
        ],
      },

      {
        //----
        tag: "menuseparator",
      },
      {
        //预览批注导出
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
            header = `collection:${Zotero.getActiveZoteroPane().getSelectedCollection()?.name}`;
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
                overflowY: "overlay",
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
        //动态菜单需要用公开的函数？hooks.onMenuEvent
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
      {
        tag: "menuseparator",
      },
      {
        tag: "menu",
        label: "选择单个Color导出",
        icon: iconBaseUrl + "favicon.png",
        popupId: `${config.addonRef}-create-note-color-popup-${collectionOrItem}`,
        onpopupshowing: `Zotero.${config.addonInstance}.hooks.onMenuEvent("annotationToNoteColor", { window,type:"${collectionOrItem}" })`,
      },
      {
        tag: "menuseparator",
      },
      {
        tag: "menuitem",
        label: "导出量表格式Note(测试中)",
        icon: iconBaseUrl + "favicon.png",
        commandListener: async (ev: Event) => {
          exportScaleNote(collectionOrItem);
        },
      },
      {
        tag: "menuitem",
        label: "导出量表格式CSV(测试中)",
        icon: iconBaseUrl + "favicon.png",
        commandListener: async (ev: Event) => {
          exportScaleCsv(collectionOrItem);
        },
      },
      {
        tag: "menuitem",
        label: "导出量表格式XLsx(测试中)",
        icon: iconBaseUrl + "favicon.png",
        commandListener: async (ev: Event) => {
          exportScaleXls(collectionOrItem);
        },
      },
      {
        tag: "menuseparator",
      },
      {
        tag: "menu",
        label: "自动更新note(测试中)",
        icon: iconBaseUrl + "favicon.png",
        commandListener: async (ev: Event) => {
          //!TODO
          alert("测试中。。。");
        },
      },
      {
        tag: "menuitem",
        label: getString("menu-AnnotationMatrix") + "(测试中)",
        icon: iconBaseUrl + "favicon.png",
        commandListener: async (ev: Event) => {
          const target = ev.target as HTMLElement;
          const doc = target.ownerDocument;
          const items = await getSelectedItems(collectionOrItem);
          const annotations = getAllAnnotations(items);
          const mainWindow = Zotero.getMainWindow();
          let header = "";
          if (collectionOrItem == "collection") {
            header = `collection:${Zotero.getActiveZoteroPane().getSelectedCollection()?.name}`;
          } else if (items.length == 1) {
            header = `单条目:${items[0].getDisplayTitle()}`;
          } else {
            header = `多条目:${items.length}个条目`;
          }
          const win = (await createDialog(header, [
            { tag: "div", classList: ["query"] },
            {
              tag: "div",
              classList: ["status"],
              properties: { innerHTML: "" },
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
                overflowY: "overlay",
              },
            },
          ])) as Window;
          createAnnotationMatrix(win, undefined, annotations);
          // 跨window操作示例
          // const onOk = () => {
          //   const libId = Zotero.Libraries.userLibraryID
          // }
          // waitFor(() => win.document.querySelector("#content"), 100, 10000).then(() => {
          //   win.mainWindow = mainWindow;
          //   win.Zotero = Zotero;
          //   win.onOk = onOk
          // })
        },
      },
      {
        //备份还原pdf注释（慎用）
        tag: "menu",
        label: "备份还原pdf注释",
        icon: iconBaseUrl + "favicon.png",
        children: [
          {
            //复制pdf注释
            tag: "menuitem",
            label: "备份pdf注释到剪切板",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              const items = await getSelectedItems(collectionOrItem);
              await copyAnnotations(items);
            },
          },
          {
            tag: "menuseparator",
          },
          {
            //粘贴pdf注释
            tag: "menuitem",
            label: "还原pdf注释-用作者年份标题匹配",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              const items = await getSelectedItems(collectionOrItem);
              await pasteAnnotations(items, false, false, true);
            },
          },
          {
            //粘贴pdf注释
            tag: "menuitem",
            label: "还原pdf注释-用作者年份标题+文件大小匹配",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              const items = await getSelectedItems(collectionOrItem);
              await pasteAnnotations(items, false, true, false);
            },
          },
          {
            //粘贴pdf注释
            tag: "menuitem",
            label: "还原pdf注释-仅文件md5匹配（严格）",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              const items = await getSelectedItems(collectionOrItem);
              await pasteAnnotations(items, true, false, false);
            },
          },
          {
            tag: "menuseparator",
          },
          {
            //相同PDF合并，注释合并
            tag: "menuitem",
            label: "🫣仅保留1个PDF，注释合并(条目下其它PDF删除!!!慎用，PDF页码不一样可能会产生位置偏移!!!)",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              const items = await getSelectedItems(collectionOrItem);
              await mergePdfs(items, false, false);
            },
          },
          {
            //相同PDF合并，注释合并
            tag: "menuitem",
            label: "仅保留1个PDF，注释合并(条目下与这个PDF大小一样的PDF删除)",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              const items = await getSelectedItems(collectionOrItem);
              await mergePdfs(items, true, false);
            },
          },
          {
            //相同PDF合并，注释合并
            tag: "menuitem",
            label: "仅保留1个PDF，注释合并(条目下与这个PDF的MD5一样的PDF删除)",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              const items = await getSelectedItems(collectionOrItem);
              await mergePdfs(items, false, true);
            },
          },
        ],
      },
    ],
  };
  return menu;
}

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
                                  //@ts-ignore Zotero.FileHandlers.open
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
export function createTabDoc(): Promise<Tab> {
  return new Promise((resolve, reject) => {
    const tab = new Tab(`chrome://${config.addonRef}/content/tab.xhtml`, "一个新查询", (doc) => {
      resolve(tab);
    });
  });
}

export function createActionTag(
  div: HTMLElement | undefined,
  action: () => void | undefined,
  others: TagElementProps[] = [],
): TagElementProps[] {
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
export async function getSelectedItems(isCollectionOrItem: boolean | "collection" | "item") {
  let items: Zotero.Item[] = [];
  if (isCollectionOrItem === true || isCollectionOrItem === "collection") {
    const selected = Zotero.getActiveZoteroPane().getSelectedCollection();
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
    items = Zotero.getActiveZoteroPane().getSelectedItems();
  }
  return items;
}

export function getColorTags(tags: string[]) {
  return tags.map(
    (t16) =>
      `<span style="background-color:${memFixedColor(t16, undefined)};box-shadow: ${memFixedColor(t16, undefined)} 0px 0px 5px 4px;">${t16}</span>`,
  );
}

export default { register, unregister };
