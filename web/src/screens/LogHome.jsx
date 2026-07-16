import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useHousehold } from '../state/HouseholdContext'
import OnDutyHeader from '../components/OnDutyHeader'
import TaskRow from '../components/TaskRow'
import { PlusIcon } from '../components/icons'

const FILTERS = [
  { id: 'all', label: 'All', match: () => true },
  { id: 'todo', label: 'To do', match: (t) => !t.done },
  { id: 'done', label: 'Completed', match: (t) => t.done },
]

function todayLabel() {
  return new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

// Segmented All / To do / Completed control — iOS track style, matching the
// app's other filter pills: a soft gray track with a white active segment.
function FilterTabs({ value, onChange }) {
  return (
    <div className="flex rounded-full bg-track p-1">
      {FILTERS.map((f) => {
        const active = value === f.id
        return (
          <button
            key={f.id}
            type="button"
            onClick={() => onChange(f.id)}
            className={`flex-1 rounded-full py-2 text-[13px] font-semibold tracking-tight transition-colors ${
              active ? 'bg-white text-ink shadow-soft' : 'text-muted'
            }`}
          >
            {f.label}
          </button>
        )
      })}
    </div>
  )
}

export default function LogHome() {
  const navigate = useNavigate()
  const { tasks, toggleTask, toggleTaskFlag, addTask } = useHousehold()
  const [filter, setFilter] = useState('all')
  const [newTitle, setNewTitle] = useState('')

  const matcher = FILTERS.find((f) => f.id === filter)?.match ?? (() => true)
  const visible = tasks.filter(matcher)

  const submitNewTask = () => {
    const title = newTitle.trim()
    if (!title) return
    addTask({ title })
    setNewTitle('')
  }

  return (
    <>
      <OnDutyHeader />
      <main className="flex-1 bg-white px-4 pb-10 pt-6">
        <h1 className="text-[30px] font-bold leading-tight tracking-tighter text-ink">Log</h1>
        <p className="mt-1 text-[14px] font-medium text-muted">{todayLabel()}</p>

        <button
          type="button"
          onClick={() => navigate('note')}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-btn bg-ink py-3.5 text-[16px] font-semibold text-white transition-transform active:scale-[0.99]"
        >
          <PlusIcon width={18} height={18} strokeWidth={2.5} />
          Log a new Note Entry
        </button>

        <section className="mt-7">
          <p className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.04em] text-faint">Today's tasks</p>
          <FilterTabs value={filter} onChange={setFilter} />

          <div className="mt-3 space-y-2.5">
            {visible.length === 0 ? (
              <p className="rounded-card border border-line bg-white px-4 py-6 text-center text-[14px] font-medium text-muted">
                {filter === 'done' ? 'Nothing checked off yet.' : 'All caught up — no open tasks.'}
              </p>
            ) : (
              visible.map((task) => (
                <div key={task.id} className="rounded-card border border-line bg-white p-4">
                  <TaskRow
                    task={task}
                    onToggle={() => toggleTask(task.id)}
                    onToggleFlag={() => toggleTaskFlag(task.id)}
                  />
                </div>
              ))
            )}
          </div>

          {/* Quick-add — title only; note/time can be edited later. */}
          <div className="mt-2.5 flex items-center gap-2.5 rounded-card border border-line bg-white px-4 py-3.5">
            <PlusIcon width={18} height={18} strokeWidth={2.5} className="shrink-0 text-faint" />
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitNewTask()}
              placeholder="Add a new task…"
              className="min-w-0 flex-1 bg-transparent text-[15px] font-medium text-ink placeholder:text-faint focus:outline-none"
            />
            {newTitle.trim() && (
              <button
                type="button"
                onClick={submitNewTask}
                className="shrink-0 rounded-full bg-ink px-3 py-1.5 text-[13px] font-semibold text-white active:scale-95"
              >
                Add
              </button>
            )}
          </div>
        </section>
      </main>
    </>
  )
}
