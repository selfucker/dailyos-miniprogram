// scripts/check-size.js
// 打包体积守卫：微信规定 主包 / 单个分包 ≤ 2MB，所有分包合计 ≤ 30MB。
// 这里按 project.config.json 里的 packOptions.ignore 过滤，估算真正会打进包里的体积。
//
// 运行方式（在项目根目录）：
//   node scripts/check-size.js
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const MAIN_LIMIT_KB = 2048        // 主包上限 2MB
const WARN_RATIO = 0.75           // 超过 75% 就提醒

const ALWAYS_SKIP = ['.git', 'node_modules']
const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.config.json'), 'utf8'))
const ignores = ((cfg.packOptions && cfg.packOptions.ignore) || [])

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')
  return new RegExp('^' + escaped + '$')
}

function isIgnored(relPath, isDir) {
  return ignores.some(item => {
    const v = String(item && item.value || '')
    if (!v) return false
    if (item.type === 'folder') {
      return isDir ? (relPath === v || relPath.startsWith(v + '/')) : relPath.startsWith(v + '/')
    }
    if (item.type === 'suffix') return relPath.endsWith(v)
    if (item.type === 'glob') return globToRegExp(v).test(relPath)
    return relPath === v     // file
  })
}

const files = []
function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (ALWAYS_SKIP.indexOf(name) >= 0) continue
    const full = path.join(dir, name)
    const relPath = path.relative(ROOT, full).replace(/\\/g, '/')
    const st = fs.statSync(full)
    if (st.isDirectory()) {
      if (isIgnored(relPath, true)) continue
      walk(full)
    } else {
      if (isIgnored(relPath, false)) continue
      files.push({ relPath, size: st.size })
    }
  }
}
walk(ROOT)

const total = files.reduce((s, f) => s + f.size, 0)
const totalKb = total / 1024
const pct = Math.round(totalKb / MAIN_LIMIT_KB * 100)

console.log('打包体积（已按 project.config.json 的 packOptions.ignore 过滤）')
console.log(`  打进包的文件数：${files.length}`)
console.log(`  合计体积：${totalKb.toFixed(1)} KB  /  主包上限 ${MAIN_LIMIT_KB} KB（占 ${pct}%）`)
console.log('  最大的 5 个文件：')
files.slice().sort((a, b) => b.size - a.size).slice(0, 5).forEach(f => {
  console.log(`    ${(f.size / 1024).toFixed(1).padStart(8)} KB  ${f.relPath}`)
})

const ignoredList = ignores.map(i => `${i.type}:${i.value}`)
console.log(`  已排除：${ignoredList.length ? ignoredList.join(', ') : '（无，建议把 scripts/README 等开发文件加进 packOptions.ignore）'}`)

if (totalKb > MAIN_LIMIT_KB) {
  console.log(`\n❌ 主包超过 2MB 上限，必须分包或精简资源`)
  process.exit(1)
}
if (totalKb > MAIN_LIMIT_KB * WARN_RATIO) {
  console.log(`\n⚠️  主包已用掉 ${pct}%，接近 2MB 上限，注意控制资源体积`)
} else {
  console.log('\n✅ 体积健康')
}
process.exit(0)
