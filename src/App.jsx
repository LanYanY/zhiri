import { useState, useEffect, useCallback } from 'react';
import MonthView from './components/MonthView';
import DayView from './components/DayView';
import Settings from './components/Settings';
import InstallPrompt from './components/InstallPrompt';
import { usePWAInstall } from './hooks/usePWAInstall';
import './App.css';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [view, setView] = useState('month');
  const { isInstalled, showPrompt, handleInstall, dismiss } = usePWAInstall();

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  const handleDayClick = useCallback((dateStr) => {
    setSelectedDate(dateStr);
    setView('day');
  }, []);

  const handleBack = useCallback(() => {
    setView('month');
    setSelectedDate(null);
  }, []);

  const handleSettings = useCallback(() => {
    setView('settings');
  }, []);

  const getTodayStr = useCallback(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
  }, []);

  const goToToday = useCallback(() => {
    setCurrentDate(new Date());
    setSelectedDate(getTodayStr());
    setView('day');
  }, [getTodayStr]);

  const dayViewDate = selectedDate || getTodayStr();

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">知日</h1>
        {(view === 'day' || view === 'settings') && (
          <button className="btn-back" onClick={handleBack}>← 返回</button>
        )}
      </header>

      <main className="app-main">
        {view === 'month' && (
          <MonthView
            year={year}
            month={month}
            onPrevMonth={() => setCurrentDate(new Date(year, month - 2, 1))}
            onNextMonth={() => setCurrentDate(new Date(year, month, 1))}
            onDayClick={handleDayClick}
          />
        )}
        {view === 'day' && (
          <DayView dateStr={dayViewDate} />
        )}
        {view === 'settings' && <Settings />}
      </main>

      <nav className="app-nav">
        <button className={view === 'month' ? 'nav-btn active' : 'nav-btn'} onClick={() => { setView('month'); setSelectedDate(null); }}>
          📅 日历
        </button>
        <button className={view === 'day' ? 'nav-btn active' : 'nav-btn'} onClick={goToToday}>
          📍 今日
        </button>
        <button className={view === 'settings' ? 'nav-btn active' : 'nav-btn'} onClick={handleSettings}>
          ⚙️ 设置
        </button>
      </nav>

      {!isInstalled && showPrompt && (
        <InstallPrompt onInstall={handleInstall} onDismiss={dismiss} />
      )}
    </div>
  );
}

export default App;
