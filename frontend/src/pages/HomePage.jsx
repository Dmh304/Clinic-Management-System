import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import heroImg from '../assets/ECMS_background.png'
import machineImg from '../assets/ECMS_Machine.png'
import { serviceService } from '../services/serviceService'
import { doctorService } from '../services/doctorService'
import Footer from '../components/layout/Footer'

function formatPrice(price) {
  if (!price && price !== 0) return null
  return new Intl.NumberFormat('vi-VN').format(price) + 'đ'
}

function FacebookIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#1877F2" />
      <g transform="translate(13.5,9.6) scale(0.0406)">
        <path fill="#fff" d="M279.14 288l14.22-92.66h-88.91v-60.13c0-25.35 12.42-50.06 52.24-50.06h40.42V6.26S260.43 0 225.36 0c-73.22 0-121.08 44.38-121.08 124.72v70.62H22.89V288h81.39v224h100.17V288z" />
      </g>
    </svg>
  )
}

function ZaloIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="40" height="40" rx="11" fill="#0068FF" />
      <text x="20" y="25" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="13" fill="#fff">Zalo</text>
    </svg>
  )
}

function GmailIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#EA4335" />
      <g transform="translate(10,10) scale(0.833)">
        <path fill="#fff" d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
      </g>
    </svg>
  )
}

