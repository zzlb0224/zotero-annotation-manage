import { ProgressWindowHelper } from "zotero-plugin-toolkit/dist/helpers/progressWindow";
import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { config } from "../../package.json";
import {
  sortAsc,
  sortKey,
  sortTags10AscByKey,
  sortTags10ValuesLength,
  sortValuesLength,
} from "../utils/sort";
import { Tab } from "../utils/tab";
import {
  getChildCollections,
  groupBy,
  memFixedColor,
  promiseAllWithProgress,
  setProperty,
  str2RegExp,
  toggleProperty,
  uniqueBy,
} from "../utils/zzlb";
let popupWin: ProgressWindowHelper | undefined = undefined;
let popupTime = -1;

function register() {
  // if (!getPref("exportenable")) return;
  //图标根目录 zotero-annotation-manage\addon\chrome\content\icons
  const iconBaseUrl = `chrome://${config.addonRef}/content/icons/`;

  const menu: MenuitemOptions = {
    tag: "menu",
    label: "笔记管理",
    icon: iconBaseUrl + "favicon.png",
    children: [
      {
        tag: "menuitem",
        label: "test tab",
        icon: iconBaseUrl + "favicon.png",
        commandListener: (ev) => {
          const tab = new Tab(
            `chrome://${config.addonRef}/content/tab.xhtml`,
            "new tab",
          );
        },
      },
      {
        tag: "menuitem",
        label: "分割标签（未完成）",
        icon: iconBaseUrl + "favicon.png",
        commandListener: (ev) => {},
      },
      {
        tag: "menuitem",
        label: "替换标签（未完成）",
        icon: iconBaseUrl + "favicon.png",
        commandListener: (ev) => {},
      },
      {
        tag: "menuseparator",
      },
      {
        tag: "menuitem",
        label: "自选标签",
        icon: iconBaseUrl + "favicon.png",
        commandListener: (ev) => {
          const target = ev.target as HTMLElement;
          const doc = target.ownerDocument;
          const div = createChooseTagsDiv(doc, isCollection(ev));
          ztoolkit.log("自选标签", div);
          // setTimeout(()=>d.remove(),10000)
        },
      },
      {
        tag: "menuitem",
        label: "查找注释文字和标签进行导出（未完成）",
        icon: iconBaseUrl + "favicon.png",
        commandListener: (ev) => {
          const target = ev.target as HTMLElement;
          const doc = target.ownerDocument;
          const div = createChooseAnnDiv(doc, isCollection(ev));
          // ztoolkit.log("自选标签", div);
          // setTimeout(()=>d.remove(),10000)
        },
      },
      {
        tag: "menuitem",
        label: "按标签顺序",
        icon: iconBaseUrl + "favicon.png",
        commandListener: (ev) => {
          exportNoteByTag(isCollection(ev));
        },
      },
      {
        tag: "menuitem",
        label: "按标签-pdf顺序",
        icon: iconBaseUrl + "favicon.png",
        commandListener: (ev) => {
          exportNoteByTagPdf(isCollection(ev));
        },
      },
      {
        tag: "menuitem",
        label: "图片笔记",
        icon: iconBaseUrl + "favicon.png",
        commandListener: (ev) => {
          exportNoteOnlyImage(isCollection(ev));
        },
      },
      {
        tag: "menuitem",
        label: "tag:量表",
        icon: iconBaseUrl + "favicon.png",
        commandListener: (ev) => {
          exportSingleNote("量表", isCollection(ev));
        },
      },
    ],
  };
  //组合到一起的菜单能节省空间，因此使用children
  ztoolkit.Menu.register(
    "item",
    Object.assign({ id: `${config.addonRef}-create-note` }, menu),
  );
  ztoolkit.Menu.register(
    "collection",
    Object.assign({ id: `${config.addonRef}-create-note-collection` }, menu),
  );
}
function unregister() {
  ztoolkit.Menu.unregister(`${config.addonRef}-create-note`);
  ztoolkit.Menu.unregister(`${config.addonRef}-create-note-collection`);
}

