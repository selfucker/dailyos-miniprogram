// pages/english/wrong/index.js
// 错词本：列出所有答"不认识"的词，可手动移出，也可去复习（连对 2 次自动毕业）
const store = require('../../../utils/store.js')

Page({
  data: {
    list: [],
    count: 0,
    almost: 0,
    graduateStreak: store.GRADUATE_STREAK
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const list = store.getWrongWords()
      .slice()
      .sort((a, b) => (b.wrongCount || 0) - (a.wrongCount || 0) || (b.lastSeenAt || 0) - (a.lastSeenAt || 0))
      .map(w => Object.assign({}, w, {
        addedText: this.dayText(w.addedAt),
        streakText: (w.rightStreak || 0) > 0 ? `已连对 ${w.rightStreak}/${store.GRADUATE_STREAK}` : ''
      }))

    const s = store.getWrongSummary()
    this.setData({ list, count: s.count, almost: s.almost })
  },

  dayText(ts) {
    if (!ts) return ''
    const d = new Date(ts)
    return `${d.getMonth() + 1}月${d.getDate()}日`
  },

  onTapWord(e) {
    const word = e.currentTarget.dataset.word
    if (!word) return
    wx.showActionSheet({
      itemList: ['移出错词本'],
      success: (res) => {
        if (res.tapIndex !== 0) return
        store.removeWrongWord(word)
        this.refresh()
        wx.showToast({ title: '已移出', icon: 'success' })
      }
    })
  },

  onTapStudy() {
    wx.navigateTo({ url: '/pages/english/study/index' })
  }
})
