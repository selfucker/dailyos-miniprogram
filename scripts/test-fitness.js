// scripts/test-fitness.js
// 健身历史记录与统计回归测试
//
// 运行方式（在项目根目录）：
//   node scripts/test-fitness.js
const store = require('../utils/store.js')

const mem = {}
global.wx = {
  getStorageSync: k => (k in mem ? mem[k] : ''),
  setStorageSync: (k, v) => { mem[k] = v }
}
function clearMem() { for (const k of Object.keys(mem)) delete mem[k] }

let pass = 0, fail = 0
function eq(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  ok ? pass++ : fail++
  console.log(`${ok ? '  OK  ' : '  FAIL'}  ${label}  实际=${JSON.stringify(actual)}  期望=${JSON.stringify(expected)}`)
}
function mondayOf(d) {
  const m = new Date(d)
  m.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return m
}

const now = new Date(2026, 9, 21, 12, 0)   // 固定时间，保证可复现

// ——— 1. 写入与 upsert ———
console.log('— 写入与 upsert —')
clearMem()
eq('初始历史为空', store.getFitnessHistory(), [])
store.appendFitnessDay({ date: '2026-10-21', durationMin: 40, parts: ['胸', '三头'], weight: 68.5, intakeKcal: 1500, totalP: 100 })
store.appendFitnessDay({ date: '2026-10-21', durationMin: 55, parts: ['背'], weight: 68.2, intakeKcal: 1800, totalP: 120 })
const h1 = store.getFitnessHistory()
eq('同一天只保留一条', h1.length, 1)
eq('内容被更新（时长）', h1[0].durationMin, 55)
eq('内容被更新（部位）', h1[0].parts, ['背'])
eq('无 date 的记录被忽略', store.appendFitnessDay({ durationMin: 10 }).length, 1)

// ——— 2. 按日期排序 ———
console.log('— 按日期排序 —')
clearMem()
store.appendFitnessDay({ date: '2026-10-05', durationMin: 30 })
store.appendFitnessDay({ date: '2026-10-01', durationMin: 30 })
store.appendFitnessDay({ date: '2026-10-03', durationMin: 30 })
eq('日期升序', store.getFitnessHistory().map(d => d.date), ['2026-10-01', '2026-10-03', '2026-10-05'])

// ——— 3. 本周统计（按周一起算） ———
console.log('— 本周统计 —')
clearMem()
const mon = mondayOf(now)
for (let i = 0; i < 7; i++) {
  const d = new Date(mon)
  d.setDate(mon.getDate() + i)
  store.appendFitnessDay({ date: store.dateKey(d), durationMin: 30 + i, parts: ['腿'] })
}
// 再插一条 8 天前的（不属于本周）
const old = new Date(mon)
old.setDate(mon.getDate() - 8)
store.appendFitnessDay({ date: store.dateKey(old), durationMin: 999 })

const st = store.getFitnessStats(now, 7)
eq('本周次数 = 7（8 天前那次不算）', st.weekCount, 7)
eq('本周时长合计', st.weekMinutes, 30 + 31 + 32 + 33 + 34 + 35 + 36)
eq('累计天数含全部记录', st.totalDays, 8)

// ——— 4. 连续天数 ———
console.log('— 连续天数 —')
clearMem()
const d1 = new Date(now); d1.setDate(now.getDate() - 1)
const d2 = new Date(now); d2.setDate(now.getDate() - 2)
const d4 = new Date(now); d4.setDate(now.getDate() - 4)   // 故意跳过第 3 天
store.appendFitnessDay({ date: store.dateKey(now), durationMin: 40, weight: 68.5 })
store.appendFitnessDay({ date: store.dateKey(d1), durationMin: 50, weight: 68.8 })
store.appendFitnessDay({ date: store.dateKey(d2), durationMin: 60, weight: 69.0 })
store.appendFitnessDay({ date: store.dateKey(d4), durationMin: 45, weight: 69.5 })

const st2 = store.getFitnessStats(now, 7)
eq('连续 3 天（第 3 天断掉）', st2.streak, 3)
eq('累计 4 天', st2.totalDays, 4)

// ——— 5. 体重趋势 ———
console.log('— 体重趋势 —')
eq('趋势数组长度 = 7', st2.trend.length, 7)
eq('趋势最后一项 = 今天', st2.trend[6].weight, 68.5)
eq('趋势里有记录的前一天', st2.trend[5].weight, 68.8)
eq('没记录的天为 0', st2.trend[3].weight, 0)
eq('最近体重', st2.latestWeight, 68.5)
eq('上一次体重', st2.prevWeight, 68.8)
eq('体重变化 -0.3', st2.weightDelta, -0.3)
eq('趋势带日期标签', /^\d+\/\d+$/.test(st2.trend[6].label), true)

// ——— 6. 今天没记录时，连续天数从昨天往前算 ———
console.log('— 今天没记录的情况 —')
clearMem()
store.appendFitnessDay({ date: store.dateKey(d1), durationMin: 50 })
store.appendFitnessDay({ date: store.dateKey(d2), durationMin: 60 })
const st3 = store.getFitnessStats(now)
eq('连续天数仍为 2（不断链）', st3.streak, 2)

// ——— 7. 上限裁剪 ———
console.log('— 上限裁剪 —')
clearMem()
const base = new Date(2026, 0, 1)
for (let i = 0; i < store.FITNESS_HISTORY_LIMIT + 5; i++) {
  const d = new Date(base)
  d.setDate(base.getDate() + i)
  store.appendFitnessDay({ date: store.dateKey(d), durationMin: 10 })
}
const trimmed = store.getFitnessHistory()
eq('裁剪到上限', trimmed.length, store.FITNESS_HISTORY_LIMIT)
eq('保留最新的（最后一天在）', trimmed[trimmed.length - 1].date, store.dateKey(new Date(base.getTime() + (store.FITNESS_HISTORY_LIMIT + 4) * 86400000)))
eq('最早的已丢弃', trimmed[0].date !== '2026-01-01', true)

// ——— 8. 与"今日记录"互不干扰 ———
console.log('— 今日记录与历史独立 —')
clearMem()
store.setFitnessToday({ date: store.dateKey(now), durationMin: 99 })
eq('只写今日记录时历史为空', store.getFitnessStats(now).totalDays, 0)
eq('今日记录可单独读取', store.getFitnessToday(now).durationMin, 99)

// ——— 9. 空数据边界 ———
console.log('— 空数据边界 —')
clearMem()
const empty = store.getFitnessStats(now)
eq('空数据次数 0', empty.weekCount, 0)
eq('空数据连续 0', empty.streak, 0)
eq('空数据体重 0', empty.latestWeight, 0)
eq('空数据趋势仍返回 7 项', empty.trend.length, 7)

console.log(`\n结果：通过 ${pass} 项，失败 ${fail} 项`)
process.exit(fail ? 1 : 0)
