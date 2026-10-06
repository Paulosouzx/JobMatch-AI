import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ConfigMissing } from './components/ConfigMissing';
import { Spinner } from './components/legacy-ui';
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

export default function App() {
  const { t } = useTranslation();
  if (!isConfigured) return <ConfigMissing />;

  return (
    <Suspense fallback={<Spinner label={t('common.loading')} />}>
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
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Jobs />} />
            <Route path="jobs/:matchId" element={<JobDetail />} />
            <Route path="profile" element={<Profile />} />
            <Route path="settings" element={<Settings />} />
            <Route path="runs" element={<Runs />} />
            <Route path="design" element={<DesignSystem />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
