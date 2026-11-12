/**
 * 思源明暗主题跟随
 *
 * 思源把主题模式挂在 <html data-theme-mode="dark"> 上,但不同版本字段不一致,
 * 这里同时兼容 attribute 与 window.siyuan.config.appearance.mode,
 * 并通过 MutationObserver + 低频兜底轮询保证窗口打开期间切换即时生效。
 */

const DARK_CLASS = 'tr2-dark'

/** 读取当前是否暗色(attribute 优先,其次内核配置) */
function isDark(): boolean {
  const attr = document.documentElement.getAttribute('data-theme-mode')
  if (attr) {
    return attr === 'dark'
  }
  const mode = (window as any)?.siyuan?.config?.appearance?.mode
  return mode === 1
}

/** 把当前主题同步为 html 上的 .tr2-dark 类,供 design.scss 覆盖令牌 */
export function applySiyuanTheme(): void {
  document.documentElement.classList.toggle(DARK_CLASS, isDark())
}

/** 开始监听主题变化,返回清理函数 */
export function watchSiyuanTheme(): () => void {
  applySiyuanTheme()
  const observer = new MutationObserver(() => applySiyuanTheme())
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme-mode', 'data-dark-theme'],
  })
  // 兜底:某些版本切换主题时不改 html 属性,只更新内核配置
  const timer = window.setInterval(applySiyuanTheme, 2000)
  return () => {
    observer.disconnect()
    window.clearInterval(timer)
  }
}
