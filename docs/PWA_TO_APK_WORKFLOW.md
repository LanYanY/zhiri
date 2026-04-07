# PWA → APK 完整开发工作流

> 从 React/Vite Web 应用开发到通过 GitHub Actions 自动打包为 Android APK 的完整指南。本工作流经过「知日」日历应用的实际开发验证，可直接复用于同类项目。

---

## 目录

- [架构概览](#架构概览)
- [环境准备](#环境准备)
- [第一阶段：Web 应用开发](#第一阶段web-应用开发)
- [第二阶段：Capacitor 集成](#第二阶段capacitor-集成)
- [第三阶段：GitHub Actions 配置](#第三阶段github-actions-配置)
- [第四阶段：构建与发布](#第四阶段构建与发布)
- [故障排查手册](#故障排查手册)
- [项目模板清单](#项目模板清单)

---

## 架构概览

```
┌─────────────────┐    git push     ┌──────────────────┐     Gradle      ┌──────────────┐
│   本地开发环境   │ ──────────────▶ │  GitHub Actions  │ ──────────────▶ │  GitHub      │
│   (Termux)      │  + git tag v*   │  (Ubuntu Runner) │                 │  Releases    │
│                 │                 │                  │                 │  (APK 下载)  │
│  React + Vite   │                 │  JDK 17          │                 └──────────────┘
│  PWA + SW       │                 │  Android SDK 35  │
│  Day.js         │                 │  Gradle 8.9      │
└─────────────────┘                 └──────────────────┘
       测试：npm run dev                  自动构建
       访问 localhost:3000                自动发布 Release
```

**核心原则**：
1. **本地只做 Web 开发** — 不需要安装 Android SDK/Java
2. **Android 项目随代码提交** — `npx cap add android` 生成的完整目录提交到 Git
3. **APK 编译完全在云端** — GitHub Actions 提供标准 Ubuntu 环境
4. **标签驱动发布** — 推送 `v*` 格式的 tag 自动触发构建

---

## 环境准备

### 最小化环境（仅 Web 开发）

```bash
# Termux 环境
pkg install -y git nodejs
```

### 完整环境（含本地调试）

```bash
# 如果需要本地调试 Android 行为
pkg install -y git nodejs openjdk-17
```

### 必需版本对照表

| 组件 | 版本 | 说明 |
|------|------|------|
| Node.js | ≥ 18 | 运行 Vite 和 npm |
| Java (CI) | 17 | GitHub Actions 使用 Temurin 17 |
| Android SDK | 35 | compileSdkVersion = 35 |
| Gradle | 8.9 | 与 AGP 8.7.2 兼容 |
| AGP | 8.7.2 | Android Gradle Plugin |
| Kotlin | 1.9.24 | 解决 stdlib 冲突 |
| Capacitor | ≥ 8.0 | 当前使用 8.3.0 |

---

## 第一阶段：Web 应用开发

### 1.1 项目初始化

```bash
# 创建项目目录
mkdir my-pwa-app && cd my-pwa-app

# 初始化 npm 项目
npm init -y

# 设置 package.json 基础字段
node -e "
const pkg = require('./package.json');
pkg.type = 'module';
pkg.scripts = {
  dev: 'vite --host 0.0.0.0',
  build: 'vite build',
  preview: 'vite preview --host 0.0.0.0'
};
require('fs').writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"
```

### 1.2 安装依赖

```bash
# 核心框架
npm install react react-dom

# 工具库
npm install dayjs              # 日期处理（按需替换）

# 开发工具
npm install -D vite @vitejs/plugin-react
```

### 1.3 创建基础文件结构

```
my-pwa-app/
├── index.html              # 入口 HTML
├── vite.config.js          # Vite 配置
├── package.json
├── public/
│   ├── manifest.json       # ⚠️ PWA 安装必需
│   ├── icon-192.png        # ⚠️ 必须有效 PNG ≥ 192x192
│   ├── icon-512.png        # ⚠️ 必须有效 PNG ≥ 512x512
│   └── sw.js               # Service Worker
├── src/
│   ├── main.jsx
│   ├── App.jsx
│   └── App.css
└── .gitignore
```

### 1.4 关键文件模板

#### index.html

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <meta name="theme-color" content="#8B4513">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="mobile-web-app-capable" content="yes">
  <link rel="manifest" href="/manifest.json">
  <link rel="apple-touch-icon" href="/icon-192.png">
  <title>应用名称</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "PingFang SC", sans-serif;
      background: #f5f0e8;
      color: #3a2e28;
      -webkit-tap-highlight-color: transparent;
    }
    #root { min-height: 100vh; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script type="module" src="/src/main.jsx"></script>
  <script>
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
          .then(reg => console.log('SW registered'))
          .catch(err => console.error('SW failed:', err));
      });
    }
  </script>
</body>
</html>
```

#### public/manifest.json

```json
{
  "name": "应用全称 - 副标题",
  "short_name": "简称",
  "description": "应用的简短描述，用于安装提示",
  "start_url": "/?source=pwa",
  "scope": "/",
  "display": "standalone",
  "background_color": "#f5f0e8",
  "theme_color": "#8B4513",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" }
  ],
  "categories": ["productivity"],
  "lang": "zh-CN",
  "dir": "ltr"
}
```

#### public/sw.js

```javascript
const CACHE_NAME = 'app-v1';
const ASSETS = ['/', '/index.html'];

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cached) => {
      if (cached) return cached;
      return fetch(e.request).then((response) => {
        if (response.status === 200) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return response;
      });
    }).catch(() => {
      // 离线时返回 index.html（SPA 路由支持）
      return caches.match('/index.html');
    })
  );
});
```

#### vite.config.js

```javascript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: { port: 3000, host: '0.0.0.0' },
  build: {
    rollupOptions: {
      output: {
        manualChunks: { vendor: ['react', 'react-dom'] }
      }
    }
  }
});
```

### 1.5 开发调试

```bash
# 启动开发服务器
npm run dev

