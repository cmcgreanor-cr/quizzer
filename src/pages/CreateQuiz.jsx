import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ref, push, set, update, get } from 'firebase/database'
import { db } from '../firebase.js'
import { OPTION_COLORS, OPTION_SHAPES } from '../constants.js'

const newQuestion = () => ({
  text: '',
  options: ['', '', '', ''],
  correct: 0,
})

export default function CreateQuiz() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [title, setTitle] = useState('')
  const [questions, setQuestions] = useState([newQuestion()])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(isEditing)
  const [error, setError] = useState('')
  const [quizStatus, setQuizStatus] = useState('waiting')

  useEffect(() => {
    if (!isEditing) return
    get(ref(db, `quizzes/${id}`)).then(snap => {
      if (!snap.exists()) { setError('Quiz not found.'); setLoading(false); return }
      const data = snap.val()
      setTitle(data.title)
      setQuestions(data.questions)
      setQuizStatus(data.status)
      setLoading(false)
    })
  }, [id, isEditing])

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

  const addOption = (qi) =>
    setQuestions(qs =>
      qs.map((q, i) => i !== qi ? q : { ...q, options: [...q.options, ''] })
    )

  const removeOption = (qi, oi) =>
    setQuestions(qs =>
      qs.map((q, i) => {
        if (i !== qi) return q
        const options = q.options.filter((_, idx) => idx !== oi)
        const correct = q.correct >= options.length ? options.length - 1 : q.correct
        return { ...q, options, correct }
      })
    )

  const addQuestion = () => setQuestions(qs => [...qs, newQuestion()])
  const removeQuestion = qi => setQuestions(qs => qs.filter((_, i) => i !== qi))

  const save = async () => {
    setError('')
    if (!title.trim()) return setError('Please enter a quiz title.')
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].text.trim()) return setError(`Question ${i + 1} is missing text.`)
      if (questions[i].options.length < 2) return setError(`Question ${i + 1} needs at least 2 options.`)
      if (questions[i].options.some(o => !o.trim()))
        return setError(`All options in question ${i + 1} must be filled in.`)
    }
    setSaving(true)
    try {
      const quizData = {
        title: title.trim(),
        questions: questions.map(q => ({
          text: q.text.trim(),
          options: q.options.map(o => o.trim()),
          correct: q.correct,
        })),
      }
      if (isEditing) {
        await update(ref(db, `quizzes/${id}`), quizData)
        navigate(`/host/${id}`)
      } else {
        const quizRef = push(ref(db, 'quizzes'))
        await set(quizRef, {
          ...quizData,
          currentQuestion: -1,
          showAnswer: false,
          status: 'waiting',
          createdAt: Date.now(),
        })
        navigate(`/host/${quizRef.key}`)
      }
    } catch (e) {
      setError('Failed to save. Check your Firebase configuration.')
      setSaving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Loading...</div>
  )

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="max-w-2xl mx-auto p-6">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8 pt-2">
          <button
            onClick={() => navigate(isEditing ? `/host/${id}` : '/')}
            className="text-slate-400 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
          <h1 className="text-2xl font-black">{isEditing ? 'Edit Quiz' : 'Create Quiz'}</h1>
        </div>

        {/* Warning for non-waiting quizzes */}
        {isEditing && quizStatus !== 'waiting' && (
          <div className="mb-6 bg-amber-900/40 border border-amber-500/60 text-amber-200 rounded-xl px-4 py-3 text-sm">
            ⚠ This quiz is currently <strong>{quizStatus}</strong>. Changes apply immediately — answers already submitted use option indices, so removing options may affect scoring.
          </div>
        )}

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
                    Remove question
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

              <div className="grid grid-cols-2 gap-2 mb-3">
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
                      {q.options.length > 2 && (
                        <button
                          onClick={() => removeOption(qi, oi)}
                          title="Remove option"
                          className="flex-shrink-0 text-white/40 hover:text-white text-xs ml-1 transition-opacity"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-slate-500 text-xs">
                  Click ✓ to mark correct.{' '}
                  <span className={`${OPTION_COLORS[q.correct]} text-white px-1.5 py-0.5 rounded text-xs`}>
                    {OPTION_SHAPES[q.correct]} Option {q.correct + 1}
                  </span>{' '}
                  is correct.
                </p>
                {q.options.length < 6 && (
                  <button
                    onClick={() => addOption(qi)}
                    className="text-indigo-400 hover:text-indigo-300 text-xs font-semibold transition-colors flex-shrink-0 ml-3"
                  >
                    + Add option
                  </button>
                )}
              </div>
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
          {saving ? 'Saving...' : isEditing ? 'Save Changes →' : 'Save & Open Host View →'}
        </button>
      </div>
    </div>
  )
}
