import React, { useState, useEffect } from 'react'
import axios from 'axios'

function SupplementRequests() {
  const [requests, setRequests] = useState([])
  const [showProcessModal, setShowProcessModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState(null)
  const [processAction, setProcessAction] = useState('approve')
  const [processedQuantity, setProcessedQuantity] = useState(0)
  const [processingNotes, setProcessingNotes] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    urgency: '',
    reason_type: '',
    date_from: '',
    date_to: ''
  })
  const [activeTab, setActiveTab] = useState('all')

  useEffect(() => {
    fetchRequests()
  }, [filters, activeTab])

  const fetchRequests = async () => {
    try {
      const params = {...filters}
      if (activeTab === 'pending') {
        params.status = 'pending'
      }
      const res = await axios.get('/api/supplements', { params })
      setRequests(res.data.requests)
    } catch (err) {
      console.error('获取补料申请列表失败:', err)
    }
  }

  const openProcessModal = (request, action) => {
    setSelectedRequest(request)
    setProcessAction(action)
    setProcessedQuantity(action === 'approve' ? request.suggested_quantity : (action === 'partial' ? Math.floor(request.suggested_quantity / 2) : 0))
    setProcessingNotes('')
    setShowProcessModal(true)
  }

  const handleProcess = async (e) => {
    e.preventDefault()
    if (!selectedRequest) return

    try {
      await axios.post(`/api/supplements/${selectedRequest.id}/process`, {
        action: processAction,
        processed_quantity: processAction === 'reject' ? 0 : processedQuantity,
        processing_notes: processingNotes
      })
      setShowProcessModal(false)
      fetchRequests()
      alert('处理成功')
    } catch (err) {
      alert(err.response?.data?.error || '处理失败')
    }
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

  const getUrgencyClass = (urgency) => {
    return `urgency-${urgency || 'medium'}`
  }

  const getStatusText = (status) => {
    const statusMap = {
      'pending': '待处理',
      'approved': '已通过',
      'rejected': '已驳回',
      'partial': '部分通过'
    }
    return statusMap[status] || status
  }

  const getStatusClass = (status) => {
    const classMap = {
      'pending': 'status-pending_review',
      'approved': 'status-completed',
      'rejected': 'status-paused',
      'partial': 'status-in_progress'
    }
    return classMap[status] || ''
  }

  const pendingCount = requests.filter(r => r.status === 'pending').length
  const urgentPendingCount = requests.filter(r => r.status === 'pending' && (r.urgency === 'high' || r.urgency === 'urgent')).length

  return (
    <div>
      <h2 className="page-title">补料申请管理</h2>

      <div className="stats-grid" style={{gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: '20px'}}>
        <div className="stat-card">
          <div className="stat-label">申请总数</div>
          <div className="stat-value">{requests.length}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">待处理</div>
          <div className="stat-value" style={{color: '#e65100'}}>{pendingCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">紧急待处理</div>
          <div className="stat-value" style={{color: '#c62828'}}>{urgentPendingCount}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">已处理</div>
          <div className="stat-value" style={{color: '#2e7d32'}}>{requests.length - pendingCount}</div>
        </div>
      </div>

      <div className="card">
        <div className="tabs">
          <div 
            className={`tab-item ${activeTab === 'all' ? 'active' : ''}`} 
            onClick={() => setActiveTab('all')}
          >
            全部申请
          </div>
          <div 
            className={`tab-item ${activeTab === 'pending' ? 'active' : ''}`} 
            onClick={() => setActiveTab('pending')}
          >
            待处理 {pendingCount > 0 && <span style={{background: '#f44336', color: 'white', borderRadius: '10px', padding: '1px 8px', fontSize: '12px', marginLeft: '4px'}}>{pendingCount}</span>}
          </div>
        </div>

        <div className="filter-bar">
          <div className="filter-item">
            <label>紧急程度</label>
            <select value={filters.urgency} onChange={(e) => setFilters({...filters, urgency: e.target.value})}>
              <option value="">全部</option>
              <option value="urgent">紧急</option>
              <option value="high">高</option>
              <option value="medium">中</option>
              <option value="low">低</option>
            </select>
          </div>
          <div className="filter-item">
            <label>原因类型</label>
            <select value={filters.reason_type} onChange={(e) => setFilters({...filters, reason_type: e.target.value})}>
              <option value="">全部</option>
              <option value="material_shortage">材料不足</option>
              <option value="abnormal_loss">损耗异常</option>
              <option value="participants_exceeded">参与人数超预期</option>
              <option value="other">其他原因</option>
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
        </div>

        <table>
          <thead>
            <tr>
              <th>场次</th>
              <th>材料包</th>
              <th>申请人</th>
              <th>原因类型</th>
              <th>紧急程度</th>
              <th>建议数量</th>
              <th>已处理数量</th>
              <th>申请时间</th>
              <th>状态</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.id}>
                <td>
                  <div style={{fontWeight: '500'}}>{req.session_title}</div>
                  <div style={{fontSize: '12px', color: '#888'}}>{req.session_no} · {req.session_date}</div>
                </td>
                <td>{req.material_package_name || '-'}</td>
                <td>{req.assistant_name}</td>
                <td>
                  <span className="tag">{getReasonTypeText(req.reason_type)}</span>
                </td>
                <td>
                  <span className={`status-badge ${getUrgencyClass(req.urgency)}`}>
                    {getUrgencyText(req.urgency)}
                  </span>
                </td>
                <td>{req.suggested_quantity}</td>
                <td>{req.processed_quantity || 0}</td>
                <td>
                  <div>{new Date(req.created_at).toLocaleDateString('zh-CN')}</div>
                  <div style={{fontSize: '12px', color: '#888'}}>{new Date(req.created_at).toLocaleTimeString('zh-CN', {hour: '2-digit', minute: '2-digit'})}</div>
                </td>
                <td>
                  <span className={`status-badge ${getStatusClass(req.status)}`}>
                    {getStatusText(req.status)}
                  </span>
                </td>
                <td>
                  {req.status === 'pending' && (
                    <div className="action-buttons">
                      <button className="btn btn-success btn-small" onClick={() => openProcessModal(req, 'approve')}>
                        通过
                      </button>
                      <button className="btn btn-secondary btn-small" onClick={() => openProcessModal(req, 'partial')}>
                        部分通过
                      </button>
                      <button className="btn btn-danger btn-small" onClick={() => openProcessModal(req, 'reject')}>
                        驳回
                      </button>
                    </div>
                  )}
                  {req.status !== 'pending' && (
                    <div style={{fontSize: '12px', color: '#888'}}>
                      <div>处理人：{req.processor_name || '-'}</div>
                      {req.processing_notes && <div>说明：{req.processing_notes}</div>}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {requests.length === 0 && (
          <div className="empty-state">暂无补料申请数据</div>
        )}
      </div>

      {showProcessModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowProcessModal(false)}>
          <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {processAction === 'approve' ? '通过补料申请' : processAction === 'partial' ? '部分通过补料申请' : '驳回补料申请'}
              </h3>
              <button className="modal-close" onClick={() => setShowProcessModal(false)}>&times;</button>
            </div>

            <div style={{padding: '12px', background: '#f5f5f5', borderRadius: '4px', marginBottom: '16px'}}>
              <p><strong>场次：</strong>{selectedRequest.session_title}</p>
              <p><strong>申请人：</strong>{selectedRequest.assistant_name}</p>
              <p><strong>原因类型：</strong>{getReasonTypeText(selectedRequest.reason_type)}</p>
              <p><strong>紧急程度：</strong>{getUrgencyText(selectedRequest.urgency)}</p>
              <p><strong>申请原因：</strong>{selectedRequest.reason}</p>
              <p><strong>建议补料数量：</strong>{selectedRequest.suggested_quantity}</p>
              {selectedRequest.notes && <p><strong>备注：</strong>{selectedRequest.notes}</p>}
            </div>

            <form onSubmit={handleProcess}>
              {processAction !== 'reject' && (
                <div className="form-group">
                  <label>实际补料数量 *</label>
                  <input 
                    type="number" 
                    min="0" 
                    max={selectedRequest.suggested_quantity}
                    value={processedQuantity}
                    onChange={(e) => setProcessedQuantity(parseInt(e.target.value) || 0)} 
                  />
                  <p style={{fontSize: '12px', color: '#888', marginTop: '4px'}}>
                    建议数量：{selectedRequest.suggested_quantity}
                    {processAction === 'partial' && '（部分通过时数量应小于建议数量）'}
                  </p>
                </div>
              )}
              <div className="form-group">
                <label>处理说明{processAction === 'reject' ? ' *' : ''}</label>
                <textarea 
                  placeholder={processAction === 'reject' ? '请填写驳回原因...' : '请填写处理说明（可选）...'} 
                  value={processingNotes}
                  onChange={(e) => setProcessingNotes(e.target.value)}
                  required={processAction === 'reject'}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowProcessModal(false)}>
                  取消
                </button>
                <button type="submit" className={`btn ${processAction === 'reject' ? 'btn-danger' : processAction === 'partial' ? 'btn-secondary' : 'btn-success'}`}>
                  {processAction === 'approve' ? '确认通过' : processAction === 'partial' ? '确认部分通过' : '确认驳回'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default SupplementRequests
