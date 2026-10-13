import type { Metadata } from 'next'

export const metadata: Metadata = { title: '隐私政策' }

export default function PrivacyPage() {
  return (
    <article className="bg-white px-5 py-6 leading-7 md:mt-4 md:rounded-xl md:border md:border-line md:px-8">
      <h1 className="text-xl font-bold">隐私政策</h1>
      <p className="mt-1 text-sm text-mute">更新日期：2026 年 10 月 12 日</p>

      <Section title="我们收集哪些信息">
        <ul className="list-disc space-y-1 pl-5">
          <li>注册信息：邮箱地址、密码（加密保存，我们无法看到原文）。</li>
          <li>使用 Google 或微信登录时：对方提供的昵称、头像和邮箱。</li>
          <li>你发布的内容：帖子文字、图片、价格，以及你自愿填写的电话、微信号、邮箱等联系方式。</li>
          <li>评论和举报内容。</li>
        </ul>
      </Section>

      <Section title="这些信息怎么使用">
        <ul className="list-disc space-y-1 pl-5">
          <li>让你登录、发布和管理自己的信息。</li>
          <li>在帖子页面展示你发布的内容和联系方式，方便其他用户联系你。</li>
          <li>处理举报、防止诈骗和垃圾信息。</li>
        </ul>
        <p className="mt-2">我们不会出售你的个人信息，也不会把你的邮箱提供给其他用户或第三方做广告。</p>
      </Section>

      <Section title="哪些信息是公开的">
        <p>你发布的帖子内容、图片、联系方式，以及你的昵称和头像，所有访问本站的人都能看到。请只填写你愿意公开的联系方式。你的注册邮箱不会公开显示。</p>
      </Section>

      <Section title="信息存储">
        <p>数据存储在 Supabase 提供的云数据库（美国东部）中，网站由 Vercel 托管。传输过程全程加密（HTTPS）。</p>
      </Section>

      <Section title="删除你的信息">
        <p>你可以随时在“我的”页面删除自己发布的帖子和评论。如需删除整个账号，请微信联系 <span className="font-medium text-ink">Dallas_58</span>，我们会在 7 天内处理。</p>
      </Section>

      <Section title="联系我们">
        <p>对本政策有任何疑问，请微信联系 <span className="font-medium text-ink">Dallas_58</span>。</p>
      </Section>
    </article>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <div className="text-[15px] text-ink-soft">{children}</div>
    </section>
  )
}
