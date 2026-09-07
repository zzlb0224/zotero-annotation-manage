/**
 * Selection APIs changed to plural getters in Zotero 10.
 * Prefer capabilities over version strings: the old getters still exist in
 * Zotero 10, but throw when called.
 */
export interface SelectionPane {
  getSelectedCollections?: () => Zotero.Collection[];
  getSelectedCollection?: () => Zotero.Collection | false | undefined;
  getSelectedLibraryIDs?: () => number[];
  getSelectedLibraryID?: () => number | false | undefined;
  getCollectionTreeRows?: () => SelectionRow[];
  getCollectionTreeRow?: () => SelectionRow | false | undefined;
  itemsView?: { getSortedItems: () => Zotero.Item[] } | null;
}

interface SelectionRow {
  isCollection: () => boolean;
}

// zotero-types 4.0.5 predates the plural APIs and mis-types the legacy row getter.
function getActiveSelectionPane(): SelectionPane {
  return Zotero.getActiveZoteroPane() as unknown as SelectionPane;
}

function getSelectionRows(pane: SelectionPane) {
  if (typeof pane.getCollectionTreeRows === "function") {
    return pane.getCollectionTreeRows();
  }
  const row = pane.getCollectionTreeRow?.();
  return row ? [row] : undefined;
}

export function getSelectedCollections(pane: SelectionPane = getActiveSelectionPane()): Zotero.Collection[] {
  if (typeof pane.getSelectedCollections === "function") {
    return pane.getSelectedCollections();
  }
  const collection = pane.getSelectedCollection?.();
  return collection ? [collection] : [];
}

export function getSelectedLibraryIDs(pane: SelectionPane = getActiveSelectionPane()): number[] {
  const ids = typeof pane.getSelectedLibraryIDs === "function" ? pane.getSelectedLibraryIDs() : [pane.getSelectedLibraryID?.()];
  return [...new Set(ids.filter((id): id is number => typeof id === "number" && id > 0))];
}

/** Collection-specific settings are meaningful only for an unambiguous selection. */
export function getSingleSelectedCollection(pane: SelectionPane = getActiveSelectionPane()): Zotero.Collection | undefined {
  const collections = getSelectedCollections(pane);
  const rows = getSelectionRows(pane);
  if (collections.length !== 1 || (rows && (rows.length !== 1 || !rows[0].isCollection()))) return undefined;
  return collections[0];
}

export function getSelectedCollectionNames(pane: SelectionPane = getActiveSelectionPane()): string {
  return getSelectedCollections(pane)
    .map((collection) => collection.name)
    .join("、");
}

/** A new object belongs to one library, but may belong to several collections. */
export function getSelectionWriteTarget(pane: SelectionPane = getActiveSelectionPane()) {
  const libraryIDs = getSelectedLibraryIDs(pane);
  const collections = getSelectedCollections(pane);
  if (libraryIDs.length !== 1 || collections.some((collection) => collection.libraryID !== libraryIDs[0])) {
    throw new Error("请只选择一个文库后再创建条目或笔记；不能将多个文库写入同一个条目。");
  }
  return {
    libraryID: libraryIDs[0],
    collectionIDs: [...new Set(collections.map((collection) => collection.id))],
  };
}

/**
 * Include descendants of selected collections, and preserve the displayed
 * scope for libraries, saved searches, and other non-collection rows.
 * getSortedItems() excludes the header/spacer rows introduced in Zotero 10.
 */
export async function getSelectedCollectionItems(pane: SelectionPane = getActiveSelectionPane()): Promise<Zotero.Item[]> {
  const rows = getSelectionRows(pane);
  if (rows?.length === 0) return [];
  const collections = getSelectedCollections(pane);
  const libraryIDs = getSelectedLibraryIDs(pane);
  if (!collections.length && !libraryIDs.length) return [];

  const items = new Map<number, Zotero.Item>();
  const visited = new Set<number>();
  const addItems = (values: Zotero.Item[]) => values.forEach((item) => items.set(item.id, item));
  const visit = (collection: Zotero.Collection) => {
    if (visited.has(collection.id)) return;
    visited.add(collection.id);
    addItems(collection.getChildItems(false, false) || []);
    const children = collection.getChildCollections(false);
    if (children) children.forEach(visit);
  };
  collections.forEach(visit);

  if (!collections.length || rows?.some((row) => !row.isCollection())) {
    if (pane.itemsView) {
      addItems(pane.itemsView.getSortedItems());
    } else {
      // Compatibility fallback for older panes without an item view.
      for (const libraryID of libraryIDs) {
        addItems(await Zotero.Items.getAll(libraryID, false, false, false));
      }
    }
  }
  return [...items.values()];
}
