# 项目配置摘要

## 基本信息

- **项目名称**: BTC新闻聚合器2025
- **版本**: 3.0.0
- **平台**: Cloudflare Workers
- **起始ID**: 488209
- **更新时间**: 2025年1月

## 关键配置

### 监控关键词（共9个）

1. BTC
2. btc
3. Bitcoin
4. bitcoin
4. BITCOIN
5. 中国
6. 中本聪
7. 特朗普
8. 美联储

### 定时任务配置

- **频率**: 每30分钟执行一次
- **Cron 表达式**: `*/30 * * * *`
- **说明**: 在每小时的第0分钟和第30分钟执行

### KV 数据库配置

- **命名空间名称**: btcnews2025
- **命名空间ID**: 6514ec5dffd14610b39e8a85c0309496
- **绑定名称**: BTC_NEWS_KV
- **存储内容**:
  - `btc_news_data`: 新闻列表（最多100条）
  - `last_processed_id`: 上次处理的资讯ID
  - `last_cron_execution`: 上次定时任务执行记录

### 数据抓取配置

- **数据源**: 金色财经 (https://www.jinse.cn/lives/)
- **起始ID**: 488209
- **单次最大抓取数**: 30条
- **存储上限**: 100条
- **搜索范围**: 从上次ID开始，向后搜索100个ID
- **请求延迟**: 400ms（避免请求过快）

## 文件结构

```
btc-news-aggregator-2025/
├── src/
│   └── index.js              # 主应用代码（726行）
├── wrangler.toml             # Cloudflare Workers 配置
├── package.json              # 项目依赖
├── .gitignore               # Git 忽略规则
├── README.md                 # 项目说明
├── DEPLOYMENT.md             # 详细部署文档
├── 部署教程.md               # 快速部署指南
├── PROJECT_SUMMARY.md        # 本文件
└── index.js                  # 旧的打包文件（可删除）
```

## API 接口列表

| 路径 | 方法 | 说明 |
|------|------|------|
| `/` | GET | 首页，显示新闻列表（HTML） |
| `/api/news` | GET | 获取新闻列表（JSON） |
| `/api/refresh` | GET | 手动触发抓取 |
| `/api/status` | GET | 查看系统状态 |
| `/api/reset?id=488209` | GET | 重置系统，设置新起始ID |

## 部署命令

```bash
# 安装依赖
npm install

# 登录 Cloudflare
npm run login

# 本地开发
npm run dev

# 部署到生产
npm run deploy

# 查看日志
npm run tail
```

## 环境要求

- Node.js >= 16.x
- npm >= 7.x
- Cloudflare 账号
- Cloudflare Workers Paid Plan（用于 Cron 触发器）

## 注意事项

1. **Cron 限制**: Cron 触发器需要 Workers Paid Plan（$5/月）
2. **请求频率**: 代码中设置了400ms的请求延迟，避免过快请求
3. **数据存储**: KV 中最多保留100条新闻
4. **ID 递增**: 金色财经的资讯ID是递增的，代码利用这一特性进行增量抓取
5. **关键词过滤**: 只有标题包含关键词的新闻才会被保存

## 监控建议

1. 每天检查 `/api/status` 确认系统正常运行
2. 定期运行 `npm run tail` 查看抓取日志
3. 每周验证新闻是否正常更新
4. 如果长时间没有新新闻，考虑调整起始ID或关键词

## 优化建议

1. **关键词优化**: 根据实际需求添加或删除关键词
2. **频率调整**: 根据新闻更新频率调整 Cron 配置
3. **存储优化**: 根据需求调整保留的新闻数量
4. **缓存策略**: 可以添加 Cloudflare Cache API 提升访问速度

## 版本历史

- **v3.0.0** (2025-01)
  - 起始ID更新为 488209
  - 更新频率改为30分钟
  - 关键词精简为9个核心词
  - KV命名空间更新为 btcnews2025
  
- **v2.0.0** (2024-11)
  - 从HTML抓取改为API抓取
  - 优化ID递增搜索策略

- **v1.0.0**
  - 初始版本
  - 基础HTML抓取功能
