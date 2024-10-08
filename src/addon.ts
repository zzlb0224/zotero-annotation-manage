// import { ColumnOptions } from "zotero-plugin-toolkit/dist/helpers/virtualizedTable";
// import { DialogHelper } from "zotero-plugin-toolkit/dist/helpers/dialog";
import { ColumnOptions } from "zotero-plugin-toolkit/dist/helpers/virtualizedTable";
import hooks from "./hooks";
// import { createZToolkit } from "./utils/ztoolkit";
import ZoteroToolkit from "zotero-plugin-toolkit";
import { DialogHelper } from "zotero-plugin-toolkit/dist/helpers/dialog";
import { createZToolkit } from "./utils/ztoolkit";

class Addon {
  public data: {
    alive: boolean;
    // Env type, see build.js
    env: "development" | "production";
    ztoolkit: ZToolkit;
    // ztoolkit: ZoteroToolkit;
    locale?: {
      current: any;
    };
    prefs?: {
      window: Window;
      columns: Array<ColumnOptions>;
      rows: Array<{ [dataKey: string]: string }>;
    };
    dialog?: DialogHelper;
    relationDialog?: DialogHelper;
    exportDialog?: DialogHelper;
    copyText: string;
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: object;

  constructor() {
    this.data = {
      alive: true,
      env: __env__,
      // prefs: { window: null },
      ztoolkit: createZToolkit(),
      copyText: "",
    };
    this.hooks = hooks;
    this.api = {};
  }
}

export default Addon;
