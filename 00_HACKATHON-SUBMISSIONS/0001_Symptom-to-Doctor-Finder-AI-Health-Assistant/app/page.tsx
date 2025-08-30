'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

// Dynamically import the 3D component to avoid SSR issues
const Welcome3D = dynamic(() => import('../components/Welcome3D').catch(() => import('../components/Welcome3DSimple')), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
        <p className="text-xl text-gray-600">Loading Experience...</p>
      </div>
    </div>
  )
})

interface SymptomAnalysis {
  symptoms: string[]
  possibleConditions: string[]
  severity: 'low' | 'medium' | 'high'
  recommendations: string[]
  doctorTypes: string[]
  urgency: 'routine' | 'soon' | 'urgent' | 'emergency'
  confidence: number
  redFlags: string[]
  followUpQuestions: string[]
  dietSuggestions?: {
    foods: string[]
    avoid: string[]
    supplements: string[]
    hydration: string[]
  }
}

export default function SymptomDoctorFinder() {
  const [symptoms, setSymptoms] = useState('')
  const [loading, setLoading] = useState(false)
  const [analysis, setAnalysis] = useState<SymptomAnalysis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showEmergencyAlert, setShowEmergencyAlert] = useState(false)
  const [showWelcome, setShowWelcome] = useState(true)
  const [generatingPDF, setGeneratingPDF] = useState(false)
  const [isListening, setIsListening] = useState(false)
  const [speechRecognition, setSpeechRecognition] = useState<any>(null)

  const analyzeSymptoms = async () => {
    if (!symptoms.trim()) return

    setLoading(true)
    setError(null)

    // Check for emergency keywords
    const emergencyKeywords = ['chest pain', 'difficulty breathing', 'severe bleeding', 'unconscious', 'stroke', 'heart attack']
    const hasEmergency = emergencyKeywords.some(keyword =>
      symptoms.toLowerCase().includes(keyword)
    )

    if (hasEmergency) {
      setShowEmergencyAlert(true)
    }

    try {
      const response = await fetch('/api/symptom-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symptoms })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.analysis) {
        setAnalysis(data.analysis)
      }
    } catch (error) {
      console.error('Error analyzing symptoms:', error)
      setError(error instanceof Error ? error.message : 'Failed to analyze symptoms')

      // Fallback analysis
      const symptomsList = symptoms.split(/[,;]/).map(s => s.trim()).filter(s => s)
      setAnalysis({
        symptoms: symptomsList,
        possibleConditions: ['General symptoms requiring medical evaluation'],
        severity: 'medium',
        recommendations: [
          'Consult with a healthcare professional for proper evaluation',
          'Monitor symptoms and note any changes',
          'Seek immediate care if symptoms worsen'
        ],
        doctorTypes: ['Primary Care Physician (PCP)'],
        urgency: 'soon',
        confidence: 0.3,
        redFlags: [],
        followUpQuestions: ['How long have you had these symptoms?', 'Have symptoms gotten worse?']
      })
    }
    setLoading(false)
  }



  // Browser-based speech recognition
  const startLiveSpeechRecognition = () => {
    // Check for speech recognition support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError('Speech recognition is not supported in your browser. Please use Chrome, Edge, or Safari for the best experience, or type your symptoms manually.')
      return
    }

    try {
      const recognition = new SpeechRecognition()

      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = 'en-US'
      recognition.maxAlternatives = 1

      recognition.onstart = () => {
        setIsListening(true)
        setError(null)
        console.log('Speech recognition started')
      }

      recognition.onresult = (event: any) => {
        let finalTranscript = ''

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript
          }
        }

        if (finalTranscript) {
          setSymptoms(prev => {
            const newText = prev ? prev + ' ' + finalTranscript : finalTranscript
            return newText.trim()
          })
        }
      }

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error)
        let errorMessage = 'Speech recognition error occurred. '

        switch (event.error) {
          case 'no-speech':
            errorMessage += 'No speech was detected. Please try speaking again.'
            break
          case 'audio-capture':
            errorMessage += 'No microphone was found. Please check your microphone connection.'
            break
          case 'not-allowed':
            errorMessage += 'Microphone access was denied. Please allow microphone permissions.'
            break
          case 'network':
            errorMessage += 'Network error occurred. Please check your internet connection.'
            break
          default:
            errorMessage += 'Please try again or type your symptoms manually.'
        }

        setError(errorMessage)
        setIsListening(false)
        setSpeechRecognition(null)
      }

      recognition.onend = () => {
        setIsListening(false)
        setSpeechRecognition(null)
        console.log('Speech recognition ended')
      }

      recognition.start()
      setSpeechRecognition(recognition)

    } catch (error) {
      console.error('Error starting speech recognition:', error)
      setError('Failed to start speech recognition. Please try typing your symptoms manually.')
    }
  }

  const stopLiveSpeechRecognition = () => {
    if (speechRecognition) {
      speechRecognition.stop()
      setSpeechRecognition(null)
      setIsListening(false)
    }
  }

  const generatePDF = async () => {
    if (!analysis) return

    setGeneratingPDF(true)

    try {
      const jsPDF = (await import('jspdf')).default

      const doc = new jsPDF()
      const pageWidth = doc.internal.pageSize.getWidth()
      const margin = 20
      let yPosition = margin

      const addText = (text: string, fontSize: number = 12, isBold: boolean = false) => {
        doc.setFontSize(fontSize)
        if (isBold) {
          doc.setFont('helvetica', 'bold')
        } else {
          doc.setFont('helvetica', 'normal')
        }

        const lines = doc.splitTextToSize(text, pageWidth - 2 * margin)
        doc.text(lines, margin, yPosition)
        yPosition += lines.length * (fontSize * 0.4) + 5

        if (yPosition > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage()
          yPosition = margin
        }
      }

      // Header
      doc.setFillColor(59, 130, 246)
      doc.rect(0, 0, pageWidth, 40, 'F')
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(20)
      doc.setFont('helvetica', 'bold')
      doc.text('Symptom to Doctor Finder - Analysis Report', margin, 25)

      yPosition = 60
      doc.setTextColor(0, 0, 0)

      addText(`Generated on: ${new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })}`, 10)

      yPosition += 10

      addText('REPORTED SYMPTOMS', 16, true)
      addText(symptoms, 12)
      yPosition += 5

      addText('IDENTIFIED SYMPTOMS', 16, true)
      addText(analysis.symptoms.join(', '), 12)
      yPosition += 5

      addText('ASSESSMENT', 16, true)
      addText(`Severity Level: ${analysis.severity.toUpperCase()}`, 12, true)
      addText(`Urgency: ${analysis.urgency.toUpperCase()}`, 12, true)
      addText(`Confidence Score: ${Math.round(analysis.confidence * 100)}%`, 12, true)
      yPosition += 5

      addText('POSSIBLE CONDITIONS', 16, true)
      analysis.possibleConditions.forEach((condition, index) => {
        addText(`${index + 1}. ${condition}`, 12)
      })
      yPosition += 5

      addText('RECOMMENDED HEALTHCARE PROVIDERS', 16, true)
      analysis.doctorTypes.forEach((doctor, index) => {
        addText(`${index + 1}. ${doctor}`, 12)
      })
      yPosition += 5

      addText('RECOMMENDATIONS', 16, true)
      analysis.recommendations.forEach((rec, index) => {
        addText(`${index + 1}. ${rec}`, 12)
      })
      yPosition += 5

      if (analysis.redFlags && analysis.redFlags.length > 0) {
        addText('RED FLAGS - SEEK IMMEDIATE ATTENTION', 16, true)
        doc.setTextColor(220, 38, 38)
        analysis.redFlags.forEach((flag, index) => {
          addText(`⚠️ ${flag}`, 12, true)
        })
        doc.setTextColor(0, 0, 0)
        yPosition += 5
      }

      if (analysis.followUpQuestions && analysis.followUpQuestions.length > 0) {
        addText('FOLLOW-UP QUESTIONS FOR YOUR DOCTOR', 16, true)
        analysis.followUpQuestions.forEach((question, index) => {
          addText(`${index + 1}. ${question}`, 12)
        })
        yPosition += 5
      }

      if (analysis.dietSuggestions) {
        addText('DIETARY SUGGESTIONS', 16, true)

        if (analysis.dietSuggestions.foods && analysis.dietSuggestions.foods.length > 0) {
          addText('Recommended Foods:', 14, true)
          addText(analysis.dietSuggestions.foods.join(', '), 12)
        }

        if (analysis.dietSuggestions.avoid && analysis.dietSuggestions.avoid.length > 0) {
          addText('Foods to Avoid:', 14, true)
          addText(analysis.dietSuggestions.avoid.join(', '), 12)
        }

        if (analysis.dietSuggestions.supplements && analysis.dietSuggestions.supplements.length > 0) {
          addText('Suggested Supplements:', 14, true)
          addText(analysis.dietSuggestions.supplements.join(', '), 12)
        }

        if (analysis.dietSuggestions.hydration && analysis.dietSuggestions.hydration.length > 0) {
          addText('Hydration Recommendations:', 14, true)
          addText(analysis.dietSuggestions.hydration.join(', '), 12)
        }
        yPosition += 5
      }

      yPosition += 10
      doc.setFillColor(239, 68, 68)
      doc.rect(margin - 5, yPosition - 5, pageWidth - 2 * margin + 10, 40, 'F')
      doc.setTextColor(255, 255, 255)
      addText('IMPORTANT MEDICAL DISCLAIMER', 14, true)
      addText('This AI-generated analysis is for informational purposes only and should not replace professional medical advice, diagnosis, or treatment. Always consult with qualified healthcare providers for medical concerns. In case of emergency, call 911 immediately.', 10)

      const fileName = `symptom-analysis-report-${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)

    } catch (error) {
      console.error('Error generating PDF:', error)
      setError('Failed to generate PDF. Please try again.')
    }

    setGeneratingPDF(false)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'from-red-500 to-red-600 text-white'
      case 'medium': return 'from-yellow-500 to-orange-500 text-white'
      default: return 'from-green-500 to-emerald-500 text-white'
    }
  }

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency': return 'from-red-600 to-red-700 text-white'
      case 'urgent': return 'from-orange-500 to-red-500 text-white'
      case 'soon': return 'from-yellow-500 to-orange-500 text-white'
      default: return 'from-green-500 to-emerald-500 text-white'
    }
  }

  return (
    <>
      {/* 3D Welcome Screen */}
      {showWelcome && (
        <Welcome3D onEnter={() => setShowWelcome(false)} />
      )}
      
      {/* Main App */}
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative overflow-hidden transition-all duration-500 ${showWelcome ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-purple-600/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-emerald-400/20 to-blue-600/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-purple-400/10 to-pink-600/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Emergency Alert Modal */}
      {showEmergencyAlert && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-red-200 animate-scale-in">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6 animate-pulse">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-red-600 mb-4">Emergency Symptoms Detected</h2>
              <p className="text-gray-600 mb-6">
                Your symptoms may require immediate medical attention.
              </p>
              <div className="space-y-3 mb-8 text-left bg-red-50 p-6 rounded-2xl">
                <div className="flex items-center text-red-700 font-medium">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></div>
                  Call 911 or emergency services
                </div>
                <div className="flex items-center text-red-700 font-medium">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></div>
                  Go to the nearest emergency room
                </div>
                <div className="flex items-center text-red-700 font-medium">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></div>
                  Contact your doctor immediately
                </div>
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowEmergencyAlert(false)}
                  className="flex-1 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-all duration-200 font-medium hover:scale-105"
                >
                  Continue Analysis
                </button>
                <a
                  href="tel:911"
                  className="flex-1 px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white rounded-2xl transition-all duration-200 text-center font-medium hover:scale-105 shadow-lg"
                >
                  Call 911
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 max-w-4xl relative z-10">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-2xl mb-4 shadow-xl animate-float">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 via-blue-900 to-purple-900 bg-clip-text text-transparent mb-3">
            Symptom to Doctor Finder
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Describe your symptoms and get personalized healthcare recommendations
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden animate-slide-up">
          {!analysis ? (
            /* Input Section */
            <div className="p-6">
              <div className="mb-6">
                <label className="block text-xl font-bold text-gray-900 mb-4 text-center">
                  How are you feeling today?
                </label>

                {/* Voice Input */}
                <div className="mb-6 p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl border border-emerald-200">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-bold text-emerald-900 flex items-center">
                      <div className="w-6 h-6 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center mr-2">
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                      </div>
                      Voice Input
                    </h3>
                    {!isListening ? (
                      <button
                        onClick={startLiveSpeechRecognition}
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl font-medium transition-all duration-200 hover:scale-105 shadow-lg"
                      >
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                        </svg>
                        Start Speaking
                      </button>
                    ) : (
                      <button
                        onClick={stopLiveSpeechRecognition}
                        className="flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-medium transition-all duration-200 animate-pulse shadow-lg"
                      >
                        <div className="w-3 h-3 bg-white rounded-full mr-2 animate-pulse"></div>
                        Stop Listening
                      </button>
                    )}
                  </div>
                  <p className="text-sm text-emerald-700 mb-3">
                    Speak directly and see your words appear in real-time. Works in Chrome, Edge, and Safari.
                  </p>

                  {/* Compact Tips */}
                  <div className="text-xs text-emerald-600 grid grid-cols-2 gap-2">
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
                      Speak clearly
                    </div>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
                      Quiet environment
                    </div>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
                      Include duration
                    </div>
                    <div className="flex items-center">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-2"></div>
                      Describe location
                    </div>
                  </div>
                </div>

                {/* Text Input */}
                <div className="relative">
                  <textarea
                    value={symptoms}
                    onChange={(e) => setSymptoms(e.target.value)}
                    placeholder="Describe your symptoms in detail... (e.g., headache for 2 days, fever, nausea)"
                    className="w-full h-32 p-4 border-2 border-gray-200 rounded-2xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none text-gray-900 placeholder-gray-500 leading-relaxed transition-all duration-200 bg-white/50 backdrop-blur-sm"
                  />
                  {isListening && (
                    <div className="absolute top-3 right-3 flex items-center space-x-2 bg-emerald-100 px-2 py-1 rounded-full">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                      <span className="text-emerald-700 text-xs font-medium">Listening...</span>
                    </div>
                  )}
                </div>
              </div>

              {error && (
                <div className="mb-4 p-4 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl animate-shake">
                  <div className="flex items-center">
                    <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p className="text-red-700 font-medium text-sm">{error}</p>
                  </div>
                </div>
              )}

              <button
                onClick={analyzeSymptoms}
                disabled={loading || !symptoms.trim()}
                className="w-full py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-800 text-white rounded-2xl font-bold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98] shadow-xl"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                    Analyzing Your Symptoms...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Analyze Symptoms
                  </div>
                )}
              </button>
            </div>
          ) : (
            /* Results Section */
            <div className="p-6 animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent">
                  Analysis Results
                </h2>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={generatePDF}
                    disabled={generatingPDF}
                    className="flex items-center px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl transition-all duration-200 disabled:opacity-50 font-medium hover:scale-105 shadow-lg text-sm"
                  >
                    {generatingPDF ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        PDF
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      setAnalysis(null)
                      setSymptoms('')
                      setError(null)
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-gray-100 to-gray-200 hover:from-gray-200 hover:to-gray-300 text-gray-700 rounded-xl transition-all duration-200 font-medium hover:scale-105 text-sm"
                  >
                    New Analysis
                  </button>
                </div>
              </div>

              <div className="grid gap-4">
                {/* Severity & Urgency */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className={`p-4 rounded-xl bg-gradient-to-br ${getSeverityColor(analysis.severity)} shadow-md transform hover:scale-105 transition-all duration-200`}>
                    <h3 className="font-bold mb-1">Severity Level</h3>
                    <p className="text-xl font-bold capitalize">{analysis.severity}</p>
                  </div>
                  <div className={`p-4 rounded-xl bg-gradient-to-br ${getUrgencyColor(analysis.urgency)} shadow-md transform hover:scale-105 transition-all duration-200`}>
                    <h3 className="font-bold mb-1">Urgency</h3>
                    <p className="text-xl font-bold capitalize">{analysis.urgency}</p>
                  </div>
                </div>

                {/* Symptoms */}
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-4 rounded-2xl border border-blue-200 shadow-md">
                  <h3 className="text-lg font-bold text-blue-900 mb-3 flex items-center">
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-3">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    Identified Symptoms
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.symptoms.map((symptom, index) => (
                      <span key={index} className="px-3 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full text-sm font-medium border border-blue-200 hover:scale-105 transition-transform duration-200">
                        {symptom}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Possible Conditions */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-8 rounded-3xl border border-purple-200 shadow-lg">
                  <h3 className="text-2xl font-bold text-purple-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-4">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    Possible Conditions
                  </h3>
                  <div className="space-y-4">
                    {analysis.possibleConditions.map((condition, index) => (
                      <div key={index} className="flex items-center p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-purple-100 hover:scale-105 transition-all duration-200">
                        <div className="w-3 h-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full mr-4"></div>
                        <span className="text-purple-800 font-medium">{condition}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommended Doctors */}
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 p-8 rounded-3xl border border-emerald-200 shadow-lg">
                  <h3 className="text-2xl font-bold text-emerald-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-600 rounded-full flex items-center justify-center mr-4">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    Recommended Healthcare Providers
                  </h3>
                  <div className="grid gap-4">
                    {analysis.doctorTypes.map((doctor, index) => (
                      <div key={index} className="flex items-center p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-emerald-100 hover:scale-105 transition-all duration-200 shadow-sm">
                        <div className="w-12 h-12 bg-gradient-to-r from-emerald-100 to-green-100 rounded-2xl flex items-center justify-center mr-4">
                          <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <span className="text-emerald-800 font-bold text-lg">{doctor}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="bg-gradient-to-br from-amber-50 to-yellow-50 p-8 rounded-3xl border border-amber-200 shadow-lg">
                  <h3 className="text-2xl font-bold text-amber-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-full flex items-center justify-center mr-4">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    Recommendations
                  </h3>
                  <div className="space-y-4">
                    {analysis.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-amber-100 hover:scale-105 transition-all duration-200">
                        <div className="w-6 h-6 bg-gradient-to-r from-amber-500 to-yellow-600 rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        <span className="text-amber-800 font-medium leading-relaxed">{rec}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Red Flags */}
                {analysis.redFlags && analysis.redFlags.length > 0 && (
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 p-8 rounded-3xl border border-red-200 shadow-lg animate-pulse">
                    <h3 className="text-2xl font-bold text-red-900 mb-6 flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mr-4">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                      </div>
                      Red Flags - Seek Immediate Attention
                    </h3>
                    <div className="space-y-4">
                      {analysis.redFlags.map((flag, index) => (
                        <div key={index} className="flex items-start p-4 bg-red-100/60 backdrop-blur-sm rounded-2xl border border-red-200">
                          <div className="w-6 h-6 bg-gradient-to-r from-red-500 to-red-600 rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                            <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </div>
                          <span className="text-red-800 font-bold leading-relaxed">{flag}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Follow-up Questions */}
                {analysis.followUpQuestions && analysis.followUpQuestions.length > 0 && (
                  <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-8 rounded-3xl border border-indigo-200 shadow-lg">
                    <h3 className="text-2xl font-bold text-indigo-900 mb-6 flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center mr-4">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      Questions for Your Doctor
                    </h3>
                    <div className="space-y-4">
                      {analysis.followUpQuestions.map((question, index) => (
                        <div key={index} className="flex items-start p-4 bg-white/60 backdrop-blur-sm rounded-2xl border border-indigo-100 hover:scale-105 transition-all duration-200">
                          <div className="w-6 h-6 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-full flex items-center justify-center mr-4 mt-1 flex-shrink-0">
                            <span className="text-white text-xs font-bold">{index + 1}</span>
                          </div>
                          <span className="text-indigo-800 font-medium leading-relaxed">{question}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Diet Suggestions */}
                {analysis.dietSuggestions && (
                  <div className="bg-gradient-to-br from-orange-50 to-red-50 p-8 rounded-3xl border border-orange-200 shadow-lg">
                    <h3 className="text-2xl font-bold text-orange-900 mb-6 flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-red-600 rounded-full flex items-center justify-center mr-4">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                      </div>
                      Dietary Suggestions
                    </h3>
                    <div className="grid lg:grid-cols-2 gap-6">
                      {analysis.dietSuggestions.foods && analysis.dietSuggestions.foods.length > 0 && (
                        <div className="p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-green-100">
                          <h4 className="font-bold text-green-800 mb-4 text-lg">Recommended Foods</h4>
                          <div className="flex flex-wrap gap-2">
                            {analysis.dietSuggestions.foods.map((food, index) => (
                              <span key={index} className="px-3 py-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 rounded-full text-sm font-medium border border-green-200 hover:scale-105 transition-transform duration-200">
                                {food}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      {analysis.dietSuggestions.avoid && analysis.dietSuggestions.avoid.length > 0 && (
                        <div className="p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-red-100">
                          <h4 className="font-bold text-red-800 mb-4 text-lg">Foods to Avoid</h4>
                          <div className="flex flex-wrap gap-2">
                            {analysis.dietSuggestions.avoid.map((food, index) => (
                              <span key={index} className="px-3 py-2 bg-gradient-to-r from-red-100 to-pink-100 text-red-800 rounded-full text-sm font-medium border border-red-200 hover:scale-105 transition-transform duration-200">
                                {food}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    {analysis.dietSuggestions.supplements && analysis.dietSuggestions.supplements.length > 0 && (
                      <div className="mt-6 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-purple-100">
                        <h4 className="font-bold text-purple-800 mb-4 text-lg">Suggested Supplements</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysis.dietSuggestions.supplements.map((supplement, index) => (
                            <span key={index} className="px-3 py-2 bg-gradient-to-r from-purple-100 to-indigo-100 text-purple-800 rounded-full text-sm font-medium border border-purple-200 hover:scale-105 transition-transform duration-200">
                              {supplement}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.dietSuggestions.hydration && analysis.dietSuggestions.hydration.length > 0 && (
                      <div className="mt-6 p-6 bg-white/60 backdrop-blur-sm rounded-2xl border border-blue-100">
                        <h4 className="font-bold text-blue-800 mb-4 text-lg">Hydration Recommendations</h4>
                        <div className="flex flex-wrap gap-2">
                          {analysis.dietSuggestions.hydration.map((drink, index) => (
                            <span key={index} className="px-3 py-2 bg-gradient-to-r from-blue-100 to-cyan-100 text-blue-800 rounded-full text-sm font-medium border border-blue-200 hover:scale-105 transition-transform duration-200">
                              {drink}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Confidence Score */}
                <div className="bg-gradient-to-br from-slate-50 to-gray-50 p-8 rounded-3xl border border-gray-200 shadow-lg">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center mr-4">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    Analysis Confidence
                  </h3>
                  <div className="flex items-center mb-4">
                    <div className="flex-1 bg-gray-200 rounded-full h-4 mr-6 overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-600 h-4 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${analysis.confidence * 100}%` }}
                      ></div>
                    </div>
                    <span className="text-2xl font-bold text-gray-700">{Math.round(analysis.confidence * 100)}%</span>
                  </div>
                  <p className="text-gray-600 leading-relaxed bg-white/60 backdrop-blur-sm p-4 rounded-2xl border border-gray-100">
                    This analysis is for informational purposes only. Always consult with a healthcare professional for medical advice.
                  </p>
                </div>

                {/* PDF Download Section */}
                <div className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-8 rounded-3xl border border-blue-200 shadow-lg">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mr-4">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    Download Complete Report
                  </h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Get a comprehensive PDF report including all analysis details, recommendations, and medical disclaimers.
                  </p>
                  <div className="bg-white/60 backdrop-blur-sm p-6 rounded-2xl border border-gray-200 mb-6">
                    <h4 className="font-bold text-gray-800 mb-4 text-lg">Report includes:</h4>
                    <div className="grid md:grid-cols-2 gap-3 text-sm text-gray-600">
                      <div className="flex items-center">
                        <div className="w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        Complete symptom analysis
                      </div>
                      <div className="flex items-center">
                        <div className="w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        Healthcare provider recommendations
                      </div>
                      <div className="flex items-center">
                        <div className="w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        Personalized recommendations
                      </div>
                      <div className="flex items-center">
                        <div className="w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        Questions for your doctor
                      </div>
                      <div className="flex items-center">
                        <div className="w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        Dietary suggestions
                      </div>
                      <div className="flex items-center">
                        <div className="w-5 h-5 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-3">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                        Medical disclaimers
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={generatePDF}
                    disabled={generatingPDF}
                    className="w-full flex items-center justify-center px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-800 text-white rounded-3xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transform hover:scale-[1.02] active:scale-[0.98] shadow-2xl"
                  >
                    {generatingPDF ? (
                      <>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-4"></div>
                        Generating PDF Report...
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6 mr-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Download PDF Report
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className="mt-6 p-4 bg-gradient-to-r from-gray-50 to-slate-50 rounded-2xl border border-gray-200 shadow-md animate-fade-in-up">
          <div className="flex items-start">
            <div className="w-8 h-8 bg-gradient-to-r from-gray-500 to-gray-600 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-gray-900 mb-2 text-lg">Important Medical Disclaimer</h3>
              <p className="text-gray-600 text-sm leading-relaxed">
                This AI assistant provides general health information and should not replace professional medical advice, diagnosis, or treatment.
                Always consult with qualified healthcare providers for medical concerns. In case of emergency, call 911 immediately.
              </p>
            </div>
          </div>
        </div>
      </div>
      </div>
    </>
  )
}