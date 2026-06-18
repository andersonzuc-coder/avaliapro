import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import UploadPDF from './pages/UploadPDF';
import GenerateExam from './pages/GenerateExam';
import ExamDetail from './pages/ExamDetail';
import CorrectExam from './pages/CorrectExam';
import AdminPanel from './pages/AdminPanel';
import Turmas from './pages/Turmas';

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/pdfs" element={<UploadPDF />} />
              <Route path="/exams/generate" element={<GenerateExam />} />
              <Route path="/exams/:id" element={<ExamDetail />} />
              <Route path="/turmas" element={<Turmas />} />
              <Route path="/correct" element={<CorrectExam />} />
              <Route path="/admin" element={<AdminPanel />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
}
