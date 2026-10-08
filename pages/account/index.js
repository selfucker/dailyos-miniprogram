// pages/account/index.js
const { yuan } = require('../../utils/format.js')
const store = require('../../utils/store.js')

const TYPE_OPTIONS = ['支出', '收入']
const CAT_EXPENSE = ['餐', '交通', '购物', '居家', '医疗', '学习']
const CAT_INCOME  = ['工资', '奖金', '转账', '理财', '其他']

function uid() {
  return String(Date.now()) + '-' + Math.floor(Math.random() * 1e4)
}

function emptyDraft() {
  return {
    id: null,
    type: '支出',
    category: '餐',
    label: '',
    cents: 0,
    display: '0.00'
  }
}

// 数据读写统一走 utils/store.js（key 和结构只在那一处定义）
function loadAll() {
  return store.getRecords()
}

function saveAll(list) {
  if (!store.setRecords(list)) {
    wx.showToast({ title: '保存失败', icon: 'none' })
  }
}

// 把 cents(分) 渲染成 sheet 草稿的 display 字符串
function displayFromCents(cents) {
  if (!cents) return '0.00'
  return (cents / 100).toFixed(2)
}

Page({
  data: {
    amountText: '¥0.00',
    type: '支出',
    category: '餐',
    categories: CAT_EXPENSE,
    note: '',
    todayCount: 0,
    todayExpenseYuan: '0.00',
    todayTotal: '¥0.00',
    recent: [],
    monthTotal: '¥0.00',

    editing: false,
    draft: emptyDraft()
  },

  onShow() { this.refresh() },

  refresh() {
    const all = loadAll()
    const tKey = store.dateKey()
    const mKey = store.monthKey()

    const todayList = all
      .filter(it => it.date === tKey)
      .sort((a, b) => b.ts - a.ts)

    const todayExpense = todayList
      .filter(it => it.type === '支出')
      .reduce((s, it) => s + it.cents, 0)

    const monthExpense = all
      .filter(it => it.type === '支出' && it.date.slice(0, 7) === mKey)
      .reduce((s, it) => s + it.cents, 0)

    this.setData({
      todayCount: todayList.length,
      todayExpenseYuan: (todayExpense / 100).toFixed(2),
      todayTotal: yuan(todayExpense),
      recent: todayList.map(it => Object.assign({}, it, { amount: yuan(it.cents) })),
      monthTotal: yuan(monthExpense)
    })
  },

  // —— 顶部类型 / 分类 ——（点击直接更新表单区）
  onTapType(e) {
    const t = e.currentTarget.dataset.t
    if (!t || t === this.data.type) return
    const cats = t === '支出' ? CAT_EXPENSE : CAT_INCOME
    const cat = cats.indexOf(this.data.category) >= 0 ? this.data.category : cats[0]
    this.setData({ type: t, categories: cats, category: cat })
  },

  onTapCat(e) {
    const c = e.currentTarget.dataset.c
    if (!c) return
    this.setData({ category: c })
  },

  onNote(e) { this.setData({ note: e.detail.value }) },

  onTapAmount() {
    this.setData({
      editing: true,
      draft: emptyDraft()
    })
  },

  onTapRow(e) {
    const id = e.currentTarget.dataset.id
    const all = loadAll()
    const it = all.find(x => x.id === id)
    if (!it) return
    const cats = it.type === '支出' ? CAT_EXPENSE : CAT_INCOME
    if (cats.indexOf(it.category) < 0) cats.push(it.category)
    this.setData({
      editing: true,
      type: it.type,
      categories: cats,
      category: it.category,
      note: it.label || '',
      draft: {
        id: it.id,
        type: it.type,
        category: it.category,
        label: it.label || '',
        cents: it.cents,
        display: displayFromCents(it.cents)
      }
    })
  },

  onLongTapRow(e) {
    const id = e.currentTarget.dataset.id
    const it = loadAll().find(x => x.id === id)
    if (!it) return
    wx.showModal({
      title: '删除这一笔？',
      content: (it.label || it.category) + ' · ' + yuan(it.cents),
      confirmText: '删除',
      confirmColor: '#B23A3A',
      success: (res) => {
        if (res.confirm) this.deleteById(id)
      }
    })
  },

  // WXML 里 .sheet 用 catchtap="noop" 阻止点击穿透到遮罩，必须有这个方法
  noop() {},

  onCloseSheet() {
    this.setData({ editing: false })
  },

  // —— sheet 内类型 / 分类切换 ——（同步顶部）
  onTapDraftType(e) {
    const t = e.currentTarget.dataset.t
    if (!t || t === this.data.draft.type) return
    const cats = t === '支出' ? CAT_EXPENSE : CAT_INCOME
    const draft = Object.assign({}, this.data.draft, {
      type: t,
      category: cats[0]
    })
    this.setData({
      draft,
      type: t,
      categories: cats,
      category: cats[0]
    })
  },

  onTapDraftCat(e) {
    const c = e.currentTarget.dataset.c
    if (!c) return
    const draft = Object.assign({}, this.data.draft, { category: c })
    this.setData({ draft, category: c })
  },

  onInputDraftLabel(e) {
    const draft = Object.assign({}, this.data.draft, { label: e.detail.value })
    this.setData({ draft })
  },

  // —— 数字键盘 ——（自绘 0-9 / . / ⌫）
  onTapKey(e) {
    const k = e.currentTarget.dataset.k
    if (!k) return

    let cur = String(this.data.draft.display == null ? '0' : this.data.draft.display)
    if (cur === '') cur = '0'
    // 初始态 0 / 0.00 视为"空输入"：第一个数字直接替换掉，避免被前导 0 吃掉
    const pristine = (cur === '0' || cur === '0.00')
    let next

    if (k === 'back') {
      next = pristine ? '0' : (cur.length <= 1 ? '0' : cur.slice(0, -1))
      if (next === '' || next === '.') next = '0'
    } else if (k === '.') {
      if (!pristine && cur.indexOf('.') >= 0) return   // 已有小数点：忽略这次按键
      next = pristine ? '0.' : cur + '.'
    } else {
      const dot = cur.indexOf('.')
      const decimals = dot >= 0 ? cur.length - dot - 1 : 0
      if (!pristine && decimals >= 2) return           // 已满两位小数：忽略这次按键
      next = pristine ? k : cur + k
    }

    if (next.length > 10) return                       // 防止超长数字
    const cents = Math.round(parseFloat(next) * 100) || 0
    this.setData({ 'draft.display': next, 'draft.cents': cents })
  },

  onClearAmount() {
    this.setData({ 'draft.display': '0', 'draft.cents': 0 })
  },

  // —— 保存 / 更新 / 删除 ——（仅 sheet 内可用）
  onSaveDraft() {
    const d = this.data.draft
    if (!d.cents || d.cents <= 0) {
      wx.showToast({ title: '金额必须大于 0', icon: 'none' })
      return
    }
    const label = (d.label || '').trim()
    const all = loadAll()
    if (d.id) {
      const idx = all.findIndex(x => x.id === d.id)
      if (idx >= 0) {
        all[idx] = {
          id: d.id,
          ts: all[idx].ts,
          date: all[idx].date,
          type: d.type,
          category: d.category,
          label,
          cents: d.cents
        }
      }
    } else {
      all.push({
        id: uid(),
        ts: Date.now(),
        date: store.dateKey(),
        type: d.type,
        category: d.category,
        label,
        cents: d.cents
      })
    }
    saveAll(all)
    this.afterEdit()
    wx.showToast({ title: d.id ? '已更新' : '已记账', icon: 'success' })
  },

  onDeleteDraft() {
    const id = this.data.draft.id
    if (!id) return
    wx.showModal({
      title: '删除这一笔？',
      content: this.data.draft.category + ' · ' + yuan(this.data.draft.cents),
      confirmText: '删除',
      confirmColor: '#B23A3A',
      success: (res) => {
        if (res.confirm) this.deleteById(id)
      }
    })
  },

  deleteById(id) {
    const all = loadAll().filter(x => x.id !== id)
    saveAll(all)
    this.afterEdit()
    wx.showToast({ title: '已删除', icon: 'success' })
  },

  afterEdit() {
    this.setData({
      editing: false,
      draft: emptyDraft(),
      note: ''
    })
    this.refresh()
  }
})
