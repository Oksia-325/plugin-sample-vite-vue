<template>
  <button
    type="button"
    class="trans-eye"
    :title="show ? '隐藏 API Key' : '显示 API Key'"
    :aria-label="show ? '隐藏 API Key' : '显示 API Key'"
    @click="$emit('toggle')"
  >
    <!-- 明文显示中 → 隐藏(不可见)图标,点击可隐藏 -->
    <span
      v-if="show"
      v-html="iconHidden"
    />
    <!-- 密文状态 → 显示(可见)图标,点击可显示 -->
    <span
      v-else
      v-html="iconVisible"
    />
  </button>
</template>

<script setup lang="ts">
import iconHiddenRaw from '@/assets/icons/eye-hidden.svg?raw'
import iconVisibleRaw from '@/assets/icons/eye-visible.svg?raw'

/** 去掉 iconfont 文件头的 <?xml?> 与 <!DOCTYPE>,否则 innerHTML 解析会出问题 */
const stripProlog = (s: string) => s.replace(/^<\?xml[\s\S]*?\?>\s*(?:<!DOCTYPE[\s\S]*?>\s*)?/, '')
const iconHidden = stripProlog(iconHiddenRaw)
const iconVisible = stripProlog(iconVisibleRaw)

defineProps<{ show: boolean }>()
defineEmits<{ (e: 'toggle'): void }>()
</script>

<style scoped>
.trans-eye span {
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
