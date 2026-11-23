<template>
    <div v-if="isShowLogin" class="fixed inset-0 bg-black opacity-30 filter blur-sm z-40"></div>
    <Transition name="fade">
        <div v-if="isShowLogin" class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto p-3 sm:p-6"
            role="dialog" aria-modal="true" aria-label="登录或注册" @click.self="isShowLogin = false">
            <div class="relative flex min-h-0 w-full max-w-[1180px] flex-col overflow-hidden rounded-[16px] bg-white shadow-2xl md:h-[min(700px,calc(100dvh-3rem))] md:flex-row md:rounded-[20px]">
                <button type="button" aria-label="关闭登录框" @click="isShowLogin = false"
                    class="absolute right-4 top-4 z-20 grid size-9 cursor-pointer place-items-center rounded-full bg-white/90 text-xl text-gray-500 shadow-sm transition-colors hover:text-gray-900">
                    ×
                </button>
                <!-- 左侧 3D 模型区域 -->
                <ModelViewer v-if="showModel" class="md:w-[48%] lg:w-[52%]" @changeType="changeType" />

                <!-- 右侧登录表单区域 -->
                <div class="flex min-w-0 flex-1 flex-col justify-center overflow-y-auto bg-white p-6 sm:p-10">
                    <div class="mb-6 flex gap-2 md:hidden">
                        <button type="button" :class="tabClass('login')" @click="changeType('login')">登录</button>
                        <button type="button" :class="tabClass('register')" @click="changeType('register')">注册</button>
                    </div>
                    <LoginForm v-if="loginType === 'login'" />
                    <RegisterForm v-if="loginType === 'register'" />
                    <div class="mt-6 text-center">
                        <div class="flex items-center justify-center gap-4 text-sm text-gray-500">
                            <span class="cursor-pointer hover:text-indigo-600 transition-colors">忘记密码？</span>
                            <span class="text-gray-300">|</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </Transition>
</template>

<script setup lang="ts">
import ModelViewer from './ModelViewer.vue'
import LoginForm from './LoginForm.vue'
import RegisterForm from './RegisterForm.vue'
import { ref, inject, onBeforeUnmount, onMounted } from 'vue'
import { IS_SHOW_LOGIN } from './type'
import type { LoginType } from './type'
const isShowLogin = inject(IS_SHOW_LOGIN, ref(false))
const loginType = ref<LoginType>('login')
const desktopQuery = window.matchMedia('(min-width: 768px)')
const showModel = ref(desktopQuery.matches)
//1. pinia
//2. event bus
//3. provide/inject
const changeType = (url: LoginType) => {
    loginType.value = url
}
const tabClass = (type: LoginType) => [
    'flex-1 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
    loginType.value === type
        ? 'bg-indigo-600 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
]
const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
        isShowLogin.value = false
    }
}
const handleViewportChange = (event: MediaQueryListEvent) => {
    showModel.value = event.matches
}

onMounted(() => {
    window.addEventListener('keydown', handleKeydown)
    desktopQuery.addEventListener('change', handleViewportChange)
})
onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown)
    desktopQuery.removeEventListener('change', handleViewportChange)
})
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.3s ease;
}
.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>
