import { waitFor, waitUtilAsync } from "./wait";
import { getItem } from "./zzlb";

export class Relations {
  item!: Zotero.Item;
  constructor(itemOrKeyOrId: Zotero.Item | string | number) {
    const item = getItem(itemOrKeyOrId);
    if (!item) {
      //修复新建item的时候getItem返回的false，需要等待才能获取的问题
      setTimeout(async () => {
        const item = await waitFor(() => getItem(itemOrKeyOrId));
        if (item) {
          this.item = item
        }
      });
    } else {
      this.item = item
    }
  }
  // static RelationsPredicate="link:annotation" as _ZoteroTypes.RelationsPredicate;
  static RelationsPredicate = "dc:relation" as _ZoteroTypes.RelationsPredicate;
  static RelationsTag = "🔗Bi-directional linked annotation";

  static checkLinkAnnotation() {
    setTimeout(async () => {
      const d = await Zotero.RelationPredicates.add(Relations.RelationsPredicate);
      ztoolkit.log("check RelationPredicates " + Relations.RelationsPredicate, Zotero.RelationPredicates._allowAdd, d);
    });
  }
  static getItemURIs(str: string) {
    return this.getOpenPdfs(str)
      .map((a) => getItem(a.annotationKey))
      .map((a) => Zotero.URI.getItemURI(a));
  }
  static getOpenPdfs(str: string) {
    return (
      str
        .match(/.*(zotero:\/\/open-pdf\/library\/items\/(.*?)[?]page=(.*?)&annotation=([^)]*)).*/g)
        ?.map((a) => a.toString())
        .map((a) => this.getOpenPdf(a))
        .filter((f) => f.openPdf) || []
    );
  }
  static getOpenPdf(str: string) {
    const a = str.match(/.*(zotero:\/\/open-pdf\/library\/items\/(.*?)[?]page=(.*?)&annotation=([^)]*)).*/);
    return {
      text: a?.[0] || "",
      openPdf: a?.[1] || "",
      pdfKey: a?.[2] || "",
      page: a?.[3] || "",
      annotationKey: a?.[4] || "",
    };
  }
  getLinkRelationItems() {
    return this.getLinkRelations().map((toItemURI) => getItem(Zotero.URI.getURIItemID(toItemURI) || ""));
  }
  getLinkRelations() {
    if (!this.item) return []
    try {
      const rs = this.item.getRelations() as any;
      return (rs[Relations.RelationsPredicate] as string[]) || [];
    } catch (error) {
      ztoolkit.log("新创建的item会触发getRelations错误，重新获取，再尝试一遍", error);
      try {
        this.item = getItem(this.item.key);
        if (!this.item) return []
        const rs = this.item.getRelations() as any;
        return (rs[Relations.RelationsPredicate] as string[]) || [];
      } catch (error) {
        ztoolkit.log("再次尝试还是错误", error);
        return [];
      }
    }
  }

  // setRelations(openPdfs: string[]) {
  //   const annotation = this.item;
  //   const d:any= {}
  //   d[Relations.RelationsPredicate] = openPdfs
  //   const changed = annotation.setRelations(d);
  //   if (changed) {
  //     annotation.saveTx();
  //   this.setTag();}
  // }
  setRelationsTag() {
    if (!this.item) return;
    if (this.getLinkRelations().length > 0) {
      if (!this.item.hasTag(Relations.RelationsTag)) this.item.addTag(Relations.RelationsTag, 1);
    } else {
      if (this.item.hasTag(Relations.RelationsTag)) this.item.removeTag(Relations.RelationsTag);
    }
    // this.item.saveTx();
  }
  getOpenPdfURI() {
    if (!this.item) return ``;
    return `zotero://open-pdf/library/items/${this.item.parentItemKey}?page=${this.item.annotationPageLabel}&annotation=${this.item.key}`;
  }
  // removeRelations(openPdfs: string[]) {
  //   const itemURIs= Relations.mapOpenPdf(openPdfs).map(a=>getItem(a.annotationKey)).map(a=>Zotero.URI.getItemURI(a))
  removeRelations(itemURIs: string[]) {
    if (!this.item) return ``;
    const thisItemURI = Zotero.URI.getItemURI(this.item);
    const clearAll = itemURIs.includes(thisItemURI);
    // const itemURIs= Relations.mapOpenPdf(openPdfs).map(a=>getItem(a.annotationKey)).map(a=>Zotero.URI.getItemURI(a))
    const annotation = this.item;
    const linkRelations = this.getLinkRelations();
    ztoolkit.log("removeRelations", linkRelations, itemURIs, clearAll);
    const needRemove = clearAll ? linkRelations : itemURIs.filter((f) => linkRelations.includes(f));
    needRemove.forEach((f) => {
      annotation.removeRelation(Relations.RelationsPredicate, f);
    });
    annotation.saveTx();
    this.setRelationsTag();

    needRemove.forEach((f) => {
      const id = Zotero.URI.getURIItemID(f);
      if (id) {
        const item = getItem(id);
        if (!item) return ``;
        const r = new Relations(item);
        r.removeRelations([thisItemURI]);
      }
    });

    // this.item = getItem(this.item.key);
  }
  // addRelations(openPdfs: string[]) {
  //   const itemURIs= Relations.mapOpenPdf(openPdfs).map(a=>getItem(a.annotationKey)).map(a=>Zotero.URI.getItemURI( a))
  addRelationsToItem(rItem: Zotero.Item) {
    this.addRelations([Zotero.URI.getItemURI(rItem)]);
  }
  addRelations(itemURIs: string[]) {
    const annotation = this.item;
    const linkRelations = this.getLinkRelations();
    const thisItemURI = Zotero.URI.getItemURI(this.item);
    const needConnect = itemURIs.filter((f) => !linkRelations.includes(f)).filter((f) => f != thisItemURI);
    needConnect.forEach((f) => {
      annotation.addRelation(Relations.RelationsPredicate, f);
    });
    annotation.saveTx();
    this.setRelationsTag();
    needConnect.forEach((f) => {
      const id = Zotero.URI.getURIItemID(f);
      if (id) {
        const item = getItem(id);
        const r = new Relations(item);
        r.addRelations([thisItemURI]);
      }
    });
  }
}
