import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { config } from "../../package.json";
import { getPref } from "../utils/prefs";
import {
  groupBy,
  groupByResult,
  groupByResultIncludeFixedTags,
  memAllTagsDB,
  memFixedColor,
  memFixedTags,
  memRelateTags,
  str2RegExp,
  uniqueBy,
} from "../utils/zzlb";
import {
  sortAsc,
  sortKey,
  sortModified,
  sortTags,
  sortTags1000Ann100Modified10Asc,
  sortTags100Modified10Asc,
  sortTags10ValuesLength,
  sortValuesLength,
} from "../utils/sort";
function register() {
  // if (!getPref("enable")) return;
  // ztoolkit.UI.basicOptions.log.disableZLog = true;
  ztoolkit.log("Annotations register");
  Zotero.Reader.registerEventListener(
    "renderTextSelectionPopup",
    renderTextSelectionPopup,
  );
  Zotero.Reader.registerEventListener(
    "createAnnotationContextMenu",
    createAnnotationContextMenu,
  );
}
function unregister() {
  ztoolkit.log("Annotations unregister");
  Zotero.Reader.unregisterEventListener(
    "renderTextSelectionPopup",
    renderTextSelectionPopup,
  );
  Zotero.Reader.unregisterEventListener(
    "createAnnotationContextMenu",
    createAnnotationContextMenu,
  );
}
export class AnnotationPopup {
  reader?: _ZoteroTypes.ReaderInstance;
  params?: {
    annotation?: _ZoteroTypes.Annotations.AnnotationJson;
    ids?: any;
    currentID?: string;
    x?: number;
    y?: number;
  };
  doc?: Document;
  isExistAnno: boolean;
  existAnnotations: Zotero.Item[];
  rootDiv?: HTMLElement; //占位div
  fontSize: string = "18px";
  relateTags: groupByResult<{ tag: string; type: number }>[] = [];
  tagsDisplay: groupByResult<{ tag: string; type: number }>[] = [];
  searchTag = "";
  selectedTags: { tag: string; color: string }[] = [];
  delTags: string[] = [];
  idRootDiv = `${config.addonRef}-PopupDiv`;
  idCloseButton = `${config.addonRef}-PopupDiv-close`;
  idTagsDiv = `${config.addonRef}-PopupDiv-tags-div`;
  btnClose?: HTMLElement;
  item?: Zotero.Item;
  onHidePopup?: () => void;
  intervalId?: NodeJS.Timeout;
  idSelectedTags = `${config.addonRef}-reader-div-selected-tags`;
  public constructor(
    reader?: _ZoteroTypes.ReaderInstance,
    params?: {
      annotation?: _ZoteroTypes.Annotations.AnnotationJson;
      ids?: any;
      currentID?: string;
      x?: number;
      y?: number;
    },
    item?: Zotero.Item,
    doc?: Document,
  ) {
    this.reader = reader;
    this.params = params;
    this.item = item || this.reader?._item || undefined;
    this.doc = doc || this.reader?._iframeWindow?.document;
    this.isExistAnno = !!params?.ids;
    this.existAnnotations = this.isExistAnno
      ? this.item!.getAnnotations().filter((f) =>
          this.params?.ids.includes(f.key),
        )
      : [];
    ztoolkit.log(this, this.existAnnotations);
    this.fontSize =
      (Zotero.Prefs.get(
        `extensions.zotero.ZoteroPDFTranslate.fontSize`,
        true,
      ) || 18) + "px";
    ztoolkit.log("初始化", this.createDiv());
  }

  private clearDiv() {
    if (!this.doc) return;
    if (
      this.doc.getElementById(this.idRootDiv)?.parentElement?.nodeName == "BODY"
    ) {
      this.doc.getElementById(this.idRootDiv)?.remove();
    } else {
      this.doc.getElementById(this.idRootDiv)?.parentElement?.remove();
    }
  }

