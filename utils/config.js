// utils/config.js
// 后端地址配置
//   - 开发期：在 IDE 顶部勾选"不校验合法域名"，用本机 IP 直连
//   - 联调期：填内网 IP（手机扫码可访问）
//   - 上线后：必须是 https，且域名在 mp.weixin.qq.com 后台配置过
const ENV = {
  dev:  { baseUrl: 'http://127.0.0.1:8080/api/v1' },
  prod: { baseUrl: 'https://api.dailyos.example.com/api/v1' }
}

module.exports = {
  baseUrl: ENV.dev.baseUrl,
  env: 'dev'
}