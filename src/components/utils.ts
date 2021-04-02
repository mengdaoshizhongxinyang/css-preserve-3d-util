/*
 * @Author: mengdaoshizhongxinyang
 * @Date: 2020-12-29 11:06:39
 * @Description: 
 * @GitHub: https://github.com/mengdaoshizhongxinyang
 */
export function isFunction (func:any) {
  return (typeof func === 'function' || Object.prototype.toString.call(func) === '[object Function]')
}


export function matchesSelectorToParentElements (el:Node , selector:string, baseNode:HTMLBaseElement) {
  let node:Node|ParentNode|null = el
  const matchesSelectorFunc = [
    'matches',
    'webkitMatchesSelector',
    'mozMatchesSelector',
    'msMatchesSelector',
    'oMatchesSelector'
  ].find(func => isFunction(node![func as keyof typeof node]))
  let a=node[matchesSelectorFunc as keyof typeof node]
  if (!isFunction(node[matchesSelectorFunc as keyof typeof node])) return false

  do {
    if ((node[matchesSelectorFunc as keyof typeof node] as Function)(selector)) return true
    if (node === baseNode) return false
    node = (node as Node).parentNode 
  } while (node)

  return false
}

export function addEvent (el:HTMLBaseElement|any, event:string, handler:Function) {
  if (!el) {
    return
  }
  if (el.attachEvent) {
    el.attachEvent('on' + event, handler)
  } else if (el.addEventListener) {
    el.addEventListener(event, handler, true)
  } else {
    el['on' + event] = handler
  }
}

export function removeEvent (el:HTMLBaseElement|any, event:string, handler:Function) {
  if (!el) {
    return
  }
  if (el.detachEvent) {
    el.detachEvent('on' + event, handler)
  } else if (el.removeEventListener) {
    el.removeEventListener(event, handler, true)
  } else {
    el['on' + event] = null
  }
}
