// Mạnh Hùng - HE200743
// Định nghĩa toàn bộ cấu trúc định tuyến (routing) của ứng dụng.
// Phân chia route theo nhóm: công khai (trang chủ, blog), xác thực (login, register),
// và các route bảo vệ theo vai trò (PATIENT, DOCTOR, RECEPTIONIST, LAB_TECHNICIAN,
// PHARMACIST, MANAGER, ADMIN). Route không tồn tại sẽ redirect về trang chủ.
import { Routes, Route, Navigate } from 'react-router-dom'

import ProtectedRoute from './ProtectedRoute'

// Public pages
import HomePage from '../pages/HomePage'
import BlogListPage from '../pages/BlogListPage'
import BlogDetailPage from '../pages/BlogDetailPage'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'

// Layout
import Header from '../components/layout/Header'

// Shared pages
import ProfilePage from '../pages/shared/ProfilePage'
import ChangePasswordPage from '../pages/shared/ChangePasswordPage'

// Role-specific pages
import PatientDashboard from '../pages/patient/PatientDashboard'
import BookingPage from '../pages/patient/BookingPage'
import MedicalHistoryPage from '../pages/patient/MedicalHistoryPage'
import PrescriptionViewPage from '../pages/patient/PrescriptionViewPage'
import ServicePackagesPage from '../pages/patient/ServicePackagesPage'
import MySubscriptionsPage from '../pages/patient/MySubscriptionsPage'
import BookCareSessionPage from '../pages/patient/BookCareSessionPage'
import MyCareSessionsPage from '../pages/patient/MyCareSessionsPage'
import MyAppointmentsPage from '../pages/patient/MyAppointmentsPage'



import DoctorDashboard from '../pages/doctor/DoctorDashboard'
import EMRPage from '../pages/doctor/EMRPage'
import PrescriptionPage from '../pages/doctor/PrescriptionPage'
import LabOrderPage from '../pages/doctor/LabOrderPage'

import AppointmentManagementPage from '../pages/receptionist/AppointmentManagementPage'
import WalkInRegistrationPage from '../pages/receptionist/WalkInRegistrationPage'
import WalkInAppointmentPage from '../pages/receptionist/WalkInAppointmentPage'
import InvoicePage from '../pages/receptionist/InvoicePage'
import DailySchedulePage from '../pages/receptionist/DailySchedulePage'
import CheckoutCareSessionPage from '../pages/receptionist/CheckoutCareSessionPage'
import ReceptionistLayout from '../components/layout/ReceptionistLayout'
import DoctorLayout from '../components/layout/DoctorLayout'

import CareQueuePage from '../pages/nurse/CareQueuePage'
import DeliverCareSessionPage from '../pages/nurse/DeliverCareSessionPage'

import LabQueuePage from '../pages/lab/LabQueuePage'
import LabResultEntryPage from '../pages/lab/LabResultEntryPage'

import DispensingPage from '../pages/pharmacy/DispensingPage'
import PharmacyInvoicePage from '../pages/pharmacy/PharmacyInvoicePage'

import ManagerDashboard from '../pages/manager/ManagerDashboard'
import RevenueReportPage from '../pages/manager/RevenueReportPage'
import StaffPerformancePage from '../pages/manager/StaffPerformancePage'
import ManageServicePackagesPage from '../pages/manager/ManageServicePackagesPage'
import ManageDiscountCampaignsPage from '../pages/manager/ManageDiscountCampaignsPage'
import AssignNursePage from '../pages/manager/AssignNursePage'
import ReassignAppointmentPage from '../pages/manager/ReassignAppointmentPage'

import UserManagementPage from '../pages/admin/UserManagementPage'
import SystemConfigPage from '../pages/admin/SystemConfigPage'
import AuditLogPage from '../pages/admin/AuditLogPage'

// Bọc nội dung trang với Header để các trang công khai hiển thị thanh điều hướng
function WithHeader({ children }) {
  return (
    <>
      <Header />
      {children}
    </>
  )
}

// Hiển thị trang lỗi 403 khi người dùng không có quyền truy cập vào trang đó
function UnauthorizedPage() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ fontSize: 48, fontWeight: 800, color: '#dc2626', margin: '0 0 8px' }}>403</h1>
        <p style={{ color: '#6b7280', fontSize: 15 }}>Bạn không có quyền truy cập trang này.</p>
      </div>
    </div>
  )
}

