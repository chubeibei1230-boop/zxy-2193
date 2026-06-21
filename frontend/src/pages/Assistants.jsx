import React, { useState, useEffect } from 'react'
import axios from 'axios'

function Assistants() {
  const [assistants, setAssistants] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    name: ''
  })

  useEffect(() => {
    fetchAssistants()
  }, [])

  const fetchAssistants = async () => {
    try {
      const res = await axios.get('/api/sessions/assistants/list')
      setAssistants(res.data.assistants)
    } catch (err) {
      console.error('获取助理列表失败:', err)
    }
  }

  const openAddModal = () => {
    setFormData({
      username: '',
      password: '',
      name: ''
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await axios.post('/api/users', {
        ...formData,
        role: 'assistant'
      })
      
      setShowModal(false)
      fetchAssistants()
      alert('助理账号创建成功')
    } catch (err) {
      alert(err.response?.data?.error || '创建失败')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个助理账号吗？')) return
    try {
      await axios.delete(`/api/users/${id}`)
      fetchAssistants()
    } catch (err) {
      alert(err.response?.data?.error || '删除失败')
    }
  }

  return (
    <div>
      <h2 className="page-title">助理账号管理</h2>

      <div className="card">
        <div style={{marginBottom: '16px'}}>
          <button className="btn btn-primary" onClick={openAddModal}>
            + 新增助理
          </button>
        </div>

        <table>
          <thead>
            <tr>
              <th>用户名</th>
              <th>姓名</th>
              <th>角色</th>
              <th>创建时间</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {assistants.map(assistant => (
              <tr key={assistant.id}>
                <td>{assistant.username}</td>
                <td style={{fontWeight: '500'}}>{assistant.name}</td>
                <td>
                  <span className="tag">助理</span>
                </td>
                <td style={{fontSize: '12px', color: '#888'}}>{assistant.created_at}</td>
                <td>
                  <button className="btn btn-danger btn-small" 
                    onClick={() => handleDelete(assistant.id)}
                    disabled={assistant.username === 'assistant1' || assistant.username === 'assistant2'}>
                    删除
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {assistants.length === 0 && (
          <div className="empty-state">暂无助理账号</div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新增助理账号</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>用户名 *</label>
                <input type="text" required value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})} />
              </div>
              <div className="form-group">
                <label>姓名 *</label>
                <input type="text" required value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>初始密码 *</label>
                <input type="password" required value={formData.password}
                  onChange={(e) => setFormData({...formData, password: e.target.value})} />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  创建
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Assistants
