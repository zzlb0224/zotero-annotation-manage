import {
  ElementProps,
  FragmentElementProps,
  HTMLElementProps,
} from "zotero-plugin-toolkit/dist/tools/ui";
import { config } from "../../package.json";
import {
  ANNOTATION_COLORS,
  TAGS,
  getCollections,
  sortByTAGs,
  groupBy,
  groupByResult,
} from "../utils/zzlb";
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
function getTagsInCollections(collections: Zotero.Collection[]) {
  const pdfIds = collections
    .flatMap((c) => c.getChildItems())
    .filter((f) => !f.isAttachment())
    .flatMap((a) => a.getAttachments(false)); //为啥会出现
  const pdfItems = Zotero.Items.get(pdfIds).filter(
    (f) => f.isFileAttachment() && f.isAttachment(),
  );
  const annotations = pdfItems.flatMap((f) => f.getAnnotations(false));
  //.sort((a, b) => (a.dateModified < b.dateModified ? 1 : -1))
  //.slice(0,100)
  const tags = annotations.flatMap((f) => f.getTags());
  return tags;
}
function includeTAGS<T>(tagGroup: groupByResult<T>[]) {
  TAGS.forEach((tag) => {
    if (tagGroup.findIndex((f) => f.key == tag) == -1) {
      tagGroup.push({ key: tag, values: [] });
    }
  });
  return tagGroup;
}
function getLeftTop(temp4: HTMLElement) {
  try {
    let t1 = temp4;
    let left = 0;
    let top = 0;
    const width = temp4.clientWidth;
    const height = temp4.clientHeight;
    while (t1) {
      for (const k in t1.style) {
        const v = t1.style[k];
        if (k == "transform" && v) {
          //没有附加到Dom无法调用 new WebKitCSSMatrix，只能这样使用
          ("translate(26.0842px, 108.715px)");
          const translateLeftTop = v.match(
            /translate[(]([\d.]*)px,\s?([\d.]*)px[)]/,
          );
          //['translate(26.0842px, 108.715px)', '26.0842', '108.715', index: 0, input: 'translate(26.0842px, 108.715px)', groups: undefined]
          if (translateLeftTop && translateLeftTop.length > 2) {
            left += parseFloat(translateLeftTop[1]);
            top += parseFloat(translateLeftTop[2]);
          }
        }
      }
      left += t1.offsetLeft;
      top += t1.offsetTop;
      if (!t1.parentElement || t1.nodeName == "HTML" || t1.nodeName == "BODY")
        break;
      t1 = t1.parentElement;
    }
    const viewer = t1.querySelector("#primary-view iframe") || ({} as any);
    const { clientWidth, clientHeight } = viewer;
    return { left, top, width, height, clientWidth, clientHeight };
  } catch (error) {
    ztoolkit.log("无法计算", error);
    return false;
  }
}
function createDiv(
  doc: Document,
  reader: _ZoteroTypes.ReaderInstance,
  params: any, // { annotation?: any; ids?: string[]; currentID?: string; x?: number; y?: number; },
) {
  //TODO doc 参数都是从reader里面出来的？那么这个参数是不是就没必要了，有待测试
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
  const tags1 = groupBy(relateTags(reader._item), (t) => t.tag);
  includeTAGS(tags1);
  tags1.sort(sortByTAGs);
  const annotations = params.ids
    ? reader._item.getAnnotations().filter((f) => params.ids.includes(f.key))
    : [];
  const children = tags1.map((label) => {
    const allHave =
      annotations.length > 0 && annotations.every((a) => a.hasTag(label.key));
    const noneHave =
      annotations.length == 0 || annotations.every((a) => !a.hasTag(label.key));
    const someHave =
      annotations.filter((a) => a.hasTag(label.key)).length +
      "/" +
      annotations.length;
    let color = "#f19837";
    if (TAGS.includes(label.key)) {
      color = ANNOTATION_COLORS[TAGS.indexOf(label.key)];
    }
    return {
      tag: "span",
      namespace: "html",
      classList: ["toolbarButton1"],
      properties: {
        textContent: `${allHave ? "[x]" : noneHave ? "" : `[${someHave}]`}[${label.values.length}]${label.key}`,
      },
      styles: {
        margin: "2px",
        padding: "2px",
        background: TAGS.includes(label.key) ? color : "",
        // fontSize: ((label.count-min)/(max-min)*10+15).toFixed()+ "px",
        fontSize:
          Zotero.Prefs.get(
            `extensions.zotero.ZoteroPDFTranslate.fontSize`,
            true,
          ) + "px",
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
                  annotation.removeTag(label.key);
                } else {
                  //部分有则添加
                  if (!annotation.hasTag(label.key)) {
                    annotation.addTag(label.key, 0);
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
              const tags = [{ name: label.key }];
              // 因为线程不一样，不能采用直接修改params.annotation的方式，所以直接采用新建的方式保存笔记
              // 特意采用 Components.utils.cloneInto 方法
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
  }) as FragmentElementProps;
  const styleForExistAnno = {
    zIndex: "99990",
    position: "fixed",
    top: params.y + "px",
    left: params.x + "px", //只有左边需要改，其它的固定
  };
  const pvDoc =
    (doc.querySelector("#primary-view iframe") as HTMLIFrameElement)
      ?.contentDocument || doc;
  /* 测试宽度
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
    // maxWidth = Math.min(centerX, clientWidth2 - centerX) * 2 - 23;
  }
  const styles = Object.assign(
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
  );
  const div = ztoolkit.UI.createElement(doc, "div", {
    namespace: "html",
    id: `${config.addonRef}-reader-div`,
    classList: ["toolbar1", `${config.addonRef}-reader-div`],
    properties: {
      tabIndex: -1,
    },
    styles,
    children: children,
    //
  } as any);
  const { x, y } = params;
  const rect = params.annotation?.position?.rects;
  ztoolkit.log("params", {
    x,
    y,
    rect,
    clientWidthWithSlider,
    clientWidth2,
    maxWidth,
    zoom,
    centerX,
  });
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
  setTimeout(() => updateDivWidth(div), 1000);
  append(div);
}
function updateDivWidth(div: HTMLElement, n = 3) {
  //TODO 这样更新大小好像没起到效果。估计还要换个思路
  if (n < 0) return;
  if (!div.parentElement || div.ownerDocument == null) {
    setTimeout(() => updateDivWidth(div, n - 1), 1000);
    return;
  }
  const leftTop = getLeftTop(div);

  // ztoolkit.log(div.clientWidth, d, n);
  if (!leftTop || !leftTop.clientWidth) {
    setTimeout(() => updateDivWidth(div, n - 1), 1000);
    return;
  }
  const centerX = div.clientWidth / 2 + leftTop.left;
  if (centerX > 0) {
    const maxWidth =
      Math.min(centerX, leftTop.clientWidth - centerX) * 2 + "px";
    // div.style.setProperty("max-width", maxWidth);
    // div.style.maxWidth = maxWidth;
    ztoolkit.log(
      "updateDivWidth",
      // div.style,
      { centerX, maxWidth, n },
      leftTop,
    );
  }
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
  const tags1 = groupBy(
    annotations.flatMap((f) => f.getTags()),
    (t) => t.tag,
  ).sort(sortByTAGs);
  const hasTags = tags1.map((f) => `${f.key}[${f.values.length}]`).join(",");
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
export default { TAGS, register, unregister };
