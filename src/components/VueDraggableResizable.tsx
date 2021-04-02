import { matchesSelectorToParentElements, addEvent, removeEvent } from './utils';
import { defineComponent, PropType, reactive, ref, computed, onBeforeMount, watch, onMounted, h, StyleHTMLAttributes, nextTick,ExtractDefaultPropTypes } from "vue";
import style from "./vueDraggableResizable.module.css"

const events = {
  mouse: {
    start: 'mousedown',
    move: 'mousemove',
    stop: 'mouseup'
  },
  touch: {
    start: 'touchstart',
    move: 'touchmove',
    stop: 'touchend'
  }
}

const userSelectNone = {
  userSelect: 'none',
  MozUserSelect: 'none',
  WebkitUserSelect: 'none',
  MsUserSelect: 'none'
}

const userSelectAuto = {
  userSelect: 'auto',
  MozUserSelect: 'auto',
  WebkitUserSelect: 'auto',
  MsUserSelect: 'auto'
}
let eventsFor = events.mouse

export default defineComponent({
  name: 'vue-draggable-resizable',
  props:{
    className: {
      type: String,
      default: 'vdr'
    },
    classNameDraggable: {
      type: String,
      default: 'draggable'
    },
    classNameResizable: {
      type: String,
      default: 'resizable'
    },
    classNameDragging: {
      type: String,
      default: 'dragging'
    },
    classNameResizing: {
      type: String,
      default: 'resizing'
    },
    classNameActive: {
      type: String,
      default: 'active'
    },
    classNameHandle: {
      type: String,
      default: 'handle'
    },
    disableUserSelect: {
      type: Boolean,
      default: true
    },
    enableNativeDrag: {
      type: Boolean,
      default: false
    },
    preventDeactivation: {
      type: Boolean,
      default: false
    },
    active: {
      type: Boolean,
      default: false
    },
    draggable: {
      type: Boolean,
      default: true
    },
    resizable: {
      type: Boolean,
      default: true
    },
    lockAspectRatio: {
      type: Boolean,
      default: false
    },
    w: {
      type: Number,
      default: 200,
      validator: (val: number) => val > 0
    },
    h: {
      type: Number,
      default: 200,
      validator: (val: number) => val > 0
    },
    minWidth: {
      type: Number,
      default: 0,
      validator: (val: number) => val >= 0
    },
    minHeight: {
      type: Number,
      default: 0,
      validator: (val: number) => val >= 0
    },
    maxWidth: {
      type: Number,
      default: null,
      validator: (val: number) => val >= 0
    },
    maxHeight: {
      type: Number,
      default: null,
      validator: (val: number) => val >= 0
    },
    x: {
      type: Number,
      default: 0,
      validator: (val:number) => typeof val === 'number'
    },
    y: {
      type: Number,
      default: 0,
      validator: (val:number) => typeof val === 'number'
    },
    z: {
      type: [String, Number],
      default: 'auto',
      validator: (val: string | number) => (typeof val === 'string' ? val === 'auto' : val >= 0)
    },
    handles: {
      type: Array as PropType<Array<string>>,
      default: () => ['tl', 'tm', 'tr', 'mr', 'br', 'bm', 'bl', 'ml'],
      validator: (val: Array<string>) => {
        const s = new Set(['tl', 'tm', 'tr', 'mr', 'br', 'bm', 'bl', 'ml'])
  
        return new Set(val.filter(h => s.has(h))).size === val.length
      }
    },
    dragHandle: {
      type: String,
      default: null
    },
    dragCancel: {
      type: String,
      default: null
    },
    axis: {
      type: String as PropType<'x' | 'y' | 'both'>,
      default: 'both',
      validator: (val: string) => ['x', 'y', 'both'].includes(val)
    },
    grid: {
      type: Array as unknown as PropType<[number,number]>,
      default: () => [1, 1]
    },
    parent: {
      type: Boolean,
      default: false
    },
    onDragStart: {
      type: Function,
      default: null
    },
    onResizeStart: {
      type: Function,
      default: null
    }
  },
  setup(props, { emit,slots }) {
    const data = reactive({
      rawWidth: Math.max(props.w,props.minWidth),
      rawHeight: Math.max(props.h,props.minHeight),
      rawLeft: props.x,
      rawTop: props.y,
      rawRight: null as null | number,
      rawBottom: null as null | number,

      left: props.x,
      top: props.y,
      right: null as null | number,
      bottom: null as null | number,

      aspectFactor: props.w / props.h,

      parentWidth: null as null | number,
      parentHeight: null as null | number,

      minW: props.minWidth,
      minH: props.minHeight,

      maxW: props.maxWidth,
      maxH: props.maxHeight,

      handle: null as null | string,
      enabled: props.active,
      resizing: false,
      dragging: false,
      zIndex: props.z,
      mouseClickPosition: {} as {
        mouseX?: number,
        mouseY?: number,
        left?: number,
        right?: number,
        top?: number,
        bottom?: number,
        x?: number,
        y?: number,
        w?: number,
        h?: number
      },
      bounds: {} as {
        minLeft: number | null,
        maxLeft: number | null,
        minRight: number | null,
        maxRight: number | null,
        minTop: number | null,
        maxTop: number | null,
        minBottom: number | null,
        maxBottom: number | null
      }
    })
    //#region computed
    const width = computed(() => {
      return (data.parentWidth || 0) - data.left - (data.right || 0)
    })
    const height = computed(() => {
      return (data.parentHeight || 0) - data.top - (data.bottom || 0)
    })
    const bodyStyle = computed(() => {
      return {
        position: 'absolute',
        top: data.top + 'px',
        left: data.left + 'px',
        width: width.value + 'px',
        height: height.value + 'px',
        zIndex: data.zIndex,
        ...(data.dragging && props.disableUserSelect ? userSelectNone : userSelectAuto)
      } as StyleHTMLAttributes
    })
    const actualHandles = computed(() => {
      if (!props.resizable) return []

      return props.handles
    })
    const resizingOnX = computed(() => {
      return (Boolean(data.handle) && (data.handle!.includes('l') || data.handle!.includes('r')))
    })
    const resizingOnY = computed(() => {
      return (Boolean(data.handle) && (data.handle!.includes('t') || data.handle!.includes('b')))
    })
    const isCornerHandle = computed(() => {
      return (Boolean(data.handle) && ['tl', 'tr', 'br', 'bl'].includes(data.handle!))
    })
    //#endregion

    //#region watch
    watch(() => props.active, (val) => {
      data.enabled = val

      if (val) {
        emit('activated')
      } else {
        emit('deactivated')
      }
    })
    watch(() => props.z, (val) => {
      if (val >= 0 || val === 'auto') {
        data.zIndex = val
      }
    })
    watch(() => data.rawLeft, (newLeft) => {
      const bounds = data.bounds
      const aspectFactor = data.aspectFactor
      const lockAspectRatio = props.lockAspectRatio
      const left = data.left
      const top = data.top

      if (bounds.minLeft !== null && newLeft < bounds.minLeft) {
        newLeft = bounds.minLeft
      } else if (bounds.maxLeft !== null && bounds.maxLeft < newLeft) {
        newLeft = bounds.maxLeft
      }

      if (lockAspectRatio && resizingOnX.value) {
        data.rawTop = top - (left - newLeft) / aspectFactor
      }

      data.left = newLeft
    })
    watch(() => data.rawRight, (newRight) => {
      const bounds = data.bounds
      const aspectFactor = data.aspectFactor
      const lockAspectRatio = props.lockAspectRatio
      const right = data.right!
      const bottom = data.bottom!

      if (bounds.minRight !== null && newRight! < bounds.minRight) {
        newRight = bounds.minRight
      } else if (bounds.maxRight !== null && bounds.maxRight < newRight!) {
        newRight = bounds.maxRight
      }

      if (lockAspectRatio && resizingOnX.value) {
        data.rawBottom = bottom - (right - newRight!) / aspectFactor
      }

      data.right = newRight
    })
    watch(() => data.rawTop, (newTop) => {
      const bounds = data.bounds
      const aspectFactor = data.aspectFactor
      const lockAspectRatio = props.lockAspectRatio
      const left = data.left
      const top = data.top

      if (bounds.minTop !== null && newTop < bounds.minTop) {
        newTop = bounds.minTop
      } else if (bounds.maxTop !== null && bounds.maxTop < newTop) {
        newTop = bounds.maxTop
      }

      if (lockAspectRatio && resizingOnY.value) {
        data.rawLeft = left - (top - newTop) * aspectFactor
      }

      data.top = newTop
    })
    watch(() => data.rawBottom, (newBottom) => {
      const bounds = data.bounds
      const aspectFactor = data.aspectFactor
      const lockAspectRatio = props.lockAspectRatio
      const right = data.right
      const bottom = data.bottom

      if (bounds.minBottom !== null && newBottom! < bounds.minBottom) {
        newBottom = bounds.minBottom
      } else if (bounds.maxBottom !== null && bounds.maxBottom < newBottom!) {
        newBottom = bounds.maxBottom
      }

      if (lockAspectRatio && resizingOnY.value) {
        data.rawRight = right! - (bottom! - newBottom!) * aspectFactor
      }

      data.bottom = newBottom
    })
    watch(() => props.x, () => {
      if (data.resizing || data.dragging) {
        return
      }
      if (props.parent) {
        data.bounds = calcDragLimits()
      }

      const delta = props.x - data.left

      if (delta % props.grid[0] === 0) {
        data.rawLeft = props.x
        data.rawRight = data.right! - delta
      }
    })
    watch(() => props.y, () => {
      if (data.resizing || data.dragging) {
        return
      }

      if (props.parent) {
        data.bounds = calcDragLimits()
      }

      const delta = props.y - data.top

      if (delta % props.grid[1] === 0) {
        data.rawTop = props.y
        data.rawBottom = data.bottom! - delta
      }
    })
    watch(() => props.lockAspectRatio, (val) => {
      if (val) {
        data.aspectFactor = width.value / height.value
      } else {
        data.aspectFactor = 0
      }
    })
    watch(() => props.minWidth, (val) => {
      if (val > 0 && val <= width.value) {
        data.minW = val
      }
    })
    watch(() => props.minHeight, (val) => {
      if (val > 0 && val <= height.value) {
        data.minH = val
      }
    })
    watch(() => props.maxWidth, (val) => {
      data.maxW = val
    })
    watch(() => props.maxHeight, (val) => {
      data.maxH = val
    })
    watch(() => props.w, () => {
      if (data.resizing || data.dragging) {
        return
      }

      if (props.parent) {
        data.bounds = calcResizeLimits()
      }

      const delta = width.value - props.w

      if (delta % props.grid[0] === 0) {
        data.rawRight = data.right! + delta
      }
    })
    watch(() => props.h, () => {
      if (data.resizing || data.dragging) {
        return
      }

      if (props.parent) {
        data.bounds = calcResizeLimits()
      }

      const delta = height.value - props.h

      if (delta % props.grid[1] === 0) {
        data.rawBottom = data.bottom! + delta
      }
    })
    //#endregion
    
    let root = ref<HTMLBaseElement>()
    let el=root.value!
    // let el=getCurrentInstance()?.root
    //#region methods
    const resetBoundsAndMouseState = () => {
      data.mouseClickPosition = { mouseX: 0, mouseY: 0, x: 0, y: 0, w: 0, h: 0 }

      data.bounds = {
        minLeft: null,
        maxLeft: null,
        minRight: null,
        maxRight: null,
        minTop: null,
        maxTop: null,
        minBottom: null,
        maxBottom: null
      }
    }
    const checkParentSize = () => {
      if (props.parent) {
        const [newParentWidth, newParentHeight] = getParentSize()

        const deltaX = data.parentWidth! - newParentWidth!
        const deltaY = data.parentHeight! - newParentHeight!

        data.rawRight! -= deltaX
        data.rawBottom! -= deltaY

        data.parentWidth = newParentWidth
        data.parentHeight = newParentHeight
      }
    }
    const getParentSize = () => {
      if (props.parent) {
        const style = window.getComputedStyle(el.parentNode! as Element, null)

        return [
          parseInt(style.getPropertyValue('width'), 10),
          parseInt(style.getPropertyValue('height'), 10)
        ]
      }

      return [null, null]
    }
    const elementTouchDown = (e: MouseEvent) => {
      eventsFor = events.touch

      elementDown(e)
    }
    const elementDown = (e: MouseEvent) => {
      const target = e.target || e.srcElement
      if (!data.enabled) {
        data.enabled = true

        emit('activated')
        emit('update:active', true)
      }
      if (el.contains(target as Node)) {
        if (props.onDragStart && props.onDragStart(e) === false) {
          return
        }

        if (
          (props.dragHandle && !matchesSelectorToParentElements(target as Node, props.dragHandle, el)) ||
          (props.dragCancel && matchesSelectorToParentElements(target as Node, props.dragCancel, el))
        ) {
          return
        }


        if (props.draggable) {
          data.dragging = true
        }

        data.mouseClickPosition.mouseX = e.pageX
        data.mouseClickPosition.mouseY = e.pageY

        data.mouseClickPosition.left = data.left
        data.mouseClickPosition.right = data.right!
        data.mouseClickPosition.top = data.top
        data.mouseClickPosition.bottom = data.bottom!

        if (props.parent) {
          data.bounds = calcDragLimits()
        }

        addEvent(document.documentElement, eventsFor.move, move)
        addEvent(document.documentElement, eventsFor.stop, handleUp)
      }
    }
    const calcDragLimits = () => {
      return {
        minLeft: (data.parentWidth! + data.left) % props.grid[0],
        maxLeft: Math.floor((data.parentWidth! - width.value - data.left) / props.grid[0]) * props.grid[0] + data.left,
        minRight: (data.parentWidth! + data.right!) % props.grid[0],
        maxRight: Math.floor((data.parentWidth! - width.value - data.right!) / props.grid[0]) * props.grid[0] + data.right!,
        minTop: (data.parentHeight! + data.top) % props.grid[1],
        maxTop: Math.floor((data.parentHeight! - height.value - data.top) / props.grid[1]) * props.grid[1] + data.top,
        minBottom: (data.parentHeight! + data.bottom!) % props.grid[1],
        maxBottom: Math.floor((data.parentHeight! - height.value - data.bottom!) / props.grid[1]) * props.grid[1] + data.bottom!
      }
    }
    const deselect = (e: MouseEvent) => {
      const target = e.target as HTMLBaseElement

      const regex = new RegExp(props.className + '-([trmbl]{2})', '')

      if (!el.contains(target) && !regex.test(target.className)) {
        if (data.enabled && !props.preventDeactivation) {
          data.enabled = false

          emit('deactivated')
          emit('update:active', false)
        }

        removeEvent(document.documentElement, eventsFor.move, handleMove)
      }

      resetBoundsAndMouseState()
    }
    const handleTouchDown = (handle: string, e: MouseEvent) => {
      eventsFor = events.touch

      handleDown(handle, e)
    }
    const handleDown = (handle: string, e: MouseEvent) => {
      if (props.onResizeStart && props.onResizeStart(handle, e) === false) {
        return
      }

      if (e.stopPropagation) e.stopPropagation()


      if (props.lockAspectRatio && !handle.includes('m')) {
        data.handle = 'm' + handle.substring(1)
      } else {
        data.handle = handle
      }

      data.resizing = true

      data.mouseClickPosition.mouseX = e.pageX
      data.mouseClickPosition.mouseY = e.pageY
      data.mouseClickPosition.left = data.left
      data.mouseClickPosition.right = data.right!
      data.mouseClickPosition.top = data.top
      data.mouseClickPosition.bottom = data.bottom!

      data.bounds = calcResizeLimits()

      addEvent(document.documentElement, eventsFor.move, handleMove)
      addEvent(document.documentElement, eventsFor.stop, handleUp)
    }
    const calcResizeLimits = () => {
      let minW = data.minW
      let minH = data.minH
      let maxW = data.maxW
      let maxH = data.maxH

      const aspectFactor = data.aspectFactor
      const [gridX, gridY] = props.grid
      // const useWidth = width.value
      // const useHeight = height.value
      const left = data.left
      const top = data.top
      const right = data.right!
      const bottom = data.bottom!

      if (props.lockAspectRatio) {
        if (minW / minH > aspectFactor) {
          minH = minW / aspectFactor
        } else {
          minW = aspectFactor * minH
        }

        if (maxW && maxH) {
          maxW = Math.min(maxW, aspectFactor * maxH)
          maxH = Math.min(maxH, maxW / aspectFactor)
        } else if (maxW) {
          maxH = maxW / aspectFactor
        } else if (maxH) {
          maxW = aspectFactor * maxH
        }
      }

      maxW = maxW - (maxW % gridX)
      maxH = maxH - (maxH % gridY)

      const limits = {
        minLeft: null as number | null,
        maxLeft: null as number | null,
        minTop: null as number | null,
        maxTop: null as number | null,
        minRight: null as number | null,
        maxRight: null as number | null,
        minBottom: null as number | null,
        maxBottom: null as number | null
      }

      if (props.parent) {
        limits.minLeft = (data.parentWidth! + left) % gridX
        limits.maxLeft = left + Math.floor((width.value - minW) / gridX) * gridX
        limits.minTop = (data.parentHeight! + top) % gridY
        limits.maxTop = top + Math.floor((height.value - minH) / gridY) * gridY
        limits.minRight = (data.parentWidth! + right) % gridX
        limits.maxRight = right + Math.floor((width.value - minW) / gridX) * gridX
        limits.minBottom = (data.parentHeight! + bottom) % gridY
        limits.maxBottom = bottom + Math.floor((height.value - minH) / gridY) * gridY

        if (maxW) {
          limits.minLeft = Math.max(limits.minLeft, data.parentWidth! - right - maxW)
          limits.minRight = Math.max(limits.minRight, data.parentWidth! - left - maxW)
        }

        if (maxH) {
          limits.minTop = Math.max(limits.minTop, data.parentHeight! - bottom - maxH)
          limits.minBottom = Math.max(limits.minBottom, data.parentHeight! - top - maxH)
        }

        if (props.lockAspectRatio) {
          limits.minLeft = Math.max(limits.minLeft, left - top * aspectFactor)
          limits.minTop = Math.max(limits.minTop, top - left / aspectFactor)
          limits.minRight = Math.max(limits.minRight, right - bottom * aspectFactor)
          limits.minBottom = Math.max(limits.minBottom, bottom - right / aspectFactor)
        }
      } else {
        limits.minLeft = null
        limits.maxLeft = left + Math.floor((width.value - minW) / gridX) * gridX
        limits.minTop = null
        limits.maxTop = top + Math.floor((height.value - minH) / gridY) * gridY
        limits.minRight = null
        limits.maxRight = right + Math.floor((width.value - minW) / gridX) * gridX
        limits.minBottom = null
        limits.maxBottom = bottom + Math.floor((height.value - minH) / gridY) * gridY

        if (maxW) {
          limits.minLeft = -(right + maxW)
          limits.minRight = -(left + maxW)
        }

        if (maxH) {
          limits.minTop = -(bottom + maxH)
          limits.minBottom = -(top + maxH)
        }

        if (props.lockAspectRatio && (maxW && maxH)) {
          limits.minLeft = Math.min(limits.minLeft!, -(right + maxW))
          limits.minTop = Math.min(limits.minTop!, -(maxH + bottom))
          limits.minRight = Math.min(limits.minRight!, -left - maxW)
          limits.minBottom = Math.min(limits.minBottom!, -top - maxH)
        }
      }

      return limits
    }
    const move = (e: MouseEvent) => {
      if (data.resizing) {
        handleMove(e)
      } else if (data.dragging) {
        elementMove(e)
      }
    }
    const elementMove = (e: MouseEvent) => {
      const axis = props.axis
      const grid = props.grid
      const mouseClickPosition = data.mouseClickPosition

      const tmpDeltaX = axis && axis !== 'y' ? mouseClickPosition.mouseX! - e.pageX : 0
      const tmpDeltaY = axis && axis !== 'x' ? mouseClickPosition.mouseY! - e.pageY : 0

      const [deltaX, deltaY] = snapToGrid(props.grid, tmpDeltaX, tmpDeltaY)

      if (!deltaX && !deltaY) return

      data.rawTop = mouseClickPosition.top! - deltaY
      data.rawBottom = mouseClickPosition.bottom! + deltaY
      data.rawLeft = mouseClickPosition.left! - deltaX
      data.rawRight = mouseClickPosition.right! + deltaX

      emit('dragging', data.left, data.top)
    }
    const handleMove = (e: MouseEvent) => {
      const handle = data.handle
      const mouseClickPosition = data.mouseClickPosition

      const tmpDeltaX = mouseClickPosition.mouseX! - e.pageX
      const tmpDeltaY = mouseClickPosition.mouseY! - e.pageY

      const [deltaX, deltaY] = snapToGrid(props.grid, tmpDeltaX, tmpDeltaY)

      if (!deltaX && !deltaY) return
      if (handle!.includes('b')) {
        data.rawBottom = mouseClickPosition.bottom! + deltaY
      } else if (handle!.includes('t')) {
        data.rawTop = mouseClickPosition.top! - deltaY
      }

      if (handle!.includes('r')) {
        data.rawRight = mouseClickPosition.right! + deltaX
      } else if (handle!.includes('l')) {
        data.rawLeft = mouseClickPosition.left! - deltaX
      }

      emit('resizing', data.left, data.top, width.value, height.value)
    }
    /**
     * 按键抬起
     * 停止拖动和停止缩放事件参数
     * @param e:鼠标
     */
    const handleUp = (e: MouseEvent) => {
      data.handle = null

      resetBoundsAndMouseState()

      data.rawTop = data.top
      data.rawBottom = data.bottom
      data.rawLeft = data.left
      data.rawRight = data.right

      if (data.resizing) {
        data.resizing = false
        emit('resizestop', data.left, data.top, width.value, height.value)
      }
      if (data.dragging) {
        data.dragging = false
        emit('dragstop', data.left, data.top)
      }

      removeEvent(document.documentElement, eventsFor.move, handleMove)
    }
    const snapToGrid = (grid: [number, number], pendingX: number, pendingY: number) => {
      const x = Math.round(pendingX / grid[0]) * grid[0]
      const y = Math.round(pendingY / grid[1]) * grid[1]

      return [x, y]
    }
    //#endregion
    onBeforeMount(() => {
      removeEvent(document.documentElement, 'mousedown', deselect)
      removeEvent(document.documentElement, 'mousemove', move)
      removeEvent(document.documentElement, 'touchmove', move)
      removeEvent(document.documentElement, 'mouseup', handleUp)
      removeEvent(document.documentElement, 'touchend touchcancel', deselect)

      removeEvent(window, 'resize', checkParentSize)
    })

    onMounted(() => {
      nextTick(()=>{

        
        el=root.value!
        if (!props.enableNativeDrag) {
            root.value!.ondragstart = () => false
        }

        [data.parentWidth, data.parentHeight] = getParentSize()

        data.rawRight = data.parentWidth! - data.rawWidth - data.rawLeft
        data.rawBottom = data.parentHeight! - data.rawHeight - data.rawTop

        addEvent(document.documentElement, 'mousedown', deselect)
        addEvent(document.documentElement, 'touchend touchcancel', deselect)

        addEvent(window, 'resize', checkParentSize)

      })
    })
    resetBoundsAndMouseState()
    return () => h(
      <div
        style={bodyStyle.value}
        class={[{
          [props.classNameActive]: data.enabled,
          [props.classNameDragging]: data.dragging,
          [props.classNameResizing]: data.resizing,
          [props.classNameDraggable]: props.draggable,
          [props.classNameResizable]: props.resizable
        }, props.className]}
        onMousedown={elementDown}
        ref={root}
      >
        {
          actualHandles.value.map(item=>{
            return (
              <div
                key={item}
                class={`${style[props.classNameHandle as unknown as keyof typeof style]} ${style[(props.classNameHandle + '-' + item)as unknown as keyof typeof style]}`}
                style={{display:data.enabled?"block":"none",}}
                onMousedown={(e)=>{
                  e.stopPropagation();
                  e.preventDefault();
                  handleDown(item,e)
                }}
              >
                {
                  slots[item]?slots[item]!():null
                }
              </div>
            )
          })
        }
        {
          slots['default']?slots['default']():null
        }
        {/* <slot></slot> */}
      </div>
    )
  },
  emits:{
    resizing:(x:number,y:number,w:number,h:number)=>{return true},
    resizestop:(x:number,y:number,w:number,h:number)=>{return true},
    dragging:(w:number,h:number)=>{return true},
    dragstop:(w:number,h:number)=>{return true},
    deactivated:()=>{return true},
    activated:()=>{return true},
    'update:active':(val:boolean)=>{return true}
  }
})