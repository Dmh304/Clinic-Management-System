/**
 * Author: TuanTD
 * File dịch vụ tiện ích xử lý tải tài nguyên media
 * Thực hiện truyền tải trực tiếp tệp tin hình ảnh từ Client-side lên dịch vụ lưu trữ đám mây Cloudinary
 * thông qua giao thức Unsigned Upload (Không cần mã hóa bảo mật từ phía Server)
 */

/**
 * Tải một tệp tin hình ảnh lên Cloudinary và trả về đường dẫn URL an toàn (HTTPS)
 */
export async function uploadImageToCloudinary(file) {
  // Lấy các cấu hình định danh tài khoản và cấu hình tải lên từ biến môi trường (Vite)
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  console.log('>>> Upload bắt đầu:', file.name, file.type, file.size)
  console.log('>>> cloudName:', cloudName, '| preset:', preset)

  // Khởi tạo đối tượng FormData để đóng gói dữ liệu theo chuẩn mã hóa `multipart/form-data`
  const formData = new FormData()
  formData.append('file', file)                 // Tệp tin hình ảnh cần upload
  formData.append('upload_preset', preset)      // Cấu hình Unsigned Upload Preset được thiết lập trên dashboard Cloudinary

  try {
    // Thực hiện gửi yêu cầu HTTP POST bằng Fetch API đến cổng Endpoint của Cloudinary
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { 
        method: 'POST', 
        body: formData                          // Payload gửi đi dạng FormData chứa file và preset
      }
    )

    // Log kiểm tra mã trạng thái HTTP phản hồi
    console.log('>>> HTTP status:', res.status)
    
    // Chuyển đổi dữ liệu phản hồi từ định dạng JSON sang Object JavaScript
    const data = await res.json()
    console.log('>>> Response data:', data)

    // Trường hợp 1: API kết nối thành công nhưng Cloudinary trả về cấu trúc báo lỗi logic bên trong
    if (data.error) throw new Error(data.error.message)
      
    // Trường hợp 2: Yêu cầu thành công nhưng không tìm thấy trường link liên kết ảnh an toàn
    if (!data.secure_url) throw new Error('Không có secure_url')

    // Log thông báo hoàn tất và trả về đường dẫn ảnh tuyệt đối dạng HTTPS
    console.log('>>> Upload thành công:', data.secure_url)
    return data.secure_url

  } catch (err) {
    // Bắt toàn bộ lỗi phát sinh (Lỗi kết nối mạng, lỗi phân tích JSON, lỗi logic từ cấu trúc ném ra ở trên)
    console.error('>>> Upload lỗi tại:', err)
    throw err // Ném tiếp lỗi ra ngoài để luồng giao diện (UI Component) có thể bắt được và hiển thị Toast/Alert thông báo cho người dùng
  }
}