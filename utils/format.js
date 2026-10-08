// utils/format.js
function yuan(cents) {
  const n = (cents || 0) / 100
  return '¥' + n.toFixed(2)
}

function yuanFromYuan(y) {
  return '¥' + (Number(y) || 0).toFixed(2)
}

function minutesText(min) {
  return (min || 0) + ' 分钟'
}

function calorieText(kcal) {
  return (kcal || 0) + ' kcal'
}

module.exports = { yuan, yuanFromYuan, minutesText, calorieText }
