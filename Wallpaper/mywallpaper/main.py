from flask import Flask, jsonify, send_from_directory, request
from flask_cors import CORS
import os
import json
import requests
from PIL import Image
import ctypes
import threading
import time

app = Flask(__name__, static_folder='frontend', static_url_path='')
CORS(app)

CONFIG_FILE = "config.json"
WALLPAPER_DIR = os.path.join(os.path.expanduser("~"), "Pictures", "我的壁纸")

class WallpaperApp:
    def __init__(self):
        self.config = self.load_config()
        self.wallpaper_dir = self.config.get("wallpaper_dir", WALLPAPER_DIR)
        self.categories = self.config.get("categories", ["全部", "风景", "动漫", "美女", "科技"])
        self.auto_change_enabled = self.config.get("auto_change_enabled", True)
        self.auto_change_interval = self.config.get("auto_change_interval", 1440)
        self.auto_change_category = self.config.get("auto_change_category", "全部")
        self.auto_change_mode = self.config.get("auto_change_mode", "local")
        self.auto_change_thread = None
        self.stop_auto_change = threading.Event()
        os.makedirs(self.wallpaper_dir, exist_ok=True)
        
        for cat in self.categories:
            cat_dir = os.path.join(self.wallpaper_dir, cat)
            os.makedirs(cat_dir, exist_ok=True)
    
    def load_config(self):
        if os.path.exists(CONFIG_FILE):
            try:
                with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                    return json.load(f)
            except:
                pass
        return {
            "wallpaper_dir": WALLPAPER_DIR,
            "categories": ["全部", "风景", "动漫", "美女", "科技"],
            "auto_change_enabled": True,
            "auto_change_interval": 1440,
            "auto_change_category": "全部",
            "auto_change_mode": "local"
        }
    
    def save_config(self):
        self.config["wallpaper_dir"] = self.wallpaper_dir
        self.config["categories"] = self.categories
        self.config["auto_change_enabled"] = self.auto_change_enabled
        self.config["auto_change_interval"] = self.auto_change_interval
        self.config["auto_change_category"] = self.auto_change_category
        self.config["auto_change_mode"] = self.auto_change_mode
        with open(CONFIG_FILE, "w", encoding="utf-8") as f:
            json.dump(self.config, f, ensure_ascii=False, indent=2)
    
    def start_auto_change(self):
        if self.auto_change_thread and self.auto_change_thread.is_alive():
            return
        
        self.stop_auto_change.clear()
        self.auto_change_thread = threading.Thread(target=self.auto_change_loop, daemon=True)
        self.auto_change_thread.start()
    
    def stop_auto_change_func(self):
        self.stop_auto_change.set()
    
    def auto_change_loop(self):
        while not self.stop_auto_change.is_set():
            interval_minutes = self.auto_change_interval
            interval_seconds = interval_minutes * 60
            
            self.stop_auto_change.wait(interval_seconds)
            
            if self.stop_auto_change.is_set():
                break
            
            if self.auto_change_enabled:
                self.change_random_wallpaper()
    
    def change_random_wallpaper(self):
        try:
            if self.auto_change_mode == "online":
                self.download_and_set_online_wallpaper()
            else:
                category = self.auto_change_category
                wallpapers = []
                if category == "全部":
                    for cat in wallpaper_app.categories:
                        if cat != "全部":
                            wallpapers.extend(get_wallpapers_from_category(cat))
                else:
                    wallpapers = get_wallpapers_from_category(category)
                
                if wallpapers:
                    import random
                    wp = random.choice(wallpapers)
                    set_wallpaper_by_path(wp["path"])
                    print(f"自动换壁纸(本地): {wp['name']}")
                else:
                    self.download_and_set_online_wallpaper()
        except Exception as e:
            print(f"自动换壁纸失败: {e}")
    
    def download_and_set_online_wallpaper(self):
        try:
            import random
            heights = [1080, 1200, 1440, 900, 720]
            h = random.choice(heights)
            w = int(h * 16 / 9)
            seed = random.randint(1, 10000)
            
            url = f"https://picsum.photos/{w}/{h}"
            filename = f"auto_wallpaper_{seed}.jpg"
            save_dir = os.path.join(self.wallpaper_dir, "风景")
            os.makedirs(save_dir, exist_ok=True)
            file_path = os.path.join(save_dir, filename)
            
            response = requests.get(url, timeout=30)
            if response.status_code == 200:
                with open(file_path, "wb") as f:
                    f.write(response.content)
                set_wallpaper_by_path(file_path)
                print(f"自动换壁纸(在线): {filename}")
        except Exception as e:
            print(f"在线壁纸下载失败: {e}")

