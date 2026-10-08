// pages/news/article/index.js
Page({
  data: {
    url: '',
    failed: false
  },

  onLoad(query) {
    const rawUrl = decodeURIComponent(query.url || '')
    const title = decodeURIComponent(query.title || '新闻')
    const url = this.normalizeUrl(rawUrl)

    if (!url) {
      this.setData({ url: '', failed: false })
      wx.setNavigationBarTitle({ title: '新闻链接无效' })
      return
    }

    this.setData({ url, failed: false })
    wx.setNavigationBarTitle({ title })
  },

  // 只放行 http/https，避免脏数据触发奇怪行为
  normalizeUrl(raw) {
    if (!raw) return ''
    const trimmed = raw.trim()
    if (/^https?:\/\//i.test(trimmed)) return trimmed
    return ''
  },

  onError() {
    this.setData({ failed: true })
  },

  // web-view 加载成功只代表 URL 资源就绪，失败状态可清除
  onLoadDone() {
    if (this.data.failed) this.setData({ failed: false })
  },

  onCopyUrl() {
    if (!this.data.url) return
    wx.setClipboardData({
      data: this.data.url,
      success: () => wx.showToast({ title: '已复制链接', icon: 'success' })
    })
  },

  onBack() {
    const pages = getCurrentPages()
    if (pages.length > 1) wx.navigateBack()
    else wx.switchTab({ url: '/pages/index/index' })
  },

  onShareAppMessage() {
    const u = this.data.url
    return {
      title: u ? '分享一篇新闻' : 'DailyOS 新闻',
      path: u ? '/pages/news/article/index?url=' + encodeURIComponent(u) : '/pages/index/index'
    }
  }
})