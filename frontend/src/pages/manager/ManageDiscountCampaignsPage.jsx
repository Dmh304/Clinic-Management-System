import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { Table, Tag, Button, Progress, Select, Empty, Tooltip, Modal, message } from 'antd'
import { EditOutlined, StopOutlined, PlusOutlined, GiftOutlined, ClockCircleOutlined, MailOutlined } from '@ant-design/icons'
import { discountService } from '../../services/discountService'

const INITIAL_FORM = {
  name: '', description: '', type: 'PERCENTAGE', value: '', voucherCode: '',
  validFrom: '', validTo: '', minPurchaseAmount: '', maxUsageCount: '', isActive: true,
  thumbnailUrl: '', content: '',
}

const TYPE_LABEL = { PERCENTAGE: 'Giảm %', FIXED_AMOUNT: 'Giảm tiền', VOUCHER: 'Mã voucher' }
const TYPE_COLOR = { PERCENTAGE: 'blue', FIXED_AMOUNT: 'purple', VOUCHER: 'gold' }
const STATUS_FILTERS = [
  { value: 'ALL', label: 'Tất cả trạng thái' },
  { value: 'ACTIVE', label: 'Đang hoạt động' },
  { value: 'INACTIVE', label: 'Không hoạt động' },
  { value: 'ENDING_SOON', label: 'Sắp hết hạn (≤7 ngày)' },
]

