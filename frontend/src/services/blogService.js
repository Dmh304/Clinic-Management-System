import axiosClient from '../api/axiosClient'

const blogService = {
  getAllBlogs: () => axiosClient.get('/v1/blogs'),
  getBlogById: (id) => axiosClient.get(`/v1/blogs/${id}`),
}

export default blogService
