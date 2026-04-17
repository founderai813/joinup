# CLAUDE.md — JoinUp 揪團神器

## 專案概述

JoinUp 是一個**揪團協調工具**，解決「一群人約不到共同時間」的問題。主揪建立活動、設定可用時段，跟團者勾選自己能來的時段，系統自動計算交集，成團後一鍵匯出 Google Calendar / iCal。

- **產品名稱**: JoinUp 揪團神器
- **語言**: 繁體中文（zh-TW）
- **目標用戶**: 朋友揪團（聚餐、運動、旅遊、桌遊）、社團幹部、小型活動主辦者

## 品牌

- **主品牌**: futurestarai.com
- **子網域格式**: `<project>.futurestarai.com`
- **本專案網址**: `joinup.futurestarai.com`
- **GitHub Repo**: `founderai813/joinup`

## 架構

### 前端

- **框架**: React 18（UMD production build，CDN 載入）
- **JSX 編譯**: Babel Standalone（瀏覽器即時編譯）
- **樣式**: 純 inline CSS-in-JS（深色主題 #080d18）
- **字型**: Google Fonts — Syne（標題）+ DM Sans（內文）
- **QR Code**: qrcode.js（CDN）
- **PWA**: manifest.webmanifest + sw.js（Service Worker，network-first 策略）
- **所有前端程式碼都在單一 `index.html` 檔案中**（約 2000 行）

### 後端 / 資料庫

- **Firebase Firestore**（v10.12.0）— 即時 NoSQL 資料庫
- **Firebase 專案**: `joinup-a4e3d`
- **方案**: Spark（免費），每日 50K 讀取 / 20K 寫入 / 20K 刪除
- **離線備援**: localStorage（key prefix `ju_`）

### 資料結構

```
/activities/{groupId}     — 每個活動一個獨立文件（最大 1MB）
/app/wishes               — 許願池（單一文件）
/app/admin                — 管理員密碼（單一文件）
```

每個 activity 文件包含：
- 活動資訊（名稱、日期、費用、地點、圖片 base64 等）
- joiners map（跟團者 + 時段 + 備註）
- waitlist map（候補名單）
- comments array（留言板）
- organizerSlots map（主揪可用時段）

### 密碼安全

- 新建活動密碼使用 **SHA-256 Hash**（Web Crypto API）
- 舊明文密碼在登入時**自動升級**為 hash
- 比對函式 `matchPw()` 同時支援 hash 和明文（向後相容）

## 檔案結構

```
joinup/
├── CLAUDE.md              ← 本檔案
├── CNAME                  ← GitHub Pages 自訂網域
├── README.md              ← 專案簡介
├── index.html             ← 主程式（React SPA，約 2000 行）
├── manifest.webmanifest   ← PWA manifest
├── og-image.svg           ← OG 社群預覽圖
└── sw.js                  ← Service Worker（離線快取）
```

## 部署

- **託管**: GitHub Pages（從 `main` 分支自動部署）
- **網域**: `joinup.futurestarai.com`（透過 CNAME 檔設定）
- **部署流程**: push 到 `main` → GitHub Pages 自動 build → 1-2 分鐘上線
- **無 build 步驟**: 純靜態 HTML，瀏覽器直接執行
- **CDN 依賴**: React 18、ReactDOM 18、Babel Standalone、qrcode.js（皆從 unpkg / jsdelivr 載入）

## 工作流程

### 開發

1. 所有程式碼在 `index.html` 一個檔案中
2. 修改後 commit 到 `main` 分支
3. push 後 GitHub Pages 自動部署

### 分支策略

- `main`: 正式環境（GitHub Pages 部署來源）
- feature branches: `claude/<feature>-<suffix>` 格式

### 注意事項

- **不要拆分 index.html**: 所有 React 元件、樣式、邏輯都在同一個檔案中，這是刻意的設計（零 build 流程）
- **圖片儲存**: 活動圖片以 base64 存在 Firestore 文件中（壓縮至 700px、q 0.65），每個活動上限約 1MB
- **Toast 機制**: 使用獨立的 `ToastOverlay` 元件 + CustomEvent（`ju-toast`），避免觸發 App 重渲染導致手機鍵盤跳掉
- **表單狀態保護**: OrganizerTab 的表單使用 `useRef` 保存跨 remount 的狀態，避免 App 重渲染丟失使用者輸入
- **Firestore 寫入**: `saveGroups()` 會 diff 前後狀態，只寫入有變更的活動文件（不是全量覆寫）
- **密碼**: 所有密碼比對使用 `matchPw()`，支援 SHA-256 hash 和舊明文。新密碼一律 hash 後儲存
- **手機適配**: input font-size 必須 >= 16px（防止 iOS Safari 自動縮放）；避免使用 `min-height: 100vh`（會和虛擬鍵盤衝突）

## 功能清單

- 開團（建立活動 + 分類 + 圖片上傳 + 時段選擇）
- 跟團（填資料 + 勾時段，限定團需密碼）
- 候補名單（額滿可加候補，主揪可遞補）
- 許願池（投點子 + 按讚排行）
- 活動分類（23 種）+ 搜尋篩選
- 費用分攤試算（僅主揪可見）
- 留言板（每個活動獨立）
- 分享（LINE / FB / Twitter / Threads / WhatsApp / Telegram / Email + QR Code + IG Stories 圖卡）
- CSV 匯出（跟團者名單 / 全部活動）
- Google Calendar + iCal 匯出
- PWA（可安裝到手機桌面）
- 我參加過的活動（信箱查詢）
- 自助取消報名（信箱驗證）
- 限定團隱私（非成員看不到參加者）
- 管理員儀表板（統計 + Firebase 用量監控）
- 活動模板（再開一團）
- 活動自動歸檔（過期活動標記已結束）