  public removeDiv() {
    if (!this.doc) return;
    this.doc.getElementById(this.idRootDiv)?.remove();
    //@ts-ignore 隐藏弹出框
    this.reader?._primaryView._onSetSelectionPopup(null);
  }
  public createDiv() {
    if (!this.doc) return;
    this.clearDiv();
    const div = ztoolkit.UI.createElement(this.doc, "div", {
      namespace: "html",
      id: this.idRootDiv,
      styles: this.getRootStyle(), //创建的时候就要固定大小
      children: [
        {
          tag: "link",
          properties: {
            rel: "stylesheet",
            href: `chrome://${config.addonRef}/content/annotation.css`,
          },
        },
      ],
      listeners: [
        {
          type: "click",
          listener: (ev) => {
            this.startCountDown(true);
            if (this.btnClose) {
              this.btnClose.textContent = `手动关闭`;
            }
          },
        },
      ],
    });
    this.rootDiv = div;
    //创建完成之后用异步来更新
    setTimeout(async () => {
      await this.updateDiv(div);
    }, 500);
    return div;
  }
  private async updateDiv(root: HTMLDivElement) {
    const doc = this.doc;
    if (!doc) return;
    // const root = doc.getElementById(this.idRootDiv);
    if (!root || !root.parentNode) {
      setTimeout(async () => {
        await this.updateDiv(root);
      }, 500);
      return;
    }
    let relateTags: groupByResult<{
      tag: string;
      type: number;
      dateModified: string;
    }>[] = [];

    if (getPref("show-all-tags")) {
      relateTags = await memAllTagsDB();
    } else {
      relateTags = groupBy(memRelateTags(this.item), (t) => t.tag);
    }
    if (getPref("show-relate-tags")) groupByResultIncludeFixedTags(relateTags);
    if (getPref("sort") == "2") {
      relateTags = relateTags
        .map((r) => ({
          key: r.key,
          dateModified: r.values
            .map((v) => v.dateModified)
            .sort((a, b) => (b > a ? -1 : 1))[0],
          values: r.values,
        }))
        .sort(sortTags100Modified10Asc);
    } else if (getPref("sort") == "3") {
      const itemAnnTags = this.item
        ? // Zotero.Items.get(this.item.parentItem.getAttachments()).flatMap((f) => f.getAnnotations())
          this.item
            .getAnnotations()
            .flatMap((f) => f.getTags())
            .map((a) => a.tag)
            .sort(sortAsc)
        : [];
      relateTags = relateTags
        .map((r) => ({
          key: r.key,
          dateModified: r.values
            .map((v) => v.dateModified)
            .sort((a, b) => (b > a ? -1 : 1))[0],
          values: r.values,
        }))
        .sort(sortTags1000Ann100Modified10Asc(itemAnnTags));
    } else {
      relateTags = relateTags
        .map((r) => ({
          key: r.key,
          dateModified: r.values
            .map((v) => v.dateModified)
            .sort((a, b) => (b > a ? -1 : 1))[0],
          values: r.values,
        }))
        .sort(sortTags10ValuesLength);
    }

    this.relateTags = relateTags;
    this.tagsDisplay = this.excludeTags(relateTags);
    if (!root.querySelector("#" + this.idCloseButton)) {
      //按说不会出现重复添加现象，
      ztoolkit.UI.appendElement(this.createCurrentTags(), root);
      ztoolkit.UI.appendElement(this.createSearchDiv(), root);
      ztoolkit.UI.appendElement(this.createTagsDiv(), root);
    }

    this.btnClose = root.querySelector("#" + this.idCloseButton) as HTMLElement;
    // ztoolkit.log("append", this.rootDiv, closeTimeout, this.btnClose);
  }