wallpaper_app = WallpaperApp()

@app.route('/')
def index():
    return send_from_directory('frontend', 'index.html')

@app.route('/wallpaper/<path:filename>')
def serve_wallpaper(filename):
    return send_from_directory(wallpaper_app.wallpaper_dir, filename)

@app.route('/api/config', methods=['GET'])
def get_config():
    return jsonify({
        "wallpaper_dir": wallpaper_app.wallpaper_dir,
        "categories": wallpaper_app.categories
    })

@app.route('/api/config', methods=['POST'])
def set_wallpaper_dir():
    data = request.json
    dir_path = data.get('dir_path')
    if dir_path and os.path.exists(dir_path):
        wallpaper_app.wallpaper_dir = dir_path
        os.makedirs(dir_path, exist_ok=True)
        for cat in wallpaper_app.categories:
            cat_dir = os.path.join(dir_path, cat)
            os.makedirs(cat_dir, exist_ok=True)
        wallpaper_app.save_config()
        return jsonify({"success": True})
    return jsonify({"success": False, "error": "目录不存在"})

@app.route('/api/categories', methods=['GET'])
def get_categories():
    return jsonify(wallpaper_app.categories)

@app.route('/api/categories', methods=['POST'])
def add_category():
    data = request.json
    name = data.get('name')
    if name and name not in wallpaper_app.categories:
        wallpaper_app.categories.append(name)
        cat_dir = os.path.join(wallpaper_app.wallpaper_dir, name)
        os.makedirs(cat_dir, exist_ok=True)
        wallpaper_app.save_config()
        return jsonify({"success": True})
    return jsonify({"success": False})

@app.route('/api/categories/<name>', methods=['DELETE'])
def delete_category(name):
    if name not in ["全部", "风景", "动漫", "美女", "科技"]:
        if name in wallpaper_app.categories:
            wallpaper_app.categories.remove(name)
            wallpaper_app.save_config()
            return jsonify({"success": True})
    return jsonify({"success": False})

@app.route('/api/wallpapers', methods=['GET'])
def get_wallpapers():
    category = request.args.get('category', '全部')
    wallpapers = []
    if category == "全部":
        for cat in wallpaper_app.categories:
            if cat != "全部":
                wallpapers.extend(get_wallpapers_from_category(cat))
    else:
        wallpapers = get_wallpapers_from_category(category)
    return jsonify(wallpapers)

def get_wallpapers_from_category(category):
    wallpapers = []
    cat_dir = os.path.join(wallpaper_app.wallpaper_dir, category)
    if os.path.exists(cat_dir):
        for file in os.listdir(cat_dir):
            if file.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp', '.gif', '.webp')):
                file_path = os.path.join(cat_dir, file)
                try:
                    with Image.open(file_path) as img:
                        width, height = img.size
                        file_size = os.path.getsize(file_path)
                        wallpapers.append({
                            "name": file,
                            "path": file_path.replace("\\", "/"),
                            "category": category,
                            "width": width,
                            "height": height,
                            "size": file_size
                        })
                except:
                    pass
    return wallpapers

@app.route('/api/wallpapers', methods=['DELETE'])
def delete_wallpaper():
    data = request.json
    file_path = data.get('path')
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return jsonify({"success": True})
    except:
        pass
    return jsonify({"success": False})

