Zotero.Reader
Zotero.Reader 是 PDF 阅读器的接口，但对于阅读器中诸如选中、高亮等许多功能在 viewer.html 内，无法直接从 Zotero 中调用，相关源码在 pdf-reader 仓库。本节仅作介绍 Zotero.Reader。

源码位置：chrome/content/Zotero/xpcom/reader.js

基本使用
通过 Zotero.Reader.\_readers 访问当前的 ReaderInstance 对象，每个对象有\_iframeWindow 属性，可对其执行界面操作。

```javascript
Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
javascript;
const cont = document.getElementById(`${Zotero_Tabs.selectedID}-context`);
const box = cont.querySelector("tabbox");
box.tabs.append(tab);
box.tabpanels.append(panel);
```

调用 pdf.js 接口
ReaderInstance 对象的 \_iframeWindow 属性是阅读器的 window 对象，也就是在网页版所看到的内容，它包含了整个 pdf 阅读器的 document 对象与 wrappedJSObject 字段。

通过调用 .\_iframeWindow.wrappedJSObject 可在阅读器命名空间外访问其局部变量，其中的方法有 zoteroCopyImage 和 zoteroSaveImageAs 等。同时他包含了 PDFViewerApplication 对象.

该部分源码在 pdf-reader/src at master · Zotero/pdf-reader

```javascript
._iframeWindow.wrappedJSObject.PDFViewerApplication.pdfViewer.currentPageNumber
```

此外，通过注入脚本的方式可以直接访问 PDFViewerApplication 对象来操作阅读器：chartero | chrome/content/reader.js

案例

1. 获取 pdf 指定页面所有文字
   以第一页为例，索引为 0：

```typescript
const reader = Zotero.Reader.getByTabID(Zotero_Tabs.selectedID);
const PDFViewerApplication = reader._iframeWindow.wrappedJSObject.PDFViewerApplication;
await PDFViewerApplication.pdfLoadingTask.promise;
await PDFViewerApplication.pdfViewer.pagesPromise;
let pages = PDFViewerApplication.pdfViewer._pages;
let pdfPage = pages[0].pdfPage;
let items = (await pdfPage.getTextContent()).items;
```

这里以 item=items[0] 为例：

```json
{
  chars: Array(63) [ {…}, {…}, {…}, … ]
 dir: "ltr"
 fontName: "g_d0_f1"
 height: 6.376
 str: "Ma, Z., Hu, X., Huang, L., Bi, J., Liu, Y., 2014."
 transform: [6.376, 0, 0, 6.376, 42.5197, 732.5289]
 width: 202.367864
}
```

这里的 item.chars 记录了 item.str 的每个字符对应的渲染信息。除了宽高外，item.transform 还提供了(x=item.transform[4], y=item.transform[5])位置信息。这个位置以 pdf 页面左下角为原点。

根据 pdf 页面内的文字可以解析出所有参考文献，详见：GitHub - MuiseDestiny/Zotero-reference: Zotero 插件，侧边栏显示正在阅读文献的所有参考文献
