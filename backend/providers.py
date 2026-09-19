"""统一行情数据格式与 provider 接口。"""
from dataclasses import dataclass, asdict
from datetime import datetime
from typing import Any, Dict, List
import os
import random


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
    """本地模拟数据，用于原型演示和云端预览。"""
    name = "demo"

    # 更丰富的模拟数据
    _MOCK_A = [
        {"code":"600519","name":"贵州茅台","price":1482.00,"change":1.52,"market_cap":1862400000000,"pe":25.6,"pb":8.2,"roe":23.4,"volume":1264000,"turnover":0.42,"high":1495.00,"low":1462.00,"open":1468.00},
        {"code":"300750","name":"宁德时代","price":221.80,"change":2.18,"market_cap":974100000000,"pe":32.1,"pb":4.8,"roe":18.2,"volume":2185000,"turnover":1.23,"high":225.60,"low":216.30,"open":217.50},
        {"code":"601318","name":"中国平安","price":51.66,"change":0.67,"market_cap":941200000000,"pe":6.8,"pb":0.9,"roe":11.8,"volume":981000,"turnover":0.53,"high":52.10,"low":51.20,"open":51.30},
        {"code":"000858","name":"五粮液","price":138.50,"change":-0.36,"market_cap":537400000000,"pe":22.3,"pb":5.1,"roe":21.6,"volume":542000,"turnover":0.38,"high":140.20,"low":137.80,"open":139.50},
        {"code":"002594","name":"比亚迪","price":268.90,"change":3.25,"market_cap":782100000000,"pe":28.7,"pb":6.3,"roe":19.5,"volume":1856000,"turnover":1.05,"high":272.00,"low":260.50,"open":261.00},
        {"code":"600036","name":"招商银行","price":35.82,"change":0.28,"market_cap":903200000000,"pe":5.2,"pb":0.8,"roe":15.4,"volume":723000,"turnover":0.29,"high":36.10,"low":35.60,"open":35.70},
        {"code":"601012","name":"隆基绿能","price":22.15,"change":-1.82,"market_cap":167800000000,"pe":18.9,"pb":2.1,"roe":12.3,"volume":1245000,"turnover":1.65,"high":22.80,"low":21.90,"open":22.60},
        {"code":"300059","name":"东方财富","price":18.62,"change":4.15,"market_cap":293500000000,"pe":35.2,"pb":3.8,"roe":9.7,"volume":3214000,"turnover":2.18,"high":19.05,"low":17.88,"open":17.90},
        {"code":"600900","name":"长江电力","price":28.35,"change":0.18,"market_cap":691200000000,"pe":21.4,"pb":3.5,"roe":16.8,"volume":456000,"turnover":0.19,"high":28.50,"low":28.10,"open":28.20},
        {"code":"000333","name":"美的集团","price":62.40,"change":1.05,"market_cap":437200000000,"pe":12.8,"pb":3.2,"roe":24.1,"volume":892000,"turnover":0.62,"high":63.10,"low":61.80,"open":61.90},
    ]

    _MOCK_FUTURE = [
        {"code":"IF2610","name":"沪深300","price":4126.0,"change":0.84,"volume":126420,"open_interest":218540,"margin":412600},
        {"code":"IC2610","name":"中证500","price":6285.0,"change":-0.52,"volume":98200,"open_interest":156320,"margin":628500},
        {"code":"IH2610","name":"上证50","price":2812.0,"change":0.36,"volume":67800,"open_interest":98450,"margin":281200},
        {"code":"TA610","name":"PTA","price":5214,"change":-1.16,"volume":98125,"open_interest":342810,"margin":5214},
        {"code":"RB2610","name":"螺纹钢","price":3286,"change":0.43,"volume":87410,"open_interest":1124620,"margin":3286},
        {"code":"AG2612","name":"沪银","price":7856,"change":1.28,"volume":156200,"open_interest":287600,"margin":78560},
    ]

    _MOCK_OPTION = [
        {"code":"510050C2609M03000","name":"50ETF购9月3000","price":0.1824,"change":8.62,"iv":22.4,"oi":126420,"type":"认购","expiry":"2026-09-25"},
        {"code":"510300P2609M04400","name":"300ETF沽9月4400","price":0.0988,"change":-3.18,"iv":24.1,"oi":98125,"type":"认沽","expiry":"2026-09-25"},
        {"code":"IO2610-C-4200","name":"沪深300购4200","price":112.6,"change":2.11,"iv":21.7,"oi":65802,"type":"认购","expiry":"2026-10-18"},
        {"code":"IO2610-P-4000","name":"沪深300沽4000","price":86.4,"change":-1.52,"iv":23.8,"oi":45200,"type":"认沽","expiry":"2026-10-18"},
    ]

    def __init__(self, records):
        self.records = records

    def get_market(self, market):
        now = datetime.now().isoformat(timespec="seconds")
        # 使用内置 mock 数据或传入的 records
        source = {
            "A股": self._MOCK_A,
            "期货": self._MOCK_FUTURE,
            "期权": self._MOCK_OPTION,
        }.get(market, self.records.get(market, []))
        result = []
        for row in source:
            result.append(MarketItem(
                code=row["code"], name=row["name"], price=float(row["price"]),
                change=float(row["change"]), data_time=now, source=self.name,
                extra={k: v for k, v in row.items() if k not in {"code", "name", "price", "change"}},
            ).to_dict())
        return result


