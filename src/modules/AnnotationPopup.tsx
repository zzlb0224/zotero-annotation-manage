import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { config } from "../../package.json";
import { getPref, getPrefAs, setPref } from "../utils/prefs";
import {
  mapDateModified,
  sortAsc,
  sortFixed,
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
  memFixedTagFromColor,
  memFixedTags,
  memRelateTags,
  str2RegExps,
  uniqueBy,
} from "../utils/zzlb";
import { Relations } from "../utils/Relations";
import { createRoot } from "react-dom/client";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { getString } from "../utils/locale";
import { useImmer } from "use-immer";
import { ArrowContainer, Popover, usePopover } from "react-tiny-popover";
import { HexColorPicker } from "react-colorful";
import { ChangeColor } from "../component/ChangeColor";

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
  rootDiv?: HTMLDivElement; //占位div
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
    // 这里引发的 #38 ，可能是json循环输出的问题？
    // ztoolkit.log(this, this.existAnnotations);
    ztoolkit.log("bbbb", params);

    this.fontSize =
      (Zotero.Prefs.get(
        `extensions.zotero.ZoteroPDFTranslate.fontSize`,
        true,
      ) || 18) + "px";
    ztoolkit.log("初始化");
    this.createDiv();
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
    Zotero.test_doc = this.doc;
    Zotero.test_params = this.params;
    this.clearDiv();
    //
    this.rootDiv = ztoolkit.UI.createElement(this.doc, "div", {
      namespace: "html",
      id: this.idRootDiv,
      // styles: this.getRootStyle(), //创建的时候就要固定大小
      // classList: ["width100", "minWidth100"],
      children: [
        {
          tag: "link",
          properties: {
            rel: "stylesheet",
            href: `resource://${config.addonRef}/content/annotation.css`,
          },
        },
      ],
      listeners: [
        {
          type: "click",
          listener: (_ev: any) => {
            // this.startCountDown(true);
            this.countDown.clear();
            if (this.btnClose) {
              this.btnClose.textContent = `手动关闭`;
            }
          },
          options: { capture: false },
        },
      ],
    });
    //创建完成之后用异步来更新
    // setTimeout(async () => {
    //   await this.updateDiv(div);
    // }, 500);

    this.updateDivAble();
  }
  private updateDivAble(times = 2000, delay = 10) {
    const root = this.rootDiv;
    if (!root) return;
    if (times < 0) {
      return;
    }
    const doc = this.doc;
    if (!doc) return;

    if (!root) {
      setTimeout(() => {
        this.updateDivAble(times - 1);
      }, delay);
      return;
    }
    //确保已经附加到上级
    if (!root.parentNode) {
      //应该在这里计算位置，这里最准确
      if (isDebug()) {
        // const dd: HTMLElement | false = false;
        // dd = ztoolkit.UI.appendElement(
        //   { tag: "div", properties: { textContent: "正在附加div" } },
        //   root,
        // ) as HTMLDivElement;
      }

      // ztoolkit.log("getPage", colorsElement, this.params, currentPage);
      setTimeout(() => {
        this.updateDivAble(times - 1);
      }, delay);
      return;
    }
    this.updateColorsElement();
    //重置大小
    // setTimeout(() => {
    //   const textarea = this.doc?.querySelector(
    //     ".zoteropdftranslate-popup-textarea.zoteropdftranslate-readerpopup",
    //   ) as HTMLTextAreaElement | undefined;
    //   const selectionMenu = this.doc?.querySelector(".selection-popup") as
    //     | HTMLDivElement
    //     | undefined;
    //   if (textarea && selectionMenu) {
    //     updatePopupSize(selectionMenu, textarea, true);
    //   }
    // }, 300);
    // const currentPage = this.getCurrentPageDiv();

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

    // this.updateDiv();
    const rr = ztoolkit.UI.appendElement(
      { tag: "div" },
      root,
    ) as HTMLDivElement;
    ztoolkit.log("root和rr", root, rr);
    // if (isDebug())
    setTimeout(() => {
      createRoot(rr).render(
        <>
          <PopupRoot
            reader={this.reader!}
            doc={this.doc!}
            params={this.params!}
            root={root}
            maxWidth={this.getSelectTextMaxWidth()}
          />
        </>,
      );
    })
  }

  private updateColorsElement() {
    const root = this.rootDiv;
    if (!root) return;
    const colorsElement = this.doc!.querySelector(".selection-popup .colors");
    if (colorsElement) {
      ztoolkit.log(colorsElement);
      const showColorTag = getPref("show-selected-popup-colors-tag");
      const showMatchTag = getPref("show-selected-popup-match-tag");
      if (showColorTag || showMatchTag) {
        //初始化
        if (colorsElement.firstElementChild?.tagName == "BUTTON") {
          ztoolkit.log("button", colorsElement);
          colorsElement.querySelectorAll("button").forEach((btn, _i) => {
            const colorDiv = ztoolkit.UI.appendElement(
              {
                tag: "div",
                styles: { display: "flex", flexDirection: "column" },
                classList: ["colorDiv"],
              },
              colorsElement,
            ) as HTMLDivElement;
            colorDiv.appendChild(btn);
          });
        }
        //更新组件
        colorsElement.querySelectorAll("div.colorDiv").forEach((d, _i) => {
          const colorDiv = d as HTMLDivElement;
          const btn = colorDiv.querySelector("button") as HTMLButtonElement;
          let spanColorTag = btn.querySelector(
            "span.color-tag",
          ) as HTMLSpanElement | null;
          if (showColorTag) {
            if (!spanColorTag) {
              spanColorTag = ztoolkit.UI.appendElement(
                { tag: "span", classList: ["color-tag"] },
                btn,
              ) as HTMLSpanElement;
              spanColorTag.textContent = btn.title;
              btn.querySelector("svg")!.style.minHeight = "20px";
              btn.style.width = "unset";
              btn.style.height = "unset";
              btn.style.display = "flex";
              btn.style.flexDirection = "column";
            }
            spanColorTag.textContent = `${btn.title}   `;
          } else {
            spanColorTag?.remove();
          }
          const color = btn.querySelector("path")!.getAttribute("fill") || "";
          if (color) {
            let fixTagSpan = colorDiv.querySelector(
              "span.match-tag",
            ) as HTMLSpanElement | null;
            if (showMatchTag) {
              if (!fixTagSpan) {
                fixTagSpan = ztoolkit.UI.appendElement(
                  {
                    tag: "span",
                    styles: { width: "unset", height: "unset" },
                    classList: ["toolbar-button", "match-tag"],
                    properties: { textContent: "" },
                    listeners: [
                      {
                        type: "click",
                        listener: () => {
                          const tag = fixTagSpan?.textContent;
                          const color =
                            fixTagSpan?.getAttribute("data-color") || "";
                          if (tag && color) {
                            this.selectedTags.push({
                              tag,
                              color,
                            });
                            this.saveAnnotationTags();
                          }
                        },
                      },
                    ],
                  },
                  colorDiv,
                ) as HTMLDivElement;
              }
              fixTagSpan.setAttribute("data-color", color);
              fixTagSpan.textContent = memFixedTagFromColor(color);
            } else {
              fixTagSpan?.remove();
            }
          }
        });
      }
      // ztoolkit.getGlobal("getComputedStyle")(colorsElement).width;
      // const maxWidth = this.getSelectTextMaxWidth();
      // const width = parseFloat(
      //   ztoolkit.getGlobal("getComputedStyle")(colorsElement).width,
      // );
      // root.style.width = maxWidth + "px";

      // root.style.minWidth = Math.min(width, maxWidth) + "px";
      // // 当翻译采用固定大小的时候，跟随它
      // const keepSize = Zotero.Prefs.get(
      //   `extensions.zotero.ZoteroPDFTranslate.keepPopupSize`,
      //   true,
      // ) as boolean;

      // if (keepSize) {
      //   if (maxWidth < width) {
      //     //说明会越界
      //   }

      //   root.style.minWidth = width + "px";
      //   root.style.width = width + "px";
      // }
    }
  }

  private getCurrentPageDiv() {
    const pageIndex = this.params?.annotation?.position?.pageIndex || 0;
    const currentPage =
      this.getPrimaryViewDoc1()?.querySelectorAll(".page")?.[pageIndex];
    return currentPage as HTMLDivElement;
  }

  private async updateDiv() {
    const root = this.rootDiv;
    if (!root) return;
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
      if (this.intervalId) clearInterval(this.intervalId);
      return;
    }

    this.intervalId = setInterval(() => {
      if (remainingTime <= 0 || stop) {
        if (this.intervalId) clearInterval(this.intervalId);
        if (callback) callback(remainingTime);
      } else {
        if (callback) callback(remainingTime);
        remainingTime--;
      }
    }, 1000);
  }
  private countDownDec = Math.max(
    Math.min((getPref("count-down-close-dec") as number | undefined) || 0, 3),
    -1,
  );
  public countDown = new CountDown(
    (remainingTime) => {
      if (remainingTime > 0) {
        if (this.btnClose) {
          // remainingTime;
          // ztoolkit.log(remainingTime, dec, sec)
          this.btnClose.textContent = `自动关闭（${(remainingTime / 1000).toFixed(this.countDownDec)}s）`;
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
      // background: "#eeeeee",
      border: "#cc9999",
      overflowY: "scroll",
      maxHeight: "300px",
    };
    if (this.isExistAnno) {
      rootStyle.zIndex = "99990";
      rootStyle.position = "fixed";
      rootStyle.top = (this.params?.y || 0) + "px";
      rootStyle.left = (this.params?.x || 0) + "px"; //只有左边需要改，其它的固定

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
    const rotation = page?.querySelector(
      '.textLayer[data-main-rotation="90"],.textLayer[data-main-rotation="270"]',
    )
      ? 1
      : 0;
    const rects = this.params?.annotation?.position?.rects || [];
    return Math.min(...rects.map((a) => a[0 + rotation]));
  }
  getAnnotationPositionRight() {
    const page = this.getCurrentPageDiv();
    const rotation = page?.querySelector(
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
        ? `选中${this.existAnnotations.length} 批注，`
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
            textContent: `${annLen} 包含[${tags.length}]标签：`,
            title: "选中后删除",
          },
        },
        ...ts.map((t8) => ({
          tag: "span",
          properties: { textContent: `[${t8.values.length}]${t8.key} ` },
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
      id: `${config.addonRef} -mae - annotationKey - ${copyAn.annotationKey} `,
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
            //     `${ config.addonRef } -mae - annotation - all`,
            //   )!.style.boxShadow = "";
            // } else {
            //   this.doc!.getElementById(
            //     `${ config.addonRef } -mae - annotation - all`,
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
        //   id: `${ config.addonRef } -mae - annotation - all`,
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
        //             `${ config.addonRef } -mae - annotationKey - ${ copyAn.annotationKey } `,
        //           );
        //           ztoolkit.log(
        //             this.selectedRelateAns,
        //             e,
        //             `${ config.addonRef } -mae - annotationKey - ${ copyAn.annotationKey } `,
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
                  listener: (_e: Event) => {
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
                  listener: (_e: Event) => {
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
    // 动态设置也不可以，因为需要出发弹出窗口计算的那个代码
    // const colorsElement = this.doc!.querySelector(".selection-popup .colors");
    // if (colorsElement) {
    //   ztoolkit.getGlobal("getComputedStyle")(colorsElement).width;
    //   const maxWidth = this.getSelectTextMaxWidth();
    //   const width = parseFloat(
    //     ztoolkit.getGlobal("getComputedStyle")(colorsElement).width,
    //   );
    //   if (this.rootDiv) {
    //     this.rootDiv.style.width = maxWidth + "px";
    //     this.rootDiv.style.minWidth = Math.min(width, maxWidth) + "px";
    //     if (this.tagsDisplay.length == 0) {
    //       this.rootDiv.style.minWidth = "";
    //       this.rootDiv.style.width = "";
    //     }
    //   }
    // }
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
                  margin: "2px",
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
                  textContent: `${allHave || noneHave ? "" : `[${someHave}]`}${tag} `,
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
            textContent: `${allHave || noneHave ? "" : `[${someHave}]`} [${label.values.length}]${tag} `,
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
      properties: {
        textContent: this.searchTag
          ? "搜索中"
          : `${ZoteroPane.getSelectedCollection()?.name || ""}`,
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
              listener: (ev: Event) => {
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

  private async saveAnnotationTags() {
    const selectedTags = this.selectedTags;
    const searchTag = this.searchTag;
    const delTags = this.delTags;
    const reader = this.reader!;
    const doc = this.doc!;
    const params = this.params!;
    const existAnnotations = this.existAnnotations;
    const root = this.rootDiv;

    await saveAnnotationTags(
      searchTag,
      selectedTags,
      delTags,
      reader,
      params,
      doc,
    );
    if (params.ids) {
      root?.remove();
    }
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
}

async function saveAnnotationTags(
  searchTag: string,
  selectedTags: { tag: string; color: string }[],
  delTags: string[],
  reader: _ZoteroTypes.ReaderInstance<"pdf" | "epub" | "snapshot">,
  params: {
    annotation?: _ZoteroTypes.Annotations.AnnotationJson | undefined;
    ids?: any;
    currentID?: string | undefined;
    x?: number | undefined;
    y?: number | undefined;
  },
  // root: HTMLElement | undefined,
  doc: Document,
) {
  if (selectedTags.length == 0 && searchTag) {
    selectedTags.push({
      tag: searchTag,
      color: memFixedColor(searchTag, undefined),
    });
  }
  if (delTags.length > 0 || selectedTags.length > 0) {
    const tagsRequire = await getTagsRequire(
      selectedTags.map((tag) => tag.tag),
    );

    const tagsRemove = delTags.filter((f) => !tagsRequire.includes(f));
    ztoolkit.log("需要添加的tags", tagsRequire, "需要删除的", tagsRemove);
    if (reader) {
      const item = reader._item;
      if (params.ids) {
        const existAnnotations = item
          .getAnnotations()
          .filter((f) => params.ids.includes(f.key));
        for (const annotation of existAnnotations) {
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
        // root?.remove();
      } else {
        const color =
          selectedTags.map((a) => a.color).filter((f) => f)[0] ||
          memFixedColor(tagsRequire[0], undefined);
        const tags = tagsRequire.map((a) => ({ name: a }));

        // 因为线程不一样，不能采用直接修改params.annotation的方式，所以直接采用新建的方式保存笔记
        // 特意采用 Components.utils.cloneInto 方法
        const newAnn = reader?._annotationManager.addAnnotation(
          Components.utils.cloneInto(
            { ...params?.annotation, color, tags },
            doc,
          ),
        );
        //@ts-ignore 隐藏弹出框
        reader?._primaryView._onSetSelectionPopup(null);
      }
      memAllTagsDB.remove();
    }
  }
}

async function getTagsRequire(selectedTags: string[]) {
  const bCombine = !!getPref("combine-nested-tags");
  const bKeepFirst = !!getPref("split-nested-tags-keep-first");
  const bKeepSecond = !!getPref("split-nested-tags-keep-second");
  const bKeepAll = !!getPref("split-nested-tags-keep-all");
  const sTags = selectedTags.map((a) => a);
  const splitTags = sTags
    .filter((f) => f && f.startsWith("#") && f.includes("/"))
    .map((a) => a.replace("#", "").split("/"))
    .flatMap((a) =>
      bKeepAll ? a : [bKeepFirst ? a[0] : "", bKeepSecond ? a[1] : ""],
    );
  const nestedTags: string[] = bCombine ? await getNestedTags(sTags) : [];

  const tagsRequire = uniqueBy(
    [...sTags, ...nestedTags, ...splitTags].filter((f) => f),
    (u) => u,
  );
  return tagsRequire;
}
async function getNestedTags(tags: string[]) {
  const filterArr = tags.filter(
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

//因为我的窗口行为改变了翻译的窗口大小，使用他的代码修复一下
//方法来自pdf-translate\src\modules\popup.ts 338行 [windingwind/zotero-pdf-translate](https://github.com/windingwind/zotero-pdf-translate)
function updatePopupSize(
  selectionMenu: HTMLDivElement,
  textarea: HTMLElement,
  resetSize: boolean = true,
): void {
  // const keepSize = getPref("keepPopupSize") as boolean;
  // if (keepSize) {
  //   return;
  // }
  if (resetSize) {
    textarea.style.width = "-moz-available";
    textarea.style.height = "30px";
  }

  const viewer = selectionMenu.ownerDocument.body;
  // Get current H & W
  const textHeight = textarea.scrollHeight;
  const textWidth = textarea.scrollWidth;
  const newWidth = textWidth + 20;
  // Check until H/W<0.75 and don't overflow viewer border
  if (
    textHeight / textWidth > 0.75 &&
    selectionMenu.offsetLeft + newWidth < viewer.offsetWidth
  ) {
    // Update width
    textarea.style.width = `${newWidth}px`;
    updatePopupSize(selectionMenu, textarea, false);
    return;
  }
  // Update height
  textarea.style.height = `${textHeight + 3}px`;
}

export function PopupRoot({
  reader,
  params,
  doc,
  root,
  maxWidth,
}: {
  reader: _ZoteroTypes.ReaderInstance;
  params: {
    annotation?: _ZoteroTypes.Annotations.AnnotationJson;
    ids?: any;
    currentID?: string;
    x?: number;
    y?: number;
  };
  doc: Document;
  root: HTMLDivElement;
  maxWidth: number;
}) {
  const item = reader._item;
  const [isShowConfig, setShowConfig] = useState(
    getPrefAs("show-config", false),
  );
  const [isShowSelectedPopupColorsTag, setShowSelectedPopupColorsTag] =
    useState(getPrefAs("show-selected-popup-colors-tag", false));
  const [isShowSelectedPopupMatchTag, setShowSelectedPopupMatchTag] = useState(
    getPrefAs("show-selected-popup-match-tag", false),
  );

  const [fontSize, setFontSize] = useState(getPrefAs("font-size", 17));
  const [lineHeight, setLineHeight] = useState(
    getPrefAs("line-height", "1.45"),
  );

  const [buttonMarginTopBottom, setButtonMarginTopBottom] = useState(
    getPrefAs("buttonMarginTopBottom", 0),
  );
  const [sortType, setSortType] = useState(getPrefAs("sortType", "0"));
  const [buttonMarginLeftRight, setButtonMarginLeftRight] = useState(
    getPrefAs("buttonMarginLeftRight", 0),
  );
  const [buttonPaddingTopBottom, setButtonPaddingTopBottom] = useState(
    getPrefAs("buttonPaddingTopBottom", 0),
  );
  const [buttonPaddingLeftRight, setButtonPaddingLeftRight] = useState(
    getPrefAs("buttonPaddingLeftRight", 0),
  );
  const [buttonBorderRadius, setButtonBorderRadius] = useState(
    getPrefAs("buttonBorderRadius", 5),
  );
  const [relateItemShowAll, setRelateItemShowAll] = useState(
    getPrefAs("relateItemShowAll", false),
  );
  const [relateItemShowRelateTags, setRelateItemShowRelateTags] = useState(
    getPrefAs("relateItemShowRelateTags", false),
  );
  const [relateItemSort, setRelateItemSort] = useState(
    getPrefAs("relateItemSort", "2"),
  );

  const [existAnnotations, updateExistAnnotations] = useImmer(
    [] as Zotero.Item[],
  );

  const [existTags, updateExistTags] = useImmer([] as string[]);

  const [delTags, updateDelTags] = useImmer([] as string[]);

  const [displayTags, updateDisplayTags] = useImmer(
    [] as { key: string; values: { tag: string }[]; color?: string }[], // groupByResult<{ tag: string; type: number, dateModified?: string, color: string }>[],
  );
  const [searchTag, setSearchTag] = useState("");
  const [currentPosition, setCurrentPosition] = useState(
    ZoteroPane.getSelectedCollection()?.name || "我的文库",
  );
  const [searchResultLength, setSearchResultLength] = useState(0);
  const [showTagsLength, setShowTagsLength] = useState(
    getPrefAs("showTagsLength", 20),
  );

  const [relateTags, setRelateTags] = useState(
    [] as {
      key: string;
      values: { tag: string; type: number; dateModified: string }[];
    }[],
  );
  // groupByResult<{ tag: string; type: number; dateModified: string }>[]
  useEffect(() => {
    async function loadData() {
      if (params.ids) {
        const ea = item
          .getAnnotations()
          .filter((f) => params.ids.includes(f.key));
        updateExistAnnotations((_a) => ea);
        const ta = ea.flatMap((f) => f.getTags()).map((a) => a.tag);
        updateExistTags((_a) => ta);
      }

      let relateTags: groupByResult<{
        tag: string;
        type: number;
        dateModified: string;
      }>[] = [];
      // root.style.width=this.getSelectTextWidth()+"px"
      if (relateItemShowAll) {
        relateTags = await memAllTagsDB();
      } else {
        relateTags = groupBy(memRelateTags(item), (t10) => t10.tag);
      }

      // if (relateItemShowRelateTags)
      groupByResultIncludeFixedTags(relateTags);
      if (relateItemSort == "2") {
        //2 固定标签 + 修改时间
        relateTags = relateTags
          .map(mapDateModified)
          .sort(sortFixedTags100Modified10Asc);
      } else if (relateItemSort == "3") {
        //3 固定标签 + 本条目 + 修改时间
        const itemAnnTags = item
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
      setRelateTags(relateTags);
    }
    loadData();
  }, [relateItemShowAll, relateItemShowRelateTags, relateItemSort]);
  // const [, updateState] = React.useState();
  // const forceUpdate = React.useCallback(() => updateState({}), []);
  // const [, forceRerender] = React.useReducer((x) => x + 1, 0);
  useEffect(() => {
    async function search() {
      let searchResult = relateTags;
      if (searchTag) {
        const searchIn = await memAllTagsDB();
        if (searchTag.match(/^\s*$/g)) {
          searchResult = searchIn;
          setCurrentPosition("我的文库");
        } else {
          searchResult = searchIn.filter((f) =>
            new RegExp(searchTag, "i").test(f.key),
          );
          setCurrentPosition("搜索中");
        }
      } else {
        setCurrentPosition(
          ZoteroPane.getSelectedCollection()?.name || "我的文库",
        );
      }
      setSearchResultLength(searchResult.length);
      updateDisplayTags(
        searchResult
          .slice(0, showTagsLength)
          .map((a) =>
            Object.assign({}, a, { color: memFixedColor(a.key, "") }),
          ),
      );
      // setIsPopoverOpen(true)
      // forceRerender()
      //要出发弹出窗口重绘是不是有更简单的办法
      setPPadding(pPadding + 0.0001);
      setTimeout(() => {
        setPPadding(pPadding - 0.0001);
      });
      //触发 useLayoutEffect()

      ztoolkit.log(
        "getBoundingClientRect2",
        popRef.current?.getBoundingClientRect(),
        popMaxWidthRef.current?.getBoundingClientRect(),
        boundaryElement.getBoundingClientRect(),
      );
    }
    search();
  }, [searchTag, relateTags, showTagsLength, relateItemSort]);

  // ztoolkit.log("ids", params.ids)
  const [time, setTime] = useState(
    params.ids ? getPrefAs("autoCloseSeconds", 15) : -1,
  ); //只在倒计时时间
  const timeRef = useRef<NodeJS.Timeout>(); //设置延时器
  //倒计时
  useEffect(() => {
    //如果设置倒计时且倒计时不为0
    if (time > 0) {
      timeRef.current = setTimeout(() => {
        setTime((time) => time - 1);
      }, 1000);
    }
    if (time == 0) {
      root.remove();
      setIsPopoverOpen(false);
    }
    return () => {
      clearTimeout(timeRef.current);
    };
  }, [time]);

  const tagStyle = {
    marginLeft: buttonMarginLeftRight + "px",
    marginRight: buttonMarginLeftRight + "px",
    marginTop: buttonMarginTopBottom + "px",
    marginBottom: buttonMarginTopBottom + "px",
    paddingLeft: buttonPaddingLeftRight + "px",
    paddingRight: buttonPaddingLeftRight + "px",
    paddingTop: buttonPaddingTopBottom + "px",
    paddingBottom: buttonPaddingTopBottom + "px",
    borderRadius: buttonBorderRadius + "px",
    fontSize: fontSize + "px",
    lineHeight: lineHeight,
  };
  function inputWidth(searchTag: string) {
    return {
      width: `${Math.min(searchTag.length + (searchTag.match(/[\u4E00-\u9FA5]/g) || "").length + 4)}ch`,
      minWidth: "3ch",
      maxWidth: "100%",
    };
  }
  function handleRelateItemSortChange(e: React.ChangeEvent<HTMLInputElement>) {
    setPref("relateItemSort", e.target.value);
    setRelateItemSort(e.target.value);
  }
  const [isPopoverOpen, setIsPopoverOpen] = useState(true);
  // const parentElement = doc.firstChild as HTMLElement;
  ztoolkit.log(doc, reader);
  const tabDiv = Zotero_Tabs.deck.querySelector(
    "#" + Zotero_Tabs.selectedID,
  ) as HTMLDivElement;
  const [bgColor, setBgColor] = useState(getPrefAs("bgColor", "#fff"));
  const sp = (
    tabDiv.querySelector("browser") as HTMLIFrameElement
  ).contentDocument?.querySelector("#reader-ui ") as HTMLDivElement;
  // const react_popover_root = tabDiv.querySelector(".react_popover_root") as HTMLDivElement || ztoolkit.UI.appendElement({
  //   tag: "div",
  //   styles: { width: "calc(100% - 80px)", height: "calc(100% - 100px)", position: "fixed", left: "40px", top: "80px", zIndex: "0", background: "transparent", border: "1px solid black" },
  //   classList: ["react_popover_root"],

  // }, tabDiv)
  //@ts-ignore aaaa
  const a = (
    tabDiv.querySelector(".reader") as HTMLIFrameElement
  ).contentDocument.querySelector("#split-view #primary-view") as HTMLDivElement;

  const parentElement = tabDiv;
  const boundaryElement = tabDiv;
  boundaryElement.style.border = "1px solid red";
  // const c = ztoolkit.UI.appendElement({ tag: "div" }, root) as HTMLDivElement
  useEffect(() => {
    if (params.ids) return;
    const MutationObserver = ztoolkit.getGlobal("MutationObserver");
    const observer = new MutationObserver((mutations: any) => {
      for (const mutation of mutations) {
        // ztoolkit.log("fffff", mutation);
        for (const rn of mutation.removedNodes) {
          if ((rn as HTMLDivElement).classList.contains("selection-popup")) {
            setIsPopoverOpen(false);
          }
        }
      }
    });
    observer.observe(sp, { childList: true, subtree: true });
    // ztoolkit.log("fffff sp", sp)
    return () => {
      observer.disconnect();
    };
  }, []);
  const [pPadding, setPPadding] = useState(getPrefAs("pPadding", 0));
  const [pBoundaryInset, setPBoundaryInset] = useState(
    getPrefAs("pBoundaryInset", 40),
  );
  const [pArrowSize, setPArrowSize] = useState(getPrefAs("pArrowSize", 0));
  const [pPositions, updatePPositions] = useImmer(
    getPrefAs("pPositions", "bottom,left,top,right").split(","),
  );
  const [pFixedContentLocation, setPFixedContentLocation] = useState(
    getPrefAs("pFixedContentLocation", false),
  );
  const [pFixedContentLocationLeft, setPFixedContentLocationLeft] = useState(
    getPrefAs("pFixedContentLocationLeft", 0),
  );
  const [pFixedContentLocationTop, setPFixedContentLocationTop] = useState(
    getPrefAs("pFixedContentLocationTop", 0),
  );
  const [isShowBgColor, setIsShowBgColor] = useState(false);
  const selectionPopup = (
    tabDiv.querySelector("browser") as HTMLIFrameElement
  ).contentDocument?.querySelector(
    "#reader-ui .selection-popup",
  ) as HTMLDivElement;
  const selectionPopupRef = useRef(selectionPopup);
  // const popSize = useSize(selectionPopup)
  const [selectionPopupSize, setSelectionPopupSize] = useState({
    width: 0,
    height: 0,
  });
  useEffect(() => {
    if (params.ids) return;
    const ResizeObserver = ztoolkit.getGlobal("ResizeObserver");
    const resizeObserver = new ResizeObserver((_entries: any) => {
      setSelectionPopupSize({
        width: selectionPopup.clientWidth,
        height: selectionPopup.clientHeight,
      });
    });
    resizeObserver.observe(selectionPopup);
    setSelectionPopupSize({
      width: selectionPopup.clientWidth,
      height: selectionPopup.clientHeight,
    });

    return () => resizeObserver.disconnect();
  }, []);

  const popMaxWidthRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = popMaxWidthRef.current;
    if (!c) return;
    // c.style.maxWidth = "unset"
    // c.style.width = "600px";

    function updatePopupSize(): void {
      if (!c) return;
      const viewer = tabDiv;
      const rootHeight = c.scrollHeight;
      const rootWidth = c.scrollWidth;
      if (rootHeight / rootWidth > 2) {
        //
      } else if (rootHeight / rootWidth < 0.5) {
        //
      } else {
        //
      }
      // const newWidth = rootWidth + 20;
      // Check until H/W<0.75 and don't overflow viewer border
      // if (
      //   // textHeight / rootWidth > 0.75 &&
      //   // selectionMenu.offsetLeft + newWidth < viewer.offsetWidth
      // ) {
      //   // Update width
      //   // textarea.style.width = `${newWidth}px`;
      //   // updatePopupSize(selectionMenu, textarea, false);
      //   return;
      // }
      // root.style.height = `${rootHeight + 3}px`;
    }

    updatePopupSize();
  }, [selectionPopupSize]);
  useEffect(() => {
    // setPBoundaryInset((pBoundaryInset) => pBoundaryInset);
    ztoolkit.log(
      "getBoundingClientRect",
      popRef.current?.getBoundingClientRect(),
      popMaxWidthRef.current?.getBoundingClientRect(),
      boundaryElement.getBoundingClientRect(),
    );
  }, [displayTags]);
  const popRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <Popover
        parentElement={parentElement}
        boundaryElement={boundaryElement}
        isOpen={isPopoverOpen}
        positions={pPositions as any}
        padding={pPadding}
        ref={popRef}
        boundaryInset={pBoundaryInset}
        transformMode={pFixedContentLocation || params.ids ? "absolute" : "relative"}
        transform={
          pFixedContentLocation || params.ids
            ? ({ left: pFixedContentLocationLeft, top: 0 })
            : (popoverState) =>
            ({
              top: -popoverState.nudgedTop + 65,
              left: -popoverState.nudgedLeft,
            })
        }
        align="center"
        // onClickOutside={() => setIsPopoverOpen(false)}
        // ref={clickMeButtonRef} // if you'd like a ref to your popover's child, you can grab one here
        content={({ position, childRect, popoverRect }) => (
          <ArrowContainer // if you'd like an arrow, you can import the ArrowContainer!
            position={position}
            childRect={childRect}
            popoverRect={popoverRect}
            arrowColor={"#aaaaaa"}
            arrowSize={pArrowSize}
            arrowStyle={{ opacity: 0.6 }}

          >
            <div
              ref={popMaxWidthRef}
              style={{
                marginTop: pFixedContentLocationTop + "px",
                backgroundColor: bgColor,
                opacity: 1,
                whiteSpace: "break-spaces",
                display: "flex",
                flexWrap: "wrap",
                // maxWidth: Math.max(600, maxWidth) + "px",
                maxWidth: "600px",
                width: "600px",
                minHeight: "100px",
              }}
            // onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            >
              {isShowConfig && (
                <>
                  <div
                    style={{
                      fontSize: "18px",
                      lineHeight: "1.5",
                    }}
                  >
                    <label>
                      <input
                        type="checkbox"
                        defaultChecked={pFixedContentLocation}
                        onChange={(e) => {
                          setPFixedContentLocation(e.currentTarget.checked);
                          setPref(
                            "pFixedContentLocation",
                            e.currentTarget.checked,
                          );
                        }}
                      />
                      固定弹出区域
                    </label>
                    {pFixedContentLocation && (
                      <>
                        left:
                        <input
                          type="number"
                          min={0}
                          step={10}
                          max={500}
                          style={inputWidth("zlb")}
                          defaultValue={pFixedContentLocationLeft}
                          onInput={(e) => {
                            if (e.currentTarget.value) {
                              setPref(
                                "pFixedContentLocationLeft",
                                e.currentTarget.value,
                              );
                              setPFixedContentLocationLeft(
                                e.currentTarget.valueAsNumber,
                              );
                            }
                          }}
                        />
                        top:
                        <input
                          type="number"
                          min={0}
                          step={10}
                          max={1000}
                          style={inputWidth("zzlb")}
                          defaultValue={pFixedContentLocationTop}
                          onInput={(e) => {
                            if (e.currentTarget.value) {
                              setPFixedContentLocationTop(
                                e.currentTarget.valueAsNumber,
                              );
                            }
                          }}
                        />
                      </>
                    )}
                    {!pFixedContentLocation && (
                      <>
                        padding:{" "}
                        <input
                          type="number"
                          min={0}
                          step={1}
                          max={200}
                          style={inputWidth("zlb")}
                          defaultValue={pPadding}
                          onInput={(e) => {
                            if (e.currentTarget.value) {
                              setPref("pPadding", e.currentTarget.value);
                              setPPadding(e.currentTarget.valueAsNumber);
                            }
                          }}
                        />
                        BoundaryInset:{" "} {pBoundaryInset}
                        <input
                          type="number"
                          min={0}
                          step={1}
                          max={200}
                          style={inputWidth("zlb")}
                          defaultValue={pBoundaryInset}
                          onInput={(e) => {
                            if (e.currentTarget.value) {
                              setPref("pBoundaryInset", e.currentTarget.value);
                              setPBoundaryInset(e.currentTarget.valueAsNumber);
                            }
                          }}
                        />
                        ArrowSize:{" "}
                        <input
                          type="number"
                          min={0}
                          step={1}
                          max={200}
                          style={inputWidth("zlb")}
                          defaultValue={pArrowSize}
                          onInput={(e) => {
                            if (e.currentTarget.value) {
                              setPref("pArrowSize", e.currentTarget.value);
                              setPArrowSize(e.currentTarget.valueAsNumber);
                            }
                          }}
                        />
                        Positions:
                        {"bottom,left,top,right"
                          .split(",")
                          .sort(sortFixed(pPositions))
                          .map((a, i) => (
                            <span key={a} style={{ margin: "0 20px" }}>
                              [
                              {i > 0 && i < pPositions.length && (
                                <span
                                  onClick={() => {
                                    updatePPositions((pPositions) => {
                                      pPositions.splice(
                                        i - 1,
                                        0,
                                        ...pPositions.splice(i, 1),
                                      );
                                      setPref(
                                        "pPositions",
                                        pPositions.join(","),
                                      );
                                    });
                                  }}
                                >
                                  ⬅️
                                </span>
                              )}
                              <label style={{ margin: "0 10px" }}>
                                <input
                                  type="checkbox"
                                  defaultChecked={pPositions.includes(a)}
                                  onChange={(_e) => {
                                    updatePPositions((pPositions) => {
                                      const index = pPositions.findIndex(
                                        (f) => f == a,
                                      );
                                      if (index > -1) pPositions.splice(i, 1);
                                      else pPositions.push(a);
                                      setPref(
                                        "pPositions",
                                        pPositions.join(","),
                                      );
                                    });
                                  }}
                                />
                                {a}
                              </label>
                              {i < pPositions.length - 1 && (
                                <span
                                  onClick={() => {
                                    updatePPositions((pPositions) => {
                                      pPositions.splice(
                                        i + 1,
                                        0,
                                        ...pPositions.splice(i, 1),
                                      );
                                      setPref(
                                        "pPositions",
                                        pPositions.join(","),
                                      );
                                    });
                                  }}
                                >
                                  ➡️
                                </span>
                              )}
                              ]
                            </span>
                          ))}
                      </>
                    )}
                    <ChangeColor
                      text="调整背景颜色"
                      color={bgColor}
                      onChange={(e) => {
                        setBgColor(e);
                        setPref("bgColor", e);
                      }}
                    ></ChangeColor>
                  </div>
                </>
              )}
              <div
                style={{
                  fontSize: "18px",
                  lineHeight: "1.5",
                  // background: "#fff",
                  boxShadow: params.ids ? "rgb(0, 0, 0) 0 0 3px 0px inset" : "",
                }}
                onClick={() => setTime(-1)}
              >
                {isShowConfig && (
                  <span>
                    {!params.ids && (
                      <span>
                        <span></span>
                        颜色栏：
                        <label>
                          <input
                            type="checkbox"
                            defaultChecked={isShowSelectedPopupColorsTag}
                            onInput={(e) => {
                              setPref(
                                "show-selected-popup-colors-tag",
                                e.currentTarget.checked,
                              );
                              setShowSelectedPopupColorsTag(
                                e.currentTarget.checked,
                              );
                            }}
                          />
                          {getString("pref-show-selected-popup-colors-tag", {
                            branch: "label",
                          })}
                        </label>
                        <label>
                          <input
                            type="checkbox"
                            defaultChecked={isShowSelectedPopupMatchTag}
                            onInput={(e) => {
                              setPref(
                                "show-selected-popup-match-tag",
                                e.currentTarget.checked,
                              );
                              setShowSelectedPopupMatchTag(
                                e.currentTarget.checked,
                              );
                            }}
                          />
                          {getString("pref-show-selected-popup-match-tag", {
                            branch: "label",
                          })}
                        </label>
                        <br />
                      </span>
                    )}
                    <span>
                      显示
                      <input
                        type="number"
                        defaultValue={showTagsLength}
                        min={0}
                        max={100}
                        style={inputWidth("zlb")}
                        onInput={(e) => {
                          setPref("showTagsLength", e.currentTarget.value);
                          setShowTagsLength(e.currentTarget.valueAsNumber);
                        }}
                      />
                      个。
                    </span>
                    <span style={{ whiteSpace: "nowrap", wordWrap: "normal" }}>
                      字体大小:
                      <input
                        type="number"
                        min={6}
                        max={72}
                        step={0.5}
                        defaultValue={fontSize}
                        style={inputWidth("zlb")}
                        onInput={(e) => {
                          if (e.currentTarget.value) {
                            setPref("font-size", e.currentTarget.valueAsNumber);
                            setFontSize(e.currentTarget.valueAsNumber);
                          }
                        }}
                      />
                      px。
                    </span>
                    行高:
                    <input
                      type="number"
                      defaultValue={lineHeight}
                      min={0.1}
                      max={3}
                      step={0.1}
                      style={inputWidth("zlb")}
                      onInput={(e) => {
                        setPref("line-height", e.currentTarget.value);
                        setLineHeight(e.currentTarget.value);
                      }}
                    />
                    margin:
                    <input
                      type="number"
                      min={-10}
                      max={200}
                      step={0.5}
                      defaultValue={buttonMarginTopBottom}
                      style={inputWidth("zlb")}
                      onInput={(e) => {
                        if (e.currentTarget.value) {
                          setPref(
                            "buttonMarginTopBottom",
                            e.currentTarget.valueAsNumber,
                          );
                          setButtonMarginTopBottom(
                            e.currentTarget.valueAsNumber,
                          );
                        }
                      }}
                    />
                    <input
                      type="number"
                      min={-10}
                      max={200}
                      step={0.5}
                      defaultValue={buttonMarginLeftRight}
                      style={inputWidth("zlb")}
                      onInput={(e) => {
                        if (e.currentTarget.value) {
                          setPref(
                            "buttonMarginLeftRight",
                            e.currentTarget.valueAsNumber,
                          );
                          setButtonMarginLeftRight(
                            e.currentTarget.valueAsNumber,
                          );
                        }
                      }}
                    />
                    padding:
                    <input
                      type="number"
                      min={-10}
                      max={200}
                      step={0.5}
                      defaultValue={buttonPaddingTopBottom}
                      style={inputWidth("zlb")}
                      onInput={(e) => {
                        if (e.currentTarget.value) {
                          setPref(
                            "buttonPaddingTopBottom",
                            e.currentTarget.valueAsNumber,
                          );
                          setButtonPaddingTopBottom(
                            e.currentTarget.valueAsNumber,
                          );
                        }
                      }}
                    />
                    <input
                      type="number"
                      min={-10}
                      max={200}
                      step={0.5}
                      defaultValue={buttonPaddingLeftRight}
                      style={inputWidth("zlb")}
                      onInput={(e) => {
                        if (e.currentTarget.value) {
                          setPref(
                            "buttonPaddingLeftRight",
                            e.currentTarget.valueAsNumber,
                          );
                          setButtonPaddingLeftRight(
                            e.currentTarget.valueAsNumber,
                          );
                        }
                      }}
                    />
                    圆角:
                    <input
                      type="number"
                      min={0}
                      max={30}
                      step={0.5}
                      defaultValue={buttonBorderRadius}
                      style={inputWidth("zlb")}
                      onInput={(e) => {
                        if (e.currentTarget.value) {
                          setPref(
                            "buttonBorderRadius",
                            e.currentTarget.valueAsNumber,
                          );
                          setButtonBorderRadius(e.currentTarget.valueAsNumber);
                        }
                      }}
                    />
                    <div>
                      排序规则：（未完成）
                      <label>
                        <input
                          type="radio"
                          value="0"
                          name="relateItemSort"
                          checked={relateItemSort === "0"}
                          onChange={handleRelateItemSortChange}
                        />
                        字母顺序
                      </label>
                      <label>
                        <input
                          type="radio"
                          value="1"
                          name="relateItemSort"
                          checked={relateItemSort === "1"}
                          onChange={handleRelateItemSortChange}
                        />
                        使用次数
                      </label>
                      <label>
                        <input
                          type="radio"
                          value="2"
                          name="relateItemSort"
                          checked={relateItemSort === "2"}
                          onChange={handleRelateItemSortChange}
                        />
                        使用时间
                      </label>
                    </div>
                    <div>
                      相关标签的范围：（未完成）
                      <label>
                        <input
                          type="checkbox"
                          value="0"
                          defaultChecked={getPrefAs("TagRangeSelfItem", false)}
                        />
                        本条目
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          value="0"
                          defaultChecked={getPrefAs(
                            "TagRangeSelfCollection",
                            false,
                          )}
                        />
                        本条目所在文件夹[]
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          value="0"
                          defaultChecked={getPrefAs(
                            "TagRangeSelfCollection",
                            false,
                          )}
                        />
                        本条目所在文件夹以及子文件夹[]
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          value="0"
                          defaultChecked={getPrefAs(
                            "TagRangeSelfCollection",
                            false,
                          )}
                        />
                        我的文库所有文件
                      </label>
                    </div>
                    <div>Nest标签相关：（未完成）</div>
                    <div>Tag排除规则：（未完成）</div>
                  </span>
                )}

                <span
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      ...tagStyle,
                      background: isShowConfig ? "#00990030" : "#99000030",
                    }}
                    onClick={() => {
                      setPref("show-config", !isShowConfig);
                      setShowConfig(!isShowConfig);
                    }}
                  >
                    设置
                  </span>
                  {existTags.length > 0 && (
                    <span
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        fontSize: fontSize + "px",
                        lineHeight: lineHeight,
                        alignItems: "center",
                      }}
                    >
                      现有标签：
                      {groupBy(existTags, (a) => a)
                        .sort(sortValuesLength)
                        .map((a) => (
                          <span
                            key={a.key}
                            style={{
                              ...tagStyle,
                              whiteSpace: "nowrap",
                              wordWrap: "normal",
                              backgroundColor: memFixedColor(a.key, ""),
                              boxShadow: "#ccc 0px 0px 4px 3px",
                            }}
                            onClick={() => {
                              updateDelTags((dt) => {
                                const i = dt.findIndex((f) => f == a.key);
                                if (i > -1) {
                                  dt.splice(i, 1);
                                } else {
                                  dt.push(a.key);
                                }
                              });
                            }}
                          >
                            [{a.values.length}/{existAnnotations.length}]{a.key}
                            {delTags.includes(a.key) && (
                              <span
                                style={{ background: "#990000", color: "#fff" }}
                              >
                                [待删除]
                              </span>
                            )}
                          </span>
                        ))}
                    </span>
                  )}
                  {params.ids && (
                    <>
                      <span
                        style={{
                          ...tagStyle,
                          background:
                            delTags.length > 0 ? "#990000" : "#009900",
                          color: "#fff",
                        }}
                        onClick={() => {
                          setIsPopoverOpen(false);

                          saveAnnotationTags(
                            "",
                            [],
                            delTags,
                            reader,
                            params,
                            doc,
                          );
                          root?.remove();
                        }}
                      >
                        {delTags.length == 0
                          ? (time > 0 ? time + "s" : "点击") + "关闭"
                          : "确认删除"}
                      </span>
                      {isShowConfig && (
                        <>
                          设置
                          <input
                            style={inputWidth("zlb")}
                            type="number"
                            min={5}
                            max={100}
                            defaultValue={getPrefAs("autoCloseSeconds", 15)}
                            onInput={(e) => {
                              if (e.currentTarget.value) {
                                setTime(e.currentTarget.valueAsNumber);
                                setPref(
                                  "autoCloseSeconds",
                                  e.currentTarget.valueAsNumber,
                                );
                              }
                            }}
                          />
                          秒后自动关闭
                        </>
                      )}
                    </>
                  )}
                  <input
                    type="text"
                    autoFocus={true}
                    defaultValue={searchTag}
                    onInput={(e) => setSearchTag(e.currentTarget.value)}
                    style={{ ...inputWidth(searchTag), minWidth: "15ch" }}
                    placeholder="搜索标签，按回车添加"
                    onKeyDown={(e) => {
                      // ztoolkit.log(e)
                      if (time > 0) {
                        setTime(-1);
                      }
                      if (e.code == "Enter") {
                        setIsPopoverOpen(false);
                        saveAnnotationTags(
                          searchTag,
                          [],
                          [],
                          reader,
                          params,
                          doc,
                        );
                        if (params.ids) {
                          root.remove();
                        }
                        return;
                      }
                      if (e.code == "Escape") {
                        //@ts-ignore _onSetSelectionPopup
                        reader?._primaryView._onSetSelectionPopup(null);
                        root.remove();
                        return;
                      }
                    }}
                  />
                  <span style={tagStyle}>
                    固定标签来自【{currentPosition}】{" "}
                  </span>{" "}
                  <span style={tagStyle}>
                    {" "}
                    相关标签来自【{currentPosition}】{displayTags.length}/
                    {searchResultLength}:
                  </span>
                  {displayTags.map((tag) => (
                    <span
                      key={tag.key}
                      style={{
                        ...tagStyle,
                        whiteSpace: "nowrap",
                        wordWrap: "normal",
                        backgroundColor: tag.color,
                        boxShadow: "#ccc 0px 0px 4px 3px",
                        // borderRadius: "3px",
                      }}
                      onClick={() => {
                        if (isShowConfig) return;
                        setIsPopoverOpen(false);
                        saveAnnotationTags(
                          tag.key,
                          [],
                          [],
                          reader,
                          params,
                          doc,
                        );
                        if (params.ids) {
                          root.remove();
                        }
                      }}
                    >
                      <span>[{tag.values.length}]</span>
                      <span>{tag.key}</span>

                      {isShowConfig && (
                        <>
                          {memFixedTags().includes(tag.key) ? (
                            <>
                              <ChangeColor
                                text="颜色"
                                color={memFixedColor(tag.key)}
                                onChange={(e) => {
                                  updateDisplayTags((a) => {
                                    for (const b of a) {
                                      if (b.key == tag.key) {
                                        b.color = e;
                                      }
                                    }
                                  });
                                }}
                              />
                              {/* <span
                                style={{
                                  background: "#fff",
                                  color: "#000",
                                  border: "1px solid #000",
                                }}
                              >
                                移除固定
                              </span>
                              <span
                                style={{
                                  background: "#fff",
                                  color: "#000",
                                  border: "1px solid #000",
                                }}
                              >
                                左移
                              </span>
                              <span
                                style={{
                                  background: "#fff",
                                  color: "#000",
                                  border: "1px solid #000",
                                }}
                              >
                                右移
                              </span> */}
                            </>
                          ) : (
                            <span
                              style={{
                                background: "#fff",
                                color: "#000",
                                border: "1px solid #000",
                              }}
                            >
                              {/* 设置固定 */}
                            </span>
                          )}
                        </>
                      )}
                    </span>
                  ))}
                </span>
              </div>
            </div>
          </ArrowContainer>//ArrowContainer
        )}
      >
        <div
          style={{

            width: "100%",
            // width: "600px",
            position: "absolute",
            height: (selectionPopupSize?.height || 120) + "px",
            top: "0",
            // background: "#f00", opacity: "0",
            zIndex: "-1",
          }}
        >
          {/* <button onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            style={{ backgroundColor: color + " !important" }}>
            Click me! {JSON.stringify(popSize) + "1"} {JSON.stringify(selectionPopupSize) + "2"}
          </button>
          <span style={{ backgroundColor: color }}> {color}</span> */}
          {/* {JSON.stringify(selectionPopupSize)} */}
        </div>
      </Popover>
    </>
  );
}
