import { sortAsc } from '../utils/sort';
import { uniqueBy } from '../utils/uniqueBy';
import { AnnotationRes } from '../utils/zzlb';

export function getAllAnnotations(items: Zotero.Item[]) {
    const items1 = items.map((a) => (a.isAttachment() && a.isPDFAttachment() && a.parentItem ? a.parentItem : a));
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
                        const text = ann.annotationText || "";
                        const comment = ann.annotationComment || "";
                        const color = ann.annotationColor;
                        const type = ann.annotationType;
                        const tags = ann.getTags();
                        const annotationTags = tags.map((a) => a.tag).join("  ");
                        const page = ann.annotationPageLabel;
                        const dateModified = ann.dateModified;
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
                            page,
                            dateModified,
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
}// function getPopupWin({
//   closeTime = 5000,
//   header = "整理笔记",
//   lines = [],
// }: { closeTime?: number; header?: string; lines?: string[] } = {}) {
//   const popupWin = new ztoolkit.ProgressWindow(header, {
//     closeTime: closeTime,
//     closeOnClick: true,
//   }).show();
//   if (lines && lines.length > 0) for (const line of lines) popupWin?.createLine({ text: line });
//   return popupWin;
// }
export function getTitleFromAnnotations(annotations: AnnotationRes[]) {
    const itemsLength = uniqueBy(annotations, (a) => a.item.key).length;
    // const pdfLength = uniqueBy(annotations, (a) => a.pdf.key).length;
    const annotationLength = uniqueBy(annotations, (a) => a.ann.key).length;
    // const tagLength = uniqueBy(annotations, (a) => a.tag.tag).length;
    // ${itemsLength}-${annotationLength}
    const title = `批注 (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}) ${annotationLength}`;
    return title;
}

