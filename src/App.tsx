import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { useAuthStore } from './store/authStore'
import Login from './pages/auth/Login'
import CandidateDashboard from './pages/candidate/Dashboard'
import RecruiterDashboard from './pages/recruiter/Dashboard'
import ExamShell from './pages/candidate/ExamShell'

function ExamRouteWrapper() {
  const { isAuthenticated, user } = useAuthStore()
  const [searchParams] = useSearchParams()
  const examId = searchParams.get('id')

  if (examId) {
    localStorage.setItem('pending_exam_id', examId)
  }

  return isAuthenticated && user?.role === 'candidate' ? (
    <ExamShell />
  ) : (
    <Navigate to="/" replace />
  )
}

export default function App() {
  const { isAuthenticated, user } = useAuthStore()

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={!isAuthenticated ? <Login /> : <Navigate to={`/${user?.role}`} replace />} />
        <Route path="/candidate" element={isAuthenticated && user?.role === 'candidate' ? <CandidateDashboard /> : <Navigate to="/" replace />} />
        <Route path="/recruiter" element={isAuthenticated && user?.role === 'recruiter' ? <RecruiterDashboard /> : <Navigate to="/" replace />} />
        
        {/* Protected Exam Workspace Pipeline Route */}
        <Route 
          path="/exam" 
          element={<ExamRouteWrapper />} 
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}