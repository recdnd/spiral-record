#!/bin/bash
# spiral-record · localhost 薄殼（Next.js dev，前景 exec）

REC_PROJECT="spiral-record"
REC_PORT=5252
REC_SERVE_CMD="npx next dev -p $REC_PORT"
REC_BG=0

REC_PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
_d="$REC_PROJECT_DIR"
while [[ "$_d" != "/" && ! -d "$_d/sov/machine/lib" ]]; do _d="$(dirname "$_d")"; done
MACHINE_LIB="${MACHINE_LIB:-$_d/sov/machine/lib}"

source "$MACHINE_LIB/rec-serve.sh"
rec_serve "$@"
