import { ProgressWindowHelper } from "zotero-plugin-toolkit/dist/helpers/progressWindow";
import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { config } from "../../package.json";
import {
  sortAsc,
  sortFixedTags10ValuesLength,
  sortKey,
  sortModified,
  sortTags10AscByKey,
  sortValuesLength,
} from "../utils/sort";
import { Tab } from "../utils/tab";
import {
  getChildCollections,
  groupBy,
  memFixedColor,
  memFixedColors,
  promiseAllWithProgress,
  setProperty,
  str2RegExp,
  toggleProperty,
  uniqueBy,
} from "../utils/zzlb";
import { listeners } from "process";
import { getPref } from "../utils/prefs";
let popupWin: ProgressWindowHelper | undefined = undefined;
let popupTime = -1;

const iconBaseUrl = `chrome://${config.addonRef}/content/icons/`;
function register() {
  // if (!getPref("exportenable")) return;
  //图标根目录 zotero-annotation-manage\addon\chrome\content\icons

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
            tag: "menuitem",
            label: "拆分#标签",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              const items = await getSelectedItemsEv(ev);
              const ans = getAllAnnotations(items);

              ztoolkit.log(
                `找到${items.length}条目${ans.length}笔记`,
                getParentAttr(ev.target as HTMLElement, "id"),
              );
              const p = new ztoolkit.ProgressWindow(
                `找到${items.length}条目${ans.length}笔记`,
                {
                  closeTime: -1,
                  closeOnClick: true,
                },
              ).show();
              p.createLine({ text: "处理中" });
              ans.forEach(async (ann, i) => {
                p.changeLine({
                  idx: 0,
                  progress: (i / ans.length) * 100,
                  text: "处理中",
                });
                const ts = ann.tags
                  .map((tag) => tag.tag.match(/#([^/]*)\/([^/]*)[/]?/))
                  .filter((f) => f != null && f.length >= 3)
                  .flatMap((a) => (a != null ? [a[1], a[2]] : []));
                const tas = uniqueBy(ts, (a) => a).filter((f) =>
                  ann.tags.every((e) => e.tag != f),
                );
                //ztoolkit.log(ann.tags,tas)
                if (tas.length > 0) {
                  const tas2 = tas.map(async (a) => ann.ann.addTag(a, 0));
                  ztoolkit.log(tas.length, "分割", tas);
                  await promiseAllWithProgress(tas2).then(() => {
                    ann.ann.saveTx();
                  });
                }
              });
              p.createLine({ text: "处理完成" });
              p.startCloseTimer(3000);
            },
          },
          {
            tag: "menuitem",
            label: "测试 tab",
            icon: iconBaseUrl + "favicon.png",
            commandListener: async (ev: Event) => {
              const items = await getSelectedItemsEv(ev);
              const tab = new Tab(
                `chrome://${config.addonRef}/content/tab.xhtml`,
                "一个新查询",
                (doc) => {
                  ztoolkit.log(
                    "可以这样读取doc",
                    doc.querySelector("#tab-page-body"),
                  );
                  doc.querySelector("#tab-page-body")!.innerHTML = "";
                  createChild(doc, items);
                },
              );
              ztoolkit.log(tab);
            },
          },
          {
            tag: "menuitem",
            label: "测试弹出",
            icon: iconBaseUrl + "favicon.png",
            commandListener: (ev: any) => {},
          },
        ],
      },

      {
        tag: "menuseparator",
      },
      {
        tag: "menuitem",
        label: "选择多个标签导出",
        icon: iconBaseUrl + "favicon.png",
        commandListener: (ev: Event) => {
          const target = ev.target as HTMLElement;
          const doc = target.ownerDocument;
          const id = getParentAttr(ev.target as HTMLElement, "id");
          const div = createChooseTagsDiv(doc, id?.includes("collection"));
          // ztoolkit.log("自选标签", div);
          // setTimeout(()=>d.remove(),10000)
        },
      },
      {
        tag: "menuitem",
        label: "搜索注释文字和标签导出",
        icon: iconBaseUrl + "favicon.png",
        commandListener: (ev: Event) => {
          const target = ev.target as HTMLElement;
          const doc = target.ownerDocument;
          const id = getParentAttr(ev.target as HTMLElement, "id");
          const div = createSearchAnnDiv(doc, id?.includes("collection"));
          // setTimeout(()=>d.remove(),10000)
        },
      },
      {
        tag: "menu",
        label: "按类型导出",
        icon: iconBaseUrl + "favicon.png",
        children: [
          {
            tag: "menuitem",
            label: "类型：图片",
            icon: iconBaseUrl + "favicon.png",
            commandListener: (ev: Event) => {
              const id = getParentAttr(ev.target as HTMLElement, "id");
              exportNoteByType("image", id?.includes("collection"));
            },
          },
          {
            tag: "menuitem",
            label: "类型：ink",
            icon: iconBaseUrl + "favicon.png",
            commandListener: (ev: Event) => {
              exportNoteByType(
                "ink",
                getParentAttr(ev.target as HTMLElement)?.includes(
                  "collection",
                ) || false,
              );
            },
          },
          {
            tag: "menuitem",
            label: "类型：纯笔记",
            icon: iconBaseUrl + "favicon.png",
            commandListener: (ev: Event) => {
              exportNoteByType(
                "note",
                getParentAttr(ev.target as HTMLElement)?.includes(
                  "collection",
                ) || false,
              );
            },
          },
          {
            tag: "menuitem",
            label: "类型：高亮",
            icon: iconBaseUrl + "favicon.png",
            commandListener: (ev: Event) => {
              exportNoteByType(
                "highlight",
                getParentAttr(ev.target as HTMLElement)?.includes(
                  "collection",
                ) || false,
              );
            },
          },
        ],
      },
      // {
      //   tag: "menu",
      //   label: "按tag导出",
      //   icon: iconBaseUrl + "favicon.png",
      //   popupId: `${config.addonRef}-create-note-tag-popup`,
      //   onpopupshowing: `Zotero.${config.addonInstance}.hooks.onMenuEvent("annotationToNoteTags", { window })`,
      // },
    ],
  };
  const itemMenu = Object.assign(
    { id: `${config.addonRef}-create-note` },
    menu,
  );
  itemMenu.children = [
    ...(itemMenu.children || []),
    {
      tag: "menu",
      label: "按tag导出",
      icon: iconBaseUrl + "favicon.png",
      popupId: `${config.addonRef}-create-note-tag-popup-item`,
      onpopupshowing: `Zotero.${config.addonInstance}.hooks.onMenuEvent("annotationToNoteTags", { window,type:"item" })`,
    },
  ];
  const collectionItem = Object.assign(
    { id: `${config.addonRef}-create-note-collection` },
    menu,
  );
  collectionItem.children = [
    ...(collectionItem.children || []),
    {
      tag: "menu",
      label: "按tag导出",
      icon: iconBaseUrl + "favicon.png",
      popupId: `${config.addonRef}-create-note-tag-popup-collection`,
      onpopupshowing: `Zotero.${config.addonInstance}.hooks.onMenuEvent("annotationToNoteTags", { window,type:"collection" })`,
    },
  ];
  // 应该用 getVisibility 来控制菜单的隐藏和显示

  //组合到一起的菜单能节省空间，因此使用children
  if (!getPref("hide-in-item-menu")) ztoolkit.Menu.register("item", itemMenu);
  if (!getPref("hide-in-collection-menu"))
    ztoolkit.Menu.register("collection", collectionItem);
}

