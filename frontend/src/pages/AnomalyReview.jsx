import React, { useState, useEffect } from 'react'
import axios from 'axios'

function AnomalyReview() {
  const [anomalies, setAnomalies] = useState([])
  const [records, setRecords] = useState([])
  const [activeTab, setActiveTab] = useState('anomalies')
  const [showResolveModal, setShowResolveModal] = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null)
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    severity: '',
    date_from: '',
    date_to: ''
  })

  useEffect(() => {
    if (activeTab === 'anomalies') {
      fetchAnomalies()
    } else {
      fetchPendingRecords()
    }
  }, [activeTab, filters])

  const fetchAnomalies = async () => {
    try {
      const res = await axios.get('/api/anomalies', { params: filters })
      setAnomalies(res.data.anomalies)
    } catch (err) {
      console.error('获取异常列表失败:', err)
    }
  }

  const fetchPendingRecords = async () => {
    try {
      const res = await axios.get('/api/records', { 
        params: { status: 'pending_review' } 
      })
      setRecords(res.data.records)
    } catch (err) {
      console.error('获取待复核记录失败:', err)
    }
  }

  const openResolveModal = (anomaly) => {
    setSelectedItem(anomaly)
    setResolutionNotes('')
    setShowResolveModal(true)
  }

  const openReviewModal = (record) => {
    setSelectedItem(record)
    setResolutionNotes('')
    setShowReviewModal(true)
  }

  const handleResolve = async () => {
    try {
      await axios.post(`/api/anomalies/${selectedItem.id}/resolve`, {
        resolution_notes: resolutionNotes
      })
      setShowResolveModal(false)
      fetchAnomalies()
    } catch (err) {
      alert(err.response?.data?.error || '操作失败')
    }
  }

  const handleReview = async (status) => {
    try {
      await axios.post(`/api/records/${selectedItem.id}/review`, {
        review_notes: resolutionNotes,
        status
      })
      setShowReviewModal(false)
      fetchPendingRecords()
    } catch (err) {
      alert(err.response?.data?.error || '操作失败')
    }
  }

  const getAnomalyTypeText = (type) => {
    const typeMap = {
      'material_shortage': '材料短缺',
      'shortage_concentration': '缺料集中',
      'cleanup_delay': '清理延迟',
      'feedback_issue': '反馈异常',
      'package_feedback_issue': '材料包反馈异常',
      'review_missed': '复核遗漏'
    }
    return typeMap[type] || type
  }

  const getSeverityText = (severity) => {
    const map = { 'high': '高', 'medium': '中', 'low': '低' }
    return map[severity] || severity
  }

  const getStatusText = (status) => {
    const statusMap = {
      'open': '待处理',
      'resolved': '已关闭'
    }
    return statusMap[status] || status
  }

  return (
    <div>
      <h2 className="page-title">异常复核</h2>

      <div className="card">
        <div className="tabs">
          <div className={`tab-item ${activeTab === 'anomalies' ? 'active' : ''}`} 
            onClick={() => setActiveTab('anomalies')}>
            异常列表
          </div>
          <div className={`tab-item ${activeTab === 'records' ? 'active' : ''}`} 
            onClick={() => setActiveTab('records')}>
            待复核记录
          </div>
        </div>

        <div className="filter-bar">
          <div className="filter-item">
            <label>状态</label>
            <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
              <option value="">全部</option>
              {activeTab === 'anomalies' ? (
                <>
                  <option value="open">待处理</option>
                  <option value="resolved">已关闭</option>
                </>
              ) : (
                <>
                  <option value="pending_review">待复核</option>
                  <option value="reviewed">已复核</option>
                </>
              )}
            </select>
          </div>
          {activeTab === 'anomalies' && (
            <>
              <div className="filter-item">
                <label>异常类型</label>
                <select value={filters.type} onChange={(e) => setFilters({...filters, type: e.target.value})}>
                  <option value="">全部</option>
                  <option value="material_shortage">材料短缺</option>
                  <option value="shortage_concentration">缺料集中</option>
                  <option value="cleanup_delay">清理延迟</option>
                  <option value="feedback_issue">反馈异常</option>
                  <option value="package_feedback_issue">材料包反馈异常</option>
                </select>
              </div>
              <div className="filter-item">
                <label>严重程度</label>
                <select value={filters.severity} onChange={(e) => setFilters({...filters, severity: e.target.value})}>
                  <option value="">全部</option>
                  <option value="high">高</option>
                  <option value="medium">中</option>
                  <option value="low">低</option>
                </select>
              </div>
            </>
          )}
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

        {activeTab === 'anomalies' && (
          <table>
            <thead>
              <tr>
                <th>异常类型</th>
                <th>严重程度</th>
                <th>描述</th>
                <th>关联场次</th>
                <th>材料包</th>
                <th>助理</th>
                <th>状态</th>
                <th>创建时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {anomalies.map(anomaly => (
                <tr key={anomaly.id}>
                  <td style={{fontWeight: '500'}}>{getAnomalyTypeText(anomaly.type)}</td>
                  <td>
                    <span className={`status-badge severity-${anomaly.severity}`}>
                      {getSeverityText(anomaly.severity)}
                    </span>
                  </td>
                  <td style={{maxWidth: '250px'}}>{anomaly.description}</td>
                  <td>{anomaly.session_title || '-'}</td>
                  <td>{anomaly.material_package_name || '-'}</td>
                  <td>{anomaly.assistant_name || '-'}</td>
                  <td>
                    <span className={`status-badge ${anomaly.status === 'open' ? 'status-pending_review' : 'status-completed'}`}>
                      {getStatusText(anomaly.status)}
                    </span>
                  </td>
                  <td style={{fontSize: '12px', color: '#888'}}>{anomaly.created_at}</td>
                  <td>
                    {anomaly.status === 'open' && (
                      <button className="btn btn-primary btn-small" 
                        onClick={() => openResolveModal(anomaly)}>
                        处理
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'records' && (
          <table>
            <thead>
              <tr>
                <th>场次</th>
                <th>日期</th>
                <th>助理</th>
                <th>材料发放</th>
                <th>拓印完成</th>
                <th>异常标记</th>
                <th>状态</th>
                <th>提交时间</th>
                <th>操作</th>
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
                      {record.status === 'pending_review' ? '待复核' : '已复核'}
                    </span>
                  </td>
                  <td style={{fontSize: '12px', color: '#888'}}>{record.created_at}</td>
                  <td>
                    {record.status === 'pending_review' && (
                      <button className="btn btn-primary btn-small" 
                        onClick={() => openReviewModal(record)}>
                        复核
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {(activeTab === 'anomalies' && anomalies.length === 0) ||
         (activeTab === 'records' && records.length === 0) ? (
          <div className="empty-state">暂无数据</div>
        ) : null}
      </div>

      {showResolveModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowResolveModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>处理异常</h3>
              <button className="modal-close" onClick={() => setShowResolveModal(false)}>&times;</button>
            </div>
            <div style={{marginBottom: '16px'}}>
              <p><strong>异常类型：</strong>{getAnomalyTypeText(selectedItem.type)}</p>
              <p><strong>描述：</strong>{selectedItem.description}</p>
            </div>
            <div className="form-group">
              <label>处理说明</label>
              <textarea placeholder="请输入处理说明..." 
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowResolveModal(false)}>
                取消
              </button>
              <button className="btn btn-primary" onClick={handleResolve}>
                关闭异常
              </button>
            </div>
          </div>
        </div>
      )}

      {showReviewModal && selectedItem && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>复核记录</h3>
              <button className="modal-close" onClick={() => setShowReviewModal(false)}>&times;</button>
            </div>
            <div style={{marginBottom: '16px', padding: '10px', background: '#f5f5f5', borderRadius: '4px'}}>
              <p><strong>场次：</strong>{selectedItem.session_title}</p>
              <p><strong>助理：</strong>{selectedItem.assistant_name}</p>
              <p><strong>拓印完成：</strong>{selectedItem.rubbings_completed} / {selectedItem.materials_distributed}</p>
              {selectedItem.shortage_notes && (
                <p><strong>缺料说明：</strong>{selectedItem.shortage_notes}</p>
              )}
              {selectedItem.cleanup_delay > 0 && (
                <p><strong>清理延迟：</strong>{selectedItem.cleanup_delay} 分钟</p>
              )}
              {selectedItem.participation_feedback && (
                <p><strong>参与反馈：</strong>{selectedItem.participation_feedback}</p>
              )}
            </div>
            <div className="form-group">
              <label>复核意见</label>
              <textarea placeholder="请输入复核意见..." 
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)} />
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowReviewModal(false)}>
                取消
              </button>
              <button className="btn btn-success" onClick={() => handleReview('reviewed')}>
                通过复核
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AnomalyReview
