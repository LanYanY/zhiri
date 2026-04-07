#!/bin/bash
# 知日 APK 构建脚本（在 Ubuntu proot 环境中运行）
set -e

TERMUX_HOME="/data/data/com.termux/files/home"
ANDROID_SDK="/data/data/com.termux/files/home/android-sdk"
PROJECT_DIR="/data/data/com.termux/files/home/zhiri"

echo "======================================"
echo "  知日 - APK 构建脚本"
echo "======================================"

# 检查环境
echo "[1/5] 检查 Java..."
java -version 2>&1 | head -1

echo "[2/5] 检查 Android SDK..."
if [ ! -d "$ANDROID_SDK" ]; then
    echo "错误: Android SDK 不存在: $ANDROID_SDK"
    exit 1
fi

echo "[3/5] 重新构建 Web 资源..."
cd "$PROJECT_DIR"
npm run build 2>&1 | tail -5

echo "[4/5] 同步 Capacitor 资源..."
npx cap sync android 2>&1 | tail -5

# 设置环境变量
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-arm64
export ANDROID_HOME="$ANDROID_SDK"
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$ANDROID_HOME/build-tools/34.0.0:$JAVA_HOME/bin:$PATH

echo "[5/5] 构建 APK..."
cd "$PROJECT_DIR/android"

# 接受许可证
yes | sdkmanager --licenses > /dev/null 2>&1

# 构建 Debug APK
./gradlew assembleDebug --no-daemon 2>&1 | tail -20

APK_PATH="$PROJECT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"

if [ -f "$APK_PATH" ]; then
    APK_SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo ""
    echo "======================================"
    echo "  ✅ 构建成功!"
    echo "  APK: $APK_PATH"
    echo "  大小: $APK_SIZE"
    echo "======================================"
    echo ""
    echo "安装到手机:"
    echo "  cd && pkg install -y apksigner"
    echo "  apksigner sign --ks my-release-key.jks $APK_PATH"
    echo "  am start -a android.intent.action.VIEW -d file://$APK_PATH -t application/vnd.android.package-archive"
    echo ""
else
    echo "❌ 构建失败，APK 未生成"
    exit 1
fi
