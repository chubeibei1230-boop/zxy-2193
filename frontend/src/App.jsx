import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import MaterialPackages from './pages/MaterialPackages.jsx'
import SessionRecords from './pages/SessionRecords.jsx'
import AnomalyReview from './pages/AnomalyReview.jsx'
import Sessions from './pages/Sessions.jsx'
import Assistants from './pages/Assistants.jsx'
import SupplementRequests from './pages/SupplementRequests.jsx'

function PrivateRoute({ children, requireAdmin = false }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading">加载中...</div>
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (requireAdmin && user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function App() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <Login />} />
      
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="materials" element={<PrivateRoute requireAdmin={true}><MaterialPackages /></PrivateRoute>} />
        <Route path="sessions" element={<Sessions />} />
        <Route path="records" element={<SessionRecords />} />
        <Route path="anomalies" element={<AnomalyReview />} />
        <Route path="supplements" element={<PrivateRoute requireAdmin={true}><SupplementRequests /></PrivateRoute>} />
        <Route path="assistants" element={<PrivateRoute requireAdmin={true}><Assistants /></PrivateRoute>} />
      </Route>
      
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default App
