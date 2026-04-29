import { useEffect, useMemo, useState } from 'react'
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

  useEffect(() => {
    let active = true

    void loadPopupState().then((state) => {
      if (!active) return
      setSettings(state.settings)
      setProgress(state.progress)
    })

    return () => {
      active = false
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
    const next = { ...settings, [key]: value }
    setSettings(next)
    void persistPopupSettings(next)
  }

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
          onChange={(checked) => updateSetting('saveProgress', checked)}
        />
        <Toggle
          label={t('resumeOnlySameTrack')}
          checked={settings.resumeOnlySameTrack}
          onChange={(checked) => updateSetting('resumeOnlySameTrack', checked)}
        />
        <Toggle
          label={t('autoPlayAfterResume')}
          checked={settings.autoPlayAfterResume}
          onChange={(checked) => updateSetting('autoPlayAfterResume', checked)}
        />
      </section>

      <section className="panel">
        <button className="advanced-trigger" type="button" onClick={() => setExpanded((value) => !value)}>
          {t('advanced')}
          <span aria-hidden="true">{expanded ? '−' : '+'}</span>
        </button>
        {expanded ? (
          <div className="advanced-content">
            <Toggle
              label={t('forceOldTrack')}
              checked={settings.forceOldTrack}
              onChange={(checked) => updateSetting('forceOldTrack', checked)}
            />
            <p className="muted">{t('forceOldTrackHelp')}</p>
            <Toggle
              label={t('debug')}
              checked={settings.debug}
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
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="toggle-row">
      <span>{props.label}</span>
      <input
        type="checkbox"
        checked={props.checked}
        onChange={(event) => props.onChange(event.currentTarget.checked)}
      />
    </label>
  )
}
