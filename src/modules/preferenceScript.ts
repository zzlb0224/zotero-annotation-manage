import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";
import {
  FixedColorDefault,
  FixedTagsDefault,
  getChildCollections,
  getFixedColor,
  getFixedTags,
  getOptionalColor,
  getRelateTags,
} from "../utils/zzlb";
import { AnnotationPopup } from "./annotations";

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
function replaceColorTagsElement(doc: Document) {
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
            namespace: "html",
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
    label.style.background = getOptionalColor();
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
  replaceColorTagsElement(doc);
  initOptionalColorLabel(doc);
  replaceTagsPreviewDiv(doc);
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
      getFixedTags.remove();
      replaceColorTagsElement(doc);
      replaceTagsPreviewDiv(doc);
    });

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-fixed-colors`)
    ?.addEventListener("keyup", (e) => {
      getFixedColor.remove();
      replaceColorTagsElement(doc);
      replaceTagsPreviewDiv(doc);
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-optional-color`)
    ?.addEventListener("keyup", (e) => {
      initOptionalColorLabel(doc);
      getFixedColor.remove();
      getOptionalColor.remove();
    });

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-tags-exclude`)
    ?.addEventListener("command", (e) => {
      getOptionalColor.remove();
      replaceTagsPreviewDiv(doc);
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-max-show`)
    ?.addEventListener("command", (e) => {
      getOptionalColor.remove();
      replaceTagsPreviewDiv(doc);
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-showAllTags`)
    ?.addEventListener("command", (e) => {
      getOptionalColor.remove();
      replaceTagsPreviewDiv(doc);
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-children-collection`)
    ?.addEventListener("command", (e) => {
      getOptionalColor.remove();
      replaceTagsPreviewDiv(doc);
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-preview-button`)
    ?.addEventListener("command", (e) => {
      replaceTagsPreviewDiv(doc);
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-currentCollection`)
    ?.addEventListener("command", (e) => {
      getOptionalColor.remove();
      replaceTagsPreviewDiv(doc);
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-show-relate-tags`)
    ?.addEventListener("command", (e) => {
      getOptionalColor.remove();
      replaceTagsPreviewDiv(doc);
      getRelateTags.remove();
    });
}
async function replaceTagsPreviewDiv(doc?: Document) {
  if (!doc) return;
  const preview = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-search-preview`,
  );
  if (!preview) return;
  preview.children[0]?.remove();
  const getAnn = async () => {
    let ann: Zotero.Item | undefined = undefined;
    let from = "";
    const selected = ZoteroPane.getSelectedItems()?.[0];
    if (selected) {
      const item = selected.parentItem ? selected.parentItem : selected;
      ann = Zotero.Items.get(item.getAttachments(false))
        .filter((f) => f.isPDFAttachment())
        .flatMap((f) => f.getAnnotations())
        .filter((f) => f.getTags().length > 0)[0];
      if (ann) {
        from = "当前选择的条目";
      }
    }
    if (!ann) {
      const pdfs = ZoteroPane.getSelectedCollection()
        ?.getChildItems(false, false)
        .flatMap((f) => f.getAttachments());
      if (pdfs) {
        ann = Zotero.Items.get(pdfs)
          .filter((f) => f.isPDFAttachment())
          .flatMap((f) => f.getAnnotations())
          .filter((f) => f.getTags().length > 0)[0];
        if (ann) {
          from = "当前文件夹的标签";
        }
      }
    }
    if (!ann) {
      const sc = ZoteroPane.getSelectedCollection();
      if (sc) {
        const pdfs = getChildCollections([sc])
          ?.flatMap((f) => f.getChildItems(false, false))
          .flatMap((f) => f.getAttachments());
        ann = Zotero.Items.get(pdfs)
          .filter((f) => f.isPDFAttachment())
          .flatMap((f) => f.getAnnotations())
          .filter((f) => f.getTags().length > 0)[0];
        if (ann) {
          from = "当前文件夹的子文件夹标签";
        }
      }
    }
    if (!ann) {
      const all = await Zotero.Items.getAll(1, false, false, false);
      ann = all
        .filter((f) => f.itemTypeID == 1)
        .filter((f) => f.getTags().length > 0)[0];
      if (ann) {
        from = "全库的标签";
      }
    }
    return { ann, from };
  };
  const { ann, from } = await getAnn();
  ztoolkit.log(ann, ann.parentItem, ann.parentItem?.parentItem);

  for (const child of preview.children) {
    child.remove();
  }
  const popup = new AnnotationPopup(
    undefined,
    { ids: ann.id + "" },
    ann.parentItem,
    doc,
  );
  const rootDiv = popup.rootDiv;
  popup.tagsDisplay = await popup.searchTagResult();
  if (!rootDiv) return;
  // ztoolkit.log("replaceTagsPreviewDiv")
  preview.appendChild(rootDiv);
  rootDiv.innerText =
    "预览标签来自：" +
    from +
    "。条目：" +
    ann.parentItem?.parentItem?.getDisplayTitle();
  rootDiv.style.position = "";
  rootDiv.style.width = "";
  rootDiv.style.maxHeight = "400px";

  // ztoolkit.UI.appendElement(
  //   {
  //     tag: "div",
  //     properties: {
  //       textContent:
  //         "对应标签" +
  //         ann.id +
  //         "类型" +
  //         ann.itemTypeID +
  //         "pdf" +
  //         ann.parentItem?.getDisplayTitle() +
  //         "条目" +
  //         ann.parentItem?.parentItem?.getDisplayTitle(),
  //     },
  //   },
  //   rootDiv,
  // );
  // ztoolkit.UI.appendElement(popup.createCurrentTags(), rootDiv);
  // ztoolkit.UI.appendElement(
  //   { tag: "div", properties: { textContent: "搜索窗口" } },
  //   rootDiv,
  // );
  // ztoolkit.UI.appendElement(popup.createSearchDiv(), rootDiv);
  // ztoolkit.UI.appendElement(
  //   { tag: "div", properties: { textContent: "选择的窗口" } },
  //   rootDiv,
  // );
  // ztoolkit.UI.appendElement(popup.createTagsDiv(), rootDiv);
  // ztoolkit.log("replaceTagsPreviewDiv", preview.innerHTML, rootDiv);
}

export async function initPrefSettings() {
  if (!getPref("tags")) {
    setPref("tags", FixedTagsDefault);
  }
  if (getPref("show-relate-tags") == undefined) {
    setPref("show-relate-tags", true);
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
  if (getPref("count-down-close") == undefined) {
    setPref("count-down-close", 15);
  }
}
