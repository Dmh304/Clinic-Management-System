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

// Role-specific pages
import PatientDashboard from '../pages/patient/PatientDashboard'
import BookingPage from '../pages/patient/BookingPage'
import MedicalHistoryPage from '../pages/patient/MedicalHistoryPage'
import PrescriptionViewPage from '../pages/patient/PrescriptionViewPage'

import DoctorDashboard from '../pages/doctor/DoctorDashboard'
import EMRPage from '../pages/doctor/EMRPage'
import PrescriptionPage from '../pages/doctor/PrescriptionPage'
import LabOrderPage from '../pages/doctor/LabOrderPage'

import AppointmentManagementPage from '../pages/receptionist/AppointmentManagementPage'
import WalkInRegistrationPage from '../pages/receptionist/WalkInRegistrationPage'
import InvoicePage from '../pages/receptionist/InvoicePage'
import ReceptionistLayout from '../components/layout/ReceptionistLayout'

import LabQueuePage from '../pages/lab/LabQueuePage'
import LabResultEntryPage from '../pages/lab/LabResultEntryPage'

import DispensingPage from '../pages/pharmacy/DispensingPage'
import PharmacyInvoicePage from '../pages/pharmacy/PharmacyInvoicePage'

import ManagerDashboard from '../pages/manager/ManagerDashboard'
import RevenueReportPage from '../pages/manager/RevenueReportPage'
import StaffPerformancePage from '../pages/manager/StaffPerformancePage'

import UserManagementPage from '../pages/admin/UserManagementPage'
import SystemConfigPage from '../pages/admin/SystemConfigPage'
import AuditLogPage from '../pages/admin/AuditLogPage'

function WithHeader({ children }) {
  return (
    <>
      <Header />
      {children}
    </>
  )
}

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

      {/* ── Auth pages — không có Header ── */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      {/* ── Utility ── */}
      <Route path="/unauthorized" element={<UnauthorizedPage />} />

      {/* ── Patient ── */}
      <Route element={<ProtectedRoute allowedRoles={['PATIENT']} />}>
        <Route path="/patient/dashboard" element={<PatientDashboard />} />
        <Route path="/patient/booking" element={<BookingPage />} />
        <Route path="/patient/history" element={<MedicalHistoryPage />} />
        <Route path="/patient/prescription" element={<PrescriptionViewPage />} />
      </Route>

      {/* ── Doctor ── */}
      <Route element={<ProtectedRoute allowedRoles={['DOCTOR']} />}>
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor/emr" element={<EMRPage />} />
        <Route path="/doctor/prescription" element={<PrescriptionPage />} />
        <Route path="/doctor/lab-order" element={<LabOrderPage />} />
      </Route>

      {/* ── Receptionist ── */}
      <Route element={<ProtectedRoute allowedRoles={['RECEPTIONIST']} />}>
        <Route element={<ReceptionistLayout />}>
          <Route path="/receptionist/appointments" element={<AppointmentManagementPage />} />
          <Route path="/receptionist/walk-in" element={<WalkInRegistrationPage />} />
          <Route path="/receptionist/invoice" element={<InvoicePage />} />
        </Route>
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
