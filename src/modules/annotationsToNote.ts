import { config } from "../../package.json";
import { ProgressWindowHelper } from "zotero-plugin-toolkit/dist/helpers/progressWindow";
import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
import {
  groupBy,
  uniqueBy,
  getCollections,
  promiseAllWithProgress,
  sortByTAGs,
} from "../utils/zzlb";
let popupWin: ProgressWindowHelper | undefined = undefined;
let popupTime = -1;

function register() {
  //图标根目录 zotero-annotation-manage\addon\chrome\content\icons
  const iconBaseUrl = `chrome://${config.addonRef}/content/icons/`;
  function isCollection(ev: Event) {
    const pid = (ev.target as HTMLElement)?.parentElement?.parentElement?.id;
    const isCollection = pid?.includes("collection") || false;
    return isCollection;
  }
  const menu: MenuitemOptions = {
    tag: "menu",
    label: "导出笔记z",
    icon: iconBaseUrl + "favicon.png",
    children: [
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
          exportNoteScale(isCollection(ev));
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

async function saveNote(targetNoteItem: Zotero.Item, txt: string) {
  await Zotero.BetterNotes.api.note.insert(targetNoteItem, txt, -1);
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
  targetNoteItem.setCollections([ZoteroPane.getSelectedCollection(true) || 0]);
  if (txt) await Zotero.BetterNotes.api.note.insert(targetNoteItem, txt, -1);
  targetNoteItem.addTag("生成的笔记", 0);
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
        .sort()
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
  //使用Promise.all能并行计算？感觉比for快
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

  const title = `注释 (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}) ${itemsLength}-${annotationLength}`;
  return title;
}
function h1(txt: string, tag = "h1", attrs = "") {
  return `<${tag} ${attrs}>${txt}</${tag}>`;
}
async function exportNote({
  toText,
  isCollection = false,
  filter = undefined,
}: {
  toText:
    | ((arg0: AnnotationRes[]) => string)
    | ((arg0: AnnotationRes[]) => Promise<string>);
  isCollection?: boolean;
  filter?:
    | ((arg0: AnnotationRes[]) => AnnotationRes[])
    | ((arg0: AnnotationRes[]) => Promise<AnnotationRes[]>);
}) {
  createPopupWin();

  let items = ZoteroPane.getSelectedItems();
  if (isCollection) {
    const sc = ZoteroPane.getSelectedCollection();
    if (sc) {
      const scs = getCollections([sc]);
      items = scs.flatMap((f) => f.getChildItems(false, false));
    }
  }
  let annotations = getAllAnnotations(items);
  if (filter) {
    annotations = await filter(annotations);
  }
  if (annotations.length == 0) {
    popupWin
      ?.createLine({ text: "没有找到标记，不创建笔记" })
      .startCloseTimer(5e3);
    return;
  }
  const title = getTitleFromAnnotations(annotations);
  //createNote 一定要在 getSelectedItems 之后，不然获取不到选择的条目
  const note = await createNote(title);
  //createNote 会创建顶层条目触发另一个插件的 closeOtherProgressWindows

  annotations = await convertHtml(annotations, note);
  const getKeyGroup = (fn: (item: AnnotationRes) => string | number | symbol) =>
    groupBy(annotations, fn)
      .sort((a, b) => b.values.length - a.values.length)
      .slice(0, 5)
      .map((t) => `${t.key}(${t.values.length})`)
      .join("  ");

  const txt = await toText(annotations);
  ztoolkit.log("输出的html", txt);
  await saveNote(
    note,
    h1(
      getKeyGroup((f) => f.year),
      "h2",
    ) + txt,
  );
}
function exportNoteByTag(isCollection: boolean = false) {
  exportNote({
    filter: (ans) =>
      ans.flatMap((an) => an.tags.map((tag) => Object.assign({}, an, { tag }))),
    toText: (annotations) =>
      groupBy(annotations, (a) => a.tag.tag)
        .sort(sortByTAGs)
        .flatMap((tag) => {
          return [
            `<h1>${tag.key} (${tag.values.length})</h1>`,
            ...tag.values.map((b) => `${b.html}`),
          ];
        })
        .join("\n"),
    isCollection,
  });
}
function exportNoteByTagPdf(isCollection: boolean = false) {
  exportNote({
    filter: (ans) =>
      ans.flatMap((an) => an.tags.map((tag) => Object.assign({}, an, { tag }))),
    toText: (annotations) =>
      groupBy(annotations, (a) => a.tag.tag)
        .sort(sortByTAGs)
        .flatMap((tag) => {
          return [
            h1(`标签：${tag.key}  (${tag.values.length})`, "h1"),
            ...groupBy(tag.values, (a) => "文件：" + a.pdfTitle).flatMap(
              (pdfTitle) => [
                `<h2>${pdfTitle.key}  (${pdfTitle.values.length})</h2>`,
                ...pdfTitle.values.map((b) => `${b.html}`),
              ],
            ),
          ];
        })
        .join("\n"),
    isCollection,
  });
}

function exportNoteOnlyImage(isCollection: boolean = false) {
  exportNote({
    toText: (annotations) =>
      groupBy(annotations, (a) => "文件：" + a.pdfTitle)
        .flatMap((pdfTitle) => [
          `<h1>${pdfTitle.key} ${getCiteItemHtml(pdfTitle.values[0]?.item)}  (${pdfTitle.values.length})</h1>`,
          ...pdfTitle.values.flatMap((b) => [
            b.html
              ? b.html
              : `<span style="color:#ff6666">未能加载：${b.ann.key}</span>`,
          ]),
        ])
        .join("\n"),
    isCollection,
    filter: (annotations) => {
      annotations = annotations.filter((f) => f.type == "image");
      return uniqueBy(annotations, (a) => a.ann.key);
    },
  });
}
function exportNoteScale(isCollection: boolean = false) {
  exportNote({
    filter: async (ans) =>
      ans.filter((f) => f.tags.some((a) => a.tag == "量表")),
    isCollection: isCollection,
    toText: (ans) =>
      groupBy(ans, (a) => a.pdfTitle)
        .sort((a, b) => (a.key > b.key ? 1 : -1))
        .flatMap((a, index) => [
          h1(
            `(${index + 1}) ` +
              a.key +
              getCiteItemHtmlWithPage(a.values[0].ann),
            "h1",
          ),
          a.values
            .map((b) =>
              h1(
                getCiteAnnotationHtml(
                  b.ann,
                  (
                    b.ann.annotationComment ||
                    b.ann.annotationText ||
                    ""
                  ).replace(/🔤/g, ""),
                ),
                "h2",
              ),
            )
            .join(" "),
        ])
        .join(""),
  });
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
