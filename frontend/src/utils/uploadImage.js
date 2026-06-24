/**
 * Upload ảnh lên Cloudinary, trả về URL string
 * @param {File} file
 * @returns {Promise<string>} url
 */
export async function uploadImageToCloudinary(file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

  console.log('>>> Upload bắt đầu:', file.name, file.type, file.size)
  console.log('>>> cloudName:', cloudName, '| preset:', preset)

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', preset)

  try {
    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      { method: 'POST', body: formData }
    )

    console.log('>>> HTTP status:', res.status)
    const data = await res.json()
    console.log('>>> Response data:', data)

    if (data.error) throw new Error(data.error.message)
    if (!data.secure_url) throw new Error('Không có secure_url')

    console.log('>>> Upload thành công:', data.secure_url)
    return data.secure_url

  } catch (err) {
    console.error('>>> Upload lỗi tại:', err)
    throw err
  }
}