import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ref, onValue, update, remove, off } from 'firebase/database'
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
  const [timeLeft, setTimeLeft] = useState(null)
  const timerRef = useRef(null)

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

  // Countdown timer — auto-reveals when it hits 0
  useEffect(() => {
    clearInterval(timerRef.current)
    if (!quiz || quiz.status !== 'active' || quiz.showAnswer) { setTimeLeft(null); return }
    const question = quiz.questions[quiz.currentQuestion]
    const duration = question?.timer ?? 0
    if (!duration || !quiz.questionStartedAt) { setTimeLeft(null); return }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - quiz.questionStartedAt) / 1000)
      const remaining = duration - elapsed
      if (remaining <= 0) {
        clearInterval(timerRef.current)
        setTimeLeft(0)
        update(ref(db, `quizzes/${id}`), { showAnswer: true })
      } else {
        setTimeLeft(remaining)
      }
    }
    tick()
    timerRef.current = setInterval(tick, 500)
    return () => clearInterval(timerRef.current)
  }, [quiz?.currentQuestion, quiz?.showAnswer, quiz?.status, quiz?.questionStartedAt, id])

  if (notFound) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center text-white text-center">
      <div>
        <div className="text-5xl mb-4">🔍</div>
        <p className="text-xl font-bold">Quiz not found</p>
      </div>
    </div>
  )

  if (!quiz) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center text-white">
      Loading...
    </div>
  )

  const participantList = Object.values(participants)
  const participantCount = participantList.length
  const currentQ = quiz.currentQuestion
  const question  = currentQ >= 0 ? quiz.questions[currentQ] : null

  // Tally answers for the current question (dynamic option count)
  const answerCounts = question ? Array(question.options.length).fill(0) : []
  let answeredCount = 0
  if (question) {
    Object.values(answers).forEach(pAnswers => {
      const ans = pAnswers && pAnswers[currentQ]
      if (ans !== undefined && ans < answerCounts.length) {
        answerCounts[ans]++
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
  const startQuiz    = () => update(ref(db, `quizzes/${id}`), { currentQuestion: 0, showAnswer: false, status: 'active', questionStartedAt: Date.now() })
  const revealAnswer = () => update(ref(db, `quizzes/${id}`), { showAnswer: true })
  const nextQuestion = () => update(ref(db, `quizzes/${id}`), { currentQuestion: currentQ + 1, showAnswer: false, questionStartedAt: Date.now() })
  const endQuiz      = () => update(ref(db, `quizzes/${id}`), { status: 'ended' })
  const resetQuiz    = async () => {
    await Promise.all([remove(ref(db, `participants/${id}`)), remove(ref(db, `answers/${id}`))])
    await update(ref(db, `quizzes/${id}`), { currentQuestion: -1, showAnswer: false, status: 'waiting', questionStartedAt: null })
  }

  const copyLink = () => {
    navigator.clipboard.writeText(joinUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white flex flex-col">

      {/* Top bar */}
      <div className="bg-white/5 backdrop-blur-xl border-b border-white/10 px-4 py-3 flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/cr-logo.svg" alt="Cloud Revolution" className="h-5 opacity-70 flex-shrink-0 hidden sm:block" />
          <div className="w-px h-5 bg-white/10 hidden sm:block" />
          <div className="min-w-0">
            <h1 className="font-black text-base sm:text-lg leading-tight truncate">{quiz.title}</h1>
            <p className="text-white/40 text-xs hidden sm:block">
              {quiz.status === 'waiting' && 'Lobby — waiting for players'}
              {quiz.status === 'active'  && `Question ${currentQ + 1} of ${quiz.questions.length}`}
              {quiz.status === 'ended'   && 'Quiz ended'}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0 ml-3">
          <div className="text-xl sm:text-2xl font-black text-cyan-400">{participantCount}</div>
          <div className="text-white/40 text-xs">players</div>
        </div>
      </div>

      {/* Share banner */}
      <div className="bg-cyan-950/40 border-b border-cyan-500/20 px-4 py-2 flex items-center gap-2">
        <span className="text-cyan-400 text-xs font-semibold uppercase tracking-wider flex-shrink-0">Join:</span>
        <span className="text-white/30 font-mono text-xs truncate flex-1 hidden sm:block">{joinUrl}</span>
        <button
          onClick={copyLink}
          className="flex-shrink-0 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/30 text-cyan-300 text-sm font-bold px-3 py-1.5 rounded-lg transition-colors"
        >
          {copied ? '✓ Copied' : 'Copy Link'}
        </button>
      </div>

      <div className="flex flex-1 min-h-0">

        {/* Main area */}
        <div className="flex-1 flex flex-col p-4 sm:p-6 overflow-y-auto">

          {/* LOBBY */}
          {quiz.status === 'waiting' && (
            <div className="flex-1 flex flex-col items-center justify-center text-center">
              {/* QR Code */}
              <div className="bg-white rounded-2xl p-3 sm:p-4 mb-4 shadow-2xl shadow-cyan-900/30">
                <QRCodeSVG value={joinUrl} size={150} className="sm:hidden" />
                <QRCodeSVG value={joinUrl} size={180} className="hidden sm:block" />
              </div>
              <p className="text-white/40 text-sm mb-5">Scan to join on any device</p>

              <h2 className="text-xl sm:text-2xl font-black mb-1">{participantCount} player{participantCount !== 1 ? 's' : ''} joined</h2>
              <p className="text-white/40 text-sm mb-5">{quiz.questions.length} questions</p>

              {participantCount > 0 && (
                <div className="flex flex-wrap gap-2 justify-center mb-5 max-w-sm">
                  {participantList.map((p, i) => (
                    <span key={i} className="bg-white/10 border border-white/10 text-white px-3 py-1 rounded-full text-sm font-semibold backdrop-blur-xl">
                      {p.name}
                    </span>
                  ))}
                </div>
              )}

              <button
                onClick={startQuiz}
                disabled={participantCount === 0}
                className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-white/5 disabled:to-white/5 disabled:text-white/20 text-white font-black text-2xl sm:text-3xl px-12 py-6 rounded-2xl transition-all transform hover:scale-105 shadow-xl shadow-cyan-900/30 w-full max-w-xs"
              >
                Start Quiz →
              </button>
              {participantCount === 0 && (
                <p className="text-white/30 text-sm mt-3">Waiting for at least one player to join...</p>
              )}
              <div className="mt-4 flex gap-4">
                <button
                  onClick={() => navigate(`/qr/${id}`)}
                  className="text-cyan-400/60 hover:text-cyan-300 text-sm transition-colors font-semibold"
                >
                  ⬜ Share QR
                </button>
                <button
                  onClick={() => navigate(`/edit/${id}`)}
                  className="text-white/30 hover:text-white/60 text-sm transition-colors"
                >
                  ✏ Edit quiz
                </button>
              </div>
            </div>
          )}

          {/* ACTIVE QUESTION */}
          {quiz.status === 'active' && question && (
            <div className="flex flex-col gap-4">
              {/* Question card */}
              <div className="bg-white/5 backdrop-blur-xl rounded-2xl p-4 sm:p-6 text-center border border-white/10">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <div className="text-cyan-400 text-xs font-bold uppercase tracking-widest">
                    Question {currentQ + 1} / {quiz.questions.length}
                  </div>
                  {timeLeft !== null && (
                    <div className={`text-xs font-black px-2 py-0.5 rounded-full ${
                      timeLeft > 10 ? 'bg-cyan-500/20 text-cyan-300' :
                      timeLeft > 5  ? 'bg-amber-500/20 text-amber-300' :
                                      'bg-red-500/30 text-red-300 animate-pulse'
                    }`}>
                      ⏱ {timeLeft}s
                    </div>
                  )}
                </div>
                {timeLeft !== null && (question.timer ?? 0) > 0 && (
                  <div className="w-full bg-white/10 rounded-full h-1.5 mb-3 overflow-hidden">
                    <div
                      className={`h-1.5 rounded-full transition-all duration-500 ${
                        timeLeft > 10 ? 'bg-cyan-400' : timeLeft > 5 ? 'bg-amber-400' : 'bg-red-400'
                      }`}
                      style={{ width: `${(timeLeft / (question.timer ?? 1)) * 100}%` }}
                    />
                  </div>
                )}
                <h2 className="text-lg sm:text-2xl font-bold leading-snug">{question.text}</h2>
              </div>

              {/* Answer distribution */}
              <div className={`grid ${optionGridCols(question.options.length)} gap-2 sm:gap-3`}>
                {question.options.map((opt, oi) => {
                  const count = answerCounts[oi]
                  const pct = answeredCount > 0 ? Math.round((count / answeredCount) * 100) : 0
                  const isCorrect = oi === question.correct
                  return (
                    <div
                      key={oi}
                      className={`rounded-xl sm:rounded-2xl overflow-hidden border-2 transition-all duration-300 ${
                        quiz.showAnswer
                          ? isCorrect
                            ? 'border-green-400 ring-2 ring-green-400/30 shadow-lg shadow-green-500/20'
                            : 'border-transparent opacity-40'
                          : 'border-transparent'
                      }`}
                    >
                      <div className={`${OPTION_COLORS[oi]} px-3 py-2 sm:px-4 sm:py-3 flex items-center gap-2`}>
                        <span className="text-base sm:text-xl font-black w-5 text-center flex-shrink-0">{OPTION_SHAPES[oi]}</span>
                        <span className="flex-1 font-semibold text-xs sm:text-sm leading-tight">{opt}</span>
                        {quiz.showAnswer && isCorrect && <span className="text-base sm:text-lg">✓</span>}
                        <span className="font-black text-base sm:text-xl flex-shrink-0">{count}</span>
                      </div>
                      <div className="bg-white/5 h-2 sm:h-3">
                        <div
                          className={`${OPTION_COLORS[oi]} h-2 sm:h-3 transition-all duration-700 ease-out`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="bg-white/5 px-3 py-0.5 text-right text-xs text-white/40">{pct}%</div>
                    </div>
                  )
                })}
              </div>

              {/* Explanation (shown after reveal) */}
              {quiz.showAnswer && question.explanation && (
                <div className="bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-xl rounded-2xl px-4 py-3 text-sm text-cyan-100 leading-relaxed">
                  <div className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1.5">Explanation</div>
                  {question.explanation}
                </div>
              )}

              {/* Response counter */}
              <div className="text-center text-white/40 text-sm">
                <span className="text-white font-bold text-lg">{answeredCount}</span>
                {' / '}{participantCount} answered
              </div>

              {/* Controls — large touch targets for mobile */}
              <div className="flex flex-col items-center gap-3 pt-1 pb-2">
                <div className="w-full max-w-xs">
                  {!quiz.showAnswer ? (
                    <button
                      onClick={revealAnswer}
                      className="bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-white font-black text-xl sm:text-lg px-8 py-5 sm:py-4 rounded-2xl transition-all transform hover:scale-105 shadow-lg shadow-amber-900/30 w-full"
                    >
                      Reveal Answer
                    </button>
                  ) : currentQ < quiz.questions.length - 1 ? (
                    <button
                      onClick={nextQuestion}
                      className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 active:from-cyan-600 active:to-blue-700 text-white font-black text-xl sm:text-lg px-8 py-5 sm:py-4 rounded-2xl transition-all transform hover:scale-105 shadow-lg shadow-cyan-900/30 w-full"
                    >
                      Next Question →
                    </button>
                  ) : (
                    <button
                      onClick={endQuiz}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 active:from-green-600 active:to-emerald-700 text-white font-black text-xl sm:text-lg px-8 py-5 sm:py-4 rounded-2xl transition-all transform hover:scale-105 shadow-lg w-full"
                    >
                      End Quiz & Show Results 🏆
                    </button>
                  )}
                </div>
                {/* End quiz early — always available during active state */}
                {currentQ < quiz.questions.length - 1 && (
                  <button
                    onClick={() => { if (window.confirm('End the quiz now and show final results?')) endQuiz() }}
                    className="text-white/25 hover:text-red-400 text-xs font-semibold transition-colors py-1"
                  >
                    End quiz early
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
                    className={`flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-xl ${
                      i === 0 ? 'bg-yellow-500/10 border-yellow-500/30' :
                      i === 1 ? 'bg-white/5 border-white/10' :
                      i === 2 ? 'bg-orange-500/10 border-orange-500/20' :
                                'bg-white/5 border-white/5'
                    }`}
                  >
                    <span className="text-2xl w-8 text-center">
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i + 1}
                    </span>
                    <span className="flex-1 font-bold text-lg truncate">{p.name}</span>
                    <span className="font-black text-xl text-cyan-400">{p.score.toLocaleString()}</span>
                  </div>
                ))}
              </div>
              <div className="mt-10 flex flex-col sm:flex-row gap-3 items-center">
                <button
                  onClick={resetQuiz}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-lg px-8 py-4 rounded-2xl transition-all transform hover:scale-105 shadow-lg shadow-cyan-900/30"
                >
                  ↺ Run Again
                </button>
                <button
                  onClick={() => navigate('/')}
                  className="text-white/40 hover:text-white/70 font-semibold px-6 py-4 rounded-2xl transition-colors text-sm"
                >
                  Back to Home
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: live leaderboard — desktop only */}
        {quiz.status !== 'waiting' && (
          <div className="hidden md:flex w-56 bg-white/5 backdrop-blur-xl border-l border-white/10 flex-col flex-shrink-0">
            <div className="px-4 pt-4 pb-2">
              <h3 className="text-white/30 text-xs font-bold uppercase tracking-widest">Leaderboard</h3>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-1.5">
              {leaderboard.slice(0, 15).map((p, i) => (
                <div key={i} className="flex items-center gap-2 bg-white/5 rounded-lg px-3 py-2 border border-white/5">
                  <span className="text-white/30 text-xs w-4 flex-shrink-0">{i + 1}</span>
                  <span className="flex-1 text-sm font-semibold truncate">{p.name}</span>
                  <span className="text-cyan-400 text-sm font-bold flex-shrink-0">{p.score}</span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <p className="text-white/20 text-xs px-1 pt-1">No scores yet</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
