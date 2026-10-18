#!/usr/bin/env python3
"""Builds the package list from the device's OWN menu files (rem102/data/device-config/Config/*.json).

Outputs (rem102/data/):
  rem102-packages.tsv          index, name, tab, id, cgi, query, request, method, min_level, requires, label, cyclic_ms, note
  rem102-package-names.txt     one name (tab.id) per line   -> enum items in LabVIEW
  rem102-package-requests.txt  one request per line, same order -> string array indexed by the enum value

Only read queries are included: the "query" field of every menu leaf. Never "set", "set1", "set2", reboot,
export, restore-default and upload pages (query=0). "~" in a query is written as "&".

Usage: python3 rem102/scripts/build-packages.py
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CFG = os.path.join(ROOT, "data", "device-config", "Config")
TABS = ["home", "monitoring", "setup", "advanced"]

def slug(s):
    return re.sub(r"_+", "_", re.sub(r"[^a-z0-9]+", "_", s.lower())).strip("_")

def load(tab):
    with open(os.path.join(CFG, tab + ".json"), encoding="utf-8-sig") as f:
        return json.loads(f.read().replace("\t", " "))

rows, features, feat_seen = [], [], {}
for tab in TABS:
    for menu in load(tab):
        mlabel = menu.get("label", "")
        en = None
        if menu.get("en_cgi") and menu.get("en_query"):
            en = (menu["en_cgi"], menu["en_query"])
            if en not in feat_seen:
                fid = slug(mlabel)
                feat_seen[en] = fid
                features.append((fid, en, f"{mlabel} enabled?"))
        for it in menu.get("submenu", []):
            cgi, query = it.get("cgi", ""), it.get("query", "")
            if not cgi or not query or query == "query=0":
                continue   # export/reboot/restore-default (no query) and upload pages (query=0)
            label = it.get("label", "")
            pid = slug(mlabel) if slug(label) == slug(mlabel) else f"{slug(mlabel)}_{slug(label)}"
            note = "the menu also uses the same query for writing (set)" if it.get("set") == query else ""
            rows.append(dict(tab=tab, id=pid, cgi=cgi, query=query.replace("~", "&"),
                             min_level=str(it.get("show_level", 0)),
                             requires=("features." + feat_seen[en]) if en else "",
                             label=f"{tab.capitalize()} > {mlabel} > {label}" if label != mlabel else f"{tab.capitalize()} > {mlabel}",
                             cyclic_ms=str(it.get("cyclicTime", 0)), note=note))
for fid, (cgi, query), label in features:
    rows.append(dict(tab="features", id=fid, cgi=cgi, query=query, min_level="0", requires="",
                     label=label, cyclic_ms="0", note=""))

names = [f'{r["tab"]}.{r["id"]}' for r in rows]
assert len(set(names)) == len(names), "duplicate package names"
hdr = ["index", "name", "tab", "id", "cgi", "query", "request", "method", "min_level", "requires", "label", "cyclic_ms", "note"]
def w(name, text):
    with open(os.path.join(ROOT, "data", name), "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
w("rem102-packages.tsv", "\t".join(hdr) + "\n" + "".join(
    "\t".join([str(i), names[i], r["tab"], r["id"], r["cgi"], r["query"], f'{r["cgi"]}?{r["query"]}', "GET",
               r["min_level"], r["requires"], r["label"], r["cyclic_ms"], r["note"]]) + "\n" for i, r in enumerate(rows)))
w("rem102-package-names.txt", "".join(n + "\n" for n in names))
w("rem102-package-requests.txt", "".join(f'{r["cgi"]}?{r["query"]}\n' for r in rows))
print(len(rows), "packages:", {t: sum(1 for r in rows if r["tab"] == t) for t in TABS + ["features"]})
