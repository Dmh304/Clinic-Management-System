/** Author: Tuấn - HE204215
* 
* File này định nghĩa Redux Slice để quản lý trạng thái của Lịch hẹn trên toàn bộ ứng dụng frontend.
* Cung cấp các action bất đồng bộ (async thunks) để gọi API và cập nhật lại store sau khi có kết quả.
* Bao gồm các tính năng như: lấy danh sách lịch hẹn, thay đổi trạng thái, check-in, lấy dữ liệu dashboard.
*/

/* Action bất đồng bộ để gọi API lấy danh sách lịch hẹn hôm nay */
/**
 * Redux Slice: appointment
 * Quản lý trạng thái danh sách lịch khám của phòng khám và các thao tác thay đổi trạng thái (xác nhận, check-in, hủy).
 * DucTKHHE204463
 */
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { appointmentService } from '../../services/appointmentService'

// Tải danh sách lịch hẹn trong ngày hôm nay từ API để hiển thị lên bảng dashboard
export const fetchTodayAppointments = createAsyncThunk(
  'appointment/fetchToday',
  async (_, { rejectWithValue }) => {
    try {
      const res = await appointmentService.getTodayAppointments()
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Không thể tải danh sách lịch hẹn')
    }
  }
)

/* Action bất đồng bộ để thay đổi trạng thái của một lịch hẹn cụ thể */
// Cập nhật trạng thái lịch hẹn (dùng cho: WAITING→IN_PROGRESS khi bắt đầu khám, hoặc hủy lịch)
export const changeAppointmentStatus = createAsyncThunk(
  'appointment/changeStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const res = await appointmentService.updateStatus(id, status)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Không thể cập nhật trạng thái')
    }
  }
)

/* Action bất đồng bộ để xác nhận lịch hẹn (có thể kèm theo việc gán bác sĩ phụ trách) */
/**
 * Xác nhận lịch hẹn của bệnh nhân và phân công bác sĩ.
 * DucTKH
 */
export const confirmAppointment = createAsyncThunk(
  'appointment/confirm',
  async ({ id, doctorId }, { rejectWithValue }) => {
    try {
      const res = await appointmentService.confirmAppointment(id, doctorId)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Không thể xác nhận lịch hẹn')
    }
  }
)

/* Action bất đồng bộ để thực hiện check-in (xác nhận bệnh nhân đã có mặt tại phòng khám) */
/**
 * Check-in tiếp nhận bệnh nhân.
 * DucTKH
 */
export const checkInAppointment = createAsyncThunk(
  'appointment/checkIn',
  async (id, { rejectWithValue }) => {
    try {
      const res = await appointmentService.checkInAppointment(id)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Không thể check-in lịch hẹn')
    }
  }
)

/* Action bất đồng bộ để lấy dữ liệu thống kê số ca khám phục vụ cho trang Dashboard */
// Tải thống kê lịch hẹn theo từng trạng thái để hiển thị các card số liệu trên dashboard
export const fetchDashboard = createAsyncThunk(
  'appointment/fetchDashboard',
  async (_, { rejectWithValue }) => {
    try {
      const res = await appointmentService.getDashboard()
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Không thể tải thống kê')
    }
  }
)

// Slice quản lý state: list (danh sách lịch hẹn), dashboard (thống kê), loading, error.
// extraReducers cập nhật state tương ứng khi mỗi async thunk fulfilled/rejected.
const appointmentSlice = createSlice({
  name: 'appointment',
  /* 
   * initialState: định nghĩa các giá trị trạng thái mặc định của slice.
   * list: mảng chứa danh sách các lịch hẹn (appointment).
   * dashboard: đối tượng chứa các con số thống kê lấy từ server.
   * loading: boolean báo hiệu ứng dụng đang trong quá trình lấy dữ liệu hay không.
   * error: chứa thông tin lỗi nếu có sự cố xảy ra khi gọi API.
  */
  initialState: {
    list: [],
    dashboard: null,
    loading: false,
    error: null,
  },
  reducers: {},
  /* extraReducers: nơi xử lý kết quả của các async thunk (pending, fulfilled, rejected). */
  extraReducers: (builder) => {
    /* Xử lý khi gọi API lấy danh sách lịch hẹn thành công/thất bại */
    builder.addCase(fetchTodayAppointments.pending, (state) => {
      state.loading = true
      state.error = null
    })
      .addCase(fetchTodayAppointments.fulfilled, (state, action) => {
        state.loading = false
        state.list = action.payload
      })
      .addCase(fetchTodayAppointments.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      /* Xử lý khi lấy dữ liệu thống kê Dashboard thành công */
      .addCase(fetchDashboard.fulfilled, (state, action) => {
        state.dashboard = action.payload
      })

      /* 
       * Xử lý chung khi trạng thái một lịch hẹn thay đổi (đổi status, xác nhận, check-in).
       * Redux sẽ tìm lịch hẹn đó trong state.list (thông qua id) và cập nhật trực tiếp tại store,
       * giúp UI hiển thị thay đổi ngay lập tức mà không cần gọi API tải lại toàn bộ danh sách.
      */
      .addCase(changeAppointmentStatus.fulfilled, (state, action) => {
        const updated = action.payload
        const index = state.list.findIndex((a) => a.id === updated.id)
        if (index !== -1) state.list[index] = updated
      })
      .addCase(confirmAppointment.fulfilled, (state, action) => {
        const updated = action.payload
        const index = state.list.findIndex((a) => a.id === updated.id)
        if (index !== -1) state.list[index] = updated
      })
      .addCase(checkInAppointment.fulfilled, (state, action) => {
        const updated = action.payload
        const index = state.list.findIndex((a) => a.id === updated.id)
        if (index !== -1) state.list[index] = updated
      })
  },
})

export default appointmentSlice.reducer
