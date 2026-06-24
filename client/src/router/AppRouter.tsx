import { Navigate, Routes, Route, Outlet } from 'react-router-dom';
import { AppLayout } from '@/components/layout/AppLayout';
import { UserAppGate } from '@/components/layout/UserAppGate';
import { AdminGate } from '@/components/layout/AdminGate';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { PortalGate } from '@/components/layout/PortalGate';
import { PortalLayout } from '@/components/layout/PortalLayout';
import { MarketingLayout } from '@/components/layout/MarketingLayout';
import { OnboardingGate } from '@/components/layout/OnboardingGate';
import { WelcomePage } from '@/pages/Welcome/WelcomePage';
import { DashboardPage } from '@/pages/Dashboard/DashboardPage';
import { CompanyPage } from '@/pages/Company/CompanyPage';
import { JobsPage } from '@/pages/Jobs/JobsPage';
import { JobDetailPage } from '@/pages/Jobs/JobDetailPage';
import { SwipePage } from '@/pages/Swipe/SwipePage';
import { SavedPage } from '@/pages/Saved/SavedPage';
import { ApplicationsPage } from '@/pages/Applications/ApplicationsPage';
import { ProfilePage } from '@/pages/Profile/ProfilePage';
import { SettingsPage } from '@/pages/Settings/SettingsPage';
import { LoginPage } from '@/pages/Auth/LoginPage';
import { RegisterPage } from '@/pages/Auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/Auth/ForgotPasswordPage';
import { AccountSettingsPage } from '@/pages/Auth/AccountSettingsPage';
import { LandingPage } from '@/pages/Marketing/LandingPage';
import { FeaturesPage } from '@/pages/Marketing/FeaturesPage';
import { AboutPage } from '@/pages/Marketing/AboutPage';
import { FaqPage } from '@/pages/Marketing/FaqPage';
import { PrivacyPage } from '@/pages/Marketing/PrivacyPage';
import { TermsPage } from '@/pages/Marketing/TermsPage';
import { AdminDashboardPage } from '@/pages/Admin/AdminDashboardPage';
import { AdminUsersPage } from '@/pages/Admin/AdminUsersPage';
import { AdminCompaniesPage } from '@/pages/Admin/AdminCompaniesPage';
import { AdminJobsPage } from '@/pages/Admin/AdminJobsPage';
import { AdminNotificationsPage } from '@/pages/Admin/AdminNotificationsPage';
import { AdminApplicationsPage } from '@/pages/Admin/AdminApplicationsPage';
import { AdminReportsPage } from '@/pages/Admin/AdminReportsPage';
import { AdminSettingsPage } from '@/pages/Admin/AdminSettingsPage';
import { AdminSecurityPage } from '@/pages/Admin/AdminSecurityPage';
import { AdminAuditPage } from '@/pages/Admin/AdminAuditPage';
import { AdminCompanyApprovalsPage } from '@/pages/Admin/AdminCompanyApprovalsPage';
import { AdminModerationPage } from '@/pages/Admin/AdminModerationPage';
import { AdminSourcesPage } from '@/pages/Admin/AdminSourcesPage';
import { AdminSystemPage } from '@/pages/Admin/AdminSystemPage';
import { AdminAiPage } from '@/pages/Admin/AdminAiPage';
import { PortalDashboardPage } from '@/pages/Portal/PortalDashboardPage';
import { PortalJobsPage } from '@/pages/Portal/PortalJobsPage';
import { PortalApplicationsPage } from '@/pages/Portal/PortalApplicationsPage';
import { PortalApplicantPage } from '@/pages/Portal/PortalApplicantPage';
import { PortalMessagesLayout } from '@/pages/Portal/PortalMessagesLayout';
import { PortalMessagesEmptyPanel } from '@/pages/Portal/PortalMessagesEmptyPanel';
import { PortalConversationPage } from '@/pages/Portal/PortalConversationPage';
import { PortalPipelinePage } from '@/pages/Portal/PortalPipelinePage';
import { PortalCompanyPage } from '@/pages/Portal/PortalCompanyPage';
import { PortalSettingsPage } from '@/pages/Portal/PortalSettingsPage';
import { MessagesPage } from '@/pages/Messages/MessagesPage';
import { ConversationPage } from '@/pages/Messages/ConversationPage';
import { PublicProfilePage } from '@/pages/Profile/PublicProfilePage';

export function AppRouter() {
  return (
    <OnboardingGate>
      <Routes>
        <Route path="/landing" element={<LandingPage />} />
        <Route element={<MarketingLayout />}>
          <Route path="/features" element={<FeaturesPage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/faq" element={<FaqPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/terms" element={<TermsPage />} />
        </Route>

        <Route
          path="/admin"
          element={
            <AdminGate>
              <AdminLayout />
            </AdminGate>
          }
        >
          <Route index element={<AdminDashboardPage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="companies" element={<AdminCompaniesPage />} />
          <Route path="moderation" element={<AdminModerationPage />} />
          <Route path="sources" element={<AdminSourcesPage />} />
          <Route path="jobs" element={<AdminJobsPage />} />
          <Route path="applications" element={<AdminApplicationsPage />} />
          <Route path="reports" element={<AdminReportsPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
          <Route path="company-approvals" element={<AdminCompanyApprovalsPage />} />
          <Route path="system" element={<AdminSystemPage />} />
          <Route path="system/ai" element={<AdminAiPage />} />
          <Route path="notifications" element={<AdminNotificationsPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="settings/security" element={<AdminSecurityPage />} />
        </Route>

        <Route
          path="/portal"
          element={
            <PortalGate>
              <PortalLayout />
            </PortalGate>
          }
        >
          <Route index element={<PortalDashboardPage />} />
          <Route path="pipeline" element={<PortalPipelinePage />} />
          <Route path="jobs" element={<PortalJobsPage />} />
          <Route path="applications" element={<PortalApplicationsPage />} />
          <Route path="applications/:applicationId" element={<PortalApplicantPage />} />
          <Route path="messages" element={<PortalMessagesLayout />}>
            <Route index element={<PortalMessagesEmptyPanel />} />
            <Route path=":conversationId" element={<PortalConversationPage />} />
          </Route>
          <Route path="analytics" element={<Navigate to="/portal" replace />} />
          <Route path="company" element={<PortalCompanyPage />} />
          <Route path="settings" element={<PortalSettingsPage />} />
        </Route>

        {/* Full-width microsite — must be outside AppLayout to avoid 480px column constraint */}
        <Route path="/companies/:slug" element={<CompanyPage />} />

        <Route element={<AppLayout />}>
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/p/:id" element={<PublicProfilePage />} />
          <Route element={<UserAppGate><Outlet /></UserAppGate>}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/swipe" element={<SwipePage />} />
            <Route path="/jobs" element={<JobsPage />} />
            <Route path="/jobs/:id" element={<JobDetailPage />} />
            <Route path="/saved" element={<SavedPage />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/messages" element={<MessagesPage />} />
            <Route path="/messages/:conversationId" element={<ConversationPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/profile/*" element={<ProfilePage />} />
            <Route path="/account" element={<AccountSettingsPage />} />
          </Route>
        </Route>
      </Routes>
    </OnboardingGate>
  );
}
