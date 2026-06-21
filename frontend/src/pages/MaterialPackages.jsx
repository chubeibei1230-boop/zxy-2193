import React, { useState, useEffect } from 'react'
import axios from 'axios'

function MaterialPackages() {
  const [packages, setPackages] = useState([])
  const [fabrics, setFabrics] = useState([])
  const [paints, setPaints] = useState([])
  const [activeTab, setActiveTab] = useState('packages')
  const [showModal, setShowModal] = useState(false)
  const [modalType, setModalType] = useState('package')
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({})
  const [filters, setFilters] = useState({
    status: '',
    keyword: ''
  })

  useEffect(() => {
    if (activeTab === 'packages') fetchPackages()
    else if (activeTab === 'fabrics') fetchFabrics()
    else if (activeTab === 'paints') fetchPaints()
  }, [activeTab, filters])

  const fetchPackages = async () => {
    try {
      const res = await axios.get('/api/materials/packages', { params: filters })
      setPackages(res.data.packages)
    } catch (err) {
      console.error('获取材料包失败:', err)
    }
  }

  const fetchFabrics = async () => {
    try {
      const res = await axios.get('/api/materials/fabrics')
      setFabrics(res.data.fabrics)
    } catch (err) {
      console.error('获取布片规格失败:', err)
    }
  }

  const fetchPaints = async () => {
    try {
      const res = await axios.get('/api/materials/paints')
      setPaints(res.data.paints)
    } catch (err) {
      console.error('获取颜料批次失败:', err)
    }
  }

  const openAddModal = (type) => {
    setModalType(type)
    setEditingItem(null)
    setFormData({})
    setShowModal(true)
  }

  const openEditModal = (type, item) => {
    setModalType(type)
    setEditingItem(item)
    setFormData(item)
    setShowModal(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (modalType === 'package') {
        if (editingItem) {
          await axios.put(`/api/materials/packages/${editingItem.id}`, formData)
        } else {
          await axios.post('/api/materials/packages', formData)
        }
        fetchPackages()
      } else if (modalType === 'fabric') {
        if (editingItem) {
          await axios.put(`/api/materials/fabrics/${editingItem.id}`, formData)
        } else {
          await axios.post('/api/materials/fabrics', formData)
        }
        fetchFabrics()
      } else if (modalType === 'paint') {
        if (editingItem) {
          await axios.put(`/api/materials/paints/${editingItem.id}`, formData)
        } else {
          await axios.post('/api/materials/paints', formData)
        }
        fetchPaints()
      }
      setShowModal(false)
    } catch (err) {
      alert(err.response?.data?.error || '操作失败')
    }
  }

  const handleDelete = async (type, id) => {
    if (!confirm('确定要删除吗？')) return
    try {
      if (type === 'package') {
        await axios.delete(`/api/materials/packages/${id}`)
        fetchPackages()
      } else if (type === 'fabric') {
        await axios.delete(`/api/materials/fabrics/${id}`)
        fetchFabrics()
      } else if (type === 'paint') {
        await axios.delete(`/api/materials/paints/${id}`)
        fetchPaints()
      }
    } catch (err) {
      alert(err.response?.data?.error || '删除失败')
    }
  }

  const getStatusText = (status) => {
    return status === 'active' ? '启用' : '停用'
  }

  return (
    <div>
      <h2 className="page-title">材料包管理</h2>

      <div className="card">
        <div className="tabs">
          <div className={`tab-item ${activeTab === 'packages' ? 'active' : ''}`} onClick={() => setActiveTab('packages')}>
            材料包
          </div>
          <div className={`tab-item ${activeTab === 'fabrics' ? 'active' : ''}`} onClick={() => setActiveTab('fabrics')}>
            布片规格
          </div>
          <div className={`tab-item ${activeTab === 'paints' ? 'active' : ''}`} onClick={() => setActiveTab('paints')}>
            颜料批次
          </div>
        </div>

        {activeTab === 'packages' && (
          <div className="filter-bar">
            <div className="filter-item">
              <label>状态</label>
              <select value={filters.status} onChange={(e) => setFilters({...filters, status: e.target.value})}>
                <option value="">全部</option>
                <option value="active">启用</option>
                <option value="inactive">停用</option>
              </select>
            </div>
            <div className="filter-item">
              <label>关键词</label>
              <input type="text" placeholder="搜索名称/描述" 
                value={filters.keyword} 
                onChange={(e) => setFilters({...filters, keyword: e.target.value})} />
            </div>
            <div className="filter-item">
              <label>&nbsp;</label>
              <button className="btn btn-primary" onClick={() => openAddModal('package')}>
                + 新增材料包
              </button>
            </div>
          </div>
        )}

        {activeTab === 'packages' && (
          <table>
            <thead>
              <tr>
                <th>名称</th>
                <th>布片规格</th>
                <th>颜料批次</th>
                <th>植物类型</th>
                <th>库存数量</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {packages.map(pkg => (
                <tr key={pkg.id}>
                  <td>
                    <div style={{fontWeight: '500'}}>{pkg.name}</div>
                    <div style={{fontSize: '12px', color: '#888'}}>{pkg.description}</div>
                  </td>
                  <td>{pkg.fabric_name || '-'}</td>
                  <td>{pkg.paint_batch_no || '-'} ({pkg.paint_color || '-'})</td>
                  <td>{pkg.plant_types || '-'}</td>
                  <td>{pkg.quantity}</td>
                  <td>
                    <span className={`status-badge status-${pkg.status === 'active' ? 'completed' : 'paused'}`}>
                      {getStatusText(pkg.status)}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="btn btn-secondary btn-small" onClick={() => openEditModal('package', pkg)}>
                        编辑
                      </button>
                      <button className="btn btn-danger btn-small" onClick={() => handleDelete('package', pkg.id)}>
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'fabrics' && (
          <>
            <div style={{marginBottom: '16px'}}>
              <button className="btn btn-primary" onClick={() => openAddModal('fabric')}>
                + 新增布片规格
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>名称</th>
                  <th>尺寸</th>
                  <th>描述</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {fabrics.map(fabric => (
                  <tr key={fabric.id}>
                    <td>{fabric.name}</td>
                    <td>{fabric.size}</td>
                    <td>{fabric.description || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-secondary btn-small" onClick={() => openEditModal('fabric', fabric)}>
                          编辑
                        </button>
                        <button className="btn btn-danger btn-small" onClick={() => handleDelete('fabric', fabric.id)}>
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {activeTab === 'paints' && (
          <>
            <div style={{marginBottom: '16px'}}>
              <button className="btn btn-primary" onClick={() => openAddModal('paint')}>
                + 新增颜料批次
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>批次号</th>
                  <th>颜色</th>
                  <th>数量</th>
                  <th>生产日期</th>
                  <th>有效期</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {paints.map(paint => (
                  <tr key={paint.id}>
                    <td>{paint.batch_no}</td>
                    <td>{paint.color}</td>
                    <td>{paint.quantity}</td>
                    <td>{paint.production_date || '-'}</td>
                    <td>{paint.expiry_date || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn btn-secondary btn-small" onClick={() => openEditModal('paint', paint)}>
                          编辑
                        </button>
                        <button className="btn btn-danger btn-small" onClick={() => handleDelete('paint', paint.id)}>
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingItem ? '编辑' : '新增'}{modalType === 'package' ? '材料包' : modalType === 'fabric' ? '布片规格' : '颜料批次'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <form onSubmit={handleSubmit}>
              {modalType === 'package' && (
                <>
                  <div className="form-group">
                    <label>名称 *</label>
                    <input type="text" required value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>描述</label>
                    <textarea value={formData.description || ''}
                      onChange={(e) => setFormData({...formData, description: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>布片规格</label>
                    <select value={formData.fabric_spec_id || ''}
                      onChange={(e) => setFormData({...formData, fabric_spec_id: e.target.value})}>
                      <option value="">请选择</option>
                      {fabrics.map(f => (
                        <option key={f.id} value={f.id}>{f.name} ({f.size})</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>颜料批次</label>
                    <select value={formData.paint_batch_id || ''}
                      onChange={(e) => setFormData({...formData, paint_batch_id: e.target.value})}>
                      <option value="">请选择</option>
                      {paints.map(p => (
                        <option key={p.id} value={p.id}>{p.batch_no} - {p.color}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>植物类型</label>
                    <input type="text" placeholder="用逗号分隔" value={formData.plant_types || ''}
                      onChange={(e) => setFormData({...formData, plant_types: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>库存数量</label>
                    <input type="number" value={formData.quantity || 0}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>状态</label>
                    <select value={formData.status || 'active'}
                      onChange={(e) => setFormData({...formData, status: e.target.value})}>
                      <option value="active">启用</option>
                      <option value="inactive">停用</option>
                    </select>
                  </div>
                </>
              )}

              {modalType === 'fabric' && (
                <>
                  <div className="form-group">
                    <label>名称 *</label>
                    <input type="text" required value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>尺寸 *</label>
                    <input type="text" required placeholder="如: 30x30cm" value={formData.size || ''}
                      onChange={(e) => setFormData({...formData, size: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>描述</label>
                    <textarea value={formData.description || ''}
                      onChange={(e) => setFormData({...formData, description: e.target.value})} />
                  </div>
                </>
              )}

              {modalType === 'paint' && (
                <>
                  <div className="form-group">
                    <label>批次号 *</label>
                    <input type="text" required value={formData.batch_no || ''}
                      onChange={(e) => setFormData({...formData, batch_no: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>颜色 *</label>
                    <input type="text" required value={formData.color || ''}
                      onChange={(e) => setFormData({...formData, color: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>数量</label>
                    <input type="number" value={formData.quantity || 0}
                      onChange={(e) => setFormData({...formData, quantity: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>生产日期</label>
                    <input type="date" value={formData.production_date || ''}
                      onChange={(e) => setFormData({...formData, production_date: e.target.value})} />
                  </div>
                  <div className="form-group">
                    <label>有效期</label>
                    <input type="date" value={formData.expiry_date || ''}
                      onChange={(e) => setFormData({...formData, expiry_date: e.target.value})} />
                  </div>
                </>
              )}

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

export default MaterialPackages
