import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { doctorService } from '../services/doctorService'
import Footer from '../components/layout/Footer'

const CLINIC_EMAIL = 'ecms.nhankhoaanhsao@gmail.com'

function splitLines(text) {
  return (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function parseCareerHistory(text) {
  return splitLines(text).map((line) => {
    const [period, ...rest] = line.split('|')
    return { period: period.trim(), description: rest.join('|').trim() }
  })
}

const s = {
  page: { fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', backgroundColor: '#f8fafc', minHeight: '100vh' },
  container: { maxWidth: 1280, margin: '0 auto', padding: '32px 24px 80px' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#94a3b8', marginBottom: 32 },
  breadcrumbLink: { color: '#94a3b8', textDecoration: 'none' },
  breadcrumbCurrent: { color: '#111827', fontWeight: 500 },

  hero: { display: 'grid', gridTemplateColumns: '1fr 420px', gap: 48, alignItems: 'center', marginBottom: 56 },
  badge: {
    display: 'inline-block', backgroundColor: '#dbeafe', color: '#1d4ed8',
    fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, marginBottom: 16, letterSpacing: 0.5,
  },
  academicTitle: { fontSize: 20, fontWeight: 700, color: '#1d4ed8', margin: 0 },
  fullName: { fontSize: 34, fontWeight: 800, color: '#1d4ed8', margin: '4px 0 20px', lineHeight: 1.2 },
  bio: { fontSize: 15, color: '#475569', lineHeight: 1.8, marginBottom: 28, maxWidth: 520 },
  actionsRow: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: '#1d4ed8', color: '#fff',
    padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: 'none', cursor: 'pointer',
  },
  btnOutline: {
    display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: '#fff', color: '#1d4ed8',
    padding: '12px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none', border: '1px solid #bfdbfe',
  },

  photoWrap: { position: 'relative' },
  photo: {
    width: '100%', height: 420, borderRadius: 20, objectFit: 'cover',
    border: '1px solid #e2e8f0', boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
  },
  photoPlaceholder: {
    width: '100%', height: 420, borderRadius: 20, border: '1px solid #e2e8f0',
    boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 120,
    background: 'linear-gradient(160deg, #e2e8f0 0%, #cbd5e1 100%)', color: '#94a3b8',
  },
  experienceBadge: {
    position: 'absolute', bottom: -20, right: 24,
    backgroundColor: '#fff', borderRadius: 14, padding: '12px 18px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
    display: 'flex', alignItems: 'center', gap: 10,
  },
  experienceIcon: {
    width: 34, height: 34, borderRadius: '50%', backgroundColor: '#1d4ed8', color: '#fff',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0,
  },
  experienceValue: { fontSize: 16, fontWeight: 800, color: '#111827' },
  experienceLabel: { fontSize: 11, color: '#94a3b8' },

  card: {
    backgroundColor: '#fff', borderRadius: 20, border: '1px solid #e2e8f0', padding: 32,
    boxShadow: '0 2px 12px rgba(0,0,0,0.05)', marginBottom: 24,
  },
  cardTitle: { display: 'flex', alignItems: 'center', gap: 10, fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 20px' },
  achievementItem: { display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: '#374151', marginBottom: 12, lineHeight: 1.6 },
  achievementCheck: { color: '#0d9488', fontWeight: 700, flexShrink: 0 },
  emptyNote: { fontSize: 14, color: '#94a3b8' },

  timeline: { position: 'relative', paddingLeft: 20 },
  timelineLine: { position: 'absolute', left: 4, top: 6, bottom: 6, width: 2, backgroundColor: '#dbeafe' },
  timelineItem: { position: 'relative', paddingBottom: 20 },
  timelineDot: {
    position: 'absolute', left: -20, top: 4, width: 9, height: 9, borderRadius: '50%',
    backgroundColor: '#1d4ed8', border: '2px solid #fff', boxShadow: '0 0 0 2px #dbeafe',
  },
  timelinePeriod: { fontSize: 13, fontWeight: 700, color: '#1d4ed8', marginBottom: 4 },
  timelineDesc: { fontSize: 14, color: '#374151', lineHeight: 1.6 },

  loading: { textAlign: 'center', padding: '80px 24px', color: '#64748b', fontSize: 16 },
  error: { textAlign: 'center', padding: '80px 24px' },
  errorIcon: { fontSize: 52, marginBottom: 16 },
  errorText: { fontSize: 18, fontWeight: 600, color: '#ef4444', marginBottom: 8 },
  errorLink: { color: '#1d4ed8', fontSize: 14, textDecoration: 'none', fontWeight: 500 },
}

export default function DoctorDetailPage() {
  const { id } = useParams()
  const [doctor, setDoctor] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    doctorService.getDoctorById(id)
      .then((res) => setDoctor(res.data))
      .catch(() => setError('Không tìm thấy thông tin bác sĩ này.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={s.page}><div style={s.loading}>Đang tải thông tin bác sĩ...</div></div>

  if (error || !doctor) {
    return (
      <div style={s.page}>
        <div style={s.error}>
          <div style={s.errorIcon}>😕</div>
          <div style={s.errorText}>{error || 'Không tìm thấy thông tin bác sĩ này.'}</div>
          <Link to="/" style={s.errorLink}>← Quay lại trang chủ</Link>
        </div>
      </div>
    )
  }

  const achievements = splitLines(doctor.achievements)
  const careerHistory = parseCareerHistory(doctor.careerHistory)
  const displayName = [doctor.academicTitle, doctor.fullName].filter(Boolean).join(', ')

  return (
    <div style={s.page}>
      <div style={s.container}>
        {/* ── BREADCRUMB ── */}
        <div style={s.breadcrumb}>
          <Link to="/" style={s.breadcrumbLink}>Trang chủ</Link>
          <span>›</span>
          <span>Đội ngũ bác sĩ</span>
          <span>›</span>
          <span style={s.breadcrumbCurrent}>{displayName}</span>
        </div>

        {/* ── HERO ── */}
        <div style={s.hero}>
          <div>
            <span style={s.badge}>{doctor.department || 'Bác sĩ chuyên khoa'}</span>
            {doctor.academicTitle && <h2 style={s.academicTitle}>{doctor.academicTitle}</h2>}
            <h1 style={s.fullName}>{doctor.fullName}</h1>
            <p style={s.bio}>
              {doctor.bio || `${displayName} là bác sĩ chuyên khoa mắt tại Nhãn khoa Ánh Sao.`}
            </p>
            <div style={s.actionsRow}>
              <Link to="/patient/booking" style={s.btnPrimary}>📅 Đặt lịch khám ngay</Link>
              <a href={`mailto:${doctor.email || CLINIC_EMAIL}`} style={s.btnOutline}>✉️ Gửi tin nhắn</a>
            </div>
          </div>

          <div style={s.photoWrap}>
            {doctor.avatarUrl ? (
              <img src={doctor.avatarUrl} alt={doctor.fullName} style={s.photo} />
            ) : (
              <div style={s.photoPlaceholder}>🧑‍⚕️</div>
            )}
            {doctor.experienceYears != null && (
              <div style={s.experienceBadge}>
                <div style={s.experienceIcon}>🎓</div>
                <div>
                  <div style={s.experienceValue}>{doctor.experienceYears}+</div>
                  <div style={s.experienceLabel}>Năm kinh nghiệm</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── ACHIEVEMENTS ── */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>🏅 Thành tựu chuyên môn</h3>
          {achievements.length === 0 ? (
            <p style={s.emptyNote}>Thông tin đang được cập nhật.</p>
          ) : (
            achievements.map((item, i) => (
              <div key={i} style={s.achievementItem}>
                <span style={s.achievementCheck}>✓</span>
                <span>{item}</span>
              </div>
            ))
          )}
        </div>

        {/* ── CAREER HISTORY ── */}
        <div style={s.card}>
          <h3 style={s.cardTitle}>🎓 Quá trình học tập và công tác</h3>
          {careerHistory.length === 0 ? (
            <p style={s.emptyNote}>Thông tin đang được cập nhật.</p>
          ) : (
            <div style={s.timeline}>
              <div style={s.timelineLine} />
              {careerHistory.map((item, i) => (
                <div key={i} style={s.timelineItem}>
                  <div style={s.timelineDot} />
                  <div style={s.timelinePeriod}>{item.period}</div>
                  <div style={s.timelineDesc}>{item.description}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  )
}
