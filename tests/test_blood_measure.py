from blood_measure.logic import classify_blood_pressure


def test_normal_reading():
    assert classify_blood_pressure(110, 70) == "Normal"


def test_elevated_reading():
    assert classify_blood_pressure(120, 79) == "Elevated"


def test_stage_1_hypertension():
    assert classify_blood_pressure(130, 80) == "Stage 1 Hypertension"


def test_stage_2_hypertension():
    assert classify_blood_pressure(140, 90) == "Stage 2 Hypertension"


def test_hypertensive_crisis():
    assert classify_blood_pressure(180, 120) == "Hypertensive Crisis"
