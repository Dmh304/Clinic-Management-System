import axiosClient from '../api/axiosClient'

const blogService = {
  getAllBlogs: (category) => axiosClient.get('/v1/blogs', { params: category ? { category } : {} }),
  getCategories: () => axiosClient.get('/v1/blogs/categories'),
  getBlogById: (id) => axiosClient.get(`/v1/blogs/${id}`),
}

export default blogService
