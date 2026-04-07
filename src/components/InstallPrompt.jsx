import { useState } from 'react';
import './InstallPrompt.css';

function InstallPrompt({ onInstall, onDismiss }) {
  const [showGuide, setShowGuide] = useState(false);
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);

  return (
    <div className="install-prompt">
      <div className="install-card">
        <button className="close-btn" onClick={onDismiss}>×</button>
        <div className="install-icon">📅</div>
        <h3>安装知日到手机</h3>
        <p>添加到主屏幕，像原生应用一样使用</p>

        {isIOS && (
          <div className="install-guide">
            <p>📱 iOS 安装步骤：</p>
            <ol>
              <li>点击底部 Safari 的 <strong>分享</strong> 按钮 📤</li>
              <li>在弹出菜单中选择 <strong>"添加到主屏幕"</strong></li>
              <li>点击 <strong>"添加"</strong> 完成安装</li>
            </ol>
          </div>
        )}

        {isAndroid && (
          <div className="install-guide">
            <p>📱 Android 安装步骤：</p>
            <ol>
              <li>点击浏览器右上角的 <strong>菜单</strong> 按钮 ⋮</li>
              <li>选择 <strong>"安装应用"</strong> 或 <strong>"添加到主屏幕"</strong></li>
              <li>确认安装即可</li>
            </ol>
          </div>
        )}

        <div className="install-actions">
          <button className="btn-dismiss" onClick={onDismiss}>我知道了</button>
        </div>
        <p className="install-hint">安装后可离线使用，体验更佳</p>
      </div>
    </div>
  );
}

export default InstallPrompt;
