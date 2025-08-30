# Test Symptoms for Validation

Use these test cases to validate the improved symptom analysis:

## Emergency Cases
- "severe chest pain, difficulty breathing, crushing sensation"
- "worst headache of my life, sudden onset"
- "can't breathe, severe shortness of breath"
- "vomiting blood, severe abdominal pain"

## High Severity Cases
- "severe migraine, nausea, sensitivity to light"
- "high fever 104°F, severe headache"
- "sharp abdominal pain, getting worse"

## Medium Severity Cases
- "persistent headache for 3 days, moderate pain"
- "chronic joint pain, stiffness in morning"
- "recurring nausea, loss of appetite"

## Low Severity Cases
- "mild headache, occasional"
- "slight rash on arm, not spreading"
- "minor cough, no fever"

## Complex Cases
- "chest pain when exercising, shortness of breath, family history of heart disease"
- "dizziness, nausea, ringing in ears, balance problems"
- "joint pain in multiple locations, morning stiffness, fatigue"

Expected behaviors:
- Emergency cases should trigger emergency alert modal
- Analysis should include confidence scores
- Red flags should be identified for serious symptoms
- Follow-up questions should be relevant to symptoms
- Symptom history should be saved and accessible