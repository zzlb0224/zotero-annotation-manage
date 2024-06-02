const apa1 =
  /(?<author>[^(]+)\(\s*(?<year>[\d]+)[a-f]?\s*\)(?<title>.+?),(?<volume>[\s\d]*)(?:\((?<series>[\s\d]+)\))?,(?<page>[\s\d–-]+)\./;
const regexps = [apa1];
function t() {
  const strings = [
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

export function citeTest(str: string) {
  for (const r of regexps) {
    const m = str.match(r);
    if (m) {
      ztoolkit.log(r, m);
      return m?.groups;
    }
  }
}
