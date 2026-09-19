"""最小可用的本地账户、登录、筛选模板和会员权限存储。"""
import hashlib, secrets, sqlite3
from pathlib import Path

DB_PATH = Path(__file__).with_name("app.db")

def db():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.executescript("""
    CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, phone TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, plan TEXT NOT NULL DEFAULT 'free', created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id INTEGER NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS filters (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, name TEXT NOT NULL, market TEXT NOT NULL, definition TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS watchlist (id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL, code TEXT NOT NULL, name TEXT NOT NULL DEFAULT '', market TEXT NOT NULL DEFAULT 'A股', note TEXT DEFAULT '', created_at TEXT DEFAULT CURRENT_TIMESTAMP, UNIQUE(user_id, code));
    """)
    return conn

def password_hash(password):
    return hashlib.sha256(password.encode()).hexdigest()

def register(phone, password):
    if len(phone) < 6 or len(password) < 6:
        raise ValueError("手机号和密码至少需要 6 位")
    conn = db()
    try:
        cur = conn.execute("INSERT INTO users(phone,password_hash) VALUES (?,?)", (phone, password_hash(password)))
        conn.commit()
    except sqlite3.IntegrityError as exc:
        raise ValueError("该账号已经注册") from exc
    return {"id": cur.lastrowid, "phone": phone, "plan": "free"}

def login(phone, password):
    conn = db(); user = conn.execute("SELECT * FROM users WHERE phone=? AND password_hash=?", (phone, password_hash(password))).fetchone()
    if not user: raise ValueError("账号或密码错误")
    token = secrets.token_urlsafe(32)
    conn.execute("INSERT INTO sessions(token,user_id) VALUES (?,?)", (token, user["id"])); conn.commit()
    return token, {"id": user["id"], "phone": user["phone"], "plan": user["plan"]}

def user_from_token(token):
    if not token: return None
    conn = db(); row = conn.execute("SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token=?", (token,)).fetchone()
    return dict(row) if row else None

def save_filter(user_id, name, market, definition):
    conn = db(); cur = conn.execute("INSERT INTO filters(user_id,name,market,definition) VALUES (?,?,?,?)", (user_id,name,market,definition)); conn.commit(); return cur.lastrowid

def list_filters(user_id):
    conn = db(); return [dict(x) for x in conn.execute("SELECT id,name,market,definition,created_at FROM filters WHERE user_id=? ORDER BY id DESC", (user_id,)).fetchall()]

def delete_filter(user_id, filter_id):
    conn = db(); cur = conn.execute("DELETE FROM filters WHERE id=? AND user_id=?", (filter_id, user_id)); conn.commit(); return cur.rowcount > 0

# ═══ 自选列表 ═══
def add_to_watchlist(user_id, code, name, market="A股", note=""):
    conn = db()
    try:
        cur = conn.execute("INSERT INTO watchlist(user_id,code,name,market,note) VALUES (?,?,?,?,?)", (user_id, code, name, market, note))
        conn.commit()
        return {"id": cur.lastrowid, "code": code, "name": name, "market": market}
    except sqlite3.IntegrityError:
        raise ValueError("该标的已在自选列表中")

def remove_from_watchlist(user_id, code):
    conn = db(); cur = conn.execute("DELETE FROM watchlist WHERE user_id=? AND code=?", (user_id, code)); conn.commit(); return cur.rowcount > 0

def list_watchlist(user_id, market=None):
    conn = db()
    if market:
        return [dict(x) for x in conn.execute("SELECT * FROM watchlist WHERE user_id=? AND market=? ORDER BY id DESC", (user_id, market)).fetchall()]
    return [dict(x) for x in conn.execute("SELECT * FROM watchlist WHERE user_id=? ORDER BY market, id DESC", (user_id,)).fetchall()]

def in_watchlist(user_id, code):
    conn = db(); row = conn.execute("SELECT id FROM watchlist WHERE user_id=? AND code=?", (user_id, code)).fetchone()
    return row is not None
