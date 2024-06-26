//@ts-nocheck nocheck
//zotero官方的建议popup看起来还挺好用。不过还缺少一点相应的功能
//TODO 增加parentElement
//TODO 增加boundaryElement
//TODO 增加rect边界检测。如果rect越界了，就应该把popup隐藏起来
import React, { useState, useEffect, useLayoutEffect, useRef } from "react";
import ReactDOM from "react-dom";
import cx from "classnames";

// TODO: Resizing window doesn't properly reposition annotation popup on x axis, in EPUB view
function ViewPopup({ id = "", rect, className = "", uniqueRef, padding = 0, children = [], onRender = undefined }: { id?: string, rect: number[], className?: string, uniqueRef: object, padding: number, children: React.JSX.Element[], onRender?: (() => void) }) {
  const [popupPosition, setPopupPosition] = useState<object | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const xRect = useRef<number[] | null>(null); //当前指示区域

  const initialized = useRef(false);
  const pos = useRef<{ top: number, left: number, side: string } | null>(null);
  useEffect(() => {
    ztoolkit.log("rect", rect);
  }, [])

  // Update the popup position when the `rect` changes
  useEffect(() => {
    if (xRect.current) {
      const dx = rect[0] - xRect.current[0];
      const dy = rect[1] - xRect.current[1];
      xRect.current = rect;
      if (pos.current) {
        pos.current.left += dx;
        pos.current.top += dy;
      }

      setPopupPosition({}); // Trigger re-render
    } else {
      xRect.current = rect;
    }
  }, [rect]);

  useLayoutEffect(() => {
    if (initialized.current) {
      if (onRender) onRender();
    }
  }, [popupPosition]);

  useLayoutEffect(() => {
    updatePopupPosition();
    // Editor needs more time to get its final dimensions
    setTimeout(updatePopupPosition, 0);
  }, [uniqueRef, rect]);

  function updatePopupPosition() {
    if (!containerRef.current) {
      return;
    }

    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;

    const parent = containerRef.current.parentNode as HTMLElement;

    const viewRect0 = parent.getBoundingClientRect();
    const viewRect = [0, 0, viewRect0.width, viewRect0.height];
    //这里替换为boundaryElement


    const annotationCenterLeft = rect[0] + (rect[2] - rect[0]) / 2;
    let left = annotationCenterLeft - width / 2;

    let side;
    let top;
    if (left < 0) {
      side = "right";
      left = rect[2] + padding;
      top = rect[1] + (rect[3] - rect[1] - height) / 2;
      if (top < 0) {
        top = rect[1];
      } else if (top + height > viewRect[3]) {
        top = rect[1] + (rect[3] - rect[1]) - height;
      }
    } else if (left + width > viewRect[2]) {
      side = "left";
      left = rect[0] - width - padding;
      top = rect[1] + (rect[3] - rect[1] - height) / 2;
      if (top < 0) {
        top = rect[1];
      } else if (top + height > viewRect[3]) {
        top = rect[1] + (rect[3] - rect[1]) - height;
      }
    } else if (rect[3] + height + padding < viewRect[3]) {
      top = rect[3] + padding;
      side = "bottom";
    } else if (rect[1] - padding - height > 0) {
      top = rect[1] - padding - height;
      side = "top";
    } else {
      top = rect[3] + padding;
      side = "top";

      if (rect[0] < (viewRect[2] - viewRect[0]) / 2) {
        side = "right";
        left = rect[2] + padding;
        top = rect[1] + (rect[3] - rect[1] - height) / 2;
        if (top < 0) {
          top = rect[1];
        } else if (top + height > viewRect[3]) {
          top = rect[1] + (rect[3] - rect[1]) - height;
        }
      } else {
        side = "left";
        left = rect[0] - width - padding;
        top = rect[1] + (rect[3] - rect[1] - height) / 2;
        if (top < 0) {
          top = rect[1];
        } else if (top + height > viewRect[3]) {
          top = rect[1] + (rect[3] - rect[1]) - height;
        }
      }

      if (left < padding) {
        left = padding;
      } else if (left + width > viewRect[2] - padding) {
        left = viewRect[2] - width - padding;
      }
    }

    xRect.current = rect;
    pos.current = { top, left, side };

    setPopupPosition({}); // Trigger re-render
    initialized.current = true;
  }

  const pointerClass = {} as { [key: string]: boolean };
  if (pos.current) {
    pointerClass["page-popup-" + pos.current.side + "-center"] = true;
  }


  return (
    <div
      ref={containerRef}
      className={cx("view-popup", className, { ...pointerClass })}
      style={pos.current ? { transform: `translate(${pos.current.left}px, ${pos.current.top}px)` } : {}}
    >
      {children}
    </div>
  );
}

export default ViewPopup;
