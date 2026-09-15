import argparse

from .logic import classify_blood_pressure


def main() -> None:
    parser = argparse.ArgumentParser(description="Classify a blood pressure reading.")
    parser.add_argument("systolic", type=int, help="Systolic blood pressure (mmHg)")
    parser.add_argument("diastolic", type=int, help="Diastolic blood pressure (mmHg)")
    args = parser.parse_args()

    category = classify_blood_pressure(args.systolic, args.diastolic)
    print(f"Blood pressure: {args.systolic}/{args.diastolic} mmHg")
    print(f"Category: {category}")


if __name__ == "__main__":
    main()
