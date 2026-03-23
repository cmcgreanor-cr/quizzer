import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Home() {
  const [joinCode, setJoinCode] = useState('')
  const navigate = useNavigate()

  const handleJoin = () => {
    if (joinCode.trim()) navigate(`/join/${joinCode.trim()}`)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-4">
      <div className="text-center w-full max-w-sm">
        <div className="text-7xl mb-4">🎮</div>
        <h1 className="text-6xl font-black text-white mb-2 tracking-tight">Quizzer</h1>
        <p className="text-purple-200 text-lg mb-12">Live host-controlled quizzes</p>

        <div className="space-y-4">
          <button
            onClick={() => navigate('/create')}
            className="w-full bg-indigo-500 hover:bg-indigo-400 text-white font-black py-4 px-8 rounded-2xl text-xl transition-all transform hover:scale-105 shadow-lg shadow-indigo-900/50"
          >
            Create a Quiz
          </button>

          <div className="flex items-center gap-3 my-2">
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
      </div>
    </div>
  )
}
