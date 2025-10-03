#!/usr/bin/env python3
"""
Простой HTTP сервер для запуска Dungeon Mini игры
Использование: python3 server.py или python server.py
"""

import http.server
import socketserver
import webbrowser
import threading
import time
import socket
import os

PORT = 8000

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Кастомный обработчик для красивого отображения"""
    
    def end_headers(self):
        # Добавляем CORS заголовки для лучшей совместимости
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def log_message(self, format, *args):
        """Переопределяем логирование для более красивого вывода"""
        print(f"🌐 {self.address_string()} - {format % args}")

def find_free_port(start_port=PORT):
    """Находим свободный порт начиная с указанного"""
    for port in range(start_port, start_port + 100):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            if s.connect_ex(('localhost', port)) != 0:
                return port
    return PORT

def open_browser(url, delay=1):
    """Открываем браузер с задержкой"""
    time.sleep(delay)
    webbrowser.open(url)

if __name__ == "__main__":
    # Находим свободный порт
    port = find_free_port()
    
    # Настраиваем сервер
    Handler = MyHTTPRequestHandler
    httpd = socketserver.TCPServer(("", port), Handler)
    
    # Получаем точный URL
    url = f"http://localhost:{port}"
    
    print("🏰" + "=" * 50 + "🏰")
    print("🎮   DUNGEON MINI - Веб-версия игры")
    print("🏰" + "=" * 50 + "🏰")
    print()
    print(f"🚀 Сервер запущен на порту {port}")
    print(f"🌐 URL: {url}")
    print(f"📁 Директория: {os.getcwd()}")
    print()
    print("📖 Команды сервера:")
    print("   Ctrl+C - остановить сервер")
    print("   Нажмите Enter в терминале - открыть браузер заново")
    print()
    
    # Открываем браузер в отдельном потоке
    browser_thread = threading.Thread(target=open_browser, args=(url,))
    browser_thread.daemon = True
    browser_thread.start()
    
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Останавливаем сервер...")
        httpd.shutdown()
        print("👋 Сервер остановлен. До свидания!")
