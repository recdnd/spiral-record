#!/bin/bash
# DEPRECATED — 真正 SoT 在 rituals/自動localhost.command
# 雙擊此檔仍能跑（轉發到 rituals/ 內版本），但建議改從 rituals/ 雙擊。
exec "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/rituals/自動localhost.command" "$@"
