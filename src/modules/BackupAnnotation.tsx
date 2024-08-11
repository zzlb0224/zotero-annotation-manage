import { groupBy } from "../utils/groupBy";
import { uniqueBy } from "../utils/uniqueBy";
import { parseAnnotationJSON } from "../utils/zzlb";

export interface BackupAnnotation {
  itemKey: string;
  firstCreator: string;
  year: string;
  title: string;
  pdfKey: string;
  filepath: string;
  displayTitle: string;
  md5: string;
  fileSize: number;
  key: string;
  position: string;
  annotationJson: _ZoteroTypes.Annotations.AnnotationJson;
  item?: Zotero.Item;
  pdf?: Zotero.Item;
  annotation?: Zotero.Item;
}
export async function copyAnnotations(items: Zotero.Item[]) {
  const pw = new ztoolkit.ProgressWindow("复制到剪切板", { closeOnClick: true, closeTime: -1 }).createLine({ text: "开始" }).show();
  const topItems = uniqueBy(
    items.map((i) => i.parentItem ?? i),
    (a) => a.key,
  );

  const dsWithoutObject = await toBackupAnnotation(topItems);
  new ztoolkit.Clipboard().addText(JSON.stringify(dsWithoutObject)).copy();
  pw.createLine({
    text: `${groupBy(dsWithoutObject, (a) => a.itemKey).length}-${groupBy(dsWithoutObject, (a) => a.pdfKey).length}-${dsWithoutObject.length}`,
  })
    .createLine({ text: `完成` })
    .startCloseTimer(3000);
}
export async function pasteAnnotations(items: Zotero.Item[], md5Equal = false, fileSizeEqual = false, titleEqual = true) {
  const pw = new ztoolkit.ProgressWindow("正在从剪切板导入").show();

  const topItems = uniqueBy(
    items.map((i) => i.parentItem ?? i),
    (a) => a.key,
  );
  const text = await ztoolkit.getGlobal("navigator").clipboard.readText();

  const ds = JSON.parse(text) as BackupAnnotation[];
  // const ds = d.flatMap((a) => a.pdfs.flatMap((b) => b.annotations.flatMap((c) => ({ ...a, ...b, ...c, annotation: c }))));
  ztoolkit.log(ds);
  let success = 0;
  for (const item of topItems) {
    const pdfs = Zotero.Items.get(item.getAttachments()).filter((f) => f.isPDFAttachment());
    pw.createLine({ text: ` 处理${item.firstCreator} (${item.getField("year")}) ${item.getDisplayTitle()}` }).createLine({
      text: ` 有${pdfs.length}个Pdf`,
    });
    for (const pdf of pdfs) {
      const currentAnnotations = [...pdf.getAnnotations()];
      const filepath = pdf.getFilePath();
      const { md5, fileSize } = getFileInfo(filepath);
      // const md5 = filepath ? Zotero.Utilities.Internal.md5(Zotero.File.pathToFile(filepath)) : "";
      // const fileSize = filepath ? Zotero.File.pathToFile(filepath).fileSize : -1;
      if (md5) {
        const ans = ds.filter(
          (f) =>
            (!titleEqual ||
              (f.title == item.getField("title") && f.firstCreator == item.getField("firstCreator") && f.year == item.getField("year"))) &&
            (!fileSizeEqual || f.fileSize == fileSize) &&
            (!md5Equal || f.md5 == md5),
        ); //
        ztoolkit.log("找到保存", titleEqual, fileSizeEqual, md5Equal, ans, ds, md5, fileSize);

        pw.createLine({ text: ` pdf:${filepath}` }).createLine({ text: ` 找到${ans.length}条相关注释` });
        let add = 0;
        for (const an of ans) {
          if (an.pdfKey == pdf.key) {
            ztoolkit.log("pdfKey不能保存", an);
            continue;
          }
          if (currentAnnotations.find((f) => f.key == an.annotationJson.key)) {
            ztoolkit.log("currentAnnotations key不能保存", an);
            continue;
          }
          if (currentAnnotations.find((f) => f.annotationType == an.annotationJson.type && f.annotationPosition == an.position)) {
            ztoolkit.log("annotationType annotationPosition不能保存", an);
            continue;
          }
          ztoolkit.log("开始保存", an);
          an.annotationJson.key = Zotero.DataObjectUtilities.generateKey();
          //ts-ignore annotationType
          // an.annotationJson.annotationType = an.annotationJson.type
          const savedAnnotation = await Zotero.Annotations.saveFromJSON(pdf, an.annotationJson);
          await savedAnnotation.saveTx();
          currentAnnotations.push(savedAnnotation);
          success++;
          add++;
        }
        pw.createLine({ text: ` 添加${add}条到pdf` });
      }
    }
  }

  pw.createLine({ text: "" + text.length })
    .createLine({
      text: `${groupBy(ds, (d) => d.itemKey).length}-${groupBy(ds, (d) => d.pdfKey).length}-${ds.length}`,
    })
    .createLine({
      text: `成功${success}`,
    })
    .startCloseTimer(3000);
}
export async function mergePdfs(items: Zotero.Item[], fileSizeEqual = true, md5Equal = true) {
  const primaryPdfKeys = items.filter((f) => f.isPDFAttachment()).map((item) => item.key);
  const topItems = items.map((i) => i.parentItem ?? i);
  const pw = new ztoolkit.ProgressWindow("合并").show();
  for (const item of topItems) {
    pw.createLine({
      text: `处理条目:${item.firstCreator} (${item.getField("year")})...`,
    });
    const pdfs = Zotero.Items.get(item.getAttachments()).filter((f) => f.isPDFAttachment());

    const pdfInfos = pdfs.map((pdf) => {
      return {
        item,
        pdf,
        pdfKey: pdf.key,
        filepath: pdf.getFilePath(),
        ...getFileInfo(pdf.getFilePath()),
      };
    });
    // const ds = await toBackupAnnotation([item], true)
    ztoolkit.log("mergePdfs", pdfInfos);
    const pdfMaster = pdfInfos.find((f) => f.md5 && primaryPdfKeys.includes(f.pdfKey)) || pdfInfos.find((f) => f.md5);
    //有文件的既md5存在的。选中的
    // const pdfMaster = ds.find(f => f.md5 && primaryPdfKeys.includes(f.pdfKey)) || ds.find(f => f.md5);
    if (pdfMaster) {
      const masterPdf = pdfMaster.pdf;
      for (const pdfOther of pdfInfos) {
        // ztoolkit.log(pd)
        if (pdfMaster.pdfKey != pdfOther.pdfKey) {
          if (fileSizeEqual && pdfMaster.fileSize !== pdfMaster.fileSize) {
            ztoolkit.log("找到另一个pdf 但是文件大小不一样", pdfOther);
            continue;
          }
          if (md5Equal && pdfMaster.md5 !== pdfMaster.md5) {
            ztoolkit.log("找到另一个pdf 但是文件大小不一样", pdfOther);
            continue;
          }
          ztoolkit.log("找到另一个pdf", pdfOther);
          const otherAttachment = pdfOther.pdf!;
          const ifLinks = otherAttachment.attachmentLinkMode == Zotero.Attachments.LINK_MODE_LINKED_FILE; // 检测是否为链接模式
          const file = await otherAttachment.getFilePathAsync();
          if (file && ifLinks) {
            // 如果文件存在(文件可能已经被删除)且为链接模式删除文件
            try {
              // await OS.File.remove(file); // 尝试删除文件
              await Zotero.File.removeIfExists(file);
              //await trash.remove(file);
            } catch (error) {
              // 弹出错误
              // alert("文件已打开");
              // return; // 弹出错误后终止执行
            }
          }
          // await Zotero.Items.moveChildItems(
          //  attachment,
          //   mPdf,
          //   false
          // );
          const fromAnnotations = otherAttachment.getAnnotations(false);
          let moveAnnotationLength = 0;
          for (const annotation of fromAnnotations) {
            if (annotation.annotationIsExternal) {
              continue;
            }
            if (
              masterPdf
                .getAnnotations()
                .find((f) => f.annotationType == annotation.annotationType && f.annotationPosition == annotation.annotationPosition)
            ) {
              continue;
            }
            // 直接改parentItemID会出问题
            // annotation.parentItemID = mPdf;
            // await annotation.saveTx();
            const annotationJson = await parseAnnotationJSON(annotation);
            if (annotationJson) {
              annotationJson.key = Zotero.DataObjectUtilities.generateKey();
              const savedAnnotation = await Zotero.Annotations.saveFromJSON(masterPdf, annotationJson);
              await savedAnnotation.saveTx();
            }

            moveAnnotationLength += 1;
          }
          if (moveAnnotationLength > 0)
            pw.createLine({
              text: ` 移动${moveAnnotationLength}条批注`,
            });
          otherAttachment.deleted = true;
          pw.createLine({ text: "  附件删除:" + otherAttachment.getFilePath() });
          otherAttachment.saveTx();
          // pw.createLine({ text: "保存" });
        }
      }
      masterPdf.saveTx();
    }
    item.saveTx();
    pw.createLine({
      text: `保存条目:${item.firstCreator} (${item.getField("year")})。`,
    });
  }
  pw.createLine({ text: "完成:" + items.length }).startCloseTimer(5000);
}
export function toBackupAnnotation(topItems: Zotero.Item[], withObject = false) {
  const d = topItems.flatMap((item) => {
    const pdfIds = item.getAttachments();
    const pdfs = Zotero.Items.get(pdfIds).filter((f) => f.isPDFAttachment());
    return pdfs.flatMap((pdf) => {
      const filepath = pdf.getFilePath();
      const displayTitle = pdf.getDisplayTitle();
      const { md5, fileSize } = getFileInfo(filepath);
      return pdf.getAnnotations().map(async (annotation) => {
        return {
          itemKey: item.key,
          // item,
          firstCreator: `${item.getField("firstCreator")}`,
          year: `${item.getField("year")}`,
          title: `${item.getField("title")}`,
          pdfKey: pdf.key,
          filepath,
          displayTitle,
          md5,
          fileSize,
          key: annotation.key,
          position: annotation.annotationPosition,
          annotationJson: await parseAnnotationJSON(annotation),
          item: withObject ? item : undefined,
          pdf: withObject ? pdf : undefined,
          annotation: withObject ? annotation : undefined,
        } as BackupAnnotation;
      });
    });
  });
  return Promise.all(d);
}
export function getFileInfo(filepath: string | false) {
  let md5 = "";
  let fileSize = -1;
  if (filepath) {
    try {
      md5 = Zotero.Utilities.Internal.md5(Zotero.File.pathToFile(filepath));
      fileSize = Zotero.File.pathToFile(filepath).fileSize;
    } catch (error) {
      ztoolkit.log("文件不可访问", error);
    }
  }
  return { md5, fileSize };
}
