<template>
  <div
    class="icon8-sync-app-host"
    style="display: none"
  />
</template>

<script setup lang="ts">
import { openSyncDialog } from '@/icons8/dialog'
import { usePlugin } from '@/main'

const plugin = usePlugin()

plugin.addTopBar({
  icon: 'iconImgDown',
  title: 'Icon8Sync',
  callback: () => {
    openSyncDialog(plugin, 'sync')
  },
})

window._sy_icon8sync = {
  openSetting: () => openSyncDialog(plugin, 'settings'),
}
</script>
