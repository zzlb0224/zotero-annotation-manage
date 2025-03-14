import { BasicExampleFactory, HelperExampleFactory, KeyExampleFactory, PromptExampleFactory, UIExampleFactory } from "./modules/examples";
import { config } from "../package.json";
import { getString, initLocale } from "./utils/locale";
import { registerPrefsScripts, registerPrefsWindow } from "./modules/preferenceScript";
// import { createZToolkit } from "./utils/ztoolkit";
import Annotations from "./modules/annotations";
import AnnotationsToNote, { getSelectedItems } from "./modules/menu";
import RelationHeader from "./modules/RelationHeader";
import highlightWords from "./modules/highlightWords";
import toolLink from "./modules/referenceMark";
import { actionTranAnnotations } from "./action/action-tran-annotations";
import { memFixedColor, stopPropagation } from "./utils/zzlb";
import { exportNoteByType, exportSingleNote, getAllAnnotations } from "./modules/AnnotationsToNote";
import { groupBy } from "./utils/groupBy";
import { sortFixedTags10ValuesLength, sortValuesLength } from "./utils/sort";
// import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { annotationToNoteTags, annotationToNoteType, annotationToNoteColor } from "./hooksMenuEvent";
import { createZToolkit } from "./utils/ztoolkit";

async function onStartup() {
  await Promise.all([Zotero.initializationPromise, Zotero.unlockPromise, Zotero.uiReadyPromise]);

  initLocale();

  BasicExampleFactory.registerPrefs();

  await Promise.all(Zotero.getMainWindows().map((win) => onMainWindowLoad(win)));
  // self = window;
}

async function onMainWindowLoad(win: Window): Promise<void> {
  await new Promise((resolve) => {
    if (win.document.readyState !== "complete") {
      win.document.addEventListener("readystatechange", () => {
        if (win.document.readyState === "complete") {
          resolve(void 0);
        }
      });
    }
    resolve(void 0);
  });

  await Promise.all([Zotero.initializationPromise, Zotero.unlockPromise, Zotero.uiReadyPromise]);

  // Services.scriptloader.loadSubScript(
  //   `chrome://${config.addonRef}/content/scripts/customElements.js`,
  //   win,
  // );

  (win as any).MozXULElement.insertFTLIfNeeded(`${config.addonRef}-mainWindow.ftl`);

  // Create ztoolkit for every window
  addon.data.ztoolkit = createZToolkit();
  win.console.log("onMainWindowLoad");

  Annotations.register();
  AnnotationsToNote.register();
  RelationHeader.register();
  highlightWords.register();
  toolLink.register();
  // registeredID_showAnnotations()
  registerPrefsWindow();
}

async function onMainWindowUnload(win: Window): Promise<void> {
  win.console.log("onMainWindowUnload");
  Annotations.unregister();
  AnnotationsToNote.unregister();
  RelationHeader.unregister();
  highlightWords.unregister();
  toolLink.unregister();
  // unregisteredID_showAnnotations()
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
  win.document.querySelector(`[href="${config.addonRef}-mainWindow.ftl"]`)?.remove();
}

function onShutdown(): void {
  ztoolkit.log("onShutdown");
  ztoolkit.unregisterAll();
  addon.data.dialog?.window?.close();
  // Remove addon object
  addon.data.alive = false;
  // @ts-ignore - Plugin instance is not typed
  delete Zotero[config.addonInstance];
}

/**
 * This function is just an example of dispatcher for Notify events.
 * Any operations should be placed in a function to keep this funcion clear.
 */
async function onNotify(event: string, type: string, ids: Array<string | number>, extraData: { [key: string]: any }) {
  // You can add your code to the corresponding notify type
  ztoolkit.log("notify", event, type, ids, extraData);
  if (event == "select" && type == "tab" && extraData[ids[0]].type == "reader") {
    BasicExampleFactory.exampleNotifierCallback();
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
async function onPrefsEvent(type: string, data: { [key: string]: any }) {
  switch (type) {
    case "load":
      registerPrefsScripts(data.window);
      break;
    default:
      return;
  }
}

function onShortcuts(type: string) {
  switch (type) {
    case "larger":
      KeyExampleFactory.exampleShortcutLargerCallback();
      break;
    case "smaller":
      KeyExampleFactory.exampleShortcutSmallerCallback();
      break;
    default:
      break;
  }
}

async function onMenuEvent(type: "annotationToNoteTags" | "annotationToNoteType" | "annotationToNoteColor", data: { [key: string]: any }) {
  switch (type) {
    case "annotationToNoteTags":
      annotationToNoteTags(data.window, data.type);
      break;
    case "annotationToNoteType":
      annotationToNoteType(data.window, data.type);
      break;
    case "annotationToNoteColor":
      annotationToNoteColor(data.window, data.type);
      break;
    default:
      return;
  }
}

function onDialogEvents(type: string) {
  switch (type) {
    case "dialogExample":
      HelperExampleFactory.dialogExample();
      break;
    case "clipboardExample":
      HelperExampleFactory.clipboardExample();
      break;
    case "filePickerExample":
      HelperExampleFactory.filePickerExample();
      break;
    case "progressWindowExample":
      HelperExampleFactory.progressWindowExample();
      break;
    case "vtableExample":
      HelperExampleFactory.vtableExample();
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
  onShutdown,
  onMainWindowLoad,
  onMainWindowUnload,
  onNotify,
  onPrefsEvent,
  onShortcuts,
  onDialogEvents,
  onMenuEvent,
};
