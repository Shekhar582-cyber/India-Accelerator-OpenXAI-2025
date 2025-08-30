'use client'

import { Canvas } from '@react-three/fiber'
import { OrbitControls, Text, Float, Sphere, MeshDistortMaterial, Stars, Sparkles } from '@react-three/drei'
import { useRef, useState, useMemo } from 'react'
import { useFrame, RootState } from '@react-three/fiber'
import * as THREE from 'three'

function FloatingMedicalIcon({ position }: { position: [number, number, number] }) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state: RootState) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime) * 0.4
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.7) * 0.4
      meshRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 0.3) * 0.2
    }
  })

  return (
    <Float speed={4} rotationIntensity={2} floatIntensity={4}>
      <mesh ref={meshRef} position={position}>
        <octahedronGeometry args={[0.5]} />
        <meshStandardMaterial
          color="#3b82f6"
          transparent
          opacity={0.9}
          metalness={0.9}
          roughness={0.1}
          emissive="#1e40af"
          emissiveIntensity={0.3}
        />
      </mesh>
    </Float>
  )
}

function AnimatedSphere() {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state: RootState) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = state.clock.elapsedTime * 0.2
      meshRef.current.rotation.y = state.clock.elapsedTime * 0.3
    }
  })

  return (
    <Sphere ref={meshRef} args={[1.5, 100, 200]} scale={1.2} position={[0, 0, -4]}>
      <MeshDistortMaterial
        color="#6366f1"
        attach="material"
        distort={0.5}
        speed={2}
        roughness={0}
        metalness={0.8}
      />
    </Sphere>
  )
}

function ParticleField() {
  const points = useRef<THREE.Points>(null)
  const particlesCount = 2000

  const particlesPosition = useMemo(() => {
    const positions = new Float32Array(particlesCount * 3)
    for (let i = 0; i < particlesCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 25
      positions[i * 3 + 1] = (Math.random() - 0.5) * 25
      positions[i * 3 + 2] = (Math.random() - 0.5) * 25
    }
    return positions
  }, [])

  useFrame((state) => {
    if (points.current) {
      points.current.rotation.x = state.clock.elapsedTime * 0.02
      points.current.rotation.y = state.clock.elapsedTime * 0.03
    }
  })

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particlesCount}
          array={particlesPosition}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.015}
        color="#8b5cf6"
        transparent
        opacity={0.4}
        sizeAttenuation
      />
    </points>
  )
}

function Scene() {
  return (
    <>
      {/* Enhanced Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 5, 5]} intensity={0.6} />
      <pointLight position={[0, 5, 3]} intensity={0.8} color="#6366f1" />
      <spotLight position={[0, 10, 8]} angle={0.4} penumbra={1} intensity={0.8} color="#8b5cf6" castShadow />

      {/* Background Effects */}
      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
      <ParticleField />

      {/* Main Elements */}
      <AnimatedSphere />
      <Sparkles count={100} scale={[20, 20, 20]} size={2} speed={0.4} />

      <FloatingMedicalIcon position={[-5, 4, -2]} />
      <FloatingMedicalIcon position={[5, -4, -2]} />
      <FloatingMedicalIcon position={[-4, -3, -3]} />
      <FloatingMedicalIcon position={[4, 3, -3]} />
      <FloatingMedicalIcon position={[0, 5, -5]} />
      <FloatingMedicalIcon position={[-6, 0, -4]} />
      <FloatingMedicalIcon position={[6, 0, -4]} />



      <OrbitControls enableZoom={false} enablePan={false} />
    </>
  )
}

interface Welcome3DProps {
  onEnter: () => void
}

export default function Welcome3D({ onEnter }: Welcome3DProps) {
  const [isLoading, setIsLoading] = useState(true)

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-100 z-50">
      {/* 3D Canvas Background */}
      <div className="absolute inset-0">
        <Canvas
          camera={{ position: [0, 0, 10], fov: 60 }}
          onCreated={() => setIsLoading(false)}
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <Scene />
        </Canvas>
      </div>

      {/* Welcome Content Overlay */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8">
        <div className="text-center max-w-2xl bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl">
          <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 bg-clip-text text-transparent mb-6">
            Welcome to the Future of Healthcare
          </h1>

          <p className="text-xl text-gray-600 mb-8 leading-relaxed">
            Experience intelligent symptom analysis powered by advanced AI.
            Get personalized doctor recommendations and comprehensive health insights.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <div className="flex items-center text-gray-700">
              <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              AI-Powered Analysis
            </div>

            <div className="flex items-center text-gray-700">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              Voice Recognition
            </div>

            <div className="flex items-center text-gray-700">
              <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              PDF Reports
            </div>
          </div>

          <button
            onClick={onEnter}
            disabled={isLoading}
            className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-800 text-white rounded-2xl font-bold text-lg transition-all duration-300 disabled:opacity-50 transform hover:scale-105 active:scale-95 shadow-2xl"
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

          <p className="text-sm text-gray-500 mt-4">
            Click and drag to explore the 3D scene
          </p>
        </div>
      </div>
    </div>
  )
}