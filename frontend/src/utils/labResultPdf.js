/**
 * Author: TuanTD
 *
 * Tiện ích tạo file PDF cho Kết quả xét nghiệm mắt (Lab Result).
 * Cách làm: dựng một khối HTML ẩn theo đúng bố cục 3 phần (Thông tin hành chính /
 * Chỉ số 2 mắt / Ảnh đính kèm), dùng html2canvas chụp lại thành ảnh để giữ nguyên
 * font chữ tiếng Việt có dấu (jsPDF font mặc định không hỗ trợ Unicode tiếng Việt),
 * sau đó nhúng ảnh vào PDF qua jsPDF, tự động chia nhiều trang nếu nội dung dài.
 */

import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/* Hàm tiện ích: Tính tuổi chính xác dựa trên chuỗi ngày sinh (YYYY-MM-DD) */
function calculateAge(dobString) {
  if (!dobString) return null
  const today = new Date()
  const birthDate = new Date(dobString)
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

/* Định dạng ngày kiểu vi-VN, trả về '—' nếu rỗng */
function formatDate(value) {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleDateString('vi-VN')
  } catch {
    return '—'
  }
}

/* Chuyển 1 URL ảnh (Cloudinary...) thành dataURL base64 để nhúng an toàn vào canvas,
   tránh lỗi "tainted canvas" do CORS khi html2canvas chụp ảnh từ domain khác */
async function toDataUrl(url) {
  try {
    const res = await fetch(url, { mode: 'cors' })
    const blob = await res.blob()
    return await new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  } catch {
    return null // Ảnh lỗi tải sẽ được bỏ qua thay vì làm hỏng toàn bộ PDF
  }
}

/**
 * Chuẩn hoá dữ liệu từ LabResultResponse (API) sang cấu trúc dùng chung
 * cho hàm generateLabResultPdf. Dùng được cho cả PatientLabResults và EMRPage
 * vì cả hai đều lấy dữ liệu gốc từ endpoint GET /v1/lab/{id}/results.
 */
export function buildPdfDataFromLabResult(r) {
  return {
    patientName: r.patientFullName,
    patientDob: r.patientDob,
    patientAddress: r.patientAddress,
    patientPhone: r.patientPhone,
    doctorName: r.doctorFullName,
    labTechnicianName: r.labTechnicianFullName,
    examDate: r.createdAt,
    reviewedDate: r.reviewedAt,
    right: { va: r.vaR, bcva: r.bcvaR, iop: r.iopR, sph: r.sphR, cyl: r.cylR, axis: r.axisR },
    left: { va: r.vaL, bcva: r.bcvaL, iop: r.iopL, sph: r.sphL, cyl: r.cylL, axis: r.axisL },
    imageUrls: r.imageUrls ?? [],
    doctorNotes: r.doctorNotes,
  }
}

