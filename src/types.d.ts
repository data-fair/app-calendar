/// <reference types="vite/client" />
import type { Application } from '@data-fair/lib-common-types/application/index.js'
import type { FullSiteInfo } from '@data-fair/lib-vue/session.js'

declare global {
  interface Window {
    APPLICATION: Application & { href: string }
    // posé par _public.js, lu par la session à la place du fetch déprécié
    __PUBLIC_SITE_INFO?: FullSiteInfo
    iFrameResizer: { heightCalculationMethod: string }
    vIframeOptions: { reactiveParams: Record<string, unknown> }
    // installé par le service de capture data-fair (puppeteer)
    triggerCapture?: (animationSupported?: boolean) => Promise<boolean>
    animateCaptureFrame?: () => boolean
  }
}
