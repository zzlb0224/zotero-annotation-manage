
(async function () {


    const reader = Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
    const PDFViewerApplication = reader._iframeWindow?.wrappedJSObject.PDFViewerApplication;
    await PDFViewerApplication.pdfLoadingTask.promise;
    await PDFViewerApplication.pdfViewer.pagesPromise;
    const pages = PDFViewerApplication.pdfViewer._pages;
    const pdfPage = pages[0].pdfPage;
    const items = (await pdfPage.getTextContent()).items;
    const matchIndex = []
    const matchI = -1
    const startIndex = -1
    const endIndex = -1
    let find = { findIndex: -1, findStr: "", remainStr: "" }
    const searchStr = "and"
    for (let index = 0; index < items.length; index++) {
        const element = items[index];
        const str = element.str as string;

        if (find && find.findIndex > -1) {
            find = findStartIndex(str, find.remainStr)
        }

        let sIndex = str.indexOf(searchStr)
        while (sIndex > -1) {
            const eIndex = sIndex + searchStr.length
            if (sIndex > -1) {
                matchIndex.push([sIndex, eIndex])
            }
            sIndex = str.indexOf(searchStr, eIndex)
        }
        find = findStartIndex(str, searchStr)
    }
})(

)

const str1 = "hello world";
const str2 = "world ok";
function findStartIndex(str1 = "", str2 = "") {
    for (let findIndex = 0; findIndex < str1.length; findIndex++) {
        const findStr = str1.substring(findIndex)
        console.log(findIndex, str1, str2, findStr)
        if (str2.startsWith(findStr)) {
            const remainStr = str2.substring(findStr.length)
            return { findIndex, findStr, remainStr }
        }
    }
    return { findIndex: -1, findStr: "", remainStr: str2 }
}
console.log(findStartIndex("hello", "low"))