import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ref, onValue, off, remove } from 'firebase/database'
import { db } from '../firebase.js'

export default function Home() {
  const [joinCode, setJoinCode] = useState('')
  const [quizzes, setQuizzes] = useState([])
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
    if (status === 'waiting') return <span className="text-blue-400">Lobby</span>
    if (status === 'active')  return <span className="text-green-400">Live</span>
    if (status === 'ended')   return <span className="text-slate-400">Ended</span>
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 p-4">
      <div className="max-w-lg mx-auto">

        {/* Header */}
        <div className="text-center pt-8 pb-10">
          <div className="text-7xl mb-4">🎮</div>
          <h1 className="text-6xl font-black text-white mb-2 tracking-tight">Quizzer</h1>
          <p className="text-purple-200 text-lg">Live host-controlled quizzes</p>
        </div>

        {/* Create / Join */}
        <div className="space-y-4 mb-10">
          <button
            onClick={() => navigate('/create')}
            className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-black py-4 px-8 rounded-2xl text-xl transition-all transform hover:scale-105 shadow-lg shadow-indigo-900/50"
          >
            Create a Quiz
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/20" />
            <span className="text-purple-300 text-sm">or join one</span>
            <div className="flex-1 h-px bg-white/20" />
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Paste quiz link or ID..."
              value={joinCode}
              onChange={e => setJoinCode(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              className="flex-1 bg-white/10 text-white placeholder-white/40 border border-white/20 rounded-2xl px-4 py-4 text-lg focus:outline-none focus:border-white/50 focus:bg-white/15 transition-all"
            />
            <button
              onClick={handleJoin}
              disabled={!joinCode.trim()}
              className="bg-pink-500 hover:bg-pink-400 disabled:bg-white/10 disabled:text-white/30 text-white font-black py-4 px-5 rounded-2xl text-xl transition-all transform hover:scale-105 disabled:scale-100"
            >
              →
            </button>
          </div>
        </div>

        {/* Quiz list */}
        {quizzes.length > 0 && (
          <div>
            <h2 className="text-white/50 text-xs font-bold uppercase tracking-widest mb-3">Your Quizzes</h2>
            <div className="space-y-2">
              {quizzes.map(quiz => (
                <div key={quiz.id} className="bg-white/10 backdrop-blur rounded-2xl px-4 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-white truncate">{quiz.title}</div>
                    <div className="text-white/50 text-xs mt-0.5">
                      {quiz.questions?.length || 0} questions · {statusBadge(quiz.status)}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(`/host/${quiz.id}`)}
                    className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Host
                  </button>
                  <button
                    onClick={() => deleteQuiz(quiz.id)}
                    className="flex-shrink-0 text-white/30 hover:text-red-400 transition-colors text-lg leading-none"
                    title="Delete quiz"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
