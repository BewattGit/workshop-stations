<script setup>
import { ref, computed, reactive, onMounted } from 'vue'

const STORAGE_KEY = 'workshop_stations_v1'

// 状态
const searchQuery = ref('')
const searchResult = ref(null)
const showModal = ref(false)
const selectedStation = ref(null)
const cellRefs = reactive({})
const form = reactive({ model: '', machineNo: '', unitNo: '' })

// 生成工位数据
const generateStations = () => {
  const stations = {}

  // 列字母 A-N (14列)
  const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']

  columns.forEach((col, colIndex) => {
    // 前3列是重型区（只有3行），后11列是轻型区（4行）
    const zone = colIndex < 3 ? 'heavy' : 'light'
    const rows = colIndex < 3 ? 3 : 4

    for (let row = 1; row <= rows; row++) {
      const id = `${col}${row}`
      stations[id] = { id, zone, data: null }
    }
  })

  return stations
}

const stations = ref(generateStations())

// 列定义
const columns = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N']
const heavyColumns = columns.slice(0, 3)  // A, B, C
const lightColumns = columns.slice(3)     // D-N
const maxRows = 4

// 获取指定位置的工位
const getStation = (col, row) => {
  const id = `${col}${row}`
  return stations.value[id] || null
}

// 计算属性
const totalStations = computed(() => Object.keys(stations.value).length)
const occupiedCount = computed(() => Object.values(stations.value).filter(s => s.data).length)
const staleCount = computed(() => Object.values(stations.value).filter(s => s.data && isStale(s)).length)

// 型号统计
const modelStats = computed(() => {
  const stats = {}
  Object.values(stations.value).forEach(s => {
    if (s.data?.model) {
      const model = s.data.model
      stats[model] = (stats[model] || 0) + 1
    }
  })
  return stats
})

// 方法
const isStale = (s) => {
  if (!s?.data?.updatedAt) return false
  return daysSince(s) > 3
}

const daysSince = (s) => {
  if (!s?.data?.updatedAt) return 0
  return Math.floor((Date.now() - new Date(s.data.updatedAt)) / (1000 * 60 * 60 * 24))
}

const formatTime = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const openModal = (s) => {
  selectedStation.value = s
  form.model = s.data?.model || ''
  form.machineNo = s.data?.machineNo || ''
  form.unitNo = s.data?.unitNo || ''
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  selectedStation.value = null
  form.model = ''
  form.machineNo = ''
  form.unitNo = ''
}

const saveStation = () => {
  if (form.model.trim() || form.machineNo.trim() || form.unitNo.trim()) {
    stations.value[selectedStation.value.id].data = {
      model: form.model.trim(),
      machineNo: form.machineNo.trim(),
      unitNo: form.unitNo.trim(),
      updatedAt: new Date().toISOString()
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stations.value))
  }
  closeModal()
}

const clearStation = () => {
  stations.value[selectedStation.value.id].data = null
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stations.value))
  closeModal()
}

const doSearch = () => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) {
    searchResult.value = { icon: '⚠️', text: '请输入编号' }
    return
  }

  const found = Object.entries(stations.value).find(([id, s]) => {
    return s.data?.machineNo?.toLowerCase().includes(q) ||
           s.data?.unitNo?.toLowerCase().includes(q)
  })

  if (found) {
    const [id, s] = found
    const info = s.data.machineNo ? `光机: ${s.data.machineNo}` : `整机: ${s.data.unitNo}`
    searchResult.value = { icon: '✅', text: `${id} - ${info}` }
    const el = cellRefs[id]
    if (el) {
      el.classList.add('highlight')
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      setTimeout(() => el.classList.remove('highlight'), 1500)
    }
  } else {
    searchResult.value = { icon: '❌', text: `未找到 "${searchQuery.value}"` }
  }
}

const loadFromStorage = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      Object.keys(parsed).forEach(k => {
        if (stations.value[k]) stations.value[k] = parsed[k]
      })
    } catch (e) {
      console.error('加载失败', e)
    }
  }
}

onMounted(() => {
  loadFromStorage()
})
</script>

