import { config } from "../../package.json";
import { ProgressWindowHelper } from "zotero-plugin-toolkit/dist/helpers/progressWindow";
import { groupByMap, uniqueBy } from "../utils/array";
import { MenuitemOptions } from "zotero-plugin-toolkit/dist/managers/menu";
function register() {
  //图标根目录 zotero-annotation-manage\addon\chrome\content\icons
  const iconBaseUrl = `chrome://${config.addonRef}/content/icons/`;
  const children: MenuitemOptions[] = [
    {
      tag: "menuitem",
      label: "按标签顺序",
      commandListener: (ev) => {
        exportNoteByTag();
      },
    },
    {
      tag: "menuitem",
      label: "按标签-pdf顺序",
      commandListener: (ev) => {
        exportNoteByTagPdf();
      },
    },
  ];
  //组合到一起的菜单能节省空间
  ztoolkit.Menu.register("item", {
    tag: "menu",
    label: "导出笔记z",
    id: `${config.addonRef}-create-note`,
    icon: iconBaseUrl + "favicon.png",
    children
  });
  ztoolkit.Menu.register("collection", {
      tag: "menu",
      label: "导出笔记z",
      id: `${config.addonRef}-create-note-collection`,
      icon: iconBaseUrl + "favicon.png",
      children,
    });
  //   ztoolkit.Menu.register("item", {
  //     tag: "menuitem",
  //     id: `${config.addonRef}-create-note-by-tag`,
  //     label: "按标签顺序创建笔记",
  //     commandListener: (ev) => {
  //       createNoteByTag();
  //     },
  //   });
}
function unregister() {
  //   ztoolkit.Menu.unregister(`${config.addonRef}-create-note-by-tag`);
  ztoolkit.Menu.unregister(`${config.addonRef}-create-note`);
  ztoolkit.Menu.unregister(`${config.addonRef}-create-note-collection`);
}

async function saveTxt(
  targetNoteItem: Zotero.Item,
  txt: string,
  popupWin: ProgressWindowHelper,
) {
  await Zotero.BetterNotes.api.note.insert(targetNoteItem, txt, -1);
  await targetNoteItem.saveTx();
  popupWin
    .createLine({
      text: `创建笔记完成`,
      type: "default",
    })
    .startCloseTimer(5e3);
}
async function createNote(popupWin: ProgressWindowHelper) {
  const targetNoteItem = new Zotero.Item("note");
  popupWin.createLine({
    text: "创建新笔记 ",
    type: "default",
  });
  targetNoteItem.libraryID = ZoteroPane.getSelectedLibraryID();
  targetNoteItem.setCollections([ZoteroPane.getSelectedCollection(true) || 0]);
  targetNoteItem.addTag("生成的笔记", 0);
  //必须保存后面才能保存图片
  await targetNoteItem.saveTx();
  return targetNoteItem;
}

async function getAnnotations(
  items: Zotero.Item[],
  targetNoteItem: Zotero.Item,
) {
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
          };
          if (tags.length == 0) return [o];
          return tags.map((tag) => Object.assign({}, o, { tag }));
        });
      });
  });

  const datalist = await Promise.all(data);
  return datalist.flat();
}

async function exportNoteByTag() {
  const popupWin = new ztoolkit.ProgressWindow("整理笔记", {
    closeTime: -1,
  }).show();
  const items = ZoteroPane.getSelectedItems();
  const note = await createNote(popupWin);
  const annotations = await getAnnotations(items, note);
  const title = getFromTxt(annotations);
  const txt = groupByMap(annotations, (a) => a.tag.tag)
    .sort((a, b) => b.values.length - a.values.length)
    .flatMap((tag) => {
      return [`<h1>${tag.key}</h1>`, ...tag.values.map((b) => b.html)];
    })
    .join("\n");
  saveTxt(note, `按tag ${title}\n${txt}`, popupWin);
}

async function exportNoteByTagPdf() {
  const popupWin = new ztoolkit.ProgressWindow("整理笔记", {
    closeTime: -1,
  }).show();
  const items = ZoteroPane.getSelectedItems();
  const note = await createNote(popupWin);
  const annotations = await getAnnotations(items, note);

  const title = getFromTxt(annotations);
  // ztoolkit.log(annotations)
  const txt = groupByMap(annotations, (a) => a.tag.tag)
    .sort((a, b) => b.values.length - a.values.length)
    .flatMap((tag) => {
      return [
        `<h1>${tag.key}</h1>`,
        ...groupByMap(tag.values, (p) => p.pdfTitle || "uu").flatMap((pdf) => [
          `<h2>${pdf.key}</h2>`,
          ...pdf.values.map((b) => b.html),
        ]),
      ];
    })
    .join("\n");

  // ztoolkit.log(txt)
  saveTxt(note, `按tag-pdf ${title}\n${txt}`, popupWin);
}

export default { register, unregister };
function getFromTxt(
  annotations: {
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
  }[],
) {
  const itemsLength = uniqueBy(annotations, (a) => a.item.key).length;
  const pdfLength = uniqueBy(annotations, (a) => a.pdf.key).length;
  const annotationLength = uniqueBy(annotations, (a) => a.ann.key).length;
  const tagLength = uniqueBy(annotations, (a) => a.tag.tag).length;
  const title = `${itemsLength}条目${pdfLength}Pdf${tagLength}Tag${annotationLength}笔记${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
  return title;
}
