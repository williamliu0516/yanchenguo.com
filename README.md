# yanchenguo.com

Yanchen Guo 的 Interactive Design 作品集网站。纯静态 HTML / CSS / JS，没有构建步骤，托管在 GitHub Pages。

## 本地预览

```sh
python3 -m http.server 8000
# 打开 http://localhost:8000
```

## 文件结构

```
index.html                    首页（夜色主题 .home）：光影首屏 → 作品网格 → About → Contact
work/invisible-violence.html  作品 01（暗棕主题）
work/pica.html                作品 02（浅紫主题）
work/disease-museum.html      作品 03（深蓝主题）
work/afterdream.html          作品 04（浅紫 + 夜蓝主题，没有视频）
work/example.html             旧的详情页模板（新作品建议直接复制上面任意一页）
404.html                      找不到页面
assets/css/style.css          全部样式；作品页主题在 “Project pages” 一节（.theme-iv / .theme-dm / .theme-pica / .theme-ad），首页和 404 在 “Home” 一节（.home）。小字统一是 Instrument Serif 斜体（--mono），名字和大标题是 Syne（--brand）
assets/js/light.js            首屏 WebGL 光影
assets/js/main.js             平滑滚动、揭开动画、视差、光标、页面切换、作品页放大查看器
assets/img/<作品>/            每个作品一个文件夹
```

## 作品页的图片

作品集 board 原图是左右两页的 spread（6912×2112），已经从中间切开成单页，按顺序一页接一页排：

- `01.webp` … `08.webp`：网页显示用，1800px 宽
- `01-xl.webp` …：原尺寸 3456px 宽，高清屏和点击放大时用（Invisible Violence 的 01、02 原图只有一半分辨率，所以没有 -xl）
- `cover.webp`：首页封面，4:3，从第一页裁出来的

点击任意一页会打开放大查看器：再点图片放大到能看清小字（可拖动/滚动），← → 翻页，Esc 关闭。

## 换成真实内容

还没填的地方标了 `TODO(内容)`：

```sh
grep -rn "TODO(内容)\|\[Placeholder\]\|placeholder" index.html work/
```

### 加第 4 个作品

1. 新建 `assets/img/<作品名>/`，放 `01.webp`、`01-xl.webp`…和 `cover.webp`
2. 复制一个现成作品页（比如 `work/pica.html`），改名、改文字、改图片路径，`<body class="project theme-…">` 选一个主题或在 CSS 里加一个新主题
3. 首页把 `work-item--soon` 那一块换成和前三个一样的卡片
4. 改上一个作品页底部 “Next project” 的链接

### 图片建议

- 首页封面 1200×900（4:3）
- 作品页单页 1800px 宽 + 原尺寸 -xl 一份
- 转换：`cwebp -q 82 -resize 1800 0 page.png -o 01.webp`

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
