import { config, homepage } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";
import { sortModified } from "../utils/sort";
import Annotations from "./annotations";

import { getNewColor, getRandomColor } from "../utils/color";
import {
  FixedColorDefault,
  FixedTagsDefault,
  getChildCollections,
  memFixedColor,
  memFixedTagColors,
  memFixedTags,
  memOptionalColor,
  memRelateTags,
} from "../utils/zzlb";
import annotations from "./annotations";

export function registerPrefsWindow() {
  Zotero.PreferencePanes.register({
    pluginID: config.addonID,
    src: rootURI + "chrome/content/preferences.xhtml",
    // label: getString("pref-addon-title")||"标签管理",
    label: getString("prefs-title"),
    image: `chrome://${config.addonRef}/content/icons/favicon.png`,
    // image: `chrome://${config.addonRef}/content/icons/favicon.png`,
    // image:rootURI + `chrome/content/icons/favicon.png`,
    helpURL: homepage,
  });
  // ztoolkit.log("2222222222", getString("pref-addon-title"));
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
  ) as HTMLButtonElement;
  if (!btnRemove) return;
  const ele = doc.getElementById(id);
  if (!ele) return;
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
    ele,
  );
}

function initOptionalColorLabel(doc: Document) {
  const label = doc.getElementById(
    `zotero-prefpane-${config.addonRef}-optional-color`,
  ) as HTMLElement;
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
  setStyleDisplay(doc, `#zotero-prefpane-${config.addonRef}-debug`);
  setStyleDisplay(doc, `#zotero-prefpane-${config.addonRef}-debug-func`);
}

function setStyleDisplay(doc: Document, id: string) {
  const df = doc.querySelector(id) as HTMLDivElement;
  if (df) df.style.display = getPref("debug") ? "" : "none";
}

function bindPrefEvents() {
  if (!addon.data.prefs.window) return;
  const doc = addon.data.prefs.window.document;
  if (!doc) return;

  bindFixedColors(doc);

  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-debug`)
    ?.addEventListener("command", (e) => {
      // ztoolkit.log(e, getPref("tags"));
      const checked = (e.target as HTMLInputElement).checked;
      const df = doc.querySelector(
        `#zotero-prefpane-${config.addonRef}-debug-func`,
      ) as HTMLDivElement;
      df.style.display = checked ? "" : "none";
    });
  doc
    .querySelector(`#zotero-prefpane-${config.addonRef}-enable`)
    ?.addEventListener("command", (e) => {
      // ztoolkit.log(e, getPref("tags"));
    });

  doc
    .querySelector(
      `#zotero-prefpane-${config.addonRef}-hide-in-selection-popup`,
    )
    ?.addEventListener("command", (e) => {
      const checked = (e.target as HTMLInputElement).checked;
      // ztoolkit.log(e, getPref("tags"));
      if (!checked) {
        // Annotations.unregister()
      } else {
        // Annotations.register()
      }
    });

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

