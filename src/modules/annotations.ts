import { config } from "../../package.json";
const TAGS = [
  "研究目的",
  "研究假设",
  "研究框架",
  "数据来源",
  "研究方法",
  "研究理论",
];
const ANNOTATION_COLORS = [
  "#ffd400",
  "#ff6666",
  "#5fb236",
  "#2ea8e5",
  "#a28ae5",
  "#e56eee",
  "#f19837",
  "#aaaaaa",
];
function register() {
  // ztoolkit.UI.basicOptions.log.disableZLog = true;
  ztoolkit.log("Annotations register");
  Zotero.Reader.registerEventListener(
    "renderTextSelectionPopup",
    renderTextSelectionPopup,
  );

  Zotero.Reader.registerEventListener(
    "createAnnotationContextMenu",
    createAnnotationContextMenu,
  );
}
function unregister() {
  ztoolkit.log("Annotations unregister");
  Zotero.Reader.unregisterEventListener(
    "renderTextSelectionPopup",
    renderTextSelectionPopup,
  );
  Zotero.Reader.unregisterEventListener(
    "createAnnotationContextMenu",
    createAnnotationContextMenu,
  );
}
function getCollections(collections: Zotero.Collection[]): Zotero.Collection[] {
  function getChildCollections(
    collections: Zotero.Collection[],
  ): Zotero.Collection[] {
    const cs = unique(collections).flatMap((a) => a.getChildCollections(false));
    if (cs.length == 0) return collections;
    return [...cs, ...getChildCollections(cs)];
  }
  return unique([...collections, ...getChildCollections(collections)]);
}
function relateTags(item: Zotero.Item) {
  const recursiveCollections = !!Zotero.Prefs.get("recursiveCollections");
  const cid = ZoteroPane.getSelectedCollection(true);

  const collectionIds = item.parentItem
    ? item.parentItem.getCollections()
    : item.getCollections();
  const currCollections = Zotero.Collections.get(
    cid ? [cid, ...collectionIds] : collectionIds,
  ) as Zotero.Collection[];
  const collections = recursiveCollections
    ? getCollections(currCollections)
    : currCollections;

  return getTagsInCollections(collections);
}
function unique(arr: any[]) {
  const arrry = [] as any[];
  const obj = {} as { [key: string]: number };
  for (let i = 0; i < arr.length; i++) {
    if (!obj[arr[i].key]) {
      arrry.push(arr[i]);
      obj[arr[i].key] = 1;
    } else {
      obj[arr[i].key]++;
    }
  }
  return arrry;
}

function getTagsInCollections(collections: Zotero.Collection[]) {
  const pdfIds = collections
    .flatMap((c) => c.getChildItems())
    .flatMap((a) => a.getAttachments(false));
  const pdfs = Zotero.Items.get(pdfIds).filter(
    (f) => f.isFileAttachment() && f.isAttachment(),
  );
  const anns = pdfs.flatMap((f) => f.getAnnotations(false));
  //.sort((a, b) => (a.dateModified < b.dateModified ? 1 : -1))
  //.slice(0,100)
  const tags = anns.flatMap((f) => f.getTags());
  return tags;
}
function sortTags(
  tags: Array<{ tag: string; type: number }>,
  includeTAGS = false,
) {
  let tagDict = tags.reduce(
    (o, f) => {
      o[f.tag] = o[f.tag] ? o[f.tag] + 1 : 1;
      return o;
    },
    {} as { [key: string]: number },
  );
  if (includeTAGS) {
    const tagDict1 = TAGS.reduce(
      (o, f) => {
        o[f] = 0;
        return o;
      },
      {} as { [key: string]: number },
    );
    tagDict = Object.assign({}, tagDict1, tagDict);
  }

  return Object.keys(tagDict)
    .map((k) => ({
      tag: k,
      count: tagDict[k],
    }))
    .sort((a, b) => {
      if (TAGS.includes(a.tag) && TAGS.includes(b.tag)) {
        return TAGS.indexOf(a.tag) - TAGS.indexOf(b.tag);
      }
      if (TAGS.includes(a.tag)) {
        return -1;
      }
      if (TAGS.includes(b.tag)) {
        return 1;
      }
      //return b.tag > a.tag ? -1 : 1;
      return b.count - a.count + (b.tag > a.tag ? -0.5 : 0.5);
    });
}

