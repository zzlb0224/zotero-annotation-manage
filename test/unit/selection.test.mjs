import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../../src/utils/selection.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022 },
});
const {
  getSelectedCollections,
  getSelectedLibraryIDs,
  getSingleSelectedCollection,
  getSelectedCollectionNames,
  getSelectionWriteTarget,
  getSelectedCollectionItems,
} = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

const row = (collection) => ({ isCollection: () => collection });
const collection = (id, libraryID = 1, items = [], children = []) => ({
  id,
  libraryID,
  key: `KEY${id}`,
  name: `Collection ${id}`,
  getChildItems: () => items,
  getChildCollections: () => children,
});
const obsolete = () => {
  throw new Error("Zotero 10 singular getter must not be called");
};
const modernPane = (collections = [], libraryIDs = [1], rows = collections.map(() => row(true))) => ({
  getSelectedCollections: () => collections,
  getSelectedLibraryIDs: () => libraryIDs,
  getCollectionTreeRows: () => rows,
  getSelectedCollection: obsolete,
  getSelectedLibraryID: obsolete,
  getCollectionTreeRow: obsolete,
});

test("Zotero 10 uses plural getters even when throwing singular getters still exist", () => {
  const c = collection(4);
  const pane = modernPane([c]);
  assert.deepEqual(getSelectedCollections(pane), [c]);
  assert.deepEqual(getSelectedLibraryIDs(pane), [1]);
  assert.equal(getSingleSelectedCollection(pane), c);
});

test("Zotero 8/9 singular getters remain supported", () => {
  const c = collection(8, 5);
  const pane = {
    getSelectedCollection: () => c,
    getSelectedLibraryID: () => 5,
    getCollectionTreeRow: () => row(true),
  };
  assert.deepEqual(getSelectedCollections(pane), [c]);
  assert.deepEqual(getSelectedLibraryIDs(pane), [5]);
  assert.equal(getSingleSelectedCollection(pane), c);
  assert.deepEqual(getSelectionWriteTarget(pane), { libraryID: 5, collectionIDs: [8] });
});

test("empty legacy selections normalize to empty arrays", () => {
  const pane = { getSelectedCollection: () => false, getSelectedLibraryID: () => false };
  assert.deepEqual(getSelectedCollections(pane), []);
  assert.deepEqual(getSelectedLibraryIDs(pane), []);
  assert.equal(getSingleSelectedCollection(pane), undefined);
});

test("collection-specific settings do not choose an arbitrary collection", () => {
  const pane = modernPane([collection(1), collection(2)]);
  assert.equal(getSingleSelectedCollection(pane), undefined);
  assert.equal(getSelectedCollectionNames(pane), "Collection 1、Collection 2");
});

test("mixed collection and saved-search selection is not a single collection", () => {
  const pane = modernPane([collection(1)], [1], [row(true), row(false)]);
  assert.equal(getSingleSelectedCollection(pane), undefined);
});

test("write targets include every selected collection in one library and deduplicate IDs", () => {
  const pane = modernPane([collection(1, 5), collection(2, 5), collection(1, 5)], [5, 5]);
  assert.deepEqual(getSelectionWriteTarget(pane), { libraryID: 5, collectionIDs: [1, 2] });
});

test("library-root writes have no false collection IDs", () => {
  assert.deepEqual(getSelectionWriteTarget(modernPane([], [5], [row(false)])), {
    libraryID: 5,
    collectionIDs: [],
  });
});

test("cross-library and missing write targets fail before creating any object", () => {
  assert.throws(() => getSelectionWriteTarget(modernPane([], [1, 5])), /只选择一个文库/);
  assert.throws(() => getSelectionWriteTarget(modernPane([], [])), /只选择一个文库/);
  assert.throws(() => getSelectionWriteTarget(modernPane([collection(2, 5)], [1])), /只选择一个文库/);
});

test("collection reads include descendants without duplicate items or repeated traversal", async () => {
  const a = { id: 11 };
  const b = { id: 12 };
  const child = collection(2, 1, [a, b]);
  const parent = collection(1, 1, [a], [child]);
  assert.deepEqual(await getSelectedCollectionItems(modernPane([parent, child])), [a, b]);
});

test("collections with the same key in different libraries are not collapsed", async () => {
  const a = collection(1, 1, [{ id: 11 }]);
  const b = collection(2, 5, [{ id: 12 }]);
  b.key = a.key;
  assert.deepEqual(await getSelectedCollectionItems(modernPane([a, b], [1, 5])), [{ id: 11 }, { id: 12 }]);
});

test("mixed selections merge collection descendants and displayed saved-search items", async () => {
  const pane = modernPane([collection(1, 1, [{ id: 11 }])], [1], [row(true), row(false)]);
  pane.itemsView = { getSortedItems: () => [{ id: 11 }, { id: 12 }] };
  assert.deepEqual(await getSelectedCollectionItems(pane), [{ id: 11 }, { id: 12 }]);
});

test("saved searches keep their displayed scope rather than reading the whole personal library", async () => {
  const pane = modernPane([], [5], [row(false)]);
  pane.itemsView = { getSortedItems: () => [{ id: 50 }] };
  assert.deepEqual(await getSelectedCollectionItems(pane), [{ id: 50 }]);
});

test("empty selection does not export stale items from the previously displayed view", async () => {
  const pane = modernPane([], [], []);
  pane.itemsView = { getSortedItems: () => [{ id: 50 }] };
  assert.deepEqual(await getSelectedCollectionItems(pane), []);
});

test("legacy fallback reads the selected library, not hard-coded library 1", async () => {
  const previous = globalThis.Zotero;
  const requested = [];
  globalThis.Zotero = {
    Items: {
      getAll: async (id) => {
        requested.push(id);
        return [{ id: id * 10 }];
      },
    },
  };
  try {
    const pane = { getSelectedCollection: () => false, getSelectedLibraryID: () => 5 };
    assert.deepEqual(await getSelectedCollectionItems(pane), [{ id: 50 }]);
    assert.deepEqual(requested, [5]);
  } finally {
    globalThis.Zotero = previous;
  }
});
