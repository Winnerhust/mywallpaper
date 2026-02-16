let currentCategory = "全部";
let config = {};
let currentPreviewWallpaper = null;
let currentOnlineWallpaper = null;
let currentSource = "picsum";
let onlinePage = 1;
let loadedOnlineIds = new Set();
let loadedOnlineUrls = new Set();
let isLoadingOnline = false;
const API_BASE = '/api';

window.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    await loadSources();
    await loadCategories();
    await loadWallpapers();
    await loadOnlineWallpapers();
    setupEventListeners();
});

async function loadSources() {
    const res = await fetch(`${API_BASE}/sources`);
    const sources = await res.json();
    const select = document.getElementById('wallpaper-source');
    select.innerHTML = '';
    sources.forEach(s => {
        const option = document.createElement('option');
        option.value = s.id;
        option.textContent = s.name;
        if (s.id === 'picsum') option.selected = true;
        select.appendChild(option);
    });
}

async function loadConfig() {
    const res = await fetch(`${API_BASE}/config`);
    config = await res.json();
    document.getElementById('wallpaper-dir-input').value = config.wallpaper_dir;
    
    const downloadToCategory = document.getElementById('download-to-category');
    downloadToCategory.innerHTML = '';
    
    config.categories.forEach(cat => {
        if (cat === "全部") return;
        
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        if (cat === "风景") option.selected = true;
        downloadToCategory.appendChild(option);
    });
    
    const autoChangeRes = await fetch(`${API_BASE}/auto-change`);
    const autoChangeConfig = await autoChangeRes.json();
    document.getElementById('auto-change-enabled').checked = autoChangeConfig.enabled;
    document.getElementById('auto-change-interval').value = autoChangeConfig.interval;
    document.getElementById('auto-change-mode').value = autoChangeConfig.mode || "local";
    document.getElementById('show-quote').checked = autoChangeConfig.show_quote !== false;
    
    const autoChangeCategory = document.getElementById('auto-change-category');
    autoChangeCategory.innerHTML = '';
    config.categories.forEach(cat => {
        const option = document.createElement('option');
        option.value = cat;
        option.textContent = cat;
        if (cat === autoChangeConfig.category) option.selected = true;
        autoChangeCategory.appendChild(option);
    });
}

async function loadCategories() {
    const res = await fetch(`${API_BASE}/categories`);
    const categories = await res.json();
    const categoryList = document.getElementById('category-list');
    categoryList.innerHTML = '';
    
    categories.forEach(cat => {
        const li = document.createElement('li');
        li.textContent = cat;
        li.dataset.category = cat;
        
        if (cat !== "全部") {
            const deleteBtn = document.createElement('span');
            deleteBtn.className = 'delete-category';
            deleteBtn.textContent = '×';
            deleteBtn.onclick = async (e) => {
                e.stopPropagation();
                if (confirm(`确定要删除分类"${cat}"吗？`)) {
                    await fetch(`${API_BASE}/categories/${cat}`, { method: 'DELETE' });
                    await loadCategories();
                    await loadConfig();
                }
            };
            li.appendChild(deleteBtn);
        }
        
        li.onclick = async () => {
            document.querySelectorAll('.category-list li').forEach(l => l.classList.remove('active'));
            li.classList.add('active');
            currentCategory = cat;
            await loadWallpapers();
        };
        
        categoryList.appendChild(li);
    });
    
    document.querySelector('.category-list li').classList.add('active');
}

async function loadWallpapers() {
    const grid = document.getElementById('wallpaper-grid');
    grid.innerHTML = '<div class="loading">加载中...</div>';
    
    const res = await fetch(`${API_BASE}/wallpapers?category=${encodeURIComponent(currentCategory)}`);
    const wallpapers = await res.json();
    
    grid.innerHTML = '';
    
    if (wallpapers.length === 0) {
        grid.innerHTML = '<div class="loading">暂无壁纸，去"在线壁纸"下载</div>';
        document.getElementById('wallpaper-count').textContent = `已下载 0 张壁纸`;
        return;
    }
    
    wallpapers.forEach(wp => {
        const item = createWallpaperItem(wp, false);
        grid.appendChild(item);
    });
    
    document.getElementById('wallpaper-count').textContent = `已下载 ${wallpapers.length} 张壁纸`;
}

