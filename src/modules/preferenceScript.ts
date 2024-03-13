import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";
import {
  FixedColorDefault,
  FixedTagsDefault,
  getFixedColor,
  getFixedTags,
  getOptionalColor,
} from "../utils/zzlb";

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/chrome/content/preferences.xul onpaneload
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
      columns: [
        {
          dataKey: "title",
          label: getString("prefs-table-title"),
          fixedWidth: true,
          width: 100,
        },
        {
          dataKey: "detail",
          label: getString("prefs-table-detail"),
        },
      ],
      rows: [
        {
          title: "Orange",
          detail: "It's juicy",
        },
        {
          title: "Banana",
          detail: "It's sweet",
        },
        {
          title: "Apple",
          detail: "I mean the fruit APPLE",
        },
      ],
    };
  } else {
    addon.data.prefs.window = _window;
  }
  updatePrefsUI();
  bindPrefEvents();
}
function replaceElement(doc: Document) {
  const id = `zotero-prefpane-${config.addonRef}-coloredTags`;
  ztoolkit.UI.replaceElement(
    {
      tag: "div",
      id,
      attributes: {
        value: getPref("translateSource") as string,
        native: "true",
      },
      children: [
        {
          tag: "div",
          styles: {
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-start",
            flexWrap: "wrap",
          },
          children: getFixedTags().map((tag) => ({
            tag: "label",
            properties: {
              innerText: tag,
              TextContent: tag,
            },
            styles: {
              background: getFixedColor(tag, undefined),
              padding: "5px 1px",
              margin: "5px 1px",
            },
          })),
        },
      ],
    },
    doc.getElementById(id)!,
  );
}

function initOptionalColorLabel(doc: Document) {
  const label = doc.getElementById(
    `zotero-prefpane-${config.addonRef}-optional-color`,
  );
  if (label) {
    const optionalColor = (getPref("optional-color") as string) || "";
    label.style.background = optionalColor;
  }
}
async function updatePrefsUI() {
  // You can initialize some UI elements on prefs window
  // with addon.data.prefs.window.document
  // Or bind some events to the elements
  if (addon.data.prefs?.window == undefined) return;
  const doc = addon.data.prefs.window?.document;
  if (!doc) {
    return;
  }
  replaceElement(doc);
  initOptionalColorLabel(doc);
}

function bindPrefEvents() {
  const doc = addon.data.prefs!.window.document;
  if (!doc) return;
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-enable`)
    ?.addEventListener("command", (e) => {
      // ztoolkit.log(e, getPref("tags"));
    });

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-tags`)
    ?.addEventListener("keyup", (e) => {
      // ztoolkit.log(e, getPref("tags"));
      replaceElement(doc);
      getFixedTags.remove();
    });

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-fixed-colors`)
    ?.addEventListener("keyup", (e) => {
      // ztoolkit.log(e, getPref("tags"));
      replaceElement(doc);
      getFixedColor.remove();
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-optional-color`)
    ?.addEventListener("keyup", (e) => {
      initOptionalColorLabel(doc);
      getFixedColor.remove();
      getOptionalColor.remove();
    });
}

export async function initPrefSettings() {
  if (!getPref("tags")) {
    setPref("tags", FixedTagsDefault);
  }
  if (getPref("currentCollection") == undefined) {
    setPref("currentCollection", true);
  }
  if (getPref("selectedCollection") == undefined) {
    setPref("selectedCollection", true);
  }
  if (getPref("fixed-colors") == undefined) {
    setPref("fixed-colors", FixedColorDefault);
  }
  if (getPref("optional-color") == undefined) {
    setPref("optional-color", "#ffc0cb");
  }
}
