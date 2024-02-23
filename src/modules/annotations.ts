import { config } from "../../package.json";
const TAGS = [
  "研究目的",
  "研究假设",
  "研究框架",
  "数据来源",
  "研究方法",
  "研究理论",
];
export class Annotations {
  register() {
    ztoolkit.UI.basicOptions.log.disableZLog = true;
    ztoolkit.log("Annotations register");
    Zotero.Reader.registerEventListener(
      "renderTextSelectionPopup",
      this.renderTextSelectionPopup,
    );

    Zotero.Reader.registerEventListener(
      "createAnnotationContextMenu",
      this.createAnnotationContextMenu,
    );
  }
  unregister() {
    ztoolkit.log("Annotations unregister");
    Zotero.Reader.unregisterEventListener(
      "renderTextSelectionPopup",
      this.renderTextSelectionPopup,
    );
    Zotero.Reader.unregisterEventListener(
      "createAnnotationContextMenu",
      this.createAnnotationContextMenu,
    );
  }
  static relateTags(item: Zotero.Item) {
    const collectionIds = item.parentItem
      ? item.parentItem.getCollections()
      : item.getCollections();
    const collections = Zotero.Collections.get(
      collectionIds,
    ) as Zotero.Collection[];
    const itemsInSameCollections = collections.flatMap((c) =>
      c.getChildItems(),
    );
    const pdfIds = itemsInSameCollections.flatMap((a) =>
      a.getAttachments(false),
    );
    const pdfs = Zotero.Items.get(pdfIds).filter(
      (f) => f.isFileAttachment() && f.isAttachment(),
    );

    const anns = pdfs
      .flatMap((f) => f.getAnnotations(false))
      .sort((a, b) => (a.dateModified < b.dateModified ? 1 : -1)); //.slice(0,100);

    const tagDict = {} as { [key: string]: number };
    for (const t of anns.flatMap((f) => f.getTags()).map((f) => f.tag)) {
      if (TAGS.includes(t)) continue;
      tagDict[t] = tagDict[t] ? tagDict[t] + 1 : 1;
    }
    const tags3 = Object.keys(tagDict).map((k) => ({
      tag: k,
      count: tagDict[k],
    }));
    return tags3;
  }

  static createDiv(
    doc: Document,
    reader: _ZoteroTypes.ReaderInstance,
    params: any, // { annotation?: any; ids?: string[]; currentID?: string; x?: number; y?: number; },
  ) {
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
    const tags2 = Annotations.relateTags(reader._item).map((a) => a.tag);
    let tags = [...TAGS, ...tags2];
    if (params.ids) {
      const annotations = reader._item
        .getAnnotations()
        .filter((f) => params.ids.includes(f.key));
      tags = tags.filter(
        (f) => annotations.filter((a) => !a.hasTag(f)).length > 0,
      );
    }
    const children = tags.map((label) => ({
      tag: "span",
      namespace: "html",
      classList: ["toolbarButton1"],
      properties: { textContent: label },
      styles: {
        margin: "2px",
        padding: "2px",
        fontSize: "18px",
        boxShadow: "#aaaaaa 0px 0px 3px 3px",
      },
      listeners: [
        {
          type: "click",
          listener: () => {
            // ztoolkit.log("增加标签", label, params);
            if (params.ids) {
              for (const id of params.ids) {
                const annotation = reader._item
                  .getAnnotations()
                  .filter(function (e) {
                    return e.key == id;
                  })[0];
                annotation.addTag(label, 0);
                annotation.saveTx();
              }
              div?.remove();
            } else {
              // const color='#ffd400'
              const color = "#e56eee";
              const tags = [{ name: label }];
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
    }));
    const ids = {
      zIndex: "99990",
      position: "fixed",
      top: params.y + "px",
      left: params.x + "px",
    };
    const pvDoc =
      (doc.querySelector("#primary-view iframe") as HTMLIFrameElement)
        ?.contentDocument || doc;

    const clientWidth2 = pvDoc.body.clientWidth;
    const clientWidth1 = doc.body.clientWidth;

    let maxWidth = Math.min(clientWidth2, 1200);

    // const zoom=clientWidth1/clientWidth2
    const scaleFactor = (
      pvDoc.querySelector("#viewer") as HTMLElement
    )?.style.getPropertyValue("--scale-factor");
    const zoom = parseInt(scaleFactor) || 1;

    if (params.ids) {
      //对已有标签处理
      if (params.x > clientWidth1 - 600) {
        ids.left = clientWidth1 - 600 - 20 + "px";
      }
    } else {
      const x = params.annotation?.position?.rects[0][0] * zoom;
      maxWidth = Math.min(x, clientWidth2 - x) * 2 - 20;

      // ztoolkit.log(
      //   params.annotation?.position?.rects[0][0],
      //   zoom,
      //   x,
      //   clientWidth2,
      //   clientWidth2 - x,
      //   maxWidth,
      // );
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
        },
        params.ids ? ids : {},
      ),
      children: children,
    });

    ztoolkit.log(
      "params",
      params?.x,
      params.annotation?.position?.rects[0],
      clientWidth1,
      clientWidth2,
      "maxWidth",
      maxWidth,
      ids,
    );
    return div;
  }
  private renderTextSelectionPopup(
    event: _ZoteroTypes.Reader.EventParams<"renderTextSelectionPopup">,
  ) {
    const { append, reader, doc, params } = event;
    // ztoolkit.log(
    //   "renderTextSelectionPopup show",
    //   event,
    //   event.params.annotation.tags,
    // );
    const div = Annotations.createDiv(doc, reader, params);
    append(div);
  }
  private createAnnotationContextMenu(
    event: _ZoteroTypes.Reader.EventParams<"createAnnotationContextMenu">,
  ) {
    const { reader, params, append } = event;
    const doc = reader._iframeWindow?.document;
    if (!doc) return;
    const annotations = reader._item
      .getAnnotations()
      .filter((f) => params.ids.includes(f.key));
    const hasTags = TAGS.filter(
      (f) =>
        annotations.filter((a) => a.hasTag(f)).length == annotations.length,
    ).join(",");
    const hasTagsStr = hasTags ? `,已有【${hasTags}】` : "";

    append({
      label: `添加标签${hasTagsStr}`,
      onCommand: () => {
        // ztoolkit.log("测试添加标签");
        const div = Annotations.createDiv(doc, reader, params);

        doc.body.appendChild(div);
        setTimeout(() => div?.remove(), 10000);
      },
    });
  }
}
