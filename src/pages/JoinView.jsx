import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ref, onValue, set, push, off } from 'firebase/database'
import { db } from '../firebase.js'
import { OPTION_COLORS_INTERACTIVE, OPTION_COLORS, OPTION_SHAPES, optionGridCols } from '../constants.js'

export default function JoinView() {
  const { id } = useParams()
  const [quiz, setQuiz] = useState(null)
  const [name, setName] = useState('')
  const [joining, setJoining] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [myAnswers, setMyAnswers] = useState({})

  const [participantId, setParticipantId] = useState(
    () => sessionStorage.getItem(`quizzer_pid_${id}`) || null
  )

  useEffect(() => {
    const quizRef = ref(db, `quizzes/${id}`)
    onValue(quizRef, snap => {
      if (!snap.exists()) { setNotFound(true); return }
      setQuiz(snap.val())
    })
    return () => off(quizRef)
  }, [id])

  useEffect(() => {
    if (!participantId) return
    const ansRef = ref(db, `answers/${id}/${participantId}`)
    onValue(ansRef, snap => setMyAnswers(snap.val() || {}))
    return () => off(ansRef)
  }, [participantId, id])

  const join = async () => {
    if (!name.trim() || joining) return
    setJoining(true)
    const partRef = push(ref(db, `participants/${id}`))
    await set(partRef, { name: name.trim(), joinedAt: Date.now() })
    sessionStorage.setItem(`quizzer_pid_${id}`, partRef.key)
    setParticipantId(partRef.key)
    setJoining(false)
  }

  const submitAnswer = async optionIndex => {
    if (!participantId || !quiz) return
    const qi = quiz.currentQuestion
    if (myAnswers[qi] !== undefined) return
    await set(ref(db, `answers/${id}/${participantId}/${qi}`), optionIndex)
  }

  if (notFound) return (
    <Screen>
      <div className="text-6xl mb-4">🔍</div>
      <h2 className="text-2xl font-bold mb-2">Quiz not found</h2>
      <p className="text-white/50">Double-check the link and try again.</p>
    </Screen>
  )

  if (!quiz) return (
    <Screen><p className="text-white/50">Loading...</p></Screen>
  )

  if (!participantId) return (
    <Screen>
      <img src="/cr-logo.png" alt="Cloud Revolution" className="h-7 opacity-60 mb-8" />
      <h1 className="text-3xl font-black mb-1">{quiz.title}</h1>
      <p className="text-white/50 mb-8">{quiz.questions.length} questions</p>

      {quiz.status === 'ended' ? (
        <p className="text-yellow-400 font-semibold">This quiz has already ended.</p>
      ) : (
        <div className="w-full max-w-xs space-y-3">
          <input
            type="text"
            placeholder="Enter your name..."
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && join()}
            maxLength={20}
            className="w-full bg-white/5 backdrop-blur-xl text-white placeholder-white/30 border border-white/10 focus:border-cyan-500/50 rounded-2xl px-4 py-4 text-lg outline-none transition-all"
            autoFocus
          />
          <button
            onClick={join}
            disabled={!name.trim() || joining}
            className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-white/5 disabled:to-white/5 disabled:text-white/20 text-white font-black text-xl py-4 rounded-2xl transition-all transform hover:scale-105 disabled:scale-100 shadow-lg shadow-cyan-900/30"
          >
            {joining ? 'Joining...' : 'Join Quiz!'}
          </button>
        </div>
      )}
    </Screen>
  )

  if (quiz.status === 'waiting') return (
    <Screen>
      <div className="text-7xl mb-6 animate-bounce">⏳</div>
      <h2 className="text-3xl font-black mb-2">You're in!</h2>
      <p className="text-xl text-white/70 mb-2">{quiz.title}</p>
      <p className="text-white/40 text-sm">Waiting for the host to start the quiz...</p>
      <div className="mt-8 inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 backdrop-blur-xl">
        <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
        <span className="text-sm text-white/60">Connected</span>
      </div>
    </Screen>
  )

  if (quiz.status === 'ended') {
    let correct = 0
    quiz.questions.forEach((q, qi) => {
      if (myAnswers[qi] === q.correct) correct++
    })
    const score = correct * 1000
    return (
      <Screen>
        <div className="text-7xl mb-4">🏆</div>
        <h2 className="text-3xl font-black mb-2">Quiz Complete!</h2>
        <div className="text-6xl font-black text-yellow-400 my-4">{score.toLocaleString()}</div>
        <p className="text-white/60 text-lg">{correct} / {quiz.questions.length} correct</p>
        <p className="text-white/40 text-sm mt-3">Check the host screen for the final leaderboard!</p>
      </Screen>
    )
  }

  // Active question
  const currentQ   = quiz.currentQuestion
  const question   = quiz.questions[currentQ]
  const myAnswer   = myAnswers[currentQ]
  const hasAnswered = myAnswer !== undefined

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white flex flex-col">
      {/* Progress bar */}
      <div className="bg-white/5 h-1.5 flex-shrink-0">
        <div
          className="bg-gradient-to-r from-cyan-500 to-blue-600 h-1.5 transition-all duration-500"
          style={{ width: `${((currentQ + 1) / quiz.questions.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col p-5 max-w-lg mx-auto w-full">
        <div className="text-white/30 text-xs font-bold uppercase tracking-widest text-center pt-4 pb-5">
          Question {currentQ + 1} of {quiz.questions.length}
        </div>

        {/* Question text */}
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 mb-5 text-center">
          <p className="text-xl font-bold leading-relaxed">{question.text}</p>
        </div>

        {/* Not yet answered */}
        {!hasAnswered && (
          <div className={`grid ${optionGridCols(question.options.length)} gap-3 flex-1`}>
            {question.options.map((opt, oi) => (
              <button
                key={oi}
                onClick={() => submitAnswer(oi)}
                className={`${OPTION_COLORS_INTERACTIVE[oi]} text-white font-bold rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all transform active:scale-95 shadow-lg min-h-28`}
              >
                <span className="text-3xl">{OPTION_SHAPES[oi]}</span>
                <span className="text-center text-sm leading-snug">{opt}</span>
              </button>
            ))}
          </div>
        )}

        {/* Already answered */}
        {hasAnswered && (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
            {!quiz.showAnswer ? (
              <>
                <div className="text-6xl animate-bounce">✋</div>
                <h3 className="text-2xl font-black">Answer locked in!</h3>
                <div className={`${OPTION_COLORS[myAnswer]} inline-flex items-center gap-3 px-6 py-3 rounded-xl`}>
                  <span className="text-2xl">{OPTION_SHAPES[myAnswer]}</span>
                  <span className="font-bold">{question.options[myAnswer]}</span>
                </div>
                <p className="text-white/40 text-sm">Waiting for the host to reveal the answer...</p>
              </>
            ) : myAnswer === question.correct ? (
              <>
                <div className="text-7xl">🎉</div>
                <h3 className="text-3xl font-black text-green-400">Correct!</h3>
                <div className="text-5xl font-black text-yellow-400">+1,000</div>
                {question.explanation && (
                  <div className="bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-xl rounded-2xl px-5 py-4 text-sm text-cyan-100 leading-relaxed max-w-sm text-left mt-2">
                    <div className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1.5">Did you know?</div>
                    {question.explanation}
                  </div>
                )}
                <p className="text-white/40 text-sm mt-2">Waiting for the next question...</p>
              </>
            ) : (
              <>
                <div className="text-7xl">😬</div>
                <h3 className="text-3xl font-black text-red-400">Incorrect</h3>
                <p className="text-white/40 text-sm">The correct answer was:</p>
                <div className={`${OPTION_COLORS[question.correct]} inline-flex items-center gap-3 px-5 py-3 rounded-xl`}>
                  <span className="text-xl">{OPTION_SHAPES[question.correct]}</span>
                  <span className="font-bold">{question.options[question.correct]}</span>
                </div>
                {question.explanation && (
                  <div className="bg-cyan-500/10 border border-cyan-500/20 backdrop-blur-xl rounded-2xl px-5 py-4 text-sm text-cyan-100 leading-relaxed max-w-sm text-left">
                    <div className="text-cyan-400 text-xs font-bold uppercase tracking-wider mb-1.5">Explanation</div>
                    {question.explanation}
                  </div>
                )}
                <p className="text-white/40 text-sm mt-2">Waiting for the next question...</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function Screen({ children }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 flex items-center justify-center p-6 text-white text-center">
      <div className="flex flex-col items-center">{children}</div>
    </div>
  )
}
