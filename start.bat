@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"

set "PORT=8899"
set "PY=%USERPROFILE%\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\python\python.exe"
if not exist "%PY%" set "PY=python"

echo.
echo   PHYS·LAB  /  3D 智能物理实验助教
echo   ------------------------------------------------
echo   本地地址: http://127.0.0.1:%PORT%/
echo   按 Ctrl+C 或关闭本窗口可停止服务。
echo.

start "PHYS-LAB Server" /min "%PY%" -m http.server %PORT% --bind 127.0.0.1 --directory "%~dp0"
ping 127.0.0.1 -n 2 >nul
start "" "http://127.0.0.1:%PORT%/"

echo   服务已启动。若浏览器没有自动打开，请手动访问上面的地址。
echo.
endlocal
