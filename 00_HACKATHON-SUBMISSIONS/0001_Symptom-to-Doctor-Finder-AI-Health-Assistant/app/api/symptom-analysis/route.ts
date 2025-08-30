import { NextRequest, NextResponse } from 'next/server'
import {
  extractSymptomSeverity,
  extractSymptomUrgency,
  parseSymptoms,
  generateRedFlags,
  generateFollowUpQuestions
} from '../../utils/symptomUtils'

export async function POST(request: NextRequest) {
  try {
    const { symptoms } = await request.json()

    if (!symptoms || typeof symptoms !== 'string') {
      return NextResponse.json({ error: 'Valid symptoms description is required' }, { status: 400 })
    }

    if (symptoms.length > 500) {
      return NextResponse.json({ error: 'Symptoms description too long (max 500 characters)' }, { status: 400 })
    }

    // Try Ollama first, fall back to enhanced rules
    let analysis
    try {
      console.log('Attempting to connect to Ollama...')
      analysis = await analyzeWithOllama(symptoms)
      console.log('Ollama analysis successful!')
    } catch (ollamaError) {
      console.error('Ollama error details:', ollamaError)
      console.log('Ollama unavailable, using enhanced rule-based analysis')
      analysis = analyzeSymptomsWithEnhancedRules(symptoms)
    }

    return NextResponse.json({ analysis })
  } catch (error) {
    console.error('Error in symptom analysis:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function analyzeWithOllama(symptoms: string): Promise<any> {
  const ollamaUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
  console.log('Connecting to Ollama at:', ollamaUrl)

  const prompt = `Analyze symptoms: "${symptoms}"

Respond with valid JSON only:
{
"symptoms": ["symptom1", "symptom2"],
"possibleConditions": ["condition1", "condition2"],
"severity": "low",
"urgency": "routine", 
"recommendations": ["rest", "see doctor"],
"doctorTypes": ["Primary Care Physician"],
"confidence": 0.7,
"redFlags": [],
"followUpQuestions": ["How long?", "Getting worse?"]
}`

  console.log('Sending request to Ollama with model: llama3:latest')
  
  const response = await fetch(`${ollamaUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3:latest',
      prompt,
      stream: false,
      options: {
        temperature: 0.3,
        top_p: 0.9
      }
    }),
    signal: AbortSignal.timeout(30000) // 30 second timeout
  })

  console.log('Ollama response status:', response.status)
  
  if (!response.ok) {
    const errorText = await response.text()
    console.error('Ollama API error response:', errorText)
    throw new Error(`Ollama API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  console.log('Raw Ollama response:', data.response)

  try {
    // Try to parse the JSON response
    let jsonResponse = data.response.trim()
    
    // Remove markdown code blocks
    if (jsonResponse.includes('```')) {
      jsonResponse = jsonResponse.replace(/```json\s*/g, '').replace(/```\s*/g, '')
    }
    
    // Extract JSON object
    const firstBrace = jsonResponse.indexOf('{')
    const lastBrace = jsonResponse.lastIndexOf('}')
    
    if (firstBrace !== -1 && lastBrace !== -1) {
      jsonResponse = jsonResponse.substring(firstBrace, lastBrace + 1)
    }
    
    // Try to fix common JSON issues
    jsonResponse = jsonResponse
      .replace(/,\s*}/g, '}')  // Remove trailing commas
      .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
      .replace(/([{,]\s*)(\w+):/g, '$1"$2":')  // Quote unquoted keys
    
    console.log('Cleaned JSON:', jsonResponse)
    
    const parsed = JSON.parse(jsonResponse)
    
    // Validate required fields
    if (!parsed.symptoms || !parsed.possibleConditions || !parsed.severity) {
      throw new Error('Missing required fields in JSON response')
    }
    
    console.log('Successfully parsed Ollama JSON response')
    return parsed
  } catch (parseError) {
    console.error('JSON parse error:', parseError)
    console.log('Failed to parse response, falling back to rule-based analysis')
    throw new Error('Invalid JSON response from Ollama')
  }
}

function analyzeSymptomsWithEnhancedRules(symptoms: string): any {
  const symptomsLower = symptoms.toLowerCase()

  // Define symptom patterns and their analysis
  const symptomPatterns = [
    {
      patterns: ['chest pain', 'chest tightness', 'heart pain', 'angina', 'crushing chest pain'],
      conditions: ['Angina', 'Heart attack', 'Costochondritis', 'Anxiety', 'Pulmonary embolism'],
      severity: 'high',
      urgency: 'emergency',
      doctorTypes: ['Emergency Medicine', 'Cardiology'],
      recommendations: [
        'Call 911 immediately',
        'Chew aspirin if not allergic',
        'Do not drive yourself to hospital',
        'Stay calm and rest until help arrives'
      ],
      redFlags: ['Chest pain with shortness of breath', 'Pain radiating to arm or jaw'],
      followUpQuestions: ['Is the pain crushing or squeezing?', 'Does it radiate to your arm or jaw?'],
      confidence: 0.9
    },
    {
      patterns: ['headache', 'migraine', 'head pain', 'severe headache', 'worst headache'],
      conditions: ['Tension headache', 'Migraine', 'Cluster headache', 'Sinus headache', 'Meningitis'],
      severity: symptomsLower.includes('severe') || symptomsLower.includes('worst') ? 'high' : 'medium',
      urgency: symptomsLower.includes('severe') || symptomsLower.includes('worst') ? 'urgent' : 'soon',
      doctorTypes: ['Primary Care Physician (PCP)', 'Neurology', 'Emergency Medicine'],
      recommendations: [
        'Rest in a quiet, dark room',
        'Stay hydrated',
        'Apply cold or warm compress',
        'Avoid triggers like bright lights',
        'See doctor if sudden, severe, or with fever'
      ],
      redFlags: symptomsLower.includes('severe') ? ['Sudden severe headache', 'Headache with fever and stiff neck'] : [],
      followUpQuestions: ['How long have you had this headache?', 'Is this the worst headache of your life?', 'Any fever or neck stiffness?'],
      confidence: 0.8
    },
    {
      patterns: ['fever', 'high temperature', 'hot', 'chills', 'sweating'],
      conditions: ['Viral infection', 'Bacterial infection', 'Flu', 'COVID-19', 'Sepsis'],
      severity: symptomsLower.includes('high fever') || symptomsLower.includes('104') ? 'high' : 'medium',
      urgency: symptomsLower.includes('high fever') || symptomsLower.includes('104') ? 'urgent' : 'soon',
      doctorTypes: ['Primary Care Physician (PCP)', 'Emergency Medicine'],
      recommendations: [
        'Rest and stay hydrated',
        'Monitor temperature regularly',
        'Take fever-reducing medication as directed',
        'Isolate if infectious disease suspected',
        'Seek immediate care if fever >103°F (39.4°C)'
      ],
      redFlags: symptomsLower.includes('high fever') ? ['Fever above 103°F', 'Fever with severe headache or rash'] : [],
      followUpQuestions: ['What is your exact temperature?', 'How long have you had the fever?', 'Any other symptoms like rash or difficulty breathing?'],
      confidence: 0.7
    },
    {
      patterns: ['abdominal pain', 'stomach pain', 'belly pain', 'cramps'],
      conditions: ['Gastritis', 'Food poisoning', 'Appendicitis', 'Irritable bowel syndrome'],
      severity: 'medium',
      urgency: 'soon',
      doctorTypes: ['Primary Care Physician (PCP)', 'Gastroenterology', 'Emergency Medicine'],
      recommendations: [
        'Avoid solid foods initially',
        'Stay hydrated with clear liquids',
        'Seek immediate care if pain is severe or localized'
      ]
    },
    {
      patterns: ['shortness of breath', 'difficulty breathing', 'breathing problems', 'can\'t breathe', 'gasping'],
      conditions: ['Asthma', 'Anxiety', 'Pneumonia', 'Heart problems', 'Pulmonary embolism', 'COPD'],
      severity: 'high',
      urgency: 'emergency',
      doctorTypes: ['Emergency Medicine', 'Cardiology', 'Pulmonology'],
      recommendations: [
        'Call 911 immediately if severe',
        'Sit upright and try to stay calm',
        'Use rescue inhaler if prescribed',
        'Loosen tight clothing',
        'Do not lie flat'
      ],
      redFlags: ['Severe difficulty breathing', 'Blue lips or fingernails', 'Cannot speak in full sentences'],
      followUpQuestions: ['Can you speak in full sentences?', 'Do you have a rescue inhaler?', 'Any chest pain with the breathing difficulty?'],
      confidence: 0.9
    },
    {
      patterns: ['joint pain', 'arthritis', 'knee pain', 'hip pain'],
      conditions: ['Osteoarthritis', 'Rheumatoid arthritis', 'Bursitis', 'Tendonitis'],
      severity: 'medium',
      urgency: 'routine',
      doctorTypes: ['Primary Care Physician (PCP)', 'Orthopedics', 'Rheumatology'],
      recommendations: [
        'Rest the affected joint',
        'Apply ice or heat as appropriate',
        'Consider over-the-counter pain relievers',
        'Schedule appointment with specialist'
      ]
    },
    {
      patterns: ['rash', 'skin rash', 'hives', 'itching', 'red spots'],
      conditions: ['Allergic reaction', 'Eczema', 'Psoriasis', 'Contact dermatitis', 'Viral rash'],
      severity: symptomsLower.includes('severe') || symptomsLower.includes('spreading') ? 'medium' : 'low',
      urgency: symptomsLower.includes('severe') || symptomsLower.includes('spreading') ? 'soon' : 'routine',
      doctorTypes: ['Primary Care Physician (PCP)', 'Dermatology'],
      recommendations: [
        'Avoid scratching',
        'Use gentle, fragrance-free products',
        'Apply cool compresses',
        'Take antihistamines if allergic reaction',
        'See doctor if rash is severe or spreading'
      ],
      redFlags: symptomsLower.includes('severe') ? ['Rapidly spreading rash', 'Rash with difficulty breathing'] : [],
      followUpQuestions: ['Is the rash spreading?', 'Any new medications or foods recently?', 'Any difficulty breathing or swelling?'],
      confidence: 0.6
    },
    {
      patterns: ['nausea', 'vomiting', 'throwing up', 'sick to stomach'],
      conditions: ['Gastroenteritis', 'Food poisoning', 'Migraine', 'Pregnancy', 'Medication side effect'],
      severity: symptomsLower.includes('severe') || symptomsLower.includes('blood') ? 'high' : 'medium',
      urgency: symptomsLower.includes('severe') || symptomsLower.includes('blood') ? 'urgent' : 'soon',
      doctorTypes: ['Primary Care Physician (PCP)', 'Gastroenterology', 'Emergency Medicine'],
      recommendations: [
        'Stay hydrated with small sips of clear fluids',
        'Rest and avoid solid foods initially',
        'Try ginger or peppermint for nausea',
        'Seek care if unable to keep fluids down'
      ],
      redFlags: symptomsLower.includes('blood') ? ['Vomiting blood', 'Severe dehydration'] : [],
      followUpQuestions: ['Any blood in vomit?', 'Can you keep fluids down?', 'Any severe abdominal pain?'],
      confidence: 0.7
    },
    {
      patterns: ['dizziness', 'lightheaded', 'vertigo', 'spinning'],
      conditions: ['Inner ear problem', 'Low blood pressure', 'Dehydration', 'Medication side effect', 'Vertigo'],
      severity: 'medium',
      urgency: 'soon',
      doctorTypes: ['Primary Care Physician (PCP)', 'ENT (Ear, Nose, Throat)', 'Neurology'],
      recommendations: [
        'Sit or lie down immediately',
        'Stay hydrated',
        'Avoid sudden movements',
        'Check blood pressure if possible'
      ],
      redFlags: ['Dizziness with chest pain', 'Sudden severe dizziness with headache'],
      followUpQuestions: ['Any hearing changes?', 'Recent medication changes?', 'Any chest pain or palpitations?'],
      confidence: 0.6
    }
  ]

  // Find matching patterns
  let matchedPattern = null
  for (const pattern of symptomPatterns) {
    if (pattern.patterns.some(p => symptomsLower.includes(p))) {
      matchedPattern = pattern
      break
    }
  }

  // Default analysis if no specific pattern matches
  if (!matchedPattern) {
    const defaultSeverity = extractSymptomSeverity(symptoms);
    const defaultUrgency = extractSymptomUrgency(symptoms);

    return {
      symptoms: parseSymptoms(symptoms),
      possibleConditions: ['General symptoms requiring evaluation', 'Possible viral infection', 'Stress-related symptoms'],
      severity: defaultSeverity,
      recommendations: [
        'Monitor symptoms for 24-48 hours',
        'Rest and stay hydrated',
        'Consider over-the-counter remedies if appropriate',
        'See primary care physician if symptoms persist or worsen'
      ],
      doctorTypes: ['Primary Care Physician (PCP)'],
      urgency: defaultUrgency,
      confidence: 0.4,
      redFlags: generateRedFlags(symptoms, defaultSeverity, defaultUrgency),
      followUpQuestions: generateFollowUpQuestions(symptoms)
    }
  }

  return {
    symptoms: parseSymptoms(symptoms),
    possibleConditions: matchedPattern.conditions,
    severity: matchedPattern.severity,
    recommendations: matchedPattern.recommendations,
    doctorTypes: matchedPattern.doctorTypes,
    urgency: matchedPattern.urgency,
    confidence: matchedPattern.confidence,
    redFlags: matchedPattern.redFlags || generateRedFlags(symptoms, matchedPattern.severity, matchedPattern.urgency),
    followUpQuestions: matchedPattern.followUpQuestions || generateFollowUpQuestions(symptoms)
  }
}
