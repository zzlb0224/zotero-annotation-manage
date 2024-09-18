export function getCitationItem(parentItem?: Zotero.Item, pageLabel: string = "") {
  if (!parentItem) return {};
  // Note: integration.js` uses `Zotero.Cite.System.prototype.retrieveItem`,
  // which produces a little bit different CSL JSON
  // @ts-ignore Item
  const itemData = Zotero.Utilities.Item.itemToCSLJSON(parentItem);
  const uris = [Zotero.URI.getItemURI(parentItem)];
  const citationItem = {
    uris,
    locator: pageLabel,
    itemData,
  };
  return citationItem;
}


export function getCiteAnnotationHtml(annotation: Zotero.Item, text = "") {
  const attachmentItem = annotation.parentItem;
  if (!attachmentItem) return "";
  const parentItem = attachmentItem.parentItem;
  if (!parentItem) return "";
  const color = annotation.annotationColor;
  const pageLabel = annotation.annotationPageLabel;
  const position = JSON.parse(annotation.annotationPosition);
  const citationItem = getCitationItem(parentItem, pageLabel);
  const storedAnnotation = {
    attachmentURI: Zotero.URI.getItemURI(attachmentItem),
    annotationKey: annotation.key,
    color,
    pageLabel,
    position,
    citationItem,
  };
  const formatted = text || annotation.annotationComment || annotation.annotationText || "没有文本，没有内容。。。";
  //class="highlight" 对应的内容必须有双引号 估计是Zotero.EditorInstanceUtilities._transformTextToHTML方法处理了这个
  return `<span class="highlight" data-annotation="${encodeURIComponent(JSON.stringify(storedAnnotation))}">"${formatted}"</span>
  `;
}
export function getCiteItemHtmlWithPage(annotation: Zotero.Item, text: string = "") {
  return getCiteItemHtml(annotation.parentItem?.parentItem, annotation.annotationPageLabel, text);
}
export function getCiteItemHtml(parentItem?: Zotero.Item, locator: string = "", text: string = "") {
  if (!parentItem) return "";
  const citationData = {
    citationItems: [getCitationItem(parentItem, locator)],
    properties: {},
  };
  const formatted = text ? text : Zotero.EditorInstanceUtilities.formatCitation(citationData);
  return `<span class="citation" data-citation="${encodeURIComponent(JSON.stringify(citationData))}">${formatted}</span>`;
}
