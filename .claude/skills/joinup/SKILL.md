---
name: joinup
description: JoinUp 揪團神器專案的開發技能包。當使用者在 joinup 這個 repo 提出任何修改、除錯、新增功能、部署、處理 Firestore 資料、改 PWA、調整 UI 的請求時使用。專案是零 build 的單檔 React SPA（index.html），用 Firebase Firestore 當後端，部署在 GitHub Pages，網址 joinup.futurestarai.com。
---

# JoinUp 揪團神器 — 開發技能包

## 一句話描述

繁體中文的揪團協調工具：主揪建活動 + 設可用時段，跟團者勾自己能來的時段，系統算交集，成團後一鍵匯出 Google Calendar / iCal。

---

## 🚨 核心鐵則（違反會出大事）

1. **絕對不要拆分 `index.html`**
   - 所有 React 元件、CSS、邏輯都在這一個 ~2300 行的檔案裡，這是**刻意**的設計（零 build）
   - 不要建 `src/`、不要拆元件到別的檔案、不要引入 webpack/vite

2. **絕對不要在前端引入 npm**
   - 所有相依（React 18、ReactDOM、Babel Standalone、qrcode.js、Firebase v10.12.0）都從 CDN 載入
   - 不要加 `package.json`、不要 `npm install`

3. **改完版本號一定要 bump**
   - 頁面底部會顯示 `v<YYYYMMDD><序號>`（例：`v20260512a`）
   - 每次改 `index.html` 都要在頂部那個版本號常數 +1 序號（a → b → c...），這是判斷快取是否更新的唯一依據

4. **密碼一律走 `matchPw()`**
   - 新密碼存 SHA-256 hash（Web Crypto API）
   - 舊明文密碼存在於 Firestore，登入時自動升級
   - 不要直接 `===` 比對密碼字串

5. **Firestore 寫入用 diff，不全量覆寫**
   - `saveGroups()` 內建 diff，只寫改過的 activity 文件
   - 全量覆寫會導致誤刪（見下方「2026-04-28 事件」）

---

## 架構速查表

| 項目 | 內容 |
|---|---|
| 前端框架 | React 18 UMD + Babel Standalone（瀏覽器即時編譯 JSX） |
| 樣式 | inline CSS-in-JS（深色主題 `#080d18`） |
| 字型 | Syne（標題）+ DM Sans（內文）— Google Fonts |
| 資料庫 | Firebase Firestore v10.12.0（Spark 免費方案） |
| 離線備援 | localStorage（`ju_` 前綴）+ sessionStorage + IndexedDB |
| QR Code | qrcode.js（CDN） |
| PWA | manifest.webmanifest + sw.js（network-first） |
| 部署 | GitHub Pages，`main` 分支自動部署，1-2 分鐘上線 |
| 網域 | `joinup.futurestarai.com`（CNAME 指向 GitHub Pages） |

---

## Firestore 結構

```
/activities/{groupId}     ← 每個活動一份文件，上限 1 MB
   ├─ 活動資訊（name、date、cost、location、imageBase64 等）
   ├─ joiners: { [name]: { slots, note, email, ... } }
   ├─ waitlist: { ... }
   ├─ comments: [ ... ]
   └─ organizerSlots: { ... }

/app/wishes               ← 許願池（單一文件）
/app/admin                ← 管理員密碼（單一文件）
```

**圖片**：壓縮成 base64 存進文件本身（700px、quality 0.65），單活動上限約 1 MB。**不要**改用 Firebase Storage（會破壞 Spark 方案的免費額度策略）。

**Firestore 安全規則（已鎖）**：
```
match /activities/{id}  → 允許 read/create/update，禁止 delete
match /app/{docId}      → 允許 read/create/update，禁止 delete
其他全擋
```
**註**：禁止 delete 是刻意的，避免任何用戶端誤刪。需要刪資料時在 Firebase Console 手動刪。

---

## ⚠️ 踩過的坑（重複犯會被罵）

### A. 手機鍵盤跳掉
**症狀**：使用者在跟團表單打字到一半，App 重渲染，鍵盤關掉、輸入丟失。
**根因**：Toast 訊息直接觸發 App setState，整顆 re-render。
**修法**：
- Toast 改用獨立 `ToastOverlay` 元件 + `CustomEvent('ju-toast')` 廣播
- OrganizerTab 表單欄位用 `useRef` 保存跨 remount 狀態

