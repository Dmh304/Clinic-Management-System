import { useState, useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { message, Input, Spin, Pagination, Checkbox, Button } from "antd";
import {
  AppstoreOutlined,
  UnorderedListOutlined,
  ClockCircleOutlined,
  CalendarOutlined,
  SearchOutlined,
  FilterOutlined,
} from "@ant-design/icons";
import { serviceService } from "../../services/serviceService";
import { C, font, formatPrice, isClinical, submitReceptionistRegistration } from "./serviceUtils";
import { ActionButton, TypeTag, CareBookingModal, ReceptionistModal } from "./serviceShared";
import heroBgImg from "../../assets/dich_vu_kham_mat.png";

// ─── Hero ────────────────────────────────────────────────────────
function HeroSection({ onScrollToServices }) {
  return (
    <section
      style={{
        position: "relative",
        minHeight: 420,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: `url(${heroBgImg})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        fontFamily: font,
      }}
    >
      {/* Lớp phủ tối để làm nổi bật chữ trắng, đồng thời giảm độ chi tiết của ảnh nền */}
      <div
        style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(rgba(15,23,42,0.72), rgba(15,23,42,0.72))",
          backdropFilter: "blur(1px)",
        }}
      />

      <div
        style={{
          position: "relative", zIndex: 1,
          maxWidth: 720, margin: "0 auto", padding: "80px 24px",
          textAlign: "center",
          display: "flex", flexDirection: "column", alignItems: "center",
        }}
      >
        <span
          style={{
            display: "inline-block", backgroundColor: "#0d9488", color: "#fff",
            fontSize: 11, fontWeight: 700, letterSpacing: 1,
            padding: "4px 12px", borderRadius: 999, marginBottom: 20,
          }}
        >
          DỊCH VỤ PHÒNG KHÁM
        </span>

        <h1
          style={{
            fontSize: 42, fontWeight: 800, color: "#fff",
            lineHeight: 1.2, margin: "0 0 18px", letterSpacing: -0.5,
            textShadow: "0 2px 16px rgba(0,0,0,0.35)",
          }}
        >
          Tất cả dịch vụ nhãn khoa
        </h1>

        <p
          style={{
            fontSize: 15, color: "#e2e8f0", lineHeight: 1.75,
            margin: "0 0 32px", maxWidth: 520,
          }}
        >
          Từ dịch vụ khám lâm sàng chuyên sâu đến các gói chăm sóc và phục hồi
          thị lực. Chọn dịch vụ phù hợp, xem chi tiết liệu trình và đặt lịch
          hoặc đăng ký tư vấn chỉ trong vài bước.
        </p>

        <button
          onClick={onScrollToServices}
          style={{
            backgroundColor: C.primary, color: "#fff", border: "none",
            borderRadius: 8, padding: "12px 28px", fontSize: 14, fontWeight: 600,
            cursor: "pointer", fontFamily: font, transition: "background-color 0.15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = C.primaryDark)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = C.primary)}
        >
          Xem tất cả dịch vụ
        </button>
      </div>
    </section>
  );
}

// ─── Thẻ dịch vụ ──────────────────────────────────────────────────
function ServiceCard({ service, isListMode, onOpenDetail, actionProps }) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      onClick={() => onOpenDetail(service)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        backgroundColor: C.surface, borderRadius: 20, overflow: "hidden",
        border: `1px solid ${hovered ? "#bfdbfe" : C.border}`,
        boxShadow: hovered ? C.shadowHover : C.shadow,
        display: "flex", flexDirection: isListMode ? "row" : "column",
        transform: hovered ? "translateY(-3px)" : "none",
        transition: "box-shadow 0.2s, transform 0.2s, border-color 0.2s",
        fontFamily: font, cursor: "pointer",
      }}
    >
      <div
        style={{
          position: "relative", flexShrink: 0,
          height: isListMode ? "auto" : 200, width: isListMode ? 240 : "100%",
          background: "#dbeafe", overflow: "hidden",
        }}
      >
        <img
          src={
            service.thumbnailUrl ||
            "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=600&h=360&fit=crop&auto=format"
          }
          alt={service.serviceName}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
        {service.badge && (
          <span
            style={{
              position: "absolute", top: 12, right: 12, backgroundColor: "#0d9488",
              color: "#fff", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 999,
            }}
          >
            {service.badge}
          </span>
        )}
      </div>

      <div style={{ padding: "24px 28px", flex: 1, display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, flexWrap: "wrap" }}>
          <TypeTag service={service} />
          {service.categoryName && (
            <span style={{ fontSize: 11, color: C.textMuted }}>{service.categoryName}</span>
          )}
        </div>

        <h3 style={{ fontSize: 17, fontWeight: 700, color: C.text, margin: "0 0 8px" }}>
          {service.serviceName}
        </h3>

        <div style={{ flex: 1, marginBottom: 16 }}>
          <p
            style={{
              fontSize: 13, color: C.textSub, lineHeight: 1.65, margin: "0 0 4px",
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}
          >
            {service.description}
          </p>
          <span style={{ fontSize: 12, fontWeight: 600, color: C.primary }}>Xem chi tiết →</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 7, marginBottom: 18 }}>
          {service.durationMinutes != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textSub }}>
              <span style={{ color: "#0d9488", flexShrink: 0 }}><ClockCircleOutlined /></span>
              Thời lượng: {service.durationMinutes} phút
            </div>
          )}
          {!isClinical(service) && service.sessionsIncluded != null && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.textSub }}>
              <span style={{ color: "#0d9488", flexShrink: 0 }}><CalendarOutlined /></span>
              Số buổi: {service.sessionsIncluded} buổi
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            borderTop: `1px solid ${C.border}`, paddingTop: 18, gap: 12,
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 4 }}>Giá dịch vụ</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.primary, lineHeight: 1 }}>
              {formatPrice(service.price)}
            </div>
          </div>
          <ActionButton service={service} {...actionProps(service)} />
        </div>
      </div>
    </div>
  );
}

const PAGE_SIZE = 15;

// ─── Bộ lọc bên trái ────────────────────────────────────────────────
function FilterSidebar({
  categories, typeFilter, onToggleType, categoryFilter, onToggleCategory,
  popularOnly, onTogglePopular, onClear,
}) {
  return (
    <aside
      style={{
        width: 240, flexShrink: 0, backgroundColor: C.surface,
        border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 18px 20px",
        alignSelf: "flex-start", position: "sticky", top: 88,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
        <FilterOutlined style={{ color: C.primary }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: 0.3 }}>BỘ LỌC TÌM KIẾM</span>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 10 }}>Loại dịch vụ</div>
        {[
          { value: "CLINICAL", label: "Khám lâm sàng" },
          { value: "CARE", label: "Gói chăm sóc" },
        ].map((opt) => (
          <label key={opt.value} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13, color: C.textSub, cursor: "pointer" }}>
            <Checkbox checked={typeFilter.includes(opt.value)} onChange={() => onToggleType(opt.value)} />
            {opt.label}
          </label>
        ))}
      </div>

      {categories.length > 0 && (
        <>
          <div style={{ borderTop: `1px solid ${C.border}`, margin: "0 0 16px" }} />
          <div style={{ marginBottom: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.textSub, marginBottom: 10 }}>Danh mục</div>
            {categories.map((cat) => (
              <label key={cat} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, fontSize: 13, color: C.textSub, cursor: "pointer" }}>
                <Checkbox checked={categoryFilter.includes(cat)} onChange={() => onToggleCategory(cat)} />
                {cat}
              </label>
            ))}
          </div>
        </>
      )}

      <div style={{ borderTop: `1px solid ${C.border}`, margin: "0 0 16px" }} />

      <label style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18, fontSize: 13, color: C.textSub, cursor: "pointer" }}>
        <Checkbox checked={popularOnly} onChange={onTogglePopular} />
        Chỉ hiện dịch vụ nổi bật
      </label>

      <Button block onClick={onClear} style={{ color: C.textSub }}>
        Xóa tất cả bộ lọc
      </Button>
    </aside>
  );
}

// ─── Catalog ──────────────────────────────────────────────────────
function ServiceCatalog({ catalogRef, services, loading, role, isAuthenticated }) {
  const navigate = useNavigate();
  const [isListMode, setIsListMode] = useState(false);
  const [search, setSearch] = useState("");
  const [loadingId, setLoadingId] = useState(null);
  const [careBookModal, setCareBookModal] = useState({ open: false, service: null });
  const [receptionistModal, setReceptionistModal] = useState({ open: false, service: null });

  // Bộ lọc
  const [typeFilter, setTypeFilter] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [popularOnly, setPopularOnly] = useState(false);
  const [page, setPage] = useState(1);

  // Mọi thay đổi bộ lọc/từ khoá đều quay về trang 1 ngay tại nơi thay đổi
  // (thay vì dùng effect riêng) để tránh cascading render.
  const toggleInArray = (setFn) => (value) => {
    setFn((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
    setPage(1);
  };

  const categories = useMemo(
    () => [...new Set(services.map((s) => s.categoryName).filter(Boolean))],
    [services]
  );

  const handleClearFilters = () => {
    setTypeFilter([]);
    setCategoryFilter([]);
    setPopularOnly(false);
    setSearch("");
    setPage(1);
  };

  // Bệnh nhân đặt lịch khám cho dịch vụ lâm sàng → chuyển sang luồng đặt lịch hẹn
  const handleBook = (service) => {
    navigate("/patient/booking", {
      state: { service: { id: service.id, serviceName: service.serviceName } },
    });
  };

  const handleOpenCareBook = (service) => setCareBookModal({ open: true, service });

  const handleConfirmCareBook = async ({ scheduledDateTime, notes }) => {
    const { service } = careBookModal;
    setLoadingId(service.id);
    try {
      await serviceService.registerAndBookOnline({
        serviceId: service.id,
        scheduledDateTime: scheduledDateTime.format("YYYY-MM-DDTHH:mm:ss"),
        notes: notes || null,
      });
      message.success(`Đặt lịch "${service.serviceName}" thành công! Xem chi tiết tại "Dịch vụ của tôi".`);
      setCareBookModal({ open: false, service: null });
      navigate("/patient/subscriptions");
    } catch (err) {
      message.error(err?.response?.data?.message ?? "Đặt lịch thất bại, vui lòng thử lại");
    } finally {
      setLoadingId(null);
    }
  };

  const handleReceptionistConfirm = async (payload) => {
    const { service } = receptionistModal;
    setLoadingId(service.id);
    try {
      await submitReceptionistRegistration(service, payload);
      message.success("Đã đăng ký dịch vụ và đặt buổi đầu tiên cho bệnh nhân!");
      setReceptionistModal({ open: false, service: null });
    } catch (err) {
      message.error(err?.response?.data?.message ?? "Đăng ký thất bại");
    } finally {
      setLoadingId(null);
    }
  };

  // Props cho nút hành động — dùng chung cho card
  const actionProps = (service) => ({
    role,
    isAuthenticated,
    onBook: handleBook,
    onCareBook: handleOpenCareBook,
    onReceptionistOpen: (svc) => setReceptionistModal({ open: true, service: svc }),
    loading: service.id != null && loadingId === service.id,
  });

  // Lọc theo từ khoá: tên / mô tả / danh mục (tìm nhanh khi không nhớ rõ tên)
  const kw = search.trim().toLowerCase();
  const filtered = services.filter((s) => {
    if (kw) {
      const matchKw = [s.serviceName, s.description, s.categoryName]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(kw));
      if (!matchKw) return false;
    }
    if (typeFilter.length > 0 && !typeFilter.includes(s.serviceType)) return false;
    if (categoryFilter.length > 0 && !categoryFilter.includes(s.categoryName)) return false;
    if (popularOnly && !s.isPopular) return false;
    return true;
  });

  const totalFiltered = filtered.length;
  const visible = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <section ref={catalogRef} style={{ backgroundColor: "#f8fafc", padding: "64px 0", fontFamily: font }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        {/* Header + search + view toggle */}
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
          <div>
            <h2 style={{ fontSize: 28, fontWeight: 800, color: C.text, margin: "0 0 6px", letterSpacing: -0.3 }}>
              Danh mục dịch vụ
            </h2>
            <p style={{ fontSize: 14, color: C.textSub, margin: 0 }}>
              Tất cả dịch vụ khám và gói chăm sóc của phòng khám
            </p>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Input
              allowClear
              placeholder="Tìm dịch vụ theo từ khoá..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              prefix={<SearchOutlined style={{ color: C.textMuted }} />}
              style={{ width: 280, borderRadius: 8 }}
            />
            <div style={{ display: "flex", border: `1px solid ${C.border}`, borderRadius: 8, overflow: "hidden" }}>
              {[
                { mode: false, Icon: AppstoreOutlined },
                { mode: true, Icon: UnorderedListOutlined },
              ].map(({ mode, Icon }) => (
                <button
                  key={String(mode)}
                  onClick={() => setIsListMode(mode)}
                  style={{
                    backgroundColor: isListMode === mode ? C.primaryLight : C.surface,
                    color: isListMode === mode ? C.primary : C.textSub,
                    border: "none", borderRight: mode === false ? `1px solid ${C.border}` : "none",
                    padding: "8px 14px", cursor: "pointer", fontSize: 16,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background-color 0.15s",
                  }}
                >
                  <Icon />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Bộ lọc + Cards */}
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
          <FilterSidebar
            categories={categories}
            typeFilter={typeFilter}
            onToggleType={toggleInArray(setTypeFilter)}
            categoryFilter={categoryFilter}
            onToggleCategory={toggleInArray(setCategoryFilter)}
            popularOnly={popularOnly}
            onTogglePopular={() => { setPopularOnly((v) => !v); setPage(1); }}
            onClear={handleClearFilters}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 0" }}>
                <Spin size="large" />
              </div>
            ) : totalFiltered === 0 ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: C.textMuted, fontSize: 15 }}>
                {kw ? `Không tìm thấy dịch vụ nào khớp "${search}".` : "Không có dịch vụ nào khớp bộ lọc đã chọn."}
              </div>
            ) : (
              <>
                <div
                  style={
                    isListMode
                      ? { display: "flex", flexDirection: "column", gap: 20 }
                      : { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }
                  }
                >
                  {visible.map((s, i) => (
                    <ServiceCard
                      key={s.id ?? i}
                      service={s}
                      isListMode={isListMode}
                      onOpenDetail={(svc) => svc.id && navigate(`/services/${svc.id}`)}
                      actionProps={actionProps}
                    />
                  ))}
                </div>

                {totalFiltered > PAGE_SIZE && (
                  <div style={{ display: "flex", justifyContent: "center", marginTop: 36 }}>
                    <Pagination
                      current={page}
                      pageSize={PAGE_SIZE}
                      total={totalFiltered}
                      onChange={setPage}
                      showSizeChanger={false}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Bệnh nhân: đặt lịch ngay cho gói chăm sóc */}
      <CareBookingModal
        open={careBookModal.open}
        service={careBookModal.service}
        onClose={() => setCareBookModal({ open: false, service: null })}
        onConfirm={handleConfirmCareBook}
        loading={loadingId === careBookModal.service?.id}
      />

      {/* Receptionist modal */}
      <ReceptionistModal
        open={receptionistModal.open}
        service={receptionistModal.service}
        onClose={() => setReceptionistModal({ open: false, service: null })}
        onConfirm={handleReceptionistConfirm}
        loading={loadingId === receptionistModal.service?.id}
      />
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────
export default function ServicePackagesPage() {
  const catalogRef = useRef(null);
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const role = user?.role ?? null;

  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    serviceService
      .getAllServices()
      .then((res) => setServices(res.data ?? []))
      .catch(() => setServices([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div style={{ fontFamily: font, color: C.text }}>
      <HeroSection
        onScrollToServices={() => catalogRef.current?.scrollIntoView({ behavior: "smooth" })}
      />
      <ServiceCatalog
        catalogRef={catalogRef}
        services={services}
        loading={loading}
        role={role}
        isAuthenticated={isAuthenticated}
      />
    </div>
  );
}
