import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { useAuth } from '../context/AuthContext.jsx'

function SessionRecords() {
  const [records, setRecords] = useState([])
  const [sessions, setSessions] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [showSupplementModal, setShowSupplementModal] = useState(false)
  const [selectedSession, setSelectedSession] = useState(null)
  const [formData, setFormData] = useState({
    materials_distributed: 0,
    rubbings_completed: 0,
    shortage_notes: '',
    cleanup_delay: 0,
    participation_feedback: '',
    feedback_rating: 5
  })
  const [needSupplement, setNeedSupplement] = useState(false)
  const [supplementData, setSupplementData] = useState({
    reason_type: 'material_shortage',
    reason: '',
    urgency: 'medium',
    suggested_quantity: 0,
    notes: ''
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
    setNeedSupplement(false)
    setSupplementData({
      reason_type: 'material_shortage',
      reason: '',
      urgency: 'medium',
      suggested_quantity: 0,
      notes: ''
    })
    setShowModal(true)
  }

  const openSupplementOnlyModal = (session) => {
    setSelectedSession(session)
    setSupplementData({
      reason_type: 'material_shortage',
      reason: '',
      urgency: 'medium',
      suggested_quantity: 0,
      notes: ''
    })
    setShowSupplementModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedSession) return
    
    try {
      const res = await axios.post('/api/records', {
        ...formData,
        session_id: selectedSession.id
      })

      if (needSupplement && supplementData.reason && supplementData.reason.trim()) {
        await axios.post('/api/supplements', {
          session_id: selectedSession.id,
          record_id: res.data.id,
          material_package_id: selectedSession.material_package_id,
          ...supplementData
        })
      }

      setShowModal(false)
      fetchRecords()
      fetchSessions()
      alert(needSupplement ? '记录与补料申请提交成功' : '记录提交成功，已进入待复核状态')
    } catch (err) {
      alert(err.response?.data?.error || '提交失败')
    }
  }

  const handleSupplementOnlySubmit = async (e) => {
    e.preventDefault()
    if (!selectedSession) return

    if (!supplementData.reason || !supplementData.reason.trim()) {
      alert('请填写申请原因')
      return
    }

    try {
      await axios.post('/api/supplements', {
        session_id: selectedSession.id,
        material_package_id: selectedSession.material_package_id,
        ...supplementData
      })
      setShowSupplementModal(false)
      fetchSessions()
      alert('补料申请提交成功')
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

  const getReasonTypeText = (type) => {
    const typeMap = {
      'material_shortage': '材料不足',
      'abnormal_loss': '损耗异常',
      'participants_exceeded': '参与人数超预期',
      'other': '其他原因'
    }
    return typeMap[type] || type
  }

  const getUrgencyText = (urgency) => {
    const urgencyMap = {
      'low': '低',
      'medium': '中',
      'high': '高',
      'urgent': '紧急'
    }
    return urgencyMap[urgency] || urgency
  }

  const getSupplementStatusText = (status) => {
    const statusMap = {
      'pending': '待处理',
      'approved': '已通过',
      'rejected': '已驳回',
      'partial': '部分通过'
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
            <div style={{marginBottom: '10px', fontWeight: '500'}}>当前进行中的场次：</div>
            <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px'}}>
              {sessions.map(s => (
                <div key={s.id} style={{display: 'inline-flex', alignItems: 'center', gap: '6px', marginBottom: '4px'}}>
                  <button className="btn btn-primary btn-small" onClick={() => openSubmitModal(s)}>
                    记录：{s.title}
                  </button>
                  <button className="btn btn-secondary btn-small" onClick={() => openSupplementOnlyModal(s)}>
                    📦 单独补料
                  </button>
                  {s.supplement_pending_count > 0 && (
                    <span className="status-badge status-need_supplement" style={{fontSize: '11px'}}>
                      {s.supplement_pending_count} 项待处理
                    </span>
                  )}
                </div>
              ))}
            </div>
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
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>提交场次记录</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div style={{marginBottom: '16px', padding: '10px', background: '#f5f5f5', borderRadius: '4px'}}>
              <p><strong>场次：</strong>{selectedSession.title}</p>
              <p style={{fontSize: '13px', color: '#666'}}>
                {selectedSession.date} {selectedSession.time_start} - {selectedSession.time_end}
              </p>
              {selectedSession.expected_participants > 0 && (
                <p style={{fontSize: '13px', color: '#666'}}>
                  预计参与人数：{selectedSession.expected_participants} 人
                </p>
              )}
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

              <div style={{padding: '12px', background: '#fff3e0', borderRadius: '4px', margin: '16px 0', border: '1px solid #ffe0b2'}}>
                <label style={{display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: '500'}}>
                  <input 
                    type="checkbox" 
                    checked={needSupplement}
                    onChange={(e) => setNeedSupplement(e.target.checked)}
                    style={{width: '16px', height: '16px'}}
                  />
                  <span>同时发起补料申请（如遇材料不足、损耗异常或实际参与人数明显高于预期等情况）</span>
                </label>
              </div>

              {needSupplement && (
                <div style={{padding: '16px', background: '#f9fbe7', borderRadius: '4px', marginBottom: '16px', border: '1px solid #c5e1a5'}}>
                  <h4 style={{marginBottom: '12px', color: '#33691e'}}>补料申请信息</h4>
                  <div className="form-group">
                    <label>补料原因类型 *</label>
                    <select value={supplementData.reason_type}
                      onChange={(e) => setSupplementData({...supplementData, reason_type: e.target.value})}>
                      <option value="material_shortage">材料不足</option>
                      <option value="abnormal_loss">损耗异常</option>
                      <option value="participants_exceeded">参与人数超预期</option>
                      <option value="other">其他原因</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>申请原因 *</label>
                    <textarea placeholder="请详细说明补料原因..." value={supplementData.reason}
                      onChange={(e) => setSupplementData({...supplementData, reason: e.target.value})} />
                  </div>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                    <div className="form-group">
                      <label>紧急程度</label>
                      <select value={supplementData.urgency}
                        onChange={(e) => setSupplementData({...supplementData, urgency: e.target.value})}>
                        <option value="low">低</option>
                        <option value="medium">中</option>
                        <option value="high">高</option>
                        <option value="urgent">紧急</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>建议补料数量</label>
                      <input type="number" min="0" value={supplementData.suggested_quantity}
                        onChange={(e) => setSupplementData({...supplementData, suggested_quantity: parseInt(e.target.value) || 0})} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label>备注</label>
                    <textarea placeholder="其他需要说明的事项..." value={supplementData.notes}
                      onChange={(e) => setSupplementData({...supplementData, notes: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  {needSupplement ? '提交记录与补料申请' : '提交记录'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSupplementModal && selectedSession && (
        <div className="modal-overlay" onClick={() => setShowSupplementModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>发起补料申请</h3>
              <button className="modal-close" onClick={() => setShowSupplementModal(false)}>&times;</button>
            </div>
            <div style={{marginBottom: '16px', padding: '10px', background: '#f5f5f5', borderRadius: '4px'}}>
              <p><strong>场次：</strong>{selectedSession.title}</p>
              <p style={{fontSize: '13px', color: '#666'}}>
                {selectedSession.date} {selectedSession.time_start} - {selectedSession.time_end}
              </p>
              {selectedSession.material_package_name && (
                <p style={{fontSize: '13px', color: '#666'}}>
                  材料包：{selectedSession.material_package_name}
                </p>
              )}
            </div>
            <form onSubmit={handleSupplementOnlySubmit}>
              <div className="form-group">
                <label>补料原因类型 *</label>
                <select value={supplementData.reason_type}
                  onChange={(e) => setSupplementData({...supplementData, reason_type: e.target.value})}>
                  <option value="material_shortage">材料不足</option>
                  <option value="abnormal_loss">损耗异常</option>
                  <option value="participants_exceeded">参与人数超预期</option>
                  <option value="other">其他原因</option>
                </select>
              </div>
              <div className="form-group">
                <label>申请原因 *</label>
                <textarea placeholder="请详细说明补料原因..." value={supplementData.reason}
                  onChange={(e) => setSupplementData({...supplementData, reason: e.target.value})} />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'}}>
                <div className="form-group">
                  <label>紧急程度</label>
                  <select value={supplementData.urgency}
                    onChange={(e) => setSupplementData({...supplementData, urgency: e.target.value})}>
                    <option value="low">低</option>
                    <option value="medium">中</option>
                    <option value="high">高</option>
                    <option value="urgent">紧急</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>建议补料数量</label>
                  <input type="number" min="0" value={supplementData.suggested_quantity}
                    onChange={(e) => setSupplementData({...supplementData, suggested_quantity: parseInt(e.target.value) || 0})} />
                </div>
              </div>
              <div className="form-group">
                <label>备注</label>
                <textarea placeholder="其他需要说明的事项..." value={supplementData.notes}
                  onChange={(e) => setSupplementData({...supplementData, notes: e.target.value})} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowSupplementModal(false)}>
                  取消
                </button>
                <button type="submit" className="btn btn-primary">
                  提交补料申请
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