### B. `min-height: 100vh` + iOS 虛擬鍵盤
**症狀**：iOS Safari 彈鍵盤時版面爆掉。
**修法**：避免 `min-height: 100vh`，改用 `min-height: 100%` 或乾脆不設。

### C. iOS Safari 自動縮放 input
**症狀**：點 input 時頁面自動放大。
**修法**：所有 input 的 `font-size` ≥ **16px**。

### D. 2026-04-28 資料消失事件
**症狀**：「掌心裡」「Cindy」兩筆活動的 joiners 資料從 Firestore 消失。
**根因**：`saveGroups()` 在 race condition 下，把尚未載入完的活動當成「已刪除」寫回 Firestore（全量覆寫 bug）。
**修法**（commit `61ff988`）：
1. 載入時並行讀 **Firestore + localStorage + sessionStorage + IndexedDB** 四個來源，取聯集
2. diff 前先確認來源資料完整性，否則 skip 寫入
3. 頁面頂部加「資料載入狀態」彩色面板（綠/藍/紅三色）

**未來如再發生**：先看頂部面板顯示哪個來源有資料，不要急著叫使用者重新建立。

---

## 「資料載入狀態」面板判讀

頁面頂部會顯示彩色面板，列出 Firestore / localStorage / sessionStorage / IndexedDB 各載入幾筆：

| 顏色 | 訊息 | 含義 | 處置 |
|---|---|---|---|
| 🟢 綠 | ✅ 已恢復 N 筆活動 | Firestore 少了，但備援補回來 | 確認後可繼續使用 |
| 🔵 藍 | 📊 共載入 N 筆活動 | 各來源都有，正常 | 正常使用 |
| 🔴 紅 | 🚨 四個來源都 0 筆 | 全軍覆沒 | 走外部備份 / CSV / 聯絡使用者 |

---

## 常見工作流程

### 改一個功能 → 部署
1. `git checkout -b claude/<feature>-<suffix>`
2. 改 `index.html`（找對應的 React 元件，全在這個檔案裡）
3. **bump 版本號**（在 `index.html` 頂部找 `VERSION` 常數）
4. commit + push
5. 等使用者 review → merge 到 `main`
6. GitHub Pages 1-2 分鐘自動部署
7. 提醒使用者**強制重整**（iOS Safari 分享→重整；Android Chrome 下拉重整；PWA 安裝版可能要重開）
8. 確認版本號變了才算成功

### 除錯流程
1. **先看版本號** — 沒變代表還在舊快取，所有除錯白做
2. 看頁面頂部「資料載入狀態」面板
3. 開 DevTools 看 Console（前端錯誤）+ Network（Firestore 請求）
4. Firebase Console → Firestore Usage 看是否爆額度

### 加新欄位到 activity 文件
1. 在 `index.html` 找 activity 預設物件，加新欄位（給預設值，向後相容舊資料）
2. 在 OrganizerTab 加表單欄位
3. 在 JoinerTab / detail view 加顯示
4. `saveGroups()` 不用改（會自動 diff）
5. bump 版本號

---

## 功能清單（已完成）

開團、跟團、候補名單、許願池、活動分類（23 種）、費用分攤試算（僅主揪）、留言板、多管道分享（LINE/FB/Twitter/Threads/WhatsApp/Telegram/Email + QR + IG Stories 圖卡）、CSV 匯出、Google Calendar + iCal 匯出、PWA 可安裝、我參加過的活動（信箱查詢）、自助取消報名、限定團隱私、管理員儀表板（用量監控）、活動模板（再開一團）、自動歸檔。

---

## 不要做的事

- ❌ 不要建 `node_modules`、`package.json`、`tsconfig.json`、`vite.config.*`
- ❌ 不要把 `index.html` 拆檔
- ❌ 不要把圖片改存到 Firebase Storage
- ❌ 不要動 Firestore Security Rules 去開放 `delete`
- ❌ 不要在前端 commit 任何含真實使用者資料的測試檔
- ❌ 不要用 `npm install` 任何套件
- ❌ 不要改 `CNAME`（會打掉自訂網域）
- ❌ 不要在沒 bump 版本號的情況下 commit `index.html`
