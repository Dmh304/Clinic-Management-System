import { createSlice } from '@reduxjs/toolkit'

const appointmentSlice = createSlice({
  name: 'appointment',
  initialState: { list: [], selected: null },
  reducers: {},
})

export default appointmentSlice.reducer
