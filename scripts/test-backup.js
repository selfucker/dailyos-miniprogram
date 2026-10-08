// scripts/test-backup.js
// 备份功能回归测试（纯逻辑，不依赖真机/微信环境）
//
// 运行方式（在项目根目录）：
//   node scripts/test-backup.js
const store = require('../utils/store.js')
const backup = require('../utils/backup.js')

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
function ok(label, cond) { eq(label, !!cond, true) }

// ——— 造数据 ———
const now = new Date()
const today = store.dateKey(now)
const y1 = new Date(now); y1.setDate(y1.getDate() - 1)

mem[store.KEYS.englishBook] = 'basic_en_a'
mem[store.KEYS.englishToday] = { date: today, bookId: 'basic_en_a', queue: new Array(10).fill({}), current: 10, done: true, known: 7, unknown: 3 }
mem[store.KEYS.englishHistory] = [store.dateKey(y1), today]
mem[store.KEYS.accountRecords] = [
  { id: 'a', ts: 2, date: today, type: '支出', category: '餐', label: '午餐', cents: 3200 },
  { id: 'b', ts: 1, date: today, type: '支出', category: '交通', label: '地铁', cents: 1800 }
]
mem[store.KEYS.fitnessToday] = { date: today, parts: ['胸'], durationMin: 40, intakeKcal: 900, totalP: 90, totalC: 100, totalF: 30 }
store.setProfile({ nickname: '小明' })

// ——— 1. collect 结构 ———
console.log('— collect —')
const payload = backup.collect()
eq('app', payload.app, 'DailyOS')
eq('version', payload.version, backup.BACKUP_VERSION)
ok('导出时间存在', typeof payload.exportedAt === 'string' && payload.exportedAt.length > 10)
eq('含 6 类数据', Object.keys(payload.data).sort(), ['englishBook', 'englishHistory', 'englishToday', 'fitnessToday', 'profile', 'records'])

// ——— 2. summarize ———
console.log('— summarize —')
const s0 = backup.summarize(payload)
eq('记账笔数', s0.records, 2)
eq('记账金额合计', s0.recordsYuan, '50.00')
eq('打卡天数', s0.englishDays, 2)
eq('有今日打卡会话', s0.hasEnglishSession, true)
eq('有今日健身', s0.hasFitnessToday, true)
eq('昵称', s0.nickname, '小明')

// ——— 3. 文本往返 ———
console.log('— 序列化 / 解析 —')
const text = JSON.stringify(payload, null, 2)
const parsed = backup.parseBackup(text)
eq('解析成功', parsed.ok, true)
eq('解析出的记账笔数', parsed.summary.records, 2)

// ——— 4. 非法输入必须被挡住 ———
console.log('— 非法输入 —')
const bad = [
  ['空字符串', ''],
  ['非 JSON', 'hello world'],
  ['JSON 但不是对象', '[1,2,3]'],
  ['别的 App 的备份', JSON.stringify({ app: 'OtherApp', version: 1, data: {} })],
  ['版本更高', JSON.stringify({ app: 'DailyOS', version: 999, data: {} })],
  ['没有 data', JSON.stringify({ app: 'DailyOS', version: 1 })],
  ['records 不是数组', JSON.stringify({ app: 'DailyOS', version: 1, data: { records: 'oops' } })],
  ['englishHistory 不是数组', JSON.stringify({ app: 'DailyOS', version: 1, data: { englishHistory: 5 } })]
]
for (const [label, input] of bad) {
  const r = backup.parseBackup(input)
  eq(`拒绝：${label}`, r.ok, false)
}

// ——— 5. 覆盖导入（往返恢复） ———
console.log('— 覆盖导入 —')
clearMem()
eq('清空后记账为 0', store.getRecords().length, 0)
const out1 = backup.applyBackup(parsed.payload, 'replace')
eq('恢复后记账笔数', store.getRecords().length, 2)
eq('恢复后打卡天数', store.getEnglishHistory().length, 2)
eq('恢复后词书', store.getEnglishBookId(), 'basic_en_a')
eq('恢复后昵称', store.getProfile().nickname, '小明')
eq('恢复后今日健身', !!store.getFitnessToday(now), true)
eq('applyBackup 返回摘要笔数', out1.records, 2)

// ——— 6. 合并导入（按 id 去重 + 打卡取并集） ———
console.log('— 合并导入 —')
clearMem()
store.setRecords([{ id: 'b', ts: 1, date: today, type: '支出', category: '餐', label: '旧的地铁', cents: 100 }])
store.write(store.KEYS.englishHistory, ['2020-01-01'])
const mergePayload = {
  app: 'DailyOS', version: 1, data: {
    records: [
      { id: 'b', ts: 9, date: today, type: '支出', category: '交通', label: '新的地铁', cents: 1800 },
      { id: 'c', ts: 3, date: today, type: '支出', category: '购物', label: '帽子', cents: 5000 }
    ],
    englishHistory: [today, '2020-01-01']
  }
}
backup.applyBackup(mergePayload, 'merge')
const merged = store.getRecords()
eq('合并后笔数（b 去重 + c 新增）', merged.length, 2)
eq('同 id 以导入的为准', merged.find(r => r.id === 'b').cents, 1800)
eq('打卡历史取并集', store.getEnglishHistory().sort(), ['2020-01-01', today].sort())

// ——— 7. 文件名 ———
console.log('— 文件名 —')
ok('文件名格式正确', /^dailyos-backup-\d{8}\.json$/.test(backup.backupFileName(now)))

console.log(`\n结果：通过 ${pass} 项，失败 ${fail} 项`)
process.exit(fail ? 1 : 0)
