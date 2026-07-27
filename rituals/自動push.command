#!/bin/bash
# spiral-record · push 薄殼
# 遠端 repo 尚未建（建議 private）。建好後執行：
#   git remote add origin git@github.com:recdnd/spiral-record.git

REC_PROJECT="spiral-record"
REC_DEPLOY_URL=""
REC_REBASE=0  # 沒 remote 時跳過 rebase

REC_PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
_d="$REC_PROJECT_DIR"
while [[ "$_d" != "/" && ! -d "$_d/sov/machine/lib" ]]; do _d="$(dirname "$_d")"; done
MACHINE_LIB="${MACHINE_LIB:-$_d/sov/machine/lib}"

source "$MACHINE_LIB/rec-push.sh"
rec_push "$@"
