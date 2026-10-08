// pages/english/index.js
const { dateWithSuffix } = require('../../utils/date.js')
const { listBooks, listBooksAsync } = require('../../utils/words.js')
const store = require('../../utils/store.js')

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

  // 今日进度 / 连续天数 / 第几天，全部由数据层计算（和首页共用同一套逻辑，避免两处数字不一致）
  refresh() {
    const books = this.data.books && this.data.books.length ? this.data.books : listBooks()
    const s = store.getEnglishSummary(new Date())
    const ctaText = s.finished ? '再来一组' : (s.done > 0 ? '继续打卡' : '开始今日打卡')

    this.setData({
      dateLabel: dateWithSuffix(new Date()),
      books,
      bookId: s.bookId,
      bookTitle: s.bookTitle,
      dayIndex: s.dayIndex,
      streak: s.streak,
      done: s.done,
      target: s.target,
      progress: s.progress,
      ctaText
    })
  },

  onSelectBook(e) {
    const id = e.currentTarget.dataset.id
    if (!id || id === this.data.bookId) return
    store.setEnglishBookId(id)
    this.refresh()
  },

  onTapStart() {
    wx.navigateTo({ url: '/pages/english/study/index' })
  },

  // —— 分享 ——
  // 右上角「···」转发、以及页面上 open-type="share" 的按钮，都会走到这里
  onShareAppMessage() {
    return {
      title: this.buildShareTitle(),
      path: '/pages/english/index'
    }
  },

  // 分享到朋友圈（定义了它，菜单里才会出现"分享到朋友圈"这一项）
  onShareTimeline() {
    return {
      title: this.buildShareTitle(),
      query: ''
    }
  },

  // 分享卡片标题：按今天的真实进度生成
  buildShareTitle() {
    const { bookTitle, done, target, streak } = this.data
    const days = streak > 0 ? `，连续 ${streak} 天` : ''
    if (target > 0 && done >= target) {
      return `今天背完 ${target} 个单词 ✅ ${bookTitle}${days}，一起来练英语`
    }
    if (done > 0) {
      return `今日英语打卡 ${done}/${target}${days}，一起来背单词吧`
    }
    return `今天要背《${bookTitle}》${target} 个词，一起来打卡吗？`
  }
})
