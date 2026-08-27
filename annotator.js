// Prevent loading twice
if (!window.isProAnnotatorActive) {
  window.isProAnnotatorActive = true;
  
  const defaultState = {
    box: { fill: '#005bd3', fillOpacity: 0, border: '#005bd3', borderWidth: 3, radius: 4, style: 'solid' },
    text: { fill: '#202223', fillOpacity: 1, border: '#ffffff', borderWidth: 0, radius: 6, style: 'solid', textColor: '#ffffff' },
    tooltip: { fill: '#005bd3', fillOpacity: 1, border: '#ffffff', borderWidth: 0, radius: 8, style: 'solid', textColor: '#ffffff', arrowPosition: 'bottom' },
    arrow: { fill: '#005bd3', fillOpacity: 1 },
    redact: { fill: '#202223', fillOpacity: 1, border: '#000000', borderWidth: 0, radius: 4, style: 'solid' },
    badge: { fill: '#005bd3', fillOpacity: 1, border: '#ffffff', borderWidth: 0, style: 'solid', textColor: '#ffffff' },
    spotlight: { fill: '#000000', fillOpacity: 0.6, border: '#005bd3', borderWidth: 2, radius: 6, style: 'solid' },
    ellipse: { fill: '#005bd3', fillOpacity: 0, border: '#005bd3', borderWidth: 3, radius: 0, style: 'solid' },
    line: { fill: '#005bd3', fillOpacity: 1 },
    globalFrame: { borderColor: '#454f59', borderWidth: 0, radius: 12 }
  };

  chrome.storage.local.get(['annotatorAppState'], (result) => {
    if (result.annotatorAppState) {
      window.annotatorAppState = { ...defaultState };
      Object.keys(result.annotatorAppState).forEach(key => {
        window.annotatorAppState[key] = { ...defaultState[key], ...result.annotatorAppState[key] };
      });
    } else {
      window.annotatorAppState = JSON.parse(JSON.stringify(defaultState));
    }
    initProAnnotator();
  });
}