function createWallpaperItem(wp, isOnline) {
    const item = document.createElement('div');
    item.className = 'wallpaper-item';
    
    const img = document.createElement('img');
    if (isOnline) {
        const heights = [150, 180, 200, 220, 250, 280];
        const height = heights[Math.floor(Math.random() * heights.length)];
        img.style.height = height + 'px';
        img.src = wp.thumb;
        img.alt = wp.description || '壁纸';
    } else {
        img.src = '/wallpaper/' + wp.category + '/' + wp.name;
        img.alt = wp.name;
        img.onerror = function() {
            this.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 125"><rect fill="%23ddd" width="200" height="125"/><text x="100" y="65" text-anchor="middle" fill="%23999">无法加载</text></svg>';
        };
    }
    
    if (isOnline) {
        item.onclick = () => showOnlinePreview(wp);
    } else {
        const info = document.createElement('div');
        info.className = 'wallpaper-info';
        info.textContent = `${wp.width}×${wp.height}`;
        
        item.onclick = () => showPreview(wp);
        item.appendChild(info);
    }
    
    item.appendChild(img);
    return item;
}

async function loadOnlineWallpapers(append = false) {
    if (isLoadingOnline) return;
    isLoadingOnline = true;
    
    const grid = document.getElementById('online-grid');
    const source = document.getElementById('wallpaper-source').value;
    
    if (!append) {
        grid.innerHTML = '<div class="loading">加载中...</div>';
        loadedOnlineIds.clear();
        loadedOnlineUrls.clear();
        onlinePage = 0;
    }
    
    try {
        const category = document.getElementById('online-category').value;
        let url;
        if (source === 'bing') {
            const seed = Date.now();
            url = `${API_BASE}/free-wallpapers?source=${source}&category=${encodeURIComponent(category)}&page=${onlinePage}&seed=${seed}`;
        } else {
            url = `${API_BASE}/free-wallpapers?source=${source}&category=${encodeURIComponent(category)}`;
        }
        const res = await fetch(url);
        const wallpapers = await res.json();
        
        if (!append) {
            grid.innerHTML = '';
        }
        
        const newWallpapers = wallpapers.filter(wp => !loadedOnlineIds.has(wp.id) && !loadedOnlineUrls.has(wp.thumb));
        newWallpapers.forEach(wp => {
            loadedOnlineIds.add(wp.id);
            loadedOnlineUrls.add(wp.thumb);
            const item = createWallpaperItem(wp, true);
            grid.appendChild(item);
        });
        
        onlinePage++;
        
        if (newWallpapers.length === 0 && wallpapers.length > 0) {
            await loadOnlineWallpapers(true);
        }
    } finally {
        isLoadingOnline = false;
    }
}

function showPreview(wallpaper) {
    currentPreviewWallpaper = wallpaper;
    const modal = document.getElementById('preview-modal');
    const img = document.getElementById('preview-image');
    const name = document.getElementById('preview-name');
    const details = document.getElementById('preview-details');
    
    img.src = '/wallpaper/' + wallpaper.category + '/' + wallpaper.name;
    name.textContent = wallpaper.name;
    details.textContent = `${wallpaper.width}×${wallpaper.height} | ${formatFileSize(wallpaper.size)} | ${wallpaper.category}`;
    
    modal.classList.add('show');
}

function showOnlinePreview(wallpaper) {
    currentOnlineWallpaper = wallpaper;
    const modal = document.getElementById('online-preview-modal');
    const img = document.getElementById('online-preview-image');
    const name = document.getElementById('online-preview-name');
    const details = document.getElementById('online-preview-details');
    
    img.src = wallpaper.regular || wallpaper.full;
    name.textContent = wallpaper.description || '在线壁纸';
    details.textContent = `来源: ${wallpaper.author || '未知'}`;
    
    modal.classList.add('show');
}

