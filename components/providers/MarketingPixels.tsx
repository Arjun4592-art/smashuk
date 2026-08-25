'use client'

import Script from 'next/script'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useState } from 'react'

declare global {
  interface Window {
    dataLayer?: any[]
    gtag?: (...args: any[]) => void
    fbq?: (...args: any[]) => void
    _fbq?: any
    ttq?: any
    pintrk?: any
    snaptr?: any
    uetq?: any
    lintrk?: any
    clarity?: any
  }
}

interface MarketingSettings {
  gaMeasurementId: string | null
  googleAdsId: string | null
  googleAdsConversionLabel: string | null
  facebookPixelId: string | null
  gtmId: string | null
  tiktokPixelId: string | null
  pinterestTagId: string | null
  snapchatPixelId: string | null
  microsoftUetId: string | null
  linkedinPartnerId: string | null
  clarityId: string | null
  hotjarId: string | null
}

// Fires a pageview to whichever pixels are currently loaded, on every route change.
function PixelPageviewTracker({ settings }: { settings: MarketingSettings }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  useEffect(() => {
    const query = searchParams.toString()
    const url = query ? `${pathname}?${query}` : pathname
    if (
      (settings.gaMeasurementId || settings.googleAdsId) &&
      typeof window.gtag === 'function'
    ) {
      if (settings.gaMeasurementId) {
        window.gtag('config', settings.gaMeasurementId, {
          page_path: url,
          page_title: document.title,
          page_location: window.location.href,
        })
      }
      if (settings.googleAdsId) {
        window.gtag('config', settings.googleAdsId)
      }
    }
    if (settings.facebookPixelId && typeof window.fbq === 'function') {
      window.fbq('track', 'PageView')
    }
    if (settings.tiktokPixelId && typeof window.ttq?.page === 'function') {
      window.ttq.page()
    }
    if (settings.pinterestTagId && typeof window.pintrk === 'function') {
      window.pintrk('page')
    }
    if (settings.snapchatPixelId && typeof window.snaptr === 'function') {
      window.snaptr('track', 'PAGE_VIEW')
    }
    if (settings.gtmId && window.dataLayer) {
      window.dataLayer.push({
        event: 'pageview',
        page: url,
      })
    }
    // Microsoft UET, LinkedIn Insight, Clarity and Hotjar all track pageviews/behaviour
    // automatically once their base script is loaded — no per-route call needed.
  }, [pathname, searchParams, settings])
  return null
}

