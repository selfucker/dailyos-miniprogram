// pages/profile/index.js
// 统计全部来自本地真实数据（英语打卡历史 / 记账记录），不再硬编码
const store = require('../../utils/store.js')
const { yuan } = require('../../utils/format.js')

const APP_VERSION = 'v0.1.0'

Page({
  data: {
    nickname: '',
    avatarText: '',
    streak: 0,
    totalDays: 0,
    englishDays: 0,
    monthCount: 0,
    monthTotal: '¥0.00',
    settingItems: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const now = new Date()
    const english = store.getEnglishSummary(now)
    const ledger = store.getLedgerSummary(now)
    const profile = store.getProfile()
    const month = store.monthKey(now)

    const monthCount = store.getRecords()
      .filter(it => it && String(it.date || '').slice(0, 7) === month)
      .length

    this.setData({
      nickname: profile.nickname,
      avatarText: this.initials(profile.nickname),
      streak: english.streak,
      totalDays: english.totalDays,
      englishDays: english.totalDays,
      monthCount,
      monthTotal: yuan(ledger.monthCents),
      settingItems: [
        { key: 'wordbook', label: '当前词书', value: english.bookTitle || '未选择' },
        { key: 'target',   label: '今日词量', value: (english.target || 0) + ' 词' },
        { key: 'remind',   label: '提醒时间', value: '未开启' },
        { key: 'export',   label: '数据导出', value: '未实现' },
        { key: 'about',    label: '关于 DailyOS', value: APP_VERSION }
      ]
    })
  },

  // 昵称首字母当头像（英文取前两位大写，中文取前两个字）
  initials(name) {
    const s = String(name == null ? '' : name).trim()
    if (!s) return 'D'
    if (/^[\x00-\x7F]+$/.test(s)) return s.slice(0, 2).toUpperCase()
    return s.slice(0, 2)
  },

  onTapSetting(e) {
    const key = e.currentTarget.dataset.key
    const tips = {
      wordbook: '去「英语」页点词书卡片切换',
      target: '每日词量跟随词书，后续支持自定义',
      remind: '订阅消息提醒尚未实现',
      export: '数据导出尚未实现',
      about: 'DailyOS ' + APP_VERSION
    }
    wx.showToast({ title: tips[key] || '后续实现', icon: 'none' })
  }
})
