import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import heroImg from '../assets/ECMS_background.png'
import machineImg from '../assets/ECMS_Machine.png'
import logoImg from '../assets/ECMS_Logo.png'
import { serviceService } from '../services/serviceService'

function formatPrice(price) {
  if (!price && price !== 0) return null
  return new Intl.NumberFormat('vi-VN').format(price) + 'đ'
}

const FALLBACK_CLINICAL_SERVICES = [
  {
    serviceName: 'Chụp đáy mắt độ phân giải cao',
    description:
      'Hệ thống máy OCT hiện đại giúp bác sĩ quan sát chi tiết từng lớp võng mạc, phát hiện sớm các dấu hiệu thoái hóa điểm vàng và glôcôm.',
  },
  { serviceName: 'Glaucoma', description: 'Tầm soát và điều trị sớm cườm nước hiệu quả.' },
  { serviceName: 'Cornea', description: 'Chẩn đoán và phục hồi giác mạc chuyên sâu.' },
]

const DOCTORS = [
  { name: 'Dr. Sarah Miller', specialty: 'Chuyên gia Võng mạc', status: 'Available', color: '#3b82f6' },
  { name: 'Dr. James Chen', specialty: 'Chuyên gia Khúc xạ', status: 'Fully Booked', color: '#6366f1' },
  { name: 'Dr. Elena Nguyen', specialty: 'Phẫu thuật Lasik', status: 'Available', color: '#ec4899' },
]

const PARTNERS = ['MEDITECH', 'OPTIC-GLO', 'VISION-CARE', 'RETINA-HUB', 'HEALTH-SYNC']

