import axiosClient from '../api/axiosClient'

const blogService = {
  getAllBlogs: (category) => axiosClient.get('/v1/blogs', { params: category ? { category } : {} }),
  getCategories: () => axiosClient.get('/v1/blogs/categories'),
  getBlogById: (id) => axiosClient.get(`/v1/blogs/${id}`),

  // ── Manager CRUD ──────────────────────────────────────────────
  getAllForManager: () => axiosClient.get('/v1/blogs/manager'),
  createBlog: (data) => axiosClient.post('/v1/blogs', data),
  updateBlog: (id, data) => axiosClient.put(`/v1/blogs/${id}`, data),
  deleteBlog: (id) => axiosClient.delete(`/v1/blogs/${id}`),

  // Upload ảnh đại diện, trả về { url }
  uploadImage: (file) => {
    const fd = new FormData()
    fd.append('file', file)
    return axiosClient.post('/v1/files/upload', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

export default blogService
