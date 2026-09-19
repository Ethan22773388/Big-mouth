# 本地运行与验收

```bash
cd "/Users/lei/Documents/ChatGPT/app"
python3 backend/server.py
```

账户接口：

- `POST /api/register`：`{"phone":"...","password":"..."}`
- `POST /api/login`：返回 `token`，后续请求使用 `Authorization: Bearer <token>`
- `GET /api/me`
- `GET /api/filters`
- `POST /api/filters`：`{"name":"我的模板","market":"A股","definition":"{}"}`

用户和模板保存在 `backend/app.db`。这是本地开发存储，正式上线前应迁移到 PostgreSQL，并增加短信验证、密码重置、限流、审计日志和专业支付服务。