# 在浏览器中访问
# http://localhost:3000

# 构建生产版本
npm run build

# 预览生产构建
npm run preview
```

### 1.6 移动设备适配要点

| 要点 | 实现方式 |
|------|----------|
| 安全区域 | `viewport-fit=cover` + `env(safe-area-inset-*)` |
| 禁止缩放 | `maximum-scale=1.0, user-scalable=no` |
| 状态栏 | `<meta name="theme-color">` + apple-mobile-web-app-status-bar-style |
| 触摸反馈 | `-webkit-tap-highlight-color: transparent` |
| 底部导航 | `padding-bottom: env(safe-area-inset-bottom)` |
| 全屏体验 | PWA 安装后 `display: standalone` 隐藏浏览器 UI |

---

## 第二阶段：Capacitor 集成

### 2.1 安装 Capacitor

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android
```

### 2.2 初始化 Capacitor

```bash
npx cap init "应用显示名称" com.你的域名.应用名 --web-dir dist
```

生成的 `capacitor.config.json`：
```json
{
  "appId": "com.你的域名.应用名",
  "appName": "应用显示名称",
  "webDir": "dist"
}
```

### 2.3 添加 Android 平台

```bash
npx cap add android
```

这会在项目根目录生成 `android/` 文件夹。

### 2.4 ⚠️ 关键：修复 Android 项目配置

> 以下是经过验证的配置，直接使用可避免 95% 的构建问题。

#### android/variables.gradle

```gradle
ext {
    minSdkVersion = 24
    compileSdkVersion = 35
    targetSdkVersion = 35
    androidxAppCompatVersion = '1.7.0'
    androidxCoreVersion = '1.15.0'
    androidxFragmentVersion = '1.8.5'
    coreSplashScreenVersion = '1.0.1'
    androidxWebkitVersion = '1.12.1'
    junitVersion = '4.13.2'
    androidxJunitVersion = '1.2.1'
    androidxEspressoCoreVersion = '3.6.1'
    cordovaAndroidVersion = '10.1.1'
    kotlinVersion = '1.9.24'
}
```

#### android/build.gradle（项目根）

```gradle
buildscript {
    repositories {
        google()
        mavenCentral()
    }
    dependencies {
        classpath 'com.android.tools.build:gradle:8.7.2'
        classpath 'com.google.gms:google-services:4.4.4'
    }
}

apply from: "variables.gradle"

allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

// 强制所有子模块使用 Java 17（覆盖 Capacitor 默认的 Java 21）
subprojects {
    afterEvaluate {
        if (hasProperty('android')) {
            android {
                compileOptions {
                    sourceCompatibility JavaVersion.VERSION_17
                    targetCompatibility JavaVersion.VERSION_17
                }
            }
        }
    }
}

task clean(type: Delete) {
    delete rootProject.buildDir
}
```

