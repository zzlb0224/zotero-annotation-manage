import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { config } from "../../package.json";
import { getPref } from "../utils/prefs";
import {
  mapDateModified,
  sortAsc,
  sortFixedTags100Modified10Asc,
  sortFixedTags10ValuesLength,
  sortTags1000Ann100Modified10Asc,
  sortValuesLength,
} from "../utils/sort";
import {
  CountDown,
  groupBy,
  groupByResult,
  groupByResultIncludeFixedTags,
  isDebug,
  memAllTagsDB,
  memFixedColor,
  memFixedTags,
  memRelateTags,
  str2RegExps,
  uniqueBy,
} from "../utils/zzlb";
import { Relations } from "../utils/Relations";
// import { text2Ma } from "./readerTools";
function register() {
  // if (!getPref("enable")) return;
  // ztoolkit.UI.basicOptions.log.disableZLog = true;
  // ztoolkit.log("Annotations register");

  if (!getPref("hide-in-selection-popup")) {
    Zotero.Reader.registerEventListener(
      "renderTextSelectionPopup",
      renderTextSelectionPopup,
    );
  }

  if (!getPref("hide-in-annotation-context-menu")) {
    Zotero.Reader.registerEventListener(
      "createAnnotationContextMenu",
      createAnnotationContextMenu,
    );
  }
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

class AnnotationPopup {
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
            // this.startCountDown(true);
            this.countDown.clear();
            if (this.btnClose) {
              this.btnClose.textContent = `手动关闭`;
            }
          },
        },
      ],
    });
    this.rootDiv = div;
    //创建完成之后用异步来更新
    // setTimeout(async () => {
    //   await this.updateDiv(div);
    // }, 500);
    this.updateDivStart(div);
    return div;
  }
  private updateDivStart(root: HTMLDivElement, times = 200) {
    if (times < 0) {
      return;
    }
    const doc = this.doc;
    if (!doc) return;

    if (!root) {
      setTimeout(() => {
        this.updateDivStart(root, times - 1);
      }, 50);
      return;
    }
    if (!root.parentNode) {
      const dd: HTMLElement | false = false;
      //应该在这里计算位置，这里最准确
      if (isDebug()) {
        // dd = ztoolkit.UI.appendElement(
        //   { tag: "div", properties: { textContent: "正在附加div" } },
        //   root,
        // ) as HTMLDivElement;
      }
      const colorsElement = this.doc!.querySelector(".selection-popup .colors");
      if (colorsElement) {
        ztoolkit.getGlobal("getComputedStyle")(colorsElement).width;
        const maxWidth = this.getSelectTextMaxWidth();
        const width = parseFloat(
          ztoolkit.getGlobal("getComputedStyle")(colorsElement).width,
        );
        root.style.width = maxWidth + "px";

        root.style.minWidth = Math.min(width, maxWidth) + "px";
      }
      const currentPage = this.getCurrentPageDiv();
      ztoolkit.log("getPage", colorsElement, this.params, currentPage);
      setTimeout(() => {
        this.updateDivStart(root, times - 1);
      }, 50);
      return;
    }
    // setTimeout(async () => {
    //这里只更新内容 不更新大小
    // if (isDebug()) {
    //   ztoolkit.UI.appendElement(
    //     { tag: "div", properties: { textContent: "开始更新div" } },
    //     root,
    //   );
    // }
    //   await this.updateDiv(root);
    // }, 50);
    this.updateDiv(root);
  }

  private getCurrentPageDiv() {
    const pageIndex = this.params?.annotation?.position?.pageIndex || 0;
    const currentPage =
      this.getPrimaryViewDoc1()?.querySelectorAll(".page")?.[pageIndex];
    return currentPage as HTMLDivElement;
  }

  private async updateDiv(root: HTMLDivElement) {
    const doc = this.doc;
    if (!doc) return;
    let relateTags: groupByResult<{
      tag: string;
      type: number;
      dateModified: string;
    }>[] = [];
    // root.style.width=this.getSelectTextWidth()+"px"
    if (getPref("show-all-tags")) {
      relateTags = await memAllTagsDB();
    } else {
      relateTags = groupBy(memRelateTags(this.item), (t10) => t10.tag);
    }
    if (getPref("show-relate-tags")) groupByResultIncludeFixedTags(relateTags);
    if (getPref("sort") == "2") {
      //2 固定标签 + 修改时间
      relateTags = relateTags
        .map(mapDateModified)
        .sort(sortFixedTags100Modified10Asc);
    } else if (getPref("sort") == "3") {
      //3 固定标签 + 本条目 + 修改时间
      const itemAnnTags = this.item
        ?.getAnnotations()
        .flatMap((f) => f.getTags())
        .map((a) => a.tag)
        .sort(sortAsc);
      relateTags = relateTags
        .map(mapDateModified)
        .sort(sortTags1000Ann100Modified10Asc(itemAnnTags));
    } else {
      //1 固定标签 + 出现次数
      relateTags = relateTags
        .map(mapDateModified)
        .sort(sortFixedTags10ValuesLength);
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
  public countDown = new CountDown(
    (remainingTime) => {
      if (remainingTime > 0) {
        if (this.btnClose) {
          this.btnClose.textContent = `自动关闭（${Math.round(remainingTime / 100) / 10}s）`;
        }
      } else {
        this.rootDiv?.remove();
      }
    },
    15300,
    100,
  );

  getRootStyle() {
    const doc = this.doc;
    if (!doc) return {};
    // const {
    //   clientWidthWithoutSlider,
    //   scaleFactor,
    //   clientWidthWithSlider,
    //   pageLeft,
    // } = this.getPrimaryViewDoc();
    const clientWidthWithSlider = this.getClientWidthWithSlider();
    const maxWidth = 888;
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
      rootStyle.width = maxWidth + "px";
    } else {
      //找到弹出框的中心点
      // rootStyle .width= this.getSelectTextWidth()+"px";
    }
    return rootStyle;
  }
  getAnnotationPositionLeft() {
    const page = this.getCurrentPageDiv();
    const rotation = page.querySelector(
      '.textLayer[data-main-rotation="90"],.textLayer[data-main-rotation="270"]',
    )
      ? 1
      : 0;
    const rects = this.params?.annotation?.position?.rects || [];
    return Math.min(...rects.map((a) => a[0 + rotation]));
  }
  getAnnotationPositionRight() {
    const page = this.getCurrentPageDiv();
    const rotation = page.querySelector(
      '.textLayer[data-main-rotation="90"],.textLayer[data-main-rotation="270"]',
    )
      ? 1
      : 0;
    const rects = this.params?.annotation?.position?.rects || [];
    return Math.max(...rects.map((a) => a[2 + rotation]));
  }
  getSelectTextMaxWidth() {
    const clientWidthWithSlider = this.getClientWidthWithSlider();
    const clientWidthWithoutSlider = this.getClientWidthWithoutSlider();
    const scaleFactor = this.getViewerScaleFactor();
    const pageLeft = this.getPageLeft();
    const centerLeft = this.getAnnotationPositionLeft();
    const centerRight = this.getAnnotationPositionRight();
    const centerX = ((centerLeft + centerRight) * scaleFactor) / 2 + pageLeft;
    ztoolkit.log("getSelectTextMaxWidth", {
      clientWidthWithoutSlider,
      clientWidthWithSlider,
      scaleFactor,
      pageLeft,
      centerLeft,
      centerRight,
      centerX,
    });
    const maxWidth =
      Math.min(
        centerX * 2,
        (clientWidthWithoutSlider - centerX) * 2,
        clientWidthWithoutSlider,
      ) - 50;

    return maxWidth;
  }

  createCurrentTags(): TagElementProps {
    const tags = this.existAnnotations.flatMap((a) => a.getTags());
    if (tags.length == 0) return { tag: "span" };
    const ts = groupBy(tags, (t9) => t9.tag).sort(sortValuesLength);
    const annLen =
      this.existAnnotations.length > 1
        ? `选中${this.existAnnotations.length}批注，`
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
        ...ts.map((t8) => ({
          tag: "span",
          properties: { textContent: `[${t8.values.length}]${t8.key}` },
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
                const index = this.delTags.findIndex((f) => f == t8.key);
                if (index == -1) {
                  this.delTags.push(t8.key);
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
  // selectedRelateAns: {
  //   text: string;
  //   pdfKey: string;
  //   page: string;
  //   openPdf: string;
  //   annotationKey: string;
  // }[] = [];
  createSearchDiv(): TagElementProps {
    let selectionStart = 0;
    let shiftStart = false;
    let selectionCount = 0;
    // const copyAns = text2Ma(addon.data.copy);
    const copyAns = Relations.getOpenPdfs(addon.data.copyText);
    // ztoolkit.log("检测复制内容", addon.data.copy, copyAns);
    const copyAnnEls: TagElementProps[] = [];
    const dE = copyAns.map((copyAn) => ({
      tag: "span",
      properties: { textContent: copyAn.text.substring(1, 7) },
      styles: {
        margin: "2px",
        padding: "2px",
        border: "1px solid #dddddd",
        background: "#aaff00",
        fontSize: this.fontSize,
      },
      id: `${config.addonRef}-mae-annotationKey-${copyAn.annotationKey}`,
      listeners: [
        {
          type: "click",
          listener: (ev: Event) => {
            const target = ev.target as HTMLElement;
            // const index = this.selectedRelateAns.findIndex(
            //   (f) => f.annotationKey == copyAn.annotationKey,
            // );
            // // ztoolkit.log("findMa", index, this.selectedCopyAns, copyAns);
            // if (index == -1) {
            //   this.selectedRelateAns.push(copyAn);
            //   target.style.boxShadow = "#009900 0px 0px 4px 3px";
            // } else {
            //   this.selectedRelateAns.splice(index, 1);
            //   target.style.boxShadow = "";
            // }
            // if (this.selectedRelateAns.length != copyAns.length) {
            //   this.doc!.getElementById(
            //     `${config.addonRef}-mae-annotation-all`,
            //   )!.style.boxShadow = "";
            // } else {
            //   this.doc!.getElementById(
            //     `${config.addonRef}-mae-annotation-all`,
            //   )!.style.boxShadow = "#009900 0px 0px 4px 3px";
            // }
          },
        },
      ],
    }));
    if (copyAns.length > 999)
      if (this.isExistAnno) {
        // copyAnnEls.push({
        //   tag: "span",
        //   properties: { textContent: "共" + copyAns.length + "条" },
        //   styles: {
        //     margin: "2px",
        //     padding: "2px",
        //     border: "1px solid #dddddd",
        //     background: "#ddff00",
        //     fontSize: this.fontSize,
        //   },
        //   id: `${config.addonRef}-mae-annotation-all`,
        //   listeners: [
        //     {
        //       type: "click",
        //       listener: (ev) => {
        //         const target = ev.target as HTMLElement;
        //         if (this.selectedRelateAns.length == copyAns.length) {
        //           this.selectedRelateAns.splice(0, 999);
        //           target.style.boxShadow = "";
        //         } else {
        //           this.selectedRelateAns.splice(0, 999, ...copyAns.slice(0, 999));
        //           target.style.boxShadow = "#009900 0px 0px 4px 3px";
        //         }
        //         copyAns.forEach((copyAn) => {
        //           const e = this.doc!.getElementById(
        //             `${config.addonRef}-mae-annotationKey-${copyAn.annotationKey}`,
        //           );
        //           ztoolkit.log(
        //             this.selectedRelateAns,
        //             e,
        //             `${config.addonRef}-mae-annotationKey-${copyAn.annotationKey}`,
        //             [...(target.parentElement?.children || [])].map((a) => a.id),
        //           );
        //           if (e) {
        //             e.style.boxShadow = this.selectedRelateAns.length
        //               ? "#009900 0px 0px 4px 3px"
        //               : "";
        //           }
        //         });
        //       },
        //     },
        //   ],
        // });
        // copyAnnEls.push({
        //   tag: "span",
        //   properties: { textContent: "保存双链信息" },
        //   listeners: [
        //     {
        //       type: "click",
        //       listener: () => {
        //         this.saveAnnLink();
        //       },
        //     },
        //   ],
        // });
      }

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
        // {
        //   tag: "div",
        //   styles: {
        //     display: "flex",
        //     flexDirection: "row",
        //     flexWrap: "wrap",
        //     justifyContent: "space-start",
        //   },
        //   children: copyAnnEls,
        // },
        {
          tag: "div",
          styles: {
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "space-start",
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
                      selectionStart =
                        input.selectionStart || input.value.length;
                      selectionCount = 0;
                    }
                  },
                },
                {
                  type: "keypress",
                  listener: async (e: Event) => {
                    const event = e as KeyboardEvent;
                    const input = event.target as HTMLInputElement;
                    if (!input) return;
                    if (!event) return;
                    ztoolkit.log("keypress", event);
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
                    }
                    if (event.key === "ArrowLeft") {
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
              properties: {
                textContent: this.searchTag,
                title: "敲回车增加标签",
              },
              id: config.addonRef + "_annotation_searchTag_input",
            },
            // ...mae,
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
  saveAnnLink() {
    throw new Error("Method not implemented.");
  }
  excludeTags(
    from: groupByResult<{
      tag: string;
      type: number;
    }>[],
  ) {
    const tagsExclude = (getPref("tags-exclude") as string) || "";
    const rs = str2RegExps(tagsExclude);
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
            {
              type: "contextmenu",
              listener: (e: Event) => {
                e.preventDefault(); // 阻止默认的右键菜单显示
                const searchTag_input = this.doc?.getElementById(
                  config.addonRef + "_annotation_searchTag_input",
                ) as HTMLInputElement;
                ztoolkit.log("右键菜单被触发", searchTag_input.value);
                if (searchTag_input) {
                  if (searchTag_input.value == "") searchTag_input.value = tag;
                  if (searchTag_input.value == tag) searchTag_input.value = "";
                }
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
          // annotation.relatedItems;

          //  const rs=annotation.getRelations()
          //  //@ts-ignore 1111
          //   const linkAnnotation =rs["link:annotation"] as string[]||[]
          //   this.selectedRelateAns
          //     .filter((f) => !linkAnnotation.includes(f.openPdf))
          //     .map((a) => a.openPdf)
          //     .forEach((relateItem) => {
          //       annotation.addRelation("link:annotation" as any, relateItem);
          //     });
          //   linkAnnotation
          //     .filter(
          //       (f) => !this.selectedRelateAns.find((a) => a.openPdf == f),
          //     )
          //     .forEach((relateItem) => {
          //       annotation.removeRelation("link:annotation" as any, relateItem);
          //     });
          // if(this.selectedRelateAns.length>0)

          annotation.saveTx(); //增加每一个都要保存，为啥不能批量保存？
          // ztoolkit.log(
          //   "保存关联",
          //   this.selectedRelateAns,
          //   this.selectedRelateAns.map((a) => a.annotationKey),
          //   annotation.relatedItems,
          // );
          // new Relations(annotation).setRelations(
          //   this.selectedRelateAns.map((a) => a.openPdf),
          // );
        }
        this.doc?.getElementById(this.idRootDiv)?.remove();
      } else {
        const color =
          this.selectedTags.map((a) => a.color).filter((f) => f)[0] ||
          memFixedColor(tagsRequire[0], undefined);
        const tags = tagsRequire.map((a) => ({ name: a }));

        // 因为线程不一样，不能采用直接修改params.annotation的方式，所以直接采用新建的方式保存笔记
        // 特意采用 Components.utils.cloneInto 方法
        const newAnn = this.reader?._annotationManager.addAnnotation(
          Components.utils.cloneInto(
            { ...this.params?.annotation, color, tags },
            this.doc,
          ),
        );

        // if (newAnn) {
        //   new Relations(newAnn.id).setRelations(
        //     this.selectedRelateAns.map((a) => a.openPdf),
        //   );
        // }
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
  getPrimaryViewDoc1() {
    return (
      this.doc?.querySelector("#primary-view iframe") as HTMLIFrameElement
    )?.contentDocument;
  }
  getViewerScaleFactor() {
    const pvDoc = this.getPrimaryViewDoc1();
    const scaleFactor =
      parseFloat(
        (
          pvDoc?.querySelector("#viewer") as HTMLElement
        )?.style.getPropertyValue("--scale-factor") || "1",
      ) || 1;
    return scaleFactor;
  }
  getViewerPadding() {
    const pvDoc = this.getPrimaryViewDoc1();
    const viewer = pvDoc?.querySelector("#viewer") as HTMLElement;
    return (
      parseFloat(ztoolkit.getGlobal("getComputedStyle")(viewer).paddingLeft) ||
      0
    );
  }
  getClientWidthWithoutSlider() {
    const clientWidthWithoutSlider =
      this.getPrimaryViewDoc1()?.querySelector("#viewerContainer")
        ?.clientWidth || 0;
    return clientWidthWithoutSlider;
  }
  getClientWidthWithSlider() {
    return this.doc?.querySelector("body,div,hbox,vbox")?.clientWidth || 0;
  }
  getPageLeft() {
    // const page = (this.getPrimaryViewDoc1()?.querySelector(
    //   "#viewer .page",
    // ) as HTMLElement)!;
    const page = this.getCurrentPageDiv();
    if (!page) return 0;
    let pageLeft = page.offsetLeft || 0;
    pageLeft -= (this.getPrimaryViewDoc1()?.querySelector(
      "#viewerContainer",
    ) as HTMLElement)!.scrollLeft;

    return pageLeft - this.getViewerPadding();
  }
  // getPrimaryViewDoc() {
  //   const doc = this.doc!;
  //   const pvDoc =
  //     (doc.querySelector("#primary-view iframe") as HTMLIFrameElement)
  //       ?.contentDocument || doc;
  //   const scaleFactor =
  //     parseFloat(
  //       (pvDoc.querySelector("#viewer") as HTMLElement)?.style.getPropertyValue(
  //         "--scale-factor",
  //       ),
  //     ) || 1;
  //   const clientWidthWithSlider =
  //     doc.querySelector("body,div,hbox,vbox")!.clientWidth; //包括侧边栏的宽度
  //   const clientWidthWithoutSlider =
  //     pvDoc.querySelector("body,div,hbox,vbox")!.clientWidth; //不包括侧边栏的宽度
  //   const page = (pvDoc.querySelector("#viewer .page") as HTMLElement)!;
  //   let pageLeft = page.offsetLeft || 0;
  //   pageLeft -= (pvDoc.querySelector("#viewerContainer") as HTMLElement)!
  //     .scrollLeft;
  //   // const st = ztoolkit.getGlobal("getComputedStyle")(page);
  //   // const stp = ztoolkit.getGlobal("getComputedStyle")(page.parentElement!);
  //   // ztoolkit.log(st.width, st.left, st.top, page.scrollLeft, page, st, stp);
  //   return {
  //     clientWidthWithoutSlider,
  //     scaleFactor,
  //     clientWidthWithSlider,
  //     pageLeft,
  //   };
  // }
}

function renderTextSelectionPopup(
  event: _ZoteroTypes.Reader.EventParams<"renderTextSelectionPopup">,
) {
  const { append, reader, doc, params } = event;
  const ap = new AnnotationPopup(reader, params);
  // addon.data.test = ap;
  const div = ap.rootDiv;
  // const div = createDiv(reader, params);
  if (div) {
    append(div);
  }
}
function createAnnotationContextMenu(
  event: _ZoteroTypes.Reader.EventParams<"createAnnotationContextMenu">,
) {
  const { reader, params, append } = event;
  const doc = reader?._iframeWindow?.document;
  if (!doc) return;
  //这里不能用异步
  const currentAnnotations = reader._item
    .getAnnotations()
    .filter((f) => params.ids.includes(f.key));
  const currentTags = groupBy(
    currentAnnotations.flatMap((f) => f.getTags()),
    (t7) => t7.tag,
  ).sort(sortValuesLength);
  const currentTagsString = currentTags
    .map((f) => `${f.key}[${f.values.length}]`)
    .join(",");
  const label =
    currentTags.length > 0
      ? `添加标签，已有${currentTags.length}个Tag【${currentTagsString.length > 11 ? currentTagsString.slice(0, 10) + "..." : currentTagsString}】`
      : "添加标签";
  //
  append({
    label: label,
    onCommand: () => {
      // const div = createDiv(reader, params);
      const popDiv = new AnnotationPopup(reader, params);
      const div = popDiv.rootDiv;
      // popDiv.startCountDown();
      popDiv.countDown.start();
      if (div) {
        doc.body.appendChild(div);
      }
    },
  });
}

export default { register, unregister, AnnotationPopup };
