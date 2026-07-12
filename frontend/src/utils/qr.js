/**
 * utils/qr.js — QR code generation helper
 *
 * Uses the `qrcode` npm package to render a QR code onto an HTML <canvas>
 * element. The canvas approach is chosen over generating a PNG data URL
 * because it renders synchronously into an existing DOM node, which React
 * can manage via a ref.
 */

import QRCode from 'qrcode';

/**
 * drawQRCode(canvas, url, options?)
 *
 * Draws a QR code for `url` onto the provided <canvas> element.
 *
 * @param {HTMLCanvasElement} canvas  - The target canvas element
 * @param {string}            url     - The URL to encode
 * @param {Object}            [opts]  - Optional qrcode options overrides
 * @returns {Promise<void>}
 */
export async function drawQRCode(canvas, url, opts = {}) {
  await QRCode.toCanvas(canvas, url, {
    width:          160,        // canvas size in px
    margin:         2,          // quiet zone modules
    errorCorrectionLevel: 'M', // medium correction — balances size and fault tolerance
    color: {
      dark:  '#18191b',         // module colour — near-black (matches --text token)
      light: '#ffffff',         // background — always white for scannability
    },
    ...opts,
  });
}
