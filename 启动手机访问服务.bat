@echo off
chcp 65001 >nul
title GTO 训练器 - 手机访问服务
cd /d "%~dp0"
echo 正在启动服务，请稍候...
"%LOCALAPPDATA%\Programs\Python\Launcher\py.exe" "%~dp0tools\serve_mobile.py"
pause
