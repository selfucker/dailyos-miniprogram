// utils/config.js
// 后端地址配置
//   - 开发期：在 IDE 顶部勾选"不校验合法域名"，用本机 IP 直连
//   - 联调期：填内网 IP（手机扫码可访问）
//   - 上线后：必须是 https，且域名在 mp.weixin.qq.com 后台配置过
const ENV = {
  dev:  { baseUrl: 'http://127.0.0.1:8080/api/v1' },
  prod: { baseUrl: 'https://api.dailyos.example.com/api/v1' }
}

// 订阅消息模板 ID
// 获取方式：微信公众平台 → 功能 → 订阅消息 → 选用模板 → 复制模板 ID
// 注意：小程序只能用「一次性订阅」，用户每授权一次，服务端才能发 1 条
const notifyTmplIds = {
  dailyCheckin: ''      // 例：'aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789ab'（留空则提醒功能会提示去配置）
}

module.exports = {
  baseUrl: ENV.dev.baseUrl,
  env: 'dev',
  notifyTmplIds
}