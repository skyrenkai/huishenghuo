import type { Metadata } from 'next'

export const metadata: Metadata = { title: '服务条款' }

export default function TermsPage() {
  return (
    <article className="bg-white px-5 py-6 leading-7 md:mt-4 md:rounded-xl md:border md:border-line md:px-8">
      <h1 className="text-xl font-bold">服务条款</h1>
      <p className="mt-1 text-sm text-mute">更新日期：2026 年 10 月 12 日</p>

      <Section title="关于惠生活">
        <p>惠生活是一个免费的同城信息平台，供用户发布和浏览租房、招聘、二手、本地服务等信息。我们只提供信息展示，不参与用户之间的任何交易。</p>
      </Section>

      <Section title="发布规则">
        <p>使用本站即表示你同意不发布以下内容：</p>
        <ul className="mt-1 list-disc space-y-1 pl-5">
          <li>虚假、诈骗或误导性信息；</li>
          <li>违法、色情、暴力或歧视性内容；</li>
          <li>侵犯他人隐私或知识产权的内容；</li>
          <li>重复刷屏的广告。</li>
        </ul>
        <p className="mt-2">违反规则的内容会被隐藏或删除，严重者会被限制发布。</p>
      </Section>

      <Section title="交易风险">
        <p>所有信息由用户自行发布，惠生活不保证其真实性。交易时请当面验货，不要提前转账或支付定金。因交易产生的纠纷和损失由交易双方自行承担。</p>
      </Section>

      <Section title="内容权利">
        <p>你对自己发布的内容负责，并保留其所有权。你同意惠生活在本站展示这些内容。</p>
      </Section>

      <Section title="条款变更">
        <p>我们可能会更新本条款，更新后会在本页面注明日期。继续使用本站即视为接受更新后的条款。</p>
      </Section>

      <Section title="联系我们">
        <p>如有疑问，请联系 <a className="text-seal" href="mailto:skyrenkai@gmail.com">skyrenkai@gmail.com</a>。</p>
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
