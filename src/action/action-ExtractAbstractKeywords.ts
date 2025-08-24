//@ts-nocheck 用于脚本测试

/**
 * Extract Abstract Keywords
 * @author Polygon
 * @link https://github.com/windingwind/zotero-actions-tags/discussions/136
 */
const ZoteroPane = require("ZoteroPane")
const window = require("window")
const console = window.console
const n = 0
await Promise.all(ZoteroPane.getSelectedItems()
    .map(async (item) => {
        if ((await item.getBestAttachmentState()).exists == false) { return }
        const pdfItem = await item.getBestAttachment()
        if (!pdfItem) { return }
        const text = (await Zotero.PDFWorker.getFullText(pdfItem.id, 2, true)).text
        const d = extractDatesFromFulltext(text)
        console.log(d)

    }))
return `Completed ${n}`



function extractDatesFromFulltext(fulltext, window = 200) {
    // 日期正则
    const datePattern = "\\d{1,2}\\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+\\d{4}";
    const fullPattern = new RegExp(`(.*?)(` + datePattern + `)`, "gi");

    // 找到 Received 的起始位置
    const startIndex = fulltext.indexOf("Received");
    if (startIndex === -1) {
        return [];  // 未找到
    }

    // 提取从 Received 开始的 window 个字符
    const snippet = fulltext.substring(startIndex, startIndex + window);

    // 匹配并提取 label 和 date
    const results = [];
    let match;
    while ((match = fullPattern.exec(snippet)) !== null) {
        const label = match[1].trim().replace(/[;:]+$/, "");
        const date = match[2];
        results.push([label, date]);
    }

    return results;
}


function extractSelectedDates(fulltext) {
    // 日期正则
    const datePattern = "\\d{1,2}\\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+\\d{4}";

    // 精确匹配五类标签
    const labelPattern = "\\b(Received(?: in revised form)?|Accepted|Published(?: online)?|Available online)";

    // 完整正则：标签 + 日期，忽略大小写
    const fullPattern = new RegExp(`${labelPattern}\\s+(${datePattern})`, "gi");

    const results = [];
    let match;
    while ((match = fullPattern.exec(fulltext)) !== null) {
        const label = match[1].trim().toLowerCase(); // 转为小写
        const date = match[2].trim();
        results.push([label, date]);
    }

    return results;
}


function extractDatesWithCustomLabels(fulltext, allowedLabels = []) {
    // 日期正则
    const datePattern = "\\d{1,2}\\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\\s+\\d{4}";

    // 构造标签模式（转成统一小写后用正则匹配）
    const labelPattern = "\\b([a-zA-Z ]+?)\\s+" + datePattern;
    const regex = new RegExp(labelPattern, "gi");

    const results = [];
    let match;

    while ((match = regex.exec(fulltext)) !== null) {
        const rawLabel = match[1].trim().toLowerCase();
        const fullDate = match[0].match(new RegExp(datePattern, "i"))?.[0];

        if (allowedLabels.map(l => l.toLowerCase()).includes(rawLabel) && fullDate) {
            results.push([rawLabel, fullDate]);
        }
    }

    return results;
}

const allowed = [
    "received",
    "received in revised form",
    "accepted"
];

console.log(extractDatesWithCustomLabels(text, allowed));


function parseDateStr(dateStr) {
    return new Date(Date.parse(dateStr));
}

function addWeekTagIfNeeded(item, receivedDateStr, acceptedDateStr) {
    const receivedDate = parseDateStr(receivedDateStr);
    const acceptedDate = parseDateStr(acceptedDateStr);

    if (isNaN(receivedDate) || isNaN(acceptedDate)) return;

    const diffDays = Math.round((acceptedDate - receivedDate) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return; // 异常：accepted早于received

    const weekNum = Math.floor(diffDays / 7) + 1; // 每7天为1周，从周1开始
    const tagName = `周${weekNum}`;

    if (!item.getTags().some(t => t.tag === tagName)) {
        item.addTag(tagName);
    }
}
