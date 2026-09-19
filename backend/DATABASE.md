# 数据库配置与云端部署指南

后端通过 `backend/database.py` 抽象层同时支持两种数据库，业务代码无需改动。

## 1. 本地开发（默认，SQLite）

无需任何配置，直接启动即可，数据存于 `backend/app.db`：

```bash
python3 backend/server.py
# 健康检查返回 "database": "sqlite"
```

> 如果项目目录位于云盘 / 网络文件系统（可能有文件锁），把数据库指向本地磁盘：
> ```bash
> SQLITE_PATH=/tmp/quant_app.db python3 backend/server.py
> ```

## 2. 云端部署（PostgreSQL）

### 2.1 准备一个 PostgreSQL 实例

任选其一：
- 阿里云 RDS / 腾讯云 / Supabase / Neon / Railway 等托管 PostgreSQL
- 自建：`postgres`，版本建议 13+

创建数据库，例如：

```sql
CREATE DATABASE quant_screen;
```

表结构会在服务首次启动时自动创建（`CREATE TABLE IF NOT EXISTS`），无需手动迁移。

### 2.2 安装驱动

```bash
pip install -r backend/requirements.txt   # 含 psycopg2-binary
```

### 2.3 设置环境变量并启动

```bash
export DATABASE_URL="postgresql://用户名:密码@主机:5432/quant_screen"
export HOST=0.0.0.0
export PORT=8787
python3 backend/server.py
# 健康检查返回 "database": "postgresql"
```

连接串中如含特殊字符密码，需做 URL 编码（如 `@` → `%40`）。

## 3. 实现说明

| 能力 | SQLite（默认） | PostgreSQL |
|------|----------------|------------|
| 连接 | 本地文件 | `DATABASE_URL` |
| 占位符 | `?` | 自动转换为 `%s` |
| 自增主键 | `INTEGER PRIMARY KEY` | `SERIAL` |
| 主键回填 | `lastrowid` | `INSERT ... RETURNING id` |
| 唯一冲突 | `IntegrityError` | `UniqueViolation`（统一文案） |

业务层（`auth.py`）只使用三个统一接口：

- `query(sql, params)` → 字典列表
- `query_one(sql, params)` → 字典或 `None`
- `execute(sql, params)` → 新增 id 或受影响行数

所有 SQL 使用 `?` 占位符，由抽象层在 Postgres 下自动转换。

## 4. 数据备份

- SQLite：直接备份 `app.db` 文件。
- PostgreSQL：`pg_dump "$DATABASE_URL" > backup.sql`。

## 5. 安全注意

- `DATABASE_URL` 只通过环境变量注入，**不要**写进前端、提交到 Git 或放进日志。
- `.env` 已被 `.gitignore` 忽略。
- 生产环境务必使用强密码，并限制数据库仅允许应用服务器访问。
