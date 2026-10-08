// pages/index/index.js
const { request } = require('../../utils/request.js')
const mock = require('../../utils/mock.js')
const { dateWithSuffix, greet, todayStr } = require('../../utils/date.js')
const { yuan } = require('../../utils/format.js')

Page({
  data: {
    dateLabel: '',
    greeting: '',
    progress: 0,
    english: { done: 0, target: 20, progress: 0, streak: 0, bookTitle: '', dayIndex: 0 },
    workout: { done: false, parts: '', durationMin: 0, kcal: 0, p: 0, c: 0, f: 0 },
    ledger: { todayText: '¥0.00', monthText: '¥0.00', count: 0, recent: [] },
    news: { count: 0, items: [] },
    usingMock: true
  },

  
  loadNews() {
    const self = this
    withFallback(
      request('/news/today?category=finance&limit=10').then(rows => rows || []),
      () => mock.news || []
    ).then(news => {
      self.setData({ news: (news || []).slice(0, 10) })
    })
  },

  onTapNews(e) {
    const url = e.currentTarget.dataset.url
    if (!url) return
    wx.navigateTo({ url: '/pages/news/article/index?url=' + encodeURIComponent(url) })
  },
onLoad() {
    this.loadDashboard()
  },

  onShow() {
    this.loadDashboard()
  },

  onPullDownRefresh() {
    this.loadDashboard().finally(() => wx.stopPullDownRefresh())
  },

  loadDashboard() {
    const d = mock.dashboard
    const recentWithAmount = d.ledger.recent.map(it =>
      Object.assign({}, it, { amount: yuan(it.cents) })
    )

    // 从本地存储读今日健身记录，映射到 workout 字段
    let workout = d.workout
    try {
      const stored = wx.getStorageSync('fitness.today.v1')
      if (stored && stored.date === todayStr(new Date())) {
        const partsArr = Array.isArray(stored.parts) ? stored.parts : []
        workout = {
          done: true,
          parts: partsArr.length ? partsArr.join(' · ') : '暂未选择部位',
          durationMin: stored.durationMin || 0,
          kcal: stored.intakeKcal || 0,
          p: stored.totalP || 0,
          c: stored.totalC || 0,
          f: stored.totalF || 0
        }
      }
    } catch (e) {
      console.warn('[index] read fitness storage failed', e)
    }

    this.setData({
      dateLabel: dateWithSuffix(new Date()),
      greeting: greet(new Date()),
      progress: d.progress,
      english: d.english,
      workout,
      ledger: {
        todayText: yuan(d.ledger.todayCents),
        monthText: yuan(d.ledger.monthCents),
        count: d.ledger.todayCount,
        recent: recentWithAmount
      },
      news: d.news
    })
    return Promise.resolve()
  },

  onTapEnglish() { wx.switchTab({ url: '/pages/english/index' }) },
  onTapWorkout() { wx.switchTab({ url: '/pages/fitness/index' }) },
  onTapLedger() { wx.switchTab({ url: '/pages/account/index' }) },

  onTapNewsItem(e) {
    const id = e.currentTarget.dataset.id
    const item = (this.data.news.items || []).find(n => n.id === id)
    if (!item || !item.url) {
      wx.showToast({ title: '该新闻暂无链接', icon: 'none' })
      return
    }
    wx.navigateTo({
      url: '/pages/news/article/index?url=' + encodeURIComponent(item.url)
        + '&title=' + encodeURIComponent(item.title || '')
    })
  }
})
