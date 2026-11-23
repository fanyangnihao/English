<template>
   <canvas ref="hologramRef" class="block aspect-[2/1] h-auto w-full max-w-[500px]"></canvas>
</template>


<script setup lang="ts">
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js' //gltf模型加载器
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js' //轨道控制器
//轨道控制器 模型他可以被退拽 缩放 旋转
import { useTemplateRef,onBeforeUnmount,onMounted } from 'vue'
const hologramRef = useTemplateRef<HTMLCanvasElement>('hologramRef')
let animationFrame = 0
let renderer: THREE.WebGLRenderer | null = null
let controls: OrbitControls | null = null
let resizeObserver: ResizeObserver | null = null
let scene: THREE.Scene | null = null
let disposed = false

const disposeScene = (target: THREE.Object3D) => {
    target.traverse((object) => {
        const mesh = object as THREE.Mesh
        mesh.geometry?.dispose()
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        materials.filter(Boolean).forEach((material) => material.dispose())
    })
}

const initThree = () => {
    const canvas = hologramRef.value
    if (!canvas) return

    //创建场景 -> 网格(几何 + 材质) + 相机 + 渲染器 + 灯光(可选的)
    //创建场景 -> 模型obj gltf ... + 相机 + 渲染器 + 灯光(可选的)
    scene = new THREE.Scene()
    //动画混合器
    let mixer: THREE.AnimationMixer | null = null
    const timer = new THREE.Timer() //创建时钟
    //创建相机
    const width = canvas.clientWidth || 500
    const height = canvas.clientHeight || 250
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000)
    camera.position.set(0, 0, 10)
    const loader = new GLTFLoader() //创建模型加载器

    loader.load('/models/hologram/scene.gltf', (gltf) => {
        if (disposed || !scene) {
            disposeScene(gltf.scene)
            return
        }
        scene.add(gltf.scene) //添加模型到场景
        gltf.scene.scale.set(4, 4, 4) //缩放模型
        if(gltf.animations && gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(gltf.scene)
            gltf.animations.forEach((clip) => {
                const action = mixer!.clipAction(clip)
                action.play()
            })
        }
    })
    //环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 1)
    scene.add(ambientLight)
    //平行光
    const directionalLight = new THREE.DirectionalLight(0xffffff, 2)
    directionalLight.position.set(5, 10, 7.5)
    scene.add(directionalLight)
    //创建渲染器
    renderer = new THREE.WebGLRenderer({
        canvas,
        antialias: true, //抗锯齿
        alpha: true, //透明背景
        precision: 'mediump', //移动端优先保证帧率
        powerPreference: 'high-performance', //高性能
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(width, height, false) //设置渲染器大小
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
        const delta = timer.getDelta() //1 - 2
        if(mixer) {
            mixer.update(delta) //更新动画混合器
        }
        scene!.rotation.y += 0.002 //旋转场景
        controls!.update() //更新轨道控制器
        renderer!.render(scene!, camera)
    }
    animate()
}
onMounted(()=>{
    initThree()
})

onBeforeUnmount(() => {
    disposed = true
    cancelAnimationFrame(animationFrame)
    resizeObserver?.disconnect()
    controls?.dispose()
    if (scene) {
        disposeScene(scene)
        scene.clear()
    }
    renderer?.dispose()
})
</script>
