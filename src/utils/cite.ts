import { getItem } from "./zzlb";

interface Rule {
  re: RegExp
  title?: string;
  rStr: string;
  examples?: string[];
}
const space = "[\\s\u00a0\u0020]*";
const num = `(?:${space}\\[\\d+\\]${space})?`;
const quote = `[“"”']`
const quote_space = `${space}${quote}${space}`;
const comma = `,`
const comma_space = `${space}${comma}${space}`
const dot = `\\.`
const dot_space = `${space}${dot}${space}`

const author0 = `${space}(?<author>.+)${space}`;
const author_no_dot = `${space}(?<author>[^\\.]+?)${space}`;
const author_no_num = `${space}(?<author>[^\\d]+?)${space}`;
const author_no_quote = `${space}(?<author>[^\\(]+?)${space}`;
const title0 = `${space}(?<title>.+?)${space}`;
const title_no_dot = `${space}(?<title>[^\\.]+?)${space}`;
const title_quote = `${space}["“]+${space}(?<title>.+?)${space}["”]+${space}`;
const journal0 = `${space}(?<journal>.+?)${space}`;
const journal1 = `${space}(?<journal>[^?]+?)${space}`;
const journal2 = `${space}(?<journal>In Proceedings of.+?)${space}`;
const year0 = `${space}(?<year>[\\d]+)(?<yearaz>[a-z]?)${space}`;
const year_brackets = `${space}\\(${space}(?<year>[\\d]+)(?<yearaz>[a-z]?)${space}\\)${space}`;

const page0 = `${space}(?<page>[\\d–-]+)${space}`;
const page1 = `${space}(?<page>[\\d–-\\s]+)${space}`;
const issue0 = `${space}(?<issue>[\\d]*)${space}`;
const volume0 = `${space}(?<volume>[\\d]*)${space}`;
const volume_brackets = `${space}\\(${space}(?<volume>[\\d]*)${space}\\)${space}`;
const series = `${space}(?<series>[\\d]*)${space}`;
const series_brackets = `${space}\\(${space}(?<series>[\\d]*)${space}\\)${space}`;
const doi = `${space}(?:doi:|DOI:|https://doi.org/|https://${space}doi.org/)${space}(?<doi>.*)[\\.]?${space}`;

