import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext.jsx'

function Sessions() {
  const [sessions, setSessions] = useState([])
  const [packages, setPackages] = useState([])
  const [assistants, setAssistants] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({})
  const [filters, setFilters] = useState({
    status: '',
    date_from: '',
    date_to: '',
    assistant_id: '',
    material_package_id: '',
    keyword: ''
  })
  const { isAdmin } = useAuth()

  useEffect(() => {
    fetchSessions()
    fetchPackages()
    fetchAssistants()
  }, [filters])

  const fetchSessions = async () => {
    try {
      const res = await axios.get('/api/sessions', { params: filters })
      setSessions(res.data.sessions)
    } catch (err) {
      console.error('获取场次列表失败:', err)
    }
  }

  const fetchPackages = async () => {
    try {
      const res = await axios.get('/api/materials/packages')
      setPackages(res.data.packages)
    } catch (err) {
      console.error('获取材料包失败:', err)
    }
  }

  const fetchAssistants = async () => {
    try {
      const res = await axios.get('/api/sessions/assistants/list')
      setAssistants(res.data.assistants)
    } catch (err) {
      console.error('获取助理列表失败:', err)
    }
  }

  const openAddModal = () => {
    setEditingItem(null)
    setFormData({
      session_no: '',
      title: '',
      date: '',
      time_start: '',
      time_end: '',
      location: '',
      material_package_id: '',
      expected_participants: 0,
      status: 'pending',
      assistant_id: '',
      notes: ''
    })
    setShowModal(true)
  }

  const openEditModal = (session) => {
    setEditingItem(session)
    setFormData(session)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await axios.put(`/api/sessions/${editingItem.id}`, formData)
      } else {
        await axios.post('/api/sessions', formData)
      }
      setShowModal(false)
      fetchSessions()
    } catch (err) {
      alert(err.response?.data?.error || '操作失败')
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('确定要删除这个场次吗？')) return
    try {
      await axios.delete(`/api/sessions/${id}`)
      fetchSessions()
    } catch (err) {
      alert(err.response?.data?.error || '删除失败')
    }
  }

  const updateStatus = async (id, status) => {
    try {
      await axios.patch(`/api/sessions/${id}/status`, { status })
      fetchSessions()
    } catch (err) {
      alert(err.response?.data?.error || '操作失败')
    }
  }

  const getStatusText = (status) => {
    const statusMap = {
      'pending': '待准备',
      'in_progress': '进行中',
      'pending_review': '待复核',
      'need_supplement': '需补料',
      'completed': '已完成',
      'paused': '暂停'
    }
    return statusMap[status] || status
  }

  return (
    <div>
      <h2 className="page-title">活动场次</h2>

      <div className="card">
        <div className="filter-bar">
          <div className="filter-item">
            <label>状态</label>
            <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
              <option value="">全部</option>
              <option value="pending">待准备</option>
              <option value="in_progress">进行中</option>
              <option value="pending_review">待复核</option>
              <option value="need_supplement">需补料</option>
              <option value="completed">已完成</option>
              <option value="paused">暂停</option>
            </select>
          </div>
          <div className="filter-item">
            <label>开始日期</label>
            <input type="date" value={filters.date_from} 
              onChange={(e) => setFilters({...filters, date_from: e.target.value})} />
          </div>
          <div className="filter-item">
            <label>结束日期</label>
            <input type="date" value={filters.date_to} 
              onChange={(e) => setFilters({...filters, date_to: e.target.value})} />
          </div>
          <div className="filter-item">
            <label>助理</label>
            <select value={filters.assistant_id} onChange={(e) => setFilters({...filters, assistant_id: e.target.value})}>
              <option value="">全部</option>
              {assistants.map(a => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>材料包</label>
            <select value={filters.material_package_id} onChange={(e) => setFilters({...filters, material_package_id: e.target.value})}>
              <option value="">全部</option>
              {packages.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="filter-item">
            <label>关键词</label>
            <input type="text" placeholder="搜索场次" value={filters.keyword}
              onChange={(e) => setFilters({...filters, keyword: e.target.value})} />
          </div>
          {isAdmin() && (
            <div className="filter-item">
              <label>&nbsp;</label>
              <button className="btn btn-primary" onClick={openAddModal}>
                + 新增场次
              </button>
            </div>
          )}
        </div>

        <table>
          <thead>
            <tr>
              <th>场次编号</th>
              <th>标题</th>
              <th>日期</th>
              <th>时间</th>
              <th>材料包</th>
              <th>助理</th>
              <th>预计人数</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {sessions.map(session => (
              <tr key={session.id}>
                <td>{session.session_no}</td>
                <td style={{fontWeight: '500'}}>{session.title}</td>
                <td>{session.date}</td>
                <td>{session.time_start} - {session.time_end}</td>
                <td>{session.material_package_name || '-'}</td>
                <td>{session.assistant_name || '-'}</td>
                <td>{session.expected_participants}</td>
                <td>
                  <span className={`status-badge status-${session.status}`}>
                    {getStatusText(session.status)}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    {isAdmin() && (
                      <>
                        <button className="btn btn-secondary btn-small" onClick={() => openEditModal(session)}>
                          编辑
                        </button>
                        <button className="btn btn-danger btn-small" onClick={() => handleDelete(session.id)}>
                          删除
                        </button>
                      </>
                    )}
                    {!isAdmin() && session.status === 'pending' && (
                      <button className="btn btn-primary btn-small" 
                        onClick={() => updateStatus(session.id, 'in_progress')}>
                        开始
                      </button>
                    )}
                    {!isAdmin() && session.status === 'in_progress' && (
                      <button className="btn btn-success btn-small"
                        onClick={() => updateStatus(session.id, 'pending_review')}>
                        提交复核
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sessions.length === 0 && (
          <div className="empty-state">暂无场次数据</div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingItem ? '编辑场次' : '新增场次'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>场次编号 *</label>
                <input type="text" required value={formData.session_no || ''}
                  onChange={(e) => setFormData({...formData, session_no: e.target.value})} />
              </div>
              <div className="form-group">
                <label>标题 *</label>
                <input type="text" required value={formData.title || ''}
                  onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>日期 *</label>
                <input type="date" required value={formData.date || ''}
                  onChange={(e) => setFormData({...formData, date: e.target.value})} />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <div className="form-group">
                  <label>开始时间 *</label>
                  <input type="time" required value={formData.time_start || ''}
                    onChange={(e) => setFormData({...formData, time_start: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>结束时间 *</label>
                  <input type="time" required value={formData.time_end || ''}
                    onChange={(e) => setFormData({...formData, time_end: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>地点</label>
                <input type="text" value={formData.location || ''}
                  onChange={(e) => setFormData({...formData, location: e.target.value})} />
              </div>
              <div className="form-group">
                <label>材料包</label>
                <select value={formData.material_package_id || ''}
                  onChange={(e) => setFormData({...formData, material_package_id: e.target.value})}>
                  <option value="">请选择</option>
                  {packages.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>助理</label>
                <select value={formData.assistant_id || ''}
                  onChange={(e) => setFormData({...formData, assistant_id: e.target.value})}>
                  <option value="">请选择</option>
                  {assistants.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>预计参与人数</label>
                <input type="number" value={formData.expected_participants || 0}
                  onChange={(e) => setFormData({...formData, expected_participants: e.target.value})} />
              </div>
              <div className="form-group">
                <label>状态</label>
                <select value={formData.status || 'pending'}
                  onChange={(e) => setFormData({...formData, status: e.target.value})}>
                  <option value="pending">待准备</option>
                  <option value="in_progress">进行中</option>
                  <option value="pending_review">待复核</option>
                  <option value="need_supplement">需补料</option>
                  <option value="completed">已完成</option>
                  <option value="paused">暂停</option>
                </select>
              </div>
              <div className="form-group">
                <label>备注</label>
                <textarea value={formData.notes || ''}
                  onChange={(e) => setFormData({...formData, notes: e.target.value})} />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Sessions
