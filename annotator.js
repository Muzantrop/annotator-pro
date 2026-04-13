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
  toolbar.style.cssText = `position: fixed; bottom: 30px; left: 50%; transform: translateX(-50%); z-index: 2147483647; background: #202223; padding: 12px 16px; border-radius: 12px; box-shadow: 0 16px 32px rgba(0,0,0,0.3), 0 4px 12px rgba(0,0,0,0.2); display: flex; align-items: center; gap: 6px; border: 1px solid #454f59; flex-wrap: nowrap;`;

  toolbar.innerHTML = `
    <button class="annotator-tool-btn" id="tool-box"><i class="ic ic-box"></i> Box</button>
    <button class="annotator-tool-btn" id="tool-text"><i class="ic ic-text"></i> Text</button>
    
    <div style="position: relative; display: flex;" id="tooltip-wrapper">
      <button class="annotator-tool-btn" id="tool-tooltip"><i class="ic ic-tooltip"></i> Tooltip</button>
      <div id="tooltip-submenu" style="display: none; position: absolute; bottom: 100%; left: 0; margin-bottom: 8px; background: #202223; border: 1px solid #454f59; border-radius: 8px; padding: 6px; flex-direction: column; gap: 4px; z-index: 100; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
        <button class="annotator-tool-btn tooltip-opt" data-pos="top">Top Arrow</button>
        <button class="annotator-tool-btn tooltip-opt" data-pos="bottom">Bottom Arrow</button>
        <button class="annotator-tool-btn tooltip-opt" data-pos="left">Left Arrow</button>
        <button class="annotator-tool-btn tooltip-opt" data-pos="right">Right Arrow</button>
      </div>
    </div>
    
    <button class="annotator-tool-btn" id="tool-arrow"><i class="ic ic-arrow"></i> Arrow</button>
    <button class="annotator-tool-btn" id="tool-redact"><i class="ic ic-redact"></i> Redact</button>
    <button class="annotator-tool-btn" id="tool-spotlight"><i class="ic ic-spotlight"></i> Focus</button>
    <button class="annotator-tool-btn" id="tool-badge" title="Auto-numbers"><i class="ic ic-badge"></i> Badge</button>
    <button class="annotator-tool-btn" id="tool-crop" style="color: #008060;" title="Select Export Area"><i class="ic ic-crop"></i> Crop</button>
    
    <div style="width: 1px; height: 24px; background: #454f59; margin: 0 4px;"></div>
    
    <button class="annotator-tool-btn" id="tool-load-tpl" title="Load Template"><i class="ic ic-upload"></i></button>
    <button class="annotator-tool-btn" id="tool-save-tpl" title="Save as Template"><i class="ic ic-download"></i></button>
    <button class="annotator-tool-btn" id="tool-clear" style="color: #e77674;" title="Clear Canvas"><i class="ic ic-trash"></i></button>

    <div style="width: 1px; height: 24px; background: #454f59; margin: 0 4px;"></div>
    
    <div id="dynamic-settings" style="display: flex; align-items: center; gap: 10px;">
      <span id="settings-label" class="annotator-label" style="color: #008060; margin-right: 2px;">FRAME</span>
      
      <div style="display: none; align-items: center; gap: 6px; background: rgba(0, 128, 96, 0.1); padding: 4px 6px; border-radius: 6px; border: 1px solid rgba(0, 128, 96, 0.3);" id="translation-container">
        <i class="ic ic-translate" style="color: #008060;"></i>
        <select id="prop-translate-lang" class="annotator-input" style="width: 90px; padding: 2px 4px;">
           <option value="es">Spanish</option>
           <option value="fr">French</option>
           <option value="de">German</option>
           <option value="it">Italian</option>
           <option value="pt">Portuguese</option>
           <option value="en">English</option>
        </select>
        <button class="annotator-btn-secondary" id="btn-translate" style="padding: 3px 8px; font-size: 11px;">Translate</button>
      </div>

      <div style="display: none; align-items: center; gap: 6px;" id="tooltip-pos-container" title="Arrow Position">
        <span class="annotator-label">Arrow</span>
        <select id="prop-tooltip-pos" class="annotator-input" style="width: 75px;"><option value="top">Top</option><option value="bottom">Bottom</option><option value="left">Left</option><option value="right">Right</option></select>
      </div>

      <div style="display: flex; align-items: center; gap: 6px;" id="text-color-container" title="Text Color">
        <span class="annotator-label">Text</span>
        <input type="color" id="prop-text-color" class="annotator-color-picker">
      </div>
      <div style="display: flex; align-items: center; gap: 6px;" id="fill-container" title="Body Fill">
        <span class="annotator-label">Fill</span>
        <input type="color" id="prop-fill-color" class="annotator-color-picker">
        <input type="range" id="prop-fill-opacity" min="0" max="1" step="0.1" style="width: 40px; cursor: pointer; accent-color: #008060;">
      </div>
      <div style="display: flex; align-items: center; gap: 6px;" id="border-container" title="Border / Stroke">
        <span class="annotator-label">Border</span>
        <input type="color" id="prop-border-color" class="annotator-color-picker">
        <input type="number" id="prop-border-width" min="0" max="20" class="annotator-input" style="width: 40px;" title="Border Width">
      </div>
      <select id="prop-style" class="annotator-input" style="width: 70px;"><option value="solid">Solid</option><option value="dashed">Dashed</option></select>
      <div style="display: flex; align-items: center; gap: 6px;" id="radius-container">
        <span class="annotator-label">Radius</span>
        <input type="number" id="prop-radius" min="0" max="50" class="annotator-input" style="width: 40px;">
      </div>
      <div style="width: 1px; height: 24px; background: #454f59; margin: 0 4px;"></div>
    </div>
    
    <button class="annotator-btn-cancel" id="tool-exit"><i class="ic ic-exit"></i> Exit</button>
    <button class="annotator-btn-secondary" id="tool-copy"><i class="ic ic-copy"></i> Copy</button>
    <button class="annotator-btn-primary" id="tool-save"><i class="ic ic-save"></i> Save</button>
  `;
  document.documentElement.appendChild(toolbar);

  canvas.on('object:scaling', function(e) {
    const obj = e.target;
    if (['box', 'redact', 'spotlight', 'crop'].includes(obj.annotatorType)) {
      obj.set({ width: obj.width * obj.scaleX, height: obj.height * obj.scaleY, scaleX: 1, scaleY: 1 });
    }
  });

  // --- 4. Tool Actions ---
  const centerLeft = window.innerWidth / 2;
  const centerTop = window.innerHeight / 2;

  document.getElementById('tool-clear').addEventListener('click', () => { canvas.clear(); badgeCount = 1; });

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

  const tooltipBtn = document.getElementById('tool-tooltip');
  const tooltipSubmenu = document.getElementById('tooltip-submenu');

  tooltipBtn.addEventListener('click', () => {
    tooltipSubmenu.style.display = tooltipSubmenu.style.display === 'none' ? 'flex' : 'none';
  });

  document.querySelectorAll('.tooltip-opt').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const arrowPos = e.target.getAttribute('data-pos');
      tooltipSubmenu.style.display = 'none'; 

      const s = window.annotatorAppState.tooltip;
      s.arrowPosition = arrowPos; 
      
      const tooltip = new AnnotatorText('Tooltip instruction...', {
        left: centerLeft - 100, top: centerTop, fontFamily: '-apple-system, sans-serif', fill: s.textColor,
        backgroundColor: hexToRgba(s.fill, s.fillOpacity), annotatorBorderColor: s.border, annotatorBorderWidth: s.borderWidth,
        annotatorBorderDash: s.style === 'dashed' ? [6,6] : null, fontSize: 15, customPadding: 12, rx: s.radius, showArrow: true, 
        arrowPosition: arrowPos, cornerColor: '#008060', transparentCorners: false, width: 200,
        annotatorType: 'tooltip', annotatorBaseColor: s.fill, annotatorOpacity: s.fillOpacity, annotatorBorder: s.border, annotatorBorderWidth: s.borderWidth, annotatorTextColor: s.textColor
      });
      canvas.add(tooltip); canvas.setActiveObject(tooltip);
    });
  });

  document.addEventListener('click', (e) => {
    if (!document.getElementById('tooltip-wrapper').contains(e.target)) { tooltipSubmenu.style.display = 'none'; }
  });

  document.getElementById('tool-arrow').addEventListener('click', () => {
    const s = window.annotatorAppState.arrow;
    const arrow = new AnnotatorArrow([centerLeft - 80, centerTop, centerLeft + 80, centerTop], {
      stroke: hexToRgba(s.fill, s.fillOpacity), annotatorType: 'arrow', annotatorBaseColor: s.fill, annotatorOpacity: s.fillOpacity
    });
    canvas.add(arrow); canvas.setActiveObject(arrow);
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
    'annotatorTextColor', 'annotatorBorderDash', 'customPadding', 'arrowSize', 'arrowPosition', 'showArrow', 'annotatorFill', 'rx', 'ry'
  ];

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
          if (json.globalFrame) {
            window.annotatorAppState.globalFrame = json.globalFrame;
            document.getElementById('prop-border-color').value = json.globalFrame.borderColor;
            document.getElementById('prop-border-width').value = json.globalFrame.borderWidth;
            document.getElementById('prop-radius').value = json.globalFrame.radius;
          }
          canvas.loadFromJSON(json, () => {
            canvas.renderAll();
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

  // --- AI TRANSLATOR ---
  document.getElementById('btn-translate').addEventListener('click', async () => {
    const obj = canvas.getActiveObject();
    if (!obj || !obj.text) return;
    
    const targetLang = document.getElementById('prop-translate-lang').value;
    const originalText = obj.text;
    const btn = document.getElementById('btn-translate');
    
    try {
      btn.innerText = '...';
      const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${targetLang}&dt=t&q=${encodeURIComponent(originalText)}`);
      const data = await res.json();
      const translatedText = data[0].map(item => item[0]).join('');
      
      obj.set('text', translatedText);
      canvas.renderAll();
      btn.innerText = 'Translate';
    } catch(e) {
      console.error(e);
      alert('Translation failed. Check your internet connection.');
      btn.innerText = 'Translate';
    }
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

  const updateSettingsUI = (obj) => {
    settingsMenu.style.display = 'flex';
    
    if (!obj) {
      settingsLabel.innerText = 'PAGE FRAME';
      fillContainer.style.display = 'none'; textColorContainer.style.display = 'none'; styleInput.style.display = 'none'; tooltipPosContainer.style.display = 'none'; translationContainer.style.display = 'none';
      borderContainer.style.display = 'flex'; radiusContainer.style.display = 'flex';
      
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
      borderContainer.style.display = 'none'; radiusContainer.style.display = 'none';
      return;
    }

    fillColor.value = obj.annotatorBaseColor || '#000000'; fillOp.value = obj.annotatorOpacity !== undefined ? obj.annotatorOpacity : 1;
    borderColor.value = obj.annotatorBorder || '#000000'; borderWidth.value = obj.annotatorBorderWidth || 0;
    
    fillContainer.style.display = 'flex'; borderContainer.style.display = 'flex'; styleInput.style.display = 'block'; radiusContainer.style.display = 'flex';

    if (['text', 'tooltip', 'badge'].includes(obj.annotatorType)) {
      textColorContainer.style.display = 'flex'; textColorInput.value = obj.annotatorTextColor || '#ffffff';
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

    if (obj.annotatorType === 'arrow') {
      borderContainer.style.display = 'none'; styleInput.style.display = 'none'; radiusContainer.style.display = 'none';
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

  const applySettingsToMemory = (obj) => {
    if (!obj) {
      window.annotatorAppState.globalFrame.borderColor = borderColor.value; window.annotatorAppState.globalFrame.borderWidth = parseInt(borderWidth.value) || 0; window.annotatorAppState.globalFrame.radius = parseInt(radiusInput.value) || 0;
      saveState(); return;
    }
    
    const type = obj.annotatorType;
    if (type === 'crop') return; 
    
    if(window.annotatorAppState[type]) {
      window.annotatorAppState[type].fill = obj.annotatorBaseColor; window.annotatorAppState[type].opacity = obj.annotatorOpacity; 
      if (['text', 'tooltip', 'badge'].includes(type)) window.annotatorAppState[type].textColor = obj.annotatorTextColor;
      if (type === 'tooltip') window.annotatorAppState[type].arrowPosition = obj.arrowPosition;
      if (type !== 'arrow') {
        window.annotatorAppState[type].border = obj.annotatorBorder; window.annotatorAppState[type].borderWidth = parseInt(borderWidth.value) || 0; window.annotatorAppState[type].style = styleInput.value;
      }
      if (type !== 'arrow' && type !== 'badge') window.annotatorAppState[type].radius = parseInt(radiusInput.value) || 0;
      saveState();
    }
  };

  const applyVisualChanges = () => {
    const obj = canvas.getActiveObject();
    if (!obj) { applySettingsToMemory(null); return; }
    if (obj.annotatorType === 'crop') return; 
    
    const fColor = fillColor.value; const fOp = parseFloat(fillOp.value); const bColor = borderColor.value; const bWidth = parseInt(borderWidth.value) || 0; const tColor = textColorInput.value;
    
    obj.annotatorBaseColor = fColor; obj.annotatorOpacity = fOp; obj.annotatorBorder = bColor; obj.annotatorBorderWidth = bWidth;
    const fillRgba = hexToRgba(fColor, fOp);

    if (['box', 'redact', 'spotlight'].includes(obj.annotatorType)) obj.set({ fill: fillRgba, stroke: bColor, strokeWidth: bWidth });
    else if (obj.annotatorType === 'text' || obj.annotatorType === 'tooltip') { obj.set({ backgroundColor: fillRgba, annotatorBorderColor: bColor, annotatorBorderWidth: bWidth, fill: tColor }); obj.annotatorTextColor = tColor; }
    else if (obj.annotatorType === 'arrow') obj.set('stroke', fillRgba);
    else if (obj.annotatorType === 'badge') { obj.set({ annotatorFill: fillRgba, annotatorBorderColor: bColor, annotatorBorderWidth: bWidth, fill: tColor }); obj.annotatorTextColor = tColor; }
    
    applySettingsToMemory(obj); canvas.renderAll();
  };

  textColorInput.addEventListener('input', applyVisualChanges); fillColor.addEventListener('input', applyVisualChanges); fillOp.addEventListener('input', applyVisualChanges); borderColor.addEventListener('input', applyVisualChanges); borderWidth.addEventListener('input', applyVisualChanges);
  
  tooltipPosInput.addEventListener('change', (e) => {
    const obj = canvas.getActiveObject(); 
    if (obj && obj.annotatorType === 'tooltip') {
      obj.set('arrowPosition', e.target.value);
      applySettingsToMemory(obj); 
      canvas.renderAll();
    }
  });

  styleInput.addEventListener('change', (e) => {
    const obj = canvas.getActiveObject(); if (!obj || obj.annotatorType === 'arrow' || obj.annotatorType === 'crop') return;
    const dash = e.target.value === 'dashed' ? [6, 6] : null;
    if (['box', 'redact', 'spotlight'].includes(obj.annotatorType)) obj.set('strokeDashArray', dash); else obj.set('annotatorBorderDash', dash); 
    applySettingsToMemory(obj); canvas.renderAll();
  });
  
  radiusInput.addEventListener('input', (e) => {
    const obj = canvas.getActiveObject(); if (!obj) { applyVisualChanges(); return; }
    if (obj.annotatorType === 'arrow' || obj.annotatorType === 'badge' || obj.annotatorType === 'crop') return;
    const val = parseInt(e.target.value, 10) || 0;
    if (['box', 'redact', 'spotlight'].includes(obj.annotatorType)) obj.set({ rx: val, ry: val }); else obj.set('rx', val);
    applySettingsToMemory(obj); canvas.renderAll();
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
              copyBtn.innerHTML = `<i class="ic ic-copy"></i> Copied!`;
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
  document.getElementById('tool-exit').addEventListener('click', () => {
    document.getElementById('annotator-canvas-container')?.remove(); document.getElementById('annotator-toolbar')?.remove(); document.body.style.overflow = ''; window.isProAnnotatorActive = false;
  });

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

  window.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' || e.key === 'Delete') {
      const activeObjects = canvas.getActiveObjects(); if (activeObjects.length && !activeObjects[0].isEditing) { canvas.discardActiveObject(); activeObjects.forEach(obj => canvas.remove(obj)); }
    }
  });
}

chrome.action.onClicked.addListener(async (tab) => {
  await chrome.scripting.executeScript({
    target: { tabId: tab.id }, 
    files: ["fabric.min.js"]
  });

  await chrome.scripting.executeScript({
    target: { tabId: tab.id }, 
    files: ["annotator.js"]
  });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "takeScreenshot") {
    chrome.tabs.captureVisibleTab(null, { format: "png" }, (dataUrl) => {
      sendResponse({ success: true, dataUrl: dataUrl });
    });
    return true; 
  }
  if (request.action === "downloadProcessedImage") {
    chrome.downloads.download({
      url: request.dataUrl,
      filename: "annotator-pro-screenshot.png",
      saveAs: true 
    });
    sendResponse({ success: true });
    return true;
  }
});