class AkshareProvider(MarketProvider):
    """AKShare 实时数据 provider。本地运行且安装了 akshare 时使用。"""
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
        for _, row in frame.head(500).iterrows():
            price = float(row.get("最新价", 0) or 0)
            if price <= 0:
                continue
            market_cap = row.get("总市值")
            # 总市值可能是字符串或数字
            try:
                market_cap = float(market_cap) if market_cap else None
            except (ValueError, TypeError):
                market_cap = None
            pe = row.get("市盈率-动态")
            try:
                pe = float(pe) if pe else None
            except (ValueError, TypeError):
                pe = None
            roe = row.get("60日涨跌幅")  # 用涨跌幅近似
            try:
                roe = float(roe) if roe else None
            except (ValueError, TypeError):
                roe = None
            items.append(MarketItem(
                code=str(row.get("代码", "")), name=str(row.get("名称", "")),
                price=price, change=float(row.get("涨跌幅", 0) or 0),
                data_time=datetime.now().isoformat(timespec="seconds"), source=self.name,
                extra={
                    "market_cap": round(market_cap / 100000000, 1) if market_cap else None,  # 转为亿
                    "pe": round(pe, 1) if pe else None,
                    "roe": round(roe, 1) if roe else None,
                    "volume": row.get("成交量"),
                    "turnover": row.get("换手率"),
                    "high": float(row.get("最高", 0) or 0),
                    "low": float(row.get("最低", 0) or 0),
                    "open": float(row.get("今开", 0) or 0),
                },
            ).to_dict())
        return items


def get_provider(records):
    if os.getenv("DATA_PROVIDER", "demo").lower() == "akshare":
        return AkshareProvider()
    return DemoProvider(records)


# ═══ 筛选引擎 ══
def apply_filters(items, filters, sort_by=None, sort_order="desc", limit=100):
    """
    filters: [{"field": "pe", "op": "lt", "value": 30}, ...]
    op: gt(大于), lt(小于), eq(等于), gte(>=), lte(<=)
    """
    op_map = {
        "大于": lambda v, t: v > t,
        "小于": lambda v, t: v < t,
        "等于": lambda v, t: abs(v - t) < 0.01,
        "大于等于": lambda v, t: v >= t,
        "小于等于": lambda v, t: v <= t,
        "前": lambda v, t: True,  # 排名类单独处理
    }
    field_map = {
        "市值": "market_cap", "市值(亿)": "market_cap",
        "PE（TTM）": "pe", "PE(TTM)": "pe", "PE": "pe",
        "ROE": "roe", "ROE(%)": "roe",
        "涨跌幅": "change", "涨跌幅(%)": "change",
        "换手率": "turnover", "换手率(%)": "turnover",
        "成交量": "volume", "PB": "pb",
        "持仓量": "open_interest",
        "隐含波动率": "iv", "隐含波动率(%)": "iv",
        "期权类型": "type",
        "20日均线": None, "60日均线": None,
        "持仓量变化": None, "20日波动率": None, "合约状态": None,
        "剩余到期日": None, "买卖价差率": None, "成交量排名": None,
    }
    result = list(items)
    for f in filters:
        field = f.get("field", "")
        op = f.get("op", "大于")
        value = f.get("value")
        try:
            value = float(value)
        except (ValueError, TypeError):
            continue
        key = field_map.get(field)
        if not key:
            continue
        cmp_fn = op_map.get(op)
        if not cmp_fn:
            continue
        filtered = []
        for item in result:
            item_val = item.get(key)
            if item_val is None:
                continue
            try:
                item_val = float(item_val)
            except (ValueError, TypeError):
                continue
            if cmp_fn(item_val, value):
                filtered.append(item)
        result = filtered
    # 排序
    if sort_by and sort_by in field_map.values():
        result.sort(key=lambda x: float(x.get(sort_by, 0) or 0), reverse=(sort_order == "desc"))
    return result[:limit]
