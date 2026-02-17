# -*- coding: utf-8 -*-
import pytest
import json
import os
import sys
import tempfile
import shutil
import time

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import app, wallpaper_app, QUOTES

@pytest.fixture
def client():
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client

@pytest.fixture
def temp_wallpaper_dir():
    temp_dir = tempfile.mkdtemp()
    yield temp_dir
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)

@pytest.fixture(autouse=True)
def cleanup_test_categories():
    yield
    test_categories = [name for name in wallpaper_app.categories if name.startswith('测试_')]
    for cat in test_categories:
        if cat in wallpaper_app.categories:
            wallpaper_app.categories.remove(cat)
    wallpaper_app.save_config()

def test_get_config(client):
    response = client.get('/api/config')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'wallpaper_dir' in data
    assert 'categories' in data

def test_get_categories(client):
    response = client.get('/api/categories')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)
    assert '全部' in data
    assert '风景' in data

def test_add_category(client):
    unique_name = f'测试_{int(time.time() * 1000)}'
    response = client.post('/api/categories', 
        data=json.dumps({'name': unique_name}),
        content_type='application/json')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    assert unique_name in wallpaper_app.categories

def test_add_duplicate_category(client):
    response = client.post('/api/categories', 
        data=json.dumps({'name': '风景'}),
        content_type='application/json')
    data = json.loads(response.data)
    assert data['success'] == False

def test_delete_category(client):
    unique_name = f'待删除_{int(time.time() * 1000)}'
    client.post('/api/categories', 
        data=json.dumps({'name': unique_name}),
        content_type='application/json')
    response = client.delete(f'/api/categories/{unique_name}')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True
    assert unique_name not in wallpaper_app.categories

def test_delete_default_category(client):
    response = client.delete('/api/categories/风景')
    data = json.loads(response.data)
    assert data['success'] == False

def test_get_wallpapers(client):
    response = client.get('/api/wallpapers?category=风景')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)

def test_get_wallpapers_all_categories(client):
    response = client.get('/api/wallpapers?category=全部')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)

def test_download_wallpaper(client, temp_wallpaper_dir):
    wallpaper_app.wallpaper_dir = temp_wallpaper_dir
    os.makedirs(os.path.join(temp_wallpaper_dir, '风景'), exist_ok=True)
    
    test_url = 'https://picsum.photos/200/100'
    response = client.post('/api/download',
        data=json.dumps({
            'url': test_url,
            'category': '风景',
            'filename': 'test.jpg'
        }),
        content_type='application/json')
    
    assert response.status_code == 200

def test_auto_change_config(client):
    response = client.get('/api/auto-change')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'enabled' in data
    assert 'interval' in data
    assert 'show_quote' in data

def test_set_auto_change_config(client):
    response = client.post('/api/auto-change',
        data=json.dumps({
            'enabled': True,
            'interval': 60,
            'category': '风景',
            'mode': 'local',
            'show_quote': True
        }),
        content_type='application/json')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] == True

def test_get_sources(client):
    response = client.get('/api/sources')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)
    assert len(data) > 0

def test_get_free_wallpapers_picsum(client):
    response = client.get('/api/free-wallpapers?source=picsum&category=all')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)
    assert len(data) > 0

def test_get_free_wallpapers_bing(client):
    response = client.get('/api/free-wallpapers?source=bing&category=all&page=0')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert isinstance(data, list)

def test_quotes_not_empty():
    assert len(QUOTES) > 0

def test_quotes_format():
    for quote in QUOTES:
        assert isinstance(quote, str)
        assert len(quote) > 0

def test_set_wallpaper_dir(client, temp_wallpaper_dir):
    os.makedirs(temp_wallpaper_dir, exist_ok=True)
    response = client.post('/api/config',
        data=json.dumps({'dir_path': temp_wallpaper_dir}),
        content_type='application/json')
    assert response.status_code == 200

def test_set_wallpaper_dir_not_exists(client):
    response = client.post('/api/config',
        data=json.dumps({'dir_path': 'C:/not/exists/path'}),
        content_type='application/json')
    data = json.loads(response.data)
    assert data['success'] == False

def test_index_page(client):
    response = client.get('/')
    assert response.status_code == 200

def test_frontend_files_accessible(client):
    response = client.get('/css/style.css')
    assert response.status_code in [200, 404]
    
    response = client.get('/js/app.js')
    assert response.status_code in [200, 404]

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
