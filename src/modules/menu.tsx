import * as React from "react";
import { createRoot } from "react-dom/client";
import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { config } from "../../package.json";
import { PickerColor } from "../component/PickerColor";
import { groupBy } from "../utils/groupBy";
import { getPref } from "../utils/prefs";
import { sortBy, sortValuesLengthKeyAsc } from "../utils/sort";
import { Tab } from "../utils/tab";
import { uniqueBy } from "../utils/uniqueBy";
import { ReTest, clearChild, createDialog, getChildCollections, isDebug, memFixedColor, stopPropagation } from "../utils/zzlb";
import { createChooseTagsDiv, createSearchAnnContent, getAllAnnotations } from "./AnnotationsToNote";
import { copyAnnotations, mergePdfs, pasteAnnotations } from "./BackupAnnotation";
import { DDDTagClear, DDDTagRemove, DDDTagSet } from "./DDD";
import { getCiteItemHtml } from "./getCitationItem";
import { funcSplitTag, funcTranslateAnnotations } from "./menuTools";
import { MyButton } from "./MyButton";

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
    label: "笔记管理",
    icon: iconBaseUrl + "favicon.png",
    children: [
      {
        tag: "menu",
        label: "自定义命令",
        icon: iconBaseUrl + "favicon.png",
        children: [
          {
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
                  await pasteAnnotations(items);
                },
              },
              {
                //粘贴pdf注释
                tag: "menuitem",
                label: "还原pdf注释-用作者年份标题+文件大小匹配",
                icon: iconBaseUrl + "favicon.png",
                commandListener: async (ev: Event) => {
                  const items = await getSelectedItems(collectionOrItem);
                  await pasteAnnotations(items, false, true);
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
                label: "仅保留1个PDF，注释合并(条目下其它PDF删除)",
                icon: iconBaseUrl + "favicon.png",
                commandListener: async (ev: Event) => {
                  const items = await getSelectedItems(collectionOrItem);
                  await mergePdfs(items);
                },
              },
              {
                //相同PDF合并，注释合并
                tag: "menuitem",
                label: "仅保留1个PDF，注释合并(条目下与这个PDF大小一样的PDF删除)",
                icon: iconBaseUrl + "favicon.png",
                commandListener: async (ev: Event) => {
                  const items = await getSelectedItems(collectionOrItem);
                  await mergePdfs(items);
                },
              },
            ],
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

export function getColorTags(tags: string[]) {
  return tags.map(
    (t16) =>
      `<span style="background-color:${memFixedColor(t16, undefined)};box-shadow: ${memFixedColor(t16, undefined)} 0px 0px 5px 4px;">${t16}</span>`,
  );
}

export default { register, unregister };
