// utils/notify.js
// 打卡提醒（微信订阅消息）—— 前端部分
//
// 微信的两条硬限制（很重要，决定了这个模块能做什么）：
//   1. 订阅消息必须由用户点击触发 wx.requestSubscribeMessage 授权；
//      「一次性订阅」模型下，用户每授权一次，服务端才能发 1 条。
//   2. 真正发送必须由服务端（自建后端 / 云函数）调用 subscribeMessage.send，
//      需要 access_token，而 access_token 需要 AppSecret —— 绝不能放进小程序。
//
// 所以本模块负责：模板配置校验、发起授权、记录授权额度与提醒偏好、组装待发内容。
// 服务端需要配合的部分见 README「打卡提醒」一节。
const store = require('./store.js')
const { notifyTmplIds } = require('./config.js')

const SETTINGS_KEY = 'notify.settings.v1'

const DEFAULT_SETTINGS = {
  enabled: false,
  morningTime: '07:00',
  eveningTime: '21:00',
  quota: 0,               // 已授权但还没用掉的发送次数
  grantedTotal: 0,        // 历史累计授权次数
  lastRequestAt: 0,       // 上次弹授权的时间戳
  skipDate: ''            // 用户主动跳过的日期（这天不再提醒）
}

function getSettings() {
  const raw = store.read(SETTINGS_KEY, null)
  return Object.assign({}, DEFAULT_SETTINGS, raw || {})
}

function setSettings(patch) {
  const next = Object.assign({}, getSettings(), patch || {})
  store.write(SETTINGS_KEY, next)
  return next
}

// 模板 ID 是否已配置（空串和占位文案都算没配）
function isPlaceholder(id) {
  const s = String(id == null ? '' : id).trim()
  if (!s) return true
  return /^请|^填|^PLACEHOLDER|^TODO/i.test(s)
}

function configuredTemplateIds() {
  const ids = notifyTmplIds || {}
  return Object.keys(ids).map(k => ids[k]).filter(id => !isPlaceholder(id))
}

function isTemplateConfigured() {
  return configuredTemplateIds().length > 0
}

// 同一自然日只允许弹一次授权（避免反复打扰用户；微信自身也有限制）
function canRequestToday(now) {
  const s = getSettings()
  const last = s.lastRequestAt ? new Date(s.lastRequestAt) : null
  if (!last) return true
  return store.dateKey(last) !== store.dateKey(now || new Date())
}

// 组装"今天还没打卡"的提醒内容：服务端按这个结构决定要不要发、发什么
function buildReminderPayload(now) {
  const summary = store.getEnglishSummary(now)
  return {
    templateKey: 'dailyCheckin',
    date: store.dateKey(now),
    shouldSend: !summary.finished,
    done: summary.done,
    target: summary.target,
    streak: summary.streak,
    // 模板字段（需与公众平台里选的模板字段一致，字段名以官方模板为准）
    data: {
      thing1: { value: summary.bookTitle || '英语打卡' },
      number2: { value: String(summary.done) },
      number3: { value: String(summary.target) }
    }
  }
}

// 发起订阅授权，resolve { ok, accepted, quota } 或 { ok:false, error }
function requestSubscribe(now) {
  return new Promise((resolve) => {
    if (!isTemplateConfigured()) {
      resolve({
        ok: false,
        error: '还没配置订阅消息模板 ID（公众平台 → 功能 → 订阅消息 → 选用模板）'
      })
      return
    }

    const tmplIds = configuredTemplateIds()
    wx.requestSubscribeMessage({
      tmplIds,
      success: (res) => {
        const accepted = tmplIds.filter(id => res && res[id] === 'accept').length
        const before = getSettings()
        const next = setSettings({
          enabled: accepted > 0 ? true : before.enabled,
          quota: before.quota + accepted,
          grantedTotal: before.grantedTotal + accepted,
          lastRequestAt: (now ? new Date(now) : new Date()).getTime()
        })
        resolve({ ok: true, accepted, quota: next.quota })
      },
      fail: (err) => {
        resolve({ ok: false, error: (err && err.errMsg) || '订阅请求失败' })
      }
    })
  })
}

// 校验 HH:mm
function isValidTime(str) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(String(str == null ? '' : str))
}

module.exports = {
  SETTINGS_KEY, DEFAULT_SETTINGS,
  getSettings, setSettings,
  isTemplateConfigured, configuredTemplateIds, isPlaceholder,
  canRequestToday, buildReminderPayload, requestSubscribe, isValidTime
}
