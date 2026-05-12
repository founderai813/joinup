# JoinUp 揪團神器

> 解決「一群人約不到共同時間」的揪團協調工具
> 🌐 **線上版**：https://joinup.futurestarai.com

---

## 專案一句話

主揪建活動 + 設可用時段 → 跟團者勾自己能來的時段 → 系統自動算交集 → 成團一鍵匯出 Google Calendar / iCal。

---

## 解決的問題

朋友揪聚餐、社團幹部辦活動、桌遊揪團、運動約打球，最痛的不是「想去哪」，而是**「大家什麼時候有空」**。LINE 群組裡你一言我一句，最後沒人記得結論。JoinUp 用「時段交集」把這個對話變成一張可勾選的表，並在成團後自動推到行事曆。

---

## 技術棧

### 前端

| 技術 | 用途 | 為什麼選它 |
|---|---|---|
| **React 18**（UMD CDN） | UI 框架 | 元件化開發，但不引 npm — 直接走瀏覽器 UMD |
| **Babel Standalone** | JSX 即時編譯 | **零 build flow**，瀏覽器自己編譯 JSX |
| **inline CSS-in-JS** | 樣式 | 無 CSS 框架依賴，深色主題（`#080d18`） |
| **Google Fonts** | 字型 | Syne（標題）+ DM Sans（內文） |
| **qrcode.js** | QR Code 產生 | 分享連結 / IG Stories 圖卡 |
| **Service Worker** | PWA 離線 | network-first 策略，可安裝到桌面 |

### 後端 / 資料

| 技術 | 用途 |
|---|---|
| **Firebase Firestore v10.12.0** | NoSQL 即時資料庫 |
| **Web Crypto API** | 密碼 SHA-256 hash |
| **localStorage / sessionStorage / IndexedDB** | 多層離線備援 |

### 部署

| 項目 | 內容 |
|---|---|
| **託管** | GitHub Pages（從 `main` 自動部署） |
| **網域** | `joinup.futurestarai.com`（CNAME） |
| **CDN** | unpkg / jsdelivr / Google Fonts |
| **Build 流程** | 無 — 純靜態 HTML，push 即上線 |

---

## 架構亮點

### 1. 零 build flow，整個前端只有 1 個 HTML 檔
- 約 2300 行的 `index.html`，包含所有 React 元件、樣式、業務邏輯
- 改完直接 `git push`，1-2 分鐘上線
- 沒有 webpack、沒有 vite、沒有 `node_modules`
- 適合單人開發 / 快速迭代 / 不想被 build tool 困住的小型專案

### 2. 多來源資料恢復（防丟失）
經歷過一次資料消失事件（2026-04-28）後，重寫了載入邏輯：

```
Firestore + localStorage + sessionStorage + IndexedDB
         ↓ 並行讀取
         ↓ 取聯集
         ↓ 寫回 Firestore（diff 寫入，非全量覆寫）
```

頁面頂部會顯示彩色狀態面板（綠/藍/紅），讓使用者一眼看出資料來自哪個來源。

### 3. 密碼自動升級
- 新建活動：SHA-256 hash 後存 Firestore
- 舊明文密碼：登入時驗證通過後**自動 hash 升級**
- 比對函式同時支援 hash 和明文，無痛遷移

### 4. 表單狀態保護
- Toast 訊息用獨立 `ToastOverlay` + `CustomEvent` 廣播，避免觸發 App 重渲染
- 表單欄位用 `useRef` 保存跨 remount 狀態
- 解決了「使用者打字到一半鍵盤關掉」的手機殺手 bug

### 5. Firestore 寫入優化
- `saveGroups()` 內建 diff：只寫變更過的 activity 文件
- Spark 免費方案：每日 20K 寫入額度撐很久
- 文件上限 1 MB：圖片壓縮到 700px、quality 0.65 存成 base64

---

## 功能清單

### 主揪
- ✅ 建立活動（23 種分類 / 圖片上傳 / 自訂時段）
- ✅ 候補名單（額滿可加候補，主揪可遞補）
- ✅ 費用分攤試算（僅主揪可見）
- ✅ 活動模板（再開一團，沿用設定）
- ✅ CSV 匯出（跟團者名單 / 全部活動）
- ✅ Google Calendar + iCal 匯出
- ✅ 限定團隱私（非成員看不到參加者）

### 跟團者
- ✅ 填資料 + 勾時段
- ✅ 自助取消報名（信箱驗證）
- ✅ 「我參加過的活動」（信箱查詢）
- ✅ 留言板（每個活動獨立）

### 其他
- ✅ 許願池（投點子 + 按讚排行）
- ✅ 活動分類 + 搜尋篩選
- ✅ 多管道分享（LINE / FB / Twitter / Threads / WhatsApp / Telegram / Email + QR Code + IG Stories 圖卡）
- ✅ PWA 可安裝到手機桌面
- ✅ 管理員儀表板（統計 + Firebase 用量監控）
- ✅ 活動自動歸檔（過期活動標記已結束）

---

## 經驗 / 學到的事

### ✅ 做對的
1. **零 build flow** — 開發節奏快，部署無腦，沒有環境問題
2. **多來源備援** — 一次資料消失事件後加上，從此使用者再也沒丟過資料
3. **diff 寫入** — Spark 方案撐到現在沒爆額度
4. **密碼 hash 自動升級** — 安全升級不打擾舊用戶

### ❌ 踩過的坑
1. **`min-height: 100vh`** vs iOS 虛擬鍵盤 → 換成 `100%`
2. **input `font-size` < 16px** → iOS Safari 自動縮放，改 ≥ 16px
3. **Toast setState 觸發 App 重渲染** → 改成獨立 overlay + CustomEvent
4. **全量覆寫 Firestore** → 改成 diff 寫入
5. **單一資料源** → 改成四源備援

---

## 履歷 / 介紹文用條目

> 從零打造繁體中文揪團工具 **JoinUp**（joinup.futurestarai.com），採用 React 18 + Firebase Firestore 架構，**零 build flow** 單檔部署到 GitHub Pages。實作多來源資料備援（Firestore/localStorage/sessionStorage/IndexedDB）解決資料消失問題、密碼 SHA-256 自動升級、Firestore diff 寫入優化、PWA 離線支援、多管道社群分享與 Google Calendar / iCal 匯出。

**關鍵字**：React、Firebase Firestore、PWA、Service Worker、Web Crypto API、Google Calendar API、iCal、CSV 匯出、QR Code、響應式設計、深色主題、繁體中文 UX

---

## 專案結構

```
joinup/
├── CLAUDE.md              ← AI 助理開發指引
├── PROJECT.md             ← 本檔案（人類看的專案總結）
├── .claude/skills/joinup/ ← Claude Code skill（給未來 AI 對話用）
├── CNAME                  ← GitHub Pages 自訂網域
├── README.md              ← 簡介
├── index.html             ← 主程式（~2300 行）
├── manifest.webmanifest   ← PWA manifest
├── og-image.svg           ← 社群預覽圖
└── sw.js                  ← Service Worker
```

---

## 授權 / 聯絡

- **GitHub**: [founderai813/joinup](https://github.com/founderai813/joinup)
- **主品牌**: [futurestarai.com](https://futurestarai.com)