<template>
  <div class="app">
    <!-- 主内容 -->
    <div class="main">
      <!-- 统计与搜索栏 -->
      <div class="stats-bar">
        <div class="stats-left">
          <template v-if="Object.keys(modelStats).length > 0">
            <span v-for="(count, model) in modelStats" :key="model" class="model-stat">
              <strong>{{ model }}</strong> {{ count }}台
            </span>
          </template>
          <span v-else class="empty-stats">暂无生产数据</span>
        </div>
        <div class="search-section">
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索编号..."
            class="search-box"
            @keyup.enter="doSearch"
          >
          <button @click="doSearch" class="search-btn">🔍</button>
        </div>
      </div>

      <!-- 工位网格 -->
      <div class="workshop-grid">
        <!-- 列标题 -->
        <div class="grid-header">
          <div class="corner-cell"></div>
          <div v-for="col in columns" :key="col" class="col-header" :class="{ 'heavy-col': heavyColumns.includes(col) }">
            {{ col }}
          </div>
        </div>

        <!-- 行 -->
        <div v-for="row in maxRows" :key="row" class="grid-row">
          <!-- 行标题 -->
          <div class="row-header">{{ row }}</div>

          <!-- 工位单元格 -->
          <template v-for="col in columns" :key="col">
            <div
              v-if="getStation(col, row)"
              :ref="el => { if(el) cellRefs[`${col}${row}`] = el }"
              @click="openModal(getStation(col, row))"
              :class="[
                'station-cell',
                getStation(col, row)?.data ? 'occupied' : 'empty',
                isStale(getStation(col, row)) ? 'stale' : '',
                heavyColumns.includes(col) ? 'heavy-zone' : 'light-zone'
              ]"
            >
              <div v-if="!getStation(col, row)?.data" class="station-id">{{ col }}{{ row }}</div>
              <div v-else class="station-data">
                <div class="data-row">{{ getStation(col, row).data.machineNo || '-' }}</div>
                <div class="data-row">{{ getStation(col, row).data.unitNo || '-' }}</div>
              </div>
            </div>
            <div v-else class="empty-cell"></div>
          </template>
        </div>
      </div>
    </div>

    <!-- 编辑弹窗 -->
    <div v-if="showModal" class="modal-backdrop" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">{{ selectedStation?.id }}</div>

        <div class="modal-body">
          <!-- 当前信息 -->
          <div v-if="selectedStation?.data" class="current-info">
            <div v-if="selectedStation.data.model"><strong>机床型号:</strong> {{ selectedStation.data.model }}</div>
            <div v-if="selectedStation.data.machineNo"><strong>光机编号:</strong> {{ selectedStation.data.machineNo }}</div>
            <div v-if="selectedStation.data.unitNo"><strong>整机编号:</strong> {{ selectedStation.data.unitNo }}</div>
            <div class="update-time">更新: {{ formatTime(selectedStation.data.updatedAt) }}</div>
          </div>

          <!-- 警告 -->
          <div v-if="isStale(selectedStation)" class="stale-warning">
            ⚠️ 已超过 {{ daysSince(selectedStation) }} 天未更新
          </div>

          <!-- 表单 -->
          <div class="modal-field">
            <label>机床型号</label>
            <input v-model="form.model" type="text" placeholder="请输入机床型号">
          </div>
          <div class="modal-field">
            <label>光机编号</label>
            <input v-model="form.machineNo" type="text" placeholder="请输入光机编号">
          </div>
          <div class="modal-field">
            <label>整机编号</label>
            <input v-model="form.unitNo" type="text" placeholder="请输入整机编号">
          </div>
        </div>

        <div class="modal-footer">
          <button
            v-if="selectedStation?.data"
            @click="clearStation"
            class="modal-btn btn-danger"
          >清空</button>
          <button @click="saveStation" class="modal-btn btn-primary">保存</button>
          <button @click="closeModal" class="modal-btn btn-cancel">取消</button>
        </div>
      </div>
    </div>

    <!-- 搜索提示 -->
    <div v-if="searchResult" class="search-toast">
      <span class="toast-icon">{{ searchResult.icon }}</span>
      <span>{{ searchResult.text }}</span>
      <button @click="searchResult = null" class="toast-close">✕</button>
    </div>
  </div>
</template>

