#!/usr/bin/env python3
"""Normalise the RTO export (3 documents) into data/rto.json for pages/rto-viewer.vue.

usage: python3 scripts/build-rto-data.py <RTOs_J01.json> [data/rto.json]
"""
import json, re, sys
from datetime import date, timedelta

def xl_date(v):
    """Excel serial ("46258"), "M/D/YYYY" or hand-typed "DD.MM.YYYY" -> ISO date, else None."""
    v = str(v).strip()
    if re.fullmatch(r'\d{5}', v):
        return (date(1899, 12, 30) + timedelta(days=int(v))).isoformat()
    m = re.fullmatch(r'(\d+)[./](\d+)[./](\d{4})', v)
    if m and int(m.group(1)) > 12:  # hand-typed D.M.YYYY / D/M/YYYY
        return date(int(m.group(3)), int(m.group(2)), int(m.group(1))).isoformat()
    if m and m.group(3) != '1899':
        return date(int(m.group(3)), int(m.group(1)), int(m.group(2))).isoformat()
    return None

def clean(s):
    return re.sub(r'[  ]+', ' ', str(s)).strip()

def parse_history(rows):
    out, started = [], False
    for r in rows:
        if r[0] in ('Revision', 'Rev.') and r[1] == 'Author':
            started = True
            continue
        if started and re.fullmatch(r'A\d+', r[0].strip()):
            out.append({'rev': r[0].strip(), 'author': clean(r[1]),
                        'date': xl_date(r[2]), 'text': r[3].strip()})
    return out

def parse_doc(r):
    ov = r['TestOverview data']
    m = r['Metrics']
    # 047 has two leading label columns and trailing blanks; 046/048 have one.
    off = 3 if ov[0][2] == 'Name:' else 2
    lab, idc = off - 1, off - 2  # label column, step-number column
    hdr = next(i for i, row in enumerate(ov) if 'Model' in row[lab])
    ncols = len(ov[hdr])
    models = []
    for c in range(off, ncols):
        head = ov[hdr][c]
        if not clean(head):
            continue
        parts = [clean(p) for p in head.split('\n')]
        name = parts[0]
        art = [p for p in parts[1:] if p and p != '-' and not re.fullmatch(r'0,\d', p)]
        if 'HaslerRail article number' in ov[hdr + 1][lab]:
            art = [clean(ov[hdr + 1][c])]
        cls = None
        if 'Accuracy Class' in ov[hdr + 1][lab]:
            cls = clean(ov[hdr + 1][c])
        models.append({'col': c, 'name': name, 'art': art, 'accuracyClass': cls})
    steps = []
    first = hdr + 1
    for row in ov[first:]:
        sid, label = clean(row[idc]), clean(row[lab])
        if not label or label in ('HaslerRail article number', 'Accuracy Class'):
            continue
        vals = [clean(row[mm['col']]) for mm in models]
        # step numbers are not unique (047: 4.3.1.2 x3, 4.4 x2) -> keep order + label
        steps.append({'id': sid, 'label': label, 'values': vals})
    for mm in models:
        del mm['col']
    return {
        'id': r['RTO ver (046)'],
        'name': m['Name'], 'revision': m['Revision'],
        'releaser': None if m['Releaser'] in ('0', '') else m['Releaser'],
        'released': xl_date(m['Release Date']),
        'file': m['FileName'],
        'models': models, 'steps': steps,
        'history': parse_history(r['Summary data']),
    }

src = sys.argv[1]
dst = sys.argv[2] if len(sys.argv) > 2 else 'data/rto.json'
d = json.load(open(src))
out = {'updated': f"{d['Last update date']} {d['time']}",
       'documents': [parse_doc(r) for r in d['RTOs data']]}
json.dump(out, open(dst, 'w'), ensure_ascii=False, indent=1)
for x in out['documents']:
    print(x['id'], x['revision'], x['released'], len(x['models']), 'models', len(x['steps']), 'steps', len(x['history']), 'revs')
