import { getPrefAs, setPref } from "../utils/prefs";
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
} from "../utils/zzlb";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { getString } from "../utils/locale";
import { useImmer } from "use-immer";
import { ArrowContainer, Popover } from "react-tiny-popover";
import { ChangeColor } from "./ChangeColor";
import { saveAnnotationTags } from "../modules/AnnotationPopup";
import { type } from "os";
const ConfigTabArray = ["面板基础配置", "固定位置", "弹出框", "颜色栏", "标签样式", "标签设置"] as const;
export type ConfigTab = (typeof ConfigTabArray)[number];

const SortTypeArray = ["最近使用", "本条目+最近使用", "使用次数", "字母顺序",] as const;
export type SortType = (typeof SortTypeArray)[number];

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
    const [isShowConfig, setShowConfig] = useState(getPrefAs("show-config", false));
    const [configTab, setConfigTab] = useState<ConfigTab>(getPrefAs("configTab", "面板基础配置"));
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
            setPPadding((setPPadding) => pPadding + 0.0001);
            setTimeout(() => {
                setPPadding((setPPadding) => pPadding - 0.0001);
            });
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
    const [time, setTime] = useState(params.ids ? getPrefAs("autoCloseSeconds", 15) : -1); //只在倒计时时间
    const timeRef = useRef<NodeJS.Timeout>(); //设置延时器

    //倒计时
    useEffect(() => {
        //如果设置倒计时且倒计时不为0
        if (time > 0) {
            timeRef.current = setTimeout(() => {
                setTime((time) => time - 1);
            }, 1000);
        }
        if (time == 0) {
            root.remove();
            setIsPopoverOpen(false);
        }
        return () => {
            clearTimeout(timeRef.current);
        };
    }, [time]);

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
    function inputWidth(searchTag: string) {
        return {
            width: `${Math.min(searchTag.length + (searchTag.match(/[\u4E00-\u9FA5]/g) || "").length + 4)}ch`,
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
    const [pPositions, updatePPositions] = useImmer(getPrefAs("pPositions", "bottom,left,top,right").split(","));
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

    return (
        <Popover
            parentElement={parentElement}
            boundaryElement={boundaryElement}
            isOpen={isPopoverOpen}
            positions={pPositions as any}
            padding={pPadding}
            ref={popRef}
            boundaryInset={pBoundaryInset}
            transformMode={pFixedContentLocation || params.ids ? "absolute" : "relative"}
            transform={
                pFixedContentLocation || params.ids
                    ? { left: pFixedContentLocationLeft, top: 0 }
                    : (popoverState) => ({
                        top: -popoverState.nudgedTop + 65,
                        left: -popoverState.nudgedLeft,
                    })
            }
            // style={{
            //   maxWidth: divMaxWidth + "px",
            //   // width: "600px",
            //   minHeight: divMaxHeight + "px",
            //   overflowY: "scroll",
            // }}
            align="start"
            // onClickOutside={() => setIsPopoverOpen(false)}
            // ref={clickMeButtonRef} // if you'd like a ref to your popover's child, you can grab one here
            content={(popoverState) => (
                <ArrowContainer // if you'd like an arrow, you can import the ArrowContainer!
                    {...popoverState}
                    // position={popoverState.position}
                    // childRect={popoverState.childRect}
                    // popoverRect={popoverState.popoverRect}
                    arrowColor={"#aaaaaa"}
                    arrowSize={pArrowSize}
                    arrowStyle={{ opacity: 0.6 }}
                >
                    <div
                        ref={popMaxWidthRef}
                        style={{
                            marginTop: pFixedContentLocation || params.ids ? pFixedContentLocationTop + "px" : "unset",
                            backgroundColor: bgColor,
                            opacity: 1,
                            whiteSpace: "break-spaces",
                            display: "flex",
                            flexWrap: "wrap",
                            // maxWidth: Math.max(600, maxWidth) + "px",
                            // width: "600px",
                            maxWidth: divMaxWidth + "px",
                            // width: divMaxWidth + "px",
                            // minHeight: divMaxHeight + "px",
                            // overflowY: "scroll",
                        }}
                        // onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                        onClick={() => setTime(-1)}
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

                                {"面板基础配置" == configTab && (
                                    <>
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
                                        <span style={{ whiteSpace: "nowrap", wordWrap: "normal" }}>
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
                                        </span>
                                        {/* <span style={{ whiteSpace: "nowrap", wordWrap: "normal" }}>
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
                                        </span> */}

                                        <>
                                            设置
                                            <input
                                                style={inputWidth("zlb")}
                                                type="number"
                                                min={5}
                                                max={100}
                                                defaultValue={getPrefAs("autoCloseSeconds", 15)}
                                                onInput={(e) => {
                                                    if (e.currentTarget.value) {
                                                        setTime(e.currentTarget.valueAsNumber);
                                                        setPref("autoCloseSeconds", e.currentTarget.valueAsNumber);
                                                    }
                                                }}
                                            />
                                            秒后自动关闭
                                        </>
                                    </>
                                )}
                                {"固定位置" == configTab && (
                                    <div
                                        style={{
                                            fontSize: "18px",
                                            lineHeight: "1.5",
                                        }}
                                    >
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
                                        <>
                                            固定left:
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
                                            固定top:
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
                                        </>
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
                                            <label>
                                                <input
                                                    type="checkbox"
                                                    defaultChecked={!pFixedContentLocation}
                                                    onChange={(e) => {
                                                        setPFixedContentLocation(!e.currentTarget.checked);
                                                        setPref("pFixedContentLocation", !e.currentTarget.checked);
                                                    }}
                                                />
                                                浮动弹出区域
                                            </label>
                                            弹出框边距:{" "}
                                            <input
                                                type="number"
                                                min={0}
                                                step={1}
                                                max={200}
                                                style={inputWidth("zlb")}
                                                defaultValue={pPadding}
                                                onInput={(e) => {
                                                    if (e.currentTarget.value) {
                                                        setPref("pPadding", e.currentTarget.value);
                                                        setPPadding(e.currentTarget.valueAsNumber);
                                                    }
                                                }}
                                            />
                                            弹出框边缘检测距离:
                                            {pBoundaryInset}
                                            <input
                                                type="number"
                                                min={0}
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
                                            弹出框三角大小:
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
                                            />
                                            弹出框默认位置:
                                            {"bottom,left,top,right"
                                                .split(",")
                                                .sort(sortFixed(pPositions))
                                                .map((a, i) => (
                                                    <span key={a} style={{ margin: "0 20px" }}>
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
                                                        <label style={{ margin: "0 10px" }}>
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
                                        </>
                                    </div>
                                )}

                                {"颜色栏" == configTab && (
                                    <span>
                                        <span></span>
                                        颜色栏：
                                        <label>
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
                                        <label>
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
                                        <span>
                                            显示
                                            <input
                                                type="number"
                                                defaultValue={showTagsLength}
                                                min={0}
                                                max={100}
                                                style={inputWidth("zlb")}
                                                onInput={(e) => {
                                                    setPref("showTagsLength", e.currentTarget.value);
                                                    setShowTagsLength(e.currentTarget.valueAsNumber);
                                                }}
                                            />
                                            个。
                                        </span>
                                        <span style={{ whiteSpace: "nowrap", wordWrap: "normal" }}>
                                            字体大小:
                                            <input
                                                type="number"
                                                min={6}
                                                max={72}
                                                step={0.5}
                                                defaultValue={fontSize}
                                                style={inputWidth("zlb")}
                                                onInput={(e) => {
                                                    if (e.currentTarget.value) {
                                                        setPref("fontSize", e.currentTarget.valueAsNumber);
                                                        setFontSize(e.currentTarget.valueAsNumber);
                                                    }
                                                }}
                                            />
                                            px。
                                        </span>
                                        行高:
                                        <input
                                            type="number"
                                            defaultValue={lineHeight}
                                            min={0.1}
                                            max={3}
                                            step={0.1}
                                            style={inputWidth("zlb")}
                                            onInput={(e) => {
                                                setPref("lineHeight", e.currentTarget.value);
                                                setLineHeight(e.currentTarget.value);
                                            }}
                                        />
                                        margin:
                                        <input
                                            type="number"
                                            min={-10}
                                            max={200}
                                            step={0.5}
                                            defaultValue={buttonMarginTopBottom}
                                            style={inputWidth("zlb")}
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
                                            style={inputWidth("zlb")}
                                            onInput={(e) => {
                                                if (e.currentTarget.value) {
                                                    setPref("buttonMarginLeftRight", e.currentTarget.valueAsNumber);
                                                    setButtonMarginLeftRight(e.currentTarget.valueAsNumber);
                                                }
                                            }}
                                        />
                                        padding:
                                        <input
                                            type="number"
                                            min={-10}
                                            max={200}
                                            step={0.5}
                                            defaultValue={buttonPaddingTopBottom}
                                            style={inputWidth("zlb")}
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
                                            style={inputWidth("zlb")}
                                            onInput={(e) => {
                                                if (e.currentTarget.value) {
                                                    setPref("buttonPaddingLeftRight", e.currentTarget.valueAsNumber);
                                                    setButtonPaddingLeftRight(e.currentTarget.valueAsNumber);
                                                }
                                            }}
                                        />
                                        圆角:
                                        <input
                                            type="number"
                                            min={0}
                                            max={30}
                                            step={0.5}
                                            defaultValue={buttonBorderRadius}
                                            style={inputWidth("zlb")}
                                            onInput={handleInputNumber("buttonBorderRadius", setButtonBorderRadius)}
                                        />
                                    </>
                                )}
                                {"标签设置" == configTab && (
                                    <>
                                        <div>
                                            排序规则：
                                            {SortTypeArray.map(a => (
                                                <label>
                                                    <input
                                                        type="radio"
                                                        value={a}
                                                        checked={sortType === a}
                                                        onChange={handleInput("sortType", setSortType)}
                                                    />
                                                    {a}
                                                </label>
                                            ))}
                                        </div>
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
                                            {delTags.length == 0 ? (time > 0 ? time + "s" : "点击") + "关闭" : "确认删除"}
                                        </span>
                                    </>
                                )}
                                <input
                                    type="text"
                                    autoFocus={true}
                                    defaultValue={searchTag}
                                    onInput={(e) => setSearchTag(e.currentTarget.value)}
                                    style={{ ...inputWidth(searchTag), minWidth: "15ch" }}
                                    placeholder="搜索标签，按回车添加"
                                    onKeyDown={(e) => {
                                        // ztoolkit.log(e)
                                        if (time > 0) {
                                            setTime(-1);
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
                </ArrowContainer> //ArrowContainer
            )}
        >
            <div
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
    );
}
