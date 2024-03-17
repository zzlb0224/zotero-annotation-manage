import { groupBy } from "./zzlb";

async function col(item: Zotero.Item, items: Zotero.Item[]) {
  if (!item) return;
  if (!items) return;
  const getData = async () => {
    // const collections = await Zotero.DB.queryAsync("select * from collections");
    // const collectionItems = await Zotero.DB.queryAsync("select * from collectionItems");
    const cis = await Zotero.DB.queryAsync(
      "select c.collectionID,c.parentCollectionID,c.key,ci.itemID from collections c join collectionItems ci on c.collectionID=ci.collectionID",
    );
    const lines: {
      collectionID: number;
      parentCollectionID: number;
      key: string;
      itemID: number;
    }[] = [];

    for (const row of cis) {
      lines.push({
        collectionID: row.collectionID,
        parentCollectionID: row.parentCollectionID,
        key: row.key,
        itemID: row.itemID,
      });
    }
    const group = groupBy(lines, (a) => a.key).map((a) => ({
      ...a.values[0],
      itemID: a.values.map((b) => b.itemID),
    }));
    return lines;
  };
}
