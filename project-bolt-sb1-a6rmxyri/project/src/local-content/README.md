# Local Video Content

Place your local MP4 (or WebM) files into the following folders so the landing page and dashboard can pick them up automatically:

- `hero/` – files appear in the landing hero slider
- `lp-grid/` – files populate the 4×4 gallery on the landing page
- `dashboard/<category>/<age>/<gender>/` – category specific clips shown in the dashboard. Supported top-level folders: `beauty`, `fitness`, `haircare`, `business`, `lifestyle`. Age folders are optional (`teen`, `twenties`, `thirties`, `forties`, `fifties`, etc.) and gender folders are optional (`female`, `male`, `mixed`). Example: `dashboard/beauty/twenties/female/clip.mp4`.
- Beauty clips can optionally include sub-category hints (`skincare`, `haircare`, `oralcare`) in the filename or folder name to auto-tag the asset, e.g. `skincare_moisture.mp4`.

File names are converted into display titles by replacing hyphens/underscores with spaces. Age/gender folder names are converted into filter tags automatically (`teen` → `10代`, `female` → `女性` など)。Add or remove files at any time; Vite will detect the change and hot-reload the UI.

If you add new categories for the dashboard, make sure to also expose them in the dashboard category definitions.
