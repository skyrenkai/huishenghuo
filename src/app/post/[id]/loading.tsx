// 打开帖子时立刻显示的占位骨架
export default function Loading() {
  return (
    <div className="md:px-4 md:pt-4" aria-busy="true" aria-label="正在加载">
      <div className="aspect-[4/3] w-full animate-pulse bg-line md:rounded-t-xl" />
      <div className="space-y-3 bg-white px-4 py-4 md:rounded-b-xl md:border md:border-t-0 md:border-line">
        <div className="h-4 w-24 animate-pulse rounded bg-paper" />
        <div className="h-6 w-4/5 animate-pulse rounded bg-paper" />
        <div className="h-7 w-28 animate-pulse rounded bg-paper" />
        <div className="h-20 w-full animate-pulse rounded-lg bg-paper" />
        <div className="h-4 w-full animate-pulse rounded bg-paper" />
        <div className="h-4 w-2/3 animate-pulse rounded bg-paper" />
      </div>
    </div>
  )
}
