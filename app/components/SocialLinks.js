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

/**
 * Shared social icons row.
 * @param {"default"|"small"} size - "small" renders 34px icons with tighter gap (for the drawer).
 */
export default function SocialLinks({ size = "default" }) {
  const isSmall = size === "small";
  const iconPx = isSmall ? 15 : 18;
  const cls = isSmall ? "social-icon-link social-icon-link--sm" : "social-icon-link";

  return (
    <div style={{
      display: "flex",
      gap: isSmall ? "10px" : "14px",
      justifyContent: "center",
      flexWrap: "wrap",
    }}>
      {SOCIAL_LINKS.map(({ href, icon: Icon, label, hoverColor }) => (
        <a
          key={href}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className={cls}
          style={{ "--brand-color": hoverColor }}
        >
          <Icon size={iconPx} />
        </a>
      ))}
    </div>
  );
}
