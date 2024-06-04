const or = (s: string) => `(?:${s})?`;
const space = "\\s*";
const num = `(?:${space}\\[\\d+\\]${space})?`;
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
const doi = `${space}(?:doi:|DOI:|https://doi.org/)${space}(?<doi>.*)[\\.]?${space}`;
const doi1 = `${space}(?:doi:|DOI:|https://doi.org/)${space}(?<doi>.*)?[\\.]?${space}`;
const nn = new RegExp(
  `${author},${year}${title1}\\.${journal}${issue},${page}\\.${doi}`,
);

`Yook, K.H., Choi, J.H., Suresh, N.C., 2018. Linking green purchasing capabilities to environmental and economic performance: the moderating role of firm size. J. Purch. Supply Manag. 24, 326–337. https://doi.org/10.1016/j. pursup.2017.09.001.`.match(
  nn,
);

const apa_doi0 =
  /\s*(?<author>[^(]+)\(\s*(?<year>[\d]+)[a-f]?\s*\)\.\s*(?<title>.+?)\s*\.\s*(?<journal>.+?)\s*(?<volume>[\d]*)\s*(?:\((?<series>[\s\d]+)\))?,\s*(?<page>[\s\d–-]+)\.\s*doi:\s*(?<doi>.*)/;
const apa1 =
  /\s*(?<author>[^(]+)\(\s*(?<year>[\d]+)[a-f]?\s*\)\.\s*(?<title>.+?)\s*\.\s*(?<journal>.+?),\s*(?<volume>[\s\d]*)(?:\((?<series>[\s\d]+)\))?,\s*(?<page>[\s\d–-]+)\./;

const apa2 =
  /\s*(?<author>.+)\.\s*(?<title>.+?)\s*\.\s*(?<journal>.+?)\.\s*(?<volume>[\d]*)\s*(?:\((?<series>[\s\d]+)\))?,\s*(?<page>[\s\d–-]+),\s*(?<year>\d{4}[a-f]?)\./;

const apa3 = new RegExp(
  `${num}${author1}\\.${title}\\.${space}(?:In Proc\\.)?${journal}\\,${space}\\w*[\\.]?${space}${year},${space}pp\\.${page}\\.${doi}`,
);
const apa4 = new RegExp(
  `${author1}${year1}${title}\\.${journal}${volume}:${page}\\.${doi}`,
);
const a5 = new RegExp(
  `${author},${year}\\.${title1}\\.${journal}${issue}${volume1},${page}\\.${doi1}`,
);
const a6 = new RegExp(
  `${author},${year}\\.${title1}\\.${journal}${issue}${volume1},${page}\\.`,
);
const a7 = new RegExp(
  `${author},${year}${title1}\\.${journal}${issue},${page}\\.${doi}`,
);
const regexps = [apa_doi0, apa1, apa2, apa3, apa4, a5, a6, a7];
function refTest() {
  const rrr = [
    `Sharabati, A.-A.A., Naji Jawad, S., Bontis, N., 2010. Intellectual capital and business performance in the pharmaceutical sector of Jordan. Manag. Decis. 48 (1), 105–131.`,
    6,
    `Yook, K.H., Choi, J.H., Suresh, N.C., 2018. Linking green purchasing capabilities to environmental and economic performance: the moderating role of firm size. J. Purch. Supply Manag. 24, 326–337. https://doi.org/10.1016/j. pursup.2017.09.001.`,
    7,
  ];
  for (let i = 0; i < rrr.length; i += 2) {
    const str = rrr[i] as string;
    const ind = rrr[i + 1] as number;
    const a = refSearch(str);
    if (a?.index == ind) {
      ztoolkit.log("refTest", i / 2, "ok");
    } else {
      refSearch(str, true);
      // ztoolkit.log(i, ind, a)
    }
  }
}
Zotero.ref_test = refTest;

export function refSearch(str: string, log = false) {
  for (let index = 0; index < regexps.length; index++) {
    const rStr = regexps[index];
    const m = str.match(rStr);
    if (log) {
      ztoolkit.log(index, `"${str}".match(${rStr})`);
    }
    if (m) {
      // ztoolkit.log(rStr, m);
      const groups = m.groups;
      if (groups) {
        return { index, r: rStr + "", groups };
      }
    }
  }
}

export async function searchItem(info: {
  doi: string;
  title: string;
  year: string;
}) {
  if (!info) return;
  const s = new Zotero.Search();

  if (info.doi) {
    //@ts-ignore joinMode any
    s.addCondition("joinMode", "any");
    s.addCondition("DOI", "is", info.doi);
    s.addCondition("DOI", "is", info.doi.toLowerCase());
    s.addCondition("DOI", "is", info.doi.toUpperCase());
  } else {
    ztoolkit.log("searchItem", info);
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
