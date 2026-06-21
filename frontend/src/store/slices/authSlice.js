// Mạnh Hùng - HE200743
// Redux slice quản lý trạng thái xác thực (authentication) toàn cục.
// Lưu trữ token JWT, thông tin người dùng và trạng thái đăng nhập vào cả Redux store lẫn localStorage
// để duy trì phiên đăng nhập sau khi tải lại trang.
import { createSlice } from '@reduxjs/toolkit'

const TOKEN_KEY = 'ecms_token'
const USER_KEY = 'ecms_user'

// Khôi phục trạng thái xác thực từ localStorage khi ứng dụng khởi động lại
function loadFromStorage() {
  try {
    const token = localStorage.getItem(TOKEN_KEY)
    const user = JSON.parse(localStorage.getItem(USER_KEY) || 'null')
    return {
      token,
      user,
      role: user?.role ?? null,
      isAuthenticated: !!token,
    }
  } catch {
    return { token: null, user: null, role: null, isAuthenticated: false }
  }
}

const authSlice = createSlice({
  name: 'auth',
  initialState: loadFromStorage(),
  reducers: {
    // Lưu thông tin đăng nhập (token, user, role) vào state và localStorage sau khi xác thực thành công
    loginSuccess(state, action) {
      const { token, userId, email, fullName, role, doctorId } = action.payload
      state.token = token
      state.user = { userId, email, fullName, role, doctorId }
      state.role = role
      state.isAuthenticated = true
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify({ userId, email, fullName, role, doctorId }))
    },
    // Cập nhật một phần thông tin user (vd: sau khi lưu hồ sơ cá nhân) và đồng bộ lại localStorage
    // để Header và các nơi khác hiển thị đúng dữ liệu mới nhất mà không cần đăng nhập lại
    updateUser(state, action) {
      if (!state.user) return
      state.user = { ...state.user, ...action.payload }
      localStorage.setItem(USER_KEY, JSON.stringify(state.user))
    },
    // Xóa toàn bộ thông tin xác thực khỏi state và localStorage khi người dùng đăng xuất
    logout(state) {
      state.token = null
      state.user = null
      state.role = null
      state.isAuthenticated = false
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    },
  },
})

export const { loginSuccess, logout, updateUser } = authSlice.actions
export default authSlice.reducer
