/* global describe, it, Zotero */
describe("Zotero compatibility smoke test", function () {
  this.timeout(30000);

  it("loads the plugin and registers its UI", async function () {
    await Promise.all([Zotero.initializationPromise, Zotero.uiReadyPromise]);
    const plugin = Zotero.zoteroAnnotationManage;
    if (!plugin?.data.alive) throw new Error("Plugin failed to start");
    const win = Zotero.getMainWindow();
    if (!win?.document) throw new Error("Main window is unavailable");
    if (!plugin.data.ztoolkit) throw new Error("Toolkit is unavailable");
  });
});
