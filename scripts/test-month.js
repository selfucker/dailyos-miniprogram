// scripts/test-month.js
// 记账月度统计回归测试
//
// 运行方式（在项目根目录）：
//   node scripts/test-month.js
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

const R = (id, date, type, category, cents) => ({ id, ts: Number(id), date, type, category, label: category, cents })

// ——— 造数据：2026-10 与 2026-09 两个月 ———
clearMem()
store.setRecords([
  R('1', '2026-10-01', '支出', '餐', 3200),
  R('2', '2026-10-01', '支出', '交通', 800),
  R('3', '2026-10-05', '支出', '餐', 2000),
  R('4', '2026-10-05', '收入', '工资', 900000),
  R('5', '2026-10-20', '支出', '购物', 4000),
  R('6', '2026-09-30', '支出', '餐', 9999)      // 上个月，不该计入
])

// ——— 1. 总计 ———
console.log('— 收支总计 —')
const s = store.getMonthStats('2026-10')
eq('支出合计', s.expenseCents, 3200 + 800 + 2000 + 4000)
eq('收入合计', s.incomeCents, 900000)
eq('结余 = 收入 - 支出', s.netCents, 900000 - 10000)
eq('笔数（含收入）', s.count, 5)
eq('月份回传', s.month, '2026-10')

// ——— 2. 分类占比 ———
console.log('— 分类占比 —')
eq('分类数量', s.byCategory.length, 3)
eq('按金额倒序（餐 52 元 > 购物 40 元 > 交通 8 元）', s.byCategory.map(c => c.category), ['餐', '购物', '交通'])
eq('餐合计', s.byCategory.find(c => c.category === '餐').cents, 5200)
eq('购物占比', s.byCategory.find(c => c.category === '购物').ratio, 40)
eq('餐占比', s.byCategory.find(c => c.category === '餐').ratio, 52)
eq('交通占比', s.byCategory.find(c => c.category === '交通').ratio, 8)
eq('收入不进分类', s.byCategory.some(c => c.category === '工资'), false)

// ——— 3. 按日汇总 ———
console.log('— 按日汇总 —')
eq('十月天数', s.byDay.length, 31)
eq('1 号合计', s.byDay[0].cents, 4000)
eq('2 号无支出', s.byDay[1].cents, 0)
eq('5 号只算支出（收入不计）', s.byDay[4].cents, 2000)
eq('20 号合计', s.byDay[19].cents, 4000)
eq('单日最大值', s.maxDayCents, 4000)

// ——— 4. 边界 ———
console.log('— 边界 —')
const feb = store.getMonthStats('2026-02')
eq('2026 年 2 月天数（平年）', feb.byDay.length, 28)
eq('2028 年 2 月天数（闰年）', store.getMonthStats('2028-02').byDay.length, 29)
eq('四月天数', store.getMonthStats('2026-04').byDay.length, 30)
eq('空月份支出为 0', store.getMonthStats('2020-01').expenseCents, 0)
eq('空月份分类为空', store.getMonthStats('2020-01').byCategory, [])
eq('空月份 maxDayCents 为 0', store.getMonthStats('2020-01').maxDayCents, 0)
eq('daysInMonthOf 非法输入兜底', store.daysInMonthOf('bad'), 30)

// ——— 5. 无收入时占比不炸（除零） ———
console.log('— 除零保护 —')
clearMem()
store.setRecords([R('9', '2026-10-02', '收入', '工资', 5000)])
const onlyIncome = store.getMonthStats('2026-10')
eq('只有收入时支出为 0', onlyIncome.expenseCents, 0)
eq('只有收入时分类为空', onlyIncome.byCategory, [])
eq('只有收入时结余为正', onlyIncome.netCents, 5000)

console.log(`\n结果：通过 ${pass} 项，失败 ${fail} 项`)
process.exit(fail ? 1 : 0)
