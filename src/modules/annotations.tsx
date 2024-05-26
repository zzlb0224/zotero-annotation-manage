import { getPref } from "../utils/prefs";
import { sortValuesLength } from "../utils/sort";
import { groupBy } from "../utils/zzlb";
import { AnnotationPopup } from "./AnnotationPopup";
// import { text2Ma } from "./readerTools";
function register() {
  // if (!getPref("enable")) return;
  // ztoolkit.UI.basicOptions.log.disableZLog = true;
  // ztoolkit.log("Annotations register");

  // if (!getPref("hide-in-selection-popup"))
  {
    Zotero.Reader.registerEventListener(
      "renderTextSelectionPopup",
      renderTextSelectionPopup,
    );
  }

  // if (!getPref("hide-in-annotation-context-menu"))
  {
    Zotero.Reader.registerEventListener(
      "createAnnotationContextMenu",
      createAnnotationContextMenu,
    );
  }
}
function unregister() {
  ztoolkit.log("Annotations unregister");
  Zotero.Reader.unregisterEventListener(
    "renderTextSelectionPopup",
    renderTextSelectionPopup,
  );
  Zotero.Reader.unregisterEventListener(
    "createAnnotationContextMenu",
    createAnnotationContextMenu,
  );
}

function renderTextSelectionPopup(
  event: _ZoteroTypes.Reader.EventParams<"renderTextSelectionPopup">,
) {
  const { append, reader, doc, params } = event;
  if (getPref("hide-in-selection-popup")) {
    return;
  }
  const ap = new AnnotationPopup(reader, params);

  // addon.data.test = ap;
  const div = ap.rootDiv;
  // const div = createDiv(reader, params);
  if (div) {
    append(div);
  }
}
function createAnnotationContextMenu(
  event: _ZoteroTypes.Reader.EventParams<"createAnnotationContextMenu">,
) {
  const { reader, params, append } = event;
  if (getPref("hide-in-annotation-context-menu")) {
    return;
  }
  const doc = reader?._iframeWindow?.document;
  if (!doc) return;
  //这里不能用异步
  const currentAnnotations = reader._item
    .getAnnotations()
    .filter((f) => params.ids.includes(f.key));
  const currentTags = groupBy(
    currentAnnotations.flatMap((f) => f.getTags()),
    (t7) => t7.tag,
  ).sort(sortValuesLength);
  const currentTagsString = currentTags
    .map((f) => `${f.key}[${f.values.length}]`)
    .join(",");
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
      popDiv.countDown.start();
      if (div) {
        doc.body.appendChild(div);
      }
    },
  });
}

export default { register, unregister, AnnotationPopup };
