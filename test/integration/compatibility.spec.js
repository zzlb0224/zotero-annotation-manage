/* global before, describe, it, Zotero, ChromeUtils */
import {
  getSelectedCollectionItems,
  getSelectedCollections,
  getSelectedCollectionNames,
  getSelectionWriteTarget,
  getSingleSelectedCollection,
} from "../../src/utils/selection";

function check(value, message) {
  if (!value) {
    const error = new Error(message);
    error.actual = message;
    error.expected = "assertion to pass";
    throw error;
  }
}

async function waitFor(predicate, description) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    const value = await predicate();
    if (value) return value;
    await Zotero.Promise.delay(100);
  }
  check(false, "Timed out waiting for " + description);
}

function sameIDs(actual, expected, description) {
  check(
    JSON.stringify([...actual].sort((a, b) => a - b)) === JSON.stringify([...expected].sort((a, b) => a - b)),
    description + "; actual=" + JSON.stringify(actual) + "; expected=" + JSON.stringify(expected),
  );
}

// A generated one-page ASCII PDF avoids external fixtures and network access.
function makePDF() {
  const stream = "BT /F1 18 Tf 72 720 Td (Zotero annotation compatibility) Tj ET";
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Length " + stream.length + " >>\nstream\n" + stream + "\nendstream",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += index + 1 + " 0 obj\n" + object + "\nendobj\n";
  });
  const xref = pdf.length;
  pdf += "xref\n0 6\n0000000000 65535 f \n";
  pdf += offsets
    .slice(1)
    .map((offset) => String(offset).padStart(10, "0") + " 00000 n \n")
    .join("");
  return pdf + "trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
}

