import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { config } from "../package.json";
import { getAllAnnotations, exportNoteByType, exportSingleNote, exportNoteByColor } from "./modules/AnnotationsToNote";
import { getSelectedItems } from "./modules/menu";
import { groupBy } from "./utils/groupBy";
import { sortValuesLength, sortFixedTags10ValuesLength } from "./utils/sort";
import { memFixedColor, stopPropagation } from "./utils/zzlb";

const iconBaseUrl = `chrome://${config.addonRef}/content/icons/`;

export async function annotationToNoteType(win: Window, collectionOrItem: "collection" | "item" = "collection") {
  //用于弹出菜单
  const doc = win.document;
  const popup = doc.querySelector(`#${config.addonRef}-create-note-type-popup-${collectionOrItem}`) as XUL.MenuPopup;
  // Remove all children in popup
  while (popup?.firstChild) {
    popup.removeChild(popup.firstChild);
  }
  // const id = getParentAttr(popup, "id");
  // const isc = id?.includes("collection");
  // ztoolkit.log("id", id);

  const ans = getAllAnnotations(await getSelectedItems(collectionOrItem)); //.flatMap((a) => a.tags.map((t2) => Object.assign({}, a, { tag: t2 })));
  const tags = groupBy(ans, (an) => an.type)
    .sort(sortValuesLength)
    .slice(0, 20);
  const maxLen = Math.max(...tags.map((a) => a.values.length));

  // Add new children
  let elemProp: TagElementProps;
  // const tags =memFixedTags()
  if (tags.length === 0) {
    elemProp = {
      tag: "menuitem",
      properties: {
        label: "没有标签",
      },
      attributes: {
        disabled: true,
      },
    };
  } else {
    elemProp = {
      tag: "fragment",
      children: tags.map((tag) => {
        const color = memFixedColor(tag.key);
        //取对数可以保留差异比较大的值
        const pre = (100 - (Math.log(tag.values.length) / Math.log(maxLen)) * 100).toFixed();
        return {
          tag: "menuitem",
          icon: iconBaseUrl + "favicon.png",
          styles: {
            background: `linear-gradient(to left, ${color},  #fff ${pre}%, ${color} ${pre}%)`,
          },
          properties: {
            label: `${tag.key}[${tag.values.length}]`,
          },
          // children:[{tag:"div",styles:{height:"2px",background:memFixedColor(tag.key),width:`${tag.values.length/maxLen*100}%`}}],
          listeners: [
            {
              type: "command",
              listener: (event: any) => {
                stopPropagation(event);
                exportNoteByType(tag.key as _ZoteroTypes.Annotations.AnnotationType, collectionOrItem);
              },
            },
          ],
        };
      }),
    };
  }
  ztoolkit.UI.appendElement(elemProp, popup);
}

export async function annotationToNoteColor(win: Window, collectionOrItem: "collection" | "item" = "collection") {
  //用于弹出菜单
  const doc = win.document;
  const popup = doc.querySelector(`#${config.addonRef}-create-note-color-popup-${collectionOrItem}`) as XUL.MenuPopup;
  // Remove all children in popup
  while (popup?.firstChild) {
    popup.removeChild(popup.firstChild);
  }
  // const id = getParentAttr(popup, "id");
  // const isc = id?.includes("collection");
  // ztoolkit.log("id", id);

  const ans = getAllAnnotations(await getSelectedItems(collectionOrItem)); //.flatMap((a) => a.tags.map((t2) => Object.assign({}, a, { tag: t2 })));
  const tags = groupBy(ans, (an) => an.color)
    .sort(sortValuesLength)
    .slice(0, 20);
  const maxLen = Math.max(...tags.map((a) => a.values.length));

  // Add new children
  let elemProp: TagElementProps;
  // const tags =memFixedTags()
  if (tags.length === 0) {
    elemProp = {
      tag: "menuitem",
      properties: {
        label: "没有标签",
      },
      attributes: {
        disabled: true,
      },
    };
  } else {
    elemProp = {
      tag: "fragment",
      children: tags.map((tag) => {
        const color = tag.key;
        //取对数可以保留差异比较大的值
        const pre = (100 - (Math.log(tag.values.length) / Math.log(maxLen)) * 100).toFixed();
        return {
          tag: "menuitem",
          icon: iconBaseUrl + "favicon.png",
          styles: {
            background: `linear-gradient(to left, ${color},  #fff ${pre}%, ${color} ${pre}%)`,
          },
          properties: {
            label: `${tag.key}[${tag.values.length}]`,
          },
          // children:[{tag:"div",styles:{height:"2px",background:memFixedColor(tag.key),width:`${tag.values.length/maxLen*100}%`}}],
          listeners: [
            {
              type: "command",
              listener: (event: any) => {
                stopPropagation(event);
                exportNoteByColor(tag.key as string, collectionOrItem);
              },
            },
          ],
        };
      }),
    };
  }
  ztoolkit.UI.appendElement(elemProp, popup);
}

export async function annotationToNoteTags(win: Window, collectionOrItem: "collection" | "item" = "collection") {
  //用于弹出菜单
  const doc = win.document;
  const popup = doc.querySelector(`#${config.addonRef}-create-note-tag-popup-${collectionOrItem}`) as XUL.MenuPopup;
  // Remove all children in popup
  while (popup?.firstChild) {
    popup.removeChild(popup.firstChild);
  }
  // const id = getParentAttr(popup, "id");
  // const isc = id?.includes("collection");
  // ztoolkit.log("id", id);

  const ans = getAllAnnotations(await getSelectedItems(collectionOrItem)).flatMap((a) =>
    a.tags.map((t2) => Object.assign({}, a, { tag: t2 })),
  );
  const tags = groupBy(ans, (an) => an.tag.tag)
    .sort(sortFixedTags10ValuesLength)
    .slice(0, 20);
  const maxLen = Math.max(...tags.map((a) => a.values.length));

  // Add new children
  let elemProp: TagElementProps;
  // const tags =memFixedTags()
  if (tags.length === 0) {
    elemProp = {
      tag: "menuitem",
      properties: {
        label: "没有标签",
      },
      attributes: {
        disabled: true,
      },
    };
  } else {
    elemProp = {
      tag: "fragment",
      children: tags.map((tag) => {
        const color = memFixedColor(tag.key);
        //取对数可以保留差异比较大的值
        const pre = (100 - (Math.log(tag.values.length) / Math.log(maxLen)) * 100).toFixed();
        return {
          tag: "menuitem",
          icon: iconBaseUrl + "favicon.png",
          styles: {
            background: `linear-gradient(to left, ${color},  #fff ${pre}%, ${color} ${pre}%)`,
          },
          properties: {
            label: `${tag.key}[${tag.values.length}]`,
          },
          // children:[{tag:"div",styles:{height:"2px",background:memFixedColor(tag.key),width:`${tag.values.length/maxLen*100}%`}}],
          listeners: [
            {
              type: "command",
              listener: (event: any) => {
                stopPropagation(event);
                exportSingleNote(tag.key, collectionOrItem);
              },
            },
          ],
        };
      }),
    };
  }
  ztoolkit.UI.appendElement(elemProp, popup);
}