export default function ManageDiscountCampaignsPage() {
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [uploading, setUploading] = useState(false)
  const [broadcastingId, setBroadcastingId] = useState(null)
  const fileInputRef = useRef(null)

  const fetchCampaigns = async () => {
    setLoading(true)
    try {
      const res = await discountService.getAll()
      setCampaigns(res.data || [])
    } finally {
      setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchCampaigns() }, [])

  const openCreate = () => { setForm(INITIAL_FORM); setEditingId(null); setModal(true); setError('') }
  const openEdit = (c) => { setForm({ ...INITIAL_FORM, ...c }); setEditingId(c.id); setModal(true); setError('') }

  const handleSave = async (e) => {
    e.preventDefault()
    if (form.type === 'VOUCHER' && !form.voucherCode) return setError('Vui lòng nhập mã voucher')
    setSaving(true)
    setError('')
    try {
      if (editingId) {
        await discountService.update(editingId, form)
      } else {
        await discountService.create(form)
      }
      setModal(false)
      fetchCampaigns()
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = (id) => {
    Modal.confirm({
      title: 'Vô hiệu hoá chương trình này?',
      okText: 'Vô hiệu hoá',
      okButtonProps: { danger: true },
      cancelText: 'Huỷ',
      onOk: async () => {
        try {
          await discountService.delete(id)
          fetchCampaigns()
        } catch (err) {
          message.error(err.response?.data?.message || 'Lỗi')
        }
      },
    })
  }

  // Ảnh đại diện cho bài viết khuyến mãi công khai (kéo-thả hoặc chọn file) — cùng endpoint
  // upload đã dùng cho gói dịch vụ.
  const handleImageUpload = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { message.error('File phải là ảnh'); return }
    setUploading(true)
    try {
      const res = await discountService.uploadImage(file)
      setForm(p => ({ ...p, thumbnailUrl: res.data?.url || '' }))
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi tải ảnh')
    } finally {
      setUploading(false)
    }
  }

  // Gửi thông báo khuyến mãi hàng loạt — hành động không thu hồi được nên luôn xác nhận
  // rõ trước khi gửi thật.
  const handleBroadcast = (c) => {
    Modal.confirm({
      title: `Gửi thông báo "${c.name}" cho toàn bộ bệnh nhân?`,
      content: 'Hệ thống sẽ gửi email cho mọi bệnh nhân có email trong hệ thống và bắn thông báo trong app. Hành động này không thể thu hồi sau khi gửi.',
      okText: 'Gửi ngay',
      cancelText: 'Huỷ',
      onOk: async () => {
        setBroadcastingId(c.id)
        try {
          const res = await discountService.broadcastEmail(c.id)
          message.success(`Đã gửi ${res.data.sentCount}/${res.data.totalPatients} email thông báo`)
        } catch (err) {
          message.error(err.response?.data?.message || 'Lỗi khi gửi thông báo')
        } finally {
          setBroadcastingId(null)
        }
      },
    })
  }

  const fmtDate = (d) => d ? new Date(d).toLocaleDateString('vi-VN') : '—'
  const daysRemaining = (validTo) => dayjs(validTo).diff(dayjs().startOf('day'), 'day')
  const isActiveCampaign = (c) => {
    const today = new Date()
    return c.isActive && today >= new Date(c.validFrom) && today <= new Date(c.validTo)
  }

  // ---- Thống kê tổng quan — tất cả tính từ dữ liệu thật (không có số ảo) ----
  const activeCampaigns = campaigns.filter(isActiveCampaign)
  const totalRedemptions = campaigns.reduce((sum, c) => sum + (c.usedCount || 0), 0)
  const totalGranted = campaigns.reduce((sum, c) => sum + Number(c.totalDiscountGranted || 0), 0)
  const endingSoon = activeCampaigns.filter(c => daysRemaining(c.validTo) <= 7).sort((a, b) => daysRemaining(a.validTo) - daysRemaining(b.validTo))
  const topCampaign = campaigns.length
    ? campaigns.reduce((best, c) => (c.usedCount || 0) > (best.usedCount || 0) ? c : best, campaigns[0])
    : null

  const filteredCampaigns = campaigns.filter(c => {
    if (statusFilter === 'ACTIVE') return isActiveCampaign(c)
    if (statusFilter === 'INACTIVE') return !isActiveCampaign(c)
    if (statusFilter === 'ENDING_SOON') return isActiveCampaign(c) && daysRemaining(c.validTo) <= 7
    return true
  })

  const columns = [
    {
      title: 'Tên chương trình',
      key: 'name',
      render: (_, c) => (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f5f3ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#7c3aed', flexShrink: 0 }}>
            <GiftOutlined />
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>{c.name}</div>
            {c.voucherCode && <div style={{ fontSize: 12, color: '#2563eb' }}>Mã: {c.voucherCode}</div>}
          </div>
        </div>
      ),
    },
    {
      title: 'Loại',
      key: 'type',
      render: (_, c) => <Tag color={TYPE_COLOR[c.type]}>{TYPE_LABEL[c.type]}</Tag>,
    },
    {
      title: 'Giá trị giảm',
      key: 'value',
      render: (_, c) => <span style={{ fontWeight: 700, color: '#dc2626' }}>{c.type === 'PERCENTAGE' ? `${c.value}%` : `${Number(c.value).toLocaleString('vi-VN')}₫`}</span>,
    },
    {
      title: 'Hiệu lực',
      key: 'validity',
      render: (_, c) => {
        const remain = daysRemaining(c.validTo)
        return (
          <div>
            <div style={{ fontSize: 13, color: '#64748b' }}>{fmtDate(c.validFrom)} → {fmtDate(c.validTo)}</div>
            {isActiveCampaign(c) && (
              <div style={{ fontSize: 12, color: remain <= 7 ? '#dc2626' : '#94a3b8', marginTop: 2 }}>
                {remain >= 0 ? `Còn ${remain} ngày` : 'Đã hết hạn'}
              </div>
            )}
          </div>
        )
      },
    },
    {
      title: 'Lượt dùng',
      key: 'usage',
      render: (_, c) => (
        <div style={{ minWidth: 90 }}>
          <div style={{ fontSize: 13, marginBottom: 2 }}>{c.usedCount}{c.maxUsageCount ? `/${c.maxUsageCount}` : ''}</div>
          {c.maxUsageCount ? <Progress percent={Math.min(100, Math.round((c.usedCount / c.maxUsageCount) * 100))} showInfo={false} size="small" strokeColor="#7c3aed" /> : null}
        </div>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, c) => <Tag color={isActiveCampaign(c) ? 'success' : 'default'}>{isActiveCampaign(c) ? 'Đang hoạt động' : 'Không hoạt động'}</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, c) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Tooltip title="Gửi thông báo qua email + trong app">
            <Button size="small" icon={<MailOutlined />} loading={broadcastingId === c.id} onClick={() => handleBroadcast(c)} />
          </Tooltip>
          <Tooltip title="Sửa">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(c)} />
          </Tooltip>
          <Tooltip title="Vô hiệu hoá">
            <Button size="small" danger icon={<StopOutlined />} onClick={() => handleDelete(c.id)} />
          </Tooltip>
        </div>
      ),
    },
  ]

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 6 }}>Quản lý ▸ Chương trình khuyến mãi</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Chương trình khuyến mãi</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Quản lý ưu đãi, giảm giá theo mùa và chương trình tri ân khách hàng</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tạo chương trình
          </Button>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 18px', flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Đang hoạt động</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>{activeCampaigns.length}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>trên {campaigns.length} chương trình</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 18px', flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Tổng lượt sử dụng</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>{totalRedemptions}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 18px', flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Sắp hết hạn (≤7 ngày)</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: endingSoon.length > 0 ? '#dc2626' : '#1e293b' }}>{endingSoon.length}</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 18px', flex: 1, minWidth: 180 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Tổng đã giảm</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: '#16a34a' }}>{totalGranted.toLocaleString('vi-VN')}₫</div>
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', borderBottom: '1px solid #e2e8f0', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>Đang hoạt động &amp; Đã lên lịch</div>
            <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 220 }} options={STATUS_FILTERS} />
          </div>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filteredCampaigns}
            pagination={{ pageSize: 10, hideOnSinglePage: true, showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trên ${total} chương trình` }}
            locale={{ emptyText: <Empty description="Không có chương trình nào" /> }}
          />
        </div>

        {/* Chương trình nổi bật + sắp hết hạn — số liệu thật từ dữ liệu hiện có */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div style={{ background: '#1d4ed8', borderRadius: 12, padding: 20, color: '#fff' }}>
            <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600, marginBottom: 8, textTransform: 'uppercase' }}>Chương trình hiệu quả nhất</div>
            {topCampaign?.usedCount ? (
              <>
                <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{topCampaign.name}</div>
                <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 14 }}>{topCampaign.usedCount} lượt sử dụng — {Number(topCampaign.totalDiscountGranted || 0).toLocaleString('vi-VN')}₫ đã giảm</div>
                <Button onClick={() => openEdit(topCampaign)} style={{ background: '#fff', color: '#1d4ed8', border: 'none', fontWeight: 600 }}>
                  Xem chi tiết
                </Button>
              </>
            ) : (
              <div style={{ fontSize: 13, opacity: 0.85 }}>Chưa có chương trình nào được sử dụng.</div>
            )}
          </div>

          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 12, textTransform: 'uppercase' }}>
              <ClockCircleOutlined /> Sắp hết hạn
            </div>
            {endingSoon.length === 0 ? (
              <div style={{ fontSize: 13, color: '#94a3b8' }}>Không có chương trình nào sắp hết hạn trong 7 ngày tới.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {endingSoon.slice(0, 3).map(c => (
                  <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{c.name}</span>
                    <Tag color="red">Còn {daysRemaining(c.validTo)} ngày</Tag>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {modal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <style>{`
            .dc-modal-scroll::-webkit-scrollbar { display: none; }
            .dc-modal-scroll { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div style={{ position: 'relative', width: '100%', maxWidth: 520 }}>
            <button
              type="button"
              onClick={() => setModal(false)}
              aria-label="Đóng"
              style={{
                position: 'absolute', top: -44, right: 0, width: 36, height: 36, borderRadius: '50%',
                border: 'none', background: '#fff', color: '#1e293b', fontSize: 17, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
                boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
              }}
            >
              ✕
            </button>
            <div className="dc-modal-scroll" style={{ background: '#fff', borderRadius: 16, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{editingId ? 'Chỉnh sửa' : 'Tạo chương trình giảm giá'}</h2>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleSave}>
              {[
                { key: 'name', label: 'Tên chương trình *', type: 'text', required: true },
                { key: 'description', label: 'Mô tả', type: 'textarea' },
              ].map(f => (
                <div key={f.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{f.label}</label>
                  {f.type === 'textarea'
                    ? <textarea value={form[f.key] || ''} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} rows={2} style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                    : <input type="text" value={form[f.key] || ''} required={f.required} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  }
                </div>
              ))}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Loại giảm giá *</label>
                <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))} required
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none' }}>
                  <option value="PERCENTAGE">Giảm theo %</option>
                  <option value="FIXED_AMOUNT">Giảm tiền cố định</option>
                  <option value="VOUCHER">Mã voucher</option>
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Giá trị giảm *</label>
                  <input type="number" value={form.value} onChange={e => setForm(p => ({ ...p, value: e.target.value }))} required min="0.01" step="0.01" placeholder={form.type === 'PERCENTAGE' ? '10 (%)' : '50000 (đ)'}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                {(form.type === 'VOUCHER') && (
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Mã voucher *</label>
                    <input type="text" value={form.voucherCode || ''} onChange={e => setForm(p => ({ ...p, voucherCode: e.target.value }))} placeholder="VD: SUMMER2025"
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                  </div>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Từ ngày *</label>
                  <input type="date" value={form.validFrom || ''} onChange={e => setForm(p => ({ ...p, validFrom: e.target.value }))} required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Đến ngày *</label>
                  <input type="date" value={form.validTo || ''} onChange={e => setForm(p => ({ ...p, validTo: e.target.value }))} required
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Đơn hàng tối thiểu (đ)</label>
                  <input type="number" value={form.minPurchaseAmount || ''} onChange={e => setForm(p => ({ ...p, minPurchaseAmount: e.target.value }))} min="0"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Giới hạn lượt dùng</label>
                  <input type="number" value={form.maxUsageCount || ''} onChange={e => setForm(p => ({ ...p, maxUsageCount: e.target.value }))} min="1" placeholder="Để trống = không giới hạn"
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              </div>
              {/* Ảnh đại diện + nội dung chi tiết — dùng cho trang bài viết khuyến mãi công khai /promotions */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Ảnh đại diện</label>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleImageUpload(e.dataTransfer.files?.[0]) }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: '2px dashed #cbd5e1', borderRadius: 10, padding: 16, textAlign: 'center', cursor: 'pointer', background: '#f8fafc' }}>
                  {uploading ? (
                    <div style={{ color: '#2563eb', fontSize: 13, fontWeight: 600 }}>Đang tải ảnh...</div>
                  ) : form.thumbnailUrl ? (
                    <img src={form.thumbnailUrl} alt="Ảnh đại diện" style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 8 }} />
                  ) : (
                    <div style={{ color: '#94a3b8', fontSize: 13 }}>Kéo &amp; thả ảnh vào đây, hoặc bấm để chọn</div>
                  )}
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={e => handleImageUpload(e.target.files?.[0])} />
                </div>
                {form.thumbnailUrl && !uploading && (
                  <button type="button" onClick={() => setForm(p => ({ ...p, thumbnailUrl: '' }))}
                    style={{ marginTop: 6, background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                    Xoá ảnh
                  </button>
                )}
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Nội dung chi tiết (hiển thị ở trang khuyến mãi công khai)</label>
                <textarea value={form.content || ''} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={5}
                  placeholder="Mô tả chi tiết điều kiện áp dụng, quyền lợi, cách sử dụng..."
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="isActiveDC" checked={form.isActive} onChange={e => setForm(p => ({ ...p, isActive: e.target.checked }))} />
                <label htmlFor="isActiveDC" style={{ fontSize: 13, fontWeight: 600 }}>Kích hoạt ngay</label>
              </div>
              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setModal(false)} style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Huỷ</button>
                <button type="submit" disabled={saving} style={{ flex: 2, background: saving ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Tạo')}
                </button>
              </div>
            </form>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
