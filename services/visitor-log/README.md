# 私人来访记录

网站仍在 GitHub Pages，浏览器把页面访问发送到独立的 Cloudflare Worker，由 D1 保存记录。

- 查看页面：<https://visits.xh-diary.me/admin>
- 收集接口：`https://visits.xh-diary.me/collect`
- 本机管理密钥：本目录的 `admin-key.txt`（不提交到 Git）。粘贴到查看页面即可登录。
- 管理密钥仅放在 Cloudflare Secret `ADMIN_TOKEN`；不在 Quartz 配置、网站脚本或网页源码中。
- 本机 `.env.production` 用于首次部署密钥，同样不提交到 Git。备份密钥到密码管理器。

## 记录内容与边界

记录服务器时间、页面路径、公网 IP、国家、省份和城市。地理信息来自 Cloudflare `request.cf`，IP 来自 `CF-Connecting-IP`，不接受浏览器提交的 IP 或位置。地理信息缺失时显示未知，不请求浏览器 GPS 权限。页面时间显示为北京时间。

默认只展示最近 30 天，每天北京时间 03:17 删除过期记录。实际删除可能受定时任务触发延迟影响。IP 不等于身份、IP 数不等于人数，位置可能是运营商或 VPN 出口。

首次打开、Quartz SPA 切换页面、浏览器返回缓存页面会记录；重复初始化和同一路径的重复事件不重复记录。每个事件有随机去重 ID，不使用持久化访客 ID、Cookie 或指纹。不保存正文、标题、URL 查询参数和片段。隐私设置 DNT/GPC、本地预览、后台未读页面、广告拦截器和网络问题可能导致漏记。公开收集接口不是防机器人或审计系统，Origin 校验不能阻止非浏览器客户端伪造事件；限流可降低滥用。

收集端每 IP 每分钟限 60 次；后台每 IP 每分钟限 20 次。Cloudflare 限流按位置执行，是近似保护而非全局严格计数。后台 API 需要管理密钥，不提供跨域读取；返回内容禁止缓存。密钥仅在页面内存保存，刷新、离开或退出清空。

## 日常修改与验证

在本目录执行：

```powershell
npm ci
npm test
npx wrangler login
npm run deploy
```

`wrangler.json` 是此网站的部署配置，包含非机密数据库 ID 和自定义子域名。普通部署会保留现有 Secret。数据库结构变更后先运行 `npm run db:remote`。主网站插件或配置改动需推送主仓库 `main`，GitHub Actions 会重建网站。修改 Worker 则需单独部署，不会随 GitHub Pages 自动发布。

更换密钥：

```powershell
npx wrangler secret put ADMIN_TOKEN
```

交互输入至少 6 字符的密钥，并同步更新本机保存的副本。不要将密钥作为命令行参数、提交到仓库或填入 Quartz 配置。

## 本地验证

在本目录新建被忽略的 `.dev.vars`，内容为 `ADMIN_TOKEN=` 加一个至少 6 字符的测试密钥，然后执行：

```powershell
npm run db:local
npm run dev
```

访问终端给出的本地地址。本地没有真实 Cloudflare 地理数据。SQLite 测试覆盖服务端可信 IP、权限隔离、输入校验、分页、保留期和错误处理；浏览器模拟测试覆盖首次加载、SPA 导航、缓存恢复与隐私设置。

## 迁移至其他账号

复制 `wrangler.example.json` 为 `wrangler.json`；登录目标账号，执行 `npx wrangler d1 create xh-diary-visits`，将返回 ID 填入配置；执行 `npm run db:remote`，设置 Secret 后部署。配置自定义域名后，将 `/collect` 地址填写到主仓库 `quartz.config.yaml` 的 `visitor-log` 插件。若更换网站域名，同步修改 `ALLOWED_ORIGINS` 和插件中允许采集的域名。

## 停用

将 `quartz.config.yaml` 中本插件设为 `enabled: false` 并重新发布网站即可停止浏览器上报。已有记录按保留期自动清理；立即停止服务可在 Cloudflare 禁用 Worker 路由。

## Umami 历史记录

后台的“近期访问”显示当前采集的 30 天记录；“Umami 历史”显示独立导入的数据。历史表不受自动清理规则影响。Umami 未保存原始 IP，因此历史记录显示“未记录”，只统计原始会话数，不计入不同 IP 数。两种来源独立展示，避免重叠时间段的访问量相加造成误解。

Umami Cloud 的 **Settings → Data → Export** 可导出所选网站和时间范围的数据，下载链接发送至账号邮箱。需要原始逐次事件数据，聚合图表 CSV 不能还原逐条访问。保留导出文件在本目录 `.imports/` 或其他不受 Git 跟踪的位置，切勿提交访客数据。

先执行迁移和验证：

```powershell
npm ci
npm run db:remote
node scripts/import-umami.mjs --events .imports/website_event.csv.gz --sessions .imports/session.csv.gz --website ea473a69-2b12-46a5-af9f-a5d4b6858fdb
```

文件名以实际导出为准；可读取普通 CSV、gzip CSV 和 JSON 数组。默认只校验并输出条数、时间范围、地区缺失数，不写入线上数据。日期缺少时区时按 UTC 解释，导入前须与 Umami 的同一时间范围统计核对。只有事件编号、网站编号、页面路径、有效访问时间明确的页面访问事件才会进入历史表。自定义事件和其他网站记录不导入；URL 参数、片段和任何 IP 字段不导入。

检查报告 `.imports/last-report.json` 后，在同一命令末尾加 `--apply` 写入数据库，再执行 `npm run deploy` 发布历史查看功能。按“网站 ID + 原始事件 ID”去重，分批写入失败后可重新运行；重复执行不会增加访问量。时间相同的访问也能稳定分页。若导出文件的事件行已经包含地区信息，可省略 `--sessions`；否则须同时提供会话文件才能关联地区。不要用空的会话文件导入后再指望重复执行自动补全地区。
