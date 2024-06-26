import { getPref, getPrefAs, setPref } from "../utils/prefs";
import {
  mapDateModified,
  sortAsc,
  sortFixed,
  sortFixedTags100Modified10Asc,
  sortFixedTags10ValuesLength,
  sortValuesLength,
  sortFixedTags1000Ann100Modified10Asc,
  sortByFixedTag2TagName,
  sortFixedTags10Asc,
  sortFixedTags10AscByKey,
} from "../utils/sort";
import {
  groupBy,
  groupByResult,
  groupByResultIncludeFixedTags,
  isDebug,
  memAllTagsDB,
  memFixedColor,
  memFixedTags,
  memRelateTags,
  str2RegExps,
} from "../utils/zzlb";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { getString } from "../utils/locale";
import { useImmer } from "use-immer";
import { ArrowContainer, Popover, PopoverPosition, PopoverState, usePopover } from "react-tiny-popover";
import { ChangeColor } from "./ChangeColor";
import { saveAnnotationTags } from "../modules/AnnotationPopup";
import { type } from "os";
import { config } from "process";
import TagPopup from "./TagPopup";
const ConfigTabArray = ["面板配置", "固定位置", "弹出框", "颜色栏", "标签样式", "标签设置", "待开发"] as const;
export type ConfigTab = (typeof ConfigTabArray)[number];

const SortTypeArray = ["最近使用", "本条目+最近使用", "使用次数", "字母顺序"] as const;
export type SortType = (typeof SortTypeArray)[number];
const ConfigTypeArray = ["草绿", "菊黄", "虾红"] as const;
export type ConfigType = (typeof ConfigTypeArray)[number];

