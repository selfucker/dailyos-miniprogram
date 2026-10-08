// pages/fitness/index.js
const { dateWithSuffix } = require('../../utils/date.js')
const store = require('../../utils/store.js')

// 简易消耗估算：轻度 7 kcal/分钟，适中 10，高强度 13
function burnFor(intensity, durationMin) {
  const factor = { 轻度: 7, 适中: 10, 高强度: 13 }[intensity] || 10
  return Math.round(factor * durationMin)
}

function sumMacros(meals) {
  return meals.reduce(
    (acc, m) => {
      if (m.set) {
        acc.kcal += m.kcal
        acc.p += m.p
        acc.c += m.c
        acc.f += m.f
      }
      return acc
    },
    { kcal: 0, p: 0, c: 0, f: 0 }
  )
}

function buildTrendLabels(days) {
  const labels = []
  const today = new Date()
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 86400000)
    labels.push(`${d.getMonth() + 1}/${d.getDate()}`)
  }
  return labels
}

function fmtDelta(d, unit) {
  if (!isFinite(d)) return '· 与上次持平'
  if (d === 0) return '· 与上次持平'
  return `${d < 0 ? '↓' : '↑'} ${Math.abs(d).toFixed(1)}${unit ? ' ' + unit : ''}`
}

// 输入清洗：只保留数字 + 单个小数点
function cleanNum(v) {
  const s = String(v == null ? '' : v).replace(/[^\d.]/g, '')
  const parts = s.split('.')
  return parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : s
}