  public startCountDown(
    stop = false,
    closeTimeout?: number,
    callback?: ((remainingTime: number) => void) | undefined,
  ) {
    let remainingTime =
      closeTimeout || (getPref("count-down-close") as number) || 15;
    if (callback == undefined)
      callback = (remainingTime: number) => {
        if (remainingTime > 0) {
          if (this.btnClose) {
            this.btnClose.textContent = `自动关闭（${remainingTime--}）`;
          }
        } else {
          this.rootDiv?.remove();
        }
      };
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
    if (stop) {
      this.intervalId && clearInterval(this.intervalId);
      return;
    }

    this.intervalId = setInterval(() => {
      if (remainingTime <= 0 || stop) {
        this.intervalId && clearInterval(this.intervalId);
        callback && callback(remainingTime);
      } else {
        callback && callback(remainingTime);
        remainingTime--;
      }
    }, 1000);
  }

  getRootStyle() {
    const doc = this.doc;
    if (!doc) return {};
    const {
      clientWidthWithoutSlider,
      scaleFactor,
      clientWidthWithSlider,
      pageLeft,
    } = this.getPrimaryViewDoc();
    let maxWidth = 888;
    const rootStyle: Partial<CSSStyleDeclaration> = {
      background: "#eeeeee",
      border: "#cc9999",
      overflowY: "scroll",
      maxHeight: "350px",
    };
    if (this.isExistAnno) {
      rootStyle.zIndex = "99990";
      rootStyle.position = "fixed";
      rootStyle.top = this.params?.y + "px";
      rootStyle.left = this.params?.x + "px"; //只有左边需要改，其它的固定

      //对已有标签处理 防止出现右边超出边界
      if (this.params?.x || 0 > clientWidthWithSlider - maxWidth) {
        rootStyle.left = clientWidthWithSlider - maxWidth - 23 + "px";
      }
    } else {
      //找到弹出框的中心点
      const centerLeft =
        this.params?.annotation?.position?.rects?.[0]?.[0] || 0;
      const centerRight =
        this.params?.annotation?.position?.rects?.[0]?.[0] || 0;
      const centerX = ((centerLeft + centerRight) * scaleFactor) / 2 + pageLeft;
      maxWidth =
        Math.min(
          centerX * 2,
          (clientWidthWithoutSlider - centerX) * 2,
          clientWidthWithoutSlider,
        ) *
          0.75 +
        50;
      //这个应该可以更精准的计算。但是不会啊
    }
    rootStyle.width = maxWidth + "px";
    return rootStyle;
  }
  createCurrentTags(): TagElementProps {
    const tags = this.existAnnotations.flatMap((a) => a.getTags());
    if (tags.length == 0) return { tag: "span" };
    const ts = groupBy(tags, (t) => t.tag).sort(sortValuesLength);
    const annLen =
      this.existAnnotations.length > 1
        ? `选中${this.existAnnotations.length}注释，`
        : "";
    return {
      tag: "div",
      styles: {
        padding: "3px 12px",
        display: "flex",
        flexWrap: "wrap",
        // justifyContent: "space-between",
        background: "#00990022",
      },
      children: [
        {
          tag: "button",
          namespace: "html",
          properties: {
            textContent: `${annLen}包含[${tags.length}]标签：`,
            title: "选中后删除",
          },
        },
        ...ts.map((t) => ({
          tag: "span",
          properties: { textContent: `[${t.values.length}]${t.key}` },
          styles: {
            margin: "1px",
            padding: "1px",
            fontSize: this.fontSize,
            boxShadow: "#009900 0px 0px 4px 3px",
            borderRadius: "3px",
          },
          listeners: [
            {
              type: "click",
              listener: (ev: Event) => {
                const target = ev.target as HTMLElement;
                const index = this.delTags.findIndex((f) => f == t.key);
                if (index == -1) {
                  this.delTags.push(t.key);
                  target.style.background = "#F88";
                } else {
                  this.delTags.splice(index, 1);
                  target.style.background = "";
                }
              },
            },
          ],
        })),
      ],
    };
  }

