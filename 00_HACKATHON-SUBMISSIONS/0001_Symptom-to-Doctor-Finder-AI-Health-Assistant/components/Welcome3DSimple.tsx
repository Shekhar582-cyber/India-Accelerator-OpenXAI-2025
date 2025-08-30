'use client'

import { useState } from 'react'

interface Welcome3DSimpleProps {
  onEnter: () => void
}

export default function Welcome3DSimple({ onEnter }: Welcome3DSimpleProps) {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 flex flex-col items-center justify-center z-50">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-20 left-20 w-32 h-32 bg-blue-400/20 rounded-full animate-bounce delay-0"></div>
        <div className="absolute top-40 right-32 w-24 h-24 bg-purple-400/20 rounded-full animate-bounce delay-300"></div>
        <div className="absolute bottom-32 left-40 w-28 h-28 bg-indigo-400/20 rounded-full animate-bounce delay-700"></div>
        <div className="absolute bottom-20 right-20 w-20 h-20 bg-pink-400/20 rounded-full animate-bounce delay-1000"></div>
      </div>
      
      {/* Main Content */}
      <div className="text-center px-8 max-w-2xl relative z-10">
        {/* Animated Logo */}
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-indigo-600 rounded-3xl mb-6 shadow-2xl animate-pulse">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 bg-clip-text text-transparent mb-6 animate-fade-in">
          Welcome to the Future of Healthcare
        </h1>
        
        <p className="text-xl text-gray-600 mb-8 leading-relaxed animate-fade-in-up">
          Experience intelligent symptom analysis powered by advanced AI. 
          Get personalized doctor recommendations and comprehensive health insights.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
          <div className="flex items-center text-gray-700 animate-slide-in-left">
            <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            AI-Powered Analysis
          </div>
          
          <div className="flex items-center text-gray-700 animate-slide-in-up">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
            Voice Recognition
          </div>
          
          <div className="flex items-center text-gray-700 animate-slide-in-right">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-3">
              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            PDF Reports
          </div>
        </div>
        
        <button
          onClick={() => {
            setIsLoading(true)
            setTimeout(() => onEnter(), 500)
          }}
          disabled={isLoading}
          className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-800 text-white rounded-2xl font-bold text-lg transition-all duration-300 disabled:opacity-50 transform hover:scale-105 active:scale-95 shadow-2xl animate-fade-in-up"
        >
          <div className="flex items-center justify-center">
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                Loading Experience...
              </>
            ) : (
              <>
                <svg className="w-6 h-6 mr-3 group-hover:translate-x-1 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                Enter Health Assistant
              </>
            )}
          </div>
        </button>
        
        <p className="text-sm text-gray-500 mt-4 animate-fade-in">
          Your intelligent healthcare companion awaits
        </p>
      </div>
    </div>
  )
}