<style scoped>
.app {
  height: 100vh;
  background: linear-gradient(135deg, #374151 0%, #6b7280 50%, #9ca3af 100%);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.main {
  flex: 1;
  overflow: auto;
  padding: 40px 12px 20px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* 统计栏 */
.stats-bar {
  background: white;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  font-size: 15px;
  width: 100%;
  max-width: 1200px;
  flex-wrap: wrap;
}

.stats-left {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  flex: 1;
}

.search-section {
  display: flex;
  gap: 8px;
  align-items: center;
}

.search-box {
  width: 150px;
  padding: 8px 12px;
  border: 2px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  background: #f9fafb;
}

.search-box:focus {
  outline: none;
  border-color: #6b7280;
  background: white;
}

.search-btn {
  padding: 8px 12px;
  border: none;
  border-radius: 6px;
  background: linear-gradient(to right, #4b5563, #6b7280);
  color: white;
  font-size: 14px;
  cursor: pointer;
}

.search-btn:active {
  transform: scale(0.95);
}

/* 手机端适配 */
@media (max-width: 768px) {
  .main {
    padding: 16px 8px;
    align-items: stretch;
  }

  .stats-bar {
    font-size: 13px;
    padding: 10px 12px;
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .stats-left {
    justify-content: center;
    gap: 12px;
  }

  .search-section {
    width: 100%;
  }

  .search-box {
    flex: 1;
    width: auto;
  }
}

.model-stat {
  color: #374151;
}

.model-stat strong {
  color: #1f2937;
  font-weight: 600;
}

.empty-stats {
  color: #9ca3af;
}

/* 工位网格 */
.workshop-grid {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
  width: 100%;
  max-width: 1200px;
}

/* 手机端工位网格横向滚动 */
@media (max-width: 768px) {
  .workshop-grid {
    overflow-x: auto;
    border-radius: 8px;
  }

  .grid-header,
  .grid-row {
    min-width: 800px;
  }

  .corner-cell,
  .col-header,
  .row-header {
    position: sticky;
    z-index: 10;
  }

  .corner-cell {
    left: 0;
    top: 0;
    z-index: 20;
  }

  .row-header {
    left: 0;
  }

  .col-header {
    top: 0;
  }
}

.grid-header {
  display: grid;
  grid-template-columns: 40px repeat(14, 1fr);
  background: #f3f4f6;
  border-bottom: 2px solid #e5e7eb;
}

.corner-cell {
  padding: 10px 8px;
  text-align: center;
  font-weight: 600;
  color: #6b7280;
  border-right: 1px solid #e5e7eb;
}

.col-header {
  padding: 10px 4px;
  text-align: center;
  font-weight: 600;
  color: #374151;
  font-size: 15px;
  border-right: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

.col-header.heavy-col {
  background: #fed7aa;
  color: #9a3412;
}

.grid-row {
  display: grid;
  grid-template-columns: 40px repeat(14, 1fr);
  border-bottom: 1px solid #f3f4f6;
}

.grid-row:last-child {
  border-bottom: none;
}

.row-header {
  padding: 8px;
  text-align: center;
  font-weight: 600;
  color: #6b7280;
  font-size: 14px;
  background: #f9fafb;
  border-right: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 工位单元格 */
.station-cell {
  aspect-ratio: 1;
  min-height: 55px;
  padding: 6px;
  cursor: pointer;
  transition: all 0.15s;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  border-right: 1px solid #f3f4f6;
  text-align: center;
}

.station-cell:last-child {
  border-right: none;
}

.station-cell:active { transform: scale(0.92); }

.station-cell.empty {
  background: #fafafa;
}

.station-cell.occupied {
  background: #dbeafe;
}

.station-cell.heavy-zone {
  background: rgba(254, 215, 170, 0.15);
}

.station-cell.heavy-zone.occupied {
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
}

.station-cell.light-zone.occupied {
  background: linear-gradient(135deg, #bbf7d0 0%, #86efac 100%);
}

.station-cell.stale {
  animation: pulse-red 2s infinite;
  position: relative;
}

.station-cell.stale::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 3px solid #ef4444;
  border-radius: 4px;
  animation: pulse-border 2s infinite;
}

@keyframes pulse-red {
  0%, 100% { }
  50% { background: #fecaca !important; }
}

@keyframes pulse-border {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.station-cell.highlight {
  animation: flash 0.5s ease-in-out 3;
  z-index: 10;
}

@keyframes flash {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.15); box-shadow: 0 0 20px rgba(59, 130, 246, 0.8); }
}

.empty-cell {
  background: repeating-linear-gradient(
    45deg,
    #fafafa,
    #fafafa 8px,
    #f3f4f6 8px,
    #f3f4f6 16px
  );
  border-right: 1px solid #f3f4f6;
}

.station-id {
  font-weight: 600;
  font-size: 14px;
  color: #374151;
}

.station-data {
  display: flex;
  flex-direction: column;
  gap: 2px;
  width: 100%;
}

.data-row {
  font-size: 11px;
  color: #374151;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
}

/* 手机端单元格调整 */
@media (max-width: 768px) {
  .station-cell {
    min-height: 50px;
    padding: 4px;
  }

  .station-id {
    font-size: 12px;
  }

  .data-row {
    font-size: 9px;
  }

  .col-header {
    font-size: 13px;
    padding: 8px 2px;
  }

  .row-header {
    font-size: 12px;
    padding: 6px;
  }
}

/* 弹窗 */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  z-index: 200;
}

.modal {
  background: white;
  border-radius: 12px;
  width: 100%;
  max-width: 340px;
  overflow: hidden;
  box-shadow: 0 10px 40px rgba(0,0,0,0.3);
}

.modal-header {
  background: linear-gradient(to right, #4b5563, #6b7280);
  color: white;
  padding: 14px 16px;
  font-size: 16px;
  font-weight: 600;
}

.modal-body { padding: 16px; }

.modal-field { margin-bottom: 12px; }
.modal-field label {
  display: block;
  color: #666;
  font-size: 13px;
  margin-bottom: 6px;
}
.modal-field input {
  width: 100%;
  padding: 10px 12px;
  font-size: 15px;
  border: 2px solid #d1d5db;
  border-radius: 4px;
  background: #f9fafb;
  box-sizing: border-box;
}
.modal-field input:focus {
  outline: none;
  border-color: #6b7280;
  background: white;
}

.current-info {
  background: #dbeafe;
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 13px;
}
.current-info div { margin: 2px 0; }
.current-info strong { color: #1e40af; }
.update-time {
  font-size: 11px;
  color: #6b7280;
  margin-top: 4px;
}

.stale-warning {
  background: #fef2f2;
  border: 1px solid #fecaca;
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 12px;
  font-size: 13px;
  color: #991b1b;
}

.modal-footer {
  display: flex;
  gap: 8px;
  padding: 0 16px 16px 16px;
}

.modal-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 4px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
}
.modal-btn:active { transform: scale(0.98); }

.btn-primary {
  background: linear-gradient(to right, #4b5563, #6b7280);
  color: white;
}
.btn-danger {
  background: #ef4444;
  color: white;
}
.btn-cancel {
  background: #e5e7eb;
  color: #374151;
}

/* 搜索提示 */
.search-toast {
  position: fixed;
  bottom: 16px;
  right: 16px;
  left: 16px;
  background: white;
  border-radius: 8px;
  padding: 12px 16px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  font-size: 14px;
  z-index: 150;
  display: flex;
  align-items: center;
  gap: 10px;
}

.toast-icon { font-size: 18px; }
.toast-close {
  margin-left: auto;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #9ca3af;
}

/* 手机端弹窗适配 */
@media (max-width: 768px) {
  .modal {
    max-width: 90%;
  }

  .modal-header {
    font-size: 15px;
    padding: 12px 14px;
  }

  .modal-body {
    padding: 12px 14px;
  }

  .modal-field {
    margin-bottom: 10px;
  }

  .modal-field label {
    font-size: 12px;
  }

  .modal-field input {
    padding: 8px 10px;
    font-size: 14px;
  }

  .current-info,
  .stale-warning {
    font-size: 12px;
    padding: 8px 10px;
  }

  .modal-footer {
    padding: 0 14px 14px 14px;
  }

  .modal-btn {
    padding: 10px;
    font-size: 14px;
  }
}
</style>
