# BTC 新闻聚合器 - 详细部署文档

本文档提供完整的部署步骤和配置说明，帮助你快速将项目部署到 Cloudflare Workers。

## 📋 目录

1. [准备工作](#准备工作)
2. [创建 KV 命名空间](#创建-kv-命名空间)
3. [配置项目](#配置项目)
4. [本地开发](#本地开发)
5. [部署到生产环境](#部署到生产环境)
6. [验证部署](#验证部署)
7. [常见问题](#常见问题)

---

## 🎯 准备工作

### 1. 系统要求

- **Node.js**: 16.x 或更高版本
- **npm**: 7.x 或更高版本
- **Git**: 用于版本控制
- **Cloudflare 账号**: [注册地址](https://dash.cloudflare.com/sign-up)

### 2. 检查环境

```bash
# 检查 Node.js 版本
node --version

# 检查 npm 版本
npm --version
```

### 3. 克隆或下载项目

如果你还没有项目代码，可以创建新目录：

```bash
mkdir btc-news-aggregator-2025
cd btc-news-aggregator-2025
```

---

## 🗄️ 创建 KV 命名空间

### 方式一：使用命令行创建（推荐）

```bash
# 1. 安装 wrangler
npm install -g wrangler

# 2. 登录 Cloudflare
wrangler login

# 3. 创建 KV 命名空间
wrangler kv:namespace create btcnews2025

# 4. 记录返回的 ID
# 输出示例：
# ✨ Success!
# Add the following to your wrangler.toml:
# id = "6514ec5dffd14610b39e8a85c0309496"
```

### 方式二：使用 Cloudflare Dashboard

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 选择你的账户
3. 导航到 **Workers & Pages** → **KV**
4. 点击 **Create namespace**
5. 命名空间名称：`btcnews2025`
6. 点击 **Add**
7. 记录创建的 **Namespace ID**：`6514ec5dffd14610b39e8a85c0309496`

---

## ⚙️ 配置项目

### 1. 安装项目依赖

```bash
npm install
```

### 2. 配置 wrangler.toml

确保 `wrangler.toml` 文件配置正确：

```toml
name = "btc-news-aggregator-2025"
main = "src/index.js"
compatibility_date = "2024-01-01"

# KV 数据库绑定
[[kv_namespaces]]
binding = "BTC_NEWS_KV"
id = "6514ec5dffd14610b39e8a85c0309496"  # 替换为你的 KV ID

# Cron 定时任务 - 每30分钟执行
[triggers]
crons = ["*/30 * * * *"]

[vars]
ENVIRONMENT = "production"
```

### 3. 修改项目名称（可选）

在 `wrangler.toml` 中修改 `name` 字段：

```toml
name = "你的项目名称"
```

注意：项目名称将成为 Workers 的子域名，格式为：`你的项目名称.workers.dev`

---

## 💻 本地开发

### 1. 启动本地开发服务器

```bash
npm run dev
```

或使用 wrangler 命令：

```bash
wrangler dev
```

### 2. 访问本地服务

打开浏览器访问：`http://localhost:8787`

### 3. 测试 API 接口

```bash
# 获取新闻列表
curl http://localhost:8787/api/news

# 手动刷新
curl http://localhost:8787/api/refresh

# 查看系统状态
curl http://localhost:8787/api/status

# 重置系统
curl http://localhost:8787/api/reset?id=488209
```

### 4. 查看实时日志

```bash
npm run tail
```

---

## 🚀 部署到生产环境

### 1. 登录 Cloudflare

```bash
npm run login
```

或

```bash
wrangler login
```

浏览器会打开 Cloudflare 授权页面，点击 **Allow** 授权。

### 2. 部署项目

```bash
npm run deploy
```

或

```bash
wrangler deploy
```

### 3. 部署输出示例

```
✨ Success!
Published btc-news-aggregator-2025
  https://btc-news-aggregator-2025.your-account.workers.dev
```

记录返回的 URL，这就是你的生产环境地址！

---

## ✅ 验证部署

### 1. 访问生产环境

在浏览器中打开部署返回的 URL：

```
https://btc-news-aggregator-2025.your-account.workers.dev
```

### 2. 检查系统状态

访问状态 API：

```
https://btc-news-aggregator-2025.your-account.workers.dev/api/status
```

应该返回类似的 JSON：

```json
{
  "totalNews": 0,
  "lastProcessedId": 488209,
  "lastUpdate": "暂无数据",
  "serverTime": "2025-01-15 14:30",
  "cronStatus": "未知",
  "version": "3.0.0-30min-488209"
}
```

### 3. 手动触发第一次抓取

访问刷新 API：

```
https://btc-news-aggregator-2025.your-account.workers.dev/api/refresh
```

等待几秒后，再次访问首页，应该能看到新闻了！

### 4. 查看生产日志

```bash
npm run tail
```

或在 Cloudflare Dashboard 中查看日志：

1. 进入 **Workers & Pages**
2. 选择你的 Worker
3. 点击 **Logs** 标签

---

## 🔧 高级配置

### 自定义域名绑定

1. 在 Cloudflare Dashboard 中进入 **Workers & Pages**
2. 选择你的 Worker
3. 点击 **Triggers** 标签
4. 在 **Custom Domains** 部分点击 **Add Custom Domain**
5. 输入你的域名（需要已添加到 Cloudflare）
6. 点击 **Add Custom Domain**

### 修改 Cron 频率

在 `wrangler.toml` 中修改 `crons` 配置：

```toml
# 每小时执行
crons = ["0 * * * *"]

# 每30分钟执行（当前配置）
crons = ["*/30 * * * *"]

# 每15分钟执行
crons = ["*/15 * * * *"]

# 每天早上8点执行
crons = ["0 8 * * *"]
```

修改后重新部署：

```bash
npm run deploy
```

### 修改关键词

编辑 `src/index.js`，找到 `isBTCRelated` 方法：

```javascript
isBTCRelated(text) {
  if (!text) return false;
  
  const keywords = [
    'BTC',
    'bitcoin',
    '中国',
    '中本聪',
    '特朗普',
    '美联储'
    // 在这里添加更多关键词
  ];
  
  return keywords.some(keyword => text.includes(keyword));
}
```

修改后重新部署：

```bash
npm run deploy
```

### 修改起始 ID

方式一：通过 API 重置

```
https://your-worker.workers.dev/api/reset?id=新的ID
```

方式二：修改代码

编辑 `src/index.js`，找到 `getLastProcessedId` 方法：

```javascript
async getLastProcessedId() {
  try {
    const lastId = await this.env.BTC_NEWS_KV.get('last_processed_id');
    return lastId ? parseInt(lastId) : 488209; // 修改这里的默认值
  } catch (error) {
    console.error('获取上次处理ID失败:', error);
    return 488209; // 修改这里的默认值
  }
}
```

---

## 🐛 常见问题

### 问题 1：部署时提示 "Authentication required"

**解决方案**：

```bash
wrangler logout
wrangler login
```

### 问题 2：KV 读写失败

**原因**：KV 命名空间 ID 不正确或未绑定

**解决方案**：

1. 检查 `wrangler.toml` 中的 KV ID 是否正确
2. 确认 binding 名称为 `BTC_NEWS_KV`
3. 在 Cloudflare Dashboard 中验证 KV 命名空间存在

### 问题 3：Cron 任务不执行

**原因**：Cron 触发器需要在 Workers Paid Plan 上才能使用

**解决方案**：

1. 升级到 Workers Paid Plan（$5/月）
2. 或使用外部定时任务服务（如 Uptime Robot）定期访问 `/api/refresh`

### 问题 4：本地开发无法连接 KV

**解决方案**：

```bash
# 使用 --remote 标志连接远程 KV
wrangler dev --remote
```

### 问题 5：抓取不到新闻

**可能原因**：

1. 起始 ID 太旧，没有匹配的新闻
2. 关键词过滤太严格
3. 金色财经网站结构变化

**调试方法**：

```bash
# 查看实时日志
npm run tail

# 手动触发抓取并观察日志
# 访问 /api/refresh
```

### 问题 6：部署后页面显示空白

**解决方案**：

1. 检查浏览器控制台是否有错误
2. 访问 `/api/status` 检查系统状态
3. 手动触发抓取：访问 `/api/refresh`
4. 查看日志：`npm run tail`

---

## 📊 监控和维护

### 日常检查

1. **每天检查一次**：访问 `/api/status` 查看系统状态
2. **每周检查日志**：运行 `npm run tail` 查看错误
3. **每月验证数据**：确保新闻在正常更新

### 性能优化

1. **调整抓取频率**：根据需求修改 cron 配置
2. **优化存储数量**：在 `saveData` 方法中调整保留的新闻数量
3. **缓存策略**：根据访问量调整 Cloudflare 缓存设置

### 数据备份

定期备份 KV 数据：

```bash
# 导出 KV 数据
wrangler kv:key list --namespace-id=6514ec5dffd14610b39e8a85c0309496

# 导出特定 key
wrangler kv:key get "btc_news_data" --namespace-id=6514ec5dffd14610b39e8a85c0309496
```

---

## 📞 获取帮助

如果遇到问题：

1. 查看 [Cloudflare Workers 文档](https://developers.cloudflare.com/workers/)
2. 查看 [Cloudflare Community](https://community.cloudflare.com/)
3. 检查项目的 GitHub Issues
4. 查看 `npm run tail` 的日志输出

---

## 🎉 部署完成

恭喜！你已成功部署 BTC 新闻聚合器。

**下一步**：

- ✅ 绑定自定义域名
- ✅ 设置监控告警
- ✅ 优化关键词列表
- ✅ 定制界面样式

享受你的新闻聚合器吧！ 🚀
