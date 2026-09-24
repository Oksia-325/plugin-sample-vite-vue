<template>
  <div class="icon8-sync">
    <div class="icon8-sync__tabs">
      <button
        class="icon8-sync__tab"
        :class="{ 'icon8-sync__tab--active': activeTab === 'sync' }"
        @click="activeTab = 'sync'"
      >
        🔄 {{ t('tabSync') }}
      </button>
      <button
        class="icon8-sync__tab"
        :class="{ 'icon8-sync__tab--active': activeTab === 'settings' }"
        @click="activeTab = 'settings'"
      >
        ⚙️ {{ t('tabSettings') }}
      </button>
    </div>

    <!-- 同步 -->
    <div
      v-show="activeTab === 'sync'"
      class="icon8-sync__pane"
    >
      <div
        v-if="!settingsReady"
        class="icon8-sync__hint"
      >
        ⏳ {{ t('loading') }}
      </div>
      <template v-else>
        <div
          v-if="!configured"
          class="icon8-sync__hint icon8-sync__hint--warning"
        >
          ⚠️ {{ t('notConfigured') }}
          <button
            class="b3-button b3-button--text"
            @click="activeTab = 'settings'"
          >
            {{ t('goSettings') }}
          </button>
        </div>
        <div class="icon8-sync__toolbar">
          <button
            class="b3-button b3-button--outline"
            :disabled="syncRunning"
            @click="startSync"
          >
            {{ syncRunning ? `⏳ ${t('syncRunningBtn')}` : `⬇️ ${t('startSync')}` }}
          </button>
          <button
            v-if="syncRunning"
            class="b3-button b3-button--outline"
            @click="stopSync"
          >
            ⏹ {{ t('stopSync') }}
          </button>
          <span
            v-if="lastSyncText"
            class="icon8-sync__last"
          >🕒 {{ t('lastSyncLabel') }}{{ lastSyncText }}</span>
        </div>
        <div
          v-if="summary"
          class="icon8-sync__summary"
          :class="{ 'icon8-sync__summary--error': summaryError }"
        >
          {{ summaryError ? '❌' : '✅' }} {{ summary }}
        </div>
        <div class="icon8-sync__cards">
          <div
            v-for="card in cards"
            :key="card.collectionId"
            class="icon8-sync__card"
            :data-status="card.status"
            :title="card.message || card.name"
          >
            <div class="icon8-sync__card-head">
              <span class="icon8-sync__card-name">{{ card.name }}</span>
              <span
                class="icon8-sync__card-status"
                :data-status="card.status"
              >{{ statusText(card.status) }}</span>
            </div>
            <div class="icon8-sync__card-stats">
              {{ t('colDownloaded') }}: {{ card.downloaded }} {{ t('colFailed') }}: {{ card.failed }} | {{ t('colLocal') }}: {{ card.localTotal }} {{ t('colRemote') }}: {{ card.remoteTotal }}
              <template v-if="card.deletedRemote > 0">
                / {{ t('colDeletedRemote') }}: {{ card.deletedRemote }}
              </template>
            </div>
          </div>
          <div
            v-if="cards.length === 0 && !syncRunning"
            class="icon8-sync__empty"
          >
            💤 {{ t('syncIdleHint') }}
          </div>
        </div>
      </template>
    </div>

    <!-- 设置 -->
    <div
      v-show="activeTab === 'settings'"
      class="icon8-sync__pane"
    >
      <div class="icon8-sync__field">
        <label class="icon8-sync__label">
          🔑 {{ t('tokenLabel') }}
          <span
            class="icon8-sync__badge"
            :data-ok="configured"
          >{{ configured ? `✅ ${t('tokenConfigured')}` : `⚠️ ${t('tokenNotSet')}` }}</span>
        </label>
        <div class="icon8-sync__password">
          <SyInput
            v-model="tokenInput"
            :type="showToken ? 'text' : 'password'"
            :placeholder="t('tokenPlaceholder')"
          />
          <button
            class="icon8-sync__password-eye"
            :title="showToken ? t('hideToken') : t('showToken')"
            @click="showToken = !showToken"
          >
            <svg
              v-if="!showToken"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
              <circle
                cx="12"
                cy="12"
                r="3"
              />
            </svg>
            <svg
              v-else
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            >
              <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-8-10-8a18.45 18.45 0 0 1 5.06-5.94" />
              <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19" />
              <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
              <line
                x1="1"
                y1="1"
                x2="23"
                y2="23"
              />
            </svg>
          </button>
        </div>
        <div class="icon8-sync__hint">
          💡 {{ t('tokenHint') }}
        </div>
      </div>
      <div class="icon8-sync__field-row">
        <div class="icon8-sync__field">
          <label class="icon8-sync__label">🖼️ {{ t('formatLabel') }}</label>
          <SySelect
            v-model="formatInput"
            :options="formatOptions"
          />
        </div>
        <div class="icon8-sync__field">
          <label class="icon8-sync__label">📏 {{ t('sizeLabel') }}</label>
          <SySelect
            v-model="sizeInput"
            :options="sizeOptions"
          />
        </div>
        <div class="icon8-sync__field">
          <label class="icon8-sync__label">⚡ {{ t('concurrencyLabel') }}</label>
          <SyInput
            v-model="concurrencyInput"
            type="number"
            min="1"
            max="8"
          />
        </div>
      </div>
      <div class="icon8-sync__actions">
        <button
          class="b3-button b3-button--outline"
          :disabled="verifying"
          @click="saveSettings"
        >
          {{ verifying ? `⏳ ${t('verifying')}` : `💾 ${t('saveAndVerify')}` }}
        </button>
      </div>
      <div
        v-if="settingsMessage"
        class="icon8-sync__settings-msg"
        :class="{ 'icon8-sync__settings-msg--error': !settingsOk }"
      >
        {{ settingsOk ? '✅' : '⚠️' }} {{ settingsMessage }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  PluginSettings,
  SyncResult,
} from '@/icons8/types'
import {
  onMounted,
  reactive,
  ref,
} from 'vue'
import SyInput from '@/components/SiyuanTheme/SyInput.vue'
import SySelect from '@/components/SiyuanTheme/SySelect.vue'
import {
  Icons8Client,
  UnauthorizedError,
} from '@/icons8/client'
import { getContext } from '@/icons8/context'
import { reloadEmoji } from '@/icons8/emoji'
import { SyncManager } from '@/icons8/sync'
import { usePlugin } from '@/main'

