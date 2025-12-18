@echo off
chcp 65001 >nul
echo ========================================
echo 🎈 班级任务统计助手 - 打包脚本
echo ========================================
echo.

:: 检查node_modules是否存在
if not exist "node_modules" (
    echo 📦 正在安装依赖...
    call npm install
    if errorlevel 1 (
        echo ❌ 依赖安装失败！
        pause
        exit /b 1
    )
)

echo.
echo 🏗️ 请选择打包方式：
echo.
echo 1️⃣  完整安装程序（推荐）
echo 2️⃣  绿色便携版
echo 3️⃣  完整打包（安装程序 + 便携版）
echo 4️⃣  快速测试构建
echo 5️⃣  取消

echo.
set /p choice=请选择一个选项(1-5)：

if "%choice%"=="1" (
    echo.
    echo 🔨 开始构建安装程序...
    call npm run build:win
) else if "%choice%"=="2" (
    echo.
    echo 🔨 开始构建便携版...
    call npm run build:win:portable
) else if "%choice%"=="3" (
    echo.
    echo 🔨 开始完整打包...
    call npm run build
) else if "%choice%"=="4" (
    echo.
    echo 🔨 开始快速测试构建...
    call npm run build:dir
) else if "%choice%"=="5" (
    echo.
    echo 已取消打包。
    pause
    exit /b 0
) else (
    echo.
    echo ❌ 无效的选择！
    pause
    exit /b 1
)

if errorlevel 1 (
    echo.
    echo ❌ 打包失败！
    echo 请检查错误信息，或查看 README.md
    pause
    exit /b 1
)

echo.
echo ✅ 打包完成！
echo.
echo 📂 输出文件在：
echo %CD%\dist
echo.
echo 🎯 下一步：
echo 1. 检查 dist 目录下的文件
echo 2. 测试运行可执行文件
echo 3. 分发给你的用户
echo.
pause
