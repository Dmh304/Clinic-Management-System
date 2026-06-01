import { Routes, Route, Navigate } from 'react-router-dom'
import AppointmentManagementPage from '../pages/receptionist/AppointmentManagementPage'
import WalkInRegistrationPage from '../pages/receptionist/WalkInRegistrationPage'

export default function AppRouter() {
  return (
    <Routes>
      <Route path="/receptionist/appointments" element={<AppointmentManagementPage />} />
      <Route path="/receptionist/walk-in" element={<WalkInRegistrationPage />} />
      <Route path="/" element={<Navigate to="/receptionist/appointments" replace />} />
    </Routes>
  )
}
