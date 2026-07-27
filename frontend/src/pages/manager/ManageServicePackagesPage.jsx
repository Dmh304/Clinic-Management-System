import { useEffect, useRef, useState } from 'react'
import dayjs from 'dayjs'
import { Table, Tag, Button, Tooltip, Empty } from 'antd'
import { EditOutlined, StopOutlined, PlayCircleOutlined, DownloadOutlined, PlusOutlined } from '@ant-design/icons'
import { serviceService } from '../../services/serviceService'
import { pageTitle } from './managerTypography'

const INITIAL_FORM = {
  serviceName: '', description: '', price: '', benefits: '', sessionsIncluded: '', validityDays: '',
  durationMinutes: '', badge: '', thumbnailUrl: '', content: '', serviceType: 'CARE', isActive: true, displayOrder: '', isPopular: false,
}

const PAGE_SIZE = 10

const PKG_ICONS = [
  [/thiền/i, '🧘'],
  [/massage/i, '💆'],
  [/công nghệ|thư giãn/i, '💧'],
  [/phục hồi/i, '👁️'],
  [/toàn diện/i, '🌿'],
]
function iconFor(name) {
  const hit = PKG_ICONS.find(([re]) => re.test(name || ''))
  return hit ? hit[1] : '📦'
}

// Xuất danh sách gói đang xem ra CSV — thao tác thật, chạy hoàn toàn phía client.
function exportCsv(rows) {
  const header = ['Tên gói', 'Loại', 'Giá', 'Số buổi', 'Hiệu lực (ngày)', 'Người đăng ký', 'Trạng thái']
  const lines = rows.map(p => [
    p.serviceName, p.serviceType === 'CLINICAL' ? 'Khám lâm sàng' : 'Chăm sóc',
    p.price ?? '', p.sessionsIncluded ?? '', p.validityDays ?? '', p.subscriberCount ?? 0,
    p.isActive ? 'Đang bán' : 'Đã ẩn',
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','))
  const csv = '﻿' + [header.join(','), ...lines].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `goi-dich-vu-${dayjs().format('YYYY-MM-DD')}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ManageServicePackagesPage() {
  const [packages, setPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null) // null | 'create' | 'edit'
  const [form, setForm] = useState(INITIAL_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState({}) // các field bị lỗi để tô viền đỏ
  const [statusFilter, setStatusFilter] = useState('all') // all | active | hidden
  const [uploading, setUploading] = useState(false)
  const [page, setPage] = useState(1)
  const fileInputRef = useRef(null)

  // silent=true dùng khi refetch sau thêm/sửa/ngừng bán — không hiện lại màn hình
  // "Đang tải..." toàn trang (vốn làm mất vị trí cuộn, trông như bị nhảy về đầu trang).
  const fetchPackages = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      // Lấy tất cả gói (kể cả đã ẩn) để manager có thể khôi phục gói đã ẩn
      const res = await serviceService.getAllPackages()
      setPackages(res.data || [])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // Tải danh sách khi mở trang (mẫu fetch-on-mount tiêu chuẩn)
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchPackages() }, [])

  const openCreate = () => { setForm(INITIAL_FORM); setEditingId(null); setModal('edit'); setError(''); setFieldErrors({}) }
  const openEdit = (pkg) => {
    setForm({ 
      ...INITIAL_FORM, 
      ...pkg, 
      price: pkg.price || '', 
      sessionsIncluded: pkg.sessionsIncluded || '', 
      validityDays: pkg.validityDays || '',
      displayOrder: pkg.displayOrder ?? '',
      isPopular: pkg.isPopular ?? false
    })
    setEditingId(pkg.id)
    setModal('edit')
    setError('')
    setFieldErrors({})
  }

  // Cập nhật form đồng thời xoá viền đỏ của field khi user bắt đầu sửa
  const handleFieldChange = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    if (fieldErrors[key]) setFieldErrors(fe => { const next = { ...fe }; delete next[key]; return next })
  }

  // Upload ảnh đại diện (kéo-thả hoặc chọn file) -> lưu URL trả về vào form.thumbnailUrl
  const handleImageUpload = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('File phải là ảnh'); return }
    setUploading(true)
    setError('')
    try {
      const res = await serviceService.uploadImage(file)
      handleFieldChange('thumbnailUrl', res.data?.url || '')
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi tải ảnh')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    // Validate phía client: chặn lưu khi dữ liệu sai + tô viền đỏ field lỗi (E-1)
    const errs = {}
    if (!form.serviceName) errs.serviceName = true
    if (!form.description) errs.description = true
    if (!(Number(form.price) > 0)) errs.price = true
    if (!(Number(form.durationMinutes) >= 1)) errs.durationMinutes = true
    if (!(Number(form.sessionsIncluded) >= 1)) errs.sessionsIncluded = true
    if (!form.thumbnailUrl) errs.thumbnailUrl = true
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      if (errs.serviceName) return setError('Tên gói là bắt buộc')
      if (errs.description) return setError('Vui lòng nhập mô tả')
      if (errs.price) return setError('Giá phải lớn hơn 0')
      if (errs.durationMinutes) return setError('Thời lượng phải lớn hơn 0')
      if (errs.sessionsIncluded) return setError('Số buổi phải ít nhất 1')
      return setError('Vui lòng thêm ảnh đại diện')
    }
    setFieldErrors({})
    setSaving(true)
    setError('')
    const payload = {
      ...form,
      displayOrder: (form.displayOrder === '' || form.displayOrder === null || form.displayOrder === undefined) ? null : Number(form.displayOrder)
    }
    try {
      if (editingId) {
        await serviceService.updatePackage(editingId, payload)
      } else {
        await serviceService.createPackage(payload)
      }
      setModal(null)
      fetchPackages(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  const handleToggle = async (id) => {
    try {
      await serviceService.toggleActive(id)
      fetchPackages(true)
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi')
    }
  }

  const changeStatusFilter = (v) => { setStatusFilter(v); setPage(1) }

  // Lọc theo trạng thái bán
  const filtered = packages.filter(p =>
    statusFilter === 'all' ? true : statusFilter === 'active' ? p.isActive : !p.isActive
  )

  // ---- Thống kê tổng quan — tất cả tính từ dữ liệu thật (không có số ảo) ----
  const activeCount = packages.filter(p => p.isActive).length
  const newThisMonth = packages.filter(p => p.createdAt && dayjs(p.createdAt).isSame(dayjs(), 'month')).length
  const totalSubscribers = packages.reduce((sum, p) => sum + (p.subscriberCount || 0), 0)
  const topPackage = packages.length
    ? packages.reduce((best, p) => (p.subscriberCount || 0) > (best.subscriberCount || 0) ? p : best, packages[0])
    : null

  const columns = [
    {
      title: 'Tên gói',
      key: 'name',
      render: (_, pkg) => (
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>
            {iconFor(pkg.serviceName)}
          </div>
          <div>
            <div style={{ fontWeight: 600, color: '#1e293b' }}>{pkg.serviceName}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{pkg.sessionsIncluded || '—'} buổi{pkg.isPopular ? ' • ★ Nổi bật' : ''}</div>
          </div>
        </div>
      ),
    },
    {
      title: 'Loại',
      key: 'type',
      render: (_, pkg) => <Tag color={pkg.serviceType === 'CLINICAL' ? 'blue' : 'green'}>{pkg.serviceType === 'CLINICAL' ? 'Khám lâm sàng' : 'Chăm sóc'}</Tag>,
    },
    {
      title: 'Giá',
      key: 'price',
      render: (_, pkg) => <span style={{ fontWeight: 600, color: '#2563eb' }}>{pkg.price ? Number(pkg.price).toLocaleString('vi-VN') + '₫' : '—'}</span>,
    },
    {
      title: 'Người đăng ký',
      key: 'subscribers',
      align: 'center',
      render: (_, pkg) => pkg.subscriberCount ?? 0,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, pkg) => <Tag color={pkg.isActive ? 'success' : 'default'}>{pkg.isActive ? 'Đang bán' : 'Đã ẩn'}</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, pkg) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Tooltip title="Sửa">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(pkg)} />
          </Tooltip>
          <Tooltip title={pkg.isActive ? 'Ngừng bán (ẩn khỏi trang dịch vụ)' : 'Bán lại (hiện trên trang dịch vụ)'}>
            <Button
              size="small"
              danger={pkg.isActive}
              icon={pkg.isActive ? <StopOutlined /> : <PlayCircleOutlined />}
              onClick={() => handleToggle(pkg.id)}
            />
          </Tooltip>
        </div>
      ),
    },
  ]

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Đang tải...</div>

  return (
    <div style={{ padding: 24 }}>
      <div style={{ maxWidth: 1180, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={pageTitle}>Quản lý gói dịch vụ</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Tạo và cập nhật các gói chăm sóc mắt</p>
          </div>
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            Tạo gói mới
          </Button>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 18px', flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Gói đang bán</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>{activeCount}</span>
              {newThisMonth > 0 && <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>+{newThisMonth} tháng này</span>}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 18px', flex: 1, minWidth: 200 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Tổng lượt đăng ký</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#1e293b' }}>{totalSubscribers}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Trên tất cả gói dịch vụ</div>
          </div>
          <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', padding: '16px 18px', flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 12, color: '#64748b', fontWeight: 600, marginBottom: 8 }}>Gói nổi bật nhất</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1e293b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {topPackage?.subscriberCount ? topPackage.serviceName : '—'}
            </div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
              {topPackage?.subscriberCount ? `${topPackage.subscriberCount} người đăng ký` : 'Chưa có dữ liệu'}
            </div>
          </div>
        </div>

        {/* Lọc trạng thái + Export */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 12, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>Lọc:</span>
            {[['all', 'Tất cả'], ['active', 'Đang bán'], ['hidden', 'Đã ẩn']].map(([v, label]) => (
              <button key={v} onClick={() => changeStatusFilter(v)}
                style={{
                  border: '1px solid', borderColor: statusFilter === v ? '#2563eb' : '#e2e8f0',
                  background: statusFilter === v ? '#eff6ff' : '#fff',
                  color: statusFilter === v ? '#2563eb' : '#64748b',
                  padding: '5px 12px', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                }}>{label}</button>
            ))}
          </div>
          <Button icon={<DownloadOutlined />} onClick={() => exportCsv(filtered)} disabled={filtered.length === 0}>
            Xuất CSV
          </Button>
        </div>

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={filtered}
            current={page}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              onChange: setPage,
              hideOnSinglePage: true,
              showTotal: (total, range) => `Hiển thị ${range[0]}-${range[1]} trên ${total} gói`,
            }}
            locale={{ emptyText: <Empty description="Không có gói nào" /> }}
          />
        </div>
      </div>

      {modal === 'edit' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <style>{`
            .svc-modal-scroll::-webkit-scrollbar { display: none; }
            .svc-modal-scroll { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div style={{ position: 'relative', width: '100%', maxWidth: 560 }}>
            <button
              type="button"
              onClick={() => setModal(null)}
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
            <div className="svc-modal-scroll" style={{ background: '#fff', borderRadius: 16, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{editingId ? 'Cập nhật gói dịch vụ' : 'Tạo gói dịch vụ mới'}</h2>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleSave}>
              {/* Loại dịch vụ: quyết định luồng khách hàng dùng (đặt lịch khám hoặc đăng ký tư vấn) */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Loại dịch vụ *</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[['CLINICAL', 'Khám lâm sàng (đặt lịch hẹn)'], ['CARE', 'Gói chăm sóc (đăng ký tư vấn)']].map(([v, label]) => (
                    <button key={v} type="button" onClick={() => handleFieldChange('serviceType', v)}
                      style={{
                        flex: 1, padding: '9px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        border: `1.5px solid ${form.serviceType === v ? '#2563eb' : '#d1d5db'}`,
                        background: form.serviceType === v ? '#eff6ff' : '#fff',
                        color: form.serviceType === v ? '#2563eb' : '#64748b',
                      }}>{label}</button>
                  ))}
                </div>
              </div>
              {[
                { key: 'serviceName', label: 'Tên gói *', type: 'text', required: true },
                { key: 'description', label: 'Mô tả *', type: 'textarea', required: true },
                { key: 'price', label: 'Giá (VNĐ) *', type: 'number', required: true, min: 1 },
                { key: 'sessionsIncluded', label: 'Số buổi *', type: 'number', required: true, min: 1 },
                { key: 'validityDays', label: 'Hiệu lực (ngày)', type: 'number', min: 1 },
                { key: 'durationMinutes', label: 'Thời lượng (phút) *', type: 'number', required: true, min: 1 },
                { key: 'badge', label: 'Nhãn nổi bật (vd: Phổ biến)', type: 'text' },
                { key: 'benefits', label: 'Lợi ích của gói (mỗi dòng một lợi ích, hiển thị khi khách xem chi tiết dịch vụ)', type: 'textarea', rows: 4 },
                { key: 'content', label: 'Chi tiết liệu trình (hiển thị khi khách xem chi tiết dịch vụ)', type: 'textarea', rows: 5 },
                { key: 'displayOrder', label: 'Thứ tự hiển thị', type: 'number' },
              ].map(field => (
                <div key={field.key} style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{field.label}</label>
                  {field.type === 'textarea' ? (
                    <textarea value={form[field.key] || ''} onChange={e => handleFieldChange(field.key, e.target.value)} rows={field.rows || 2}
                      style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${fieldErrors[field.key] ? '#ef4444' : '#d1d5db'}`, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                  ) : (
                    <>
                      <input type={field.type} value={form[field.key] ?? ''} onChange={e => handleFieldChange(field.key, e.target.value)}
                        required={field.required} min={field.min}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${fieldErrors[field.key] ? '#ef4444' : '#d1d5db'}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                      {field.key === 'displayOrder' && (
                        <span style={{ fontSize: 11, color: '#64748b', marginTop: 4, display: 'block' }}>
                          Để trống để tự động hiển thị ở cuối danh sách.
                        </span>
                      )}
                    </>
                  )}
                </div>
              ))}

              {/* Ảnh đại diện: kéo-thả hoặc bấm chọn, upload lên server và lưu URL */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Ảnh đại diện *</label>
                <div
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => { e.preventDefault(); handleImageUpload(e.dataTransfer.files?.[0]) }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${fieldErrors.thumbnailUrl ? '#ef4444' : '#cbd5e1'}`,
                    borderRadius: 10, padding: 16, textAlign: 'center', cursor: 'pointer', background: '#f8fafc',
                  }}>
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
                  <button type="button" onClick={() => handleFieldChange('thumbnailUrl', '')}
                    style={{ marginTop: 6, background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', padding: 0 }}>
                    Xoá ảnh
                  </button>
                )}
              </div>

              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="isPopular" checked={form.isPopular || false} onChange={e => setForm(f => ({ ...f, isPopular: e.target.checked }))} />
                <label htmlFor="isPopular" style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Đánh dấu là gói dịch vụ Nổi bật/Phổ biến (luôn đẩy lên đầu trang)</label>
              </div>
              <div style={{ marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" id="isActive" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} />
                <label htmlFor="isActive" style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Hiển thị (đang bán)</label>
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button type="button" onClick={() => setModal(null)} style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Huỷ</button>
                <button type="submit" disabled={saving} style={{ flex: 2, background: saving ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Tạo gói')}
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
