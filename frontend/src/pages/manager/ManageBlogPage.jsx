import { useEffect, useRef, useState } from 'react'
import { FiFileText, FiCheckCircle, FiEdit3, FiEye, FiTrash2, FiPlus } from 'react-icons/fi'
import blogService from '../../services/blogService'

const PAGE_SIZE = 10

const INITIAL_FORM = { title: '', content: '', thumbnailUrl: '', categoryId: '', status: 'DRAFT' }

const STATUS_META = {
  PUBLISHED: { label: 'Đã xuất bản', bg: '#dcfce7', color: '#15803d' },
  DRAFT: { label: 'Nháp', bg: '#ede9fe', color: '#7c3aed' },
  ARCHIVED: { label: 'Lưu trữ', bg: '#f1f5f9', color: '#64748b' },
}

const CATEGORY_COLORS = [
  { bg: '#dbeafe', color: '#1d4ed8' },
  { bg: '#ede9fe', color: '#7c3aed' },
  { bg: '#dcfce7', color: '#15803d' },
  { bg: '#fef3c7', color: '#b45309' },
  { bg: '#fce7f3', color: '#be185d' },
]

function categoryColor(name) {
  if (!name) return { bg: '#f1f5f9', color: '#64748b' }
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0
  return CATEGORY_COLORS[hash % CATEGORY_COLORS.length]
}

function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function initials(name) {
  return (name || '?').trim().split(/\s+/).slice(-1)[0]?.[0]?.toUpperCase() ?? '?'
}

