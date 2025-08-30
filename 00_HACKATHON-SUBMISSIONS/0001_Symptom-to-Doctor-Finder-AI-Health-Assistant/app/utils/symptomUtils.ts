// Utility functions for symptom processing and analysis

export interface SymptomKeyword {
  term: string;
  severity: 'low' | 'medium' | 'high';
  urgency: 'routine' | 'soon' | 'urgent' | 'emergency';
  category: string;
}

export const emergencyKeywords: string[] = [
  'chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious', 
  'stroke', 'heart attack', 'can\'t breathe', 'crushing pain', 
  'severe headache', 'worst headache', 'sudden weakness', 'paralysis',
  'severe abdominal pain', 'vomiting blood', 'coughing blood'
];

export const severityKeywords: SymptomKeyword[] = [
  { term: 'severe', severity: 'high', urgency: 'urgent', category: 'intensity' },
  { term: 'excruciating', severity: 'high', urgency: 'emergency', category: 'intensity' },
  { term: 'unbearable', severity: 'high', urgency: 'urgent', category: 'intensity' },
  { term: 'mild', severity: 'low', urgency: 'routine', category: 'intensity' },
  { term: 'moderate', severity: 'medium', urgency: 'soon', category: 'intensity' },
  { term: 'sudden', severity: 'high', urgency: 'urgent', category: 'onset' },
  { term: 'gradual', severity: 'low', urgency: 'routine', category: 'onset' },
  { term: 'chronic', severity: 'medium', urgency: 'soon', category: 'duration' },
  { term: 'persistent', severity: 'medium', urgency: 'soon', category: 'duration' }
];

export function extractSymptomSeverity(symptoms: string): 'low' | 'medium' | 'high' {
  const symptomsLower = symptoms.toLowerCase();
  
  // Check for high severity keywords
  const highSeverityTerms = ['severe', 'excruciating', 'unbearable', 'worst', 'crushing', 'sharp'];
  if (highSeverityTerms.some(term => symptomsLower.includes(term))) {
    return 'high';
  }
  
  // Check for medium severity keywords
  const mediumSeverityTerms = ['moderate', 'persistent', 'chronic', 'constant', 'throbbing'];
  if (mediumSeverityTerms.some(term => symptomsLower.includes(term))) {
    return 'medium';
  }
  
  // Check for low severity keywords
  const lowSeverityTerms = ['mild', 'slight', 'minor', 'occasional'];
  if (lowSeverityTerms.some(term => symptomsLower.includes(term))) {
    return 'low';
  }
  
  return 'medium'; // Default
}

export function extractSymptomUrgency(symptoms: string): 'routine' | 'soon' | 'urgent' | 'emergency' {
  const symptomsLower = symptoms.toLowerCase();
  
  // Check for emergency keywords
  if (emergencyKeywords.some(keyword => symptomsLower.includes(keyword))) {
    return 'emergency';
  }
  
  // Check for urgent keywords
  const urgentTerms = ['severe', 'sudden', 'worsening', 'getting worse', 'can\'t'];
  if (urgentTerms.some(term => symptomsLower.includes(term))) {
    return 'urgent';
  }
  
  // Check for soon keywords
  const soonTerms = ['persistent', 'chronic', 'ongoing', 'recurring'];
  if (soonTerms.some(term => symptomsLower.includes(term))) {
    return 'soon';
  }
  
  return 'routine'; // Default
}

export function parseSymptoms(symptoms: string): string[] {
  // Split by common delimiters and clean up
  return symptoms
    .split(/[,;]|\sand\s|\swith\s/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => s.replace(/^(i have|i feel|experiencing|feeling)\s*/i, ''));
}

export function generateRedFlags(symptoms: string, severity: string, urgency: string): string[] {
  const symptomsLower = symptoms.toLowerCase();
  const redFlags: string[] = [];
  
  if (urgency === 'emergency' || severity === 'high') {
    if (symptomsLower.includes('chest pain')) {
      redFlags.push('Chest pain may indicate heart attack or other serious condition');
    }
    if (symptomsLower.includes('difficulty breathing') || symptomsLower.includes('can\'t breathe')) {
      redFlags.push('Breathing difficulties require immediate medical attention');
    }
    if (symptomsLower.includes('severe headache') || symptomsLower.includes('worst headache')) {
      redFlags.push('Sudden severe headache may indicate stroke or other emergency');
    }
    if (symptomsLower.includes('blood')) {
      redFlags.push('Any bleeding symptoms should be evaluated immediately');
    }
  }
  
  return redFlags;
}

export function generateFollowUpQuestions(symptoms: string): string[] {
  const symptomsLower = symptoms.toLowerCase();
  const questions: string[] = [
    'How long have you been experiencing these symptoms?',
    'Are the symptoms getting better, worse, or staying the same?'
  ];
  
  if (symptomsLower.includes('pain')) {
    questions.push('On a scale of 1-10, how would you rate the pain?');
    questions.push('What makes the pain better or worse?');
  }
  
  if (symptomsLower.includes('fever')) {
    questions.push('What is your exact temperature?');
    questions.push('Have you taken any fever-reducing medication?');
  }
  
  if (symptomsLower.includes('headache')) {
    questions.push('Is this the worst headache you\'ve ever had?');
    questions.push('Any nausea, vomiting, or vision changes with the headache?');
  }
  
  questions.push('Have you taken any medications for these symptoms?');
  questions.push('Do you have any relevant medical history or allergies?');
  
  return questions.slice(0, 5); // Limit to 5 questions
}