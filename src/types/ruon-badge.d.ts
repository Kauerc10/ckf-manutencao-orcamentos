import * as React from 'react'

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'ruon-badge': Omit<React.HTMLAttributes<HTMLElement>, 'ref'> & {
        ref?: string
        theme?: 'auto' | 'light' | 'dark' | 'monochrome'
        size?: 'md' | 'sm'
        label?: string
        'utm-source'?: string
        'utm-medium'?: string
        'utm-campaign'?: string
      }
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'ruon-badge': Omit<React.HTMLAttributes<HTMLElement>, 'ref'> & {
        ref?: string
        theme?: 'auto' | 'light' | 'dark' | 'monochrome'
        size?: 'md' | 'sm'
        label?: string
        'utm-source'?: string
        'utm-medium'?: string
        'utm-campaign'?: string
      }
    }
  }
}
