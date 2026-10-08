// components/section-header/index.js
Component({
  properties: {
    title: { type: String, value: '' },
    badge: { type: String, value: '' },
    action: { type: String, value: '' }
  },
  methods: {
    onTap() {
      this.triggerEvent('action', {})
    }
  }
})
