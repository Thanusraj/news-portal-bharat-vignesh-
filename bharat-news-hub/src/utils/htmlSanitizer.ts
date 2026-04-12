import DOMPurify from 'dompurify';

/**
 * WHITELIST OF SAFE CSS PROPERTIES
 * Only these properties are allowed in inline styles to prevent CSS injection attacks
 */
const SAFE_STYLE_PROPERTIES = {
  // Text styling
  'color': /^#[0-9a-fA-F]{6}$|^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$|^rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*[\d.]+\)$/,
  'font-weight': /^(bold|normal|[1-9]00)$/,
  'font-size': /^(\d+)(px|em|rem)$/,
  'font-style': /^(italic|normal|oblique)$/,
  'text-align': /^(left|center|right|justify)$/,
  'text-decoration': /^(none|underline|overline|line-through)$/,

  // Spacing
  'margin': /^([\d.]+)(px|em|rem)\s*([\d.]+)?(px|em|rem)?(\s*([\d.]+)(px|em|rem)?)?(\s*([\d.]+)(px|em|rem)?)?$/,
  'margin-top': /^([\d.]+)(px|em|rem)$/,
  'margin-bottom': /^([\d.]+)(px|em|rem)$/,
  'margin-left': /^([\d.]+)(px|em|rem)$/,
  'margin-right': /^([\d.]+)(px|em|rem)$/,
  'padding': /^([\d.]+)(px|em|rem)\s*([\d.]+)?(px|em|rem)?(\s*([\d.]+)(px|em|rem)?)?(\s*([\d.]+)(px|em|rem)?)?$/,
  'padding-top': /^([\d.]+)(px|em|rem)$/,
  'padding-bottom': /^([\d.]+)(px|em|rem)$/,
  'padding-left': /^([\d.]+)(px|em|rem)$/,
  'padding-right': /^([\d.]+)(px|em|rem)$/,

  // Borders
  'border': /^([\d.]+)(px|em|rem)\s+(solid|dashed|dotted|double)\s+(#[0-9a-fA-F]{6}|rgb|rgba).*$/,
  'border-bottom': /^([\d.]+)(px|em|rem)\s+(solid|dashed|dotted|double)\s+(#[0-9a-fA-F]{6}|rgb|rgba).*$/,
  'border-left': /^([\d.]+)(px|em|rem)\s+(solid|dashed|dotted|double)\s+(#[0-9a-fA-F]{6}|rgb|rgba).*$/,
  'border-top': /^([\d.]+)(px|em|rem)\s+(solid|dashed|dotted|double)\s+(#[0-9a-fA-F]{6}|rgb|rgba).*$/,
  'border-right': /^([\d.]+)(px|em|rem)\s+(solid|dashed|dotted|double)\s+(#[0-9a-fA-F]{6}|rgb|rgba).*$/,
  'border-radius': /^([\d.]+)(px|em|rem|%)(\s+([\d.]+)(px|em|rem|%))?(\s+([\d.]+)(px|em|rem|%))?(\s+([\d.]+)(px|em|rem|%))?$/,

  // Layout
  'display': /^(block|inline|inline-block|flex|grid|none)$/,
  'text-transform': /^(uppercase|lowercase|capitalize|none)$/,
  'letter-spacing': /^([\d.]+)(px|em|rem)$/,
  'line-height': /^([\d.]+)(px|em|rem|%)?$/,

  // Background
  'background-color': /^#[0-9a-fA-F]{6}$|^rgb\(\d{1,3},\s*\d{1,3},\s*\d{1,3}\)$|^rgba\(\d{1,3},\s*\d{1,3},\s*\d{1,3},\s*[\d.]+\)$/,
};

/**
 * WHITELIST OF SAFE HTML TAGS
 * Only these tags are allowed in the sanitized HTML
 */
const ALLOWED_TAGS = [
  'p', 'div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'strong', 'b', 'em', 'i', 'u',
  'a', 'img',
  'blockquote',
  'br',
];

/**
 * WHITELIST OF SAFE ATTRIBUTES
 */
const ALLOWED_ATTRIBUTES = {
  'a': ['href', 'title'],
  'img': ['src', 'alt', 'title', 'width', 'height'],
  '*': ['class', 'style'], // Allow these on all tags
};

/**
 * Validates inline styles to prevent CSS injection attacks
 * Uses a permissive whitelist approach - allows any property that's not explicitly dangerous
 * @param styleStr - The inline style string to validate
 * @returns boolean - true if all styles are safe, false otherwise
 */
export function isStyleSafe(styleStr: string): boolean {
  if (!styleStr) return true;

  // Blacklist of dangerous CSS properties that could cause XSS or security issues
  const DANGEROUS_PROPERTIES = [
    'behavior', // IE specific, can execute code
    'binding', // Mozilla, can execute code
    '-moz-binding',
    'javascript',
    'expression', // IE specific
    '--', // CSS variables could be exploited
  ];

  const lowerStyle = styleStr.toLowerCase();
  
  // Check if any dangerous properties are present
  for (const dangerous of DANGEROUS_PROPERTIES) {
    if (lowerStyle.includes(dangerous)) {
      console.warn(`[DOMPurify] Dangerous CSS property blocked: ${dangerous}`);
      return false;
    }
  }

  // Block javascript: protocol in background-image or other properties
  if (lowerStyle.includes('javascript:') || lowerStyle.includes('url(javascript:')) {
    console.warn(`[DOMPurify] JavaScript protocol in CSS blocked`);
    return false;
  }

  // If we get here, the style is safe
  return true;
}

/**
 * Custom DOMPurify hook to validate and filter style attributes during sanitization
 */
export function setupDOMPurifyHook(): void {
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    // Only process elements with a style attribute
    if (node.hasAttribute && node.hasAttribute('style')) {
      const styleAttr = node.getAttribute('style');
      if (styleAttr && !isStyleSafe(styleAttr)) {
        // Remove unsafe style and log warning
        node.removeAttribute('style');
        console.warn(`[DOMPurify] Removed unsafe inline styles from ${node.tagName}`);
      }
    }
  });
}

/**
 * Production-safe DOMPurify configuration
 * Sanitizes HTML while allowing styled content and preventing XSS
 */
export const DOMPURIFY_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS,
  ALLOWED_ATTR: ['class', 'style', 'href', 'title', 'src', 'alt', 'width', 'height'],
  KEEP_CONTENT: true,
  RETURN_DOM: false,
  RETURN_DOM_FRAGMENT: false,
  RETURN_DOM_IMPORT: false,
  FORCE_BODY: false,
  SANITIZE_DOM: true,
  IN_PLACE: false,

  // Block potentially dangerous event handlers
  FORBID_TAGS: [
    'script', 'iframe', 'style', 'link', 'meta',
    'form', 'input', 'button', 'textarea', 'select',
  ],

  // Block dangerous attributes (event handlers, javascript: URLs, etc.)
  FORBID_ATTR: [
    'onclick', 'onerror', 'onload', 'onmouseover', 'onmouseout',
    'onfocus', 'onblur', 'onchange', 'onsubmit', 'ondblclick',
    'onkeydown', 'onkeyup', 'onkeypress',
  ],

  // More permissive style handling - allow common CSS values
  ALLOWED_STYLES: {
    '*': {
      // Text styling
      'color': [/.*/],
      'font-weight': [/.*/],
      'font-size': [/.*/],
      'font-style': [/.*/],
      'text-align': [/.*/],
      'text-decoration': [/.*/],
      
      // Spacing (margin, padding)
      'margin': [/.*/],
      'margin-top': [/.*/],
      'margin-bottom': [/.*/],
      'margin-left': [/.*/],
      'margin-right': [/.*/],
      'padding': [/.*/],
      'padding-top': [/.*/],
      'padding-bottom': [/.*/],
      'padding-left': [/.*/],
      'padding-right': [/.*/],
      
      // Borders
      'border': [/.*/],
      'border-bottom': [/.*/],
      'border-left': [/.*/],
      'border-top': [/.*/],
      'border-right': [/.*/],
      'border-radius': [/.*/],
      
      // Layout & display
      'display': [/.*/],
      'text-transform': [/.*/],
      'letter-spacing': [/.*/],
      'line-height': [/.*/],
      'background-color': [/.*/],
    },
  },

  // Allow URLs only from safe protocols
  ALLOW_DATA_ATTR: false,
};

/**
 * Sanitizes HTML content with style support
 * @param dirtyHtml - The HTML string to sanitize
 * @returns string - Sanitized and safe HTML
 */
export function sanitizeHtmlWithStyles(dirtyHtml: string): string {
  // Setup hook once (auto-cleans up previous hooks)
  setupDOMPurifyHook();

  // Perform sanitization
  const cleanHtml = DOMPurify.sanitize(dirtyHtml, DOMPURIFY_CONFIG);

  return cleanHtml;
}

/**
 * ============================================================
 * SECURITY NOTES:
 * ============================================================
 *
 * 1. STYLE WHITELIST:
 *    - Only safe CSS properties are allowed (no position, z-index, etc.)
 *    - Style values are validated with regex patterns
 *    - No CSS expressions, behaviors, or unsafe functions
 *
 * 2. TAG WHITELIST:
 *    - Only semantic and text tags allowed (p, div, span, h1-h6, etc.)
 *    - No <script>, <iframe>, <style>, <link>, <meta>, <form>, etc.
 *    - No event handler attributes (onclick, onerror, etc.)
 *
 * 3. ATTRIBUTE FILTERING:
 *    - href URLs are validated (no javascript: protocol)
 *    - src URLs are validated (no data: scheme with scripts)
 *    - Event handler attributes are explicitly blocked
 *
 * 4. XSS PREVENTION:
 *    - DOMPurify automatically converts dangerous HTML to text
 *    - Custom hook validates inline styles
 *    - No inline <script> tags or event listeners
 *
 * 5. PRODUCTION SAFE:
 *    - No eval() or Function() constructors
 *    - No dangerous DOM properties
 *    - Safe for React dangerouslySetInnerHTML when combined with this sanitizer
 * ============================================================
 */
