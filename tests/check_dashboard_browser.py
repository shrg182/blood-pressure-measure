"""Run dashboard/storage regression checks in an isolated headless Chrome profile.

Usage: python tests/check_dashboard_browser.py /path/to/chrome
No access to the user's existing browser profile or saved readings is needed.
"""
from pathlib import Path
import subprocess
import sys
import tempfile

WEB = Path(__file__).resolve().parents[1] / "src/blood_measure/web"
CHECKS = r"""
const STORE = 'blood-measure-sessions-v1';
const CUFF = 'blood-measure-paired-readings-v1';
const PULSE = 'blood-measure-pulse-sessions-v1';
const cuff = {recordedAt:'2026-10-11T10:00:00Z',cuff:{systolic:120,diastolic:80,pulse:70}};
const pulse = {recordedAt:cuff.recordedAt,bpm:70};
const current = (type, data) => ({id:`${type}:${data.recordedAt}`,type,recordedAt:data.recordedAt,data});
const records = [current('cuff-comparison', cuff), current('pulse-analysis', pulse)];
const results = [];
function check(condition, message) { if (!condition) throw Error(message); }
function seed(values) {
  localStorage.clear();
  Object.entries(values).forEach(([key,value]) => localStorage.setItem(key, JSON.stringify(value)));
}
function verify(all, cuffs, pulses) {
  renderSummary();
  check(document.querySelector('#totalCount').textContent === String(all), 'total count');
  check(document.querySelector('#cuffCount').textContent === String(cuffs), 'cuff count');
  check(document.querySelector('#pulseCount').textContent === String(pulses), 'pulse count');
  if (all) check(document.querySelector('#recentList').children.length === all, 'recent rows');
  else check(document.querySelector('#recentSection').hidden, 'empty history hidden');
}
function run(name, action) { action(); results.push(name); }
try {
  for (const [name, values] of Object.entries({
    legacy:{[CUFF]:[cuff],[PULSE]:[pulse]},
    consolidated:{[STORE]:records},
    mixed:{[STORE]:records,[CUFF]:[cuff],[PULSE]:[pulse]},
  })) run(name, () => { seed(values); verify(2,1,1); });
  run('repeat migration and late legacy writes', () => {
    seed({[CUFF]:[cuff],[PULSE]:[pulse]}); verify(2,1,1);
    const saved = localStorage.getItem(STORE);
    verify(2,1,1); check(localStorage.getItem(STORE) === saved, 'repeat changed destination');
    localStorage.setItem(PULSE, JSON.stringify([pulse,{...pulse,recordedAt:'2026-10-11T11:00:00Z'}]));
    verify(3,1,2);
  });
  run('conflicting payloads', () => {
    seed({[STORE]:records,[CUFF]:[{...cuff,cuff:{...cuff.cuff,systolic:121}}]});
    verify(3,2,1); verify(3,2,1);
  });
  run('targeted clear', () => {
    seed({[STORE]:[...records,current('camera-measurement',{recordedAt:cuff.recordedAt})],[CUFF]:[cuff],[PULSE]:[pulse]});
    window.BloodMeasureStore.removeType('camera-measurement'); verify(2,1,1);
    window.BloodMeasureStore.removeType('cuff-comparison'); verify(1,0,1);
    check(localStorage.getItem(CUFF) === null, 'cuff legacy not cleared');
    check(localStorage.getItem(PULSE) !== null, 'pulse legacy incorrectly cleared');
    window.BloodMeasureStore.removeType('pulse-analysis'); verify(0,0,0);
  });
  run('failed write, localized status, and retry', () => {
    seed({[CUFF]:[cuff],[PULSE]:[pulse]});
    const before = [localStorage.getItem(CUFF),localStorage.getItem(PULSE)];
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key,value) {
      if (key === STORE) throw new DOMException('Test quota failure','QuotaExceededError');
      return original.call(this,key,value);
    };
    try {
      language = 'en'; verify(2,1,1);
      const status = document.querySelector('#migrationStatus');
      check(!status.hidden && status.textContent.includes('migration is incomplete'), 'English failure status');
      language = 'zh'; applyLanguage();
      check(!status.hidden && status.textContent.includes('迁移尚未完成'), 'Chinese failure status');
      check(before[0] === localStorage.getItem(CUFF) && before[1] === localStorage.getItem(PULSE), 'legacy data changed');
    } finally { Storage.prototype.setItem = original; }
    language = 'en'; applyLanguage(); verify(2,1,1);
    check(document.querySelector('#migrationStatus').hidden, 'status not cleared after retry');
  });
  document.body.dataset.browserTests = 'passed';
  document.body.dataset.browserTestCount = results.length;
} catch (error) {
  document.body.dataset.browserTests = 'failed';
  document.body.dataset.browserTestError = error.stack;
}
"""


def main():
    chrome = sys.argv[1]
    html = WEB.joinpath("dashboard.html").read_text()
    # Inline local assets; omit PWA registration in the disposable fixture.
    for name in ("pwa-bootstrap.js", "version.js", "measurement-store.js", "dashboard.js"):
        source = "" if name == "pwa-bootstrap.js" else WEB.joinpath(name).read_text()
        html = html.replace(f'<script src="{name}"></script>', f"<script>{source}</script>")
    html = html.replace('</body>', f'<script>{CHECKS}</script></body>')
    with tempfile.TemporaryDirectory(prefix="blood-dashboard-browser-") as temp:
        fixture = Path(temp) / "dashboard.html"
        fixture.write_text(html)
        result = subprocess.run(
            [chrome, "--headless=new", "--disable-gpu", "--no-first-run",
             "--no-default-browser-check", "--disable-background-networking",
             "--disable-component-update", "--disable-extensions", "--disable-sync",
             "--password-store=basic", "--use-mock-keychain", "--timeout=15000",
             f"--user-data-dir={temp}/profile", "--dump-dom", fixture.as_uri()],
            capture_output=True, text=True, timeout=45,
        )
        if result.returncode or 'data-browser-tests="passed"' not in result.stdout:
            print(result.stdout)
            print(result.stderr, file=sys.stderr)
            raise SystemExit(result.returncode or 1)
        print("PASS: 7 real Chrome dashboard scenarios; isolated profile and fixture removed.")


if __name__ == "__main__":
    main()
