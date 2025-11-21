// BTC新闻聚合器 - Cloudflare Worker
// 数据源：金色财经
// 更新频率：每30分钟

class BTCNewsScraper {
  constructor(env) {
    this.env = env;
    this.baseUrl = 'https://www.jinse.cn/lives/';
    this.batchSize = 30; // 每次处理的最大新闻数量
  }

  // 获取北京时间
  getBeijingTime() {
    const now = new Date();
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    const beijingTime = new Date(utcTime + (8 * 60 * 60 * 1000));
    return beijingTime;
  }

  // 格式化北京时间
  formatBeijingDateTime(date = null) {
    const beijingTime = date || this.getBeijingTime();
    const year = beijingTime.getFullYear();
    const month = String(beijingTime.getMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getDate()).padStart(2, '0');
    const hours = String(beijingTime.getHours()).padStart(2, '0');
    const minutes = String(beijingTime.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  }

  // 检查是否包含关键词：BTC, bitcoin, 中国, 中本聪, 特朗普, 美联储
  isBTCRelated(text) {
    if (!text) return false;
    
    const keywords = [
      'BTC',
      'btc',
      'Bitcoin',
      'bitcoin',
      'BITCOIN',
      '中国',
      '中本聪',
      '特朗普',
      '美联储'
    ];
    
    return keywords.some(keyword => text.includes(keyword));
  }

  // 获取上次处理的ID
  async getLastProcessedId() {
    try {
      const lastId = await this.env.BTC_NEWS_KV.get('last_processed_id');
      return lastId ? parseInt(lastId) : 488209; // 起始ID：488209
    } catch (error) {
      console.error('获取上次处理ID失败:', error);
      return 488209;
    }
  }

  // 保存上次处理的ID
  async saveLastProcessedId(id) {
    try {
      await this.env.BTC_NEWS_KV.put('last_processed_id', id.toString());
      return true;
    } catch (error) {
      console.error('保存处理ID失败:', error);
      return false;
    }
  }

  // 获取单个资讯页面内容
  async fetchSingleNews(id) {
    try {
      const url = `${this.baseUrl}${id}.html`;
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Cache-Control': 'no-cache'
        },
        cf: {
          cacheTtl: 60,
          cacheEverything: false
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // 页面不存在
        }
        throw new Error(`HTTP ${response.status}`);
      }

      const html = await response.text();
      return this.parseNewsContent(html, id);
    } catch (error) {
      console.error(`获取资讯 ${id} 失败:`, error.message);
      return null;
    }
  }

  // 解析资讯内容
  parseNewsContent(html, id) {
    try {
      // 提取标题
      let title = '';
      const twitterTitleMatch = html.match(/<meta[^>]*name="twitter:title"[^>]*content="([^"]*)"[^>]*>/i);
      if (twitterTitleMatch) {
        title = twitterTitleMatch[1].trim();
      }

      if (!title) {
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        title = titleMatch ? titleMatch[1].replace(/\s*-\s*金色财经.*$/, '').trim() : '';
      }

      // 检查是否包含关键词
      if (!title || !this.isBTCRelated(title)) {
        return null;
      }

      // 提取内容
      let content = '';
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
            if (content.length > 20) break;
          }
        }
      }

      if (!content) {
        content = title;
      }

      // 提取时间
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
            // 忽略解析错误
          }
        }
      }

      return {
        id,
        title,
        content,
        time,
        link: `${this.baseUrl}${id}.html`,
        source: '金色财经',
        scraped_at: this.getBeijingTime().toISOString()
      };
    } catch (error) {
      console.error(`解析资讯 ${id} 内容失败:`, error);
      return null;
    }
  }

  // 清理文本
  cleanText(text) {
    return text
      .replace(/<[^>]*>/g, '') // 移除HTML标签
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 智能搜索当前活跃ID范围
  async findActiveIdRange(startId) {
    console.log(`开始智能搜索活跃ID范围，起始ID: ${startId}`);
    
    // 测试几个点来确定活跃范围
    const testPoints = [startId, startId + 50, startId + 100, startId + 200];
    let activeRange = { min: startId, max: startId + 200 };

    for (const testId of testPoints) {
      try {
        const response = await fetch(`${this.baseUrl}${testId}.html`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; BTC-News-Bot/1.0)' }
        });
        
        if (response.ok) {
          activeRange.max = Math.max(activeRange.max, testId);
          console.log(`✓ 发现活跃ID: ${testId}`);
        }
      } catch (error) {
        // 忽略错误
      }
      
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return activeRange;
  }

  // 批量获取资讯
  async scrapeNews() {
    try {
      const startTime = this.getBeijingTime();
      console.log(`[${this.formatBeijingDateTime(startTime)}] 开始抓取BTC资讯...`);

      const lastId = await this.getLastProcessedId();
      console.log(`上次处理ID: ${lastId}`);

      const newItems = [];
      let successfulId = lastId;

      // 智能搜索活跃ID范围
      const activeRange = await this.findActiveIdRange(lastId);
      console.log(`活跃ID范围: ${activeRange.min} - ${activeRange.max}`);

      // 从上次处理的ID开始，向后搜索
      let searchStart = Math.max(lastId + 1, activeRange.min);
      let searchEnd = Math.min(searchStart + 100, activeRange.max);
      
      console.log(`搜索范围: ${searchStart} - ${searchEnd}`);

      for (let currentId = searchStart; currentId <= searchEnd && newItems.length < this.batchSize; currentId++) {
        const newsItem = await this.fetchSingleNews(currentId);
        
        if (newsItem) {
          newItems.push(newsItem);
          successfulId = currentId;
          console.log(`✓ 获取到BTC资讯 ${currentId}: ${newsItem.title.substring(0, 50)}...`);
        } else {
          console.log(`✗ 跳过资讯 ${currentId} (非BTC相关或不存在)`);
        }

        // 延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      // 保存最后处理的ID
      await this.saveLastProcessedId(successfulId);

      // 合并新旧数据
      const existingData = await this.getExistingData();
      const allData = [...newItems, ...existingData];
      
      // 保存数据
      await this.saveData(allData);

      const endTime = this.getBeijingTime();
      const duration = Math.round((endTime - startTime) / 1000);

      console.log(`[${this.formatBeijingDateTime(endTime)}] 抓取完成，新增 ${newItems.length} 条BTC资讯，耗时 ${duration}秒`);

      return {
        success: true,
        newCount: newItems.length,
        totalCount: allData.length,
        lastProcessedId: successfulId,
        duration,
        timestamp: endTime.toISOString()
      };
    } catch (error) {
      console.error('抓取失败:', error);
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
      const data = await this.env.BTC_NEWS_KV.get('btc_news_data');
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('获取现有数据失败:', error);
      return [];
    }
  }

  // 保存数据
  async saveData(data) {
    try {
      // 只保留最新的100条
      const limitedData = data.slice(0, 100);
      await this.env.BTC_NEWS_KV.put('btc_news_data', JSON.stringify(limitedData));
      return true;
    } catch (error) {
      console.error('保存数据失败:', error);
      return false;
    }
  }
}

