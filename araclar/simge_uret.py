"""Giray Akademi program simgeleri ve link görüntüsü üretici.
Kullanım: python3 uret.py <çıktı klasörü> <ayar.json>
ayar: {"ad": "Hadis Usulü", "ar": "مصطلح الحديث", "alt": "...", "svg": "<path .../>", "yol": "/hadis_usulu/"}
"""
import json, sys, pathlib
from playwright.sync_api import sync_playwright
out = pathlib.Path(sys.argv[1]); out.mkdir(parents=True, exist_ok=True)
A = json.loads(pathlib.Path(sys.argv[2]).read_text(encoding='utf-8'))
TAMGA = '<svg viewBox="24 22 152 96" fill="#f4c430"><rect x="45" y="33" width="112" height="12"/><rect x="45" y="33" width="12" height="62"/><rect x="28" y="80" width="29" height="15"/><rect x="145" y="33" width="12" height="62"/><rect x="145" y="80" width="27" height="15"/><rect x="97" y="33" width="13" height="70"/><rect x="77" y="97" width="53" height="15"/></svg>'
SYM = lambda sw: f'<svg viewBox="0 0 24 24" fill="none" stroke="#f4c430" stroke-width="{sw}" stroke-linecap="round" stroke-linejoin="round">{A["svg"]}</svg>'
BG = 'background:radial-gradient(circle at 28% 22%,#2b7a5e 0%,#1f5a45 55%,#1a4b3a 100%)'
ICON = lambda: f'''<html><body style="margin:0"><div id="c" style="width:512px;height:512px;{BG};display:grid;place-items:center">
<div style="width:250px;height:250px">{SYM(2)}</div></div></body></html>'''
OG = f'''<html><head><style>body{{margin:0}}</style></head><body><div id="c" style="width:1200px;height:630px;background:#f7f3ea;position:relative;font-family:'Liberation Sans',Arial,sans-serif">
<div style="position:absolute;left:90px;top:185px;width:260px;height:260px;border-radius:52px;{BG};display:grid;place-items:center"><div style="width:140px;height:140px">{SYM(2)}</div></div>
<div style="position:absolute;left:410px;top:170px;right:60px">
 <div style="font-family:'Liberation Serif','DejaVu Serif',serif;font-weight:700;font-size:84px;color:#1f5a45;line-height:1.05">{A["ad"]}</div>
 <div style="font-family:'FreeSerif','DejaVu Sans',serif;font-size:50px;color:#b08a3e;direction:rtl;text-align:left;margin-top:14px;line-height:1.3"><span dir="rtl">{A["ar"]}</span></div>
 <div style="font-size:30px;color:#6b7068;margin-top:18px;line-height:1.35">{A["alt"]}</div>
</div>
<div style="position:absolute;left:90px;top:44px;display:flex;align-items:center;gap:14px;font-family:'Liberation Serif',serif;font-weight:700;font-size:30px;color:#1f5a45">
 <span style="width:46px;height:46px;border-radius:11px;background:#1f5a45;display:grid;place-items:center"><span style="width:32px;height:21px;display:block">{TAMGA}</span></span>Giray Akademi</div>
</div></body></html>'''
with sync_playwright() as p:
    b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--no-sandbox'])
    pg = b.new_page(viewport={'width': 512, 'height': 512})
    pg.set_content(ICON()); pg.wait_for_timeout(100)
    pg.locator('#c').screenshot(path=str(out / 'icon-512.png'))
    pg = b.new_page(viewport={'width': 1200, 'height': 630})
    pg.set_content(OG); pg.wait_for_timeout(200)
    pg.locator('#c').screenshot(path=str(out / 'og.png'))
    b.close()
from PIL import Image
im = Image.open(out / 'icon-512.png').convert('RGB')
for n, s in [('icon-192.png', 192), ('apple-touch-icon.png', 180), ('favicon-32.png', 32)]:
    im.resize((s, s), Image.LANCZOS).save(out / n, optimize=True)
im.save(out / 'icon-512.png', optimize=True)
y = A['yol']
(out / 'site.webmanifest').write_text(json.dumps({
    "name": A["ad"] + " · Giray Akademi", "short_name": A["ad"], "description": A["alt"],
    "start_url": y, "scope": y, "display": "standalone", "background_color": "#f7f3ea", "theme_color": "#1f5a45", "lang": "tr",
    "icons": [{"src": y + "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any maskable"},
              {"src": y + "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any maskable"}]}, ensure_ascii=False, indent=2), encoding='utf-8')
print('üretildi:', sorted(x.name for x in out.iterdir()))
