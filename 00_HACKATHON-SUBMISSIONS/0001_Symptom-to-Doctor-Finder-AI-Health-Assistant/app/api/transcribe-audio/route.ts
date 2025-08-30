import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return NextResponse.json({ error: 'No audio file provided' }, { status: 400 })
    }

    // Validate file type - be more lenient with MIME types
    const validTypes = ['audio/', 'video/webm', 'video/mp4'] // Some browsers send webm as video/webm
    const isValidType = validTypes.some(type => audioFile.type.startsWith(type))
    
    if (!isValidType && audioFile.type !== '') {
      console.warn('Unexpected file type:', audioFile.type, 'but proceeding anyway')
    }

    // Check file size (limit to 25MB for Whisper API)
    if (audioFile.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File too large. Please keep recordings under 25MB.' }, { status: 400 })
    }

    console.log(`Processing audio file: ${audioFile.name}, size: ${audioFile.size} bytes, type: ${audioFile.type}`)

    // Check if OpenAI API key is available
    const openaiApiKey = process.env.OPENAI_API_KEY
    
    if (!openaiApiKey) {
      console.warn('OpenAI API key not found, using fallback message')
      return NextResponse.json({
        transcript: "Speech-to-text service is not configured. Please use the live speech recognition feature in your browser or type your symptoms manually.",
        success: false,
        message: 'OpenAI API key not configured - use browser speech recognition instead'
      })
    }

    try {
      // Convert audio file to proper format for OpenAI Whisper
      const audioBuffer = await audioFile.arrayBuffer()
      
      // Create form data for OpenAI API
      const whisperFormData = new FormData()
      
      // Create a new File object with proper extension
      let fileName = 'audio.webm'
      if (audioFile.type.includes('mp4')) {
        fileName = 'audio.mp4'
      } else if (audioFile.type.includes('wav')) {
        fileName = 'audio.wav'
      } else if (audioFile.type.includes('m4a')) {
        fileName = 'audio.m4a'
      }
      
      const audioBlob = new Blob([audioBuffer], { type: audioFile.type })
      whisperFormData.append('file', audioBlob, fileName)
      whisperFormData.append('model', 'whisper-1')
      whisperFormData.append('language', 'en') // Specify English for better accuracy
      whisperFormData.append('response_format', 'json')
      whisperFormData.append('temperature', '0') // Lower temperature for more consistent results

      console.log('Sending audio to OpenAI Whisper API...')

      // Call OpenAI Whisper API
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
        },
        body: whisperFormData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('OpenAI API error:', response.status, errorText)
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`)
      }

      const transcriptionResult = await response.json()
      console.log('Transcription successful:', transcriptionResult.text?.substring(0, 100) + '...')

      if (!transcriptionResult.text) {
        throw new Error('No transcription text received from OpenAI')
      }

      return NextResponse.json({
        transcript: transcriptionResult.text.trim(),
        success: true,
        message: 'Audio transcribed successfully using OpenAI Whisper'
      })

    } catch (whisperError) {
      console.error('Whisper API error:', whisperError)
      
      // Fallback to a more helpful message
      return NextResponse.json({
        transcript: "I couldn't transcribe your audio. Please try speaking more clearly or type your symptoms manually.",
        success: false,
        message: 'Transcription failed - please try again or type manually',
        error: whisperError instanceof Error ? whisperError.message : 'Unknown transcription error'
      })
    }

  } catch (error) {
    console.error('Transcription error:', error)
    return NextResponse.json(
      { 
        error: 'Failed to transcribe audio. Please try again or type your symptoms manually.',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}