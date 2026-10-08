// utils/store.js
// 统一数据层：本地存储的全部 key、读写、以及跨页面共用的统计计算都收在这里。
// 目的：
//   1. 页面不再各写各的 wx.getStorageSync / setStorageSync，key 和结构只有一处定义
//   2. 以后接后端（微信云开发 / 自建服务）时，只需要改这个文件里 read/write 的实现，
//      页面代码一行都不用动
const { getBook } = require('./words.js')

// —— storage keys（改 key 只改这里） ——
const KEYS = {
  englishBook: 'english.book.v1',
  englishToday: 'english.today.v1',
  englishHistory: 'english.history.v1',
  accountRecords: 'account.records.v1',
  fitnessToday: 'fitness.today.v1',
  profile: 'user.profile.v1'
}

// —— 日期工具（原来在多个页面各写了一份，现在统一） ——
function pad(n) { return n < 10 ? '0' + n : '' + n }

function dateKey(d) {
  const dt = d || new Date()
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

function monthKey(d) {
  const dt = d || new Date()
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}`
}

// —— 底层读写（切换数据源时只改这两个函数） ——
function read(key, fallback) {
  try {
    const v = wx.getStorageSync(key)
    if (v === '' || v === null || v === undefined) return fallback
    return v
  } catch (e) {
    console.warn('[store] read failed:', key, e)
    return fallback
  }
}

function write(key, value) {
  try {
    wx.setStorageSync(key, value)
    return true
  } catch (e) {
    console.warn('[store] write failed:', key, e)
    return false
  }
}

// ============ 英语打卡 ============
function getEnglishBookId() {
  return read(KEYS.englishBook, 'basic_en_a')
}

function setEnglishBookId(id) {
  return write(KEYS.englishBook, id)
}

function getEnglishToday() {
  return read(KEYS.englishToday, null)
}

function setEnglishToday(payload) {
  return write(KEYS.englishToday, payload)
}

function getEnglishHistory() {
  const list = read(KEYS.englishHistory, [])
  return Array.isArray(list) ? list : []
}

function addEnglishHistoryDay(day) {
  const list = getEnglishHistory()
  const key = day || dateKey(new Date())
  if (list.indexOf(key) < 0) list.push(key)
  write(KEYS.englishHistory, list)
  return list
}

// 连续打卡天数：从今天往前数，遇到没打卡的就断
function countStreak(history, from) {
  const list = Array.isArray(history) ? history : []
  if (!list.length) return 0
  let streak = 0
  const cursor = from ? new Date(from) : new Date()
  while (list.indexOf(dateKey(cursor)) >= 0) {
    streak++
    cursor.setDate(cursor.getDate() - 1)
  }
  return streak
}

// 今日英语打卡视图（英语页 + 首页共用，保证两处数字一致）
function getEnglishSummary(now) {
  const today = dateKey(now)
  const bookId = getEnglishBookId()
  const book = getBook(bookId)
  const stored = getEnglishToday()
  const history = getEnglishHistory()

  let done = 0
  let target = (book && book.totalWords) || 20

  if (stored && stored.date === today && stored.bookId === bookId && stored.queue && stored.queue.length) {
    target = stored.queue.length
    done = stored.done ? stored.queue.length : (stored.current || 0)
  }

  return {
    done,
    target,
    progress: target ? Math.round(done / target * 100) : 0,
    finished: target > 0 && done >= target,
    streak: countStreak(history, now),
    totalDays: history.length,
    bookId,
    bookTitle: book ? book.title : '',
    dayIndex: history.length || 1
  }
}

// ============ 记账 ============
function getRecords() {
  const list = read(KEYS.accountRecords, [])
  return Array.isArray(list) ? list : []
}

function setRecords(list) {
  return write(KEYS.accountRecords, Array.isArray(list) ? list : [])
}

function sumExpense(list, filterFn) {
  return (list || [])
    .filter(it => it && it.type === '支出' && (!filterFn || filterFn(it)))
    .reduce((s, it) => s + (it.cents || 0), 0)
}

// 首页用的记账摘要：今日支出 / 本月支出 / 今日笔数 / 最近几笔
function getLedgerSummary(now, recentLimit) {
  const records = getRecords()
  const today = dateKey(now)
  const month = monthKey(now)

  const recent = records
    .slice()
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .slice(0, recentLimit || 3)

  return {
    todayCents: sumExpense(records, it => it.date === today),
    monthCents: sumExpense(records, it => String(it.date || '').slice(0, 7) === month),
    todayCount: records.filter(it => it && it.date === today).length,
    recent
  }
}

// ============ 健身 ============
function getFitnessToday(now) {
  const stored = read(KEYS.fitnessToday, null)
  if (!stored) return null
  return stored.date === dateKey(now) ? stored : null
}

function setFitnessToday(payload) {
  return write(KEYS.fitnessToday, payload)
}

// ============ 个人资料 ============
// 目前只存在本地；以后接入账号体系（登录后拉取）改这里即可
const DEFAULT_PROFILE = { nickname: 'Jesse' }

function getProfile() {
  const p = read(KEYS.profile, null)
  return Object.assign({}, DEFAULT_PROFILE, p || {})
}

function setProfile(patch) {
  const next = Object.assign({}, getProfile(), patch || {})
  write(KEYS.profile, next)
  return next
}

module.exports = {
  KEYS,
  dateKey, monthKey, countStreak,
  read, write,
  getEnglishBookId, setEnglishBookId,
  getEnglishToday, setEnglishToday,
  getEnglishHistory, addEnglishHistoryDay, getEnglishSummary,
  getRecords, setRecords, getLedgerSummary,
  getFitnessToday, setFitnessToday,
  getProfile, setProfile, DEFAULT_PROFILE
}
