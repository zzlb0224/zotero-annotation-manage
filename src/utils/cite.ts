const apa1 =
  /(?<author>[^(]+)\(\s*(?<year>[\d]+)[a-f]?\s*\)(?<title>.+?),(?<volume>[\s\d]*)(?:\((?<series>[\s\d]+)\))?,(?<page>[\s\d–-]+)\./;
function t() {
  const s1 =
    "Koskelainen, T., Kalmi, P., Scornavacca, E., & Vartiainen, T. (2023). Financial literacy in the  digital age—A research agenda. Journal of Consumer Affairs, 57(1), 507–528.";
  console.log(s1.match(apa1));
}

const rs = [apa1];
export function citeTest(str: string) {
  for (const r of rs) {
    const m = str.match(r);
    if (m) {
      ztoolkit.log(r, m);
      return m?.groups;
    }
  }
}
