import { config } from "../../package.json";
import { getString } from "../utils/locale";
import { getPref, setPref } from "../utils/prefs";
import { getFixedColor, getFixedTags } from "../utils/zzlb";

export async function registerPrefsScripts(_window: Window) {
  // This function is called when the prefs window is opened
  // See addon/chrome/content/preferences.xul onpaneload
  if (!addon.data.prefs) {
    addon.data.prefs = {
      window: _window,
      columns: [
        {
          dataKey: "title",
          label: getString("prefs-table-title"),
          fixedWidth: true,
          width: 100,
        },
        {
          dataKey: "detail",
          label: getString("prefs-table-detail"),
        },
      ],
      rows: [
        {
          title: "Orange",
          detail: "It's juicy",
        },
        {
          title: "Banana",
          detail: "It's sweet",
        },
        {
          title: "Apple",
          detail: "I mean the fruit APPLE",
        },
      ],
    };
  } else {
    addon.data.prefs.window = _window;
  }
  updatePrefsUI();
  bindPrefEvents();
}
function replaceElement(doc: Document) {
  const id = `zotero-prefpane-${config.addonRef}-coloredTags`;
  ztoolkit.UI.replaceElement(
    {
      tag: "div",
      id,
      attributes: {
        value: getPref("translateSource") as string,
        native: "true",
      },
      children: [
        {
          tag: "div",
          styles: {
            display: "flex",
            flexDirection: "row",
            justifyContent: "flex-start",
            flexWrap: "wrap",
          },
          children: getFixedTags().map((tag) => ({
            tag: "label",
            properties: {
              innerText: tag,
              TextContent: tag,
            },
            styles: {
              background: getFixedColor(tag),
              padding: "5px",
              margin: "5px 0",
            },
          })),
        },
      ],
    },
    doc.getElementById(id)!,
  );
  // if(ele)ele.id=id
}

async function updatePrefsUI() {
  // You can initialize some UI elements on prefs window
  // with addon.data.prefs.window.document
  // Or bind some events to the elements
  const renderLock = ztoolkit.getGlobal("Zotero").Promise.defer();
  if (addon.data.prefs?.window == undefined) return;
  const doc = addon.data.prefs.window?.document;
  if (!doc) {
    return;
  }
  replaceElement(doc);

  // const tags =  doc.querySelector(`${config.addonRef}-tags`) as HTMLInputElement
  // if(tags)
  // {
  // tags.value = getPref("tags") as string +"load"
  // tags.addEventListener("change", (e: Event) => {
  //     ztoolkit.log(e)
  //   })
  // }

  const tableHelper = new ztoolkit.VirtualizedTable(addon.data.prefs?.window)
    .setContainerId(`${config.addonRef}-table-container`)
    .setProp({
      id: `${config.addonRef}-prefs-table`,
      // Do not use setLocale, as it modifies the Zotero.Intl.strings
      // Set locales directly to columns
      columns: addon.data.prefs?.columns,
      showHeader: true,
      multiSelect: true,
      staticColumns: true,
      disableFontSizeScaling: true,
    })
    .setProp("getRowCount", () => addon.data.prefs?.rows.length || 0)
    .setProp(
      "getRowData",
      (index) =>
        addon.data.prefs?.rows[index] || {
          title: "no data",
          detail: "no data",
        },
    )
    // Show a progress window when selection changes
    .setProp("onSelectionChange", (selection) => {
      new ztoolkit.ProgressWindow(config.addonName)
        .createLine({
          text: `Selected line: ${addon.data.prefs?.rows
            .filter((v, i) => selection.isSelected(i))
            .map((row) => row.title)
            .join(",")}`,
          progress: 100,
        })
        .show();
    })
    // When pressing delete, delete selected line and refresh table.
    // Returning false to prevent default event.
    .setProp("onKeyDown", (event: KeyboardEvent) => {
      if (event.key == "Delete" || (Zotero.isMac && event.key == "Backspace")) {
        addon.data.prefs!.rows =
          addon.data.prefs?.rows.filter(
            (v, i) => !tableHelper.treeInstance.selection.isSelected(i),
          ) || [];
        tableHelper.render();
        return false;
      }
      return true;
    })
    // For find-as-you-type
    .setProp(
      "getRowString",
      (index) => addon.data.prefs?.rows[index].title || "",
    )
    // Render the table.
    .render(-1, () => {
      renderLock.resolve();
    });
  await renderLock.promise;
  ztoolkit.log("Preference table rendered!");
}

function bindPrefEvents() {
  addon.data
    .prefs!.window.document.querySelector(
      `#zotero-prefpane-${config.addonRef}-enable`,
    )
    ?.addEventListener("command", (e) => {
      ztoolkit.log(e, getPref("tags"));
      // addon.data.prefs!.window.alert(
      //   `Successfully changed to ${(e.target as XUL.Checkbox).checked}!`,
      // );
    });

  addon.data
    .prefs!.window.document.querySelector(
      `#zotero-prefpane-${config.addonRef}-tags`,
    )
    ?.addEventListener("change", (e) => {
      ztoolkit.log(e, getPref("tags"));

      replaceElement(addon.data.prefs!.window.document);
      // addon.data.prefs!.window.alert(
      //   `Successfully changed to ${(e.target as HTMLInputElement).value}!`,
      // );
    });

  addon.data
    .prefs!.window.document.querySelector(
      `#zotero-prefpane-${config.addonRef}-input`,
    )
    ?.addEventListener("change", (e) => {
      ztoolkit.log(e, getPref("tags"));
      addon.data.prefs!.window.alert(
        `Successfully changed to ${(e.target as HTMLInputElement).value}!`,
      );
    });
}
export async function setDefaultPrefSettings() {
  if (!getPref("tags")) {
    setPref("tags", getFixedTags().join(","));
  }
  if (getPref("currentCollection") == undefined) {
    setPref("currentCollection", true);
  }
  if (getPref("selectedCollection") == undefined) {
    setPref("selectedCollection", true);
  }
}
