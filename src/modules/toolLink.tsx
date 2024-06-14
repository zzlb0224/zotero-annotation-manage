import { config } from "../../package.json";
import {
  refSearch,
  createItemByZotero,
  searchItem,
  ruleSearch,
  ruleTestSingle,
  showInLibrary,
} from "../utils/cite";
import { getPrefAs, setPref } from "../utils/prefs";
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
  // setTimeout(() => {
  //   const tabDiv = Zotero_Tabs.deck.querySelector("#" + Zotero_Tabs.selectedID) as HTMLDivElement

  //   const root = tabDiv.querySelector(".react_popover_root") as HTMLDivElement || ztoolkit.UI.appendElement({
  //     tag: "div",
  //     styles: {
  //       width: "calc(100% - 80px)", height: "calc(100% - 100px)", position: "fixed", left: "40px", top: "80px", zIndex: "99999", background: "transparent", border: "1px solid black"
  //     },
  //     classList: ["react_popover_root"]
  //   }, tabDiv)
  //   ztoolkit.log("cccc", tabDiv, root)
  // }, 1000)
  let enable = getPrefAs("show-query-href", false);
  const root =
    doc.querySelector("body") || (doc.querySelector("div") as HTMLElement);

  const MutationObserver = ztoolkit.getGlobal("MutationObserver");
  const observerAddRowRef = new MutationObserver((mutationsList) => {
    // ztoolkit.log("aaaaobserverAddRowRef", mutationsList);
    for (const mr of mutationsList) {
      // ztoolkit.log(mr, mr.type);
      if (mr.addedNodes.length > 0) {
        createPanel(mr.target as HTMLDivElement);
      }
    }
  });

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
          const pr = doc.querySelector("#reader-ui .primary");
          if (pr) {
            if (enable) {
              enable = false;
              toolbarBtn.style.background = "";
              // pr?.removeEventListener("DOMSubtreeModified", DOMSubtreeModified);
              observerAddRowRef.disconnect();
            } else {
              enable = true;
              toolbarBtn.style.background = "#ddd";
              // pr?.addEventListener(
              //   "DOMSubtreeModified",
              //   DOMSubtreeModified,
              //   false,
              // );
              observerAddRowRef.observe(pr, {
                // attributes: true,
                childList: true,
                subtree: true,
              });
            }
          }
        },
      },
    ],
  });
  append(toolbarBtn);
  const pr = root.querySelector("#reader-ui .primary");
  if (enable && pr) {
    {
      // pr.addEventListener("DOMSubtreeModified", DOMSubtreeModified, false);
      //这里应该用observer代替
      observerAddRowRef.observe(pr, {
        // attributes: true,
        childList: true,
        subtree: true,
      });
    }
  }
}

async function createPanel(p: HTMLDivElement) {
  const refRows = p.querySelectorAll(".reference-row");
  for (const refRow of refRows as NodeListOf<HTMLDivElement>) {
    updateRefRow(refRow);
  }
}
function updateRefRow(refRow: HTMLDivElement) {
  {
    let text = "";
    const d = refRow.querySelector("div");
    if (d) {
      text = d.textContent || "";
      ztoolkit.log("aaaa获取最新text", text);
      if (refRow.dataset.text == text) {
        ztoolkit.log("aaaa缓存", text);
        return;
      }
      const MutationObserver = ztoolkit.getGlobal("MutationObserver");
      const observerTextChange = new MutationObserver((mutationsList) => {
        // ztoolkit.log("dom 变化了, ", mutationsList);
        for (const mr of mutationsList) {
          if (mr.addedNodes.length > 0) {
            changeFromText(mr.target.textContent || "", panel);
          }
        }
      });
      observerTextChange.observe(d, {
        attributes: true,
        childList: true,
        subtree: true,
      });
      refRow.dataset.text = text;
    } else {
      ztoolkit.log("aaaa下面的div还没建立");
      return;
    }
    const panel =
      (refRow.querySelector("group") as HTMLDivElement) ||
      (ztoolkit.UI.appendElement({ tag: "group" }, refRow) as HTMLDivElement);
    changeFromText(text, panel);
  }
}

async function changeFromText(text: string, panel: HTMLDivElement) {
  panel.innerHTML = ""; //清空panel
  for (const c of panel.childNodes) c.remove();

  const m = ruleSearch(text);
  {
    ztoolkit.log(
      // refRow.dataset,
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
            tag: "span",
            properties: {
              textContent: "在我的文库中显示...",
            },
            styles: {
              backgroundColor: "#ef4971",
              color: "#fff",
              margin: "5px",
              borderRadius: "5px",
              cursor: "pointer",
            },
            listeners: [
              {
                type: "click",
                listener() {
                  // openAnnotation(item, "", "");
                  showInLibrary(item);
                },
              },
            ],
          },
          panel,
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
          panel,
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
        const gss = getPrefAs("google-scholar-mirroring", "")
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
            panel,
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
            panel,
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
              borderRadius: "5px",
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
          panel,
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
                borderRadius: "5px",
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
            panel,
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
          panel,
        );
    } else {
      ruleTestSingle(text);
      // ztoolkit.UI.appendElement(
      //   {
      //     tag: "span",
      //     properties: {
      //       // textContent: "请等待插件作者更新识别链接的代码",
      //     },
      //     styles: {
      //       // backgroundColor: "#66aa6620",
      //       // margin: "5px",
      //     },
      //   },
      //   panel,
      // );
    }
    // break;
  }
}
