import { useEffect, useState } from 'react'
import { Table, Tag, Button, Tooltip, Empty } from 'antd'
import { EditOutlined, StarFilled, StarOutlined, UploadOutlined } from '@ant-design/icons'
import { doctorService } from '../../services/doctorService'
import AvatarCropModal from '../../components/AvatarCropModal'
import { pageTitle } from './managerTypography'

const INITIAL_FORM = {
  fullName: '', academicTitle: '', specialization: '', department: '',
  phone: '', email: '', experienceYears: '', bio: '', achievements: '', careerHistory: '',
}

export default function ManageDoctorsPage() {
  const [doctors, setDoctors] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [togglingId, setTogglingId] = useState(null)
  const [avatarDoctor, setAvatarDoctor] = useState(null)

  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState(INITIAL_FORM)
  const [editingId, setEditingId] = useState(null)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const fetchDoctors = async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const res = await doctorService.getAllDoctors()
      setDoctors(res.data || [])
    } finally {
      if (!silent) setLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchDoctors() }, [])

  const handleAvatarSave = async (blob) => {
    const file = new File([blob], `doctor-${avatarDoctor.id}-avatar.jpg`, { type: 'image/jpeg' })
    const uploadRes = await doctorService.uploadAvatar(file)
    const url = uploadRes.data?.url || ''
    await doctorService.updateAvatar(avatarDoctor.id, url)
    await fetchDoctors(true)
  }

  const handleToggleFeatured = async (doctor) => {
    setTogglingId(doctor.id)
    setError('')
    try {
      await doctorService.updateFeatured(doctor.id, !doctor.featured)
      await fetchDoctors(true)
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi cập nhật')
    } finally {
      setTogglingId(null)
    }
  }

  const openEdit = (doctor) => {
    setForm({
      fullName: doctor.fullName || '',
      academicTitle: doctor.academicTitle || '',
      specialization: doctor.specialization || '',
      department: doctor.department || '',
      phone: doctor.phone || '',
      email: doctor.email || '',
      experienceYears: doctor.experienceYears ?? '',
      bio: doctor.bio || '',
      achievements: doctor.achievements || '',
      careerHistory: doctor.careerHistory || '',
    })
    setEditingId(doctor.id)
    setModalOpen(true)
    setFormError('')
  }

  const handleFieldChange = (key, value) => setForm(f => ({ ...f, [key]: value }))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.fullName.trim()) { setFormError('Họ tên là bắt buộc'); return }
    setSaving(true)
    setFormError('')
    const payload = {
      ...form,
      experienceYears: form.experienceYears === '' ? null : Number(form.experienceYears),
    }
    try {
      await doctorService.updateDoctor(editingId, payload)
      setModalOpen(false)
      fetchDoctors(true)
    } catch (err) {
      setFormError(err.response?.data?.message || 'Lỗi khi lưu')
    } finally {
      setSaving(false)
    }
  }

  const columns = [
    {
      title: 'Ảnh',
      key: 'avatar',
      render: (_, d) => (
        <div style={{
          width: 44, height: 44, borderRadius: 10, background: '#eef2ff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, overflow: 'hidden',
        }}>
          {d.avatarUrl
            ? <img src={d.avatarUrl} alt={d.fullName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '👨‍⚕️'}
        </div>
      ),
    },
    {
      title: 'Bác sĩ',
      key: 'name',
      render: (_, d) => (
        <div>
          <div style={{ fontWeight: 600, color: '#1e293b' }}>{d.fullName}</div>
          {d.academicTitle && <div style={{ fontSize: 12, color: '#64748b' }}>{d.academicTitle}</div>}
        </div>
      ),
    },
    { title: 'Chuyên khoa', key: 'specialization', render: (_, d) => d.specialization || '—' },
    { title: 'Khoa', key: 'department', render: (_, d) => d.department || '—' },
    { title: 'Kinh nghiệm', key: 'experience', render: (_, d) => (d.experienceYears != null ? `${d.experienceYears} năm` : '—') },
    {
      title: 'Nổi bật',
      key: 'featured',
      align: 'center',
      render: (_, d) => <Tag color={d.featured ? 'gold' : 'default'}>{d.featured ? 'Đang hiển thị' : 'Đã ẩn'}</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'action',
      render: (_, d) => (
        <div style={{ display: 'flex', gap: 6 }}>
          <Tooltip title="Đổi ảnh đại diện">
            <Button size="small" icon={<UploadOutlined />} onClick={() => setAvatarDoctor(d)} />
          </Tooltip>
          <Tooltip title="Sửa thông tin">
            <Button size="small" icon={<EditOutlined />} onClick={() => openEdit(d)} />
          </Tooltip>
          <Tooltip title={d.featured ? 'Bỏ khỏi khối "Bác sĩ - Chuyên gia" ở trang chủ' : 'Hiển thị ở khối "Bác sĩ - Chuyên gia" trên trang chủ'}>
            <Button
              size="small"
              icon={d.featured ? <StarFilled style={{ color: '#eab308' }} /> : <StarOutlined />}
              loading={togglingId === d.id}
              onClick={() => handleToggleFeatured(d)}
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
        <div style={{ marginBottom: 24 }}>
          <h1 style={pageTitle}>Quản lý bác sĩ</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
            Cập nhật hồ sơ bác sĩ và chọn bác sĩ hiển thị ở khối "Bác sĩ - Chuyên gia" trên trang chủ
          </p>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}

        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <Table
            rowKey="id"
            columns={columns}
            dataSource={doctors}
            pagination={false}
            locale={{ emptyText: <Empty description="Không có bác sĩ nào" /> }}
          />
        </div>
      </div>

      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <style>{`
            .doctor-modal-scroll::-webkit-scrollbar { display: none; }
            .doctor-modal-scroll { scrollbar-width: none; -ms-overflow-style: none; }
          `}</style>
          <div style={{ position: 'relative', width: '100%', maxWidth: 560 }}>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
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
            <div className="doctor-modal-scroll" style={{ background: '#fff', borderRadius: 16, padding: 28, maxHeight: '90vh', overflowY: 'auto' }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700, color: '#1e293b' }}>Cập nhật thông tin bác sĩ</h2>
              {formError && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{formError}</div>}
              <form onSubmit={handleSave}>
                {[
                  { key: 'fullName', label: 'Họ tên *', type: 'text', required: true },
                  { key: 'academicTitle', label: 'Học hàm/học vị (vd: Thạc sĩ, Bác sĩ)', type: 'text' },
                  { key: 'specialization', label: 'Chuyên khoa', type: 'text' },
                  { key: 'department', label: 'Khoa', type: 'text' },
                  { key: 'experienceYears', label: 'Số năm kinh nghiệm', type: 'number', min: 0 },
                  { key: 'phone', label: 'Số điện thoại', type: 'text' },
                  { key: 'email', label: 'Email', type: 'text' },
                  { key: 'bio', label: 'Giới thiệu (hiển thị ở trang chi tiết bác sĩ)', type: 'textarea', rows: 3 },
                  { key: 'achievements', label: 'Thành tựu chuyên môn (mỗi dòng một mục)', type: 'textarea', rows: 4 },
                  { key: 'careerHistory', label: 'Quá trình học tập và công tác (mỗi dòng dạng: Mốc thời gian|Nội dung)', type: 'textarea', rows: 4 },
                ].map(field => (
                  <div key={field.key} style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>{field.label}</label>
                    {field.type === 'textarea' ? (
                      <textarea value={form[field.key]} onChange={e => handleFieldChange(field.key, e.target.value)} rows={field.rows || 2}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
                    ) : (
                      <input type={field.type} value={form[field.key]} onChange={e => handleFieldChange(field.key, e.target.value)}
                        required={field.required} min={field.min}
                        style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
                    )}
                  </div>
                ))}

                <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                  <button type="button" onClick={() => setModalOpen(false)} style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Huỷ</button>
                  <button type="submit" disabled={saving} style={{ flex: 2, background: saving ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                    {saving ? 'Đang lưu...' : 'Cập nhật'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {avatarDoctor && (
        <AvatarCropModal
          onClose={() => setAvatarDoctor(null)}
          onSave={handleAvatarSave}
          title={`Ảnh đại diện — ${avatarDoctor.fullName}`}
        />
      )}
    </div>
  )
}
