import "./picker.scss"


function debounce(handle, delay) {
  let timeout = null
  return function () {
    if (timeout) {
      clearTimeout(timeout)
      timeout = null
    }
    const self = this
    const args = arguments
    timeout = setTimeout(() => handle.apply(self, args), delay)
  }
}

function getClientCenterY(elem) {
  const { top, bottom } = elem.getBoundingClientRect()
  return (top + bottom) / 2
}

function normalizeOptions(options) {
  return options.map((option) => {
    switch (typeof option) {
      case 'string': {
        return { value: option, name: option }
      }
      case 'number':
      case 'boolean': {
        return { value: option, name: `${option}` }
      }
    }
    return option
  })
}

function isTouchEvent(event) {
  return event.changedTouches || event.touches
}

function getEventXY(event) {
  if (isTouchEvent(event)) {
    return event.changedTouches[0] || event.touches[0]
  }
  return event
}

export default {
  props: {
    value: null,
    options: {
      type: Array,
      default: () => [],
    },
    dragSensitivity: {
      type: Number,
      default: 1.7,
    },
    touchSensitivity: {
      type: Number,
      default: 1.7,
    },
    scrollSensitivity: {
      type: Number,
      default: 1,
    },
    empty: {
      type: String,
      default: 'No Items',
    },
    placeholder: {
      type: String,
      default: null,
    },
  },
  data() {
    const normalizedOptions = normalizeOptions(this.options)

    let innerIndex = normalizedOptions.findIndex(option => option.value == this.value)
    if (innerIndex === -1 && !this.placeholder && this.options.length > 0) {
      innerIndex = 0
    }
    const innerValue = normalizedOptions[innerIndex] && normalizedOptions[innerIndex].value || null

    return {
      normalizedOptions,
      innerIndex,
      innerValue,

      left: null,

      pivots: [],
      pivotMin: 0,
      pivotMax: 0,

      transitioning: false,
      transitionTO: null,

      start: null,

      isMouseDown: false,
      isDragging: false,

      scrollOffsetLeft: 0,
      scrollMin: 0,
      scrollMax: 0,
    }
  },
  mounted() {
    this.calculatePivots()
    this.left = this.findScrollByIndex(this.innerIndex)
    if (this.innerValue !== this.value) {
      this.$emit('input', this.innerValue)
    }

    this.$el.addEventListener('touchstart', this.onStart)
    this.$el.addEventListener('touchmove', this.onMove)
    this.$el.addEventListener('touchend', this.onEnd)
    this.$el.addEventListener('touchcancel', this.onCancel)

    this.$el.addEventListener('mousewheel', this.onScroll)
    this.$el.addEventListener('DOMMouseScroll', this.onScroll)
    this.$el.addEventListener('wheel', this.onScroll)
    this.$el.addEventListener('mousedown', this.onStart)
    this.$el.addEventListener('mousemove', this.onMove)
    this.$el.addEventListener('mouseup', this.onEnd)
    this.$el.addEventListener('mouseleave', this.onCancel)
  },
  destroyed() {
    this.$el.removeEventListener('touchstart', this.onStart)
    this.$el.removeEventListener('touchmove', this.onMove)
    this.$el.removeEventListener('touchend', this.onEnd)
    this.$el.removeEventListener('touchcancel', this.onCancel)

    this.$el.removeEventListener('mousewheel', this.onScroll)
    this.$el.removeEventListener('DOMMouseScroll', this.onScroll)
    this.$el.removeEventListener('wheel', this.onScroll)
    this.$el.removeEventListener('mousedown', this.onStart)
    this.$el.removeEventListener('mousemove', this.onMove)
    this.$el.removeEventListener('mouseup', this.onEnd)
    this.$el.removeEventListener('mouseleave', this.onCancel)
  },
  watch: {
    value(value) {
      if ((value === null || value === undefined) && this.placeholder) {
        this.correction(-1)
        return
      }

      const nextInnerIndex = this.normalizedOptions.findIndex((option) => option.value == value)
      if (nextInnerIndex === -1) {
        this.$emit('input', this.innerValue)
        return
      }

      if (this.innerIndex !== nextInnerIndex) {
        this.correction(nextInnerIndex)
      }
    },
    options(options) {
      const normalizedOptions = this.normalizedOptions = normalizeOptions(options)

      let internalIndex = normalizedOptions.findIndex(option => option.value == this.value)
      if (internalIndex === -1 && !this.placeholder && this.options.length > 0) {
        internalIndex = 0
      }
      const innerValue = normalizedOptions[internalIndex] && normalizedOptions[internalIndex].value || null

      this.$nextTick(() => {
        this.calculatePivots()
        this.top = this.findScrollByIndex(internalIndex)
        this.innerIndex = internalIndex
        if (this.innerValue !== innerValue) {
          this.$emit('input', this.innerValue = innerValue)
        }
      })
    }
  },
  methods: {
    resize() {
      this.$nextTick(() => {
        this.calculatePivots()
        this.left = this.findScrollByIndex(this.innerIndex)
      })
    },
    calculatePivots() {
      const rotatorLeft = this.$refs.list.getBoundingClientRect().left
      this.pivots = (this.$refs.items || []).map((item) => getClientCenterY(item) - rotatorLeft).sort((a, b) => a - b)
      this.pivotMin = Math.min(...this.pivots)
      this.pivotMax = Math.max(...this.pivots)

      this.scrollOffsetLeft = this.$refs.selection.offsetLeft + this.$refs.selection.offsetHeight / 2

      this.scrollMin = this.scrollOffsetLeft - this.pivotMin
      this.scrollMax = this.scrollOffsetLeft - this.pivotMax
    },
    sanitizeInternalIndex(index) {
      return Math.min(Math.max(index, this.placeholder ? -1 : 0), this.normalizedOptions.length - 1)
    },
    findIndexFromScroll(scroll) {
      let prevDiff = null
      let pivotIndex = 0
      this.pivots.forEach((pivot, i) => {
        const diff = pivot + scroll - this.scrollOffsetLeft
        if (prevDiff === null || Math.abs(prevDiff) > Math.abs(diff)) {
          pivotIndex = i
          prevDiff = diff
        }
      })
      if (this.placeholder || this.options.length === 0) {
        return pivotIndex - 1
      }
      return pivotIndex
    },
    findScrollByIndex(index) {
      let pivotIndex = index
      if (this.placeholder || this.options.length === 0) {
        pivotIndex++
      }
      if (index > -1 && pivotIndex in this.pivots) {
        return this.scrollOffsetLeft - this.pivots[pivotIndex]
      }
      if (index >= this.pivots.length) {
        return this.scrollOffsetLeft - this.pivotMax
      }

      return this.scrollOffsetLeft - this.pivotMin
    },
    onScroll(e) {
      if (this.left >= this.scrollMin && e.deltaX < 0) return
      if (this.left <= this.scrollMax && e.deltaX > 0) return
      if (this.pivots.length === 1) return

      e.preventDefault()

      const nextDirInnerIndex = this.sanitizeInternalIndex(this.innerIndex + (e.deltaX > 0 ? 1 : -1))
      const deltaMax = e.deltaX > 0
        ? this.findScrollByIndex(nextDirInnerIndex - 1) - this.findScrollByIndex(nextDirInnerIndex)
        : this.findScrollByIndex(nextDirInnerIndex) - this.findScrollByIndex(nextDirInnerIndex + 1)

      const deltaX = Math.max(Math.min(e.deltaX, deltaMax), deltaMax * -1)

      this.left = Math.min(Math.max(this.left - deltaX * this.scrollSensitivity, this.scrollMax), this.scrollMin)

      const nextInnerIndex = this.sanitizeInternalIndex(this.findIndexFromScroll(this.left))
      const nextInnerValue = this.normalizedOptions[nextInnerIndex] && this.normalizedOptions[nextInnerIndex].value || null

      this.innerIndex = nextInnerIndex
      if (this.innerValue !== nextInnerValue) {
        this.$emit('input', this.innerValue = nextInnerValue)
      }

      this.onAfterWheel()
    },
    onAfterWheel: debounce(function () {
      this.correction(this.findIndexFromScroll(this.left))
    }, 200),
    onStart(event) {
      if (event.cancelable) {
        event.preventDefault()
      }

      const { clientX } = getEventXY(event)
      this.start = [this.left, clientX]
      if (!isTouchEvent(event)) {
        this.isMouseDown = true
      }
      this.isDragging = false
    },
    onMove(e) {
      if (e.cancelable) {
        e.preventDefault()
      }
      if (!this.start) {
        return
      }
      const { clientX } = getEventXY(e)
      const diff = clientX - this.start[1]
      if (Math.abs(diff) > 1.5) {
        this.isDragging = true
      }
      this.left = this.start[0] + diff * (isTouchEvent(e) ? this.touchSensitivity : this.dragSensitivity)
    },
    onEnd(e) {
      if (e.cancelable) {
        e.preventDefault()
      }
      if (this.isDragging) {
        this.correction(this.findIndexFromScroll(this.left))
      } else if (this.isMouseDown) {
        this.handleClick(e)
      }
      this.start = null
      this.isDragging = false
      this.isMouseDown = false
    },
    onCancel(e) {
      if (e.cancelable) {
        e.preventDefault()
      }
      this.correction(this.findIndexFromScroll(this.left))
      this.start = null
      this.isMouseDown = false
      this.isDragging = false
    },
    handleClick(e) {
      const touchInfo = getEventXY(e)
      const x = touchInfo.clientX
      const y = touchInfo.clientY
      const leftRect = this.$refs.left.getBoundingClientRect()
      const rightRect = this.$refs.right.getBoundingClientRect()
      if (leftRect.left <= x && x <= leftRect.right && leftRect.top <= y && y <= leftRect.bottom) {
        this.correction(this.innerIndex - 1)
      } else if (rightRect.left <= x && x <= rightRect.right && rightRect.left <= y && y <= bottomRect.bottom) {
        this.correction(this.innerIndex + 1)
      }
    },
    correction(index) {
      const nextInnerIndex = this.sanitizeInternalIndex(index)
      const nextInnerValue = this.normalizedOptions[nextInnerIndex] && this.normalizedOptions[nextInnerIndex].value || null
      this.left = this.findScrollByIndex(nextInnerIndex)

      this.transitioning = true
      if (this.transitionTO) {
        clearTimeout(this.transitionTO)
        this.transitionTO = null
      }

      this.transitionTO = setTimeout(() => {
        this.transitioning = false
        this.transitionTO = null

        this.innerIndex = nextInnerIndex
        if (this.innerValue !== nextInnerValue) {
          this.innerValue = nextInnerValue
          this.$emit('input', this.innerValue)
        }
      }, 100)
    },
  },
  render(h) {
    let items = []
    if (this.placeholder) {
      items.push(h("div", {
        class: {
          "vue-scroll-picker-item": true,
          "-placeholder": true,
          "-selected": this.innerIndex == -1,
        },
        ref: "items",
        refInFor: true,
        domProps: {
          innerHTML: this.placeholder,
        },
      }))
    } else if (this.normalizedOptions.length === 0 && this.placeholder === null) {
      items.push(h("div", {
        class: ["vue-scroll-picker-item", "-empty", "-selected"],
        ref: "items",
        refInFor: true,
        domProps: {
          innerHTML: this.empty,
        },
      }))
    }

    items = items.concat(this.normalizedOptions.map((option, index) => {
      return h("div", {
        class: {
          "vue-scroll-picker-item": true,
          "-selected": this.innerIndex == index,
        },
        key: option.value,
        ref: "items",
        refInFor: true,
        domProps: {
          innerHTML: option.name,
        },
      })
    }))
    return h("div", {class: ["vue-scroll-picker"]}, [
      h("div", {class: ["vue-scroll-picker-list"]}, [
        h("div", {
          ref: 'list',
          class: {
            "vue-scroll-picker-list-rotator": true,
            "-transition": this.transitioning,
          },
          style: this.left !== null ? { left: `${this.left}px` } : {},
        }, items)
      ]),
      h("div", {class: ["vue-scroll-picker-layer"]}, [
        h("div", {class: ["left"], ref: "left"}),
        h("div", {class: ["middle"], ref: "selection"}),
        h("div", {class: ["right"], ref: "right"}),
      ]),
    ])
  }
}
