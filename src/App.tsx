import './App.css'

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <div>
          <p className="app__eyebrow">Monaco + Piston</p>
          <h1>Code Runner Studio</h1>
          <p className="app__subtitle">
            Clean scaffold for the editor shell and execution pipeline. Monaco
            and Piston wiring will follow once the resources are provided.
          </p>
        </div>
        <div className="app__actions">
          <label className="control">
            <span>Language</span>
            <select disabled aria-disabled="true">
              <option>Choose language</option>
            </select>
          </label>
          <button className="run-button" type="button" disabled>
            Run
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="panel panel--editor">
          <header className="panel__header">
            <h2>Editor</h2>
            <span className="panel__hint">Monaco mounts here</span>
          </header>
          <div className="editor-shell" role="presentation">
            <div className="editor-placeholder">
              <div className="editor-line"></div>
              <div className="editor-line"></div>
              <div className="editor-line"></div>
              <div className="editor-line"></div>
              <div className="editor-line"></div>
              <div className="editor-line"></div>
              <div className="editor-line"></div>
              <div className="editor-line"></div>
              <div className="editor-line"></div>
            </div>
            <div className="editor-caption">Drop the Monaco editor here.</div>
          </div>
        </section>

        <section className="panel panel--io">
          <header className="panel__header">
            <h2>Runner</h2>
            <span className="panel__hint">Piston wiring pending</span>
          </header>
          <div className="io-block">
            <h3>Input</h3>
            <div className="io-surface">STDIN placeholder</div>
          </div>
          <div className="io-block">
            <h3>Output</h3>
            <div className="io-surface io-surface--output">
              Execution output will appear here.
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
