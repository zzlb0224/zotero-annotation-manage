import { getItem } from "./zzlb";

interface Rule {
  title: string;
  re: RegExp;
  rStr: string;
  examples: string[];
}
const space = "[\\s\u00a0\u0020]*";
const num = `(?:${space}\\[\\d+\\]${space})?`;
const author0 = `${space}(?<author>.+)${space}`;
const author1 = `${space}(?<author>[^\\.]+?)${space}`;
const author2 = `${space}(?<author>[^\\d]+?)${space}`;
const author3 = `${space}(?<author>[^\\(]+?)${space}`;
const title0 = `${space}(?<title>.+?)${space}`;
const title1 = `${space}(?<title>[^\\.]+?)${space}`;
const title2 = `${space}["“]+${space}(?<title>.+?)${space}["”]+${space}`;
const journal0 = `${space}(?<journal>.+?)${space}`;
const journal1 = `${space}(?<journal>[^?]+?)${space}`;
const journal2 = `${space}(?<journal>In Proceedings of.+?)${space}`;
const year0 = `${space}(?<year>[\\d]+)[a-z]?${space}`;
const year1 = `${space}\\(${space}(?<year>[\\d]+)[a-z]?${space}\\)${space}`;
const page0 = `${space}(?<page>[\\d–-]+)${space}`;
const page1 = `${space}(?<page>[\\d–-\\s]+)${space}`;
const issue = `${space}(?<issue>[\\d]*)${space}`;
const volume = `${space}(?<volume>[\\d]*)${space}`;
const volume1 = `${space}\\(${space}(?<volume>[\\d]*)${space}\\)${space}`;
const doi0 = `${space}(?:doi:|DOI:|https://doi.org/|https://${space}doi.org/)${space}(?<doi>.*)[\\.]?${space}`;
const doi1 = `${space}(?:doi:|DOI:|https://doi.org/|https://${space}doi.org/)${space}(?<doi>.*)?[\\.]?${space}`;
const nn = new RegExp(`${author2},${year0}\\.${title1}\\.${journal0}${issue},${page0}\\.`);

