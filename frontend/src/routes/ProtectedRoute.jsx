import { Navigate, Outlet } from 'react-router-dom'

export default function ProtectedRoute({ allowedRoles }) {
  // TODO: implement auth check with Redux store
  return <Outlet />
}
