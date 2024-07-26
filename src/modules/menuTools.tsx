import { config } from "../../package.json";
import { getString } from '../utils/locale';
import { uniqueBy } from "../utils/uniqueBy";
import { AnnotationRes, promiseAllWithProgress } from "../utils/zzlb";
import { getAllAnnotations } from "./AnnotationsToNote";
import { getSelectedItems } from "./menu";

export function funcSplitTag(items: Zotero.Item[], ans: AnnotationRes[]) {

  ztoolkit.log(`找到${items.length}条目${ans.length}笔记`);

  const header = `找到${items.length}条目${ans.length}笔记`;

  const pw = new ztoolkit.ProgressWindow(header).createLine({ text: "执行中" }).show();
  // getPopupWin({ header }).createLine({ text: "处理中" });
  ans.forEach(async (ann, i) => {
    pw.changeLine({
      idx: 0,
      progress: (i / ans.length) * 100,
      text: "处理中",
    });
    const ts = ann.tags
      .map((tag) => tag.tag.match(/#([^/]*)\/([^/]*)[/]?/))
      .filter((f) => f != null && f.length >= 3)
      .flatMap((a) => (a != null ? [a[1], a[2]] : []));
    const tas = uniqueBy(ts, (a) => a).filter((f) => ann.tags.every((e) => e.tag != f));
    //ztoolkit.log(ann.tags,tas)
    if (tas.length > 0) {
      const tas2 = tas.map(async (a) => ann.ann.addTag(a, 0));
      ztoolkit.log(tas.length, "分割", tas);
      await promiseAllWithProgress(tas2).then(() => {
        ann.ann.saveTx();
      });
    }
  });
  pw.createLine({ text: "处理完成" }).startCloseTimer(3000);
}

export async function funcTranslateAnnotations(isCollectionOrItem: boolean | "collection" | "item") {
  //翻译
  const items = await getSelectedItems(isCollectionOrItem);
  const ans = getAllAnnotations(items)
    .filter((an) => an.ann.annotationText)
    // .filter((an) => an.item.getField("language")?.includes("en"))
    .filter(
      (an) =>
        (!an.comment && !an.item.getField("language")?.includes("zh")) ||
        an.comment.includes("🔤undefined🔤") ||
        an.comment.includes("🔤[请求错误]"),
    );
  const header = `找到${items.length}条目${ans.length}笔记`;
  // getPopupWin({ header }).createLine({ text: "处理中" });

  const pw = new ztoolkit.ProgressWindow(header)
    .createLine({ text: "执行中" })
    .createLine({ text: "共" + ans.length + "条" })
    .show();

  for (let index = 0; index < ans.length; index++) {
    const an = ans[index];
    const text = an.ann.annotationText;
    let r = "";
    if (an.item.getField("language")?.includes("en")) {
      const result = (
        await Zotero.PDFTranslate.api.translate(text, {
          langto: "zh",
          itemID: an.item.id,
          pluginID: config.addonID,
        })
      ).result;
      r = "🔤" + result + "🔤";
    }
    if (!an.ann.annotationComment) {
      an.ann.annotationComment = r;
    } else {
      const start = an.ann.annotationComment.indexOf("🔤", 0);
      const end = an.ann.annotationComment.indexOf("🔤", start + 1);
      if (end > -1) {
        an.ann.annotationComment = an.ann.annotationComment =
          an.ann.annotationComment.substring(0, start) + r + an.ann.annotationComment.substring(end + 2, 999);
      } else {
        an.ann.annotationComment = r + an.ann.annotationComment;
      }
    }
    pw.changeLine({
      // idx: 0,
      progress: ((index + 1) / ans.length) * 100,
      text: text.substring(0, 10) + "=>" + r.substring(0, 10),
    });
    an.ann.saveTx();
    Zotero.Promise.delay(500);
  }
  pw.createLine({ text: "已完成" }).startCloseTimer(5000);
}
