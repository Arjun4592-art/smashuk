const LABEL_WIDTH_MM = 101.6 // 4 in
const LABEL_HEIGHT_MM = 152.4 // 6 in

function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    // iPadOS reports itself as a Mac with a touch screen.
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  )
}

async function toPrintableUrl(labelUrl: string): Promise<string> {
  // `labelUrl` is expected to be a same-origin URL by this point — callers
  // route through /api/admin/orders/[id]/shipping-label/file (or the POS
  // equivalent) rather than handing Parcel2Go's own URL to the print
  // iframe/popup below, since a cross-origin frame's contentWindow can't be
  // touched (`iframe.contentWindow.addEventListener(...)` throws a
  // SecurityError: "Blocked a frame ... from accessing a cross-origin
  // frame."). A data: URI can still turn up here (e.g. in tests), and
  // browsers block window.open/iframe navigation to those in some contexts,
  // so always go through a blob: URL for that case.
  if (!labelUrl.startsWith('data:')) return labelUrl
  const blob = await (await fetch(labelUrl)).blob()
  return URL.createObjectURL(blob)
}

// Many mobile browsers (seen in practice on Android Chrome and iPadOS
// Safari/Chrome) render this same-origin PDF through their own built-in PDF
// viewer component. That component runs as if it were a genuinely
// cross-origin frame for scripting purposes: NOT just `addEventListener`,
// but `focus()` and `print()` on it can also throw the same "Blocked a
// frame ... from accessing a cross-origin frame" SecurityError, even though
// the URL is same-origin. There is no scriptable way around that — so
// instead of trying to silently trigger the OS print dialog, we fall back
// to just opening the label in a normal tab, where the browser's own PDF
// toolbar has a print button the person can tap themselves.
function openLabelTab(url: string): void {
  window.open(url, '_blank')
}

// Desktop/Android: hidden iframe, print it, clean up after. Falls back to
// openLabelTab() if the frame turns out to be script-blocked.
function printViaIframe(url: string, revoke: boolean): Promise<void> {
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('aria-hidden', 'true')
    iframe.style.cssText = `position:fixed;left:-10000px;top:0;border:0;width:${LABEL_WIDTH_MM}mm;height:${LABEL_HEIGHT_MM}mm;`

    let removed = false
    const remove = () => {
      if (removed) return
      removed = true
      iframe.remove()
      if (revoke) URL.revokeObjectURL(url)
    }
    // Safety net only — normally removed on `afterprint`.
    const safety = setTimeout(remove, 5 * 60 * 1000)

    const fallbackToTab = () => {
      clearTimeout(safety)
      remove()
      openLabelTab(url)
      resolve()
    }

    iframe.onload = () => {
      let win: Window | null = null
      try {
        win = iframe.contentWindow
      } catch {
        fallbackToTab()
        return
      }
      if (!win) {
        fallbackToTab()
        return
      }
      try {
        win.addEventListener('afterprint', () => {
          clearTimeout(safety)
          setTimeout(remove, 300)
        })
        win.focus()
        win.print()
        // Chrome blocks here until the dialog closes; Safari/Firefox return
        // straight away — either way the job has been handed to the OS.
        resolve()
      } catch {
        // Scripting blocked on this frame — see comment on openLabelTab.
        fallbackToTab()
      }
    }
    iframe.onerror = () => {
      clearTimeout(safety)
      remove()
      reject(new Error('Could not load the shipping label.'))
    }

    iframe.src = url
    document.body.appendChild(iframe)
  })
}

// iPhone/iPad Safari prints the WHOLE parent page when asked to print an
// iframe, so there we use a popup instead. window.open must run
// synchronously inside the tap, before any await — the caller's click
// handler is what makes that true here. If scripting the resulting tab
// turns out to be blocked (see openLabelTab comment above), the tab is
// already open and showing the label, so we just leave it for the person
// to print manually rather than erroring out.
function printViaPopup(url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const win = window.open(url, '_blank')
    if (!win) {
      reject(
        new Error(
          'Pop-up blocked. Allow pop-ups for this site to print the label.',
        ),
      )
      return
    }
    try {
      win.addEventListener('load', () => {
        try {
          win.focus()
          win.print()
        } catch {
          // Scripting blocked on this frame — the tab is already open with
          // the label, nothing more we can do from here.
        }
        resolve()
      })
    } catch {
      // `addEventListener` itself is blocked — same story, tab is already
      // open and showing the label.
      resolve()
    }
  })
}

/** Print a Parcel2Go shipping label straight to the printer's print dialog. */
export async function printShippingLabel(labelUrl: string): Promise<void> {
  if (typeof document === 'undefined') {
    throw new Error('Printing is only available in the browser.')
  }
  const url = await toPrintableUrl(labelUrl)
  const revoke = url !== labelUrl
  try {
    if (isIOS()) {
      await printViaPopup(url)
    } else {
      await printViaIframe(url, revoke)
    }
  } catch (err) {
    if (revoke) URL.revokeObjectURL(url)
    throw err
  }
}
