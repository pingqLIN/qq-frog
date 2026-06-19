"""Native Messaging host for starting the QQ Frog local PDF bridge.

Chrome extensions cannot directly spawn local processes. This host is installed
through Chrome Native Messaging and accepts a small command set from the QQ Frog
extension: status, start, and stop.
"""

from __future__ import annotations

import json
import os
import socket
import struct
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Any

HOST_NAME = "com.qq_frog.pdf_bridge"
DEFAULT_SERVICE_URL = "http://localhost:8001"

BRIDGE_DIR = Path(__file__).resolve().parent
REPO_DIR = BRIDGE_DIR.parent
PID_FILE = BRIDGE_DIR / ".qq-frog-pdf-bridge.pid"
LOG_DIR = BRIDGE_DIR / "logs"
STDOUT_LOG = LOG_DIR / "pdf-bridge-native-start.log"
STDERR_LOG = LOG_DIR / "pdf-bridge-native-error.log"
SERVER_PATH = BRIDGE_DIR / "server.py"


def read_message() -> dict[str, Any]:
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length:
        return {}
    message_length = struct.unpack("<I", raw_length)[0]
    message = sys.stdin.buffer.read(message_length)
    return json.loads(message.decode("utf-8"))


def write_message(message: dict[str, Any]) -> None:
    encoded_message = json.dumps(message, separators=(",", ":")).encode("utf-8")
    sys.stdout.buffer.write(struct.pack("<I", len(encoded_message)))
    sys.stdout.buffer.write(encoded_message)
    sys.stdout.buffer.flush()


def normalize_service_url(value: str | None) -> str:
    raw_url = value or DEFAULT_SERVICE_URL
    parsed = urllib.parse.urlparse(raw_url)
    if parsed.scheme != "http":
        raise ValueError("Only local http bridge URLs are supported.")
    if parsed.hostname not in {"localhost", "127.0.0.1", "::1"}:
        raise ValueError("Only localhost bridge URLs are supported.")
    if not parsed.port:
        raise ValueError("Bridge URL must include a port.")
    return raw_url.rstrip("/")


def check_health(service_url: str) -> tuple[bool, dict[str, Any] | None, str | None]:
    health_url = f"{service_url}/pdf/health"
    request = urllib.request.Request(health_url, headers={"Accept": "application/json"})
    try:
        with urllib.request.urlopen(request, timeout=2) as response:
            payload = json.loads(response.read().decode("utf-8"))
            return True, payload, None
    except (TimeoutError, urllib.error.URLError, OSError, json.JSONDecodeError) as error:
        return False, None, str(error)


def is_service_port_accepting(service_url: str) -> bool:
    parsed = urllib.parse.urlparse(service_url)
    host = parsed.hostname or "localhost"
    port = parsed.port
    if port is None:
        return False

    try:
        with socket.create_connection((host, port), timeout=1):
            return True
    except OSError:
        return False


