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
import PromotionsListPage from '../pages/PromotionsListPage'
import PromotionsDetailPage from '../pages/PromotionsDetailPage'
import UnsubscribePage from '../pages/UnsubscribePage'
import LoginPage from '../pages/auth/LoginPage'
import RegisterPage from '../pages/auth/RegisterPage'
import ForgotPasswordPage from '../pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '../pages/auth/ResetPasswordPage'
import VerifyEmailPage from '../pages/auth/VerifyEmailPage'

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
import ServiceDetailPage from '../pages/patient/ServiceDetailPage'
import MySubscriptionsPage from '../pages/patient/MySubscriptionsPage'
import BookCareSessionPage from '../pages/patient/BookCareSessionPage'
import MyCareSessionsPage from '../pages/patient/MyCareSessionsPage'
import MyAppointmentsPage from '../pages/patient/MyAppointmentsPage'
import PatientLabResults from '../pages/patient/PatientLabResults'
import MyInvoicesPage from '../pages/patient/MyInvoicesPage'
import OrderGlassesPage from '../pages/patient/OrderGlassesPage'
import FeedbackPage from '../pages/patient/FeedbackPage'



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
import ServiceRegistrationsPage from '../pages/receptionist/ServiceRegistrationsPage'
import NotificationsPage from '../pages/receptionist/NotificationsPage'
import ReceptionistOrderPage from '../pages/receptionist/ReceptionistOrderPage'
import SupportDashboardPage from '../pages/receptionist/SupportDashboardPage'
import ReceptionistLayout from '../components/layout/ReceptionistLayout'
import DoctorLayout from '../components/layout/DoctorLayout'
import ManagerLayout from '../components/layout/ManagerLayout'
import LabTechnicianLayout from '../components/layout/LabTechnicianLayout'

import CareQueuePage from '../pages/nurse/CareQueuePage'
import DeliverCareSessionPage from '../pages/nurse/DeliverCareSessionPage'

import LabQueuePage from '../pages/lab/LabQueuePage'
import LabResultEntryPage from '../pages/lab/LabResultEntryPage'
import EyeglassPrescriptionDetail from '../pages/lab/EyeglassPrescriptionDetail'
import EyeglassPrescriptionQueue from '../pages/lab/EyeglassPrescriptionQueue'

import DispensingPage from '../pages/pharmacy/DispensingPage'
import PharmacyInvoicePage from '../pages/pharmacy/PharmacyInvoicePage'

import ManagerDashboard from '../pages/manager/ManagerDashboard'
import RevenueReportPage from '../pages/manager/RevenueReportPage'
import StaffPerformancePage from '../pages/manager/StaffPerformancePage'
import PatientStatisticsPage from '../pages/manager/PatientStatisticsPage'
import FeedbackReportPage from '../pages/manager/FeedbackReportPage'
import PayrollPage from '../pages/manager/PayrollPage'
import ManageServicePackagesPage from '../pages/manager/ManageServicePackagesPage'
import ManageDoctorsPage from '../pages/manager/ManageDoctorsPage'
import ManageDiscountCampaignsPage from '../pages/manager/ManageDiscountCampaignsPage'
import AssignNursePage from '../pages/manager/AssignNursePage'
import ReassignAppointmentPage from '../pages/manager/ReassignAppointmentPage'
import ReassignAppointmentDetailPage from '../pages/manager/ReassignAppointmentDetailPage'
import RoomManagementPage from '../pages/manager/RoomManagementPage'
import RoomRosterPage from '../pages/manager/RoomRosterPage'

