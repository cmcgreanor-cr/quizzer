import { HashRouter, Routes, Route } from 'react-router-dom'
import { firebaseConfigured } from './firebase.js'
import Home from './pages/Home.jsx'
import CreateQuiz from './pages/CreateQuiz.jsx'
import HostView from './pages/HostView.jsx'
import JoinView from './pages/JoinView.jsx'

function SetupScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 flex items-center justify-center p-6 text-white">
      <div className="max-w-lg w-full">
        <div className="text-5xl mb-4 text-center">🔧</div>
        <h1 className="text-3xl font-black text-center mb-2">Firebase Setup Required</h1>
        <p className="text-purple-200 text-center mb-8">Create a <code className="bg-white/10 px-1.5 py-0.5 rounded">.env</code> file in the project root with your Firebase credentials.</p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 font-mono text-sm text-green-300 space-y-1 mb-6">
          <p className="text-slate-400"># .env</p>
          <p>VITE_FIREBASE_API_KEY=<span className="text-white">your-api-key</span></p>
          <p>VITE_FIREBASE_AUTH_DOMAIN=<span className="text-white">your-id.firebaseapp.com</span></p>
          <p>VITE_FIREBASE_DATABASE_URL=<span className="text-white">https://your-id-rtdb.firebaseio.com</span></p>
          <p>VITE_FIREBASE_PROJECT_ID=<span className="text-white">your-project-id</span></p>
          <p>VITE_FIREBASE_STORAGE_BUCKET=<span className="text-white">your-id.appspot.com</span></p>
          <p>VITE_FIREBASE_MESSAGING_SENDER_ID=<span className="text-white">your-sender-id</span></p>
          <p>VITE_FIREBASE_APP_ID=<span className="text-white">your-app-id</span></p>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-sm space-y-3 text-purple-100">
          <p className="font-bold text-white">Quick setup steps:</p>
          <ol className="list-decimal list-inside space-y-2">
            <li>Go to <span className="text-indigo-300">console.firebase.google.com</span> and create a project</li>
            <li>Enable <span className="font-semibold">Realtime Database</span> (Build → Realtime Database → Create)</li>
            <li>Set rules to allow read/write while testing:<br/>
              <code className="bg-white/10 px-2 py-0.5 rounded text-xs block mt-1">{`{ "rules": { ".read": true, ".write": true } }`}</code>
            </li>
            <li>Go to Project Settings → Your apps → Add Web App</li>
            <li>Copy the config values into your <code className="bg-white/10 px-1 rounded">.env</code> file</li>
            <li>Restart the dev server</li>
          </ol>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  if (!firebaseConfigured) return <SetupScreen />

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/create" element={<CreateQuiz />} />
        <Route path="/host/:id" element={<HostView />} />
        <Route path="/join/:id" element={<JoinView />} />
      </Routes>
    </HashRouter>
  )
}
