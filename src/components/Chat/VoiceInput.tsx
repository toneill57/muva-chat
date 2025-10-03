'use client'

import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, MicOff, Loader2, AlertCircle } from 'lucide-react'

interface VoiceInputProps {
  onTranscript: (text: string) => void
  onError?: (error: string) => void
  disabled?: boolean
}

/**
 * VoiceInput Component - FASE 2.3
 *
 * Voice-to-text using Web Speech API
 * Features:
 * - Recording animation with waveform visualization
 * - Real-time transcription display
 * - Edit capability before sending
 * - Error handling for unsupported browsers
 * - Premium microphone animations
 */
export function VoiceInput({ onTranscript, onError, disabled = false }: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isSupported, setIsSupported] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [audioLevels, setAudioLevels] = useState<number[]>([0, 0, 0, 0, 0])

  const recognitionRef = useRef<any>(null)
  const animationFrameRef = useRef<number | undefined>(undefined)

  useEffect(() => {
    // Check browser support
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      setIsSupported(false)
      return
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = 'es-ES'

    recognition.onresult = (event: any) => {
      let finalTranscript = ''
      let interimTranscript = ''

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPiece = event.results[i][0].transcript
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPiece + ' '
        } else {
          interimTranscript += transcriptPiece
        }
      }

      setTranscript((prev) => prev + finalTranscript || interimTranscript)
    }

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error)
      const errorMessage = getErrorMessage(event.error)
      setError(errorMessage)
      if (onError) onError(errorMessage)
      setIsRecording(false)
    }

    recognition.onend = () => {
      if (isRecording) {
        // Restart if still recording (auto-stop prevention)
        recognition.start()
      }
    }

    recognitionRef.current = recognition

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isRecording, onError])

  const getErrorMessage = (errorCode: string): string => {
    const errors: Record<string, string> = {
      'no-speech': 'No se detectó voz. Intenta de nuevo.',
      'audio-capture': 'No se pudo acceder al micrófono.',
      'not-allowed': 'Permiso de micrófono denegado.',
      'network': 'Error de conexión. Verifica tu internet.',
    }
    return errors[errorCode] || 'Error al reconocer la voz.'
  }

  // Simulate audio waveform animation
  useEffect(() => {
    if (isRecording) {
      const animateWaveform = () => {
        setAudioLevels(Array.from({ length: 5 }, () => Math.random() * 100))
        animationFrameRef.current = requestAnimationFrame(animateWaveform)
      }
      animateWaveform()
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
      setAudioLevels([0, 0, 0, 0, 0])
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [isRecording])

  const startRecording = async () => {
    if (!isSupported || disabled) return

    try {
      setError(null)
      setTranscript('')
      setIsRecording(true)
      recognitionRef.current?.start()
    } catch (err) {
      console.error('Failed to start recording:', err)
      setError('No se pudo iniciar la grabación')
      setIsRecording(false)
    }
  }

  const stopRecording = () => {
    setIsRecording(false)
    recognitionRef.current?.stop()

    if (transcript.trim()) {
      onTranscript(transcript.trim())
      setTranscript('')
    }
  }

  const cancelRecording = () => {
    setIsRecording(false)
    recognitionRef.current?.stop()
    setTranscript('')
  }

  if (!isSupported) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-lg text-xs text-yellow-800">
        <AlertCircle className="h-4 w-4" />
        <span>Tu navegador no soporta entrada de voz</span>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Recording Button */}
      <motion.button
        whileHover={{ scale: disabled ? 1 : 1.05 }}
        whileTap={{ scale: disabled ? 1 : 0.95 }}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        className={`
          relative h-12 w-12 rounded-full flex items-center justify-center
          transition-all duration-200 shadow-lg
          ${
            isRecording
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-600 hover:bg-blue-700'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-label={isRecording ? 'Detener grabación' : 'Iniciar grabación de voz'}
      >
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div
              key="recording"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <MicOff className="h-5 w-5 text-white" />
            </motion.div>
          ) : (
            <motion.div
              key="idle"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
            >
              <Mic className="h-5 w-5 text-white" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pulse effect when recording */}
        {isRecording && (
          <>
            <motion.div
              className="absolute inset-0 rounded-full bg-red-500"
              animate={{
                scale: [1, 1.5, 1.5],
                opacity: [0.5, 0, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
              }}
            />
            <motion.div
              className="absolute inset-0 rounded-full bg-red-500"
              animate={{
                scale: [1, 1.5, 1.5],
                opacity: [0.5, 0, 0],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeOut',
                delay: 1,
              }}
            />
          </>
        )}
      </motion.button>

      {/* Waveform Visualization */}
      <AnimatePresence>
        {isRecording && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-center gap-1 px-4 py-3 bg-red-50 border border-red-200 rounded-xl"
          >
            {audioLevels.map((level, index) => (
              <motion.div
                key={index}
                className="w-1 bg-red-500 rounded-full"
                animate={{
                  height: `${Math.max(level / 2, 20)}%`,
                }}
                transition={{
                  duration: 0.1,
                  ease: 'easeOut',
                }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transcript Display */}
      <AnimatePresence>
        {transcript && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="px-4 py-3 bg-blue-50 border border-blue-200 rounded-xl"
          >
            <p className="text-sm text-gray-700 mb-2">{transcript}</p>
            {isRecording && (
              <div className="flex gap-2">
                <button
                  onClick={stopRecording}
                  className="px-3 py-1 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
                >
                  Enviar
                </button>
                <button
                  onClick={cancelRecording}
                  className="px-3 py-1 text-xs font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800"
          >
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
