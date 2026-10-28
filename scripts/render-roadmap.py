#!/usr/bin/env python3
"""Render the phase table in docs/PLAN.md; this is a view, never another backlog."""
from pathlib import Path
from html import escape
import hashlib
import re
import textwrap

root = Path(__file__).resolve().parent.parent
source = root / 'docs/PLAN.md'
text = source.read_text()
rows = re.findall(r'^\| ([0-6]\..*?) \| (.*?) \| (.*?) \|$', text, re.M)
if len(rows) != 7:
    raise SystemExit('Expected all seven canonical phases; refusing an empty roadmap.')

# Stage status comes from the live-tasks block (stage-N-… rows); the first stage that is
# neither in review nor done is drawn as NOW.
status = {int(n): st for n, st in re.findall(r'^\| stage-(\d)-[a-z-]+ \| ([a-z]+) \|', text, re.M)}
current = next((i for i in range(7) if status.get(i, 'queued') not in ('review', 'done')), 6)
order = [current] + [i for i in range(7) if i != current]

parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="1160" viewBox="0 0 1440 1160">',
 '<defs><linearGradient id="bg" x2="1" y2="1"><stop stop-color="#07121e"/><stop offset="1" stop-color="#142832"/></linearGradient></defs>',
 '<rect width="1440" height="1160" fill="url(#bg)"/>']

def label(x, y, value, size=16, color='#c7d9dc', weight=400):
    parts.append(f'<text x="{x}" y="{y}" fill="{color}" font-family="DejaVu Sans,sans-serif" font-size="{size}" font-weight="{weight}">{escape(value)}</text>')

def lines(x, y, value, width=45, size=16, color='#abc3c9', limit=6):
    wrapped = textwrap.wrap(value, width)
    if len(wrapped) > limit:
        wrapped = wrapped[:limit]
        wrapped[-1] = wrapped[-1].rstrip(' .') + '…'
    for i, line in enumerate(wrapped):
        label(x, y+i*(size+7), line, size, color)
    return len(wrapped)*(size+7)

label(60, 52, 'LYCHEETAH / BLACK CURRENT', 15, '#8acbc5', 700)
label(60, 112, 'THE FORGE ROUTE', 48, '#f0e3bf', 700)
label(60, 152, 'One route: foundation → scale → arsenal → climb → interface → wide dark → capital endgame', 21, '#9dded0')
parts.append('<rect x="60" y="182" width="1320" height="180" rx="12" fill="#163337" stroke="#a18a55"/>')
label(84, 215, f'NOW · STAGE {current} OF THE MASTER ROUTE', 14, '#f0cb7d', 700)
label(84, 254, rows[current][0], 28, '#f4e8c9', 700)
lines(84, 286, rows[current][1], 100, 18, '#c8e0dc', 2)
lines(84, 325, rows[current][2], 142, 13, '#9fbdbd', 2)

colors = ['#8cd7c8', '#e6bd76', '#8cb9e5', '#bd9ae3', '#8ccbb3', '#e0a475']
for i, stage in enumerate(order[1:]):
    title, outcome, gate = rows[stage]
    x, y = 60+(i%3)*448, 396+(i//3)*314
    color=colors[i]
    parts.append(f'<rect x="{x}" y="{y}" width="424" height="290" rx="10" fill="#10232d" stroke="#35535d"/><rect x="{x}" y="{y}" width="424" height="5" rx="2" fill="{color}"/>')
    st = status.get(stage, 'queued')
    label(x+20, y+34, 'IN REVIEW · MAC TO PLAY' if st == 'review' else 'DONE' if st == 'done' else 'NEXT' if stage == current + 1 else 'QUEUED', 11, color, 700)
    used=lines(x+20, y+68, title, 28, 23, '#e3e9e1', 2)
    used=lines(x+20, y+76+used, outcome, 44, 15, '#bad1d5', 3)
    label(x+20, y+192, 'PROOF BEFORE MOVING ON', 10, color, 700)
    lines(x+20, y+214, gate, 54, 12, '#8eabb4', 4)

label(60, 1080, 'AFTER THE ROUTE', 12, '#c8a6ef', 700)
label(60, 1110, 'AI escorts → private two-player co-op · hull paths · optional mechanics (parked, not deleted)', 17, '#c8d9df')
label(60, 1141, 'Source: docs/PLAN.md · sequence, not delivery dates · '+hashlib.sha256(source.read_bytes()).hexdigest()[:12], 11, '#73949f')
parts.append('</svg>')
svg='\n'.join(parts)
target=root/'docs/FORGE_ROADMAP.svg';target.write_text(svg+'\n')
print(target)
try:
    import cairosvg
    png=target.with_suffix('.png');cairosvg.svg2png(bytestring=svg.encode(),write_to=str(png));print(png)
except ImportError:
    # Render our own simple SVG primitives locally; no browser or dependency
    # download is needed for this generated planning diagram.
    import xml.etree.ElementTree as ET
    from PIL import Image, ImageDraw, ImageFont
    image=Image.new('RGB',(1440,1160),'#0d1e2a');draw=ImageDraw.Draw(image)
    fonts=Path('/usr/share/fonts/truetype/dejavu')
    for element in ET.fromstring(svg):
        a=element.attrib;tag=element.tag.rsplit('}',1)[-1]
        if tag=='rect':
            x,y,w,h=(float(a.get(k,0)) for k in ['x','y','width','height'])
            fill=a.get('fill','#10232d');fill='#0d1e2a' if fill.startswith('url(') else fill
            draw.rounded_rectangle((x,y,x+w,y+h),radius=float(a.get('rx',0)),fill=fill,outline=a.get('stroke'))
        elif tag=='text':
            face='DejaVuSans-Bold.ttf' if int(a.get('font-weight',400))>=700 else 'DejaVuSans.ttf'
            font=ImageFont.truetype(str(fonts/face),int(a['font-size']))
            draw.text((float(a['x']),float(a['y'])),element.text or '',font=font,fill=a['fill'],anchor='ls')
    png=target.with_suffix('.png');image.save(png);print(png)
