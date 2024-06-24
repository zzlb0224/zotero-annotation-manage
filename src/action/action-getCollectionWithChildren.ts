//@ts-nocheck 用于脚本测试
import { groupBy, uniqueBy } from "../utils/zzlb";
interface CollectionWithChildren {
  collectionID: number;
  parentCollectionID?: number;
  collectionName: string;
  key: string;
  itemID?: number;
  itemIDs: (number | undefined)[];
  Children: CollectionWithChildren[];
}
export async function getCollectionWithChildren(item?: Zotero.Item, items?: Zotero.Item[]) {
  if (item) return;
  if (items) return;
  const getChildGroupData = async () => {
    const cis = await Zotero.DB.queryAsync(
      "select c.collectionID,c.parentCollectionID,c.key,ci.itemID,c.collectionName from collections c left join collectionItems ci on c.collectionID=ci.collectionID order by c.collectionID",
    );
    const lines: CollectionWithChildren[] = [];
    for (const row of cis) {
      lines.push({
        collectionID: row.collectionID,
        collectionName: row.collectionName,
        parentCollectionID: row.parentCollectionID,
        key: row.key,
        itemID: row.itemID,
        Children: [],
        itemIDs: [],
      } as CollectionWithChildren);
    }
    return lines;
  };
  const lines = await getChildGroupData();
  const children = groupBy(lines, (a) => a.key).map((a) => ({
    ...a.values[0],
    itemIDs: a.values.map((b) => b.itemID),
  })) as CollectionWithChildren[];
  const all = [];
  for (const child of children) {
    if (child.parentCollectionID) {
      const gi = children.findIndex((f) => f.collectionID == child.parentCollectionID);
      if (gi > -1) {
        children[gi].Children!.push(child);
      }
    } else {
      all.push(child);
    }
  }
  for (const group of children) {
    const items = group.Children?.flatMap((a) => a.itemIDs || []) || [];
    group.itemIDs = uniqueBy(
      [...group.itemIDs, ...items].filter((f) => f),
      (item) => item + "",
    );
  }
  return children;
}
