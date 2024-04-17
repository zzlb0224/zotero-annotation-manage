# ![笔记标签整Zotero的笔记整理理](addon/chrome/content/icons/favicon.png)Zotero的笔记整理

[![zotero target version](https://img.shields.io/badge/Zotero-7-green?style=flat-square&logo=zotero&logoColor=CC2936)](https://www.zotero.org)
[![Using Zotero Plugin Template](https://img.shields.io/badge/Using-Zotero%20Plugin%20Template-blue?style=flat-square&logo=github)](https://github.com/windingwind/zotero-plugin-template)

一个tag管理工具，方便自己管理annotation和tag，进行各种汇总统计，让笔记不白做。

希望能够实现自己关于笔记整理的想法

## 有趣的图标

😺❎✅❌🐉🦀🐓🦋🌸⭐🌟✨📍🅰️⛔🚫❓

## TODO

- 增加分割标签的功能[已完成]
- 增加按搜索注释和标签导出的功能[已完成]
- ...

## 注意

- 需要安装 [@windingwind](https://github.com/windingwind)的[BetterNotes](https://github.com/windingwind/zotero-better-notes/releases/) 才能使用导出功能。
- 仅支持Zotero 7.0。

## 功能介绍

- 添加注释
- 导出注释为笔记
- 一些自用的功能

### 第一个功能 添加注释

分为了两种。一种是选择文字弹出笔记，还有一种是在已有笔记中添加标签

#### 注释菜单1

![注释菜单1](./doc/注释菜单1.png)

#### 注释菜单2

![注释菜单2](./doc/注释菜单2.png)

#### 弹出框

![弹出框](./doc/弹出框.png)

#### 选择文本

![选择文本](./doc/选择文本.png)

### 第二个功能 导出注释为笔记

我觉得笔记就是用来复习自己看的文章的，这个功能是官方的【通过注释添加笔记】功能的补充

#### 陆续会增加不同格式的导出

![选中条目的右键菜单](./doc/选中条目的右键菜单.png)

![按不同tag导出](./doc/按不同tag导出.png)

### 第三个功能 注释双链

目前想到的场景是，文献来源可以标记了，后期会出一个注释链接的导出功能。显示当前注释链接到了哪个文献，特别是写综述的时候有用。

#### 操作

第一步、在要添加双链的地方添加批注, 然后选中这个批注, 按下Ctrl+c按键复制这个批注到剪切板。也可以选择多个已经做好的批注。这样就把链接的目标批注设置好了。 ![复制注释](doc/3.1复制注释.png)
第二步、在要关联双链的添加批注, 然后选中这个批注, 点击添加关联。这样就设置好了这些批注的关联关系! [关联关系](doc/3.2添加关联.png)
完成以上2个步骤, 就表示链接完成, 可以幸福的使用双链浏览功能了。![双链浏览](doc/3.3显示关联的注释，点击跳转到对应pdf.png)
双链浏览功能能在不同的pdf之间跳转，我觉得非常有用。于是就实现了它。
![动画演示](doc/3双链操作.gif)

## 感谢

本插件基于[@windingwind](https://github.com/windingwind)的[zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template)开发，在此表示感谢。

感谢[@windingwind](https://github.com/windingwind)开发工具箱，[Zotero Plugin Toolkit](https://github.com/windingwind/zotero-plugin-toolkit)。

导出标签的灵感来自 ，[Ze-Notes](https://github.com/frianasoa/Ze-Notes)，非常好用的一个笔记整理方案。

Nested Tags 的灵感来自 [Zotero-Style](https://github.com/MuiseDestiny/zotero-style)，一直在用这个插件。Nested Tags 相关的内容仅仅为自己方便添加标签而设计。

注释双链灵感来自 [@YaoLiMuMu](https://github.com/windingwind/zotero-actions-tags/discussions/296)，非常好的注释链接方案。同时感谢 @Geo123abc 提供的双链代码。目前采用dc:relation建立双链，和条目的链接信息是一样的。目前做的只能链接到注释，未来可能做到和条目链接。

## Reminder

- This plugin required @windingwind's [BetterNotes](https://github.com/windingwind/zotero-better-notes/releases/)
- Only supports Zotero 7.0

## Disclaimer

This plugin based on @windingwind's [zotero-plugin-template](https://github.com/windingwind/zotero-plugin-template)，many thanks for his team's hard working。

We also acknowledge @windingwind's [Zotero Plugin Toolkit](https://github.com/windingwind/zotero-plugin-toolkit)。

## License

Use this code under AGPL. No warranties are provided. Keep the laws of your locality in mind!
