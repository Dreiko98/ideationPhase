from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from analytics.synthetic import generate_synthetic_data


if __name__ == "__main__":
    data = generate_synthetic_data()
    print("Synthetic data generated.")
    for name, frame in data.items():
        print(f"{name}: {len(frame)} rows")
