var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// src/index.js
var BTCNewsScraper = class {
  constructor(env) {
    this.env = env;
    this.baseUrl = "https://www.jinse.cn/lives/";
    this.batchSize = 30;
  }
  // 获取北京时间
  getBeijingTime() {
    const now = /* @__PURE__ */ new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 6e4;
    const beijingTime = new Date(utcTime + 8 * 60 * 60 * 1e3);
    return beijingTime;
  }
  // 格式化北京时间
  formatBeijingDateTime(date = null) {
    const beijingTime = date || this.getBeijingTime();
    const year = beijingTime.getFullYear();
    const month = String(beijingTime.getMonth() + 1).padStart(2, "0");
    const day = String(beijingTime.getDate()).padStart(2, "0");
    const hours = String(beijingTime.getHours()).padStart(2, "0");
    const minutes = String(beijingTime.getMinutes()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }
  // 检查是否为BTC相关
  isBTCRelated(text) {
    if (!text)
      return false;
    const btcKeywords = [
      "BTC",
      "btc",
      "\u6BD4\u7279\u5E01",
      "Bitcoin",
      "bitcoin",
      "BITCOIN",
      "\u6BD4\u7279",
      "BitCoin",
      "Btc",
      "\u20BF",
      "Satoshi",
      "satoshi",
      "\u806A",
      "\u4E2D\u672C\u806A",
      "WBTC",
      "wbtc",
      "Binance",
      "binance",
      "\u5E01\u5B89",
      "\u9CB8\u9C7C",
      "USDT",
      "usdt",
      "\u52A0\u5BC6\u8D27\u5E01",
      "\u6570\u5B57\u8D27\u5E01"
    ];
    return btcKeywords.some((keyword) => text.includes(keyword));
  }
  // 获取上次处理的ID
  async getLastProcessedId() {
    try {
      const lastId = await this.env.BTC_NEWS_KV.get("last_processed_id");
      return lastId ? parseInt(lastId) : 475200;
    } catch (error) {
      console.error("\u83B7\u53D6\u4E0A\u6B21\u5904\u7406ID\u5931\u8D25:", error);
      return 475200;
    }
  }
  // 保存上次处理的ID
  async saveLastProcessedId(id) {
    try {
      await this.env.BTC_NEWS_KV.put("last_processed_id", id.toString());
      return true;
    } catch (error) {
      console.error("\u4FDD\u5B58\u5904\u7406ID\u5931\u8D25:", error);
      return false;
    }
  }
  // 获取单个资讯页面内容
  async fetchSingleNews(id) {
    try {
      const url = `${this.baseUrl}${id}.html`;
      const response = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "zh-CN,zh;q=0.9,en;q=0.8",
          "Cache-Control": "no-cache"
        },
        cf: {
          cacheTtl: 60,
          cacheEverything: false
        }
      });
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      const html = await response.text();
      return this.parseNewsContent(html, id);
    } catch (error) {
      console.error(`\u83B7\u53D6\u8D44\u8BAF ${id} \u5931\u8D25:`, error.message);
      return null;
    }
  }
  // 解析资讯内容
  parseNewsContent(html, id) {
    try {
      let title = "";
      const twitterTitleMatch = html.match(/<meta[^>]*name="twitter:title"[^>]*content="([^"]*)"[^>]*>/i);
      if (twitterTitleMatch) {
        title = twitterTitleMatch[1].trim();
      }
      if (!title) {
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        title = titleMatch ? titleMatch[1].replace(/\s*-\s*金色财经.*$/, "").trim() : "";
      }
      if (!title || !this.isBTCRelated(title)) {
        return null;
      }
      let content = "";
      const twitterDescMatch = html.match(/<meta[^>]*name="twitter:description"[^>]*content="([^"]*)"[^>]*>/i);
      if (twitterDescMatch) {
        content = twitterDescMatch[1].trim();
      }
      if (!content) {
        const contentPatterns = [
          /<div[^>]*class="[^"]*live-content[^"]*"[^>]*>(.*?)<\/div>/s,
          /<div[^>]*class="[^"]*content[^"]*"[^>]*>(.*?)<\/div>/s,
          /<article[^>]*>(.*?)<\/article>/s,
          /<p[^>]*>(.*?)<\/p>/s
        ];
        for (const pattern of contentPatterns) {
          const match = html.match(pattern);
          if (match) {
            content = this.cleanText(match[1]);
            if (content.length > 20)
              break;
          }
        }
      }
      if (!content) {
        content = title;
      }
      let time = this.formatBeijingDateTime();
      const timePatterns = [
        /<time[^>]*datetime="([^"]*)"[^>]*>/,
        /<span[^>]*class="[^"]*time[^"]*"[^>]*>(.*?)<\/span>/,
        /(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2})/
      ];
      for (const pattern of timePatterns) {
        const match = html.match(pattern);
        if (match) {
          try {
            const parsedTime = new Date(match[1]);
            if (!isNaN(parsedTime.getTime())) {
              time = this.formatBeijingDateTime(parsedTime);
              break;
            }
          } catch (e) {
          }
        }
      }
      return {
        id,
        title,
        content,
        time,
        link: `${this.baseUrl}${id}.html`,
        source: "\u91D1\u8272\u8D22\u7ECF",
        scraped_at: this.getBeijingTime().toISOString()
      };
    } catch (error) {
      console.error(`\u89E3\u6790\u8D44\u8BAF ${id} \u5185\u5BB9\u5931\u8D25:`, error);
      return null;
    }
  }
  // 清理文本
  cleanText(text) {
    return text.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, " ").trim();
  }
  // 智能搜索当前活跃ID范围
  async findActiveIdRange(startId) {
    console.log(`\u5F00\u59CB\u667A\u80FD\u641C\u7D22\u6D3B\u8DC3ID\u8303\u56F4\uFF0C\u8D77\u59CBID: ${startId}`);
    const testPoints = [startId, startId + 50, startId + 100, startId + 200];
    let activeRange = { min: startId, max: startId + 200 };
    for (const testId of testPoints) {
      try {
        const response = await fetch(`${this.baseUrl}${testId}.html`, {
          headers: { "User-Agent": "Mozilla/5.0 (compatible; BTC-News-Bot/1.0)" }
        });
        if (response.ok) {
          activeRange.max = Math.max(activeRange.max, testId);
          console.log(`\u2713 \u53D1\u73B0\u6D3B\u8DC3ID: ${testId}`);
        }
      } catch (error) {
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    return activeRange;
  }
  // 批量获取资讯
  async scrapeNews() {
    try {
      const startTime = this.getBeijingTime();
      console.log(`[${this.formatBeijingDateTime(startTime)}] \u5F00\u59CB\u6293\u53D6BTC\u8D44\u8BAF...`);
      const lastId = await this.getLastProcessedId();
      console.log(`\u4E0A\u6B21\u5904\u7406ID: ${lastId}`);
      const newItems = [];
      let successfulId = lastId;
      const activeRange = await this.findActiveIdRange(lastId);
      console.log(`\u6D3B\u8DC3ID\u8303\u56F4: ${activeRange.min} - ${activeRange.max}`);
      let searchStart = Math.max(lastId + 1, activeRange.min);
      let searchEnd = Math.min(searchStart + 100, activeRange.max);
      console.log(`\u641C\u7D22\u8303\u56F4: ${searchStart} - ${searchEnd}`);
      for (let currentId = searchStart; currentId <= searchEnd && newItems.length < this.batchSize; currentId++) {
        const newsItem = await this.fetchSingleNews(currentId);
        if (newsItem) {
          newItems.push(newsItem);
          successfulId = currentId;
          console.log(`\u2713 \u83B7\u53D6\u5230BTC\u8D44\u8BAF ${currentId}: ${newsItem.title.substring(0, 50)}...`);
        } else {
          console.log(`\u2717 \u8DF3\u8FC7\u8D44\u8BAF ${currentId} (\u975EBTC\u76F8\u5173\u6216\u4E0D\u5B58\u5728)`);
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      await this.saveLastProcessedId(successfulId);
      const existingData = await this.getExistingData();
      const allData = [...newItems, ...existingData];
      await this.saveData(allData);
      const endTime = this.getBeijingTime();
      const duration = Math.round((endTime - startTime) / 1e3);
      console.log(`[${this.formatBeijingDateTime(endTime)}] \u6293\u53D6\u5B8C\u6210\uFF0C\u65B0\u589E ${newItems.length} \u6761BTC\u8D44\u8BAF\uFF0C\u8017\u65F6 ${duration}\u79D2`);
      return {
        success: true,
        newCount: newItems.length,
        totalCount: allData.length,
        lastProcessedId: successfulId,
        duration,
        timestamp: endTime.toISOString()
      };
    } catch (error) {
      console.error("\u6293\u53D6\u5931\u8D25:", error);
      return {
        success: false,
        error: error.message,
        timestamp: this.getBeijingTime().toISOString()
      };
    }
  }
  // 获取现有数据
  async getExistingData() {
    try {
      const data = await this.env.BTC_NEWS_KV.get("btc_news_data");
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error("\u83B7\u53D6\u73B0\u6709\u6570\u636E\u5931\u8D25:", error);
      return [];
    }
  }
  // 保存数据
  async saveData(data) {
    try {
      const limitedData = data.slice(0, 100);
      await this.env.BTC_NEWS_KV.put("btc_news_data", JSON.stringify(limitedData));
      return true;
    } catch (error) {
      console.error("\u4FDD\u5B58\u6570\u636E\u5931\u8D25:", error);
      return false;
    }
  }
};
__name(BTCNewsScraper, "BTCNewsScraper");
function generateHTML(newsData) {
  const safeNewsData = newsData || [];
  const scraper = new BTCNewsScraper();
  const currentTime = scraper.formatBeijingDateTime();
  const newsItems = safeNewsData.map((news) => `
    <div class="news-card">
      <div class="news-header">
        <div class="news-source">${news.source}</div>
        <div class="news-time">${news.time}</div>
      </div>
      <div class="news-title">${news.title}</div>
      <div class="news-content">${news.content}</div>
      <div class="news-meta">
        <a href="${news.link}" target="_blank" class="news-link">\u67E5\u770B\u539F\u6587 \u2192</a>
        <span class="news-id">ID: ${news.id}</span>
      </div>
    </div>
  `).join("");
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BTC\u8D44\u8BAF\u9605\u8BFB\u5668 - \u91D1\u8272\u8D22\u7ECF</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            margin-bottom: 30px;
            color: white;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        .controls {
            display: flex;
            justify-content: center;
            gap: 20px;
            margin-bottom: 30px;
            flex-wrap: wrap;
        }

        .btn {
            padding: 12px 24px;
            border: none;
            border-radius: 25px;
            background: rgba(255,255,255,0.2);
            color: white;
            cursor: pointer;
            font-size: 1rem;
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            text-decoration: none;
            display: inline-block;
        }

        .btn:hover {
            background: rgba(255,255,255,0.3);
            transform: translateY(-2px);
        }

        .stats {
            display: flex;
            justify-content: center;
            gap: 30px;
            margin-bottom: 30px;
        }

        .stat-item {
            text-align: center;
            color: white;
        }

        .stat-number {
            font-size: 2rem;
            font-weight: bold;
            display: block;
        }

        .stat-label {
            font-size: 0.9rem;
            opacity: 0.8;
        }

        .news-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 20px;
        }

        .news-card {
            background: rgba(255,255,255,0.95);
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.1);
            backdrop-filter: blur(10px);
            transition: all 0.3s ease;
            border: 1px solid rgba(255,255,255,0.2);
        }

        .news-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 40px rgba(0,0,0,0.15);
        }

        .news-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #eee;
        }

        .news-source {
            background: linear-gradient(45deg, #667eea, #764ba2);
            color: white;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.8rem;
            font-weight: 500;
        }

        .news-title {
            font-size: 1.3rem;
            font-weight: bold;
            color: #333;
            margin-bottom: 15px;
            line-height: 1.4;
        }

        .news-content {
            color: #666;
            line-height: 1.6;
            margin-bottom: 15px;
        }

        .news-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9rem;
            color: #999;
            border-top: 1px solid #eee;
            padding-top: 15px;
        }

        .news-time {
            font-weight: 500;
        }

        .news-link {
            color: #667eea;
            text-decoration: none;
            font-weight: 500;
        }

        .news-link:hover {
            text-decoration: underline;
        }

        .news-id {
            font-size: 0.8rem;
            color: #999;
        }

        .empty-state {
            text-align: center;
            color: white;
            padding: 60px 20px;
        }

        .empty-state h3 {
            font-size: 1.5rem;
            margin-bottom: 10px;
        }

        @media (max-width: 768px) {
            .news-grid {
                grid-template-columns: 1fr;
            }
            
            .header h1 {
                font-size: 2rem;
            }
            
            .stats {
                flex-direction: column;
                gap: 15px;
            }
            
            .controls {
                flex-direction: column;
                align-items: center;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>\u{1F680} BTC\u8D44\u8BAF\u9605\u8BFB\u5668</h1>
            <p>\u57FA\u4E8E\u91D1\u8272\u8D22\u7ECFID\u9012\u589E\u7B56\u7565 - \u6BCF\u5C0F\u65F6\u81EA\u52A8\u66F4\u65B0</p>
        </div>

        <div class="controls">
            <a href="/api/refresh" class="btn">\u{1F504} \u624B\u52A8\u5237\u65B0</a>
            <a href="/api/status" class="btn">\u{1F4CA} \u7CFB\u7EDF\u72B6\u6001</a>
        </div>

        <div class="stats">
            <div class="stat-item">
                <span class="stat-number">${safeNewsData.length}</span>
                <span class="stat-label">\u603B\u8D44\u8BAF\u6570</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${currentTime}</span>
                <span class="stat-label">\u5317\u4EAC\u65F6\u95F4</span>
            </div>
        </div>

        <div class="news-grid">
            ${safeNewsData.length > 0 ? newsItems : `
                <div class="empty-state">
                    <h3>\u6682\u65E0BTC\u76F8\u5173\u8D44\u8BAF</h3>
                    <p>\u7CFB\u7EDF\u6B63\u5728\u6293\u53D6\u6700\u65B0\u6570\u636E\uFF0C\u8BF7\u7A0D\u540E\u5237\u65B0\u9875\u9762</p>
                </div>
            `}
        </div>
    </div>
</body>
</html>`;
}
__name(generateHTML, "generateHTML");
var src_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const scraper = new BTCNewsScraper(env);
    try {
      switch (url.pathname) {
        case "/":
          const newsData = await scraper.getExistingData();
          return new Response(generateHTML(newsData), {
            headers: { "Content-Type": "text/html; charset=utf-8" }
          });
        case "/api/news":
          const apiNewsData = await scraper.getExistingData();
          return new Response(JSON.stringify(apiNewsData), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        case "/api/refresh":
          const refreshResult = await scraper.scrapeNews();
          return new Response(JSON.stringify(refreshResult), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        case "/api/status":
          const statusData = await scraper.getExistingData();
          const lastId = await scraper.getLastProcessedId();
          let lastCronExecution = null;
          try {
            const cronLog = await env.BTC_NEWS_KV.get("last_cron_execution");
            lastCronExecution = cronLog ? JSON.parse(cronLog) : null;
          } catch (e) {
            console.error("\u83B7\u53D6 cron \u6267\u884C\u8BB0\u5F55\u5931\u8D25:", e);
          }
          const status = {
            totalNews: statusData.length,
            lastProcessedId: lastId,
            lastUpdate: statusData.length > 0 ? statusData[0].scraped_at : "\u6682\u65E0\u6570\u636E",
            serverTime: scraper.formatBeijingDateTime(),
            lastCronExecution,
            cronStatus: lastCronExecution ? lastCronExecution.success ? "\u6B63\u5E38" : "\u5F02\u5E38" : "\u672A\u77E5",
            version: "2.0.0-id-increment"
          };
          return new Response(JSON.stringify(status), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        case "/api/reset":
          const newId = url.searchParams.get("id") || "475110";
          await scraper.saveLastProcessedId(parseInt(newId));
          await scraper.env.BTC_NEWS_KV.delete("btc_news_data");
          return new Response(JSON.stringify({
            success: true,
            message: `\u7CFB\u7EDF\u5DF2\u91CD\u7F6E\uFF0C\u65B0\u8D77\u59CBID: ${newId}`,
            timestamp: scraper.formatBeijingDateTime()
          }), {
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*"
            }
          });
        default:
          return new Response("Not Found", { status: 404 });
      }
    } catch (error) {
      console.error("\u5904\u7406\u8BF7\u6C42\u5931\u8D25:", error);
      return new Response(JSON.stringify({
        error: error.message,
        timestamp: scraper.getBeijingTime().toISOString()
      }), {
        status: 500,
        headers: { "Content-Type": "application/json" }
      });
    }
  },
  // Cron 触发器 - 每小时执行
  async scheduled(controller, env, ctx) {
    console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] Cron \u4EFB\u52A1\u5F00\u59CB\u6267\u884C...`);
    try {
      const scraper = new BTCNewsScraper(env);
      const result = await scraper.scrapeNews();
      console.log(`[${(/* @__PURE__ */ new Date()).toISOString()}] Cron \u4EFB\u52A1\u6267\u884C\u5B8C\u6210:`, JSON.stringify(result));
      await env.BTC_NEWS_KV.put("last_cron_execution", JSON.stringify({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        result,
        success: true
      }));
    } catch (error) {
      console.error(`[${(/* @__PURE__ */ new Date()).toISOString()}] Cron \u4EFB\u52A1\u6267\u884C\u5931\u8D25:`, error);
      await env.BTC_NEWS_KV.put("last_cron_execution", JSON.stringify({
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        error: error.message,
        success: false
      }));
    }
  }
};
export {
  src_default as default
};
//# sourceMappingURL=index.js.map