function PhoneIcon({ size = 40 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="20" fill="#1d4ed8" />
      <g transform="translate(10,10) scale(0.833)">
        <path fill="#fff" d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
      </g>
    </svg>
  )
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

const CONTACT_METHODS = [
  { Icon: FacebookIcon, label: 'Facebook', sub: 'Theo dõi fanpage', href: '#' },
  { Icon: ZaloIcon, label: 'Zalo', sub: 'Nhắn tin tư vấn', href: '#' },
  { Icon: GmailIcon, label: 'Gmail', sub: 'ecms.nhankhoaanhsao@gmail.com', href: 'mailto:ecms.nhankhoaanhsao@gmail.com' },
]

const DOCTORS_PER_PAGE = 4

const FALLBACK_EXPERT_DOCTORS = [
  { id: 1, fullName: 'Nguyễn Văn An', academicTitle: 'Thạc sĩ, Bác sĩ', experienceYears: 15, specialization: 'Chuyên gia kiểm soát cận thị, dịch kính võng' },
  { id: 2, fullName: 'Trần Bảo Long', academicTitle: 'Bác sĩ chuyên khoa 2', experienceYears: 15, specialization: 'Chuyên gia dịch kính võng mạc, đục thuỷ tinh' },
  { id: 3, fullName: 'Lê Thị Hạnh', academicTitle: 'Phó Giáo sư, Tiến sĩ, Bác sĩ', experienceYears: 40, specialization: 'Chuyên gia dịch kính võng mạc, thuỷ tinh thể' },
  { id: 4, fullName: 'Phạm Quốc Việt', academicTitle: 'Thạc sĩ, Bác sĩ', experienceYears: 10, specialization: 'Chuyên gia thể thuỷ tinh, tật khúc xạ, phẫu thuật' },
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
  contactGrid: { flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  contactCard: {
    display: 'flex', alignItems: 'center', gap: 12,
    border: '1px solid #e2e8f0', borderRadius: 14, padding: '16px',
    textDecoration: 'none', color: 'inherit',
  },
  contactIcon: {
    width: 40, height: 40,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  contactLabel: { fontWeight: 600, fontSize: 13, color: '#111827', marginBottom: 2 },
  contactSub: { fontSize: 11, color: '#94a3b8' },
  contactCardPrimary: {
    display: 'flex', alignItems: 'center', gap: 12,
    borderRadius: 14, padding: '16px', backgroundColor: '#1d4ed8', textDecoration: 'none',
  },
  contactIconPrimary: {
    width: 40, height: 40,
    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  contactLabelPrimary: { fontWeight: 700, fontSize: 13, color: '#fff', marginBottom: 2 },
  contactSubPrimary: { fontSize: 12, color: '#bfdbfe' },

  /* ── expert doctors ── */
  expertsSection: { backgroundColor: '#fff', padding: '80px 0' },
  expertsH2: { fontSize: 30, fontWeight: 800, color: '#111827', textAlign: 'center', marginBottom: 40, marginTop: 0 },
  expertsCarouselWrap: { position: 'relative' },
  expertsGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 },
  expertCard: {
    borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0',
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column',
  },
  expertPhoto: {
    height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 64, background: 'linear-gradient(160deg, #e2e8f0 0%, #cbd5e1 100%)', color: '#94a3b8',
  },
  expertFooter: { backgroundColor: '#0d9488', color: '#fff', padding: '18px 16px', textAlign: 'center' },
  expertTitle: { fontSize: 12, opacity: 0.9, marginBottom: 4 },
  expertName: { fontSize: 16, fontWeight: 700, marginBottom: 8 },
  expertExperience: { fontSize: 12, opacity: 0.9, marginBottom: 4 },
  expertHighlight: { fontSize: 12, opacity: 0.9, marginBottom: 10, lineHeight: 1.5 },
  expertDetailLink: { fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: 'underline' },
  carouselArrow: {
    position: 'absolute', top: '38%', transform: 'translateY(-50%)',
    width: 36, height: 36, borderRadius: '50%', border: 'none',
    backgroundColor: '#0d9488', color: '#fff', fontSize: 16, cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
  },
  carouselDots: { display: 'flex', justifyContent: 'center', gap: 8, marginTop: 24 },
  carouselDot: { width: 8, height: 8, borderRadius: '50%', backgroundColor: '#cbd5e1', border: 'none', cursor: 'pointer', padding: 0 },
  carouselDotActive: { width: 8, height: 8, borderRadius: '50%', backgroundColor: '#0d9488', border: 'none', cursor: 'pointer', padding: 0 },

  /* ── partners ── */
  partnersSection: { backgroundColor: '#f1f5f9', padding: '56px 0' },
  partnersLabel: { textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: 3, textTransform: 'uppercase', marginBottom: 28 },
  partnersRow: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 56, flexWrap: 'wrap' },
  partnerName: { fontWeight: 700, fontSize: 16, color: '#94a3b8', letterSpacing: 1 },
}

export default function HomePage() {
  const [clinicalServices, setClinicalServices] = useState(FALLBACK_CLINICAL_SERVICES)
  const [expertDoctors, setExpertDoctors] = useState(FALLBACK_EXPERT_DOCTORS)
  const [doctorPage, setDoctorPage] = useState(0)

  useEffect(() => {
    serviceService
      .getServicesByType('CLINICAL')
      .then((res) => {
        const data = res.data ?? []
        if (data.length > 0) setClinicalServices(data.slice(0, 3))
      })
      .catch(() => { })
  }, [])

  useEffect(() => {
    doctorService
      .getAllDoctors()
      .then((res) => {
        const data = res.data ?? []
        if (data.length > 0) setExpertDoctors(data)
      })
      .catch(() => { })
  }, [])

  const [featured, small1, small2] = clinicalServices

  const doctorPageCount = Math.ceil(expertDoctors.length / DOCTORS_PER_PAGE)
  const visibleDoctors = expertDoctors.slice(
    doctorPage * DOCTORS_PER_PAGE,
    doctorPage * DOCTORS_PER_PAGE + DOCTORS_PER_PAGE
  )
  const goToDoctorPage = (page) => setDoctorPage((page + doctorPageCount) % doctorPageCount)

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

      {/* ── EXPERT DOCTORS ── */}
      <section style={s.expertsSection}>
        <div style={s.container}>
          <h2 style={s.expertsH2}>BÁC SĨ - CHUYÊN GIA</h2>

          <div style={s.expertsCarouselWrap}>
            {doctorPageCount > 1 && (
              <button
                type="button"
                aria-label="Bác sĩ trước"
                style={{ ...s.carouselArrow, left: -18 }}
                onClick={() => goToDoctorPage(doctorPage - 1)}
              >
                ‹
              </button>
            )}

            <div style={s.expertsGrid}>
              {visibleDoctors.map((doc) => (
                <div key={doc.id} style={s.expertCard}>
                  <div style={s.expertPhoto}>🧑‍⚕️</div>
                  <div style={s.expertFooter}>
                    {doc.academicTitle && <div style={s.expertTitle}>{doc.academicTitle}</div>}
                    <div style={s.expertName}>{doc.fullName}</div>
                    {doc.experienceYears != null && (
                      <div style={s.expertExperience}>Trên {doc.experienceYears} năm kinh nghiệm</div>
                    )}
                    {doc.specialization && <div style={s.expertHighlight}>{doc.specialization}</div>}
                    <Link to={`/doctors/${doc.id}`} style={s.expertDetailLink}>Chi tiết</Link>
                  </div>
                </div>
              ))}
            </div>

            {doctorPageCount > 1 && (
              <button
                type="button"
                aria-label="Bác sĩ tiếp theo"
                style={{ ...s.carouselArrow, right: -18 }}
                onClick={() => goToDoctorPage(doctorPage + 1)}
              >
                ›
              </button>
            )}
          </div>

          {doctorPageCount > 1 && (
            <div style={s.carouselDots}>
              {Array.from({ length: doctorPageCount }).map((_, i) => (
                <button
                  key={i}
                  type="button"
                  aria-label={`Trang bác sĩ ${i + 1}`}
                  style={i === doctorPage ? s.carouselDotActive : s.carouselDot}
                  onClick={() => setDoctorPage(i)}
                />
              ))}
            </div>
          )}
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

            <div style={s.contactGrid}>
              {CONTACT_METHODS.map(c => (
                <a key={c.label} href={c.href} style={s.contactCard}>
                  <div style={s.contactIcon}><c.Icon /></div>
                  <div>
                    <div style={s.contactLabel}>{c.label}</div>
                    <div style={s.contactSub}>{c.sub}</div>
                  </div>
                </a>
              ))}
              <a href="tel:19004444" style={s.contactCardPrimary}>
                <div style={s.contactIconPrimary}><PhoneIcon /></div>
                <div>
                  <div style={s.contactLabelPrimary}>Tư vấn 24/7</div>
                  <div style={s.contactSubPrimary}>1900 4444</div>
                </div>
              </a>
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

      <Footer />

    </div>
  )
}
