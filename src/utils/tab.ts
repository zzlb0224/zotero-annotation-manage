import { config } from "../../package.json";
export class Tab {
  tab?: { id: string; container: XUL.Box } = undefined;
  browser!: HTMLIFrameElement & {
    reload: () => void;
    loadURI: (url: string, args: any) => void;
    attachEvent: any;
  }; //是否为空总和tab一样
  private onLoad?: (doc: Document) => void = undefined;
  reload() {
    if (this.tab) {
      this.browser.reload();
    }
  }
  close() {
    if (this.tab) {
      Zotero_Tabs.close(this.tab.id);
      this.tab = undefined;
    }
  }
  constructor(url: string, title: string, onLoad?: (doc: Document) => void) {
    this.onLoad = onLoad;
    if (this.tab) {
      const index = Zotero_Tabs._getTab(this.tab.id).tabIndex;
      Zotero_Tabs._tabs[index]["title"] = "new Tab - " + title;

      this.browser.loadURI(url, {
        triggeringPrincipal:
          Services.scriptSecurityManager.getSystemPrincipal(),
      });
    } else {
      this.tab = Zotero_Tabs.add({
        type: config.addonInstance,
        title: title,
        data: {},
        select: false,
        onClose: () => {
          this.tab = undefined;
        },
      });
      const document = this.tab.container.ownerDocument;
      const iframe = Zotero.createXULElement(document, "browser");
      this.tab.container.appendChild(iframe);
      iframe.setAttribute("class", "reader");
      iframe.setAttribute("flex", "1");
      iframe.setAttribute("type", "content");
      this.browser = iframe;
      this.loaded();
      iframe.loadURI(url, {
        triggeringPrincipal:
          Services.scriptSecurityManager.getSystemPrincipal(),
      });
    }
    Zotero_Tabs.select(this.tab.id);
  }
  private loaded() {
    setTimeout(() => {
      if (
        this.browser.contentDocument &&
        this.browser.contentDocument.querySelector("#tab-page-body")
      ) {
        ztoolkit.log("tab加载完成");
        if (this.onLoad) this.onLoad(this.browser.contentDocument);
      } else {
        this.loaded();
      }
    }, 5);
  }
}
