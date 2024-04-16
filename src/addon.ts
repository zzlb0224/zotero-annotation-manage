import { ColumnOptions } from "zotero-plugin-toolkit/dist/helpers/virtualizedTable";
import { DialogHelper } from "zotero-plugin-toolkit/dist/helpers/dialog";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";
// import { Annotations } from "./modules/annotations";

class Addon {
  public data: {
    alive: boolean;
    // Env type, see build.js
    env: "development" | "production";
    ztoolkit: ZToolkit;
    locale?: {
      current: any;
    };
    prefs: {
      window: Window | null;
    };
    dialog?: DialogHelper;
    relationDialog?: DialogHelper;
    exportDialog?: DialogHelper;
    // annotations?: Annotations;
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
      prefs: { window: null },
      ztoolkit: createZToolkit(),
      copyText: "",
    };
    this.hooks = hooks;
    this.api = {};
  }
}

export default Addon;
