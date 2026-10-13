'use client'

import { useEffect, useRef, useState } from 'react'

// 图文编辑器工具栏：清除格式、格式刷、字号、粗体、斜体、下划线、删除线、
// 字体颜色、背景色、对齐、首行缩进、列表、小标题/正文、插入图片
// 所有按钮在按下时不抢走编辑框里的选区（onMouseDown preventDefault）

type Props = {
  editor: React.RefObject<HTMLDivElement | null>
  onChange: () => void
  onInsertImage: () => void
}

type Painted = { fontWeight: string; fontStyle: string; textDecoration: string; color: string; backgroundColor: string; fontSize: string }

const SIZES = [12, 14, 15, 16, 17, 18, 20, 24, 28, 32]
const COLORS = [
  '#000000', '#3f3f3f', '#7f7f7f', '#bfbfbf', '#ffffff',
  '#c00000', '#e53935', '#ff6d00', '#ffb300', '#fdd835',
  '#2e7d32', '#43a047', '#00897b', '#2b7d8b', '#1e88e5',
  '#1a237e', '#5e35b1', '#8e24aa', '#d81b60', '#6d4c41',
]
const BG_COLORS = ['transparent', '#fff59d', '#ffe0b2', '#ffcdd2', '#c8e6c9', '#b3e5fc', '#d1c4e9', '#f5f5f5', '#212121', '#2b7d8b']

