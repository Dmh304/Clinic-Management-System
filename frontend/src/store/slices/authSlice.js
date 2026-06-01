import { createSlice } from '@reduxjs/toolkit'

const TOKEN_KEY = 'ecms_token'
const USER_KEY = 'ecms_user'

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
    loginSuccess(state, action) {
      const { token, userId, email, fullName, role } = action.payload
      state.token = token
      state.user = { userId, email, fullName, role }
      state.role = role
      state.isAuthenticated = true
      localStorage.setItem(TOKEN_KEY, token)
      localStorage.setItem(USER_KEY, JSON.stringify({ userId, email, fullName, role }))
    },
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

export const { loginSuccess, logout } = authSlice.actions
export default authSlice.reducer