function StatCard({ Icon, iconBg, label, value, sub, progress }) {
  return (
    <div style={{ flex: '1 1 200px', minWidth: 200, background: '#fff', borderRadius: 16, padding: '18px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9' }}>
      <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
        <Icon size={17} color="#334155" />
      </div>
      <div style={{ color: '#94a3b8', fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', marginTop: 4 }}>{value}</div>
      {progress != null && (
        <div style={{ marginTop: 10, height: 6, borderRadius: 999, background: '#f1f5f9', overflow: 'hidden' }}>
          <div style={{ width: `${progress}%`, height: '100%', background: '#15803d', borderRadius: 999 }} />
        </div>
      )}
      {sub && <div style={{ color: '#94a3b8', fontSize: 12.5, marginTop: progress != null ? 8 : 6 }}>{sub}</div>}
    </div>
  )
}

export default function ManageBlogPage() {
  const [blogs, setBlogs] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [sortOrder, setSortOrder] = useState('newest') // newest | oldest
  const [page, setPage] = useState(1)

  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(INITIAL_FORM)
  const [fieldErrors, setFieldErrors] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  const fetchBlogs = () => {
    setLoading(true)
    blogService.getAllForManager()
      .then(data => setBlogs(Array.isArray(data) ? data : []))
      .catch(() => setBlogs([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchBlogs()
    blogService.getCategories()
      .then(data => setCategories(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [])

  useEffect(() => { setPage(1) }, [categoryFilter, statusFilter])

  const openCreate = () => {
    setForm(INITIAL_FORM)
    setEditingId(null)
    setFieldErrors({})
    setError('')
    setModalOpen(true)
  }

  const openEdit = (blog) => {
    setForm({
      title: blog.title || '',
      content: blog.content || '',
      thumbnailUrl: blog.thumbnailUrl || '',
      categoryId: blog.categoryId ?? '',
      status: blog.status || 'DRAFT',
    })
    setEditingId(blog.id)
    setFieldErrors({})
    setError('')
    setModalOpen(true)
  }

  const handleFieldChange = (key, value) => {
    setForm(f => ({ ...f, [key]: value }))
    if (fieldErrors[key]) setFieldErrors(fe => { const next = { ...fe }; delete next[key]; return next })
  }

  const handleImageUpload = async (file) => {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('File phải là ảnh'); return }
    setUploading(true)
    setError('')
    try {
      const res = await blogService.uploadImage(file)
      handleFieldChange('thumbnailUrl', res.data?.url || '')
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi tải ảnh')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const errs = {}
    if (!form.title.trim()) errs.title = true
    if (!form.content.trim()) errs.content = true
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs)
      setError(errs.title ? 'Vui lòng nhập tiêu đề' : 'Vui lòng nhập nội dung')
      return
    }
    setFieldErrors({})
    setSaving(true)
    setError('')
    const payload = {
      title: form.title,
      content: form.content,
      thumbnailUrl: form.thumbnailUrl || null,
      categoryId: form.categoryId === '' ? null : Number(form.categoryId),
      status: form.status,
    }
    try {
      if (editingId) {
        await blogService.updateBlog(editingId, payload)
      } else {
        await blogService.createBlog(payload)
      }
      setModalOpen(false)
      fetchBlogs()
    } catch (err) {
      setError(err.response?.data?.message || 'Lỗi khi lưu bài viết')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (blog) => {
    if (!window.confirm(`Xoá vĩnh viễn bài viết "${blog.title}"? Hành động này không thể hoàn tác.`)) return
    try {
      await blogService.deleteBlog(blog.id)
      fetchBlogs()
    } catch (err) {
      alert(err.response?.data?.message || 'Lỗi khi xoá bài viết')
    }
  }

  const total = blogs.length
  const publishedCount = blogs.filter(b => b.status === 'PUBLISHED').length
  const draftCount = blogs.filter(b => b.status === 'DRAFT').length

  let filtered = blogs
    .filter(b => categoryFilter === 'all' ? true : b.categorySlug === categoryFilter)
    .filter(b => statusFilter === 'all' ? true : b.status === statusFilter)
  filtered = [...filtered].sort((a, b) => {
    const da = new Date(a.publishedAt || a.createdAt || 0).getTime()
    const db = new Date(b.publishedAt || b.createdAt || 0).getTime()
    return sortOrder === 'newest' ? db - da : da - db
  })

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div style={{ padding: 24 }}>
      {/* Breadcrumb + header */}
      <div style={{ fontSize: 13, color: '#94a3b8', marginBottom: 8 }}>
        CMS <span style={{ margin: '0 6px' }}>›</span>
        <span style={{ color: '#7c3aed', fontWeight: 600 }}>Quản lý bài viết</span>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#0f172a' }}>Quản lý bài viết nhãn khoa</h2>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Cập nhật tin tức và kiến thức chăm sóc mắt cho cộng đồng.</p>
        </div>
        <button onClick={openCreate} style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#2563eb', color: '#fff', border: 'none', padding: '11px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
          <FiPlus size={17} /> Thêm bài viết mới
        </button>
      </div>

      {/* Stat cards */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 24 }}>
        <StatCard Icon={FiFileText} iconBg="#dbeafe" label="Tổng bài viết" value={total} sub="Trên toàn hệ thống" />
        <StatCard Icon={FiCheckCircle} iconBg="#dcfce7" label="Đã xuất bản" value={publishedCount}
          progress={total > 0 ? Math.round((publishedCount / total) * 100) : 0} />
        <StatCard Icon={FiEdit3} iconBg="#ede9fe" label="Bản nháp" value={draftCount} sub="Cần biên tập thêm" />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 14 }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', background: '#fff', cursor: 'pointer' }}>
            <option value="all">Tất cả danh mục</option>
            {categories.map(c => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13, color: '#334155', background: '#fff', cursor: 'pointer' }}>
            <option value="all">Tất cả trạng thái</option>
            <option value="PUBLISHED">Đã xuất bản</option>
            <option value="DRAFT">Nháp</option>
            <option value="ARCHIVED">Lưu trữ</option>
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#64748b' }}>
          Sắp xếp theo:
          <select value={sortOrder} onChange={e => setSortOrder(e.target.value)}
            style={{ border: 'none', background: 'transparent', color: '#7c3aed', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <option value="newest">Ngày mới nhất</option>
            <option value="oldest">Ngày cũ nhất</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['Thumbnail', 'Tiêu đề bài viết', 'Danh mục', 'Tác giả', 'Trạng thái', 'Ngày đăng', 'Hành động'].map((h, i) => (
                <th key={h} style={{ padding: '11px 14px', textAlign: i === 6 ? 'right' : 'left', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.4 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Đang tải...</td></tr>
            )}
            {!loading && pageItems.length === 0 && (
              <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#94a3b8' }}>Không có bài viết nào</td></tr>
            )}
            {!loading && pageItems.map((blog, i) => {
              const statusMeta = STATUS_META[blog.status] || STATUS_META.DRAFT
              const catColor = categoryColor(blog.categoryName)
              return (
                <tr key={blog.id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafafa' }}>
                  <td style={{ padding: '10px 14px' }}>
                    {blog.thumbnailUrl ? (
                      <img src={blog.thumbnailUrl} alt={blog.title} style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: 10, background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>👁️</div>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', maxWidth: 260 }}>
                    <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13.5, lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{blog.title}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>ID: POST-{String(blog.id).padStart(5, '0')}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {blog.categoryName ? (
                      <span style={{ background: catColor.bg, color: catColor.color, fontSize: 11.5, fontWeight: 700, padding: '4px 10px', borderRadius: 999, whiteSpace: 'nowrap' }}>{blog.categoryName}</span>
                    ) : <span style={{ color: '#cbd5e1', fontSize: 12 }}>—</span>}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#e0e7ff', color: '#4338ca', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                        {initials(blog.author)}
                      </div>
                      <span style={{ fontSize: 13, color: '#334155' }}>{blog.author || 'Ẩn danh'}</span>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ background: statusMeta.bg, color: statusMeta.color, fontSize: 12, fontWeight: 700, padding: '4px 11px', borderRadius: 999, whiteSpace: 'nowrap' }}>
                      • {statusMeta.label}
                    </span>
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 13, color: '#475569', whiteSpace: 'nowrap' }}>
                    {formatDate(blog.publishedAt || blog.createdAt)}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button title="Xem" onClick={() => window.open(`/blogs/${blog.id}`, '_blank')}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 6 }}><FiEye size={16} /></button>
                      <button title="Sửa" onClick={() => openEdit(blog)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', padding: 6 }}><FiEdit3 size={16} /></button>
                      <button title="Xoá" onClick={() => handleDelete(blog)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: 6 }}><FiTrash2 size={16} /></button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && filtered.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 10 }}>
          <span style={{ fontSize: 13, color: '#64748b' }}>
            Hiển thị {(safePage - 1) * PAGE_SIZE + 1} - {Math.min(safePage * PAGE_SIZE, filtered.length)} trên tổng số {filtered.length} bài viết
          </span>
          <div style={{ display: 'flex', gap: 6 }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: safePage === 1 ? 'not-allowed' : 'pointer', opacity: safePage === 1 ? 0.4 : 1 }}>‹</button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .map((p, idx, arr) => (
                <span key={p} style={{ display: 'flex' }}>
                  {idx > 0 && arr[idx - 1] !== p - 1 && <span style={{ width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#cbd5e1' }}>…</span>}
                  <button onClick={() => setPage(p)}
                    style={{ width: 32, height: 32, borderRadius: 8, border: p === safePage ? '1px solid #2563eb' : '1px solid #e2e8f0', background: p === safePage ? '#2563eb' : '#fff', color: p === safePage ? '#fff' : '#475569', fontWeight: 600, cursor: 'pointer' }}>{p}</button>
                </span>
              ))}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
              style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: safePage === totalPages ? 'not-allowed' : 'pointer', opacity: safePage === totalPages ? 0.4 : 1 }}>›</button>
          </div>
        </div>
      )}

      {/* Create/Edit modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ margin: '0 0 20px', fontSize: 20, fontWeight: 700, color: '#1e293b' }}>{editingId ? 'Cập nhật bài viết' : 'Thêm bài viết mới'}</h2>
            {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{error}</div>}
            <form onSubmit={handleSave}>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Tiêu đề *</label>
                <input type="text" value={form.title} onChange={e => handleFieldChange('title', e.target.value)}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${fieldErrors.title ? '#ef4444' : '#d1d5db'}`, fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
              </div>

              <div style={{ display: 'flex', gap: 14, marginBottom: 14 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Danh mục</label>
                  <select value={form.categoryId} onChange={e => handleFieldChange('categoryId', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
                    <option value="">Không chọn</option>
                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Trạng thái</label>
                  <select value={form.status} onChange={e => handleFieldChange('status', e.target.value)}
                    style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: '1px solid #d1d5db', fontSize: 13, outline: 'none', boxSizing: 'border-box', background: '#fff' }}>
                    <option value="DRAFT">Nháp</option>
                    <option value="PUBLISHED">Đã xuất bản</option>
                    <option value="ARCHIVED">Lưu trữ</option>
                  </select>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 4 }}>Nội dung *</label>
                <textarea value={form.content} onChange={e => handleFieldChange('content', e.target.value)} rows={8}
                  style={{ width: '100%', padding: '8px 10px', borderRadius: 7, border: `1px solid ${fieldErrors.content ? '#ef4444' : '#d1d5db'}`, fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box' }} />
              </div>

              <div style={{ marginBottom: 18 }}>
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
                  <button type="button" onClick={() => handleFieldChange('thumbnailUrl', '')}
                    style={{ marginTop: 6, background: 'none', border: 'none', color: '#ef4444', fontSize: 12, cursor: 'pointer', padding: 0 }}>Xoá ảnh</button>
                )}
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button type="button" onClick={() => setModalOpen(false)} style={{ flex: 1, background: '#f1f5f9', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>Huỷ</button>
                <button type="submit" disabled={saving} style={{ flex: 2, background: saving ? '#93c5fd' : '#2563eb', color: '#fff', border: 'none', padding: '11px', borderRadius: 8, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
                  {saving ? 'Đang lưu...' : (editingId ? 'Cập nhật' : 'Tạo bài viết')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
