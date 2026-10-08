// utils/backup.js
// 数据备份：把全部本地数据导出成一个 JSON 文件，或从 JSON 恢复。
// 设计要点：
//   1. 纯逻辑（collect / summarize / parseBackup / applyBackup）不碰 wx，可以在 Node 里单测
//   2. 只有 writeBackupFile / readBackupFile 依赖 wx
//   3. 导入前必须过 parseBackup 校验，避免脏数据写进 storage 把 App 搞坏
const store = require('./store.js')

const BACKUP_VERSION = 1
const BACKUP_APP = 'DailyOS'

// ============ 纯逻辑（可单测） ============

// 收集当前全部本地数据
function collect() {
  return {
    app: BACKUP_APP,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      englishBook: store.getEnglishBookId(),
      englishToday: store.getEnglishToday(),
      englishHistory: store.getEnglishHistory(),
      records: store.getRecords(),
      fitnessToday: store.getFitnessToday(),
      profile: store.getProfile()
    }
  }
}

// 数据摘要：导出/导入前后给用户看的数字
function summarize(payload) {
  const d = (payload && payload.data) || {}
  const records = Array.isArray(d.records) ? d.records : []
  const history = Array.isArray(d.englishHistory) ? d.englishHistory : []
  const recordsCents = records.reduce((s, r) => s + (r && r.cents ? r.cents : 0), 0)
  return {
    records: records.length,
    recordsYuan: (recordsCents / 100).toFixed(2),
    englishDays: history.length,
    hasEnglishSession: !!(d.englishToday && d.englishToday.queue && d.englishToday.queue.length),
    hasFitnessToday: !!d.fitnessToday,
    nickname: (d.profile && d.profile.nickname) || ''
  }
}

// 解析 + 校验备份文本
function parseBackup(text) {
  if (typeof text !== 'string' || !text.trim()) {
    return { ok: false, error: '内容是空的' }
  }
  let obj
  try {
    obj = JSON.parse(text)
  } catch (e) {
    return { ok: false, error: '不是合法的 JSON 文件' }
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { ok: false, error: '备份格式不正确' }
  }
  if (obj.app !== BACKUP_APP) {
    return { ok: false, error: '这不是 DailyOS 的备份文件' }
  }
  if (Number(obj.version) > BACKUP_VERSION) {
    return { ok: false, error: '备份版本比当前小程序新，请先升级小程序' }
  }
  const data = obj.data
  if (!data || typeof data !== 'object') {
    return { ok: false, error: '备份里没有数据内容' }
  }
  if (data.records !== undefined && !Array.isArray(data.records)) {
    return { ok: false, error: '记账数据格式不对' }
  }
  if (data.englishHistory !== undefined && !Array.isArray(data.englishHistory)) {
    return { ok: false, error: '打卡历史格式不对' }
  }
  return { ok: true, payload: obj, summary: summarize(obj) }
}

// 写入本地：mode = 'replace'（覆盖）| 'merge'（记账按 id 合并去重，打卡历史取并集）
function applyBackup(payload, mode) {
  const d = (payload && payload.data) || {}
  const merge = mode === 'merge'

  if (d.englishBook) store.setEnglishBookId(d.englishBook)
  if (d.englishToday) store.setEnglishToday(d.englishToday)
  if (d.fitnessToday) store.setFitnessToday(d.fitnessToday)
  if (d.profile) store.setProfile(d.profile)

  if (Array.isArray(d.englishHistory)) {
    if (merge) {
      const set = {}
      store.getEnglishHistory().concat(d.englishHistory).forEach(day => { if (day) set[day] = true })
      store.write(store.KEYS.englishHistory, Object.keys(set).sort())
    } else {
      store.write(store.KEYS.englishHistory, d.englishHistory)
    }
  }

  if (Array.isArray(d.records)) {
    if (merge) {
      const byId = {}
      store.getRecords().forEach(r => { if (r && r.id) byId[r.id] = r })
      d.records.forEach(r => { if (r && r.id) byId[r.id] = r })
      store.setRecords(Object.keys(byId).map(id => byId[id]).sort((a, b) => (a.ts || 0) - (b.ts || 0)))
    } else {
      store.setRecords(d.records)
    }
  }

  return summarize(payload)
}

// 文件名：dailyos-backup-YYYYMMDD.json
function backupFileName(now) {
  const key = store.dateKey(now).replace(/-/g, '')
  return `dailyos-backup-${key}.json`
}

// ============ 依赖 wx 的部分 ============

// 写出备份文件，resolve { filePath, size }
function writeBackupFile(payload, now) {
  return new Promise((resolve, reject) => {
    const fsm = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/${backupFileName(now)}`
    fsm.writeFile({
      filePath,
      data: JSON.stringify(payload, null, 2),
      encoding: 'utf8',
      success: () => {
        let size = 0
        try { size = fsm.statSync(filePath).size } catch (e) {}
        resolve({ filePath, size })
      },
      fail: (err) => reject(err)
    })
  })
}

// 读取用户从聊天里选中的备份文件，resolve 文本
function readBackupFile(filePath) {
  return new Promise((resolve, reject) => {
    wx.getFileSystemManager().readFile({
      filePath,
      encoding: 'utf8',
      success: (res) => resolve(res.data),
      fail: (err) => reject(err)
    })
  })
}

module.exports = {
  BACKUP_VERSION, BACKUP_APP,
  collect, summarize, parseBackup, applyBackup, backupFileName,
  writeBackupFile, readBackupFile
}
