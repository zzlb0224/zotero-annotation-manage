import { config } from "../../package.json";
import { refSearch, createItemByZotero, searchItem, ruleSearch, ruleTestSingle } from "../utils/cite";
import { getPrefT, setPref } from "../utils/prefs";
import { isDebug, openAnnotation } from "../utils/zzlb";
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
async function DOMSubtreeModified(e: Event) {
  const p = e.target as HTMLDivElement;
  ztoolkit.log("DOMSubtreeModified",p.classList)
  if (p.classList.contains("primary")) {
    const refRows = p.querySelectorAll(".reference-row");
  ztoolkit.log("DOMSubtreeModified",p.classList,refRows.length)
    for (const refRow of refRows as NodeListOf<HTMLDivElement>) {
      const text=refRow.textContent || ""
      
      const m = ruleSearch(text);
      {
        ztoolkit.log(
          refRow.dataset,
          text,
          "在这里判断是否在我的文库当中，不在文库当中显示添加到文库按钮",
          m,
        );
        if (m) {
          //检测本地是否存在
          const item = await searchItem({
            doi: m.groups.doi,
            title: m.groups.title,
            year: m.groups.year,
          });
          if (item?.key) {
            ztoolkit.UI.appendElement(
              {
                tag: "div",
                properties: {
                  textContent: "已在我的文库中",
                },
                styles: {
                  backgroundColor: "#97497110",
                  margin: "5px",
                },
                listeners: [
                  {
                    type: "type",
                    listener() {
                      openAnnotation(item, "", "");
                    },
                  },
                ],
              },
              refRow,
            );
          } else {
            ztoolkit.UI.appendElement(
              {
                tag: "span",
                properties: {
                  textContent: "在我的文库中未找到",
                },
                styles: {
                  // backgroundColor: "#a20",
                  margin: "5px",
                },
              },
              refRow,
            );
          }

          //增加查询按钮
          // if (refRow.querySelector("a")) return; //跳过已有链接的
          const { groups } = m;
          if (groups) {
            const exePath =
              "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
            const url = `https://scholar.google.com/scholar_lookup?title=${encodeURIComponent(groups.title)}&author=${encodeURIComponent(groups.author)}&publication_year=${groups.year}`;
            const url2 = `https://sc.panda985.com/scholar?q=${encodeURIComponent(groups.title)}+&hl=zh-CN&as_sdt=0%2C5&as_ylo=${groups.year}&as_yhi=${groups.year}`;
            const gss = getPrefT("google-scholar-mirroring", "")
              .split("\n")
              .map((a) => a.trim())
              .filter((f) => f)
              .map((a) => a.split(" "))
              .map((a) => (a.length == 1 ? ["谷歌镜像", a[0]] : a))
              .map((a) => ({
                title: a[0],
                url: `${a[1]}${a[1].includes("?") ? "" : "?"}q=${encodeURIComponent(groups.title)}+&hl=zh-CN&as_sdt=0%2C5&as_ylo=${groups.year}&as_yhi=${groups.year}`,
              }));
            if (groups.doi) {
              const doi = groups.doi.replace(/\s/g, "").replace(/\\.$/, "");

              ztoolkit.UI.appendElement(
                {
                  tag: "span",
                  properties: {
                    textContent: "添加到文库",
                  },
                  styles: {
                    backgroundColor: "#97497120",
                    margin: "5px",
                    cursor: "pointer",
                  },
                  listeners: [
                    {
                      type: "click",
                      listener() {
                        createItemByZotero(doi || "");
                      },
                    },
                  ],
                },
                refRow,
              );
              ztoolkit.UI.appendElement(
                {
                  tag: "a",
                  namespace: "html",
                  properties: {
                    textContent: `DOI`,
                  },
                  styles: {
                    backgroundColor: "#e9ba36",
                    margin: "5px",
                    cursor: "pointer",
                  },
                  listeners: [
                    {
                      type: "click",
                      listener: () => {
                        //两种打开方式都可以
                        Zotero.Utilities.Internal.exec(exePath, [
                          "https://doi.org/" + groups.doi,
                        ]);
                        // Zotero.launchFileWithApplication(url, exePath);
                      },
                    },
                  ],
                },
                refRow,
              );
            }
            ztoolkit.UI.appendElement(
              {
                tag: "a",
                namespace: "html",
                properties: {
                  textContent: `谷歌查询`,
                },
                styles: {
                  backgroundColor: "#e9ba36",
                  margin: "5px",
                  cursor: "pointer",
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
            for (const gs of gss)
              ztoolkit.UI.appendElement(
                {
                  tag: "a",
                  namespace: "html",
                  properties: {
                    textContent: gs.title,
                  },
                  styles: {
                    backgroundColor: "#b4f281",
                    margin: "5px",
                    cursor: "pointer",
                  },
                  listeners: [
                    {
                      type: "click",
                      listener: () => {
                        Zotero.launchFileWithApplication(gs.url, exePath);
                      },
                    },
                  ],
                },
                refRow,
              );
          }
          if (isDebug())
            ztoolkit.UI.appendElement(
              {
                tag: "div",
                properties: {
                  textContent: "识别结果:" + JSON.stringify(m),
                },
                styles: {
                  backgroundColor: "#97497120",
                  margin: "5px",
                },
              },
              refRow,
            );
        } else {
          ruleTestSingle(text)
          ztoolkit.UI.appendElement(
            {
              tag: "span",
              properties: {
                textContent: "请等待插件作者更新识别链接的代码",
              },
              styles: {
                backgroundColor: "#66aa6620",
                margin: "5px",
              },
            },
            refRow,
          );
        }
        // break;
      }
    }
  }
}
