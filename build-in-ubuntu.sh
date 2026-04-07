#!/bin/bash
# 在 Ubuntu proot 中构建 APK
set -e

export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-arm64
export ANDROID_HOME=/data/data/com.termux/files/home/android-sdk
export PATH=$ANDROID_HOME/cmdline-tools/latest/bin:$JAVA_HOME/bin:$PATH

cd /data/data/com.termux/files/home/zhiri/android

# 清理并构建
rm -rf build app/build capacitor-cordova-android-plugins/build

yes | sdkmanager --licenses > /dev/null 2>&1

./gradlew assembleDebug --no-daemon 2>&1 | tail -25

APK_PATH="/data/data/com.termux/files/home/zhiri/android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK_PATH" ]; then
    SIZE=$(du -h "$APK_PATH" | cut -f1)
    echo ""
    echo "======================================"
    echo "  ✅ 构建成功! APK: $SIZE"
    echo "  $APK_PATH"
    echo "======================================"
else
    echo "❌ 构建失败"
    exit 1
fi
