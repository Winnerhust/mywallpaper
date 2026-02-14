# -*- mode: python ; coding: utf-8 -*-

from PyInstaller.utils.hooks import collect_all

datas_pil, binaries_pil, hiddenimports_pil = collect_all('PIL')
datas_requests, binaries_requests, hiddenimports_requests = collect_all('requests')
datas_flask, binaries_flask, hiddenimports_flask = collect_all('flask')

block_cipher = None

added_files = [
    ('frontend', 'frontend'),
    ('config.json', '.'),
]

a = Analysis(
    ['main.py'],
    pathex=[],
    binaries=binaries_pil + binaries_requests + binaries_flask,
    datas=added_files + datas_pil + datas_requests + datas_flask,
    hiddenimports=[
        'eel',
        'flask',
        'flask_cors',
        'PIL',
        'requests',
        'pywebview',
        'webview',
        'appdirs',
    ] + hiddenimports_pil + hiddenimports_requests + hiddenimports_flask,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=['pkg_resources'],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.zipfiles,
    a.datas,
    [],
    name='我的壁纸',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=False,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)