const rules: Rule[] = [
  {
    rStr: `${author0}${year_brackets}${dot}${title0}${dot}${journal0}${volume0}${series_brackets}${comma}${page0}${dot}${doi}`,
  },
  {
    rStr: `${author0}${year_brackets}${dot_space}${title0}${dot_space}${journal0}${comma_space}(.*?)${doi}`
    // re: /\s*(?<author>[^(]+)\(\s*(?<year>[\d]+)[a-f]?\s*\)\.\s*(?<title>.+?)\s*\.\s*(?<journal>.+?),\s*(?<volume>[\s\d]*)(?:\((?<series>[\s\d]+)\))?,\s*(?<page>[\s\d–-]+)\./,
  },
  {
    rStr: `${author0}${dot_space}${title0}${dot_space}${journal0}${dot_space}${volume0}${series_brackets}${comma_space}${page0}${year0}`,
    // re: /\s*(?<author>.+)\.\s*(?<title>.+?)\s*\.\s*(?<journal>.+?)\.\s*(?<volume>[\d]*)\s*(?:\((?<series>[\s\d]+)\))?,\s*(?<page>[\s\d–-]+),\s*(?<year>\d{4}[a-f]?)\./,
  },
  {
    rStr: `${num}${author_no_dot}\\.${title0}\\.${space}(?:In Proc\\.)?${journal0}\\,${space}\\w*[\\.]?${space}${year0},${space}pp\\.${page0}\\.${doi}`
  },
  {
    rStr: `${author_no_dot}${year_brackets}${title0}\\.${journal0}${volume0}:${page0}\\.${doi}`,
  },
  {
    rStr: `${author0},${year0}\\.${title_no_dot}\\.${journal0}${issue0}${volume_brackets},${page0}\\.${doi}`,
  },
  {
    rStr: `${author0},${year0}\\.${title_no_dot}\\.${journal0}${issue0}${volume_brackets},${page0}\\.`,
  },
  {
    rStr: `${author0},${year0}${title_no_dot}\\.${journal0}${issue0},${page0}\\.${doi}`,
  },
  {
    rStr: `${author_no_num},${year0}\\.${title_no_dot}\\.${journal0}${issue0},${page0}\\.`,
  },
  {
    title: "apa page前面带Article，标题还带了个问号结尾",
    rStr: `${author_no_quote}\\(${year0}\\)${space}\\.${title0}[\\.?]${journal1},${issue0},${space}Article${page0}\\.`,
    examples: [
      "Moore, K., Buchmann, A., Månsson, M., & Fisher, D. (2021). Authenticity in tourism theory and experience. Practically indispensable and theoretically mischievous? Annals of Tourism Research, 89, Article 103208.",
    ],
  },
  {
    title: "apa DOI",
    rStr: `${author_no_quote}${year_brackets}${space}${dot_space}${title0}${dot_space}${journal1}${comma_space}${issue0}{comma_space}${page0}${dot_space}${doi}`,
    examples: [
      "Balakrishnan, J., & Dwivedi, Y. K. (2021). Conversational commerce: Entering the next stage of AI-powered digital assistants. Annals of Operations Research, 1–35. https:// doi.org/10.1007/s10479-021-04049-5",
    ],
  },
  {
    title: "apa vol no",
    rStr: `${author0}${year_brackets},${title_quote},${journal1},${space}Vol${dot_space}${volume0}No${dot_space}${issue0},${space}pp${dot_space}${page1}${dot_space}${doi}`,
    examples: [
      "Wood, R.and Zaichkowsky, J.L. (2004), “Attitudes and trading behavior of stock market investors: a segmentation approach”, Journal of Behavioral Finance, Vol. 5 No. 3, pp. 170 - 179.",
    ],
  },
  {
    title: "a",
    rStr: `${author0}${year_brackets}${dot}${title_no_dot}${dot}${journal0}${dot_space}\\d+${comma_space}pp${dot_space}${page1}${dot}`,
    examples: [
      "Lindman, J., Rossi, M. and Tuunainen, V.K. (2017). Opportunities and Risks of Blockchain Technologies in Payments: A Research Agenda. The 50th Hawaii International Conference on System Sciences. 2017, pp. 1533-1542.",
    ],
  },
  {
    rStr: `${author0}${year_brackets},${title_quote},${journal0},${space}Vol${dot_space}${volume0}No${dot_space}${issue0},${space}pp${dot_space}${page1}${dot_space}`,
    examples: [
      "Hauser, D.J.and Schwartz, N. (2016), “Attentive Turkers: MTurk participants perform better on online attention checks than do subject pool participants”, Behavior Research Methods, Vol. 48 No. 1, pp. 400 - 407.",
    ],
  },
  {
    rStr: `${author0}${year_brackets}${dot}${title_no_dot}${dot}${journal2},`,
    examples: [
      "Huotari, K., & Hamari, J. (2012). Deﬁning gamiﬁcation – A service marketing perspective. In Proceedings of the 16th international academic MindTrek conference Tampere, Finland, 3–5 October, 2012, (pp. 17–22).",
    ],
  },
  {
    rStr: `${author0}${comma}${year_brackets}${comma}${space}${quote}${title_no_dot}${quote}${space}${comma}${journal2}${comma}`,
    examples: [
      "Lee, R.G. and Dale, B.G. (1998), “Business process management: a review and evaluation”, Business Process Management Journal, Vol. 4 No. 3, pp. 214-225, doi: 10.1108/14637159810224322.",
    ],
  },
].map(a => Object.assign({}, a, { re: new RegExp(a.rStr), }))
// const o = {
//   re: new RegExp(`${author0},${year_brackets},${space}${quote}${title1}${quote}${space},${journal2},`),
//   examples: [
//     "Lee, R.G. and Dale, B.G. (1998), “Business process management: a review and evaluation”, Business Process Management Journal, Vol. 4 No. 3, pp. 214-225, doi: 10.1108/14637159810224322.",
//   ],
// }

// function test(re = /.*/, examples = [""]) {
//   for (const ex of examples) {
//     console.log(ex, ex.match(re))
//   }
// }
// test(o.re, o.examples);

export function ruleSearch(str: string) {
  if (__env__ === "development") {
    const r = rules.map(a => Object.assign({}, a, { m: str.match(a.rStr) })).map(a => Object.assign(a, { groups: a.m?.groups }))
    ztoolkit.log("cite 识别结果", str, r)
    return Object.assign({}, r.filter(a => a.m)[0], { all: r })
  }
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

function ruleTestLast() {
  return ruleTestInner(rules.length - 1);
}

if (__env__ === "development") {
  //@ts-ignore Zotero.ref_test
  // Zotero.ref_test = { refTest, ruleTestInner, ruleTestCross, ruleTestSingle, ruleTestLast };
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
    const libraryID = Zotero.getActiveZoteroPane().getSelectedLibraryID();
    const collections = [Zotero.getActiveZoteroPane().getSelectedCollection(true)];
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
