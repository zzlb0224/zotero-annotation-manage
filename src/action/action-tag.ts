export async function addTagsFromTA(item?: Zotero.Item, items?: Zotero.Item[]) {
  if (!item) return;
  const getAllTags = async () => {
    const rows = await Zotero.DB.queryAsync("select name as tag from tags");
    const lines = [];
    for (const row of rows) {
      lines.push(row.tag);
    }
    return lines;
  };
  if ((await item.getBestAttachmentState()).exists) {
    const pdfItem = await item.getBestAttachment();
    if (pdfItem) {
      const text = (await Zotero.PDFWorker.getFullText(pdfItem.id, 2, true))
        .text;
    }
  }
  const title = item.getField("title");
  const abstract = item.getField("abstractNote");
  const allTags = await getAllTags();
  const tags = allTags.filter(
    (t1) =>
      new RegExp(t1, "i").test(abstract) || new RegExp(t1, "i").test(title),
  );
  await Promise.all(
    tags.map(async (tag) => {
      item.addTag(tag, 1);
    }),
  );
  item.saveTx();
  return tags.length > 0
    ? `提取了${tags.length}个标签：${title}`
    : `未能提取：${title}`;
}
