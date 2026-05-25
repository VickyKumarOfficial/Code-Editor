import { useEffect, useMemo, useRef, useState } from 'react'
import MonacoEditor from 'react-monaco-editor'
import './App.css'

type Runtime = {
  language: string
  version: string
  aliases: string[]
  runtime?: string
}

type PistonStage = {
  stdout: string
  stderr: string
  output: string
  code: number | null
  signal: string | null
}

type PistonExecuteResponse = {
  language: string
  version: string
  run: PistonStage
  compile?: PistonStage
}

const PISTON_BASE =
  import.meta.env.VITE_PISTON_BASE ?? 'https://emkc.org/api/v2/piston'

const LANGUAGE_SNIPPETS: Record<string, string> = {
  javascript: 'console.log("Hello from JavaScript")',
  typescript: 'const message: string = "Hello from TypeScript"\nconsole.log(message)',
  python: 'print("Hello from Python")',
  bash: 'echo "Hello from Bash"',
  c: '#include <stdio.h>\n\nint main() {\n  printf("Hello from C\\n");\n  return 0;\n}',
  cpp: '#include <iostream>\n\nint main() {\n  std::cout << "Hello from C++" << std::endl;\n  return 0;\n}',
  java: 'public class Main {\n  public static void main(String[] args) {\n    System.out.println("Hello from Java");\n  }\n}',
  go: 'package main\n\nimport "fmt"\n\nfunc main() {\n  fmt.Println("Hello from Go")\n}',
  rust: 'fn main() {\n  println!("Hello from Rust");\n}',
}

const MONACO_LANGUAGE_MAP: Record<string, string> = {
  bash: 'shell',
  c: 'c',
  cpp: 'cpp',
  csharp: 'csharp',
  css: 'css',
  go: 'go',
  html: 'html',
  java: 'java',
  javascript: 'javascript',
  json: 'json',
  php: 'php',
  python: 'python',
  ruby: 'ruby',
  rust: 'rust',
  typescript: 'typescript',
}

const LANGUAGE_EXTENSION_MAP: Record<string, string> = {
  bash: 'sh',
  c: 'c',
  cpp: 'cpp',
  csharp: 'cs',
  go: 'go',
  java: 'java',
  javascript: 'js',
  json: 'json',
  php: 'php',
  python: 'py',
  ruby: 'rb',
  rust: 'rs',
  typescript: 'ts',
}

function getRuntimeKey(runtime: Runtime) {
  return `${runtime.language}@${runtime.version}`
}

function getDefaultSnippet(language: string) {
  return (
    LANGUAGE_SNIPPETS[language] ??
    `// Write ${language} code here.`
  )
}

function getMonacoLanguage(language: string) {
  return MONACO_LANGUAGE_MAP[language] ?? 'plaintext'
}

function getFileName(language: string) {
  const extension = LANGUAGE_EXTENSION_MAP[language] ?? 'txt'
  const baseName = language === 'java' ? 'Main' : 'main'
  return `${baseName}.${extension}`
}

