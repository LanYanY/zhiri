import { useState } from 'react';
import { getLLMConfig, saveLLMConfig } from '../utils/storage';
import './Settings.css';

function Settings() {
  const config = getLLMConfig();
  const [apiKey, setApiKey] = useState(config.apiKey);
  const [baseUrl, setBaseUrl] = useState(config.baseUrl);
  const [model, setModel] = useState(config.model);
  const [enabled, setEnabled] = useState(config.enabled);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    saveLLMConfig({ apiKey, baseUrl, model, enabled });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="settings">
      <div className="settings-card">
        <h2 className="settings-title">🤖 LLM API 设置</h2>
        <p className="settings-desc">配置你的 AI 接口，获取每日智能建议</p>

        <div className="setting-item">
          <label>启用 AI 建议</label>
          <label className="switch">
            <input type="checkbox" checked={enabled} onChange={e => setEnabled(e.target.checked)} />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <label>API 地址</label>
          <input
            type="text"
            value={baseUrl}
            onChange={e => setBaseUrl(e.target.value)}
            placeholder="https://api.openai.com/v1"
          />
        </div>

        <div className="setting-item">
          <label>API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="sk-..."
          />
        </div>

        <div className="setting-item">
          <label>模型</label>
          <input
            type="text"
            value={model}
            onChange={e => setModel(e.target.value)}
            placeholder="gpt-3.5-turbo"
          />
        </div>

        <button className="btn-save" onClick={handleSave}>
          {saved ? '✓ 已保存' : '保存设置'}
        </button>
      </div>

      <div className="settings-card">
        <h2 className="settings-title">📱 关于</h2>
        <div className="about">
          <p><strong>知日</strong> v1.0.0</p>
          <p>融合公历农历、节气节日、黄历建议的现代化日历应用</p>
          <p className="copyright">© 2026 知日团队</p>
        </div>
      </div>

      <div className="settings-card">
        <h2 className="settings-title">💡 使用提示</h2>
        <ul className="tips">
          <li>点击日历上的日期可查看详细信息和添加标注</li>
          <li>在日视图中可添加纪念日和事件</li>
          <li>配置 LLM API 后可获取每日 AI 建议</li>
          <li>所有数据保存在本地浏览器中</li>
        </ul>
      </div>
    </div>
  );
}

export default Settings;