Page({
  data: {
    dateLabel: '',
    partsOptions: ['胸', '背', '腿', '肩', '臂', '核心'],
    durationMin: 58,
    parts: ['胸', '三头'],
    intensity: '适中',
    burnText: burnFor('适中', 58) + ' kcal',
    meals: [
      { type: '早餐', kcal: 320, p: 22, c: 38, f: 8, set: true },
      { type: '午餐', kcal: 620, p: 45, c: 70, f: 18, set: true },
      { type: '晚餐', kcal: 0, p: 0, c: 0, f: 0, set: false },
      { type: '加餐', kcal: 0, p: 0, c: 0, f: 0, set: false }
    ],
    intakeKcal: 0,
    totalP: 0,
    totalC: 0,
    totalF: 0,
    weekCount: 0,
    weekMinutes: 0,
    weight: 68.5,
    bodyFat: 18.2,
    weightDelta: 0,
    weightDeltaText: '· 与上次持平',
    bodyFatDelta: 0,
    bodyFatDeltaText: '· 与上次持平',
    trendLabels: [],
    trend: [],
    trendHigh: '0.0',
    trendLow: '0.0',
    trendAvg: '0.0',

    // 身体数据录入弹层
    editingBody: false,
    draftWeight: '',
    draftBodyFat: '',

    // 训练设置弹层
    editingWorkout: false,
    workoutDraft: { durationMin: '', intensity: '' },

    // 餐次录入弹层
    editingMeal: false,
    mealDraft: { type: '', kcal: '', p: '', c: '', f: '', set: false }
  },

  onLoad() {
    // 只恢复"今天"的记录；日期判断由数据层负责（昨日记录不会串到今天）
    const stored = store.getFitnessToday(new Date())
    if (stored) {
      this.setData({
        durationMin: stored.durationMin || this.data.durationMin,
        parts: stored.parts || this.data.parts,
        intensity: stored.intensity || this.data.intensity,
        meals: stored.meals || this.data.meals,
        weight: stored.weight || this.data.weight,
        bodyFat: stored.bodyFat || this.data.bodyFat,
        intakeKcal: stored.intakeKcal || 0,
        totalP: stored.totalP || 0,
        totalC: stored.totalC || 0,
        totalF: stored.totalF || 0
      })
    }
    this.refreshComputed()
  },

  onReady() {
    this.drawTrend()
  },

  onShow() {
    this.refreshComputed()
  },

  refreshComputed() {
    const totals = sumMacros(this.data.meals)
    const stats = store.getFitnessStats(new Date(), 7)

    // 体重趋势用历史里真实记录过的体重；一次都没记过就退化成只有当前体重
    const points = stats.trend.filter(t => t.weight > 0)
    const trend = points.length > 1 ? points.map(t => t.weight) : [this.data.weight]
    const trendLabels = points.length > 1 ? points.map(t => t.label) : buildTrendLabels(1)

    const high = Math.max(...trend)
    const low = Math.min(...trend)
    const avg = trend.reduce((a, b) => a + b, 0) / trend.length

    this.setData({
      dateLabel: dateWithSuffix(new Date()),
      burnText: burnFor(this.data.intensity, this.data.durationMin) + ' kcal',
      intakeKcal: totals.kcal,
      totalP: totals.p,
      totalC: totals.c,
      totalF: totals.f,
      weekCount: stats.weekCount,
      weekMinutes: stats.weekMinutes,
      trendLabels,
      trend,
      trendHigh: high.toFixed(1),
      trendLow: low.toFixed(1),
      trendAvg: avg.toFixed(1)
    })
  },

  // —— 部位 ——
  noop() {},

  onTapPart(e) {
    const part = e.currentTarget.dataset.part
    console.log('[fitness] onTapPart', part)
    if (!part) return
    const parts = this.data.parts.slice()
    const idx = parts.indexOf(part)
    if (idx >= 0) {
      parts.splice(idx, 1)
    } else {
      parts.push(part)
    }
    this.setData({ parts })
    this.persistToday()
    wx.showToast({ title: idx >= 0 ? '已取消 ' + part : '已选择 ' + part, icon: 'none', duration: 700 })
  },

  // —— 训练设置弹层 ——
  onTapWorkoutSettings() {
    this.setData({
      editingWorkout: true,
      workoutDraft: {
        durationMin: String(this.data.durationMin),
        intensity: this.data.intensity
      }
    })
  },

  onCloseWorkoutSheet() {
    this.setData({ editingWorkout: false, workoutDraft: { durationMin: '', intensity: '' } })
  },

  onInputDuration(e) {
    const v = String(e.detail.value || '').replace(/[^\d]/g, '')
    this.setData({ 'workoutDraft.durationMin': v })
  },

  onSelectIntensity(e) {
    const val = e.currentTarget.dataset.val
    if (!val) return
    this.setData({ 'workoutDraft.intensity': val })
  },

  onSaveWorkout() {
    const d = parseInt(this.data.workoutDraft.durationMin, 10)
    const i = this.data.workoutDraft.intensity
    if (!isFinite(d) || d <= 0 || d > 600) {
      wx.showToast({ title: '请输入有效时长 (1-600)', icon: 'none' })
      return
    }
    if (!['轻度', '适中', '高强度'].includes(i)) {
      wx.showToast({ title: '请选择强度', icon: 'none' })
      return
    }
    this.setData({
      durationMin: d,
      intensity: i,
      editingWorkout: false
    })
    this.refreshComputed()
    this.persistToday()
    wx.showToast({ title: '已保存训练', icon: 'success' })
  },

  // —— 餐次录入弹层 ——
  onTapMeal(e) {
    const type = e.currentTarget.dataset.type
    const found = (this.data.meals || []).find(m => m.type === type)
    if (!found) return
    this.setData({
      editingMeal: true,
      mealDraft: {
        type: found.type,
        kcal: found.set ? String(found.kcal) : '',
        p: found.set ? String(found.p) : '',
        c: found.set ? String(found.c) : '',
        f: found.set ? String(found.f) : '',
        set: !!found.set
      }
    })
  },

  onCloseMealSheet() {
    this.setData({ editingMeal: false, mealDraft: { type: '', kcal: '', p: '', c: '', f: '', set: false } })
  },

  onInputMealKcal(e) { this.setData({ 'mealDraft.kcal': cleanNum(e.detail.value) }) },
  onInputMealP(e) { this.setData({ 'mealDraft.p': cleanNum(e.detail.value) }) },
  onInputMealC(e) { this.setData({ 'mealDraft.c': cleanNum(e.detail.value) }) },
  onInputMealF(e) { this.setData({ 'mealDraft.f': cleanNum(e.detail.value) }) },

  onSaveMeal() {
    const draft = this.data.mealDraft
    const k = parseFloat(draft.kcal) || 0
    const p = parseFloat(draft.p) || 0
    const c = parseFloat(draft.c) || 0
    const f = parseFloat(draft.f) || 0
    const meals = this.data.meals.slice()
    const idx = meals.findIndex(m => m.type === draft.type)
    if (idx < 0) {
      wx.showToast({ title: '餐次不存在', icon: 'none' })
      return
    }
    const isEmpty = k === 0 && p === 0 && c === 0 && f === 0
    meals[idx] = {
      type: draft.type,
      kcal: k,
      p: p,
      c: c,
      f: f,
      set: !isEmpty
    }
    this.setData({ meals, editingMeal: false })
    this.refreshComputed()
    this.persistToday()
    wx.showToast({ title: isEmpty ? '已清空' : '已保存', icon: 'success' })
  },

  onClearMeal() {
    const type = this.data.mealDraft.type
    const meals = this.data.meals.slice()
    const idx = meals.findIndex(m => m.type === type)
    if (idx < 0) return
    meals[idx] = { type, kcal: 0, p: 0, c: 0, f: 0, set: false }
    this.setData({
      meals,
      editingMeal: false,
      mealDraft: { type: '', kcal: '', p: '', c: '', f: '', set: false }
    })
    this.refreshComputed()
    this.persistToday()
    wx.showToast({ title: '已清空', icon: 'success' })
  },

  // —— 身体数据 ——
  onTapEditBody() {
    this.setData({
      editingBody: true,
      draftWeight: String(this.data.weight),
      draftBodyFat: String(this.data.bodyFat)
    })
  },

  onCloseSheet() {
    this.setData({ editingBody: false, draftWeight: '', draftBodyFat: '' })
  },

  onInputWeight(e) {
    this.setData({ draftWeight: cleanNum(e.detail.value) })
  },

  onInputBodyFat(e) {
    this.setData({ draftBodyFat: cleanNum(e.detail.value) })
  },

  onSaveBody() {
    const w = parseFloat(this.data.draftWeight)
    const bf = parseFloat(this.data.draftBodyFat)
    if (!isFinite(w) || w < 20 || w > 300) {
      wx.showToast({ title: '请输入有效体重 (20-300)', icon: 'none' })
      return
    }
    if (!isFinite(bf) || bf < 1 || bf > 70) {
      wx.showToast({ title: '请输入有效体脂率 (1-70)', icon: 'none' })
      return
    }

    const weightDelta = +(w - this.data.weight).toFixed(1)
    const bodyFatDelta = +(bf - this.data.bodyFat).toFixed(1)

    const trend = this.data.trend.slice()
    trend.shift()
    trend.push(+w.toFixed(1))
    const high = Math.max(...trend)
    const low = Math.min(...trend)
    const avg = trend.reduce((a, b) => a + b, 0) / trend.length

    this.setData({
      weight: +w.toFixed(1),
      bodyFat: +bf.toFixed(1),
      weightDelta,
      weightDeltaText: fmtDelta(weightDelta, 'kg'),
      bodyFatDelta,
      bodyFatDeltaText: fmtDelta(bodyFatDelta, '%'),
      trend,
      trendHigh: high.toFixed(1),
      trendLow: low.toFixed(1),
      trendAvg: avg.toFixed(1),
      editingBody: false,
      draftWeight: '',
      draftBodyFat: ''
    })

    this.persistToday()
    this.drawTrend()
    wx.showToast({ title: '已记录', icon: 'success' })
  },

  // —— 保存今日 ——
  onTapSave() {
    this.persistToday()
    wx.showToast({ title: '已保存今日', icon: 'success' })
  },

  persistToday() {
    const payload = {
      date: store.dateKey(new Date()),
      durationMin: this.data.durationMin,
      parts: this.data.parts,
      intensity: this.data.intensity,
      meals: this.data.meals,
      weight: this.data.weight,
      bodyFat: this.data.bodyFat,
      intakeKcal: this.data.intakeKcal,
      totalP: this.data.totalP,
      totalC: this.data.totalC,
      totalF: this.data.totalF,
      burnText: this.data.burnText,
      weekCount: this.data.weekCount,
      weekMinutes: this.data.weekMinutes,
      ts: Date.now()
    }
    if (!store.setFitnessToday(payload)) {
      wx.showToast({ title: '保存失败', icon: 'none' })
      return
    }
    // 同时写入历史（供"本周次数/体重趋势/我的页统计"使用）
    store.appendFitnessDay(payload)
  },

  // —— 折线图绘制 ——
  drawTrend() {
    const data = this.data.trend
    if (!data || !data.length) return

    const query = wx.createSelectorQuery().in(this)
    query.select('.trend-canvas-wrap')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res && res[0] && res[0].node) {
          this.drawTrendV2(res[0])
        } else {
          this.drawTrendLegacy()
        }
      })
  },

  drawTrendV2(info) {
    const dpr = wx.getSystemInfoSync().pixelRatio
    const canvas = info.node
    const ctx = canvas.getContext('2d')
    canvas.width = info.width * dpr
    canvas.height = info.height * dpr
    ctx.scale(dpr, dpr)

    const W = info.width
    const H = info.height
    const pad = { top: 20, right: 16, bottom: 20, left: 16 }

    const data = this.data.trend
    const min = Math.min(...data) - 0.2
    const max = Math.max(...data) + 0.2
    const range = max - min || 1
    const innerW = W - pad.left - pad.right
    const innerH = H - pad.top - pad.bottom

    const xOf = i => pad.left + (innerW * i) / (data.length - 1)
    const yOf = v => pad.top + innerH - ((v - min) / range) * innerH

    ctx.beginPath()
    data.forEach((v, i) => {
      if (i === 0) ctx.moveTo(xOf(i), yOf(v))
      else ctx.lineTo(xOf(i), yOf(v))
    })
    ctx.strokeStyle = '#2D5F3F'
    ctx.lineWidth = 2
    ctx.lineJoin = 'round'
    ctx.stroke()

    data.forEach((v, i) => {
      ctx.beginPath()
      ctx.arc(xOf(i), yOf(v), 3, 0, 2 * Math.PI)
      ctx.fillStyle = '#FFFFFF'
      ctx.strokeStyle = '#2D5F3F'
      ctx.lineWidth = 2
      ctx.fill()
      ctx.stroke()
    })

    const lastIdx = data.length - 1
    const lx = xOf(lastIdx)
    const ly = yOf(data[lastIdx])
    ctx.beginPath()
    ctx.arc(lx, ly, 5, 0, 2 * Math.PI)
    ctx.fillStyle = '#2D5F3F'
    ctx.fill()

    ctx.fillStyle = '#1A1714'
    ctx.font = '11px sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(data[lastIdx].toFixed(1), lx, ly - 12)
  },

  drawTrendLegacy() {
    const data = this.data.trend
    const ctx = wx.createCanvasContext('weightTrend', this)
    const query = wx.createSelectorQuery().in(this)
    query.select('.trend-canvas-wrap').boundingClientRect((rect) => {
      if (!rect) return
      const W = rect.width
      const H = rect.height
      const pad = { top: 20, right: 16, bottom: 20, left: 16 }
      const min = Math.min(...data) - 0.2
      const max = Math.max(...data) + 0.2
      const range = max - min || 1
      const innerW = W - pad.left - pad.right
      const innerH = H - pad.top - pad.bottom
      const xOf = i => pad.left + (innerW * i) / (data.length - 1)
      const yOf = v => pad.top + innerH - ((v - min) / range) * innerH

      ctx.beginPath()
      data.forEach((v, i) => {
        if (i === 0) ctx.moveTo(xOf(i), yOf(v))
        else ctx.lineTo(xOf(i), yOf(v))
      })
      ctx.setStrokeStyle('#2D5F3F')
      ctx.setLineWidth(2)
      ctx.stroke()

      data.forEach((v, i) => {
        ctx.beginPath()
        ctx.arc(xOf(i), yOf(v), 3, 0, 2 * Math.PI)
        ctx.setFillStyle('#FFFFFF')
        ctx.setStrokeStyle('#2D5F3F')
        ctx.setLineWidth(2)
        ctx.fill()
        ctx.stroke()
      })

      const lastIdx = data.length - 1
      const lx = xOf(lastIdx)
      const ly = yOf(data[lastIdx])
      ctx.beginPath()
      ctx.arc(lx, ly, 5, 0, 2 * Math.PI)
      ctx.setFillStyle('#2D5F3F')
      ctx.fill()

      ctx.draw()
    }).exec()
  }
})

// rebuild 2026-10-07 20:28:23
