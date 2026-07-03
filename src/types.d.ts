/// <reference types="vite/client" />
import type { Application } from '@data-fair/lib-common-types/application/index.js'

declare global {
  interface Window {
    APPLICATION: Application & { href: string }
    iFrameResizer: { heightCalculationMethod: string }
    vIframeOptions: { reactiveParams: Record<string, unknown> }
  }
}
