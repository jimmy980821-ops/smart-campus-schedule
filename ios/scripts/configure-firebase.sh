#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PLIST_PATH="$IOS_DIR/Config/GoogleService-Info.plist"
PROJECT_SPEC="$IOS_DIR/project.yml"
EXPECTED_BUNDLE_ID="com.jimmy980821.campusflow"

if [[ ! -f "$PLIST_PATH" ]]; then
  echo "找不到 Config/GoogleService-Info.plist。"
  echo "請先從 Firebase 控制台下載並放入 ios/Config/。"
  exit 1
fi

BUNDLE_ID=$(/usr/libexec/PlistBuddy -c "Print :BUNDLE_ID" "$PLIST_PATH")
REVERSED_CLIENT_ID=$(/usr/libexec/PlistBuddy -c "Print :REVERSED_CLIENT_ID" "$PLIST_PATH")

if [[ "$BUNDLE_ID" != "$EXPECTED_BUNDLE_ID" ]]; then
  echo "Firebase Bundle ID 不符：$BUNDLE_ID"
  echo "應為：$EXPECTED_BUNDLE_ID"
  exit 1
fi

if grep -q "REPLACE_WITH_REVERSED_CLIENT_ID" "$PROJECT_SPEC"; then
  /usr/bin/sed -i '' \
    "s|REPLACE_WITH_REVERSED_CLIENT_ID|$REVERSED_CLIENT_ID|g" \
    "$PROJECT_SPEC"
elif ! grep -q "$REVERSED_CLIENT_ID" "$PROJECT_SPEC"; then
  echo "project.yml 已有不同的 Google URL Scheme，請先檢查設定。"
  exit 1
fi

if command -v xcodegen >/dev/null 2>&1; then
  XCODEGEN="$(command -v xcodegen)"
elif [[ -x "$HOME/Downloads/xcodegen-2.41/xcodegen/bin/xcodegen" ]]; then
  XCODEGEN="$HOME/Downloads/xcodegen-2.41/xcodegen/bin/xcodegen"
else
  echo "找不到 XcodeGen。請先下載 XcodeGen 2.41.0。"
  exit 1
fi

cd "$IOS_DIR"
"$XCODEGEN" generate

echo ""
echo "Firebase iOS 設定完成。"
echo "Bundle ID：$BUNDLE_ID"
echo "Xcode 專案：$IOS_DIR/CampusFlow.xcodeproj"
