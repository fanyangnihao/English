<template>
    <div class="relative h-full w-full bg-linear-to-br from-gray-800 to-gray-900">
        <canvas class="w-full h-full" ref="canvasRef"></canvas>
        <div class="absolute top-6 left-6">
            <div class="flex items-center gap-2">
                <div
                    class="w-10 h-10 bg-linear-to-br from-indigo-500 to-purple-600 rounded-[10px] flex items-center justify-center">
                    <span class="text-white font-bold text-xl">E</span>
                </div>
                <span class="text-white text-xl font-bold">English Learning</span>
            </div>
        </div>
        <!-- 登录/注册切换按钮 -->
        <div class="absolute top-6 right-6">
            <div class="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-lg p-1">
                <button @click="loadModel('login')" :class="loginClass">
                    登录
                </button>
                <button @click="loadModel('register')" :class="registerClass">
                    注册
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, onMounted, useTemplateRef } from 'vue'
import * as THREE from 'three'
import type { LoginType } from './type'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js' //gltf模型加载器
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js' //轨道控制器
const canvasRef = useTemplateRef<HTMLCanvasElement>('canvasRef') //获取canvas元素引用 渲染容器
const type = ref<LoginType>('login') // 登录/注册类型
const loginClass = computed(() => {
    return type.value === 'login' ? 'bg-indigo-500 text-white shadow-lg px-4 py-2 rounded-md text-sm font-medium transition-all' : 'text-white/70 hover:text-white hover:bg-white/10 px-4 py-2 rounded-md text-sm font-medium transition-all'
})
const registerClass = computed(() => {
    return type.value === 'register' ? 'bg-indigo-500 text-white shadow-lg px-4 py-2 rounded-md text-sm font-medium transition-all' : 'text-white/70 hover:text-white hover:bg-white/10 px-4 py-2 rounded-md text-sm font-medium transition-all'
})
const emits = defineEmits<{ changeType: [url: LoginType] }>()
const scene = new THREE.Scene() //创建场景
const timer = new THREE.Timer() //创建时钟
let currentModel: THREE.Group | null = null //记录当前的模型
let mixer: THREE.AnimationMixer | null = null //记录当前的动画混合器
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let resizeObserver: ResizeObserver | null = null
let animationFrame = 0
let loadVersion = 0
let disposed = false

const disposeObject = (target: THREE.Object3D) => {
    target.traverse((object) => {
        const mesh = object as THREE.Mesh
        mesh.geometry?.dispose()
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        materials.filter(Boolean).forEach((material) => material.dispose())
    })
}

const loadModel = (url: LoginType) => {
    const version = ++loadVersion
    //移除当前模型
    if (currentModel) {
        scene.remove(currentModel)
        disposeObject(currentModel)
        currentModel = null
    }
    mixer?.stopAllAction()
    mixer = null
    //加载新模型
    const loader = new GLTFLoader()
    type.value = url
    if (url === 'login') {
        loader.load('/models/login/scene.gltf', (gltf) => {
            if (disposed || version !== loadVersion) {
                disposeObject(gltf.scene)
                return
            }
            currentModel = gltf.scene
            scene.add(currentModel)
            scene.position.y = -0.8 //往下一点
            currentModel.scale.set(0.8, 0.8, 0.8)
        })
    }
    if (url === 'register') {
        loader.load('/models/register/scene.gltf', (gltf) => {
            if (disposed || version !== loadVersion) {
                disposeObject(gltf.scene)
                return
            }
            currentModel = gltf.scene
            scene.add(currentModel)
            scene.position.y = -0.8 //往下一点
            currentModel.scale.set(0.8, 0.8, 0.8)
            if(gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(currentModel)
                gltf.animations.forEach((animation) => {
                    const action = mixer!.clipAction(animation)
                    action.play()
                })
            }
        })
    }
    emits('changeType', url) // 通知父组件切换类型
}

const initThree = () => {
    const canvas = canvasRef.value
    if (!canvas) return
    const width = canvas.clientWidth //获取canvas宽度
    const height = canvas.clientHeight //获取canvas高度
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000) //创建相机
    camera.position.set(1, 0.5, 1) //设置相机位置
    renderer = new THREE.WebGLRenderer({
        canvas, //渲染容器
        antialias: true, //抗锯齿
        alpha: true, //透明背景
        precision: 'mediump',
        powerPreference: 'high-performance', //高性能
    })
    loadModel(type.value)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height, false) //设置渲染器大小
    renderer.render(scene, camera) //渲染场景
    controls = new OrbitControls(camera, renderer.domElement) //创建轨道控制器
    resizeObserver = new ResizeObserver(() => {
        if (!renderer || !canvas) return
        const nextWidth = canvas.clientWidth
        const nextHeight = canvas.clientHeight
        if (!nextWidth || !nextHeight) return
        camera.aspect = nextWidth / nextHeight
        camera.updateProjectionMatrix()
        renderer.setSize(nextWidth, nextHeight, false)
    })
    resizeObserver.observe(canvas)

    const animate = () => {
        if (disposed) return
        animationFrame = requestAnimationFrame(animate)
        if(mixer) {
            mixer.update(timer.getDelta())
        }
        scene.rotation.y += 0.002 //旋转场景
        controls!.update() //更新轨道控制器
        renderer!.render(scene, camera) //渲染场景
    }
    animate()
}

onMounted(() => {
    initThree()
})

onBeforeUnmount(() => {
    disposed = true
    loadVersion++
    cancelAnimationFrame(animationFrame)
    resizeObserver?.disconnect()
    controls?.dispose()
    mixer?.stopAllAction()
    if (currentModel) {
        scene.remove(currentModel)
        disposeObject(currentModel)
        currentModel = null
    }
    scene.clear()
    renderer?.dispose()
})
</script>
