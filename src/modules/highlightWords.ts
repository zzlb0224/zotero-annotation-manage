import { config } from "../../package.json";
import {
  Timer,
  createTopDiv,
  getItem,
  injectCSS,
  memFixedTagColors,
  memSVG,
  openAnnotation,
  uniqueBy,
} from "../utils/zzlb";
import { Relations } from "../utils/Relations";
import { waitUtilAsync } from "../utils/wait";
import { getPref, setPref } from "../utils/prefs";
import { compare } from "../utils/sort";
import { col } from "../utils/action-col";
import { text } from "d3";

function register() {
  Zotero.Reader.registerEventListener(
    "renderToolbar",
    readerToolbarCallback,
    config.addonID,
  );
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
  }  `;

function readerToolbarCallback(
  event: Parameters<_ZoteroTypes.Reader.EventHandler<"renderToolbar">>[0],
) {
  const { append, doc, reader, params } = event;
  if (doc.getElementById(`${config.addonRef}-search-button`)) return;
  const root =
    doc.querySelector("body") || (doc.querySelector("div") as HTMLElement);
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
  let searchText = "";
  // reader?._iframe?.contentDocument?.querySelector("iframe")?.
  //     window.addEventListener('scroll', throttleHandleScroll);
  const throttleSearch = Zotero.Utilities.throttle(() => {
    ztoolkit.log("滚动2");
    search();
  }, 1000);
  let pdfDoc = reader?._iframe?.contentDocument?.querySelector("iframe")
    ?.contentDocument as Document;
  let running = false;
  let onceMore = false;
  function search() {
    if (!popDiv) return;

    if (running) {
      onceMore = true;
      return;
    }
    running = true;

    const ss = uniqueBy(
      searchText
        .split("\n")
        .filter((f) => f)
        .filter((f) => f != " "),
      (a) => a,
    );
    // if (ss.length == 0) return
    // ztoolkit.log(searchText, ss)
    // ztoolkit.log("search",
    //     pdfDoc?.querySelectorAll("span"),
    //     pdfDoc
    // )
    const colors = memFixedTagColors().map((a) => a.color);
    for (const span of pdfDoc.querySelectorAll("span[role=presentation]")) {
      if (span.screenY < -100 || span.screenY > 1000) continue;
      let html = span.getAttribute("data-text");
      if (!html) {
        html = span.textContent;
        if (html) {
          span.setAttribute("data-text", html);
        }
      }
      if (!html) continue;
      for (let index = 0; index < ss.length; index++) {
        const item = ss[index];
        const r = new RegExp(item, "ig");
        html = html.replace(
          r,
          (a) =>
            `<span style='background:${colors[index]};box-shadow: 0 0 10px rgba(180, 0, 170, 1);box-sizing: content-box;border: 2px solid #fff;'>${a}</span>`,
        );
        //
      }
      // ztoolkit.log(text, html)
      // if (html.includes("<span style='background:")){}
      span.innerHTML = html;
    }

    running = false;
    if (onceMore) search();
  }
  function clearSearch() {
    for (const span of pdfDoc.querySelectorAll("span[role=presentation]")) {
      const html = span.getAttribute("data-text");
      if (html) span.textContent = html;
    }
  }

  const debounceSearch = Zotero.Utilities.debounce(search, 300);
  let popDiv: HTMLElement | undefined = undefined;

  const btn = ztoolkit.UI.createElement(doc, "div", {
    namespace: "html",
    id: `${config.addonRef}-search-button`,
    classList: [
      "toolbarButton",
      "toolbar-button",
      `${config.addonRef}-search-button`,
    ],
    properties: {
      tabIndex: -1,
      title: "查找",
      // textContent: "查找"
    },
    listeners: [
      {
        type: "click",
        listener: (ev: Event) => {
          ztoolkit.log(ev);

          pdfDoc = reader?._iframe?.contentDocument?.querySelector("iframe")
            ?.contentDocument as Document;
          if (!pdfDoc || !pdfDoc.querySelector("#viewerContainer")) return;

          const evm = ev as MouseEvent;
          const div = evm.target as HTMLElement;
          if (popDiv) {
            div.style.background = "";
            popDiv.remove();
            popDiv = undefined;
            pdfDoc
              .querySelector("#viewerContainer")
              ?.removeEventListener("scroll", debounceSearch);
            clearSearch();
          } else {
            pdfDoc
              .querySelector("#viewerContainer")
              ?.addEventListener("scroll", debounceSearch);
            div.style.background = "#ddd";
            searchText = (getPref("search-words") as string) || "";
            debounceSearch();
            popDiv = ztoolkit.UI.appendElement(
              {
                tag: "div",
                id: `${config.addonRef}-search-button`,
                properties: { placeholder: "一行一个单词" },
                styles: {
                  position: "fixed",
                  // left: div.offsetLeft - 100 + "px",
                  right: "10px",
                  top: div.offsetTop + div.offsetHeight + "px",
                  zIndex: "9999",
                  minWidth: "160px",
                  background: "#ddd",
                  padding: "10px",
                  borderRadius: "5px",
                },
                children: [
                  {
                    tag: "textarea",
                    namespace: "html",
                    styles: {
                      width: "100%",
                      height: "5em",
                      overflowY: "scroll",
                    },
                    properties: { value: searchText },
                    listeners: [
                      {
                        type: "keyup",
                        listener: (ev: Event) => {
                          ev.stopPropagation;
                          const ta = ev.target as HTMLTextAreaElement;
                          searchText = ta.value;
                          setPref("search-words", searchText);
                          debounceSearch();
                        },
                        options: { capture: true },
                      },
                    ],
                  },
                ],
              },
              root,
            ) as HTMLElement;
          }
        },
      },
    ],
  });
  append(btn);
  const a = ztoolkit.UI.createElement(doc, "div", {
    id: `${config.addonRef}-search-button`,
    listeners: [
      {
        type: "click",
        listener: (ev: Event) => {
          ztoolkit.log(ev);
        },
      },
    ],
    children: [
      {
        tag: "button",
        namespace: "html",
        id: `${config.addonRef}-search-button-a`,
        classList: ["toolbarButton", `${config.addonRef}-search-button-a`],
        properties: {
          tabIndex: -1,
          title: "查找",
          textContent: "查找",
        },
      },
    ],
  });
  if (a) {
    // append(a)
    return;
  }
  doc.getElementById(`${config.addonRef}-search-button-style`)?.remove();
  append(
    ztoolkit.UI.createElement(doc, "button", {
      namespace: "html",
      id: `${config.addonRef}-search-button`,
      classList: ["toolbarButton", `${config.addonRef}-search-menu`],
      properties: {
        tabIndex: -1,
        title: "查找",
      },
      listeners: [
        {
          type: "click",
          listener: (ev: Event) => {
            ztoolkit.log(ev);
          },
        },
      ],
    }),
  );
  append(
    ztoolkit.UI.createElement(doc, "style", {
      id: `${config.addonRef}-search-button-style`,
      namespace: "html",
      properties: {
        textContent: readerButtonCSS,
      },
    }),
  );
}
