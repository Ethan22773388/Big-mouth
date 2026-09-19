"""账户、登录、筛选模板、自选、会员权限存储。

通过 database 抽象层，自动适配本地 SQLite 与云端 PostgreSQL。
"""
import hashlib
import secrets
import sqlite3

import database as db


def password_hash(password):
    return hashlib.sha256(password.encode()).hexdigest()


def register(phone, password):
    if len(phone) < 6 or len(password) < 6:
        raise ValueError("手机号和密码至少需要 6 位")
    try:
        new_id = db.execute(
            "INSERT INTO users(phone,password_hash) VALUES(?,?)",
            (phone, password_hash(password)),
        )
    except Exception as exc:
        # SQLite: IntegrityError；Postgres: UniqueViolation，统一文案
        msg = str(exc).lower()
        if "unique" in msg or "integrity" in msg or "duplicate" in msg:
            raise ValueError("该账号已经注册")
        raise
    return {"id": new_id, "phone": phone, "plan": "free"}


def login(phone, password):
    user = db.query_one(
        "SELECT * FROM users WHERE phone=? AND password_hash=?",
        (phone, password_hash(password)),
    )
    if not user:
        raise ValueError("账号或密码错误")
    token = secrets.token_urlsafe(32)
    db.execute("INSERT INTO sessions(token,user_id) VALUES(?,?)", (token, user["id"]))
    return token, {"id": user["id"], "phone": user["phone"], "plan": user["plan"]}


def user_from_token(token):
    if not token:
        return None
    return db.query_one(
        "SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=?",
        (token,),
    )


def get_user_by_id(user_id):
    return db.query_one("SELECT * FROM users WHERE id=?", (user_id,))


# ═══ 筛选模板 ═══
def save_filter(user_id, name, market, definition):
    return db.execute(
        "INSERT INTO filters(user_id,name,market,definition) VALUES(?,?,?,?)",
        (user_id, name, market, definition),
    )


def list_filters(user_id):
    return db.query(
        "SELECT id,name,market,definition,created_at FROM filters WHERE user_id=? ORDER BY id DESC",
        (user_id,),
    )


def delete_filter(user_id, filter_id):
    affected = db.execute(
        "DELETE FROM filters WHERE id=? AND user_id=?", (filter_id, user_id)
    )
    return (affected or 0) > 0


# ═══ 自选列表 ═══
def add_to_watchlist(user_id, code, name, market="A股", note=""):
    try:
        new_id = db.execute(
            "INSERT INTO watchlist(user_id,code,name,market,note) VALUES(?,?,?,?,?)",
            (user_id, code, name, market, note),
        )
    except Exception as exc:
        msg = str(exc).lower()
        if "unique" in msg or "integrity" in msg or "duplicate" in msg:
            raise ValueError("该标的已在自选列表中")
        raise
    return {"id": new_id, "code": code, "name": name, "market": market}


def remove_from_watchlist(user_id, code):
    affected = db.execute(
        "DELETE FROM watchlist WHERE user_id=? AND code=?", (user_id, code)
    )
    return (affected or 0) > 0


def list_watchlist(user_id, market=None):
    if market:
        return db.query(
            "SELECT * FROM watchlist WHERE user_id=? AND market=? ORDER BY id DESC",
            (user_id, market),
        )
    return db.query(
        "SELECT * FROM watchlist WHERE user_id=? ORDER BY market, id DESC",
        (user_id,),
    )


def in_watchlist(user_id, code):
    row = db.query_one(
        "SELECT id FROM watchlist WHERE user_id=? AND code=?", (user_id, code)
    )
    return row is not None
