import { config } from "../../package.json";
import { getFileContent, injectCSS, memFixedTagColors, uniqueBy } from "../utils/zzlb";
import { getPref, setPref } from "../utils/prefs";
// import * as PdfJs from 'pdfjs-dist/legacy/build/pdf.mjs' // 'pdfjs-dist/legacy/build/pdf.js'
// PdfJs.getDocument

// let pdfjsLib;
// if (typeof window !== "undefined" && window["pdfjs-dist/build/pdf"]) {
//   pdfjsLib = window["pdfjs-dist/build/pdf"];
// }

// const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
// const pdfjsLib = require("resource://zotero/reader/pdf/build/pdf.js");
// Services.scriptloader.loadSubScript("resource://zotero/reader/pdf/build/pdf.js");
// 获取pdf.js 然后后台打开一个，查找位置，记录这些位置，在本地呈现。或许需要npm一个
(async () => {
  // const pdfjs = await import('pdfjs-dist')
  // ztoolkit.log("getDocument", pdfjs.getDocument)
})();

// ztoolkit.log("getDocument", PdfJs.getDocument)

function register() {
  Zotero.Reader.registerEventListener("renderToolbar", readerToolbarCallback, config.addonID);

  // const { pdfjsLib } = ztoolkit.getGlobal("globalThis")
  // if (pdfjsLib && pdfjsLib.GlobalWorkerOptions) {
  //   pdfjsLib.GlobalWorkerOptions.workerSrc = '//mozilla.github.io/pdf.js/build/pdf.worker.mjs';
  // }
  // Zotero.log("getDocument", pdfjsLib.getDocument)
}
function unregister() {
  Zotero.Reader.unregisterEventListener("renderToolbar", readerToolbarCallback);
}
export default { register, unregister };

const image = `data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADUAAAA1CAYAAADh5qNwAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAAFiUAABYlAUlSJPAAAAEHSURBVGhD7dMxagJBGMXxDyK5QJpcIeBJUogWtrlAOu2EJFcQL5B8YzdNmhR2HsHCrTWFzMyeQkcZFpadYiEbwwvvB68RB75/sUJERA3qHsWExdWnbi7LMEhXdEzdVIw/XH3qv+UjzNIVHWNUh/vVqHf/LBq2rWdcEbdvHul28Vspsm9yM34T30zSFR1T9xA/2FHrGT+OW1Ux1cKXmPIp+yY3E4bxXT9d8cdscRuPMfWgy5Ziy/v0LzCMQsEoFIxCwSgUjELBKBSMQsEoFIxCwSgUjELBKBSMQsEoFIxCwSgUjELBKBT/Mmp97Im6F1H/WZ97FT3cpX8BsvZG3ta92s6/0U+InAAyDlk/q3Q3TwAAAABJRU5ErkJggg==`;
const readerButtonCSS = `
  .${config.addonRef}-search-button::before {
    background-image: url(${image});
    background-size: 100%;
    content: "";
    display: inline-block;
    height: 16px;
    vertical-align: top;
    width: 16px;
    border-radius:4px;
  } 
  #${config.addonRef}-search-button-pop *{
    font-size:18px
  }
  #${config.addonRef}-search-button-pop .nav{
     display:none;
  } 
  #${config.addonRef}-search-button-pop.enter .nav{
     display:flex;
     flex-direction:row;
     justify-content: flex-end;
  }

  #${config.addonRef}-search-button-pop textarea{
     display:none
  } 
  #${config.addonRef}-search-button-pop.enter textarea{
     display:block
  } 
  `;