  createSearchDiv(): TagElementProps {
    let selectionStart = 0;
    let shiftStart = false;
    let selectionCount = 0;
    return {
      tag: "div",
      styles: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-start",
        // maxWidth: maxWidth + "px",
      },
      children: [
        {
          tag: "input",
          styles: { flex: "1", fontSize: this.fontSize },
          listeners: [
            {
              type: "keydown",
              listener: async (e: Event) => {
                const event = e as KeyboardEvent;
                const input = event.target as HTMLInputElement;
                if (!input) return;
                if (!event) return;
                if (event.key === "Shift") {
                  // 按下Shift键时，记录起始位置
                  shiftStart = true;
                  selectionStart = input.selectionStart || input.value.length;
                  selectionCount = 0;
                }
              },
            },
            {
              type: "keyup",
              listener: async (e: Event) => {
                const event = e as KeyboardEvent;
                const input = event.target as HTMLInputElement;
                if (!input) return;
                if (!event) return;

                if (event.key === "Shift") {
                  shiftStart = false;
                } else if (event.key === "ArrowLeft") {
                  if (shiftStart) {
                    selectionCount--;
                    const arg = [
                      selectionStart,
                      selectionStart + selectionCount,
                    ].sort((a, b) => a - b);
                    const d = selectionCount > 0 ? "forward" : "backward";
                    input.setSelectionRange(arg[0], arg[1], d);
                  } else {
                    const arr =
                      Math.max(
                        input.selectionDirection == "backward"
                          ? input.selectionStart || 0
                          : input.selectionEnd || 0,
                        1,
                      ) - 1;
                    input.selectionStart = input.selectionEnd = arr;
                  }
                  return;
                } else if (event.key === "ArrowRight") {
                  if (shiftStart) {
                    selectionCount++;
                    const arg = [
                      selectionStart,
                      selectionStart + selectionCount,
                    ].sort((a, b) => a - b);
                    const d = selectionCount > 0 ? "forward" : "backward";
                    input.setSelectionRange(arg[0], arg[1], d);
                  } else {
                    const arr =
                      Math.min(
                        input.selectionDirection == "backward"
                          ? input.selectionStart || 0
                          : input.selectionEnd || 0 || 0,
                        input.value.length - 1,
                      ) + 1;
                    input.selectionStart = input.selectionEnd = arr;
                  }
                  return;
                }
                this.searchTag = input.value.trim();
                if (event.key === "Enter") {
                  this.onTagClick(this.searchTag);
                  return;
                }
                ztoolkit.log(
                  event,
                  input.value.trim(),
                  input.selectionStart,
                  input.selectionEnd,
                  input.selectionDirection,
                );
                const tagDiv = this.rootDiv?.querySelector(
                  "#" + this.idTagsDiv,
                );
                if (tagDiv) {
                  this.tagsDisplay = await this.searchTagResult();
                  ztoolkit.UI.replaceElement(this.createTagsDiv(), tagDiv);
                }
                return true;
              },
            },
          ],
          properties: { textContent: this.searchTag, title: "敲回车增加标签" },
        },
        {
          tag: "div",
          styles: { display: "flex" },
          children: [
            {
              tag: "button",
              namespace: "html",
              properties: {
                textContent: getPref("multipleTags")
                  ? this.isExistAnno
                    ? "修改标签"
                    : "添加多个标签"
                  : "单标签",
              },
              styles: {
                margin: "2px",
                padding: "2px",
                border: "1px solid #dddddd",
                background: "#99aa66",
                fontSize: this.fontSize,
              },
              listeners: [
                {
                  type: "click",
                  listener: (e: Event) => {
                    // if (searchTag) onTagClick(searchTag, getFixedColor(searchTag));
                    this.saveAnnotationTags();
                  },
                },
              ],
            },
            {
              tag: "button",
              namespace: "html",
              id: this.idCloseButton,
              properties: {
                textContent: "关闭",
              },
              styles: {
                margin: "2px",
                padding: "2px",
                border: "1px solid #dddddd",
                background: "#99aa66",
                fontSize: this.fontSize,
              },
              listeners: [
                {
                  type: "click",
                  listener: (e: Event) => {
                    this.doc?.getElementById(this.idRootDiv)?.remove();
                    this.onHidePopup?.apply(this);
                    //@ts-ignore 隐藏弹出框
                    this.reader?._primaryView._onSetSelectionPopup(null);
                  },
                },
              ],
            },
          ],
        },
        {
          tag: "div",
          id: this.idSelectedTags,
          styles: { display: "flex", justifyContent: "space-between" },
        },
      ],
    };
  }
  excludeTags(
    from: groupByResult<{
      tag: string;
      type: number;
    }>[],
  ) {
    const tagsExclude = (getPref("tags-exclude") as string) || "";
    const rs = str2RegExp(tagsExclude);
    return from.filter((f) => !rs.some((s) => s.test(f.key)));
  }

  async searchTagResult() {
    if (this.searchTag) {
      const searchIn = await memAllTagsDB();
      //  getPref("show-all-tags")
      //   ? this.relateTags
      //   : await getAllTagsDB();
      const searchResult = searchIn.filter((f) =>
        new RegExp(this.searchTag, "i").test(f.key),
      );
      return searchResult;
    } else {
      return this.relateTags;
    }
  }

  createTagsDiv(): TagElementProps {
    const fixedTagsStyle = !!getPref("fixed-tags-style");
    const children = this.tagsDisplay
      .slice(0, (getPref("max-show") as number) || 200)
      .map((label) => {
        const tag = label.key;
        const allHave = this.isAllHave(tag);
        const noneHave = this.isNoneHave(tag);
        const someHave = this.strSomeHave(tag);
        const bgColor = memFixedColor(tag, "");
        if (fixedTagsStyle && memFixedTags().includes(tag)) {
          return {
            tag: "span",
            namespace: "html",
            classList: ["toolbarButton1"],
            styles: {
              margin: "2px",
              padding: "2px",
              fontSize: this.fontSize,
              // boxShadow: "#999999 0px 0px 4px 3px",
              borderRadius: "6px",
            },
            listeners: [
              {
                type: "click",
                listener: (e: Event) => {
                  ztoolkit.log("增加标签", label, this.params, e);
                  const target = e.target as HTMLElement;
                  target.style.boxShadow = "#ff0000 0px 0px 4px 3px";
                  this.onTagClick(tag, bgColor);
                },
              },
            ],
            children: [
              {
                tag: "span",
                namespace: "html",
                properties: {
                  textContent: `[${label.values.length}]`,
                },
                styles: {
                  // margin: "2px",
                  padding: "2px",
                  background: bgColor,
                  fontSize: this.fontSize,
                  boxShadow: "#999999 0px 0px 4px 3px",
                  borderRadius: "6px",
                },
              },
              {
                tag: "span",
                namespace: "html",
                styles: { textDecorationLine: allHave ? "line-through" : "" },
                properties: {
                  textContent: `${allHave || noneHave ? "" : `[${someHave}]`}${tag}`,
                },
              },
            ],
          };
        }
        return {
          tag: "span",
          namespace: "html",
          classList: ["toolbarButton1"],
          properties: {
            textContent: `${allHave || noneHave ? "" : `[${someHave}]`}[${label.values.length}]${tag}`,
          },
          styles: {
            margin: "2px",
            padding: "2px",
            background: bgColor,
            fontSize: this.fontSize,
            textDecorationLine: allHave ? "line-through" : "",
            boxShadow: "#999999 0px 0px 4px 3px",
            borderRadius: "6px",
          },
          listeners: [
            {
              type: "click",
              listener: (e: Event) => {
                ztoolkit.log("增加标签", label, this.params, e);
                const target = e.target as HTMLElement;
                target.style.boxShadow = "#ff0000 0px 0px 4px 3px";
                this.onTagClick(tag, bgColor);
              },
            },
          ],
        };
      });
    return {
      tag: "div",
      namespace: "html",
      id: this.idTagsDiv,
      styles: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-start",
        fontSize: this.fontSize,
      },
      children,
    };
  }

  strSomeHave(tag: string) {
    return (
      this.existAnnotations.filter((a) => a.hasTag(tag)).length +
      "/" +
      this.existAnnotations.length
    );
  }

  isNoneHave(tag: string) {
    return (
      this.existAnnotations.length == 0 ||
      this.existAnnotations.every((a) => !a.hasTag(tag))
    );
  }

  isAllHave(tag: string) {
    return (
      this.existAnnotations.length > 0 &&
      this.existAnnotations.every((a) => a.hasTag(tag))
    );
  }
  onTagClick(tag: string, color: string = "") {
    if (
      this.doc &&
      this.rootDiv &&
      this.selectedTags.every((s) => s.tag != tag)
    ) {
      this.selectedTags.push({
        tag,
        color: color || memFixedColor(tag, undefined),
      });
      ztoolkit.UI.appendElement(
        {
          tag: "span",
          namespace: "html",
          properties: { textContent: tag },
          styles: {
            background: color,
            margin: "3px",
            padding: "2px",
            boxShadow: "#ffbccb 0px 0px 3px 3px",
            // borderRadius: "666px",
            fontSize: this.fontSize,
          },
          listeners: [
            {
              type: "click",
              listener: (ev) => {
                const ele = ev.target as HTMLSpanElement;
                ele.remove();
                this.selectedTags.splice(
                  this.selectedTags.findIndex((f) => f.tag == tag),
                  1,
                );
              },
            },
          ],
        },
        this.rootDiv.querySelector("#" + this.idSelectedTags)!,
      );
    }
    if (!getPref("multipleTags")) {
      this.saveAnnotationTags();
    }
  }

  async saveAnnotationTags() {
    if (this.selectedTags.length == 0 && this.searchTag) {
      this.selectedTags.push({
        tag: this.searchTag,
        color: memFixedColor(this.searchTag, undefined),
      });
    }
    if (this.delTags.length == 0 && this.selectedTags.length == 0) return;

    const tagsRequire = await this.getTagsRequire();

    const tagsRemove = this.delTags.filter((f) => !tagsRequire.includes(f));
    ztoolkit.log("需要添加的tags", tagsRequire, "需要删除的", tagsRemove);
    if (this.reader) {
      if (this.isExistAnno) {
        for (const annotation of this.existAnnotations) {
          for (const tag of tagsRequire) {
            if (!annotation.hasTag(tag)) {
              annotation.addTag(tag, 0);
            }
          }
          for (const tag of tagsRemove) {
            if (annotation.hasTag(tag)) {
              annotation.removeTag(tag);
            }
          }
          annotation.saveTx(); //增加每一个都要保存，为啥不能批量保存？
        }
        this.doc?.getElementById(this.idRootDiv)?.remove();
      } else {
        const color =
          this.selectedTags.map((a) => a.color).filter((f) => f)[0] ||
          memFixedColor(tagsRequire[0], undefined);
        const tags = tagsRequire.map((a) => ({ name: a }));
        // 因为线程不一样，不能采用直接修改params.annotation的方式，所以直接采用新建的方式保存笔记
        // 特意采用 Components.utils.cloneInto 方法
        this.reader?._annotationManager.addAnnotation(
          Components.utils.cloneInto(
            { ...this.params?.annotation, color, tags },
            this.doc,
          ),
        );
        this.onHidePopup?.apply(this);
        //@ts-ignore 隐藏弹出框
        this.reader?._primaryView._onSetSelectionPopup(null);
      }

      memAllTagsDB.remove();
      memRelateTags.remove(this.item?.key);
    }
  }
  //测试预览
  private async getTagsRequire() {
    const bCombine = !!getPref("combine-nested-tags");
    const bKeepFirst = !!getPref("split-nested-tags-keep-first");
    const bKeepSecond = !!getPref("split-nested-tags-keep-second");
    const bKeepAll = !!getPref("split-nested-tags-keep-all");
    const sTags = this.selectedTags.map((a) => a.tag);
    const splitTags = sTags
      .filter((f) => f && f.startsWith("#") && f.includes("/"))
      .map((a) => a.replace("#", "").split("/"))
      .flatMap((a) =>
        bKeepAll ? a : [bKeepFirst ? a[0] : "", bKeepSecond ? a[1] : ""],
      );
    const nestedTags: string[] = bCombine
      ? await this.getNestedTags(sTags)
      : [];

    const tagsRequire = uniqueBy(
      [...sTags, ...nestedTags, ...splitTags].filter((f) => f),
      (u) => u,
    );
    return tagsRequire;
  }
  async getNestedTags(arr: string[]) {
    const filterArr = arr.filter(
      (f) => f && !f.startsWith("#") && !f.includes("/"),
    );
    const list: string[] = [];
    const allTags = await memAllTagsDB();
    for (const t1 of filterArr) {
      for (const t2 of filterArr) {
        if (t1 != t2) {
          const nTag = `#${t1}/${t2}`;
          if (allTags.some((s) => s.key == nTag)) {
            list.push(nTag);
          }
        }
      }
    }
    return list;
  }

  getPrimaryViewDoc() {
    const doc = this.doc!;
    const pvDoc =
      (doc.querySelector("#primary-view iframe") as HTMLIFrameElement)
        ?.contentDocument || doc;
    const scaleFactor =
      parseFloat(
        (pvDoc.querySelector("#viewer") as HTMLElement)?.style.getPropertyValue(
          "--scale-factor",
        ),
      ) || 1;
    const clientWidthWithSlider =
      doc.querySelector("body,div,hbox,vbox")?.clientWidth || 666; //包括侧边栏的宽度
    const clientWidthWithoutSlider =
      pvDoc.querySelector("body,div,hbox,vbox")?.clientWidth || 666; //不包括侧边栏的宽度
    const pageLeft =
      (pvDoc.querySelector("#viewer .page") as HTMLElement)?.offsetLeft || 0;
    return {
      clientWidthWithoutSlider,
      scaleFactor,
      clientWidthWithSlider,
      pageLeft,
    };
  }
}

