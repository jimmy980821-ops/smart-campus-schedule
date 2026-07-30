#!/bin/bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
IOS_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
PROJECT_SPEC="$IOS_DIR/project.yml"
PERSONAL_SPEC="$IOS_DIR/.project-personal.yml"
PBXPROJ_PATH="$IOS_DIR/CampusFlow.xcodeproj/project.pbxproj"
PLIST_PATH="$IOS_DIR/Config/GoogleService-Info.plist"

cleanup() {
  rm -f "$PERSONAL_SPEC"
}
trap cleanup EXIT

if [[ ! -f "$PLIST_PATH" ]]; then
  echo "找不到 Config/GoogleService-Info.plist。"
  echo "請先完成 Firebase iOS App 設定。"
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

REVERSED_CLIENT_ID=$(/usr/libexec/PlistBuddy -c "Print :REVERSED_CLIENT_ID" "$PLIST_PATH")

# Personal Team 不支援 APNs 與 App Groups。產生一份暫時規格，
# 僅移除簽署用 entitlements，不改動正式上架用的 project.yml。
/usr/bin/awk '
  /^    entitlements:/ {
    skipping_entitlements = 1
    next
  }
  skipping_entitlements && /^    [[:alnum:]_].*:/ {
    skipping_entitlements = 0
  }
  !skipping_entitlements {
    print
  }
' "$PROJECT_SPEC" |
  /usr/bin/sed \
    -e 's|CODE_SIGN_ENTITLEMENTS: Config/CampusFlow.entitlements|CODE_SIGN_ENTITLEMENTS: ""|g' \
    -e 's|NATIVE_PUSH_ENABLED: true|NATIVE_PUSH_ENABLED: false|g' \
    -e "s|REPLACE_WITH_REVERSED_CLIENT_ID|$REVERSED_CLIENT_ID|g" \
    > "$PERSONAL_SPEC"

# 保留使用者在 Xcode 選過的 Personal Team。
if [[ -f "$PBXPROJ_PATH" ]] && grep -q 'DEVELOPMENT_TEAM: ""' "$PERSONAL_SPEC"; then
  CURRENT_TEAM=$(
    /usr/bin/sed -n \
      's/^[[:space:]]*DEVELOPMENT_TEAM = \([^;]*\);/\1/p' \
      "$PBXPROJ_PATH" | /usr/bin/head -n 1
  )
  if [[ -n "$CURRENT_TEAM" ]]; then
    /usr/bin/sed -i '' \
      "s|DEVELOPMENT_TEAM: \"\"|DEVELOPMENT_TEAM: \"$CURRENT_TEAM\"|" \
      "$PERSONAL_SPEC"
  fi
fi

cd "$IOS_DIR"
"$XCODEGEN" generate --spec "$PERSONAL_SPEC"

echo ""
echo "免費 Personal Team 專案已產生。"
echo "請開啟：$IOS_DIR/CampusFlow.xcodeproj"
echo "此模式不包含原生背景推播與 App Groups；正式上架時請改回 configure-firebase.sh。"
