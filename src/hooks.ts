import { BasicExampleFactory } from "./modules/examples";
import { config } from "../package.json";
import { initLocale } from "./utils/locale";
import {
  // registerPrefsScripts,
  initPrefSettings,
  registerPrefsScripts,
  registerPrefsWindow,
} from "./modules/preferenceScript";
import { createZToolkit } from "./utils/ztoolkit";
import Annotations from "./modules/annotations";
import AnnotationsToNote, { createPopMenu } from "./modules/annotationsToNote";
import ReaderTools from "./modules/readerTools";
import readerTools from "./modules/readerTools";
import { Relations } from "./utils/zzlb";

async function onStartup() {
  await Promise.all([
    Zotero.initializationPromise,
    Zotero.unlockPromise,
    Zotero.uiReadyPromise,
  ]);

  // TODO: Remove this after zotero#3387 is merged
  if (__env__ === "development") {
    // Keep in sync with the scripts/startup.mjs
    const loadDevToolWhen = `Plugin ${config.addonID} startup`;
    ztoolkit.log(loadDevToolWhen);
  }

  initLocale();
  await initPrefSettings();

  // BasicExampleFactory.registerPrefs();

  // BasicExampleFactory.registerNotifier();

  // KeyExampleFactory.registerShortcuts();
  await onMainWindowLoad(window);
}

async function onMainWindowLoad(win: Window): Promise<void> {
  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();

  // const popupWin = new ztoolkit.ProgressWindow(config.addonName, {
  //   closeOnClick: true,
  //   closeTime: -1,
  // })
  //   .createLine({
  //     text: getString("startup-begin"),
  //     type: "default",
  //     progress: 0,
  //   })
  //   .show();

  // await Zotero.Promise.delay(1000);
  // popupWin.changeLine({
  //   progress: 30,
  //   text: `[30%] ${getString("startup-begin")}`,
  // });

  // UIExampleFactory.registerStyleSheet();

  // UIExampleFactory.registerRightClickMenuItem();

  // UIExampleFactory.registerRightClickMenuPopup();

  // UIExampleFactory.registerWindowMenuWithSeparator();

  // await UIExampleFactory.registerExtraColumn();

  // await UIExampleFactory.registerExtraColumnWithCustomCell();

  // await UIExampleFactory.registerCustomItemBoxRow();

  // UIExampleFactory.registerLibraryTabPanel();

  // await UIExampleFactory.registerReaderTabPanel();

  // PromptExampleFactory.registerNormalCommandExample();

  // PromptExampleFactory.registerAnonymousCommandExample();

  // PromptExampleFactory.registerConditionalCommandExample();

  // await Zotero.Promise.delay(1000);

  // popupWin.changeLine({
  //   progress: 100,
  //   text: `[100%] ${getString("startup-finish")}`,
  // });
  // popupWin.startCloseTimer(5000);

  // addon.hooks.onDialogEvents("dialogExample");
  registerPrefsWindow();
  Annotations.register();
  AnnotationsToNote.register();
  readerTools.register();
  // Relations.checkLinkAnnotation();
  // window.addEventListener("error", function (event) {
  //   ztoolkit.log(
  //     event.error,
  //     event.message,
  //     event.filename,
  //     event.lineno,
  //     event.colno,
  //     event,
  //   );
  // });
  // window.addEventListener("unhandledrejection", (event) => {
  //   ztoolkit.log(event.reason, event);
  // });
}

async function onMainWindowUnload(win: Window): Promise<void> {
  Annotations.unregister();
  AnnotationsToNote.unregister();
  ReaderTools.unregister();
  ztoolkit.unregisterAll();
  // addon.data.dialog?.window?.close();
}

function onShutdown(): void {
  ztoolkit.unregisterAll();
  // addon.data.dialog?.window?.close();
  // Remove addon object
  addon.data.alive = false;
  delete Zotero[config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
async function onNotify(
  event: string,
  type: string,
  ids: Array<string | number>,
  extraData: { [key: string]: any },
) {
  // You can add your code to the corresponding notify type
  ztoolkit.log("notify", event, type, ids, extraData);
  if (
    event == "select" &&
    type == "tab" &&
    extraData[ids[0]].type == "reader"
  ) {
    // BasicExampleFactory.exampleNotifierCallback();
  } else {
    return;
  }
}

/**
 * This function is just an example of dispatcher for Preference UI events.
 * Any operations should be placed in a function to keep this funcion clear.
 * @param type event type
 * @param data event data
 */
// async function onPrefsEvent(type: string, data: { [key: string]: any }) {
//   switch (type) {
//     case "load":
//       registerPrefsScripts(data.window);
//       break;
//     default:
//       return;
//   }
// }
function onPrefsLoad(event: Event) {
  registerPrefsScripts((event.target as any).ownerGlobal);
}

function onShortcuts(type: string) {
  switch (type) {
    case "larger":
      // KeyExampleFactory.exampleShortcutLargerCallback();
      break;
    case "smaller":
      // KeyExampleFactory.exampleShortcutSmallerCallback();
      break;
    default:
      break;
  }
}

async function onMenuEvent(
  type: "annotationToNoteTags",
  data: { [key: string]: any },
) {
  switch (type) {
    case "annotationToNoteTags":
      createPopMenu(data.window, data.type);
      break;
    default:
      return;
  }
}
function onDialogEvents(type: string) {
  switch (type) {
    case "dialogExample":
      // HelperExampleFactory.dialogExample();
      break;
    case "clipboardExample":
      // HelperExampleFactory.clipboardExample();
      break;
    case "filePickerExample":
      // HelperExampleFactory.filePickerExample();
      break;
    case "progressWindowExample":
      // HelperExampleFactory.progressWindowExample();
      break;
    case "vtableExample":
      // HelperExampleFactory.vtableExample();
      break;
    default:
      break;
  }
}

// Add your hooks here. For element click, etc.
// Keep in mind hooks only do dispatch. Don't add code that does real jobs in hooks.
// Otherwise the code would be hard to read and maintain.

export default {
  onStartup,
  onMainWindowLoad,
  onMainWindowUnload,
  onShutdown,
  onNotify,
  onPrefsLoad,
  onShortcuts,
  // onTranslate,
  // onTranslateInBatch,
  // onReaderPopupShow,
  // onReaderPopupRefresh,
  // onReaderTabPanelRefresh,
  onDialogEvents,
  onMenuEvent,
};
