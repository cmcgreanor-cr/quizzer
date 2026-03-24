import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ref, onValue, update, off } from 'firebase/database'
import { QRCodeSVG } from 'qrcode.react'
import { db } from '../firebase.js'
import { OPTION_COLORS, OPTION_SHAPES, optionGridCols } from '../constants.js'

export default function HostView() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [quiz, setQuiz] = useState(null)
  const [participants, setParticipants] = useState({})
  const [answers, setAnswers] = useState({})
  const [copied, setCopied] = useState(false)
  const [notFound, setNotFound] = useState(false)

  const joinUrl = `${window.location.origin}${window.location.pathname}#/join/${id}`

  useEffect(() => {
    const quizRef = ref(db, `quizzes/${id}`)
    const partRef = ref(db, `participants/${id}`)
    const ansRef  = ref(db, `answers/${id}`)

    onValue(quizRef, snap => {
      if (!snap.exists()) { setNotFound(true); return }
      setQuiz(snap.val())
    })
    onValue(partRef, snap => setParticipants(snap.val() || {}))
    onValue(ansRef,  snap => setAnswers(snap.val() || {}))

    return () => { off(quizRef); off(partRef); off(ansRef) }
  }, [id])

  if (notFound) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white text-center">
      <div>
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-xl font-bold">Quiz not found</p>
      </div>
    </div>
  )

  if (!quiz) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
      Loading...
    </div>
  )

  const participantList = Object.values(participants)
  const participantCount = participantList.length
  const currentQ = quiz.currentQuestion
  const question  = currentQ >= 0 ? quiz.questions[currentQ] : null

  // Tally answers for the current question
  const answerCounts = [0, 0, 0, 0]
  let answeredCount = 0
  if (question) {
    Object.values(answers).forEach(pAnswers => {
      if (pAnswers && pAnswers[currentQ] !== undefined) {
        answerCounts[pAnswers[currentQ]]++
        answeredCount++
      }
    })
  }

  // Compute leaderboard
  const leaderboard = Object.entries(participants)
    .map(([pid, p]) => {
      let score = 0
      if (answers[pid]) {
        quiz.questions.forEach((q, qi) => {
          if (answers[pid][qi] === q.correct) score += 1000
        })
      }
      return { name: p.name, score }
    })
    .sort((a, b) => b.score - a.score)

  // Host controls
  const startQuiz    = () => update(ref(db, `quizzes/${id}`), { currentQuestion: 0, showAnswer: false, status: 'active' })
  const revealAnswer = () => update(ref(db, `quizzes/${id}`), { showAnswer: true })
  const nextQuestion = () => update(ref(db, `quizzes/${id}`), { currentQuestion: currentQ + 1, showAnswer: false })
  const endQuiz      = () => update(ref(db, `quizzes/${id}`), { status: 'ended' })

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white flex flex-col">

      {/* Top bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-5 py-3 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-black text-lg leading-tight">{quiz.title}</h1>
          <p className="text-slate-400 text-xs">
            {quiz.status === 'waiting' && 'Lobby — waiting for players'}
            {quiz.status === 'active'  && `Question ${currentQ + 1} of ${quiz.questions.length}`}
            {quiz.status === 'ended'   && 'Quiz ended'}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black">{participantCount}</div>
          <div className="text-slate-400 text-xs">players</div>
        </div>
      </div>

      {/* Share banner */}
      <div className="bg-indigo-950 border-b border-indigo-800 px-5 py-2 flex items-center gap-3">
        <span className="text-indigo-300 text-xs font-semibold uppercase tracking-wider flex-shrink-0">Join link:</span>
        <span className="text-white/50 font-mono text-xs truncate flex-1">{joinUrl}</span>
        <button
          onClick={copyLink}
          className="flex-shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>

      <div className="flex flex-1 min-h-0">

        {/* Main area */}
        <div className="flex-1 flex flex-col p-6 overflow-y-auto">

          {/* LOBBY */}
          {quiz.status === 'waiting' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              {/* QR Code */}
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-xl">
                <QRCodeSVG value={joinUrl} size={180} />
              </div>
              <p className="text-slate-400 text-sm mb-6">Scan to join on any device</p>

              <h2 className="text-2xl font-black mb-1">{participantCount} player{participantCount !== 1 ? 's' : ''} joined</h2>
              <p className="text-slate-500 text-sm mb-6">{quiz.questions.length} questions</p>

              {participantCount > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mb-6 max-w-md">
                  {participantList.map((p, i) => (
                    <span key={i} className="bg-slate-700 text-white px-3 py-1 rounded-full text-sm font-semibold">
                      {p.name}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={startQuiz}
                disabled={participantCount === 0}
                className="bg-green-500 hover:bg-green-400 disabled:bg-slate-700 disabled:text-slate-500 text-white font-black text-2xl px-12 py-5 rounded-2xl transition-all transform hover:scale-105 shadow-xl shadow-green-900/40"
              >
                Start Quiz →
              </button>
              {participantCount === 0 && (
                <p className="text-slate-500 text-sm mt-3">Waiting for at least one player to join...</p>
              )}
              <button
                onClick={() => navigate(`/edit/${id}`)}
                className="mt-4 text-slate-500 hover:text-slate-300 text-sm transition-colors"
              >
                ✏ Edit quiz
              </button>
            </div>
          )}

          {/* ACTIVE QUESTION */}
          {quiz.status === 'active' && question && (
            <div className="flex flex-col gap-5">
              {/* Question card */}
              <div className="bg-slate-800 rounded-2xl p-6 text-center">
                <div className="text-indigo-400 text-xs font-bold uppercase tracking-widest mb-3">
                  Question {currentQ + 1} / {quiz.questions.length}
                </div>
                <h2 className="text-2xl font-bold leading-snug">{question.text}</h2>
              </div>

              {/* Answer distribution */}
              <div className={`grid ${optionGridCols(question.options.length)} gap-3`}>
                {question.options.map((opt, oi) => {
                  const count = answerCounts[oi]
                  const pct = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0
                  const isCorrect = oi === question.correct
                  return (
                    <div
                      key={oi}
                      className={`rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                        quiz.showAnswer
                          ? isCorrect
                            ? 'border-green-400 ring-2 ring-green-400/50'
                            : 'border-transparent opacity-40'
                          : 'border-transparent'
                      }`}
                    >
                      <div className={`${OPTION_COLORS[oi]} px-4 py-3 flex items-center gap-3`}>
                        <span className="text-xl font-black w-6 text-center">{OPTION_SHAPES[oi]}</span>
                        <span className="flex-1 font-semibold text-sm leading-tight">{opt}</span>
                        {quiz.showAnswer && isCorrect && <span className="text-lg">✓</span>}
                        <span className="font-black text-xl">{count}</span>
                      </div>
                      <div className="bg-slate-700 h-3">
                        <div
                          className={`${OPTION_COLORS[oi]} h-3 transition-all duration-700 ease-out`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="bg-slate-800 px-4 py-1 text-right text-xs text-slate-400">{pct}%</div>
                    </div>
                  )
                })}
              </div>

              {/* Response counter */}
              <div className="text-center text-slate-400 text-sm">
                <span className="text-white font-bold text-lg">{answeredCount}</span>
                {' / '}{participantCount} answered
              </div>

              {/* Controls */}
              <div className="flex justify-center gap-3 pt-2">
                {!quiz.showAnswer ? (
                  <button
                    onClick={revealAnswer}
                    className="bg-amber-500 hover:bg-amber-400 text-white font-black text-lg px-8 py-4 rounded-2xl transition-all transform hover:scale-105 shadow-lg"
                  >
                    Reveal Answer
                  </button>
                ) : currentQ < quiz.questions.length - 1 ? (
                  <button
                    onClick={nextQuestion}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg px-8 py-4 rounded-2xl transition-all transform hover:scale-105 shadow-lg"
                  >
                    Next Question →
                  </button>
                ) : (
                  <button
                    onClick={endQuiz}
                    className="bg-green-600 hover:bg-green-500 text-white font-black text-lg px-8 py-4 rounded-2xl transition-all transform hover:scale-105 shadow-lg"
                  >
                    End Quiz & Show Results 🏆
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ENDED */}
          {quiz.status === 'ended' && (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-3xl font-black mb-8">Final Leaderboard</h2>
              <div className="w-full max-w-md space-y-3">
                {leaderboard.map((p, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-4 p-4 rounded-2xl border ${
                      i === 0 ? 'bg-yellow-500/10 border-yellow-500/40' :
                      i === 1 ? 'bg-slate-400/10 border-slate-400/30' :
                      i === 2 ? 'bg-orange-700/10 border-orange-600/30' :
                                'bg-slate-800 border-slate-700'
                    }`}
                  >
                    <span className="text-2xl w-8 text-center">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </span>
                    <span className="flex-1 font-bold text-lg truncate">{p.name}</span>
                    <span className="font-black text-xl text-indigo-400">{p.score.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <button
                onClick={() => navigate('/create')}
                className="mt-10 bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 py-3 rounded-xl transition-colors"
              >
                Create Another Quiz
              </button>
            </div>
          )}
        </div>

        {/* Sidebar: live leaderboard (hidden in lobby) */}
        {quiz.status !== 'waiting' && (
          <div className="w-56 bg-slate-800 border-l border-slate-700 flex flex-col flex-shrink-0">
            <div className="px-4 pt-4 pb-2">
              <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest">Leaderboard</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
              {leaderboard.slice(0, 15).map((p, i) => (
                <div key={i} className="flex items-center gap-2 bg-slate-700/50 rounded-lg px-3 py-2">
                  <span className="text-slate-400 text-xs w-4 flex-shrink-0">{i + 1}</span>
                  <span className="flex-1 text-sm font-semibold truncate">{p.name}</span>
                  <span className="text-indigo-400 text-sm font-bold flex-shrink-0">{p.score}</span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <p className="text-slate-500 text-xs px-1 pt-1">No scores yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
