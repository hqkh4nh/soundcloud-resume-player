import { useEffect, useMemo, useRef, useState } from 'react'
import { formatPosition } from '../shared/time'
import type { SavedProgress } from '../shared/progress'
import type { ResumeSettings } from '../shared/settings'
import { defaultSettings } from '../shared/settings'
import { loadPopupState, persistPopupSettings } from './popupStorage'

function t(key: string): string {
  return chrome.i18n?.getMessage(key) || key
}

export function Popup() {
  const [settings, setSettings] = useState<ResumeSettings>(defaultSettings)
  const [progress, setProgress] = useState<SavedProgress | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const activeRef = useRef(true)

  useEffect(() => {
    let active = true
    activeRef.current = true

    void loadPopupState()
      .then((state) => {
        if (!active) return
        setSettings(state.settings)
        setProgress(state.progress)
      })
      .catch(() => {
        if (!active) return
        setSettings(defaultSettings)
        setProgress(null)
      })
      .finally(() => {
        if (!active) return
        setLoaded(true)
      })

    return () => {
      active = false
      activeRef.current = false
    }
  }, [])

  const updatedLabel = useMemo(() => {
    if (!progress) return ''
    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(progress.updatedAt)
  }, [progress])

  function updateSetting(key: keyof ResumeSettings, value: boolean) {
    if (!loaded) return
    const previous = settings
    const next = { ...settings, [key]: value }
    setSettings(next)
    void persistPopupSettings(next).catch(() => {
      if (!activeRef.current) return
      setSettings(previous)
    })
  }

  const advancedContentId = 'advanced-settings'

  return (
    <main className="popup-shell">
      <header className="popup-header">
        <div>
          <h1>{t('extensionName')}</h1>
          <p>{t('statusReady')}</p>
        </div>
        <span className="status-dot" aria-hidden="true" />
      </header>

      <section className="panel">
        <div className="section-title">{t('lastSaved')}</div>
        {progress ? (
          <div className="progress-summary">
            <strong>{progress.trackUrl}</strong>
            <span>
              {t('position')} {formatPosition(progress.position)}
            </span>
            <span>
              {t('updated')} {updatedLabel}
            </span>
          </div>
        ) : (
          <p className="muted">{t('noProgress')}</p>
        )}
      </section>

      <section className="panel controls">
        <Toggle
          label={t('saveProgress')}
          checked={settings.saveProgress}
          disabled={!loaded}
          onChange={(checked) => updateSetting('saveProgress', checked)}
        />
        <Toggle
          label={t('resumeOnlySameTrack')}
          checked={settings.resumeOnlySameTrack}
          disabled={!loaded}
          onChange={(checked) => updateSetting('resumeOnlySameTrack', checked)}
        />
        <Toggle
          label={t('autoPlayAfterResume')}
          checked={settings.autoPlayAfterResume}
          disabled={!loaded}
          onChange={(checked) => updateSetting('autoPlayAfterResume', checked)}
        />
      </section>

      <section className="panel">
        <button
          className="advanced-trigger"
          type="button"
          disabled={!loaded}
          aria-expanded={expanded}
          aria-controls={advancedContentId}
          onClick={() => setExpanded((value) => !value)}
        >
          {t('advanced')}
          <span aria-hidden="true">{expanded ? '−' : '+'}</span>
        </button>
        {expanded ? (
          <div className="advanced-content" id={advancedContentId}>
            <Toggle
              label={t('forceOldTrack')}
              checked={settings.forceOldTrack}
              disabled={!loaded}
              onChange={(checked) => updateSetting('forceOldTrack', checked)}
            />
            <p className="muted">{t('forceOldTrackHelp')}</p>
            <Toggle
              label={t('debug')}
              checked={settings.debug}
              disabled={!loaded}
              onChange={(checked) => updateSetting('debug', checked)}
            />
          </div>
        ) : null}
      </section>
    </main>
  )
}

function Toggle(props: {
  label: string
  checked: boolean
  disabled: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="toggle-row">
      <span>{props.label}</span>
      <input
        type="checkbox"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
      />
    </label>
  )
}
