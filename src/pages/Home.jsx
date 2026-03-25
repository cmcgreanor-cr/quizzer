import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, onValue, off, remove } from 'firebase/database'
import { db } from '../firebase.js'

export default function Home() {
  const [joinCode, setJoinCode] = useState('')
  const [quizzes, setQuizzes] = useState([])
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const quizzesRef = ref(db, 'quizzes')
    onValue(quizzesRef, snap => {
      if (!snap.exists()) { setQuizzes([]); return }
      const list = Object.entries(snap.val())
        .map(([id, q]) => ({ id, ...q }))
        .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
      setQuizzes(list)
    })
    return () => off(quizzesRef)
  }, [])

  const handleJoin = () => {
    if (joinCode.trim()) navigate(`/join/${joinCode.trim()}`)
  }

  const deleteQuiz = async (id) => {
    await Promise.all([
      remove(ref(db, `quizzes/${id}`)),
      remove(ref(db, `participants/${id}`)),
      remove(ref(db, `answers/${id}`)),
    ])
  }

  const statusBadge = (status) => {
    if (status === 'waiting') return <span className="text-cyan-400 font-semibold">Lobby</span>
    if (status === 'active')  return <span className="text-green-400 font-semibold">Live</span>
    if (status === 'ended')   return <span className="text-white/40 font-semibold">Ended</span>
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 p-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center pt-10 pb-10">
          <img src="/cr-logo.svg" alt="Cloud Revolution" className="h-10 mx-auto mb-8 opacity-90" />
          <h1 className="text-5xl font-black text-white mb-2 tracking-tight">Quizzer</h1>
          <p className="text-white/40 text-base">Live host-controlled quizzes</p>
        </div>

        {/* Create / Join */}
        <div className="space-y-4 mb-10">
          <button
            onClick={() => navigate('/create')}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black py-4 px-8 rounded-2xl text-xl transition-all transform hover:scale-[1.02] shadow-lg shadow-cyan-900/40"
          >
            Create a Quiz
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/30 text-sm">or join one</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste quiz link or ID..."
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              className="flex-1 bg-white/5 text-white placeholder-white/30 border border-white/10 focus:border-cyan-500/50 rounded-2xl px-4 py-4 text-base outline-none transition-all backdrop-blur-xl"
            />
            <button
              onClick={handleJoin}
              disabled={!joinCode.trim()}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-white/5 disabled:to-white/5 disabled:text-white/20 text-white font-black py-4 px-5 rounded-2xl text-xl transition-all transform hover:scale-105 disabled:scale-100 disabled:shadow-none shadow-lg shadow-cyan-900/40"
            >
              →
            </button>
          </div>
        </div>

        {/* Quiz list */}
        {quizzes.length > 0 && (
          <div>
            <h2 className="text-white/30 text-xs font-bold uppercase tracking-widest mb-3">Your Quizzes</h2>
            <div className="space-y-2">
              {quizzes.map(quiz => (
                <div
                  key={quiz.id}
                  className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl px-4 py-3 flex items-center gap-3 hover:bg-white/8 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{quiz.title}</div>
                    <div className="text-white/40 text-xs mt-0.5">
                      {quiz.questions?.length || 0} questions · {statusBadge(quiz.status)}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/host/${quiz.id}`)}
                    className="flex-shrink-0 bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 text-white font-bold text-sm px-3 py-1.5 rounded-lg transition-all"
                  >
                    Host
                  </button>
                  <button
                    onClick={() => navigate(`/edit/${quiz.id}`)}
                    className="flex-shrink-0 bg-white/10 hover:bg-white/20 text-white font-bold text-sm px-3 py-1.5 rounded-lg transition-colors border border-white/10"
                  >
                    Edit
                  </button>
                  {confirmDeleteId === quiz.id ? (
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => { deleteQuiz(quiz.id); setConfirmDeleteId(null) }}
                        className="text-red-400 font-bold text-sm px-2 py-1 rounded-lg bg-red-400/10 hover:bg-red-400/20 transition-colors"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => setConfirmDeleteId(null)}
                        className="text-white/40 font-bold text-sm px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(quiz.id)}
                      className="flex-shrink-0 text-white/20 hover:text-red-400 transition-colors text-lg leading-none"
                      title="Delete quiz"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

      </div>

      {/* Build stamp */}
      <p className="text-white/15 text-xs text-center py-6 font-mono">
        {__COMMIT_HASH__} · {new Date(__BUILD_TIME__).toLocaleString('en-AU', { dateStyle: 'short', timeStyle: 'short' })}
      </p>
    </div>
  )
}
