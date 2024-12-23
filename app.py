import os, sys
import webview

from backend.api import ExposedApi_V1

# storage_path="./data/.pywebview/"

env = 'DEV' if len(sys.argv) > 1 else "PROD"

args = {
    "DEV": {
        "http_port": 4015,
        "debug": True
    },
    "PROD": {
        "http_port": 4216
    }

}.get(sys.argv[1] if len(sys.argv) > 1 else "PROD")


if __name__ == '__main__':
    api = ExposedApi_V1()
    # webview.settings['OPEN_DEVTOOLS_IN_DEBUG'] = False
    window = webview.create_window('Gantt App', 'frontend/index.html', js_api=api, min_size=(1200, 800))
    webview.start(http_server=True, private_mode=False, **args)