#### android/gradle/wrapper/gradle-wrapper.properties

```properties
distributionBase=GRADLE_USER_HOME
distributionPath=wrapper/dists
distributionUrl=https\://services.gradle.org/distributions/gradle-8.9-all.zip
networkTimeout=10000
validateDistributionUrl=true
zipStoreBase=GRADLE_USER_HOME
zipStorePath=wrapper/dists
```

#### android/app/build.gradle

```gradle
apply plugin: 'com.android.application'

android {
    namespace = "com.你的域名.应用名"
    compileSdk = rootProject.ext.compileSdkVersion
    
    defaultConfig {
        applicationId "com.你的域名.应用名"
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode 1
        versionName "1.0"
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
    }
    
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}

repositories {
    google()
    mavenCentral()
}

dependencies {
    implementation fileTree(include: ['*.jar'], dir: 'libs')
    implementation "androidx.appcompat:appcompat:$androidxAppCompatVersion"
    implementation "androidx.core:core-splashscreen:$coreSplashScreenVersion"
    implementation project(':capacitor-android')
    implementation project(':capacitor-cordova-android-plugins')
}

// 必须在这里 apply capacitor 生成的配置
apply from: 'capacitor.build.gradle'

// ⚠️ 关键：compileOptions 必须在 capacitor.build.gradle 之后，才能覆盖其 Java 21 设置
android {
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}

// ⚠️ 关键：解决 Kotlin stdlib 版本冲突
configurations.all {
    resolutionStrategy {
        force "org.jetbrains.kotlin:kotlin-stdlib:$kotlinVersion"
        force "org.jetbrains.kotlin:kotlin-stdlib-jdk7:$kotlinVersion"
        force "org.jetbrains.kotlin:kotlin-stdlib-jdk8:$kotlinVersion"
    }
}
```

#### android/gradle.properties

```properties
org.gradle.jvmargs=-Xmx1536m
org.gradle.daemon=false
android.useAndroidX=true
```

#### android/settings.gradle

```gradle
include ':app'
include ':capacitor-cordova-android-plugins'
project(':capacitor-cordova-android-plugins').projectDir = new File('./capacitor-cordova-android-plugins/')

apply from: 'capacitor.settings.gradle'
```

### 2.5 同步 Web 资源

每次修改 Web 代码后，需要同步到 Android 项目：

```bash
npm run build        # 先构建生产版本
npx cap sync android # 同步资源
```

### 2.6 .gitignore

```gitignore
# Node.js
node_modules/
dist/

# Android 构建产物（不提交）
android/.gradle/
android/build/
android/app/build/
android/capacitor-cordova-android-plugins/build/

# 证书文件（如有）
*.pem
*.jks

# IDE
.idea/
.vscode/
*.iml

# macOS
.DS_Store
```

**重要**：`android/` 目录（除 `build/` 和 `.gradle/` 外）必须提交到 Git！

---

## 第三阶段：GitHub Actions 配置

### 3.1 创建工作流文件

创建 `.github/workflows/build-apk.yml`：

```yaml
name: Build APK

on:
  push:
    tags:
      - "v*"
  workflow_dispatch:

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - uses: actions/setup-java@v4
        with:
          distribution: temurin
          java-version: "17"

      - uses: android-actions/setup-android@v3

      - uses: gradle/gradle-build-action@v3

      - name: Install Android SDK
        run: sdkmanager "platforms;android-35" "build-tools;35.0.0"

      - name: Build Debug APK
        working-directory: android
        run: ./gradlew assembleDebug --no-daemon

      - name: Verify APK
        run: |
          APK="android/app/build/outputs/apk/debug/app-debug.apk"
          if [ -f "$APK" ]; then
            echo "✅ APK size: $(du -h $APK | cut -f1)"
          else
            echo "❌ APK not found!"
            exit 1
          fi

      - name: Create GitHub Release
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          TAG="${{ github.ref_name }}"
          APK="android/app/build/outputs/apk/debug/app-debug.apk"
          
          # 清理可能存在的同名 release
          gh release delete "$TAG" --yes 2>/dev/null || true
          git push --delete origin "$TAG" 2>/dev/null || true
          sleep 2
          
          # 创建 Release 并上传 APK
          gh release create "$TAG" "$APK" \
            --title "APK $TAG" \
            --notes "Auto-built from commit ${{ github.sha }}" \
            --prerelease
```

