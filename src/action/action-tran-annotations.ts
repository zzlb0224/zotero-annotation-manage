//@ts-nocheck  用于脚本测试
export async function actionTranAnnotations(item?: Zotero.Item, items?: Zotero.Item[]) {
  /**
   * A description of this script.
   * @author zzlb0224
   * @usage menu
   * @link https://github.com/windingwind/zotero-actions-tags/discussions/316
   * @see https://github.com/windingwind/zotero-actions-tags/discussions/316
   */
  function sortAsc2(a2, b2) {
    if (a2 === void 0 && b2 === void 0) {
      return 0;
    }
    if (a2 === void 0) {
      return -1;
    }
    if (b2 === void 0) {
      return 1;
    }
    return a2 == b2 ? 0 : a2 < b2 ? -1 : 1;
  }
  function uniqueBy2(arr, fn) {
    const keys = {};
    const values = [];
    for (const curr of arr) {
      const key = fn(curr);
      if (!keys.hasOwnProperty.call(keys, key)) {
        keys[key] = values.length;
        values.push(curr);
      }
    }
    return values;
  }
  function getAllAnnotations2(items2) {
    const items1 = items2.filter((a) => a).map((a2) => (a2.isAttachment() && a2.isPDFAttachment() && a2.parentItem ? a2.parentItem : a2));
    const data = uniqueBy2(items1, (a2) => a2.key)
      .filter((f3) => !f3.isAttachment())
      .flatMap((item2) => {
        const itemTags = item2
          .getTags()
          .map((a2) => a2.tag)
          .sort(sortAsc2)
          .join("  ");
        const author = item2.getField("firstCreator");
        const year = item2.getField("year");
        const title = item2.getField("title");
        return Zotero.Items.get(item2.getAttachments(false))
          .filter((f3) => f3.isAttachment() && f3.isPDFAttachment())
          .flatMap((pdf) => {
            const pdfTitle = pdf.getDisplayTitle();
            return pdf.getAnnotations().flatMap((ann) => {
              const text = ann.annotationText;
              const comment = ann.annotationComment;
              const color = ann.annotationColor;
              const type = ann.annotationType;
              const tags = ann.getTags();
              const annotationTags = tags.map((a2) => a2.tag).join("  ");
              const page = ann.annotationPageLabel;
              const dateModified = ann.dateModified;
              const o3 = {
                item: item2,
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
                  tag: "\u5728filter\u4F7F\u7528flatMap\u4E4B\u540E\u624D\u80FD\u7528\u3002\u4F8B\u5982\uFF1Afilter:(ans)=>ans.flatMap(an=>an.tags.map(tag=>Object.assign({},an,{tag})))",
                  type: 0,
                },
                tags,
                annotationTags,
                html: "<span color='red'>\u7B49\u5F85\u8F6C\u6362\uFF1A\u8BF7\u8C03\u7528convertHtml\u65B9\u6CD5</span>",
              };
              return o3;
            });
          });
      });
    return data;
  }
  const ans = getAllAnnotations2([...items, item])
    .filter((an) => an.ann.annotationText)
    .filter((an) => an.item.getField("language")?.includes("en"))
    .filter(
      (an) =>
        (!an.comment && !an.item.getField("language")?.includes("zh")) ||
        an.comment.includes("\u{1F524}undefined\u{1F524}") ||
        an.comment.includes("\u{1F524}[\u8BF7\u6C42\u9519\u8BEF]"),
    );
  const pw = new Zotero.PDFTranslate.data.ztoolkit.ProgressWindow(`\u627E\u5230${items.length}\u6761\u76EE${ans.length}\u7B14\u8BB0`, {
    closeTime: -1,
    closeOnClick: true,
  }).show();
  pw.createLine({ text: "\u5904\u7406\u4E2D" });
  for (let index = 0; index < ans.length; index++) {
    const an = ans[index];
    const text = an.ann.annotationText;
    let r2 = "";
    if (an.item.getField("language")?.includes("en")) {
      const result = (
        await Zotero.PDFTranslate.api.translate(text, {
          langto: "zh",
          itemID: an.item.id,
          pluginID: "configAddonIDUserScripts",
        })
      ).result;
      r2 = "\u{1F524}" + result + "\u{1F524}";
    }
    if (!an.ann.annotationComment) {
      an.ann.annotationComment = r2;
    } else {
      const start = an.ann.annotationComment.indexOf("\u{1F524}", 0);
      const end = an.ann.annotationComment.indexOf("\u{1F524}", start + 1);
      if (end > -1) {
        an.ann.annotationComment = an.ann.annotationComment =
          an.ann.annotationComment.substring(0, start) + r2 + an.ann.annotationComment.substring(end + 2, 999);
      } else {
        an.ann.annotationComment = r2 + an.ann.annotationComment;
      }
    }
    pw.changeLine({
      // idx: 0,
      progress: ((index + 1) / ans.length) * 100,
      text: text.substring(0, 10) + "=>" + r2.substring(0, 10),
    });
    an.ann.saveTx();
    Zotero.Promise.delay(500);
  }
  pw.createLine({ text: "\u5DF2\u5B8C\u6210" }).startCloseTimer(5e3);
}
