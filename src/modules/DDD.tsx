import { getPref } from "../utils/prefs";
import { getSelectedItems } from "./menu";

export async function DDDTagClear() {
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
  const pw = new ztoolkit.ProgressWindow(header).createLine({ text: "执行中" }).show();
  // getPopupWin({ header })?.createLine({ text: "执行中" });
  await Zotero.Tags.removeFromLibrary(
    libraryID,
    removeIDs,
    (done: number, total: number) => {
      pw.changeLine({
        idx: 0,
        progress: (done / total) * 100,
        text: `执行中:${done}/${total}`,
      });
    },
    [1],
  );
  pw.createLine({ text: "完成" }).startCloseTimer(5000, false);
}
export async function DDDTagRemove(collectionOrItem: "collection" | "item") {
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
  // getPopupWin({ header }).createLine({ text: "执行中" });
  const pw = new ztoolkit.ProgressWindow(header).createLine({ text: "执行中" }).show();
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
      pw.changeLine({
        idx: 0,
        progress: (done / total) * 100,
        text: `执行中:${done}/${total}`,
      });
    }
  });

  pw.createLine({ text: "完成" }).startCloseTimer(5000, false);
}
export async function DDDTagSet(collectionOrItem: "collection" | "item") {
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
  // getPopupWin({ header }).createLine({ text: "处理中" });
  const pw = new ztoolkit.ProgressWindow(header).createLine({ text: "执行中" }).show();
  for (let index = 0; index < pdfs.length; index++) {
    const pdf = pdfs[index];
    if (!pdf.isAttachment() || !pdf.isPDFAttachment()) continue;
    let text = "",
      extractedPages = 0,
      totalPages = 0;
    try {
      //@ts-ignore Zotero.PDFWorker.getFullText
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
    pw.changeLine({
      idx: 0,
      progress: (index / pdfs.length) * 100,
      text: pdf.getDisplayTitle(),
    });
  }
  pw.createLine({ text: `已完成` });
}
