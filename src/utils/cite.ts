const or = (s: string) => `(?:${s})?`;
const space = "\\s*";
const num = `(?:${space}\\[\\d+\\]${space})?`;
const author = space + `(?<author>.+)` + space;
const author1 = space + `(?<author>[^\\.]+?)` + space;
const author2 = space + `(?<author>[^\\d]+?)` + space;
const author3 = space + `(?<author>[^\\(]+?)` + space;
const title = space + `(?<title>.+?)` + space;
const title1 = space + `(?<title>[^\\.]+?)` + space;
const journal = `\\s*(?<journal>.+?)\\s*`;
const journal1 = `\\s*(?<journal>[^?]+?)\\s*`;
const year = `\\s*(?<year>[\\d]+)[a-z]?\\s*`;
const year1 = `${space}\\(${space}(?<year>[\\d]+)[a-z]?${space}\\)${space}`;
const page = space + `(?<page>[\\d–-]+)` + space;
const issue = space + `(?<issue>[\\d]*)` + space;
const volume = space + `(?<volume>[\\d]*)` + space;
const volume1 = space + `\\(${space}(?<volume>[\\d]*)${space}\\)` + space;
const doi = `${space}(?:doi:|DOI:|https://doi.org/|https:// doi.org/)${space}(?<doi>.*)[\\.]?${space}`;
const doi1 = `${space}(?:doi:|DOI:|https://doi.org/|https:// doi.org/)${space}(?<doi>.*)?[\\.]?${space}`;
const nn = new RegExp(
  `${author2},${year}\\.${title1}\\.${journal}${issue},${page}\\.`,
);

`Yu, C., Moslehpour, M., Tran, T.K., et al., 2023. Impact of non-renewable energy and natural resources on economic recovery: empirical evidence from selected developing economies. Resour. Policy 80, 103221. Yue, P., Korkmaz, A.G., Yin, Z., et al., 2022. The rise of digital finance: financial inclusion or debt trap? Financ. Res. Lett. 47, 102604. Zhang, J., Mishra, A.K., Zhu, P., et al., 2020. Land rental market and agricultural labor productivity in rural China: a mediation analysis. World Dev. 135, 105089.`.match(
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
const a8 = new RegExp(
  `${author2},${year}\\.${title1}\\.${journal}${issue},${page}\\.`,
);
const regexps = [apa_doi0, apa1, apa2, apa3, apa4, a5, a6, a7, a8];
const rules = [
  {
    re: apa_doi0,
  },
  {
    re: apa1,
  },
  {
    re: apa2,
  },
  {
    re: apa3,
  },
  {
    re: apa4,
  },
  {
    re: a5,
  },
  {
    re: a6,
  },
  {
    re: a7,
  },
  {
    re: a8,
  },
  {
    title: "apa page前面带Article，标题还带了个问号结尾",
    re: new RegExp(
      `${author3}\\(${year}\\)${space}\\.${title}[\\.?]${journal1},${issue},${space}Article${page}\\.`,
    ),
    examples: [
      "Moore, K., Buchmann, A., Månsson, M., & Fisher, D. (2021). Authenticity in tourism theory and experience. Practically indispensable and theoretically mischievous? Annals of Tourism Research, 89, Article 103208.",
    ],
  },
  {
    title: "apa DOI",
    re: new RegExp(
      `${author3}\\(${year}\\)${space}\\.${title}[\\.?]${journal1},${issue},${page}\\.${doi}`,
    ),
    examples: [
      "Balakrishnan, J., & Dwivedi, Y. K. (2021). Conversational commerce: Entering the next stage of AI-powered digital assistants. Annals of Operations Research, 1–35. https:// doi.org/10.1007/s10479-021-04049-5",
    ],
  },
];
export function ruleSearch(str: string) {
  for (let index = 0; index < rules.length; index++) {
    const rule = rules[index];
    const m = str.match(rule.re);
    if (m) {
      // ztoolkit.log(rStr, m);
      const groups = m.groups;
      if (groups) {
        return { index, rule, groups };
      }
    }
  }
}

export function ruleTestInner(index: number | undefined = undefined) {
  for (let i = 0; i < rules.length; i++) {
    if (index !== undefined && index !== i && index + rules.length !== i)
      continue;
    const rule = rules[i];
    if (rule.examples) {
      for (const str of rule.examples) {
        const m = str.match(rule.re);
        if (m) {
          ztoolkit.log("OK", i, str, m.groups);
        } else {
          ztoolkit.log("error", i, str, rule);
        }
      }
    } else {
      ztoolkit.log("OK", i, "没有测试用例");
    }
  }
}
export function ruleTestCross() {
  for (let index = 0; index < rules.length; index++) {
    const rule = rules[index];

    for (let ei = 0; ei < rules.length; ei++) {
      const e = rules[ei];
      if (e.examples) {
        for (const str of e.examples) {
          const m = str.match(rule.re);
          if (m) {
            if (ei == index) {
              ztoolkit.log("OK", index, str);
            } else {
              ztoolkit.log("error", index, ei, str, rule);
            }
          } else {
            if (ei == index) {
              ztoolkit.log("error", index, ei, str, rule);
            }
          }
        }
      }
    }
  }
}
export function ruleTestSingle(str: string) {
  ztoolkit.log("Test", str);
  for (let index = 0; index < rules.length; index++) {
    const rule = rules[index];

    const m = str.match(rule.re);
    if (m) {
      ztoolkit.log("OK", index, str);
    } else {
      ztoolkit.log("error", index, str, rule);
    }
  }
}

function refTest() {
  const rrr = [
    `Sharabati, A.-A.A., Naji Jawad, S., Bontis, N., 2010. Intellectual capital and business performance in the pharmaceutical sector of Jordan. Manag. Decis. 48 (1), 105–131.`,
    a6,
    `Yook, K.H., Choi, J.H., Suresh, N.C., 2018. Linking green purchasing capabilities to environmental and economic performance: the moderating role of firm size. J. Purch. Supply Manag. 24, 326–337. https://doi.org/10.1016/j. pursup.2017.09.001.`,
    a7,
    `Yu, C., Moslehpour, M., Tran, T.K., et al., 2023. Impact of non-renewable energy and natural resources on economic recovery: empirical evidence from selected developing economies. Resour. Policy 80, 103221. Yue, P., Korkmaz, A.G., Yin, Z., et al., 2022. The rise of digital finance: financial inclusion or debt trap? Financ. Res. Lett. 47, 102604. Zhang, J., Mishra, A.K., Zhu, P., et al., 2020. Land rental market and agricultural labor productivity in rural China: a mediation analysis. World Dev. 135, 105089.`,
    a8,
  ];
  for (let i = 0; i < rrr.length; i += 2) {
    const str = rrr[i] as string;
    const rStr = rrr[i + 1] as RegExp;
    const a = refSearch(str);
    if (a?.rStr == rStr) {
      ztoolkit.log(i / 2 + 1, "refTest", a.index, "ok");
    } else {
      refSearch(str, true);
      // ztoolkit.log(i, ind, a)
    }
  }
}
Zotero.ref_test = { refTest, ruleTestInner, ruleTestCross, ruleTestSingle };

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
        return { index, rStr, r: rStr + "", groups };
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