def is_pid_running(pid: int) -> bool:
    if pid <= 0:
        return False
    if os.name == "nt":
        result = subprocess.run(
            ["tasklist", "/FI", f"PID eq {pid}", "/FO", "CSV", "/NH"],
            capture_output=True,
            text=True,
            check=False,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        return f'"{pid}"' in result.stdout or f",{pid}," in result.stdout
    try:
        os.kill(pid, 0)
        return True
    except OSError:
        return False


def read_pid_record() -> dict[str, Any] | None:
    try:
        raw_value = PID_FILE.read_text(encoding="utf-8").strip()
    except FileNotFoundError:
        return None

    try:
        parsed = json.loads(raw_value)
        if isinstance(parsed, dict) and isinstance(parsed.get("pid"), int):
            return parsed
    except json.JSONDecodeError:
        pass

    try:
        pid = int(raw_value)
    except ValueError:
        return None
    return {"pid": pid, "legacy": True}


def read_pid_file() -> int | None:
    record = read_pid_record()
    if not record:
        return None
    pid = record.get("pid")
    return pid if isinstance(pid, int) else None


def write_pid_record(pid: int, command: list[str], service_url: str) -> None:
    record = {
        "pid": pid,
        "command": command,
        "cwd": str(BRIDGE_DIR),
        "serverPath": str(SERVER_PATH.resolve()),
        "serviceUrl": service_url,
        "startedAt": time.time(),
    }
    PID_FILE.write_text(json.dumps(record, ensure_ascii=False, indent=2), encoding="utf-8")


def normalize_command_text(value: str) -> str:
    return value.replace("\\", "/").lower()


def get_process_command_line(pid: int) -> str | None:
    if os.name == "nt":
        result = subprocess.run(
            [
                "powershell",
                "-NoProfile",
                "-Command",
                f"(Get-CimInstance Win32_Process -Filter \"ProcessId = {pid}\").CommandLine",
            ],
            capture_output=True,
            text=True,
            check=False,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        command_line = result.stdout.strip()
        return command_line or None

    try:
        raw_cmdline = Path(f"/proc/{pid}/cmdline").read_bytes()
    except OSError:
        return None
    return raw_cmdline.replace(b"\x00", b" ").decode("utf-8", errors="ignore").strip()


def is_owned_bridge_process(record: dict[str, Any] | None) -> bool:
    if not record or record.get("legacy"):
        return False

    pid = record.get("pid")
    if not isinstance(pid, int) or not is_pid_running(pid):
        return False

    recorded_server_path = record.get("serverPath")
    if not isinstance(recorded_server_path, str):
        return False

    expected_server_path = str(SERVER_PATH.resolve())
    if Path(recorded_server_path) != SERVER_PATH.resolve():
        return False

    command_line = get_process_command_line(pid)
    if not command_line:
        return False

    return normalize_command_text(expected_server_path) in normalize_command_text(command_line)


def build_child_environment(service_url: str) -> dict[str, str]:
    parsed = urllib.parse.urlparse(service_url)
    child_env = os.environ.copy()
    child_env["QQ_FROG_BRIDGE_HOST"] = parsed.hostname if parsed.hostname in {"127.0.0.1", "::1"} else "127.0.0.1"
    child_env["QQ_FROG_BRIDGE_PORT"] = str(parsed.port or 8001)
    child_env.setdefault("QQ_FROG_BRIDGE_RELOAD", "0")
    return child_env


def choose_python_executable() -> str:
    env_python = os.environ.get("QQ_FROG_PYTHON")
    if env_python:
        return env_python

    windows_venv_python = REPO_DIR / ".venv-paddleocr" / "Scripts" / "python.exe"
    if windows_venv_python.exists():
        return str(windows_venv_python)

    posix_venv_python = REPO_DIR / ".venv-paddleocr" / "bin" / "python"
    if posix_venv_python.exists():
        return str(posix_venv_python)

    return sys.executable


def start_bridge(service_url: str) -> dict[str, Any]:
    running, health, _error = check_health(service_url)
    if running:
        return {
            "ok": True,
            "status": "running",
            "message": "PDF bridge is already running.",
            "health": health,
            "pid": read_pid_file(),
        }

    if is_service_port_accepting(service_url):
        return {
            "ok": False,
            "status": "error",
            "message": "PDF bridge port is occupied, but /pdf/health is not reachable. Stop the existing hung process and start again.",
            "pid": read_pid_file(),
        }

    LOG_DIR.mkdir(exist_ok=True)
    stdout = STDOUT_LOG.open("a", encoding="utf-8")
    stderr = STDERR_LOG.open("a", encoding="utf-8")
    stdout.write(f"\n[{time.strftime('%Y-%m-%d %H:%M:%S')}] Starting QQ Frog PDF bridge\n")
    stdout.flush()

    command = [choose_python_executable(), str(SERVER_PATH)]
    popen_kwargs: dict[str, Any] = {
        "cwd": str(BRIDGE_DIR),
        "stdout": stdout,
        "stderr": stderr,
        "stdin": subprocess.DEVNULL,
        "env": build_child_environment(service_url),
    }
    if os.name == "nt":
        popen_kwargs["creationflags"] = subprocess.DETACHED_PROCESS | subprocess.CREATE_NEW_PROCESS_GROUP
    else:
        popen_kwargs["start_new_session"] = True

    process = subprocess.Popen(command, **popen_kwargs)
    write_pid_record(process.pid, command, service_url)

    for _ in range(20):
        running, health, _error = check_health(service_url)
        if running:
            return {
                "ok": True,
                "status": "running",
                "message": "PDF bridge started.",
                "health": health,
                "pid": process.pid,
            }
        time.sleep(0.5)

    return {
        "ok": False,
        "status": "starting",
        "message": "PDF bridge process started, but health check did not become ready in time.",
        "pid": process.pid,
        "logPath": str(STDERR_LOG),
    }


def stop_bridge() -> dict[str, Any]:
    record = read_pid_record()
    pid = record.get("pid") if record else None
    if not pid:
        return {"ok": True, "status": "stopped", "message": "No bridge PID file was found."}

    if not is_pid_running(pid):
        PID_FILE.unlink(missing_ok=True)
        return {"ok": True, "status": "stopped", "message": "Stored bridge process is not running."}

    if not is_owned_bridge_process(record):
        PID_FILE.unlink(missing_ok=True)
        return {
            "ok": True,
            "status": "stopped",
            "message": "Stored PID did not match the QQ Frog PDF bridge process. Stale PID file was removed.",
            "pid": pid,
        }

    if os.name == "nt":
        subprocess.run(
            ["taskkill", "/PID", str(pid), "/T", "/F"],
            capture_output=True,
            text=True,
            check=False,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
    else:
        os.kill(pid, 15)

    PID_FILE.unlink(missing_ok=True)
    return {"ok": True, "status": "stopped", "message": "PDF bridge stopped.", "pid": pid}


def handle_message(message: dict[str, Any]) -> dict[str, Any]:
    action = str(message.get("action", "status"))
    service_url = normalize_service_url(message.get("serviceUrl"))

    if action == "status":
        running, health, error = check_health(service_url)
        port_accepting = is_service_port_accepting(service_url) if not running else False
        return {
            "ok": not port_accepting,
            "status": "running" if running else "error" if port_accepting else "stopped",
            "message": "PDF bridge is running." if running else "PDF bridge port is occupied, but health is not reachable." if port_accepting else "PDF bridge is not reachable.",
            "health": health,
            "error": error,
            "pid": read_pid_file(),
        }
    if action == "start":
        return start_bridge(service_url)
    if action == "stop":
        return stop_bridge()

    raise ValueError(f"Unsupported action: {action}")


def main() -> None:
    try:
        response = handle_message(read_message())
    except Exception as error:  # noqa: BLE001 - native host must return errors as JSON.
        response = {
            "ok": False,
            "status": "error",
            "message": str(error),
            "host": HOST_NAME,
        }
    write_message(response)


if __name__ == "__main__":
    # Native Messaging hosts must not write logs to stdout/stderr because those
    # streams are the browser protocol. File logs are used for the child server.
    socket.setdefaulttimeout(2)
    main()
