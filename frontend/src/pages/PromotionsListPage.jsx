import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import dayjs from 'dayjs'
import { discountService } from '../services/discountService'
import logoImg from '../assets/ECMS_Logo.png'

const TYPE_LABEL = { PERCENTAGE: 'Giảm %', FIXED_AMOUNT: 'Giảm tiền', VOUCHER: 'Mã voucher' }

const s = {
  page: { fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', backgroundColor: '#f8fafc', minHeight: '100vh' },
  container: { maxWidth: 1100, margin: '0 auto', padding: '48px 24px 80px' },
  heading: { fontSize: 36, fontWeight: 800, color: '#111827', margin: '0 0 8px' },
  subtitle: { color: '#64748b', fontSize: 15, lineHeight: 1.65, marginBottom: 24, maxWidth: 560 },
  searchInput: {
    width: '100%', maxWidth: 420, boxSizing: 'border-box', padding: '10px 14px',
    borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 14, marginBottom: 24,
    outline: 'none', color: '#1e293b',
  },
  count: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },

  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', textDecoration: 'none', color: 'inherit' },
  cardImgWrap: { width: '100%', height: 170, overflow: 'hidden', flexShrink: 0, position: 'relative' },
  cardImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  cardImgPlaceholder: { width: '100%', height: '100%', backgroundColor: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40 },
  cardBadge: { position: 'absolute', top: 12, left: 12, backgroundColor: '#dc2626', color: '#fff', fontSize: 13, fontWeight: 800, padding: '4px 12px', borderRadius: 999 },
  cardBody: { padding: '16px 18px 20px', flex: 1, display: 'flex', flexDirection: 'column' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 },
  cardType: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: '#eff6ff', color: '#2563eb' },
  cardTitle: { fontSize: 16, fontWeight: 700, color: '#111827', margin: '0 0 8px', lineHeight: 1.4 },
  cardDesc: { color: '#64748b', fontSize: 13, lineHeight: 1.65, flex: 1, marginBottom: 14, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' },
  cardFooter: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12, color: '#94a3b8' },
  readMore: { color: '#1d4ed8', fontWeight: 600 },

  empty: { textAlign: 'center', padding: '60px 24px', color: '#94a3b8' },
  loading: { textAlign: 'center', padding: '60px 24px', color: '#64748b', fontSize: 15 },
  error: { textAlign: 'center', padding: '60px 24px', color: '#ef4444', fontSize: 14 },

  footer: { backgroundColor: '#0f172a', color: '#94a3b8', padding: '40px 0' },
  footerInner: { maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 },
  footerLogo: { display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 6 },
  footerCopy: { fontSize: 12, color: '#475569' },
}

function discountLabel(c) {
  return c.type === 'PERCENTAGE' ? `-${Number(c.value)}%` : `-${Number(c.value).toLocaleString('vi-VN')}₫`
}

function daysRemaining(validTo) {
  return dayjs(validTo).diff(dayjs().startOf('day'), 'day')
}

// Trạng thái theo ngày — độc lập với is_active (cờ bật/tắt tay), chỉ tính theo
// valid_from/valid_to so với hôm nay, để hiện đúng cho cả campaign đã hết hạn.
function campaignStatus(c) {
  const today = dayjs().startOf('day')
  if (dayjs(c.validFrom).isAfter(today)) return { label: 'Sắp diễn ra', bg: '#fef3c7', color: '#b45309' }
  if (dayjs(c.validTo).isBefore(today)) return { label: 'Đã kết thúc', bg: '#f1f5f9', color: '#64748b' }
  return { label: 'Đang diễn ra', bg: '#dcfce7', color: '#16a34a' }
}

