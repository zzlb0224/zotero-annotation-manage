// import { memoize } from "./Memoize";
import { getPref } from "./prefs";
import memoize from "./memoize2";

/* unique 采用set的比较方式*/
export function unique<T>(arr: T[]) {
  return [...new Set(arr)];
}

//uniqueBy groupBy groupByMap 三个函数，因为使用的是object的key来检查重复，所以只能使用string | number | symbol
export function uniqueBy<T>(arr: T[], fn: (item: T) => string) {
  const groupedBy: { [key: string]: T } = {};
  for (const curr of arr) {
    const groupKey = fn(curr);
    if (curr && !groupedBy[groupKey]) {
      groupedBy[groupKey] = curr;
    }
  }
  return Object.values(groupedBy);
}
export interface groupByResult<T> {
  key: string;
  values: T[];
}
export function groupBy<T>(arr: T[], fn: (item: T) => string) {
  const groupedBy: { [key: string]: T[] } = {};
  for (const curr of arr) {
    const groupKey = fn(curr);
    if (groupedBy[groupKey]) {
      groupedBy[groupKey].push(curr);
    } else {
      groupedBy[groupKey] = [curr];
    }
  }
  return Object.keys(groupedBy).map(
    (key) => ({ key, values: groupedBy[key] }) as groupByResult<T>,
  );
}
export function promiseAllWithProgress<T>(
  arr: Promise<T>[],
  callback: { (progress: number, index: number): void },
): Promise<T[]> {
  let index = 0; //不能用forEach的index，因为执行顺序不一样
  arr.forEach((item: Promise<T>) => {
    item.then(() => {
      index++;
      const progress = (index * 100) / arr.length;
      callback(progress, index);
    });
  });
  return Promise.all(arr);
}
export function getChildCollections(
  collections: Zotero.Collection[],
): Zotero.Collection[] {
  const childCollections = uniqueBy(collections, (a) => a.key).flatMap((a) =>
    a.getChildCollections(false),
  );
  if (childCollections.length == 0) return [];
  return [...childCollections, ...getChildCollections(childCollections)];
}
function sortByLength<T>(a: groupByResult<T>, b: groupByResult<T>) {
  return b.values.length - a.values.length + (b.key > a.key ? -0.5 : 0.5);
}
function sortByFixedTag2Length<T>(a: groupByResult<T>, b: groupByResult<T>) {
  const tags = memFixedTags();
  if (tags.includes(a.key) && tags.includes(b.key)) {
    return tags.indexOf(a.key) - tags.indexOf(b.key);
  }
  if (tags.includes(a.key)) {
    return -1;
  }
  if (tags.includes(b.key)) {
    return 1;
  }
  return b.values.length - a.values.length + (b.key > a.key ? -0.5 : 0.5);
}

export const FixedTagsDefault =
  "目的,假设,框架,数据,量表,方法,理论,结论,贡献,不足,背景,现状,问题,对策";
export const FixedColorDefault =
  "#ffd400,#ff6666,#5fb236,#2ea8e5,#a28ae5,#e56eee,#f19837,#aaaaaa";

export const COLOR = {
  red: "#ff6666",
  orange: "#f19837",
  yellow: "#ffd400",
  green: "#5fb236",
  teal: "#008080",
  blue: "#2ea8e5",
  purple: "#a28ae5",
  magenta: "#E4007F",
  violet: "#e56eee",
  maroon: "#f19837",
  gray: "#aaaaaa",
  black: "#000000",
  white: "#ffffff",
};

