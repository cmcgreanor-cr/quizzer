import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, push, set } from 'firebase/database'
import { db } from '../firebase.js'

const OPTION_COLORS = ['bg-red-500', 'bg-blue-500', 'bg-yellow-500', 'bg-green-500']
const OPTION_SHAPES = ['▲', '●', '■', '◆']

const newQuestion = () => ({
  text: '',
  options: ['', '', '', ''],
  correct: 0,
})

export default function CreateQuiz() {
  const navigate = useNavigate()
  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState([newQuestion()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateQuestion = (qi, field, value) =>
    setQuestions(qs => qs.map((q, i) => (i === qi ? { ...q, [field]: value } : q)))

  const updateOption = (qi, oi, value) =>
    setQuestions(qs =>
      qs.map((q, i) => {
        if (i !== qi) return q
        const options = [...q.options]
        options[oi] = value
        return { ...q, options }
      })
    )

  const addQuestion = () => setQuestions(qs => [...qs, newQuestion()])
  const removeQuestion = qi => setQuestions(qs => qs.filter((_, i) => i !== qi))

  const save = async () => {
    setError('')
    if (!title.trim()) return setError('Please enter a quiz title.')
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text.trim()) return setError(`Question ${i + 1} is missing text.`)
      if (questions[i].options.some(o => !o.trim()))
        return setError(`All 4 options in question ${i + 1} must be filled in.`)
    }
    setSaving(true)
    try {
      const quizRef = push(ref(db, 'quizzes'))
      await set(quizRef, {
        title: title.trim(),
        questions: questions.map(q => ({
          text: q.text.trim(),
          options: q.options.map(o => o.trim()),
          correct: q.correct,
        })),
        currentQuestion: -1,
        showAnswer: false,
        status: 'waiting',
        createdAt: Date.now(),
      })
      navigate(`/host/${quizRef.key}`)
    } catch (e) {
      setError('Failed to save. Check your Firebase configuration in .env')
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8 pt-2">
          <button
            onClick={() => navigate('/')}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-black">Create Quiz</h1>
        </div>

        {/* Quiz title */}
        <input
          type="text"
          placeholder="Quiz title..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full bg-slate-800 text-white text-2xl font-bold placeholder-slate-500 border-2 border-slate-700 focus:border-indigo-500 rounded-2xl px-5 py-4 outline-none transition-colors mb-8"
          autoFocus
        />

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((q, qi) => (
            <div key={qi} className="bg-slate-800 rounded-2xl p-5 border border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <span className="text-indigo-400 font-bold text-xs uppercase tracking-widest">
                  Question {qi + 1}
                </span>
                {questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(qi)}
                    className="text-slate-500 hover:text-red-400 transition-colors text-xs font-semibold"
                  >
                    Remove
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="Ask a question..."
                value={q.text}
                onChange={e => updateQuestion(qi, 'text', e.target.value)}
                className="w-full bg-slate-700 text-white placeholder-slate-400 rounded-xl px-4 py-3 mb-4 outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
              />

              <div className="grid grid-cols-2 gap-2">
                {q.options.map((opt, oi) => (
                  <div
                    key={oi}
                    className={`rounded-xl overflow-hidden border-2 transition-all ${
                      q.correct === oi ? 'border-green-400' : 'border-transparent'
                    }`}
                  >
                    <div className={`${OPTION_COLORS[oi]} flex items-center gap-2 px-3 py-2`}>
                      <span className="text-white font-bold text-base w-5 text-center flex-shrink-0">
                        {OPTION_SHAPES[oi]}
                      </span>
                      <input
                        type="text"
                        placeholder={`Option ${oi + 1}`}
                        value={opt}
                        onChange={e => updateOption(qi, oi, e.target.value)}
                        className="flex-1 bg-transparent text-white placeholder-white/50 outline-none font-medium text-sm min-w-0"
                      />
                      <button
                        onClick={() => updateQuestion(qi, 'correct', oi)}
                        title="Mark as correct answer"
                        className={`flex-shrink-0 text-base transition-opacity ${
                          q.correct === oi ? 'opacity-100' : 'opacity-25 hover:opacity-60'
                        }`}
                      >
                        ✓
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-slate-500 text-xs mt-3">
                Click ✓ on an option to mark it as correct.{' '}
                <span className={`${OPTION_COLORS[q.correct]} text-white px-1.5 py-0.5 rounded text-xs`}>
                  {OPTION_SHAPES[q.correct]} Option {q.correct + 1}
                </span>{' '}
                is currently correct.
              </p>
            </div>
          ))}
        </div>

        <button
          onClick={addQuestion}
          className="w-full mt-4 border-2 border-dashed border-slate-700 hover:border-indigo-500 text-slate-400 hover:text-indigo-400 rounded-2xl py-4 font-semibold transition-all"
        >
          + Add Question
        </button>

        {error && (
          <div className="mt-4 bg-red-900/40 border border-red-500/60 text-red-300 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full mt-6 mb-12 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black text-xl py-4 rounded-2xl transition-all shadow-lg"
        >
          {saving ? 'Saving...' : 'Save & Open Host View →'}
        </button>
      </div>
    </div>
  )
}
