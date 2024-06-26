import React, { useEffect, useRef, useState } from "react";

import ViewPopup from "./view-popup/common/view-popup";

import { IconColor16 } from "./common/icons";
function boundingClientRect2Rect(dRect?: DOMRect) {
  if (dRect)
    return [dRect.left, dRect.top, dRect.right, dRect.bottom]
  return [0, 0, 0, 0]
}
function TagPopup(props: any) {
  const divRef = useRef<HTMLDivElement>(null);

  function handleAddToNote() {
    // ztoolkit.log("aaaaaa");
  }
  const [rect, setRect] = useState<number[]>()
  useEffect(() => {
    setRect(boundingClientRect2Rect(divRef.current?.getBoundingClientRect()))
  }, [])

  return (
    <>
      <div ref={divRef} onResize={(e) => {
        const div = e.target as HTMLDivElement;
        setRect(boundingClientRect2Rect(div.getBoundingClientRect()));
      }} style={{ maxWidth: "200px", wordBreak: "break-all" }}>divRef{JSON.stringify(rect)}</div>
      {rect}
      {rect && <ViewPopup className="tag-popup" rect={rect} uniqueRef={{}} padding={20}   >
        <IconColor16 color='red'></IconColor16>
        {IconColor16({ color: "red" })}
        <button className="toolbar-button wide-button" data-tabstop={true} onClick={handleAddToNote}>
          aaa
        </button>
      </ViewPopup>
      }
    </>
  );
}

export default TagPopup;
