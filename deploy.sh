#!/usr/bin/env bash

# 發生錯誤時終止腳本
set -e

# 建立 dist 目錄
npm run build

# 進入 dist 目錄
cd dist

# 初始化 Git，將變更提交到 gh-pages 分支
git init
git checkout -b main
git add -A
git commit -m 'deploy'

# 推送到 GitHub Pages
git push -d origin gh-pages || true
git push -f git@github.com:ting2275/teacher-upload.git main:gh-pages

cd -