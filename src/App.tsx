import { useState, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthorizationProvider } from "@/contexts/AuthorizationContext";
import { SmartViewProvider } from "@/contexts/SmartViewContext";
import { ClubProvider } from "@/contexts/ClubContext";
import { TeamProvider } from "@/contexts/TeamContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { ResponsiveRoute } from "@/components/routing/ResponsiveRoute";
import { ErrorBoundary } from "@/components/routing/ErrorBoundary";
import { PageSkeleton } from "@/components/routing/PageSkeleton";
import { PWAInstallPrompt } from "@/components/pwa/PWAInstallPrompt";
import { PWAUpdatePrompt } from "@/components/pwa/PWAUpdatePrompt";
import { SplashScreen } from "@/components/pwa/SplashScreen";
import { attachQueryPersistence } from "@/lib/queryPersister";

// ---------- Lazy page imports (code-split per route) ----------
const Index                        = lazy(() => import("./pages/Index"));
const NotFound                     = lazy(() => import("./pages/NotFound"));
const AccountLinking               = lazy(() => import("./pages/AccountLinking"));
const Auth                         = lazy(() => import("./pages/Auth"));
const AuthMobile                   = lazy(() => import("./pages/AuthMobile"));
const Dashboard                    = lazy(() => import("./pages/Dashboard"));
const DashboardMobile              = lazy(() => import("./pages/DashboardMobile"));
const PlayerManagement             = lazy(() => import("./pages/PlayerManagement"));
const PlayerManagementMobile       = lazy(() => import("./pages/PlayerManagementMobile"));
const CalendarEvents               = lazy(() => import("./pages/CalendarEvents"));
const CalendarEventsMobile         = lazy(() => import("./pages/CalendarEventsMobile"));
const Analytics                    = lazy(() => import("./pages/Analytics"));
const AnalyticsMobile              = lazy(() => import("./pages/AnalyticsMobile"));
const TeamManagement               = lazy(() => import("./pages/TeamManagement"));
const TeamManagementMobile         = lazy(() => import("./pages/TeamManagementMobile"));
const ClubManagement               = lazy(() => import("./pages/ClubManagement").then(m => ({ default: m.ClubManagement })));
const ClubManagementMobile         = lazy(() => import("./pages/ClubManagementMobile"));
const ClubDetailsMobile            = lazy(() => import("./pages/ClubDetailsMobile"));
const DataRecovery                 = lazy(() => import("./pages/DataRecovery"));
const EmailTestPage                = lazy(() => import("./pages/EmailTestPage"));
const AvailabilityConfirmation     = lazy(() => import("./pages/AvailabilityConfirmation"));
const StaffManagement              = lazy(() => import("./pages/StaffManagement"));
const StaffManagementMobile        = lazy(() => import("./pages/StaffManagementMobile"));
const Training                     = lazy(() => import("./pages/Training"));
const TrainingMobile               = lazy(() => import("./pages/TrainingMobile"));
const IndividualTraining           = lazy(() => import("./pages/IndividualTraining"));
const IndividualTrainingMobile     = lazy(() => import("./pages/IndividualTrainingMobile"));
const UserManagement               = lazy(() => import("./pages/UserManagement"));
const UserManagementMobile         = lazy(() => import("./pages/UserManagementMobile"));
const UserProfile                  = lazy(() => import("./pages/UserProfile"));
const SubscriptionManagement       = lazy(() => import("./pages/SubscriptionManagement"));
const SubscriptionManagementMobile = lazy(() => import("./pages/SubscriptionManagementMobile"));
const ChildProgress                = lazy(() => import("./pages/ChildProgress"));
const ChildProgressMobile          = lazy(() => import("./pages/ChildProgressMobile"));
const PlayerMobile                 = lazy(() => import("./pages/PlayerMobile"));
const MyTeamMobile                 = lazy(() => import("./pages/MyTeamMobile"));
const GameDayMobile                = lazy(() => import("./pages/GameDayMobile"));
const AdminPlayStyles              = lazy(() => import("./pages/AdminPlayStyles"));
const AdminPlayStylesMobile        = lazy(() => import("./pages/AdminPlayStylesMobile"));
const TeamSettingsMobile           = lazy(() => import("./pages/TeamSettingsMobile"));
const ResetPassword                = lazy(() => import("./pages/ResetPassword"));
const ResetPasswordMobile          = lazy(() => import("./pages/ResetPasswordMobile"));
const AcademyDashboard             = lazy(() => import("./pages/AcademyDashboard"));
const AcademyDashboardMobile       = lazy(() => import("./pages/mobile/AcademyDashboardMobile"));
const Medical                      = lazy(() => import("./pages/Medical"));
const FitnessTesting               = lazy(() => import("./pages/FitnessTesting"));
const PlayerProfile                = lazy(() => import("./pages/PlayerProfile"));
const LogRPE                       = lazy(() => import("./pages/LogRPE"));
const Welfare                      = lazy(() => import("./pages/Welfare"));
const Scouting                     = lazy(() => import("./pages/Scouting"));
const Compliance                   = lazy(() => import("./pages/Compliance"));
const ReportBuilder                = lazy(() => import("./pages/ReportBuilder"));
const SessionPlans                 = lazy(() => import("./pages/SessionPlans"));
const SquadGrid                    = lazy(() => import("./pages/SquadGrid"));
const Settings                     = lazy(() => import("./pages/Settings"));
// --------------------------------------------------------------

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

