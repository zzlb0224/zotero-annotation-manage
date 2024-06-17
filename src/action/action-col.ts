import { groupBy, uniqueBy } from "../utils/zzlb";
interface childGroup {
  collectionID: number;
  parentCollectionID?: number;
  collectionName: string;
  key: string;
  itemID?: number;
  itemIDs: (number | undefined)[];
  childGroups: childGroup[];
}
export async function col(item?: Zotero.Item, items?: Zotero.Item[]) {
  if (item) return;
  if (items) return;
  const getData = async () => {
    const cis = await Zotero.DB.queryAsync(
      "select c.collectionID,c.parentCollectionID,c.key,ci.itemID,c.collectionName from collections c left join collectionItems ci on c.collectionID=ci.collectionID order by c.collectionID",
    );
    const lines: childGroup[] = [];
    for (const row of cis) {
      lines.push({
        collectionID: row.collectionID,
        collectionName: row.collectionName,
        parentCollectionID: row.parentCollectionID,
        key: row.key,
        itemID: row.itemID,
        childGroups: [],
        itemIDs: [],
      } as childGroup);
    }
    return lines;
  };
  const lines = await getData();
  const groups = groupBy(lines, (a) => a.key).map((a) => ({
    ...a.values[0],
    itemIDs: a.values.map((b) => b.itemID),
  })) as childGroup[];
  const rootGroups = [];
  for (const group of groups) {
    if (group.parentCollectionID) {
      const gi = groups.findIndex(
        (f) => f.collectionID == group.parentCollectionID,
      );
      if (gi > -1) {
        groups[gi].childGroups!.push(group);
      }
    } else {
      rootGroups.push(group);
    }
  }
  for (const group of groups) {
    const items = group.childGroups?.flatMap((a) => a.itemIDs || []) || [];
    group.itemIDs = uniqueBy(
      [...group.itemIDs, ...items].filter((f) => f),
      (item) => item + "",
    );
  }
  return groups;
}
