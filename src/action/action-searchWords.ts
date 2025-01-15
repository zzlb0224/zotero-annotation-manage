//@ts-nocheck  用于脚本测试
export async function searchWords(item?: Zotero.Item, items?: Zotero.Item[]) {
  if (!item) return;
  let currentPage: HTMLDivElement;

  //
  await (async function () {
    const ztoolkit = Zotero.zoteroAnnotationManage.data.ztoolkit;
    function waitUtilAsync(condition = () => true, interval = 100, timeout = 10000) {
      return new Promise((resolve, reject) => {
        const start = Date.now();
        const intervalId = ztoolkit.getGlobal("setInterval")(() => {
          if (condition()) {
            ztoolkit.getGlobal("clearInterval")(intervalId);
            resolve(1);
          } else if (Date.now() - start > timeout) {
            ztoolkit.getGlobal("clearInterval")(intervalId);
            reject();
          }
        }, interval);
      });
    }
    const findText = ["and", "of"];
    const r = Zotero.Reader.getByTabID(Zotero.getMainWindow().Zotero_Tabs.selectedID);

    const pv = r._primaryView;
    //@ts-ignore _iframe
    const doc = pv._iframe.contentDocument;
    const pages = [...doc.querySelectorAll(".page")];
    currentPage = pages.filter((page) => page.getBoundingClientRect().top <= 0 && page.getBoundingClientRect().bottom > 0)[0];
    //@ts-ignore _findState
    const _findState = pv._findState;
    if (!_findState.popupOpen) r.toggleFindPopup();
    _findState.query = "and";
    _findState.highlightAll = true;

    pv.findNext();
    let found = [...currentPage.querySelectorAll(".highlight")];
    await waitUtilAsync(
      () => {
        if (found.length == currentPage.querySelectorAll(".highlight").length) {
          if (found.length > 0 && found.every((a) => a.getBoundingClientRect().bottom - a.getBoundingClientRect().top > 0)) {
            return true;
          }
        }
        found = [...currentPage.querySelectorAll(".highlight")];
        return false;
      },
      500,
      2100,
    );
    pv.findPrevious();
    found = [...currentPage.querySelectorAll(".highlight")];
    const pageClient = currentPage.getBoundingClientRect();
    const fClients = found.map((a) => a.getBoundingClientRect());
    //@ts-ignore setFindState
    // pv.setFindState({})
    console.log(pageClient, fClients);
    for (let index = 0; index < fClients.length; index++) {
      const client = fClients[index];
      const u = ztoolkit.UI.appendElement(
        {
          tag: "div",
          styles: {
            position: "absolute",
            top: client.top - pageClient.top + "px",
            left: client.left - pageClient.left + "px",
            background: "#f00",
          },
          properties: { textContent: "and" },
        },
        currentPage,
      );
      ztoolkit.log(u);
    }
  })();
}
