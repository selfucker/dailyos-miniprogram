// utils/mock.js
// Dashboard 暂时用 mock 数据，前端页面跑起来后接真接口再切换
const today = new Date()
const dateLabel = `${today.getMonth() + 1}月${today.getDate()}日`

// 新闻 url 使用各站点的具体文章路径（带 article id 后缀或固定 path）
// 后续接后端时由后端聚合服务返回真实链接，这里只是占位
module.exports = {
  dashboard: {
    greeting: '早安，Jesse',
    summary: '今日完成 4/6 件事',
    progress: 71,
    english: {
      done: 12,
      target: 20,
      progress: 60,
      streak: 7,
      bookTitle: 'GRE 高频核心词',
      dayIndex: 7
    },
    workout: {
      done: true,
      parts: '胸 · 三头',
      durationMin: 58,
      kcal: 1820,
      p: 145, c: 180, f: 55
    },
    ledger: {
      todayCents: 8650,
      monthCents: 234000,
      todayCount: 3,
      recent: [
        { label: '午餐', cents: 3200, category: '餐' },
        { label: '咖啡', cents: 1800, category: '餐' },
        { label: '地铁', cents: 1200, category: '交通' }
      ]
    },
    news: {
      count: 3,
      items: [
        {
          id: 'n1',
          source: '华尔街见闻',
          url: 'https://wallstreetcn.com/articles/3720000',
          timeAgo: '2 小时前',
          category: '宏观',
          title: '美联储 11 月维持利率不变',
          summary: '鲍威尔暗示 12 月可能放缓加息节奏，市场反应温和。'
        },
        {
          id: 'n2',
          source: '财新网',
          url: 'https://www.caixin.com/2026-10-07/100300000.html',
          timeAgo: '3 小时前',
          category: 'A股',
          title: '沪指收涨 0.7%，北向资金净流入 86 亿',
          summary: '电子、新能源领涨，成交额回升至 1.2 万亿。'
        },
        {
          id: 'n3',
          source: '财联社',
          url: 'https://www.cls.cn/detail/1800000',
          timeAgo: '4 小时前',
          category: '美股',
          title: '英伟达 Q3 财报超预期，盘后涨逾 4%',
          summary: '数据中心收入同比增长 94%，给出强劲下季度指引。'
        }
      ]
    }
  }
}