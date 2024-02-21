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

  private renderTextSelectionPopup(
    event: _ZoteroTypes.Reader.EventParams<"renderTextSelectionPopup">,
  ) {
    const { append, reader, doc, params } = event;
    addon.data.ztoolkit.log(
      "renderTextSelectionPopup show",
      event,
      event.params.annotation.tags,
    );

    if (doc.getElementById(`${config.addonRef}-reader-div`))
      doc
        .getElementById(`${config.addonRef}-reader-div`)
        ?.parentElement?.remove();
    const actions = TAGS.map((label) => ({
      tag: "span",
      namespace: "html",
      properties: { textContent: label },
      styles: {
        margin: "2px",
        padding: "2px",
      },
      listeners: [
        {
          type: "click",
          listener: (ev: Event) => {
            // const color='#ffd400'
            const color = "#e56eee";
            const tags = [{ name: label }];
            reader._annotationManager.addAnnotation(
              Components.utils.cloneInto(
                { ...params.annotation, color, tags },
                doc,
              ),
            );
            //@ts-ignore aaa
            reader._primaryView._onSetSelectionPopup(null);
          },
        },
      ],
    }));
    append(
      ztoolkit.UI.createElement(doc, "div", {
        namespace: "html",
        id: `${config.addonRef}-reader-div`,
        classList: ["toolbarButton", `${config.addonRef}-reader-div`],
        properties: {
          tabIndex: -1,
        },
        styles: {
          display: "flex",
          flexWrap: "wrap",
          width: "calc(100% - 4px)",
          marginLeft: "2px",
          justifyContent: "space-start",
        },
        children: actions,
      }),
    );
  }
  private createAnnotationContextMenu(
    event: _ZoteroTypes.Reader.EventParams<"createAnnotationContextMenu">,
  ) {
    const { reader, params, append } = event;

    const command = (label: string) =>
      function () {
        addon.data.ztoolkit.log(label);
        for (const id of params.ids) {
          const annotation = reader._item.getAnnotations().filter(function (e) {
            return e.key == id;
          })[0];
          addon.data.ztoolkit.log("增加标签", label, annotation);
          annotation.addTag(label, 0);
          annotation.saveTx();
        }
      };
    const annotations = reader._item
      .getAnnotations()
      .filter((f) => params.ids.includes(f.key));

    const tags = TAGS.filter(
      (f) => annotations.filter((a) => !a.hasTag(f)).length > 0,
    );
    // ztoolkit.log(tags);

    append({
      label: "添加标签",
      onCommand: () => {
        ztoolkit.log("测试添加标签");
        const doc = reader._iframeWindow?.document;
        if (doc) {
          const d = ztoolkit.UI.createElement(doc, "div", {
            namespace: "html",
            classList: ["toolbarButton", `${config.addonRef}-reader-div`],
            properties: {
              tabIndex: -1,
              innerHTML: "新div",
            },
            styles: {
              position: "fixed",
              left: params.x + "px",
              top: params.y + "px",
              display: "flex",
              flexWrap: "wrap",
              // width: "calc(100% - 4px)",
              marginLeft: "2px",
              justifyContent: "space-start",
              background: "#fff",
              border: "red",
            },
          });
          doc.body.appendChild(d);
          setTimeout(() => d.remove(), 10000);
        }
      },
    });
    // for (const tag of tags) {
    //   append({
    //     label: tag,
    //     onCommand: command(tag),
    //   });
    // }
  }
}
