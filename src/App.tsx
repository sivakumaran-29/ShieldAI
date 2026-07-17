import { useEffect } from 'react'
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
  const { isAuthenticated, user, initialized, restoreSession } = useAuthStore()

  useEffect(() => {
    restoreSession()
  }, [restoreSession])

  if (!initialized) {
    return (
      <div className="min-h-screen bg-[#07090e] flex items-center justify-center text-sky-400 font-mono text-sm">
        <span>Restoring Security Session...</span>
      </div>
    )
  }

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