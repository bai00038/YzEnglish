import type { ReactNode } from "react";
import { CONTACT_ASSETS } from "@/data/contact-assets";
import { PageHeading } from "@/app/components/PageHeading";
import { QrCodeDialog } from "@/app/components/QrCodeDialog";
import "@/styles/contact.css";

function ContactSection({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return <section className="contact-section" aria-label={title}>
    <div className="contact-section-heading"><h2>{title}</h2>{note && <span>{note}</span>}</div>
    <div className="contact-card">{children}</div>
  </section>;
}

function ContactQr({ label, src }: { label: string; src: string }) {
  return <img className="contact-qr-image" src={src} alt={`${label}二维码`} width={128} height={128} />;
}

export function ContactPage() {
  return <div className="contact-page">
    <PageHeading subtitle="CONTACT">联系我们</PageHeading>
    <p className="contact-intro">有问题可以加企业微信找我，也可以先看看下面的「常见问题」。</p>
    <ContactSection title="直接找我">
      <div className="contact-human">
        <div className="contact-human-qr"><ContactQr label="企业微信" src={CONTACT_ASSETS.wecomQr} /></div>
        <div><h3>加我的企业微信</h3><p>会员、兑换码或学习上的问题，都可以加我。因为时差，可能没法马上回复，看到后我会尽快回你。</p>
          <QrCodeDialog src={CONTACT_ASSETS.wecomQr} title="企业微信二维码" />
        </div>
      </div>
    </ContactSection>
    <ContactSection title="常见问题">
      <div className="contact-qa">
        <div className="contact-qa-item"><h3><i>1</i>买完后怎么开始学？</h3><p>打开<b>「我的学习」</b>，输入收到的兑换码就能开始，不用另外注册账号。</p></div>
        <div className="contact-qa-item"><h3><i>2</i>兑换码找不到了怎么办？</h3><p>可以先搜一下购买时收到的邮件。如果之前已经在某台设备上登录，打开<b>「我的学习」</b>，点会员卡里的<b>「显示」</b>也能看到。还是找不到的话，加上面的企业微信，把购买邮箱发给我，我帮你查。</p></div>
        <div className="contact-qa-item"><h3><i>3</i>可以在几台设备上用？</h3><p>同一个码最多可以同时在 <b>3 台设备</b>上使用。换设备时，如果提示名额已满，就在旧设备的<b>「我的学习」</b>里点<b>「退出本设备」</b>，再到新设备输入兑换码。</p></div>
        <div className="contact-qa-item"><h3><i>4</i>付了款，没收到兑换码怎么办？</h3><p>先看看垃圾邮件和促销文件夹，也确认一下付款时邮箱有没有填错。等了十分钟还没收到，就加上面的企业微信，把购买邮箱发给我，我帮你核对补发。</p></div>
      </div>
    </ContactSection>
    <ContactSection title="关注我们" note="三个平台同步更新">
      <div className="contact-socials">
        {[
          ["抖音", CONTACT_ASSETS.douyinQr],
          ["小红书", CONTACT_ASSETS.xiaohongshuQr],
          ["微信视频号", CONTACT_ASSETS.channelsQr],
        ].map(([label, src]) => <div className="contact-social" key={label}><ContactQr label={label} src={src} /><b>{label}</b></div>)}
      </div>
    </ContactSection>
  </div>;
}
