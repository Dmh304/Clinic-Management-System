import { createSlice } from '@reduxjs/toolkit'

const notificationSlice = createSlice({
  name: 'notification',
  initialState: { items: [], unreadCount: 0 },
  reducers: {},
})

export default notificationSlice.reducer
