// import { memoize } from "./Memoize";
import { getPref, setPref } from "./prefs";
import memoize from "./memoize2";
/* unique 采用set的比较方式*/
export function unique<T>(arr: T[]) {
  return [...new Set(arr)];
}
export function uniqueBy<T>(arr: T[], fn: (item: T) => string) {
  const keys: { [key: string]: number } = {};
  const values: T[] = [];
  for (const curr of arr) {
    const groupKey = fn(curr);
    if (!keys.hasOwnProperty.call(keys, groupKey)) {
      keys[groupKey] = values.length;
      values.push(curr);
    }
  }
  return values;
}
export interface groupByResult<T> {
  key: string;
  values: T[];
}
export class TagColor {
  public color: string;
  public tag: string;
  constructor(tagColor: string, removeSpace = false) {
    const ma = tagColor.match(
      removeSpace ? /(,*)(#[0-9a-fA-F])/ : /^[\s,;]*(,*?)[\s,;]*(#[0-9a-fA-F])/,
    );
    this.tag = ma?.[1] || tagColor;
    this.color = ma?.[2] || "";
  }
  public toString(): string {
    return this.tag + this.color;
  }
  public static map(str: string) {
    return str.match(/(,*)(#[0-9a-fA-F])/)?.map((ma) => new TagColor(ma)) || [];
  }
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
  callback?: { (progress: number, index: number): void },
): Promise<T[]> {
  let index = 0; //不能用forEach的index，因为执行顺序不一样
  arr.forEach((item: Promise<T>) => {
    item.then(() => {
      index++;
      const progress = (index * 100) / arr.length;
      if (callback) callback(progress, index);
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
export const FixedTagsDefault =
  "目的,假设,框架,数据,量表,方法,理论,结论,贡献,不足,背景,现状,问题,对策";
export const FixedColorDefault =
  "#ffd400, #ff6666, #5fb236, #2ea8e5, #a28ae5, #e56eee, #f19837, #aaaaaa, #69af15, #ba898e, #ee8574, #6a99e7, #e65fa1, #62e0ef, #f7e8b2";

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
    (getPref("optional-color") as string)?.match(/#[0-9A-Fa-f]{6}/g)?.[0] ||
    "#ffc0cb",
);
/**
 * optional undefined 采用 配置的可选颜色， "" 采用空值
 */
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
      ?.match(/#[0-9A-Fa-f]{6}/g)
      ?.map((a) => a) || [];
  if (!fixedColor || fixedColor.length == 0)
    fixedColor = FixedColorDefault.split(",")
      .map((f) => f.trim())
      .filter((f) => f);
  const tags = memFixedTags();
  return Array.from({
    length: tags.length / fixedColor.length + 1,
  }).flatMap(() => fixedColor);
});

export const memFixedTagColors = memoize(getFixedTagColors);
function getFixedTagColors() {
  const fixedTagColorStr = (getPref("fixed-tags-colors") as string) || "";
  const fixedTagColors = TagColor.map(fixedTagColorStr);
  if (!fixedTagColorStr) {
    const prefTags = ((getPref("tags") as string) || "")
      .split(",")
      .map((a) => a.trim())
      .filter((f) => f);
    const fixedColors =
      (getPref("fixed-colors") as string)
        ?.match(/#[0-9A-Fa-f]{6}/g)
        ?.map((a) => a) || [];
    const optionalColor =
      (getPref("optional-color") as string)?.match(/#[0-9A-Fa-f]{6}/g)?.[0] ||
      "#ffc0cb";
    if (prefTags && prefTags.length > 0) {
      const r = prefTags.map((a, i) => ({
        tag: a,
        color: fixedColors.length > i ? fixedColors[i] : optionalColor,
      }));
      fixedTagColors.splice(0, 999, ...r);
      setPref(
        "fixed-tags-colors",
        fixedTagColors.map((a) => a.tag + "," + a.color).join(" , "),
      );
    }
  }
  ztoolkit.log("fixedTagColorStr", fixedTagColorStr, fixedTagColors);
  return fixedTagColors;
}

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
  // memFixedTagColors().forEach(tagColor=>{
  //   const tag=tagColor.toString()
  //    if (tagGroup.findIndex((f) => f.key == tag) == -1) {
  //     tagGroup.push({ key: tag, values: [] });
  //   }
  // })
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
  const userLibraryID = Zotero.Libraries.userLibraryID;
  const allItems = await Zotero.Items.getAll(
    userLibraryID,
    false,
    false,
    false,
  );
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
  // ztoolkit.log(res);
  return res;
}
export function isDebug() {
  return !!getPref("debug");
}
export async function openAnnotation(
  item: Zotero.Item,
  page: string,
  annotationKey: string,
) {
  let doc: Document | undefined = undefined;
  let pdfDoc: Document | undefined = undefined;
  await Zotero.FileHandlers.open(item, {
    location: {
      annotationID: annotationKey,
      pageIndex: page,
    },
  });
  const tabId = Zotero_Tabs.getTabIDByItemID(item.id);
  getDoc();
  function getDoc() {
    const b = Zotero_Tabs.deck.querySelector(
      `[id^=${tabId}].deck-selected browser`,
    );
    doc = (b as any)?.contentDocument || undefined;
    if (!doc || !doc.querySelector("div,span")) {
      setTimeout(getDoc, 10);
      return;
    }
    getPdfDoc();
  }
  function getPdfDoc() {
    pdfDoc = doc!.querySelector("iframe")?.contentDocument || undefined;
    if (!pdfDoc || !pdfDoc.querySelector("div,span")) {
      setTimeout(getPdfDoc, 10);
      return;
    }
    sidebarItemFocus();
  }
  function sidebarItemFocus() {
    const sidebarItem = doc!.querySelector(
      `[data-sidebar-annotation-id="${annotationKey}"]`,
    ) as HTMLElement;
    if (sidebarItem) {
      setTimeout(() => sidebarItem.focus());
      return;
    }
    setTimeout(sidebarItemFocus, 10);
  }
}
