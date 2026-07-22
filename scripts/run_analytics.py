from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from analytics.pipeline import run_pipeline


if __name__ == "__main__":
    out = run_pipeline()
    print("Analytics pipeline completed.")
    for k, v in out.items():
        print(f"{k}: {'records' if isinstance(v, list) else 'object'}")
