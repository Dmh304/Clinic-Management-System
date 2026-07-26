/**
 * @author      ThangNB - HE201024
 * @contributor Đồng Mạnh Hùng - HE200743
 * @created     2026-05-31
 * @updated     2026-07-03
 *
 * Redux store: registers the feature slices shared across screens
 * (auth session, appointments, notifications, invoices).
 */
import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import appointmentReducer from './slices/appointmentSlice'
import notificationReducer from './slices/notificationSlice'
import invoiceReducer from './slices/invoiceSlice'

const store = configureStore({
  reducer: {
    auth: authReducer,
    appointment: appointmentReducer,
    notification: notificationReducer,
    invoice: invoiceReducer,
  },
})

export default store
