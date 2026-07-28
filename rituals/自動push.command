#!/bin/bash
# spiral-record · push 薄殼（接 machine/specs/01-deploy.md）
# 本檔放在 <project>/rituals/ 內

REC_PROJECT="spiral-record"
REC_DEPLOY_URL="https://record.spiral.ooo"

REC_PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
_d="$REC_PROJECT_DIR"
while [[ "$_d" != "/" && ! -d "$_d/sov/machine/lib" ]]; do _d="$(dirname "$_d")"; done
MACHINE_LIB="${MACHINE_LIB:-$_d/sov/machine/lib}"

source "$MACHINE_LIB/rec-push.sh"
rec_push "$@"
