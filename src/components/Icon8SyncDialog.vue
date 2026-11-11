<template>
  <div class="i8-root">
    <header class="i8-header">
      <div class="i8-brand">
        <div class="i8-brand__mark">
          <AppIcon
            name="sync"
            :size="20"
            :stroke-width="2"
          />
        </div>
        <div class="i8-brand__text">
          <div class="i8-brand__line">
            <span class="i8-brand__name">Icon8Sync</span>
            <span class="i8-brand__chip">{{ t('brandChip') }}</span>
            <span
              class="i8-brand__dot"
              :class="{ 'is-off': !configured }"
              :title="configured ? t('serviceReady') : t('serviceUnconfigured')"
            />
          </div>
          <span class="i8-brand__sub">{{ t('brandSubtitle') }}</span>
        </div>
      </div>

      <nav class="i8-tabs">
        <button
          class="i8-tabs__btn"
          :class="{ 'i8-tabs__btn--active': activeTab === 'sync' }"
          type="button"
          @click="activeTab = 'sync'"
        >
          <AppIcon
            name="sync"
            :size="16"
          />
          <span>{{ t('tabSync') }}</span>
        </button>
        <button
          class="i8-tabs__btn"
          :class="{ 'i8-tabs__btn--active': activeTab === 'settings' }"
          type="button"
          @click="activeTab = 'settings'"
        >
          <AppIcon
            name="tune"
            :size="16"
          />
          <span>{{ t('tabSettings') }}</span>
        </button>
      </nav>

      <div class="i8-header__aside">
        <span
          class="i8-service-chip"
          :class="{ 'is-off': !configured }"
        >
          <span class="i8-service-chip__dot" />
          {{ configured ? t('serviceReady') : t('serviceUnconfigured') }}
        </span>
      </div>
    </header>

    <main class="i8-main">
      <!-- 同步 -->
      <section
        v-show="activeTab === 'sync'"
        class="i8-pane"
      >
        <div class="i8-scroll">
          <div
            v-if="!settingsReady"
            class="i8-loading"
          >
            <AppIcon
              name="refresh"
              :size="18"
              spin
            />
            <span>{{ t('loading') }}</span>
          </div>
          <template v-else>
            <div class="i8-hero">
              <div class="i8-hero__glow" />
              <div class="i8-hero__top">
                <div class="i8-hero__actions">
                  <button
                    class="i8-btn i8-btn--primary"
                    type="button"
                    :disabled="syncRunning"
                    @click="startSync"
                  >
                    <AppIcon
                      name="sync"
                      :size="17"
                      :spin="syncRunning"
                    />
                    <span>{{ syncRunning ? t('syncRunningBtn') : t('startSync') }}</span>
                  </button>
                  <button
                    class="i8-btn i8-btn--soft"
                    type="button"
                    :disabled="!syncRunning"
                    @click="stopSync"
                  >
                    <AppIcon
                      name="stop"
                      :size="16"
                    />
                    <span>{{ t('stopSync') }}</span>
                  </button>
                </div>
                <div class="i8-stamp">
                  <AppIcon
                    name="clock"
                    :size="14"
                  />
                  <span>{{ t('lastSyncPrefix') }}:</span>
                  <b>{{ lastSyncText || t('neverSynced') }}</b>
                </div>
              </div>

              <div
                v-if="hasOverview"
                class="i8-stats"
              >
                <div class="i8-stat">
                  <span class="i8-stat__label">
                    <AppIcon
                      name="folder"
                      :size="12"
                    />
                    {{ t('statCollections') }}
                  </span>
                  <span class="i8-stat__value">
                    {{ stats.collections }}<em>{{ t('unitCollections') }}</em>
                  </span>
                </div>
                <div class="i8-stat">
                  <span class="i8-stat__label">
                    <AppIcon
                      name="check-circle"
                      :size="12"
                    />
                    {{ t('statLocal') }}
                  </span>
                  <span class="i8-stat__value">
                    {{ stats.local }}<em>{{ t('unitIcons') }}</em>
                  </span>
                </div>
                <div class="i8-stat i8-stat--accent">
                  <span class="i8-stat__label">{{ t('statPending') }}</span>
                  <span class="i8-stat__value">
                    {{ stats.pending }}<em>{{ t('unitPending') }}</em>
                  </span>
                </div>
                <div class="i8-stat i8-stat--danger">
                  <span class="i8-stat__label">{{ t('statFailed') }}</span>
                  <span class="i8-stat__value">
                    {{ stats.failed }}<em>{{ t('unitFailed') }}</em>
                  </span>
                </div>
              </div>
              <div
                v-else
                class="i8-hero__idle"
              >
                <AppIcon
                  name="layers"
                  :size="16"
                />
                <span>{{ t('syncIdleHint') }}</span>
              </div>

              <div
                v-if="!configured"
                class="i8-banner i8-banner--warning"
              >
                <div class="i8-banner__icon">
                  <AppIcon
                    name="alert"
                    :size="14"
                  />
                </div>
                <div class="i8-banner__body">
                  <div class="i8-banner__title">
                    {{ t('notConfiguredTitle') }}
                  </div>
                  <div class="i8-banner__desc">
                    {{ t('notConfigured') }}
                  </div>
                </div>
                <button
                  class="i8-btn i8-btn--soft i8-btn--sm"
                  type="button"
                  @click="activeTab = 'settings'"
                >
                  {{ t('goSettings') }}
                </button>
              </div>
              <div
                v-else-if="summary && !summaryDismissed"
                class="i8-banner"
                :class="summaryError ? 'i8-banner--error' : 'i8-banner--success'"
              >
                <div class="i8-banner__icon">
                  <AppIcon
                    :name="summaryError ? 'alert' : 'check'"
                    :size="14"
                  />
                </div>
                <div class="i8-banner__body">
                  <div class="i8-banner__title">
                    {{ summaryError ? t('summaryErrorTitle') : t('summaryDoneTitle') }}
                  </div>
                  <div class="i8-banner__desc">
                    {{ summary }}
                  </div>
                </div>
                <button
                  class="i8-icon-btn"
                  type="button"
                  :title="t('dismiss')"
                  @click="dismissSummary"
                >
                  <AppIcon
                    name="close"
                    :size="15"
                  />
                </button>
              </div>
            </div>

            <div
              v-if="hasOverview"
              class="i8-toolbar"
            >
              <div class="i8-filters">
                <button
                  v-for="item in filters"
                  :key="item.key"
                  class="i8-filter"
                  :class="{ 'i8-filter--active': filter === item.key }"
                  type="button"
                  @click="filter = item.key"
                >
                  <span>{{ item.label }}</span>
                  <span
                    class="i8-filter__count"
                    :data-tone="item.key"
                  >{{ item.count }}</span>
                </button>
              </div>
              <span class="i8-toolbar__meta">
                {{ t('loadedCount').replace('{count}', String(filteredCards.length)) }}
              </span>
            </div>

            <div class="i8-grid">
              <article
                v-for="card in filteredCards"
                :key="card.collectionId"
                class="i8-card"
                :data-status="card.status"
              >
                <div class="i8-card__top">
                  <div class="i8-card__identity">
                    <div class="i8-card__icon">
                      <AppIcon
                        :name="collectionIcon(card.name)"
                        :size="18"
                      />
                    </div>
                    <div class="i8-card__text">
                      <div class="i8-card__title-line">
                        <span
                          class="i8-card__name"
                          :title="card.name"
                        >{{ card.name }}</span>
                        <span class="i8-card__format">{{ formatInput.toUpperCase() }}</span>
                      </div>
                      <span class="i8-card__caption">
                        {{ t('iconsCount').replace('{count}', String(card.remoteTotal)) }}
                      </span>
                    </div>
                  </div>
                  <span
                    class="i8-status-pill"
                    :data-status="card.status"
                  >
                    <AppIcon
                      :name="statusIcon(card.status)"
                      :size="13"
                      :spin="card.status === 'syncing'"
                    />
                    {{ statusText(card.status) }}
                  </span>
                </div>

                <div
                  v-if="card.status === 'syncing'"
                  class="i8-progress"
                >
                  <div
                    class="i8-progress__bar"
                    :style="{ width: `${progressPercent(card)}%` }"
                  />
                </div>

                <div
                  v-if="card.status === 'error' && card.message"
                  class="i8-card__message"
                  :title="card.message"
                >
                  {{ card.message }}
                </div>
                <div
                  v-else-if="card.deletedRemote > 0"
                  class="i8-card__note"
                >
                  {{ t('deletedRemoteNote').replace('{count}', String(card.deletedRemote)) }}
                </div>

                <div class="i8-card__footer">
                  <div class="i8-card__metrics">
                    <span>{{ t('colDownloaded') }} <b>{{ card.downloaded }}</b></span>
                    <span>{{ t('colFailed') }} <b :class="{ 'is-danger': card.failed > 0 }">{{ card.failed }}</b></span>
                    <span>{{ t('colLocal') }} <b>{{ card.localTotal }}</b></span>
                    <span>{{ t('colRemote') }} <b>{{ card.remoteTotal }}</b></span>
                  </div>
                  <button
                    class="i8-icon-btn"
                    type="button"
                    :title="copiedKey === `card:${card.collectionId}` ? t('copied') : t('copyPath')"
                    @click="copyCardPath(card)"
                  >
                    <AppIcon
                      :name="copiedKey === `card:${card.collectionId}` ? 'check' : 'copy'"
                      :size="15"
                    />
                  </button>
                </div>
              </article>

              <div
                v-if="!hasOverview && !syncRunning"
                class="i8-empty"
              >
                <div class="i8-empty__icon">
                  <AppIcon
                    name="layers"
                    :size="22"
                  />
                </div>
                <strong>{{ t('emptyTitle') }}</strong>
                <p>{{ t('syncIdleHint') }}</p>
              </div>
              <div
                v-else-if="hasOverview && filteredCards.length === 0"
                class="i8-empty i8-empty--compact"
              >
                <AppIcon
                  name="search"
                  :size="20"
                />
                <strong>{{ t('noMatch') }}</strong>
              </div>
            </div>
          </template>
        </div>

        <footer class="i8-sync-footer">
          <div class="i8-search">
            <AppIcon
              name="search"
              :size="16"
            />
            <input
              v-model="search"
              type="text"
              :placeholder="t('searchPlaceholder')"
              :aria-label="t('searchPlaceholder')"
            >
            <button
              v-if="search"
              class="i8-icon-btn i8-icon-btn--tiny"
              type="button"
              :title="t('clearSearch')"
              @click="search = ''"
            >
              <AppIcon
                name="close"
                :size="13"
              />
            </button>
          </div>
          <span class="i8-footer-hint">{{ t('footerHint') }}</span>
        </footer>
      </section>

      <!-- 设置 -->
      <section
        v-show="activeTab === 'settings'"
        class="i8-pane"
      >
        <div class="i8-scroll">
          <div class="i8-panel i8-service">
            <div class="i8-service__mark">
              <AppIcon
                name="hub"
                :size="22"
              />
            </div>
            <div class="i8-service__body">
              <div class="i8-service__title-line">
                <span class="i8-service__title">{{ t('serviceTitle') }}</span>
                <span
                  class="i8-pill"
                  :class="configured ? 'i8-pill--ok' : 'i8-pill--warn'"
                >
                  <AppIcon
                    :name="configured ? 'check-circle' : 'alert'"
                    :size="12"
                  />
                  {{ configured ? t('authorized') : t('notAuthorized') }}
                </span>
              </div>
              <p class="i8-service__desc">
                {{ t('serviceDesc') }}
              </p>
            </div>
            <span
              class="i8-service__state"
              :class="{ 'is-off': !configured }"
            >
              <span class="i8-service__dot" />
              {{ configured ? t('serviceRunning') : t('serviceStopped') }}
            </span>
          </div>

          <section class="i8-panel">
            <div class="i8-panel__head">
              <div class="i8-panel__mark">
                <AppIcon
                  name="key"
                  :size="17"
                />
              </div>
              <div class="i8-panel__heading">
                <div class="i8-panel__title">
                  {{ t('tokenLabel') }}
                </div>
                <div class="i8-panel__desc">
                  {{ t('tokenDesc') }}
                </div>
              </div>
              <a
                class="i8-link"
                href="https://icons8.com"
                target="_blank"
                rel="noreferrer"
              >
                <span>{{ t('visitIcons8') }}</span>
                <AppIcon
                  name="external"
                  :size="13"
                />
              </a>
            </div>

            <div class="i8-token">
              <AppIcon
                class="i8-token__icon"
                name="shield"
                :size="17"
              />
              <input
                v-model="tokenInput"
                :type="showToken ? 'text' : 'password'"
                :placeholder="t('tokenPlaceholder')"
                autocomplete="off"
                spellcheck="false"
              >
              <button
                class="i8-icon-btn i8-icon-btn--tiny"
                type="button"
                :title="showToken ? t('hideToken') : t('showToken')"
                @click="showToken = !showToken"
              >
                <AppIcon
                  :name="showToken ? 'eye-off' : 'eye'"
                  :size="16"
                />
              </button>
              <button
                class="i8-icon-btn i8-icon-btn--tiny"
                type="button"
                :title="copiedKey === 'token' ? t('tokenCopied') : t('copyToken')"
                @click="copyToken"
              >
                <AppIcon
                  :name="copiedKey === 'token' ? 'check' : 'copy'"
                  :size="16"
                />
              </button>
            </div>

            <div class="i8-help">
              <AppIcon
                name="bulb"
                :size="17"
              />
              <div>
                <div class="i8-help__title">
                  {{ t('extractionTitle') }}
                </div>
                <p class="i8-help__text">
                  {{ t('tokenHint') }}
                </p>
              </div>
            </div>
          </section>

          <div class="i8-settings-grid">
            <section class="i8-panel">
              <div class="i8-panel__head">
                <div class="i8-panel__mark">
                  <AppIcon
                    name="download"
                    :size="17"
                  />
                </div>
                <div class="i8-panel__heading">
                  <div class="i8-panel__title">
                    {{ t('formatTitle') }}
                  </div>
                  <div class="i8-panel__desc">
                    {{ t('formatDesc') }}
                  </div>
                </div>
              </div>

              <div class="i8-row">
                <div class="i8-row__main">
                  <AppIcon
                    class="i8-row__icon"
                    name="image"
                    :size="17"
                  />
                  <div>
                    <div class="i8-row__title">
                      {{ t('iconFormat') }}
                    </div>
                    <div class="i8-row__desc">
                      {{ t('iconFormatDesc') }}
                    </div>
                  </div>
                </div>
                <div class="i8-seg">
                  <button
                    v-for="option in formatOptions"
                    :key="option.value"
                    type="button"
                    :class="{ 'is-active': formatInput === option.value }"
                    @click="formatInput = option.value"
                  >
                    {{ option.text }}
                  </button>
                </div>
              </div>

              <div class="i8-row">
                <div class="i8-row__main">
                  <AppIcon
                    class="i8-row__icon"
                    name="aspect"
                    :size="17"
                  />
                  <div>
                    <div class="i8-row__title">
                      {{ t('iconSize') }}
                    </div>
                    <div class="i8-row__desc">
                      {{ t('iconSizeDesc') }}
                    </div>
                  </div>
                </div>
                <div class="i8-select-wrap">
                  <select
                    v-model="sizeInput"
                    class="i8-select"
                  >
                    <option
                      v-for="option in sizeOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.text }}
                    </option>
                  </select>
                  <AppIcon
                    name="chevron"
                    :size="14"
                  />
                </div>
              </div>

              <div class="i8-row">
                <div class="i8-row__main">
                  <AppIcon
                    class="i8-row__icon"
                    name="bolt"
                    :size="17"
                  />
                  <div>
                    <div class="i8-row__title">
                      {{ t('concurrency') }}
                    </div>
                    <div class="i8-row__desc">
                      {{ t('concurrencyDesc') }}
                    </div>
                  </div>
                </div>
                <div class="i8-stepper">
                  <button
                    type="button"
                    :disabled="concurrencyNumber <= 1"
                    @click="stepConcurrency(-1)"
                  >
                    <AppIcon
                      name="minus"
                      :size="13"
                    />
                  </button>
                  <span class="i8-stepper__value">
                    {{ concurrencyNumber }}<em>/8</em>
                  </span>
                  <button
                    type="button"
                    :disabled="concurrencyNumber >= 8"
                    @click="stepConcurrency(1)"
                  >
                    <AppIcon
                      name="plus"
                      :size="13"
                    />
                  </button>
                </div>
              </div>
            </section>

            <section class="i8-panel">
              <div class="i8-panel__head">
                <div class="i8-panel__mark">
                  <AppIcon
                    name="folder"
                    :size="17"
                  />
                </div>
                <div class="i8-panel__heading">
                  <div class="i8-panel__title">
                    {{ t('storageTitle') }}
                  </div>
                  <div class="i8-panel__desc">
                    {{ t('storageDesc') }}
                  </div>
                </div>
              </div>

              <div class="i8-path">
                <div class="i8-path__main">
                  <AppIcon
                    class="i8-row__icon"
                    name="folder-open"
                    :size="17"
                  />
                  <div class="i8-path__text">
                    <div class="i8-row__desc">
                      {{ t('localPath') }}
                    </div>
                    <code>data/emojis/</code>
                  </div>
                </div>
                <button
                  class="i8-btn i8-btn--soft i8-btn--sm"
                  type="button"
                  :title="copiedKey === 'path' ? t('pathCopied') : t('copyPathAction')"
                  @click="copyEmojiRoot"
                >
                  <AppIcon
                    :name="copiedKey === 'path' ? 'check' : 'copy'"
                    :size="14"
                  />
                  <span>{{ copiedKey === 'path' ? t('copied') : t('copyPathAction') }}</span>
                </button>
              </div>

              <div class="i8-chips">
                <span class="i8-chip i8-chip--ok">
                  <AppIcon
                    name="check"
                    :size="12"
                  />
                  {{ t('incrementalSync') }}
                </span>
                <span class="i8-chip i8-chip--ok">
                  <AppIcon
                    name="check"
                    :size="12"
                  />
                  {{ t('autoRefresh') }}
                </span>
              </div>

              <p class="i8-storage-note">
                {{ t('storageNote') }}
              </p>
            </section>
          </div>
        </div>

        <footer class="i8-settings-footer">
          <div
            class="i8-settings-status"
            :class="settingsMessage ? (settingsOk ? 'is-ok' : 'is-error') : ''"
          >
            <AppIcon
              :name="settingsMessage ? (settingsOk ? 'check-circle' : 'alert') : 'bulb'"
              :size="16"
            />
            <span :title="settingsMessage || t('settingsFooterHint')">
              {{ settingsMessage || t('settingsFooterHint') }}
            </span>
          </div>
          <button
            class="i8-btn i8-btn--primary"
            type="button"
            :disabled="verifying || !settingsReady"
            @click="saveSettings"
          >
            <AppIcon
              name="verified"
              :size="16"
              :spin="verifying"
            />
            <span>{{ verifying ? t('verifying') : t('saveAndVerify') }}</span>
          </button>
        </footer>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import type {
  PluginSettings,
  SyncResult,
} from '@/icons8/types'
import {
  computed,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'
import AppIcon from '@/components/icon8/AppIcon.vue'
import {
  Icons8Client,
  UnauthorizedError,
} from '@/icons8/client'
import { getContext } from '@/icons8/context'
import { reloadEmoji } from '@/icons8/emoji'
import { emojiDirPath } from '@/icons8/naming'
import { SyncManager } from '@/icons8/sync'
import {
  DEFAULT_SETTINGS,
  EMOJI_DIR,
} from '@/icons8/types'
import { usePlugin } from '@/main'
import { copyText } from '@/utils'

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

type FilterKey = 'all' | 'syncing' | 'done' | 'error'
type TabKey = 'sync' | 'settings'

const props = defineProps<{
  initialTab?: TabKey
}>()

const plugin = usePlugin()
const t = (key: string) => (plugin.i18n?.[key] as string) ?? key
const ctx = getContext(plugin)

const activeTab = ref<TabKey>(props.initialTab ?? 'sync')

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
const copiedKey = ref('')

watch([tokenInput, formatInput, sizeInput, concurrencyInput], () => {
  if (settingsMessage.value) {
    settingsOk.value = false
    settingsMessage.value = ''
  }
})

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
const summaryDismissed = ref(false)
const lastSyncText = ref('')
const filter = ref<FilterKey>('all')
const search = ref('')
const stopRequested = ref(false)

const concurrencyNumber = computed(() => {
  const value = Math.floor(Number(concurrencyInput.value))
  return Number.isFinite(value) ? Math.min(8, Math.max(1, value)) : DEFAULT_SETTINGS.maxConcurrentDownloads
})

const hasOverview = computed(() => cards.length > 0)

const stats = computed(() => {
  const local = cards.reduce((sum, card) => sum + card.localTotal, 0)
  const pending = cards.reduce((sum, card) => sum + Math.max(0, card.remoteTotal - card.localTotal), 0)
  const failed = cards.reduce((sum, card) => sum + card.failed, 0)
  return {
    collections: cards.length,
    local,
    pending,
    failed,
  }
})

const counts = computed(() => {
  const value: Record<FilterKey, number> = {
    all: cards.length,
    syncing: 0,
    done: 0,
    error: 0,
  }
  for (const card of cards) {
    if (card.status === 'syncing') {
      value.syncing++
    } else if (card.status === 'done') {
      value.done++
    } else if (card.status === 'error') {
      value.error++
    }
  }
  return value
})

const filters = computed(() => [
  {
    key: 'all' as FilterKey,
    label: t('filterAll'),
    count: counts.value.all,
  },
  {
    key: 'syncing' as FilterKey,
    label: t('filterSyncing'),
    count: counts.value.syncing,
  },
  {
    key: 'done' as FilterKey,
    label: t('filterDone'),
    count: counts.value.done,
  },
  {
    key: 'error' as FilterKey,
    label: t('filterError'),
    count: counts.value.error,
  },
])

const filteredCards = computed(() => {
  const query = search.value.trim().toLowerCase()
  return cards.filter((card) => {
    if (filter.value !== 'all' && card.status !== filter.value) {
      return false
    }
    if (!query) {
      return true
    }
    return card.name.toLowerCase().includes(query) || card.message.toLowerCase().includes(query)
  })
})

let client: Icons8Client | null = null
function currentClient(): Icons8Client {
  if (!client) {
    client = new Icons8Client(() => ctx.settings.get())
  }
  return client
}

onMounted(async () => {
  try {
    await ctx.settings.load()
    const settings = ctx.settings.get()
    tokenInput.value = settings.authorization
    formatInput.value = settings.downloadFormat
    sizeInput.value = String(settings.downloadSize)
    concurrencyInput.value = String(settings.maxConcurrentDownloads)
    configured.value = ctx.settings.isConfigured()
  } catch (err) {
    settingsOk.value = false
    settingsMessage.value = `${t('summaryFailed')}: ${err instanceof Error ? err.message : String(err)}`
  } finally {
    settingsReady.value = true
  }
})

function clampConcurrency(value: string): number {
  const num = Math.floor(Number(value))
  if (!Number.isFinite(num)) {
    return DEFAULT_SETTINGS.maxConcurrentDownloads
  }
  return Math.min(8, Math.max(1, num))
}

function stepConcurrency(delta: number) {
  concurrencyInput.value = String(clampConcurrency(String(concurrencyNumber.value + delta)))
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
    pending: t('statusPending'),
    syncing: t('statusSyncing'),
    done: t('statusDone'),
    error: t('statusError'),
  }
  return map[status] ?? status
}