function initProAnnotator() {
  const originalBodyOverflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  let badgeCount = 1;

  const hexToRgba = (hex, opacity) => {
    if (!hex || !hex.startsWith('#')) return hex;
    hex = hex.replace('#', '');
    return `rgba(${parseInt(hex.substring(0, 2), 16)}, ${parseInt(hex.substring(2, 4), 16)}, ${parseInt(hex.substring(4, 6), 16)}, ${opacity})`;
  };

  const saveState = () => {
    chrome.storage.local.set({ annotatorAppState: window.annotatorAppState });
  };

  // --- 1. Inject Styles with CSS Armor and CSS Masks ---
  const style = document.createElement('style');
  style.id = 'annotator-injected-styles';
  style.innerHTML = `
    /* CSS ARMOR */
    #annotator-canvas-container canvas {
        max-width: none !important; max-height: none !important; margin: 0 !important; padding: 0 !important;
        border: none !important; border-radius: 0 !important; box-shadow: none !important; transform: none !important; background: transparent !important;
    }

    /* CSS MASK ICONS */
    .ic {
      display: inline-block !important; width: 16px !important; height: 16px !important;
      min-width: 16px !important; min-height: 16px !important; background-color: currentColor !important;
      -webkit-mask-size: contain !important; -webkit-mask-repeat: no-repeat !important; -webkit-mask-position: center !important;
    }
    .ic-box { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='3' y='3' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3C/svg%3E"); }
    .ic-text { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='4 7 4 4 20 4 20 7'%3E%3C/polyline%3E%3Cline x1='9' y1='20' x2='15' y2='20'%3E%3C/line%3E%3Cline x1='12' y1='4' x2='12' y2='20'%3E%3C/line%3E%3C/svg%3E"); }
    .ic-tooltip { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'%3E%3C/path%3E%3C/svg%3E"); }
    .ic-arrow { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='5' y1='12' x2='19' y2='12'%3E%3C/line%3E%3Cpolyline points='12 5 19 12 12 19'%3E%3C/polyline%3E%3C/svg%3E"); }
    .ic-redact { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='black'%3E%3Crect x='3' y='8' width='18' height='8' rx='1'%3E%3C/rect%3E%3C/svg%3E"); }
    .ic-badge { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='10'%3E%3C/circle%3E%3Ctext x='12' y='16.5' text-anchor='middle' font-size='13' font-weight='bold' fill='black' stroke='none'%3E1%3C/text%3E%3C/svg%3E"); }
    .ic-spotlight { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='4'%3E%3C/circle%3E%3Cpath d='M12 2v2'%3E%3C/path%3E%3Cpath d='M12 20v2'%3E%3C/path%3E%3Cpath d='M2 12h2'%3E%3C/path%3E%3Cpath d='M20 12h2'%3E%3C/path%3E%3C/svg%3E"); }
    .ic-crop { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6.13 1L6 16a2 2 0 0 0 2 2h15'%3E%3C/path%3E%3Cpath d='M1 6.13L16 6a2 2 0 0 1 2 2v15'%3E%3C/path%3E%3C/svg%3E"); }
    .ic-trash { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='3 6 5 6 21 6'%3E%3C/polyline%3E%3Cpath d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'%3E%3C/path%3E%3C/svg%3E"); }
    .ic-save { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z'%3E%3C/path%3E%3Cpolyline points='17 21 17 13 7 13 7 21'%3E%3C/polyline%3E%3Cpolyline points='7 3 7 8 15 8'%3E%3C/polyline%3E%3C/svg%3E"); }
    .ic-exit { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cline x1='18' y1='6' x2='6' y2='18'%3E%3C/line%3E%3Cline x1='6' y1='6' x2='18' y2='18'%3E%3C/line%3E%3C/svg%3E"); }
    .ic-copy { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Crect x='9' y='9' width='13' height='13' rx='2' ry='2'%3E%3C/rect%3E%3Cpath d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'%3E%3C/path%3E%3C/svg%3E"); }
    .ic-download { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'%3E%3C/path%3E%3Cpolyline points='7 10 12 15 17 10'%3E%3C/polyline%3E%3Cline x1='12' y1='15' x2='12' y2='3'%3E%3C/line%3E%3C/svg%3E"); }
    .ic-upload { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4'%3E%3C/path%3E%3Cpolyline points='17 8 12 3 7 8'%3E%3C/polyline%3E%3Cline x1='12' y1='3' x2='12' y2='15'%3E%3C/line%3E%3C/svg%3E"); }
    .ic-translate { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M5 8l6 6'%3E%3C/path%3E%3Cpath d='M4 14l6-6 2-3'%3E%3C/path%3E%3Cpath d='M2 5h12'%3E%3C/path%3E%3Cpath d='M7 2h1'%3E%3C/path%3E%3Cpath d='M22 22l-5-10-5 10'%3E%3C/path%3E%3Cpath d='M14 18h6'%3E%3C/path%3E%3C/svg%3E"); }
    .ic-chevron { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E"); }
    .ic-ellipse { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2'%3E%3Cellipse cx='12' cy='12' rx='10' ry='7'%3E%3C/ellipse%3E%3C/svg%3E"); }
    .ic-line { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'%3E%3Cline x1='4' y1='20' x2='20' y2='4'%3E%3C/line%3E%3C/svg%3E"); }
    .ic-undo { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='1 4 1 10 7 10'%3E%3C/polyline%3E%3Cpath d='M3.51 15a9 9 0 1 0 2.13-9.36L1 10'%3E%3C/path%3E%3C/svg%3E"); }
    .ic-redo { -webkit-mask-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='23 4 23 10 17 10'%3E%3C/polyline%3E%3Cpath d='M20.49 15a9 9 0 1 1-2.13-9.36L23 10'%3E%3C/path%3E%3C/svg%3E"); }

    /* DROPDOWN UI STYLES */
    .annotator-dropdown-container { position: relative; display: flex; align-items: center; }
    .annotator-dropdown-menu {
      display: none; position: absolute; bottom: 100%; left: 0; margin-bottom: 8px;
      background: #202223; border: 1px solid #454f59; border-radius: 8px; padding: 6px;
      flex-direction: column; gap: 4px; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      min-width: 150px;
    }
    
    /* INVISIBLE HOVER BRIDGE - Fixes the dropdown gap deadzone */
    .annotator-dropdown-menu::after {
      content: ''; position: absolute; top: 100%; left: 0; width: 100%; height: 16px; background: transparent;
    }
    
    .annotator-dropdown-container:hover .annotator-dropdown-menu { display: flex; }

    .annotator-tool-btn { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: transparent; border: none; border-radius: 6px; color: #a6acb2; font-family: -apple-system, sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s ease; white-space: nowrap; }
    .annotator-tool-btn:hover { background: #31373d; color: #ffffff; }
    
    .annotator-btn-primary { display: flex; align-items: center; gap: 6px; background: #008060; border: none; color: #ffffff; border-radius: 6px; padding: 8px 16px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: -apple-system, sans-serif; transition: background 0.15s ease; }
    .annotator-btn-primary:hover { background: #006e52; }

    .annotator-btn-secondary { display: flex; align-items: center; gap: 6px; background: #31373d; border: 1px solid #454f59; color: #ffffff; border-radius: 6px; padding: 7px 15px; cursor: pointer; font-size: 13px; font-weight: 600; font-family: -apple-system, sans-serif; transition: all 0.15s ease; }
    .annotator-btn-secondary:hover { background: #454f59; border-color: #5c6670; }
    
    .annotator-btn-cancel { display: flex; align-items: center; gap: 6px; justify-content: center; background: transparent; border: none; color: #e77674; border-radius: 6px; padding: 8px 12px; cursor: pointer; font-size: 13px; font-weight: 500; font-family: -apple-system, sans-serif; transition: all 0.15s ease; }
    .annotator-btn-cancel:hover { background: rgba(231, 118, 116, 0.1); }
    
    .annotator-input { background: #111213; border: 1px solid #454f59; color: #ffffff; padding: 4px 8px; border-radius: 4px; font-family: -apple-system, sans-serif; font-size: 12px; outline: none; transition: border 0.15s ease; }
    .annotator-input:focus { border-color: #008060; }
    
    .annotator-color-picker { -webkit-appearance: none; border: none; width: 24px; height: 24px; border-radius: 4px; padding: 0; cursor: pointer; background: transparent; }
    .annotator-color-picker::-webkit-color-swatch-wrapper { padding: 0; }
    .annotator-color-picker::-webkit-color-swatch { border: 1px solid #454f59; border-radius: 4px; }
    
    .annotator-label { font-family: -apple-system, sans-serif; font-size: 11px; color: #a6acb2; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }

    /* Consistent select styling (closed control; the open list is OS-native) */
    select.annotator-input {
      -webkit-appearance: none; -moz-appearance: none; appearance: none;
      padding-right: 22px; cursor: pointer;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23a6acb2' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
      background-repeat: no-repeat; background-position: right 6px center; background-size: 11px;
    }
    select.annotator-input option { background: #202223 !important; color: #ffffff !important; }

    /* Remove cramped native number spinners (use typing / mouse-wheel / arrow keys) */
    .annotator-input[type=number]::-webkit-outer-spin-button,
    .annotator-input[type=number]::-webkit-inner-spin-button { -webkit-appearance: none !important; margin: 0 !important; }
    .annotator-input[type=number] { -moz-appearance: textfield; text-align: center; }

    /* Thin horizontal scrollbar for the scrolling settings region */
    #dynamic-settings { scrollbar-width: thin; scrollbar-color: #454f59 transparent; }
    #dynamic-settings::-webkit-scrollbar { height: 6px; }
    #dynamic-settings::-webkit-scrollbar-track { background: transparent; }
    #dynamic-settings::-webkit-scrollbar-thumb { background: #454f59; border-radius: 3px; }

    /* Clickable numeric steppers */
    .annotator-stepper { display: inline-flex; align-items: stretch; height: 24px; }
    .annotator-step { width: 20px; border: 1px solid #454f59; background: #31373d; color: #ffffff; cursor: pointer; font-size: 14px; line-height: 1; display: flex; align-items: center; justify-content: center; padding: 0; user-select: none; }
    .annotator-step:hover { background: #454f59; }
    .annotator-step:first-child { border-radius: 4px 0 0 4px; border-right: none; }
    .annotator-step:last-child { border-radius: 0 4px 4px 0; border-left: none; }
    .annotator-input.annotator-num { width: 34px; border-radius: 0; }
  `;
  document.head.appendChild(style);

  // --- 2. Custom Classes ---
  const AnnotatorSpotlight = fabric.util.createClass(fabric.Rect, {
    type: 'annotatorSpotlight',
    initialize: function(options) {
      options || (options = {}); this.callSuper('initialize', options); this.set('annotatorType', 'spotlight'); this.set('objectCaching', false);
    },
    _render: function(ctx) {
      const w = this.width, h = this.height, rx = this.rx || 0, ry = this.ry || 0; const x = -w/2, y = -h/2;
      ctx.save(); ctx.beginPath();
      ctx.rect(-5000, -5000, 10000, 10000);
      ctx.moveTo(x + rx, y); ctx.lineTo(x + w - rx, y); ctx.quadraticCurveTo(x + w, y, x + w, y + ry);
      ctx.lineTo(x + w, y + h - ry); ctx.quadraticCurveTo(x + w, y + h, x + w - rx, y + h);
      ctx.lineTo(x + rx, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - ry); ctx.lineTo(x, y + ry); ctx.quadraticCurveTo(x, y, x + rx, y); ctx.closePath();
      ctx.fillStyle = this.fill; ctx.fill('evenodd'); 
      if (this.strokeWidth > 0) {
        ctx.beginPath(); ctx.moveTo(x + rx, y); ctx.lineTo(x + w - rx, y); ctx.quadraticCurveTo(x + w, y, x + w, y + ry);
        ctx.lineTo(x + w, y + h - ry); ctx.quadraticCurveTo(x + w, y + h, x + w - rx, y + h);
        ctx.lineTo(x + rx, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - ry); ctx.lineTo(x, y + ry); ctx.quadraticCurveTo(x, y, x + rx, y); ctx.closePath();
        ctx.lineWidth = this.strokeWidth; ctx.strokeStyle = this.stroke;
        if (this.strokeDashArray) ctx.setLineDash(this.strokeDashArray); else ctx.setLineDash([]);
        ctx.stroke();
      }
      ctx.restore();
    }
  });

  const AnnotatorBadge = fabric.util.createClass(fabric.IText, {
    type: 'annotatorBadge',
    initialize: function(text, options) {
      options || (options = {}); options.padding = options.customPadding || 8; this.callSuper('initialize', text, options);
      this.set('annotatorFill', options.annotatorFill || '#005bd3'); this.set('annotatorBorderColor', options.annotatorBorderColor || '#000000');
      this.set('annotatorBorderWidth', options.annotatorBorderWidth || 0); this.set('annotatorBorderDash', options.annotatorBorderDash || null);
      this.set('annotatorTextColor', options.annotatorTextColor || '#ffffff'); this.set('objectCaching', false);
    },
    _renderBackground: function(ctx) {
      const radius = Math.max(this.width, this.height) / 2 + this.padding;
      ctx.beginPath(); ctx.arc(0, 0, radius, 0, 2 * Math.PI, false);
      if (this.annotatorFill && this.annotatorFill !== 'transparent') { ctx.fillStyle = this.annotatorFill; ctx.fill(); }
      if (this.annotatorBorderWidth > 0) {
        ctx.lineWidth = this.annotatorBorderWidth; ctx.strokeStyle = this.annotatorBorderColor;
        if (this.annotatorBorderDash) ctx.setLineDash(this.annotatorBorderDash); else ctx.setLineDash([]);
        ctx.stroke();
      }
      ctx.closePath();
    }
  });

  const AnnotatorText = fabric.util.createClass(fabric.Textbox, {
    type: 'annotatorText',
    initialize: function(text, options) {
      options || (options = {}); options.padding = options.customPadding || 10; this.callSuper('initialize', text, options);
      this.set('rx', options.rx || 4); this.set('customPadding', options.customPadding || 10);
      this.set('showArrow', options.showArrow || false); this.set('arrowSize', options.arrowSize || 8);
      this.set('arrowPosition', options.arrowPosition || 'bottom');
      this.set('annotatorBorderColor', options.annotatorBorderColor || '#000000'); this.set('annotatorBorderWidth', options.annotatorBorderWidth || 0);
      this.set('annotatorBorderDash', options.annotatorBorderDash || null); this.set('annotatorTextColor', options.annotatorTextColor || '#ffffff'); this.set('objectCaching', false); 
    },
    _renderBackground: function(ctx) {
      if (!this.backgroundColor && !this.showArrow && this.annotatorBorderWidth === 0) return;
      const p = this.customPadding; const w = this.width + p * 2; const h = this.height + p * 2;
      const x = -this.width / 2 - p; const y = -this.height / 2 - p;
      const a = this.arrowSize;

      ctx.beginPath();
      ctx.moveTo(x + this.rx, y);
      if (this.showArrow && this.arrowPosition === 'top') {
        ctx.lineTo(-a, y); ctx.lineTo(0, y - a); ctx.lineTo(a, y);
      }
      ctx.lineTo(x + w - this.rx, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + this.rx);

      if (this.showArrow && this.arrowPosition === 'right') {
        ctx.lineTo(x + w, -a); ctx.lineTo(x + w + a, 0); ctx.lineTo(x + w, a);
      }
      ctx.lineTo(x + w, y + h - this.rx);
      ctx.quadraticCurveTo(x + w, y + h, x + w - this.rx, y + h);

      if (this.showArrow && this.arrowPosition === 'bottom') {
        ctx.lineTo(a, y + h); ctx.lineTo(0, y + h + a); ctx.lineTo(-a, y + h);
      }
      ctx.lineTo(x + this.rx, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - this.rx);

      if (this.showArrow && this.arrowPosition === 'left') {
        ctx.lineTo(x, a); ctx.lineTo(x - a, 0); ctx.lineTo(x, -a);
      }
      ctx.lineTo(x, y + this.rx);
      ctx.quadraticCurveTo(x, y, x + this.rx, y);
      
      ctx.closePath();
      
      if (this.backgroundColor && this.backgroundColor !== 'transparent') { ctx.fillStyle = this.backgroundColor; ctx.fill(); }
      if (this.annotatorBorderWidth > 0) {
        ctx.lineWidth = this.annotatorBorderWidth; ctx.strokeStyle = this.annotatorBorderColor;
        if (this.annotatorBorderDash) ctx.setLineDash(this.annotatorBorderDash); else ctx.setLineDash([]);
        ctx.stroke();
      }
    }
  });

  const AnnotatorArrow = fabric.util.createClass(fabric.Line, {
    type: 'annotatorArrow',
    initialize: function(points, options) {
      options || (options = {}); this.callSuper('initialize', points, options);
      this.set({ strokeWidth: 4, padding: 20, transparentCorners: false, cornerColor: '#008060' });
    },
    _render: function(ctx) {
      this.callSuper('_render', ctx); ctx.save();
      const p = this.calcLinePoints(); const angle = Math.atan2(p.y2 - p.y1, p.x2 - p.x1);
      ctx.translate(p.x1, p.y1); ctx.rotate(angle); ctx.scale(1 / this.scaleX, 1 / this.scaleY);
      ctx.beginPath(); ctx.moveTo(14, 12); ctx.lineTo(0, 0); ctx.lineTo(14, -12);
      ctx.lineWidth = this.strokeWidth; ctx.strokeStyle = this.stroke; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.restore();
    }
  });

  // --- REGISTER CUSTOM CLASSES FOR TEMPLATE LOADING ---
  fabric.AnnotatorSpotlight = AnnotatorSpotlight;
  fabric.AnnotatorSpotlight.fromObject = function(object, callback) {
    callback && callback(new fabric.AnnotatorSpotlight(object));
  };

  fabric.AnnotatorBadge = AnnotatorBadge;
  fabric.AnnotatorBadge.fromObject = function(object, callback) {
    callback && callback(new fabric.AnnotatorBadge(object.text, object));
  };

  fabric.AnnotatorText = AnnotatorText;
  fabric.AnnotatorText.fromObject = function(object, callback) {
    callback && callback(new fabric.AnnotatorText(object.text, object));
  };

  fabric.AnnotatorArrow = AnnotatorArrow;
  fabric.AnnotatorArrow.fromObject = function(object, callback) {
    const points = [object.x1, object.y1, object.x2, object.y2];
    callback && callback(new fabric.AnnotatorArrow(points, object));
  };


  // --- 3. Canvas & UI Generation ---
  const canvasContainer = document.createElement('div');
  canvasContainer.id = 'annotator-canvas-container';
  canvasContainer.style.cssText = `position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 2147483646; cursor: crosshair;`;
  const canvasElement = document.createElement('canvas');
  canvasElement.id = 'annotator-fabric-canvas';
  canvasElement.width = window.innerWidth;
  canvasElement.height = window.innerHeight;
  canvasContainer.appendChild(canvasElement);
  document.documentElement.appendChild(canvasContainer);

  const canvas = new fabric.Canvas('annotator-fabric-canvas', { selection: true });

  const initSmartGuides = (canvas) => {
    const snapZone = 8; 
    const guideColor = '#008060'; 
    let activeVLines = [];
    let activeHLines = [];

    canvas.on('object:moving', (e) => {
      const movingObj = e.target;
      const objs = canvas.getObjects().filter(o => o !== movingObj && o.annotatorType !== 'crop' && o.annotatorType !== 'spotlight');
      
      const movingBounds = movingObj.getBoundingRect();
      activeVLines = [];
      activeHLines = [];

      const movingEdges = {
        left: movingBounds.left, center: movingBounds.left + movingBounds.width / 2, right: movingBounds.left + movingBounds.width,
        top: movingBounds.top, middle: movingBounds.top + movingBounds.height / 2, bottom: movingBounds.top + movingBounds.height
      };

      let closestX = { dist: Infinity, shift: 0, linePos: 0 };
      let closestY = { dist: Infinity, shift: 0, linePos: 0 };

      objs.forEach(targetObj => {
        const targetBounds = targetObj.getBoundingRect();
        const targetEdges = {
          left: targetBounds.left, center: targetBounds.left + targetBounds.width / 2, right: targetBounds.left + targetBounds.width,
          top: targetBounds.top, middle: targetBounds.top + targetBounds.height / 2, bottom: targetBounds.top + targetBounds.height
        };

        ['left', 'center', 'right'].forEach(movingKey => {
          ['left', 'center', 'right'].forEach(targetKey => {
            const dist = Math.abs(targetEdges[targetKey] - movingEdges[movingKey]);
            if (dist < snapZone && dist < closestX.dist) {
              closestX = { dist: dist, shift: targetEdges[targetKey] - movingEdges[movingKey], linePos: targetEdges[targetKey] };
            }
          });
        });

        ['top', 'middle', 'bottom'].forEach(movingKey => {
          ['top', 'middle', 'bottom'].forEach(targetKey => {
            const dist = Math.abs(targetEdges[targetKey] - movingEdges[movingKey]);
            if (dist < snapZone && dist < closestY.dist) {
              closestY = { dist: dist, shift: targetEdges[targetKey] - movingEdges[movingKey], linePos: targetEdges[targetKey] };
            }
          });
        });
      });

      if (closestX.dist < snapZone) { movingObj.set('left', movingObj.left + closestX.shift); activeVLines.push(closestX.linePos); }
      if (closestY.dist < snapZone) { movingObj.set('top', movingObj.top + closestY.shift); activeHLines.push(closestY.linePos); }
    });

    canvas.on('after:render', () => {
      if (activeVLines.length === 0 && activeHLines.length === 0) return;
      const ctx = canvas.getContext();
      ctx.save(); ctx.strokeStyle = guideColor; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
      activeVLines.forEach(x => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, canvas.height); ctx.stroke(); });
      activeHLines.forEach(y => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y); ctx.stroke(); });
      ctx.restore();
    });

    canvas.on('mouse:up', () => { activeVLines = []; activeHLines = []; canvas.renderAll(); });
  };

  initSmartGuides(canvas);

  const toolbar = document.createElement('div');
  toolbar.id = 'annotator-toolbar';
  toolbar.style.cssText = `position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); transform-origin: bottom center; z-index: 2147483647; background: #202223; padding: 12px 16px; border-radius: 12px; box-shadow: 0 16px 32px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 6px; border: 1px solid #454f59; flex-wrap: nowrap; max-width: calc(100vw - 24px);`;

  toolbar.innerHTML = `
    <div class="annotator-dropdown-container">
      <button class="annotator-tool-btn"><i class="ic ic-box"></i> Insert <i class="ic ic-chevron" style="width:12px; height:12px;"></i></button>
      <div class="annotator-dropdown-menu">
        <button class="annotator-tool-btn" id="tool-box"><i class="ic ic-box"></i> Box</button>
        <button class="annotator-tool-btn" id="tool-text"><i class="ic ic-text"></i> Text</button>
        <button class="annotator-tool-btn" id="tool-tooltip"><i class="ic ic-tooltip"></i> Tooltip</button>
        <button class="annotator-tool-btn" id="tool-arrow"><i class="ic ic-arrow"></i> Arrow</button>
        <button class="annotator-tool-btn" id="tool-line"><i class="ic ic-line"></i> Line</button>
        <button class="annotator-tool-btn" id="tool-ellipse"><i class="ic ic-ellipse"></i> Ellipse</button>
        <button class="annotator-tool-btn" id="tool-redact"><i class="ic ic-redact"></i> Redact</button>
        <button class="annotator-tool-btn" id="tool-spotlight"><i class="ic ic-spotlight"></i> Focus</button>
        <button class="annotator-tool-btn" id="tool-badge"><i class="ic ic-badge"></i> Badge</button>
      </div>
    </div>
    
    <div class="annotator-dropdown-container">
      <button class="annotator-tool-btn"><i class="ic ic-crop"></i> Canvas <i class="ic ic-chevron" style="width:12px; height:12px;"></i></button>
      <div class="annotator-dropdown-menu">
        <button class="annotator-tool-btn" id="tool-crop" style="color: #008060;"><i class="ic ic-crop"></i> Select Export Area</button>
        <button class="annotator-tool-btn" id="tool-load-tpl"><i class="ic ic-upload"></i> Load Template</button>
        <button class="annotator-tool-btn" id="tool-save-tpl"><i class="ic ic-download"></i> Save as Template</button>
        <button class="annotator-tool-btn" id="tool-clear" style="color: #e77674;"><i class="ic ic-trash"></i> Clear All</button>
      </div>
    </div>

    <div style="width: 1px; height: 24px; background: #454f59; margin: 0 4px;"></div>
    
    <div id="dynamic-settings" style="display: flex; align-items: center; gap: 8px; flex: 0 1 auto; min-width: 0; overflow-x: auto; overflow-y: hidden; padding-bottom: 2px;">
      <span id="settings-label" class="annotator-label" style="color: #008060; margin-right: 2px;">PAGE FRAME</span>
      


      <div style="display: flex; align-items: center; gap: 6px;" id="text-color-container" title="Text Color">
        <span class="annotator-label">Text</span>
        <input type="color" id="prop-text-color" class="annotator-color-picker">
      </div>
      <div style="display: none; align-items: center; gap: 6px;" id="fontsize-container" title="Font Size">
        <span class="annotator-label">Size</span>
        <span class="annotator-stepper"><button type="button" class="annotator-step" data-target="prop-fontsize" data-dir="-1" tabindex="-1">−</button><input type="number" id="prop-fontsize" min="8" max="120" class="annotator-input annotator-num" title="Font size — type, scroll, or use −/+"><button type="button" class="annotator-step" data-target="prop-fontsize" data-dir="1" tabindex="-1">+</button></span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;" id="fill-container" title="Body fill color and opacity">
        <span class="annotator-label">Fill</span>
        <input type="color" id="prop-fill-color" class="annotator-color-picker">
        <span class="annotator-label" style="font-size: 10px;">Opacity</span>
        <input type="range" id="prop-fill-opacity" min="0" max="1" step="0.05" title="Fill opacity" style="width: 48px; cursor: pointer; accent-color: #008060;">
        <span id="prop-fill-opacity-val" class="annotator-label" style="width: 30px; text-align: right; color: #ffffff;">100%</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;" id="border-container" title="Border / Stroke">
        <span class="annotator-label">Border</span>
        <input type="color" id="prop-border-color" class="annotator-color-picker">
        <span class="annotator-stepper"><button type="button" class="annotator-step" data-target="prop-border-width" data-dir="-1" tabindex="-1">−</button><input type="number" id="prop-border-width" min="0" max="20" class="annotator-input annotator-num" title="Border width — type, scroll, or use −/+"><button type="button" class="annotator-step" data-target="prop-border-width" data-dir="1" tabindex="-1">+</button></span>
      </div>
      <select id="prop-style" class="annotator-input" style="width: 70px;"><option value="solid">Solid</option><option value="dashed">Dashed</option></select>
      <div style="display: flex; align-items: center; gap: 6px;" id="radius-container">
        <span class="annotator-label">Radius</span>
        <span class="annotator-stepper"><button type="button" class="annotator-step" data-target="prop-radius" data-dir="-1" tabindex="-1">−</button><input type="number" id="prop-radius" min="0" max="50" class="annotator-input annotator-num" title="Corner radius — type, scroll, or use −/+"><button type="button" class="annotator-step" data-target="prop-radius" data-dir="1" tabindex="-1">+</button></span>
      </div>
      <div style="display: none; align-items: center; gap: 6px;" id="tooltip-pos-container" title="Arrow Position">
        <span class="annotator-label">Arrow</span>
        <select id="prop-tooltip-pos" class="annotator-input" style="width: 75px;"><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option></select>
      </div>
      <div style="display: none; align-items: center; gap: 6px; background: rgba(0, 128, 96, 0.1); padding: 4px 6px; border-radius: 6px; border: 1px solid rgba(0, 128, 96, 0.3);" id="translation-container">
        <i class="ic ic-translate" style="color: #008060;"></i>
        <select id="prop-translate-lang" class="annotator-input" style="width: 85px; padding: 2px 4px;">
           <option value="es">Spanish</option>
           <option value="fr">French</option>
           <option value="de">German</option>
           <option value="it">Italian</option>
           <option value="pt">Portuguese</option>
           <option value="en">English</option>
        </select>
        <button class="annotator-btn-secondary" id="btn-translate" style="padding: 3px 8px; font-size: 11px;">Translate</button>
      </div>
      <div style="width: 1px; height: 24px; background: #454f59; margin: 0 4px;"></div>
    </div>
    
    <button class="annotator-tool-btn" id="tool-undo" title="Undo (Ctrl+Z)"><i class="ic ic-undo"></i></button>
    <button class="annotator-tool-btn" id="tool-redo" title="Redo (Ctrl+Shift+Z)"><i class="ic ic-redo"></i></button>
    <button class="annotator-btn-cancel" id="tool-exit">Exit</button>
    <button class="annotator-btn-secondary" id="tool-copy">Copy</button>
    <button class="annotator-btn-primary" id="tool-save">Save</button>
  `;
  document.documentElement.appendChild(toolbar);

  // --- ANTI-ZOOM ENGINE (Ensures Toolbar Stays 100% Size) ---
  const adjustToolbarScale = () => {
    const bar = document.getElementById('annotator-toolbar');
    if (!bar) return;
    let zoomLevel = window.outerWidth / window.innerWidth;
    if (zoomLevel < 0.25) zoomLevel = 0.25;
    if (zoomLevel > 5) zoomLevel = 5;
    const inverseScale = 1 / zoomLevel;
    bar.style.transform = `translateX(-50%) scale(${inverseScale})`;
  };

  const handleViewportResize = () => {
    adjustToolbarScale();
    // Keep the Fabric canvas matched to the viewport so annotations and crop
    // coordinates stay aligned with the page after a resize / zoom / devtools toggle.
    if (canvasElement.width !== window.innerWidth || canvasElement.height !== window.innerHeight) {
      canvas.setDimensions({ width: window.innerWidth, height: window.innerHeight });
      canvas.renderAll();
    }
  };
  window.addEventListener('resize', handleViewportResize);
  adjustToolbarScale();


  canvas.on('object:modified', function(e) {
    const obj = e.target;
    if (['box', 'redact', 'spotlight', 'crop'].includes(obj.annotatorType)) {
      obj.set({ width: obj.width * obj.scaleX, height: obj.height * obj.scaleY, scaleX: 1, scaleY: 1 });
    } else if (obj.annotatorType === 'ellipse') {
      obj.set({ rx: obj.rx * obj.scaleX, ry: obj.ry * obj.scaleY, scaleX: 1, scaleY: 1 });
    }
  });

  // --- 4. Tool Actions ---
  const centerLeft = window.innerWidth / 2;
  const centerTop = window.innerHeight / 2;

  document.getElementById('tool-clear').addEventListener('click', () => { canvas.clear(); badgeCount = 1; saveHistory(); });

  document.getElementById('tool-box').addEventListener('click', () => {
    const s = window.annotatorAppState.box;
    const rect = new fabric.Rect({
      left: centerLeft - 100, top: centerTop - 50, fill: hexToRgba(s.fill, s.fillOpacity), stroke: s.border, strokeWidth: s.borderWidth, 
      strokeUniform: true, strokeDashArray: s.style === 'dashed' ? [6,6] : null, width: 200, height: 100, rx: s.radius, ry: s.radius, cornerColor: '#008060', transparentCorners: false,
      annotatorType: 'box', annotatorBaseColor: s.fill, annotatorOpacity: s.fillOpacity, annotatorBorder: s.border, annotatorBorderWidth: s.borderWidth
    });
    canvas.add(rect); canvas.setActiveObject(rect);
  });

  document.getElementById('tool-text').addEventListener('click', () => {
    const s = window.annotatorAppState.text;
    const text = new AnnotatorText('Plain text instruction...', {
      left: centerLeft - 100, top: centerTop, fontFamily: '-apple-system, sans-serif', fill: s.textColor,
      backgroundColor: hexToRgba(s.fill, s.fillOpacity), annotatorBorderColor: s.border, annotatorBorderWidth: s.borderWidth,
      annotatorBorderDash: s.style === 'dashed' ? [6,6] : null, fontSize: 15, customPadding: 10, rx: s.radius, showArrow: false, cornerColor: '#008060', transparentCorners: false, width: 200,
      annotatorType: 'text', annotatorBaseColor: s.fill, annotatorOpacity: s.fillOpacity, annotatorBorder: s.border, annotatorBorderWidth: s.borderWidth, annotatorTextColor: s.textColor
    });
    canvas.add(text); canvas.setActiveObject(text);
  });

  document.getElementById('tool-tooltip').addEventListener('click', () => {
    const s = window.annotatorAppState.tooltip;
    const tooltip = new AnnotatorText('Tooltip instruction...', {
      left: centerLeft - 100, top: centerTop, fontFamily: '-apple-system, sans-serif', fill: s.textColor,
      backgroundColor: hexToRgba(s.fill, s.fillOpacity), annotatorBorderColor: s.border, annotatorBorderWidth: s.borderWidth,
      annotatorBorderDash: s.style === 'dashed' ? [6,6] : null, fontSize: 15, customPadding: 12, rx: s.radius, showArrow: true, 
      arrowPosition: s.arrowPosition, cornerColor: '#008060', transparentCorners: false, width: 200,
      annotatorType: 'tooltip', annotatorBaseColor: s.fill, annotatorOpacity: s.fillOpacity, annotatorBorder: s.border, annotatorBorderWidth: s.borderWidth, annotatorTextColor: s.textColor
    });
    canvas.add(tooltip); canvas.setActiveObject(tooltip);
  });

  document.getElementById('tool-arrow').addEventListener('click', () => {
    const s = window.annotatorAppState.arrow;
    const arrow = new AnnotatorArrow([centerLeft - 80, centerTop, centerLeft + 80, centerTop], {
      stroke: hexToRgba(s.fill, s.fillOpacity), annotatorType: 'arrow', annotatorBaseColor: s.fill, annotatorOpacity: s.fillOpacity
    });
    canvas.add(arrow); canvas.setActiveObject(arrow);
  });

  document.getElementById('tool-line').addEventListener('click', () => {
    const s = window.annotatorAppState.line;
    const line = new fabric.Line([centerLeft - 80, centerTop, centerLeft + 80, centerTop], {
      stroke: hexToRgba(s.fill, s.fillOpacity), strokeWidth: 4, strokeUniform: true, padding: 10,
      cornerColor: '#008060', transparentCorners: false,
      annotatorType: 'line', annotatorBaseColor: s.fill, annotatorOpacity: s.fillOpacity
    });
    canvas.add(line); canvas.setActiveObject(line);
  });

  document.getElementById('tool-ellipse').addEventListener('click', () => {
    const s = window.annotatorAppState.ellipse;
    const ellipse = new fabric.Ellipse({
      left: centerLeft - 90, top: centerTop - 60, rx: 90, ry: 60,
      fill: hexToRgba(s.fill, s.fillOpacity), stroke: s.border, strokeWidth: s.borderWidth,
      strokeUniform: true, strokeDashArray: s.style === 'dashed' ? [6,6] : null, cornerColor: '#008060', transparentCorners: false,
      annotatorType: 'ellipse', annotatorBaseColor: s.fill, annotatorOpacity: s.fillOpacity, annotatorBorder: s.border, annotatorBorderWidth: s.borderWidth
    });
    canvas.add(ellipse); canvas.setActiveObject(ellipse);
  });

  document.getElementById('tool-redact').addEventListener('click', () => {
    const s = window.annotatorAppState.redact;
    const redact = new fabric.Rect({
      left: centerLeft - 60, top: centerTop - 15, fill: hexToRgba(s.fill, s.fillOpacity), stroke: s.border, strokeWidth: s.borderWidth,
      strokeUniform: true, strokeDashArray: s.style === 'dashed' ? [6,6] : null, width: 120, height: 30, rx: s.radius, ry: s.radius, cornerColor: '#008060', transparentCorners: false,
      annotatorType: 'redact', annotatorBaseColor: s.fill, annotatorOpacity: s.fillOpacity, annotatorBorder: s.border, annotatorBorderWidth: s.borderWidth
    });
    canvas.add(redact); canvas.setActiveObject(redact);
  });

  document.getElementById('tool-spotlight').addEventListener('click', () => {
    const s = window.annotatorAppState.spotlight;
    const spotlight = new AnnotatorSpotlight({
      left: centerLeft - 100, top: centerTop - 50, fill: hexToRgba(s.fill, s.fillOpacity), stroke: s.border, strokeWidth: s.borderWidth,
      strokeUniform: true, strokeDashArray: s.style === 'dashed' ? [6,6] : null, width: 200, height: 100, rx: s.radius, ry: s.radius, cornerColor: '#008060', transparentCorners: false,
      annotatorType: 'spotlight', annotatorBaseColor: s.fill, annotatorOpacity: s.fillOpacity, annotatorBorder: s.border, annotatorBorderWidth: s.borderWidth
    });
    canvas.add(spotlight); spotlight.sendToBack(); canvas.setActiveObject(spotlight);
  });

  document.getElementById('tool-badge').addEventListener('click', () => {
    const s = window.annotatorAppState.badge;
    const badge = new AnnotatorBadge(badgeCount.toString(), {
      left: centerLeft, top: centerTop, originX: 'center', originY: 'center', fontFamily: '-apple-system, sans-serif', fill: s.textColor,
      annotatorFill: hexToRgba(s.fill, s.fillOpacity), annotatorBorderColor: s.border, annotatorBorderWidth: s.borderWidth, annotatorBorderDash: s.style === 'dashed' ? [6,6] : null,
      fontSize: 18, fontWeight: 'bold', customPadding: 8, cornerColor: '#008060', transparentCorners: false,
      annotatorType: 'badge', annotatorBaseColor: s.fill, annotatorOpacity: s.fillOpacity, annotatorBorder: s.border, annotatorBorderWidth: s.borderWidth, annotatorTextColor: s.textColor
    });
    canvas.add(badge); canvas.setActiveObject(badge); badgeCount++; 
  });

  document.getElementById('tool-crop').addEventListener('click', () => {
    let existingCrop = canvas.getObjects().find(o => o.annotatorType === 'crop');
    if (existingCrop) { canvas.setActiveObject(existingCrop); return; }
    const cropBox = new fabric.Rect({
      left: centerLeft - 250, top: centerTop - 150, width: 500, height: 300, fill: 'transparent', stroke: '#008060', strokeWidth: 3, strokeDashArray: [8,8],
      strokeUniform: true, cornerColor: '#008060', transparentCorners: false, annotatorType: 'crop'
    });
    canvas.add(cropBox); canvas.setActiveObject(cropBox);
  });

  // --- TEMPLATE SAVE / LOAD ---
  const customPropertiesToExport = [
    'annotatorType', 'annotatorBaseColor', 'annotatorOpacity', 'annotatorBorder', 'annotatorBorderWidth',
    'annotatorTextColor', 'annotatorBorderDash', 'customPadding', 'arrowSize', 'arrowPosition', 'showArrow', 'annotatorFill', 'rx', 'ry', 'fontSize'
  ];

  // --- HISTORY (UNDO / REDO) ---
  let history = [];
  let historyIndex = -1;
  let isRestoring = false;
  const HISTORY_LIMIT = 60;

  const updateHistoryButtons = () => {
    const u = document.getElementById('tool-undo');
    const r = document.getElementById('tool-redo');
    if (u) u.style.opacity = historyIndex <= 0 ? '0.4' : '1';
    if (r) r.style.opacity = historyIndex >= history.length - 1 ? '0.4' : '1';
  };

  const saveHistory = () => {
    if (isRestoring) return;
    const snap = JSON.stringify(canvas.toJSON(customPropertiesToExport));
    if (history[historyIndex] === snap) return; // skip no-op duplicates
    history = history.slice(0, historyIndex + 1);
    history.push(snap);
    if (history.length > HISTORY_LIMIT) history.shift();
    historyIndex = history.length - 1;
    updateHistoryButtons();
  };

  const restoreHistory = (snap) => {
    isRestoring = true;
    canvas.loadFromJSON(JSON.parse(snap), () => {
      canvas.renderAll();
      isRestoring = false;
      updateHistoryButtons();
    });
  };

  const undo = () => {
    if (historyIndex <= 0) return;
    historyIndex--;
    restoreHistory(history[historyIndex]);
  };

  const redo = () => {
    if (historyIndex >= history.length - 1) return;
    historyIndex++;
    restoreHistory(history[historyIndex]);
  };

  canvas.on('object:added', saveHistory);
  canvas.on('object:modified', saveHistory);
  canvas.on('object:removed', saveHistory);
  // Seed with the initial (empty) canvas so the first action can be undone.
  saveHistory();

  document.getElementById('tool-save-tpl').addEventListener('click', () => {
    const json = canvas.toJSON(customPropertiesToExport);
    json.globalFrame = window.annotatorAppState.globalFrame;
    const blob = new Blob([JSON.stringify(json)], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'annotator-template.json';
    a.click();
    URL.revokeObjectURL(url);
  });

  document.getElementById('tool-load-tpl').addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (f) => {
        try {
          const json = JSON.parse(f.target.result);
          if (!json || typeof json !== 'object' || !Array.isArray(json.objects)) {
            alert('This does not look like a valid Annotator Pro template.');
            return;
          }
          if (json.globalFrame) {
            window.annotatorAppState.globalFrame = json.globalFrame;
            document.getElementById('prop-border-color').value = json.globalFrame.borderColor;
            document.getElementById('prop-border-width').value = json.globalFrame.borderWidth;
            document.getElementById('prop-radius').value = json.globalFrame.radius;
          }
          canvas.loadFromJSON(json, () => {
            // Keep numbered badges sequential after loading a template.
            let maxBadge = 0;
            canvas.getObjects().forEach(o => {
              if (o.annotatorType === 'badge') { const n = parseInt(o.text, 10); if (!isNaN(n) && n > maxBadge) maxBadge = n; }
            });
            badgeCount = maxBadge + 1;
            canvas.renderAll();
            saveHistory();
          });
        } catch(err) {
          console.error("Template load error:", err);
          alert("Invalid template file. See console for details.");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  });

  // --- TRANSLATOR (proxied through the background worker) ---
  document.getElementById('btn-translate').addEventListener('click', () => {
    const obj = canvas.getActiveObject();
    if (!obj || !obj.text) return;

    const targetLang = document.getElementById('prop-translate-lang').value;
    const originalText = obj.text;
    const btn = document.getElementById('btn-translate');
    btn.innerText = '...';

    // Routed through the service worker so the request is immune to the host
    // page's Content-Security-Policy and needs only a single scoped host permission.
    chrome.runtime.sendMessage({ action: 'translateText', text: originalText, targetLang: targetLang }, (response) => {
      btn.innerText = 'Translate';
      if (chrome.runtime.lastError || !response || !response.success) {
        alert('Translation failed. Check your internet connection and try again.');
        return;
      }
      obj.set('text', response.text);
      canvas.renderAll();
      saveHistory();
    });
  });

  // --- 5. Dynamic Properties UI Logic ---
  const settingsMenu = document.getElementById('dynamic-settings');
  const settingsLabel = document.getElementById('settings-label');
  const translationContainer = document.getElementById('translation-container');
  const tooltipPosContainer = document.getElementById('tooltip-pos-container');
  const tooltipPosInput = document.getElementById('prop-tooltip-pos');
  const textColorContainer = document.getElementById('text-color-container');
  const textColorInput = document.getElementById('prop-text-color');
  const fillContainer = document.getElementById('fill-container');
  const fillColor = document.getElementById('prop-fill-color');
  const fillOp = document.getElementById('prop-fill-opacity');
  const borderContainer = document.getElementById('border-container');
  const borderColor = document.getElementById('prop-border-color');
  const borderWidth = document.getElementById('prop-border-width');
  const styleInput = document.getElementById('prop-style');
  const radiusInput = document.getElementById('prop-radius');
  const radiusContainer = document.getElementById('radius-container');
  const fontSizeContainer = document.getElementById('fontsize-container');
  const fontSizeInput = document.getElementById('prop-fontsize');
  const fillOpVal = document.getElementById('prop-fill-opacity-val');

  const syncOpacityReadout = () => {
    if (fillOpVal) fillOpVal.textContent = Math.round((parseFloat(fillOp.value) || 0) * 100) + '%';
  };

  // Number fields have no spinners; scroll the wheel over one to nudge its value.
  const attachWheelStepper = (input) => {
    input.addEventListener('wheel', (e) => {
      e.preventDefault();
      const step = parseFloat(input.step) || 1;
      const min = input.min !== '' ? parseFloat(input.min) : -Infinity;
      const max = input.max !== '' ? parseFloat(input.max) : Infinity;
      let val = (parseFloat(input.value) || 0) + (e.deltaY < 0 ? step : -step);
      val = Math.min(max, Math.max(min, Math.round(val * 100) / 100));
      input.value = val;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, { passive: false });
  };
  [borderWidth, radiusInput, fontSizeInput].forEach(attachWheelStepper);

  // Clickable +/- steppers on the numeric fields.
  document.getElementById('annotator-toolbar').addEventListener('click', (e) => {
    const btn = e.target.closest && e.target.closest('.annotator-step');
    if (!btn) return;
    const input = document.getElementById(btn.dataset.target);
    if (!input) return;
    const step = parseFloat(input.step) || 1;
    const min = input.min !== '' ? parseFloat(input.min) : -Infinity;
    const max = input.max !== '' ? parseFloat(input.max) : Infinity;
    let val = (parseFloat(input.value) || 0) + step * parseInt(btn.dataset.dir, 10);
    val = Math.min(max, Math.max(min, val));
    input.value = val;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const updateSettingsUI = (obj) => {
    settingsMenu.style.display = 'flex';
    
    if (!obj) {
      settingsLabel.innerText = 'PAGE FRAME';
      fillContainer.style.display = 'none'; textColorContainer.style.display = 'none'; styleInput.style.display = 'none'; tooltipPosContainer.style.display = 'none'; translationContainer.style.display = 'none';
      borderContainer.style.display = 'flex'; radiusContainer.style.display = 'flex'; fontSizeContainer.style.display = 'none';
      
      const gs = window.annotatorAppState.globalFrame;
      borderColor.value = gs.borderColor || '#454f59'; borderWidth.value = gs.borderWidth || 0; radiusInput.value = gs.radius || 0;
      return;
    }

    let typeLabel = obj.annotatorType.toUpperCase();
    if (typeLabel === 'SPOTLIGHT') typeLabel = 'FOCUS';
    if (typeLabel === 'CROP') typeLabel = 'CROP AREA';
    settingsLabel.innerText = typeLabel;

    if (obj.annotatorType === 'crop') {
      fillContainer.style.display = 'none'; textColorContainer.style.display = 'none'; styleInput.style.display = 'none'; tooltipPosContainer.style.display = 'none'; translationContainer.style.display = 'none';
      borderContainer.style.display = 'none'; radiusContainer.style.display = 'none'; fontSizeContainer.style.display = 'none';
      return;
    }

    fillColor.value = obj.annotatorBaseColor || '#000000'; fillOp.value = obj.annotatorOpacity !== undefined ? obj.annotatorOpacity : 1;
    syncOpacityReadout();
    borderColor.value = obj.annotatorBorder || '#000000'; borderWidth.value = obj.annotatorBorderWidth || 0;
    
    fillContainer.style.display = 'flex'; borderContainer.style.display = 'flex'; styleInput.style.display = 'block'; radiusContainer.style.display = 'flex';
    fillOp.style.display = (obj.annotatorType === 'redact') ? 'none' : ''; fontSizeContainer.style.display = 'none';

    if (['text', 'tooltip', 'badge'].includes(obj.annotatorType)) {
      textColorContainer.style.display = 'flex'; textColorInput.value = obj.annotatorTextColor || '#ffffff';
      fontSizeContainer.style.display = 'flex'; fontSizeInput.value = Math.round(obj.fontSize) || 15;
      translationContainer.style.display = 'flex'; 
    } else {
      textColorContainer.style.display = 'none';
      translationContainer.style.display = 'none'; 
    }

    if (obj.annotatorType === 'tooltip') {
      tooltipPosContainer.style.display = 'flex'; tooltipPosInput.value = obj.arrowPosition || 'bottom';
    } else {
      tooltipPosContainer.style.display = 'none';
    }

    if (['arrow', 'line'].includes(obj.annotatorType)) {
      borderContainer.style.display = 'none'; styleInput.style.display = 'none'; radiusContainer.style.display = 'none';
    } else if (obj.annotatorType === 'ellipse') {
      radiusContainer.style.display = 'none'; styleInput.value = obj.strokeDashArray ? 'dashed' : 'solid';
    } else if (obj.annotatorType === 'badge') {
      radiusContainer.style.display = 'none'; styleInput.value = obj.annotatorBorderDash ? 'dashed' : 'solid';
    } else {
      radiusInput.value = obj.rx;
      if (['box', 'redact', 'spotlight'].includes(obj.annotatorType)) styleInput.value = obj.strokeDashArray ? 'dashed' : 'solid';
      else styleInput.value = obj.annotatorBorderDash ? 'dashed' : 'solid';
    }
  };

  canvas.on('selection:created', (e) => updateSettingsUI(e.selected[0]));
  canvas.on('selection:updated', (e) => updateSettingsUI(e.selected[0]));
  canvas.on('selection:cleared', () => updateSettingsUI(null));
  
  updateSettingsUI(null);

  // --- Floating per-object actions (Duplicate / Delete) ---
  const objActions = document.createElement('div');
  objActions.id = 'annotator-obj-actions';
  objActions.style.cssText = 'position: fixed; display: none; gap: 4px; z-index: 2147483647; background: #202223; border: 1px solid #454f59; border-radius: 8px; padding: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.35);';
  objActions.innerHTML = `
    <button class="annotator-tool-btn" id="obj-duplicate" title="Duplicate" style="padding: 6px;"><i class="ic ic-copy"></i></button>
    <button class="annotator-tool-btn" id="obj-delete" title="Delete" style="padding: 6px; color: #e77674;"><i class="ic ic-trash"></i></button>
  `;
  document.documentElement.appendChild(objActions);

  const hideObjActions = () => { objActions.style.display = 'none'; };

  const positionObjActions = () => {
    const obj = canvas.getActiveObject();
    if (!obj) { hideObjActions(); return; }
    document.getElementById('obj-duplicate').style.display = (obj.annotatorType === 'crop') ? 'none' : 'flex';
    objActions.style.display = 'flex';
    const r = obj.getBoundingRect(true, true);
    const w = objActions.offsetWidth || 72;
    let top = r.top - 44;
    if (top < 4) top = r.top + r.height + 8;
    let left = r.left + r.width - w;
    if (left < 4) left = 4;
    if (left + w > window.innerWidth - 4) left = window.innerWidth - 4 - w;
    objActions.style.top = top + 'px';
    objActions.style.left = left + 'px';
  };

  document.getElementById('obj-delete').addEventListener('click', () => {
    const objs = canvas.getActiveObjects();
    if (!objs.length) return;
    canvas.discardActiveObject();
    objs.forEach(o => canvas.remove(o));
    canvas.requestRenderAll();
    hideObjActions();
  });

  document.getElementById('obj-duplicate').addEventListener('click', () => {
    const obj = canvas.getActiveObject();
    if (!obj || obj.annotatorType === 'crop') return;
    obj.clone((cloned) => {
      cloned.set({ left: obj.left + 20, top: obj.top + 20 });
      if (cloned.annotatorType === 'badge') { cloned.set('text', badgeCount.toString()); badgeCount++; }
      canvas.add(cloned);
      canvas.setActiveObject(cloned);
      canvas.requestRenderAll();
      positionObjActions();
    }, customPropertiesToExport);
  });

  canvas.on('selection:created', positionObjActions);
  canvas.on('selection:updated', positionObjActions);
  canvas.on('selection:cleared', hideObjActions);
  canvas.on('object:moving', positionObjActions);
  canvas.on('object:scaling', positionObjActions);
  canvas.on('object:rotating', positionObjActions);
  canvas.on('object:modified', positionObjActions);

  const applySettingsToMemory = (obj) => {
    if (!obj) {
      window.annotatorAppState.globalFrame.borderColor = borderColor.value; window.annotatorAppState.globalFrame.borderWidth = parseInt(borderWidth.value) || 0; window.annotatorAppState.globalFrame.radius = parseInt(radiusInput.value) || 0;
      saveState(); return;
    }
    
    const type = obj.annotatorType;
    if (type === 'crop') return; 
    
    if(window.annotatorAppState[type]) {
      window.annotatorAppState[type].fill = obj.annotatorBaseColor; window.annotatorAppState[type].fillOpacity = obj.annotatorOpacity; 
      if (['text', 'tooltip', 'badge'].includes(type)) window.annotatorAppState[type].textColor = obj.annotatorTextColor;
      if (type === 'tooltip') window.annotatorAppState[type].arrowPosition = obj.arrowPosition;
      if (type !== 'arrow' && type !== 'line') {
        window.annotatorAppState[type].border = obj.annotatorBorder; window.annotatorAppState[type].borderWidth = parseInt(borderWidth.value) || 0; window.annotatorAppState[type].style = styleInput.value;
      }
      if (type !== 'arrow' && type !== 'line' && type !== 'badge' && type !== 'ellipse') window.annotatorAppState[type].radius = parseInt(radiusInput.value) || 0;
      saveState();
    }
  };

  const applyVisualChanges = () => {
    const obj = canvas.getActiveObject();
    if (!obj) { applySettingsToMemory(null); return; }
    if (obj.annotatorType === 'crop') return; 
    
    const fColor = fillColor.value; let fOp = parseFloat(fillOp.value); if (obj.annotatorType === 'redact') { fOp = 1; fillOp.value = 1; } const bColor = borderColor.value; const bWidth = parseInt(borderWidth.value) || 0; const tColor = textColorInput.value;
    
    obj.annotatorBaseColor = fColor; obj.annotatorOpacity = fOp; obj.annotatorBorder = bColor; obj.annotatorBorderWidth = bWidth;
    const fillRgba = hexToRgba(fColor, fOp);

    if (['box', 'redact', 'spotlight', 'ellipse'].includes(obj.annotatorType)) obj.set({ fill: fillRgba, stroke: bColor, strokeWidth: bWidth });
    else if (obj.annotatorType === 'text' || obj.annotatorType === 'tooltip') { obj.set({ backgroundColor: fillRgba, annotatorBorderColor: bColor, annotatorBorderWidth: bWidth, fill: tColor }); obj.annotatorTextColor = tColor; }
    else if (['arrow', 'line'].includes(obj.annotatorType)) obj.set('stroke', fillRgba);
    else if (obj.annotatorType === 'badge') { obj.set({ annotatorFill: fillRgba, annotatorBorderColor: bColor, annotatorBorderWidth: bWidth, fill: tColor }); obj.annotatorTextColor = tColor; }
    
    applySettingsToMemory(obj); canvas.renderAll();
  };

  textColorInput.addEventListener('input', applyVisualChanges); fillColor.addEventListener('input', applyVisualChanges); fillOp.addEventListener('input', applyVisualChanges); borderColor.addEventListener('input', applyVisualChanges); borderWidth.addEventListener('input', applyVisualChanges);
  fillOp.addEventListener('input', syncOpacityReadout);
  
  tooltipPosInput.addEventListener('change', (e) => {
    const obj = canvas.getActiveObject(); 
    if (obj && obj.annotatorType === 'tooltip') {
      obj.set('arrowPosition', e.target.value);
      applySettingsToMemory(obj); 
      canvas.renderAll();
    }
  });

  styleInput.addEventListener('change', (e) => {
    const obj = canvas.getActiveObject(); if (!obj || obj.annotatorType === 'arrow' || obj.annotatorType === 'line' || obj.annotatorType === 'crop') return;
    const dash = e.target.value === 'dashed' ? [6, 6] : null;
    if (['box', 'redact', 'spotlight', 'ellipse'].includes(obj.annotatorType)) obj.set('strokeDashArray', dash); else obj.set('annotatorBorderDash', dash); 
    applySettingsToMemory(obj); canvas.renderAll();
  });
  
  radiusInput.addEventListener('input', (e) => {
    const obj = canvas.getActiveObject(); if (!obj) { applyVisualChanges(); return; }
    if (['arrow', 'line', 'badge', 'ellipse', 'crop'].includes(obj.annotatorType)) return;
    const val = parseInt(e.target.value, 10) || 0;
    if (['box', 'redact', 'spotlight'].includes(obj.annotatorType)) obj.set({ rx: val, ry: val }); else obj.set('rx', val);
    applySettingsToMemory(obj); canvas.renderAll();
  });

  fontSizeInput.addEventListener('input', (e) => {
    const obj = canvas.getActiveObject();
    if (!obj || !['text', 'tooltip', 'badge'].includes(obj.annotatorType)) return;
    const val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) return;
    obj.set('fontSize', val);
    if (typeof obj.initDimensions === 'function') obj.initDimensions();
    obj.setCoords();
    canvas.renderAll();
    saveHistory();
  });

  // --- 6. IMAGE EXPORT PROCESSOR ---
  const processImage = (dataUrl, actionType, cropCoords) => {
    const gs = window.annotatorAppState.globalFrame;
    const scale = window.devicePixelRatio || 1; 
    const radius = (gs.radius || 0) * scale;
    const bWidth = (gs.borderWidth || 0) * scale;
    const bColor = gs.borderColor || '#000000';

    const img = new Image();
    img.onload = () => {
      const exportCanvas = document.createElement('canvas');
      const ctx = exportCanvas.getContext('2d');

      let sourceX = 0, sourceY = 0;
      let targetW = img.width, targetH = img.height;

      if (cropCoords) {
        sourceX = Math.max(0, cropCoords.x * scale);
        sourceY = Math.max(0, cropCoords.y * scale);
        targetW = Math.min(cropCoords.w * scale, img.width - sourceX);
        targetH = Math.min(cropCoords.h * scale, img.height - sourceY);
      }

      exportCanvas.width = targetW;
      exportCanvas.height = targetH;

      if (radius > 0 || bWidth > 0) {
        const x = bWidth / 2; const y = bWidth / 2;
        const w = targetW - bWidth; const h = targetH - bWidth;

        ctx.beginPath();
        ctx.moveTo(x + radius, y); ctx.lineTo(x + w - radius, y); ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
        ctx.lineTo(x + w, y + h - radius); ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
        ctx.lineTo(x + radius, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
        ctx.lineTo(x, y + radius); ctx.quadraticCurveTo(x, y, x + radius, y); ctx.closePath();

        ctx.save(); ctx.clip(); 
        ctx.drawImage(img, sourceX, sourceY, targetW, targetH, 0, 0, targetW, targetH); 
        ctx.restore();
        
        if (bWidth > 0) { ctx.lineWidth = bWidth; ctx.strokeStyle = bColor; ctx.stroke(); }
      } else {
        ctx.drawImage(img, sourceX, sourceY, targetW, targetH, 0, 0, targetW, targetH);
      }

      if (actionType === 'download') {
        chrome.runtime.sendMessage({ 
            action: "downloadProcessedImage", 
            dataUrl: exportCanvas.toDataURL('image/png') 
        });
      } else if (actionType === 'copy') {
        exportCanvas.toBlob((blob) => {
          if (blob) {
            const item = new ClipboardItem({ "image/png": blob });
            navigator.clipboard.write([item]).then(() => {
              const copyBtn = document.getElementById('tool-copy');
              const originalHtml = copyBtn.innerHTML;
              copyBtn.innerHTML = `Copied!`;
              setTimeout(() => { copyBtn.innerHTML = originalHtml; }, 2000);
            }).catch(err => {
              console.error("Clipboard copy failed", err);
              alert("Could not copy. Please click anywhere on the page to ensure it is in focus first.");
            });
          }
        }, 'image/png');
      }
    };
    img.src = dataUrl;
  };

  // --- 7. Save, Copy, and Exit Actions ---
  function cleanupAnnotator() {
    window.removeEventListener('resize', handleViewportResize);
    window.removeEventListener('keydown', handleKeydown);
    try { canvas.dispose(); } catch (e) { /* canvas already gone */ }
    document.getElementById('annotator-canvas-container')?.remove();
    document.getElementById('annotator-toolbar')?.remove();
    document.getElementById('annotator-injected-styles')?.remove();
    document.getElementById('annotator-obj-actions')?.remove();
    document.body.style.overflow = originalBodyOverflow;
    window.isProAnnotatorActive = false;
  }
  document.getElementById('tool-exit').addEventListener('click', cleanupAnnotator);

  const triggerImageCapture = (actionType) => {
    toolbar.style.display = 'none'; 
    canvas.discardActiveObject(); 

    const cropObj = canvas.getObjects().find(o => o.annotatorType === 'crop');
    let cropCoords = null;
    if (cropObj) {
      cropCoords = {
        x: cropObj.left, y: cropObj.top,
        w: cropObj.width * cropObj.scaleX, h: cropObj.height * cropObj.scaleY
      };
      cropObj.set('visible', false);
    }

    canvas.renderAll();

    setTimeout(() => {
      chrome.runtime.sendMessage({ action: "takeScreenshot" }, (response) => {
        if (response && response.dataUrl) {
           processImage(response.dataUrl, actionType, cropCoords);
        }
        if (cropObj) cropObj.set('visible', true);
        toolbar.style.display = 'flex';
        canvas.renderAll();
      });
    }, 150);
  };

  document.getElementById('tool-save').addEventListener('click', () => triggerImageCapture('download'));
  document.getElementById('tool-copy').addEventListener('click', () => triggerImageCapture('copy'));
  document.getElementById('tool-undo').addEventListener('click', undo);
  document.getElementById('tool-redo').addEventListener('click', redo);

  const handleKeydown = (e) => {
    // Ignore shortcuts while the user is typing in a toolbar field (number inputs, selects, etc.)
    const t = e.target;
    if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length && !activeObjects[0].isEditing) { canvas.discardActiveObject(); activeObjects.forEach(obj => canvas.remove(obj)); }
    } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
      e.preventDefault(); undo();
    } else if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
      e.preventDefault(); redo();
    }
  };
  window.addEventListener('keydown', handleKeydown);
}

