'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signIn } from '@/lib/supabase-auth'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Shield, Mail, Lock, AlertCircle } from "lucide-react"

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Debug component mount
  useEffect(() => {
    console.log('🏗️ LoginPage component mounted')
    console.log('🌐 Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL)
    console.log('🔑 Supabase Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('🚀 Login form submitted with email:', email)
    setLoading(true)
    setError('')

    try {
      console.log('📞 Calling signIn function...')
      await signIn(email, password)
      console.log('✅ Login successful, redirecting to dashboard-legacy...')
      // Use replace instead of push to prevent going back to login
      router.replace('/dashboard-legacy')
    } catch (err) {
      console.error('❌ Login error:', err)
      setError(err instanceof Error ? err.message : 'Error al iniciar sesión')
      setLoading(false)
    }
    // Don't set loading to false here - let the redirect handle it
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Shield className="h-12 w-12 text-blue-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">MUVA</h1>
          <p className="text-gray-600 mt-2">Plataforma Multi-Tenant de Turismo</p>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="text-center text-xl">Iniciar Sesión</CardTitle>
            <p className="text-center text-sm text-gray-600">
              Accede a tu cuenta para gestionar tu negocio
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@empresa.com"
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="pl-10"
                    required
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-md">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {/* Submit Button */}
              <Button
                type="submit"
                className="w-full"
                disabled={loading || !email || !password}
                onClick={(e) => {
                  console.log('🖱️ Button clicked!')
                  console.log('📧 Email:', email)
                  console.log('🔒 Password length:', password.length)
                  console.log('⏳ Loading:', loading)
                }}
              >
                {loading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-gray-50 rounded-md">
              <h4 className="text-sm font-medium text-gray-700 mb-2">
                Credenciales de Demo:
              </h4>
              <div className="space-y-1 text-xs text-gray-600">
                <p><strong>SimmerDown Hotel:</strong> simmerdown@demo.com / demo123</p>
                <p><strong>Caribbean Restaurant:</strong> caribbean@demo.com / demo123</p>
                <p><strong>Adventure Tours:</strong> adventure@demo.com / demo123</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center mt-6 text-sm text-gray-500">
          <p>¿Necesitas ayuda? Contacta soporte</p>
        </div>
      </div>
    </div>
  )
}