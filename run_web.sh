#!/bin/bash

echo "🏰 DUNGEON MINI - Запуск веб-версии игры"
echo "========================================"
echo ""

# Проверяем наличие Python
if command -v python3 &> /dev/null; then
    echo "🐍 Найден Python 3, запускаем сервер..."
    python3 server.py
elif command -v python &> /dev/null; then
    echo "🐍 Найден Python, запускаем сервер..."
    python server.py
else
    echo "❌ Python не найден в системе"
    echo "📝 Альтернативный запуск:"
    echo "   1. Откройте файл index.html в браузере"
    echo "   2. Или установите Python для запуска локального сервера"
    echo ""
    echo "💡 Для macOS:"
    echo "   brew install python3"
    echo ""
    echo "💡 Для Linux:"
    echo "   sudo apt install python3 (Ubuntu/Debian)"
    echo "   sudo yum install python3 (CentOS/RHEL)"
    echo ""
    echo "🎮 А пока можете открыть игру прямо в браузере:"
    
    # Попытка открыть файл в браузере
    if command -v open &> /dev/null; then
        echo "🌐 Открываем игру в браузере..."
        open index.html
    elif command -v xdg-open &> /dev/null; then
        echo "🌐 Открываем игру в браузере..."
        xdg-open index.html
    else
        echo "📁 Откройте файл index.html в вашем браузере"
    fi
fi
