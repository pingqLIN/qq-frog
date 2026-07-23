import os

from pdf_ocr import configure_paddle_runtime_paths


def test_configure_paddle_runtime_paths_uses_writable_bridge_log_directory():
    runtime_dir = configure_paddle_runtime_paths()

    assert runtime_dir.exists()
    assert runtime_dir.name == "paddle-runtime"
    assert os.environ["FLAGS_log_dir"] == str(runtime_dir)
    assert os.environ["GLOG_log_dir"] == str(runtime_dir)
    assert os.environ["HOME"].startswith(str(runtime_dir))
    assert os.environ["XDG_CACHE_HOME"].startswith(str(runtime_dir))
    assert os.environ["AISTUDIO_CACHE_HOME"].startswith(str(runtime_dir))
    assert os.environ["TEMP"].startswith(str(runtime_dir))
    assert os.environ["TMP"].startswith(str(runtime_dir))
    assert os.environ["PADDLE_HOME"].startswith(str(runtime_dir))
    assert os.environ["PADDLEOCR_HOME"].startswith(str(runtime_dir))


if __name__ == "__main__":
    test_configure_paddle_runtime_paths_uses_writable_bridge_log_directory()
    print("pdf ocr runtime path tests ok")
