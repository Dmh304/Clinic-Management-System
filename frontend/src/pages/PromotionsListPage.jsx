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
  subtitle: { color: '#64748b', fontSize: 15, lineHeight: 1.65, marginBottom: 32, maxWidth: 560 },
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

export default function PromotionsListPage() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    discountService.getActive()
      .then(res => setCampaigns(res.data || []))
      .catch(() => setError('Không thể tải danh sách khuyến mãi. Vui lòng thử lại sau.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div style={s.page}>
      <div style={s.container}>
        <h1 style={s.heading}>Khuyến mãi &amp; Ưu đãi</h1>
        <p style={s.subtitle}>
          Các chương trình giảm giá, voucher và ưu đãi đang áp dụng tại Nhãn Khoa Ánh Sao —
          cập nhật thường xuyên, đừng bỏ lỡ.
        </p>

        {loading && <div style={s.loading}>Đang tải khuyến mãi...</div>}
        {error && <div style={s.error}>{error}</div>}

        {!loading && !error && (
          <>
            <div style={s.count}>Hiển thị <strong>{campaigns.length}</strong> chương trình đang diễn ra</div>

            {campaigns.length === 0 ? (
              <div style={s.empty}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>🎁</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Hiện chưa có chương trình khuyến mãi nào</div>
                <div style={{ fontSize: 13 }}>Hãy quay lại sau — chúng tôi sẽ sớm có ưu đãi mới!</div>
              </div>
            ) : (
              <div style={s.grid}>
                {campaigns.map(c => {
                  const remain = daysRemaining(c.validTo)
                  return (
                    <Link key={c.id} to={`/promotions/${c.id}`} style={s.card}>
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
                        </div>
                        <h3 style={s.cardTitle}>{c.name}</h3>
                        <p style={s.cardDesc}>{c.description || 'Xem chi tiết điều kiện áp dụng.'}</p>
                        <div style={s.cardFooter}>
                          <span>{remain >= 0 ? `Còn ${remain} ngày` : 'Sắp kết thúc'}</span>
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
