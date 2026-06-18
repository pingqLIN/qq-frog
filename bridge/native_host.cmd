@echo off
setlocal
set "SCRIPT_DIR=%~dp0"
if defined QQ_FROG_PYTHON (
  "%QQ_FROG_PYTHON%" "%SCRIPT_DIR%native_host.py"
) else (
  python "%SCRIPT_DIR%native_host.py"
)
