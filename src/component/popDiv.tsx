import { getPrefAs } from "../utils/prefs";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { useImmer } from "use-immer";
import { ArrowContainer, Popover } from "react-tiny-popover";
import { PopupRoot } from "./PopupRoot";

export function popDiv({
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
  const [isPop, setIsPop] = useState(false);
  const p = { reader, doc, params, root, maxWidth };
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
  const parentElement = tabDiv;
  const boundaryElement = tabDiv;
  const [pPadding, setPPadding] = useState(getPrefAs("pPadding", 0));
  const [pBoundaryInset, setPBoundaryInset] = useState(getPrefAs("pBoundaryInset", 0));
  const [pArrowSize, setPArrowSize] = useState(getPrefAs("pArrowSize", 0));
  const [pPositions, updatePPositions] = useImmer(getPrefAs("pPositions", "bottom,left,top,right").split(","));
  const [pFixedContentLocation, setPFixedContentLocation] = useState(getPrefAs("pFixedContentLocation", false));
  const [pFixedContentLocationLeft, setPFixedContentLocationLeft] = useState(getPrefAs("pFixedContentLocationLeft", 0));
  const [pFixedContentLocationTop, setPFixedContentLocationTop] = useState(getPrefAs("pFixedContentLocationTop", 0));
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
    const resizeChange = () => {
      ztoolkit.log("selectionPopupRef.current.clientHeight", selectionPopupRef.current, selectionPopupRef.current.clientHeight);
      setSelectionPopupSize({
        width: selectionPopupRef.current.clientWidth,
        height: selectionPopupRef.current.clientHeight,
      });
    };
    // 监听
    selectionPopupRef.current.addEventListener("resize", resizeChange);
    setSelectionPopupSize({
      width: selectionPopupRef.current.clientWidth,
      height: selectionPopupRef.current.clientHeight,
    });
    // 销毁
    return () => {
      ztoolkit.log("selectionPopupRef.current.clientHeight  remove", selectionPopupRef.current, selectionPopupRef.current.clientHeight);
      selectionPopupRef.current.removeEventListener("resize", resizeChange);
    };
  }, []);
  return (
    <>
      {isPop ? (
        <Popover
          parentElement={parentElement}
          boundaryElement={boundaryElement}
          isOpen={isPopoverOpen}
          positions={pPositions as any}
          padding={pPadding}
          boundaryInset={pBoundaryInset}
          transformMode={pFixedContentLocation ? "absolute" : "relative"}
          transform={
            pFixedContentLocation
              ? {
                  left: pFixedContentLocationLeft,
                  top: pFixedContentLocationTop,
                }
              : (popoverState) => ({
                  top: -popoverState.nudgedTop + 65,
                  left: -popoverState.nudgedLeft,
                })
          }
          // onClickOutside={() => setIsPopoverOpen(false)}
          // ref={clickMeButtonRef} // if you'd like a ref to your popover's child, you can grab one here
          content={({ position, childRect, popoverRect }) => (
            <ArrowContainer // if you'd like an arrow, you can import the ArrowContainer!
              position={position}
              childRect={childRect}
              popoverRect={popoverRect}
              arrowColor={"#aaaaaa"}
              arrowSize={pArrowSize}
              arrowStyle={{ opacity: 0.6 }}
            >
              <div
                style={{
                  backgroundColor: bgColor,
                  opacity: 1,
                  whiteSpace: "break-spaces",
                  display: "flex",
                  flexWrap: "wrap",
                  maxWidth: Math.max(600, maxWidth) + "px",
                }}
              >
                <PopupRoot reader={reader} doc={doc} params={params} root={root} maxWidth={maxWidth} />
              </div>
            </ArrowContainer>
          )}
        >
          <div
            style={{
              width: "100%",
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
      ) : (
        <PopupRoot {...p} />
      )}
    </>
  );
}
