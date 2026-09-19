"""量策筛选本地 API 原型。

当前返回演示数据；真实数据接入时替换 provider 层，不改变前端接口。
启动：python3 backend/server.py
"""
from http.server import BaseHTTPRequestHandler, HTTPServer
import json
from urllib.parse import urlparse, parse_qs
from providers import get_provider
from auth import register, login, user_from_token, save_filter, list_filters

DEMO = {
    "A股": [
        {"code": "600519", "name": "贵州茅台", "price": 1482.0, "change": 1.52, "market_cap": 18624, "roe": 23.4},
        {"code": "300750", "name": "宁德时代", "price": 221.8, "change": 2.18, "market_cap": 9741, "roe": 18.2},
        {"code": "601318", "name": "中国平安", "price": 51.66, "change": 0.67, "market_cap": 9412, "roe": 11.8},
    ],
    "期货": [
        {"code": "IF2610", "name": "沪深300", "price": 4126.0, "change": 0.84, "volume": 126420, "open_interest": 218540},
        {"code": "TA610", "name": "PTA", "price": 5214, "change": -1.16, "volume": 98125, "open_interest": 342810},
    ],
    "期权": [
        {"code": "510050C2609M03000", "name": "50ETF购", "price": 0.1824, "change": 8.62, "iv": 22.4, "open_interest": 126420},
        {"code": "510300P2609M04400", "name": "300ETF沽", "price": 0.0988, "change": -3.18, "iv": 24.1, "open_interest": 98125},
    ],
}

class Handler(BaseHTTPRequestHandler):
    def _send(self, body, status=200):
        raw = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Content-Length", str(len(raw)))
        self.end_headers()
        self.wfile.write(raw)

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/health":
            return self._send({"status": "ok", "provider": "demo", "message": "演示数据源正常"})
        if parsed.path == "/api/market":
            market = parse_qs(parsed.query).get("market", ["A股"])[0]
            if market not in DEMO:
                return self._send({"error": "unsupported_market", "message": "暂不支持该市场"}, 400)
            provider = get_provider(DEMO)
            return self._send({"market": market, "source": provider.name, "items": provider.get_market(market)})
        if parsed.path == "/api/me":
            user = self._current_user()
            return self._send({"user": user} if user else {"error": "unauthorized"}, 200 if user else 401)
        if parsed.path == "/api/filters":
            user = self._current_user()
            return self._send({"items": list_filters(user["id"])} if user else {"error": "unauthorized"}, 200 if user else 401)
        if parsed.path == "/api/watchlist":
            user = self._current_user()
            if not user: return self._send({"error": "unauthorized"}, 401)
            from auth import list_watchlist
            market = parse_qs(parsed.query).get("market", [None])[0]
            return self._send({"items": list_watchlist(user["id"], market)})
        return self._send({"error": "not_found"}, 404)

    def _json_body(self):
        length = int(self.headers.get("Content-Length", "0"))
        return json.loads(self.rfile.read(length) or b"{}")

    def _current_user(self):
        value = self.headers.get("Authorization", "")
        return user_from_token(value[7:] if value.startswith("Bearer ") else "")

    def do_POST(self):
        parsed = urlparse(self.path)
        try:
            body = self._json_body()
            if parsed.path == "/api/register":
                return self._send({"user": register(body.get("phone", ""), body.get("password", ""))}, 201)
            if parsed.path == "/api/login":
                token, user = login(body.get("phone", ""), body.get("password", ""))
                return self._send({"token": token, "user": user})
            if parsed.path == "/api/screen":
                market = body.get("market", "A股")
                filters = body.get("filters", [])
                sort_by = body.get("sort_by")
                sort_order = body.get("sort_order", "desc")
                limit = min(body.get("limit", 100), 500)
                if market not in DEMO:
                    return self._send({"error": "unsupported_market"}, 400)
                provider = get_provider(DEMO)
                items = provider.get_market(market)
                from providers import apply_filters
                filtered = apply_filters(items, filters, sort_by, sort_order, limit)
                return self._send({"market": market, "total": len(items), "matched": len(filtered), "items": filtered})
            user = self._current_user()
            if not user: return self._send({"error": "unauthorized", "message": "请先登录"}, 401)
            if parsed.path == "/api/filters":
                item_id = save_filter(user["id"], body.get("name", "未命名模板"), body.get("market", "A股"), json.dumps(body.get("definition", {}), ensure_ascii=False))
                return self._send({"id": item_id}, 201)
            if parsed.path == "/api/filters/delete":
                from auth import delete_filter
                ok = delete_filter(user["id"], body.get("id", 0))
                return self._send({"deleted": ok})
            if parsed.path == "/api/watchlist":
                from auth import add_to_watchlist
                try:
                    item = add_to_watchlist(user["id"], body.get("code",""), body.get("name",""), body.get("market","A股"), body.get("note",""))
                    return self._send(item, 201)
                except ValueError as e:
                    return self._send({"error": str(e)}, 409)
            if parsed.path == "/api/watchlist/remove":
                from auth import remove_from_watchlist
                ok = remove_from_watchlist(user["id"], body.get("code", ""))
                return self._send({"removed": ok})
            return self._send({"error": "not_found"}, 404)
        except ValueError as exc:
            return self._send({"error": "invalid_request", "message": str(exc)}, 400)
        except Exception as exc:
            return self._send({"error": "server_error", "message": str(exc)}, 500)

    def log_message(self, *_):
        pass

if __name__ == "__main__":
    print("量策筛选 API 已启动：http://127.0.0.1:8787")
    HTTPServer(("127.0.0.1", 8787), Handler).serve_forever()
