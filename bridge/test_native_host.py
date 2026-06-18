from native_host import handle_message, normalize_service_url


def test_normalize_service_url_allows_localhost():
    assert normalize_service_url("http://localhost:8001/") == "http://localhost:8001"
    assert normalize_service_url("http://127.0.0.1:8001") == "http://127.0.0.1:8001"


def test_normalize_service_url_rejects_remote_hosts():
    try:
        normalize_service_url("https://example.com:8001")
    except ValueError as error:
        assert "local http" in str(error)
    else:
        raise AssertionError("Expected remote https URL to be rejected")

    try:
        normalize_service_url("http://example.com:8001")
    except ValueError as error:
        assert "localhost" in str(error)
    else:
        raise AssertionError("Expected remote host to be rejected")


def test_status_returns_json_when_bridge_is_unreachable():
    response = handle_message({
        "action": "status",
        "serviceUrl": "http://127.0.0.1:65530",
    })

    assert response["ok"] is True
    assert response["status"] == "stopped"


if __name__ == "__main__":
    test_normalize_service_url_allows_localhost()
    test_normalize_service_url_rejects_remote_hosts()
    test_status_returns_json_when_bridge_is_unreachable()
    print("native host tests ok")
