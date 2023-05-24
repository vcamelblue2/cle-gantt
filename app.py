import os, sys
import webview

from backend.api import ExposedApi_V1

# from pathlib import Path ==> storage_path=str(Path.home())+"/.pywebview/"

args = {
    "DEV": {
        "http_port": 4012,
        "debug": True
    },
    "PROD": {
        "http_port": 4212
    }

}.get(sys.argv[1] if len(sys.argv) > 1 else "PROD")


if __name__ == '__main__':
    api = ExposedApi_V1()
    window = webview.create_window('Gantt App', 'frontend/index.html', js_api=api, min_size=(1000, 800))
    webview.start(http_server=True, private_mode=False, **args)