// Tìm không phân biệt hoa/thường và dấu tiếng Việt (vd "he" khớp "Hè")
function normalize(str) {
  return (str || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

export default function PromotionsListPage() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [query, setQuery] = useState('')

  useEffect(() => {
    discountService.getAllPublic()
      .then(res => setCampaigns(res.data || []))
      .catch(() => setError('Không thể tải danh sách khuyến mãi. Vui lòng thử lại sau.'))
      .finally(() => setLoading(false))
  }, [])

  const q = normalize(query.trim())
  const filtered = q
    ? campaigns.filter(c => normalize(c.name).includes(q) || normalize(c.description).includes(q) || normalize(c.content).includes(q))
    : campaigns

  return (
    <div style={s.page}>
      <div style={s.container}>
        <h1 style={s.heading}>Khuyến mãi &amp; Ưu đãi</h1>
        <p style={s.subtitle}>
          Các chương trình giảm giá, voucher và ưu đãi tại Nhãn Khoa Ánh Sao — kể cả chương
          trình đã kết thúc, để bạn xem lại lịch sử ưu đãi.
        </p>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm chương trình khuyến mãi theo tên..."
          style={s.searchInput}
        />

        {loading && <div style={s.loading}>Đang tải khuyến mãi...</div>}
        {error && <div style={s.error}>{error}</div>}

        {!loading && !error && (
          <>
            <div style={s.count}>Hiển thị <strong>{filtered.length}</strong>/{campaigns.length} chương trình</div>

            {filtered.length === 0 ? (
              <div style={s.empty}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎁</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>
                  {campaigns.length === 0 ? 'Hiện chưa có chương trình khuyến mãi nào' : 'Không tìm thấy chương trình phù hợp'}
                </div>
                <div style={{ fontSize: 13 }}>
                  {campaigns.length === 0 ? 'Hãy quay lại sau — chúng tôi sẽ sớm có ưu đãi mới!' : 'Thử từ khoá khác xem sao.'}
                </div>
              </div>
            ) : (
              <div style={s.grid}>
                {filtered.map(c => {
                  const remain = daysRemaining(c.validTo)
                  const untilStart = dayjs(c.validFrom).diff(dayjs().startOf('day'), 'day')
                  const status = campaignStatus(c)
                  const footerText = status.label === 'Sắp diễn ra'
                    ? `Bắt đầu sau ${untilStart} ngày`
                    : status.label === 'Đã kết thúc'
                      ? 'Đã kết thúc'
                      : `Còn ${remain} ngày`
                  return (
                    <Link key={c.id} to={`/promotions/${c.id}`} style={{ ...s.card, opacity: status.label === 'Đã kết thúc' ? 0.7 : 1 }}>
                      <div style={s.cardImgWrap}>
                        {c.thumbnailUrl
                          ? <img src={c.thumbnailUrl} alt={c.name} style={s.cardImg} />
                          : <div style={s.cardImgPlaceholder}>🎁</div>
                        }
                        <span style={s.cardBadge}>{discountLabel(c)}</span>
                      </div>
                      <div style={s.cardBody}>
                        <div style={s.cardMeta}>
                          <span style={s.cardType}>{TYPE_LABEL[c.type]}</span>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: status.bg, color: status.color }}>
                            {status.label}
                          </span>
                        </div>
                        <h3 style={s.cardTitle}>{c.name}</h3>
                        <p style={s.cardDesc}>{c.description || 'Xem chi tiết điều kiện áp dụng.'}</p>
                        <div style={s.cardFooter}>
                          <span>{footerText}</span>
                          <span style={s.readMore}>Xem chi tiết →</span>
                        </div>
                      </div>
                    </Link>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>

      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div>
            <div style={s.footerLogo}>
              <img src={logoImg} alt="NHÃN KHOA ÁNH SAO" style={{ height: 44, width: 'auto' }} />
              NHÃN KHOA ÁNH SAO
            </div>
            <div style={s.footerCopy}>© 2024 Eyes Clinic Management System. All rights reserved.</div>
          </div>
        </div>
      </footer>
    </div>
  )
}
