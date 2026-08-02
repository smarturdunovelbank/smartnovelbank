import Link from "next/link";
import {
  FaFacebookF,
  FaWhatsapp,
  FaPinterestP,
  FaInstagram,
  FaYoutube,
  FaTelegramPlane,
} from "react-icons/fa";

const SOCIAL_LINKS = [
  { href: "https://www.facebook.com/people/Urdu-novel-Bank/100090906471153/", icon: FaFacebookF, label: "Follow us on Facebook", hoverColor: "#1877F2" },
  { href: "https://whatsapp.com/channel/0029VaurdEY0wajrnyeAl50Y", icon: FaWhatsapp, label: "Join our WhatsApp channel", hoverColor: "#25D366" },
  { href: "https://www.pinterest.com/urdunovelbanks/", icon: FaPinterestP, label: "Follow us on Pinterest", hoverColor: "#E60023" },
  { href: "https://www.instagram.com/urdunovelbank/", icon: FaInstagram, label: "Follow us on Instagram", hoverColor: "#E1306C" },
  { href: "https://youtube.com/@urdunovelbank", icon: FaYoutube, label: "Subscribe on YouTube", hoverColor: "#FF0000" },
  { href: "https://t.me/urdunovelbank", icon: FaTelegramPlane, label: "Join us on Telegram", hoverColor: "#26A5E4" },
];

export default function Footer() {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer style={{ 
      marginTop: '60px', 
      padding: '40px 20px', 
      borderTop: '1px solid var(--sn-paper-line)',
      textAlign: 'center',
      fontFamily: 'Segoe UI, sans-serif',
      fontSize: '0.95rem',
      color: 'var(--sn-text-sub)'
    }}>
      <h3 style={{ fontFamily: 'Georgia, serif', color: 'var(--sn-ink)', margin: '0 0 14px 0', fontSize: '1.45rem' }}>Smart Novel Bank</h3>
      <p className="text-urdu" style={{ margin: '0 0 8px 0', textAlign: 'center', fontWeight: 'bold', fontSize: '1.15rem', color: 'var(--sn-ink)' }}>اردو ناولز کی اسمارٹ دنیا 🌍</p>
      <p className="text-urdu" style={{ margin: '0 0 25px 0', textAlign: 'center' }}>جہاں آپ اپنے پسندیدہ ناولز مفت پی ڈی ایف میں ڈاؤن لوڈ کر سکتے ہیں یا آن لائن با آسانی پڑھ سکتے ہیں۔</p>
      
      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '25px' }}>
        <Link href="/" scroll={false} style={{ color: 'var(--sn-ink)', textDecoration: 'none', fontWeight: 'bold' }}>Home</Link>
        <Link href="/about" scroll={false} style={{ color: 'var(--sn-ink)', textDecoration: 'none', fontWeight: 'bold' }}>About</Link>
        <Link href="/contact" scroll={false} style={{ color: 'var(--sn-ink)', textDecoration: 'none', fontWeight: 'bold' }}>Contact</Link>
        <Link href="/privacy" scroll={false} style={{ color: 'var(--sn-ink)', textDecoration: 'none', fontWeight: 'bold' }}>Privacy Policy</Link>
        <Link href="/terms" scroll={false} style={{ color: 'var(--sn-ink)', textDecoration: 'none', fontWeight: 'bold' }}>Terms & Disclaimer</Link>
      </div>

      {/* Social icons row */}
      <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '25px' }}>
        {SOCIAL_LINKS.map(({ href, icon: Icon, label, hoverColor }) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={label}
            className="social-icon-link"
            style={{ '--brand-color': hoverColor }}
          >
            <Icon size={18} />
          </a>
        ))}
      </div>
      
      <p style={{ margin: 0, fontSize: '0.85rem' }}>&copy; {currentYear} Smart Novel Bank. All rights reserved.</p>
    </footer>
  );
}
