def classify_blood_pressure(systolic: int, diastolic: int) -> str:
    """Return the category for a blood pressure reading.

    Based on the standard ACC/AHA ranges for adults:
    - Normal: <120 and <80
    - Elevated: 120-129 and <80
    - Stage 1 Hypertension: 130-139 or 80-89
    - Stage 2 Hypertension: >=140 or >=90
    - Hypertensive Crisis: >180 or >120
    """
    if systolic >= 180 or diastolic >= 120:
        return "Hypertensive Crisis"
    if systolic >= 140 or diastolic >= 90:
        return "Stage 2 Hypertension"
    if systolic >= 130 or diastolic >= 80:
        return "Stage 1 Hypertension"
    if 120 <= systolic <= 129 and diastolic < 80:
        return "Elevated"
    if systolic < 120 and diastolic < 80:
        return "Normal"
    return "Normal"