export default function EditorToolbar({ editor, onChange, onInsertImage }: Props) {
  const [menu, setMenu] = useState<'' | 'size' | 'color' | 'bg' | 'align' | 'list'>('')
  const [painter, setPainter] = useState<Painted | null>(null)
  const [curSize, setCurSize] = useState('17px')
  const saved = useRef<Range | null>(null)

  // 记住编辑框里的选区，点菜单时不丢失
  useEffect(() => {
    function onSel() {
      const sel = window.getSelection()
      if (!sel || sel.rangeCount === 0) return
      const r = sel.getRangeAt(0)
      if (editor.current?.contains(r.commonAncestorContainer)) {
        saved.current = r.cloneRange()
        const el = r.startContainer.nodeType === 1 ? (r.startContainer as Element) : r.startContainer.parentElement
        if (el) setCurSize(`${Math.round(parseFloat(getComputedStyle(el).fontSize))}px`)
      }
    }
    document.addEventListener('selectionchange', onSel)
    return () => document.removeEventListener('selectionchange', onSel)
  }, [editor])

  // 格式刷：选中新文字后自动套用
  useEffect(() => {
    const el = editor.current
    if (!el || !painter) return
    function onUp() {
      const sel = window.getSelection()
      if (!sel || sel.isCollapsed) return
      applyStyle(painter!)
      setPainter(null)
    }
    el.addEventListener('mouseup', onUp)
    el.addEventListener('touchend', onUp)
    return () => {
      el.removeEventListener('mouseup', onUp)
      el.removeEventListener('touchend', onUp)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [painter, editor])

  function restore() {
    editor.current?.focus()
    const r = saved.current
    if (!r) return
    const sel = window.getSelection()
    sel?.removeAllRanges()
    sel?.addRange(r)
  }

  function exec(name: string, value?: string) {
    restore()
    document.execCommand('styleWithCSS', false, 'true')
    document.execCommand(name, false, value)
    setMenu('')
    onChange()
  }

  // 给选中的文字套一层 <span style=...>：借用 fontSize=7 做标记，再换成我们要的样式
  function applyStyle(style: Partial<Painted>) {
    restore()
    const root = editor.current
    if (!root) return
    const sel = window.getSelection()
    if (!sel || sel.isCollapsed) return
    document.execCommand('styleWithCSS', false, 'false')
    document.execCommand('fontSize', false, '7')
    root.querySelectorAll('font[size="7"]').forEach((f) => {
      const span = document.createElement('span')
      Object.assign(span.style, style)
      while (f.firstChild) span.appendChild(f.firstChild)
      // 里面原来带的字号会盖住新字号，去掉
      if (style.fontSize) span.querySelectorAll<HTMLElement>('[style]').forEach((n) => n.style.removeProperty('font-size'))
      f.replaceWith(span)
    })
    setMenu('')
    onChange()
  }

  function startPainter() {
    restore()
    const sel = window.getSelection()
    const node = sel?.anchorNode
    const el = node ? (node.nodeType === 1 ? (node as Element) : node.parentElement) : null
    if (!el || !editor.current?.contains(el)) return
    const cs = getComputedStyle(el)
    setPainter({
      fontWeight: cs.fontWeight,
      fontStyle: cs.fontStyle,
      textDecoration: cs.textDecorationLine === 'none' ? 'none' : cs.textDecorationLine,
      color: cs.color,
      backgroundColor: cs.backgroundColor === 'rgba(0, 0, 0, 0)' ? 'transparent' : cs.backgroundColor,
      fontSize: cs.fontSize,
    })
  }

  function firstIndent() {
    restore()
    const sel = window.getSelection()
    const node = sel?.anchorNode
    let el = node ? (node.nodeType === 1 ? (node as HTMLElement) : node.parentElement) : null
    while (el && el !== editor.current && !/^(P|DIV|SECTION|H\d|LI|BLOCKQUOTE)$/.test(el.tagName)) el = el.parentElement
    if (!el || el === editor.current) {
      document.execCommand('formatBlock', false, 'p')
      return firstIndent()
    }
    el.style.textIndent = el.style.textIndent ? '' : '2em'
    onChange()
  }

  const keep = (e: React.MouseEvent) => e.preventDefault()
  const ib = 'flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-ink-soft hover:bg-paper'
  const sep = <span className="mx-0.5 h-5 w-px bg-line" aria-hidden />

  return (
    <div className="relative flex flex-wrap items-center gap-0.5 border-b border-line bg-[#fafafa] px-1.5 py-1" onMouseDown={keep}>
      <button type="button" title="清除格式" aria-label="清除格式" className={ib} onClick={() => exec('removeFormat')}>
        <Icon d="M4 20h10M15 4l5 5-9 9H6v-5zM12 7l5 5" />
      </button>
      <button
        type="button"
        title={painter ? '选中文字即可套用格式（再点一次取消）' : '格式刷：先选中有格式的文字，再点这里'}
        aria-label="格式刷"
        aria-pressed={!!painter}
        className={`${ib} ${painter ? 'bg-seal-soft text-seal' : ''}`}
        onClick={() => (painter ? setPainter(null) : startPainter())}
      >
        <Icon d="M4 4h12v5H4zM16 6h3v6h-7v3M10 15h4v6h-4z" />
      </button>
      {sep}

      <div className="relative">
        <button type="button" className={`${ib} gap-0.5 text-sm`} onClick={() => setMenu(menu === 'size' ? '' : 'size')} aria-label="字号">
          {curSize} <Caret />
        </button>
        {menu === 'size' && (
          <Menu>
            {SIZES.map((s) => (
              <button key={s} type="button" className="block w-full rounded px-3 py-1 text-left hover:bg-paper" style={{ fontSize: Math.min(s, 20) }} onClick={() => applyStyle({ fontSize: `${s}px` })}>
                {s}px
              </button>
            ))}
          </Menu>
        )}
      </div>
      {sep}

      <button type="button" title="粗体" aria-label="粗体" className={`${ib} font-bold`} onClick={() => exec('bold')}>B</button>
      <button type="button" title="斜体" aria-label="斜体" className={`${ib} italic`} onClick={() => exec('italic')}>I</button>
      <button type="button" title="下划线" aria-label="下划线" className={`${ib} underline`} onClick={() => exec('underline')}>U</button>
      <button type="button" title="删除线" aria-label="删除线" className={`${ib} line-through`} onClick={() => exec('strikeThrough')}>S</button>
      {sep}

      <div className="relative">
        <button type="button" title="字体颜色" aria-label="字体颜色" className={`${ib} gap-0.5`} onClick={() => setMenu(menu === 'color' ? '' : 'color')}>
          <span className="font-semibold underline decoration-[3px] decoration-price">A</span> <Caret />
        </button>
        {menu === 'color' && (
          <Menu wide>
            <Swatches colors={COLORS} onPick={(c) => exec('foreColor', c)} />
          </Menu>
        )}
      </div>
      <div className="relative">
        <button type="button" title="背景色" aria-label="背景色" className={`${ib} gap-0.5`} onClick={() => setMenu(menu === 'bg' ? '' : 'bg')}>
          <span className="rounded-sm bg-ink px-1 text-xs font-semibold text-white">ab</span> <Caret />
        </button>
        {menu === 'bg' && (
          <Menu wide>
            <Swatches colors={BG_COLORS} onPick={(c) => exec('hiliteColor', c)} />
          </Menu>
        )}
      </div>
      {sep}

      <div className="relative">
        <button type="button" title="对齐" aria-label="对齐" className={`${ib} gap-0.5`} onClick={() => setMenu(menu === 'align' ? '' : 'align')}>
          <Icon d="M4 6h16M4 10h16M4 14h16M4 18h16" /> <Caret />
        </button>
        {menu === 'align' && (
          <Menu>
            <MenuItem onClick={() => exec('justifyLeft')}>左对齐</MenuItem>
            <MenuItem onClick={() => exec('justifyCenter')}>居中</MenuItem>
            <MenuItem onClick={() => exec('justifyRight')}>右对齐</MenuItem>
            <MenuItem onClick={() => exec('justifyFull')}>两端对齐</MenuItem>
          </Menu>
        )}
      </div>
      <button type="button" title="首行缩进" aria-label="首行缩进" className={ib} onClick={firstIndent}>
        <Icon d="M10 6h10M4 10h16M4 14h16M4 18h16M4 4l3 2-3 2" />
      </button>
      <div className="relative">
        <button type="button" title="列表" aria-label="列表" className={`${ib} gap-0.5`} onClick={() => setMenu(menu === 'list' ? '' : 'list')}>
          <Icon d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" /> <Caret />
        </button>
        {menu === 'list' && (
          <Menu>
            <MenuItem onClick={() => exec('insertUnorderedList')}>• 无序列表</MenuItem>
            <MenuItem onClick={() => exec('insertOrderedList')}>1. 有序列表</MenuItem>
          </Menu>
        )}
      </div>
      {sep}

      <button type="button" className={`${ib} text-sm`} onClick={() => exec('formatBlock', 'h3')}>小标题</button>
      <button type="button" className={`${ib} text-sm`} onClick={() => exec('formatBlock', 'p')}>正文</button>
      <button type="button" className={`${ib} text-sm text-seal`} onClick={onInsertImage}>插入图片</button>

      {menu && <div className="fixed inset-0 z-10" onClick={() => setMenu('')} />}
      {painter && <p className="w-full px-1.5 pb-0.5 text-xs text-seal">格式刷已开启：选中要修改的文字即可套用</p>}
    </div>
  )
}

function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  )
}

function Caret() {
  return (
    <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 opacity-60" aria-hidden>
      <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  )
}

function Menu({ children, wide }: { children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={`absolute left-0 top-full z-20 mt-1 rounded-lg border border-line bg-white p-1 text-sm shadow-lg ${wide ? 'w-48' : 'w-32'}`}>
      {children}
    </div>
  )
}

function MenuItem({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button type="button" className="block w-full rounded px-3 py-1.5 text-left hover:bg-paper" onClick={onClick}>
      {children}
    </button>
  )
}

function Swatches({ colors, onPick }: { colors: string[]; onPick: (c: string) => void }) {
  return (
    <div className="grid grid-cols-5 gap-1.5 p-1">
      {colors.map((c) => (
        <button
          key={c}
          type="button"
          aria-label={c === 'transparent' ? '无背景色' : c}
          onClick={() => onPick(c)}
          className="h-7 w-7 rounded border border-line"
          style={{
            background:
              c === 'transparent' ? 'linear-gradient(135deg,#fff 45%,#e53935 45%,#e53935 55%,#fff 55%)' : c,
          }}
        />
      ))}
    </div>
  )
}
