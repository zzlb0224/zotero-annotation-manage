//@ts-nocheck 用于脚本测试
// 获取 pdf 指定页面所有文字


const reader = Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
const PDFViewerApplication =
    reader._iframeWindow.wrappedJSObject.PDFViewerApplication;
await PDFViewerApplication.pdfLoadingTask.promise;
await PDFViewerApplication.pdfViewer.pagesPromise;
const pages = PDFViewerApplication.pdfViewer._pages;
const pdfPage = pages[0].pdfPage;
const items = (await pdfPage.getTextContent()).items;