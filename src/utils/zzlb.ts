// import { memoize } from "./Memoize";
import { getPref, setPref } from "./prefs";
import memoize from "./memoize2";
import { config } from "../../package.json";
import { stopPropagation } from "../modules/annotationsToNote";
import {
  getColorTags,
  getCiteAnnotationHtml,
  createPopupWin,
  popupWin,
} from "../modules/annotationsToNote";
import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
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
      removeSpace
        ? /(.*)(#[0-9a-fA-F]{6})/
        : /^[\s,;]*(.*?)[\s,;]*(#[0-9a-fA-F]{6})/,
    );
    this.tag = ma?.[1] || tagColor;
    this.color = ma?.[2] || "";
  }
  public toString(): string {
    return this.tag + this.color;
  }
  public static map(str: string) {
    ztoolkit.log(
      "TagColor map",
      str.match(/(.*?)(#[0-9a-fA-F]{6})/g),
      str.match(/(.*)(#[0-9a-fA-F])/g)?.map((ma) => new TagColor(ma)),
    );
    return (
      str.match(/(.*?)(#[0-9a-fA-F]{6})/g)?.map((ma) => new TagColor(ma)) || []
    );
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
export const memFixedTags = memoize((): string[] => {
  // ztoolkit.log("memFixedTags",memFixedTagColors().filter(f=>f.tag).map(f=>f.tag))
  return memFixedTagColors()
    .filter((f) => f.tag)
    .map((f) => f.tag);
});
const memFixedColors = memoize((): string[] => {
  return memFixedTagColors()
    .filter((f) => f.tag)
    .map((f) => f.color);
});
export const memFixedColor = memoize(
  (tag: string, optional: string | undefined = undefined): string => {
    const color = memFixedTagColors()
      .filter((f) => f.tag == tag)
      .map((f) => f.color)[0];

    // ztoolkit.log("memFixedColor",tag,color)
    if (color) return color;
    if (optional == undefined) return memOptionalColor() as string;
    return optional;
  },
  (tag: string, optional: string | undefined = undefined) =>
    tag + "_" + optional,
);

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
  ztoolkit.log("fixedTagColorStr 2 array", fixedTagColorStr, fixedTagColors);
  return fixedTagColors;
}

const memFixedColor2 = memoize(
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

const memFixedTags2 = memoize((): string[] => {
  const prefTags = ((getPref("tags") as string) || "")
    .split(",")
    .map((a) => a.trim())
    .filter((f) => f);
  if (prefTags && prefTags.length > 0) return prefTags;
  return FixedTagsDefault.split(",");
});
const memFixedColors2 = memoize((): string[] => {
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
export function getItem(itemOrKeyOrId: Zotero.Item | string | number) {
  return typeof itemOrKeyOrId == "number"
    ? Zotero.Items.get(itemOrKeyOrId)
    : typeof itemOrKeyOrId == "string"
      ? (Zotero.Items.getByLibraryAndKey(
          Zotero.Libraries.userLibraryID,
          itemOrKeyOrId,
        ) as Zotero.Item)
      : itemOrKeyOrId;
}
export async function openAnnotation(
  itemOrKeyOrId: Zotero.Item | string | number,
  page: string,
  annotationKey: string,
) {
  let doc: Document | undefined = undefined;
  let pdfDoc: Document | undefined = undefined;
  const item = getItem(itemOrKeyOrId);

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
    ) as any;
    doc = b?.contentDocument || undefined;
    if (doc && doc.querySelector("div,span")) getPdfDoc();
    else setTimeout(getDoc, 50);
  }
  function getPdfDoc() {
    pdfDoc = doc!.querySelector("iframe")?.contentDocument || undefined;
    if (pdfDoc && pdfDoc.querySelector("div,span")) sidebarItemFocus();
    else setTimeout(getPdfDoc, 50);
  }
  function sidebarItemFocus() {
    const sidebarItem = doc!.querySelector(
      `[data-sidebar-annotation-id="${annotationKey}"]`,
    ) as HTMLElement;
    if (sidebarItem) setTimeout(() => sidebarItem.focus(), 1);
    else setTimeout(sidebarItemFocus, 50);
  }
}

export const memSVG = memoize(async (href) => await getFileContent(href));

export async function loadSVG(
  doc: Document,
  href: string = `chrome://${config.addonRef}/content/16/annotate-highlight.svg`,
) {
  // const href =svg.includes("chrome") `chrome://${config.addonRef}/content/${svg}`;

  const d = ztoolkit.UI.createElement(doc, "div", {
    properties: {
      innerHTML: getFileContent(href),
    },
  });

  ztoolkit.log("加载css", d);
  return d;
}

export async function injectCSS(
  doc: Document,
  filename: string = "annotation.css",
) {
  const href = `chrome://${config.addonRef}/content/${filename}`;

  const d = ztoolkit.UI.appendElement(
    {
      tag: "style",
      id: config.addonRef + "_style_" + filename.replace(/[/:\s.]/g, "_"),
      properties: {
        innerHTML: getFileContent(href),
      },
      ignoreIfExists: true,
    },
    doc.querySelector("linkset") ||
      doc.querySelector("head") ||
      doc.querySelector("body") ||
      doc.querySelector("div") ||
      doc.children[0],
  );
  ztoolkit.log("加载css", d);
}
export async function getFileContent(path: string) {
  const contentOrXHR = await Zotero.HTTP.request("GET", path);
  const content =
    typeof contentOrXHR === "string"
      ? contentOrXHR
      : (contentOrXHR as any as XMLHttpRequest).response;
  return content;
}
export class Relations {
  item: Zotero.Item;
  constructor(itemOrKeyOrId: Zotero.Item | string | number) {
    this.item = getItem(itemOrKeyOrId);
  }
  static checkLinkAnnotation() {
    setTimeout(async () => {
      const d = await Zotero.RelationPredicates.add(
        Relations.RelationsPredicate,
      );
      ztoolkit.log(
        "check RelationPredicates " + Relations.RelationsPredicate,
        Zotero.RelationPredicates._allowAdd,
        d,
      );
    });
  }
  // static RelationsPredicate="link:annotation" as _ZoteroTypes.RelationsPredicate;
  static RelationsPredicate = "dc:relation" as _ZoteroTypes.RelationsPredicate;
  static RelationsTag = "🔗Bi-directional linked annotation";

  static openPdf2URI(str: string) {
    return this.allOpenPdf(str)
      .map((a) => getItem(a.annotationKey))
      .map((a) => Zotero.URI.getItemURI(a));
  }
  static allOpenPdf(str: string) {
    return (
      str
        .match(
          /.*(zotero:\/\/open-pdf\/library\/items\/(.*?)[?]page=(.*?)&annotation=([^)]*)).*/g,
        )
        ?.map((a) => a.toString())
        .map((a) => this.str2OpenPdf(a))
        .filter((f) => f.openPdf) || []
    );
  }
  static str2OpenPdf(str: string) {
    const a = str.match(
      /.*(zotero:\/\/open-pdf\/library\/items\/(.*?)[?]page=(.*?)&annotation=([^)]*)).*/,
    );
    return {
      text: a?.[0] || "",
      openPdf: a?.[1] || "",
      pdfKey: a?.[2] || "",
      page: a?.[3] || "",
      annotationKey: a?.[4] || "",
    };
  }
  static mapOpenPdf(strArray: string[]) {
    return strArray
      .map((str) =>
        str.match(
          /.*(zotero:\/\/open-pdf\/library\/items\/(.*?)[?]page=(.*?)&annotation=([^)]*)).*/,
        ),
      )
      .map((a) => ({
        text: a?.[0] || "",
        openPdf: a?.[1] || "",
        pdfKey: a?.[2] || "",
        page: a?.[3] || "",
        annotationKey: a?.[4] || "",
      }))
      .filter((f) => f.text);
  }
  getLinkRelations() {
    try {
      const rs = this.item.getRelations() as any;
      return (rs[Relations.RelationsPredicate] as string[]) || [];
    } catch (error) {
      ztoolkit.log("新创建的item会触发getRelations错误", error);
    }
    return [];
  }

  // setRelations(openPdfs: string[]) {
  //   const annotation = this.item;
  //   const d:any= {}

  //   d[Relations.RelationsPredicate] = openPdfs
  //   const changed = annotation.setRelations(d);
  //   if (changed) {
  //     annotation.saveTx();}
  //   this.setTag();
  // }
  setRelationsTag() {
    if (this.getLinkRelations().length > 0) {
      if (!this.item.hasTag(Relations.RelationsTag))
        this.item.addTag(Relations.RelationsTag, 1);
    } else {
      if (this.item.hasTag(Relations.RelationsTag))
        this.item.removeTag(Relations.RelationsTag);
    }
    // this.item.saveTx();
  }
  getOpenPdfUri() {
    return `zotero://open-pdf/library/items/${this.item.parentItemKey}?page=${this.item.annotationPageLabel}&annotation=${this.item.key}`;
  }
  // removeRelations(openPdfs: string[]) {
  //   const itemURIs= Relations.mapOpenPdf(openPdfs).map(a=>getItem(a.annotationKey)).map(a=>Zotero.URI.getItemURI(a))
  removeRelations(itemURIs: string[]) {
    const thisItemURI = Zotero.URI.getItemURI(this.item);
    const clearAll = itemURIs.includes(thisItemURI);
    // const itemURIs= Relations.mapOpenPdf(openPdfs).map(a=>getItem(a.annotationKey)).map(a=>Zotero.URI.getItemURI(a))
    const annotation = this.item;
    const linkRelations = this.getLinkRelations();
    ztoolkit.log("removeRelations", linkRelations, itemURIs, clearAll);
    const needRemove = clearAll
      ? linkRelations
      : itemURIs.filter((f) => linkRelations.includes(f));
    needRemove.forEach((f) => {
      annotation.removeRelation(Relations.RelationsPredicate, f);
    });
    annotation.saveTx();
    this.setRelationsTag();
    const thisOpenPdf = this.getOpenPdfUri();

    needRemove.forEach((f) => {
      const id = Zotero.URI.getURIItemID(f);
      if (id) {
        const item = getItem(id);
        const r = new Relations(item);
        r.removeRelations([thisItemURI]);
      }
    });

    // this.item = getItem(this.item.key);
  }
  // addRelations(openPdfs: string[]) {
  //   const itemURIs= Relations.mapOpenPdf(openPdfs).map(a=>getItem(a.annotationKey)).map(a=>Zotero.URI.getItemURI( a))
  addRelations(itemURIs: string[]) {
    const annotation = this.item;
    const linkRelations = this.getLinkRelations();
    const thisOpenPdf = this.getOpenPdfUri();

    const thisItemURI = Zotero.URI.getItemURI(this.item);
    const needConnect = itemURIs
      .filter((f) => !linkRelations.includes(f))
      .filter((f) => f != thisItemURI);
    needConnect.forEach((f) => {
      annotation.addRelation(Relations.RelationsPredicate, f);
    });
    annotation.saveTx();
    this.setRelationsTag();
    needConnect.forEach((f) => {
      const id = Zotero.URI.getURIItemID(f);
      if (id) {
        const item = getItem(id);
        const r = new Relations(item);
        r.addRelations([thisItemURI]);
      }
    });
  }
}
export function createTopDiv(
  doc?: Document,
  id = config.addonRef + `-TopDiv`,
  sections: TagElementProps[] = ["action", "status", "query", "content"].map(
    (a) => ({
      tag: "div",
      properties: { textContent: "" },
      classList: [a],
      styles: { display: "flex" },
    }),
  ),
) {
  if (!doc) return;
  doc.getElementById(id)?.remove();
  const div = ztoolkit.UI.appendElement(
    {
      tag: "div",
      id: id,

      styles: {
        padding: "10px",
        position: "fixed",
        left: "150px",
        top: "100px",
        zIndex: "9999",
        maxWidth: "calc(100% - 300px)",
        maxHeight: "600px",
        overflowY: "scroll",
        display: "flex",
        boxShadow: "#999999 0px 0px 4px 3px",
        background: "white",
        flexDirection: "column",
      },

      listeners: [
        {
          type: "mousedown",
          listener(ev: any) {
            //  if(ev) return;
            stopPropagation(ev);
            const x = ev.clientX - div.offsetLeft;
            const y = ev.clientY - div.offsetTop;
            doc.onmousemove = (e) => {
              stopPropagation(e);
              const top = e.clientY - y;
              div.style.left = e.clientX - x + "px";
              div.style.top = Math.max(e.clientY - y, 118) + "px";
              // ztoolkit.log(div.style.top )
            };
            doc.onmouseup = (e) => {
              stopPropagation(e);
              doc.onmousemove = doc.onmouseup = null;
            };
          },
        },
      ],
    },
    doc.querySelector("#browser") ||
      doc.querySelector("body") ||
      doc.children[0] ||
      doc,
  ) as HTMLDivElement;

  const modal = ztoolkit.UI.appendElement(
    {
      tag: "div",
      properties: {},
      styles: {
        backgroundColor: "white",
        padding: "0px",
        borderRadius: "5px",
        position: "relative",
        right: "-10px",
        top: "-10px",
      },
    },
    div,
  );

  const closeTimer = new Timer(() => div.remove());
  ztoolkit.UI.appendElement(
    {
      tag: "div",
      properties: { textContent: "X" },
      styles: {
        position: "absolute",
        top: "0px",
        right: "0px",
        width: "20px",
        height: "20px",
        backgroundColor: "red",
        color: "white",
        textAlign: "center",
        lineHeight: "20px",
        cursor: "pointer",
      },
      listeners: [
        {
          type: "click",
          listener: (e) => {
            e.stopPropagation();
            div.remove();
          },
          options: { capture: true },
        },
        {
          type: "mouseover",
          listener: (e) => {
            e.stopPropagation();
            closeTimer.startTimer(1000);
          },
          options: { capture: true },
        },
        {
          type: "mouseout",
          listener: (e) => {
            e.stopPropagation();
            closeTimer.clearTimer();
          },
          options: { capture: true },
        },
      ],
    },
    modal,
  );

  sections.forEach((a) => ztoolkit.UI.appendElement(a, div));
  return div;
}

export class CountDown {
  _total = 0;
  _timeout: NodeJS.Timeout | null = null;
  _start = 0;
  callback: (remainingTime: number) => void;
  delay: number;
  constructor(
    callback: (remainingTime: number) => void,
    ms = 15000,
    delay = 1000,
  ) {
    this._total = ms;
    this.callback = callback;
    this.delay = delay;
  }
  start(ms = 15000) {
    this.clear();
    this._total = ms > 0 ? ms : this._total;
    this._start = Date.now();
    this._timeout = setInterval(() => {
      const _remainingTime = this.remainingTime();
      this.callback(_remainingTime);
      if (_remainingTime < 0) {
        this.clear();
      }
    }, this.delay);
  }
  clear() {
    if (this._timeout) {
      clearInterval(this._timeout);
      this._timeout = null;
    }
  }
  remainingTime() {
    return this._total - Date.now() + this._start;
  }
}
export function waitFor<T>(
  callback: () => T,
  timeout = 100000,
): Promise<T | false> {
  return new Promise((resolve, reject) => {
    const startTime = Date.now();
    function checkElement() {
      const c = callback();
      if (c) {
        clearInterval(interval);
        resolve(c);
      } else if (Date.now() - startTime > timeout) {
        clearInterval(interval);
        resolve(false);
        // reject(new Error(`未完成`));
      }
    }
    const interval = setInterval(checkElement, 100);
  });
}
export async function convertHtml(
  arr: AnnotationRes[],
  targetNoteItem: Zotero.Item | undefined = undefined,
) {
  try {
    // const annotations = arr.map((a) => a.ann);
    for (const a of arr) {
      const annotation = a.ann;
      if (
        annotation.annotationType === "image" &&
        !(await Zotero.Annotations.hasCacheImage(annotation))
      ) {
        try {
          //呈现缓存图片
          // await Zotero.PDFRenderer.renderAttachmentAnnotations(
          //   annotation.parentID,
          // );
        } catch (e) {
          Zotero.debug(e);
          throw e;
        }
        break;
      }
    }
  } catch (error) {
    ztoolkit.log("发生错误", error);
  }

  const getImageCount = 0;

  const data = arr.map(async (ann) => {
    //TODO 感觉这个方法读取图片是从缓存里面读取的，有些图片没有加载成功
    const html = (await Zotero.BetterNotes.api.convert.annotations2html(
      [ann.ann],
      {
        noteItem: targetNoteItem,
      },
    )) as string;
    if (html)
      ann.html = html
        .replace(/<br\s*>/g, "<br/>")
        .replace(/<\/p>$/, getColorTags(ann.tags.map((c) => c.tag)) + "</p>")
        .replace(/<p>[\s\r\n]*<\/p>/g, "")
        .replace(/<img /g, '<img style="max-width: 100%;height: auto;" ');
    else {
      ann.html = getCiteAnnotationHtml(
        ann.ann,
        "无法预览，请点击此处，选择“在页面显示”查看。",
      );
      ztoolkit.log(html);
      // if(["ink","image"].includes(ann.type)&&getImageCount<5){
      //   getImageCount++
      //   const img =await getImageFromReader(ann)
      //   if(img)
      //    { ann.html=img+ getCiteAnnotationHtml(ann.ann,`[${ann.type}]`)}
      // }
    }
    return ann;
  });
  //使用Promise.all能并行计算？感觉比for快很多
  const list = await promiseAllWithProgress(data, (progress, index) => {
    createPopupWin({ lines: [""] });
    popupWin?.changeLine({
      progress,
      text: `[${progress.toFixed()}%] ${index}/${arr.length}`,
    });
  });
  ztoolkit.log(list);
  return list;
}
// let getImageCount=0
async function getImageFromReader(an: AnnotationRes) {
  // if(await waitFor(()=>getImageCount==0)){
  //   getImageCount++
  await openAnnotation(an.pdf, an.page, an.ann.key);
  const tabId = Zotero_Tabs.getTabIDByItemID(an.pdf.id);
  const reader = Zotero.Reader.getByTabID(tabId);
  const image = await waitFor(() =>
    reader?._internalReader?._annotationManager?._annotations?.find(
      (f) => f.id == an.ann.key,
    ),
  );
  Zotero_Tabs.select("zotero-pane");
  // Zotero_Tabs.close(tabId)
  // getImageCount--
  ztoolkit.log("预览 reader", reader, image);
  if (image) return `<img src="${image.image}"/>`;
  // }
}
export class Timer {
  closeTimer: NodeJS.Timeout | null;
  callback: () => void;
  constructor(callback: () => void) {
    this.closeTimer = null;
    this.callback = callback;
  }
  startTimer(ms = 3000) {
    this.clearTimer();
    this.closeTimer = setTimeout(() => {
      this.callback();
      if (this.closeTimer) {
        clearTimeout(this.closeTimer);
        this.closeTimer = null;
      }
    }, ms);
  }
  clearTimer() {
    if (this.closeTimer) {
      clearTimeout(this.closeTimer);
      this.closeTimer = null;
    }
  }
}

export interface AnnotationRes {
  item: Zotero.Item;
  pdf: Zotero.Item;
  ann: Zotero.Item;
  author: string;
  year: string;
  title: string;
  pdfTitle: string;
  text: string;
  color: string;
  type: _ZoteroTypes.Annotations.AnnotationType;
  comment: string;
  itemTags: string;
  annotationTags: string;
  page: string;
  dateModified: string;
  tags: { tag: string; type: number }[];
  tag: { tag: string; type: number }; //flatMap(a=>Object.(a))
  html: string; //convertHtml
}
