// scripts/test-notify.js
// 打卡提醒（订阅消息）前端逻辑回归测试
// 说明：真正发送消息需要服务端，这里只测小程序侧可验证的部分
//
// 运行方式（在项目根目录）：
//   node scripts/test-notify.js
const store = require('../utils/store.js')

const mem = {}
global.wx = {
  getStorageSync: k => (k in mem ? mem[k] : ''),
  setStorageSync: (k, v) => { mem[k] = v }
}
function clearMem() { for (const k of Object.keys(mem)) delete mem[k] }

const notify = require('../utils/notify.js')

let pass = 0, fail = 0
function eq(label, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  ok ? pass++ : fail++
  console.log(`${ok ? '  OK  ' : '  FAIL'}  ${label}  实际=${JSON.stringify(actual)}  期望=${JSON.stringify(expected)}`)
}

// ——— 1. 默认设置 ———
console.log('— 默认设置 —')
clearMem()
const d = notify.getSettings()
eq('默认关闭', d.enabled, false)
eq('默认早间时间', d.morningTime, '07:00')
eq('默认额度 0', d.quota, 0)

// ——— 2. 设置合并 ———
console.log('— 设置读写 —')
notify.setSettings({ enabled: true, quota: 3 })
const s2 = notify.getSettings()
eq('开启状态持久化', s2.enabled, true)
eq('额度持久化', s2.quota, 3)
eq('未改动的字段保留默认', s2.eveningTime, '21:00')

// ——— 3. 时间格式校验 ———
console.log('— 时间格式校验 —')
eq('07:00 合法', notify.isValidTime('07:00'), true)
eq('21:30 合法', notify.isValidTime('21:30'), true)
eq('23:59 合法', notify.isValidTime('23:59'), true)
eq('24:00 非法', notify.isValidTime('24:00'), false)
eq('7:00 非法（缺前导 0）', notify.isValidTime('7:00'), false)
eq('空值非法', notify.isValidTime(''), false)
eq('乱写非法', notify.isValidTime('abc'), false)

// ——— 4. 模板 ID 配置校验 ———
console.log('— 模板配置校验 —')
eq('空串算占位', notify.isPlaceholder(''), true)
eq('中文占位算占位', notify.isPlaceholder('请填入模板ID'), true)
eq('真实模板 ID 不算占位', notify.isPlaceholder('aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789ab'), false)
// config.js 里目前是空串 → 未配置
eq('当前未配置模板', notify.isTemplateConfigured(), false)

// ——— 5. 未配置模板时授权应给出明确提示（不调用 wx） ———
console.log('— 未配置模板时的授权 —')
notify.requestSubscribe().then(res => {
  eq('返回失败', res.ok, false)
  eq('提示去配置模板', /模板 ID/.test(res.error || ''), true)

  // ——— 6. 每日只弹一次授权 ———
  console.log('— 授权频率限制 —')
  clearMem()
  const now = new Date(2026, 9, 8, 10, 0)
  eq('首次可请求', notify.canRequestToday(now), true)
  notify.setSettings({ lastRequestAt: now.getTime() })
  eq('同一天不再请求', notify.canRequestToday(now), false)
  eq('第二天可以再请求', notify.canRequestToday(new Date(2026, 9, 9, 10, 0)), true)

  // ——— 7. 待发内容组装 ———
  console.log('— 待发内容组装 —')
  clearMem()
  const day = new Date(2026, 9, 8, 10, 0)
  const todayKey = store.dateKey(day)

  mem[store.KEYS.englishBook] = 'basic_en_a'
  mem[store.KEYS.englishHistory] = [todayKey]
  let p = notify.buildReminderPayload(day)
  eq('今天没打卡 → 应该发送', p.shouldSend, true)
  eq('进度 0', p.done, 0)
  eq('模板字段用词书标题', p.data.thing1.value, '基础英语 · A 辑')
  eq('携带日期', p.date, todayKey)

  mem[store.KEYS.englishToday] = { date: todayKey, bookId: 'basic_en_a', queue: new Array(10).fill({}), current: 10, done: true }
  p = notify.buildReminderPayload(day)
  eq('今天已完成 → 不该发送', p.shouldSend, false)
  eq('进度 = 目标', [p.done, p.target], [10, 10])

  console.log(`\n结果：通过 ${pass} 项，失败 ${fail} 项`)
  process.exit(fail ? 1 : 0)
}).catch(err => {
  console.error('测试异常：', err)
  process.exit(1)
})