function createDiv(
  doc: Document,
  reader: _ZoteroTypes.ReaderInstance,
  params: any, // { annotation?: any; ids?: string[]; currentID?: string; x?: number; y?: number; },
) {
  //todo doc 参数都是从reader里面出来的？那么这个参数是不是就没必要了，有待测试
  // if (doc.getElementById(`${config.addonRef}-reader-div`))
  if (
    doc.getElementById(`${config.addonRef}-reader-div`)?.parentElement
      ?.nodeName == "BODY"
  )
    doc.getElementById(`${config.addonRef}-reader-div`)?.remove();
  else
    doc
      .getElementById(`${config.addonRef}-reader-div`)
      ?.parentElement?.remove();
  const tags = sortTags(relateTags(reader._item), true);
  const annotations = params.ids
    ? reader._item.getAnnotations().filter((f) => params.ids.includes(f.key))
    : [];
  const max = Math.max(...tags.map((a) => a.count));
  const min = Math.min(...tags.map((a) => a.count));

  const children = tags.map((label) => {
    const allHave =
      annotations.length > 0 && annotations.every((a) => a.hasTag(label.tag));
    const noneHave =
      annotations.length == 0 || annotations.every((a) => !a.hasTag(label.tag));
    const someHave =
      annotations.filter((a) => a.hasTag(label.tag)).length +
      "/" +
      annotations.length;
    let color = "#f19837";
    if (TAGS.includes(label.tag)) {
      color = ANNOTATION_COLORS[TAGS.indexOf(label.tag)];
    }

    return {
      tag: "span",
      namespace: "html",
      classList: ["toolbarButton1"],
      properties: {
        textContent: `${allHave ? "[x]" : noneHave ? "" : `[${someHave}]`}[${label.count}]${label.tag}`,
      },
      styles: {
        margin: "2px",
        padding: "2px",
        background: TAGS.includes(label.tag) ? color : "",
        // fontSize: ((label.count-min)/(max-min)*10+15).toFixed()+ "px",
        fontSize: "20px",
        boxShadow: "#999999 0px 0px 3px 3px",
      },
      listeners: [
        {
          type: "click",
          listener: (e: Event) => {
            ztoolkit.log("增加标签", label, params, e);
            if (params.ids) {
              for (const id of params.ids) {
                const annotation = reader._item
                  .getAnnotations()
                  .filter(function (e) {
                    return e.key == id;
                  })[0];
                if (allHave) {
                  //全部都有则删除
                  annotation.removeTag(label.tag);
                } else {
                  //部分有则添加
                  if (!annotation.hasTag(label.tag)) {
                    annotation.addTag(label.tag, 0);
                  }
                }
                annotation.saveTx(); //增加每一个都要保存，为啥不能批量保存？
              }
              div?.remove();
            } else {
              // Zotero.Tags.getColorByPosition()
              Array.from({ length: 10 }).map((e, i) =>
                Zotero.Tags.getColorByPosition(1, i),
              );
              const tags = [{ name: label.tag }];
              //因为线程不一样，不能采用直接修改params.annotation的方式，所以直接采用新建的方式保存笔记
              //特意采用 Components.utils.cloneInto 方法
              reader._annotationManager.addAnnotation(
                Components.utils.cloneInto(
                  { ...params.annotation, color, tags },
                  doc,
                ),
              );
              //@ts-ignore 隐藏弹出框
              reader._primaryView._onSetSelectionPopup(null);
            }
          },
        },
      ],
    };
  });
  const styleForExistAnno = {
    zIndex: "99990",
    position: "fixed",
    top: params.y + "px",
    left: params.x + "px", //只有左边需要改，其它的固定
  };
  const pvDoc =
    (doc.querySelector("#primary-view iframe") as HTMLIFrameElement)
      ?.contentDocument || doc;
  /*
  const doc=Zotero.Reader._readers[0]._iframeWindow.document;
  const pvDoc=doc.querySelector("#primary-view iframe").contentDocument;
  const viewer=pvDoc.querySelector("#viewer");
  const scaleFactor =viewer.style.getPropertyValue("--scale-factor");
  const zoom = parseFloat(scaleFactor) || 1; 

  parseFloat(Zotero.Reader._readers[0]._iframeWindow.document.querySelector("#primary-view iframe").contentDocument.querySelector("#viewer").style.getPropertyValue("--scale-factor")||0)||1
 */

  const scaleFactor = (
    pvDoc.querySelector("#viewer") as HTMLElement
  )?.style.getPropertyValue("--scale-factor");
  const zoom = parseFloat(scaleFactor) || 1;

  const clientWidthWithSlider = doc.body.clientWidth; //包括侧边栏的宽度
  const clientWidth2 = pvDoc.body.clientWidth; //不包括侧边栏的宽度
  let maxWidth = Math.min(clientWidth2, 444 * zoom);
  let centerX = 0;
  if (params.ids) {
    //对已有标签处理
    if (params.x > clientWidthWithSlider - 666) {
      styleForExistAnno.left = clientWidthWithSlider - 666 - 23 + "px";
      maxWidth = Math.min(666, clientWidthWithSlider);
    }
  } else {
    centerX =
      ((params.annotation?.position?.rects[0][0] +
        params.annotation?.position?.rects[0][2]) *
        zoom) /
      2;
    maxWidth = Math.min(centerX, clientWidth2 - centerX) * 2 - 23;
    if (maxWidth > 444 * zoom) {
      maxWidth = 444 * zoom;
    }
  }

  const div = ztoolkit.UI.createElement(doc, "div", {
    namespace: "html",
    id: `${config.addonRef}-reader-div`,
    classList: ["toolbar1", `${config.addonRef}-reader-div`],
    properties: {
      tabIndex: -1,
    },
    styles: Object.assign(
      {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        padding: "2px 5px",
        marginLeft: "2px",
        // width: "calc(100% - 4px)",
        maxWidth: maxWidth + "px",
        justifyContent: "space-start",
        background: "#eeeeee",
        border: "#cc9999",
        // boxShadow: "#666666 0px 0px 6px 4px",
        overflowY: "scroll",
        maxHeight: "400px",
      },
      params.ids ? styleForExistAnno : {},
    ),
    children: children,
  });

  ztoolkit.log(
    "params",
    params?.x,
    params.annotation?.position?.rects[0],
    clientWidthWithSlider,
    clientWidth2,
    "maxWidth",
    maxWidth,
    styleForExistAnno,
    zoom,
    centerX,
    clientWidth2 - centerX,
  );
  return div;
}
function renderTextSelectionPopup(
  event: _ZoteroTypes.Reader.EventParams<"renderTextSelectionPopup">,
) {
  const { append, reader, doc, params } = event;
  // ztoolkit.log(
  //   "renderTextSelectionPopup show",
  //   event,
  //   event.params.annotation.tags,
  // );
  const div = createDiv(doc, reader, params);
  append(div);
}
function createAnnotationContextMenu(
  event: _ZoteroTypes.Reader.EventParams<"createAnnotationContextMenu">,
) {
  const { reader, params, append } = event;
  const doc = reader._iframeWindow?.document;
  if (!doc) return;
  //这里不能用异步
  const annotations = reader._item
    .getAnnotations()
    .filter((f) => params.ids.includes(f.key));
  const tags = sortTags(annotations.flatMap((f) => f.getTags()));

  const hasTags = tags.map((f) => `${f.tag}[${f.count}]`).join(",");
  const label = hasTags ? `添加标签，已有【${hasTags}】` : "添加标签";

  append({
    label: label,
    onCommand: () => {
      // ztoolkit.log("测试添加标签");
      const div = createDiv(doc, reader, params);
      doc.body.appendChild(div);
      setTimeout(() => div?.remove(), 10000);
    },
  });
}

export default { register, unregister };
