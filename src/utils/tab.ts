import { config } from "../../package.json";
export class Tab {
  tab: any;
  iframe: any;
  reload() {
    if (this.tab != null) {
      this.iframe.reload();
    }
  }
  close() {
    Zotero_Tabs.close(this.tab.id);
    this.tab = null;
  }
  constructor(url: string, title: string) {
    if (this.tab == null) {
      this.tab = Zotero_Tabs.add({
        type: config.addonInstance,
        title: "new Tab - " + title,
        data: {},
        select: false,
        onClose: () => {
          this.tab = null;
        },
      });

      const document = this.tab.container.ownerDocument;
      const iframe = Zotero.createXULElement(document, "browser");
      this.tab.container.appendChild(iframe);
      iframe.setAttribute("class", "reader");
      iframe.setAttribute("flex", "1");
      iframe.setAttribute("type", "content");
      iframe.loadURI(url, {
        triggeringPrincipal:
          Services.scriptSecurityManager.getSystemPrincipal(),
      });
      this.iframe = iframe;
      // const index = Zotero_Tabs._getTab(_globalThis.tab.id).tabIndex;
      // Zotero_Tabs._tabs[index]["iconBackgroundImage"] =`chrome://${config.addonRef}/content/icons/favicon@0.5x.png` // `url(chrome://${config.addonRef}/content/icons/favicon@0.5x.png)`;
    } else {
      const index = Zotero_Tabs._getTab(this.tab.id).tabIndex;
      Zotero_Tabs._tabs[index]["title"] = "new Tab - " + title;
      this.iframe.loadURI(url, {
        triggeringPrincipal:
          Services.scriptSecurityManager.getSystemPrincipal(),
      });
    }
    Zotero_Tabs.select(this.tab.id);
  }
}
