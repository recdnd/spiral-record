#!/bin/bash
# spiral-record · localhost 薄殼（接 machine/specs/02-localhost.md v0.1）

REC_PROJECT="spiral-record"
REC_PORT="5252"               # machine/ports.md · 5xxx spiral universe
REC_SERVE_CMD="npx next dev -p $REC_PORT"

# 自動找 machine/lib：從本腳本往上爬目錄樹
_d="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
while [[ "$_d" != "/" && ! -d "$_d/machine/lib" ]]; do _d="$(dirname "$_d")"; done
[[ -d "$_d/machine/lib" ]] || _d="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../DungeonsRoot" 2>/dev/null && pwd)"
MACHINE_LIB="${MACHINE_LIB:-$_d/machine/lib}"

source "$MACHINE_LIB/rec-serve.sh"
rec_serve "$@"
