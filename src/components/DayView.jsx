import { useState, useEffect } from 'react';
import { getDayInfo } from '../utils/calendar';
import { getDayAnnotations, getDayEvents, addEvent, saveAnnotation, deleteAnnotation, deleteEvent, getAIDailySuggestion, getLLMConfig, getRichLocalSuggestion } from '../utils/storage';
import './DayView.css';

function DayView({ dateStr }) {
  const [annotation, setAnnotation] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('memorial');
  const [showAddAnnotation, setShowAddAnnotation] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState('');
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState('');

  const [year, month, day] = dateStr.split('-').map(Number);
  const info = getDayInfo(year, month, day);
  const annotations = getDayAnnotations(dateStr);
  const events = getDayEvents(dateStr);
  const llmConfig = getLLMConfig();

  useEffect(() => {
    if (llmConfig.enabled) {
      setLoadingAI(true);
      setAiError('');
      getAIDailySuggestion(dateStr, info)
        .then(suggestion => {
          if (suggestion) {
            setAiSuggestion(suggestion);
          } else {
            // AI 返回 null 时使用本地建议
            setAiSuggestion(info.suggestion.text);
          }
        })
        .catch(err => {
          setAiError(err.message);
          setAiSuggestion(info.suggestion.text); // 降级到本地建议
        })
        .finally(() => setLoadingAI(false));
    } else {
      // 未配置 LLM 时显示丰富的本地建议
      setAiSuggestion(getRichLocalSuggestion(info));
    }
  }, [dateStr, info, llmConfig.enabled]);

  const handleAddAnnotation = () => {
    if (annotation.trim()) {
      saveAnnotation(dateStr, annotation.trim());
      setAnnotation('');
      setShowAddAnnotation(false);
    }
  };

  const handleAddEvent = () => {
    if (eventTitle.trim()) {
      addEvent(dateStr, { title: eventTitle.trim(), type: eventType });
      setEventTitle('');
      setShowAddEvent(false);
    }
  };

  const weekDays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

  return (
    <div className="day-view">
      <div className="day-header">
        <div className="date-display">
          <span className="solar-date-large">{month}月{day}日</span>
          <span className="weekday">{weekDays[info.solar.weekDay]}</span>
        </div>
        <div className="lunar-info">
          <span className="lunar-large">{info.lunar.fullStr}</span>
          <span className="ganzhi">{info.ganZhi} · {info.shengxiao}年</span>
        </div>
      </div>

      {(info.festival || info.jieQi) && (
        <div className="festival-banner">
          {info.festival && <span className="festival-tag">🏮 {info.festival}</span>}
          {info.jieQi && <span className="jieqi-tag">🌿 {info.jieQi}</span>}
        </div>
      )}

      <div className="huangli-card">
        <h3 className="section-title">📜 黄历</h3>
        <div className="huangli-content">
          <div className="yi">
            <span className="label">宜</span>
            <span className="items">{info.huangli.yi.join(' · ')}</span>
          </div>
          <div className="ji">
            <span className="label">忌</span>
            <span className="items">{info.huangli.ji.join(' · ')}</span>
          </div>
        </div>
        <p className="daily-suggestion">{info.suggestion.text}</p>
      </div>

      {llmConfig.enabled && (
        <div className={`ai-card ${aiError ? 'ai-error' : ''}`}>
          <h3 className="section-title">🤖 AI 建议</h3>
          {loadingAI ? (
            <p className="loading">正在获取 AI 建议...</p>
          ) : (
            <>
              <p className="ai-text">{aiSuggestion}</p>
              {aiError && <p className="ai-hint">⚠️ {aiError}</p>}
            </>
          )}
        </div>
      )}

      <div className="events-section">
        <div className="section-header">
          <h3 className="section-title">🎯 纪念日与事件</h3>
          <button className="btn-add" onClick={() => setShowAddEvent(!showAddEvent)}>+</button>
        </div>

        {showAddEvent && (
          <div className="add-form">
            <input
              type="text"
              placeholder="事件标题（如：游乐园）"
              value={eventTitle}
              onChange={e => setEventTitle(e.target.value)}
            />
            <select value={eventType} onChange={e => setEventType(e.target.value)}>
              <option value="memorial">纪念</option>
              <option value="birthday">生日</option>
              <option value="holiday">假日</option>
              <option value="custom">自定义</option>
            </select>
            <div className="form-actions">
              <button onClick={handleAddEvent}>保存</button>
              <button onClick={() => setShowAddEvent(false)}>取消</button>
            </div>
          </div>
        )}

        {events.length === 0 && !showAddEvent && (
          <p className="empty-tip">暂无事件，点击 + 添加</p>
        )}

        <div className="events-list">
          {events.map(event => (
            <div key={event.id} className="event-item">
              <span className="event-icon">{event.type === 'birthday' ? '🎂' : event.type === 'holiday' ? '🏖️' : '📌'}</span>
              <span className="event-title">{event.title}</span>
              <button className="btn-delete" onClick={() => deleteEvent(dateStr, event.id)}>×</button>
            </div>
          ))}
        </div>
      </div>

      <div className="annotations-section">
        <div className="section-header">
          <h3 className="section-title">📝 标注</h3>
          <button className="btn-add" onClick={() => setShowAddAnnotation(!showAddAnnotation)}>+</button>
        </div>

        {showAddAnnotation && (
          <div className="add-form">
            <input
              type="text"
              placeholder="添加标注..."
              value={annotation}
              onChange={e => setAnnotation(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && handleAddAnnotation()}
            />
            <div className="form-actions">
              <button onClick={handleAddAnnotation}>保存</button>
              <button onClick={() => setShowAddAnnotation(false)}>取消</button>
            </div>
          </div>
        )}

        <div className="annotations-list">
          {annotations.map(a => (
            <div key={a.id} className="annotation-item">
              <span className="annotation-text">{a.text}</span>
              <button className="btn-delete" onClick={() => deleteAnnotation(dateStr, a.id)}>×</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DayView;
