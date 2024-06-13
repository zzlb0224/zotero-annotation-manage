import * as React from "react";
import { useEffect, useRef, useState } from "react";
// import { ColorPicker, useColor } from "react-color-palette";
// import "react-color-palette/css";

import { ArrowContainer, Popover } from "react-tiny-popover";
import { DebounceInput } from "./DebounceInput";

import "./styles.css";
import { HexColorPicker } from "react-colorful";

export function PickerColor({
  parentElement,
  defaultColor,
  onChange,
}: {
  parentElement: HTMLDivElement;
  defaultColor: string;
  onChange: (newColor: string) => void;
}) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(true);
  const [color, setColor] = useState(defaultColor);
  return (
    <div>
      <div>{new Date().toLocaleTimeString()}</div>
      <div>
        {/* <Popover
                    parentElement={parentElement}
                    boundaryElement={parentElement}
                    isOpen={isPopoverOpen}
                    positions={['top', 'bottom', 'left', 'right']} // if you'd like, you can limit the positions
                    padding={10} // adjust padding here!
                    reposition={true} // prevents automatic readjustment of content position that keeps your popover content within its parent's bounds
                    onClickOutside={() => setIsPopoverOpen(false)} // handle click events outside of the popover/target here!
                    content={({ position, nudgedLeft, nudgedTop }) => ( // you can also provide a render function that injects some useful stuff!
                        <div style={{ border: "1px solid black", }}>
                            <div>Hi! I'm popover content. Here's my current position: {position}.</div>
                            <div>Hi! I'm popover content. Here's my current position: {position}.</div>
                            <div>Hi! I'm popover content. Here's my current position: {position}.</div>
                            <div>Hi! I'm popover content. Here's my current position: {position}.</div> 
                        </div>
                    )}
                >
                    <span onClick={() => setIsPopoverOpen(!isPopoverOpen)}>Click me!</span>
                </Popover>; */}
      </div>

      <Popover
        parentElement={parentElement}
        boundaryElement={parentElement}
        isOpen={isPopoverOpen}
        positions={["top", "left", "right", "bottom"]}
        padding={10}
        // onClickOutside={() => setIsPopoverOpen(false)}
        // ref={clickMeButtonRef} // if you'd like a ref to your popover's child, you can grab one here
        content={({ position, childRect, popoverRect }) => (
          <ArrowContainer // if you'd like an arrow, you can import the ArrowContainer!
            position={position}
            childRect={childRect}
            popoverRect={popoverRect}
            arrowColor={"#aaaaaa"}
            arrowSize={20}
            arrowStyle={{ opacity: 0.6 }}
            className="popover-arrow-container"
            arrowClassName="popover-arrow"
          >
            <div
              style={{
                backgroundColor: "#aaaaaa",
                opacity: 1,
                whiteSpace: "break-spaces",
              }}
              // onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            >
              Hi! I'm popover content. Here's my position: {position}.<br />
              Hi! I'm popover content. Here's my position: {position}.<br />
              Hi! I'm popover content. Here's my position: {position}.<br />
              Hi! I'm popover content. Here's my position: {position}.<br />
              <HexColorPicker
                color={color}
                onChange={(e) => {
                  onChange(e);
                  setColor(e);
                }}
              />
            </div>
          </ArrowContainer>
        )}
      >
        <div style={{ width: "250px" }}>
          <button
            onClick={() => setIsPopoverOpen(!isPopoverOpen)}
            style={{ backgroundColor: color + " !important" }}
          >
            Click me!
          </button>
          <span style={{ backgroundColor: color }}> {color}</span>
        </div>
      </Popover>

      <span style={{ backgroundColor: color }}> {color}</span>
      {/* <DebounceInput text={color} onChange={() => {
                setColor(color)
            }}></DebounceInput> */}
    </div>
  );
}
