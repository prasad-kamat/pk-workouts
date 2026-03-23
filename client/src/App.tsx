import { useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './store';
import UserSelectPage  from './pages/UserSelectPage';
import TodayPage       from './pages/TodayPage';
import HistoryPage     from './pages/HistoryPage';
import SettingsPage    from './pages/SettingsPage';
import NavBar          from './components/NavBar';

export default function App() {
  const activeUser = useAppStore(s => s.activeUser);

  if (!activeUser) return <UserSelectPage />;

  return (
    <div className="flex flex-col min-h-screen max-w-lg mx-auto">
      <main className="flex-1 pb-20 overflow-y-auto">
        <Routes>
          <Route path="/"         element={<TodayPage />} />
          <Route path="/history"  element={<HistoryPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*"         element={<Navigate to="/" />} />
        </Routes>
      </main>
      <NavBar />
    </div>
  );
}