### 3.2 工作流说明

| 步骤 | 作用 |
|------|------|
| `actions/checkout@v4` | 检出代码，`fetch-depth: 0` 获取完整历史 |
| `setup-java@v4` | 安装 Temurin JDK 17 |
| `setup-android@v3` | 配置 Android SDK 命令行工具 |
| `gradle-build-action@v3` | Gradle 缓存加速构建 |
| `sdkmanager` | 安装指定版本的 SDK 和 Build Tools |
| `gradlew assembleDebug` | 编译 Debug APK |
| `gh release create` | 创建 GitHub Release 并上传 APK |

### 3.3 触发方式

#### 方式一：推送 Tag（推荐）

```bash
git tag v1.0.0
git push origin v1.0.0
```

#### 方式二：手动触发

在 GitHub 仓库页面 → Actions → Build APK → Run workflow

---

## 第四阶段：构建与发布

### 4.1 初始化 Git 并推送

```bash
git init
git add -A
git commit -m "initial commit: 应用名称"
git branch -M main
git remote add origin https://github.com/用户名/仓库名.git
git push -u origin main
```

### 4.2 触发首次构建

```bash
git tag v1.0.0
git push origin v1.0.0
```

### 4.3 查看构建状态

1. 访问 `https://github.com/用户名/仓库名/actions`
2. 点击最近的 workflow run
3. 查看每个步骤的执行状态

### 4.4 下载 APK

构建成功后，APK 会出现在 GitHub Releases 页面：

- **网页下载**：`https://github.com/用户名/仓库名/releases`
- **直接链接**：`https://github.com/用户名/仓库名/releases/download/v1.0.0/app-debug.apk`
- **API 下载**：
  ```bash
  curl -L -H "Authorization: Bearer YOUR_TOKEN" \
    -o app-debug.apk \
    "https://github.com/用户名/仓库名/releases/download/v1.0.0/app-debug.apk"
  ```

### 4.5 安装 APK

通过以下方式安装到 Android 设备：

```bash
# 方式一：ADB 安装
adb install app-debug.apk

# 方式二：Termux 直接安装
am start -a android.intent.action.VIEW \
  -d file://$(pwd)/app-debug.apk \
  -t application/vnd.android.package-archive

# 方式三：在文件管理器中点击 APK 安装
```

---

## 故障排查手册

### 错误 1：`error: invalid source release: 21`

**症状**：
```
Execution failed for task ':capacitor-android:compileDebugJavaWithJavac'.
> error: invalid source release: 21
```

**原因**：Capacitor 8+ 默认要求 Java 21，但 CI 环境只安装了 Java 17。`capacitor.build.gradle` 会自动生成 Java 21 的 compileOptions。

**解决方案**：

在 `android/app/build.gradle` 中，确保 `compileOptions` 放在 `apply from: 'capacitor.build.gradle'` **之后**：

```gradle
// 先 apply capacitor 配置
apply from: 'capacitor.build.gradle'

// 再覆盖 Java 版本
android {
    compileOptions {
        sourceCompatibility JavaVersion.VERSION_17
        targetCompatibility JavaVersion.VERSION_17
    }
}
```

### 错误 2：`Duplicate class kotlin-stdlib`

**症状**：
```
Duplicate class kotlin.collections.jdk8.CollectionsJDK8Kt found in modules
kotlin-stdlib-1.8.22 and kotlin-stdlib-jdk8-1.6.21
```

**原因**：Cordova Android 插件引入了旧版 Kotlin stdlib（1.6.21），与 Capacitor Android 依赖的新版（1.8.x）冲突。

**解决方案**：

1. 在 `android/variables.gradle` 中添加：
   ```gradle
   kotlinVersion = '1.9.24'
   ```

2. 在 `android/app/build.gradle` 末尾添加：
   ```gradle
   configurations.all {
       resolutionStrategy {
           force "org.jetbrains.kotlin:kotlin-stdlib:$kotlinVersion"
           force "org.jetbrains.kotlin:kotlin-stdlib-jdk7:$kotlinVersion"
           force "org.jetbrains.kotlin:kotlin-stdlib-jdk8:$kotlinVersion"
       }
   }
   ```

### 错误 3：`APK not found` / Release 创建成功但没有资产

