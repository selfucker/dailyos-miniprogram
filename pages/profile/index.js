// pages/profile/index.js
// 统计全部来自本地真实数据；这里还提供数据导出/导入（换手机不丢数据）
const store = require('../../utils/store.js')
const backup = require('../../utils/backup.js')
const { yuan } = require('../../utils/format.js')

const APP_VERSION = 'v0.1.0'

Page({
  data: {
    nickname: '',
    avatarText: '',
    streak: 0,
    totalDays: 0,
    englishDays: 0,
    monthCount: 0,
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
    const month = store.monthKey(now)

    const monthCount = store.getRecords()
      .filter(it => it && String(it.date || '').slice(0, 7) === month)
      .length

    this.setData({
      nickname: profile.nickname,
      avatarText: this.initials(profile.nickname),
      streak: english.streak,
      totalDays: english.totalDays,
      englishDays: english.totalDays,
      monthCount,
      monthTotal: yuan(ledger.monthCents),
      settingItems: [
        { key: 'wordbook', label: '当前词书', value: english.bookTitle || '未选择' },
        { key: 'target',   label: '今日词量', value: (english.target || 0) + ' 词' },
        { key: 'export',   label: '数据导出', value: '备份为 JSON' },
        { key: 'import',   label: '数据导入', value: '从 JSON 恢复' },
        { key: 'remind',   label: '提醒时间', value: '未开启' },
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
    const tips = {
      wordbook: '去「英语」页点词书卡片切换',
      target: '每日词量跟随词书，后续支持自定义',
      remind: '订阅消息提醒尚未实现',
      about: 'DailyOS ' + APP_VERSION
    }
    wx.showToast({ title: tips[key] || '后续实现', icon: 'none' })
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
