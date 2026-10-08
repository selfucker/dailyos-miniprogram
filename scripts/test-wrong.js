// scripts/test-wrong.js
// 错词本 / 复习队列 回归测试
//
// 运行方式（在项目根目录）：
//   node scripts/test-wrong.js
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

const W = (word, extra) => Object.assign({ word, phonetic: '/' + word + '/', meaning: 'n. ' + word, example: 'a ' + word }, extra || {})

// ——— 1. 收录 ———
console.log('— 收录错词 —')
clearMem()
store.addWrongWord(W('apple'))
let list = store.getWrongWords()
eq('新增 1 条', list.length, 1)
eq('错误次数 = 1', list[0].wrongCount, 1)
eq('连对 = 0', list[0].rightStreak, 0)
eq('保留了释义', list[0].meaning, 'n. apple')

store.addWrongWord(W('apple'))
list = store.getWrongWords()
eq('重复答错不新增条目', list.length, 1)
eq('错误次数累加 = 2', list[0].wrongCount, 2)

// ——— 2. 毕业机制（连对 2 次移出） ———
console.log('— 毕业机制 —')
let r1 = store.markWrongWordRight('apple')
eq('第 1 次答对：未移出', r1.removed, false)
eq('第 1 次答对：连对 1', r1.rightStreak, 1)
eq('列表里仍在', store.getWrongWords().length, 1)

let r2 = store.markWrongWordRight('apple')
eq('第 2 次答对：移出', r2.removed, true)
eq('移出后列表为空', store.getWrongWords().length, 0)

// ——— 3. 中间又答错 → 连对清零 ———
console.log('— 答错清零 —')
clearMem()
store.addWrongWord(W('book'))
store.markWrongWordRight('book')                       // 连对 1
store.addWrongWord(W('book'))                          // 又答错
const b = store.getWrongWords()[0]
eq('连对清零', b.rightStreak, 0)
eq('错误次数 = 2', b.wrongCount, 2)
const r3 = store.markWrongWordRight('book')
eq('清零后再答对只到 1（不会直接毕业）', r3.rightStreak, 1)

// ——— 4. 复习排序：错的多的优先，其次最近错的 ———
console.log('— 复习队列排序 —')
clearMem()
store.setWrongWords([
  W('a', { wrongCount: 1, addedAt: 1, lastSeenAt: 1 }),
  W('b', { wrongCount: 5, addedAt: 2, lastSeenAt: 2 }),
  W('c', { wrongCount: 1, addedAt: 3, lastSeenAt: 99 }),
  W('d', { wrongCount: 5, addedAt: 4, lastSeenAt: 50 })
])
eq('复习顺序', store.pickReviewWords(10).map(w => w.word), ['d', 'b', 'c', 'a'])
eq('带 review 标记', store.pickReviewWords(1)[0].source, 'review')
eq('limit 生效', store.pickReviewWords(2).length, 2)

// ——— 5. 组今日队列：错词在前、新词去重、总数受限 ———
console.log('— 组今日队列 —')
clearMem()
store.setWrongWords([W('apple', { wrongCount: 3, addedAt: 1, lastSeenAt: 1 }), W('cat', { wrongCount: 2, addedAt: 2, lastSeenAt: 2 })])
const newWords = [W('apple'), W('dog'), W('egg'), W('fish')]
const q = store.buildDailyQueue(newWords, 8, 20)
eq('错词排在最前', q.slice(0, 2).map(w => w.word), ['apple', 'cat'])
eq('错词来源标记', q[0].source, 'review')
eq('新词去重（apple 不再作为新词出现）', q.filter(w => w.word === 'apple').length, 1)
eq('新词标记', q[2].source, 'new')
eq('总数', q.length, 5)
eq('总数上限生效', store.buildDailyQueue(newWords, 8, 3).length, 3)

// ——— 6. 手动移出 ———
console.log('— 手动移出 —')
clearMem()
store.addWrongWord(W('dog'))
store.addWrongWord(W('egg'))
store.removeWrongWord('dog')
eq('手动移出后只剩 egg', store.getWrongWords().map(w => w.word), ['egg'])

// ——— 7. 上限裁剪（丢最早的） ———
console.log('— 上限裁剪 —')
clearMem()
const many = []
for (let i = 0; i < store.WRONG_LIMIT + 5; i++) many.push(W('w' + i, { wrongCount: 1, addedAt: i, lastSeenAt: i }))
store.setWrongWords(many)
const kept = store.getWrongWords()
eq('裁剪到上限', kept.length, store.WRONG_LIMIT)
eq('保留的是最新的（新加入的在）', kept.some(w => w.word === 'w' + (store.WRONG_LIMIT + 4)), true)
eq('最早加入的已被丢弃', kept.some(w => w.word === 'w0'), false)

// ——— 8. 摘要 ———
console.log('— 摘要 —')
clearMem()
store.setWrongWords([W('a', { wrongCount: 1, rightStreak: 0, addedAt: 1 }), W('b', { wrongCount: 1, rightStreak: 1, addedAt: 2 })])
const s = store.getWrongSummary()
eq('count', s.count, 2)
eq('almost（已连对 1 次）', s.almost, 1)

// ——— 9. 空数据边界 ———
console.log('— 空数据边界 —')
clearMem()
eq('空错词本 count', store.getWrongSummary().count, 0)
eq('空错词本复习队列', store.pickReviewWords(5), [])
eq('空错词本组队列（只有新词）', store.buildDailyQueue([W('x')], 8, 20).length, 1)
eq('对不存在的词标记答对不报错', store.markWrongWordRight('nope').removed, false)

console.log(`\n结果：通过 ${pass} 项，失败 ${fail} 项`)
process.exit(fail ? 1 : 0)
