# Blood Measure

A research prototype for processing fingertip camera signals on a mobile device.
It extracts a photoplethysmography (PPG) waveform, estimates pulse rate, and
shows an experimental blood-pressure comparison value.

## Features

- Evaluate systolic and diastolic readings
- Classify result as normal, elevated, stage 1 hypertension, stage 2 hypertension, or hypertensive crisis
- Expose a CLI for quick checkups
- Analyze timestamped camera-frame RGB samples and reject unreliable recordings
- Estimate pulse rate from a fingertip PPG waveform

## Important limitation

A phone camera does not directly measure blood pressure. The displayed
systolic/diastolic values are produced by an unvalidated heuristic and are only
for comparison with a physical cuff. They must not be used for diagnosis,
medication, emergencies, or other health decisions. After three saved cuff
comparisons, the app applies bounded, median-based personal offsets to later
estimates. This numerical adjustment does not make the camera result a medical
measurement.

## Quick start

```bash
python -m pip install -e .[dev]
blood-measure 110 70
```

## Mobile camera prototype

Start the local web interface:

```bash
blood-measure-web
```

Then open `http://localhost:8000` in a browser and allow rear-camera access.
Mobile browsers require a secure HTTPS origin for camera access when the page
is hosted on another device. The interface records a 15-second fingertip PPG
sample, reports live signal quality, and estimates pulse rate only.

For HTTPS phone testing or static deployment, follow
[`deploy/README.md`](deploy/README.md). The launcher accepts `--host`, `--port`,
`--certfile`, and `--keyfile` options.

After a successful recording, you can pair it with a validated upper-arm cuff
reading, including the cuff's pulse value. Once three usable pairs are saved,
the interface shows a bounded personally adjusted pulse while preserving the
raw camera value, and uses robust bounded offsets for its experimental pressure
comparison. Up to 100 paired readings and a compact normalized waveform are
stored only in that browser. The history can be exported as JSON for later
personal analysis or model research. Clear the history to reset all personal
adjustments.

When served over HTTPS, supported browsers can install the interface to the
home screen. The application shell works offline after its first successful
load; camera recordings and paired readings remain on the device.

The interface supports English and Simplified Chinese through the language
button in the header. The selected language is remembered in browser storage.

## GitHub Pages

This repository includes an automated Pages workflow. For the intended GitHub
repository, the installed reader will be available at:

```text
https://shrg182.github.io/blood-pressure-measure/
```

In the repository settings, select **Pages → Build and deployment → GitHub
Actions**. Every push to `main` will publish `src/blood_measure/web`.

## Example output

```text
Blood pressure: 110/70 mmHg
Category: Normal
```
