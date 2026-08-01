@echo off
chcp 65001 >nul
title GTO 讲解生成 - 继续下一批
cd /d "%~dp0"
echo ==========================================
echo  将自动跳过已完成题目，生成下一批 1000 题
echo  跑完本批后窗口自动关闭
echo  双击进度脚本可随时查看进度
echo ==========================================
"%LOCALAPPDATA%\Programs\Python\Launcher\py.exe" "%~dp0tools\generate_explanations.py" --provider deepseek --all --batch-size 1000 --progress-file "%~dp0explanations\progress.json" --workers 16
echo.
echo 本批完成。按任意键关闭窗口...
pause >nul
