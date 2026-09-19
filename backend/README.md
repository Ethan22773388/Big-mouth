# 数据接入层

## 当前状态

这里是前端和外部行情服务之间的隔离层。目前使用演示数据，接口保持稳定，后续接入 Tushare、聚宽、Wind 或其他获得商业授权的数据源时，只需要替换 provider，不需要修改筛选页面。

## 本地运行

```bash
python3 -m pip install -r backend/requirements.txt
DATA_PROVIDER=akshare python3 backend/server.py
```

如果暂时不想安装依赖，直接运行以下命令仍会使用演示数据：

```bash
python3 backend/server.py
```

接口：

- `GET /api/health`
- `GET /api/market?market=A股`
- `GET /api/market?market=期货`
- `GET /api/market?market=期权`

## 真实数据接入前需要确认

1. 选择数据服务商
2. 确认个人测试还是商业收费授权
3. 获取 API Key
4. 确认日线、分钟线、期权 Greeks 等数据权限

API Key 不要写入前端代码，也不要提交到 Git。

## AKShare 说明

AKShare 是开源 Python 数据接口库，公开文档列出了 A 股、期货和期权接口。当前适配器先使用 `stock_zh_a_spot_em()` 接入 A 股实时行情；它依赖上游公开网站，数据可用性、频率和字段可能变化，不能视为稳定的商业数据 SLA。正式收费服务前应核实上游网站和数据接口的使用、再分发及商业授权。