const s = {
  /* ── layout helpers ── */
  container: { maxWidth: 1280, margin: '0 auto', padding: '0 24px' },

  /* ── hero ── */
  hero: {
    position: 'relative', minHeight: 560,
    display: 'flex', alignItems: 'center',
    backgroundImage: `url(${heroImg})`,
    backgroundSize: 'cover', backgroundPosition: 'center',
  },
  heroOverlay: {
    position: 'absolute', inset: 0,
    background: 'linear-gradient(to right, rgba(15,23,70,0.85) 0%, rgba(29,78,216,0.65) 55%, transparent 100%)',
  },
  heroContent: { position: 'relative', zIndex: 10, padding: '80px 24px', maxWidth: 1280, margin: '0 auto', width: '100%' },
  badge: {
    display: 'inline-block', backgroundColor: '#0d9488', color: '#fff',
    fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, marginBottom: 20, letterSpacing: 1,
  },
  heroH1: {
    fontSize: 46, fontWeight: 800, color: '#fff', lineHeight: 1.2,
    maxWidth: 560, marginBottom: 16, marginTop: 0, letterSpacing: -0.5,
  },
  heroSubtitle: { color: '#bfdbfe', fontSize: 15, maxWidth: 460, marginBottom: 40, lineHeight: 1.7 },
  heroCards: { display: 'flex', gap: 16, flexWrap: 'wrap' },
  heroCard: {
    backgroundColor: '#fff', borderRadius: 16, padding: '24px',
    width: 220, boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
  },
  heroCardTitle: { fontWeight: 700, fontSize: 17, color: '#111827', marginBottom: 6 },
  heroCardText: { color: '#6b7280', fontSize: 13, marginBottom: 18, lineHeight: 1.6 },
  btnPrimary: {
    display: 'block', textAlign: 'center', backgroundColor: '#1d4ed8', color: '#fff',
    padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    textDecoration: 'none',
  },
  btnDark: {
    display: 'block', textAlign: 'center', backgroundColor: '#0f172a', color: '#fff',
    padding: '10px 16px', borderRadius: 8, fontSize: 13, fontWeight: 600,
    textDecoration: 'none',
  },

  /* ── services ── */
  servicesSection: { backgroundColor: '#fff', padding: '80px 0' },
  servicesHeader: { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 },
  servicesH2: { fontSize: 30, fontWeight: 800, color: '#111827', marginBottom: 8, marginTop: 0 },
  servicesSubtitle: { color: '#6b7280', fontSize: 14, lineHeight: 1.7 },
  seeMore: { color: '#1d4ed8', fontSize: 13, fontWeight: 500, textDecoration: 'none', whiteSpace: 'nowrap', marginTop: 4 },
  servicesGrid: { display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 },
  featuredCard: {
    backgroundColor: '#f8fafc', borderRadius: 20, padding: '36px',
    display: 'flex', gap: 28, alignItems: 'flex-start',
    border: '1px solid #e2e8f0',
  },
  retinaTag: {
    display: 'inline-block', backgroundColor: '#dbeafe', color: '#1d4ed8',
    fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 999, marginBottom: 14, letterSpacing: 0.5,
  },
  featuredH3: { fontSize: 22, fontWeight: 700, color: '#111827', marginBottom: 10, marginTop: 0 },
  featuredDesc: { color: '#64748b', fontSize: 13, lineHeight: 1.7, marginBottom: 16 },
  featureItem: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#475569', marginBottom: 8 },
  equipmentBox: {
    width: 190, height: 160, backgroundColor: '#e2e8f0', borderRadius: 14,
    flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 48, color: '#94a3b8',
  },
  smallCards: { display: 'flex', flexDirection: 'column', gap: 16 },
  glaucomaCard: {
    backgroundColor: '#2dd4bf', borderRadius: 20, padding: '28px',
    color: '#fff', flex: 1, position: 'relative', overflow: 'hidden',
  },
  corneaCard: {
    backgroundColor: '#4f46e5', borderRadius: 20, padding: '28px',
    color: '#fff', flex: 1,
  },
  serviceIcon: { fontSize: 32, marginBottom: 14 },
  serviceCardTitle: { fontSize: 20, fontWeight: 700, marginBottom: 6 },
  serviceCardDesc: { fontSize: 13, opacity: 0.85, lineHeight: 1.6 },

  /* ── appointment ── */
  appointmentSection: { backgroundColor: '#f8fafc', padding: '80px 0' },
  appointmentCard: {
    backgroundColor: '#fff', borderRadius: 20, padding: '40px',
    display: 'flex', gap: 40, alignItems: 'flex-start',
    border: '1px solid #e2e8f0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
  },
  apptLeft: { width: 240, flexShrink: 0 },
  apptH2: { fontSize: 24, fontWeight: 800, color: '#111827', marginBottom: 12, marginTop: 0 },
  apptDesc: { color: '#64748b', fontSize: 13, lineHeight: 1.7, marginBottom: 24 },
  slotRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  slotLabel: { fontSize: 11, color: '#94a3b8' },
  slotCount: { fontWeight: 700, fontSize: 14, color: '#111827' },
  bookBtn: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#1d4ed8', color: '#fff', padding: '12px 20px', borderRadius: 12,
    fontSize: 14, fontWeight: 600, textDecoration: 'none', width: '100%', boxSizing: 'border-box',
  },
  doctorGrid: { flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  doctorCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px',
  },
  doctorAvatar: {
    width: 42, height: 42, borderRadius: '50%',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontSize: 15, fontWeight: 700, flexShrink: 0,
  },
  doctorName: { fontWeight: 600, fontSize: 13, color: '#111827', marginBottom: 2 },
  doctorSpec: { fontSize: 11, color: '#94a3b8' },
  badgeAvailable: {
    display: 'inline-block', marginTop: 4, fontSize: 10, padding: '2px 8px',
    borderRadius: 999, fontWeight: 600, backgroundColor: '#dcfce7', color: '#15803d',
  },
  badgeBooked: {
    display: 'inline-block', marginTop: 4, fontSize: 10, padding: '2px 8px',
    borderRadius: 999, fontWeight: 600, backgroundColor: '#f1f5f9', color: '#64748b',
  },
  viewMoreCard: {
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px',
    color: '#94a3b8', fontSize: 13, cursor: 'pointer',
  },

  /* ── partners ── */
  partnersSection: { backgroundColor: '#f1f5f9', padding: '56px 0' },
  partnersLabel: { textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 28 },
  partnersRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 56, flexWrap: 'wrap' },
  partnerName: { fontWeight: 700, fontSize: 16, color: '#94a3b8', letterSpacing: 1 },

  /* ── footer ── */
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

