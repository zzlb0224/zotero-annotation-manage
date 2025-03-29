// import { memoize } from "./Memoize";
import { getPref, setPref } from "./prefs";
import memoize from "./memoize2";
import { config } from "../../package.json";
import { getColorTags } from "../modules/menu";
import { getCiteAnnotationHtml } from "../modules/getCitationItem";
import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { waitFor } from "./wait";
import { groupBy, groupByResult } from "./groupBy";
import { uniqueBy } from "./uniqueBy";
import { ProgressWindowHelper } from "zotero-plugin-toolkit/dist/helpers/progressWindow";
import { getString } from "./locale";
export class TagColor {
  public color: string;
  public tag: string;
  constructor(tagColor: string, removeSpace = false) {
    const ma = tagColor.match(removeSpace ? /(.*)(#[0-9a-fA-F]{6})/ : /^[\s,;]*(.*?)[\s,;]*(#[0-9a-fA-F]{6})/);
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
    return str.match(/(.*?)(#[0-9a-fA-F]{6})/g)?.map((ma) => new TagColor(ma)) || [];
  }
}

export function promiseAllWithProgress<T>(arr: Promise<T>[], callback?: { (progress: number, index: number): void }): Promise<T[]> {
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
export function getChildCollections(collections: Zotero.Collection[]): Zotero.Collection[] {
  const childCollections = uniqueBy(collections, (a) => a.key).flatMap((a) => a.getChildCollections(false));
  if (childCollections.length == 0) return [];
  return [...childCollections, ...getChildCollections(childCollections)];
}
export const FixedTagsDefault = "目的,假设,框架,数据,量表,方法,理论,结论,贡献,未来,背景,现状,问题,对策";
export const FixedColorDefault =
  "#ffd400, #ff6666, #5fb236, #2ea8e5, #a28ae5, #e56eee, #f19837, #aaaaaa, #69af15, #ba898e, #ee8574, #6a99e7, #e65fa1, #62e0ef, #f7e8b2";
const FixedColorDefaultArray = FixedColorDefault.split(",").map((f) => f.trim());
export const FixedTagsColorsDefault = FixedTagsDefault.split(",")
  .flatMap((f, i) => [f.trim(), FixedColorDefaultArray[i]])
  .join(", ");
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

export const memOptionalColor = memoize(() => (getPref("optional-color") as string)?.match(/#[0-9A-Fa-f]{6}/g)?.[0] || "#ffc0cb");
export const memFixedTags = memoize((collectionKey: string | undefined = undefined): string[] => {
  return memFixedTagColors(collectionKey)
    .filter((f) => f.tag)
    .map((f) => f.tag);
}, getCollectionKey);
const memFixedColors = memoize((collectionKey: string | undefined = undefined): string[] => {
  return memFixedTagColors(collectionKey)
    .filter((f) => f.tag)
    .map((f) => f.color);
}, getCollectionKey);

export const memFixedTagFromColor = memoize((color: string, collectionKey: string | undefined = undefined): string => {
  const tcs = getFixedTagColors(collectionKey);
  for (const tc of tcs) {
    if (tc.color === color) return tc.tag;
  }
  return "";
});

export const memFixedColor = memoize(
  (tag: string, optional: string | undefined = undefined, collectionKey: string | undefined = undefined): string => {
    const color = memFixedTagColors(collectionKey)
      .filter((f) => f.tag == tag)
      .map((f) => f.color)[0];

    // ztoolkit.log("memFixedColor",tag,color)
    if (color) return color;
    if (optional == undefined) return memOptionalColor() as string;
    return optional;
  },
  (tag: string, optional: string | undefined = undefined, collectionKey: string | undefined = undefined) =>
    tag + "_" + optional + "_" + getCollectionKey(collectionKey),
);

export const memFixedTagColors = memoize(getFixedTagColors, getCollectionKey);

function getCollectionKey(collectionKey: string | undefined = undefined) {
  return collectionKey === undefined ? Zotero.getActiveZoteroPane().getSelectedCollection()?.key || "" : collectionKey;
}

function getFixedTagColors(collectionKey: string | undefined = undefined) {
  let ck = getCollectionKey(collectionKey);
  let fixedTagColorStr = (getPref("FTC" + ck) as string | undefined) || "";
  while (!fixedTagColorStr) {
    const collection = (Zotero.Collections.getByLibraryAndKey(Zotero.Libraries.userLibraryID, ck) as Zotero.Collection) || false;

    ck = collection?.parentKey || "";
    fixedTagColorStr = (getPref("FTC" + ck) as string) || "";
    ztoolkit.log("FTC" + ck, ck, fixedTagColorStr);
    if (!collection) break;
  }
  const fixedTagColors = TagColor.map(fixedTagColorStr);
  // if (!fixedTagColorStr) {
  //   const prefTags = ((getPref("tags") as string) || "")
  //     .split(",")
  //     .map((a) => a.trim())
  //     .filter((f) => f);
  //   const fixedColors =
  //     (getPref("fixed-colors") as string)
  //       ?.match(/#[0-9A-Fa-f]{6}/g)
  //       ?.map((a) => a) || [];
  //   const optionalColor =
  //     (getPref("optional-color") as string)?.match(/#[0-9A-Fa-f]{6}/g)?.[0] ||
  //     "#ffc0cb";
  //   if (prefTags && prefTags.length > 0) {
  //     const r = prefTags.map((a, i) => ({
  //       tag: a,
  //       color: fixedColors.length > i ? fixedColors[i] : optionalColor,
  //     }));
  //     fixedTagColors.splice(0, 999, ...r);
  //     setPref(
  //       "fixed-tags-colors",
  //       fixedTagColors.map((a) => a.tag + "," + a.color).join(" , "),
  //     );
  //   }
  // }
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
  (tag: string, optional: string | undefined = undefined) => tag + "_" + optional,
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
  let fixedColor = (getPref("fixed-colors") as string)?.match(/#[0-9A-Fa-f]{6}/g)?.map((a) => a) || [];
  if (!fixedColor || fixedColor.length == 0)
    fixedColor = FixedColorDefault.split(",")
      .map((f) => f.trim())
      .filter((f) => f);
  const tags = memFixedTags();
  return Array.from({
    length: tags.length / fixedColor.length + 1,
  }).flatMap(() => fixedColor);
});

export function toggleProperty<T, K extends keyof NonNullable<T>>(obj: NonNullable<T> | undefined, key: K, values: NonNullable<T>[K][]) {
  if (obj) {
    return (obj[key] = values[(values.indexOf(obj[key]) + 1) % values.length]);
  }
}
export function setProperty<T, K extends keyof NonNullable<T>>(obj: NonNullable<T> | undefined, key: K, value: NonNullable<T>[K]) {
  if (obj) {
    return (obj[key] = value);
  }
}
export function groupByResultIncludeFixedTags<T>(tagGroup: groupByResult<T, string>[]) {
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
      //没有附加到Dom无法调用 new WebKitCSSMatrix，只能这样使用      ("translate(26.0842px, 108.715px)");
      const translateLeftTop = v.match(/translate[(]([\d.]*)px,\s?([\d.]*)px[)]/);
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
  const allItems = await Zotero.Items.getAll(userLibraryID, false, false, false);
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
  return groupBy([...tags, ...itemTags], (t14) => t14.tag);
});
export async function asyncGetAllTagsFromDB() {
  //使用异步查询优化性能
  const rows = await Zotero.DB.queryAsync(
    "select name as tag,type,ann.dateModified from itemTags it join tags t on it.tagID=t.tagID join items ann on it.itemID=ann.itemID"
  );
  if (!rows || rows.length < 1) return [];
  const lines: { tag: string; type: number; dateModified: string }[] = [];
  for (const row of rows as any[]) {
    lines.push({
      tag: row.tag,
      type: row.type,
      dateModified: row.dateModified,
    });
  }
  return lines;
}

export const memoizeAsyncGroupAllTagsDB = memoize(async () => {
  const lines = await asyncGetAllTagsFromDB();
  return groupBy(lines, (t15) => t15.tag);
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
    const selectedCollectionId = Zotero.getActiveZoteroPane().getSelectedCollection(true);
    if (selectedCollectionId) allCollectionIds.push(selectedCollectionId);
  }
  if (prefCurrentCollection) {
    const currentCollectionIds = item.parentItem ? item.parentItem.getCollections() : item.getCollections();
    allCollectionIds.push(...currentCollectionIds);
  }
  if (allCollectionIds.length > 0) {
    const allCollections = Zotero.Collections.get(allCollectionIds) as Zotero.Collection[];
    const collections = childrenCollections ? [...allCollections, ...getChildCollections(allCollections)] : allCollections;
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
  const pdfItems = Zotero.Items.get(pdfIds).filter((f) => f.isFileAttachment() && f.isAttachment());
  const annotations = pdfItems.flatMap((f) => f.getAnnotations(false));
  return annotations.flatMap((f) => f.getTags().map((a) => ({ tag: a.tag, type: a.type || 0, dateModified: f.dateModified })));
}
export function ReTest(reStr: string) {
  const txtRegExp = str2RegExps(reStr);
  ztoolkit.log("ReTest", txtRegExp);
  return (str: string) => txtRegExp.length == 0 || txtRegExp.some((a) => a.test(str));
}
export function str2RegExps(value: string) {
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
    ? (Zotero.Items.get(itemOrKeyOrId) as Zotero.Item)
    : typeof itemOrKeyOrId == "string"
      ? (Zotero.Items.getByLibraryAndKey(Zotero.Libraries.userLibraryID, itemOrKeyOrId) as Zotero.Item)
      : itemOrKeyOrId;
}
export async function openAnnotation(itemOrKeyOrId: Zotero.Item | string | number, page: string, annotationKey: string) {
  let doc: Document | undefined = undefined;
  let pdfDoc: Document | undefined = undefined;
  const item = getItem(itemOrKeyOrId);

  if (!item) return;
  //@ts-ignore Zotero.FileHandlers.open
  await Zotero.FileHandlers.open(item, {
    location: {
      annotationID: annotationKey,
      pageIndex: page,
    },
  });
  if (!annotationKey) return;
  const tabId = Zotero.getMainWindow().Zotero_Tabs.getTabIDByItemID(item.id);
  let times = 400;
  getDoc();
  function getDoc() {
    if (times-- < 0) return;
    const b = Zotero.getMainWindow().Zotero_Tabs.deck.querySelector(`[id^=${tabId}].deck-selected browser`) as any;
    doc = b?.contentDocument || undefined;
    if (doc && doc.querySelector("div,span")) getPdfDoc();
    else setTimeout(getDoc, 50);
  }
  function getPdfDoc() {
    if (times-- < 0) return;
    pdfDoc = doc!.querySelector("iframe")?.contentDocument || undefined;
    if (pdfDoc && pdfDoc.querySelector("div,span")) sidebarItemFocus();
    else setTimeout(getPdfDoc, 50);
  }
  function sidebarItemFocus() {
    if (times-- < 0) return;
    const sidebarItem = doc!.querySelector(`[data-sidebar-annotation-id="${annotationKey}"]`) as HTMLElement;
    if (sidebarItem) setTimeout(() => sidebarItem.focus(), 1);
    else setTimeout(sidebarItemFocus, 50);
  }
}

export async function injectCSSToReader() { }

export const memSVG = memoize(
  async (href: string) => await getFileContent(href),
  // .then(r=>r.replace(/xmlns="http:\/\/www.w3.org\/2000\/svg"/g,""))
);

export async function loadSVG(doc: Document, href: string = `chrome://${config.addonRef}/content/16/annotate-highlight.svg`) {
  // const href =svg.includes("chrome") `chrome://${config.addonRef}/content/${svg}`;

  const d = ztoolkit.UI.createElement(doc, "div", {
    properties: {
      innerHTML: await getFileContent(href),
    },
  });

  ztoolkit.log("加载css", d);
  return d;
}

export async function injectCSS(doc: Document | HTMLDivElement, filename: string = "annotation.css") {
  // if (Zotero) return;
  //chrome
  const href = `resource://${config.addonRef}/content/${filename}`;

  const d = ztoolkit.UI.appendElement(
    {
      tag: "style",
      namespace: "html",
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
    doc.children[0] ||
    doc,
  );
  // ztoolkit.log("加载css", d);
}
export async function getFileContent(path: string): Promise<string> {
  const contentOrXHR = await Zotero.HTTP.request("GET", path, {
    headers: { "Content-Type": "text/plain" },
    responseType: "text",
  });
  const content = typeof contentOrXHR === "string" ? contentOrXHR : (contentOrXHR as any as XMLHttpRequest).response;
  ztoolkit.log(path, content);
  return content;
}
export function createTopDiv(
  doc?: Document,
  id = config.addonRef + `-TopDiv`,
  sections: TagElementProps[] = ["action", "status", "query", "content"].map((a) => ({
    tag: "div",
    properties: { textContent: "" },
    classList: [a],
    styles: { display: "flex" },
  })),
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
        top: "118px", //建议从118开始，低于开始顶部菜单
        zIndex: "9999",
        maxWidth: "calc(100% - 300px)",
        maxHeight: "600px",
        overflowY: "overlay",
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
    doc.querySelector("#browser") || doc.querySelector("body") || doc.children[0] || doc,
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
  ) as HTMLDivElement;

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
          listener: (e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            div.remove();
          },
          options: { capture: true },
        },
        {
          type: "mouseover",
          listener: (e: { stopPropagation: () => void }) => {
            e.stopPropagation();
            closeTimer.startTimer(1000);
          },
          options: { capture: true },
        },
        {
          type: "mouseout",
          listener: (e: { stopPropagation: () => void }) => {
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
  interval: number;
  constructor(callback: (remainingTime: number) => void, ms = 15000, interval = 1000) {
    this._total = ms;
    this.callback = callback;
    this.interval = interval;
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
    }, this.interval);
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
export async function convertHtml(
  arr: AnnotationRes[],
  targetNoteItem: Zotero.Item | undefined = undefined,
  pw: ProgressWindowHelper | undefined = undefined,
) {
  try {
    // const annotations = arr.map((a) => a.ann);
    for (const a of arr) {
      const annotation = a.ann;
      if (annotation.annotationType === "image" && !(await Zotero.Annotations.hasCacheImage(annotation))) {
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
    ztoolkit.log(getString("text-error"), error);
  }

  const getImageCount = 0;

  const data = arr.map(async (ann) => {
    //TODO 感觉这个方法读取图片是从缓存里面读取的，有些图片没有加载成功
    // let html = (await Zotero.BetterNotes.api.convert.annotations2html([ann.ann], {
    //   noteItem: targetNoteItem,
    // })) as string;
    const anJson = await parseAnnotationJSON(ann.ann);
    let html = "";
    if (anJson) {
      html = Zotero.EditorInstanceUtilities.serializeAnnotations([anJson], false).html;
    }
    if (html) {
      //
    } else if (ann.ann.annotationType == ("underline" as string) || ann.ann.annotationType == ("text" as string)) {
      html = getCiteAnnotationHtml(
        ann.ann,
        `  ${ann.ann.annotationText || ""}
     ( ${ann.ann.parentItem?.parentItem?.firstCreator}, ${ann.ann.parentItem?.parentItem?.getField("year")}, p.${ann.ann.annotationPageLabel} ) ${ann.ann.annotationComment || ""}`,
      );
    } else {
      html = getCiteAnnotationHtml(ann.ann, "无法预览，请点击此处，选择“在页面显示”查看。");
      ztoolkit.log(html);
      // if(["ink","image"].includes(ann.type)&&getImageCount<5){
      //   getImageCount++
      //   const img =await getImageFromReader(ann)
      //   if(img)
      //    { ann.html=img+ getCiteAnnotationHtml(ann.ann,`[${ann.type}]`)}
      // }
    }
    if (html)
      ann.html = html
        .replace(/<br\s*>/g, "<br/>")
        .replace(/<\/p>$/, getColorTags(ann.tags.map((c) => c.tag)) + "</p>")
        .replace(/<\/span>\n\s*$/, getColorTags(ann.tags.map((c) => c.tag)) + "</span>\n")
        .replace(/<p>[\s\r\n]*<\/p>/g, "")
        .replace(/<img /g, '<img style="max-width: 100%;height: auto;" ');
    ztoolkit.log("convertHtml", [html]);
    return ann;
  });
  //使用Promise.all能并行计算？感觉比for快很多
  const list = await promiseAllWithProgress(data, (progress, index) => {
    pw?.changeLine({
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
  const tabId = Zotero.getMainWindow().Zotero_Tabs.getTabIDByItemID(an.pdf.id);
  const reader = Zotero.Reader.getByTabID(tabId);
  const image = await waitFor(() => reader?._internalReader?._annotationManager?._annotations?.find((f) => f.id == an.ann.key));
  Zotero.getMainWindow().Zotero_Tabs.select("zotero-pane");
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
export const regExpDate =
  /\d{1,2}[\s-]+(?:Jan|January|Feb|February|Mar|March|Apr|April|May|Jul|July|Aug|August|Oct|October|Dec|December)[\s-]+\d{2,4}/; // function getParentAttr(ele: Element | null, name = "id") {
//   if (!ele) return "";
//   const value = ele.getAttribute(name);
//   if (value) {
//     return value;
//   }
//   if (ele.parentElement) {
//     return getParentAttr(ele.parentElement, name);
//   }
//   return "";
// }
export async function createDialog(title: string, children: TagElementProps[]) {
  // const mainWindow = Zotero.getMainWindow();
  const dialogData: { [key: string | number]: any } = {
    inputValue: "test",
    checkboxValue: true,
    loadCallback: () => {
      ztoolkit.log(dialogData, "Dialog Opened!");
    },
    unloadCallback: () => {
      ztoolkit.log(dialogData, "Dialog closed!");
    },
  };
  const dialogHelper = new ztoolkit.Dialog(1, 1)
    .addCell(0, 0, {
      tag: "div",
      classList: ["root"],
      children: children,
    })
    .setDialogData(dialogData)
    .open(title, {
      // alwaysRaised: true,
      left: 0,
      top: 0,
      // fitContent: true,
      // centerscreen: true,
      height: Zotero.getMainWindow().innerHeight,
      width: Zotero.getMainWindow().innerWidth,
      noDialogMode: true,
      resizable: true,
    });

  await waitFor(() => dialogHelper.window.document.querySelector(".root"));
  addon.data.exportDialog = dialogHelper;
  return dialogHelper.window;
}
export async function getAnnotationContent(ann: Zotero.Item) {
  //@ts-ignore Zotero.BetterNotes
  let html = (await Zotero.BetterNotes.api.convert.annotations2html([ann], {
    noteItem: undefined,
  })) as string;
  // const jsonAnnotation = await parseAnnotationJSON(ann)
  // let html = ""
  // if (jsonAnnotation && ann.parentID) {
  //   const attachmentItem = Zotero.Items.get(ann.parentID);
  //   //@ts-ignore attachmentItemID
  //   jsonAnnotation.attachmentItemID = attachmentItem.id;
  //   jsonAnnotation.id = ann.key;
  //   html = Zotero.EditorInstanceUtilities.serializeAnnotations([jsonAnnotation], false).html
  // }

  if (html)
    html = html
      .replace(
        /<img (?<attrs>(?!style).*)\/>/g,
        '<div style="height:100px"><img style="height:100%;width:100%;object-fit:contain;" $<attrs>/></div>',
      ) //图片自适应  如果已经有style属性了，那么就跳过
      .replace(/<br>/g, "<br/>") // br 导致无法显示
      .replace(/<\/br>/g, "") // br 导致无法显示
      .replace(/<p>/g, `<p style="margin:0px">`);
  // 缩减头尾的空白
  else if (ann.annotationType == ("underline" as string) || ann.annotationType == ("text" as string))
    html = getCiteAnnotationHtml(
      ann,

      `  ${ann.annotationText || ""} ( ${ann.parentItem?.parentItem?.firstCreator}, ${ann.parentItem?.parentItem?.getField("year")}, p.${ann.annotationPageLabel} ) ${ann.annotationComment || ""}`,
    );
  else html = getString("text-empty");
  return html.replace(/<br\s*>/g, "<br/>");
}
export function getPublicationTags(topItem: Zotero.Item | string | undefined) {
  if (!topItem) {
    return "";
  }
  if (topItem instanceof String) {
    //@ts-ignore getField
    topItem = { getField: () => { return topItem }, objectType: "item" };
  }
  if (topItem instanceof Zotero.Item) {
    while (topItem.parentItem) topItem = topItem.parentItem;
  }
  //@ts-ignore ZoteroStyle
  const ZoteroStyle = Zotero.ZoteroStyle as any;
  if (!ZoteroStyle) {
    return "";
  }
  //const a = { getField: () => { return "Plos one" },objectType:"item" }

  const space = " ㅤㅤ ㅤㅤ";
  return Array.prototype.map
    .call(ZoteroStyle.api.renderCell(topItem, "publicationTags").childNodes, (e) => {
      e.innerText = space + e.innerText + space;
      return e.outerHTML;
    })
    .join(space);
}
export function addCssFile(doc: Document | undefined = undefined, filename: string = "", replace = false) {
  //文件要在这个文件夹里面annotation-manage\addon\chrome\content
  if (!doc) return;
  const id = `${config.addonRef}${filename}`.replace(/\./g, "_");
  if (replace) {
    doc.getElementById(id)?.remove();
  }
  if (!replace && doc.getElementById(id)) {
    return;
  }
  const styles = ztoolkit.UI.createElement(doc, "link", {
    properties: {
      id,
      type: "text/css",
      rel: "stylesheet",
      href: `chrome://${config.addonRef}/content/${filename}`,
    },
  });
  doc.documentElement.appendChild(styles);
}

export async function parseAnnotationJSON(annotationItem: Zotero.Item) {
  try {
    if (!annotationItem || !annotationItem.isAnnotation()) {
      return null;
    }
    const annotationJSON = await Zotero.Annotations.toJSON(annotationItem);
    const annotationObj = Object.assign({}, annotationJSON);
    annotationObj.id = annotationItem.key; // @ts-ignore 111
    annotationObj.attachmentItemID = annotationItem.parentItem?.id; // @ts-ignore 111
    delete annotationObj.key;
    for (const key in annotationObj) {
      // @ts-ignore 111
      annotationObj[key] = annotationObj[key] || "";
    } // @ts-ignore 111
    annotationObj.tags = annotationObj.tags || [];
    ztoolkit.log("parseAnnotationJSON", annotationObj);
    return annotationObj;
  } catch (e2) {
    // @ts-ignore 111
    Zotero.logError(e2);
    return null;
  }
}
export function clearChild(ele: Element | null) {
  if (ele) {
    for (const e of ele.children) e.remove();
    ele.innerHTML = "";
  }
}
export function stopPropagation(e: Event) {
  const win = (e.target as any).ownerGlobal;
  e = e || win?.event || Zotero.getMainWindow().event;
  if (e.stopPropagation) {
    e.stopPropagation(); //W3C阻止冒泡方法
  } else {
    e.cancelBubble = true; //IE阻止冒泡方法
  }
}
