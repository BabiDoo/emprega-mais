import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from '@/pages/LandingPage';
import { CompanyAuthPage } from '@/pages/company/CompanyAuthPage';
import { CompanyDashboard } from '@/pages/company/CompanyDashboard';
import { JobsListPage } from '@/pages/company/JobsListPage';
import { CreateJobPage } from '@/pages/company/CreateJobPage';
import { JobDetailPage } from '@/pages/company/JobDetailPage';
import { TalentsPage } from '@/pages/company/TalentsPage';
import { CandidateProfilePage } from '@/pages/company/CandidateProfilePage';
import { CandidateChatPage } from '@/pages/candidate/CandidateChatPage';
import { storage } from '@/utils/storage';

const RequireCompany: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const id = storage.getCompanyId();
  return id ? <>{children}</> : <Navigate to="/company/auth" replace />;
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing */}
        <Route path="/" element={<LandingPage />} />

        {/* Company */}
        <Route path="/company/auth" element={<CompanyAuthPage />} />
        <Route
          path="/company/dashboard"
          element={<RequireCompany><CompanyDashboard /></RequireCompany>}
        />
        <Route
          path="/company/jobs"
          element={<RequireCompany><JobsListPage /></RequireCompany>}
        />
        <Route
          path="/company/jobs/new"
          element={<RequireCompany><CreateJobPage /></RequireCompany>}
        />
        <Route
          path="/company/jobs/:jobPostId"
          element={<RequireCompany><JobDetailPage /></RequireCompany>}
        />
        <Route
          path="/company/talents"
          element={<RequireCompany><TalentsPage /></RequireCompany>}
        />
        <Route
          path="/company/candidates/:id"
          element={<RequireCompany><CandidateProfilePage /></RequireCompany>}
        />

        {/* Candidate */}
        <Route path="/candidate/chat" element={<CandidateChatPage />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
