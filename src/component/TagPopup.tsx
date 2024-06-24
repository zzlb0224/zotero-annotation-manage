import React from "react";
import { FormattedMessage, useIntl } from "react-intl";
import ViewPopup from "./view-popup/common/view-popup";

import { IconColor16 } from "./common/icons";

function SelectionPopup(props: { rect: DOMRect; }) {
    const intl = useIntl();

    function handleAddToNote() {
        ztoolkit.log("aaaaaa")
    }

    return (
        <ViewPopup className="selection-popup" rect={props.rect} uniqueRef={{}} padding={20}>
            {intl.formatMessage({ id: "pref-input" })}
            {IconColor16({ color: "red" })}

            <button className="toolbar-button wide-button" data-tabstop={true} onClick={handleAddToNote}>
                <FormattedMessage id="pdfReader.addToNote" />
            </button>
        </ViewPopup>
    );
}

export default SelectionPopup;
