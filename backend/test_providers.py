from providers import DemoProvider

def test_demo_provider_normalizes_records():
    result = DemoProvider({"A股": [{"code": "000001", "name": "示例", "price": 10, "change": 1.2, "roe": 12}]}).get_market("A股")
    assert result[0]["code"] == "000001"
    assert result[0]["roe"] == 12
    assert result[0]["source"] == "demo"
    assert "data_time" in result[0]

if __name__ == "__main__":
    test_demo_provider_normalizes_records()
    print("provider checks passed")
