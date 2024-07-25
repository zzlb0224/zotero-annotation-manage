import { config } from "../../package.json";
import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { getPref, setPref } from "../utils/prefs";
import { sortAsc, sortFixedTags10ValuesLength } from "../utils/sort";
import { uniqueBy } from "../utils/uniqueBy";
import {
    AnnotationRes,
    clearChild,
    createTopDiv,
    getAnnotationContent,
    getPublicationTags,
    memSVG,
    openAnnotation,
    setProperty,
    stopPropagation,
    str2RegExps,
    toggleProperty,
} from "../utils/zzlb";
import { exportNote, toText1, getSelectedItems, createActionTag, exportTagsNote } from "./menu";
import { showTitle } from "./RelationHeader";
// import { groupBy } from '../utils/groupBy';
import { groupBy } from "lodash";

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
}

export function getTitleFromAnnotations(annotations: AnnotationRes[]) {
    const itemsLength = uniqueBy(annotations, (a) => a.item.key).length;
    // const pdfLength = uniqueBy(annotations, (a) => a.pdf.key).length;
    const annotationLength = uniqueBy(annotations, (a) => a.ann.key).length;
    // const tagLength = uniqueBy(annotations, (a) => a.tag.tag).length;
    // ${itemsLength}-${annotationLength}
    const title = `批注 (${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}) ${annotationLength}`;
    return title;
}

