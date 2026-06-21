import React, { useState, useEffect } from 'react'
import axios from 'axios'
import { Line, Bar, Doughnut } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js'
import { useAuth } from '../context/AuthContext.jsx'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [supplementStats, setSupplementStats] = useState(null)
  const [completionTrend, setCompletionTrend] = useState([])
  const [shortageTrend, setShortageTrend] = useState([])
  const [supplementTrend, setSupplementTrend] = useState([])
  const [supplementByReason, setSupplementByReason] = useState([])
  const [supplementBySession, setSupplementBySession] = useState([])
  const [supplementByAssistant, setSupplementByAssistant] = useState([])
  const [workload, setWorkload] = useState([])
  const [pendingItems, setPendingItems] = useState({ pending_records: [], open_anomalies: [], pending_supplements: [] })
  const [packages, setPackages] = useState([])
  const [assistants, setAssistants] = useState([])
  const [filters, setFilters] = useState({
    date_from: '',
    date_to: '',
    material_package_id: '',
    assistant_id: '',
    status: '',
    anomaly_type: ''
  })
  const { isAdmin } = useAuth()

  useEffect(() => {
    fetchDashboardData()
    fetchPackages()
    fetchAssistants()
  }, [])

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

  const fetchDashboardData = async () => {
    try {
      const [overviewRes, completionRes, shortageRes, workloadRes, pendingRes, supplementStatsRes, supplementTrendRes, supplementReasonRes, supplementSessionRes, supplementAssistantRes] = await Promise.all([
        axios.get('/api/dashboard/overview', { params: filters }),
        axios.get('/api/dashboard/completion-trend', { params: { days: 14 } }),
        axios.get('/api/dashboard/shortage-trend', { params: { days: 14 } }),
        axios.get('/api/dashboard/assistant-workload', { params: filters }),
        axios.get('/api/dashboard/pending-items', { params: { limit: 10 } }),
        axios.get('/api/supplements/stats/summary', { params: filters }),
        axios.get('/api/supplements/stats/trend', { params: { days: 14 } }),
        axios.get('/api/supplements/stats/by-reason', { params: filters }),
        axios.get('/api/supplements/stats/by-session', { params: { ...filters, limit: 5 } }),
        axios.get('/api/supplements/stats/by-assistant', { params: filters })
      ])
      
      setOverview(overviewRes.data)
      setCompletionTrend(completionRes.data.trend || [])
      setShortageTrend(shortageRes.data.trend || [])
      setWorkload(workloadRes.data.workload || [])
      setPendingItems(pendingRes.data)
      setSupplementStats(supplementStatsRes.data)
      setSupplementTrend(supplementTrendRes.data.trend || [])
      setSupplementByReason(supplementReasonRes.data || [])
      setSupplementBySession(supplementSessionRes.data || [])
      setSupplementByAssistant(supplementAssistantRes.data || [])
    } catch (error) {
      console.error('获取概览数据失败:', error)
    }
  }

  const completionChartData = {
    labels: completionTrend.map(item => item.date),
    datasets: [
      {
        label: '完成率 (%)',
        data: completionTrend.map(item => item.rate),
        borderColor: '#2d5a3d',
        backgroundColor: 'rgba(45, 90, 61, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const shortageChartData = {
    labels: shortageTrend.map(item => item.date),
    datasets: [
      {
        label: '缺料次数',
        data: shortageTrend.map(item => item.shortage_count),
        borderColor: '#f44336',
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const supplementTrendChartData = {
    labels: supplementTrend.map(item => item.date),
    datasets: [
      {
        label: '补料申请数',
        data: supplementTrend.map(item => item.request_count),
        borderColor: '#ff9800',
        backgroundColor: 'rgba(255, 152, 0, 0.1)',
        fill: true,
        tension: 0.4
      }
    ]
  }

  const supplementReasonChartData = {
    labels: supplementByReason.map(item => {
      const typeMap = {
        'material_shortage': '材料不足',
        'abnormal_loss': '损耗异常',
        'participants_exceeded': '人数超预期',
        'other': '其他'
      }
      return typeMap[item.reason_type] || item.reason_type
    }),
    datasets: [
      {
        data: supplementByReason.map(item => item.count),
        backgroundColor: [
          'rgba(244, 67, 54, 0.8)',
          'rgba(255, 152, 0, 0.8)',
          'rgba(33, 150, 243, 0.8)',
          'rgba(156, 39, 176, 0.8)'
        ],
        borderRadius: 4
      }
    ]
  }

  const workloadChartData = {
    labels: workload.map(item => item.name),
    datasets: [
      {
        label: '场次数量',
        data: workload.map(item => item.session_count),
        backgroundColor: 'rgba(45, 90, 61, 0.8)',
        borderRadius: 4
      }
    ]
  }

  const supplementBySessionChartData = {
    labels: supplementBySession.map(item => `${item.session_no} ${item.title.substring(0, 8)}`),
    datasets: [
      {
        label: '补料申请次数',
        data: supplementBySession.map(item => item.request_count),
        backgroundColor: 'rgba(255, 152, 0, 0.8)',
        borderRadius: 4
      }
    ]
  }

  const supplementByAssistantChartData = {
    labels: supplementByAssistant.map(item => item.name),
    datasets: [
      {
        label: '补料申请次数',
        data: supplementByAssistant.map(item => item.request_count),
        backgroundColor: supplementByAssistant.map(item => 
          item.request_count > 3 ? 'rgba(244, 67, 54, 0.8)' : 
          item.request_count > 1 ? 'rgba(255, 152, 0, 0.8)' : 'rgba(76, 175, 80, 0.8)'
        ),
        borderRadius: 4
      }
    ]
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

  const getSeverityClass = (severity) => {
    return `severity-${severity || 'medium'}`
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

  const getReasonTypeText = (type) => {
    const typeMap = {
      'material_shortage': '材料不足',
      'abnormal_loss': '损耗异常',
      'participants_exceeded': '参与人数超预期',
      'other': '其他原因'
    }
    return typeMap[type] || type
  }

  return (
    <div>
      <h2 className="page-title">数据概览</h2>
      
      <div className="card">
        <div className="filter-bar">
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
            <label>场次状态</label>
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
            <label>材料包</label>
            <select value={filters.material_package_id} onChange={(e) => setFilters({...filters, material_package_id: e.target.value})}>
              <option value="">全部</option>
              {packages.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
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
            <label>异常类型</label>
            <select value={filters.anomaly_type} onChange={(e) => setFilters({...filters, anomaly_type: e.target.value})}>
              <option value="">全部</option>
              <option value="material_shortage">材料短缺</option>
              <option value="shortage_concentration">缺料集中</option>
              <option value="cleanup_delay">清理延迟</option>
              <option value="feedback_issue">反馈异常</option>
              <option value="package_feedback_issue">材料包反馈异常</option>
              <option value="review_missed">复核遗漏</option>
            </select>
          </div>
          <div className="filter-item">
            <label>&nbsp;</label>
            <button className="btn btn-primary btn-small" onClick={fetchDashboardData}>
              查询
            </button>
          </div>
        </div>
      </div>

      {overview && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">总场次</div>
            <div className="stat-value">{overview.total_sessions}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">已完成</div>
            <div className="stat-value">{overview.completed_sessions}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">完成率</div>
            <div className="stat-value">{overview.completion_rate}%</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">拓印总数</div>
            <div className="stat-value">{overview.total_rubbings}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">待复核</div>
            <div className="stat-value" style={{color: '#e65100'}}>{overview.pending_review}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">待处理异常</div>
            <div className="stat-value" style={{color: '#c62828'}}>{overview.open_anomalies}</div>
          </div>
        </div>
      )}

      {supplementStats && (
        <div className="stats-grid" style={{marginTop: '0'}}>
          <div className="stat-card" style={{background: '#fff8e1'}}>
            <div className="stat-label">📦 补料申请总数</div>
            <div className="stat-value" style={{color: '#e65100'}}>{supplementStats.total_requests}</div>
          </div>
          <div className="stat-card" style={{background: '#fff3e0'}}>
            <div className="stat-label">⏳ 待处理补料</div>
            <div className="stat-value" style={{color: '#e65100'}}>{supplementStats.pending_requests}</div>
          </div>
          <div className="stat-card" style={{background: '#ffebee'}}>
            <div className="stat-label">🔥 紧急待处理</div>
            <div className="stat-value" style={{color: '#c62828'}}>{supplementStats.urgent_pending}</div>
          </div>
          <div className="stat-card" style={{background: '#e8f5e9'}}>
            <div className="stat-label">✅ 已通过</div>
            <div className="stat-value" style={{color: '#2e7d32'}}>{supplementStats.approved_requests}</div>
          </div>
          <div className="stat-card" style={{background: '#f5f5f5'}}>
            <div className="stat-label">❌ 已驳回</div>
            <div className="stat-value" style={{color: '#616161'}}>{supplementStats.rejected_requests}</div>
          </div>
          <div className="stat-card" style={{background: '#e3f2fd'}}>
            <div className="stat-label">📊 已补料总量</div>
            <div className="stat-value" style={{color: '#1565c0'}}>
              {supplementStats.total_processed_quantity} / {supplementStats.total_suggested_quantity}
            </div>
          </div>
        </div>
      )}

      <div className="two-col">
        <div className="chart-container">
          <h3 className="chart-title">完成率趋势</h3>
          <div style={{height: '250px'}}>
            <Line data={completionChartData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, max: 100 }
              }
            }} />
          </div>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">缺料趋势</h3>
          <div style={{height: '250px'}}>
            <Line data={shortageChartData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } }
            }} />
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="chart-container">
          <h3 className="chart-title">补料申请趋势</h3>
          <div style={{height: '250px'}}>
            <Line data={supplementTrendChartData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } }
            }} />
          </div>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">补料原因分布</h3>
          <div style={{height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
            {supplementByReason.length > 0 ? (
              <Doughnut data={supplementReasonChartData} options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { boxWidth: 12, font: { size: 12 } } } }
              }} />
            ) : (
              <div className="empty-state">暂无数据</div>
            )}
          </div>
        </div>
      </div>

      <div className="two-col">
        <div className="chart-container">
          <h3 className="chart-title">助理负载</h3>
          <div style={{height: '250px'}}>
            <Bar data={workloadChartData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } }
            }} />
          </div>
        </div>

        <div className="chart-container">
          <h3 className="chart-title">助理补料申请次数</h3>
          <div style={{height: '250px'}}>
            <Bar data={supplementByAssistantChartData} options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: { y: { beginAtZero: true } }
            }} />
          </div>
        </div>
      </div>

      {supplementBySession.length > 0 && (
        <div className="chart-container">
          <h3 className="chart-title">补料申请场次TOP5</h3>
          <div style={{height: '250px'}}>
            <Bar data={supplementBySessionChartData} options={{
              responsive: true,
              maintainAspectRatio: false,
              indexAxis: 'y',
              plugins: { legend: { display: false } },
              scales: { x: { beginAtZero: true } }
            }} />
          </div>
        </div>
      )}

      <div className="two-col">
        <div className="card">
          <h3 className="chart-title">待复核事项</h3>
          <div style={{maxHeight: '300px', overflowY: 'auto'}}>
            {isAdmin() && pendingItems.pending_records?.length > 0 && (
              <div>
                <p style={{fontSize: '13px', color: '#666', marginBottom: '8px'}}>
                  待复核记录 ({pendingItems.pending_records.length})
                </p>
                {pendingItems.pending_records.slice(0, 5).map(record => (
                  <div key={record.id} className="anomaly-item">
                    <div style={{fontSize: '13px', fontWeight: '500'}}>
                      {record.session_title}
                    </div>
                    <div style={{fontSize: '12px', color: '#888', marginTop: '4px'}}>
                      {record.session_date} · {record.assistant_name}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {isAdmin() && pendingItems.open_anomalies?.length > 0 && (
              <div style={{marginTop: '12px'}}>
                <p style={{fontSize: '13px', color: '#666', marginBottom: '8px'}}>
                  待处理异常 ({pendingItems.open_anomalies.length})
                </p>
                {pendingItems.open_anomalies.slice(0, 5).map(anomaly => (
                  <div key={anomaly.id} className={`anomaly-item ${anomaly.severity === 'high' ? 'high' : ''}`}>
                    <div style={{fontSize: '13px', fontWeight: '500'}}>
                      <span className={`status-badge ${getSeverityClass(anomaly.severity)}`}>
                        {anomaly.severity === 'high' ? '高' : anomaly.severity === 'medium' ? '中' : '低'}
                      </span>
                      {' '}{getAnomalyTypeText(anomaly.type)}
                    </div>
                    <div style={{fontSize: '12px', color: '#888', marginTop: '4px'}}>
                      {anomaly.description}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isAdmin() && (
              <div className="empty-state">
                <p>助理账号可查看场次记录</p>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <h3 className="chart-title">待处理补料申请</h3>
          <div style={{maxHeight: '300px', overflowY: 'auto'}}>
            {isAdmin() && pendingItems.pending_supplements?.length > 0 ? (
              <div>
                <p style={{fontSize: '13px', color: '#666', marginBottom: '8px'}}>
                  共 {pendingItems.pending_supplements.length} 条待处理
                </p>
                {pendingItems.pending_supplements.slice(0, 5).map(sup => (
                  <div key={sup.id} className={`anomaly-item ${sup.urgency === 'high' || sup.urgency === 'urgent' ? 'high' : ''}`}>
                    <div style={{fontSize: '13px', fontWeight: '500'}}>
                      <span className={`status-badge urgency-${sup.urgency}`}>
                        {getUrgencyText(sup.urgency)}
                      </span>
                      {' '}
                      <span className="tag">{getReasonTypeText(sup.reason_type)}</span>
                    </div>
                    <div style={{fontSize: '12px', marginTop: '4px'}}>
                      <strong>{sup.session_title}</strong>
                    </div>
                    <div style={{fontSize: '12px', color: '#888', marginTop: '2px'}}>
                      建议数量：{sup.suggested_quantity} · {sup.assistant_name}
                    </div>
                    <div style={{fontSize: '12px', color: '#666', marginTop: '2px'}}>
                      {sup.reason}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>{isAdmin() ? '暂无待处理补料申请' : '助理账号可查看场次记录'}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
