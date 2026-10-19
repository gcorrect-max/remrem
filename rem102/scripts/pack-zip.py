#!/usr/bin/env python3
"""Packs rem102/ into downloads/rem102-tools.zip. Raw device captures (may hold credentials) are left out:
results/collected.json, results/samples/, results/discover.json, results/probe.json and logs."""
import os, zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, "downloads", "rem102-tools.zip")
SKIP_FILES = {"rem102/results/collected.json", "rem102/results/discover.json", "rem102/results/probe.json"}
SKIP_PREFIX = ("rem102/results/samples/",)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
if os.path.exists(OUT):
    os.remove(OUT)
n = 0
with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
    for d, dirs, files in os.walk(os.path.join(ROOT, "rem102")):
        dirs[:] = [x for x in dirs if x != "__pycache__"]
        for f in sorted(files):
            p = os.path.join(d, f)
            rel = os.path.relpath(p, ROOT).replace(os.sep, "/")
            if rel in SKIP_FILES or rel.startswith(SKIP_PREFIX) or f.endswith(".log"):
                continue
            zi = zipfile.ZipInfo.from_file(p, rel)
            zi.compress_type = zipfile.ZIP_DEFLATED
            with open(p, "rb") as fh:
                z.writestr(zi, fh.read())
            n += 1
print(n, "files ->", OUT)