interface CollectionCard {
  collectionId: string
  name: string
  remoteTotal: number
  localTotal: number
  downloaded: number
  failed: number
  deletedRemote: number
  status: 'pending' | 'syncing' | 'done' | 'error'
  message: string
}

const props = defineProps<{
  initialTab?: 'sync' | 'settings'
}>()

const plugin = usePlugin()
const t = (key: string) => (plugin.i18n?.[key] as string) ?? key
const ctx = getContext(plugin)

const activeTab = ref(props.initialTab ?? 'sync')

// settings form state
const settingsReady = ref(false)
const configured = ref(false)
const tokenInput = ref('')
const showToken = ref(false)
const formatInput = ref('png')
const sizeInput = ref('512')
const concurrencyInput = ref('4')
const verifying = ref(false)
const settingsOk = ref(false)
const settingsMessage = ref('')

const formatOptions = [
  {
    value: 'png',
    text: 'PNG',
  },
  {
    value: 'svg',
    text: 'SVG',
  },
]
const sizeOptions = [
  {
    value: '64',
    text: '64 px',
  },
  {
    value: '128',
    text: '128 px',
  },
  {
    value: '256',
    text: '256 px',
  },
  {
    value: '512',
    text: '512 px',
  },
]

// sync state
const cards = reactive<CollectionCard[]>([])
const syncRunning = ref(false)
const summary = ref('')
const summaryError = ref(false)
const lastSyncText = ref('')

let client: Icons8Client | null = null
function currentClient(): Icons8Client {
  if (!client) {
    client = new Icons8Client(() => ctx.settings.get())
  }
  return client
}

onMounted(async () => {
  await ctx.settings.load()
  const settings = ctx.settings.get()
  tokenInput.value = settings.authorization
  formatInput.value = settings.downloadFormat
  sizeInput.value = String(settings.downloadSize)
  concurrencyInput.value = String(settings.maxConcurrentDownloads)
  configured.value = ctx.settings.isConfigured()
  settingsReady.value = true
})

function clampConcurrency(value: string): number {
  const num = Math.floor(Number(value))
  if (!Number.isFinite(num)) {
    return 4
  }
  return Math.min(8, Math.max(1, num))
}