function statusIcon(status: CollectionCard['status']): string {
  const map: Record<CollectionCard['status'], string> = {
    pending: 'clock',
    syncing: 'sync',
    done: 'check-circle',
    error: 'alert',
  }
  return map[status] ?? 'clock'
}

function progressPercent(card: CollectionCard): number {
  const expected = Math.max(1, card.remoteTotal - card.localTotal)
  return Math.min(100, Math.round(((card.downloaded + card.failed) / expected) * 100))
}

function collectionIcon(name: string): string {
  const key = name.toLowerCase()
  const rules: Array<[RegExp, string]> = [
    [/math|formula|数学|公式/, 'sigma'],
    [/brand|品牌|商标/, 'badge'],
    [/nature|植物|自然|天气/, 'leaf'],
    [/hardware|device|设备|硬件/, 'device'],
    [/game|游戏/, 'gamepad'],
    [/code|dev|编程|代码/, 'code'],
    [/ai|智能|算法/, 'sparkles'],
    [/app|应用|软件/, 'grid'],
    [/mark|标记|书签/, 'bookmark'],
    [/item|物品|杂物/, 'box'],
    [/human|人物|人/, 'user'],
    [/culture|文化/, 'globe'],
    [/disease|医疗|疾病/, 'heart'],
    [/economy|经济|金融/, 'chart'],
    [/abstract|抽象/, 'shapes'],
  ]
  for (const [pattern, icon] of rules) {
    if (pattern.test(key)) {
      return icon
    }
  }
  return 'layers'
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
  summaryDismissed.value = false
  filter.value = 'all'
  search.value = ''
  stopRequested.value = false
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
    if (stopRequested.value) {
      summaryError.value = true
      summary.value = t('summaryStopped')
        .replace('{collections}', String(results.length))
        .replace('{downloaded}', String(totalDownloaded))
        .replace('{failed}', String(totalFailed))
    }
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
  stopRequested.value = true
  activeSync?.cancel()
}

