// scripts/upload.js
// 用 miniprogram-ci 把当前代码上传为「开发版」（上传后可在后台设为体验版）
//
// 一次性准备：
//   1. 安装依赖：npm i -D miniprogram-ci   （或在 CI 环境里全局安装）
//   2. 微信公众平台 → 开发 → 开发设置 → 小程序代码上传 → 生成密钥
//      下载得到 private.<appid>.key，放到项目外（不要提交进 Git！）
//   3. 把执行上传的机器/CI 出口 IP 加入「上传 IP 白名单」
//
// 用法：
//   node scripts/upload.js <版本号> <描述> [密钥路径]
// 例：
//   node scripts/upload.js 0.1.0 "英语打卡+错词本" ../../keys/private.wx1ac3e868f6f662ab.key
//
// 也可以用环境变量：
//   MP_PRIVATE_KEY_PATH=/path/to/private.key node scripts/upload.js 0.1.0 "描述"
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

let ci
try {
  ci = require('miniprogram-ci')
} catch (e) {
  console.error('未安装 miniprogram-ci，请先执行：npm i -D miniprogram-ci')
  process.exit(1)
}

const version = process.argv[2] || ''
const desc = process.argv[3] || ''
const keyPath = process.argv[4] || process.env.MP_PRIVATE_KEY_PATH || ''

if (!version) {
  console.error('用法：node scripts/upload.js <版本号> <描述> [密钥路径]')
  process.exit(1)
}
if (!keyPath || !fs.existsSync(keyPath)) {
  console.error(`找不到上传密钥：${keyPath || '(未提供)'}`)
  console.error('提示：微信公众平台 → 开发 → 开发设置 → 小程序代码上传 → 生成密钥')
  process.exit(1)
}

const appid = JSON.parse(fs.readFileSync(path.join(ROOT, 'project.config.json'), 'utf8')).appid

const project = new ci.Project({
  appid,
  type: 'miniProgram',
  projectPath: ROOT,
  privateKeyPath: path.resolve(keyPath),
  ignores: ['node_modules/**/*', 'scripts/**/*', '.github/**/*']
})

ci.upload({
  project,
  version,
  desc: desc || `upload ${version}`,
  setting: {
    es6: true,
    minify: true,
    minifyWXSS: true,
    autoPrefixWXSS: true
  },
  onProgressUpdate: (task) => {
    if (typeof task === 'string') console.log(task)
  }
}).then(res => {
  console.log('✅ 上传成功：', res && (res.subPackageInfo || res))
  console.log('   下一步：微信公众平台 → 版本管理 → 选为体验版，或提交审核')
}).catch(err => {
  console.error('❌ 上传失败：', err && err.message ? err.message : err)
  process.exit(1)
})