function unregister() {
  ztoolkit.Menu.unregister(`${config.addonRef}-create-note`);
  ztoolkit.Menu.unregister(`${config.addonRef}-create-note-collection`);
}

export async function createPopMenu(
  win: Window,
  type: "collection" | "item" = "collection",
) {
  const doc = win.document;
  const popup = doc.querySelector(
    `#${config.addonRef}-create-note-tag-popup-${type}`,
  ) as XUL.MenuPopup;
  // Remove all children in popup
  while (popup?.firstChild) {
    popup.removeChild(popup.firstChild);
  }
  const id = getParentAttr(popup, "id");
  const isc = id?.includes("collection");
  ztoolkit.log("id", id);

  const ans = getAllAnnotations(await getSelectedItems(isc)).flatMap((a) =>
    a.tags.map((t) => Object.assign({}, a, { tag: t })),
  );
  const tags = groupBy(ans, (an) => an.tag.tag)
    .sort(sortFixedTags10ValuesLength)
    .slice(0, 20);
  const maxLen = Math.max(...tags.map((a) => a.values.length));

  ztoolkit.log(win, "创建菜单", isc, popup);
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
        const pre = (
          100 -
          (Math.log(tag.values.length) / Math.log(maxLen)) * 100
        ).toFixed();
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
                exportSingleNote(tag.key, isc);
              },
            },
          ],
        };
      }),
    };
  }
  ztoolkit.UI.appendElement(elemProp, popup);
}

