import { config } from "../../package.json";
import { ProgressWindowHelper } from "zotero-plugin-toolkit/dist/helpers/progressWindow";
import { groupByMap, uniqueBy, allWithProgress } from "../utils/zzlb";
import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
import tags from "./annotations";

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
          exportNoteByTag();
        },
      },
      {
        tag: "menuitem",
        label: "按标签-pdf顺序",
        icon: iconBaseUrl + "favicon.png",
        commandListener: (ev) => {
          exportNoteByTagPdf();
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
    Object.assign({ id: `${config.addonRef}-create-note` }, menu),
  );
}
function unregister() {
  ztoolkit.Menu.unregister(`${config.addonRef}-create-note`);
  ztoolkit.Menu.unregister(`${config.addonRef}-create-note-collection`);
}

async function saveNote(
  targetNoteItem: Zotero.Item,
  txt: string,
  popupWin?: ProgressWindowHelper,
) {
  await Zotero.BetterNotes.api.note.insert(targetNoteItem, txt, -1);
  await targetNoteItem.saveTx();
  popupWin
    ?.createLine({
      text: `创建笔记完成`,
      progress: 100,
      type: "default",
    })
    .startCloseTimer(5e3);
}
async function createNote(popupWin?: ProgressWindowHelper) {
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
async function getAnnotations(
  items: Zotero.Item[],
  targetNoteItem?: Zotero.Item,
  popupWin?: ProgressWindowHelper,
): Promise<AnnotationRes[]> {
  const items1 = items.map((a) =>
    a.isAttachment() && a.isPDFAttachment() && a.parentItem ? a.parentItem : a,
  );
  const data = items1.flatMap((item) => {
    const itemTags = item
      .getTags()
      .map((a) => a.tag)
      .sort()
      .join("  ");
    const author = item.getField("firstCreator");
    const year = item.getField("year");
    const title = item.getField("title");
    return Zotero.Items.get(item.getAttachments())
      .filter((f) => f.isAttachment() && f.isPDFAttachment())
      .flatMap((pdf) => {
        const pdfTitle = pdf.getDisplayTitle();
        return pdf.getAnnotations().flatMap(async (ann) => {
          const text = ann.annotationText;
          const comment = ann.annotationComment;
          const html = (await Zotero.BetterNotes.api.convert.annotations2html(
            [ann],
            {
              noteItem: targetNoteItem,
            },
          )) as string;
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
            html,
          } as AnnotationRes;
          if (tags.length == 0) return [o];
          return tags.map((tag) => Object.assign({}, o, { tag }));
        });
      });
  });
  popupWin?.createLine({
    text: "正在转换",
    type: "default",
  });
  const list = await allWithProgress(data, (progress, index) => {
    //TODO 不知道为什么无法启动这个进度条，太快了？
    popupWin?.changeLine({
      progress: Math.round(progress),
      idx: 1,
      text: `[${progress.toFixed()}%] ${index}/${data.length}`,
      type: "default",
    });
  });
  return list.flat();
}

function getTitleFromAnnotations(annotations: AnnotationRes[]) {
  const itemsLength = uniqueBy(annotations, (a) => a.item.key).length;
  const pdfLength = uniqueBy(annotations, (a) => a.pdf.key).length;
  const annotationLength = uniqueBy(annotations, (a) => a.ann.key).length;
  const tagLength = uniqueBy(annotations, (a) => a.tag.tag).length;
  const title = `注释 (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}) ${itemsLength}-${pdfLength}-${tagLength}-${annotationLength}`;
  return title;
}

async function exportNoteByTag() {
  const popupWin = new ztoolkit.ProgressWindow("整理笔记", {
    closeTime: -1,
  }).show();
  const items = ZoteroPane.getSelectedItems();
  const note = await createNote(popupWin);
  const annotations = await getAnnotations(items, note, popupWin);
  const title = getTitleFromAnnotations(annotations);
  const txt = groupByMap(annotations, (a) => a.tag.tag)
    .sort(sortTags)
    .flatMap((tag) => {
      return [
        `<h1>${tag.key} ${tag.values.length}</h1>`,
        ...tag.values.map((b) => `${b.html}`),
      ];
    })
    .join("\n");
  saveNote(note, `${title} tag\n${txt}`, popupWin);
}

async function exportNoteByTagPdf() {
  const popupWin = new ztoolkit.ProgressWindow("整理笔记", {
    closeTime: -1,
  }).show();
  const items = ZoteroPane.getSelectedItems();
  const note = await createNote(popupWin);
  const annotations = await getAnnotations(items, note, popupWin);

  const title = getTitleFromAnnotations(annotations);
  // ztoolkit.log(annotations)
  const txt = groupByMap(annotations, (a) => a.tag.tag)
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
    .join("\n");

  // ztoolkit.log(txt)
  saveNote(note, `${title} tag-pdf\n${txt}`, popupWin);
}

export default { register, unregister };
