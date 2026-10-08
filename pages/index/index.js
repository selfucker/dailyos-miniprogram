// pages/index/index.js
// 首页 = 今日聚合面板：英语打卡 / 健身 / 记账 全部读本地真实数据，只有新闻走后端（失败回落 mock）
const { request, withFallback } = require('../../utils/request.js')
const mock = require('../../utils/mock.js')
const { dateWithSuffix, greet } = require('../../utils/date.js')
const { yuan } = require('../../utils/format.js')
const store = require('../../utils/store.js')

Page({
  data: {
    dateLabel: '',
    greeting: '',
    nickname: '',
    taskDone: 0,
    taskTotal: 3,
    progress: 0,
    english: { done: 0, target: 0, progress: 0, streak: 0, bookTitle: '', dayIndex: 1, finished: false },
    workout: { done: false, parts: '', durationMin: 0, kcal: 0, p: 0, c: 0, f: 0 },
    ledger: { todayText: '¥0.00', monthText: '¥0.00', count: 0, recent: [] },
    news: { count: 0, items: [] },
    usingMock: true
  },

  onLoad() {
    this.loadDashboard()
    this.loadNews()
  },

  onShow() {
    this.loadDashboard()
  },

  onPullDownRefresh() {
    Promise.all([this.loadDashboard(), this.loadNews()]).then(
      () => wx.stopPullDownRefresh(),
      () => wx.stopPullDownRefresh()
    )
  },

  // —— 今日概览（全部真实数据） ——
  loadDashboard() {
    const now = new Date()
    const english = store.getEnglishSummary(now)
    const ledgerRaw = store.getLedgerSummary(now, 3)
    const profile = store.getProfile()

    // 健身：只有"今天"记录过才算完成
    const fit = store.getFitnessToday(now)
    const partsArr = fit && Array.isArray(fit.parts) ? fit.parts : []
    const workout = fit
      ? {
          done: true,
          parts: partsArr.length ? partsArr.join(' · ') : '今日已记录',
          durationMin: fit.durationMin || 0,
          kcal: fit.intakeKcal || 0,
          p: fit.totalP || 0,
          c: fit.totalC || 0,
          f: fit.totalF || 0
        }
      : { done: false, parts: '今日还没记录', durationMin: 0, kcal: 0, p: 0, c: 0, f: 0 }

    const ledger = {
      todayText: yuan(ledgerRaw.todayCents),
      monthText: yuan(ledgerRaw.monthCents),
      count: ledgerRaw.todayCount,
      recent: ledgerRaw.recent.map(it => Object.assign({}, it, { amount: yuan(it.cents) }))
    }

    // 今日三件事：英语打卡完成 / 健身已记录 / 记账有记录
    const flags = [english.finished, workout.done, ledgerRaw.todayCount > 0]
    const taskDone = flags.filter(Boolean).length
    const taskTotal = flags.length

    this.setData({
      dateLabel: dateWithSuffix(now),
      greeting: greet(now),
      nickname: profile.nickname,
      taskDone,
      taskTotal,
      progress: Math.round((taskDone / taskTotal) * 100),
      english,
      workout,
      ledger
    })

    return Promise.resolve()
  },

  // —— 新闻：优先后端接口，失败回落本地 mock ——
  loadNews() {
    let fromMock = false
    return withFallback(
      request('/news/today?category=finance&limit=10').then(rows => rows || []),
      () => {
        fromMock = true
        return (mock.dashboard && mock.dashboard.news && mock.dashboard.news.items) || []
      }
    ).then(items => {
      const list = items || []
      this.setData({ news: { count: list.length, items: list }, usingMock: fromMock })
    }).catch(err => {
      console.warn('[index] loadNews failed', err)
    })
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