export default function AppRouter() {
  return (
    <Routes>
      {/* ── Public — có Header ── */}
      <Route path="/" element={<WithHeader><HomePage /></WithHeader>} />
      <Route path="/blogs" element={<WithHeader><BlogListPage /></WithHeader>} />
      <Route path="/blogs/:id" element={<WithHeader><BlogDetailPage /></WithHeader>} />
      {/* Trang dịch vụ — mọi người đều xem được (chỉ PATIENT/RECEPTIONIST mới đăng ký được) */}
      <Route path="/services" element={<WithHeader><ServicePackagesPage /></WithHeader>} />

      {/* ── Auth pages — không có Header ── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* ── Utility ── */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* ── Shared (all authenticated users) ── */}
      <Route element={<ProtectedRoute allowedRoles={['PATIENT', 'DOCTOR', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST', 'MANAGER', 'ADMIN', 'NURSE']} />}>
        <Route path="/profile" element={<WithHeader><ProfilePage /></WithHeader>} />
        <Route path="/change-password" element={<WithHeader><ChangePasswordPage /></WithHeader>} />
      </Route>

      {/* ── Patient ── */}
      <Route element={<ProtectedRoute allowedRoles={['PATIENT']} />}>
        <Route path="/patient/dashboard" element={<PatientDashboard />} />
        <Route path="/patient/booking" element={<BookingPage />} />
        <Route path="/patient/history" element={<MedicalHistoryPage />} />
        <Route path="/patient/prescription" element={<PrescriptionViewPage />} />
        <Route path="/patient/subscriptions" element={<WithHeader><MySubscriptionsPage /></WithHeader>} />
        <Route path="/patient/book-session" element={<WithHeader><BookCareSessionPage /></WithHeader>} />
        <Route path="/patient/care-sessions" element={<WithHeader><MyCareSessionsPage /></WithHeader>} />
        <Route path="/patient/appointments" element={<WithHeader><MyAppointmentsPage /></WithHeader>} />
      </Route>

      {/* ── Doctor ── */}
      <Route element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
        <Route element={<DoctorLayout />}>
          <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
          <Route path="/doctor/emr" element={<EMRPage />} />
          <Route path="/doctor/prescription" element={<PrescriptionPage />} />
          <Route path="/doctor/lab-order" element={<LabOrderPage />} />
        </Route>
      </Route>

      {/* ── Receptionist ── */}
      <Route element={<ProtectedRoute allowedRoles={['RECEPTIONIST']} />}>
        <Route element={<ReceptionistLayout />}>
          <Route path="/receptionist/appointments" element={<AppointmentManagementPage />} />
          <Route path="/receptionist/walk-in-appointment" element={<WalkInAppointmentPage />} />
          <Route path="/receptionist/walk-in" element={<WalkInRegistrationPage />} />
          <Route path="/receptionist/invoice" element={<InvoicePage />} />
          <Route path="/receptionist/daily-schedule" element={<DailySchedulePage />} />
          <Route path="/receptionist/checkout-care-sessions" element={<CheckoutCareSessionPage />} />
        </Route>
      </Route>

      {/* ── Nurse ── */}
      <Route element={<ProtectedRoute allowedRoles={['NURSE']} />}>
        <Route path="/nurse/queue" element={<WithHeader><CareQueuePage /></WithHeader>} />
        <Route path="/nurse/deliver/:id" element={<WithHeader><DeliverCareSessionPage /></WithHeader>} />
      </Route>

      {/* ── Lab ── */}
      <Route element={<ProtectedRoute allowedRoles={['LAB_TECHNICIAN']} />}>
        <Route path="/lab/queue" element={<LabQueuePage />} />
        <Route path="/lab/result" element={<LabResultEntryPage />} />
      </Route>

      {/* ── Pharmacy ── */}
      <Route element={<ProtectedRoute allowedRoles={['PHARMACIST']} />}>
        <Route path="/pharmacy/dispensing" element={<DispensingPage />} />
        <Route path="/pharmacy/invoice" element={<PharmacyInvoicePage />} />
      </Route>

      {/* ── Manager ── */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
        <Route path="/manager/dashboard" element={<ManagerDashboard />} />
        <Route path="/manager/revenue" element={<RevenueReportPage />} />
        <Route path="/manager/staff" element={<StaffPerformancePage />} />
        <Route path="/manager/service-packages" element={<WithHeader><ManageServicePackagesPage /></WithHeader>} />
        <Route path="/manager/discount-campaigns" element={<WithHeader><ManageDiscountCampaignsPage /></WithHeader>} />
        <Route path="/manager/assign-nurse" element={<WithHeader><AssignNursePage /></WithHeader>} />
        <Route path="/manager/reassign-appointment" element={<WithHeader><ReassignAppointmentPage /></WithHeader>} />
        <Route path="/manager/daily-schedule" element={<WithHeader><DailySchedulePage /></WithHeader>} />
      </Route>

      {/* ── Admin ── */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route path="/admin/users" element={<UserManagementPage />} />
        <Route path="/admin/config" element={<SystemConfigPage />} />
        <Route path="/admin/audit" element={<AuditLogPage />} />
      </Route>

      {/* ── Fallback: về trang chủ ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
