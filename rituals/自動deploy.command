#!/bin/bash
# spiral-record · deploy 薄殼（Vercel production）
# 本檔放在 <project>/rituals/ 內

REC_PROJECT="spiral-record"

REC_PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REC_PROJECT_DIR"

echo "▣ ${REC_PROJECT} · Vercel deploy"
echo "· dir : $REC_PROJECT_DIR"
echo "· url : https://record.spiral.ooo"

if ! command -v vercel >/dev/null 2>&1; then
  echo "✗ vercel CLI 未安裝。請執行：npm i -g vercel"
  read -n 1 -s -r -p "按任意鍵關閉視窗…"; exit 1
fi

echo "· vercel --prod"
if vercel --prod; then
  echo "✓ 已觸發 production deploy → https://record.spiral.ooo"
else
  echo "✗ deploy 失敗"
  read -n 1 -s -r -p "按任意鍵關閉視窗…"; exit 1
fi

read -n 1 -s -r -p "按任意鍵關閉視窗…"