async function saveSettings() {
  settingsMessage.value = ''
  const token = tokenInput.value.trim()
  if (!token) {
    settingsOk.value = false
    settingsMessage.value = t('tokenEmpty')
    return
  }
  verifying.value = true
  const candidate: PluginSettings = {
    authorization: token,
    downloadFormat: formatInput.value === 'svg' ? 'svg' : 'png',
    downloadSize: Number(sizeInput.value) || 512,
    maxConcurrentDownloads: clampConcurrency(concurrencyInput.value),
  }
  // 用待保存的配置实测一次收藏夹接口，通过后才落盘
  const probe = new Icons8Client(() => candidate)
  try {
    const collections = await probe.getCollections()
    await ctx.settings.save(candidate)
    configured.value = true
    settingsOk.value = true
    settingsMessage.value = t('saveOk').replace('{count}', String(collections.length))
  } catch (err) {
    configured.value = ctx.settings.isConfigured()
    settingsOk.value = false
    settingsMessage.value = err instanceof UnauthorizedError
      ? t('saveFailUnauthorized')
      : `${t('saveFailNetwork')}${err instanceof Error && err.message ? `: ${err.message}` : ''}`
  } finally {
    verifying.value = false
  }
}

let activeSync: SyncManager | null = null

function statusText(status: CollectionCard['status']): string {
  const map: Record<CollectionCard['status'], string> = {
    pending: `⏳ ${t('statusPending')}`,
    syncing: `🔄 ${t('statusSyncing')}`,
    done: `✅ ${t('statusDone')}`,
    error: `❌ ${t('statusError')}`,
  }
  return map[status] ?? status
}

function upsertCard(collectionId: string, name: string): CollectionCard {
  let card = cards.find((item) => item.collectionId === collectionId)
  if (!card) {
    card = reactive({
      collectionId,
      name,
      remoteTotal: 0,
      localTotal: 0,
      downloaded: 0,
      failed: 0,
      deletedRemote: 0,
      status: 'pending',
      message: '',
    })
    cards.push(card)
  }
  return card
}

async function startSync() {
  if (!ctx.settings.isConfigured()) {
    activeTab.value = 'settings'
    return
  }
  cards.splice(0, cards.length)
  summary.value = ''
  summaryError.value = false
  syncRunning.value = true
  try {
    const sync = new SyncManager(currentClient(), ctx.manifest, () => ctx.settings.get(), {
      onCollectionStart: (collection) => {
        const card = upsertCard(collection.id, collection.name)
        card.remoteTotal = collection.totalIcons
        card.status = 'syncing'
      },
      onCollectionProgress: (collectionId, downloaded, failed) => {
        const card = upsertCard(collectionId, '')
        card.downloaded = downloaded
        card.failed = failed
        card.status = 'syncing'
      },
      onCollectionDone: (result) => {
        applyResult(result)
      },
    })
    activeSync = sync
    const results = await sync.syncAll()
    const totalDownloaded = results.reduce((sum, item) => sum + item.downloaded, 0)
    const totalFailed = results.reduce((sum, item) => sum + item.failed, 0)
    summaryError.value = totalFailed > 0
    summary.value = t('summaryDone')
      .replace('{collections}', String(results.length))
      .replace('{downloaded}', String(totalDownloaded))
      .replace('{failed}', String(totalFailed))
    const reloaded = await reloadEmoji()
    summary.value += reloaded ? ` ${t('emojiReloaded')}` : ` ${t('emojiReloadHint')}`
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      configured.value = false
      settingsOk.value = false
      settingsMessage.value = t('saveFailUnauthorized')
      activeTab.value = 'settings'
      return
    }
    summaryError.value = true
    summary.value = `${t('summaryFailed')}${err instanceof Error && err.message ? `: ${err.message}` : ''}`
  } finally {
    syncRunning.value = false
    activeSync = null
    lastSyncText.value = new Date().toLocaleTimeString()
  }
}

function applyResult(result: SyncResult) {
  const card = upsertCard(result.collectionId, result.collectionName)
  card.name = result.collectionName
  card.remoteTotal = result.remoteTotal
  card.localTotal = result.localTotal
  card.downloaded = result.downloaded
  card.failed = result.failed
  card.deletedRemote = result.deletedRemote
  card.status = result.error ? 'error' : 'done'
  card.message = result.error ?? ''
}

function stopSync() {
  activeSync?.cancel()
}
</script>

