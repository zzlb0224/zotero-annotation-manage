//@ts-nocheck 用于脚本测试

export function init() {
  // 脚本在主界面、单独reader windows窗口（shift + enter在一个独立窗口中打开PDF）都有效，在PDF、epub、html文件中都有效

  const ztoolkit = Zotero.zoteroAnnotationManage.data.ztoolkit;
  //const window = require("window");
  //const console = window.console; // 获取console对象用于输出日志

  //custom highlight bar
  const customColorLabelMap = {
    //颜色，小写；label = 悬浮显示的内容；description = 直接显示的内容；colortag = 右键点击时添加的tag；
    "#aed0ff": { label: "📜无关紧要,突出显示", description: "", colortag: "" },
    "#ffffaa": { label: "✅常规笔记", description: "目的", colortag: "#目的" },
    "#ffff00": { label: "🔑普通重点", description: "背景", colortag: "#背景" },
    "#fd0006": {
      label: "🛠方法性内容,知识点",
      description: "方法",
      colortag: "#方法",
    },
    "#11843f": { label: "💎特别重要", description: "", colortag: "" },
    "#30ff04": { label: "❓看不懂,参考文献", description: "", colortag: "" },
    "#fd7b06": { label: "❗实验结果", description: "结论", colortag: "#结论" },
    "#fda8bf": { label: "👨作者重要观点", description: "", colortag: "" },
    "#1ebbff": { label: "🏧借鉴", description: "", colortag: "" },
    "#ff00ff": { label: "💡todo", description: "不足", colortag: "#不足" },
    "#ff6666": { label: "🈷️文章总结", description: "测试U", colortag: "" },
    "#c198e0": { label: "🔠翻译句式", description: "", colortag: "" },
    "#000000": { label: "黑色", description: "", colortag: "" },
  };

  const type = "renderTextSelectionPopup";
  //@ts-ignore event
  const handler = (event) => {
    const { reader, doc, params, append } = event;
    // const _annotationManager = Zotero.Reader.getByTabID(Zotero_Tabs.selectedID)._annotationManager
    const _annotationManager = reader._annotationManager;
    const selectionPopup = doc.querySelector(".view-popup.selection-popup");
    if (selectionPopup) {
      selectionPopup.style.width = "600px";
      selectionPopup.style.maxWidth = "600px";
    }
    const colorsElement = doc.querySelector(".selection-popup .colors");
    if (colorsElement) {
      colorsElement.style.flexWrap = "wrap";
    }
    const originalButton = colorsElement.querySelector("button"); // 获取容器中的第一个button元素
    console.log("清除前所有的button" + new Date().toLocaleTimeString());
    console.log(colorsElement.querySelectorAll("button"));
    console.log("重新加载111------" + new Date().toLocaleTimeString());
    colorsElement.innerHTML = ""; //清除原有的高亮颜色
    console.log("清除后后后所有的button" + new Date().toLocaleTimeString());
    console.log(colorsElement.querySelectorAll("button"));
    console.log("重新加载222------" + new Date().toLocaleTimeString());
    //如何建立新的高亮颜色
    for (const [color, info] of Object.entries(customColorLabelMap)) {
      const clonedButton = originalButton.cloneNode(true); // 使用cloneNode方法克隆button，假设我们想要连同子节点一起复制；cloneNode(true)方法确实可以克隆节点及其所有子节点，但是它不会克隆绑定到原始节点上的JavaScript属性（例如事件监听器以外的属性）。如果原始按钮有通过JavaScript动态添加的样式或属性，那么这些样式或属性不会被克隆。
      clonedButton.title = info.label; // 修改克隆出来的button的label
      clonedButton.fill = color; // 修改克隆出来的button

      clonedButton.style.width = "unset";
      clonedButton.style.height = "unset";

      //图标颜色
      //找到按钮中的原有SVG元素，从其父元素中移除它
      const oldSvg = clonedButton.querySelector("svg");
      if (oldSvg) {
        oldSvg.remove();
      }

      // 创建SVG元素
      const svg = doc.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "16");
      svg.setAttribute("height", "16");
      svg.setAttribute("viewBox", "0 0 16 16");
      svg.setAttribute("fill", "none");

      // 创建第一个path元素
      const path1 = doc.createElementNS("http://www.w3.org/2000/svg", "path");
      path1.setAttribute(
        "d",
        "M1 3C1 1.89543 1.89543 1 3 1H13C14.1046 1 15 1.89543 15 3V13C15 14.1046 14.1046 15 13 15H3C1.89543 15 1 14.1046 1 13V3Z",
      );
      path1.setAttribute("fill", color); // 这里可以动态设置颜色

      // 创建第二个path元素
      const path2 = doc.createElementNS("http://www.w3.org/2000/svg", "path");
      path2.setAttribute(
        "d",
        "M1.5 3C1.5 2.17157 2.17157 1.5 3 1.5H13C13.8284 1.5 14.5 2.17157 14.5 3V13C14.5 13.8284 13.8284 14.5 13 14.5H3C2.17157 14.5 1.5 13.8284 1.5 13V3Z",
      );
      path2.setAttribute("stroke", "black");
      path2.setAttribute("stroke-opacity", "0.1");

      // 将path元素添加到SVG中
      svg.appendChild(path1);
      svg.appendChild(path2);

      // 创建按钮元素并添加SVG
      clonedButton.appendChild(svg);

      console.log("111----------" + new Date().toLocaleTimeString());
      console.log(colorsElement.querySelectorAll("div.colorDiv"));
      console.log("++++++++++" + new Date().toLocaleTimeString());

      clonedButton.addEventListener("click", function () {
        console.log("左键被点击" + clonedButton.fill);
        // 点击左键，只添加颜色，依赖插件zotero-annotation-manage
        const newAnn = _annotationManager.addAnnotation(Components.utils.cloneInto({ ...params?.annotation, color }, doc));
      });
      clonedButton.addEventListener("contextmenu", function () {
        console.log("右键被点击");
        //点击右键，添加颜色+tag，tag来自description
        if (info.colortag) {
          const tags = [{ name: info.colortag }];
          const newAnn = _annotationManager.addAnnotation(Components.utils.cloneInto({ ...params?.annotation, color, tags }, doc));
        } else {
          const newAnn = _annotationManager.addAnnotation(Components.utils.cloneInto({ ...params?.annotation, color }, doc));
        }
      });
      // 为有description的，显示description
      if (info.description !== "") {
        console.log("333----------" + new Date().toLocaleTimeString());
        const colorDiv = Zotero.zoteroAnnotationManage.data.ztoolkit.UI.appendElement(
          {
            tag: "div",
            styles: { display: "flex", flexDirection: "column" },
            classList: ["colorDiv"],
          },
          colorsElement,
        );
        colorDiv.appendChild(clonedButton);
      } else colorsElement.appendChild(clonedButton); // 将克隆出来的button添加到容器中
      //append(colorsElement);
    }

    // 定义一个包含鼓励性、提示性emoji的数组，允许包含重复emoji，随机抽取并在highlight bar中显示
    const emojisStr =
      "🥛🧊🥤💧🔨🌌⭐✨🌍🏔️🌋🔥🛰️📡📈🤿📐🧪📏🔑🔍📌⏰🕰️❄️💎🍭🍬🎈🦧💰💌💕❤💭🎯🧭🌊💦🍉😍😘😙😚😛😜😝😻🙆🙋🤏🤐🤑🤓🤔🤗🤙🤚🤛🤜🤝🤞🤟🤡🤩🤳🤸🤹🥂🥇🥈🥉🥝🥥🥰🥳🦕🦖🦚🦜🧡👊🌟✨🙌💖🌈🚀💪🏃💨";
    // const emojisArray = Array.from(new Set(emojisStr));  // 将字符串转换为数组，每个emoji为一个元素
    const randomEmoji = emojisStr[Math.floor(Math.random() * emojisStr.length)]; // 随机选择一个emoji
    colorsElement.append(randomEmoji);

    // colorsElement容器来放置按钮
    // 将colorsElement容器添加到文档中
    append(colorsElement);
    console.log("重新加载333333------------" + new Date().toLocaleTimeString());
    console.log(colorsElement.querySelectorAll("button"));

    //---------------------------------------
    //？？？？更新组件，如果description不为空，则在bar上显示description
    //查询颜色，反向获得description
    //colorsElement.querySelectorAll("button").forEach((clonedButton, _i) => {

    colorsElement
      .querySelectorAll("button")
      // @ts-ignore 111
      .forEach((e) => {
        const color = e.querySelector("path[fill]")?.getAttribute("fill");
        if (!color) {
          return;
        }
        if (color in customColorLabelMap) {
          e.innerHTML =
            e.querySelector("div")?.outerHTML +
            // @ts-ignore 111
            customColorLabelMap[color].label +
            // @ts-ignore 111
            customColorLabelMap[color].description;
        }
      });

    console.log("333---时候-------" + new Date().toLocaleTimeString());

    console.log(colorsElement.querySelectorAll("div.colorDiv"));
    console.log("---------------++++--------------");

    //@ts-ignore event
    colorsElement.querySelectorAll("div.colorDiv").forEach((div) => {
      // 对每个 div 使用 querySelector

      const colorDiv = div; // as HTMLDivElement;
      console.log(colorDiv);

      const btn = colorDiv.querySelector("button");

      let spanColorTag =
        btn.querySelector("span.color-tag") ||
        Zotero.zoteroAnnotationManage.data.ztoolkit.UI.appendElement({ tag: "span", classList: ["color-tag"] }, colorDiv);
      spanColorTag.textContent = "哈哈哈++";

      console.log(btn);

      if (!spanColorTag) {
        spanColorTag = Zotero.zoteroAnnotationManage.data.ztoolkit.UI.appendElement({ tag: "span", classList: ["color-tag"] }, btn);
        spanColorTag.textContent = "哈哈哈++";

        const svgElement = btn.querySelector("svg");
        if (svgElement) {
          svgElement.style.minHeight = "20px";
        }

        btn.style.width = "unset";
        btn.style.height = "unset";
        btn.style.display = "flex";
        btn.style.flexDirection = "column";
      }
      spanColorTag.textContent = `+++哈哈哈哈哈`;
      //}
    });
    //});

    //------------------------------------------

    //setTimeout(() => colorsElement.replaceChildren("Translated text: " + params.annotation.text), 1000);
  };
  const pluginID = "zoterotag1@euclpts.com";

  Zotero.Reader.unregisterEventListener(type, handler);
  Zotero.Reader.registerEventListener(type, handler, pluginID);
  //"重新加载" + new Date().toLocaleTimeString();
}
