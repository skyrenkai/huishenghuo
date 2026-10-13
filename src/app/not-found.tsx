import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="bg-white px-6 py-20 text-center md:mt-4 md:rounded-xl">
      <span className="stamp-done px-3 py-1 text-lg">找不到</span>
      <p className="mt-6 text-ink-soft">这条信息可能已经被删除，或者链接不对。</p>
      <Link href="/" className="mt-6 inline-block rounded-full bg-seal px-5 py-2 text-sm text-white">
        回到首页
      </Link>
    </div>
  )
}