describe("Zotero compatibility", function () {
  this.timeout(30000);
  let pane, win, first, second, child, parentItem, childItem, outsideItem, attachment, annotation, reader;
  const libraryID = Zotero.Libraries.userLibraryID;
  const marker = "Zotero compatibility annotation";
  const prefix = "extensions.zotero.annotationmanage.";

  before(async function () {
    let stage = "startup";
    try {
      await Promise.all([Zotero.initializationPromise, Zotero.uiReadyPromise]);
      win = Zotero.getMainWindow();
      pane = Zotero.getActiveZoteroPane();
      await waitFor(() => Zotero.zoteroAnnotationManage?.data.ztoolkit, "plugin startup");

      async function collection(name, parentID) {
        const value = new Zotero.Collection();
        value.libraryID = libraryID;
        value.name = name;
        if (parentID) value.parentID = parentID;
        await value.saveTx();
        return value;
      }
      async function item(title, collections) {
        const value = new Zotero.Item("journalArticle");
        value.libraryID = libraryID;
        value.setField("title", title);
        value.setCollections(collections);
        await value.saveTx();
        return value;
      }
      stage = "collections";
      first = await collection("Compatibility A");
      second = await collection("Compatibility B");
      child = await collection("Compatibility child", first.id);
      stage = "items";
      parentItem = await item("Compatibility parent", [first.id, second.id]);
      childItem = await item("Compatibility child item", [child.id]);
      outsideItem = await item("Unrelated outside item", []);
      stage = "PDF fixture";
      const file = Zotero.getTempDirectory();
      file.append("annotation-compatibility.pdf");
      await Zotero.File.putContentsAsync(file, makePDF());
      attachment = await Zotero.Attachments.importFromFile({ file, parentItemID: parentItem.id });
      stage = "annotation fixture";
      annotation = new Zotero.Item("annotation");
      annotation.libraryID = libraryID;
      annotation.parentID = attachment.id;
      annotation.annotationType = "highlight";
      annotation.annotationText = marker;
      annotation.annotationComment = "";
      annotation.annotationColor = "#ffd400";
      annotation.annotationPageLabel = "1";
      annotation.annotationSortIndex = "00000|000001|00000";
      annotation.annotationPosition = JSON.stringify({ pageIndex: 0, rects: [[72, 716, 340, 742]] });
      annotation.addTag("compatibility");
      await annotation.saveTx();
    } catch (error) {
      check(false, "Fixture setup failed at " + stage + ": " + String(error) + "\n" + (error?.stack || ""));
    }
  });

  it("loads the plugin and registers item and collection menus", async function () {
    check(Zotero.zoteroAnnotationManage?.data.alive, "Plugin failed to start");
    const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
    const installed = await AddonManager.getAddonByID("annotationmanage@zknu.edu.cn");
    check(installed?.isCompatible, "Installed manifest is incompatible");
    for (const type of ["item", "collection"]) {
      await waitFor(() => win.document.querySelector("#zotero-" + type + 'menu menu[label$=" - in ' + type + '"]'), type + " menu");
    }
  });

  it("reads a real selected collection and its descendants", async function () {
    await pane.collectionsView.selectCollection(first.id);
    sameIDs(
      getSelectedCollections().map((value) => value.id),
      [first.id],
      "Selected collection differs",
    );
    check(getSingleSelectedCollection()?.id === first.id, "Single collection setting lost its scope");
    const items = await getSelectedCollectionItems();
    sameIDs(
      items.map((item) => item.id),
      [parentItem.id, childItem.id],
      "Collection descendants or deduplication failed",
    );
    sameIDs(getSelectionWriteTarget().collectionIDs, [first.id], "Note target differs");
  });

  it("keeps a saved search scoped to its displayed results", async function () {
    const search = new Zotero.Search();
    search.libraryID = libraryID;
    search.name = "Compatibility scoped search";
    search.addCondition("title", "is", outsideItem.getField("title"));
    await search.saveTx();
    await pane.collectionsView.selectSearch(search.id);
    const items = await getSelectedCollectionItems();
    sameIDs(
      items.map((item) => item.id),
      [outsideItem.id],
      "Search selection widened to unrelated items",
    );
    check(getSingleSelectedCollection() === undefined, "Search became a collection");
  });

  it("writes library-root objects without invalid collection IDs", async function () {
    await pane.collectionsView.selectLibrary(libraryID);
    const target = getSelectionWriteTarget();
    check(target.libraryID === libraryID, "Wrong library target");
    sameIDs(target.collectionIDs, [], "Library root has collection IDs");
  });

  it("merges two real collection selections without duplicates", async function () {
    const cv = pane.collectionsView;
    // Selecting an already-selected collection can preserve the multi-selection.
    await cv.selectLibrary(libraryID);
    await cv.selectCollection(first.id);
    await cv.expandToCollection(second.id);
    const selected = cv.waitForSelect();
    cv.selection.toggleSelect(cv.getRowIndexByID("C" + second.id));
    await selected;
    sameIDs(
      getSelectedCollections().map((value) => value.id),
      [first.id, second.id],
      "Native plural selection differs",
    );
    check(
      getSelectedCollectionNames().includes(first.name) && getSelectedCollectionNames().includes(second.name),
      "Multi-selection names lost",
    );
    check(getSingleSelectedCollection() === undefined, "Multi-selection chose an arbitrary color scope");
    sameIDs(getSelectionWriteTarget().collectionIDs, [first.id, second.id], "Multi-collection note target differs");
    const items = await getSelectedCollectionItems();
    sameIDs(
      items.map((item) => item.id),
      [parentItem.id, childItem.id],
      "Multi-collection export lost or duplicated items",
    );
  });

  it("opens a real PDF and renders the plugin toolbar", async function () {
    reader = await Zotero.Reader.open(attachment.id, null, { allowDuplicate: true });
    await reader._initPromise;
    await reader._internalReader._primaryView.initializedPromise;
    await waitFor(() => reader._iframeWindow.document.getElementById("zoteroAnnotationManage-search-button"), "reader toolbar");
  });

  it("renders the React annotation popup through the native Reader event", async function () {
    Zotero.Prefs.set(prefix + "hide-in-selection-popup", false, true);
    const doc = reader._iframeWindow.document;
    const host = doc.createElement("div");
    host.className = "selection-popup";
    doc.getElementById("reader-ui").appendChild(host);
    const value = await Zotero.Annotations.toJSON(annotation);
    try {
      Zotero.Reader._dispatchEvent({
        type: "renderTextSelectionPopup",
        reader,
        doc,
        params: { annotation: value },
        append: (...elements) => host.append(...elements),
      });
      await waitFor(() => host.querySelector("#zoteroAnnotationManage-PopupDiv"), "selection popup");
      await waitFor(() => host.querySelector("#rr" + attachment.key)?.childElementCount, "React popup content");
    } finally {
      host.remove();
    }
  });

  it("adds a tag through the existing-annotation popup and persists it", async function () {
    Zotero.Prefs.set(prefix + "hide-in-annotation-context-menu", false, true);
    const doc = reader._iframeWindow.document;
    const menu = [];
    Zotero.Reader._dispatchEvent({
      type: "createAnnotationContextMenu",
      reader,
      doc,
      params: { ids: [annotation.key] },
      append: (...entries) => menu.push(...entries),
    });
    const entry = menu.find((value) => value.label.startsWith("添加标签"));
    check(typeof entry?.onCommand === "function", "Annotation tag action was not registered");
    entry.onCommand();
    await waitFor(
      () => doc.body.querySelector("#zoteroAnnotationManage-PopupDiv #rr" + attachment.key)?.childElementCount,
      "existing-annotation React popup",
    );
    const input = await waitFor(() => doc.querySelector('#zoteroAnnotationManage-PopupDiv input[placeholder="搜索标签"]'), "tag input");
    const tag = "native-compatibility-tag";
    const nativeSetter = Object.getOwnPropertyDescriptor(doc.defaultView.HTMLInputElement.prototype, "value").set;
    nativeSetter.call(input, tag);
    input.dispatchEvent(new doc.defaultView.Event("input", { bubbles: true }));
    // Allow the controlled React input to commit before its key handler reads state.
    await Zotero.Promise.delay(100);
    input.dispatchEvent(new doc.defaultView.KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await waitFor(
      () =>
        Zotero.DB.valueQueryAsync("SELECT COUNT(*) FROM itemTags JOIN tags USING (tagID) WHERE itemID = ? AND name = ?", [
          annotation.id,
          tag,
        ]),
      "persisted annotation tag",
    );
    doc.getElementById("zoteroAnnotationManage-PopupDiv")?.remove();
  });

  it("exports annotations into a note with Better Notes when its XPI is supplied", async function () {
    const xpiPath = Zotero.Prefs.get(prefix + "test-better-notes-xpi", true);
    if (!xpiPath) this.skip();
    const { AddonManager } = ChromeUtils.importESModule("resource://gre/modules/AddonManager.sys.mjs");
    await AddonManager.installTemporaryAddon(Zotero.File.pathToFile(xpiPath));
    await waitFor(() => Zotero.BetterNotes?.data.initialized && Zotero.BetterNotes?.api.note.insert, "Better Notes startup");

    await win.Zotero_Tabs.select("zotero-pane");
    const cv = pane.collectionsView;
    // Selecting an already-selected collection can preserve the multi-selection.
    await cv.selectLibrary(libraryID);
    await cv.selectCollection(first.id);
    await cv.expandToCollection(second.id);
    const selected = cv.waitForSelect();
    cv.selection.toggleSelect(cv.getRowIndexByID("C" + second.id));
    await selected;
    sameIDs(getSelectionWriteTarget().collectionIDs, [first.id, second.id], "Write target before export");
    Zotero.zoteroAnnotationManage.hooks.onMenuEvent("annotationToNoteType", { window: win, type: "collection" });
    const menu = await waitFor(
      () => win.document.querySelector('#zoteroAnnotationManage-create-note-type-popup-collection menuitem[label^="highlight"]'),
      "annotation export menu",
    );
    menu.dispatchEvent(new win.Event("command", { bubbles: true }));
    const note = await waitFor(async () => {
      const items = await Zotero.Items.getAll(libraryID, false, false, false);
      return items.find((item) => item.isNote() && item.getNote().includes(marker));
    }, "exported annotation note");
    check(note.libraryID === libraryID, "Export wrote to the wrong library");
    sameIDs(note.getCollections(), [first.id, second.id], "Export did not retain both selected collections");
  });
});
