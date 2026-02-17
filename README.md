# 我的壁纸

一款简洁的 Windows 桌面壁纸管理工具，支持本地壁纸管理、在线壁纸下载、自动换壁纸等功能。

## 功能特性

- **本地壁纸管理**
  - 支持分类管理（风景、动漫、美女、科技等）
  - 添加、删除分类
  - 搜索壁纸
  - 预览、删除壁纸

- **在线壁纸**
  - Picsum 随机图库
  - 必应每日壁纸
  - 下载到本地指定分类

- **自动换壁纸**
  - 可配置换壁纸间隔（分钟）
  - 支持本地壁纸或在线随机壁纸模式
  - 可选择分类

- **壁纸装饰**
  - 随机名人名言显示在壁纸右上角
  - 楷体字体，半透明背景

## 环境要求

- Windows 10/11
- Python 3.8+

## 安装

1. 克隆项目：
```bash
git clone https://github.com/Winnerhust/mywallpaper.git
```

2. 进入目录：
```bash
cd mywallpaper/Wallpaper/mywallpaper
```

3. 安装依赖：
```bash
pip install -r requirements.txt
```

## 运行

```bash
python main.py
```

## 依赖

- eel==1.0.0a1
- requests==2.31.0
- Pillow==10.1.0
- pywin32==306
- flask==3.0.0
- flask-cors==4.0.0
- pywebview==5.0.0
- pytest==8.0.0

## 测试

运行集成测试：
```bash
cd Wallpaper/mywallpaper
python -m pytest test_integration.py
```

## 项目结构

```
mywallpaper/
├── main.py              # 主程序
├── requirements.txt    # 依赖
├── config.json         # 配置文件
├── icons/              # 图标
├── frontend/           # 前端页面
│   ├── index.html
│   ├── css/style.css
│   └── js/app.js
└── dist/               # 打包输出
```

## 使用说明

1. 启动程序后，在左侧选择壁纸分类
2. 在"本地壁纸"标签页管理本地壁纸
3. 在"在线壁纸"标签页浏览和下载在线壁纸
4. 点击"换一张"按钮随机更换壁纸
5. 在设置中可以配置自动换壁纸功能

## 配置

配置文件 `config.json` 包含以下选项：
- `wallpaper_dir`: 壁纸存放目录
- `categories`: 分类列表
- `auto_change_enabled`: 是否开启自动换壁纸
- `auto_change_interval`: 换壁纸间隔（分钟）
- `auto_change_category`: 自动换壁纸的分类
- `auto_change_mode`: 换壁纸模式（local/online）
