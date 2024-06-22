import * as React from "react";
import { HexColorPicker } from "react-colorful";
import { ArrowContainer, Popover } from "react-tiny-popover";
import { ReactNode } from "react";
export function getCurrentTabDiv() {
  return Zotero_Tabs.deck.querySelector("#" + Zotero_Tabs.selectedID) as HTMLDivElement;
}
export function ChangeColor(props: { children?: ReactNode; text?: string; color: string; onChange: (color: string) => void }) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [newColor, setCewColor] = React.useState(props.color);
  return (
    <>
      {/* <span style={{ background: props.text ? "#fff" : newColor, minWidth: "20px" }} onClick={() =>
            setIsOpen(!isOpen)
        }>{props.text || ""}</span> */}
      <Popover
        isOpen={isOpen}
        parentElement={getCurrentTabDiv()}
        onClickOutside={() => setIsOpen(false)}
        content={({ position, childRect, popoverRect }) => (
          <ArrowContainer // if you'd like an arrow, you can import the ArrowContainer!
            position={position}
            childRect={childRect}
            popoverRect={popoverRect}
            arrowColor={"#aaaaaa"}
            arrowSize={10}
            arrowStyle={{ opacity: 0.6 }}
          >
            <>
              <HexColorPicker color={props.color} onChange={props.onChange} />
              <div style={{ background: "#fff", color: "#000", textAlign: "center", fontSize: "18px" }} onClick={() => {
                new ztoolkit.Clipboard().addText(props.text || "", "text/plain").copy();

              }}>{props.color}</div>

            </>
          </ArrowContainer>
        )}
      >
        <span onClick={() => setIsOpen(!isOpen)}>{props.children}</span>
      </Popover>

      {/* {isOpen && <HexColorPicker
            color={props.color}
            onChange={props.onChange}
        />} */}
    </>
  );
}
