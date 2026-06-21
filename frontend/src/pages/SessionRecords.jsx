import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext.jsx'

function SessionRecords() {
  const [records, setRecords] = useState([])
  const [sessions, setSessions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [formData, setFormData] = useState({
    materials_distributed: 0,
    rubbings_completed: 0,
    shortage_notes: '',
    cleanup_delay: 0,
    participation_feedback: '',
    feedback_rating: 5
  })
  const [filters, setFilters] = useState({
    status: '',
    date_from: '',
    date_to: '',
    has_shortage: '',
    has_delay: '',
    has_feedback_issue: ''
  })
  const { user, isAdmin } = useAuth()

  useEffect(() => {
    fetchRecords()
    fetchSessions()
  }, [filters])

  const fetchRecords = async () => {
    try {
      const params = {...filters}
      if (!isAdmin()) {
        params.assistant_id = user.id
      }
      const res = await axios.get('/api/records', { params })
      setRecords(res.data.records)
    } catch (err) {
      console.error('获取记录列表失败:', err)
    }
  }

  const fetchSessions = async () => {
    try {
      const params = { status: 'in_progress' }
      if (!isAdmin()) {
        params.assistant_id = user.id
      }
      const res = await axios.get('/api/sessions', { params })
      setSessions(res.data.sessions)
    } catch (err) {
      console.error('获取场次列表失败:', err)
    }
  }

  const openSubmitModal = (session) => {
    setSelectedSession(session)
    setFormData({
      materials_distributed: 0,
      rubbings_completed: 0,
      shortage_notes: '',
      cleanup_delay: 0,
      participation_feedback: '',
      feedback_rating: 5
    })
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedSession) return
    
    try {
      await axios.post('/api/records', {
        ...formData,
        session_id: selectedSession.id
      })
      setShowModal(false)
      fetchRecords()
      alert('记录提交成功，已进入待复核状态')
    } catch (err) {
      alert(err.response?.data?.error || '提交失败')
    }
  }

  const getStatusText = (status) => {
    const statusMap = {
      'pending_review': '待复核',
      'reviewed': '已复核',
      'rejected': '已驳回'
    }
    return statusMap[status] || status
  }

  return (
    <div>
      <h2 className="page-title">场次记录</h2>

      <div className="card">
        <div className="filter-bar">
          <div className="filter-item">
            <label>状态</label>
            <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
              <option value="">全部</option>
              <option value="pending_review">待复核</option>
              <option value="reviewed">已复核</option>
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
            <label>异常类型</label>
            <select value={filters.has_shortage} 
              onChange={(e) => setFilters({...filters, has_shortage: e.target.value})}>
              <option value="">全部</option>
              <option value="1">有缺料</option>
            </select>
          </div>
        </div>

        {!isAdmin() && sessions.length > 0 && (
          <div style={{marginBottom: '16px', padding: '12px', background: '#e8f5e9', borderRadius: '4px'}}>
            <span style={{marginRight: '12px'}}>当前进行中的场次：</span>
            {sessions.map(s => (
              <button key={s.id} className="btn btn-primary btn-small" 
                style={{marginRight: '8px'}}
                onClick={() => openSubmitModal(s)}>
                记录：{s.title}
              </button>
            ))}
          </div>
        )}

        <table>
          <thead>
            <tr>
              <th>场次</th>
              <th>日期</th>
              <th>助理</th>
              <th>材料发放</th>
              <th>拓印完成</th>
              <th>清理延迟</th>
              <th>反馈评分</th>
              <th>异常标记</th>
              <th>状态</th>
            </tr>
          </thead>
          <tbody>
            {records.map(record => (
              <tr key={record.id}>
                <td style={{fontWeight: '500'}}>{record.session_title}</td>
                <td>{record.session_date}</td>
                <td>{record.assistant_name}</td>
                <td>{record.materials_distributed}</td>
                <td>{record.rubbings_completed}</td>
                <td>{record.cleanup_delay} 分钟</td>
                <td>
                  {record.feedback_rating ? `${record.feedback_rating} 分` : '-'}
                </td>
                <td>
                  {record.has_shortage && <span className="tag">缺料</span>}
                  {record.has_delay && <span className="tag">延迟</span>}
                  {record.has_feedback_issue && <span className="tag">反馈差</span>}
                  {!record.has_shortage && !record.has_delay && !record.has_feedback_issue && (
                    <span style={{color: '#999', fontSize: '12px'}}>无</span>
                  )}
                </td>
                <td>
                  <span className={`status-badge status-${record.status}`}>
                    {getStatusText(record.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {records.length === 0 && (
          <div className="empty-state">暂无记录数据</div>
        )}
      </div>

      {showModal && selectedSession && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>提交场次记录</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div style={{marginBottom: '16px', padding: '10px', background: '#f5f5f5', borderRadius: '4px'}}>
              <p><strong>场次：</strong>{selectedSession.title}</p>
              <p style={{fontSize: '13px', color: '#666'}}>
                {selectedSession.date} {selectedSession.time_start} - {selectedSession.time_end}
              </p>
            </div>
            <form onSubmit={handleSubmit}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <div className="form-group">
                  <label>材料发放数</label>
                  <input type="number" min="0" value={formData.materials_distributed}
                    onChange={(e) => setFormData({...formData, materials_distributed: parseInt(e.target.value) || 0})} />
                </div>
                <div className="form-group">
                  <label>拓印完成数</label>
                  <input type="number" min="0" value={formData.rubbings_completed}
                    onChange={(e) => setFormData({...formData, rubbings_completed: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="form-group">
                <label>缺料说明（如有缺料请填写）</label>
                <textarea placeholder="请描述缺料情况..." value={formData.shortage_notes}
                  onChange={(e) => setFormData({...formData, shortage_notes: e.target.value})} />
              </div>
              <div className="form-group">
                <label>清理延迟（分钟）</label>
                <input type="number" min="0" value={formData.cleanup_delay}
                  onChange={(e) => setFormData({...formData, cleanup_delay: parseInt(e.target.value) || 0})} />
                <p style={{fontSize: '12px', color: '#888', marginTop: '4px'}}>
                  超过30分钟将被标记为异常
                </p>
              </div>
              <div className="form-group">
                <label>参与反馈评分</label>
                <select value={formData.feedback_rating}
                  onChange={(e) => setFormData({...formData, feedback_rating: parseInt(e.target.value)})}>
                  <option value="5">5 - 非常满意</option>
                  <option value="4">4 - 满意</option>
                  <option value="3">3 - 一般</option>
                  <option value="2">2 - 不满意</option>
                  <option value="1">1 - 非常不满意</option>
                </select>
              </div>
              <div className="form-group">
                <label>参与反馈详情</label>
                <textarea placeholder="参与者的反馈意见..." value={formData.participation_feedback}
                  onChange={(e) => setFormData({...formData, participation_feedback: e.target.value})} />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  提交记录
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SessionRecords
