// components/progress-bar/index.js
Component({
  properties: {
    value: { type: Number, value: 0 }, // 0-100
    height: { type: Number, value: 12 },
    color: { type: String, value: '' }   // 空则用品牌色
  }
})
