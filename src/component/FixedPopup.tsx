import React, { useState, useEffect, useRef } from 'react';

// 定义无头弹出框组件
// 在接口定义中添加 title 属性
const FixedPopup: React.FC<{
    openText?: string;
    title?: React.ReactNode;  // 新增 title 属性
    top?: string;
    left?: string;
    width?: string;
    height?: string;
    openButtonClassName?: string;
    openButtonStyle?: React.CSSProperties;  // 新增样式属性
    popupClassName?: string;
    closeButtonClassName?: string;
    contentClassName?: string;
    onOpenChanged?: (isOpen: boolean) => void;  // 新增事件属性
    children: React.ReactNode;
    defaultIsOpen?: boolean;
}> = ({
    openText = '打开弹出框',
    title,  // 新增 title 参数
    children,
    defaultIsOpen = false,
    top = '100px',
    left = '100px',
    width = '200px',
    height = '300px',
    openButtonClassName = '',
    openButtonStyle = {},  // 新增参数默认值
    popupClassName = '',
    closeButtonClassName = '',
    contentClassName = '',
    onOpenChanged,  // 新增参数
}) => {
        const [isOpen, setIsOpen] = useState<boolean>(defaultIsOpen);

        // 修改 toggle 函数
        const toggleOpen = () => {
            const newIsOpen = !isOpen;
            setIsOpen(newIsOpen);
            onOpenChanged?.(newIsOpen);  // 调用事件处理函数
        };

        const popupRef = useRef<HTMLDivElement>(null);


        useEffect(() => {

            if (isOpen && popupRef.current) {
                // 查找具有 transform 样式的父元素
                let currentParent = popupRef.current.parentElement;
                let transformValue = '';
                const window = Zotero.getMainWindow()
                Zotero.log(window, "error", "FixedPopup");
                if (window)
                    while (currentParent) {
                        const computedStyle = window.getComputedStyle(currentParent);
                        if (computedStyle) {
                            Zotero.log(computedStyle.transform, "error", "FixedPopup");
                            if (computedStyle.transform && computedStyle.transform !== 'none') {
                                transformValue = computedStyle.transform;
                                break;
                            }
                        }
                        currentParent = currentParent.parentElement;
                    }

                Zotero.log(transformValue, "error", "FixedPopup");
                // 计算反向的 transform 值（只处理 x 和 y）
                if (transformValue) {
                    const reverseTransform = getReverseTransform(transformValue);
                    popupRef.current.style.transform = reverseTransform;
                }
            }

            return () => {
                if (popupRef.current) {
                    popupRef.current.style.transform = 'none';
                }
            };
        }, [isOpen]);

        // 计算反向的 transform 值（只处理 x 和 y）
        const getReverseTransform = (transformValue: string) => {
            const matrixRegex = /matrix\((.*)\)/;
            const match = transformValue.match(matrixRegex);
            if (match) {
                const values = match[1].split(',').map(parseFloat);
                const e = values[4];
                const f = values[5];
                const inverseE = -e;
                const inverseF = -f;
                // 保留前面的四个参数，只对 x 和 y 取反
                return `matrix(${values[0]},${values[1]},${values[2]},${values[3]},${inverseE},${inverseF})`;
            }
            return 'none';
        };

        return (
            <div>
                <button
                    onClick={toggleOpen}
                    className={openButtonClassName}
                    style={openButtonStyle}  // 应用传入的样式
                >
                    {openText}
                </button>
                {isOpen && (
                    // 修改弹出框的头部区域
                    <div
                        ref={popupRef}
                        style={{ position: 'fixed', top, left, width, height, background: "white" }}
                        className={popupClassName}
                    >
                        <div style={{
                            width: "100%",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "0px"
                        }}>
                            <div style={{ padding: '0px 8px' }}>{title || openText}</div>
                            <button
                                onClick={toggleOpen}
                                className={closeButtonClassName}
                                style={{
                                    cursor: 'pointer',
                                    border: 'none',
                                    background: 'transparent',
                                    padding: '0px 8px'
                                }}
                            >
                                <i className="close-icon">close</i>
                            </button>
                        </div>
                        <div className={contentClassName}>
                            {children}
                        </div>
                    </div>
                )}
            </div>
        );
    };

export default FixedPopup;