"""统一行情数据格式与 provider 接口。"""
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any, Dict, List
import os


@dataclass
class MarketItem:
    code: str
    name: str
    price: float
    change: float
    data_time: str
    source: str
    extra: Dict[str, Any]

    def to_dict(self):
        value = asdict(self)
        value.update(value.pop("extra"))
        return value


class MarketProvider:
    name = "base"

    def get_market(self, market: str) -> List[Dict[str, Any]]:
        raise NotImplementedError


class DemoProvider(MarketProvider):
    name = "demo"

    def __init__(self, records):
        self.records = records

    def get_market(self, market):
        now = datetime.now().isoformat(timespec="seconds")
        result = []
        for row in self.records.get(market, []):
            result.append(MarketItem(
                code=row["code"], name=row["name"], price=float(row["price"]),
                change=float(row["change"]), data_time=now, source=self.name,
                extra={k: v for k, v in row.items() if k not in {"code", "name", "price", "change"}},
            ).to_dict())
        return result


class AkshareProvider(MarketProvider):
    """AKShare 免费原型 provider。AKShare 上游接口可能变化，需保留 demo 降级。"""
    name = "akshare"

    def __init__(self):
        try:
            import akshare as ak
        except ImportError as exc:
            raise RuntimeError("未安装 AKShare，请先执行 pip install -r backend/requirements.txt") from exc
        self.ak = ak

    def get_market(self, market):
        if market != "A股":
            raise NotImplementedError("AKShare provider 首先接入 A 股，期货和期权随后接入")
        frame = self.ak.stock_zh_a_spot_em()
        items = []
        for _, row in frame.head(300).iterrows():
            items.append(MarketItem(
                code=str(row.get("代码", "")), name=str(row.get("名称", "")),
                price=float(row.get("最新价", 0) or 0), change=float(row.get("涨跌幅", 0) or 0),
                data_time=datetime.now().isoformat(timespec="seconds"), source=self.name,
                extra={"market_cap": row.get("总市值"), "turnover": row.get("换手率")},
            ).to_dict())
        return items


def get_provider(records):
    if os.getenv("DATA_PROVIDER", "demo").lower() == "akshare":
        return AkshareProvider()
    return DemoProvider(records)
