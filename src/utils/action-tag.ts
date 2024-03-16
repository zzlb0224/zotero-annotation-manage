const items: Zotero.Item[] | undefined = undefined;
const item: Zotero.Item | undefined = Zotero.Items.get(1);
async () => {
  if (!item) return;
  const getAllTags = async () => {
    const rows = await Zotero.DB.queryAsync("select name as tag from tags");
    const lines: string[] = [];
    for (const row of rows) {
      lines.push(row.tag);
    }
    return lines;
  };
  const title = item.getField("title");
  const abstract = item.getField("abstractNote");
  const allTags = await getAllTags();
  const tags = allTags.filter(
    (t) => RegExp(t, "i").test(abstract) || RegExp(t, "i").test(title),
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
};
