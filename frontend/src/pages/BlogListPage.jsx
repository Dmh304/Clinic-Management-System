import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import blogService from '../services/blogService'
import logoImg from '../assets/ECMS_Logo.png'

const PAGE_SIZE = 4 // 1 featured + 3 grid

const s = {
  page: { fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', backgroundColor: '#f8fafc', minHeight: '100vh' },
  container: { maxWidth: 1100, margin: '0 auto', padding: '48px 24px 80px' },

  /* heading */
  heading: { fontSize: 36, fontWeight: 800, color: '#111827', margin: '0 0 8px' },
  subtitle: { color: '#64748b', fontSize: 15, lineHeight: 1.65, marginBottom: 32, maxWidth: 520 },

  /* filter row */
  filterRow: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end', marginBottom: 28, flexWrap: 'wrap', gap: 12 },
  count: { fontSize: 13, color: '#94a3b8' },

  /* featured card */
  featured: {
    display: 'flex', borderRadius: 16, overflow: 'hidden',
    backgroundColor: '#fff', border: '1px solid #e2e8f0',
    boxShadow: '0 2px 10px rgba(0,0,0,0.06)', marginBottom: 24,
    minHeight: 280,
  },
  featuredImgWrap: { position: 'relative', width: '58%', flexShrink: 0 },
  featuredImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  featuredImgPlaceholder: { width: '100%', height: '100%', minHeight: 280, backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64, color: '#94a3b8' },
  featuredBadge: { position: 'absolute', top: 14, left: 14, backgroundColor: '#1d4ed8', color: '#fff', fontSize: 11, fontWeight: 700, padding: '4px 12px', borderRadius: 999, letterSpacing: 0.5 },
  featuredBody: { flex: 1, padding: '32px 32px 28px', display: 'flex', flexDirection: 'column', justifyContent: 'center' },
  featuredDate: { fontSize: 13, color: '#64748b', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 },
  featuredTitle: { fontSize: 26, fontWeight: 800, color: '#111827', margin: '0 0 12px', lineHeight: 1.3 },
  featuredSummary: { color: '#64748b', fontSize: 14, lineHeight: 1.75, marginBottom: 20 },
  readMoreLink: { display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1d4ed8', fontSize: 14, fontWeight: 600, textDecoration: 'none' },

  /* grid */
  grid: { display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, marginBottom: 40 },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column' },
  cardImgWrap: { width: '100%', height: 170, overflow: 'hidden', flexShrink: 0 },
  cardImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  cardImgPlaceholder: { width: '100%', height: '100%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#94a3b8' },
  cardBody: { padding: '16px 18px 20px', flex: 1, display: 'flex', flexDirection: 'column' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardDate: { fontSize: 12, color: '#94a3b8' },
  cardTitle: { fontSize: 15, fontWeight: 700, color: '#111827', margin: '0 0 8px', lineHeight: 1.4 },
  cardSummary: {
    color: '#64748b', fontSize: 13, lineHeight: 1.65, flex: 1, marginBottom: 14,
    display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden'
  },

  /* pagination */
  paginationWrap: { display: 'flex', justifyContent: 'center', gap: 6 },
  pageBtn: { width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pageBtnActive: { backgroundColor: '#1d4ed8', color: '#fff', border: '1px solid #1d4ed8' },
  pageBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },

  /* states */
  empty: { textAlign: 'center', padding: '60px 24px', color: '#94a3b8' },
  loading: { textAlign: 'center', padding: '60px 24px', color: '#64748b', fontSize: 15 },
  error: { textAlign: 'center', padding: '60px 24px', color: '#ef4444', fontSize: 14 },

  /* footer */
  footer: { backgroundColor: '#0f172a', color: '#94a3b8', padding: '40px 0' },
  footerInner: { maxWidth: 1280, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 },
  footerLogo: { display: 'flex', alignItems: 'center', gap: 8, color: '#fff', fontWeight: 700, fontSize: 16, marginBottom: 6 },
  footerCopy: { fontSize: 12, color: '#475569' },
  footerLinks: { display: 'flex', alignItems: 'center', gap: 24 },
  footerLink: { fontSize: 13, color: '#94a3b8', textDecoration: 'none' },
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('vi-VN', { day: '2-digit', month: 'long', year: 'numeric' })
}

function BlogCard({ blog }) {
  return (
    <div style={s.card}>
      <div style={s.cardImgWrap}>
        {blog.thumbnailUrl
          ? <img src={blog.thumbnailUrl} alt={blog.title} style={s.cardImg} />
          : <div style={s.cardImgPlaceholder}>👁️</div>
        }
      </div>
      <div style={s.cardBody}>
        <div style={s.cardMeta}>
          <span style={s.cardDate}>{formatDate(blog.publishedAt)}</span>
        </div>
        <h3 style={s.cardTitle}>{blog.title}</h3>
        <p style={s.cardSummary}>{blog.content}</p>
        <Link to={`/blogs/${blog.id}`} style={s.readMoreLink}>Đọc tiếp →</Link>
      </div>
    </div>
  )
}

export default function BlogListPage() {
  const [blogs, setBlogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)

  useEffect(() => {
    blogService.getAllBlogs()
      .then(data => setBlogs(Array.isArray(data) ? data : []))
      .catch(() => setError('Không thể tải danh sách bài viết. Vui lòng thử lại sau.'))
      .finally(() => setLoading(false))
  }, [])

  const totalPages = Math.max(1, Math.ceil(blogs.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = blogs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const featured = pageItems[0] || null
  const gridItems = pageItems.slice(1)

  return (
    <div style={s.page}>
      <div style={s.container}>
        <h1 style={s.heading}>Cẩm nang Sức khỏe Mắt</h1>
        <p style={s.subtitle}>
          Khám phá những kiến thức hữu ích, công nghệ điều trị tiên tiến và lời khuyên
          từ các chuyên gia hàng đầu để bảo vệ đôi mắt sáng khỏe cho bạn và gia đình.
        </p>

        <div style={s.filterRow}>
          {!loading && !error && (
            <span style={s.count}>Hiển thị <strong>{blogs.length}</strong> bài viết</span>
          )}
        </div>

        {loading && <div style={s.loading}>Đang tải bài viết...</div>}
        {error && <div style={s.error}>{error}</div>}

        {!loading && !error && blogs.length === 0 && (
          <div style={s.empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📰</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Chưa có bài viết nào</div>
            <div style={{ fontSize: 13 }}>Nội dung sẽ được cập nhật sớm.</div>
          </div>
        )}

        {!loading && !error && featured && (
          <>
            {/* Featured article */}
            <div style={s.featured}>
              <div style={s.featuredImgWrap}>
                {featured.thumbnailUrl
                  ? <img src={featured.thumbnailUrl} alt={featured.title} style={s.featuredImg} />
                  : <div style={s.featuredImgPlaceholder}>👁️</div>
                }
                <span style={s.featuredBadge}>NỔI BẬT</span>
              </div>
              <div style={s.featuredBody}>
                <div style={s.featuredDate}>
                  <span>📅</span>
                  <span>{formatDate(featured.publishedAt)}</span>
                </div>
                <h2 style={s.featuredTitle}>{featured.title}</h2>
                <p style={{ ...s.featuredSummary }}>{featured.content}</p>
                <Link to={`/blogs/${featured.id}`} style={s.readMoreLink}>Đọc tiếp →</Link>
              </div>
            </div>

            {/* Grid cards */}
            {gridItems.length > 0 && (
              <div style={s.grid}>
                {gridItems.map(blog => <BlogCard key={blog.id} blog={blog} />)}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={s.paginationWrap}>
                <button
                  style={safePage === 1 ? { ...s.pageBtn, ...s.pageBtnDisabled } : s.pageBtn}
                  onClick={() => safePage > 1 && setPage(safePage - 1)}
                  disabled={safePage === 1}
                >‹</button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                  const show = p === 1 || p === totalPages || Math.abs(p - safePage) <= 1
                  const showEllipsisBefore = p === safePage - 2 && safePage > 3
                  const showEllipsisAfter = p === safePage + 2 && safePage < totalPages - 2
                  if (showEllipsisBefore || showEllipsisAfter) {
                    return <span key={p} style={{ ...s.pageBtn, border: 'none', backgroundColor: 'transparent', cursor: 'default' }}>…</span>
                  }
                  if (!show) return null
                  return (
                    <button
                      key={p}
                      style={p === safePage ? { ...s.pageBtn, ...s.pageBtnActive } : s.pageBtn}
                      onClick={() => setPage(p)}
                    >{p}</button>
                  )
                })}

                <button
                  style={safePage === totalPages ? { ...s.pageBtn, ...s.pageBtnDisabled } : s.pageBtn}
                  onClick={() => safePage < totalPages && setPage(safePage + 1)}
                  disabled={safePage === totalPages}
                >›</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer */}
      <footer style={s.footer}>
        <div style={s.footerInner}>
          <div>
            <div style={s.footerLogo}>
              <img src={logoImg} alt="NHÃN KHOA ÁNH SAO" style={{ height: 44, width: 'auto' }} />
              NHÃN KHOA ÁNH SAO
            </div>
            <div style={s.footerCopy}>© 2024 Eyes Clinic Management System. All rights reserved.</div>
            <div style={{ ...s.footerCopy, marginTop: 2 }}>Chuyên nghiệp – Tin cậy – Tận tâm.</div>
          </div>
          <div style={s.footerLinks}>
            {['Privacy Policy', 'Terms of Service', 'Contact Support', 'Clinic Locations'].map(l => (
              <Link key={l} to="/" style={s.footerLink}>{l}</Link>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
