import { useState, useEffect } from 'react'
import EntryList from '../components/entries/EntryList'
import EntryForm from '../components/entries/EntryForm'

export default function TimerPage() {
  const [addingManual, setAddingManual] = useState(false)

  useEffect(() => {
    const handler = () => setAddingManual(true)
    window.addEventListener('open-manual-entry', handler)
    return () => window.removeEventListener('open-manual-entry', handler)
  }, [])

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Time Entries</h1>
          <p className="text-white/30 text-sm mt-0.5">Your tracked time, grouped by day</p>
        </div>
        <button
          onClick={() => setAddingManual(true)}
          className="px-4 py-2 rounded-xl btn-primary text-sm font-medium"
        >
          + Add Manual
        </button>
      </div>

      <EntryList />

      {addingManual && <EntryForm onClose={() => setAddingManual(false)} />}
    </div>
  )
}