export const memOptionalColor = memoize(
  () =>
    (getPref("optional-color") as string)?.match(/#[0-9A-F]{6}/g)?.[0] ||
    "#ffc0cb",
);
export const memFixedColor = memoize(
  (tag: string, optional: string | undefined = undefined): string => {
    const tags = memFixedTags();
    if (tags.includes(tag)) {
      return memFixedColors()[tags.indexOf(tag)];
    }
    if (optional == undefined) return memOptionalColor() as string;
    return optional;
  },
  (tag: string, optional: string | undefined = undefined) =>
    tag + "_" + optional,
);
export const memFixedTags = memoize((): string[] => {
  const prefTags = ((getPref("tags") as string) || "")
    .split(",")
    .map((a) => a.trim())
    .filter((f) => f);
  if (prefTags && prefTags.length > 0) return prefTags;
  return FixedTagsDefault.split(",");
});
export const memFixedColors = memoize((): string[] => {
  let fixedColor =
    (getPref("fixed-colors") as string)
      ?.match(/#[0-9A-F]{6}/g)
      ?.map((a) => a) || [];
  if (!fixedColor || fixedColor.length == 0)
    fixedColor = FixedColorDefault.split(",");
  const tags = memFixedTags();
  return Array.from({
    length: tags.length / fixedColor.length + 1,
  }).flatMap(() => fixedColor);
});

export function toggleProperty<T, K extends keyof NonNullable<T>>(
  obj: NonNullable<T> | undefined,
  key: K,
  values: NonNullable<T>[K][],
) {
  if (obj) {
    return (obj[key] = values[(values.indexOf(obj[key]) + 1) % values.length]);
  }
}
export function setProperty<T, K extends keyof NonNullable<T>>(
  obj: NonNullable<T> | undefined,
  key: K,
  value: NonNullable<T>[K],
) {
  if (obj) {
    return (obj[key] = value);
  }
}
export function groupByResultIncludeFixedTags<T>(tagGroup: groupByResult<T>[]) {
  memFixedTags().forEach((tag) => {
    if (tagGroup.findIndex((f) => f.key == tag) == -1) {
      tagGroup.push({ key: tag, values: [] });
    }
  });
  return tagGroup;
}
export function getCssTranslate(t1: HTMLElement) {
  for (const k in t1.style) {
    const v = t1.style[k];
    if (k == "transform" && v) {
      //没有附加到Dom无法调用 new WebKitCSSMatrix，只能这样使用
      ("translate(26.0842px, 108.715px)");
      const translateLeftTop = v.match(
        /translate[(]([\d.]*)px,\s?([\d.]*)px[)]/,
      );
      //['translate(26.0842px, 108.715px)', '26.0842', '108.715', index: 0, input: 'translate(26.0842px, 108.715px)', groups: undefined]
      if (translateLeftTop && translateLeftTop.length > 2) {
        return {
          x: parseFloat(translateLeftTop[1]),
          y: parseFloat(translateLeftTop[2]),
        };
      }
    }
  }
  return { x: 0, y: 0 };
}
//使用条目、pdf、annotation、tag的关系进行读取
const memAllTagsInLibraryAsync = memoize(async () => {
  const allItems = await Zotero.Items.getAll(1, false, false, false);
  const items = allItems.filter((f) => !f.parentID && !f.isAttachment());
  const pdfIds = items.flatMap((f) => f.getAttachments(false));
  const pdfs = Zotero.Items.get(pdfIds);
  const tags = pdfs
    .filter((f) => f.isPDFAttachment())
    .flatMap((f) => f.getAnnotations())
    .flatMap((f) =>
      f.getTags().map((a) => ({
        tag: a.tag,
        type: a.type,
        dateModified: f.dateModified,
      })),
    );
  const itemTags = getPref("item-tags")
    ? items.flatMap((f) =>
        f.getTags().map((a) => ({
          tag: a.tag,
          type: a.type,
          dateModified: f.dateModified,
        })),
      )
    : [];
  return groupBy([...tags, ...itemTags], (t) => t.tag);
});
//使用查询优化性能
export const memAllTagsDB = memoize(async () => {
  const rows = await Zotero.DB.queryAsync(
    "select name as tag,type,ann.dateModified from itemTags it join tags t on it.tagID=t.tagID join items ann on it.itemID=ann.itemID",
  );
  const lines: { tag: string; type: number; dateModified: string }[] = [];
  for (const row of rows) {
    lines.push({
      tag: row.tag,
      type: row.type,
      dateModified: row.dateModified,
    });
  }
  ztoolkit.log(lines.length, lines);
  return groupBy(lines, (t) => t.tag);
});
export const memRelateTags = memoize(
  (item?: Zotero.Item) => {
    if (!getPref("show-relate-tags")) return [];
    return getTagsInCollections(getItemRelateCollections(item));
  },
  (item) => item?.key || "",
);
function getItemRelateCollections(item?: Zotero.Item): Zotero.Collection[] {
  if (!item) return [];
  const allCollectionIds: number[] = [];
  const childrenCollections = !!getPref("children-collection");
  const prefSelectedCollection = !!getPref("selected-collection");
  const prefCurrentCollection = !!getPref("current-collection");
  if (prefSelectedCollection) {
    const selectedCollectionId = ZoteroPane.getSelectedCollection(true);
    if (selectedCollectionId) allCollectionIds.push(selectedCollectionId);
  }
  if (prefCurrentCollection) {
    const currentCollectionIds = item.parentItem
      ? item.parentItem.getCollections()
      : item.getCollections();
    allCollectionIds.push(...currentCollectionIds);
  }
  if (allCollectionIds.length > 0) {
    const allCollections = Zotero.Collections.get(
      allCollectionIds,
    ) as Zotero.Collection[];
    const collections = childrenCollections
      ? [...allCollections, ...getChildCollections(allCollections)]
      : allCollections;
    const collections2 = uniqueBy(collections, (u) => u.key);
    return collections2;
  }
  return [];
}
function getTagsInCollections(collections: Zotero.Collection[]) {
  if (collections.length == 0) return [];
  const pdfIds = collections
    .flatMap((c) => c.getChildItems())
    .filter((f) => !f.isAttachment())
    .flatMap((a) => a.getAttachments(false)); //为啥会出现
  const pdfItems = Zotero.Items.get(pdfIds).filter(
    (f) => f.isFileAttachment() && f.isAttachment(),
  );
  const annotations = pdfItems.flatMap((f) => f.getAnnotations(false));
  return annotations.flatMap((f) =>
    f
      .getTags()
      .map((a) => ({ tag: a.tag, type: a.type, dateModified: f.dateModified })),
  );
}
export function str2RegExp(value: string) {
  const res: RegExp[] = [];
  value
    .split("\n")
    .map((a) => a.trim())
    .filter((f) => f)
    .forEach((f) => {
      try {
        res.push(new RegExp(f, "i"));
      } catch (error) {
        ztoolkit.log(error);
      }
    });
  return res;
}
