import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'

// Pages
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/public/SignupPage'
import DashboardPage from './pages/ambassador/DashboardPage'
import AddCourtPage from './pages/ambassador/AddCourtPage'
import VerifyCourtPage from './pages/ambassador/VerifyCourtPage'
import VerifyDuplicatePage from './pages/ambassador/VerifyDuplicatePage'
import SubmitEventPage from './pages/ambassador/SubmitEventPage'
import SubmitStoryPage from './pages/ambassador/SubmitStoryPage'
import RecommendPage from './pages/ambassador/RecommendPage'
import AdminDashboardPage from './pages/admin/AdminDashboardPage'
import AdminSubmissionsPage from './pages/admin/AdminSubmissionsPage'
import AdminLocationsPage from './pages/admin/AdminLocationsPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />

          {/* Shared — any signed-in role */}
          <Route element={<ProtectedRoute />}>
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          {/* Ambassador routes */}
          <Route element={<ProtectedRoute role="ambassador" />}>
            <Route path="/ambassador/dashboard" element={<DashboardPage />} />
            <Route path="/ambassador/courts/add" element={<AddCourtPage />} />
            <Route path="/ambassador/courts/edit/:id" element={<AddCourtPage />} />
            <Route path="/ambassador/courts/search" element={<VerifyCourtPage />} />
            <Route path="/ambassador/courts/verify" element={<VerifyDuplicatePage />} />
            <Route path="/ambassador/submissions/:id" element={<VerifyDuplicatePage />} />
            <Route path="/ambassador/events/submit" element={<SubmitEventPage />} />
            <Route path="/ambassador/stories/submit" element={<SubmitStoryPage />} />
            <Route path="/ambassador/recommend" element={<RecommendPage />} />
          </Route>

          {/* Admin routes */}
          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/submissions" element={<AdminSubmissionsPage />} />
            <Route path="/admin/submissions/:id" element={<VerifyDuplicatePage />} />
            <Route path="/admin/courts/add" element={<AddCourtPage />} />
            <Route path="/admin/courts/edit/:id" element={<AddCourtPage />} />
            <Route path="/admin/courts/verify" element={<VerifyDuplicatePage />} />
            <Route path="/admin/locations" element={<AdminLocationsPage />} />
          </Route>

          {/* Fallback */}
          <Route path="/" element={<Navigate to="/ambassador/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
