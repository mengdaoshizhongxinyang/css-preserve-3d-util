/*
 * @Author: mengdaoshizhongxinyang
 * @Date: 2021-04-02 14:19:28
 * @Description: 
 */
import { defineComponent, h, reactive } from "vue";
import style from "./app.module.css";
import DraggableResizable from "@/components/VueDraggableResizable";

export default defineComponent({
  setup(){
    const winStyle=reactive({
      rotateY:0,
      rotateX:0,
      rotateZ:0,
      translateZ:0
    })
    const backStyle=reactive({
      perspectiveOrigin:0,
      perspective:0
    })
    const dir={
      rotateX:"X轴旋转",
      rotateY:"Y轴旋转",
      rotateZ:"Z轴旋转",
      translateZ:"Z轴位置",
    }
    
    return ()=>h(
      <div class={style['main']}>
        <DraggableResizable >
          <div class={style['window']}>E</div>
        </DraggableResizable>
        {/* <DraggableResizable class={style['utils']} resizable={false} w={120}>
          {
            Object.keys(data).map(item=>{
              return <div>{dir[item as keyof typeof dir]}</div>
            })
          }
        </DraggableResizable> */}
      </div>
    )
  }
})