function setupEventListeners() {
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.onclick = () => {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('show'));
        };
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.onclick = (e) => {
            if (e.target === modal) {
                modal.classList.remove('show');
            }
        };
    });
    
    document.querySelectorAll('.tab').forEach(tab => {
        tab.onclick = () => {
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            
            tab.classList.add('active');
            const panelId = tab.dataset.tab + '-panel';
            document.getElementById(panelId).classList.add('active');
        };
    });
    
    document.getElementById('btn-add-category').onclick = () => {
        document.getElementById('add-category-modal').classList.add('show');
        document.getElementById('new-category-name').value = '';
        document.getElementById('new-category-name').focus();
    };
    
    document.getElementById('btn-confirm-add-category').onclick = async () => {
        const name = document.getElementById('new-category-name').value.trim();
        if (name) {
            const res = await fetch(`${API_BASE}/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name })
            });
            const result = await res.json();
            if (result.success) {
                await loadCategories();
                await loadConfig();
                document.getElementById('add-category-modal').classList.remove('show');
            } else {
                alert('分类已存在');
            }
        }
    };
    
    document.getElementById('btn-settings').onclick = () => {
        document.getElementById('settings-modal').classList.add('show');
    };
    
    document.getElementById('btn-save-settings').onclick = async () => {
        const enabled = document.getElementById('auto-change-enabled').checked;
        const interval = parseInt(document.getElementById('auto-change-interval').value) || 1440;
        const mode = document.getElementById('auto-change-mode').value;
        const category = document.getElementById('auto-change-category').value;
        const show_quote = document.getElementById('show-quote').checked;
        
        if (interval < 1) {
            alert('间隔时间不能少于1分钟');
            return;
        }
        
        const res = await fetch(`${API_BASE}/auto-change`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled, interval, mode, category, show_quote })
        });
        const result = await res.json();
        if (result.success) {
            document.getElementById('settings-modal').classList.remove('show');
        } else {
            alert('设置保存失败');
        }
    };
    
    document.getElementById('wallpaper-dir-input').onchange = async (e) => {
        const dir = e.target.value;
        const res = await fetch(`${API_BASE}/config`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dir_path: dir })
        });
        const result = await res.json();
        if (result.success) {
            await loadWallpapers();
        } else {
            alert('目录不存在');
        }
    };
    
    document.getElementById('btn-set-wallpaper').onclick = async () => {
        if (currentPreviewWallpaper) {
            const res = await fetch(`${API_BASE}/set-wallpaper`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: currentPreviewWallpaper.path })
            });
            const result = await res.json();
            if (!result.success) {
                alert('壁纸设置失败: ' + result.error);
            }
        }
    };
    
    document.getElementById('btn-delete').onclick = async () => {
        if (currentPreviewWallpaper) {
            if (confirm('确定要删除这张壁纸吗？')) {
                const res = await fetch(`${API_BASE}/wallpapers`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: currentPreviewWallpaper.path })
                });
                const result = await res.json();
                if (result.success) {
                    document.getElementById('preview-modal').classList.remove('show');
                    await loadWallpapers();
                }
            }
        }
    };
    
    document.getElementById('btn-online-download').onclick = async () => {
        if (currentOnlineWallpaper) {
            const category = document.getElementById('download-to-category').value;
            const filename = `${currentOnlineWallpaper.id}_${Date.now()}.jpg`;
            const res = await fetch(`${API_BASE}/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: currentOnlineWallpaper.full, category, filename })
            });
            const result = await res.json();
            if (result.success) {
                document.getElementById('online-preview-modal').classList.remove('show');
                await loadWallpapers();
            } else {
                alert('下载失败：' + result.error);
            }
        }
    };
    
    document.getElementById('btn-online-set-wallpaper').onclick = async () => {
        if (currentOnlineWallpaper) {
            const category = document.getElementById('download-to-category').value;
            const filename = `${currentOnlineWallpaper.id}_${Date.now()}.jpg`;
            const res = await fetch(`${API_BASE}/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: currentOnlineWallpaper.full, category, filename })
            });
            const result = await res.json();
            if (result.success) {
                const setRes = await fetch(`${API_BASE}/set-wallpaper`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: result.path })
                });
                const setResult = await setRes.json();
                if (setResult.success) {
                    document.getElementById('online-preview-modal').classList.remove('show');
                    await loadWallpapers();
                } else {
                    alert('壁纸设置失败: ' + setResult.error);
                }
            } else {
                alert('下载失败：' + result.error);
            }
        }
    };
    
    document.getElementById('online-category').onchange = async () => {
        await loadOnlineWallpapers();
    };
    
    document.getElementById('wallpaper-source').onchange = async () => {
        await loadOnlineWallpapers();
    };
    
    document.getElementById('btn-refresh').onclick = async () => {
        await loadWallpapers();
    };
    
    document.getElementById('btn-change-now').onclick = async () => {
        const res = await fetch(`${API_BASE}/change-wallpaper-now`, { method: 'POST' });
        const result = await res.json();
        if (!result.success) {
            alert('更换失败: ' + (result.error || '未知错误'));
        }
    };
    
    let scrollTimeout;
    document.getElementById('online-grid').addEventListener('scroll', async (e) => {
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(async () => {
            const grid = e.target;
            if (grid.scrollHeight - grid.scrollTop <= grid.clientHeight + 100) {
                await loadOnlineWallpapers(true);
            }
        }, 200);
    });
    
    document.getElementById('search-input').oninput = async (e) => {
        const keyword = e.target.value.toLowerCase();
        const res = await fetch(`${API_BASE}/wallpapers?category=${encodeURIComponent(currentCategory)}`);
        const wallpapers = await res.json();
        
        const filtered = wallpapers.filter(wp => 
            wp.name.toLowerCase().includes(keyword) ||
            wp.category.toLowerCase().includes(keyword)
        );
        
        const grid = document.getElementById('wallpaper-grid');
        grid.innerHTML = '';
        
        filtered.forEach(wp => {
            const item = createWallpaperItem(wp, false);
            grid.appendChild(item);
        });
    };
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}