const apa_doi0 =
  /\s*(?<author>[^(]+)\(\s*(?<year>[\d]+)[a-f]?\s*\)\.\s*(?<title>.+?)\s*\.\s*(?<journal>.+?)\s*(?<volume>[\d]*)\s*(?:\((?<series>[\s\d]+)\))?,\s*(?<page>[\s\d–-]+)\.\s*doi:\s*(?<doi>.*)/;
const apa1 =
  /\s*(?<author>[^(]+)\(\s*(?<year>[\d]+)[a-f]?\s*\)\.\s*(?<title>.+?)\s*\.\s*(?<journal>.+?),\s*(?<volume>[\s\d]*)(?:\((?<series>[\s\d]+)\))?,\s*(?<page>[\s\d–-]+)\./;

const apa2 =
  /\s*(?<author>.+)\.\s*(?<title>.+?)\s*\.\s*(?<journal>.+?)\.\s*(?<volume>[\d]*)\s*(?:\((?<series>[\s\d]+)\))?,\s*(?<page>[\s\d–-]+),\s*(?<year>\d{4}[a-f]?)\./;

const apa3 = new RegExp(
  `${num}${author1}\\.${title0}\\.${space}(?:In Proc\\.)?${journal0}\\,${space}\\w*[\\.]?${space}${year0},${space}pp\\.${page0}\\.${doi0}`,
);
const apa4 = new RegExp(`${author1}${year1}${title0}\\.${journal0}${volume}:${page0}\\.${doi0}`);
const a5 = new RegExp(`${author0},${year0}\\.${title1}\\.${journal0}${issue}${volume1},${page0}\\.${doi1}`);
const a6 = new RegExp(`${author0},${year0}\\.${title1}\\.${journal0}${issue}${volume1},${page0}\\.`);
const a7Str = `${author0},${year0}${title1}\\.${journal0}${issue},${page0}\\.${doi0}`;
const a7 = new RegExp(a7Str);
const a8 = new RegExp(`${author2},${year0}\\.${title1}\\.${journal0}${issue},${page0}\\.`);
const regexps = [apa_doi0, apa1, apa2, apa3, apa4, a5, a6, a7, a8];
const rules: Rule[] = [
  {
    title: "",
    rStr: "",
    re: /\s*(?<author>[^(]+)\(\s*(?<year>[\d]+)[a-f]?\s*\)\.\s*(?<title>.+?)\s*\.\s*(?<journal>.+?)\s*(?<volume>[\d]*)\s*(?:\((?<series>[\s\d]+)\))?,\s*(?<page>[\s\d–-]+)\.\s*doi:\s*(?<doi>.*)/,
    examples: [] as string[],
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
    rStr: `${author0},${year0}${title1}\\.${journal0}${issue},${page0}\\.${doi0}`,
  },
  {
    rStr: `${author2},${year0}\\.${title1}\\.${journal0}${issue},${page0}\\.`,
  },
  {
    title: "apa page前面带Article，标题还带了个问号结尾",
    re: new RegExp(`${author3}\\(${year0}\\)${space}\\.${title0}[\\.?]${journal1},${issue},${space}Article${page0}\\.`),
    examples: [
      "Moore, K., Buchmann, A., Månsson, M., & Fisher, D. (2021). Authenticity in tourism theory and experience. Practically indispensable and theoretically mischievous? Annals of Tourism Research, 89, Article 103208.",
    ],
  },
  {
    title: "apa DOI",
    re: new RegExp(`${author3}\\(${year0}\\)${space}\\.${title0}[\\.?]${journal1},${issue},${page0}\\.${doi0}`),
    examples: [
      "Balakrishnan, J., & Dwivedi, Y. K. (2021). Conversational commerce: Entering the next stage of AI-powered digital assistants. Annals of Operations Research, 1–35. https:// doi.org/10.1007/s10479-021-04049-5",
    ],
  },
  {
    title: "apa vol no",
    re: new RegExp(`${author0}${year1},${title2},${journal1},${space}Vol\\.${volume}No\\.${issue},${space}pp\\.${page1}\\.${doi0}`),
    examples: [
      "Wood, R.and Zaichkowsky, J.L. (2004), “Attitudes and trading behavior of stock market investors: a segmentation approach”, Journal of Behavioral Finance, Vol. 5 No. 3, pp. 170 - 179.",
    ],
  },
  {
    title: "a",
    re: new RegExp(`${author0}${year1}\\.${title1}\\.${journal0}\\.${space}\\d+\\,${space}pp\\.${page1}\\.`),
    examples: [
      "Lindman, J., Rossi, M. and Tuunainen, V.K. (2017). Opportunities and Risks of Blockchain Technologies in Payments: A Research Agenda. The 50th Hawaii International Conference on System Sciences. 2017, pp. 1533-1542.",
    ],
  },
  {
    re: new RegExp(`${author0}${year1},${title2},${journal0},${space}Vol\\.${volume}No\\.${issue},${space}pp\\.${page1}\\.`),
    examples: [
      "Hauser, D.J.and Schwartz, N. (2016), “Attentive Turkers: MTurk participants perform better on online attention checks than do subject pool participants”, Behavior Research Methods, Vol. 48 No. 1, pp. 400 - 407.",
    ],
  },
  {
    re: new RegExp(`${author0}${year1}\\.${title1}\\.${journal2},`),
    examples: [
      "Huotari, K., & Hamari, J. (2012). Deﬁning gamiﬁcation – A service marketing perspective. In Proceedings of the 16th international academic MindTrek conference Tampere, Finland, 3–5 October, 2012, (pp. 17–22).",
    ],
  },
].map((a) =>
  Object.assign(a, {
    re: a.re ?? new RegExp(a.rStr),
    rStr: a.rStr ?? a.re + "",
  }),
);

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
    if (index !== undefined && index !== i && index + rules.length !== i) continue;
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
function ruleTestLast() {
  return ruleTestInner(rules.length - 1);
}
Zotero.ref_test = { refTest, ruleTestInner, ruleTestCross, ruleTestSingle, ruleTestLast };

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

export async function searchItem(info: { doi: string; title: string; year: string }) {
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
    return !i.itemType.startsWith("attachment") && i.isRegularItem && i.isRegularItem();
  });
  if (items.length) return items[0];
}

export async function createItemByZotero(doi: string) {
  //@ts-ignore extractIdentifiers
  const identifiers = Zotero.Utilities.extractIdentifiers(doi);
  if (identifiers.length) {
    const translate = new Zotero.Translate.Search();
    translate.setIdentifier(identifiers);
    const translators = await translate.getTranslators();
    translate.setTranslator(translators);
    ztoolkit.log("identifiers", identifiers, translators);
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

export async function showInLibrary(itemOrKeyOrId: Zotero.Item | string | number) {
  const win = Zotero.getMainWindow();
  if (win) {
    const item = getItem(itemOrKeyOrId);
    const id = item.parentID || item.id;
    win.ZoteroPane.selectItems([id]);
    win.focus();
  }
}
