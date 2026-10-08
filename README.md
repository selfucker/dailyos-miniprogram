# miniprogram-demo

微信原生小程序 · 个人成长工作台 DailyOS 的前端工程。当前为 P0 + P1：5 Tab 导航 + 全局视觉系统 + 首页 Dashboard 用 mock 数据跑起来。

## 目录结构

```
miniprogram-demo/
├── app.js / app.json / app.wxss       # 入口 + 全局设计令牌
├── sitemap.json / project.config.json
├── utils/                             # request / date / format / mock
├── components/                        # card / progress-bar / section-header
├── images/tab/                        # 5 个 Tab 的 SVG 图标（×2 状态 = 10 个）
└── pages/
    ├── index/                         # 首页 Dashboard（已落地视觉稿）
    ├── english/                       # 英语 Tab 占位页
    ├── fitness/                       # 健身 Tab 占位页
    ├── account/                       # 记账 Tab 占位页
    └── profile/                       # 我的 Tab 占位页
```

## 在开发者工具里打开

1. 微信开发者工具 → 导入项目 → 选本目录
2. AppID 已绑定：tester profile 1ac3e868f6f662ab
3. 编译后应看到 5 Tab + 首页 Dashboard 长得和设计稿一致

## 联调后端

`utils/request.js` 默认 `BASE_URL = http://localhost:8080/api/v1`。

在「微信开发者工具」里勾选「不校验合法域名」（开发期）即可联调本机后端。

## 设计语言摘要

| 角色 | 色值 |
| --- | --- |
| `bg` 纸面底 | `#F8F5EE` |
| `surface` 卡面 | `#FFFFFF` |
| `ink` 主文字 | `#161616` |
| `muted` 次文字 | `#6B6660` |
| `brand` 主色 | `#2D5F3F` |
| `accent` 暖金 | `#C4A35A` |
| `urgent` 深陶橙 | `#B5482E` |

字体：英文衬线（Charter / Georgia）+ 中文系统栈；圆角 14rpx，卡间距 20rpx。

## 当前状态

- [x] 5 Tab 视觉骨架
- [x] 全局色板 / 字族 / 按钮归零
- [x] 首页 Dashboard（mock 数据）
- [x] 英语 / 健身 / 记账 / 我的 占位页
- [x] `utils/request.js` 封装（未启用）
- [ ] P2 起：把英语、健身、记账、新闻的 CRUD 接上后端

## 下一步

1. 启动 `dailyos-backend`（参考 [dailyos-backend/README.md](../dailyos-backend/README.md)）
2. 接入 `wx.login` → `/auth/wx-login` 真实链路
3. Dashboard 从 mock 切到 `/dashboard/today`
