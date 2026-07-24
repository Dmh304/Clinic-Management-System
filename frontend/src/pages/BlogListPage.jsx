import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import blogService from '../services/blogService'
import heroImg from '../assets/ECMS_background.png'
import ctaImg from '../assets/ECMS_Machine.png'
import Footer from '../components/layout/Footer'

const PAGE_SIZE = 4 // 2x2 grid

const s = {
  page: { fontFamily: 'system-ui, -apple-system, sans-serif', color: '#1e293b', backgroundColor: '#f8fafc', minHeight: '100vh' },
  container: { maxWidth: 1200, margin: '0 auto', padding: '0 24px' },

  /* hero banner */
  hero: {
    position: 'relative', minHeight: 200,
    display: 'flex', alignItems: 'center',
    backgroundImage: `url(${heroImg})`,
    backgroundSize: 'cover', backgroundPosition: 'center',
  },
  heroOverlay: { position: 'absolute', inset: 0, backgroundColor: 'rgba(10,20,50,0.6)' },
  heroContent: { position: 'relative', zIndex: 1, maxWidth: 1200, margin: '0 auto', padding: '40px 24px', width: '100%', boxSizing: 'border-box' },
  heroTitle: { fontSize: 32, fontWeight: 800, color: '#fff', margin: '0 0 12px', letterSpacing: 0.5 },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#e2e8f0' },
  breadcrumbLink: { color: '#e2e8f0', textDecoration: 'none' },
  breadcrumbSep: { color: '#94a3b8' },
  breadcrumbCurrent: { color: '#fff' },

  /* layout */
  layout: { display: 'flex', alignItems: 'flex-start', gap: 28, padding: '40px 0 64px' },

  /* sidebar */
  sidebar: { width: 260, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 20 },
  sidebarCard: { backgroundColor: '#fff', borderRadius: 14, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
  sidebarTitle: { display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, fontWeight: 700, color: '#111827', padding: '16px 18px', borderBottom: '1px solid #e2e8f0' },
  categoryItem: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%',
    padding: '13px 18px', fontSize: 14, color: '#334155', textDecoration: 'none',
    borderTop: 'none', borderLeft: 'none', borderRight: 'none', borderBottom: '1px solid #f1f5f9',
    backgroundColor: 'transparent', font: 'inherit', textAlign: 'left', cursor: 'pointer',
  },
  categoryItemActive: { backgroundColor: '#1d4ed8', color: '#fff', fontWeight: 600 },

  promoCard: { borderRadius: 14, overflow: 'hidden', boxShadow: '0 4px 14px rgba(29,78,216,0.18)' },
  promoBadge: { backgroundColor: '#0f172a', color: '#fff', fontSize: 11, fontWeight: 700, textAlign: 'center', padding: '8px 10px', letterSpacing: 0.5 },
  promoBody: { background: 'linear-gradient(160deg, #1d4ed8 0%, #0f172a 100%)', color: '#fff', padding: '22px 18px', textAlign: 'center' },
  promoTitle: { fontSize: 16, fontWeight: 800, lineHeight: 1.4, marginBottom: 4 },
  promoFooter: { backgroundColor: '#fff', padding: '16px 18px 20px', textAlign: 'center' },
  promoFooterTitle: { fontSize: 13, fontWeight: 700, color: '#111827' },
  promoFooterSub: { fontSize: 12, color: '#64748b', marginBottom: 14 },
  promoBtn: { display: 'inline-block', backgroundColor: '#1d4ed8', color: '#fff', fontSize: 13, fontWeight: 700, padding: '10px 22px', borderRadius: 999, textDecoration: 'none' },

  /* main content */
  main: { flex: 1, minWidth: 0 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20, marginBottom: 32 },
  card: { backgroundColor: '#fff', borderRadius: 14, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' },
  cardImgWrap: { width: '100%', height: 190, overflow: 'hidden', flexShrink: 0 },
  cardImg: { width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
  cardImgPlaceholder: { width: '100%', height: '100%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, color: '#94a3b8' },
  cardBody: { padding: '16px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column' },
  cardMeta: { display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#94a3b8', marginBottom: 10 },
  cardTitle: {
    fontSize: 17, fontWeight: 700, color: '#111827', margin: '0 0 10px', lineHeight: 1.4,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  cardSummary: {
    color: '#64748b', fontSize: 13.5, lineHeight: 1.65, flex: 1, marginBottom: 16,
    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
  },
  readMoreLink: { display: 'inline-flex', alignItems: 'center', gap: 4, color: '#1d4ed8', fontSize: 13.5, fontWeight: 700, textDecoration: 'none' },

  /* pagination */
  paginationWrap: { display: 'flex', justifyContent: 'center', gap: 6 },
  pageBtn: { width: 36, height: 36, borderRadius: 8, border: '1px solid #e2e8f0', backgroundColor: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  pageBtnActive: { backgroundColor: '#1d4ed8', color: '#fff', border: '1px solid #1d4ed8' },
  pageBtnDisabled: { opacity: 0.4, cursor: 'not-allowed' },

  /* states */
  empty: { textAlign: 'center', padding: '60px 24px', color: '#94a3b8' },
  loading: { textAlign: 'center', padding: '60px 24px', color: '#64748b', fontSize: 15 },
  error: { textAlign: 'center', padding: '60px 24px', color: '#ef4444', fontSize: 14 },

  /* bottom CTA */
  ctaSection: { background: 'linear-gradient(120deg, #1d4ed8 0%, #0f172a 100%)', padding: '56px 0' },
  ctaInner: { maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 40, flexWrap: 'wrap' },
  ctaText: { flex: 1, minWidth: 280 },
  ctaTitle: { fontSize: 28, fontWeight: 800, color: '#fff', margin: '0 0 14px', lineHeight: 1.3, maxWidth: 480 },
  ctaDesc: { color: '#cbd5e1', fontSize: 14, lineHeight: 1.7, marginBottom: 24, maxWidth: 460 },
  ctaBtns: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  ctaBtnPrimary: { display: 'inline-flex', alignItems: 'center', gap: 8, backgroundColor: '#0d9488', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none' },
  ctaBtnOutline: { display: 'inline-flex', alignItems: 'center', backgroundColor: 'transparent', color: '#fff', padding: '12px 20px', borderRadius: 10, fontSize: 13, fontWeight: 700, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.4)' },
  ctaImgWrap: { flex: '0 0 380px', maxWidth: '100%', borderRadius: 16, overflow: 'hidden', boxShadow: '0 12px 30px rgba(0,0,0,0.3)' },
  ctaImg: { width: '100%', height: 240, objectFit: 'cover', display: 'block' },
}

function formatCardMeta(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const mo = String(d.getMonth() + 1).padStart(2, '0')
  return `${hh}:${mm} - ${dd}/${mo}/${d.getFullYear()}`
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
          <span>🕐</span>
          <span>{formatCardMeta(blog.publishedAt)}</span>
        </div>
        <h3 style={s.cardTitle}>{blog.title}</h3>
        <p style={s.cardSummary}>{blog.content}</p>
        <Link to={`/blogs/${blog.id}`} style={s.readMoreLink}>Xem thêm »</Link>
      </div>
    </div>
  )
}

export default function BlogListPage() {
  const [blogs, setBlogs] = useState([])
  const [categories, setCategories] = useState([])
  const [categoriesReady, setCategoriesReady] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState(null) // slug, null = chưa xác định / không lọc
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)

  // Lấy danh mục trước; danh mục đầu tiên (display_order thấp nhất) được chọn mặc định
  useEffect(() => {
    blogService.getCategories()
      .then(data => {
        const cats = Array.isArray(data) ? data : []
        setCategories(cats)
        if (cats.length > 0) setSelectedCategory(cats[0].slug)
      })
      .catch(() => {})
      .finally(() => setCategoriesReady(true))
  }, [])

  // Chỉ tải bài viết sau khi đã biết danh mục mặc định, để tránh tải 2 lần (tất cả rồi lọc lại)
  useEffect(() => {
    if (!categoriesReady) return
    setLoading(true)
    setError(null)
    blogService.getAllBlogs(selectedCategory)
      .then(data => setBlogs(Array.isArray(data) ? data : []))
      .catch(() => setError('Không thể tải danh sách bài viết. Vui lòng thử lại sau.'))
      .finally(() => setLoading(false))
    setPage(1)
  }, [categoriesReady, selectedCategory])

  const selectedCategoryName = categories.find(c => c.slug === selectedCategory)?.name

  const totalPages = Math.max(1, Math.ceil(blogs.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pageItems = blogs.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  return (
    <div style={s.page}>
      {/* Hero banner */}
      <section style={s.hero}>
        <div style={s.heroOverlay} />
        <div style={s.heroContent}>
          <h1 style={s.heroTitle}>TIN TỨC - SỰ KIỆN</h1>
          <div style={s.breadcrumb}>
            <Link to="/" style={s.breadcrumbLink}>Trang chủ</Link>
            <span style={s.breadcrumbSep}>›</span>
            <Link to="/blogs" style={s.breadcrumbLink}>Tin tức - sự kiện</Link>
            {selectedCategoryName && (
              <>
                <span style={s.breadcrumbSep}>›</span>
                <span style={s.breadcrumbCurrent}>{selectedCategoryName}</span>
              </>
            )}
          </div>
        </div>
      </section>

      <div style={s.container}>
        <div style={s.layout}>
          {/* Sidebar */}
          <aside style={s.sidebar}>
            <div style={s.sidebarCard}>
              <div style={s.sidebarTitle}>📚 DANH MỤC</div>
              <nav>
                {categories.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedCategory(c.slug)}
                    style={c.slug === selectedCategory ? { ...s.categoryItem, ...s.categoryItemActive } : s.categoryItem}
                  >
                    {c.name} <span>›</span>
                  </button>
                ))}
              </nav>
            </div>

            <div style={s.promoCard}>
              <div style={s.promoBadge}>TIN TỨC &amp; SỰ KIỆN - ECMS BLOG</div>
              <div style={s.promoBody}>
                <div style={s.promoTitle}>ĐẶT KHÁM<br />HÀNH TRÌNH SÁNG MẮT<br />CHO BÉ YÊU</div>
              </div>
              <div style={s.promoFooter}>
                <div style={s.promoFooterTitle}>CHƯƠNG TRÌNH ƯU ĐÃI</div>
                <div style={s.promoFooterSub}>Kiểm soát cận thị</div>
                <Link to="/patient/booking" style={s.promoBtn}>ĐẶT LỊCH NGAY</Link>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <main style={s.main}>
            {loading && <div style={s.loading}>Đang tải bài viết...</div>}
            {error && <div style={s.error}>{error}</div>}

            {!loading && !error && blogs.length === 0 && (
              <div style={s.empty}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📰</div>
                <div style={{ fontSize: 16, fontWeight: 600, color: '#64748b', marginBottom: 6 }}>Chưa có bài viết nào</div>
                <div style={{ fontSize: 13 }}>Nội dung sẽ được cập nhật sớm.</div>
              </div>
            )}

            {!loading && !error && blogs.length > 0 && (
              <>
                <div style={s.grid}>
                  {pageItems.map(blog => <BlogCard key={blog.id} blog={blog} />)}
                </div>

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
          </main>
        </div>
      </div>

      {/* Bottom CTA */}
      <section style={s.ctaSection}>
        <div style={s.ctaInner}>
          <div style={s.ctaText}>
            <h2 style={s.ctaTitle}>Đừng để thị lực làm rào cản cuộc sống của bạn</h2>
            <p style={s.ctaDesc}>
              Đội ngũ bác sĩ hàng đầu tại ECMS sẵn sàng tư vấn và đồng hành cùng bạn
              trên hành trình tìm lại đôi mắt sáng khỏe.
            </p>
            <div style={s.ctaBtns}>
              <Link to="/patient/booking" style={s.ctaBtnPrimary}>📅 ĐẶT LỊCH KHÁM NGAY</Link>
              <Link to="/services" style={s.ctaBtnOutline}>TÌM HIỂU DỊCH VỤ</Link>
            </div>
          </div>
          <div style={s.ctaImgWrap}>
            <img src={ctaImg} alt="Phòng khám ECMS" style={s.ctaImg} />
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