function dismissSummary() {
  summaryDismissed.value = true
}

function absoluteDataPath(path: string): string {
  const workspaceDir = (window as any).siyuan?.config?.system?.workspaceDir as string | undefined
  return workspaceDir ? `${workspaceDir}/data${path}` : `data${path}`
}

async function copyValue(value: string, key: string) {
  const ok = await copyText(value)
  if (!ok) {
    return
  }
  copiedKey.value = key
  window.setTimeout(() => {
    if (copiedKey.value === key) {
      copiedKey.value = ''
    }
  }, 1600)
}

function copyToken() {
  copyValue(tokenInput.value.trim(), 'token')
}

function copyEmojiRoot() {
  copyValue(absoluteDataPath(EMOJI_DIR), 'path')
}

function copyCardPath(card: CollectionCard) {
  copyValue(absoluteDataPath(emojiDirPath(card.name)), `card:${card.collectionId}`)
}
</script>

<style lang="scss" scoped>
.i8-root {
  --i8-accent: #9c440b;
  --i8-accent-contrast: #fff;
  --i8-accent-soft: #ffdbcb;
  --i8-accent-soft-2: rgba(156, 68, 11, 0.07);
  --i8-green: #15803d;
  --i8-green-soft: rgba(21, 128, 61, 0.1);
  --i8-red: var(--b3-theme-error, #ba1a1a);
  --i8-red-soft: rgba(186, 26, 26, 0.1);
  --i8-violet: #6d28d9;
  --i8-violet-soft: rgba(109, 40, 217, 0.1);
  --i8-amber: #b45309;
  --i8-amber-soft: rgba(180, 83, 9, 0.12);
  --i8-card: var(--b3-theme-surface, #fff);
  --i8-inset: var(--b3-theme-surface-light, #f3f4f3);
  --i8-hover: var(--b3-theme-surface-lighter, #e8e8e7);
  --i8-border: var(--b3-border-color, #e2e2e2);
  --i8-text: var(--b3-theme-on-background, #1a1c1c);
  --i8-muted: var(--b3-theme-on-surface, #45474b);
  --i8-faint: var(--b3-theme-on-surface-light, #76777c);
  --i8-shadow: 0 4px 20px rgba(15, 20, 28, 0.04);
  --i8-shadow-lg: 0 18px 44px rgba(15, 20, 28, 0.14);

  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: var(--b3-theme-background);
  color: var(--i8-text);
  font-family: var(--b3-font-family);
  font-size: 14px;
  line-height: 1.45;
  box-sizing: border-box;

  * {
    box-sizing: border-box;
  }

  button,
  input,
  select {
    font-family: inherit;
  }

  [data-theme-mode='dark'] & {
    --i8-accent: #ffb692;
    --i8-accent-contrast: #1a1c1c;
    --i8-accent-soft: rgba(253, 142, 82, 0.18);
    --i8-accent-soft-2: rgba(253, 142, 82, 0.08);
    --i8-green: #4ade80;
    --i8-green-soft: rgba(74, 222, 128, 0.12);
    --i8-red: var(--b3-theme-error, #ff7b72);
    --i8-red-soft: rgba(255, 123, 114, 0.13);
    --i8-violet: #c4b5fd;
    --i8-violet-soft: rgba(196, 181, 253, 0.13);
    --i8-amber: #fbbf24;
    --i8-amber-soft: rgba(251, 191, 36, 0.14);
    --i8-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    --i8-shadow-lg: 0 22px 52px rgba(0, 0, 0, 0.45);
  }
}

.i8-header {
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
  height: 68px;
  padding: 0 22px;
  border-bottom: 1px solid var(--i8-border);
  background: var(--i8-card);
  background: color-mix(in srgb, var(--i8-card) 86%, transparent);
  backdrop-filter: blur(12px);
  z-index: 5;
}

.i8-brand {
  display: flex;
  align-items: center;
  gap: 11px;
  min-width: 0;

  &__mark {
    display: grid;
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: var(--i8-accent);
    color: var(--i8-accent-contrast);
    box-shadow: 0 4px 12px var(--i8-accent-soft-2);
    place-items: center;
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  &__line {
    display: flex;
    align-items: center;
    gap: 7px;
    min-width: 0;
  }

  &__name {
    overflow: hidden;
    color: var(--i8-text);
    font-size: 16px;
    font-weight: 700;
    letter-spacing: -0.02em;
    line-height: 1.15;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__chip {
    flex-shrink: 0;
    padding: 1px 7px;
    border-radius: 999px;
    background: var(--i8-inset);
    color: var(--i8-muted);
    font-size: 10px;
    font-weight: 600;
  }

  &__dot {
    flex-shrink: 0;
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--i8-green);
    box-shadow: 0 0 0 3px var(--i8-green-soft);

    &.is-off {
      background: var(--i8-amber);
      box-shadow: 0 0 0 3px var(--i8-amber-soft);
    }
  }

  &__sub {
    overflow: hidden;
    color: var(--i8-faint);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.i8-tabs {
  display: flex;
  gap: 2px;
  padding: 4px;
  border: 1px solid var(--i8-border);
  border-radius: 999px;
  background: var(--i8-inset);

  &__btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 14px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--i8-muted);
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;

    &:hover {
      color: var(--i8-text);
    }

    &--active {
      background: var(--b3-theme-primary);
      color: var(--b3-theme-on-primary);
      box-shadow: 0 2px 7px rgba(0, 0, 0, 0.14);
    }
  }
}

.i8-header__aside {
  display: flex;
  justify-content: flex-end;
  min-width: 0;
}

.i8-service-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 999px;
  background: var(--i8-inset);
  color: var(--i8-muted);
  font-size: 10px;
  font-weight: 500;
  white-space: nowrap;

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--i8-green);
  }

  &.is-off .i8-service-chip__dot {
    background: var(--i8-amber);
  }
}

.i8-main {
  display: flex;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.i8-pane {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  min-height: 0;
}

.i8-scroll {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 16px;
  min-height: 0;
  padding: 20px 24px;
  overflow-y: auto;

  &::-webkit-scrollbar {
    width: 8px;
  }

  &::-webkit-scrollbar-track {
    background: transparent;
  }

  &::-webkit-scrollbar-thumb {
    border: 2px solid transparent;
    border-radius: 999px;
    background: var(--i8-border);
    background-clip: content-box;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: var(--i8-faint);
    background-clip: content-box;
  }
}

.i8-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 48px 16px;
  color: var(--i8-muted);
  font-size: 13px;
}

.i8-hero {
  position: relative;
  display: flex;
  flex-shrink: 0;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  overflow: hidden;
  border: 1px solid var(--i8-border);
  border-radius: 22px;
  background: var(--i8-card);
  box-shadow: var(--i8-shadow);

  &__glow {
    position: absolute;
    top: -76px;
    right: -54px;
    width: 190px;
    height: 190px;
    border-radius: 50%;
    background: var(--i8-accent-soft-2);
    filter: blur(32px);
    pointer-events: none;
  }

  &__top {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
  }

  &__actions {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  &__idle {
    position: relative;
    z-index: 1;
    display: flex;
    align-items: center;
    gap: 7px;
    color: var(--i8-faint);
    font-size: 12px;
  }
}

.i8-btn {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 9px 16px;
  border: 0;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 0.14s ease, background 0.14s ease, opacity 0.14s ease;

  &:active:not(:disabled) {
    transform: scale(0.97);
  }

  &:disabled {
    opacity: 0.42;
    cursor: not-allowed;
  }

  &--primary {
    background: var(--b3-theme-primary);
    color: var(--b3-theme-on-primary);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);

    &:hover:not(:disabled) {
      opacity: 0.9;
    }
  }

  &--soft {
    background: var(--i8-inset);
    color: var(--i8-muted);

    &:hover:not(:disabled) {
      background: var(--i8-hover);
      color: var(--i8-text);
    }
  }

  &--sm {
    padding: 5px 11px;
    font-size: 11px;
  }
}

.i8-stamp {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border: 1px solid var(--i8-border);
  border-radius: 999px;
  background: var(--i8-inset);
  color: var(--i8-muted);
  font-size: 11px;

  svg {
    color: var(--i8-accent);
  }

  b {
    color: var(--i8-text);
    font-weight: 600;
  }
}

.i8-stats {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
}

.i8-stat {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 10px 12px;
  border: 1px solid var(--i8-border);
  border-radius: 16px;
  background: var(--i8-inset);

  &__label {
    display: flex;
    align-items: center;
    gap: 4px;
    color: var(--i8-muted);
    font-size: 11px;
    font-weight: 500;
  }

  &__value {
    display: flex;
    align-items: baseline;
    gap: 4px;
    color: var(--i8-text);
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.03em;
    line-height: 1.2;

    em {
      color: var(--i8-faint);
      font-size: 10px;
      font-style: normal;
      font-weight: 500;
      letter-spacing: 0;
    }
  }

  &--accent .i8-stat__value {
    color: var(--i8-accent);
  }

  &--danger .i8-stat__value {
    color: var(--i8-red);
  }
}

.i8-banner {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 11px 13px;
  border-radius: 16px;
  background: var(--i8-accent-soft-2);

  &__icon {
    display: grid;
    flex-shrink: 0;
    width: 25px;
    height: 25px;
    margin-top: 1px;
    border-radius: 50%;
    background: var(--i8-accent);
    color: var(--i8-accent-contrast);
    place-items: center;
  }

  &__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__title {
    color: var(--i8-text);
    font-size: 12px;
    font-weight: 700;
  }

  &__desc {
    color: var(--i8-muted);
    font-size: 11px;
    line-height: 1.5;
  }

  &--success {
    background: var(--i8-green-soft);

    .i8-banner__icon {
      background: var(--i8-green);
      color: #fff;
    }

    .i8-banner__title {
      color: var(--i8-green);
    }
  }

  &--error {
    background: var(--i8-red-soft);

    .i8-banner__icon {
      background: var(--i8-red);
      color: #fff;
    }

    .i8-banner__title {
      color: var(--i8-red);
    }
  }

  &--warning {
    background: var(--i8-amber-soft);

    .i8-banner__icon {
      background: var(--i8-amber);
      color: #fff;
    }

    .i8-banner__title {
      color: var(--i8-amber);
    }
  }
}

.i8-toolbar {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  &__meta {
    color: var(--i8-faint);
    font-size: 10px;
    white-space: nowrap;
  }
}

.i8-filters {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.i8-filter {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 11px;
  border: 0;
  border-radius: 999px;
  background: var(--i8-inset);
  color: var(--i8-muted);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.14s ease, color 0.14s ease;

  &:hover {
    color: var(--i8-text);
  }

  &.i8-filter--active {
    background: var(--b3-theme-primary);
    color: var(--b3-theme-on-primary);
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);

    .i8-filter__count {
      background: color-mix(in srgb, var(--b3-theme-on-primary) 22%, transparent);
      color: inherit;
    }
  }

  &__count {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 16px;
    padding: 0 5px;
    border-radius: 999px;
    background: var(--i8-hover);
    color: var(--i8-muted);
    font-size: 10px;
    font-weight: 700;

    &[data-tone='syncing'] {
      background: var(--i8-violet-soft);
      color: var(--i8-violet);
    }

    &[data-tone='done'] {
      background: var(--i8-green-soft);
      color: var(--i8-green);
    }

    &[data-tone='error'] {
      background: var(--i8-red-soft);
      color: var(--i8-red);
    }
  }
}

.i8-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  padding-bottom: 2px;
}

.i8-card {
  --state: var(--i8-accent);
  --state-soft: var(--i8-accent-soft);

  position: relative;
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-width: 0;
  padding: 12px 14px 10px;
  overflow: hidden;
  border: 1px solid var(--i8-border);
  border-radius: 18px;
  background: var(--i8-card);
  box-shadow: var(--i8-shadow);
  transition: border-color 0.16s ease, transform 0.16s ease;

  &::before {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 3px;
    background: var(--state);
    content: '';
  }

  &:hover {
    border-color: color-mix(in srgb, var(--state) 42%, var(--i8-border));
  }

  &[data-status='syncing'] {
    --state: var(--i8-violet);
    --state-soft: var(--i8-violet-soft);
  }

  &[data-status='done'] {
    --state: var(--i8-green);
    --state-soft: var(--i8-green-soft);
  }

  &[data-status='error'] {
    --state: var(--i8-red);
    --state-soft: var(--i8-red-soft);
  }

  &__top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  &__identity {
    display: flex;
    flex: 1;
    gap: 10px;
    min-width: 0;
  }

  &__icon {
    display: grid;
    flex-shrink: 0;
    width: 36px;
    height: 36px;
    border-radius: 12px;
    background: var(--state-soft);
    color: var(--state);
    place-items: center;
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__title-line {
    display: flex;
    align-items: center;
    gap: 6px;
    min-width: 0;
  }

  &__name {
    overflow: hidden;
    color: var(--i8-text);
    font-size: 14px;
    font-weight: 700;
    letter-spacing: -0.01em;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__format {
    flex-shrink: 0;
    padding: 0 6px;
    border-radius: 999px;
    background: var(--i8-inset);
    color: var(--i8-muted);
    font-size: 9px;
    font-weight: 700;
    line-height: 16px;
  }

  &__caption {
    overflow: hidden;
    color: var(--i8-faint);
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__message {
    overflow: hidden;
    padding: 5px 8px;
    border-radius: 10px;
    background: var(--i8-red-soft);
    color: var(--i8-red);
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &__note {
    padding: 4px 8px;
    border-radius: 999px;
    background: var(--i8-green-soft);
    color: var(--i8-green);
    font-size: 10px;
    font-weight: 500;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding-top: 8px;
    border-top: 1px solid var(--i8-border);
  }

  &__metrics {
    display: flex;
    gap: 9px;
    flex-wrap: wrap;
    color: var(--i8-faint);
    font-size: 10px;

    b {
      color: var(--i8-text);
      font-weight: 600;

      &.is-danger {
        color: var(--i8-red);
      }
    }
  }
}

.i8-status-pill {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: 1px solid var(--i8-border);
  border-radius: 999px;
  background: var(--i8-inset);
  color: var(--i8-muted);
  font-size: 10px;
  font-weight: 600;
  white-space: nowrap;

  &[data-status='syncing'] {
    border-color: transparent;
    background: var(--i8-violet-soft);
    color: var(--i8-violet);
  }

  &[data-status='done'] {
    border-color: transparent;
    background: var(--i8-green-soft);
    color: var(--i8-green);
  }

  &[data-status='error'] {
    border-color: transparent;
    background: var(--i8-red-soft);
    color: var(--i8-red);
  }
}

.i8-progress {
  height: 5px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--state-soft);

  &__bar {
    height: 100%;
    border-radius: inherit;
    background: var(--state);
    transition: width 0.3s ease;
  }
}

.i8-icon-btn {
  display: grid;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--i8-faint);
  cursor: pointer;
  place-items: center;
  transition: background 0.14s ease, color 0.14s ease;

  &:hover {
    background: var(--i8-hover);
    color: var(--i8-text);
  }

  &--tiny {
    width: 24px;
    height: 24px;
  }
}

.i8-empty {
  display: flex;
  grid-column: 1 / -1;
  flex-direction: column;
  align-items: center;
  gap: 7px;
  padding: 38px 18px;
  border: 1px dashed var(--i8-border);
  border-radius: 18px;
  color: var(--i8-muted);
  text-align: center;

  strong {
    color: var(--i8-text);
    font-size: 13px;
    font-weight: 600;
  }

  p {
    max-width: 440px;
    margin: 0;
    color: var(--i8-faint);
    font-size: 11px;
    line-height: 1.65;
  }

  &__icon {
    display: grid;
    width: 44px;
    height: 44px;
    margin-bottom: 2px;
    border-radius: 14px;
    background: var(--i8-accent-soft-2);
    color: var(--i8-accent);
    place-items: center;
  }

  &--compact {
    gap: 6px;
    padding: 26px 18px;
    color: var(--i8-faint);
  }
}

.i8-sync-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 24px;
  border-top: 1px solid var(--i8-border);
  background: var(--i8-card);
  background: color-mix(in srgb, var(--i8-card) 82%, transparent);
  backdrop-filter: blur(10px);
}

.i8-search {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  max-width: 420px;
  padding: 7px 12px;
  border: 1px solid var(--i8-border);
  border-radius: 999px;
  background: var(--i8-inset);
  color: var(--i8-faint);
  transition: background 0.14s ease, border-color 0.14s ease;

  &:focus-within {
    border-color: var(--i8-accent);
    background: var(--i8-card);
  }

  input {
    flex: 1;
    min-width: 0;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--i8-text);
    font-size: 12px;

    &::placeholder {
      color: var(--i8-faint);
    }
  }
}

.i8-footer-hint {
  color: var(--i8-faint);
  font-size: 10px;
  white-space: nowrap;
}

.i8-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;

  &--ok {
    background: var(--i8-green-soft);
    color: var(--i8-green);
  }

  &--warn {
    background: var(--i8-amber-soft);
    color: var(--i8-amber);
  }
}

.i8-service {
  flex-direction: row;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;

  &__mark {
    display: grid;
    flex-shrink: 0;
    width: 40px;
    height: 40px;
    border-radius: 14px;
    background: var(--i8-accent-soft);
    color: var(--i8-accent);
    place-items: center;
  }

  &__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  &__title-line {
    display: flex;
    align-items: center;
    gap: 7px;
    flex-wrap: wrap;
  }

  &__title {
    color: var(--i8-text);
    font-size: 14px;
    font-weight: 700;
  }

  &__desc {
    margin: 0;
    color: var(--i8-faint);
    font-size: 11px;
  }

  &__state {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border: 1px solid var(--i8-border);
    border-radius: 999px;
    background: var(--i8-inset);
    color: var(--i8-muted);
    font-size: 10px;
    white-space: nowrap;

    &.is-off {
      color: var(--i8-amber);
    }
  }

  &__dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--i8-green);
  }

  &__state.is-off &__dot {
    background: var(--i8-amber);
  }
}

.i8-panel {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--i8-border);
  border-radius: 20px;
  background: var(--i8-card);
  box-shadow: var(--i8-shadow);

  &__head {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  &__mark {
    display: grid;
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    background: var(--i8-inset);
    color: var(--i8-text);
    place-items: center;
  }

  &__heading {
    display: flex;
    flex: 1;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  &__title {
    color: var(--i8-text);
    font-size: 13px;
    font-weight: 600;
  }

  &__desc {
    color: var(--i8-faint);
    font-size: 10px;
  }
}

.i8-link {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  gap: 3px;
  color: var(--i8-accent);
  font-size: 10px;
  font-weight: 500;
  text-decoration: none;

  &:hover {
    text-decoration: underline;
  }
}

.i8-token {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px 8px 14px;
  border: 1px solid var(--i8-border);
  border-radius: 999px;
  background: var(--i8-inset);
  transition: background 0.14s ease, border-color 0.14s ease;

  &:focus-within {
    border-color: var(--i8-accent);
    background: var(--i8-card);
  }

  &__icon {
    flex-shrink: 0;
    color: var(--i8-muted);
  }

  input {
    flex: 1;
    min-width: 0;
    padding: 0;
    border: 0;
    outline: 0;
    background: transparent;
    color: var(--i8-text);
    font-family: var(--b3-font-family-code);
    font-size: 12px;
    letter-spacing: 0.02em;

    &::placeholder {
      color: var(--i8-faint);
      font-family: var(--b3-font-family);
      letter-spacing: 0;
    }
  }
}

.i8-help {
  display: flex;
  gap: 10px;
  padding: 11px 12px;
  border: 1px solid var(--i8-border);
  border-radius: 14px;
  background: var(--i8-inset);

  > svg {
    flex-shrink: 0;
    margin-top: 1px;
    color: var(--i8-accent);
  }

  &__title {
    margin-bottom: 2px;
    color: var(--i8-text);
    font-size: 11px;
    font-weight: 600;
  }

  &__text {
    margin: 0;
    color: var(--i8-muted);
    font-size: 10px;
    line-height: 1.65;
  }
}

.i8-settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  align-items: stretch;
}

.i8-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 11px;
  border: 1px solid var(--i8-border);
  border-radius: 14px;
  background: var(--i8-inset);

  &__main {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
  }

  &__icon {
    flex-shrink: 0;
    color: var(--i8-accent);
  }

  &__title {
    color: var(--i8-text);
    font-size: 11px;
    font-weight: 600;
  }

  &__desc {
    color: var(--i8-faint);
    font-size: 9px;
  }
}

.i8-seg {
  display: flex;
  flex-shrink: 0;
  gap: 2px;
  padding: 3px;
  border-radius: 999px;
  background: var(--i8-hover);

  button {
    padding: 3px 10px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--i8-muted);
    font-size: 10px;
    font-weight: 600;
    cursor: pointer;

    &.is-active {
      background: var(--b3-theme-primary);
      color: var(--b3-theme-on-primary);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.16);
    }
  }
}

