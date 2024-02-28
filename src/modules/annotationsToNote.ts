import { config } from "../../package.json";
function register() {
  //图标根目录 zotero-annotation-manage\addon\chrome\content\icons
  const iconBaseUrl = `chrome://${config.addonRef}/content/icons/`;
  //组合到一起的菜单能节省空间
  ztoolkit.Menu.register("item", {
    tag: "menu",
    label: "导出笔记",
    id: `${config.addonRef}-create-note`,
    icon: iconBaseUrl + "favicon.png",
    children: [
      {
        tag: "menuitem",
        label: "按标签顺序",
        commandListener: (ev) => {
          exportNoteByTag();
        },
      },
    ],
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
}
function getTagAnnotations() {
  const pdfIds = ZoteroPane.getSelectedItems(false).flatMap((f) =>
    f.getAttachments(),
  );
  const annotations = Zotero.Items.get(pdfIds)
    .filter((f) => f.isAttachment() && f.isPDFAttachment())
    .flatMap((f) => f.getAnnotations())
    .map((a) => ({ ann: a, tags: a.getTags() }));
  const tas = { untag: { count: 0, anns: [] } } as {
    [key: string]: { count: number; anns: Zotero.Item[] };
  };
  const add = (
    tas: { [key: string]: { count: number; anns: Zotero.Item[] } },
    tag: string,
    ann: Zotero.Item,
  ) => {
    if (tas[tag]) {
      tas[tag] = {
        count: tas[tag].count + 1,
        anns: [...tas[tag].anns, ann],
      };
    } else {
      tas[tag] = { count: 1, anns: [ann] };
    }
  };
  for (const tg of annotations) {
    if (tg.tags && tg.tags.length > 0) {
      for (const tag of tg.tags) {
        add(tas, tag.tag, tg.ann);
      }
    } else {
      add(tas, "untag", tg.ann);
    }
  }
  return tas;
}
async function exportNoteByTag() {
  //todo1 显示标题
  //! 图片好像有问题
  const popupWin = new ztoolkit.ProgressWindow("整理笔记", {
    closeTime: -1,
  }).show();
  const targetNoteItem = new Zotero.Item("note");
  targetNoteItem.libraryID = ZoteroPane.getSelectedLibraryID();
  targetNoteItem.setCollections([ZoteroPane.getSelectedCollection(true) || 0]);
  targetNoteItem.addTag("自用笔记", 0);
  popupWin.createLine({
    text: "创建新笔记 ",
    type: "default",
  });
  const tas = getTagAnnotations();
  const tas2 = Object.keys(tas)
    .map((tag) => ({ tag, count: tas[tag].count, anns: tas[tag].anns }))
    .sort((a, b) => a.count - b.count);
  const resp = tas2.flatMap(async (a) =>
    [
      `<h1>${a.tag} ${a.count}<h1>\n`,
      (
        await Promise.all(
          a.anns.map(
            async (b) =>
              await Zotero.BetterNotes.api.convert.annotations2html([b], {
                noteItem: targetNoteItem,
              }),
          ),
        )
      ).join("\n\n"),
    ].join("\n\n"),
  );
  const res = await Promise.all(resp);
  await Zotero.BetterNotes.api.note.insert(
    targetNoteItem,
    "笔记整理\n" + res.join("\n"),
    -1,
  );

  await targetNoteItem.saveTx();
  popupWin
    .createLine({
      text: `完成`,
      type: "default",
    })
    .startCloseTimer(5e3);
}

export default { register, unregister };
