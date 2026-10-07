import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ConfigMissing } from './components/ConfigMissing';
import { AppLoader } from './components/app/AppLoader';
import { isConfigured } from './lib/config';
import { RequireAuth } from './routes/RequireAuth';

const Landing = lazy(() => import('./pages/Landing'));
const Login = lazy(() => import('./pages/auth/Login'));
const Signup = lazy(() => import('./pages/auth/Signup'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/auth/ResetPassword'));
const Jobs = lazy(() => import('./pages/Jobs'));
const JobDetail = lazy(() => import('./pages/JobDetail'));
const Profile = lazy(() => import('./pages/Profile'));
const Settings = lazy(() => import('./pages/Settings'));
const Runs = lazy(() => import('./pages/Runs'));
const NotFound = lazy(() => import('./pages/NotFound'));
const DesignSystem = lazy(() => import('./pages/DesignSystem'));
const ResumeTemplate = lazy(() => import('./pages/ResumeTemplate'));
const ResumeAdapt = lazy(() => import('./pages/ResumeAdapt'));
const StyleGuidePage = lazy(() => import('./pages/StyleGuide'));
const PrintResume = lazy(() => import('./pages/PrintResume'));

export default function App() {
  if (!isConfigured) return <ConfigMissing />;

  return (
    <Suspense fallback={<AppLoader />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        {import.meta.env.DEV && (
          <Route
            path="/design"
            element={
              <div className="p-6">
                <DesignSystem />
              </div>
            }
          />
        )}
        <Route element={<RequireAuth />}>
          <Route path="/print/resume" element={<PrintResume />} />
          <Route path="/print/resume/:versionId" element={<PrintResume />} />
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Jobs />} />
            <Route path="jobs/:jobId" element={<JobDetail />} />
            <Route path="jobs/:jobId/resume" element={<ResumeAdapt />} />
            <Route path="resume" element={<ResumeTemplate />} />
            <Route path="style" element={<StyleGuidePage />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="runs" element={<Runs />} />
            <Route path="design" element={<DesignSystem />} />
            <Route path="*" element={<NotFound embedded />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
