/**
 * Test Topic Suggestion UI (FASE 2.6 - Conversation Intelligence)
 *
 * Testing instructions:
 * 1. Login to Guest Portal
 * 2. Open browser console
 * 3. Paste this script and run
 * 4. Topic suggestion banner should appear above input
 *
 * Test cases:
 * - Banner appears with animation (opacity 0 → 1, y: -20 → 0)
 * - "Sí, crear" creates new conversation with topic as title
 * - "No, continuar" dismisses banner
 * - X button dismisses banner
 * - ESC key dismisses banner
 * - Mobile responsive (buttons stack vertical)
 */

// Simulate API response with topic suggestion
const simulateTopicSuggestion = (topic: string) => {
  // Inject mock data into the API response
  // This simulates what the backend will return in FASE 2.6 backend implementation

  console.log(`
🧪 TESTING TOPIC SUGGESTION UI
================================

Topic: "${topic}"
Confidence: 85%

Expected behavior:
1. Banner appears with blue gradient background
2. Lightbulb icon visible
3. Text: "He notado que estás hablando sobre ${topic}"
4. Two buttons: "Sí, crear" | "No, continuar"
5. X button in top-right corner

User interactions to test:
- Click "Sí, crear" → New conversation created with title "${topic}"
- Click "No, continuar" → Banner dismisses
- Click X → Banner dismisses
- Press ESC key → Banner dismisses

Mobile testing (resize to 375px):
- Buttons should stack vertically
- Text should not wrap awkwardly
- Touch targets ≥ 44px

Accessibility testing:
- Tab navigation works (Tab → "Sí" → "No" → X)
- ARIA labels present
- Keyboard shortcuts (ESC)
- Screen reader announces "Nueva conversación sugerida"

================================
  `)

  // Return mock API response format
  return {
    response: "Basado en nuestra conversación, parece que te interesa mucho el tema de restaurantes en la zona.",
    entities: [],
    followUpSuggestions: [
      "¿Cuáles son los mejores restaurantes de comida local?",
      "¿Hay opciones vegetarianas cerca?",
    ],
    topicSuggestion: {
      topic: topic,
      confidence: 0.85
    }
  }
}

// Test cases
const testCases = [
  "Restaurantes en San Andrés",
  "Actividades acuáticas",
  "Playas cercanas",
  "Servicios del hotel",
  "Transporte al aeropuerto"
]

console.log("Available test topics:")
testCases.forEach((topic, i) => {
  console.log(`${i + 1}. ${topic}`)
})

console.log(`
To test, run:
simulateTopicSuggestion("${testCases[0]}")

Or choose a custom topic:
simulateTopicSuggestion("Mi tema personalizado")
`)

// Export for browser console
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.simulateTopicSuggestion = simulateTopicSuggestion
  // @ts-ignore
  window.testTopics = testCases
}

export { simulateTopicSuggestion, testCases }
