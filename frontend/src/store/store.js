import { configureStore } from '@reduxjs/toolkit'
import authReducer from './slices/authSlice'
import appointmentReducer from './slices/appointmentSlice'
import notificationReducer from './slices/notificationSlice'

const store = configureStore({
  reducer: {
    auth: authReducer,
    appointment: appointmentReducer,
    notification: notificationReducer,
  },
})

export default store
