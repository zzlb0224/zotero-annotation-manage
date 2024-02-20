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
        const command = (label: string) =>
          function () {
            for (const id of params.ids) {
              const annotation = reader._item
                .getAnnotations()
                .filter(function (e) {
                  return e.key == id;
                })[0];
              annotation.addTag(label, 0);
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
