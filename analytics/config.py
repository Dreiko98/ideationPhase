from pathlib import Path

SEED = 20260721
N_HOUSEHOLDS = 500
# Fixed cut-off keeps generated CSV/JSON byte-for-byte stable across runs.
DATA_END_DATE = "2026-07-21"

ROOT = Path(__file__).resolve().parent.parent
RAW_DIR = ROOT / "analytics" / "data" / "raw"
PROCESSED_DIR = ROOT / "analytics" / "data" / "processed"
PUBLIC_DATA_DIR = ROOT / "public" / "data"

for _d in [RAW_DIR, PROCESSED_DIR, PUBLIC_DATA_DIR]:
    _d.mkdir(parents=True, exist_ok=True)
