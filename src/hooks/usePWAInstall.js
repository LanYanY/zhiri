import { useState, useEffect } from 'react';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // 检查是否已经安装（standalone 模式）
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // 检查是否已经提示过（限制弹出频率）
    const promptedAt = localStorage.getItem('zhiri_pwa_prompted_at');
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    // 如果 24 小时内已提示过，不再提示
    if (promptedAt && now - parseInt(promptedAt) < oneDay) {
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
      localStorage.setItem('zhiri_pwa_prompted_at', String(now));
    };

    window.addEventListener('beforeinstallprompt', handler);

    // 监听安装成功事件
    window.addEventListener('appinstalled', () => {
      setIsInstalled(true);
      setShowPrompt(false);
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) {
      setShowPrompt(false);
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const dismiss = () => {
    setShowPrompt(false);
  };

  return { isInstalled, showPrompt, handleInstall, dismiss };
}
