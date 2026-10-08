// pages/english/index.js
const { dateWithSuffix } = require('../../utils/date.js')
const { listBooks, getBook, listBooksAsync } = require('../../utils/words.js')

const STORAGE_BOOK = 'english.book.v1'
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
    dateLabel: '',
    books: [],
    bookId: 'basic_en_a',
    bookTitle: '',
    dayIndex: 1,
    streak: 0,
    done: 0,
    target: 20,
    progress: 0,
    ctaText: '开始今日打卡',
    remote: false
  },

  onLoad() {
    this.refresh()
    this.fetchBooks()
  },

  onShow() {
    this.refresh()
  },

  fetchBooks() {
    const self = this
    listBooksAsync().then(books => {
      if (books && books.length) {
        self.setData({ books, remote: true })
      }
    })
  },

  refresh() {
    const books = this.data.books && this.data.books.length ? this.data.books : listBooks()
    const bookId = wx.getStorageSync(STORAGE_BOOK) || 'basic_en_a'
    const book = getBook(bookId)
    const { done, target } = this.todayState(bookId)
    const streak = this.computeStreak()

    let ctaText = '开始今日打卡'
    if (done >= target) ctaText = '再来一组'
    else if (done > 0) ctaText = '继续打卡'

    this.setData({
      dateLabel: dateWithSuffix(new Date()),
      books,
      bookId,
      bookTitle: book.title,
      dayIndex: this.computeDayIndex(),
      streak,
      done,
      target,
      progress: target ? Math.round(done / target * 100) : 0,
      ctaText
    })
  },

  todayState(bookId) {
    let stored = null
    try { stored = wx.getStorageSync(STORAGE_TODAY) || null } catch (e) {}
    const today = getDateKey(new Date())
    if (stored && stored.date === today && stored.bookId === bookId && stored.queue && stored.queue.length) {
      const done = stored.done ? stored.queue.length : (stored.current || 0)
      return { done, target: stored.queue.length }
    }
    // 还没开始：目标数用词书实际词数，避免首页显示 0/20 但实际只有 10 个词
    const b = getBook(bookId)
    return { done: 0, target: (b && b.totalWords) || 20 }
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

  // "第几天" = 已打卡天数（没有记录时算第 1 天）
  computeDayIndex() {
    let history = []
    try { history = wx.getStorageSync(STORAGE_HISTORY) || [] } catch (e) {}
    return history.length || 1
  },

  onSelectBook(e) {
    const id = e.currentTarget.dataset.id
    if (!id || id === this.data.bookId) return
    try { wx.setStorageSync(STORAGE_BOOK, id) } catch (e) {}
    const book = getBook(id)
    const { done, target } = this.todayState(id)
    let ctaText = '开始今日打卡'
    if (done >= target) ctaText = '再来一组'
    else if (done > 0) ctaText = '继续打卡'
    this.setData({
      bookId: id,
      bookTitle: book.title,
      done,
      target,
      progress: target ? Math.round(done / target * 100) : 0,
      ctaText
    })
  },

  onTapStart() {
    wx.navigateTo({ url: '/pages/english/study/index' })
  }
})