/* Xây dựng HTML cho khối chỉ số một bên mắt */
function eyeBlockHtml(label, eye) {
  const rows = [
    ['VA', eye.va],
    ['BCVA', eye.bcva],
    ['IOP (mmHg)', eye.iop],
    ['SPH', eye.sph],
    ['CYL', eye.cyl],
    ['AXIS (°)', eye.axis],
  ]
  return `
    <div style="flex:1; border:1px solid #cbd5e1; border-radius:8px; padding:14px 16px;">
      <div style="font-weight:700; font-size:14px; color:#0f172a; margin-bottom:10px;">${label}</div>
      <table style="width:100%; border-collapse:collapse; font-size:13px;">
        ${rows.map(([k, v]) => `
          <tr>
            <td style="padding:4px 0; color:#64748b;">${k}</td>
            <td style="padding:4px 0; text-align:right; font-weight:600; color:#1e293b;">${v ?? '—'}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `
}

/* Xây dựng HTML cho khối 3: lưới ảnh đính kèm, tối đa 2 ảnh / hàng, fill hết chiều ngang */
function imagesBlockHtml(dataUrls) {
  if (!dataUrls || dataUrls.length === 0) {
    return `<div style="color:#94a3b8; font-size:13px; padding:12px 0;">Không có ảnh đính kèm</div>`
  }
  const rows = []
  for (let i = 0; i < dataUrls.length; i += 2) {
    const pair = dataUrls.slice(i, i + 2)
    rows.push(`
      <div style="display:flex; gap:10px; margin-bottom:10px;">
        ${pair.map((src) => `
          <div style="flex:1;">
            <img src="${src}" style="width:100%; height:260px; object-fit:cover; border-radius:8px; border:1px solid #e2e8f0;" />
          </div>
        `).join('')}
        ${pair.length === 1 ? '<div style="flex:1;"></div>' : ''}
      </div>
    `)
  }
  return rows.join('')
}

/**
 * Tạo và tải xuống file PDF kết quả xét nghiệm mắt
 * @param {object} data - Xem cấu trúc trả về bởi buildPdfDataFromLabResult
 * @param {string} filename - Tên file tải xuống (không cần đuôi .pdf)
 */
export async function generateLabResultPdf(data, filename = 'ket-qua-xet-nghiem') {
  // Tải trước toàn bộ ảnh dưới dạng base64 để tránh lỗi CORS khi chụp canvas
  const dataUrls = (await Promise.all((data.imageUrls ?? []).map(toDataUrl)))
    .filter(Boolean)

  const age = calculateAge(data.patientDob)

  const container = document.createElement('div')
  container.style.position = 'fixed'
  container.style.left = '-9999px'
  container.style.top = '0'
  container.style.width = '780px'
  container.style.background = '#ffffff'
  container.style.padding = '32px'
  container.style.fontFamily = "'Segoe UI', Arial, sans-serif"
  container.style.color = '#0f172a'

  container.innerHTML = `
    <div style="text-align:center; margin-bottom:20px;">
      <div style="font-size:18px; font-weight:800; color:#0d9488;">PHÒNG KHÁM NHÃN KHOA ÁNH SAO</div>
      <div style="font-size:13px; color:#64748b;">85 P. Bà Triệu, Q. Hai Bà Trưng, Hà Nội</div>
      <div style="font-size:16px; font-weight:700; margin-top:10px;">KẾT QUẢ ĐO KHÁM MẮT CHUYÊN SÂU</div>
    </div>

    <!-- ===== KHỐI 1: Thông tin hành chính ===== -->
    <div style="border:1px solid #cbd5e1; border-radius:8px; padding:16px 20px; margin-bottom:16px;">
      <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px 24px; font-size:13px;">
        <div><span style="color:#64748b;">Họ và tên bệnh nhân:</span> <b>${data.patientName ?? '—'}</b></div>
        <div><span style="color:#64748b;">Ngày sinh / Tuổi:</span> <b>${formatDate(data.patientDob)}${age != null ? ` (${age} tuổi)` : ''}</b></div>
        <div><span style="color:#64748b;">Địa chỉ:</span> <b>${data.patientAddress ?? '—'}</b></div>
        <div><span style="color:#64748b;">Số điện thoại:</span> <b>${data.patientPhone ?? '—'}</b></div>
        <div><span style="color:#64748b;">Bác sĩ chỉ định:</span> <b>${data.doctorName ?? '—'}</b></div>
        <div><span style="color:#64748b;">Kỹ thuật viên thực hiện:</span> <b>${data.labTechnicianName ?? '—'}</b></div>
        <div><span style="color:#64748b;">Ngày thực hiện:</span> <b>${formatDate(data.examDate)}</b></div>
        <div><span style="color:#64748b;">Ngày bác sĩ duyệt:</span> <b>${formatDate(data.reviewedDate)}</b></div>
      </div>
      ${data.doctorNotes ? `
        <div style="margin-top:12px; padding:10px 12px; background:#f0fdf4; border-radius:6px; font-size:13px;">
          <b>Ghi chú:</b> ${data.doctorNotes}
        </div>` : ''}
    </div>

    <!-- ===== KHỐI 2: Chỉ số 2 mắt ===== -->
    <div style="display:flex; gap:16px; margin-bottom:16px;">
      ${eyeBlockHtml('Mắt Phải (OD)', data.right)}
      ${eyeBlockHtml('Mắt Trái (OS)', data.left)}
    </div>

    <!-- ===== KHỐI 3: Ảnh đính kèm ===== -->
    <div>
      <div style="font-weight:700; font-size:14px; margin-bottom:10px;">Ảnh kết quả đính kèm</div>
      ${imagesBlockHtml(dataUrls)}
    </div>
  `

  document.body.appendChild(container)

  try {
    const canvas = await html2canvas(container, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
    const imgData = canvas.toDataURL('image/jpeg', 0.95)

    const pdf = new jsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imgWidth = pageWidth
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // Chia nhiều trang nếu nội dung dài hơn 1 trang A4
    let heightLeft = imgHeight
    let position = 0

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft > 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(`${filename}.pdf`)
  } finally {
    document.body.removeChild(container)
  }
}