**症状**：Workflow 显示成功，但 Release 页面没有 APK 文件。

**原因**：
1. Gradle 构建实际失败了，但 `tail -20` 截断了错误信息
2. `softprops/action-gh-release` action 在已有同名 release 时静默跳过文件上传

**解决方案**：

1. **移除所有 `tail` 截断**，让完整输出可见
2. **使用 `gh release create` CLI** 替代 action：
   ```yaml
   - name: Create Release
     env:
       GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
     run: |
       TAG="${{ github.ref_name }}"
       APK="android/app/build/outputs/apk/debug/app-debug.apk"
       gh release delete "$TAG" --yes 2>/dev/null || true
       sleep 2
       gh release create "$TAG" "$APK" --title "APK $TAG" --prerelease
   ```

### 错误 4：`Cannot set the value of read-only property 'force'`

**症状**：
```
Cannot set the value of read-only property 'force' for DefaultExternalModuleDependency
```

**原因**：在 `dependencies {}` 块中使用 `force = true` 在新版 Gradle 中不兼容。

**解决方案**：使用 `configurations.all { resolutionStrategy { force ... } }` 替代。

### 错误 5：PWA 无法安装到主屏幕

**检查清单**：

| # | 检查项 | 通过条件 |
|---|--------|----------|
| 1 | `manifest.json` 存在且有效 | 浏览器控制台无 manifest 错误 |
| 2 | `icons` 指向有效 PNG 文件 | 192×192 和 512×512，非 1×1 占位符 |
| 3 | `display: "standalone"` | manifest.json 中设置 |
| 4 | `start_url` 返回 200 | 访问 start_url 无 404 |
| 5 | 使用 HTTPS 或 localhost | HTTP 非 localhost 不可安装 |
| 6 | Service Worker 正确注册 | 浏览器 DevTools Application → Service Workers |

### 错误 6：`gh release create: tag already exists`

**症状**：
```
tag v1.0.0 already exists
```

**解决方案**：在创建 release 前先删除：
```bash
gh release delete "$TAG" --yes 2>/dev/null || true
git push --delete origin "$TAG" 2>/dev/null || true
```

---

## 项目模板清单

以下是经过验证的完整文件列表，可直接复制使用。

### 根目录文件

| 文件 | 必需 | 说明 |
|------|------|------|
| `package.json` | ✅ | type=module, scripts: dev/build/preview |
| `index.html` | ✅ | 含 meta tags, manifest link, SW registration |
| `vite.config.js` | ✅ | React 插件, server port 3000 |
| `capacitor.config.json` | ✅ | appId, appName, webDir |
| `.gitignore` | ✅ | node_modules, dist, android build dirs |

### public/ 目录

| 文件 | 必需 | 说明 |
|------|------|------|
| `manifest.json` | ✅ | PWA 安装核心配置 |
| `icon-192.png` | ✅ | 有效 PNG, ≥ 192×192 |
| `icon-512.png` | ✅ | 有效 PNG, ≥ 512×512 |
| `sw.js` | ✅ | 基础 Service Worker |

### .github/workflows/

| 文件 | 必需 | 说明 |
|------|------|------|
| `build-apk.yml` | ✅ | 完整 CI/CD 工作流 |

### android/ 目录（除 build 产物外全部提交）

| 文件 | 必需 | 说明 |
|------|------|------|
| `build.gradle` | ✅ | 项目级 Gradle 配置 |
| `settings.gradle` | ✅ | 模块包含配置 |
| `variables.gradle` | ✅ | SDK 版本变量 |
| `gradle.properties` | ✅ | Gradle JVM 配置 |
| `gradle/wrapper/gradle-wrapper.jar` | ✅ | Gradle Wrapper |
| `gradle/wrapper/gradle-wrapper.properties` | ✅ | Gradle 版本 |
| `gradlew` | ✅ | Unix 构建脚本 |
| `app/build.gradle` | ✅ | 应用级 Gradle 配置 |
| `app/src/main/AndroidManifest.xml` | ✅ | Android 清单 |
| `app/src/main/java/...` | ✅ | Java 源码目录 |
| `app/src/main/res/...` | ✅ | 资源目录 |
| `capacitor-cordova-android-plugins/` | ✅ | Cordova 插件目录 |

---

## 版本历史

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-04-07 | 基于「知日」日历应用开发经验整理 |
