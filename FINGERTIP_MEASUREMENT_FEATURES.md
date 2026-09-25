# Fingertip Measurement Feature Options / 指尖测量功能选项

This document outlines additional features that could be added to the Blood Measure app using fingertip photoplethysmography (PPG), together with their limitations and recommended implementation order.

本文档概述了可通过指尖光电容积描记法（PPG）添加到 Blood Measure 应用中的其他功能，并说明其局限性和建议的实施顺序。

## Features possible with the existing phone camera / 使用现有手机摄像头可实现的功能

### 1. Standard HRV metrics / 标准心率变异性指标

- Calculate RMSSD, SDNN, pNN50, median beat interval, artifact percentage, and measurement confidence.
- Use the existing 60-second recording and detected beat intervals.
- Describe the result as **pulse-rate variability (PRV)** rather than ECG-derived HRV because PPG measures pulse intervals, not electrical R–R intervals.

- 计算 RMSSD、SDNN、pNN50、中位脉搏间期、伪影比例和测量置信度。
- 使用现有的 60 秒记录和已检测到的逐搏间期。
- 由于 PPG 测量的是脉搏间期，而不是心电图的 R–R 间期，因此应将结果称为**脉率变异性（PRV）**，而不是心电图意义上的 HRV。

### 2. Resting-pulse trends / 静息脉搏趋势

- Show daily and weekly averages, ranges, personal baselines, and deviations from baseline.
- Let users tag readings as resting, after exercise, after caffeine, or associated with symptoms.
- Emphasize personal trends instead of interpreting a single reading as a diagnosis.

- 显示每日和每周平均值、范围、个人基线以及相对基线的变化。
- 允许用户将读数标记为静息、运动后、摄入咖啡因后或伴随症状。
- 强调个人长期趋势，不将单次读数解释为诊断结果。

### 3. Pulse recovery test / 脉搏恢复测试

- Record pulse immediately after a standardized activity and again after one and two minutes.
- Report the BPM reduction and compare it with the user's previous sessions.
- Present it as a personal fitness trend, not a cardiovascular diagnosis.

- 在完成标准化活动后立即测量，并在 1 分钟和 2 分钟后再次测量脉搏。
- 显示 BPM 的下降幅度，并与用户之前的测试进行比较。
- 将其作为个人体能趋势展示，而不是心血管疾病诊断。

### 4. Respiratory-rate estimate / 呼吸频率估计