export default function HomePage() {
  const [clinicalServices, setClinicalServices] = useState(FALLBACK_CLINICAL_SERVICES)

  useEffect(() => {
    serviceService
      .getServicesByType('CLINICAL')
      .then((res) => {
        const data = res.data ?? []
        if (data.length > 0) setClinicalServices(data.slice(0, 3))
      })
      .catch(() => {})
  }, [])

  const [featured, small1, small2] = clinicalServices

  return (
    <div style={{ fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b' }}>

      {/* ── HERO ── */}
      <section style={s.hero}>
        <div style={s.heroOverlay} />
        <div style={s.heroContent}>
          <span style={s.badge}>KỶ NIỆM 25 NĂM</span>
          <h1 style={s.heroH1}>
            Hành trình 25 năm đồng hành<br />cùng đôi mắt Việt
          </h1>
          <p style={s.heroSubtitle}>
            Chúng tôi cam kết mang lại giải pháp chăm sóc mắt chuyên sâu với công nghệ
            hiện đại nhất cho hàng triệu gia đình Việt.
          </p>
        </div>
      </section>

      {/* ── SERVICES ── */}
      <section style={s.servicesSection}>
        <div style={s.container}>
          <div style={s.servicesHeader}>
            <div>
              <h2 style={s.servicesH2}>Chẩn đoán kỹ thuật số hiện đại</h2>
              <p style={s.servicesSubtitle}>
                Ứng dụng công nghệ High-Resolution Retina Imaging Access giúp phát hiện<br />
                sớm các bệnh lý phức tạp về mắt.
              </p>
            </div>
            <Link to="/services" style={s.seeMore}>Xem chi tiết công nghệ →</Link>
          </div>

          <div style={s.servicesGrid}>
            {/* Featured card */}
            <div style={s.featuredCard}>
              <div style={{ flex: 1 }}>
                <span style={s.retinaTag}>KHÁM LÂM SÀNG</span>
                <h3 style={s.featuredH3}>{featured?.serviceName || FALLBACK_CLINICAL_SERVICES[0].serviceName}</h3>
                <p style={s.featuredDesc}>
                  {featured?.description || FALLBACK_CLINICAL_SERVICES[0].description}
                </p>
                {featured?.price != null && (
                  <div style={s.featureItem}>
                    <span style={{ color: '#0d9488', fontWeight: 700 }}>✓</span> Giá: {formatPrice(featured.price)}
                  </div>
                )}
              </div>
              <img src={machineImg} alt="OCT Machine" style={{ width: 190, height: 160, objectFit: 'cover', borderRadius: 14, flexShrink: 0 }} />
            </div>

            {/* Small cards */}
            <div style={s.smallCards}>
              <div style={s.glaucomaCard}>
                <div style={{ position: 'absolute', top: 14, right: 14, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: '50%', width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 16 }}>👁️</span>
                </div>
                <div style={s.serviceIcon}>👁️</div>
                <div style={s.serviceCardTitle}>{small1?.serviceName || FALLBACK_CLINICAL_SERVICES[1].serviceName}</div>
                <div style={s.serviceCardDesc}>{small1?.description || FALLBACK_CLINICAL_SERVICES[1].description}</div>
              </div>
              <div style={s.corneaCard}>
                <div style={s.serviceIcon}>🔍</div>
                <div style={s.serviceCardTitle}>{small2?.serviceName || FALLBACK_CLINICAL_SERVICES[2].serviceName}</div>
                <div style={s.serviceCardDesc}>{small2?.description || FALLBACK_CLINICAL_SERVICES[2].description}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── APPOINTMENT ── */}
      <section style={s.appointmentSection}>
        <div style={s.container}>
          <div style={s.appointmentCard}>
            <div style={s.apptLeft}>
              <h2 style={s.apptH2}>Đặt lịch khám dễ dàng</h2>
              <p style={s.apptDesc}>
                Chọn bác sĩ yêu thích và đặt hẹn ngay lập tức.
                Không còn phải chờ đợi lâu tại phòng khám.
              </p>
              <div style={s.slotRow}>
                <span style={{ fontSize: 24 }}>📅</span>
                <div>
                  <div style={s.slotLabel}>Lịch hẹn trống trong ngày</div>
                  <div style={s.slotCount}>12 Slots</div>
                </div>
              </div>
              <Link to="/patient/booking" style={s.bookBtn}>📅 Đặt lịch ngay</Link>
            </div>

            <div style={s.doctorGrid}>
              {DOCTORS.map(doc => (
                <div key={doc.name} style={s.doctorCard}>
                  <div style={{ ...s.doctorAvatar, backgroundColor: doc.color }}>
                    {doc.name.split(' ').slice(-1)[0][0]}
                  </div>
                  <div>
                    <div style={s.doctorName}>{doc.name}</div>
                    <div style={s.doctorSpec}>{doc.specialty}</div>
                    <span style={doc.status === 'Available' ? s.badgeAvailable : s.badgeBooked}>
                      ● {doc.status}
                    </span>
                  </div>
                </div>
              ))}
              <div style={s.viewMoreCard}>
                <span style={{ fontSize: 22 }}>👥</span>
                <span>Xem thêm bác sĩ</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PARTNERS ── */}
      <section style={s.partnersSection}>
        <div style={s.container}>
          <p style={s.partnersLabel}>Đối tác chiến lược &amp; Công nghệ</p>
          <div style={s.partnersRow}>
            {PARTNERS.map(p => (
              <span key={p} style={s.partnerName}>{p}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div>
            <div style={s.footerLogo}>
              <img src={logoImg} alt="Anh Sao Eye Clinic" style={{ height: 44, width: 'auto' }} />
              ANH SAO EYE CLINIC
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

    </div>
  )
}
