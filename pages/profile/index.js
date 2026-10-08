// pages/profile/index.js
Page({
  data: {
    nickname: 'Jesse',
    streak: 7,
    level: 3,
    englishDays: 7,
    workoutTimes: 3,
    monthTotal: '¥1,872',
    settingItems: [
      { key: 'wordbook', label: '当前词书', value: 'GRE 高频核心词' },
      { key: 'target',   label: '每日词量', value: '20' },
      { key: 'remind',   label: '提醒时间', value: '07:00 / 21:00' },
      { key: 'export',   label: '数据导出', value: 'JSON / CSV' },
      { key: 'about',    label: '关于 DailyOS', value: 'v0.1.0' }
    ]
  },
  onTapSetting() {
    wx.showToast({ title: '下个迭代实现', icon: 'none' })
  }
})
