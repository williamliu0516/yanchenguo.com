# yanchenguo.com

Yanchen Guo 的 Interactive Design 作品集网站。纯静态 HTML / CSS / JS，没有构建步骤，托管在 GitHub Pages。

## 本地预览

```sh
python3 -m http.server 8000
# 打开 http://localhost:8000
```

## 文件结构

```
index.html            首页：光影首屏 → 宣言 → 作品 → 跑马灯 → About → Contact
work/example.html     作品详情页模板（每个作品复制一份）
404.html              找不到页面
assets/css/style.css  全部样式
assets/js/light.js    首屏 WebGL 光影（鼠标就是光源）
assets/js/main.js     平滑滚动、揭开动画、视差、光标、卡片倾斜反光、跑马灯、页面切换
assets/js/vendor/     Lenis 平滑滚动库（本地保存，不依赖 CDN）
assets/img/           放图片
```

## 换成真实内容

所有要换的地方都标了 `TODO(内容)`：

```sh
grep -rn "TODO(内容)\|\[Placeholder\]\|placeholder" index.html work/
```

### 作品封面

首页每个作品是一个 `<article class="work-item">`，版式按 4 个一组循环：

| 位置 | 版式 | 封面比例 |
|---|---|---|
| 第 1 个 | 通栏 | 16:9 |
| 第 2 个 | 偏左 | 4:3 |
| 第 3 个 | 偏右、下沉 | 3:4 竖图 |
| 第 4 个 | 居中 | 16:10 |

换封面：把 `<div class="art art-1"></div>` 换成

```html
<img class="art" src="assets/img/project-one.jpg" alt="Project One" loading="lazy">
```

然后删掉同一张卡片里的 `<span class="ph-tag">…</span>`。

### 作品详情页

1. 复制 `work/example.html`，改名，比如 `work/echo.html`
2. 改标题、简介、项目信息、图片
3. 首页对应卡片的 `href` 改成 `work/echo.html`
4. 详情页底部的 “Next project” 指向下一个作品

详情页里的图片路径要带 `../`，例如 `../assets/img/echo-01.jpg`。主视觉也可以用视频：

```html
<video class="art" src="../assets/video/echo.mp4" autoplay muted loop playsinline></video>
```

### 图片建议

- 通栏图 2400px 宽，其它 1600px 宽
- JPG 或 WebP，质量 80 左右，每张尽量 < 500 KB
- 视频 MP4 (H.264)，静音，尽量 < 8 MB

## 发布

推到 `main` 分支，约 1 分钟后生效。

## 域名 (GoDaddy DNS)

| 类型 | 名称 | 值 |
|---|---|---|
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | `<GitHub 用户名>.github.io` |

DNS 生效后，在仓库 Settings → Pages 里把 Custom domain 设为 `yanchenguo.com`，等证书签发后勾选 Enforce HTTPS。

## 转给她自己的账号

1. 她注册一个 GitHub 账号
2. 本仓库 Settings → General → Danger Zone → Transfer ownership，填她的用户名
3. 转移后 Pages 设置和自定义域名会一起带过去；GoDaddy 里的 `www` CNAME 改成 `<她的用户名>.github.io`，4 条 A 记录不用动
4. 建议她在自己账号 Settings → Pages → Add a domain 验证 `yanchenguo.com`，防止域名被别人抢绑
5. 域名本身在 GoDaddy，2027-03-05 到期，记得续费或转到她名下
