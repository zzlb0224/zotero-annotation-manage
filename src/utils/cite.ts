const apa_doi =
  /(?<author>[^(]+)\(\s*(?<year>[\d]+)[a-f]?\s*\)\.\s*(?<title>.+?)\s*\.\s*(?<journal>.+?)\s*(?<volume>[\d]*)\s*(?:\((?<series>[\s\d]+)\))?,\s*(?<page>[\s\d–-]+)\.\s*doi:\s*(?<doi>.*)/;
const apa =
  /(?<author>[^(]+)\(\s*(?<year>[\d]+)[a-f]?\s*\)\.\s*(?<title>.+?)\s*\.\s*(?<journal>.+?),\s*(?<volume>[\s\d]*)(?:\((?<series>[\s\d]+)\))?,\s*(?<page>[\s\d–-]+)\./;

const a2 =
  /(?<author>.+)\.\s*(?<title>.+?)\s*\.\s*(?<journal>.+?)\.\s*(?<volume>[\d]*)\s*(?:\((?<series>[\s\d]+)\))?,\s*(?<page>[\s\d–-]+),\s*(?<year>\d{4}[a-f]?)\./;
const regexps = [apa_doi, apa, a2];
function t() {
  const strings = [
    `11. PENG H., SHEN N., YING H.Q., WANG Q.W. Can environmental regulation directly promote green innovation behavior? - Based on situation of industrial agglomeration. Journal of Cleaner Production. 314, 128044, 2021.`,
    `Hong, Z., and Guo, X. (2019). Green product supply chain contracts considering environmental responsibilities. Omega 83, 155–166. doi: 10.1016/j.omega.2018.02.010`,
    `Koskelainen, T., Kalmi, P., Scornavacca, E., & Vartiainen, T. (2023). Financial literacy in the  digital age—A research agenda. Journal of Consumer Affairs, 57(1), 507–528.`,
    `Hong, H., Kacperczyk, M., 2009. The price of sin: the effects of social norms on markets. J. Financ. Econ. 93 (1), 15–36.`,
    `Bolton, P., Kacperczyk, M., 2019. Do Investors Care About Carbon risk?. Columbia University, New York Unpublished working paper.`,
    `Gompers, P., Ishii, J., Metrick, A., 2003. Corporate governance and equity prices. Q. J. Econ. 118 (1), 107–156.`,
    `Hong, H., Kacperczyk, M., 2009. The price of sin: the effects of social norms on markets. J. Financ. Econ. 93 (1), 15–36.`,
    `Fernandes, D., Lynch, J.G. Jr and Netemeyer, R.G. (2014), “Financial literacy, financial education, and downstream financial behaviors”, Management Science, Vol. 60 No. 8, pp. 1861-1883.`,
    `Patel, S.S. (2014), “Should you trade stocks on your iPhone?”, available at: https://www.marketwatch. com/story/the-rise-of-the-iphone-stock-trader-2014-04-07?mg5prod/accounts-mw.`,
    `BusinessWire (2014), “Fidelity® study: frequent users of mobile financial apps feel it gives them a competitive investing edge”, available at: https://www.businesswire.com/news/home/ 20141028005759/en/Fidelity®-Study-Frequent-Users-Mobile-Financial-Apps.`,
  ];
  for (const s1 of strings) {
    if (!s1) return;
    for (const r of regexps) {
      console.log(r, s1.match(r));
    }
  }
}

export async function citeTest(str: string) {
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
        return { index, r: rStr, groups, itemKey: item?.key };
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
