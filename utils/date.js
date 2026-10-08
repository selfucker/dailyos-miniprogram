// utils/date.js
// 简易日期工具，不引入 dayjs 减少包体
function pad(n) { return n < 10 ? '0' + n : '' + n }

function todayStr(d) {
  const dt = d || new Date()
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`
}

function greet(d) {
  const h = (d || new Date()).getHours()
  if (h < 5) return '夜深了'
  if (h < 11) return '早安'
  if (h < 14) return '午安'
  if (h < 18) return '下午好'
  return '晚上好'
}

function weekdayCn(d) {
  const map = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return map[(d || new Date()).getDay()]
}

function dateWithSuffix(d) {
  const dt = d || new Date()
  return `${dt.getMonth() + 1}月${dt.getDate()}日 · ${weekdayCn(dt)}`
}

function shortStamp(d) {
  const dt = d || new Date()
  return `${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

module.exports = { todayStr, greet, weekdayCn, dateWithSuffix, shortStamp }