@app.route('/api/download', methods=['POST'])
def download_wallpaper():
    data = request.json
    url = data.get('url')
    category = data.get('category')
    filename = data.get('filename')
    
    try:
        cat_dir = os.path.join(wallpaper_app.wallpaper_dir, category)
        os.makedirs(cat_dir, exist_ok=True)
        file_path = os.path.join(cat_dir, filename)
        
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            with open(file_path, "wb") as f:
                f.write(response.content)
            return jsonify({"success": True, "path": file_path.replace("\\", "/")})
        return jsonify({"success": False, "error": "下载失败"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/set-wallpaper', methods=['POST'])
def set_desktop_wallpaper():
    data = request.json
    file_path = data.get('path')
    return jsonify(set_wallpaper_by_path(file_path))

def set_wallpaper_by_path(file_path):
    try:
        SPI_SETDESKWALLPAPER = 20
        SPIF_UPDATEINIFILE = 0x01
        SPIF_SENDCHANGE = 0x02
        
        result = ctypes.windll.user32.SystemParametersInfoW(
            SPI_SETDESKWALLPAPER,
            0,
            file_path,
            SPIF_UPDATEINIFILE | SPIF_SENDCHANGE
        )
        return {"success": result != 0}
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.route('/api/auto-change', methods=['GET'])
def get_auto_change_config():
    return jsonify({
        "enabled": wallpaper_app.auto_change_enabled,
        "interval": wallpaper_app.auto_change_interval,
        "category": wallpaper_app.auto_change_category,
        "mode": wallpaper_app.auto_change_mode
    })

@app.route('/api/auto-change', methods=['POST'])
def set_auto_change_config():
    data = request.json
    wallpaper_app.auto_change_enabled = data.get('enabled', True)
    wallpaper_app.auto_change_interval = max(1, data.get('interval', 1440))
    wallpaper_app.auto_change_category = data.get('category', "全部")
    wallpaper_app.auto_change_mode = data.get('mode', "local")
    wallpaper_app.save_config()
    
    if wallpaper_app.auto_change_enabled:
        wallpaper_app.start_auto_change()
    else:
        wallpaper_app.stop_auto_change_func()
    
    return jsonify({"success": True})

@app.route('/api/free-wallpapers', methods=['GET'])
def get_free_wallpapers():
    source = request.args.get('source', 'picsum')
    category = request.args.get('category', 'all')
    import random
    
    if source == 'picsum':
        query_map = {
            "风景": "nature,landscape,mountain",
            "动漫": "anime,cartoon",
            "美女": "portrait,people,girl",
            "科技": "technology,computer,cyber",
            "all": "nature,landscape,anime,technology,portrait"
        }
        
        wallpapers = []
        heights = [200, 250, 300, 350, 400, 280, 320, 380]
        for i in range(18):
            h = random.choice(heights)
            w = int(h * 16 / 9)
            seed = random.randint(1, 1000)
            wallpapers.append({
                "id": f"picsum_{category}_{seed}_{i}",
                "thumb": f"https://picsum.photos/seed/{seed}/{w}/{h}",
                "regular": f"https://picsum.photos/seed/{seed}/{w*2}/{h*2}",
                "full": f"https://picsum.photos/seed/{seed}/1920/1080",
                "description": f"{category}壁纸 {seed}",
                "author": "Picsum",
                "category": category
            })
    
    elif source == 'bing':
        page = int(request.args.get('page', 0))
        wallpapers = []
        
        for idx in range(8):
            wallpapers.append({
                "id": f"bing_{page}_{idx}",
                "thumb": f"https://bing.biturl.top/?resolution=320x240&format=image&index={idx}",
                "regular": f"https://bing.biturl.top/?resolution=1920x1080&format=image&index={idx}",
                "full": f"https://bing.biturl.top/?resolution=1920x1080&format=image&index={idx}",
                "description": f"Bing每日壁纸 {idx}",
                "author": "Bing",
                "category": category
            })
    else:
        wallpapers = []
    
    return jsonify(wallpapers)

@app.route('/api/sources', methods=['GET'])
def get_sources():
    return jsonify([
        {"id": "picsum", "name": "Picsum 随机图库"},
        {"id": "bing", "name": "必应每日壁纸"}
    ])

@app.route('/api/change-wallpaper-now', methods=['POST'])
def change_wallpaper_now():
    try:
        if wallpaper_app.auto_change_mode == "online":
            wallpaper_app.download_and_set_online_wallpaper()
        else:
            wallpaper_app.change_random_wallpaper()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

def run_server():
    app.run(port=5000, debug=False)

if __name__ == "__main__":
    import webview
    
    if wallpaper_app.auto_change_enabled:
        wallpaper_app.start_auto_change()
        print(f"自动换壁纸已开启，间隔: {wallpaper_app.auto_change_interval}分钟")
    
    server_thread = threading.Thread(target=run_server, daemon=True)
    server_thread.start()
    time.sleep(1)
    print("服务器已启动: http://localhost:5000")
    
    webview.create_window(title = "",url= "http://localhost:5000", )
    webview.start(icon="icons/small.ico")