export function createSearchAnnContent(dialogWindow: Window | undefined, popupDiv: HTMLElement | undefined, annotations: AnnotationRes[]) {
    const isWin = dialogWindow != undefined;
    const doc = dialogWindow?.document.documentElement || popupDiv;
    if (!doc) return;
    dialogWindow?.addEventListener("resize", (e) => {
        updatePageContentDebounce();
    });
    let text = "";
    let tag = "";
    let rowSize = (getPref("SearchAnnRowSize") as number) || 4;
    let columnSize = (getPref("SearchAnnColumnSize") as number) || 5;
    let pageSize = rowSize * columnSize;
    // let pageSize = (getPref("SearchAnnPageSize") as number) || 16;
    let pageIndex = 1;
    let fontSize = (getPref("SearchAnnFontSize") as number) || 16;
    const selectedAnnotationType: string[] = [];
    let ans: AnnotationRes[] = annotations;

    const content = doc.querySelector(".content") as HTMLElement;
    const query = doc.querySelector(".query") as HTMLElement;
    const status = doc.querySelector(".status") as HTMLElement;
    ztoolkit.log(content, query, status);
    content.parentElement!.style.fontSize = fontSize + "px";
    const inputTag: TagElementProps = {
        tag: "div",
        styles: { display: "flex", flexDirection: "row", flexWrap: "wrap" },
        children: [
            { tag: "div", properties: { textContent: "" } },
            {
                tag: "div",
                properties: { textContent: "批注、笔记" },
                children: [
                    {
                        tag: "input",
                        namespace: "html",
                        properties: { placeholder: "支持正则" },
                        styles: { width: "200px" },
                        listeners: [
                            {
                                type: "keyup",
                                listener: (ev: any) => {
                                    stopPropagation(ev);
                                    text = (ev.target as HTMLInputElement).value;
                                    updateFilter();
                                },
                            },
                        ],
                    },
                ],
            },
            {
                tag: "div",
                properties: { textContent: "标签" },
                children: [
                    {
                        tag: "input",
                        namespace: "html",
                        properties: { placeholder: "支持正则" },
                        styles: { width: "200px" },
                        listeners: [
                            {
                                type: "keyup",
                                listener: (ev: Event) => {
                                    stopPropagation(ev);
                                    tag = (ev.target as HTMLInputElement).value.trim();
                                    updateFilter();
                                },
                            },
                        ],
                    },
                ],
            },
            {
                tag: "div",
                properties: { textContent: "类型：" },
                children: ["highlight", "image", "underline", "note", "ink", "text"].flatMap((a) => [
                    {
                        tag: "label",
                        namespace: "html",
                        properties: { textContent: a },
                        styles: { paddingRight: "20px" },
                        children: [
                            {
                                tag: "input",
                                namespace: "html",
                                properties: {
                                    textContent: a,
                                    placeholder: a,
                                    type: "checkbox",
                                },
                                listeners: [
                                    {
                                        type: "change",
                                        listener: (ev: any) => {
                                            ev.stopPropagation();
                                            const ck = ev.target as HTMLInputElement;
                                            if (selectedAnnotationType.includes(a)) {
                                                selectedAnnotationType.splice(selectedAnnotationType.indexOf(a), 1);
                                                ck.checked = false;
                                            } else {
                                                selectedAnnotationType.push(a);
                                                ck.checked = true;
                                            }
                                            updateFilter();
                                        },
                                        options: { capture: true },
                                    },
                                ],
                            },
                        ],
                    },
                ]),
            },
            {
                tag: "button",
                properties: { textContent: "导出" },
                listeners: [
                    {
                        type: "click",
                        listener: (e) => {
                            e.stopPropagation();
                            exportNote({ filter: () => ans, toText: toText1 });
                            dialogWindow?.close();
                            popupDiv?.remove();
                        },
                        options: { capture: true },
                    },
                ],
            },
            {
                tag: "label",
                properties: { textContent: "列" },
                children: [
                    {
                        tag: "input",
                        namespace: "html",
                        properties: {
                            placeholder: "输入数字",
                            value: columnSize,
                            type: "number",
                        },
                        styles: { width: "30px" },
                        listeners: [
                            {
                                type: "change",
                                listener: (ev: Event) => {
                                    stopPropagation(ev);
                                    columnSize = parseInt((ev.target as HTMLInputElement).value.trim());
                                    if (columnSize <= 0) columnSize = 1;
                                    (ev.target as HTMLInputElement).value = columnSize + "";
                                    pageSize = rowSize * columnSize;
                                    setPref("SearchAnnColumnSize", columnSize);
                                    updatePageContentDebounce();
                                },
                            },
                        ],
                    },
                ],
            },
            {
                tag: "label",
                properties: { textContent: "行" },
                children: [
                    {
                        tag: "input",
                        namespace: "html",
                        properties: {
                            placeholder: "输入数字",
                            value: rowSize,
                            type: "number",
                        },
                        styles: { width: "30px" },
                        listeners: [
                            {
                                type: "change",
                                listener: (ev: Event) => {
                                    stopPropagation(ev);
                                    rowSize = parseInt((ev.target as HTMLInputElement).value.trim());
                                    if (rowSize <= 0) rowSize = 1;
                                    (ev.target as HTMLInputElement).value = rowSize + "";
                                    pageSize = rowSize * columnSize;
                                    setPref("SearchAnnRowSize", rowSize);
                                    updatePageContentDebounce();
                                },
                            },
                        ],
                    },
                ],
            },
            // {
            //   tag: "div",
            //   properties: { textContent: "每页N条" },
            //   children: [
            //     {
            //       tag: "input",
            //       namespace: "html",
            //       properties: {
            //         placeholder: "输入数字",
            //         value: pageSize,
            //         type: "number",
            //       },
            //       styles: { width: "30px" },
            //       listeners: [
            //         {
            //           type: "change",
            //           listener: (ev: Event) => {
            //             stopPropagation(ev);
            //             pageSize = parseInt((ev.target as HTMLInputElement).value.trim());
            //             if (pageSize <= 0) pageSize = 1;
            //             (ev.target as HTMLInputElement).value = pageSize + "";
            //             setPref("SearchAnnPageSize", pageSize);
            //             updatePageContentDebounce();
            //           },
            //         },
            //       ],
            //     },
            //   ],
            // },
            {
                tag: "div",
                properties: { textContent: "第几页" },
                children: [
                    {
                        tag: "input",
                        namespace: "html",
                        classList: ["pageIndex"],
                        properties: {
                            placeholder: "输入数字",
                            value: pageIndex,
                            type: "number",
                        },
                        styles: { width: "30px" },
                        listeners: [
                            {
                                type: "change",
                                listener: (ev: Event) => {
                                    stopPropagation(ev);
                                    pageIndex = parseInt((ev.target as HTMLInputElement).value.trim());
                                    // if (pageIndex <= 0) pageIndex = 1;
                                    if (pageIndex <= 0) {
                                        pageIndex = Math.floor(ans.length / pageSize + 1);
                                    } else if (pageIndex > ans.length / pageSize + 1) {
                                        pageIndex = 1;
                                    }
                                    (ev.target as HTMLInputElement).value = pageIndex + "";
                                    updateFilter();
                                },
                            },
                        ],
                    },
                ],
            },

            {
                tag: "div",
                properties: { textContent: "文字大小" },
                children: [
                    {
                        tag: "input",
                        namespace: "html",
                        classList: ["fontSize"],
                        properties: {
                            placeholder: "输入数字",
                            value: fontSize,
                            type: "number",
                        },
                        styles: { width: "30px" },
                        listeners: [
                            {
                                type: "change",
                                listener: (ev: Event) => {
                                    stopPropagation(ev);
                                    const input = ev.target as HTMLInputElement;
                                    fontSize = parseInt(input.value.trim());
                                    if (fontSize < 6) fontSize = 6;
                                    if (fontSize > 50) fontSize = 50;
                                    input.value = fontSize + "";
                                    setPref("SearchAnnFontSize", fontSize);
                                    content.parentElement!.style.fontSize = fontSize + "px";
                                },
                            },
                        ],
                    },
                ],
            },

            // {
            //   tag: "button",
            //   properties: { textContent: "关闭" },
            //   listeners: [
            //     {
            //       type: "click",
            //       listener: (e) => {
            //         e.stopPropagation();

            //         dialogWindow?.close();
            //         popupDiv?.remove();
            //       },
            //       options: { capture: true },
            //     },
            //   ],
            // },
            // {
            //   tag: "button",
            //   properties: { textContent: "" },
            //   listeners: [
            //     {
            //       type: "click",
            //       listener: (e) => {
            //         e.stopPropagation();

            //         dialogWindow?.close();
            //         popupDiv?.remove();
            //       },
            //       options: { capture: true },
            //     },
            //   ],
            // },
        ],
    };
    ztoolkit.UI.appendElement(inputTag!, query);
    // content.addEventListener("wheel",(e)=>{ztoolkit.log("wheel",e)})
    // content.addEventListener("onmousewheel",(e)=>{ztoolkit.log("onmousewheel",e)})
    content.addEventListener("DOMMouseScroll_只要底层捕捉，上面的div不要处理这个事件", (e) => {
        // e.preventDefault()
        const DMS = e as any;
        // ztoolkit.log("DOMMouseScroll",e)
        pageIndex += DMS.detail ? 1 : -1;
        if (pageIndex <= 0) {
            pageIndex = Math.floor(ans.length / pageSize + 1);
        } else if (pageIndex > ans.length / pageSize + 1) {
            pageIndex = 1;
        }
        const pIE = query.querySelector(".pageIndex") as HTMLInputElement;
        if (pIE) {
            pIE.value = pageIndex + "";
        }
        updatePageContentDebounce();
    });

    const updatePageContentDebounce = Zotero.Utilities.debounce(updatePageContent);
    const updateFilterDebounce = Zotero.Utilities.debounce(updateFilter);
    updateFilterDebounce();
    // return { text, tag, showN: pageSize, ans };
    async function updateFilter() {
        const txtRegExp = str2RegExps(text);
        const tagRegExp = str2RegExps(tag);
        ans = annotations
            .filter((f) => txtRegExp.length == 0 || txtRegExp.some((a) => a.test(f.comment) || a.test(f.text)))
            .filter((f) => tagRegExp.length == 0 || tagRegExp.some((a) => a.test(f.annotationTags)))
            .filter((f) => selectedAnnotationType.length == 0 || selectedAnnotationType.includes(f.type))
            .sort((a, b) => {
                return (
                    sortAsc(b.year, a.year) * 1000 +
                    sortAsc(a.author, b.author) * 100 +
                    sortAsc(a.item.key, b.item.key) * 10 +
                    sortAsc(a.ann.annotationSortIndex, b.ann.annotationSortIndex)
                    // sortAsc(
                    //   parseInt(a.ann.annotationPageLabel),
                    //   parseInt(b.ann.annotationPageLabel),
                    // ) *
                    //   10 +
                    // sortAsc(a.ann.annotationPosition, b.ann.annotationPosition) * 1
                );
            });
        clearChild(content);
        clearChild(status);

        // ztoolkit.UI.appendElement(,status);
        await updatePageContentDebounce();
        //大小变化不需要了
        // if (isWin) (dialogWindow as any).sizeToContent();
    }
    async function updatePageContent() {
        if (!doc) return;
        const docCss = ztoolkit.getGlobal("getComputedStyle")(doc);
        const docWidth = parseFloat(docCss.width);
        const docHeight = parseFloat(docCss.height);
        ztoolkit.log("画布宽度", docWidth, "高度", docHeight);
        if ((pageIndex - 1) * pageSize > ans.length) {
            pageIndex = 1;
            (query.querySelector(".pageIndex") as HTMLInputElement).value = pageIndex + "";
        }
        status.innerHTML = `总${annotations.length}条笔记，筛选出了${ans.length}条。预览${(pageIndex - 1) * pageSize + 1}-${Math.min(pageIndex * pageSize, ans.length)}条。`;
        const showAn = ans.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);
        clearChild(content);
        content.innerHTML = "";
        // await convertHtml(showAn)
        const cs = showAn.map(async (to, index) => {
            const anTo = to.ann;
            return {
                tag: "div",
                styles: {
                    padding: "5px",
                    marginRight: "20px",
                    display: "flex",
                    alignItems: "stretch",
                    flexDirection: "column",
                    width: docWidth / columnSize - 20 - 20 / columnSize + "px",
                    background: "#fff",
                    borderRadius: "5px",
                    margin: "4px",
                },
                properties: { textContent: "" },
                children: [
                    {
                        tag: "div",
                        styles: {
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                        },
                        children: [
                            {
                                tag: "span",
                                styles: { color: anTo.annotationColor },
                                properties: {
                                    textContent: anTo.annotationType,
                                    innerHTML:
                                        (await memSVG(`chrome://${config.addonRef}/content/16/annotate-${anTo.annotationType}.svg`)) || anTo.annotationType,
                                },
                            },
                            {
                                tag: "span",
                                styles: {},
                                properties: {
                                    textContent: `${anTo.parentItem?.parentItem?.getField("firstCreator")}, ${anTo.parentItem?.parentItem?.getField("year")}, p.${anTo.annotationPageLabel}`,
                                },
                                listeners: [
                                    {
                                        type: "click",
                                        listener: (e: any) => {
                                            e.stopPropagation();
                                            ztoolkit.log("点击", e, e.clientX, e.target);
                                            showTitle(anTo, e.clientX, e.clientY, content);
                                        },
                                        options: { capture: true },
                                    },
                                    {
                                        type: "mouseover",
                                        listener: (e: any) => {
                                            ztoolkit.log("鼠标进入", e, e.clientX, e.target);
                                            showTitle(anTo, e.clientX, e.clientY, content);
                                        },
                                    },
                                ],
                            },
                            {
                                tag: "span",
                                properties: {
                                    textContent: pageIndex * pageSize - pageSize + index + 1 + "",
                                },
                            },
                        ],
                    },
                    {
                        tag: "div",
                        listeners: [
                            {
                                type: "click",
                                listener: (e: Event) => {
                                    e.stopPropagation();
                                    if (anTo.parentItemKey) openAnnotation(anTo.parentItemKey, anTo.annotationPageLabel, anTo.key);
                                },
                                options: { capture: true },
                            },
                        ],
                        children: [
                            {
                                tag: "div",
                                styles: {
                                    background: anTo.annotationColor + "60", //width: "200px",
                                    height: (docHeight - 120) / rowSize - 60 + "px",
                                    overflowY: "scroll",
                                },
                                properties: {
                                    innerHTML: (await getAnnotationContent(anTo)).replaceAll(
                                        `style="height:100px"><img`,
                                        `style="height:${(docHeight - 120) / rowSize - 60}px"><img`,
                                    ),
                                },
                            },
                            {
                                tag: "div",
                                styles: {
                                    background: anTo.annotationColor + "10", //width: "200px"
                                },
                                properties: {
                                    innerHTML:
                                        anTo
                                            .getTags()
                                            .map((a) => a.tag)
                                            .join(",") + getPublicationTags(anTo),
                                },
                            },
                        ],
                    },
                ],
            };
        });
        const children = await Promise.all(cs);
        ztoolkit.UI.appendElement(
            {
                tag: "div",
                namespace: "html",
                properties: {
                    // textContent: `总${annotations.length}条笔记，筛选出了${ans.length}条。预览前${showN}条。`,
                },
                styles: {
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "flex-start",
                    // columnCount: "4",
                    // columnGap: "10px ",
                    width: "100%",
                },
                children,
            },
            content,
        );
    }
}
export async function createChooseTagsDiv(doc: Document, collectionOrItem: "collection" | "item") {
    const selectedTags: string[] = [];
    const idTags = `${config.addonRef}-ann2note-ChooseTags-root-result`; //ID.result;
    const items = await getSelectedItems(collectionOrItem);
    const annotations = getAllAnnotations(items).flatMap((f) => f.tags.map((t6) => Object.assign(f, { tag: t6 })));
    const tags = groupBy(annotations, (a) => a.tag.tag);
    tags.sort(sortFixedTags10ValuesLength);

    const tagsTag: TagElementProps = {
        tag: "div",
        styles: { display: "flex", flexDirection: "column" },
        children: [
            {
                tag: "div",
                // children: ,
            },
            {
                tag: "div",
                id: idTags,
            },
        ],
    };
    const div = createTopDiv(doc, config.addonRef + `-TopDiv`, [
        { tag: "div", classList: ["action"] },
        { tag: "div", classList: ["query"] },
        { tag: "div", classList: ["status"] },
        { tag: "div", classList: ["content"] },
    ]);
    if (div) {
        const actionTag = createActionTag(div, () => {
            if (selectedTags.length > 0) {
                exportTagsNote(selectedTags, items);
                div?.remove();
            } else {
                exportTagsNote(
                    tags.map((a) => a.key),
                    items,
                );
            }
        }, [
            {
                tag: "button",
                namespace: "html",
                properties: { textContent: "-点击隐藏可选标签" },
                styles: { background: "#fff", padding: "6px" },
                listeners: [
                    {
                        type: "click",
                        listener: (ev: Event) => {
                            stopPropagation(ev);
                            const tp = toggleProperty((document.getElementById(idTags) as HTMLElement | undefined)?.style, "display", ["none", "flex"]);
                            setProperty(ev.target as HTMLButtonElement, "textContent", tp == "none" ? "+点击展开可选标签" : "-点击隐藏可选标签");
                        },
                    },
                ],
            },
        ]);
        const queryTag = {
            tag: "div",
            properties: { textContent: "tag" },
            children: [
                {
                    tag: "input",
                    namespace: "html",
                    listeners: [
                        {
                            type: "keyup",
                            listener: (ev: Event) => {
                                stopPropagation(ev);
                                const value = (ev.target as HTMLInputElement).value;
                                createTags(value.trim());
                            },
                        },
                    ],
                },
            ],
        };

        for (const action of actionTag) ztoolkit.UI.appendElement(action, div!.querySelector(".action")!);
        ztoolkit.UI.appendElement(tagsTag!, div!.querySelector(".content")!);
        ztoolkit.UI.appendElement(queryTag, div!.querySelector(".query")!);

        createTags();
    }
    return div;

    function createTags(searchTag: string = "") {
        if (!div) return;
        const content = div.querySelector(".content");
        if (!content) return;
        clearChild(content);
        ztoolkit.UI.appendElement(
            {
                tag: "div",
                styles: { display: "flex", flexWrap: "wrap" },
                id: idTags,
                children: tags
                    .filter((f) => new RegExp(searchTag, "i").test(f.key))
                    .slice(0, 300)
                    .map((t11) => ({
                        tag: "div",
                        properties: { textContent: `[${t11.values.length}]${t11.key}` },
                        styles: {
                            padding: "6px",
                            background: "#099",
                            margin: "1px",
                        },
                        listeners: [
                            {
                                type: "click",
                                listener: (ev: Event) => {
                                    stopPropagation(ev);
                                    const target = ev.target as HTMLDivElement;
                                    const index = selectedTags.findIndex((f) => f == t11.key);
                                    if (index == -1) {
                                        selectedTags.push(t11.key);
                                        target.style.background = "#a00";
                                    } else {
                                        selectedTags.splice(index, 1);
                                        target.style.background = "#099";
                                    }
                                },
                            },
                        ],
                    })),
            },
            content,
        );
    }
}
