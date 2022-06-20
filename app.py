import os
import webview

from backend.api import ExposedApi_V1


if __name__ == '__main__':
    api = ExposedApi_V1()
    window = webview.create_window('Gantt App', 'frontend/index.html', js_api=api, min_size=(1000, 800))
    webview.start(http_server=True, debug=True)