- Estimate breaths per minute from slow modulation of PPG amplitude and beat timing during a quiet 60–120 second recording.
- Require motion rejection, a confidence score, and an inconclusive result when the respiratory component is weak.
- Treat the result as experimental. Smartphone cameras have been studied for extracting heart rate and respiration, but performance varies with the device and recording conditions ([NIH review](https://pmc.ncbi.nlm.nih.gov/articles/PMC6539461/)).

- 在安静状态下记录 60–120 秒，根据 PPG 振幅和逐搏时间的缓慢调制估算每分钟呼吸次数。
- 必须加入运动伪影剔除、置信度评分，并在呼吸成分较弱时返回“无法确定”。
- 将该结果标记为实验性结果。研究表明手机摄像头可以提取心率和呼吸信息，但性能会随设备和记录条件变化（[NIH 综述](https://pmc.ncbi.nlm.nih.gov/articles/PMC6539461/)）。

### 5. Improved pulse-irregularity screening / 改进的脉搏不规则筛查

- Examine interval outliers, missed beats, alternating patterns, and irregularity over repeated 60–120 second recordings.
- Report only **regular**, **inconclusive**, or **irregular pulse detected**.
- Never report a diagnosis such as atrial fibrillation from camera PPG alone.
- Smartphone PPG has shown promise for atrial-fibrillation screening, but evidence includes heterogeneous, biased studies and false-positive concerns ([systematic review](https://pubmed.ncbi.nlm.nih.gov/35277454/)).

- 在多次 60–120 秒记录中分析异常间期、漏搏、交替模式和不规则程度。
- 仅报告**规则**、**无法确定**或**检测到脉搏不规则**。
- 不得仅根据摄像头 PPG 给出房颤等疾病诊断。
- 手机 PPG 在房颤筛查方面具有潜力，但现有研究存在异质性、偏倚和假阳性问题（[系统综述](https://pubmed.ncbi.nlm.nih.gov/35277454/)）。

### 6. Waveform morphology and repeatability / 波形形态与重复性

- Display an averaged pulse waveform and beat-to-beat waveform consistency.
- Track relative rise time, pulse width, and reflection or notch features.
- Use these measurements for signal-quality feedback or research only.
- Do not convert them directly into arterial stiffness or vascular age without device-specific validation. PPG morphology is associated with vascular aging, but repeatability and clinical utility remain important limitations ([VascAgeNet review](https://pubmed.ncbi.nlm.nih.gov/34951543/)).

- 显示平均脉搏波形和逐搏波形的一致性。
- 跟踪相对上升时间、脉搏宽度以及反射波或重搏切迹特征。
- 这些指标仅用于信号质量反馈或研究用途。
- 未经针对具体设备的验证，不应将这些指标直接换算为动脉硬度或“血管年龄”。PPG 波形形态与血管老化有关，但重复性和临床效用仍存在重要限制（[VascAgeNet 综述](https://pubmed.ncbi.nlm.nih.gov/34951543/)）。

### 7. Relative pulse amplitude and contact guidance / 相对脉搏振幅与接触指导

- Track pulsatile amplitude relative to the optical baseline.
- Use it to detect weak contact, motion, a cold finger, excessive pressure, or poor positioning.
- Label it **signal strength** or **relative pulse amplitude**, not a clinical perfusion index, because camera exposure and finger pressure affect the value.

- 跟踪相对于光学基线的脉动振幅。
- 用于识别接触不足、移动、手指温度过低、压力过大或放置位置不佳。
- 应标记为**信号强度**或**相对脉搏振幅**，而不是临床灌注指数，因为摄像头曝光和手指压力都会影响该数值。

## Features requiring additional hardware / 需要额外硬件的功能

| Feature / 功能 | Requirement and limitation / 要求与限制 |
|---|---|
| Oxygen saturation (SpO2) / 血氧饱和度 | Requires controlled red and infrared wavelengths and device-specific calibration. RGB camera channels and a white phone flash are not a dependable substitute. / 需要受控的红光、红外光和针对设备的校准；RGB 摄像头通道和手机白色闪光灯不能可靠替代。 |
| ECG / 心电图 | Requires an external electrode accessory; it can support rhythm confirmation and more accurate HRV. / 需要外接电极配件，可用于确认心律并提高 HRV 测量准确性。 |
| Skin temperature / 皮肤温度 | Requires an external calibrated temperature sensor. / 需要外接并经过校准的温度传感器。 |
| Pulse transit time / 脉搏传导时间 | Requires a second synchronized signal or measurement location, such as ECG plus fingertip PPG or two PPG sensors. / 需要第二个同步信号或测量位置，例如心电图加指尖 PPG，或两个 PPG 传感器。 |
| Blood pressure / 血压 | Requires a validated cuff or a separately validated and calibrated sensor system. / 需要经过验证的袖带式血压计，或经过独立验证和校准的传感器系统。 |

## Features to avoid with the current hardware / 使用当前硬件时应避免的功能

- Glucose, hemoglobin, cholesterol, hydration, stress hormones, or blood-viscosity estimates
- Clinical oxygen-saturation measurement from RGB video
- Diagnosis of atrial fibrillation or other arrhythmias
- Vascular age presented as a medical measurement
- More precise systolic or diastolic values derived only from pulse-wave shape

- 血糖、血红蛋白、胆固醇、水合状态、压力激素或血液黏度估算
- 通过 RGB 视频进行临床级血氧饱和度测量
- 诊断房颤或其他心律失常
- 将“血管年龄”作为医学测量结果展示
- 仅根据脉搏波形给出更精确的收缩压或舒张压数值

## Recommended implementation order / 建议的实施顺序

1. Standard PRV/HRV metrics with artifact rejection / 带伪影剔除的标准 PRV/HRV 指标
2. Personal pulse and variability trends / 个人脉搏与变异性趋势
3. Experimental respiratory-rate estimate / 实验性呼吸频率估计
4. Pulse recovery workflow / 脉搏恢复测试流程
5. Carefully worded irregular-pulse screening / 谨慎表述的脉搏不规则筛查
6. Waveform morphology research view / 波形形态研究视图

This order reuses the current signal-processing pipeline while prioritizing features that can be explained honestly and tested incrementally.

该顺序能够复用现有的信号处理流程，同时优先实施可以如实解释并逐步验证的功能。

## Important safety limitation / 重要安全限制

A phone camera detects changes in fingertip blood volume; it does not directly measure arterial pressure. Adding more PPG-derived features does not make a camera-derived blood-pressure estimate clinically valid. Health decisions, medication changes, and unusual readings must be confirmed with a validated upper-arm cuff or a qualified clinician.

手机摄像头检测的是指尖血容量变化，并不能直接测量动脉压力。增加更多基于 PPG 的功能，并不会使摄像头推算的血压结果获得临床有效性。任何健康决策、药物调整或异常读数，都必须使用经过验证的上臂式袖带血压计确认，或咨询合格的医疗专业人员。
