// utils/words.js
// 词书数据层：默认走本地占位，异步 fetch 后端 /words/books + /words/books/{code}/daily
// 后端未跑或网络异常时自动 fallback 到本地占位词，保证学习流程不中断。
const { request, withFallback } = require('./request.js')

const PLACEHOLDER_BOOKS = [
  { id: 'basic_en_a', code: 'basic_en_a', title: '基础英语 · A 辑', subtitle: '本地占位', totalWords: 10 },
  { id: 'basic_en_b', code: 'basic_en_b', title: '基础英语 · B 辑', subtitle: '本地占位', totalWords: 0 }
]

const PLACEHOLDER_WORDS = {
  basic_en_a: [
    { word: 'apple', phonetic: '/ˈæpl/',  meaning: 'n. 苹果', example: 'An apple a day.' },
    { word: 'book',  phonetic: '/bʊk/',   meaning: 'n. 书',   example: 'Open the book.' },
    { word: 'cat',   phonetic: '/kæt/',   meaning: 'n. 猫',   example: 'The cat is on the mat.' },
    { word: 'dog',   phonetic: '/dɔːɡ/',  meaning: 'n. 狗',   example: 'The dog runs fast.' },
    { word: 'egg',   phonetic: '/eɡ/',    meaning: 'n. 蛋',   example: 'Boil the egg.' },
    { word: 'fish',  phonetic: '/fɪʃ/',   meaning: 'n. 鱼',   example: 'Catch a fish.' },
    { word: 'go',    phonetic: '/ɡoʊ/',   meaning: 'v. 去',   example: 'Let us go.' },
    { word: 'home',  phonetic: '/hoʊm/',  meaning: 'n. 家',   example: 'Go home now.' },
    { word: 'ice',   phonetic: '/aɪs/',   meaning: 'n. 冰',   example: 'Ice is cold.' },
    { word: 'jump',  phonetic: '/dʒʌmp/', meaning: 'v. 跳',   example: 'Jump over it.' }
  ],
  basic_en_b: []
}

function listBooks() {
  return PLACEHOLDER_BOOKS
}

function getBook(id) {
  const found = PLACEHOLDER_BOOKS.find(b => b.id === id) || PLACEHOLDER_BOOKS[0]
  return {
    id: found.id, code: found.code || found.id,
    title: found.title, subtitle: found.subtitle || '',
    totalWords: found.totalWords || 0
  }
}

function getWords(id, count) {
  const list = PLACEHOLDER_WORDS[id] || PLACEHOLDER_WORDS.basic_en_a
  const arr = list.slice()
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  const n = Math.min(count || 20, arr.length)
  return arr.slice(0, n)
}

/* 异步：拉远端词书，远端失败用本地 */
async function listBooksAsync() {
  return withFallback(
    request('/words/books').then(rows => (rows || []).map(r => ({
      id: r.code, code: r.code, title: r.title,
      subtitle: r.totalWords ? (r.totalWords + ' 词') : '空',
      totalWords: r.totalWords || 0
    }))),
    () => listBooks()
  )
}

async function dailyWordsAsync(code, count) {
  return withFallback(
    request('/words/books/' + code + '/daily?count=' + (count || 20)),
    () => getWords(code, count || 20)
  )
}

module.exports = {
  listBooks, getWords, getBook,
  listBooksAsync, dailyWordsAsync,
  PLACEHOLDER_BOOKS
}