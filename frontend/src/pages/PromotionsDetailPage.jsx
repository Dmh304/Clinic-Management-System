import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { message } from 'antd'
import { discountService } from '../services/discountService'

const TYPE_LABEL = { PERCENTAGE: 'Giảm theo %', FIXED_AMOUNT: 'Giảm tiền cố định', VOUCHER: 'Mã voucher' }

const s = {
  page: { fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', minHeight: '100vh', backgroundColor: '#f8fafc' },
  container: { maxWidth: 780, margin: '0 auto', padding: '40px 24px 80px' },
  backLink: { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1d4ed8', fontSize: 14, textDecoration: 'none', marginBottom: 28, fontWeight: 500 },
  title: { fontSize: 34, fontWeight: 800, color: '#111827', margin: '0 0 12px', lineHeight: 1.25 },
  desc: { fontSize: 16, color: '#64748b', marginBottom: 20 },
  coverImg: { width: '100%', borderRadius: 16, marginBottom: 28, maxHeight: 380, objectFit: 'cover' },
  coverPlaceholder: { width: '100%', height: 220, borderRadius: 16, marginBottom: 28, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 },
  infoBox: { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 24, marginBottom: 28 },
  discountRow: { display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 16 },
  discountValue: { fontSize: 32, fontWeight: 800, color: '#dc2626' },
  discountType: { fontSize: 13, color: '#94a3b8', fontWeight: 600 },
  infoGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, fontSize: 14 },
  infoLabel: { fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 },
  infoValue: { fontWeight: 600, color: '#1e293b' },
  voucherBox: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 18, padding: '10px 14px', background: '#fffbeb', border: '1px dashed #f59e0b', borderRadius: 10 },
  voucherCode: { fontFamily: 'monospace', fontSize: 16, fontWeight: 700, color: '#92400e', letterSpacing: '0.05em' },
  copyBtn: { marginLeft: 'auto', background: '#f59e0b', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' },
  content: { fontSize: 16, lineHeight: 1.85, color: '#374151', whiteSpace: 'pre-wrap', marginBottom: 32 },
  cta: { display: 'inline-block', background: '#1d4ed8', color: '#fff', padding: '12px 28px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', fontSize: 15 },
  expiredBadge: { display: 'inline-block', background: '#f3f4f6', color: '#6b7280', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600, marginBottom: 16 },
  loading: { textAlign: 'center', padding: '80px 24px', color: '#64748b', fontSize: 16 },
  error: { textAlign: 'center', padding: '80px 24px' },
  errorIcon: { fontSize: 52, marginBottom: 16 },
  errorText: { fontSize: 18, fontWeight: 600, color: '#ef4444', marginBottom: 8 },
  errorLink: { color: '#1d4ed8', fontSize: 14, textDecoration: 'none', fontWeight: 500 },
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })
}

export default function PromotionsDetailPage() {
  const { id } = useParams()
  const [campaign, setCampaign] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    discountService.getById(id)
      .then(res => setCampaign(res.data))
      .catch(() => setError('Chương trình khuyến mãi không tồn tại hoặc đã kết thúc.'))
      .finally(() => setLoading(false))
  }, [id])

  const handleCopyCode = () => {
    if (!campaign?.voucherCode) return
    navigator.clipboard.writeText(campaign.voucherCode)
      .then(() => message.success('Đã sao chép mã voucher!'))
      .catch(() => message.error('Không thể sao chép, vui lòng tự nhập mã'))
  }

  if (loading) return <div style={s.page}><div style={s.loading}>Đang tải chương trình khuyến mãi...</div></div>

  if (error || !campaign) {
    return (
      <div style={s.page}>
        <div style={s.error}>
          <div style={s.errorIcon}>😕</div>
          <div style={s.errorText}>{error}</div>
          <Link to="/promotions" style={s.errorLink}>← Quay lại danh sách khuyến mãi</Link>
        </div>
      </div>
    )
  }

  const isExpired = new Date(campaign.validTo) < new Date()
  const discountText = campaign.type === 'PERCENTAGE'
    ? `${Number(campaign.value)}%`
    : `${Number(campaign.value).toLocaleString('vi-VN')}₫`

  return (
    <div style={s.page}>
      <div style={s.container}>
        <Link to="/promotions" style={s.backLink}>← Quay lại Khuyến mãi</Link>

        {isExpired && <div style={s.expiredBadge}>Đã kết thúc</div>}
        <h1 style={s.title}>{campaign.name}</h1>
        {campaign.description && <p style={s.desc}>{campaign.description}</p>}

        {campaign.thumbnailUrl
          ? <img src={campaign.thumbnailUrl} alt={campaign.name} style={s.coverImg} />
          : <div style={s.coverPlaceholder}>🎁</div>
        }

        <div style={s.infoBox}>
          <div style={s.discountRow}>
            <span style={s.discountValue}>-{discountText}</span>
            <span style={s.discountType}>{TYPE_LABEL[campaign.type]}</span>
          </div>
          <div style={s.infoGrid}>
            <div>
              <div style={s.infoLabel}>Hiệu lực</div>
              <div style={s.infoValue}>{formatDate(campaign.validFrom)} — {formatDate(campaign.validTo)}</div>
            </div>
            <div>
              <div style={s.infoLabel}>Đơn hàng tối thiểu</div>
              <div style={s.infoValue}>{campaign.minPurchaseAmount ? `${Number(campaign.minPurchaseAmount).toLocaleString('vi-VN')}₫` : 'Không giới hạn'}</div>
            </div>
          </div>

          {campaign.type === 'VOUCHER' && campaign.voucherCode && (
            <div style={s.voucherBox}>
              <span>🎟️</span>
              <span style={s.voucherCode}>{campaign.voucherCode}</span>
              <button onClick={handleCopyCode} style={s.copyBtn}>Sao chép</button>
            </div>
          )}
        </div>

        {campaign.content && <div style={s.content}>{campaign.content}</div>}

        <Link to="/services" style={s.cta}>Xem dịch vụ để áp dụng ngay →</Link>
      </div>
    </div>
  )
}