function renderTextSelectionPopup(
  event: _ZoteroTypes.Reader.EventParams<"renderTextSelectionPopup">,
) {
  if (getPref("hide-in-selection-popup")) {
    return;
  }
  const { append, reader, doc, params } = event;
  const div = new AnnotationPopup(reader, params).rootDiv;
  // const div = createDiv(reader, params);
  if (div) {
    append(div);
  }
}
function createAnnotationContextMenu(
  event: _ZoteroTypes.Reader.EventParams<"createAnnotationContextMenu">,
) {
  if (getPref("hide-in-annotation-context-menu")) {
    return;
  }
  const { reader, params, append } = event;
  const doc = reader._iframeWindow?.document;
  if (!doc) return;
  //这里不能用异步
  const currentAnnotations = reader._item
    .getAnnotations()
    .filter((f) => params.ids.includes(f.key));
  const currentTags = groupBy(
    currentAnnotations.flatMap((f) => f.getTags()),
    (t) => t.tag,
  ).sort(sortValuesLength);
  const currentTagsString = currentTags
    .map((f) => `${f.key}[${f.values.length}]`)
    .join(",");
  const label =
    currentTags.length > 0
      ? `添加标签，已有${currentTags.length}个Tag【${currentTagsString.length > 11 ? currentTagsString.slice(0, 10) + "..." : currentTagsString}】`
      : "添加标签";
  append({
    label: label,
    onCommand: () => {
      // const div = createDiv(reader, params);
      const popDiv = new AnnotationPopup(reader, params);
      const div = popDiv.rootDiv;
      popDiv.startCountDown();
      if (div) {
        doc.body.appendChild(div);
      }
    },
  });
}
export default { register, unregister };
