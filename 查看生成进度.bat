@echo off
chcp 65001 >nul
title GTO 讲解生成 - 进度查看
cd /d "%~dp0"
"%LOCALAPPDATA%\Programs\Python\Launcher\py.exe" "%~dp0tools\check_progress.py"
