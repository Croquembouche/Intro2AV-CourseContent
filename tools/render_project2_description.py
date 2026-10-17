#!/usr/bin/env python3
"""Run the bundled renderer in an existing compatible container on this host."""
from pathlib import Path
import argparse
import subprocess


ROOT = Path(__file__).resolve().parents[1]
RUNTIME = Path('/home/william/.cache/codex-runtimes/codex-primary-runtime/dependencies')
SKILL = Path('/home/william/.codex/plugins/cache/openai-primary-runtime/documents/26.1004.11800/skills/documents')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--project-number', choices=['2', '2.2'], default='2')
    slug = parser.parse_args().project_number.replace('.', '_')
    command = ['docker', 'run', '--rm', '--network', 'none', '--entrypoint', str(RUNTIME / 'python/bin/python3')]
    # This local image supplies glibc 2.39 required by bundled LibreOffice.
    # Mount only the additional shared libraries, never the host's older libc.
    import os
    command += ['--user', f'{os.getuid()}:{os.getgid()}', '-e', 'LD_LIBRARY_PATH=/compat', '-e', 'HOME=/tmp',
                '-e', f'PATH={RUNTIME}/python/bin:{RUNTIME}/bin/override:/usr/bin:/bin']
    for path in [ROOT, RUNTIME, SKILL]:
        command += ['-v', f'{path}:{path}' + ('' if path == ROOT else ':ro')]
    command += ['-v', '/usr/share/fonts:/usr/share/fonts:ro']
    for name in ['libnss3.so', 'libnspr4.so', 'libsmime3.so', 'libplc4.so', 'libplds4.so',
                 'libnssutil3.so', 'libsoftokn3.so', 'libfreebl3.so', 'libfreeblpriv3.so',
                 'libnssckbi.so', 'libnssdbm3.so', 'liblcms2.so.2', 'libpixman-1.so.0']:
        path = Path('/usr/lib/x86_64-linux-gnu') / name
        if not path.is_file():
            path = path.parent / 'nss' / name
        if not path.is_file():
            raise FileNotFoundError(path)
        command += ['--mount', f'type=bind,source={path},target=/compat/{name},readonly']
    command += ['gradle:9.3.1-jdk17', str(SKILL / 'render_docx.py'),
                str(ROOT / f'output/docx/Project{slug}_Description.docx'), '--output_dir',
                str(ROOT / f'tmp/docx/project{slug}/render'), '--emit_pdf', '--verbose']
    subprocess.run(command, check=True)


if __name__ == '__main__':
    main()
