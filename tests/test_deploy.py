import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]

class DeploymentTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.base = Path(self.tmp.name)
        self.home = self.base / 'home'
        self.web = self.home / 'public_html'
        self.web.mkdir(parents=True)
        self.release = self.base / 'release'
        (self.release / 'deploy').mkdir(parents=True)
        shutil.copyfile(ROOT/'deploy/install.sh', self.release/'deploy/install.sh')
        self.config = self.home/'rabo-deploy.conf'
        self.config.write_text(f"RABO_WEBROOT='{self.web}'\n")
        self.env = dict(os.environ, HOME=str(self.home), RABO_CONFIG_FILE=str(self.config))
        self.protected = {'api/config.php':'private-config', 'uploads/customer.pdf':'customer-file',
                          'data/live.bin':'live-data', '.htaccess':'hosting-rules', '.env':'private-env'}
        for path, content in self.protected.items():
            target=self.web/path; target.parent.mkdir(parents=True, exist_ok=True); target.write_text(content)
        (self.web/'index.html').write_text('old-index')
        (self.web/'assets').mkdir()
        (self.web/'assets/old.js').write_text('old-code')
        self.write_release({'index.html':'new-index', 'assets/new.js':'new-code',
                            'fonts/demo.woff2':'font', 'rabo-version.json':'{"revision":"new"}'})

    def tearDown(self):
        self.tmp.cleanup()

    def write_release(self, files):
        site=self.release/'site'
        if site.exists(): shutil.rmtree(site)
        site.mkdir()
        lines=[]
        for path, content in files.items():
            p=site/path; p.parent.mkdir(parents=True, exist_ok=True); p.write_text(content)
            lines.append(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+path)
        (self.release/'SHA256SUMS').write_text('\n'.join(lines)+'\n')

    def run_installer(self, action='deploy'):
        return subprocess.run(['bash', str(self.release/'deploy/install.sh'), action], env=self.env, capture_output=True, text=True)

    def assert_protected(self):
        for path, content in self.protected.items(): self.assertEqual((self.web/path).read_text(),content)

    def test_deploy_preserves_user_data_and_previous_assets(self):
        result=self.run_installer(); self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual((self.web/'index.html').read_text(),'new-index')
        self.assertTrue((self.web/'assets/old.js').exists())
        self.assertEqual((self.web/'fonts').stat().st_mode & 0o777,0o755)
        self.assertEqual((self.web/'assets/new.js').stat().st_mode & 0o777,0o644)
        self.assert_protected()

    def test_rollback_restores_real_previous_frontend(self):
        self.assertEqual(self.run_installer().returncode,0)
        result=self.run_installer('rollback'); self.assertEqual(result.returncode,0,result.stderr)
        self.assertEqual((self.web/'index.html').read_text(),'old-index')
        self.assertFalse((self.web/'rabo-version.json').exists())
        self.assert_protected()

    def test_rejects_tampered_bundle_before_touching_site(self):
        (self.release/'site/assets/new.js').write_text('tampered')
        result=self.run_installer(); self.assertNotEqual(result.returncode,0)
        self.assertEqual((self.web/'index.html').read_text(),'old-index')
        self.assertFalse((self.web/'assets/new.js').exists())
        self.assert_protected()

    def test_rejects_backend_even_with_valid_checksum(self):
        self.write_release({'index.html':'bad-index','api/config.php':'overwrite'})
        self.assertNotEqual(self.run_installer().returncode,0)
        self.assertEqual((self.web/'index.html').read_text(),'old-index')
        self.assert_protected()

    def test_rejects_symlink_destination(self):
        shutil.rmtree(self.web/'assets')
        (self.web/'assets').symlink_to(self.web/'uploads',target_is_directory=True)
        self.assertNotEqual(self.run_installer().returncode,0)
        self.assert_protected()

    def test_rejects_missing_config(self):
        self.config.unlink()
        self.assertNotEqual(self.run_installer().returncode,0)
        self.assert_protected()

    def test_rejects_path_traversal(self):
        self.write_release({'index.html':'bad-index','../escape.js':'escape'})
        self.assertNotEqual(self.run_installer().returncode,0)
        self.assertEqual((self.web/'index.html').read_text(),'old-index')

    def test_rejects_snapshot_for_another_website(self):
        self.assertEqual(self.run_installer().returncode,0)
        other=self.home/'other'; other.mkdir(); (other/'index.html').write_text('other')
        self.config.write_text(f"RABO_WEBROOT='{other}'\n")
        self.assertNotEqual(self.run_installer('rollback').returncode,0)
        self.assertEqual((other/'index.html').read_text(),'other')

if __name__ == '__main__': unittest.main()