function App() {
  const [runtimes, setRuntimes] = useState<Runtime[]>([])
  const [selectedRuntime, setSelectedRuntime] = useState('')
  const [code, setCode] = useState('')
  const [stdin, setStdin] = useState('')
  const [args, setArgs] = useState('')
  const [compileOutput, setCompileOutput] = useState('')
  const [runOutput, setRunOutput] = useState('')
  const [compileSummary, setCompileSummary] = useState('')
  const [runSummary, setRunSummary] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [isLoadingRuntimes, setIsLoadingRuntimes] = useState(false)
  const hasUserEditedRef = useRef(false)

  const runtime = useMemo(
    () => runtimes.find((item) => getRuntimeKey(item) === selectedRuntime),
    [runtimes, selectedRuntime],
  )

  const editorLanguage = runtime ? getMonacoLanguage(runtime.language) : 'plaintext'

  useEffect(() => {
    let isActive = true

    const loadRuntimes = async () => {
      setIsLoadingRuntimes(true)
      try {
        const response = await fetch(`${PISTON_BASE}/runtimes`)
        if (!response.ok) {
          throw new Error(`Failed to load runtimes (${response.status})`)
        }

        const data = (await response.json()) as Runtime[]
        if (!isActive) {
          return
        }

        setRuntimes(data)
        const preferred =
          data.find((item) => item.language === 'javascript') ?? data[0]
        if (preferred) {
          const key = getRuntimeKey(preferred)
          setSelectedRuntime(key)
          if (!hasUserEditedRef.current) {
            setCode(getDefaultSnippet(preferred.language))
          }
        }
      } catch (fetchError) {
        if (isActive) {
          const message =
            fetchError instanceof Error
              ? fetchError.message
              : 'Failed to load runtimes.'
          setError(message)
        }
      } finally {
        if (isActive) {
          setIsLoadingRuntimes(false)
        }
      }
    }

    loadRuntimes()
    return () => {
      isActive = false
    }
  }, [])

  useEffect(() => {
    if (!runtime || hasUserEditedRef.current) {
      return
    }
    setCode(getDefaultSnippet(runtime.language))
  }, [runtime])

  const editorOptions = useMemo(
    () => ({
      fontSize: 14,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
    }),
    [],
  )

  const handleEditorChange = (value: string) => {
    hasUserEditedRef.current = true
    setCode(value ?? '')
  }

  const handleUseSnippet = () => {
    if (!runtime) {
      return
    }
    hasUserEditedRef.current = false
    setCode(getDefaultSnippet(runtime.language))
  }

  const handleRun = async () => {
    if (!runtime) {
      return
    }

    setIsRunning(true)
    setError(null)
    setCompileOutput('')
    setRunOutput('')
    setCompileSummary('')
    setRunSummary('')

    const parsedArgs = args.trim() ? args.trim().split(/\s+/) : []
    const payload = {
      language: runtime.language,
      version: runtime.version,
      files: [
        {
          name: getFileName(runtime.language),
          content: code,
        },
      ],
      stdin,
      args: parsedArgs,
      compile_timeout: 10000,
      run_timeout: 10000,
      compile_memory_limit: -1,
      run_memory_limit: -1,
    }

    try {
      const response = await fetch(`${PISTON_BASE}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const message = await response
          .json()
          .then((data) => data?.message as string)
          .catch(() => '')
        throw new Error(message || `Execution failed (${response.status})`)
      }

      const data = (await response.json()) as PistonExecuteResponse
      const compileStage = data.compile
      if (compileStage) {
        setCompileOutput(compileStage.output || '')
        setCompileSummary(
          `Compile exit: ${compileStage.code ?? 'n/a'}${
            compileStage.signal ? ` (signal ${compileStage.signal})` : ''
          }`,
        )
      }

      if (data.run) {
        setRunOutput(data.run.output || '')
        setRunSummary(
          `Run exit: ${data.run.code ?? 'n/a'}${
            data.run.signal ? ` (signal ${data.run.signal})` : ''
          }`,
        )
      }
    } catch (runError) {
      const message =
        runError instanceof Error
          ? runError.message
          : 'Failed to execute code.'
      setError(message)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <div>
          <p className="app__eyebrow">Monaco + Piston</p>
          <h1>Code Runner Studio</h1>
          <p className="app__subtitle">
            Select a runtime, write code, and execute it via the Piston API.
          </p>
          <p className="app__meta">API: {PISTON_BASE}</p>
        </div>
        <div className="app__actions">
          <button
            className="run-button"
            type="button"
            onClick={handleRun}
            disabled={isRunning || !runtime || !code.trim()}
          >
            {isRunning ? 'Running...' : 'Run'}
          </button>
        </div>
      </header>

      <main className="workspace">
        <section className="panel panel--editor">
          <header className="panel__header">
            <div>
              <h2>Editor</h2>
              <p className="panel__hint">Runtime-aware Monaco editor</p>
            </div>
            <div className="panel__controls">
              <label className="field">
                <span>Runtime</span>
                <select
                  value={selectedRuntime}
                  onChange={(event) => setSelectedRuntime(event.target.value)}
                  disabled={isLoadingRuntimes || runtimes.length === 0}
                >
                  {runtimes.length === 0 ? (
                    <option value="">Loading runtimes...</option>
                  ) : (
                    runtimes.map((item) => (
                      <option key={getRuntimeKey(item)} value={getRuntimeKey(item)}>
                        {item.language} {item.version}
                      </option>
                    ))
                  )}
                </select>
              </label>
              <button className="ghost-button" type="button" onClick={handleUseSnippet}>
                Use snippet
              </button>
            </div>
          </header>
          <div className="editor-area">
            <MonacoEditor
              width="100%"
              height="100%"
              language={editorLanguage}
              theme="vs-dark"
              value={code}
              options={editorOptions}
              onChange={handleEditorChange}
            />
          </div>
        </section>

        <section className="panel panel--runner">
          <header className="panel__header">
            <div>
              <h2>Runner</h2>
              <p className="panel__hint">Piston execute response</p>
            </div>
            {runtime && (
              <span className="panel__badge">
                {runtime.language} {runtime.version}
              </span>
            )}
          </header>

          <div className="runner-inputs">
            <label className="field">
              <span>Arguments</span>
              <input
                type="text"
                placeholder="e.g. 1 2 3"
                value={args}
                onChange={(event) => setArgs(event.target.value)}
              />
            </label>
            <label className="field field--textarea">
              <span>STDIN</span>
              <textarea
                rows={6}
                placeholder="Input passed to stdin"
                value={stdin}
                onChange={(event) => setStdin(event.target.value)}
              />
            </label>
          </div>

          {error && <div className="error">{error}</div>}

          <div className="runner-output">
            <div className="output-block">
              <div className="output-header">
                <h3>Compile output</h3>
                <span className="output-meta">{compileSummary || 'n/a'}</span>
              </div>
              <pre className="output">
                {compileOutput || 'No compile output.'}
              </pre>
            </div>
            <div className="output-block">
              <div className="output-header">
                <h3>Run output</h3>
                <span className="output-meta">{runSummary || 'n/a'}</span>
              </div>
              <pre className="output">
                {runOutput || 'Run output will appear here.'}
              </pre>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

export default App
