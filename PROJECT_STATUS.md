# 项目当前进度

> 📒 每次工作的详细经过见 [开发进展.md](./开发进展.md)（按日期记录，收工即更新）；本文件只维护总体状态。

## 当前阶段

可交互 Web 原型 + 本地后端已可运行，数据库层已支持云端 PostgreSQL 部署。

## 已完成

- 产品方向：A 股、期货、期权数据筛选；桌面端 + 移动端
- 用户注册、会员字段（plan）、权限预留
- [设计规范](./DESIGN_GUIDELINES.md)
- 前端：`index.html`、`styles.css`、`app.js`
  - 工作台、A 股 / 期货 / 期权筛选入口与结果
  - 登录注册正式弹窗 UI（替代 prompt）
  - 筛选结果详情页（Canvas K 线图 + 8 项指标）
  - 高级筛选（运算符选择、数值输入、排序栏）
  - 自选列表面板、筛选模板保存/加载/删除
  - 移动端响应式适配：≤860px 抽屉导航、表格横滑、详情全屏
- 后端：`backend/server.py`（ThreadingHTTPServer）
  - `/api/health`、`/api/market`、`/api/screen`
  - `/api/register`、`/api/login`、`/api/me`
  - `/api/filters`（含 delete）、`/api/watchlist`（含 remove）
  - 筛选引擎 `apply_filters()`：多条件 AND + 5 种运算符 + 排序
- 数据层：Demo + AKShare 双 provider（`DATA_PROVIDER` 切换）
- **数据库抽象层 `backend/database.py`（2026-09-19）**
  - 本地默认 SQLite，设置 `DATABASE_URL` 自动切换 PostgreSQL
  - 统一 `query / query_one / execute`，SQL 用 `?` 占位符自动转换
  - 表结构首次启动自动创建，无需手动迁移
  - 详见 `backend/DATABASE.md`
- 已部署 GitHub 代码托管与 Coze Pages 在线预览

## 尚未完成

- 数据导出（Excel / PDF）
- 会员权限与调用频次限制
- 真实生产数据源接入（专业数据 API）
- 会员支付
- 模板一键加载后自动回填条件并运行（当前仅提示）

## 下一步任务

1. 数据导出（Excel / PDF）
2. 会员权限判断逻辑
3. 云端 PostgreSQL 真实联调（待用户提供 DATABASE_URL）

## 用户需要确认的事项

- 产品名称确认："量策筛选"是否最终定名
- 云端 PostgreSQL 实例及 `DATABASE_URL`（准备正式部署时提供）
