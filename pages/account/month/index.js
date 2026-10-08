// pages/account/month/index.js
// 记账月度统计：收支结余、分类占比、每日支出柱状
const store = require('../../../utils/store.js')
const { yuan } = require('../../../utils/format.js')

Page({
  data: {
    month: '',
    monthText: '',
    canNext: false,
    isCurrent: true,
    stats: {
      expenseText: '¥0.00',
      incomeText: '¥0.00',
      netText: '¥0.00',
      netCents: 0,
      count: 0,
      byCategory: []
    },
    bars: []
  },

  onLoad(query) {
    const ym = query && query.month ? String(query.month) : store.monthKey(new Date())
    this.render(ym)
  },

  render(month) {
    const now = new Date()
    const cur = store.monthKey(now)
    const stats = store.getMonthStats(month, now)
    const max = stats.maxDayCents || 1

    const parts = String(month).split('-')
    const byCategory = stats.byCategory.map(c => Object.assign({}, c, { amountText: yuan(c.cents) }))

    this.setData({
      month,
      monthText: `${parts[0]}年${Number(parts[1])}月`,
      isCurrent: month === cur,
      canNext: month < cur,               // 不允许翻到未来的月份
      stats: Object.assign({}, stats, {
        byCategory,
        expenseText: yuan(stats.expenseCents),
        incomeText: yuan(stats.incomeCents),
        netText: yuan(stats.netCents)
      }),
      bars: stats.byDay.map(d => ({
        day: d.day,
        cents: d.cents,
        height: d.cents ? Math.max(8, Math.round(d.cents / max * 100)) : 0
      }))
    })
  },

  onPrev() {
    const parts = this.data.month.split('-').map(Number)
    this.render(store.monthKey(new Date(parts[0], parts[1] - 2, 1)))
  },

  onNext() {
    if (!this.data.canNext) return
    const parts = this.data.month.split('-').map(Number)
    this.render(store.monthKey(new Date(parts[0], parts[1], 1)))
  }
})