class HighlightWords {
  words: string[] = [];
  index = 0;
  constructor() {
    this.load();
  }
  load() {
    this.words = JSON.parse((getPref("HighlightWords") as string) || `[""]`);
    this.index = (getPref("HighlightIndex") as number) || 0;
  }
  save() {
    this.words = uniqueBy(
      this.words.filter((word) => word !== ""),
      (f) => f,
    );
    if (this.words.length == 0) this.words.push("");
    setPref("HighlightWords", JSON.stringify(this.words));
    setPref("HighlightIndex", this.index);
  }
  get(index: number = this.index) {
    if (index >= this.words.length || index < 0) {
      return "";
    }
    return this.words[index];
  }
  set(value: string, index: number = this.index) {
    if (index >= this.words.length) {
      this.words.push(value);
    } else {
      this.words[index] = value;
    }
  }
}
const highlightWords = new HighlightWords();
async function addCss(doc: Document) {
  const fileCss = await getFileContent(`chrome://${config.addonRef}/content/highlightWords.css`);
  ztoolkit.log("ooo", [readerButtonCSS, fileCss]);
  injectCSS(doc, "highlightWords.css");
}
function readerToolbarCallback(event: Parameters<_ZoteroTypes.Reader.EventHandler<"renderToolbar">>[0]) {
  const { append, doc, reader, params } = event;
  if (doc.getElementById(`${config.addonRef}-search-button`)) return;

  const root = doc.querySelector("body") || (doc.querySelector("div") as HTMLElement);
  ztoolkit.UI.appendElement(
    {
      tag: "style",
      namespace: "html",
      properties: {
        textContent: readerButtonCSS,
      },
    },
    root,
  );
  let searchText = highlightWords.get();
  let highlightIndex = highlightWords.index;
  const throttleSearch = Zotero.Utilities.throttle(() => {
    ztoolkit.log("throttleSearch");
    search();
  }, 2000);

  const debounceSearch = Zotero.Utilities.debounce(() => {
    ztoolkit.log("debounceSearch");
    search();
  }, 500);
  // const debounceSearch = search, throttleSearch = debounceSearch;
  let pdfDoc = reader?._iframe?.contentDocument?.querySelector("iframe")?.contentDocument as Document;
  let running = false;
  let onceMore = false;
  let height = 1000;
  let popDiv: HTMLElement | undefined = undefined;
  const colors = memFixedTagColors().map((a) => a.color);

  function search() {
    if (!popDiv) return;
    // ztoolkit.log("search", searchText)
    if (running) {
      onceMore = true;
      return;
    }
    running = true;

    const { ss, ssr, getColor, getSpan } = getFormatStr();

    for (const span of pdfDoc.querySelectorAll("span[role=presentation]")) {
      if (span.screenY < -height || span.screenY > height * 2) continue;
      let txt = span.getAttribute("data-text");
      if (!txt) {
        txt = span.textContent;
        if (txt) {
          span.setAttribute("data-text", txt);
        }
      }
      if (!txt) continue;
      if (ss.length > 0) {
        txt = txt.replace(ssr, getSpan);
        if (!span.getAttribute("data-transform")) {
          //The text offset problem is improved after removing the transform for each line.
          span.setAttribute("data-transform", (span as HTMLSpanElement).style.transform);
          (span as HTMLSpanElement).style.transform = "";
        }
      } else {
        const transform = span.getAttribute("data-transform") || "";
        if (transform) {
          (span as HTMLSpanElement).style.transform = transform;
          span.setAttribute("data-transform", "");
        }
      }

      span.innerHTML = txt;
    }

    setTimeout(() => {
      running = false;
      if (onceMore) {
        onceMore = false;
        search();
      }
    }, 2000);
  }
  function getFormatStr() {
    const ss = uniqueBy(
      searchText
        .toLowerCase()
        .split("\n")
        .filter((f) => f)
        .filter((f) => f != " "),
      (a) => a,
    );
    const ssr = new RegExp(`(?:${ss.map((a) => a.replace(/[|]/g, ".")).join("|")})`, "ig");
    //RegExp类中test()方法结果不固定 不带g就好了，或者改r.lastIndex=0
    const rs = ss.map((s) => new RegExp(s, "i"));
    const getColor = (str: string) => {
      for (let index = 0; index < rs.length; index++) {
        const r = rs[index];
        const find = r.test(str);
        // ztoolkit.log("find", str, r, index, find, `${r}.test("${str}")`, r.test(str))
        if (find) {
          const color = colors[index] || "rgba(180, 0, 170, 1)";
          // ztoolkit.log("找到", r, index, str, colors[index], color, colors)
          return color;
        }
        ztoolkit.log("find", str, r, index, find, `${r}.test("${str}")`);
      }
      // ztoolkit.log("未找到", [str], rs, rs.map((a) => a.test(str)))
      return "rgba(180, 0, 170, 1)";
    };
    const getSpan = (a: string) => {
      const color = getColor(a);
      // ztoolkit.log("颜色匹配", a, color)
      return `<span style='background:${color};box-shadow: 0 0 10px rgba(180, 0, 170, 1);box-sizing: content-box;border: 2px solid #fff;padding: 0px 5px;'>${a}</span>`;
    };
    return { ss, ssr, getColor, getSpan };
  }

  function clearSearch() {
    for (const span of pdfDoc.querySelectorAll("span[role=presentation]")) {
      const html = span.getAttribute("data-text");
      if (html) {
        span.textContent = html;
      }
      const transform = span.getAttribute("data-transform") || "";
      if (transform) {
        (span as HTMLSpanElement).style.transform = span.getAttribute("data-transform") || "";
        span.setAttribute("data-transform", "");
      }
    }
  }

  const btn = ztoolkit.UI.createElement(doc, "div", {
    namespace: "html",
    id: `${config.addonRef}-search-button`,
    classList: ["toolbarButton", "toolbar-button", `${config.addonRef}-search-button`],
    properties: {
      tabIndex: -1,
      title: "高亮",
    },
    listeners: [
      {
        type: "click",
        listener: (ev: Event) => {
          ztoolkit.log(ev);

          pdfDoc = reader?._iframe?.contentDocument?.querySelector("iframe")?.contentDocument as Document;
          if (!pdfDoc || !pdfDoc.querySelector("#viewerContainer")) return;
          height = (pdfDoc.querySelector("#viewerContainer")! as HTMLElement).offsetHeight;

          const evm = ev as MouseEvent;
          const div = evm.target as HTMLElement;
          if (popDiv) {
            div.style.background = "";
            popDiv.remove();
            popDiv = undefined;
            pdfDoc.querySelector("#viewerContainer")?.removeEventListener("scroll", () => throttleSearch());
            clearSearch();
          } else {
            pdfDoc.querySelector("#viewerContainer")?.addEventListener("scroll", () => throttleSearch());
            div.style.background = "#ddd";
            debounceSearch();
            createPopDiv(div);
          }
        },
      },
    ],
  });
  append(btn);

  // setTimeout(() => {
  //   qqqq();
  // }, 3000)
  const btn2 = ztoolkit.UI.createElement(doc, "div", {
    namespace: "html",
    id: `${config.addonRef}-search-button`,
    classList: ["toolbarButton", "toolbar-button", `${config.addonRef}-search-button`],
    properties: {
      tabIndex: -1,
      title: "高亮",
    },
    listeners: [
      {
        type: "click",
        listener: (ev: Event) => {
          qqqq();
        },
      },
    ],
  });
  // append(btn2);
  let textArea: HTMLTextAreaElement;
  let show: HTMLDivElement;

  function qqqq() {
    const win = doc.querySelector("iframe")?.contentWindow;
    if (win) {
      Zotero.r_win = win;
      Zotero.r_reader = reader;
      Zotero.r_doc = doc;
      // win.setFindState()
      //const win =Zotero.r_win;
      // (async function () {
      //   const win = Zotero.r_win;
      //   const findController = win.PDFViewerApplication.findController
      //   for (const page of win.PDFViewerApplication.pdfViewer._pages) {
      //     if (page.renderingState == 0) {
      //       await page.draw()
      //     }
      //     win.PDFViewerApplication.findController._eventBus.dispatch("updatetextlayermatches", {
      //       source: win,
      //       pageIndex: page.pdfPage._pageIndex,
      //     });
      //     while (Zotero.r_win.PDFViewerApplication.pdfViewer.nextPage()) {
      //       const pageNumber = Zotero.r_win.PDFViewerApplication.pdfViewer.currentPageNumber
      //       await waitUtilAsync(() => win.PDFViewerApplication.pdfViewer._pages[])
      //     }
      //     const highlighter = page._textHighlighter
      //     highlighter.textContentItemsStr = page.textLayer.textContentItemsStr
      //     const pageIdx = page.pdfPage._pageIndex
      //     const pageMatches = findController.pageMatches[pageIdx] || null;
      //     const pageMatchesLength = findController.pageMatchesLength[pageIdx] || null;

      //     // highlighter.matches = highlighter._convertMatches(pageMatches, pageMatchesLength);
      //     Zotero.log([pageMatches, pageMatchesLength])

      //   }
      //   Zotero.log(win.PDFViewerApplication.pdfViewer._pages.map(a => a._textHighlighter.matches?.length))
      // })()
      reader._state.primaryViewFindState.query = "and";
      reader._state.primaryViewFindState.popupOpen = true;
      reader._state.primaryViewFindState.active = true;

      // reader.toggleFindPopup();
      ztoolkit.log(reader._state.primaryViewFindState);
      // const input = (doc.querySelector(".find-popup .toolbar-text-input") as HTMLInputElement)
      // if (input)
      //   input.value = "of";
      reader.findNext(true);

      ztoolkit.log("findNext1", win.document.querySelectorAll(".highlight"));
      reader.findPrevious(true);
      reader.findPrevious(true);

      ztoolkit.log("findNext2", win.document.querySelectorAll(".highlight"));
      // win.PDFViewerApplication.
      // win.PDFViewerApplication.eventBus.dispatch('find', {
      //   type: 'again',
      //   query: "and",
      //   highlightAll: true,
      // });
    }
  }

  function createPopDiv(div: HTMLElement) {
    popDiv = ztoolkit.UI.appendElement(
      {
        tag: "div",
        id: `${config.addonRef}-search-button-pop`,
        properties: { placeholder: "一行一个单词" },
        styles: {
          // left: div.offsetLeft - 300 + "px",
          // right: "10px",
          right: "300px",
          top: div.offsetTop + div.offsetHeight + 5 + "px",
          // top: "0px",
          position: "fixed",
          zIndex: "9999",
          minWidth: "280px",
          background: "#ddd",
          padding: "1px",
          borderRadius: "5px",
          display: "flex",
          flexDirection: "column",
        },
        children: [
          {
            tag: "div",

            classList: ["nav"],
            children: [
              {
                tag: "div",
                styles: {
                  padding: "5px",
                  background: "#bbb",
                  margin: "2px",
                  cursor: "pointer",
                },
                properties: { textContent: "<" },
                listeners: [
                  {
                    type: "click",
                    listener: (ev: any) => {
                      highlightIndex--;
                      searchText = highlightWords.get(highlightIndex);
                      textArea.value = searchText;
                      if (highlightIndex < 0) {
                        highlightIndex = highlightWords.words.length;
                        highlightWords.index = 0;
                      } else highlightWords.index = highlightIndex;
                      showHighlightIndex();
                    },
                  },
                ],
              },
              {
                tag: "div",
                styles: { padding: "5px", background: "#bbb", margin: "2px" },
                properties: { textContent: "x" },
                listeners: [
                  {
                    type: "click",
                    listener: (ev: any) => {
                      searchText = "";
                      highlightWords.set("", highlightIndex);
                      highlightWords.save();
                      if (highlightIndex == highlightWords.words.length) {
                        highlightIndex = 0;
                      }
                      searchText = highlightWords.get(highlightIndex);
                      textArea.value = searchText;
                      showHighlightIndex();
                    },
                  },
                ],
              },
              {
                tag: "div",
                styles: { padding: "5px", background: "#bbb", margin: "2px" },
                properties: { textContent: ">" },
                listeners: [
                  {
                    type: "click",
                    listener: (ev: any) => {
                      highlightIndex++;
                      searchText = highlightWords.get(highlightIndex);
                      textArea.value = searchText;

                      if (highlightIndex > highlightWords.words.length) {
                        highlightIndex = 0;
                        searchText = highlightWords.get(highlightIndex);
                        textArea.value = searchText;
                        highlightWords.index = 0;
                      } else if (highlightIndex == highlightWords.words.length) {
                        highlightWords.index = 0;
                      } else {
                        highlightWords.index = highlightIndex;
                      }
                      showHighlightIndex();
                    },
                  },
                ],
              },
              {
                tag: "div",
                id: `${config.addonRef}-search-button-highlightIndex`,
                properties: {
                  textContent: `${highlightIndex}/${highlightWords.words.length}`,
                },
              },
            ],
          },
          {
            tag: "textarea",
            namespace: "html",
            id: `${config.addonRef}-search-button-textarea`,
            styles: {
              width: "100%",
              height: "5em",
              overflowY: "scroll",
            },
            properties: {
              value: searchText,
              placeholder: "一行一个单词\n可以使用正则\n忽略大小写",
            },
            listeners: [
              {
                type: "input",
                listener: (ev: Event) => {
                  ev.stopPropagation();
                  const ta = ev.target as HTMLTextAreaElement;
                  const index = highlightWords.words.findIndex((f) => f == searchText);
                  if (index == -1) {
                    //已删除，增加到最后
                    highlightIndex = highlightWords.words.length;
                  } else {
                    //
                    highlightIndex = index;
                  }
                  searchText = ta.value;
                  highlightWords.set(searchText, highlightIndex);
                  highlightWords.save();
                  showHighlightIndex();
                },
                options: { capture: true },
              },
            ],
          },
          {
            tag: "div",
            id: `${config.addonRef}-search-button-pop-show`,
            classList: ["show"],
            properties: { textContent: "" },
          },
        ],
        listeners: [
          {
            type: "mouseover",
            listener: (ev: Event) => {
              ev.stopPropagation();
              if (!popDiv?.classList.contains("enter")) popDiv?.classList.add("enter");
              if (timeout) {
                clearTimeout(timeout);
                timeout = undefined;
              }
            },
            options: { capture: true },
          },
          {
            type: "mouseout",
            listener: (ev: Event) => {
              ev.stopPropagation();
              timeout = setTimeout(() => {
                if (popDiv?.classList.contains("enter")) popDiv?.classList.remove("enter");
              }, 1000);
            },
            options: { capture: true },
          },
        ],
      },
      root,
    ) as HTMLElement;
    let timeout: NodeJS.Timeout | undefined;
    textArea = popDiv.querySelector("textarea")!;
    show = popDiv.querySelector(`#${config.addonRef}-search-button-pop-show`)!;
    showHighlightIndex();
  }
  function showHighlightIndex() {
    highlightWords.save();
    popDiv!.querySelector(`#${config.addonRef}-search-button-highlightIndex`)!.textContent =
      `${highlightIndex + 1}/${highlightWords.words.length}`;
    const st = uniqueBy(
      searchText.split("\n").filter((s) => s),
      (s) => s,
    );
    const { ss, ssr, getColor, getSpan } = getFormatStr();

    show.innerHTML = st.map((a) => getSpan(a)).join("");
    debounceSearch();
  }
}
