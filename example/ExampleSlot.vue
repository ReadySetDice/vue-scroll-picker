<style scoped>
.custom-option {
  padding: 2px 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
.custom-option-icon {
  width: 20px;
  height: 20px;
  margin-right:6px;
  fill: currentColor;
}
</style>
<template>
  <div>
    <p>currentValue = <strong>{{ currentValue === null ? '(null)' : currentValue }}</strong></p>
    <div class="button-group">
      <a
        class="button"
        :class="{active: currentValue === null}"
        @click="currentValue = null"
      >(null)</a>
      <a
        class="button"
        :class="{active: currentValue === 'unknown'}"
        @click="currentValue = 'unknown'"
      >(Unknown)</a>
      <a
        class="button"
        v-for="(option, index) in options"
        :key="index"
        :class="{active: currentValue == option.value}"
        @click="currentValue = option.value"
        v-html="option.name"
      ></a>
    </div>
    <VueScrollPicker :options="options" v-model="currentValue">
      <template v-slot:placeholder>
        Select One 🥲
      </template>
      <template v-slot:default="{ option }">
        <div class="custom-option">
          <div class="custom-option-icon" v-html="option.icon" />
          <span>{{ option.name }}</span>
        </div>
      </template>
    </VueScrollPicker>
  </div>
</template>
<script lang="ts">
import { Get } from 'simple-icons'
import { defineComponent } from 'vue'

export default defineComponent({
  data() {
    return {
      options: [
        { value: 'instagram', name: ' Instagram', icon: Get('instagram').svg },
        { value: 'facebook', name: 'Facebook', icon: Get('facebook').svg },
        { value: 'youtube', name: 'Youtube', icon: Get('youtube').svg },
        { value: 'twitter', name: 'Twitter', icon: Get('twitter').svg },
        { value: 'line', name: 'Line', icon: Get('line').svg },
      ],
      currentValue: null,
    }
  },
})
</script>
