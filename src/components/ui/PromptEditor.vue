<!--
  提示词编辑器(领域提示 / LLM 系统提示词共用)

  统一的外框、顶部工具条(标题 + 清空)、等宽输入区与底部字符计数,
  保证设置页两个引擎的长文本编辑体验一致。
-->
<template>
  <div class="pe">
    <div class="pe__bar">
      <span class="pe__label">
        <Icon
          :name="icon"
          :size="13"
        />{{ title }}
      </span>
      <button
        class="pe__clear"
        type="button"
        title="清空内容"
        @click="clear"
      >
        <Icon
          name="clear"
          :size="12"
        />清空
      </button>
    </div>

    <textarea
      class="pe__input"
      :rows="rows"
      :value="modelValue"
      :placeholder="placeholder"
      spellcheck="false"
      @input="onInput"
    />

    <div class="pe__foot">
      <span class="tr2-hint">{{ hint }}</span>
      <span class="pe__count">{{ modelValue.length }} 字符</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import Icon from '@/components/ui/Icon.vue'

withDefaults(
  defineProps<{
    modelValue: string
    title: string
    icon?: string
    placeholder?: string
    hint?: string
    rows?: number
  }>(),
  {
    icon: 'prompt',
    placeholder: '',
    hint: '',
    rows: 3,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function onInput(e: Event): void {
  emit('update:modelValue', (e.target as HTMLTextAreaElement).value)
}

function clear(): void {
  emit('update:modelValue', '')
}
</script>

<style lang="scss" scoped>
.pe {
  border: 1px solid var(--tr2-line-strong);
  border-radius: var(--tr2-r);
  background: var(--tr2-card);
  overflow: hidden;
  transition: border-color 0.15s ease, box-shadow 0.15s ease;

  &:focus-within {
    border-color: var(--tr2-primary);
    box-shadow: 0 0 0 3px var(--tr2-primary-soft);
  }
}

.pe__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 9px;
  border-bottom: 1px solid var(--tr2-line);
  background: var(--tr2-inset);
}

.pe__label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 500;
  color: var(--tr2-text-2);
}

.pe__clear {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  border: 0;
  background: none;
  color: var(--tr2-muted);
  font-size: 10.5px;
  cursor: pointer;
  transition: color 0.15s ease;

  &:hover {
    color: var(--tr2-err);
  }

  &:active {
    transform: scale(0.96);
  }
}

.pe__input {
  width: 100%;
  min-height: 64px;
  padding: 9px;
  border: 0;
  outline: 0;
  resize: vertical;
  background: transparent;
  color: var(--tr2-text);
  font-family: var(--tr2-mono);
  font-size: 11.5px;
  line-height: 1.6;

  &::placeholder {
    color: var(--tr2-placeholder);
  }
}

.pe__foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 9px;
  border-top: 1px solid var(--tr2-line);
  background: var(--tr2-inset);
}

.pe__count {
  flex: 0 0 auto;
  font-family: var(--tr2-mono);
  font-size: 10.5px;
  color: var(--tr2-muted);
  font-variant-numeric: tabular-nums;
}
</style>
