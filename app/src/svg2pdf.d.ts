declare module 'svg2pdf.js' {
  export function svg2pdf(element: Element, pdf: any, options?: { x?: number; y?: number; width?: number; height?: number }): Promise<any>
}