import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import UserManagementPage from '../pages/admin/UserManagementPage'
import PatientAccountPage from '../pages/admin/PatientAccountPage'
import SystemConfigPage from '../pages/admin/SystemConfigPage'
import AuditLogPage from '../pages/admin/AuditLogPage'
import AdminLayout from '../components/layout/AdminLayout'

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
      <Route path="/promotions" element={<WithHeader><PromotionsListPage /></WithHeader>} />
      <Route path="/promotions/:id" element={<WithHeader><PromotionsDetailPage /></WithHeader>} />
      <Route path="/unsubscribe" element={<WithHeader><UnsubscribePage /></WithHeader>} />
      {/* Trang dịch vụ — mọi người đều xem được (chỉ PATIENT/RECEPTIONIST mới đăng ký được) */}
      <Route path="/services" element={<WithHeader><ServicePackagesPage /></WithHeader>} />
      <Route path="/services/:id" element={<WithHeader><ServiceDetailPage /></WithHeader>} />

      {/* ── Auth pages — không có Header ── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

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
        <Route path="/patient/lab-results" element={<PatientLabResults />} />
        <Route path="/patient/prescription" element={<WithHeader><PrescriptionViewPage /></WithHeader>} />
        <Route path="/patient/subscriptions" element={<WithHeader><MySubscriptionsPage /></WithHeader>} />
        <Route path="/patient/book-session" element={<WithHeader><BookCareSessionPage /></WithHeader>} />
        <Route path="/patient/care-sessions" element={<WithHeader><MyCareSessionsPage /></WithHeader>} />
        <Route path="/patient/appointments" element={<WithHeader><MyAppointmentsPage /></WithHeader>} />
        <Route path="/patient/invoices" element={<WithHeader><MyInvoicesPage /></WithHeader>} />
        <Route path="/patient/order-glasses/:prescriptionId" element={<WithHeader><OrderGlassesPage /></WithHeader>} />
        <Route path="/patient/feedback" element={<WithHeader><FeedbackPage /></WithHeader>} />
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
          <Route path="/receptionist/notifications" element={<NotificationsPage />} />
          <Route path="/receptionist/checkout-care-sessions" element={<CheckoutCareSessionPage />} />
          <Route path="/receptionist/service-registrations" element={<ServiceRegistrationsPage />} />
          <Route path="/receptionist/eyeglass-orders" element={<ReceptionistOrderPage />} />
          <Route path="/receptionist/order-glasses/:prescriptionId" element={<OrderGlassesPage />} />
          <Route path="/receptionist/support" element={<SupportDashboardPage />} />
        </Route>
      </Route>

      {/* ── Nurse ── */}
      <Route element={<ProtectedRoute allowedRoles={['NURSE']} />}>
        <Route path="/nurse/queue" element={<WithHeader><CareQueuePage /></WithHeader>} />
        <Route path="/nurse/deliver/:id" element={<WithHeader><DeliverCareSessionPage /></WithHeader>} />
      </Route>

      {/* ── Lab ── */}
      <Route element={<ProtectedRoute allowedRoles={['LAB_TECHNICIAN']} />}>
      <Route element={<LabTechnicianLayout />}>
        <Route path="/lab/queue" element={<LabQueuePage />} />
        <Route path="/lab/result-entry" element={<LabResultEntryPage />} />
        <Route path="/lab/eyeglass-queue" element={<EyeglassPrescriptionQueue/>}/>
        <Route path="/lab/eyeglass-detail" element={<EyeglassPrescriptionDetail/> }/>
        </Route>
      </Route>

      {/* ── Pharmacy ── */}
      <Route element={<ProtectedRoute allowedRoles={['PHARMACIST']} />}>
        <Route path="/pharmacy/dispensing" element={<WithHeader><DispensingPage /></WithHeader>} />
        <Route path="/pharmacy/invoice" element={<WithHeader><PharmacyInvoicePage /></WithHeader>} />
      </Route>

      {/* ── Manager ── */}
      <Route element={<ProtectedRoute allowedRoles={['MANAGER']} />}>
        <Route element={<ManagerLayout />}>
          <Route path="/manager/dashboard" element={<ManagerDashboard />} />
          <Route path="/manager/revenue" element={<RevenueReportPage />} />
          <Route path="/manager/staff" element={<StaffPerformancePage />} />
          <Route path="/manager/patient-statistics" element={<PatientStatisticsPage />} />
          <Route path="/manager/feedback-report" element={<FeedbackReportPage />} />
          <Route path="/manager/payroll" element={<PayrollPage />} />
          <Route path="/manager/service-packages" element={<ManageServicePackagesPage />} />
          <Route path="/manager/doctors" element={<ManageDoctorsPage />} />
          <Route path="/manager/discount-campaigns" element={<ManageDiscountCampaignsPage />} />
          <Route path="/manager/assign-nurse" element={<AssignNursePage />} />
          <Route path="/manager/reassign-appointment" element={<ReassignAppointmentPage />} />
          <Route path="/manager/reassign-appointment/:appointmentId" element={<ReassignAppointmentDetailPage />} />
          <Route path="/manager/daily-schedule" element={<DailySchedulePage />} />
          <Route path="/manager/rooms" element={<RoomManagementPage />} />
          <Route path="/manager/room-roster" element={<RoomRosterPage />} />
        </Route>
      </Route>

      {/* ── Admin ── */}
      <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
        <Route element={<AdminLayout />}>
          <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
          <Route path="/admin/users" element={<UserManagementPage />} />
          <Route path="/admin/patients" element={<PatientAccountPage />} />
          <Route path="/admin/config" element={<SystemConfigPage />} />
          <Route path="/admin/audit" element={<AuditLogPage />} />
        </Route>
      </Route>

      {/* ── Fallback: về trang chủ ── */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
