let currentCategory = "全部";
let config = {};
let currentPreviewWallpaper = null;
let onlinePage = 1;
let loadedOnlineIds = new Set();
let loadedOnlineUrls = new Set();
let isLoadingOnline = false;
const API_BASE = '/api';

window.addEventListener('DOMContentLoaded', async () => {
    await loadConfig();
    await loadCategories();
    await loadWallpapers();
    await loadOnlineWallpapers();
    setupEventListeners();
});

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
        const info = document.createElement('div');
        info.className = 'wallpaper-info';
        
        const btnGroup = document.createElement('div');
        btnGroup.className = 'wallpaper-actions';
        
        const downloadBtn = document.createElement('button');
        downloadBtn.className = 'action-btn';
        downloadBtn.textContent = '下载';
        downloadBtn.onclick = async (e) => {
            e.stopPropagation();
            const category = document.getElementById('download-to-category').value;
            const filename = `${wp.id}_${Date.now()}.jpg`;
            const res = await fetch(`${API_BASE}/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: wp.full, category, filename })
            });
            const result = await res.json();
            if (result.success) {
                alert('下载成功！');
                await loadWallpapers();
            } else {
                alert('下载失败：' + result.error);
            }
        };
        
        const setBtn = document.createElement('button');
        setBtn.className = 'action-btn action-btn-primary';
        setBtn.textContent = '设为壁纸';
        setBtn.onclick = async (e) => {
            e.stopPropagation();
            const category = document.getElementById('download-to-category').value;
            const filename = `${wp.id}_${Date.now()}.jpg`;
            const res = await fetch(`${API_BASE}/download`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: wp.full, category, filename })
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
                    alert('壁纸设置成功！');
                } else {
                    alert('壁纸设置失败: ' + setResult.error);
                }
            } else {
                alert('下载失败：' + result.error);
            }
        };
        
        btnGroup.appendChild(downloadBtn);
        btnGroup.appendChild(setBtn);
        info.appendChild(btnGroup);
        item.appendChild(info);
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
    
    if (!append) {
        grid.innerHTML = '<div class="loading">加载中...</div>';
        loadedOnlineIds.clear();
        loadedOnlineUrls.clear();
    }
    
    try {
        const category = document.getElementById('online-category').value;
        const res = await fetch(`${API_BASE}/free-wallpapers?category=${encodeURIComponent(category)}`);
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
        const category = document.getElementById('auto-change-category').value;
        
        if (interval < 5) {
            alert('间隔时间不能少于5分钟');
            return;
        }
        
        const res = await fetch(`${API_BASE}/auto-change`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled, interval, category })
        });
        const result = await res.json();
        if (result.success) {
            alert('设置保存成功！');
            document.getElementById('settings-modal').classList.remove('show');
        } else {
            alert('设置保存失败');
        }
    };
    
    document.getElementById('btn-browse').onclick = async () => {
        alert('请在文件浏览器中选择目录，然后手动输入路径');
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
            alert('保存成功');
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
            if (result.success) {
                alert('壁纸设置成功！');
            } else {
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
    
    document.getElementById('online-category').onchange = async () => {
        await loadOnlineWallpapers();
    };
    
    document.getElementById('btn-refresh').onclick = async () => {
        await loadWallpapers();
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