<style lang="scss" scoped>
.icon8-sync {
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  padding: 12px 16px 16px;
  gap: 12px;
  font-size: 14px;
  overflow: hidden;

  &__tabs {
    display: flex;
    gap: 4px;
    border-bottom: 1px solid var(--b3-border-color);
    flex-shrink: 0;
  }

  &__tab {
    border: none;
    background: transparent;
    color: var(--b3-theme-on-surface);
    padding: 6px 16px;
    cursor: pointer;
    border-radius: var(--b3-border-radius) var(--b3-border-radius) 0 0;
    opacity: 0.7;

    &--active {
      opacity: 1;
      color: var(--b3-theme-primary);
      box-shadow: inset 0 -2px 0 0 var(--b3-theme-primary);
    }
  }

  &__pane {
    display: flex;
    flex-direction: column;
    gap: 12px;
    overflow-y: auto;
    flex: 1;
    min-height: 0;
  }

  &__toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  &__last {
    color: var(--b3-theme-on-surface);
    opacity: 0.6;
    font-size: 12px;
  }

  &__summary {
    padding: 8px 12px;
    border-radius: var(--b3-border-radius);
    background: var(--b3-theme-primary-lightest);
    color: var(--b3-theme-on-surface);
    flex-shrink: 0;

    &--error {
      background: var(--b3-theme-error-lightest, rgba(255, 0, 0, 0.1));
      color: var(--b3-theme-error);
    }
  }

  &__cards {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  &__card {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
    border: 1px solid var(--b3-border-color);
    border-radius: 16px;
    padding: 6px 12px;
    overflow: hidden;

    &[data-status='syncing'] {
      border-color: var(--b3-theme-primary);
    }

    &[data-status='done'] {
      border-color: var(--b3-theme-success, #23b933);
    }

    &[data-status='error'] {
      border-color: var(--b3-theme-error);
    }
  }

  &__card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    min-width: 0;
  }

  &__card-name {
    font-weight: 500;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__card-status {
    flex-shrink: 0;
    font-size: 11px;
    padding: 0 8px;
    border-radius: 999px;
    background: var(--b3-border-color);

    &[data-status='syncing'] {
      background: var(--b3-theme-primary-lightest);
      color: var(--b3-theme-primary);
    }

    &[data-status='done'] {
      background: var(--b3-theme-success-lightest, rgba(35, 185, 51, 0.12));
      color: var(--b3-theme-success, #23b933);
    }

    &[data-status='error'] {
      background: var(--b3-theme-error-lightest, rgba(255, 0, 0, 0.1));
      color: var(--b3-theme-error);
    }
  }

  &__card-stats {
    font-size: 11px;
    color: var(--b3-theme-on-surface);
    opacity: 0.75;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__empty {
    grid-column: 1 / -1;
  }

  &__empty,
  &__hint {
    color: var(--b3-theme-on-surface);
    opacity: 0.7;
    font-size: 13px;

    &--warning {
      color: var(--b3-theme-warning, #d9770f);
      opacity: 1;
    }
  }

  &__password {
    position: relative;
    display: flex;
    align-items: center;
    width: 100%;

    :deep(.b3-text-field) {
      width: 100% !important;
      padding-right: 40px;
    }

    &-eye {
      position: absolute;
      right: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 30px;
      height: 30px;
      padding: 0;
      border: none;
      border-radius: var(--b3-border-radius);
      background: transparent;
      color: var(--b3-theme-on-surface);
      opacity: 0.55;
      cursor: pointer;

      &:hover {
        opacity: 1;
        background: var(--b3-theme-background-light);
      }

      svg {
        width: 16px;
        height: 16px;
      }
    }
  }

  &__field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
    min-width: 0;
  }

  &__field-row {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__label {
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  &__badge {
    font-size: 12px;
    font-weight: 400;
    padding: 1px 8px;
    border-radius: 10px;
    background: var(--b3-border-color);

    &[data-ok='true'] {
      background: var(--b3-theme-primary-lightest);
      color: var(--b3-theme-primary);
    }
  }

  &__actions {
    display: flex;
    gap: 8px;
  }

  &__settings-msg {
    padding: 8px 12px;
    border-radius: var(--b3-border-radius);
    background: var(--b3-theme-primary-lightest);
    color: var(--b3-theme-on-surface);
    word-break: break-all;

    &--error {
      background: var(--b3-theme-error-lightest, rgba(255, 0, 0, 0.1));
      color: var(--b3-theme-error);
    }
  }
}
</style>