function bindFixedColors(doc: Document) {
  let ftcStr = "";
  let selectionStart = 0;
  let allStr: string[] = [];
  let selectIndex = 1;

  let collectionKey = "";

  const PrefPre = "fixed-tags-colors";

  const eFixedTagsColors = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-fixed-tags-colors`,
  ) as HTMLTextAreaElement;
  const eFixedTagsColor = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-fixed-tags-color`,
  ) as HTMLSpanElement;
  const eFixedTagsColorPreview = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-fixed-tags-color-preview`,
  ) as HTMLSpanElement;

  const eColorLeft = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-fixed-tags-color-left`,
  ) as HTMLButtonElement;
  const eColorRight = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-fixed-tags-color-right`,
  ) as HTMLButtonElement;
  const eColorRemove = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-fixed-tags-color-remove`,
  ) as HTMLButtonElement;
  const eRandomColor = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-fixed-tags-random-color`,
  ) as HTMLButtonElement;

  const currentCollection = doc.querySelector(
    `#zotero-prefpane-${config.addonRef}-current-collection`,
  ) as HTMLDivElement;

  ztoolkit.log("bindPrefEvents", eFixedTagsColors, memFixedTagColors());

  eFixedTagsColors?.addEventListener("keyup", (e) => {
    ftcStr = eFixedTagsColors.value;
    getSelectIndex(); //
    // saveStr(); //不保存
    tPreview();
  });
  eFixedTagsColors?.addEventListener("blur", (e) => {
    ftcStr = eFixedTagsColors.value;
    getSelectIndex();
    saveStr();
    tPreview();
  });
  eFixedTagsColors.addEventListener("click", (e) => {
    ztoolkit.log(e, eFixedTagsColors.selectionStart);
    getSelectIndex();
    saveStr();
    tPreview();
  });
  eColorLeft.addEventListener("click", (e) => {
    if (selectIndex > 1) {
      const o = [allStr[selectIndex - 1], allStr[selectIndex - 2]];
      allStr.splice(selectIndex - 2, 2, ...o);
      selectIndex -= 1;
      saveStr();
    }
  });
  eColorRight.addEventListener("click", (e) => {
    if (selectIndex < allStr.length) {
      const o = [allStr[selectIndex], allStr[selectIndex - 1]];
      allStr.splice(selectIndex - 1, 2, ...o);
      selectIndex += 1;
      saveStr();
    }
  });
  eColorRemove.addEventListener("click", (e) => {
    if (selectIndex > 0) {
      allStr.splice(selectIndex - 1, 1);
      if (selectIndex > allStr.length) {
        selectIndex -= 1;
      }
      saveStr();
    }
  });

  eRandomColor.addEventListener("click", (e) => {
    const o = allStr[selectIndex - 1];
    const ma = o.match(/^(.*?)(#[0-9a-fA-F]{6})?$/);
    const tag = ma ? ma[1] : o;
    const color = getRandomColor();
    allStr.splice(selectIndex - 1, 1, tag + color);
    ftcStr = allStr.join("");
    saveStr();
  });

  showCurrentCollection();

  loadStr();
  setTimeout(() => tPreview(), 1200);
  function loadStr() {
    ftcStr = (getPref(PrefPre + collectionKey) as string) || "";
    allStr = ftcStr.match(/(.*?)(#[0-9a-fA-F]{6})/g)?.map((a) => a + "") || [];
    eFixedTagsColors.value = ftcStr;
    tPreview();
  }

  async function showCurrentCollection() {
    if (!currentCollection) return;
    currentCollection.innerHTML = "固定标签配置";
    const selectedCollection = ZoteroPane.getSelectedCollection(false);
    if (selectedCollection) {
      collectionKey = selectedCollection.key;
      ztoolkit.UI.appendElement(
        {
          tag: "button",
          styles: { padding: "5px", marginLeft: "10px" },
          properties: { textContent: "刷新目录" },
          listeners: [
            {
              type: "click",
              listener() {
                showCurrentCollection();
              },
            },
          ],
        },
        currentCollection,
      ) as HTMLElement;

      let currColl = selectedCollection || false;
      const arr = [{ key: currColl.key, name: currColl.name }];
      while (currColl.parentID) {
        currColl = Zotero.Collections.get(
          currColl.parentID,
        ) as Zotero.Collection;
        arr.push({ key: currColl.key, name: currColl.name });
      }
      arr.push({ key: "", name: "我的文库" });
      arr.reverse();
      const cs: HTMLButtonElement[] = [];
      for (const a of arr) {
        const q = (getPref(PrefPre + a.key) as string) || "";
        const ele = ztoolkit.UI.appendElement(
          {
            tag: "button",
            styles: {
              padding: "5px",
              background: q ? "" : "#aee",
              color: a.key != collectionKey ? "#000" : "#f00",
            },
            properties: {
              textContent: a.name + `${q ? "[配置]" : "[继承]"}`,
            },
            listeners: [
              {
                type: "click",
                listener: () => {
                  for (const e of cs)
                    e.style.color = ele != e ? "#000" : "#f00";
                  collectionKey = a.key;
                  loadStr();
                  // tPreview()
                },
              },
            ],
          },
          currentCollection,
        ) as HTMLButtonElement;
        cs.push(ele);
      }
      loadStr();
    }
  }
  function t2Preview() {
    eFixedTagsColorPreview.innerHTML = "";
    allStr.forEach((currStr, index) => {
      const currMa = currStr.match(/[\s,;]*(.*?)[\s,;]*(#[0-9a-fA-F]{6})/);
      const currTag = currMa ? currMa?.[1] : currStr;
      const currColor = currMa ? currMa?.[2] : "";
      ztoolkit.UI.appendElement(
        {
          tag: "span",
          properties: { textContent: index + 1 + ":" + currTag },
          styles: {
            background: currColor,
            fontSize: selectIndex - 1 == index ? "2em" : "1em",
            padding: "5px 1px",
            margin: "5px 1px",
            borderRadius: "5px",
          },
          listeners: [
            {
              type: "click",
              listener: (e) => {
                selectIndex = index + 1;
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
    const currStr = allStr[selectIndex - 1] || "";
    const currMa = currStr.match(/[\s,;]*(.*?)[\s,;]*(#[0-9a-fA-F]{6})/);
    const currTag = currMa ? currMa?.[1] : currStr;
    const currColor = currMa ? currMa?.[2] : "";
    eFixedTagsColor.textContent = selectIndex + ":" + currStr;
    eFixedTagsColor.style.background = currColor;
    t2Preview();
  }
  function getSelectIndex() {
    selectionStart = eFixedTagsColors.selectionStart || 0;
    // const ftcStr = eFixedTagsColors.value || (getPref("fixed-tags-colors") as string) || "";
    allStr = ftcStr.match(/(.*?)(#[0-9a-fA-F]{6})/g)?.map((a) => a + "") || [];
    let si = -1;
    let maStart = 0;
    let maEnd = 0;
    if (allStr.length == 0) {
      si = 1;
      maStart = 0;
      maEnd = ftcStr.length;
      allStr.push(ftcStr);
    } else {
      for (let index = 0; index < allStr.length; index++) {
        maEnd += allStr[index].length;
        if (selectionStart <= maEnd) {
          si = index + 1;
          break;
        }
        maStart = maEnd;
      }
      if (si < 0) {
        si = allStr.length + 1;
        maStart = maEnd;
        maEnd = ftcStr.length;
        allStr.push(ftcStr.substring(maStart, ftcStr.length));
      }
    }

    ztoolkit.log(ftcStr, allStr, si, selectIndex, selectionStart);
    selectIndex = si;
  }
  function saveStr() {
    ztoolkit.log(ftcStr, allStr, collectionKey);
    ftcStr = allStr.join("");
    eFixedTagsColors.value = ftcStr;

    // setPref("fixed-tags-colors", ftcStr);
    setPref("fixed-tags-colors" + collectionKey, ftcStr);
    memFixedTagColors.remove();
    memFixedColor.remove();
    memFixedTags.remove();
    tPreview();
  }
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
    rootDiv.innerText = `预览批注来自：${from}。条目：${ann.parentItem?.parentItem?.getDisplayTitle()}。
        包含标签: [${ann
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
          textContent: "请创建一个批注，并给他加上标签后再尝试此功能",
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
