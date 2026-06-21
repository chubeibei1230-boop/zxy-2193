import React from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'

function Layout() {
  const { user, logout, isAdmin } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="logo">
          <h2>🌿 植物拓印</h2>
          <p className="subtitle">活动管理系统</p>
        </div>
        
        <nav className="nav-menu">
          <NavLink to="/dashboard" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📊</span>
            <span>数据概览</span>
          </NavLink>
          
          {isAdmin() && (
            <NavLink to="/materials" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">📦</span>
              <span>材料包管理</span>
            </NavLink>
          )}
          
          <NavLink to="/sessions" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📅</span>
            <span>活动场次</span>
          </NavLink>
          
          <NavLink to="/records" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
            <span className="nav-icon">📝</span>
            <span>场次记录</span>
          </NavLink>
          
          {isAdmin() && (
            <NavLink to="/anomalies" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">⚠️</span>
              <span>异常复核</span>
            </NavLink>
          )}
          
          {isAdmin() && (
            <NavLink to="/assistants" className={({isActive}) => `nav-item ${isActive ? 'active' : ''}`}>
              <span className="nav-icon">👥</span>
              <span>助理账号</span>
            </NavLink>
          )}
        </nav>
      </aside>
      
      <main className="main-content">
        <header className="top-header">
          <div className="header-title">
            <h1>植物拓印活动管理系统</h1>
          </div>
          <div className="header-user">
            <span className="user-role">{user?.role === 'admin' ? '管理员' : '助理'}</span>
            <span className="user-name">{user?.name}</span>
            <button className="logout-btn" onClick={handleLogout}>退出</button>
          </div>
        </header>
        
        <div className="content-area">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

export default Layout
