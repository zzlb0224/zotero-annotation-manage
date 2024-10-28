import { config } from "../../package.json";
import { getPref, setPref } from "../utils/prefs";
import { sortValuesLength } from "../utils/sort";
import { addCssFile, getItem, isDebug } from "../utils/zzlb";
import { groupBy } from "../utils/groupBy";
import { AnnotationPopup } from "./AnnotationPopup";
import { Relations } from "../utils/Relations";
// import { text2Ma } from "./readerTools";
function register() {
  // if (!getPref("enable")) return;
  // ztoolkit.UI.basicOptions.log.disableZLog = true;
  // ztoolkit.log("Annotations register");

  // if (!getPref("hide-in-selection-popup"))
  {
    Zotero.Reader.registerEventListener("renderTextSelectionPopup", renderTextSelectionPopup, config.addonID);
  }

  // if (!getPref("hide-in-annotation-context-menu"))
  {
    Zotero.Reader.registerEventListener("createAnnotationContextMenu", createAnnotationContextMenu, config.addonID);
  }
}
function unregister() {
  ztoolkit.log("Annotations unregister");
  Zotero.Reader.unregisterEventListener("renderTextSelectionPopup", renderTextSelectionPopup);
  Zotero.Reader.unregisterEventListener("createAnnotationContextMenu", createAnnotationContextMenu);
}

function renderTextSelectionPopup(event: _ZoteroTypes.Reader.EventParams<"renderTextSelectionPopup">) {
  const { append, reader, doc, params } = event;
  const filename = "annotation.css";
  addCssFile(doc, filename, true);
  // ztoolkit.log("addCssFile doc", doc)
  addCssFile(ZoteroPane.document, filename, true);
  addCssFile(reader?._window?.document, filename, true);
  // doc.documentElement.addEventListener("contextmenu", e => {
  //   ztoolkit.log("右键contextmenu", e.buttons, e.button, e.currentTarget, e)
  // })

  // doc.documentElement.addEventListener("click", e => {
  //   ztoolkit.log("右键click", e.buttons, e.button, e.currentTarget, e)
  // })
  const item = Zotero.Items.get(reader.itemID!).parentItem; //ZoteroPane.getSelectedItems()[0]
  const publicationTitle = item?.getField("publicationTitle")
  Zotero.ref_item = item;
  Zotero.ref_params = params;

  if (item) {
    //@ts-ignore IF11
    ztoolkit.log(
      item,
      "显示IF",
      item.getField("extra"),
      item.getExtraField("IF"),
      ztoolkit.ExtraField.getExtraFields(item),
      ztoolkit.ExtraField.getExtraField(item, "IF"),
    );
  }
  Zotero.ref_reader = reader;
  Zotero.ref_reader_annotationManager = reader._annotationManager;
  Zotero.ref_reader_keyboardManager = reader._keyboardManager;

  if (getPref("hide-in-selection-popup")) {
    return;
  }
  const ap = new AnnotationPopup(reader, params);

  // addon.data.test = ap;
  const div = ap.rootDiv;
  // const div = createDiv(reader, params);
  if (div) {
    // append(div);
    // reader?._iframeWindow?.document.body.appendChild(div)
    append(div);
  }
}
function createAnnotationContextMenu(event: _ZoteroTypes.Reader.EventParams<"createAnnotationContextMenu">) {
  const { reader, params, append } = event;
  if (getPref("hide-in-annotation-context-menu")) {
    return;
  }
  const doc = reader?._iframeWindow?.document;
  if (!doc) return;
  //这里不能用异步
  const currentAnnotations = reader._item.getAnnotations().filter((f) => params.ids.includes(f.key));
  const currentTags = groupBy(
    currentAnnotations.flatMap((f) => f.getTags()),
    (t7) => t7.tag,
  ).sort(sortValuesLength);
  const currentTagsString = currentTags.map((f) => `${f.key}[${f.values.length}]`).join(",");
  const label =
    currentTags.length > 0
      ? `添加标签，已有${currentTags.length}个Tag【${currentTagsString.length > 11 ? currentTagsString.slice(0, 10) + "..." : currentTagsString}】`
      : "添加标签";
  //

  append({
    label: label,
    onCommand: () => {
      // const div = createDiv(reader, params);
      const popDiv = new AnnotationPopup(reader, params);
      const div = popDiv.rootDiv;
      // popDiv.startCountDown();
      // popDiv.countDown.start();
      if (div) {
        doc.body.appendChild(div);
      }
    },
  });
  if (currentAnnotations.length == 1 && currentAnnotations[0].hasTag("量表")) {
    append({
      label: "指定为最近的量表",
      onCommand: () => {
        setPref("lastScaleKey", currentAnnotations[0].key);
        setPref("lastScaleItemKey", "");
      },
    });
  }
  const lastScale = getItem(getPref("lastScaleKey") as string);
  if (currentAnnotations.length == 1 && currentAnnotations[0].hasTag("量表item") && lastScale.parentKey == reader._item.key) {
    append({
      label: "指定为最近的量表item",
      onCommand: () => {
        const scale = new Relations(currentAnnotations[0]).getLinkRelationItems().find((f) => f.hasTag("量表"));
        if (scale) {
          setPref("lastScaleKey", scale.key);
          setPref("lastScaleItemKey", currentAnnotations[0].key);
        }
      },
    });
  }
}

export default { register, unregister, AnnotationPopup };
