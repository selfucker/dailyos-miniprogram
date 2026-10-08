// scripts/check-project.js
// 项目静态检查：把踩过的坑变成自动检查，防止再犯
//
// 运行方式（在项目根目录）：
//   node scripts/check-project.js
// 全部通过时 exit code = 0；有问题会逐条列出并 exit code = 1
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const problems = []
const stats = { wxml: 0, handlers: 0, files: 0 }

function walk(dir, out) {
  out = out || []
  if (!fs.existsSync(dir)) return out
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name)
    if (fs.statSync(p).isDirectory()) walk(p, out)
    else out.push(p)
  }
  return out
}

function rel(p) { return path.relative(ROOT, p).replace(/\\/g, '/') }

// ——— 1) app.json 注册 pages vs 磁盘实际文件 ———
const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, 'app.json'), 'utf8'))
const registered = appJson.pages || []
const pageFiles = walk(path.join(ROOT, 'pages')).filter(f => f.endsWith('.js') && path.basename(f) === 'index.js')
const pageDirs = pageFiles.map(f => rel(f).replace(/\.js$/, ''))

for (const d of pageDirs) {
  if (registered.indexOf(d) < 0) problems.push(`[页面注册] ${d} 存在于磁盘，但没写进 app.json 的 pages（wx.navigateTo 会静默失败）`)
}
for (const r of registered) {
  if (pageDirs.indexOf(r) < 0) problems.push(`[页面注册] app.json 注册了 ${r}，但磁盘上没有这个页面`)
}

// ——— 2) 页面四件套完整性 ———
for (const d of pageDirs) {
  for (const ext of ['js', 'json', 'wxml', 'wxss']) {
    const f = path.join(ROOT, d + '.' + ext)
    if (!fs.existsSync(f)) problems.push(`[缺文件] ${d}.${ext} 不存在`)
    else stats.files++
  }
}

// ——— 3) 组件 usingComponents 路径是否可解析 ———
for (const f of walk(ROOT).filter(x => x.endsWith('.json'))) {
  let j
  try { j = JSON.parse(fs.readFileSync(f, 'utf8')) } catch (e) { continue }
  const uc = j && j.usingComponents
  if (!uc) continue
  for (const key of Object.keys(uc)) {
    const target = uc[key]
    const base = target.startsWith('/') ? path.join(ROOT, target) : path.join(path.dirname(f), target)
    if (!fs.existsSync(base + '.wxml') || !fs.existsSync(base + '.js')) {
      problems.push(`[组件] ${rel(f)} 里注册的 "${key}": "${target}" 找不到对应组件文件`)
    }
  }
}

// ——— 4) WXML：事件方法存在性 + wx:if/for 混用 + wx:else 配对 ———
const TAG_RE = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*?)(\/?)>/g

for (const wxml of walk(ROOT).filter(f => f.endsWith('.wxml'))) {
  const text = fs.readFileSync(wxml, 'utf8')
  const jsPath = wxml.replace(/\.wxml$/, '.js')
  const js = fs.existsSync(jsPath) ? fs.readFileSync(jsPath, 'utf8') : ''
  const r = rel(wxml)
  stats.wxml++

  // 4.1 事件绑定对应的方法必须存在
  let m
  const evtRe = /\b(?:bind|catch)(?::)?[a-zA-Z]+\s*=\s*"([^"{}]+)"/g
  while ((m = evtRe.exec(text))) {
    const name = m[1].trim()
    if (!name) continue
    stats.handlers++
    const defined = new RegExp('(^|[\\s{,])(async\\s+)?' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*[(:]').test(js)
    if (!defined) problems.push(`[事件] ${r} 绑定了 "${name}"，但 ${path.basename(jsPath)} 里没有这个方法`)
  }

  // 4.2 wx:if 与 wx:for 不能同标签；4.3 wx:else 必须有配对的条件兄弟节点
  const stack = [{ cond: false }]
  let mm
  TAG_RE.lastIndex = 0
  while ((mm = TAG_RE.exec(text))) {
    const closing = mm[1] === '/'
    const attrs = mm[3] || ''
    const selfClose = mm[4] === '/'
    const line = text.slice(0, mm.index).split('\n').length
    if (closing) {
      if (stack.length > 1) stack.pop()
      continue
    }
    const hasIf = /(^|\s)wx:(if|elif)(\s|=|$)/.test(attrs)
    const hasFor = /(^|\s)wx:for(\s|=|$)/.test(attrs)
    const hasElse = /(^|\s)wx:else(\s|=|$)/.test(attrs)
    const top = stack[stack.length - 1]

    if (hasIf && hasFor) {
      problems.push(`[条件] ${r}:${line} 同一个标签上同时有 wx:if 和 wx:for（wx:for 优先，会让后续 wx:else 找不到配对）`)
    }
    if (hasElse) {
      if (!top.cond) problems.push(`[条件] ${r}:${line} 的 wx:else 前面没有配对的 wx:if / wx:elif`)
      else top.cond = true
    } else if (hasIf && !hasFor) {
      top.cond = true                 // 有效的条件节点，后面的 wx:else 可以配对
    } else {
      top.cond = false                // 普通兄弟节点会打断 if/else 链
    }

    if (!selfClose) stack.push({ cond: false })
  }
}

// ——— 5) 敏感信息与仓库卫生 ———
const secretRe = /(appsecret|app_secret|secretkey|secret_key|access[_-]?token|private[_-]?key)\s*[:=]\s*['"][^'"]{8,}/i
for (const f of walk(ROOT).filter(x => /\.(js|json|wxml)$/.test(x))) {
  if (rel(f).indexOf('scripts/') === 0) continue
  if (secretRe.test(fs.readFileSync(f, 'utf8'))) problems.push(`[安全] ${rel(f)} 里疑似硬编码了密钥/token`)
}

// ——— 输出 ———
console.log(`扫描：${stats.wxml} 个 wxml、${stats.handlers} 个事件绑定、${stats.files} 个页面文件`)
if (!problems.length) {
  console.log('✅ 全部检查通过')
  process.exit(0)
}
console.log(`❌ 发现 ${problems.length} 个问题：`)
for (const p of problems) console.log('  - ' + p)
process.exit(1)
