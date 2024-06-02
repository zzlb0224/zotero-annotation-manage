const apa1 =
  /(?<author>[^(]+)\((?<year>[\s\d]+)\).+?,(?<volume>[\s\d]*)(?:\((?<series>[\s\d]+)\))?,(?<page>[\s\d–-]+)\./g;
"Koskelainen, T., Kalmi, P., Scornavacca, E., & Vartiainen, T. (2023). Financial literacy in the  digital age—A research agenda. Journal of Consumer Affairs, 57(1), 507–528.".match(
  apa1,
);

const rs = [apa1];
export function test(str: string) {
  for (const r of rs) {
    const m = str.match(r);
    if (m) {
      ztoolkit.log(r, m);
      return m?.groups;
    }
  }
}
