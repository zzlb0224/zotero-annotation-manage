export const ConfigTabArray = ["PanelConfig", "FixedPanel", "PopupPanel", "ColorsPanel", "TagsStyle", "TagsSetting", "Development"] as const;
export type ConfigTab = (typeof ConfigTabArray)[number];

export const SortTypeArray = ["最近使用", "本条目+最近使用", "使用次数", "字母顺序"] as const;
export type SortType = (typeof SortTypeArray)[number];

export const ConfigTypeArray = ["草绿", "菊黄", "虾红", "跟随"] as const;
export type ConfigType = (typeof ConfigTypeArray)[number];

export const WindowTypeArray = ["跟随", "FixedPanel", "PopupPanel"] as const;
export type WindowType = (typeof WindowTypeArray)[number];

export function loadDefaultConfig(configType: ConfigType) {
  let config: Config;
  if (configType == "草绿") {
    return (config = {
      windowType: "FixedPanel",
      isCtrlAdd: true,
      pSingleWindow: true,
      bAutoFocus: true,
      configName: configType,
      bgColor: "#5ad354",
      divMaxWidth: 750,
      autoCloseSeconds: 15,
      pFixedContentLocation: false,
      pFCLLeft: 100,
      nFCLTop: 100,
      pPadding: 5,
      pBoundaryInset: 40,
      pArrowSize: 4,
      pPositions: "left,right,top,bottom",
      isShowSelectedPopupColorsTag: false,
      isShowSelectedPopupMatchTag: true,
      showTagsLength: 25,
      fontSize: 18,
      lineHeight: "0.8",
      btnMarginTB: 4,
      btnMarginLR: 2,
      btnPaddingTB: 3,
      btnPaddingLR: 3,
      buttonBorderRadius: 5,
      sortType: "最近使用",
    });
  }
  if (configType == "菊黄") {
    return (config = {
      windowType: "PopupPanel",
      isCtrlAdd: true,
      pSingleWindow: true,
      bAutoFocus: true,
      configName: configType,
      bgColor: "#cfb50a",
      divMaxWidth: 600,
      autoCloseSeconds: 16,
      pFixedContentLocation: false,
      pFCLLeft: 150,
      nFCLTop: 150,
      pPadding: 5,
      pBoundaryInset: 40,
      pArrowSize: 4,
      pPositions: "left,right,top,bottom",
      isShowSelectedPopupColorsTag: false,
      isShowSelectedPopupMatchTag: true,
      showTagsLength: 25,
      fontSize: 18,
      lineHeight: "0.8",
      btnMarginTB: 4,
      btnMarginLR: 2,
      btnPaddingTB: 3,
      btnPaddingLR: 3,
      buttonBorderRadius: 5,
      sortType: "最近使用",
    });
  }
  if (configType == "虾红") {
    return (config = {
      windowType: "PopupPanel",
      isCtrlAdd: true,
      pSingleWindow: true,
      bAutoFocus: true,
      configName: configType,
      bgColor: "#c66087",
      divMaxWidth: 450,
      autoCloseSeconds: 17,
      pFixedContentLocation: false,
      pFCLLeft: 150,
      nFCLTop: 150,
      pPadding: 5,
      pBoundaryInset: 40,
      pArrowSize: 4,
      pPositions: "left,right,bottom,top",
      isShowSelectedPopupColorsTag: false,
      isShowSelectedPopupMatchTag: true,
      showTagsLength: 20,
      fontSize: 18,
      lineHeight: "0.8",
      btnMarginTB: 4,
      btnMarginLR: 2,
      btnPaddingTB: 3,
      btnPaddingLR: 3,
      buttonBorderRadius: 10,
      sortType: "最近使用",
    });
  }
  if (configType == "跟随") {
    return (config = {
      windowType: "跟随",
      isCtrlAdd: true,
      pSingleWindow: false,
      bAutoFocus: true,
      configName: configType,
      bgColor: "#fff",
      divMaxWidth: 290,
      autoCloseSeconds: 17,
      pFixedContentLocation: false,
      pFCLLeft: 150,
      nFCLTop: 150,
      pPadding: 5,
      pBoundaryInset: 40,
      pArrowSize: 4,
      pPositions: "left,right,bottom,top",
      isShowSelectedPopupColorsTag: false,
      isShowSelectedPopupMatchTag: true,
      showTagsLength: 20,
      fontSize: 15,
      lineHeight: "0.8",
      btnMarginTB: 0,
      btnMarginLR: 0,
      btnPaddingTB: 5,
      btnPaddingLR: 0,
      buttonBorderRadius: 10,
      sortType: "最近使用",
    });
  }
}
export interface Config {
  windowType: WindowType;
  isCtrlAdd: boolean;
  configName: string;
  bgColor: string;
  bAutoFocus: boolean;
  divMaxWidth: number;
  autoCloseSeconds: number;
  pSingleWindow: boolean;
  pFixedContentLocation: boolean;
  pFCLLeft: number;
  nFCLTop: number;
  pPadding: number;
  pBoundaryInset: number;
  pArrowSize: number;
  pPositions: string;
  isShowSelectedPopupColorsTag: boolean;
  isShowSelectedPopupMatchTag: boolean;
  showTagsLength: number;
  fontSize: number;
  lineHeight: string;
  btnMarginTB: number;
  btnMarginLR: number;
  btnPaddingTB: number;
  btnPaddingLR: number;
  buttonBorderRadius: number;
  sortType: SortType;
}
