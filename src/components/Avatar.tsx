export default function Avatar({ name, url, size = 32 }: { name: string; url: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />
  }
  return (
    <span
      className="inline-flex items-center justify-center rounded-full bg-seal-soft font-medium text-seal"
      style={{ width: size, height: size, fontSize: size * 0.45 }}
      aria-hidden
    >
      {name.slice(0, 1)}
    </span>
  )
}