// Reads whatever tracking IDs are saved in Dashboard > Settings > Marketing,
// and wires all of them up here. Nothing needs to be edited in code — enter
// the keys in the dashboard and this component picks them up automatically.
export function MarketingPixels() {
  const [settings, setSettings] = useState<MarketingSettings | null>(null)
  useEffect(() => {
    let cancelled = false
    fetch('/api/store/marketing-settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setSettings(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [])
  if (!settings) return null
  const {
    gaMeasurementId,
    googleAdsId,
    googleAdsConversionLabel,
    facebookPixelId,
    gtmId,
    tiktokPixelId,
    pinterestTagId,
    snapchatPixelId,
    microsoftUetId,
    linkedinPartnerId,
    clarityId,
    hotjarId,
  } = settings
  const gtagBootstrapId = gaMeasurementId || googleAdsId

  return (
    <>
      {gtmId && (
        <Script id='gtm-init' strategy='afterInteractive'>
          {`
            (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','${gtmId}');
          `}
        </Script>
      )}

      {gtagBootstrapId && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${gtagBootstrapId}`}
            strategy='afterInteractive'
          />
          <Script id='gtag-init' strategy='afterInteractive'>
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              ${gaMeasurementId ? `gtag('config', '${gaMeasurementId}');` : ''}
              ${googleAdsId ? `gtag('config', '${googleAdsId}');` : ''}
              window.__gadsConversionLabel = ${googleAdsConversionLabel ? `'${googleAdsConversionLabel}'` : 'null'};
              window.__gadsId = ${googleAdsId ? `'${googleAdsId}'` : 'null'};
            `}
          </Script>
        </>
      )}

      {facebookPixelId && (
        <Script id='fb-pixel-init' strategy='afterInteractive'>
          {`
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${facebookPixelId}');
            fbq('track', 'PageView');
          `}
        </Script>
      )}

      {tiktokPixelId && (
        <Script id='tiktok-pixel-init' strategy='afterInteractive'>
          {`
            !function (w, d, t) {
              w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"],ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<e.length;n++)ttq.setAndDefer(e,e[n]);return e},ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;ttq._i=ttq._i||{},ttq._i[e]=[],ttq._i[e]._u=i,ttq._t=ttq._t||{},ttq._t[e]=+new Date,ttq._o=ttq._o||{},ttq._o[e]=n||{};n=document.createElement("script");n.type="text/javascript",n.async=!0,n.src=i+"?sdkid="+e+"&lib="+t;e=document.getElementsByTagName("script")[0];e.parentNode.insertBefore(n,e)};
              ttq.load('${tiktokPixelId}');
              ttq.page();
            }(window, document, 'ttq');
          `}
        </Script>
      )}

      {pinterestTagId && (
        <Script id='pinterest-tag-init' strategy='afterInteractive'>
          {`
            !function(e){if(!window.pintrk){window.pintrk = function () {
            window.pintrk.queue.push(Array.prototype.slice.call(arguments))};var
            n=window.pintrk;n.queue=[],n.version="3.0";var
            t=document.createElement("script");t.async=!0,t.src=e;var
            r=document.getElementsByTagName("script")[0];
            r.parentNode.insertBefore(t,r)}}("https://s.pinimg.com/ct/core.js");
            pintrk('load', '${pinterestTagId}');
            pintrk('page');
          `}
        </Script>
      )}

      {snapchatPixelId && (
        <Script id='snapchat-pixel-init' strategy='afterInteractive'>
          {`
            (function(e,t,n){if(e.snaptr)return;var a=e.snaptr=function()
            {a.handleRequest?a.handleRequest.apply(a,arguments):a.queue.push(arguments)};
            a.queue=[];var s='script';var r=t.createElement(s);r.async=!0;
            r.src=n;var u=t.getElementsByTagName(s)[0];
            u.parentNode.insertBefore(r,u);})(window,document,
            'https://sc-static.net/scevent.min.js');
            snaptr('init', '${snapchatPixelId}');
            snaptr('track', 'PAGE_VIEW');
          `}
        </Script>
      )}

      {microsoftUetId && (
        <Script id='ms-uet-init' strategy='afterInteractive'>
          {`
            (function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:"${microsoftUetId}"};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),f=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","https://bat.bing.com/bat.js","uetq");
          `}
        </Script>
      )}

      {linkedinPartnerId && (
        <Script id='linkedin-insight-init' strategy='afterInteractive'>
          {`
            _linkedin_partner_id = "${linkedinPartnerId}";
            window._linkedin_data_partner_ids = window._linkedin_data_partner_ids || [];
            window._linkedin_data_partner_ids.push(_linkedin_partner_id);
            (function(l) {
              if (!l){window.lintrk = function(a,b){window.lintrk.q.push([a,b])};
              window.lintrk.q=[]}
              var s = document.getElementsByTagName("script")[0];
              var b = document.createElement("script");
              b.type = "text/javascript";b.async = true;
              b.src = "https://snap.licdn.com/li.lms-analytics/insight.min.js";
              s.parentNode.insertBefore(b, s);
            })(window.lintrk);
          `}
        </Script>
      )}

      {clarityId && (
        <Script id='ms-clarity-init' strategy='afterInteractive'>
          {`
            (function(c,l,a,r,i,t,y){
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            })(window, document, "clarity", "script", "${clarityId}");
          `}
        </Script>
      )}

      {hotjarId && (
        <Script id='hotjar-init' strategy='afterInteractive'>
          {`
            (function(h,o,t,j,a,r){
              h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
              h._hjSettings={hjid:${JSON.stringify(hotjarId)},hjsv:6};
              a=o.getElementsByTagName('head')[0];
              r=o.createElement('script');r.async=1;
              r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
              a.appendChild(r);
            })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          `}
        </Script>
      )}

      <Suspense fallback={null}>
        <PixelPageviewTracker settings={settings} />
      </Suspense>
    </>
  )
}
