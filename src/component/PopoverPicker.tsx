import * as React from "react";
import { useCallback, useRef, useState } from "react";
import useClickOutside from "./useClickOutside";
import "./PopoverPicker.css";

import { HexColorPicker } from "react-colorful";

export const PopoverPicker = ({
  color,
  onChange,
}: {
  color: string;
  onChange: (newColor: string) => void;
}) => {
  const popover = useRef<HTMLDivElement | null>(null);
  const [isOpen, toggleIsOpen] = useState(false);

  const close = useCallback(() => toggleIsOpen(false), []);
  useClickOutside(popover, close);
  return (
    <div className="picker">
      <span
        className="swatch"
        style={{ backgroundColor: color }}
        onClick={() => toggleIsOpen(!isOpen)}
      >
        ooo
      </span>

      {isOpen && (
        <div className="popover" ref={popover}>
          <HexColorPicker color={color} onChange={onChange} />
        </div>
      )}
    </div>
  );
};
