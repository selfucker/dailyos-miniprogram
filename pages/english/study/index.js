// pages/english/study/index.js
const { getBook, getWords, dailyWordsAsync } = require('../../../utils/words.js')

const STORAGE_TODAY = 'english.today.v1'
const STORAGE_HISTORY = 'english.history.v1'

function getDateKey(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

Page({
  data: {
    bookId: 'basic_en_a',
    bookTitle: '',
    queue: [],
    current: 0,
    total: 0,
    currentWord: {},
    displayIndex: 1,
    progress: 0,
    flipped: false,
    done: false,
    knownCount: 0,
    unknownCount: 0,
    streak: 0
  },

  onLoad() {
    const self = this
    const bookId = wx.getStorageSync('english.book.v1') || 'basic_en_a'
    const book = getBook(bookId)

    let stored = null
    try { stored = wx.getStorageSync(STORAGE_TODAY) || null } catch (e) {}

    const today = getDateKey(new Date())

    // 今天已有记录就恢复它（包含"已完成"的情况）：
    // 否则打卡完成后再进来会被重置成未完成，看起来像没打过卡
    if (stored && stored.date === today && stored.bookId === bookId && stored.queue && stored.queue.length) {
      self.applyQueue(book, stored.queue, stored.current || 0, stored.known || 0, stored.unknown || 0, !!stored.done)
      return
    }

    // 异步拉远端 20 词
    dailyWordsAsync(bookId, 20).then(words => {
      const q = (words || []).map(w => Object.assign({}, w, { status: 'new' }))
      self.applyQueue(book, q, 0, 0, 0, false)
    })
  },

  applyQueue(book, queue, current, known, unknown, done) {
    const total = queue.length
    const safeCurrent = Math.min(Math.max(current, 0), Math.max(total - 1, 0))

    this.setData({
      bookId: book.id || book.code,
      bookTitle: book.title,
      queue,
      current,
      total,
      // 关键：卡片渲染靠 currentWord，不设置它的话单词/音标/释义/例句全是空白
      currentWord: queue[safeCurrent] || {},
      displayIndex: done ? total : Math.min(current + 1, total || 1),
      progress: done ? 100 : (total ? Math.round((current / total) * 100) : 0),
      knownCount: known,
      unknownCount: unknown,
      done: !!done,
      flipped: false,
      streak: this.computeStreak()
    })
  },

  computeStreak() {
    let history = []
    try { history = wx.getStorageSync(STORAGE_HISTORY) || [] } catch (e) {}
    if (!history.length) return 0
    let streak = 0
    const cursor = new Date()
    while (true) {
      const key = getDateKey(cursor)
      if (history.indexOf(key) >= 0) {
        streak++
        cursor.setDate(cursor.getDate() - 1)
      } else break
    }
    return streak
  },

  onTapCard() {
    if (this.data.done) return
    this.setData({ flipped: !this.data.flipped })
  },

  onTapUnknown() {
    if (this.data.done) return
    if (!this.data.flipped) {
      this.setData({ flipped: true })
      setTimeout(() => this.advance('unknown'), 380)
    } else {
      this.advance('unknown')
    }
  },

  onTapKnown() {
    if (this.data.done) return
    this.advance('known')
  },

  advance(status) {
    const { queue, current, knownCount, unknownCount } = this.data
    const q = queue.slice()
    q[current] = Object.assign({}, q[current], { status })
    const known = knownCount + (status === 'known' ? 1 : 0)
    const unknown = unknownCount + (status === 'unknown' ? 1 : 0)
    const next = current + 1

    if (next >= q.length) {
      this.setData({
        queue: q,
        knownCount: known,
        unknownCount: unknown,
        current: next,
        displayIndex: q.length,
        progress: 100,
        done: true,
        flipped: false
      })
      this.finishSession()
      wx.showToast({ title: '已完成今日打卡', icon: 'success' })
    } else {
      this.setData({
        queue: q,
        knownCount: known,
        unknownCount: unknown,
        current: next,
        currentWord: q[next] || {},
        displayIndex: next + 1,
        progress: Math.round((next / q.length) * 100),
        flipped: false
      })
      this.persist()
    }
  },

  finishSession() {
    let history = []
    try { history = wx.getStorageSync(STORAGE_HISTORY) || [] } catch (e) {}
    const today = getDateKey(new Date())
    if (history.indexOf(today) < 0) history.push(today)
    try { wx.setStorageSync(STORAGE_HISTORY, history) } catch (e) {}
    this.persist()
    this.setData({ streak: this.computeStreak() })
  },

  persist() {
    const payload = {
      date: getDateKey(new Date()),
      bookId: this.data.bookId,
      queue: this.data.queue,
      current: this.data.current,
      known: this.data.knownCount,
      unknown: this.data.unknownCount,
      done: this.data.done
    }
    try { wx.setStorageSync(STORAGE_TODAY, payload) } catch (e) {}
  },

  onClose() {
    wx.navigateBack()
  },

  onAgain() {
    const self = this
    const bookId = this.data.bookId
    dailyWordsAsync(bookId, 20).then(words => {
      const queue = (words || []).map(w => Object.assign({}, w, { status: 'new' }))
      self.setData({
        queue,
        current: 0,
        total: queue.length,
        currentWord: queue[0] || {},
        displayIndex: 1,
        progress: 0,
        flipped: false,
        done: false,
        knownCount: 0,
        unknownCount: 0
      })
      self.persist()
    })
  }
})