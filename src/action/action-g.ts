// author geo123abc

//chrome/skin/default/zotero/itempane/20/attachment-annotations.svg

//"chrome://zotero/skin/itempane/20/notes.svg",
//chrome/skin/default/zotero/itempane/20/notes.svg
//@ts-ignore 111
const ztoolkit = Zotero.zoteroAnnotationManage.data.ztoolkit

//BetterNote 表示是 BetterNote 渲染方案
function registeredID_showAnnotations() {
    const registeredID_showAnnotations = Zotero.ItemPaneManager.registerSection({
        paneID: "custom-section-example",
        pluginID: "zoterotag@euclpts.com",
        header: {
            l10nID: "example-item-pane-header",
            icon: "chrome://zotero/skin/itempane/20/attachment-annotations.svg",
        },
        sidenav: {
            l10nID: "example-item-pane-header",
            icon: "chrome://zotero/skin/itempane/20/attachment-annotations.svg",
        },
        onRender: async ({ body, item, editable, tabType }) => { // 将 onRender 定义为异步函数

            //var selectedItems = ZoteroPane.getSelectedItems();
            //let item = selectedItems[0];
            //if (!item) return null; // 提前退出，如果没有选中的项

            const attachments = Zotero.Items.get(item.getAttachments()).filter((i) => i.isPDFAttachment() || i.isSnapshotAttachment() || i.isWebAttachment());
            if (attachments.length > 0) {
                const ans = attachments.flatMap(a => a.getAnnotations())
                body.innerHTML = `共${ans.length}条批注，加载时间：` + new Date().toLocaleTimeString()
                for (const ann of ans) {
                    appendAnnotation(body, ann)
                }
                return
            }
            let res = `<h1>${item.getField("title")}</h1>`;
            let allAnnotations = []; // 在函数作用域内声明数组来收集所有注释
            for (let attachment of attachments) {
                res += `<h2>@@@${attachment.getDisplayTitle()}</h2>`;
                const annotations = attachment.getAnnotations();
                allAnnotations.push(...annotations); // 使用扩展运算符将annotations数组的每个元素添加到allAnnotations数组中
            }
            const resHtml = await parseAnnotationHTML(allAnnotations);

            // body.textContent = res.html;  // textContent时，res文本如果太长，会导致zotero窗口太长
            // body.innerHTML = resHtml.html; //innerHTML无法渲染

        },
    });
}
function unregisteredID_showAnnotations() {
    return Zotero.ItemPaneManager.unregisterSection("zoterotag-euclpts-com-custom-section-example")
}
if (!unregisteredID_showAnnotations())
    registeredID_showAnnotations()

//@ts-ignore 类型定义
function appendAnnotation2(root, item) {

    ztoolkit.UI.appendElement({
        tag: "annotation-row", namespace: "MozXULElement",
        styles: {
            //@ts-ignore --annotation-color
            "--annotation-color": item.annotationColor
        },
        children: [
            {
                tag: "div", classList: ["head"], children: [
                    { tag: "image", classList: ["icon"], properties: { src: `chrome://zotero/skin/16/universal/annotate-${item.annotationType}.svg` } },
                    { tag: "div", classList: ["title"], properties: { textContent: `页 ${item.annotationPageLabel}` } },
                ]
            },
            {
                tag: "div", classList: ["body"], children: [
                    { tag: "div", classList: ["quote"], properties: { textContent: item.annotationText } },
                    { tag: "div", classList: ["comment"], properties: { textContent: item.annotationComment } },
                ]
            },
            { tag: "div", classList: ["tags"], properties: { textContent: item.getTags().map(a => a.tag).join(",") } },
        ]
    }, root)
}
//@ts-ignore 类型定义
function appendAnnotation(root, item) {
    const document = root.ownerDocument;
    let row = document.createXULElement('annotation-row');
    //@ts-ignore 类型定义
    row.annotation = item;
    //@ts-ignore style
    row.style = `--annotation-color: ${item.annotationColor}`
    root.appendChild(row)
    if (row) return;
    const head = document.createElement("div")
    head.classList.add("head")
    row.appendChild(head)

    const icon = document.createElement("image")
    icon.classList.add("icon")
    icon.setAttribute("src", `chrome://zotero/skin/16/universal/annotate-${item.annotationType}.svg`)
    head.appendChild(icon)

    const title = document.createElement("div")
    title.classList.add("title")
    title.textContent = `页 ${item.annotationPageLabel}`
    head.appendChild(title)

    const body = document.createElement("div")
    body.classList.add("body")
    row.appendChild(body)

    const quote = document.createElement("div")
    quote.classList.add("quote")
    quote.textContent = `${item.annotationText}`
    body.appendChild(quote)


    const comment = document.createElement("div")
    comment.classList.add("comment")
    comment.textContent = `${item.annotationComment}`
    body.appendChild(comment)

    const tags = document.createElement("div")
    tags.classList.add("tags")
    tags.textContent = `${item.getTags().map(a => a.tag).join(",")}`
    row.appendChild(tags)
}


async function getHtml() {
    var selectedItems = ZoteroPane.getSelectedItems();
    let item = selectedItems[0];
    //if (!item) return null; // 提前退出，如果没有选中的项

    const attachments = Zotero.Items.get(item.getAttachments()).filter((i) => i.isPDFAttachment() || i.isSnapshotAttachment() || i.isEPUBAttachment());
    let res = `<h1>${item.getField("title")}</h1>`;
    let allAnnotations = []; // 在函数作用域内声明数组来收集所有注释
    for (let attachment of attachments) {
        res += `<h2>@@@${attachment.getFilename()}</h2>`;
        const annotations = attachment.getAnnotations();
        allAnnotations.push(...annotations); // 使用扩展运算符将annotations数组的每个元素添加到allAnnotations数组中
    }
    res = await parseAnnotationHTML(allAnnotations);
    return res.html;
    //body.textContent = res;  // textContent时，res文本如果太长，会导致zotero窗口太长
    //body.innerHTML = res; //innerHTML无法渲染
}



async function parseAnnotationJSON(annotationItem) {
    try {
        if (!annotationItem || !annotationItem.isAnnotation()) {
            return null;
        }
        const annotationJSON = await Zotero.Annotations.toJSON(annotationItem);
        const annotationObj = Object.assign(
            {},
            annotationJSON
        );
        annotationObj.id = annotationItem.key;
        annotationObj.attachmentItemID = annotationItem.parentItem?.id;
        delete annotationObj.key;
        for (const key in annotationObj) {
            annotationObj[key] = annotationObj[key] || "";
        }
        annotationObj.tags = annotationObj.tags || [];
        return annotationObj;
    } catch (e2) {
        Zotero.logError(e2);
        return null;
    }
}

async function importAnnotationImagesToNote(note, annotations) {
    for (const annotation of annotations) {
        if (annotation.image && note) {
            delete annotation.image;
        }
    }
}
async function parseAnnotationHTML(annotations, options = {}) {
    const annotationJSONList = [];
    for (const annot of annotations) {
        const annotJson = await parseAnnotationJSON(annot);
        if (options.ignoreComment && annotJson?.comment) {
            annotJson.comment = "";
        }
        annotationJSONList.push(annotJson);
    }
    await importAnnotationImagesToNote(options.noteItem, annotationJSONList);
    return Zotero.EditorInstanceUtilities.serializeAnnotations(annotationJSONList, true);
}