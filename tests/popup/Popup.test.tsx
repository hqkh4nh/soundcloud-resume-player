import '@testing-library/jest-dom/vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { PopupState } from '../../src/popup/popupStorage'
import { Popup } from '../../src/popup/Popup'

const popupStorage = vi.hoisted(() => ({
  loadPopupState: vi.fn<() => Promise<PopupState>>(),
  persistPopupSettings: vi.fn<() => Promise<void>>(),
}))

vi.mock('../../src/popup/popupStorage', () => popupStorage)

describe('Popup', () => {
  beforeEach(() => {
    vi.stubGlobal('chrome', {
      i18n: {
        getMessage: (key: string) => key,
      },
    })
    popupStorage.persistPopupSettings.mockResolvedValue()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('disables controls before storage finishes loading', () => {
    const pending = createDeferred<PopupState>()
    popupStorage.loadPopupState.mockReturnValue(pending.promise)

    render(<Popup />)

    expect(screen.getByRole('checkbox', { name: 'saveProgress' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'resumeOnlySameTrack' })).toBeDisabled()
    expect(screen.getByRole('checkbox', { name: 'autoPlayAfterResume' })).toBeDisabled()
    expect(screen.getByRole('button', { name: /advanced/ })).toBeDisabled()
  })

  it('exposes expanded state on the advanced button after load', async () => {
    popupStorage.loadPopupState.mockResolvedValue({
      settings: {
        saveProgress: true,
        resumeOnlySameTrack: true,
        forceOldTrack: false,
        autoPlayAfterResume: false,
        debug: false,
      },
      progress: null,
    })

    render(<Popup />)

    const button = await screen.findByRole('button', { name: /advanced/ })
    await waitFor(() => expect(button).toBeEnabled())

    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveAttribute('aria-controls', 'advanced-settings')

    await userEvent.click(button)

    expect(button).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('checkbox', { name: 'forceOldTrack' })).toBeInTheDocument()
    expect(document.getElementById('advanced-settings')).toBeInTheDocument()
  })

  it('rolls back a setting when persistence fails', async () => {
    popupStorage.loadPopupState.mockResolvedValue({
      settings: {
        saveProgress: true,
        resumeOnlySameTrack: true,
        forceOldTrack: false,
        autoPlayAfterResume: false,
        debug: false,
      },
      progress: null,
    })
    popupStorage.persistPopupSettings.mockRejectedValue(new Error('storage unavailable'))

    render(<Popup />)

    const saveProgress = await screen.findByRole('checkbox', { name: 'saveProgress' })
    await waitFor(() => expect(saveProgress).toBeEnabled())

    await userEvent.click(saveProgress)

    await waitFor(() => expect(saveProgress).toBeChecked())
  })
})

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })

  return { promise, resolve, reject }
}