function isCollection(ev: Event) {
  const pid = (ev.target as HTMLElement)?.parentElement?.parentElement?.id;
  const isCollection = pid?.includes("collection") || false;
  return isCollection;
}
const ID = {
  root: `${config.addonRef}-ann2note-ChooseTags-root`,
  action: `${config.addonRef}-ann2note-ChooseTags-root-action`,
  input: `${config.addonRef}-ann2note-ChooseTags-root-input`,
  result: `${config.addonRef}-ann2note-ChooseTags-root-result`,
};
async function createChooseAnnDiv(doc: Document, isCollection: boolean) {
  let text = "";
  let tag = "";
  const items = await getSelectedItems(isCollection);
  const annotations = getAllAnnotations(items);
  let ans: AnnotationRes[] = annotations;
  const resultId = ID.result;

  const inputTag: TagElementProps = {
    tag: "div",
    styles: { display: "flex", flexDirection: "column" },
    children: [
      {
        tag: "div",
        children: [
          { tag: "span", properties: { textContent: "注释、笔记搜索" } },
          {
            tag: "input",
            namespace: "html",
            listeners: [
              {
                type: "keyup",
                listener: (ev) => {
                  text = (ev.target as HTMLInputElement).value;

                  createResultDiv();
                },
              },
            ],
          },
          { tag: "span", properties: { textContent: "标签" } },
          {
            tag: "input",
            namespace: "html",
            listeners: [
              {
                type: "keyup",
                listener: (ev) => {
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
        id: resultId,
      },
    ],
  };
  const actionTag = createActionTag(
    () => {
      exportNote({ filter: () => ans, toText: toText1 });
      div?.remove();
    },
    () => div?.remove(),
  );

  const div = createTopDiv(doc, [inputTag, actionTag]);
  createResultDiv();

  function createResultDiv() {
    const txtReg = str2RegExp(text);
    const tagReg = str2RegExp(tag);
    ans = annotations.filter(
      (f) =>
        (txtReg.length > 0 ||
          txtReg.some((a) => a.test(f.comment) || a.test(f.text))) &&
        (tagReg.length > 0 || tagReg.some((a) => a.test(f.annotationTags))),
    );
    if (doc.getElementById(resultId))
      ztoolkit.UI.replaceElement(
        {
          tag: "div",
          namespace: "html",
          id: resultId,
          properties: {
            textContent: `总${annotations.length}条笔记，筛选出了${ans.length}条。预览前10条。`,
          },
          children: ans.slice(0, 10).map((a) => ({
            tag: "span",
            namespace: "html",
            properties: {
              textContent: a.text + a.comment + a.annotationTags,
            },
          })),
        },
        doc.getElementById(resultId)!,
      );
  }
}
async function createChooseTagsDiv(doc: Document, isCollection: boolean) {
  const selectedTags: string[] = [];
  const idTags = ID.result;
  const items = await getSelectedItems(isCollection);
  const annotations = getAllAnnotations(items).flatMap((f) =>
    f.tags.map((t) => Object.assign(f, { tag: t })),
  );
  const tags = groupBy(annotations, (a) => a.tag.tag);
  tags.sort(sortTags10ValuesLength);

  const tagsTag: TagElementProps = {
    tag: "div",
    styles: { display: "flex", flexDirection: "column" },
    children: [
      {
        tag: "div",
        children: [
          {
            tag: "button",
            namespace: "html",
            properties: { textContent: "+点击展开可选标签" },
            styles: { background: "#fff", padding: "6px" },
            listeners: [
              {
                type: "click",
                listener: (ev) => {
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
          {
            tag: "input",
            namespace: "html",
            listeners: [
              {
                type: "keyup",
                listener: (ev) => {
                  const value = (ev.target as HTMLInputElement).value;
                  createTags(value.trim());
                },
              },
            ],
          },
        ],
      },
      {
        tag: "div",
        id: idTags,
      },
    ],
  };
  const actionTag = createActionTag(
    () => {
      if (selectedTags.length > 0) {
        exportTagsNote(selectedTags, items);
        div?.remove();
      }
    },
    () => div?.remove(),
  );
  const children = [tagsTag, actionTag];

  const div = createTopDiv(doc, children);
  createTags();
  return div;

  function createTags(searchTag: string = "") {
    ztoolkit.UI.replaceElement(
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
                listener: (ev) => {
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
      doc.getElementById(idTags)!,
    );
  }
}

function createActionTag(action: () => void, cancel?: () => void) {
  const actionDiv: TagElementProps = {
    tag: "div",
    styles: { display: "flex" },
    children: [
      {
        tag: "div",
        properties: { textContent: "确定生成" },
        styles: {
          padding: "6px",
          background: "#f99",
          margin: "1px",
        },
        listeners: [
          {
            type: "click",
            listener: (ev) => {
              action();
            },
          },
        ],
      },
      cancel
        ? {
            tag: "div",
            properties: { textContent: "取消" },
            styles: {
              padding: "6px",
              background: "#f99",
              margin: "1px",
            },
            listeners: [
              {
                type: "click",
                listener: (ev) => {
                  cancel();
                },
              },
            ],
          }
        : { tag: "span" },
    ],
  };
  return actionDiv;
}
function createTopDiv(doc?: Document, children?: TagElementProps[]) {
  if (!doc) return;
  return ztoolkit.UI.appendElement(
    {
      tag: "div",
      styles: {
        padding: "10px",
        position: "fixed",
        left: "250px",
        top: "100px",
        zIndex: "9999",
        maxWidth: "calc(100% - 300px)",
        maxHeight: "600px",
        overflowY: "scroll",
        display: "flex",
        background: "#fff",
        flexWrap: "wrap",
        flexDirection: "column",
      },
      children: children,
    },
    doc.querySelector("body,div")!,
  );
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
  tag: { tag: string; type: number }; //flatMap
  tags: { tag: string; type: number }[];
  html: string;
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
  const data = arr.map(async (ann) => {
    //TODO 感觉这个方法读取图片是从缓存里面读取的，有些图片没有加载成功
    ann.html = await Zotero.BetterNotes.api.convert.annotations2html(
      [ann.ann],
      {
        noteItem: targetNoteItem,
      },
    );
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
  closeTime = 3000,
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
  const title = `注释 (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}) `;
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
  const note = await createNote();
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
  if (usedItems.length <= 10)
    for (const item of usedItems) {
      note.addRelatedItem(item);
    }
  note.addTag(`${config.addonRef}:引用Item${usedItems.length}个`);

  await saveNote(note, `${title}${txt}`);
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
        .sort(sortTags10ValuesLength)
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

async function exportNoteOnlyImage(isCollection: boolean = false) {
  exportNote({
    toText: (annotations) =>
      groupBy(annotations, (a) => a.pdfTitle)
        .flatMap((pdfTitle, index, aa) => [
          `<h1> (${index + 1}/${aa.length}) ${pdfTitle.key} ${getCiteItemHtml(pdfTitle.values[0]?.item)}  (${pdfTitle.values.length})</h1>`,
          ...pdfTitle.values.flatMap((b) => [
            b.html
              ? b.html
              : `<span style="color:#ff6666">未能加载：${b.ann.key}</span>`,
          ]),
        ])
        .join("\n"),
    items: await getSelectedItems(isCollection),
    filter: (annotations) => {
      annotations = annotations.filter((f) => f.type == "image");
      return uniqueBy(annotations, (a) => a.ann.key);
    },
  });
}
async function exportSingleNote(tag: string, isCollection: boolean = false) {
  if (tag)
    exportNote({
      filter: async (ans) =>
        ans.filter((f) => f.tags.some((a) => (tag = a.tag))),
      items: await getSelectedItems(isCollection),
      toText: (ans) =>
        groupBy(ans, (a) => a.pdfTitle)
          .sort(sortKey)
          .flatMap((a, index, aa) => [
            `<h1>(${index + 1}/${aa.length}) ${a.key} ${getCiteItemHtmlWithPage(a.values[0].ann)}</h1>`,
            a.values
              .map((b) => `<h2>${getCiteAnnotationHtml(b.ann)}</h2>`)
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
        a.values
          .map((b) =>
            b.html.replace(
              /<\/p>$/,
              getColorTags(b.tags.map((c) => c.tag)) + "</p>",
            ),
          )
          .map((b) => b.replace(/<p>[\r\n]*<\/p>/g, ""))
          .join(" "),
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
