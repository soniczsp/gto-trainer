# -*- coding: utf-8 -*-
"""手机访问服务：在局域网内启动 GTO 训练器服务，手机浏览器直接访问。
用法：双击「启动手机访问服务.bat」即可。"""
import http.server
import os
import socket
import socketserver
import sys

PORT = 8765
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def get_lan_ip():
    """获取本机局域网 IP（优先 192.168 / 10. / 172.16-31 网段）"""
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        pass
    # 兜底：枚举所有网卡
    try:
        for info in socket.getaddrinfo(socket.gethostname(), None, socket.AF_INET):
            ip = info[4][0]
            if not ip.startswith("127.") and not ip.startswith("169.254"):
                return ip
    except Exception:
        pass
    return None


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):
        sys.stdout.write("[%s] %s\n" % (self.address_string(), fmt % args))
        sys.stdout.flush()


def main():
    ip = get_lan_ip()
    os.chdir(BASE_DIR)
    handler = lambda *a, **kw: QuietHandler(*a, directory=BASE_DIR, **kw)

    # 端口被占用时换一个
    port = PORT
    while True:
        try:
            with socketserver.TCPServer(("0.0.0.0", port), handler) as httpd:
                print("=" * 52)
                print("  GTO 策略训练器 · 手机访问服务已启动")
                print("=" * 52)
                print()
                if ip:
                    print("  手机访问地址（和电脑连同一个 WiFi）：")
                    print("      http://%s:%d/index.html" % (ip, port))
                    print()
                    print("  电脑本机访问：")
                    print("      http://127.0.0.1:%d/index.html" % port)
                else:
                    print("  未检测到局域网 IP，请确认电脑已连接 WiFi 或有线网络。")
                    print("  也可以先用 ipconfig 查看 IP，然后访问 http://<你的IP>:%d/index.html" % port)
                print()
                print("  提示：用手机自带浏览器（Safari/Chrome）打开，")
                print("        不要用微信内浏览器。关掉本窗口即停止服务。")
                print("=" * 52)
                httpd.serve_forever()
        except OSError as e:
            if "address already in use" in str(e).lower() or "仅" in str(e) or "only" in str(e).lower():
                port += 1
                continue
            raise


if __name__ == "__main__":
    main()
