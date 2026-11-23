<template>
    <div class="w-full rounded-[5px] border-gray-200 bg-purple-50 p-3 md:w-[256px] md:p-5">
        <div @click="changeActive(value)" :class="{'bg-purple-300': active === value.id}" class="rounded-[5px] p-2 transition-all duration-300" v-for="value in chatMode" :key="value.id">
            <div class="text-sm  cursor-pointer p-2 px-4 text-gray-700">
                {{ value.label }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import {ref,onMounted} from 'vue'
import type { ChatModeList, ChatMode } from '@en/common/chat';
import { getChatMode } from '@/apis/chat';
const emits = defineEmits(['onGetRole'])
const chatMode = ref<ChatModeList>([]) //消息模式列表
const active = ref<string | null>(null) //当前激活的id
//切换消息模式
const changeActive = (value:ChatMode) => {
    active.value = value.id
    emits('onGetRole', value.role) //派发role
}
//获取消息模式列表
const getChatModeList = async () => {
    const res = await getChatMode()
    chatMode.value = res.data
    const firstMode = res.data[0]
    if (!firstMode) return
    active.value = firstMode.id //默认选中第一个
    emits('onGetRole', firstMode.role) //派发role
}
onMounted(() => {
    getChatModeList()
})
</script>
