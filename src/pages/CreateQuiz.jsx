import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ref, push, set, update, get } from 'firebase/database'
import { db } from '../firebase.js'
import { OPTION_COLORS, OPTION_SHAPES } from '../constants.js'

const TIMER_OPTIONS = [0, 10, 15, 20, 30, 45, 60]

const newQuestion = () => ({
  text: '',
  options: ['', '', '', ''],
  correct: 0,
  explanation: '',
  timer: 30,
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
      setQuestions(data.questions.map(q => ({ explanation: '', timer: 30, ...q })))
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
          timer: q.timer ?? 0,
          ...(q.explanation?.trim() ? { explanation: q.explanation.trim() } : {}),
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center text-white">
      Loading...
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
      <div className="max-w-2xl mx-auto p-6">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8 pt-2">
          <button
            onClick={() => navigate(isEditing ? `/host/${id}` : '/')}
            className="text-white/40 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
          <img src="/cr-logo.svg" alt="Cloud Revolution" className="h-6 opacity-60" />
          <h1 className="text-2xl font-black ml-auto">{isEditing ? 'Edit Quiz' : 'Create Quiz'}</h1>
        </div>

        {/* Warning for non-waiting quizzes */}
        {isEditing && quizStatus !== 'waiting' && (
          <div className="mb-6 bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-xl px-4 py-3 text-sm backdrop-blur-xl">
            ⚠ This quiz is currently <strong>{quizStatus}</strong>. Changes apply immediately — answers already submitted use option indices, so removing options may affect scoring.
          </div>
        )}

        {/* Quiz title */}
        <input
          type="text"
          placeholder="Quiz title..."
          value={title}
          onChange={e => setTitle(e.target.value)}
          className="w-full bg-white/5 backdrop-blur-xl text-white text-2xl font-bold placeholder-white/20 border border-white/10 focus:border-cyan-500/50 rounded-2xl px-5 py-4 outline-none transition-all mb-8"
          autoFocus
        />

        {/* Questions */}
        <div className="space-y-6">
          {questions.map((q, qi) => (
            <div key={qi} className="bg-white/5 backdrop-blur-xl rounded-2xl p-5 border border-white/10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-cyan-400 font-bold text-xs uppercase tracking-widest">
                  Question {qi + 1}
                </span>
                {questions.length > 1 && (
                  <button
                    onClick={() => removeQuestion(qi)}
                    className="text-white/30 hover:text-red-400 transition-colors text-xs font-semibold"
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
                className="w-full bg-white/5 text-white placeholder-white/30 border border-white/10 focus:border-cyan-500/40 rounded-xl px-4 py-3 mb-4 outline-none transition-all"
              />

              <div className="grid grid-cols-2 gap-2 mb-3">
                {q.options.map((opt, oi) => (
                  <div
                    key={oi}
                    className={`rounded-xl overflow-hidden border-2 transition-all ${
                      q.correct === oi ? 'border-green-400/80' : 'border-transparent'
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

              <div className="flex items-center justify-between mb-4">
                <p className="text-white/30 text-xs">
                  Click ✓ to mark correct.{' '}
                  <span className={`${OPTION_COLORS[q.correct]} text-white px-1.5 py-0.5 rounded text-xs`}>
                    {OPTION_SHAPES[q.correct]} Option {q.correct + 1}
                  </span>{' '}
                  is correct.
                </p>
                {q.options.length < 6 && (
                  <button
                    onClick={() => addOption(qi)}
                    className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold transition-colors flex-shrink-0 ml-3"
                  >
                    + Add option
                  </button>
                )}
              </div>

              {/* Explanation */}
              <div className="mb-4">
                <label className="text-white/30 text-xs font-semibold uppercase tracking-wider block mb-1.5">
                  Answer explanation <span className="normal-case font-normal">(optional — shown after reveal)</span>
                </label>
                <textarea
                  placeholder="Add extra context, fun facts, or details about the correct answer..."
                  value={q.explanation}
                  onChange={e => updateQuestion(qi, 'explanation', e.target.value)}
                  rows={2}
                  className="w-full bg-white/5 text-white placeholder-white/20 border border-white/10 focus:border-cyan-500/40 rounded-xl px-4 py-3 outline-none transition-all text-sm resize-none"
                />
              </div>

              {/* Timer */}
              <div className="flex items-center gap-3">
                <label className="text-white/30 text-xs font-semibold uppercase tracking-wider flex-shrink-0">
                  ⏱ Timer
                </label>
                <div className="flex gap-1.5 flex-wrap">
                  {TIMER_OPTIONS.map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => updateQuestion(qi, 'timer', t)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        (q.timer ?? 0) === t
                          ? 'bg-cyan-500 text-white'
                          : 'bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/70'
                      }`}
                    >
                      {t === 0 ? 'Off' : `${t}s`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addQuestion}
          className="w-full mt-4 border-2 border-dashed border-white/10 hover:border-cyan-500/40 text-white/30 hover:text-cyan-400 rounded-2xl py-4 font-semibold transition-all"
        >
          + Add Question
        </button>

        {error && (
          <div className="mt-4 bg-red-500/10 border border-red-500/30 text-red-300 rounded-xl px-4 py-3 text-sm backdrop-blur-xl">
            {error}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className="w-full mt-6 mb-12 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-white/5 disabled:to-white/5 disabled:text-white/30 text-white font-black text-xl py-4 rounded-2xl transition-all shadow-lg shadow-cyan-900/30"
        >
          {saving ? 'Saving...' : isEditing ? 'Save Changes →' : 'Save & Open Host View →'}
        </button>
      </div>
    </div>
  )
}
