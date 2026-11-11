#!/usr/bin/env python3
"""Build a strictly static release. Never package APIs, credentials or user data."""
import hashlib
import json
import pathlib
import shutil
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
DIST = ROOT / 'rabo-automation-14050729-0.0.3/dist'
FILES = {'index.html', 'manifest.json', 'sw.js', 'Logo.svg', 'Logo-1.svg', 'logo.svg'}
DIRS = {'assets', 'fonts'}

def package(output, revision):
    output = pathlib.Path(output).resolve()
    if output.exists():
        raise SystemExit('Output already exists; choose a new empty path')
    if not (DIST / 'index.html').is_file() or not (DIST / 'assets').is_dir():
        raise SystemExit('Run npm run build first')
    source_files = []
    for p in sorted(DIST.rglob('*')):
        if p.is_symlink():
            raise SystemExit(f'Symlink forbidden: {p}')
        if not p.is_file():
            continue
        rel = p.relative_to(DIST)
        if not (str(rel) in FILES or (len(rel.parts) > 1 and rel.parts[0] in DIRS)):
            raise SystemExit(f'Unexpected build file (not published): {rel}')
        if any(c not in 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_./-' for c in str(rel)):
            raise SystemExit(f'Unsupported filename: {rel}')
        if p.suffix.lower() not in {'.html','.js','.css','.svg','.json','.woff','.woff2','.ttf','.png','.jpg','.jpeg','.webp','.ico'}:
            raise SystemExit(f'Forbidden extension: {rel}')
        source_files.append((p, rel))
    site = output / 'site'
    site.mkdir(parents=True)
    for p, rel in source_files:
        target = site / rel
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(p, target)
    # Bust the old app-shell cache on each release without changing app source.
    sw = site / 'sw.js'
    if sw.exists():
        sw.write_text(sw.read_text().replace("'rabo-app-v1'", json.dumps('rabo-app-' + revision)), encoding='utf-8')
    (site / 'rabo-version.json').write_text(json.dumps({'revision': revision}, indent=2)+'\n')
    lines = []
    for p in sorted(site.rglob('*')):
        if p.is_file():
            lines.append(hashlib.sha256(p.read_bytes()).hexdigest() + '  ' + p.relative_to(site).as_posix())
    (output / 'SHA256SUMS').write_text('\n'.join(lines)+'\n')
    (output / 'deploy').mkdir()
    shutil.copyfile(ROOT / 'deploy/install.sh', output / 'deploy/install.sh')
    shutil.copyfile(ROOT / 'deploy/rabo-deploy.conf.example', output / 'deploy/rabo-deploy.conf.example')
    (output / '.cpanel.yml').write_text('---\ndeployment:\n  tasks:\n    - /bin/bash deploy/install.sh\n')
    shutil.copyfile(ROOT / 'deploy/README_FA.md', output / 'README_FA.md')
    print(f'Static release ready: {output}; revision {revision}; {len(lines)} files')

if __name__ == '__main__':
    package(sys.argv[1], sys.argv[2])
