<template>
  <el-config-provider :locale="zhCn">
    <RouterView />
    <Search />
    <Login v-if="isShowLogin" />
  </el-config-provider>
</template>

<script setup lang="ts">
import { defineAsyncComponent, provide, ref, watch } from 'vue'
import { RouterView } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'
import Search from './components/Search/index.vue'
import { IS_SHOW_LOGIN } from './components/Login/type'
import { useSocket } from './hooks/useSocket'
import { Tracker } from '@en/tracker'
import { useUserStore } from './stores/user'

const Login = defineAsyncComponent(() => import('./components/Login/index.vue'))
const isShowLogin = ref(false)
provide(IS_SHOW_LOGIN, isShowLogin)

const tracker = new Tracker({
    baseUrl: '/api/v1',
    uv: {
        api: '/tracker/uv',
        updateApi: '/tracker/update-uv'
    },
    pv: {
        api: '/tracker/pv'
    },
    event: {
        api: '/tracker/event'
    },
    error: {
        api: '/tracker/error'
    },
    performance: {
        api: '/tracker/performance'
    }
})

const userStore = useUserStore()
const { connect, disconnect } = useSocket()
watch(() => userStore.user?.id, (newVal) => {
  if (newVal) {
    tracker.setUserId(newVal)
    connect();
  } else {
    disconnect();
  }
}, { immediate: true })
</script>
