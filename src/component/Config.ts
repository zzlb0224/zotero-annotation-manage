export const ConfigTabArray = ["面板配置", "固定位置", "弹出框", "颜色栏", "标签样式", "标签设置", "待开发"] as const;
export type ConfigTab = (typeof ConfigTabArray)[number];

export const SortTypeArray = ["最近使用", "本条目+最近使用", "使用次数", "字母顺序"] as const;
export type SortType = (typeof SortTypeArray)[number];

export const ConfigTypeArray = ["草绿", "菊黄", "虾红", "跟随"] as const;
export type ConfigType = (typeof ConfigTypeArray)[number];
export function loadDefaultConfig(configType: ConfigType) {
  let config: Config;
  if (configType == "草绿") {
    return (config = {
      pSingleWindow: true,
      bAutoFocus: true,
      configName: configType,
      bgColor: "#5ad354",
      divMaxWidth: 550,
      autoCloseSeconds: 15,
      pFixedContentLocation: false,
      pFixedContentLocationLeft: 100,
      pFixedContentLocationTop: 100,
      pPadding: 5,
      pBoundaryInset: 40,
      pArrowSize: 4,
      pPositions: "left,right,top,bottom",
      isShowSelectedPopupColorsTag: false,
      isShowSelectedPopupMatchTag: true,
      showTagsLength: 25,
      fontSize: 18,
      lineHeight: "0.8",
      buttonMarginTopBottom: 4,
      buttonMarginLeftRight: 2,
      buttonPaddingTopBottom: 3,
      buttonPaddingLeftRight: 3,
      buttonBorderRadius: 5,
      sortType: "最近使用",
    });
  }
  if (configType == "菊黄") {
    return (config = {
      pSingleWindow: true,
      bAutoFocus: true,
      configName: configType,
      bgColor: "#cfb50a",
      divMaxWidth: 600,
      autoCloseSeconds: 16,
      pFixedContentLocation: false,
      pFixedContentLocationLeft: 150,
      pFixedContentLocationTop: 150,
      pPadding: 5,
      pBoundaryInset: 40,
      pArrowSize: 4,
      pPositions: "left,right,top,bottom",
      isShowSelectedPopupColorsTag: false,
      isShowSelectedPopupMatchTag: true,
      showTagsLength: 25,
      fontSize: 18,
      lineHeight: "0.8",
      buttonMarginTopBottom: 4,
      buttonMarginLeftRight: 2,
      buttonPaddingTopBottom: 3,
      buttonPaddingLeftRight: 3,
      buttonBorderRadius: 5,
      sortType: "最近使用",
    });
  }
  if (configType == "虾红") {
    return (config = {
      pSingleWindow: true,
      bAutoFocus: true,
      configName: configType,
      bgColor: "#c66087",
      divMaxWidth: 450,
      autoCloseSeconds: 17,
      pFixedContentLocation: false,
      pFixedContentLocationLeft: 150,
      pFixedContentLocationTop: 150,
      pPadding: 5,
      pBoundaryInset: 40,
      pArrowSize: 4,
      pPositions: "left,right,bottom,top",
      isShowSelectedPopupColorsTag: false,
      isShowSelectedPopupMatchTag: true,
      showTagsLength: 20,
      fontSize: 18,
      lineHeight: "0.8",
      buttonMarginTopBottom: 4,
      buttonMarginLeftRight: 2,
      buttonPaddingTopBottom: 3,
      buttonPaddingLeftRight: 3,
      buttonBorderRadius: 10,
      sortType: "最近使用",
    });
  }
  if (configType == "跟随") {
    return (config = {
      pSingleWindow: false,
      bAutoFocus: true,
      configName: configType,
      bgColor: "#fff",
      divMaxWidth: 290,
      autoCloseSeconds: 17,
      pFixedContentLocation: false,
      pFixedContentLocationLeft: 150,
      pFixedContentLocationTop: 150,
      pPadding: 5,
      pBoundaryInset: 40,
      pArrowSize: 4,
      pPositions: "left,right,bottom,top",
      isShowSelectedPopupColorsTag: false,
      isShowSelectedPopupMatchTag: true,
      showTagsLength: 20,
      fontSize: 15,
      lineHeight: "0.8",
      buttonMarginTopBottom: 0,
      buttonMarginLeftRight: 0,
      buttonPaddingTopBottom: 5,
      buttonPaddingLeftRight: 0,
      buttonBorderRadius: 10,
      sortType: "最近使用",
    });
  }
}
export interface Config {
  configName: string;
  bgColor: string;
  bAutoFocus: boolean;
  divMaxWidth: number;
  autoCloseSeconds: number;
  pSingleWindow: boolean;
  pFixedContentLocation: boolean;
  pFixedContentLocationLeft: number;
  pFixedContentLocationTop: number;
  pPadding: number;
  pBoundaryInset: number;
  pArrowSize: number;
  pPositions: string;
  isShowSelectedPopupColorsTag: boolean;
  isShowSelectedPopupMatchTag: boolean;
  showTagsLength: number;
  fontSize: number;
  lineHeight: string;
  buttonMarginTopBottom: number;
  buttonMarginLeftRight: number;
  buttonPaddingTopBottom: number;
  buttonPaddingLeftRight: number;
  buttonBorderRadius: number;
  sortType: SortType;
}