export function PopupRoot({
  reader,
  params,
  doc,
  root,
  maxWidth,
}: {
  reader: _ZoteroTypes.ReaderInstance;
  params: {
    annotation?: _ZoteroTypes.Annotations.AnnotationJson;
    ids?: any;
    currentID?: string;
    x?: number;
    y?: number;
  };
  doc: Document;
  root: HTMLDivElement;
  maxWidth: number;
}) {
  const item = reader._item;
  const _annotationManager = reader._annotationManager;
  ztoolkit.log("params", params);
  const [isShowConfig, setShowConfig] = useState(getPrefAs("show-config", false));
  const [configTab, setConfigTab] = useState<ConfigTab>(getPrefAs("configTab", "面板配置"));
  const [isShowSelectedPopupColorsTag, setShowSelectedPopupColorsTag] = useState(getPrefAs("show-selected-popup-colors-tag", false));
  const [isShowSelectedPopupMatchTag, setShowSelectedPopupMatchTag] = useState(getPrefAs("show-selected-popup-match-tag", false));
  const [divMaxWidth, setDivMaxWidth] = useState(getPrefAs("divMaxWidth", 600));
  const [divMaxHeight, setDivMaxHeight] = useState(getPrefAs("divMaxHeight", 600));

  const [fontSize, setFontSize] = useState(getPrefAs("fontSize", 17));
  const [lineHeight, setLineHeight] = useState(getPrefAs("lineHeight", "1.45"));

  const [buttonMarginTopBottom, setButtonMarginTopBottom] = useState(getPrefAs("buttonMarginTopBottom", 0));
  const [sortType, setSortType] = useState<SortType>(getPrefAs("sortType", "最近使用"));
  const [buttonMarginLeftRight, setButtonMarginLeftRight] = useState(getPrefAs("buttonMarginLeftRight", 0));
  const [buttonPaddingTopBottom, setButtonPaddingTopBottom] = useState(getPrefAs("buttonPaddingTopBottom", 0));
  const [buttonPaddingLeftRight, setButtonPaddingLeftRight] = useState(getPrefAs("buttonPaddingLeftRight", 0));
  const [buttonBorderRadius, setButtonBorderRadius] = useState(getPrefAs("buttonBorderRadius", 5));
  const [relateItemShowAll, setRelateItemShowAll] = useState(getPrefAs("relateItemShowAll", false));
  const [relateItemShowRelateTags, setRelateItemShowRelateTags] = useState(getPrefAs("relateItemShowRelateTags", false));
  // const [relateItemSort, setRelateItemSort] = useState(getPrefAs("relateItemSort", "2"));

  const [existAnnotations, updateExistAnnotations] = useImmer([] as Zotero.Item[]);

  const [existTags, updateExistTags] = useImmer([] as string[]);

  const [delTags, updateDelTags] = useImmer([] as string[]);

  const [displayTags, updateDisplayTags] = useImmer([] as { key: string; values: { tag: string }[]; color?: string }[]);
  const [searchTag, setSearchTag] = useState("");
  const [currentPosition, setCurrentPosition] = useState(ZoteroPane.getSelectedCollection()?.name || "我的文库");
  const [searchResultLength, setSearchResultLength] = useState(0);
  const [showTagsLength, setShowTagsLength] = useState(getPrefAs("showTagsLength", 20));

  const [relateTags, setRelateTags] = useState(
    [] as {
      key: string;
      values: { tag: string; type: number; dateModified: string }[];
    }[],
  );

  useEffect(() => {
    async function loadData() {
      if (params.ids) {
        const ea = item.getAnnotations().filter((f) => params.ids.includes(f.key));
        updateExistAnnotations((_a) => ea);
        const ta = ea.flatMap((f) => f.getTags()).map((a) => a.tag);
        updateExistTags((_a) => ta);
      }

      let relateTags: groupByResult<{
        tag: string;
        type: number;
        dateModified: string;
      }>[] = [];
      // root.style.width=this.getSelectTextWidth()+"px"
      if (relateItemShowAll) {
        relateTags = await memAllTagsDB();
      } else {
        relateTags = groupBy(memRelateTags(item), (t10) => t10.tag);
      }

      const tagsExclude = (getPref("tags-exclude") as string) || "";
      if (tagsExclude) {
        const rs = str2RegExps(tagsExclude);
        if (rs.length > 0) relateTags = relateTags.filter((f) => !rs.some((s) => s.test(f.key)));
      }

      // if (relateItemShowRelateTags)
      groupByResultIncludeFixedTags(relateTags);
      if (sortType == "最近使用") {
        //2 固定标签 + 最近使用时间
        relateTags = relateTags.map(mapDateModified).sort(sortFixedTags100Modified10Asc);
      } else if (sortType == "字母顺序") {
        relateTags = relateTags.sort(sortFixedTags10AscByKey);
      } else if (sortType == "使用次数") {
        relateTags = relateTags.sort(sortFixedTags10ValuesLength);
      } else if (sortType == "本条目+最近使用") {
        //3 固定标签 + 本条目 + 修改时间
        const itemAnnTags = item
          ?.getAnnotations()
          .flatMap((f) => f.getTags())
          .map((a) => a.tag)
          .filter((t) => !memFixedTags().includes(t))
          .sort(sortAsc);
        relateTags = relateTags.map(mapDateModified).sort(sortFixedTags1000Ann100Modified10Asc(itemAnnTags));
      }
      setRelateTags(relateTags);
    }
    loadData();
  }, [relateItemShowAll, relateItemShowRelateTags, sortType]);
  function excludeTags(
    from: groupByResult<{
      tag: string;
      type: number;
    }>[],
  ) {
    const tagsExclude = (getPref("tags-exclude") as string) || "";
    const rs = str2RegExps(tagsExclude);
    return from.filter((f) => !rs.some((s) => s.test(f.key)));
  }
  useEffect(() => {
    async function search() {
      let searchResult = relateTags;
      if (searchTag) {
        const searchIn = await memAllTagsDB();
        if (searchTag.match(/^\s*$/g)) {
          searchResult = searchIn;
          setCurrentPosition("我的文库");
        } else {
          searchResult = searchIn.filter((f) => new RegExp(searchTag, "i").test(f.key));

          setCurrentPosition("搜索中");
        }
      } else {
        setCurrentPosition(ZoteroPane.getSelectedCollection()?.name || "我的文库");
      }
      setSearchResultLength(searchResult.length);
      updateDisplayTags(searchResult.slice(0, showTagsLength).map((a) => Object.assign({}, a, { color: memFixedColor(a.key, "") })));
      // setIsPopoverOpen(true)
      // forceRerender()
      //要出发弹出窗口重绘是不是有更简单的办法

      //触发 useLayoutEffect()
      ztoolkit.log(
        "getBoundingClientRect2",
        popRef.current?.getBoundingClientRect(),
        popMaxWidthRef.current?.getBoundingClientRect(),
        boundaryElement.getBoundingClientRect(),
      );
    }
    search();
  }, [searchTag, relateTags, showTagsLength, sortType]);

  // ztoolkit.log("ids", params.ids)
  const [autoCloseSeconds, setAutoCloseSeconds] = useState(params.ids ? getPrefAs("autoCloseSeconds", 15) : -1); //只在倒计时时间
  const timeRef = useRef<NodeJS.Timeout>(); //设置延时器

  //倒计时
  useEffect(() => {
    //如果设置倒计时且倒计时不为0
    if (autoCloseSeconds > 0) {
      timeRef.current = setTimeout(() => {
        setAutoCloseSeconds((time) => time - 1);
      }, 1000);
    }
    if (autoCloseSeconds == 0) {
      root.remove();
      setIsPopoverOpen(false);
    }
    return () => {
      clearTimeout(timeRef.current);
    };
  }, [autoCloseSeconds]);

  const tagStyle = {
    marginLeft: buttonMarginLeftRight + "px",
    marginRight: buttonMarginLeftRight + "px",
    marginTop: buttonMarginTopBottom + "px",
    marginBottom: buttonMarginTopBottom + "px",
    paddingLeft: buttonPaddingLeftRight + "px",
    paddingRight: buttonPaddingLeftRight + "px",
    paddingTop: buttonPaddingTopBottom + "px",
    paddingBottom: buttonPaddingTopBottom + "px",
    borderRadius: buttonBorderRadius + "px",
    fontSize: fontSize + "px",
    lineHeight: lineHeight,
  };
  const configItemStyle = { display: "inline-block", margin: "0 5px" };
  function inputWidth(searchTag: string) {
    return {
      width: `${Math.min(searchTag.length + (searchTag.match(/[\u4E00-\u9FA5]/g) || "").length + 3)}ch`,
      minWidth: "3ch",
      maxWidth: "100%",
    };
  }

  function handleInput<T>(prefName: string, setStateFunc: (value: React.SetStateAction<T>) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setPref(prefName, e.target.value);
      setStateFunc(e.target.value as T);
    };
  }

  function handleInputNumber(prefName: string, setStateFunc: (value: React.SetStateAction<number>) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) {
        setPref(prefName, e.target.valueAsNumber);
        setStateFunc(e.target.valueAsNumber);
      }
    };
  }
  const [isPopoverOpen, setIsPopoverOpen] = useState(true);
  // const parentElement = doc.firstChild as HTMLElement;
  ztoolkit.log(doc, reader);
  const tabDiv = Zotero_Tabs.deck.querySelector("#" + Zotero_Tabs.selectedID) as HTMLDivElement;
  const [bgColor, setBgColor] = useState(getPrefAs("bgColor", "#fff"));
  const sp = (tabDiv.querySelector("browser") as HTMLIFrameElement).contentDocument?.querySelector("#reader-ui ") as HTMLDivElement;
  useEffect(() => {
    const q = (
      (tabDiv.querySelector("browser") as HTMLIFrameElement)?.contentDocument?.querySelector("#primary-view iframe") as HTMLIFrameElement
    )?.contentDocument?.querySelector("#viewerContainer") as HTMLDivElement;
    if (q) {
      q.addEventListener("scroll", (e) => {
        // ztoolkit.log("scroll", e)
        // setPPading2()
      });
    }

    ztoolkit.log("scroll ???", q);
  }, []);

  function setPPading2() {
    setPPadding((pPadding) => pPadding - 0.0001);
    setTimeout(() => {
      setPPadding((pPadding) => pPadding + 0.0001);
    }, 100);
    // setPPadding((pPadding) => pPadding == Math.round(pPadding) ? pPadding + 0.0001 : Math.round(pPadding));
  }
  // const react_popover_root = tabDiv.querySelector(".react_popover_root") as HTMLDivElement || ztoolkit.UI.appendElement({
  //   tag: "div",
  //   styles: { width: "calc(100% - 80px)", height: "calc(100% - 100px)", position: "fixed", left: "40px", top: "80px", zIndex: "0", background: "transparent", border: "1px solid black" },
  //   classList: ["react_popover_root"],
  // }, tabDiv)
  //@ts-ignore aaaa
  const a = (tabDiv.querySelector(".reader") as HTMLIFrameElement).contentDocument.querySelector(
    "#split-view #primary-view",
  ) as HTMLDivElement;

  const parentElement = tabDiv;
  const boundaryElement = tabDiv;
  if (isDebug()) boundaryElement.style.border = "1px solid red";
  // const c = ztoolkit.UI.appendElement({ tag: "div" }, root) as HTMLDivElement
  useEffect(() => {
    if (params.ids) return;
    const MutationObserver = ztoolkit.getGlobal("MutationObserver");
    const observer = new MutationObserver((mutations: any) => {
      for (const mutation of mutations) {
        // ztoolkit.log("fffff", mutation);
        for (const rn of mutation.removedNodes) {
          if ((rn as HTMLDivElement).classList.contains("selection-popup")) {
            setIsPopoverOpen(false);
          }
        }
      }
    });
    observer.observe(sp, { childList: true, subtree: true });
    // ztoolkit.log("fffff sp", sp)
    return () => {
      observer.disconnect();
    };
  }, []);
  const [pPadding, setPPadding] = useState(getPrefAs("pPadding", 0));
  const [pBoundaryInset, setPBoundaryInset] = useState(getPrefAs("pBoundaryInset", 40));
  const [pArrowSize, setPArrowSize] = useState(getPrefAs("pArrowSize", 0));
  const [pPositions, updatePPositions] = useImmer(getPrefAs("pPositions", "bottom,left,top,right").split(",") as PopoverPosition[]);
  const [pFixedContentLocation, setPFixedContentLocation] = useState(getPrefAs("pFixedContentLocation", false));
  const [pFixedContentLocationLeft, setPFixedContentLocationLeft] = useState(getPrefAs("pFixedContentLocationLeft", 0));
  const [pFixedContentLocationTop, setPFixedContentLocationTop] = useState(getPrefAs("pFixedContentLocationTop", 0));
  const [isShowBgColor, setIsShowBgColor] = useState(false);
  const selectionPopup = (tabDiv.querySelector("browser") as HTMLIFrameElement).contentDocument?.querySelector(
    "#reader-ui .selection-popup",
  ) as HTMLDivElement;
  const selectionPopupRef = useRef(selectionPopup);
  // const popSize = useSize(selectionPopup)
  const [selectionPopupSize, setSelectionPopupSize] = useState({
    width: 0,
    height: 0,
  });
  useEffect(() => {
    if (params.ids) return;
    const ResizeObserver = ztoolkit.getGlobal("ResizeObserver");
    const resizeObserver = new ResizeObserver((_entries: any) => {
      setSelectionPopupSize({
        width: selectionPopup.clientWidth,
        height: selectionPopup.clientHeight,
      });
    });
    resizeObserver.observe(selectionPopup);
    setSelectionPopupSize({
      width: selectionPopup.clientWidth,
      height: selectionPopup.clientHeight,
    });

    return () => resizeObserver.disconnect();
  }, []);

  //加载默认值
  useEffect(() => {
    setPBoundaryInset(getPrefAs("pBoundaryInset", 40));
  }, []);

  const popMaxWidthRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const c = popMaxWidthRef.current;
    if (!c) return;
    // c.style.maxWidth = "unset"
    // c.style.width = "600px";
    function updatePopupSize(): void {
      if (!c) return;
      const viewer = tabDiv;
      const rootHeight = c.scrollHeight;
      const rootWidth = c.scrollWidth;
      if (rootHeight / rootWidth > 2) {
        //
      } else if (rootHeight / rootWidth < 0.5) {
        //
      } else {
        //
      }
      // const newWidth = rootWidth + 20;
      // Check until H/W<0.75 and don't overflow viewer border
      // if (
      //   // textHeight / rootWidth > 0.75 &&
      //   // selectionMenu.offsetLeft + newWidth < viewer.offsetWidth
      // ) {
      //   // Update width
      //   // textarea.style.width = `${newWidth}px`;
      //   // updatePopupSize(selectionMenu, textarea, false);
      //   return;
      // }
      // root.style.height = `${rootHeight + 3}px`;
    }

    updatePopupSize();
  }, [selectionPopupSize]);
  useEffect(() => {
    // setPBoundaryInset((pBoundaryInset) => pBoundaryInset);
    ztoolkit.log(
      "getBoundingClientRect",
      popRef.current?.getBoundingClientRect(),
      popMaxWidthRef.current?.getBoundingClientRect(),
      boundaryElement.getBoundingClientRect(),
    );
  }, [displayTags]);
  const popRef = useRef<HTMLDivElement>(null);
  const divRef = useRef<HTMLDivElement>(null);

  function loadDefault(configType: ConfigType) {
    let config: Config;
    if (configType == "草绿") {
      return (config = {
        configName: configType,
        bgColor: "#5ad354",
        divMaxWidth: 550,
        autoCloseSeconds: 15,
        pFixedContentLocation: false,
        pFixedContentLocationLeft: 100,
        pFixedContentLocationTop: 100,
        pPadding: 5,
        pBoundaryInset: 40,
        pArrowSize: 4,
        pPositions: "left,right,top,bottom",
        isShowSelectedPopupColorsTag: false,
        isShowSelectedPopupMatchTag: true,
        showTagsLength: 25,
        fontSize: 18,
        lineHeight: "0.8",
        buttonMarginTopBottom: 4,
        buttonMarginLeftRight: 2,
        buttonPaddingTopBottom: 3,
        buttonPaddingLeftRight: 3,
        buttonBorderRadius: 5,
        sortType: "最近使用",
      });
    }
    if (configType == "菊黄") {
      return (config = {
        configName: configType,
        bgColor: "#cfb50a",
        divMaxWidth: 600,
        autoCloseSeconds: 16,
        pFixedContentLocation: false,
        pFixedContentLocationLeft: 150,
        pFixedContentLocationTop: 150,
        pPadding: 5,
        pBoundaryInset: 40,
        pArrowSize: 4,
        pPositions: "left,right,top,bottom",
        isShowSelectedPopupColorsTag: false,
        isShowSelectedPopupMatchTag: true,
        showTagsLength: 25,
        fontSize: 18,
        lineHeight: "0.8",
        buttonMarginTopBottom: 4,
        buttonMarginLeftRight: 2,
        buttonPaddingTopBottom: 3,
        buttonPaddingLeftRight: 3,
        buttonBorderRadius: 5,
        sortType: "最近使用",
      });
    }
    if (configType == "虾红") {
      return (config = {
        configName: configType,
        bgColor: "#c66087",
        divMaxWidth: 450,
        autoCloseSeconds: 17,
        pFixedContentLocation: false,
        pFixedContentLocationLeft: 150,
        pFixedContentLocationTop: 150,
        pPadding: 5,
        pBoundaryInset: 40,
        pArrowSize: 4,
        pPositions: "left,right,bottom,top",
        isShowSelectedPopupColorsTag: false,
        isShowSelectedPopupMatchTag: true,
        showTagsLength: 10,
        fontSize: 18,
        lineHeight: "0.8",
        buttonMarginTopBottom: 4,
        buttonMarginLeftRight: 2,
        buttonPaddingTopBottom: 3,
        buttonPaddingLeftRight: 3,
        buttonBorderRadius: 10.5,
        sortType: "最近使用",
      });
    }
  }
  interface Config {
    configName: string;
    bgColor: string;
    divMaxWidth: number;
    autoCloseSeconds: number;
    pFixedContentLocation: boolean;
    pFixedContentLocationLeft: number;
    pFixedContentLocationTop: number;
    pPadding: number;
    pBoundaryInset: number;
    pArrowSize: number;
    pPositions: string;
    isShowSelectedPopupColorsTag: boolean;
    isShowSelectedPopupMatchTag: boolean;
    showTagsLength: number;
    fontSize: number;
    lineHeight: string;
    buttonMarginTopBottom: number;
    buttonMarginLeftRight: number;
    buttonPaddingTopBottom: number;
    buttonPaddingLeftRight: number;
    buttonBorderRadius: number;
    sortType: SortType;
  }
  const [configName, setConfigName] = useState(getPref("configName"));
  function selectConfig(config: Config) {
    setShowConfig(false);
    setConfigName(config.configName);
    setPref("configName", config.configName);
    setBgColor(config.bgColor);
    setPref("bgColor", config.bgColor);
    setDivMaxWidth(config.divMaxWidth);
    setPref("divMaxWidth", config.divMaxWidth);
    setAutoCloseSeconds(config.autoCloseSeconds);
    setPref("autoCloseSeconds", config.autoCloseSeconds);
    setPFixedContentLocation(config.pFixedContentLocation);
    setPref("pFixedContentLocation", config.pFixedContentLocation);
    setPFixedContentLocationLeft(config.pFixedContentLocationLeft);
    setPref("pFixedContentLocationLeft", config.pFixedContentLocationLeft);
    setPFixedContentLocationTop(config.pFixedContentLocationTop);
    setPref("pFixedContentLocationTop", config.pFixedContentLocationTop);

    setPBoundaryInset(config.pBoundaryInset);
    setPref("pBoundaryInset", config.pBoundaryInset);

    setPArrowSize(config.pArrowSize);
    setPref("pArrowSize", config.pArrowSize);

    updatePPositions((pPositions) => config.pPositions);
    setPref("pPositions", config.pPositions);

    setShowSelectedPopupColorsTag(config.isShowSelectedPopupColorsTag);
    setPref("isShowSelectedPopupColorsTag", config.isShowSelectedPopupColorsTag);

    setShowSelectedPopupMatchTag(config.isShowSelectedPopupMatchTag);
    setPref("isShowSelectedPopupMatchTag", config.isShowSelectedPopupMatchTag);

    setShowTagsLength(config.showTagsLength);
    setPref("showTagsLength", config.showTagsLength);

    setFontSize(config.fontSize);
    setPref("fontSize", config.fontSize);

    setLineHeight(config.lineHeight);
    setPref("lineHeight", config.lineHeight);

    setButtonMarginTopBottom(config.buttonMarginTopBottom);
    setPref("buttonMarginTopBottom", config.buttonMarginTopBottom);

    setButtonMarginLeftRight(config.buttonMarginLeftRight);
    setPref("buttonMarginLeftRight", config.buttonMarginLeftRight);

    setButtonPaddingTopBottom(config.buttonPaddingTopBottom);
    setPref("buttonPaddingTopBottom", config.buttonPaddingTopBottom);

    setButtonPaddingLeftRight(config.buttonPaddingLeftRight);
    setPref("buttonPaddingLeftRight", config.buttonPaddingLeftRight);

    setButtonBorderRadius(config.buttonBorderRadius);
    setPref("buttonBorderRadius", config.buttonBorderRadius);

    setSortType(config.sortType);
    setPref("sortType", config.sortType);

    setTimeout(() => setShowConfig(true));
  }

  const handleContent = React.useCallback(
    (popoverState: PopoverState) => (
      <ArrowContainer // if you'd like an arrow, you can import the ArrowContainer!
        {...popoverState}
        // position={popoverState.position}
        // childRect={popoverState.childRect}
        // popoverRect={popoverState.popoverRect}
        arrowColor={"#aaaaaa"}
        arrowSize={pArrowSize}
        arrowStyle={{
          opacity: 0.9,
          marginTop: "42px",
        }}
      >
        <div
          ref={popMaxWidthRef}
          style={{
            maxWidth: divMaxWidth + "px",
            maxHeight: divMaxHeight + "px",
            overflowY: "scroll",
            background: "#f00",
          }}
        >
          <div
            style={{
              // marginTop: pFixedContentLocation || params.ids ? pFixedContentLocationTop + "px" : "unset",
              backgroundColor: bgColor,
              opacity: 1,
              whiteSpace: "break-spaces",
              display: "flex",
              flexWrap: "wrap",
              // maxWidth: Math.max(600, maxWidth) + "px",
              // width: "600px",

              // width: divMaxWidth + "px",
              // minHeight: divMaxHeight + "px",
              // overflowY: "scroll",
            }}
            // onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            onClick={() => setAutoCloseSeconds(-1)}
          >
            {isShowConfig && (
              <div
                style={{
                  margin: "5px",
                  fontSize: "18px",
                  lineHeight: "1.5",
                  background: "#ddd",
                  width: "100%",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap" }}>
                  {ConfigTabArray.map((a) => (
                    <span
                      style={{
                        margin: "0px",
                        padding: "0 5px",
                        borderRadius: "8px 8px 3px 3px",
                        borderBottom: "1px solid black",
                        borderLeft: a !== configTab ? "1px solid black" : "",
                        borderRight: a !== configTab ? "1px solid black" : "",
                        borderTop: a == configTab ? "1px solid black" : "",
                        background: a == configTab ? "#faa" : "",
                      }}
                      onClick={() => {
                        setPref("configTab", a);
                        setConfigTab(a);
                      }}
                    >
                      {a}
                    </span>
                  ))}
                </div>

                {"面板配置" == configTab && (
                  <>
                    <span style={configItemStyle}>
                      <ChangeColor
                        color={bgColor}
                        onChange={(e) => {
                          setBgColor(e);
                          setPref("bgColor", e);
                        }}
                      >
                        <span>调整背景颜色: </span>
                        <span
                          style={{
                            background: bgColor,
                            minWidth: "30px",
                            display: "inline-block",
                          }}
                        >
                          {" "}
                        </span>
                      </ChangeColor>
                    </span>
                    <span style={configItemStyle}>
                      面板最大宽度:
                      <input
                        type="number"
                        min={100}
                        max={1200}
                        step={10}
                        defaultValue={divMaxWidth}
                        style={inputWidth("zlb")}
                        onInput={(e) => {
                          if (e.currentTarget.value) {
                            setPref("divMaxWidth", e.currentTarget.valueAsNumber);
                            setDivMaxWidth(e.currentTarget.valueAsNumber);
                          }
                        }}
                      />
                      px。
                      <span style={configItemStyle}>
                        面板最大高度:
                        <input
                          type="number"
                          min={30}
                          max={600}
                          step={10}
                          defaultValue={divMaxHeight}
                          style={inputWidth("zlb")}
                          onInput={(e) => {
                            if (e.currentTarget.value) {
                              setPref("divMaxHeight", e.currentTarget.valueAsNumber);
                              setDivMaxHeight(e.currentTarget.valueAsNumber);
                            }
                          }}
                        />
                        px。
                      </span>
                    </span>
                    <span style={configItemStyle}>
                      <input
                        style={inputWidth("zlb")}
                        type="number"
                        min={5}
                        max={100}
                        defaultValue={getPrefAs("autoCloseSeconds", 15)}
                        onInput={(e) => {
                          if (e.currentTarget.value) {
                            setAutoCloseSeconds(e.currentTarget.valueAsNumber);
                            setPref("autoCloseSeconds", e.currentTarget.valueAsNumber);
                          }
                        }}
                      />
                      秒后自动关闭。
                    </span>
                    {/* <span>当前配置：{configName}</span> */}

                    <span style={configItemStyle}>
                      {ConfigTypeArray.map((a) => loadDefault(a)).map(
                        (config) =>
                          config && (
                            <span
                              style={{
                                ...tagStyle,
                                background: config.bgColor,
                                fontWeight: configName == config.configName ? "bold" : "",
                                border: configName == config.configName ? "1px solid #000" : "",
                              }}
                              onClick={() => {
                                selectConfig(config);
                              }}
                            >
                              {config.configName}
                            </span>
                          ),
                      )}{" "}
                    </span>
                  </>
                )}
                {"固定位置" == configTab && (
                  <div>
                    <label>
                      <input
                        type="checkbox"
                        defaultChecked={pFixedContentLocation}
                        onChange={(e) => {
                          setPFixedContentLocation(e.currentTarget.checked);
                          setPref("pFixedContentLocation", e.currentTarget.checked);
                        }}
                      />
                      固定弹出区域
                    </label>

                    <span style={configItemStyle}>
                      left:
                      <input
                        type="number"
                        min={0}
                        step={10}
                        max={500}
                        style={inputWidth("zlb")}
                        defaultValue={pFixedContentLocationLeft}
                        onInput={(e) => {
                          if (e.currentTarget.value) {
                            setPref("pFixedContentLocationLeft", e.currentTarget.value);
                            setPFixedContentLocationLeft(e.currentTarget.valueAsNumber);
                          }
                        }}
                      />
                    </span>
                    <span style={configItemStyle}>
                      top:
                      <input
                        type="number"
                        min={0}
                        step={10}
                        max={1000}
                        style={inputWidth("zzlb")}
                        defaultValue={pFixedContentLocationTop}
                        onInput={(e) => {
                          if (e.currentTarget.value) {
                            setPFixedContentLocationTop(e.currentTarget.valueAsNumber);
                          }
                        }}
                      />
                    </span>
                  </div>
                )}
                {"弹出框" == configTab && (
                  <div
                    style={{
                      fontSize: "18px",
                      lineHeight: "1.5",
                    }}
                  >
                    <>
                      <label style={configItemStyle}>
                        <input
                          type="checkbox"
                          defaultChecked={!pFixedContentLocation}
                          onChange={(e) => {
                            setPFixedContentLocation(!e.currentTarget.checked);
                            setPref("pFixedContentLocation", !e.currentTarget.checked);
                          }}
                        />
                        浮动弹出区域。
                      </label>
                      <span style={configItemStyle}>
                        和颜色框的距离:
                        <input
                          type="number"
                          min={0}
                          step={1}
                          max={200}
                          style={inputWidth("zlb")}
                          defaultValue={Math.round(pPadding)}
                          onInput={(e) => {
                            if (e.currentTarget.value) {
                              setPref("pPadding", e.currentTarget.value);
                              setPPadding(e.currentTarget.valueAsNumber);
                            }
                          }}
                        />
                      </span>
                      <span style={configItemStyle}>
                        边缘检测距离:
                        <input
                          type="number"
                          min={40}
                          step={1}
                          max={200}
                          style={inputWidth("zlb")}
                          defaultValue={pBoundaryInset}
                          onInput={(e) => {
                            if (e.currentTarget.value) {
                              setPref("pBoundaryInset", e.currentTarget.value);
                              setPBoundaryInset(e.currentTarget.valueAsNumber);
                            }
                          }}
                        />
                      </span>
                      <span style={configItemStyle}>
                        三角大小:
                        <input
                          type="number"
                          min={0}
                          step={1}
                          max={200}
                          style={inputWidth("zlb")}
                          defaultValue={pArrowSize}
                          onInput={(e) => {
                            if (e.currentTarget.value) {
                              setPref("pArrowSize", e.currentTarget.value);
                              setPArrowSize(e.currentTarget.valueAsNumber);
                            }
                          }}
                        />{" "}
                      </span>
                      <span style={configItemStyle}>
                        优先默认位置:
                        {("bottom,left,top,right".split(",") as PopoverPosition[]).sort(sortFixed(pPositions)).map((a, i) => (
                          <span key={a} style={configItemStyle}>
                            [
                            {i > 0 && i < pPositions.length && (
                              <span
                                onClick={() => {
                                  updatePPositions((pPositions) => {
                                    pPositions.splice(i - 1, 0, ...pPositions.splice(i, 1));
                                    setPref("pPositions", pPositions.join(","));
                                  });
                                }}
                              >
                                ⬅️
                              </span>
                            )}
                            <label style={{ margin: "0 2px" }}>
                              <input
                                type="checkbox"
                                defaultChecked={pPositions.includes(a)}
                                onChange={(_e) => {
                                  updatePPositions((pPositions) => {
                                    const index = pPositions.findIndex((f) => f == a);
                                    if (index > -1) pPositions.splice(i, 1);
                                    else pPositions.push(a);
                                    setPref("pPositions", pPositions.join(","));
                                  });
                                }}
                              />
                              {a}
                            </label>
                            {i < pPositions.length - 1 && (
                              <span
                                onClick={() => {
                                  updatePPositions((pPositions) => {
                                    pPositions.splice(i + 1, 0, ...pPositions.splice(i, 1));
                                    setPref("pPositions", pPositions.join(","));
                                  });
                                }}
                              >
                                ➡️
                              </span>
                            )}
                            ]
                          </span>
                        ))}
                      </span>
                    </>
                  </div>
                )}

                {"颜色栏" == configTab && (
                  <span>
                    <label style={configItemStyle}>
                      <input
                        type="checkbox"
                        defaultChecked={isShowSelectedPopupColorsTag}
                        onInput={(e) => {
                          setPref("show-selected-popup-colors-tag", e.currentTarget.checked);
                          setShowSelectedPopupColorsTag(e.currentTarget.checked);
                        }}
                      />
                      {getString("pref-show-selected-popup-colors-tag", {
                        branch: "label",
                      })}
                    </label>
                    <label style={configItemStyle}>
                      <input
                        type="checkbox"
                        defaultChecked={isShowSelectedPopupMatchTag}
                        onInput={(e) => {
                          setPref("show-selected-popup-match-tag", e.currentTarget.checked);
                          setShowSelectedPopupMatchTag(e.currentTarget.checked);
                        }}
                      />
                      {getString("pref-show-selected-popup-match-tag", {
                        branch: "label",
                      })}
                    </label>
                    <br />
                  </span>
                )}
                {"标签样式" == configTab && (
                  <>
                    <span style={configItemStyle}>
                      显示
                      <input
                        type="number"
                        defaultValue={showTagsLength}
                        min={0}
                        max={100}
                        style={inputWidth("lb")}
                        onInput={(e) => {
                          setPref("showTagsLength", e.currentTarget.value);
                          setShowTagsLength(e.currentTarget.valueAsNumber);
                        }}
                      />
                      个。
                    </span>
                    <span style={configItemStyle}>
                      字体大小:
                      <input
                        type="number"
                        min={6}
                        max={72}
                        step={0.5}
                        defaultValue={fontSize}
                        style={inputWidth("lb")}
                        onInput={(e) => {
                          if (e.currentTarget.value) {
                            setPref("fontSize", e.currentTarget.valueAsNumber);
                            setFontSize(e.currentTarget.valueAsNumber);
                          }
                        }}
                      />
                      px。
                    </span>
                    <span style={configItemStyle}>
                      行高:
                      <input
                        type="number"
                        defaultValue={lineHeight}
                        min={0.1}
                        max={3}
                        step={0.1}
                        style={inputWidth("lb")}
                        onInput={(e) => {
                          setPref("lineHeight", e.currentTarget.value);
                          setLineHeight(e.currentTarget.value);
                        }}
                      />{" "}
                    </span>
                    <span style={configItemStyle}>
                      margin:
                      <input
                        type="number"
                        min={-10}
                        max={200}
                        step={0.5}
                        defaultValue={buttonMarginTopBottom}
                        style={inputWidth("lb")}
                        onInput={(e) => {
                          if (e.currentTarget.value) {
                            setPref("buttonMarginTopBottom", e.currentTarget.valueAsNumber);
                            setButtonMarginTopBottom(e.currentTarget.valueAsNumber);
                          }
                        }}
                      />
                      <input
                        type="number"
                        min={-10}
                        max={200}
                        step={0.5}
                        defaultValue={buttonMarginLeftRight}
                        style={inputWidth("lb")}
                        onInput={(e) => {
                          if (e.currentTarget.value) {
                            setPref("buttonMarginLeftRight", e.currentTarget.valueAsNumber);
                            setButtonMarginLeftRight(e.currentTarget.valueAsNumber);
                          }
                        }}
                      />{" "}
                    </span>
                    <span style={configItemStyle}>
                      padding:
                      <input
                        type="number"
                        min={-10}
                        max={200}
                        step={0.5}
                        defaultValue={buttonPaddingTopBottom}
                        style={inputWidth("lb")}
                        onInput={(e) => {
                          if (e.currentTarget.value) {
                            setPref("buttonPaddingTopBottom", e.currentTarget.valueAsNumber);
                            setButtonPaddingTopBottom(e.currentTarget.valueAsNumber);
                          }
                        }}
                      />
                      <input
                        type="number"
                        min={-10}
                        max={200}
                        step={0.5}
                        defaultValue={buttonPaddingLeftRight}
                        style={inputWidth("lb")}
                        onInput={(e) => {
                          if (e.currentTarget.value) {
                            setPref("buttonPaddingLeftRight", e.currentTarget.valueAsNumber);
                            setButtonPaddingLeftRight(e.currentTarget.valueAsNumber);
                          }
                        }}
                      />{" "}
                    </span>
                    <span style={configItemStyle}>
                      圆角:
                      <input
                        type="number"
                        min={0}
                        max={30}
                        step={0.5}
                        defaultValue={buttonBorderRadius}
                        style={inputWidth("lb")}
                        onInput={handleInputNumber("buttonBorderRadius", setButtonBorderRadius)}
                      />
                    </span>
                  </>
                )}
                {"标签设置" == configTab && (
                  <>
                    <div>
                      排序规则：
                      {SortTypeArray.map((a) => (
                        <label>
                          <input type="radio" value={a} checked={sortType === a} onChange={handleInput("sortType", setSortType)} />
                          {a}
                        </label>
                      ))}
                    </div>
                  </>
                )}
                {"待开发" == configTab && (
                  <>
                    <div>
                      相关标签的范围：（未完成）
                      <label>
                        <input type="checkbox" value="0" defaultChecked={getPrefAs("TagRangeSelfItem", false)} />
                        本条目
                      </label>
                      <label>
                        <input type="checkbox" value="0" defaultChecked={getPrefAs("TagRangeSelfCollection", false)} />
                        本条目所在文件夹[]
                      </label>
                      <label>
                        <input type="checkbox" value="0" defaultChecked={getPrefAs("TagRangeSelfCollection", false)} />
                        本条目所在文件夹以及子文件夹[]
                      </label>
                      <label>
                        <input type="checkbox" value="0" defaultChecked={getPrefAs("TagRangeSelfCollection", false)} />
                        我的文库所有文件
                      </label>
                    </div>
                    <div>Nest标签相关：（未完成）</div>
                    <div>Tag排除规则：（未完成）</div>
                  </>
                )}
              </div>
            )}
            <div
              style={{
                fontSize: "18px",
                lineHeight: "1.5",
                // background: "#fff",
                boxShadow: params.ids ? "rgb(0, 0, 0) 0 0 3px 0px inset" : "",
                borderTop: "1px solid #000",
              }}
            >
              <span
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <span
                  style={{
                    ...tagStyle,
                    background: isShowConfig ? "#00990030" : "#99000030",
                  }}
                  onClick={() => {
                    setPref("show-config", !isShowConfig);
                    setShowConfig(!isShowConfig);
                  }}
                >
                  设置
                </span>
                {existTags.length > 0 && (
                  <span
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      fontSize: fontSize + "px",
                      lineHeight: lineHeight,
                      alignItems: "center",
                    }}
                  >
                    现有标签：
                    {groupBy(existTags, (a) => a)
                      .sort(sortValuesLength)
                      .map((a) => (
                        <span
                          key={a.key}
                          style={{
                            ...tagStyle,
                            whiteSpace: "nowrap",
                            wordWrap: "normal",
                            backgroundColor: memFixedColor(a.key, ""),
                            boxShadow: "#ccc 0px 0px 4px 3px",
                          }}
                          onClick={() => {
                            updateDelTags((dt) => {
                              const i = dt.findIndex((f) => f == a.key);
                              if (i > -1) {
                                dt.splice(i, 1);
                              } else {
                                dt.push(a.key);
                              }
                            });
                          }}
                        >
                          [{a.values.length}/{existAnnotations.length}]{a.key}
                          {delTags.includes(a.key) && <span style={{ background: "#990000", color: "#fff" }}>[待删除]</span>}
                        </span>
                      ))}
                  </span>
                )}
                {params.ids && (
                  <>
                    <span
                      style={{
                        ...tagStyle,
                        background: delTags.length > 0 ? "#990000" : "#009900",
                        color: "#fff",
                      }}
                      onClick={() => {
                        setIsPopoverOpen(false);

                        saveAnnotationTags("", [], delTags, reader, params, doc);
                        root?.remove();
                      }}
                    >
                      {delTags.length == 0 ? (autoCloseSeconds > 0 ? autoCloseSeconds + "s" : "点击") + "关闭" : "确认删除"}
                    </span>
                  </>
                )}
                <input
                  type="text"
                  autoFocus={true}
                  defaultValue={searchTag}
                  onInput={(e) => setSearchTag(e.currentTarget.value)}
                  style={{ ...inputWidth(searchTag), minWidth: "18ch" }}
                  placeholder="搜索标签，按回车添加"
                  onKeyDown={(e) => {
                    // ztoolkit.log(e)
                    if (autoCloseSeconds > 0) {
                      setAutoCloseSeconds(-1);
                    }
                    if (e.code == "Enter") {
                      setIsPopoverOpen(false);
                      saveAnnotationTags(searchTag, [], [], reader, params, doc);
                      if (params.ids) {
                        root.remove();
                      }
                      return;
                    }
                    if (e.code == "Escape") {
                      //@ts-ignore _onSetSelectionPopup
                      reader?._primaryView._onSetSelectionPopup(null);
                      root.remove();
                      return;
                    }
                  }}
                />
                {/* <span style={tagStyle}>
                          固定标签来自【{currentPosition}】
                        </span>
                        <span style={tagStyle}>
                          相关标签来自【{currentPosition}】
                        </span> */}
                <span style={tagStyle}>
                  {" "}
                  {displayTags.length}/{searchResultLength}:
                </span>
                {displayTags.map((tag) => (
                  <span
                    key={tag.key}
                    style={{
                      ...tagStyle,
                      whiteSpace: "nowrap",
                      wordWrap: "normal",
                      backgroundColor: tag.color,
                      boxShadow: "#ccc 0px 0px 4px 3px",
                      // borderRadius: "3px",
                    }}
                    onClick={() => {
                      if (isShowConfig) return;
                      setIsPopoverOpen(false);
                      saveAnnotationTags(tag.key, [], [], reader, params, doc);
                      if (params.ids) {
                        root.remove();
                      }
                    }}
                  >
                    <span>[{tag.values.length}]</span>
                    <span>{tag.key}</span>

                    {isShowConfig && (
                      <>
                        {memFixedTags().includes(tag.key) ? (
                          <>
                            <ChangeColor
                              color={memFixedColor(tag.key)}
                              onChange={(e) => {
                                updateDisplayTags((a) => {
                                  for (const b of a) {
                                    if (b.key == tag.key) {
                                      b.color = e;
                                    }
                                  }
                                });
                              }}
                            >
                              <span style={{ background: "#fff" }}>颜色</span>
                            </ChangeColor>
                            {/* <span
                                                            style={{
                                                                background: "#fff",
                                                                color: "#000",
                                                                border: "1px solid #000",
                                                            }}
                                                        >
                                                            移除固定
                                                        </span>
                                                        <span
                                                            style={{
                                                                background: "#fff",
                                                                color: "#000",
                                                                border: "1px solid #000",
                                                            }}
                                                        >
                                                            左移
                                                        </span>
                                                        <span
                                                            style={{
                                                                background: "#fff",
                                                                color: "#000",
                                                                border: "1px solid #000",
                                                            }}
                                                        >
                                                            右移
                                                        </span> */}
                          </>
                        ) : (
                          <span
                            style={{
                              background: "#fff",
                              color: "#000",
                              border: "1px solid #000",
                            }}
                          >
                            {/* 设置固定 */}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                ))}
              </span>
            </div>
          </div>
        </div>
      </ArrowContainer> //ArrowContainer
    ),
    [
      isPopoverOpen,
      pPositions,
      pPadding,
      pFixedContentLocation,
      displayTags,
      isShowConfig,
      configTab,
      pFixedContentLocationLeft,
      pFixedContentLocationTop,
      divMaxWidth,
      pBoundaryInset,
      pArrowSize,
      showTagsLength,
      fontSize,
      lineHeight,
      buttonMarginTopBottom,
      buttonMarginLeftRight,
      buttonPaddingTopBottom,
      buttonPaddingLeftRight,
      sortType,
      divMaxHeight,
      buttonBorderRadius,
    ],
  );
  const dRef = useRef<HTMLDivElement>(null);
  return (
    <>
      {/* <div ref={dRef}></div>
      {popRef.current?.getBoundingClientRect().top || "空"}
      {dRef.current?.getBoundingClientRect().top || "空"}
      {dRef.current?.getBoundingClientRect() && <TagPopup rect={dRef.current.getBoundingClientRect()}></TagPopup>} */}
      <Popover
        parentElement={parentElement}
        boundaryElement={boundaryElement}
        isOpen={isPopoverOpen}
        positions={pPositions as any}
        reposition={true}
        padding={pPadding}
        ref={popRef}
        boundaryInset={pBoundaryInset}
        transformMode={pFixedContentLocation || params.ids ? "absolute" : "relative"}
        // transform={
        //   pFixedContentLocation || params.ids
        //     ? { left: pFixedContentLocationLeft, top: pFixedContentLocationTop }
        //     : (popoverState) => ({
        //       top: -popoverState.nudgedTop,
        //       left: -popoverState.nudgedLeft,
        //     })
        // }

        transform={
          pFixedContentLocation || params.ids ? { left: pFixedContentLocationLeft ?? 0, top: pFixedContentLocationTop ?? 0 } : undefined
        }
        align="start"
        // onClickOutside={() => setIsPopoverOpen(false)}
        // ref={clickMeButtonRef} // if you'd like a ref to your popover's child, you can grab one here
        content={handleContent}
        containerStyle={{
          marginTop: "42px",
        }}
      >
        <div
          ref={divRef}
          style={{
            width: "100%",
            // width: "600px",
            position: "absolute",
            height: (selectionPopupSize?.height || 120) + "px",
            top: "0",
            // background: "#f00", opacity: "0",
            zIndex: "-1",
          }}
        >
          {/* <button onClick={() => setIsPopoverOpen(!isPopoverOpen)}
              style={{ backgroundColor: color + " !important" }}>
              Click me! {JSON.stringify(popSize) + "1"} {JSON.stringify(selectionPopupSize) + "2"}
            </button>
            <span style={{ backgroundColor: color }}> {color}</span> */}
          {/* {JSON.stringify(selectionPopupSize)} */}
        </div>
      </Popover>
    </>
  );
}
