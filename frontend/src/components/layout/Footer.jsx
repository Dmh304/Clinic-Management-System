import { Link } from 'react-router-dom'
import logoImg from '../../assets/ECMS_Logo.png'

const s = {
  footer: { backgroundColor: '#0f172a', color: '#94a3b8', padding: '40px 0' },
  footerInner: {
    maxWidth: 1280, margin: '0 auto', padding: '0 24px',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16,
  },
  footerLogo: { display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 6 },
  footerCopy: { fontSize: 12, color: '#475569' },
  footerLinks: { display: 'flex', alignItems: 'center', gap: 24 },
  footerLink: { fontSize: 13, color: '#94a3b8', textDecoration: 'none' },
}

export default function Footer() {
  return (
    <footer style={s.footer}>
      <div style={s.footerInner}>
        <div>
          <div style={s.footerLogo}>
            <img src={logoImg} alt="Anh Sao Eye Clinic" style={{ height: 44, width: 'auto' }} />
            NHÃN KHOA ÁNH SAO
          </div>
          <div style={s.footerCopy}>© 2024 Eyes Clinic Management System. All rights reserved.</div>
          <div style={{ ...s.footerCopy, marginTop: 2 }}>Chuyên nghiệp – Tin cậy – Tận tâm.</div>
        </div>
        <div style={s.footerLinks}>
          {['Privacy Policy', 'Terms of Service', 'Contact Support', 'Clinic Locations'].map(l => (
            <Link key={l} to="/" style={s.footerLink}>{l}</Link>
          ))}
        </div>
      </div>
    </footer>
  )
}
