# BTC 新闻聚合器 2025

🚀 一个部署在 Cloudflare Workers 上的比特币新闻聚合网站，专注于金融科技领域的重要资讯。

## ✨ 功能特点

- 📰 **智能抓取**：自动从金色财经抓取最新资讯
- 🎯 **精准过滤**：基于关键词智能筛选相关新闻
- ⏰ **定时更新**：每 30 分钟自动刷新一次
- 💾 **云端存储**：使用 Cloudflare KV 存储数据
- 📱 **响应式设计**：完美适配移动端和桌面端
- 🎨 **现代界面**：渐变色卡片式设计，视觉效果出色

## 🔍 监控关键词

本项目监控以下关键词相关的新闻：

- **BTC** / **bitcoin** - 比特币相关
- **中国** - 中国市场动态
- **中本聪** - 比特币创始人相关
- **特朗普** - 美国政治影响
- **美联储** - 货币政策相关

## 🏗️ 技术架构

- **平台**：Cloudflare Workers (无服务器)
- **数据库**：Cloudflare KV (键值存储)
- **定时任务**：Cloudflare Cron Triggers
- **语言**：原生 JavaScript (ES6+)
- **数据源**：金色财经

## 📋 项目结构

```
btc-news-aggregator-2025/
├── src/
│   └── index.js          # 主应用代码
├── wrangler.toml         # Cloudflare Workers 配置
├── package.json          # 项目依赖配置
├── README.md             # 项目说明文档（本文件）
├── DEPLOYMENT.md         # 详细部署文档
└── .gitignore           # Git 忽略文件
```

## 🚀 快速开始

### 1. 前置要求

- Node.js 16.x 或更高版本
- npm 或 yarn
- Cloudflare 账号

### 2. 安装依赖

```bash
npm install
```

### 3. 登录 Cloudflare

```bash
npm run login
```

### 4. 本地开发

```bash
npm run dev
```

访问 `http://localhost:8787` 查看效果

### 5. 部署到生产环境

```bash
npm run deploy
```

## 📊 API 接口

### 获取新闻列表

```
GET /api/news
```

返回 JSON 格式的新闻列表

### 手动刷新

```
GET /api/refresh
```

立即触发一次新闻抓取

### 系统状态

```
GET /api/status
```

查看系统运行状态和统计信息

### 重置系统

```
GET /api/reset?id=488209
```

重置系统并设置新的起始 ID

## ⚙️ 配置说明

### KV 数据库配置

在 `wrangler.toml` 中配置：

```toml
[[kv_namespaces]]
binding = "BTC_NEWS_KV"
id = "6514ec5dffd14610b39e8a85c0309496"
```

### Cron 定时任务配置

每 30 分钟执行一次：

```toml
[triggers]
crons = ["*/30 * * * *"]
```

## 🔧 核心参数

| 参数 | 值 | 说明 |
|------|-----|------|
| 起始ID | 488209 | 金色财经资讯起始ID |
| 更新频率 | 30分钟 | 自动抓取间隔 |
| 存储数量 | 100条 | KV中保留的最大新闻数 |
| 单次抓取 | 30条 | 每次最多抓取的新闻数 |
| KV命名空间 | btcnews2025 | 数据库名称 |

## 📝 数据结构

每条新闻包含以下字段：

```javascript
{
  id: 488209,                    // 金色财经资讯ID
  title: "新闻标题",              // 标题
  content: "新闻内容摘要",        // 内容
  time: "2025-01-15 10:30",      // 发布时间（北京时间）
  link: "https://...",           // 原文链接
  source: "金色财经",             // 来源
  scraped_at: "2025-01-15T..."   // 抓取时间（ISO格式）
}
```

## 🎯 工作原理

1. **定时触发**：Cloudflare Cron 每 30 分钟触发一次
2. **智能搜索**：从上次处理的ID开始，递增搜索新资讯
3. **关键词过滤**：只保留包含指定关键词的新闻
4. **数据存储**：新闻保存到 Cloudflare KV 数据库
5. **页面展示**：访问首页即可查看最新新闻

## 🔍 调试与监控

### 查看实时日志

```bash
npm run tail
```

### 检查系统状态

访问：`https://your-worker.workers.dev/api/status`

### 手动触发更新

访问：`https://your-worker.workers.dev/api/refresh`

## 🛠️ 常见问题

### Q: 如何修改关键词？

A: 编辑 `src/index.js` 中的 `isBTCRelated` 方法，修改 `keywords` 数组。

### Q: 如何修改更新频率？

A: 编辑 `wrangler.toml` 中的 `crons` 配置：
- 每小时：`["0 * * * *"]`
- 每30分钟：`["*/30 * * * *"]`
- 每15分钟：`["*/15 * * * *"]`

### Q: 如何更换起始ID？

A: 访问 `/api/reset?id=新ID` 或编辑 `src/index.js` 中的 `getLastProcessedId` 方法。

### Q: 如何查看抓取日志？

A: 运行 `npm run tail` 查看实时日志，或在 Cloudflare Dashboard 中查看日志。

## 📖 更多文档

- [详细部署文档](./DEPLOYMENT.md)
- [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
- [Cloudflare KV 文档](https://developers.cloudflare.com/kv/)

## 📄 开源协议

MIT License

## 👨‍💻 作者

欢迎提交 Issue 和 Pull Request！

---

**注意**：本项目仅用于学习和研究目的，请遵守相关网站的使用条款和爬虫协议。
