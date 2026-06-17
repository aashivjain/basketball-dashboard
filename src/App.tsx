import { Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './components/Dashboard'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/players" replace />} />
      <Route path="/players" element={<Dashboard />} />
      <Route path="/players/compare" element={<Dashboard />} />
      <Route path="/players/rankings" element={<Dashboard />} />
      <Route path="/players/builder" element={<Dashboard />} />
      <Route path="/teams" element={<Dashboard />} />
      <Route path="/news" element={<Dashboard />} />
      <Route path="*" element={<Navigate to="/players" replace />} />
    </Routes>
  )
}

export default App
