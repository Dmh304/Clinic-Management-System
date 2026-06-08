import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import blogService from '../services/blogService'

const s = {
  page: { fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', minHeight: '100vh', backgroundColor: '#f8fafc' },
  container: { maxWidth: 780, margin: '0 auto', padding: '40px 24px 80px' },
  backLink: { display: 'inline-flex', alignItems: 'center', gap: 6, color: '#1d4ed8', fontSize: 14, textDecoration: 'none', marginBottom: 28, fontWeight: 500 },
  title: { fontSize: 34, fontWeight: 800, color: '#111827', margin: '0 0 16px', lineHeight: 1.25 },
  meta: { display: 'flex', alignItems: 'center', gap: 20, fontSize: 13, color: '#94a3b8', marginBottom: 28, paddingBottom: 24, borderBottom: '1px solid #e2e8f0' },
  coverImg: { width: '100%', borderRadius: 16, marginBottom: 36, maxHeight: 420, objectFit: 'cover' },
  content: { fontSize: 16, lineHeight: 1.85, color: '#374151', whiteSpace: 'pre-wrap' },
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

export default function BlogDetailPage() {
  const { id } = useParams()
  const [blog, setBlog] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    blogService.getBlogById(id)
      .then(data => setBlog(data))
      .catch(() => setError('Bài viết không tồn tại hoặc đã bị xóa.'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div style={s.page}><div style={s.loading}>Đang tải bài viết...</div></div>

  if (error) {
    return (
      <div style={s.page}>
        <div style={s.error}>
          <div style={s.errorIcon}>😕</div>
          <div style={s.errorText}>{error}</div>
          <Link to="/blogs" style={s.errorLink}>← Quay lại danh sách bài viết</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={s.page}>
      <div style={s.container}>
        <Link to="/blogs" style={s.backLink}>← Quay lại Tin tức</Link>

        <h1 style={s.title}>{blog.title}</h1>

        <div style={s.meta}>
          <span>✍️ {blog.author || 'Ban biên tập'}</span>
          <span>📅 {formatDate(blog.publishedAt)}</span>
        </div>

        {blog.thumbnailUrl && (
          <img src={blog.thumbnailUrl} alt={blog.title} style={s.coverImg} />
        )}

        <div style={s.content}>{blog.content}</div>
      </div>
    </div>
  )
}
