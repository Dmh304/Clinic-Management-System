import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector } from "react-redux";
import { message, Spin, Breadcrumb, DatePicker, Input } from "antd";
import { ClockCircleOutlined, CalendarOutlined, FieldTimeOutlined, LeftOutlined, LockOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { serviceService } from "../../services/serviceService";
import { disabledClinicDate, disabledClinicTime, validateClinicTime } from "../../constants/clinicInfo";
import { C, font, formatPrice, isClinical, submitReceptionistRegistration } from "./serviceUtils";
import { ActionButton, TypeTag, InfoBox, ReceptionistModal } from "./serviceShared";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&h=600&fit=crop&auto=format";

export default function ServiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((s) => s.auth);
  const role = user?.role ?? null;

  const [service, setService] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [related, setRelated] = useState([]);

  const [actionLoading, setActionLoading] = useState(false);
  const [receptionistOpen, setReceptionistOpen] = useState(false);

  // Form đăng ký nhanh gói CARE, nhúng ngay trong nội dung trang (không cần mở modal)
  const [inlineDateTime, setInlineDateTime] = useState(null);
  const [inlineNotes, setInlineNotes] = useState("");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true); setNotFound(false); setRelated([]);
    serviceService
      .getServiceById(id)
      .then((res) => setService(res.data ?? null))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  // Gợi ý dịch vụ tương tự (cùng loại), loại trừ dịch vụ đang xem — giúp người dùng
  // xem tiếp mà không phải thoát ra danh mục rồi quay lại.
  useEffect(() => {
    if (!service) return;
    serviceService
      .getServicesByType(service.serviceType)
      .then((res) => setRelated((res.data ?? []).filter((s) => s.id !== service.id).slice(0, 4)))
      .catch(() => setRelated([]));
  }, [service]);

  const handleBook = (svc) => {
    navigate("/patient/booking", { state: { service: { id: svc.id, serviceName: svc.serviceName } } });
  };

  const inlineTimeError = inlineDateTime ? validateClinicTime(inlineDateTime, dayjs) : null;
  const canSubmitInline = !!inlineDateTime && !inlineTimeError;

  const handleInlineCareBook = async (e) => {
    e.preventDefault();
    if (!canSubmitInline) return;
    setActionLoading(true);
    try {
      await serviceService.registerAndBookOnline({
        serviceId: service.id,
        scheduledDateTime: inlineDateTime.format("YYYY-MM-DDTHH:mm:ss"),
        notes: inlineNotes || null,
      });
      message.success(`Đặt lịch "${service.serviceName}" thành công! Xem chi tiết tại "Dịch vụ của tôi".`);
      navigate("/patient/subscriptions");
    } catch (err) {
      message.error(err?.response?.data?.message ?? "Đặt lịch thất bại, vui lòng thử lại");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReceptionistConfirm = async (payload) => {
    setActionLoading(true);
    try {
      await submitReceptionistRegistration(service, payload);
      message.success("Đã đăng ký dịch vụ và đặt buổi đầu tiên cho bệnh nhân!");
      setReceptionistOpen(false);
    } catch (err) {
      message.error(err?.response?.data?.message ?? "Đăng ký thất bại");
    } finally {
      setActionLoading(false);
    }
  };

  const scrollToInlineForm = () =>
    document.getElementById("care-book-form")?.scrollIntoView({ behavior: "smooth", block: "start" });

  const actionProps = service ? {
    role,
    isAuthenticated,
    onBook: handleBook,
    onCareBook: scrollToInlineForm,
    onReceptionistOpen: () => setReceptionistOpen(true),
    loading: actionLoading,
  } : {};

  if (loading) {
    return (
      <div style={{ textAlign: "center", padding: "120px 0" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (notFound || !service) {
    return (
      <div style={{ textAlign: "center", padding: "100px 24px", fontFamily: font }}>
        <h2 style={{ color: C.text }}>Không tìm thấy dịch vụ này</h2>
        <p style={{ color: C.textSub, marginBottom: 20 }}>Dịch vụ có thể đã bị ẩn hoặc không còn tồn tại.</p>
        <Link to="/services" style={{ color: C.primary, fontWeight: 600 }}>
          <LeftOutlined /> Quay lại danh mục dịch vụ
        </Link>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: font, color: C.text, backgroundColor: C.bg }}>
      {/* Ảnh bìa lớn — trọng tâm quảng bá dịch vụ */}
      <div
        style={{
          position: "relative", height: 360,
          backgroundImage: `url(${service.thumbnailUrl || FALLBACK_IMG})`,
          backgroundSize: "cover", backgroundPosition: "center",
        }}
      >
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(rgba(15,23,42,0.15), rgba(15,23,42,0.78))" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1120, margin: "0 auto", padding: "0 24px", height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", paddingBottom: 32 }}>
          <Breadcrumb
            style={{ marginBottom: 14 }}
            items={[
              { title: <Link to="/" style={{ color: "#e2e8f0" }}>Trang chủ</Link> },
              { title: <Link to="/services" style={{ color: "#e2e8f0" }}>Dịch vụ</Link> },
              { title: <span style={{ color: "#fff" }}>{service.serviceName}</span> },
            ]}
          />
          <div style={{ marginBottom: 10 }}>
            <TypeTag service={service} />
            {service.badge && (
              <span style={{ marginLeft: 8, backgroundColor: "#0d9488", color: "#fff", fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 999 }}>
                {service.badge}
              </span>
            )}
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 800, color: "#fff", margin: 0, letterSpacing: -0.5, textShadow: "0 2px 16px rgba(0,0,0,0.35)" }}>
            {service.serviceName}
          </h1>
        </div>
      </div>

      {/* Nội dung chính: trái = dịch vụ tương tự, giữa = nội dung bài viết, phải = giá/hành động */}
      <div style={{ maxWidth: 1320, margin: "0 auto", padding: "40px 24px 80px", display: "flex", gap: 28, alignItems: "flex-start" }}>
        {/* Sidebar trái: dịch vụ tương tự — sticky để xem tiếp không cần thoát ra */}
        {related.length > 0 && (
          <aside style={{ width: 260, flexShrink: 0, position: "sticky", top: 88 }}>
            <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 14px", color: C.text }}>Dịch vụ tương tự</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {related.map((s) => (
                  <div
                    key={s.id}
                    onClick={() => navigate(`/services/${s.id}`)}
                    style={{
                      display: "flex", gap: 10, cursor: "pointer", padding: 8, borderRadius: 10,
                      border: `1px solid ${C.border}`, transition: "border-color .15s, background-color .15s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.primaryBorder; e.currentTarget.style.backgroundColor = C.primaryLight; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = C.border; e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <img
                      src={s.thumbnailUrl || FALLBACK_IMG}
                      alt={s.serviceName}
                      style={{ width: 52, height: 52, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.text, marginBottom: 3, overflow: "hidden", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                        {s.serviceName}
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, color: C.primary }}>{formatPrice(s.price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "28px 32px", marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: C.text }}>Giới thiệu</h2>
            <p style={{ fontSize: 15, color: C.textSub, lineHeight: 1.8, margin: 0 }}>
              {service.description || "Thông tin đang được cập nhật."}
            </p>
          </div>

          {service.benefits && (
            <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "28px 32px", marginBottom: 24 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px", color: C.text }}>Lợi ích của gói</h2>
              <ul style={{ margin: 0, paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                {service.benefits.split("\n").map((line) => line.trim()).filter(Boolean).map((line, i) => (
                  <li key={i} style={{ fontSize: 15, color: C.textSub, lineHeight: 1.6 }}>{line}</li>
                ))}
              </ul>
            </div>
          )}

          <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "28px 32px", marginBottom: 24 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 14px", color: C.text }}>Chi tiết liệu trình</h2>
            {service.content ? (
              <div style={{ fontSize: 15, color: C.textSub, lineHeight: 1.85, whiteSpace: "pre-wrap" }}>
                {service.content}
              </div>
            ) : (
              <p style={{ fontSize: 14, color: C.textMuted, fontStyle: "italic", margin: 0 }}>
                Thông tin chi tiết đang được cập nhật.
              </p>
            )}
          </div>

          {/* Form đăng ký thẳng — dành cho người đọc đã có nhu cầu, không cần cuộn lên bấm nút */}
          <div id="care-book-form" style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: "28px 32px", scrollMarginTop: 88 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 6px", color: C.text }}>Đăng ký dịch vụ này</h2>

            {!isAuthenticated ? (
              <>
                <p style={{ fontSize: 14, color: C.textSub, margin: "0 0 16px" }}>
                  Đăng nhập để đăng ký hoặc đặt lịch cho dịch vụ này.
                </p>
                <button
                  onClick={() => navigate("/login")}
                  style={{
                    backgroundColor: C.primaryLight, color: C.primary, border: `1px solid ${C.primaryBorder}`,
                    borderRadius: 8, padding: "10px 20px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}
                >
                  <LockOutlined style={{ fontSize: 13 }} /> Đăng nhập để tiếp tục
                </button>
              </>
            ) : isClinical(service) ? (
              <>
                <p style={{ fontSize: 14, color: C.textSub, margin: "0 0 16px" }}>
                  Đây là dịch vụ khám cần đặt lịch với bác sĩ phụ trách. Bấm nút bên dưới để chọn bác sĩ và khung giờ khám phù hợp.
                </p>
                <button
                  onClick={() => handleBook(service)}
                  style={{
                    backgroundColor: C.primary, color: "#fff", border: "none", borderRadius: 8,
                    padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Đặt lịch khám
                </button>
              </>
            ) : role === "PATIENT" ? (
              <form onSubmit={handleInlineCareBook}>
                <p style={{ fontSize: 14, color: C.textSub, margin: "0 0 18px" }}>
                  Chọn ngày giờ buổi đầu tiên, gói dịch vụ sẽ được kích hoạt ngay khi bạn xác nhận. Thanh toán
                  thực hiện trực tiếp tại phòng khám sau khi trải nghiệm dịch vụ.
                </p>
                <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
                  <div style={{ flex: "1 1 260px" }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                      Ngày giờ buổi đầu tiên
                    </label>
                    <DatePicker
                      showTime={{ format: "HH:mm" }}
                      format="DD/MM/YYYY HH:mm"
                      placeholder="Chọn ngày giờ"
                      value={inlineDateTime}
                      onChange={setInlineDateTime}
                      disabledDate={(current) => disabledClinicDate(current, dayjs)}
                      disabledTime={(current) => disabledClinicTime(current, dayjs)}
                      style={{ width: "100%" }}
                    />
                    {inlineTimeError && (
                      <p style={{ color: "#dc2626", fontSize: 12, margin: "6px 0 0" }}>{inlineTimeError}</p>
                    )}
                  </div>
                  <div style={{ flex: "1 1 260px" }}>
                    <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 6 }}>
                      Ghi chú (tùy chọn)
                    </label>
                    <Input.TextArea
                      rows={1}
                      autoSize={{ minRows: 1, maxRows: 3 }}
                      placeholder="Yêu cầu hoặc tình trạng sức khỏe..."
                      value={inlineNotes}
                      onChange={(e) => setInlineNotes(e.target.value)}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={!canSubmitInline || actionLoading}
                  style={{
                    backgroundColor: canSubmitInline ? C.primary : "#d1d5db", color: "#fff", border: "none",
                    borderRadius: 8, padding: "10px 24px", fontSize: 14, fontWeight: 600,
                    cursor: canSubmitInline && !actionLoading ? "pointer" : "default", opacity: actionLoading ? 0.75 : 1,
                  }}
                >
                  {actionLoading ? "Đang xử lý..." : "Xác nhận đăng ký"}
                </button>
              </form>
            ) : role === "RECEPTIONIST" ? (
              <>
                <p style={{ fontSize: 14, color: C.textSub, margin: "0 0 16px" }}>
                  Đăng ký dịch vụ này thay cho một bệnh nhân cụ thể.
                </p>
                <button
                  onClick={() => setReceptionistOpen(true)}
                  style={{
                    backgroundColor: C.teal, color: "#fff", border: "none", borderRadius: 8,
                    padding: "10px 24px", fontSize: 14, fontWeight: 600, cursor: "pointer",
                  }}
                >
                  Đăng ký cho bệnh nhân
                </button>
              </>
            ) : (
              <p style={{ fontSize: 14, color: C.textMuted, margin: 0 }}>Tài khoản của bạn chỉ có thể xem thông tin dịch vụ.</p>
            )}
          </div>
        </div>

        {/* Sidebar phải: giá + hành động — sticky để luôn thấy khi cuộn đọc nội dung */}
        <aside style={{ width: 300, flexShrink: 0, position: "sticky", top: 88 }}>
          <div style={{ backgroundColor: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 24, boxShadow: C.shadow }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 4 }}>Giá dịch vụ</div>
              <div style={{ fontSize: 30, fontWeight: 800, color: C.primary, lineHeight: 1 }}>{formatPrice(service.price)}</div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {service.durationMinutes != null && (
                <InfoBox label={<span><ClockCircleOutlined /> Thời lượng</span>} value={`${service.durationMinutes} phút`} />
              )}
              {!isClinical(service) && service.sessionsIncluded != null && (
                <InfoBox label={<span><CalendarOutlined /> Số buổi</span>} value={`${service.sessionsIncluded} buổi`} />
              )}
              {!isClinical(service) && service.validityDays != null && (
                <InfoBox label={<span><FieldTimeOutlined /> Hiệu lực</span>} value={`${service.validityDays} ngày`} />
              )}
            </div>

            <div style={{ width: "100%" }}>
              <ActionButton service={service} {...actionProps} />
            </div>
          </div>

          <Link to="/services" style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 16, color: C.textSub, fontSize: 13 }}>
            <LeftOutlined /> Quay lại danh mục dịch vụ
          </Link>
        </aside>
      </div>

      {/* Lễ tân: đăng ký hộ bệnh nhân */}
      <ReceptionistModal
        open={receptionistOpen}
        service={service}
        onClose={() => setReceptionistOpen(false)}
        onConfirm={handleReceptionistConfirm}
        loading={actionLoading}
      />
    </div>
  );
}
