# page-navigation

本地 Quartz 组件插件：在每篇文章正文下方（`afterBody`）加入「上一篇 / 下一篇」导航。

## 行为

- **范围**：只在同一个文件夹内查找（`Diary` 里的文章只在 `Diary` 之间跳转，`Note` 只在 `Note` 之间）。
- **排序**：按日期从新到旧。日期优先取文件名中的 `YYYY-MM-DD`（适配日记），取不到再回退到页面的 created / modified / published 日期。
- **方向**：「下一篇」= 日期更早的一篇，「上一篇」= 日期更新的一篇。
- 文件夹首页（`index`）、未列出（unlisted）页面不参与；当某篇没有上一篇或下一篇时，对应入口留空占位以保持左右对齐；两边都没有时整个组件不渲染。

## 配置

在 `quartz.config.yaml` 的 `plugins` 列表中：

```yaml
- source: ./plugins/page-navigation
  enabled: true
  options:
    prevLabel: 上一篇
    nextLabel: 下一篇
  layout:
    position: afterBody
    priority: 20
```

`prevLabel` / `nextLabel` 可自定义文案。

## 说明

这是一个**本地、免构建**插件：Quartz 直接软链 `dist/`，不会执行 `npm install` / `npm run build`。
因此 **`dist/components/index.js` 就是源码本体**，直接改它即可（无需编译步骤）。