// 生成HTML页面
function generateHTML(newsData) {
  const safeNewsData = newsData || [];
  const scraper = new BTCNewsScraper();
  const currentTime = scraper.formatBeijingDateTime();

  const newsItems = safeNewsData.map(news => `
    <div class="news-card">
      <div class="news-header">
        <div class="news-source">${news.source}</div>
        <div class="news-time">${news.time}</div>
      </div>
      <div class="news-title">${news.title}</div>
      <div class="news-content">${news.content}</div>
      <div class="news-meta">
        <a href="${news.link}" target="_blank" class="news-link">查看原文 →</a>
        <span class="news-id">ID: ${news.id}</span>
      </div>
    </div>
  `).join('');

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BTC资讯阅读器 - 金色财经</title>
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

        .keywords {
            text-align: center;
            color: white;
            margin-bottom: 20px;
            font-size: 0.95rem;
            opacity: 0.85;
        }

        .keywords strong {
            color: #ffd700;
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
            <h1>🚀 BTC资讯阅读器</h1>
            <p>基于金色财经ID递增策略 - 每30分钟自动更新</p>
        </div>

        <div class="keywords">
            <strong>监控关键词：</strong>BTC, bitcoin, 中国, 中本聪, 特朗普, 美联储
        </div>

        <div class="controls">
            <a href="/api/refresh" class="btn">🔄 手动刷新</a>
            <a href="/api/status" class="btn">📊 系统状态</a>
        </div>

        <div class="stats">
            <div class="stat-item">
                <span class="stat-number">${safeNewsData.length}</span>
                <span class="stat-label">总资讯数</span>
            </div>
            <div class="stat-item">
                <span class="stat-number">${currentTime}</span>
                <span class="stat-label">北京时间</span>
            </div>
        </div>

        <div class="news-grid">
            ${safeNewsData.length > 0 ? newsItems : `
                <div class="empty-state">
                    <h3>暂无BTC相关资讯</h3>
                    <p>系统正在抓取最新数据，请稍后刷新页面</p>
                </div>
            `}
        </div>
    </div>
</body>
</html>`;
}

// Cloudflare Worker 主入口
export default {
  // HTTP 请求处理
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const scraper = new BTCNewsScraper(env);

    try {
      switch (url.pathname) {
        case '/':
          const newsData = await scraper.getExistingData();
          return new Response(generateHTML(newsData), {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
          });

        case '/api/news':
          const apiNewsData = await scraper.getExistingData();
          return new Response(JSON.stringify(apiNewsData), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });

        case '/api/refresh':
          const refreshResult = await scraper.scrapeNews();
          return new Response(JSON.stringify(refreshResult), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });

        case '/api/status':
          const statusData = await scraper.getExistingData();
          const lastId = await scraper.getLastProcessedId();
          
          let lastCronExecution = null;
          try {
            const cronLog = await env.BTC_NEWS_KV.get('last_cron_execution');
            lastCronExecution = cronLog ? JSON.parse(cronLog) : null;
          } catch (e) {
            console.error('获取 cron 执行记录失败:', e);
          }

          const status = {
            totalNews: statusData.length,
            lastProcessedId: lastId,
            lastUpdate: statusData.length > 0 ? statusData[0].scraped_at : '暂无数据',
            serverTime: scraper.formatBeijingDateTime(),
            lastCronExecution,
            cronStatus: lastCronExecution ? (lastCronExecution.success ? '正常' : '异常') : '未知',
            version: '3.0.0-30min-488209'
          };

          return new Response(JSON.stringify(status), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });

        case '/api/reset':
          const newId = url.searchParams.get('id') || '488209';
          await scraper.saveLastProcessedId(parseInt(newId));
          await scraper.env.BTC_NEWS_KV.delete('btc_news_data');
          
          return new Response(JSON.stringify({
            success: true,
            message: `系统已重置，新起始ID: ${newId}`,
            timestamp: scraper.formatBeijingDateTime()
          }), {
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*'
            }
          });

        default:
          return new Response('Not Found', { status: 404 });
      }
    } catch (error) {
      console.error('处理请求失败:', error);
      return new Response(JSON.stringify({
        error: error.message,
        timestamp: scraper.getBeijingTime().toISOString()
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },

  // Cron 触发器 - 每30分钟执行
  async scheduled(controller, env, ctx) {
    console.log(`[${new Date().toISOString()}] Cron 任务开始执行...`);
    
    try {
      const scraper = new BTCNewsScraper(env);
      const result = await scraper.scrapeNews();
      
      console.log(`[${new Date().toISOString()}] Cron 任务执行完成:`, JSON.stringify(result));
      
      // 保存执行记录
      await env.BTC_NEWS_KV.put('last_cron_execution', JSON.stringify({
        timestamp: new Date().toISOString(),
        result,
        success: true
      }));
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Cron 任务执行失败:`, error);
      
      await env.BTC_NEWS_KV.put('last_cron_execution', JSON.stringify({
        timestamp: new Date().toISOString(),
        error: error.message,
        success: false
      }));
    }
  }
};
