import os
import requests
from calculate_scores import main as run_calculations
from generate_chart import generate_charts

def main():
    print("=== SetQuant Daily Job: Starting calculations ===")
    run_calculations()

    print("=== Generating charts... ===")
    chart_paths = generate_charts()
    print(f"=== {len(chart_paths)} chart(s) generated ===")

    print("=== Firing webhook to Go backend... ===")

    webhook_url = os.environ["WEBHOOK_URL"]
    webhook_secret = os.environ["WEBHOOK_SECRET"]

    resp = requests.post(
        webhook_url,
        headers={"X-SetQuant-Secret": webhook_secret},
        timeout=10,
    )
    resp.raise_for_status()
    print(f"=== Webhook fired successfully — HTTP {resp.status_code} ===")

if __name__ == "__main__":
    main()
