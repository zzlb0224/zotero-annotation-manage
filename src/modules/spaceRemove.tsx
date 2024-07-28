import { config } from "../../package.json";
import { getString } from "../utils/locale";

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
  .${config.addonRef}-space-button1::before {
    background-image: url(${image});
    background-size: 100%;
    content: "";
    display: inline-block;
    height: 16px;
    vertical-align: top;
    width: 16px;
    border-radius:4px;
  } 
  #${config.addonRef}-space-button-pop *{
    font-size:18px
  }
  #${config.addonRef}-space-button-pop .nav{
    display:none;
  } 
  #${config.addonRef}-space-button-pop.enter .nav{
    display:flex;
    flex-direction:row;
    justify-content: flex-end;
  }

  #${config.addonRef}-space-button-pop textarea{
    display:none
  } 
  #${config.addonRef}-space-button-pop.enter textarea{
    display:block
  } 
  `;

function readerToolbarCallback(event: Parameters<_ZoteroTypes.Reader.EventHandler<"renderToolbar">>[0]) {
  const { append, doc, reader, params } = event;
  if (doc.getElementById(`${config.addonRef}-space-button`)) return;

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
  // const debounceSearch = search, throttleSearch = debounceSearch;
  let pdfDoc = reader?._iframe?.contentDocument?.querySelector("iframe")?.contentDocument as Document;

  const btn = ztoolkit.UI.createElement(doc, "div", {
    namespace: "html",
    id: `${config.addonRef}-space-button`,
    classList: ["toolbarButton", "toolbar-button", `${config.addonRef}-space-button`],
    properties: {
      tabIndex: -1,
      title: getString("spaceRemove-CleaningUpWhitespace"), // "清理空白",
      textContent: "空",
    },
    listeners: [
      {
        type: "click",
        listener: (ev: Event) => {
          ztoolkit.log(ev);

          pdfDoc = reader?._iframe?.contentDocument?.querySelector("iframe")?.contentDocument as Document;
          if (!pdfDoc || !pdfDoc.querySelector("#viewerContainer")) return;

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
  let running = false,
    onceMore = false,
    height = 1000,
    popDiv: HTMLElement | undefined = undefined;
  const throttleSearch = Zotero.Utilities.throttle(() => {
    ztoolkit.log("throttleSearch");
    search();
  }, 2000);

  const debounceSearch = Zotero.Utilities.debounce(() => {
    ztoolkit.log("debounceSearch");
    search();
  }, 500);
  function search() {
    if (!popDiv) return;
    if (running) {
      onceMore = true;
      return;
    }
    running = true;
    popDiv.textContent = getString("spaceRemove-Cleaning"); //"正在清理";
    let firstSpan: HTMLSpanElement | undefined = undefined;
    let str = "";
    for (const span of pdfDoc.querySelectorAll("span[role=presentation]") as NodeListOf<HTMLSpanElement>) {
      if (span.screenY < -height || span.screenY > height * 2) continue;
      if (span.dataset["text"]) continue;
      if (!span.textContent || span.textContent == " ") {
        span.remove();
      } else {
        if (firstSpan == undefined) {
          firstSpan = span;
        } else {
          span.remove();
        }
        const t = span.textContent;
        if (span.textContent.includes("\ue5e5")) {
          //end
          const index = t.indexOf("\ue5e5");
          str += t.substring(0, index - 1);
          firstSpan.dataset["text"] = firstSpan.textContent = ToCDB(str.replace(/\s/g, "").replaceAll("\ue5d2\ue5cf", " "));
          firstSpan = undefined;
          str = t.substring(index + 1, t.length);
        } else {
          str += t;
        }
      }
    }

    popDiv.textContent = getString("spaceRemove-cleanedUp");
    setTimeout(() => {
      running = false;
      if (onceMore) {
        onceMore = false;
        search();
      }
    }, 2000);
  }

  function createPopDiv(div: HTMLElement) {
    popDiv = ztoolkit.UI.appendElement(
      {
        tag: "div",
        id: `${config.addonRef}-space-button-pop`,
        properties: { textContent: getString("spaceRemove-replaceEmpty") },
        styles: {
          right: "100px",
          top: div.offsetTop + div.offsetHeight + 5 + "px",
          // top: "0px",
          position: "fixed",
          zIndex: "9999",
          background: "#ddd",
          padding: "10px",
          borderRadius: "5px",
          display: "flex",
          flexDirection: "column",
        },
      },
      root,
    ) as HTMLDivElement;
  }
}
function ToCDB(str: string) {
  let tmp = "";
  for (let i = 0; i < str.length; i++) {
    if (str.charCodeAt(i) == 12288) {
      tmp += String.fromCharCode(str.charCodeAt(i) - 12256);
      continue;
    }
    if (str.charCodeAt(i) > 65280 && str.charCodeAt(i) < 65375) {
      tmp += String.fromCharCode(str.charCodeAt(i) - 65248);
    } else {
      tmp += String.fromCharCode(str.charCodeAt(i));
    }
  }
  return tmp;
}
