import * as React from "react";
import { useState } from "react";

export function DebounceInput() {
  const [text, setText] = useState("");

  // 设置文本
  function handleText(event: React.ChangeEvent<HTMLInputElement>) {
    event.persist();
    ztoolkit.log("handleText", event.target.value);
    debounceHandleText(event);
  }

  const debounceHandleText = Zotero.Utilities.debounce(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      ztoolkit.log("debounceHandleText", event.target.value);
      setText(event.target.value);
    },
    500,
  );

  return (
    <>
      <input placeholder="输入文本" onChange={handleText} />
    </>
  );
}
