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
  const [completionTrend, setCompletionTrend] = useState([])
  const [shortageTrend, setShortageTrend] = useState([])
  const [workload, setWorkload] = useState([])
  const [pendingItems, setPendingItems] = useState({ pending_records: [], open_anomalies: [] })
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
  }, [])

  const fetchDashboardData = async () => {
    try {
      const [overviewRes, completionRes, shortageRes, workloadRes, pendingRes] = await Promise.all([
        axios.get('/api/dashboard/overview', { params: filters }),
        axios.get('/api/dashboard/completion-trend', { params: { days: 14 } }),
        axios.get('/api/dashboard/shortage-trend', { params: { days: 14 } }),
        axios.get('/api/dashboard/assistant-workload', { params: filters }),
        axios.get('/api/dashboard/pending-items', { params: { limit: 10 } })
      ])
      
      setOverview(overviewRes.data)
      setCompletionTrend(completionRes.data.trend || [])
      setShortageTrend(shortageRes.data.trend || [])
      setWorkload(workloadRes.data.workload || [])
      setPendingItems(pendingRes.data)
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

        <div className="card">
          <h3 className="chart-title">待复核事项</h3>
          <div style={{maxHeight: '250px', overflowY: 'auto'}}>
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
      </div>
    </div>
  )
}

export default Dashboard
