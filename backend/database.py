"""数据库抽象层：本地默认 SQLite，设置 DATABASE_URL 后切换到 PostgreSQL。

业务代码使用 db_conn() 拿连接、query/query_one/execute 执行操作，
SQL 统一写 SQLite 风格的 ? 占位符，由本层在 Postgres 下转换为 %s。

- SQLite（默认）：文件 backend/app.db，零配置，适合本地开发
- PostgreSQL：环境变量
    DATABASE_URL=postgresql://user:pass@host:5432/dbname
"""
import os
import sqlite3
from pathlib import Path

DB_PATH = Path(os.getenv("SQLITE_PATH") or (Path(__file__).with_name("app.db")))
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

IS_POSTGRES = DATABASE_URL.startswith(("postgresql://", "postgres://"))

_SCHEMA_SQLITE = """
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS filters (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    market TEXT NOT NULL,
    definition TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS watchlist (
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    market TEXT NOT NULL DEFAULT 'A股',
    note TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, code)
);
"""

_SCHEMA_POSTGRES = """
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    phone TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS filters (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    market TEXT NOT NULL,
    definition TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS watchlist (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    code TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    market TEXT NOT NULL DEFAULT 'A股',
    note TEXT DEFAULT '',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, code)
);
"""

_initialized = set()


def _convert_placeholders(sql):
    """把 SQLite 的 ? 占位符按顺序转换成 PostgreSQL 的 %s。"""
    return sql.replace("?", "%s")


def db_conn():
    """返回一个已建表的连接。调用方负责 close()。

    统一通过本模块的 helper 取字典行；如需直接用连接，行类型也已配置好。
    """
    if IS_POSTGRES:
        import psycopg2
        from psycopg2.extras import RealDictConnection
        url = DATABASE_URL.replace("postgres://", "postgresql://", 1)
        conn = psycopg2.connect(url, connect_timeout=10, connection_factory=RealDictConnection)
    else:
        conn = sqlite3.connect(DB_PATH, timeout=10)
        conn.row_factory = sqlite3.Row
    _init_schema(conn)
    return conn


def _init_schema(conn):
    # 每个进程对每种后端只初始化一次，减少重复 DDL
    key = backend_name()
    if key in _initialized:
        return
    cur = conn.cursor()
    if IS_POSTGRES:
        cur.execute(_SCHEMA_POSTGRES)
    else:
        cur.executescript(_SCHEMA_SQLITE)
    conn.commit()
    cur.close()
    _initialized.add(key)


def query(sql, params=()):
    """查询，返回字典列表。SQL 用 ? 占位符。"""
    conn = db_conn()
    try:
        cur = conn.cursor()
        cur.execute(_convert_placeholders(sql) if IS_POSTGRES else sql, tuple(params))
        rows = cur.fetchall()
        cur.close()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def query_one(sql, params=()):
    """查询，返回单条字典或 None。"""
    rows = query(sql, params)
    return rows[0] if rows else None


def execute(sql, params=()):
    """写操作（INSERT/UPDATE/DELETE），返回新增主键 id 或受影响行数。"""
    conn = db_conn()
    try:
        cur = conn.cursor()
        final_sql = _convert_placeholders(sql) if IS_POSTGRES else sql
        stripped = sql.strip().lower()
        if IS_POSTGRES and stripped.startswith("insert") and "returning" not in stripped:
            cur.execute(final_sql + " RETURNING id", tuple(params))
            row = cur.fetchone()
            result = dict(row)["id"] if row else None
        else:
            cur.execute(final_sql, tuple(params))
            result = cur.lastrowid if (not IS_POSTGRES and cur.lastrowid) else cur.rowcount
        conn.commit()
        cur.close()
        return result
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def backend_name():
    return "postgresql" if IS_POSTGRES else "sqlite"
