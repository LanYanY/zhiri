import { getDayInfo, getDaysInMonth, getFirstDayOfWeek } from '../utils/calendar';
import { getDayAnnotations, getDayEvents, getMonthEvents } from '../utils/storage';
import './MonthView.css';

const weekDays = ['日', '一', '二', '三', '四', '五', '六'];

function MonthView({ year, month, onPrevMonth, onNextMonth, onDayClick }) {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDayOfWeek = getFirstDayOfWeek(year, month);
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  // 获取本月的事件
  const monthEvents = getMonthEvents(year, month);

  const days = [];
  // 空白填充
  for (let i = 0; i < firstDayOfWeek; i++) {
    days.push(null);
  }
  // 日期
  for (let d = 1; d <= daysInMonth; d++) {
    days.push(d);
  }

  return (
    <div className="month-view">
      <div className="month-header">
        <button className="month-nav-btn" onClick={onPrevMonth}>‹</button>
        <h2 className="month-title">{year}年{month}月</h2>
        <button className="month-nav-btn" onClick={onNextMonth}>›</button>
      </div>

      <div className="weekdays">
        {weekDays.map((day, i) => (
          <div key={i} className={`weekday ${i === 0 || i === 6 ? 'weekend' : ''}`}>{day}</div>
        ))}
      </div>

      <div className="days-grid">
        {days.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="day-cell empty" />;

          const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const info = getDayInfo(year, month, day);
          const annotations = getDayAnnotations(dateStr);
          const events = getDayEvents(dateStr);
          const isToday = dateStr === todayStr;
          const isWeekend = idx % 7 === 0 || idx % 7 === 6;

          // 判断是否有纪念日
          const hasMemorial = events.some(e => e.type === 'memorial' || e.type === 'birthday');
          const hasHoliday = events.some(e => e.type === 'holiday');

          return (
            <div
              key={dateStr}
              className={`day-cell ${isToday ? 'today' : ''} ${isWeekend ? 'weekend' : ''} ${hasMemorial ? 'has-memorial' : ''} ${hasHoliday ? 'has-holiday' : ''}`}
              onClick={() => onDayClick(dateStr)}
            >
              <span className="solar-day">{day}</span>
              <span className="lunar-day">
                {info.festival || info.jieQi || info.lunar.dayStr}
              </span>

              {/* 纪念日/事件指示器 */}
              <div className="event-indicators">
                {hasMemorial && <span className="memorial-dot">🎯</span>}
                {hasHoliday && <span className="holiday-dot">🏖️</span>}
                {annotations.length > 0 && <span className="annotation-dot">📝</span>}
              </div>

              {/* 显示事件标题 */}
              {events.length > 0 && (
                <div className="event-titles">
                  {events.slice(0, 2).map(e => (
                    <span key={e.id} className="event-title-text">{e.title}</span>
                  ))}
                  {events.length > 2 && (
                    <span className="event-more">+{events.length - 2}</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default MonthView;