.i8-select-wrap {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  color: var(--i8-muted);

  > svg {
    position: absolute;
    right: 6px;
    pointer-events: none;
  }
}

.i8-select {
  appearance: none;
  padding: 5px 24px 5px 10px;
  border: 0;
  outline: 0;
  border-radius: 999px;
  background: var(--i8-hover);
  color: var(--i8-text);
  font-size: 10px;
  font-weight: 600;
  cursor: pointer;
}

.i8-stepper {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 5px;
  padding: 3px;
  border-radius: 999px;
  background: var(--i8-hover);

  button {
    display: grid;
    width: 22px;
    height: 22px;
    padding: 0;
    border: 0;
    border-radius: 50%;
    background: var(--i8-card);
    color: var(--i8-text);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    cursor: pointer;
    place-items: center;

    &:disabled {
      opacity: 0.35;
      cursor: not-allowed;
    }
  }

  &__value {
    min-width: 30px;
    color: var(--i8-text);
    font-size: 12px;
    font-weight: 600;
    text-align: center;

    em {
      color: var(--i8-faint);
      font-size: 9px;
      font-style: normal;
      font-weight: 400;
    }
  }
}

.i8-path {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 9px 11px;
  border: 1px solid var(--i8-border);
  border-radius: 14px;
  background: var(--i8-inset);

  &__main {
    display: flex;
    align-items: center;
    gap: 9px;
    min-width: 0;
  }

  &__text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }

  code {
    overflow: hidden;
    color: var(--i8-text);
    font-family: var(--b3-font-family-code);
    font-size: 10px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.i8-chips {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.i8-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border: 1px solid var(--i8-border);
  border-radius: 999px;
  background: var(--i8-inset);
  color: var(--i8-muted);
  font-size: 9px;

  &--ok {
    border-color: transparent;
    background: var(--i8-green-soft);
    color: var(--i8-green);
  }
}

.i8-storage-note {
  margin: 0;
  color: var(--i8-faint);
  font-size: 10px;
  line-height: 1.6;
}

.i8-settings-footer {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 24px;
  border-top: 1px solid var(--i8-border);
  background: var(--i8-card);
  background: color-mix(in srgb, var(--i8-card) 82%, transparent);
  backdrop-filter: blur(10px);
}

.i8-settings-status {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  color: var(--i8-muted);
  font-size: 10px;

  svg {
    flex-shrink: 0;
    color: var(--i8-accent);
  }

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &.is-ok svg {
    color: var(--i8-green);
  }

  &.is-error svg {
    color: var(--i8-red);
  }
}

@media (max-width: 760px) {
  .i8-header {
    grid-template-columns: 1fr auto;
    height: auto;
    min-height: 62px;
    padding: 10px 14px;
  }

  .i8-brand__sub,
  .i8-header__aside {
    display: none;
  }

  .i8-tabs__btn {
    padding: 6px 10px;
    font-size: 12px;
  }

  .i8-scroll {
    padding: 14px;
  }

  .i8-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .i8-grid,
  .i8-settings-grid {
    grid-template-columns: 1fr;
  }

  .i8-sync-footer,
  .i8-settings-footer {
    padding: 10px 14px;
  }

  .i8-footer-hint {
    display: none;
  }

  .i8-service {
    flex-wrap: wrap;

    &__state {
      margin-left: 52px;
    }
  }
}

@media (max-width: 520px) {
  .i8-brand__chip {
    display: none;
  }

  .i8-tabs__btn {
    gap: 4px;
    padding: 6px 8px;
  }

  .i8-stamp {
    display: none;
  }
}
</style>
