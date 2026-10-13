// 页面切换时立刻显示的占位骨架，数据到了再替换，点击后不会感觉"卡住"
export default function Loading() {
  return (
    <div className="md:px-4 md:pt-4" aria-busy="true" aria-label="正在加载">
      <div className="overflow-hidden bg-white md:rounded-xl md:border md:border-line">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex gap-3 border-b border-line px-4 py-3 last:border-b-0">
            <div className="h-20 w-20 shrink-0 animate-pulse rounded-lg bg-paper" />
            <div className="flex flex-1 flex-col gap-2 py-1">
              <div className="h-4 w-4/5 animate-pulse rounded bg-paper" />
              <div className="h-4 w-1/2 animate-pulse rounded bg-paper" />
              <div className="mt-auto h-3 w-1/3 animate-pulse rounded bg-paper" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
