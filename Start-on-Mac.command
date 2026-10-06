#!/bin/bash
# Double-click from Finder to start the iPhone development server.
set -euo pipefail
cd "$(dirname "$0")"
trap 'code=$?; if [ "$code" -ne 0 ]; then printf "\n실행을 완료하지 못했어요. 이 화면의 오류를 채팅에 알려주세요.\n"; read -r -p "Enter를 누르면 닫힙니다. " _; fi' EXIT
printf '\n우리 강아지 · iPhone 테스트 준비\n\n'
if ! command -v node >/dev/null 2>&1 || ! node -e 'process.exit(Number(process.versions.node.split(".")[0]) >= 24 ? 0 : 1)'; then
  printf 'Node.js 24 이상 설치가 필요해요. 열리는 공식 사이트에서 LTS 설치 파일을 선택해 주세요.\n설치가 끝나면 이 파일을 다시 열어주세요.\n'
  open 'https://nodejs.org/en/download'
  read -r -p 'Enter를 누르면 닫힙니다. ' _
  exit 0
fi
printf '처음 실행할 때 준비에 몇 분 정도 걸릴 수 있어요.\n'
npm ci --no-fund --no-audit
printf '\niPhone에 Expo Go를 설치하고 맥북과 같은 Wi-Fi에 연결해 주세요.\n아래 QR 코드를 iPhone 카메라로 스캔하면 게임이 열립니다.\n테스트하는 동안 이 창을 열어두세요. 종료하려면 Control+C를 누르세요.\n\n'
EXPO_NO_TELEMETRY=1 npm start -- --lan
