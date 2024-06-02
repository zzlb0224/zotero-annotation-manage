import { config } from "../../package.json";
import { citeTest } from "../utils/cite";
import { getPrefT, setPref } from "../utils/prefs";
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

function readerToolbarCallback(
  event: Parameters<_ZoteroTypes.Reader.EventHandler<"renderToolbar">>[0],
) {
  const { append, doc, reader, params } = event;
  if (doc.getElementById(`${config.addonRef}-space-button`)) return;

  let enable = getPrefT("show-query-href", false);
  const root =
    doc.querySelector("body") || (doc.querySelector("div") as HTMLElement);

  const toolbarBtn = ztoolkit.UI.createElement(doc, "div", {
    namespace: "html",
    id: `${config.addonRef}-space-button`,
    styles: { width: "unset", background: enable ? "#ddd" : "" },
    classList: ["toolbarButton", "toolbar-button"],
    properties: {
      tabIndex: -1,
      title: "",
      textContent: "链接",
    },
    listeners: [
      {
        type: "click",
        listener: (ev: Event) => {
          const evm = ev as MouseEvent;
          const toolbarBtn = evm.target as HTMLElement;
          // ztoolkit.log(root, readerRoot);
          const p = doc.querySelector("#reader-ui .primary");
          if (enable) {
            enable = false;
            toolbarBtn.style.background = "";
            p?.removeEventListener("DOMSubtreeModified", DOMSubtreeModified);
          } else {
            enable = true;
            toolbarBtn.style.background = "#ddd";
            p?.addEventListener(
              "DOMSubtreeModified",
              DOMSubtreeModified,
              false,
            );
          }
        },
      },
    ],
  });
  append(toolbarBtn);
  if (enable) {
    root
      .querySelector("#reader-ui .primary")
      ?.addEventListener("DOMSubtreeModified", DOMSubtreeModified, false);
  }
}
function DOMSubtreeModified(e: Event) {
  const p = e.target as HTMLDivElement;
  if (p.classList.contains("primary")) {
    const refRows = p.querySelectorAll(".reference-row");
    for (const refRow of refRows as NodeListOf<HTMLDivElement>) {
      const m = citeTest(refRow.textContent || "");
      ztoolkit.log(
        refRow.dataset,
        refRow.textContent,
        "在这里判断是否在我的文库当中，不在文库当中显示添加到文库按钮",
        m,
      );
      if (m) {
        //检测本地是否存在

        //增加查询按钮
        // if (refRow.querySelector("a")) return; //跳过已有链接的
        const exePath =
          "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
        const url = `https://scholar.google.com/scholar_lookup?title=${encodeURIComponent(m.title)}&author=${encodeURIComponent(m.author)}&publication_year=${m.year}`;
        const url2 = `https://sc.panda985.com/scholar?q=${encodeURIComponent(m.title)}+&hl=zh-CN&as_sdt=0%2C5&as_ylo=${m.year}&as_yhi=${m.year}`;

        ztoolkit.UI.appendElement(
          {
            tag: "span",
            properties: {
              textContent: `谷歌查询`,
            },
            styles: {
              backgroundColor: "#e9ba36",
              margin: "5px",
            },
            listeners: [
              {
                type: "click",
                listener: () => {
                  //两种打开方式都可以
                  Zotero.Utilities.Internal.exec(exePath, [url]);
                  // Zotero.launchFileWithApplication(url, exePath);
                },
              },
            ],
          },
          refRow,
        );

        ztoolkit.UI.appendElement(
          {
            tag: "span",
            properties: {
              textContent: `谷歌镜像`,
            },
            styles: {
              backgroundColor: "#b4f281",
              margin: "5px",
            },
            listeners: [
              {
                type: "click",
                listener: () => {
                  Zotero.launchFileWithApplication(url2, exePath);
                },
              },
            ],
          },
          refRow,
        );
      }
    }
  }
}
