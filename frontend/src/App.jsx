import { useEffect, useState } from 'react'
import axiosClient from './api/axiosClient.js'

function App() {
  const [msg, setMsg] = useState('')

  useEffect(() => {
    axiosClient.get('/hello')
      .then(data => setMsg(data))
      .catch(err => console.error(err))
  }, [])

  return <h1>{msg || 'Đang kết nối...'}</h1>
}

export default App