const ID = {
  root: `${config.addonRef}-ann2note-ChooseTags-root`,
  action: `${config.addonRef}-ann2note-ChooseTags-root-action`,
  input: `${config.addonRef}-ann2note-ChooseTags-root-input`,
  result: `${config.addonRef}-ann2note-ChooseTags-root-result`,
};
function getParentAttr(ele: Element | null, name = "id") {
  if (!ele) return "";
  const value = ele.getAttribute(name);
  if (value) {
    return value;
  }
  if (ele.parentElement) {
    return getParentAttr(ele.parentElement, name);
  }
  return "";
}

async function createSearchAnnDiv(doc: Document, isCollection: boolean) {
  let text = "";
  let tag = "";
  let showN = 10;
  const items = await getSelectedItems(isCollection);
  const annotations = getAllAnnotations(items);
  let ans: AnnotationRes[] = annotations;
  const div = createTopDiv(doc);
  if (div) {
    const inputTag: TagElementProps = {
      tag: "div",
      styles: { display: "flex", flexDirection: "row" },
      children: [
        { tag: "div", properties: { textContent: "" } },
        {
          tag: "div",
          properties: { textContent: "注释、笔记" },
          children: [
            {
              tag: "input",
              namespace: "html",
              properties: { placeholder: "请输入注释、笔记筛选条件" },
              styles: { width: "200px" },
              listeners: [
                {
                  type: "keyup",
                  listener: (ev: any) => {
                    text = (ev.target as HTMLInputElement).value;
                    createResultDiv();
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
              properties: { placeholder: "请输入tag筛选条件" },
              styles: { width: "200px" },
              listeners: [
                {
                  type: "keyup",
                  listener: (ev: Event) => {
                    tag = (ev.target as HTMLInputElement).value.trim();
                    createResultDiv();
                  },
                },
              ],
            },
          ],
        },
        {
          tag: "div",
          properties: { textContent: "显示前N条" },
          children: [
            {
              tag: "input",
              namespace: "html",
              properties: {
                placeholder: "输入数字",
                value: showN,
                type: "number",
              },
              styles: { width: "50px" },
              listeners: [
                {
                  type: "change",
                  listener: (ev: Event) => {
                    showN =
                      parseInt((ev.target as HTMLInputElement).value.trim()) ||
                      10;
                    createResultDiv();
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    const actionTag = createActionTag(div, () => {
      exportNote({ filter: () => ans, toText: toText1 });
      div?.remove();
    });
    for (const action of actionTag) {
      ztoolkit.UI.appendElement(action, div.querySelector(".action")!);
    }
    ztoolkit.UI.appendElement(inputTag!, div.querySelector(".query")!);
  }
  createResultDiv();
  function createResultDiv() {
    const txtReg = str2RegExp(text);
    const tagReg = str2RegExp(tag);
    ans = annotations
      .filter(
        (f) =>
          (txtReg.length == 0 ||
            txtReg.some((a) => a.test(f.comment) || a.test(f.text))) &&
          (tagReg.length == 0 || tagReg.some((a) => a.test(f.annotationTags))),
      )
      .sort(sortModified);

    if (div) {
      clearChild(div.querySelector(".content"));
      ztoolkit.UI.appendElement(
        {
          tag: "div",
          namespace: "html",
          properties: {
            textContent: `总${annotations.length}条笔记，筛选出了${ans.length}条。预览前${showN}条。`,
          },
          children: (showN > 0 ? ans.slice(0, showN) : ans).map((a) => ({
            tag: "div",
            namespace: "html",
            properties: {
              textContent:
                (a.annotationTags || "") +
                " " +
                (a.text || "") +
                " " +
                (a.comment || "") +
                " ",
            },
            styles: {
              border: "1px solid black",
              margin: "2px",
              background: getOneFixedColor(),
            },
            listeners: [
              {
                type: "click",
                listener(ev: any) {
                  // ztoolkit.log("点击",ev)
                  Zotero.OpenPDF.openToPage(a.pdf, a.page, a.ann.key);
                },
              },
            ],
          })),
        },
        div.querySelector(".content")!,
      );
    }
  }
}
function createChild(doc: Document, items: Zotero.Item[]) {
  const annotations = getAllAnnotations(items).flatMap((f) =>
    f.tags.map((t) => Object.assign(f, { tag: t })),
  );
  const tags = groupBy(annotations, (a) => a.tag.tag);
  tags.sort(sortFixedTags10ValuesLength);
  ztoolkit.UI.appendElement(
    {
      tag: "div",
      children: tags.map((t) => ({
        tag: "span",
        properties: { textContent: t.key + "[" + t.values.length + "]" },
      })),
    },
    doc.querySelector("body")!,
  );
  ztoolkit.UI.appendElement(
    {
      tag: "div",
      children: annotations
        .slice(0, 300)
        .map((t) => ({ tag: "div", properties: { textContent: t.text } })),
    },
    doc.querySelector("body")!,
  );
}

async function createChooseTagsDiv(doc: Document, isCollection: boolean) {
  const selectedTags: string[] = [];
  const idTags = ID.result;
  const items = await getSelectedItems(isCollection);
  const annotations = getAllAnnotations(items).flatMap((f) =>
    f.tags.map((t) => Object.assign(f, { tag: t })),
  );
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
  const div = createTopDiv(doc);
  if (div) {
    const actionTag = createActionTag(
      div,
      () => {
        if (selectedTags.length > 0) {
          exportTagsNote(selectedTags, items);
          div?.remove();
        }
      },
      [
        {
          tag: "button",
          namespace: "html",
          properties: { textContent: "-点击隐藏可选标签" },
          styles: { background: "#fff", padding: "6px" },
          listeners: [
            {
              type: "click",
              listener: (ev: Event) => {
                const t = toggleProperty(
                  document.getElementById(idTags)?.style,
                  "display",
                  ["none", "flex"],
                );
                setProperty(
                  ev.target as HTMLButtonElement,
                  "textContent",
                  t == "none" ? "+点击展开可选标签" : "-点击隐藏可选标签",
                );
              },
            },
          ],
        },
      ],
    );
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
                const value = (ev.target as HTMLInputElement).value;
                createTags(value.trim());
              },
            },
          ],
        },
      ],
    };

    for (const action of actionTag)
      ztoolkit.UI.appendElement(action, div!.querySelector(".action")!);
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
          .map((t) => ({
            tag: "div",
            properties: { textContent: `[${t.values.length}]${t.key}` },
            styles: {
              padding: "6px",
              background: "#099",
              margin: "1px",
            },
            listeners: [
              {
                type: "click",
                listener: (ev: Event) => {
                  const target = ev.target as HTMLDivElement;
                  const index = selectedTags.findIndex((f) => f == t.key);
                  if (index == -1) {
                    selectedTags.push(t.key);
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
function getOneFixedColor() {
  return memFixedColors()
    .slice(0, 999)
    .sort(() => Math.random() - 0.5)[0];
}
function createActionTag(
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
      // styles: {
      //   padding: "6px",
      //   background: "#f99",
      //   margin: "1px",
      // },
      listeners: [
        {
          type: "click",
          listener: (ev: any) => {
            div.remove();
          },
        },
      ],
    },
    {
      tag: "button",
      namespace: "html",
      properties: { textContent: "切换颜色" },
      // styles: {
      //   padding: "6px",
      //   background: "#f99",
      //   margin: "1px",
      // },
      listeners: [
        {
          type: "click",
          listener(ev: any) {
            ztoolkit.log(div, div.style.background);
            if (!div) return;
            div.style.background = div.style.background
              ? ""
              : getOneFixedColor();
          },
        },
      ],
    },
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
                action();
              },
            },
          ],
        }
      : { tag: "span" },
    ...others,
  ];
}
function createTopDiv(doc?: Document) {
  if (!doc) return;
  doc.getElementById(ID.root + "TopDiv")?.remove();

  const children: TagElementProps[] = [
    {
      tag: "div",
      properties: { textContent: "" },
      classList: ["action"],
      styles: { display: "flex" },
    },
    {
      tag: "div",
      properties: { textContent: "" },
      classList: ["status"],
      styles: { display: "flex" },
    },
    {
      tag: "div",
      properties: { textContent: "" },
      classList: ["query"],
      styles: { display: "flex" },
    },
    {
      tag: "div",
      properties: { textContent: "" },
      classList: ["content"],
      styles: { display: "flex" },
    },
  ];
  const d = ztoolkit.UI.appendElement(
    {
      tag: "div",
      id: ID.root + "TopDiv",
      styles: {
        padding: "10px",
        position: "fixed",
        left: "150px",
        top: "100px",
        zIndex: "9999",
        maxWidth: "calc(100% - 300px)",
        maxHeight: "600px",
        overflowY: "scroll",
        display: "flex",
        background: getOneFixedColor(),
        // flexWrap: "wrap",
        flexDirection: "column",
      },
      children: children,
      listeners: [
        {
          type: "mousedown",
          listener(e: any) {
            const x = e.clientX - d.offsetLeft;
            const y = e.clientY - d.offsetTop;
            doc.onmousemove = (e) => {
              d.style.left = e.clientX - x + "px";
              d.style.top = e.clientY - y + "px";
            };
            doc.onmouseup = (e) => {
              doc.onmousemove = doc.onmouseup = null;
            };
          },
        },
      ],
    },
    doc.querySelector("body,div")!,
  ) as HTMLDivElement;
  return d;
}

async function saveNote(targetNoteItem: Zotero.Item, txt: string) {
  await Zotero.BetterNotes.api.note.insert(targetNoteItem, txt, -1);
  // const editor= await Zotero.BetterNotes.api.editor.getEditorInstance(targetNoteItem.id)
  // await Zotero.BetterNotes.api.editor.replace(editor,0,1e3,txt)
  await targetNoteItem.saveTx();
  ztoolkit.log("笔记更新完成", new Date().toLocaleTimeString());
  popupWin
    ?.createLine({
      text: `笔记更新完成`,
      type: "default",
    })
    .startCloseTimer(5e3);
  popupWin = undefined;
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
  popupWin?.createLine({
    text: "创建新笔记 ",
    type: "default",
  });
  return targetNoteItem;
}
interface AnnotationRes {
  item: Zotero.Item;
  pdf: Zotero.Item;
  ann: Zotero.Item;
  author: string;
  year: string;
  title: string;
  pdfTitle: string;
  text: string;
  color: string;
  type: _ZoteroTypes.Annotations.AnnotationType;
  comment: string;
  itemTags: string;
  annotationTags: string;
  page: string;
  dateModified: string;
  tags: { tag: string; type: number }[];
  tag: { tag: string; type: number }; //flatMap(a=>Object.(a))
  html: string; //convertHtml
}
function getAllAnnotations(items: Zotero.Item[]) {
  const items1 = items.map((a) =>
    a.isAttachment() && a.isPDFAttachment() && a.parentItem ? a.parentItem : a,
  );
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
            const text = ann.annotationText;
            const comment = ann.annotationComment;
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
async function convertHtml(arr: AnnotationRes[], targetNoteItem: Zotero.Item) {
  try {
    // const annotations = arr.map((a) => a.ann);
    for (const a of arr) {
      const annotation = a.ann;
      if (
        annotation.annotationType === "image" &&
        !(await Zotero.Annotations.hasCacheImage(annotation))
      ) {
        try {
          //呈现缓存图片
          // await Zotero.PDFRenderer.renderAttachmentAnnotations(
          //   annotation.parentID,
          // );
        } catch (e) {
          Zotero.debug(e);
          throw e;
        }
        break;
      }
    }
  } catch (error) {
    ztoolkit.log("发生错误", error);
  }

  const data = arr.map(async (ann) => {
    //TODO 感觉这个方法读取图片是从缓存里面读取的，有些图片没有加载成功
    const html = (await Zotero.BetterNotes.api.convert.annotations2html(
      [ann.ann],
      {
        noteItem: targetNoteItem,
      },
    )) as string;
    if (html)
      ann.html = html
        .replace(/<\/p>$/, getColorTags(ann.tags.map((c) => c.tag)) + "</p>")
        .replace(/<p>[\s\r\n]*<\/p>/g, "");
    else {
      ann.html = getCiteAnnotationHtml(ann.ann, "点击此处，选择“在页面显示”");
    }
    return ann;
  });
  //使用Promise.all能并行计算？感觉比for快很多
  const list = await promiseAllWithProgress(data, (progress, index) => {
    createPopupWin({ lines: [""] });
    popupWin?.changeLine({
      progress,
      text: `[${progress.toFixed()}%] ${index}/${arr.length}`,
    });
  });
  ztoolkit.log(list);
  return list;
}
function createPopupWin({
  closeTime = 5000,
  header = "整理笔记",
  lines: defaultLines = [],
}: { closeTime?: number; header?: string; lines?: string[] } = {}) {
  if (!popupWin || Date.now() - popupTime > closeTime) {
    popupTime = Date.now();
    popupWin = new ztoolkit.ProgressWindow(header, {
      closeTime: closeTime,
    }).show();
    for (const line of defaultLines) popupWin.createLine({ text: line });
    popupWin.startCloseTimer(closeTime);
  }
}

function getTitleFromAnnotations(annotations: AnnotationRes[]) {
  const itemsLength = uniqueBy(annotations, (a) => a.item.key).length;
  // const pdfLength = uniqueBy(annotations, (a) => a.pdf.key).length;
  const annotationLength = uniqueBy(annotations, (a) => a.ann.key).length;
  // const tagLength = uniqueBy(annotations, (a) => a.tag.tag).length;
  // ${itemsLength}-${annotationLength}
  const title = `注释 (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}) ${annotationLength}`;
  return title;
}

// function h1(txt: string, tag = "h1", attrs = "") {
//   return `<${tag} ${attrs}>${txt}</${tag}>`;
// }
async function exportNote({
  toText,
  filter = undefined,
  items = undefined,
  tags = undefined,
}: {
  toText:
    | ((arg0: AnnotationRes[]) => string)
    | ((arg0: AnnotationRes[]) => Promise<string>);

  filter?:
    | ((arg0: AnnotationRes[]) => AnnotationRes[])
    | ((arg0: AnnotationRes[]) => Promise<AnnotationRes[]>);
  items?: Zotero.Item[];
  tags?: string[];
}) {
  createPopupWin();
  let annotations = items ? getAllAnnotations(items) : [];
  if (filter) {
    annotations = await filter(annotations);
  }
  if (annotations.length == 0) {
    popupWin
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
      .map((t) => `${t.key}(${t.values.length})`)
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

  await saveNote(note, `${txt}`);
}

async function getSelectedItems(isCollection: boolean) {
  let items: Zotero.Item[] = [];
  if (isCollection) {
    const selected = ZoteroPane.getSelectedCollection();
    ztoolkit.log(isCollection, selected);
    if (selected) {
      const cs = uniqueBy(
        [selected, ...getChildCollections([selected])],
        (u) => u.key,
      );
      items = cs.flatMap((f) => f.getChildItems(false, false));
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
async function getSelectedItemsEv(ev: Event) {
  const isCollection =
    getParentAttr(ev.target as HTMLElement)?.includes("collection") || false;

  let items: Zotero.Item[] = [];
  if (isCollection) {
    const selected = ZoteroPane.getSelectedCollection();
    ztoolkit.log(isCollection, selected);
    if (selected) {
      const cs = uniqueBy(
        [selected, ...getChildCollections([selected])],
        (u) => u.key,
      );
      items = cs.flatMap((f) => f.getChildItems(false, false));
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

async function exportNoteByTag(isCollection: boolean = false) {
  exportNote({
    filter: (ans) =>
      ans.flatMap((an) => an.tags.map((tag) => Object.assign({}, an, { tag }))),
    toText: (annotations) =>
      groupBy(annotations, (a) => a.tag.tag)
        .sort(sortTags10AscByKey)
        .flatMap((tag, index) => {
          return [
            `<h1>(${index + 1}) ${tag.key} (${tag.values.length})</h1>`,
            ...tag.values.map((b) => `${b.html}`),
          ];
        })
        .join("\n"),
    items: await getSelectedItems(isCollection),
  });
}
async function exportNoteByTagPdf(isCollection: boolean = false) {
  exportNote({
    filter: (ans) =>
      ans.flatMap((an) => an.tags.map((tag) => Object.assign({}, an, { tag }))),
    toText: (annotations) =>
      groupBy(annotations, (a) => a.tag.tag)
        .sort(sortFixedTags10ValuesLength)
        .flatMap((tag, index) => {
          return [
            `<h1> (${index + 1}) 标签：${tag.key}  (${tag.values.length})</h1>`,
            ...groupBy(tag.values, (a) => a.pdfTitle).flatMap(
              (pdfTitle, index2) => [
                `<h2> (${index + 1}.${index2 + 1}) ${tag.key} ${pdfTitle.key} (${pdfTitle.values.length})</h2>`,
                ...pdfTitle.values.map((b) => `${b.html}`),
              ],
            ),
          ];
        })
        .join("\n"),
    items: await getSelectedItems(isCollection),
  });
}

async function exportNoteByType(
  type: _ZoteroTypes.Annotations.AnnotationType,
  isCollection: boolean = false,
) {
  exportNote({
    toText: (annotations) =>
      groupBy(annotations, (a) => a.pdfTitle)
        .flatMap((pdfTitle, index, aa) => [
          `<h1> (${index + 1}/${aa.length}) ${pdfTitle.key} ${getCiteItemHtml(pdfTitle.values[0]?.item)}  (${pdfTitle.values.length})</h1>`,
          ...pdfTitle.values.flatMap((b) => [
            b.html ? b.html : getCiteAnnotationHtml(b.ann),
          ]),
        ])
        .join("\n"),
    items: await getSelectedItems(isCollection),
    filter: (annotations) => {
      annotations = annotations.filter((f) => f.type == type);
      return uniqueBy(annotations, (a) => a.ann.key);
    },
  });
}

async function exportSingleNote(tag: string, isCollection: boolean = false) {
  if (tag)
    exportNote({
      filter: async (ans) =>
        ans.filter((f) => f.tags.some((a) => tag == a.tag)),
      items: await getSelectedItems(isCollection),
      toText: (ans) =>
        groupBy(ans, (a) => a.pdfTitle)
          .sort(sortKey)
          .flatMap((a, index, aa) => [
            `<h1>(${index + 1}/${aa.length}) ${a.key} ${getCiteItemHtmlWithPage(a.values[0].ann)}</h1>`,
            a.values
              .map(
                (b) =>
                  b.html ??
                  `<h2>${getCiteAnnotationHtml(b.ann, b.ann.annotationText + b.ann.annotationComment)}</h2>`,
              )
              .join(" "),
          ])
          .join(""),
    });
}
function exportTagsNote(tags: string[], items: Zotero.Item[]) {
  if (tags.length > 0) {
    exportNote({
      filter: async (ans) =>
        ans
          .filter((f) => f.tags.some((a) => tags.includes(a.tag)))
          .map((a) => Object.assign(a, { tag: a.tag })),
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
        `<h1>(${index + 1}/${aa.length}) ${a.key} ${getCiteItemHtmlWithPage(a.values[0].ann)}</h1>`,
        a.values.map((b) => b.html).join("\n"),
      ])
      .join("")
  );
}

function getColorTags(tags: string[]) {
  return tags.map(
    (t) =>
      `<span style="background-color:${memFixedColor(t, undefined)};box-shadow: ${memFixedColor(t, undefined)} 0px 0px 5px 4px;">${t}</span>`,
  );
}
function getCiteAnnotationHtml(annotation: Zotero.Item, text = "") {
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
  const formatted =
    text ||
    annotation.annotationComment ||
    annotation.annotationText ||
    "没有文本，没有内容。。。";
  //class="highlight" 对应的内容必须有双引号 估计是Zotero.EditorInstanceUtilities._transformTextToHTML方法处理了这个
  return `<span class="highlight" data-annotation="${encodeURIComponent(
    JSON.stringify(storedAnnotation),
  )}">"${formatted}"</span>
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
  return getCiteItemHtml(
    annotation.parentItem?.parentItem,
    annotation.annotationPageLabel,
    text,
  );
}
function getCiteItemHtml(
  parentItem?: Zotero.Item,
  locator: string = "",
  text: string = "",
) {
  if (!parentItem) return "";
  const citationData = {
    citationItems: [getCitationItem(parentItem, locator)],
    properties: {},
  };
  const formatted = text
    ? text
    : Zotero.EditorInstanceUtilities.formatCitation(citationData);
  return `<span class="citation" data-citation="${encodeURIComponent(
    JSON.stringify(citationData),
  )}">${formatted}</span>`;
}

export default { register, unregister };
