// pages/profile/index.js
// 统计全部来自本地真实数据；这里还提供数据导出/导入（换手机不丢数据）
const store = require('../../utils/store.js')
const backup = require('../../utils/backup.js')
const notify = require('../../utils/notify.js')
const { yuan } = require('../../utils/format.js')

const APP_VERSION = 'v0.1.0'

Page({
  data: {
    nickname: '',
    avatarText: '',
    streak: 0,
    totalDays: 0,
    englishDays: 0,
    workoutDays: 0,
    monthTotal: '¥0.00',
    settingItems: []
  },

  onShow() {
    this.refresh()
  },

  refresh() {
    const now = new Date()
    const english = store.getEnglishSummary(now)
    const ledger = store.getLedgerSummary(now)
    const profile = store.getProfile()
    const fitness = store.getFitnessStats(now)

    const ns = notify.getSettings()
    const reminderText = ns.enabled
      ? `${ns.morningTime} / ${ns.eveningTime} · 剩 ${ns.quota} 次`
      : '未开启'

    this.setData({
      nickname: profile.nickname,
      avatarText: this.initials(profile.nickname),
      streak: english.streak,
      totalDays: english.totalDays,
      englishDays: english.totalDays,
      workoutDays: fitness.totalDays,
      monthTotal: yuan(ledger.monthCents),
      settingItems: [
        { key: 'wordbook', label: '当前词书', value: english.bookTitle || '未选择' },
        { key: 'target',   label: '今日词量', value: (english.target || 0) + ' 词' },
        { key: 'export',   label: '数据导出', value: '备份为 JSON' },
        { key: 'import',   label: '数据导入', value: '从 JSON 恢复' },
        { key: 'remind',   label: '打卡提醒', value: reminderText },
        { key: 'about',    label: '关于 DailyOS', value: APP_VERSION }
      ]
    })
  },

  // 昵称首字母当头像（英文取前两位大写，中文取前两个字）
  initials(name) {
    const s = String(name == null ? '' : name).trim()
    if (!s) return 'D'
    if (/^[\x00-\x7F]+$/.test(s)) return s.slice(0, 2).toUpperCase()
    return s.slice(0, 2)
  },

  onTapSetting(e) {
    const key = e.currentTarget.dataset.key
    if (key === 'export') return this.onExport()
    if (key === 'import') return this.onImport()
    if (key === 'remind') return this.onTapRemind()
    const tips = {
      wordbook: '去「英语」页点词书卡片切换',
      target: '每日词量跟随词书，后续支持自定义',
      about: 'DailyOS ' + APP_VERSION
    }
    wx.showToast({ title: tips[key] || '后续实现', icon: 'none' })
  },

  // ============ 打卡提醒（订阅消息） ============
  onTapRemind() {
    const s = notify.getSettings()
    const items = s.enabled
      ? [`关闭提醒（当前 ${s.morningTime} / ${s.eveningTime}）`, `再授权一次（当前剩 ${s.quota} 次可发）`]
      : ['开启打卡提醒（需要微信授权）']

    wx.showActionSheet({
      itemList: items,
      success: (res) => {
        if (!s.enabled && res.tapIndex === 0) return this.enableRemind()
        if (s.enabled && res.tapIndex === 0) return this.disableRemind()
        if (s.enabled && res.tapIndex === 1) return this.enableRemind()
      }
    })
  },

  enableRemind() {
    if (!notify.isTemplateConfigured()) {
      wx.showModal({
        title: '还没配置消息模板',
        content: '需要先到微信公众平台 → 功能 → 订阅消息 → 选用模板，把模板 ID 填到 utils/config.js 的 notifyTmplIds 里。\n\n授权与额度记录的逻辑已经写好，配好模板即可生效。',
        showCancel: false
      })
      return
    }

    notify.requestSubscribe().then(res => {
      if (!res.ok) {
        wx.showToast({ title: res.error || '授权失败', icon: 'none' })
        return
      }
      this.refresh()
      if (res.accepted > 0) {
        wx.showModal({
          title: '提醒已开启',
          content: `本次授权 ${res.accepted} 次（累计可发 ${res.quota} 条）。\n\n注意：微信的「一次性订阅」需要服务端调用接口才会真正发送，后端就绪后即可收到提醒。`,
          showCancel: false
        })
      } else {
        wx.showToast({ title: '你拒绝了授权', icon: 'none' })
      }
    })
  },

  disableRemind() {
    notify.setSettings({ enabled: false })
    this.refresh()
    wx.showToast({ title: '已关闭提醒', icon: 'success' })
  },

  // ============ 导出 ============
  onExport() {
    const payload = backup.collect()
    const s = backup.summarize(payload)

    backup.writeBackupFile(payload).then(res => {
      const kb = (res.size / 1024).toFixed(1)
      wx.showModal({
        title: '备份已生成',
        content: `含 ${s.records} 笔记账、${s.englishDays} 天打卡记录（${kb} KB）。\n\n「发给好友」可发送到微信聊天（建议发给"文件传输助手"长期保存）；「复制」则把内容写入剪贴板。`,
        confirmText: '发给好友',
        cancelText: '复制内容',
        success: (r) => {
          if (r.confirm) this.shareBackupFile(res.filePath)
          else this.copyBackupText(payload)
        }
      })
    }).catch(err => {
      console.warn('[profile] 写备份文件失败，退回剪贴板', err)
      this.copyBackupText(payload)
    })
  },

  shareBackupFile(filePath) {
    if (typeof wx.shareFileMessage !== 'function') {
      wx.showToast({ title: '当前微信版本不支持发送文件，已改为复制', icon: 'none' })
      return this.copyBackupText(backup.collect())
    }
    wx.shareFileMessage({
      filePath,
      fileName: backup.backupFileName(),
      fail: (err) => {
        console.warn('[profile] shareFileMessage 失败，退回剪贴板', err)
        this.copyBackupText(backup.collect())
      }
    })
  },

  copyBackupText(payload) {
    wx.setClipboardData({
      data: JSON.stringify(payload),
      success: () => wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
    })
  },

  // ============ 导入 ============
  onImport() {
    wx.showActionSheet({
      itemList: ['从聊天记录选择文件', '从剪贴板粘贴'],
      success: (res) => {
        if (res.tapIndex === 0) this.importFromFile()
        else this.importFromClipboard()
      }
    })
  },

  importFromFile() {
    wx.chooseMessageFile({
      count: 1,
      type: 'file',
      extension: ['json'],
      success: (res) => {
        const f = res.tempFiles && res.tempFiles[0]
        if (!f) return
        backup.readBackupFile(f.path).then(text => this.confirmImport(text)).catch(err => {
          console.warn('[profile] 读取备份文件失败', err)
          wx.showToast({ title: '文件读取失败', icon: 'none' })
        })
      }
    })
  },

  importFromClipboard() {
    wx.getClipboardData({
      success: (res) => this.confirmImport(res.data),
      fail: () => wx.showToast({ title: '读取剪贴板失败', icon: 'none' })
    })
  },

  // 解析校验 → 展示对比 → 选择合并/覆盖
  confirmImport(text) {
    const parsed = backup.parseBackup(text)
    if (!parsed.ok) {
      wx.showModal({ title: '导入失败', content: parsed.error || '无法识别的备份内容', showCancel: false })
      return
    }

    const s = parsed.summary
    const cur = backup.summarize(backup.collect())

    wx.showModal({
      title: '确认导入备份',
      content: `备份内容：${s.records} 笔记账、${s.englishDays} 天打卡\n当前数据：${cur.records} 笔记账、${cur.englishDays} 天打卡`,
      confirmText: '继续',
      cancelText: '取消',
      success: (r) => {
        if (!r.confirm) return
        wx.showActionSheet({
          itemList: ['合并导入（按 id 去重，推荐）', '覆盖导入（清空当前数据）'],
          success: (a) => {
            const mode = a.tapIndex === 0 ? 'merge' : 'replace'
            const out = backup.applyBackup(parsed.payload, mode)
            this.refresh()
            wx.showToast({
              title: `导入完成：${out.records} 笔记账`,
              icon: 'success'
            })
          }
        })
      }
    })
  }
})
