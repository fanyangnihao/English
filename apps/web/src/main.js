import '@/assets/base.css'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import router from './router'
import {
  ElAvatar,
  ElButton,
  ElCard,
  ElCheckbox,
  ElCol,
  ElConfigProvider,
  ElCountdown,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElPagination,
  ElPopover,
  ElRow,
  ElSkeleton,
  ElSwitch,
  ElTabPane,
  ElTabs,
  ElTag,
  ElTimePicker,
  ElUpload,
} from 'element-plus'
import 'element-plus/dist/index.css'
import piniaPluginPersistedstate from 'pinia-plugin-persistedstate'
import focusPlugin from './directives/focus'

const app = createApp(App) // 创建 App 实例
const pinia = createPinia() // 创建 Pinia 实例
pinia.use(piniaPluginPersistedstate) // 使用 Pinia 持久化状态
app.use(pinia) // 使用 Pinia
const elementComponents = [
  ElAvatar,
  ElButton,
  ElCard,
  ElCheckbox,
  ElCol,
  ElConfigProvider,
  ElCountdown,
  ElEmpty,
  ElForm,
  ElFormItem,
  ElIcon,
  ElInput,
  ElPagination,
  ElPopover,
  ElRow,
  ElSkeleton,
  ElSwitch,
  ElTabPane,
  ElTabs,
  ElTag,
  ElTimePicker,
  ElUpload,
]
elementComponents.forEach((component) => app.use(component))
app.use(router) // 使用 Router
app.use(focusPlugin) // 使用 focus 指令
app.mount('#app')
