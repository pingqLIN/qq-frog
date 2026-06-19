import tempfile
from pathlib import Path

import native_host
from native_host import build_child_environment, handle_message, normalize_service_url, read_pid_file, write_pid_record


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


def test_pid_file_supports_json_and_legacy_formats():
    original_pid_file = native_host.PID_FILE
    with tempfile.TemporaryDirectory() as temporary_directory:
        native_host.PID_FILE = Path(temporary_directory) / "bridge.pid"

        write_pid_record(12345, ["python", "server.py"], "http://127.0.0.1:8001")
        assert read_pid_file() == 12345

        native_host.PID_FILE.write_text("23456", encoding="utf-8")
        assert read_pid_file() == 23456
    native_host.PID_FILE = original_pid_file


def test_stop_bridge_does_not_kill_unverified_pid():
    original_pid_file = native_host.PID_FILE
    original_is_pid_running = native_host.is_pid_running
    original_is_owned_bridge_process = native_host.is_owned_bridge_process
    original_subprocess_run = native_host.subprocess.run
    original_os_kill = native_host.os.kill

    with tempfile.TemporaryDirectory() as temporary_directory:
        native_host.PID_FILE = Path(temporary_directory) / "bridge.pid"
        native_host.PID_FILE.write_text("34567", encoding="utf-8")
        native_host.is_pid_running = lambda _pid: True
        native_host.is_owned_bridge_process = lambda _record: False

        def fail_subprocess_run(*_args, **_kwargs):
            raise AssertionError("stop_bridge must not invoke taskkill for an unverified PID")

        def fail_os_kill(*_args, **_kwargs):
            raise AssertionError("stop_bridge must not invoke os.kill for an unverified PID")

        native_host.subprocess.run = fail_subprocess_run
        native_host.os.kill = fail_os_kill
        response = native_host.stop_bridge()

        assert response["ok"] is True
        assert response["status"] == "stopped"
        assert not native_host.PID_FILE.exists()

    native_host.PID_FILE = original_pid_file
    native_host.is_pid_running = original_is_pid_running
    native_host.is_owned_bridge_process = original_is_owned_bridge_process
    native_host.subprocess.run = original_subprocess_run
    native_host.os.kill = original_os_kill


def test_child_environment_binds_localhost_service_url_to_loopback():
    child_environment = build_child_environment("http://localhost:8001")
    assert child_environment["QQ_FROG_BRIDGE_HOST"] == "127.0.0.1"
    assert child_environment["QQ_FROG_BRIDGE_PORT"] == "8001"
    assert child_environment["QQ_FROG_BRIDGE_RELOAD"] == "0"


if __name__ == "__main__":
    test_normalize_service_url_allows_localhost()
    test_normalize_service_url_rejects_remote_hosts()
    test_status_returns_json_when_bridge_is_unreachable()
    test_pid_file_supports_json_and_legacy_formats()
    test_stop_bridge_does_not_kill_unverified_pid()
    test_child_environment_binds_localhost_service_url_to_loopback()
    print("native host tests ok")
