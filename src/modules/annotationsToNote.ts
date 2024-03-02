import { config } from "../../package.json";
import { ProgressWindowHelper } from "zotero-plugin-toolkit/dist/helpers/progressWindow";
import { groupByMap, uniqueBy, getCollections } from "../utils/zzlb";
import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
import tags from "./annotations";
let popupWin: ProgressWindowHelper | undefined = undefined;
popupWin = undefined;

function isCollection(ev: Event) {
  const pid = (ev.target as HTMLElement)?.parentElement?.parentElement?.id;
  const isCollection = pid?.includes("collection") || false;
  return isCollection;
}
function register() {
  //图标根目录 zotero-annotation-manage\addon\chrome\content\icons
  const iconBaseUrl = `chrome://${config.addonRef}/content/icons/`;
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
  popupWin
    ?.createLine({
      text: `创建笔记完成`,
      // progress: 100,
      type: "default",
    })
    .startCloseTimer(5e3);
  popupWin = undefined;
}
async function createNote() {
  const targetNoteItem = new Zotero.Item("note");
  targetNoteItem.libraryID = ZoteroPane.getSelectedLibraryID();
  targetNoteItem.setCollections([ZoteroPane.getSelectedCollection(true) || 0]);
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
  tag: { tag: string; type: number };
  tags: { tag: string; type: number }[];
  html: string;
}
function sortTags(
  a: { key: string; values: any[] },
  b: { key: string; values: any[] },
) {
  const TAGS = tags.TAGS;
  if (TAGS.includes(a.key) && TAGS.includes(a.key)) {
    return TAGS.indexOf(a.key) - TAGS.indexOf(b.key);
  }
  if (TAGS.includes(a.key)) {
    return -1;
  }
  if (TAGS.includes(b.key)) {
    return 1;
  }
  return b.values.length - a.values.length + (b.key > a.key ? -0.5 : 0.5);
}
function getAllAnnotations(items: Zotero.Item[]) {
  const items1 = items.map((a) =>
    a.isAttachment() && a.isPDFAttachment() && a.parentItem ? a.parentItem : a,
  );
  // ztoolkit.log(4444, items1);
  const data = uniqueBy(items1, (a) => a.key).flatMap((item) => {
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
            tag: { tag: "未添加标签untagged", type: 0 },
            tags,
            html: "<span color='red'>等待转换：请调用convertHtml方法</span>",
          } as AnnotationRes;
          if (tags.length == 0) return [o];
          return tags.map((tag) => Object.assign({}, o, { tag }));
        });
      });
  });
  return data;
}
async function convertHtml(arr: AnnotationRes[], targetNoteItem: Zotero.Item) {
  popupWin?.createLine({
    text: "正在转换",
    type: "default",
  });
  let index = 0;
  for (const ann of arr) {
    ann.html = await Zotero.BetterNotes.api.convert.annotations2html(
      [ann.ann],
      {
        noteItem: targetNoteItem,
      },
    );
    index++;
    const progress = Math.round((index * 100) / arr.length);
    popupWin?.changeLine({
      //progress,
      idx: 1,
      text: `[${progress.toFixed()}%] ${index}/${arr.length}`,
      type: "default",
    });
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

async function exportNote({
  toText,
  isCollection = false,
  filter = undefined,
}: {
  toText: (arg0: AnnotationRes[]) => string;
  isCollection?: boolean;
  filter?: (arg0: AnnotationRes[]) => AnnotationRes[];
}) {
  ztoolkit.log("exportNote", isCollection);
  if (!popupWin)
    popupWin = new ztoolkit.ProgressWindow("整理笔记", {
      closeTime: -1,
    }).show();
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
    annotations = filter(annotations);
  }
  if (annotations.length == 0) {
    popupWin?.createLine({ text: "没有找到标记" }).startCloseTimer(5e3);
    return;
  }
  //createNote 一定要在 getSelectedItems 之后，不然获取不到选择的条目
  const note = await createNote();
  await convertHtml(annotations, note);
  const title = getTitleFromAnnotations(annotations);
  const txt = toText(annotations);
  await saveNote(note, `${title}\n${txt}`);
}
async function exportNoteByTag(isCollection = false) {
  return await exportNote({
    toText: (annotations) =>
      groupByMap(annotations, (a) => a.tag.tag)
        .sort(sortTags)
        .flatMap((tag) => {
          return [
            `<h1>${tag.key} ${tag.values.length}</h1>`,
            ...tag.values.map((b) => `${b.html}`),
          ];
        })
        .join("\n"),
    isCollection,
  });
}
async function exportNoteByTagPdf(isCollection = false) {
  return await exportNote({
    toText: (annotations) =>
      groupByMap(annotations, (a) => a.tag.tag)
        .sort(sortTags)
        .flatMap((tag) => {
          return [
            `<h1>标签：${tag.key}  ${tag.values.length}</h1>`,
            ...groupByMap(tag.values, (a) => "文件：" + a.pdfTitle).flatMap(
              (pdfTitle) => [
                `<h2>${pdfTitle.key}  ${pdfTitle.values.length}</h2>`,
                ...pdfTitle.values.map((b) => `${b.html}`),
              ],
            ),
          ];
        })
        .join("\n"),
    isCollection,
  });
}
async function exportNoteOnlyImage(isCollection = false) {
  return await exportNote({
    toText: (annotations) =>
      groupByMap(annotations, (a) => "文件：" + a.pdfTitle)
        .flatMap((pdfTitle) => [
          `<h1>${pdfTitle.key}  ${pdfTitle.values.length}</h1>`,
          ...pdfTitle.values.map((b) => `${b.html}`),
        ])
        .join("\n"),
    isCollection,
    filter: (annotations) => {
      annotations = annotations.filter((f) => f.type == "image");
      return uniqueBy(annotations, (a) => a.ann.key);
    },
  });
}
export default { register, unregister };
