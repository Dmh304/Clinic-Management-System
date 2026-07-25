import { serviceService } from "../../services/serviceService";

// ─── Design tokens — đồng bộ với dự án Nhãn Khoa Ánh Sao ────────
// Dùng chung cho trang danh mục dịch vụ (ServicePackagesPage) và trang chi
// tiết dịch vụ (ServiceDetailPage) — tách ra đây để không lặp lại code.
export const C = {
  primary: "#1d4ed8",
  primaryLight: "#eff6ff",
  primaryDark: "#1e40af",
  primaryBorder: "#dbeafe",
  teal: "#0d9488",
  accent: "#22c55e",
  accentLight: "#dcfce7",
  text: "#111827",
  textSub: "#64748b",
  textMuted: "#94a3b8",
  border: "#e2e8f0",
  bg: "#f8fafc",
  surface: "#ffffff",
  shadow: "0 2px 8px rgba(0,0,0,.06)",
  shadowHover: "0 8px 28px rgba(29,78,216,.14)",
};
export const font = "system-ui, -apple-system, sans-serif";

export function formatPrice(price) {
  if (!price && price !== 0) return "—";
  return new Intl.NumberFormat("vi-VN").format(price) + "đ";
}

// Phân biệt dịch vụ khám lâm sàng (đặt lịch hẹn) và gói chăm sóc (tự đặt lịch)
export const isClinical = (s) => s.serviceType === "CLINICAL";

// Đăng ký hộ bệnh nhân — gọi chung cho cả trang danh mục và trang chi tiết dịch vụ.
// Dùng registerAtCounter (không phải register()) vì lễ tân đang trao đổi trực
// tiếp với bệnh nhân nên coi như đã đồng ý ngay, không cần bước chờ liên hệ tư vấn.
export async function submitReceptionistRegistration(service, { patientId, scheduledDateTime, notes }) {
  return serviceService.registerAtCounter({
    patientId,
    serviceId: service.id,
    scheduledDateTime: scheduledDateTime.format("YYYY-MM-DDTHH:mm:ss"),
    notes: notes || null,
  });
}
