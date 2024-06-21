import { config } from "../../package.json";
import { waitFor } from "./wait";
export class Tab {
  tab?: { id: string; container: XUL.Box } = undefined;
  browser!: HTMLIFrameElement & {
    reload: () => void;
    loadURI: (url: string, args: any) => void;
    attachEvent: any;
  }; //是否为空总和tab一样
  private onLoad?: (doc: Document) => void = undefined;
  document?: Document;
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
        triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
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
      const iframe = ztoolkit.UI.createXULElement(document, "browser") as any;
      this.tab.container.appendChild(iframe);
      iframe.setAttribute("class", "reader");
      iframe.setAttribute("flex", "1");
      iframe.setAttribute("type", "content");
      iframe.setAttribute("src", url);
      this.browser = iframe;
      // ztoolkit.log("222", url);
      this.loaded();

      try {
        iframe.loadURI(url, {
          triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),
        });
      } catch (e) {
        ztoolkit.log("loadURI 错误修复了吗？");
        iframe.src = url;
      }

      // ztoolkit.log("333");
    }
    Zotero_Tabs.select(this.tab.id);
  }
  private loaded(n = 100) {
    // ztoolkit.log("tab加载检测");
    setTimeout(() => {
      if (this.browser.contentDocument && this.browser.contentDocument.querySelector("#tab-page-body")) {
        this.document = this.browser.contentDocument;
        ztoolkit.log("tab加载完成");
        if (this.onLoad) this.onLoad(this.browser.contentDocument);
      } else {
        this.loaded(n - 1);
      }
    }, 100);
  }
}
