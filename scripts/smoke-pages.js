// scripts/smoke-pages.js
// 页面冒烟测试：用 stub 加载每个页面的 JS 并跑一遍生命周期，抓运行时异常。
// 用途：WXML 渲染空白 / 页面白屏这类问题，往往源自 onLoad/onShow 里抛异常，
//       这个脚本能在不打开开发者工具的情况下把这类错误暴露出来。
//
// 运行方式（在项目根目录）：
//   node scripts/smoke-pages.js
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const mem = {}
const warnings = []

function stubFn() { return undefined }

const noop = () => {}
const ctxStub = new Proxy({}, {
  get: (t, k) => {
    if (k === 'measureText') return () => ({ width: 10 })
    return noop
  }
})

global.wx = {
  getStorageSync: k => (k in mem ? mem[k] : ''),
  setStorageSync: (k, v) => { mem[k] = v },
  removeStorageSync: k => { delete mem[k] },
  clearStorageSync: () => {},
  navigateTo: noop, navigateBack: noop, switchTab: noop, redirectTo: noop, reLaunch: noop,
  showToast: noop, hideToast: noop, showLoading: noop, hideLoading: noop,
  showModal: o => { if (o && o.success) o.success({ confirm: true, cancel: false }) },
  showActionSheet: o => { if (o && o.fail) o.fail({ errMsg: 'stub' }) },
  setClipboardData: noop, getClipboardData: o => { if (o && o.success) o.success({ data: '' }) },
  setNavigationBarTitle: noop, stopPullDownRefresh: noop, startPullDownRefresh: noop,
  request: o => { if (o && o.fail) setTimeout(() => o.fail({ errMsg: 'stub: no backend' }), 0) },
  requestSubscribeMessage: o => { if (o && o.fail) o.fail({ errMsg: 'stub' }) },
  shareFileMessage: o => { if (o && o.fail) o.fail({ errMsg: 'stub' }) },
  chooseMessageFile: o => { if (o && o.fail) o.fail({ errMsg: 'stub' }) },
  getFileSystemManager: () => ({
    writeFile: o => o && o.success && o.success(),
    readFile: o => o && o.fail && o.fail({ errMsg: 'stub' }),
    statSync: () => ({ size: 0 })
  }),
  env: { USER_DATA_PATH: 'C:/tmp' },
  createCanvasContext: () => ctxStub,
  createSelectorQuery: () => {
    // 必须可链式调用：wx.createSelectorQuery().select(x).boundingClientRect(cb).exec()
    const q = {
      select: () => q,
      selectAll: () => q,
      in: () => q,
      boundingClientRect: cb => { if (cb) cb({ width: 300, height: 200, top: 0, left: 0, bottom: 200, right: 300 }); return q },
      fields: (o, cb) => { if (cb) cb({}); return q },
      scrollOffset: cb => { if (cb) cb({ scrollTop: 0, scrollLeft: 0 }); return q },
      exec: cb => { if (cb) cb([]); return q }
    }
    return q
  },
  getSystemInfoSync: () => ({ windowWidth: 375, windowHeight: 667, pixelRatio: 2, platform: 'devtools' }),
  getUpdateManager: () => ({ onCheckForUpdate: noop, onUpdateReady: noop, applyUpdate: noop }),
  onNetworkStatusChange: noop,
  nextTick: cb => cb && cb()
}
global.getApp = () => ({ globalData: {} })
global.getCurrentPages = () => []
global.Component = noop
global.Behavior = noop

process.on('unhandledRejection', (e) => {
  warnings.push('未处理的 Promise 拒绝: ' + ((e && e.message) || e))
})

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

const pageFiles = walk(path.join(ROOT, 'pages')).filter(f => f.endsWith('.js') && path.basename(f) === 'index.js')
const results = []

for (const file of pageFiles) {
  const rel = path.relative(ROOT, file).replace(/\\/g, '/')
  let cfg = null
  global.Page = c => { cfg = c }

  const errors = []
  try {
    delete require.cache[require.resolve(file)]
    require(file)
  } catch (e) {
    errors.push('require 失败: ' + e.message)
  }

  if (!errors.length && !cfg) errors.push('没有调用 Page()')

  if (!errors.length) {
    const inst = Object.assign({}, cfg)
    inst.data = JSON.parse(JSON.stringify(cfg.data || {}))
    inst.setData = function (patch) { Object.assign(this.data, patch || {}) }
    inst.selectComponent = () => null
    inst.createSelectorQuery = global.wx.createSelectorQuery

    const hooks = ['onLoad', 'onShow', 'onReady', 'onPullDownRefresh', 'onReachBottom']
    for (const hook of hooks) {
      if (typeof inst[hook] !== 'function') continue
      try {
        inst[hook](hook === 'onLoad' ? { id: '1', month: '2026-10' } : undefined)
      } catch (e) {
        errors.push(hook + '() 抛异常: ' + e.message)
      }
    }
  }

  results.push({ rel, errors })
}

// 等待异步回调（测试用 stub 里有 setTimeout 的失败路径）
setTimeout(() => {
  let bad = 0
  console.log('页面冒烟测试：')
  for (const r of results) {
    if (r.errors.length) {
      bad++
      console.log(`  ❌ ${r.rel}`)
      r.errors.forEach(e => console.log(`       ${e}`))
    } else {
      console.log(`  ✅ ${r.rel}`)
    }
  }
  if (warnings.length) {
    console.log('  警告：')
    warnings.forEach(w => console.log('    - ' + w))
  }
  console.log(`\n结果：${results.length} 个页面，${bad} 个有问题`)
  process.exit(bad ? 1 : 0)
}, 120)
