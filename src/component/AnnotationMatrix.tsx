import { createRoot } from "react-dom/client";
import { IntlProvider } from "react-intl";
import * as React from "react";
import { AnnotationRes } from '../utils/zzlb';

export function content2AnnotationMatrix(content: HTMLElement, annotations: AnnotationRes[]) {
    createRoot(content).render(
        <IntlProvider
            locale={window.navigator.language}
            // messages={this._localizedStrings}
            onError={window.development &&
                (() => {
                    ztoolkit.log("e", content);
                })}
        >
            <AnnotationMatrix
                annotations={annotations} />
        </IntlProvider>
    );
}
const innerStyle =
    `
.annotationMatrix table{
    border: 1px solid black;
    borderCollapse: collapse
}
.annotationMatrix table td {
    border: 1px solid black;
}
.annotationMatrix table td:hover{
    background:#fee
}
`;
export function AnnotationMatrix({
    annotations
}: { annotations: AnnotationRes[] }) {

    return (
        <>
            <div>
                <div>
                    <div>列设置</div>
                    <div>大于100条要分页 {annotations.length}</div>
                    <div>导出</div></div>

                <style>
                    {innerStyle}
                </style>
                <div className='annotationMatrix'>
                    <table style={{

                    }} cellPadding={0} cellSpacing={0} >
                        {annotations.map((annotation) => (

                            <tr key={annotation.ann.key}>
                                <td >{annotation.author}</td>
                                <td >{annotation.year}</td>
                                <td >{annotation.text}</td>
                                <td >{annotation.comment}</td>
                                {/* <td > <span dangerouslySetInnerHTML={{ __html: annotation.html }}></span></td> */}
                                <td >{annotation.annotationTags}</td>
                            </tr>

                        ))}
                    </table>
                </div>
            </div>
        </>
    )
}