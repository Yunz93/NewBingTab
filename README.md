# NewBingTab

一个极简的新标签页扩展：打开浏览器就是一张壁纸和一个搜索框，不塞新闻，不塞推荐流。

![NewBingTab 预览](https://github.com/Yunz93/PicRepo/raw/main/image/NewBingTab.png)

## 当前能力

- 替换浏览器默认新标签页
- 打开新标签页时自动检查并更新 Bing 每日壁纸
- 支持 Google、Bing、Baidu 三个搜索引擎
- 记住上一次选择的搜索引擎
- 壁纸接口失败时，自动回退到缓存图或默认渐变背景

## 项目结构

- `manifest.json`：Chrome Extension Manifest V3 配置
- `index.html`：新标签页结构
- `styles.css`：页面样式
- `script.js`：搜索、存储、壁纸刷新逻辑
- `src/`：扩展图标资源

## 权限说明

- `storage`
  - 用于保存搜索引擎选择和壁纸缓存信息
- `https://cn.bing.com/*`
  - 用于请求 Bing 每日壁纸元数据

当前版本不再申请 `activeTab`，因为并没有直接操作标签页内容。

## 安装方式

1. 下载项目文件到本地。
2. 打开 `chrome://extensions/` 或 `edge://extensions/`。
3. 开启“开发者模式”。
4. 点击“加载已解压的扩展程序”。
5. 选择当前项目目录。

## GitHub Actions

- 仓库已配置 [`.github/workflows/build-extension.yml`](.github/workflows/build-extension.yml)
- 每次 `push` 和 `pull_request` 都会自动校验 `manifest.json` 并打包扩展
- 构建产物会作为 Actions Artifact 上传，名称为 `chrome-extension-package`
- 推送形如 `v1.0.0` 的 tag 时，会触发 [`.github/workflows/release-extension.yml`](.github/workflows/release-extension.yml) 自动创建 GitHub Release 并上传 zip
- 本地也可以直接运行 `bash scripts/package-extension.sh`，产物会输出到 `dist/`

## 手动验证清单

- 首次打开新标签页时，页面能正常展示搜索面板
- 输入关键词后可以跳转到所选搜索引擎
- 切换搜索引擎后，刷新新标签页仍能保留选择
- 断网或壁纸接口失败时，页面仍有可用背景
- 在窄窗口下，搜索框、选择器和按钮不会挤出视口

## 已知限制

- 壁纸来源依赖 Bing 在线接口，接口不可用时只能回退到缓存或默认背景
- 当前搜索引擎列表是写死的，如需自定义需要继续扩展设置能力
- 项目仍是零构建静态结构，适合轻量维护，不适合复杂功能快速膨胀
