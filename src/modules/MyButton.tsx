import React = require("react");
import { useState } from "react";
interface MyButtonProps {
  /** 按钮文字 */
  title: string;
  /** 按钮是否禁用 */
  disabled: boolean;
}

export function MyButton({ title, disabled }: MyButtonProps) {
  const [clickCount, setClickCount] = useState(1);
  return (
    <>
      <button disabled={disabled} onClick={() => setClickCount(clickCount + 1)}>
        {title + clickCount}
      </button>
    </>
  );
}