attachQueryPersistence(queryClient);

const Page = ({ children, name }: { children: React.ReactNode; name?: string }) => (
  <ErrorBoundary pageName={name}>
    <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
  </ErrorBoundary>
);

const AppContent = () => {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('splashShown'));
  const handleSplashComplete = () => { sessionStorage.setItem('splashShown', 'true'); setShowSplash(false); };

  return (
    <>
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}
      <Routes>
        <Route path="/" element={<Navigate to="/auth" replace />} />

        <Route path="/auth" element={
          <Page name="Auth"><ResponsiveRoute desktopComponent={<Auth />} mobileComponent={<AuthMobile />} /></Page>
        } />
        <Route path="/login" element={<Navigate to="/auth" replace />} />
        <Route path="/reset-password" element={
          <Page name="Reset Password"><ResponsiveRoute desktopComponent={<ResetPassword />} mobileComponent={<ResetPasswordMobile />} /></Page>
        } />
        <Route path="/account-linking" element={<Page name="Account Linking"><AccountLinking /></Page>} />

        <Route path="/dashboard" element={
          <ProtectedRoute><Page name="Dashboard"><ResponsiveRoute desktopComponent={<Dashboard />} mobileComponent={<DashboardMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/players" element={
          <ProtectedRoute><Page name="Players"><ResponsiveRoute desktopComponent={<PlayerManagement />} mobileComponent={<PlayerManagementMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/players/:id" element={
          <ProtectedRoute><Page name="Player Profile"><PlayerProfile /></Page></ProtectedRoute>
        } />
        <Route path="/calendar" element={
          <ProtectedRoute><Page name="Calendar"><ResponsiveRoute desktopComponent={<CalendarEvents />} mobileComponent={<CalendarEventsMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/analytics" element={
          <ProtectedRoute><Page name="Analytics"><ResponsiveRoute desktopComponent={<Analytics />} mobileComponent={<AnalyticsMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/teams" element={
          <ProtectedRoute><Page name="Teams"><ResponsiveRoute desktopComponent={<TeamManagement />} mobileComponent={<TeamManagementMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/clubs" element={
          <ProtectedRoute><Page name="Clubs"><ResponsiveRoute desktopComponent={<ClubManagement />} mobileComponent={<ClubManagementMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/clubs/:id" element={
          <ProtectedRoute><Page name="Club Details"><ResponsiveRoute desktopComponent={<ClubManagement />} mobileComponent={<ClubDetailsMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/staff" element={
          <ProtectedRoute><Page name="Staff"><ResponsiveRoute desktopComponent={<StaffManagement />} mobileComponent={<StaffManagementMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/training" element={
          <ProtectedRoute><Page name="Training"><ResponsiveRoute desktopComponent={<Training />} mobileComponent={<TrainingMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/individual-training" element={
          <ProtectedRoute><Page name="Individual Training"><ResponsiveRoute desktopComponent={<IndividualTraining />} mobileComponent={<IndividualTrainingMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute><Page name="Users"><ResponsiveRoute desktopComponent={<UserManagement />} mobileComponent={<UserManagementMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute><Page name="Profile"><UserProfile /></Page></ProtectedRoute>
        } />
        <Route path="/subscriptions" element={
          <ProtectedRoute><Page name="Subscriptions"><ResponsiveRoute desktopComponent={<SubscriptionManagement />} mobileComponent={<SubscriptionManagementMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/child-progress" element={
          <ProtectedRoute><Page name="Child Progress"><ResponsiveRoute desktopComponent={<ChildProgress />} mobileComponent={<ChildProgressMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/player" element={
          <ProtectedRoute><Page name="Player"><ResponsiveRoute desktopComponent={<ChildProgress />} mobileComponent={<PlayerMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/my-team" element={
          <ProtectedRoute><Page name="My Team"><ResponsiveRoute desktopComponent={<Analytics />} mobileComponent={<MyTeamMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/game-day/:eventId" element={
          <ProtectedRoute><Page name="Game Day"><GameDayMobile /></Page></ProtectedRoute>
        } />
        <Route path="/admin/play-styles" element={
          <ProtectedRoute><Page name="Play Styles"><ResponsiveRoute desktopComponent={<AdminPlayStyles />} mobileComponent={<AdminPlayStylesMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/team-settings/:id" element={
          <ProtectedRoute><Page name="Team Settings"><ResponsiveRoute desktopComponent={<TeamManagement />} mobileComponent={<TeamSettingsMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/academy/:id" element={
          <ProtectedRoute><Page name="Academy"><ResponsiveRoute desktopComponent={<AcademyDashboard />} mobileComponent={<AcademyDashboardMobile />} /></Page></ProtectedRoute>
        } />
        <Route path="/medical" element={
          <ProtectedRoute><Page name="Medical"><Medical /></Page></ProtectedRoute>
        } />
        <Route path="/fitness-testing" element={
          <ProtectedRoute><Page name="Fitness Testing"><FitnessTesting /></Page></ProtectedRoute>
        } />
        <Route path="/welfare" element={
          <ProtectedRoute><Page name="Welfare"><Welfare /></Page></ProtectedRoute>
        } />
        <Route path="/scouting" element={
          <ProtectedRoute><Page name="Scouting"><Scouting /></Page></ProtectedRoute>
        } />
        <Route path="/compliance" element={
          <ProtectedRoute><Page name="Compliance"><Compliance /></Page></ProtectedRoute>
        } />
        <Route path="/report-builder" element={
          <ProtectedRoute><Page name="Report Builder"><ReportBuilder /></Page></ProtectedRoute>
        } />
        <Route path="/session-plans" element={
          <ProtectedRoute><Page name="Session Plans"><SessionPlans /></Page></ProtectedRoute>
        } />
        <Route path="/squad-grid" element={
          <ProtectedRoute><Page name="Squad Grid"><SquadGrid /></Page></ProtectedRoute>
        } />
        <Route path="/settings" element={
          <ProtectedRoute><Page name="Settings"><Settings /></Page></ProtectedRoute>
        } />

        <Route path="/log-rpe/:token" element={<Page name="Log RPE"><LogRPE /></Page>} />
        <Route path="/data-recovery"             element={<Page><DataRecovery /></Page>} />
        <Route path="/email-test"                element={<Page><EmailTestPage /></Page>} />
        <Route path="/availability-confirmation" element={<Page><AvailabilityConfirmation /></Page>} />
        <Route path="*"                          element={<Page><NotFound /></Page>} />
      </Routes>
      <PWAInstallPrompt />
      <PWAUpdatePrompt />
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuthorizationProvider>
            <ClubProvider>
              <TeamProvider>
                <SmartViewProvider>
                  <AppContent />
                </SmartViewProvider>
              </TeamProvider>
            </ClubProvider>
          </AuthorizationProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
