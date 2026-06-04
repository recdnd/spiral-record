#!/bin/bash
# spiral-record · push 薄殼（接 machine/specs/01-deploy.md v0.2）
# 注意：遠端 repo 尚未建立。建好後（建議 private）執行：
#   git remote add origin git@github.com:recdnd/spiral-record.git

REC_PROJECT="spiral-record"
REC_DEPLOY_URL=""   # 本專案目前僅本機/私有，無公開部署網址

# 自動找 machine/lib：從本腳本往上爬目錄樹
_d="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
while [[ "$_d" != "/" && ! -d "$_d/machine/lib" ]]; do _d="$(dirname "$_d")"; done
[[ -d "$_d/machine/lib" ]] || _d="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../DungeonsRoot" 2>/dev/null && pwd)"
MACHINE_LIB="${MACHINE_LIB:-$_d/machine/lib}"

source "$MACHINE_LIB/rec-push.sh"
rec_push "$@"
