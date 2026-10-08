// scripts/test-store.js
// 数据层回归测试：用假的 wx 存储跑一遍 utils/store.js 的计算逻辑
//
// 运行方式（在项目根目录）：
//   node scripts/test-store.js
// 全绿（exit code 0）说明数据层正常；有 FAIL 会打印实际值 vs 期望值。
const store = require('../utils/store.js')

const mem = {}
global.wx = {
  getStorageSync: k => (k in mem ? mem[k] : ''),
  setStorageSync: (k, v) => { mem[k] = v }
}

const now = new Date()
const today = store.dateKey(now)
const y1 = new Date(now); y1.setDate(y1.getDate() - 1)
const y2 = new Date(now); y2.setDate(y2.getDate() - 2)
const ym = new Date(now); ym.setDate(ym.getDate() - 40)   // 上个月

mem[store.KEYS.englishBook] = 'basic_en_a'
mem[store.KEYS.englishToday] = {
  date: today, bookId: 'basic_en_a',
  queue: new Array(10).fill({ word: 'x' }),
  current: 10, done: true, known: 8, unknown: 2
}
mem[store.KEYS.englishHistory] = [store.dateKey(y2), store.dateKey(y1), today]  // 连续 3 天
mem[store.KEYS.accountRecords] = [
  { id: 'a', ts: 5, date: today,             type: '支出', category: '餐',   label: '午餐', cents: 3200 },
  { id: 'b', ts: 4, date: today,             type: '支出', category: '交通', label: '地铁', cents: 1800 },
  { id: 'c', ts: 3, date: store.dateKey(y1), type: '支出', category: '购物', label: '衣服', cents: 5000 },
  { id: 'd', ts: 2, date: store.dateKey(y1), type: '收入', category: '工资', label: '工资', cents: 900000 },
  { id: 'e', ts: 1, date: store.dateKey(ym), type: '支出', category: '餐',   label: '上上月', cents: 8888 }
]
mem[store.KEYS.fitnessToday] = {
  date: today, parts: ['胸', '三头'], durationMin: 58,
  intakeKcal: 1820, totalP: 145, totalC: 180, totalF: 55
}

let pass = 0, fail = 0
function eq(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  ok ? pass++ : fail++
  console.log(`${ok ? '  OK  ' : '  FAIL'}  ${label}  实际=${JSON.stringify(actual)}  期望=${JSON.stringify(expected)}`)
}

const en = store.getEnglishSummary(now)
console.log('— 英语打卡 —')
eq('done', en.done, 10)
eq('target', en.target, 10)
eq('progress', en.progress, 100)
eq('finished', en.finished, true)
eq('streak 连续 3 天', en.streak, 3)
eq('totalDays', en.totalDays, 3)
eq('bookTitle', en.bookTitle, '基础英语 · A 辑')

const lg = store.getLedgerSummary(now, 3)
console.log('— 记账 —')
eq('今日支出 3200+1800', lg.todayCents, 5000)
eq('本月支出（不含上月、收入不计）', lg.monthCents, 10000)
eq('今日笔数', lg.todayCount, 2)
eq('最近 3 笔条数', lg.recent.length, 3)
eq('最近第一笔按 ts 倒序', lg.recent[0].id, 'a')

console.log('— 健身 / 资料 —')
eq('今日健身已记录', !!store.getFitnessToday(now), true)
eq('昨日健身返回 null', store.getFitnessToday(y1), null)
eq('默认昵称', store.getProfile().nickname, 'Jesse')
store.setProfile({ nickname: '小明' })
eq('设置后昵称', store.getProfile().nickname, '小明')

console.log('— 边界：空数据 —')
for (const k of Object.keys(mem)) delete mem[k]
const en2 = store.getEnglishSummary(now)
eq('空数据 done', en2.done, 0)
eq('空数据 streak', en2.streak, 0)
eq('空数据 target 取词书词数', en2.target, 10)
eq('空数据 finished', en2.finished, false)
eq('空数据今日支出', store.getLedgerSummary(now).todayCents, 0)

console.log(`\n结果：通过 ${pass} 项，失败 ${fail} 项`)
process.exit(fail ? 1 : 0)
