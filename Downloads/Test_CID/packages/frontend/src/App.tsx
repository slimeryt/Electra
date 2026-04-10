import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { useSocketEvents } from './hooks/useSocket';
import { ContextMenuProvider } from './context/ContextMenuContext';
import AuthPage from './pages/AuthPage';
import MainLayout from './pages/MainLayout';
import ChannelPage from './pages/ChannelPage';
import VoiceChannelPage from './pages/VoiceChannelPage';
import DMPage from './pages/DMPage';
import UserSettingsPage from './pages/UserSettingsPage';
import ServerSettingsPage from './pages/ServerSettingsPage';
import DiscoveryPage from './pages/DiscoveryPage';
import WelcomePage from './pages/WelcomePage';
import FriendsPage from './pages/FriendsPage';
import { ScreenSharePickerModal } from './components/electron/ScreenSharePickerModal';
import { ProfileCard } from './components/ui/ProfileCard';
import { TitleBar } from './components/electron/TitleBar';
import './store/themeStore'; // ensures theme is applied from localStorage on startup

// Listens for the auth:logout event fired by the axios interceptor when
// token refresh fails, and navigates to /login via React Router (not window.location).
function AuthLogoutListener() {
  const navigate = useNavigate();
  const { logout } = useAuthStore();
  useEffect(() => {
    const handler = () => { logout(); navigate('/login', { replace: true }); };
    window.addEventListener('auth:logout', handler);
    return () => window.removeEventListener('auth:logout', handler);
  }, []);
  return null;
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, checkAuth } = useAuthStore();

  useEffect(() => { checkAuth(); }, []);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100dvh', height: '100%', background: 'var(--bg-base)' }}>
        <div style={{ width: 32, height: 32, border: '2px solid var(--accent)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function SocketInit() {
  useSocketEvents();
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <ContextMenuProvider>
        <TitleBar />
        <ScreenSharePickerModal />
        <AuthLogoutListener />
        <ProfileCard />
        <div style={{ display: 'contents' }} onContextMenu={e => e.preventDefault()}>
        <Routes>
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/register" element={<AuthPage mode="register" />} />
          <Route path="/app" element={
            <AuthGate>
              <SocketInit />
              <MainLayout />
            </AuthGate>
          }>
            <Route index element={<WelcomePage />} />
          <Route path="servers/:serverId/channels/:channelId" element={<ChannelPage />} />
            <Route path="servers/:serverId/voice/:channelId" element={<VoiceChannelPage />} />
            <Route path="servers/:serverId/settings" element={<ServerSettingsPage />} />
            <Route path="dms/:dmId" element={<DMPage />} />
            <Route path="settings" element={<UserSettingsPage />} />
            <Route path="discover" element={<DiscoveryPage />} />
            <Route path="friends" element={<FriendsPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
        </div>
      </ContextMenuProvider>
    </BrowserRouter>
  );
}
