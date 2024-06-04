const or = (s: string) => `(?:${s})?`;
const space = "\\s*";
const xuhao = `(?:${space}\\[\\d+\\]${space})?`;
const author = space + `(?<author>.+)` + space;
const author1 = space + `(?<author>[^\\.]+?)` + space;
const title = space + `(?<title>.+?)` + space;
const title1 = space + `(?<title>[^\\.]+?)` + space;
const journal = `\\s*(?<journal>.+?)\\s*`;
const year = `\\s*(?<year>[\\d]+)[a-z]?\\s*`;
const year1 = `${space}\\(${space}(?<year>[\\d]+)[a-z]?${space}\\)${space}`;
const page = space + `(?<page>[\\d–-]+)` + space;
const issue = space + `(?<issue>[\\d]*)` + space;
const volume = space + `(?<volume>[\\d]*)` + space;
const volume1 = space + `\\(${space}(?<volume>[\\d]*)${space}\\)` + space;
const doi = `${space}(?:doi:|DOI:|https://doi.org/)${space}(?<doi>.*)${space}`;
const doi1 = `${space}(?:doi:|DOI:|https://doi.org/)${space}(?<doi>.*)?${space}`;
const nn = new RegExp(
  `${author},${year}${title1}\\.${journal}${issue}${volume1}:${page}\\.${doi}`,
);

`Sharabati, A.-A.A., Naji Jawad, S., Bontis, N., 2010. Intellectual capital and business performance in the pharmaceutical sector of Jordan. Manag. Decis. 48 (1), 105–131.`.match(
  nn,
);

const apa_doi =
  /\s*(?<author>[^(]+)\(\s*(?<year>[\d]+)[a-f]?\s*\)\.\s*(?<title>.+?)\s*\.\s*(?<journal>.+?)\s*(?<volume>[\d]*)\s*(?:\((?<series>[\s\d]+)\))?,\s*(?<page>[\s\d–-]+)\.\s*doi:\s*(?<doi>.*)/;
const apa =
  /\s*(?<author>[^(]+)\(\s*(?<year>[\d]+)[a-f]?\s*\)\.\s*(?<title>.+?)\s*\.\s*(?<journal>.+?),\s*(?<volume>[\s\d]*)(?:\((?<series>[\s\d]+)\))?,\s*(?<page>[\s\d–-]+)\./;

const apa3 =
  /\s*(?<author>.+)\.\s*(?<title>.+?)\s*\.\s*(?<journal>.+?)\.\s*(?<volume>[\d]*)\s*(?:\((?<series>[\s\d]+)\))?,\s*(?<page>[\s\d–-]+),\s*(?<year>\d{4}[a-f]?)\./;
//[49] Karpus A, Vagliano I, Goczyla K. Serendipitous recommendations through ontology-based contextual pre-ﬁltering. In Proc. the 13th International Conference on Beyond Databases, May 2017, pp.246-259. DOI: 10.1007/978-3-31958274-0 21.
const apa4 = new RegExp(
  `${xuhao}${author1}\\.${title}\\.${space}(?:In Proc\\.)?${journal}\\,${space}\\w*[\\.]?${space}${year},${space}pp\\.${page}\\.${doi}`,
);
const apa5 = new RegExp(
  `${author1}${year1}${title}\\.${journal}${volume}:${page}\\.${doi}`,
);
const a6 = new RegExp(
  `${author},${year}\\.${title1}\\.${journal}${issue}${volume1},${page}\\.${doi1}`,
);
const regexps = [apa_doi, apa, apa3, apa4, apa5, a6];

export async function* citeTest(str: string) {
  for (let index = 0; index < regexps.length; index++) {
    const rStr = regexps[index];
    const m = str.match(rStr);
    if (m) {
      ztoolkit.log(rStr, m);
      const groups = m.groups;
      if (groups) {
        const item = await searchItem({
          doi: groups.doi,
          title: groups.title,
          year: groups.year,
        });
        yield { index, r: rStr + "", groups, itemKey: item?.key };
      }
    }
  }
}

async function searchItem(info: { doi: string; title: string; year: string }) {
  if (!info) return;
  const s = new Zotero.Search();

  if (info.doi) {
    //@ts-ignore joinMode any
    s.addCondition("joinMode", "any");
    s.addCondition("DOI", "is", info.doi);
    s.addCondition("DOI", "is", info.doi.toLowerCase());
    s.addCondition("DOI", "is", info.doi.toUpperCase());
  } else {
    if (info.title && info.title.length > 8) {
      s.addCondition("title", "contains", info.title);
    }
    if (info.year) {
      s.addCondition("year", "is", info.year);
    }
  }
  const ids = await s.search();
  const items = (await Zotero.Items.getAsync(ids)).filter((i) => {
    return (
      !i.itemType.startsWith("attachment") &&
      i.isRegularItem &&
      i.isRegularItem()
    );
  });
  if (items.length) return items[0];
}

export async function createItemByZotero(doi: string) {
  //@ts-ignore extractIdentifiers
  const identifiers = Zotero.Utilities.extractIdentifiers(doi);
  if (!identifiers.length) {
    const translate = new Zotero.Translate.Search();
    translate.setIdentifier(identifiers);
    const translators = await translate.getTranslators();
    translate.setTranslator(translators);
    const libraryID = ZoteroPane.getSelectedLibraryID();
    const collections = [ZoteroPane.getSelectedCollection(true)];
    return (
      await translate.translate({
        libraryID,
        collections,
        saveAttachments: true,
      })
    )[0];
  }
}
