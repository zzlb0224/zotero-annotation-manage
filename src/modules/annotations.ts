

export class Annotations {
  initMenu() {
    if (Zotero.platformMajorVersion >= 102) {
      this.addMenus();
    }
  }
  addMenus() {
    Zotero.Reader.registerEventListener(
      "createAnnotationContextMenu",
      (event) => {
        const { reader, params, append } = event;
		addon.data.ztoolkit.log(event)
        const command = (label: string) =>
          function () {
			addon.data.ztoolkit.log(label)
            for (const id of params.ids) {
              const annotation = reader._item
                .getAnnotations()
                .filter(function (e) {
                  return e.key == id;
                })[0];
		// addon.data.ztoolkit.log(annotation)
              annotation.addTag(label, 0);
			  annotation.saveTx()
            }
          };
        for (const tag of [
          "研究目的",
          "研究假设",
          "研究框架",
          "数据来源",
          "研究方法",
          "研究理论",
        ]) {
          append({
            label: tag,
            onCommand: command(tag),
          });
        }
      },
    );
  }
}
 