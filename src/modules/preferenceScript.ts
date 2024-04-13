import { config, homepage } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";
import { sortModified } from "../utils/sort";

import {
  FixedColorDefault,
  FixedTagsDefault,
  getChildCollections,
  memFixedColor,
  memFixedColors,
  memFixedTagColors,
  memFixedTags,
  memOptionalColor,
  memRelateTags,
} from "../utils/zzlb";
import { getNewColor, getRandomColor } from "../utils/color";
import memoize2 from "../utils/memoize2";
import annotations from "./annotations";

export function registerPrefsWindow() {
  Zotero.PreferencePanes.register({
    pluginID: config.addonID,
    src: rootURI + "chrome/content/preferences.xhtml",
    label: getString("pref-title"),
    image: `chrome://${config.addonRef}/content/icons/favicon.png`,
    helpURL: homepage,
  });
  ztoolkit.log("2222222222");
}

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened

  addon.data.prefs.window = _window;

  updatePrefsUI();
  bindPrefEvents();
}
function replaceColorTagsElement(doc: Document) {
  const id = `zotero-prefpane-${config.addonRef}-coloredTags`;
  const btnRemove = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-remove-color`,
  )! as HTMLButtonElement;
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
          children: memFixedTags().map((tag) => ({
            tag: "label",
            namespace: "html",
            properties: {
              innerText: tag,
              TextContent: tag,
            },
            styles: {
              background: memFixedColor(tag, undefined),
              padding: "5px 1px",
              margin: "5px 1px",
            },
            listeners: [
              {
                type: "click",
                listener: () => {
                  const color = memFixedColor(tag, undefined);
                  if (btnRemove.dataset.color == color) {
                    btnRemove.textContent = "删除选中的颜色";
                    btnRemove.style.background = "";
                    btnRemove.dataset.color = "";
                  } else {
                    const tags = memFixedTags().filter(
                      (tag) => memFixedColor(tag, undefined) == color,
                    );
                    btnRemove.textContent =
                      "删除[" + tags.join(",") + "]的颜色";
                    btnRemove.style.background = memFixedColor(tag, undefined);
                    btnRemove.dataset.color = color;
                  }
                },
              },
            ],
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
    label.style.background = memOptionalColor();
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
  if (!addon.data.prefs.window) return;
  const doc = addon.data.prefs.window.document;
  if (!doc) return;

  function t2Preview() {
    eFixedTagsColorPreview.innerHTML = "";
    // for(const c of eFixedTagsColorPreview.children){
    //   c.remove();
    // }
    s.allStr.forEach((currStr, index) => {
      // const currStr = s.allStr[s.selectIndex-1];
      const currMa = currStr.match(/[\s,;]*(.*?)[\s,;]*(#[0-9a-fA-F]{6})/);
      const currTag = currMa ? currMa?.[1] : currStr;
      const currColor = currMa ? currMa?.[2] : "";
      ztoolkit.UI.appendElement(
        {
          tag: "span",
          properties: { textContent: index + 1 + ":" + currTag },
          styles: {
            background: currColor,
            fontSize: s.selectIndex - 1 == index ? "2em" : "1em",
            padding: "5px 1px",
            margin: "5px 1px",
            borderRadius: "5px",
          },
          listeners: [
            {
              type: "click",
              listener: (e) => {
                s.selectIndex = index + 1;
                tPreview();
              },
            },
          ],
        },
        eFixedTagsColorPreview,
      );
    });
  }
  function tPreview() {
    // ztoolkit.log("tPreview", s);
    const currStr = s.allStr[s.selectIndex - 1] || "";
    const currMa = currStr.match(/[\s,;]*(.*?)[\s,;]*(#[0-9a-fA-F]{6})/);
    const currTag = currMa ? currMa?.[1] : currStr;
    const currColor = currMa ? currMa?.[2] : "";
    eFixedTagsColor.textContent = s.selectIndex + ":" + currStr;
    eFixedTagsColor.style.background = currColor;
    t2Preview();
  }

  function getS() {
    const selectionStart = eFixedTagsColors.selectionStart || 0;
    const ftcStr =
      eFixedTagsColors.value || (getPref("fixed-tags-colors") as string) || "";
    const allStr =
      ftcStr.match(/(.*?)(#[0-9a-fA-F]{6})/g)?.map((a) => a + "") || [];
    let selectIndex = -1;
    let maStart = 0;
    let maEnd = 0;
    if (allStr.length == 0) {
      selectIndex = 0;
      maStart = 0;
      maEnd = ftcStr.length;
      allStr.push(ftcStr);
    } else {
      for (let index = 0; index < allStr.length; index++) {
        maEnd += allStr[index].length;
        if (selectionStart <= maEnd) {
          selectIndex = index + 1;
          break;
        }
        maStart = maEnd;
      }
      if (selectIndex < 0) {
        selectIndex = allStr.length + 1;
        maStart = maEnd;
        maEnd = ftcStr.length;
        allStr.push(ftcStr.substring(maStart, ftcStr.length));
      }
    }
    return {
      ftcStr,
      selectionStart,
      selectIndex,
      maStart,
      maEnd,
      allStr,
      setPref: () => {
        setPref("fixed-tags-colors", allStr.join(""));
        memFixedTagColors.remove();
        tPreview();
      },
    };
  }

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-enable`)
    ?.addEventListener("command", (e) => {
      // ztoolkit.log(e, getPref("tags"));
    });
  const eFixedTagsColors = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-fixed-tags-colors`,
  ) as HTMLTextAreaElement;
  const eFixedTagsColor = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-fixed-tags-color`,
  ) as HTMLSpanElement;
  const eFixedTagsColorPreview = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-fixed-tags-color-preview`,
  ) as HTMLSpanElement;
  let s = getS();
  setTimeout(() => tPreview(), 1200);

  ztoolkit.log("bindPrefEvents", eFixedTagsColors, memFixedTagColors());
  if (eFixedTagsColors) {
    eFixedTagsColors?.addEventListener("keyup", (e) => {
      memFixedTagColors.remove();
      s = getS();
      tPreview();
    });
    eFixedTagsColors.addEventListener("click", (e) => {
      ztoolkit.log(e, eFixedTagsColors.selectionStart);
      s = getS();
      tPreview();
    });
    doc
      .querySelector(
        `#zotero-prefpane-${config.addonRef}-fixed-tags-color-left`,
      )
      ?.addEventListener("click", (e) => {
        if (s.selectIndex > 1) {
          const o = [s.allStr[s.selectIndex - 1], s.allStr[s.selectIndex - 2]];
          s.allStr.splice(s.selectIndex - 2, 2, ...o);
          s.selectIndex -= 1;
          s.setPref();
        }
        ztoolkit.log(s);
      });
    doc
      .querySelector(
        `#zotero-prefpane-${config.addonRef}-fixed-tags-color-right`,
      )
      ?.addEventListener("click", (e) => {
        if (s.selectIndex < s.allStr.length) {
          const o = [s.allStr[s.selectIndex], s.allStr[s.selectIndex - 1]];
          s.allStr.splice(s.selectIndex - 1, 2, ...o);
          s.selectIndex += 1;
          s.setPref();
        }
      });

    doc
      .querySelector(
        `#zotero-prefpane-${config.addonRef}-fixed-tags-color-remove`,
      )
      ?.addEventListener("click", (e) => {
        if (s.selectIndex > 0) {
          s.allStr.splice(s.selectIndex - 1, 1);
          if (s.selectIndex > s.allStr.length) {
            s.selectIndex -= 1;
          }
          s.setPref();
        }
      });
    doc
      .querySelector(
        `#zotero-prefpane-${config.addonRef}-fixed-tags-color-color`,
      )
      ?.addEventListener("click", (e) => {
        if (s) {
          const o = s.allStr[s.selectIndex - 1];
          const ma = o.match(/^(.*?)(#[0-9a-fA-F]{6})?$/);
          const tag = ma ? ma[1] : o;
          const color = getRandomColor();
          s.allStr.splice(s.selectIndex - 1, 1, tag + color);
          s.setPref();
        }
      });
  }
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-remove-color`)
    ?.addEventListener("command", (e) => {
      const btn = e.target as HTMLButtonElement;
      if (btn.dataset.color) {
        const colorStr = (getPref("fixed-colors") as string) || "";
        const colors = colorStr
          .split(",")
          .map((f) => f.trim())
          .filter((f) => f);
        const color = btn.dataset.color;
        const index = colors.indexOf(color);
        if (index > -1) {
          colors.splice(index, 1);
        }
        setPref("fixed-colors", colors.join(", ") || FixedColorDefault);
        memFixedColor.remove();
        memFixedColors.remove();
        replaceColorTagsElement(doc);
        btn.textContent = "选中颜色删除";
        btn.style.background = "";
        btn.dataset.color = "";
      }
      // ztoolkit.log(e, getPref("tags"));
    });

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-tags`)
    ?.addEventListener("keyup", (e) => {
      const target = e.target as HTMLTextAreaElement;
      if (target.value.includes("\n")) {
        target.value = target.value.replace(/\n/g, "");
      }
      memFixedTags.remove();
      memFixedColors.remove();
      memFixedColor.remove();
      replaceColorTagsElement(doc);
      replaceTagsPreviewDiv(doc);
    });

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-fixed-colors`)
    ?.addEventListener("keyup", (e) => {
      const target = e.target as HTMLTextAreaElement;
      if (target.value.includes("\n")) {
        target.value = target.value.replace(/\n/g, "");
      }
      memFixedColor.remove();
      memFixedColors.remove();
      replaceColorTagsElement(doc);
      replaceTagsPreviewDiv(doc);
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-add-color`)
    ?.addEventListener("command", (e) => {
      const colorStr = (getPref("fixed-colors") as string) || "";
      ztoolkit.log(colorStr);
      const colors = colorStr
        .split(",")
        .map((a) => a.trim())
        .filter((c) => c !== "");
      const color = getNewColor(colorStr);
      if (color) {
        colors.push(color);
      }
      setPref("fixed-colors", colors.join(", ") || FixedColorDefault);
      memFixedColor.remove();
      memFixedColors.remove();
      replaceColorTagsElement(doc);
      replaceTagsPreviewDiv(doc);
    });

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-sort`)
    ?.addEventListener("command", (e) => {
      replaceTagsPreviewDiv(doc);
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-optional-color`)
    ?.addEventListener("keyup", (e) => {
      initOptionalColorLabel(doc);
      memFixedColor.remove();
      memOptionalColor.remove();
      replaceTagsPreviewDiv(doc);
    });

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-tags-exclude`)
    ?.addEventListener("keyup", (e) => {
      replaceTagsPreviewDiv(doc);
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-max-show`)
    ?.addEventListener("keyup", (e) => {
      memOptionalColor.remove();
      replaceTagsPreviewDiv(doc);
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-show-all-tags`)
    ?.addEventListener("command", (e) => {
      memOptionalColor.remove();
      replaceTagsPreviewDiv(doc);
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-children-collection`)
    ?.addEventListener("command", (e) => {
      memOptionalColor.remove();
      replaceTagsPreviewDiv(doc);
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-preview-button`)
    ?.addEventListener("command", (e) => {
      replaceTagsPreviewDiv(doc);
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-current-collection`)
    ?.addEventListener("command", (e) => {
      memOptionalColor.remove();
      replaceTagsPreviewDiv(doc);
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-show-relate-tags`)
    ?.addEventListener("command", (e) => {
      memOptionalColor.remove();
      replaceTagsPreviewDiv(doc);
      memRelateTags.remove();
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
      ztoolkit.log(item);
      ann = Zotero.Items.get(item.getAttachments(false))
        .filter((f) => f.isPDFAttachment())
        .flatMap((f) => f.getAnnotations())
        .filter((f) => f.getTags().length > 0)
        .sort(sortModified)[0];
      if (ann) {
        from = "当前选择的条目";
      }
    }
    if (!ann) {
      const sc = ZoteroPane.getSelectedCollection();
      if (sc) {
        const pdfs = sc
          .getChildItems(false, false)
          .flatMap((f) => f.getAttachments());
        if (pdfs) {
          ann = Zotero.Items.get(pdfs)
            .filter((f) => f.isPDFAttachment())
            .flatMap((f) => f.getAnnotations())
            .filter((f) => f.getTags().length > 0)
            .sort(sortModified)[0];
          if (ann) {
            from = `当前文件夹[${sc.name}]的标签`;
          }
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
          .filter((f) => f.getTags().length > 0)
          .sort(sortModified)[0];
        if (ann) {
          from = `当前文件夹[${sc.name}]的子文件夹标签`;
        }
      }
    }
    if (!ann) {
      const all = await Zotero.Items.getAll(1, false, false, false);
      ann = all
        .filter((f) => f.itemTypeID == 1)
        .filter((f) => f.getTags().length > 0)
        .sort(sortModified)[0];
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
  if (ann) {
    const popup = new annotations.AnnotationPopup(
      undefined,
      { ids: [ann.key] },
      ann.parentItem,
      doc,
    );
    const rootDiv = popup.rootDiv;
    popup.tagsDisplay = await popup.searchTagResult();
    if (!rootDiv) return;
    // ztoolkit.log("replaceTagsPreviewDiv")
    preview.appendChild(rootDiv);
    rootDiv.innerText = `预览注释来自：${from}。条目：${ann.parentItem?.parentItem?.getDisplayTitle()}。
      包含标签:[${ann
        .getTags()
        .map((a) => a.tag)
        .join(
          ",",
        )}]内容：${ann.annotationType} ${ann.annotationText || ""} ${ann.annotationComment || ""} 
      `;
    rootDiv.style.position = "";
    rootDiv.style.width = "";
    rootDiv.style.maxHeight = "400px";
  } else {
    ztoolkit.UI.appendElement(
      {
        tag: "div",
        properties: {
          textContent: "请创建一个注释，并给他加上标签后再尝试此功能",
        },
      },
      preview,
    );
  }
}

export async function initPrefSettings() {
  if (!getPref("tags")) {
    setPref("tags", FixedTagsDefault);
  }
  if (getPref("fixed-colors") == undefined) {
    setPref("fixed-colors", FixedColorDefault);
  }
}
