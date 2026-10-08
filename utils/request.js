// utils/request.js
const { baseUrl } = require('./config.js')
const mock = require('./mock.js')

function request(url, opts) {
  opts = opts || {}
  const fullUrl = url.startsWith('http') ? url : baseUrl + url
  return new Promise((resolve, reject) => {
    wx.request({
      url: fullUrl,
      method: opts.method || 'GET',
      data: opts.data || {},
      header: Object.assign({ 'X-Client': 'miniprogram-demo' }, opts.header || {}),
      success(res) {
        const body = res.data || {}
        // 后端 Result 包装：{ code, message, data }
        if (typeof body === 'object' && 'code' in body) {
          if (body.code === 0) return resolve(body.data)
          return reject(new Error(body.message || ('HTTP ' + res.statusCode)))
        }
        resolve(body)
      },
      fail(rej) { reject(rej) }
    })
  })
}

function withFallback(primary, fallback) {
  return primary.catch(err => {
    console.warn('[request fallback]', err && err.message ? err.message : err)
    return typeof fallback === 'function' ? fallback() : fallback
  })
}

module.exports = { request, withFallback, mock }