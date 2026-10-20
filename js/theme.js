/**
 * CarDex Automotive Theme Manager
 * Supports:
 * 1. 'amoled' — Absolute Carbon Black #000000 with tachometer redline accents
 * 2. 'light'  — Clean Modern Showroom bright palette
 * 3. 'custom' — 4-Color custom palette with legendary automotive presets
 */

class CarThemeManager {
  constructor() {
    this.currentTheme = 'amoled';
    this.customColors = {
      bgMain: '#000000',
      bgSurface: '#0A0A0A',
      accent: '#FFFFFF',
      textPrimary: '#FFFFFF'
    };

    this.presets = [
      {
        name: 'Absolute Carbon (AMOLED)',
        id: 'carbon_amoled',
        bgMain: '#000000',
        bgSurface: '#0A0A0A',
        accent: '#FFFFFF',
        textPrimary: '#FFFFFF'
      },
      {
        name: 'Rosso Corsa (Ferrari)',
        id: 'rosso_corsa',
        bgMain: '#0C0606',
        bgSurface: '#190C0C',
        accent: '#E60000',
        textPrimary: '#FFFFFF'
      },
      {
        name: 'Lava Orange (Porsche GT3)',
        id: 'porsche_orange',
        bgMain: '#0E0905',
        bgSurface: '#1C120A',
        accent: '#FF5E00',
        textPrimary: '#FFFFFF'
      },
      {
        name: 'World Rally Blue (Subaru STI)',
        id: 'rally_blue',
        bgMain: '#050A14',
        bgSurface: '#0C1629',
        accent: '#007BFF',
        textPrimary: '#F0F6FF'
      },
      {
        name: 'British Racing Green (Aston Martin)',
        id: 'racing_green',
        bgMain: '#040F0A',
        bgSurface: '#091E14',
        accent: '#05B368',
        textPrimary: '#EAF8F1'
      },
      {
        name: 'Giallo Modena (Lamborghini Yellow)',
        id: 'modena_yellow',
        bgMain: '#0C0B04',
        bgSurface: '#1A1808',
        accent: '#FFD000',
        textPrimary: '#FFFFFF'
      },
      {
        name: 'Midnight Purple (Skyline R34)',
        id: 'midnight_purple',
        bgMain: '#0B0512',
        bgSurface: '#180B26',
        accent: '#A855F7',
        textPrimary: '#FAF5FF'
      }
    ];
  }

  async init() {
    const savedTheme = localStorage.getItem('cardex_theme') || 'amoled';
    const savedCustom = localStorage.getItem('cardex_custom_colors');
    if (savedCustom) {
      try {
        this.customColors = Object.assign(this.customColors, JSON.parse(savedCustom));
      } catch (e) {
        console.warn('Failed to parse custom colors:', e);
      }
    }

    this.applyTheme(savedTheme);
  }

  setTheme(themeName) {
    this.currentTheme = themeName;
    localStorage.setItem('cardex_theme', themeName);
    this.applyTheme(themeName);
  }

  applyTheme(themeName) {
    const root = document.documentElement;
    document.body.classList.remove('theme-amoled', 'theme-light', 'theme-custom');
    document.body.classList.add(`theme-${themeName}`);

    // Update active tab buttons
    document.querySelectorAll('.theme-tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.theme === themeName);
    });

    const customPanel = document.getElementById('customThemeEditorPanel');
    if (customPanel) {
      customPanel.style.display = themeName === 'custom' ? 'block' : 'none';
    }

    let statusBarHex = '#000000';
    let navBarHex = '#000000';
    let isDark = true;

    if (themeName === 'amoled') {
      root.style.removeProperty('--bg-main');
      root.style.removeProperty('--bg-surface');
      root.style.removeProperty('--bg-elevated');
      root.style.removeProperty('--bg-subtle');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--text-primary');
      root.style.removeProperty('--text-secondary');
      root.style.removeProperty('--border-subtle');
      statusBarHex = '#000000';
      navBarHex = '#000000';
      isDark = true;
    } else if (themeName === 'light') {
      root.style.removeProperty('--bg-main');
      root.style.removeProperty('--bg-surface');
      root.style.removeProperty('--bg-elevated');
      root.style.removeProperty('--bg-subtle');
      root.style.removeProperty('--accent');
      root.style.removeProperty('--text-primary');
      root.style.removeProperty('--text-secondary');
      root.style.removeProperty('--border-subtle');
      statusBarHex = '#F4F5F8';
      navBarHex = '#FFFFFF';
      isDark = false;
    } else if (themeName === 'custom') {
      this.applyCustomColors(this.customColors);
      statusBarHex = this.customColors.bgMain;
      navBarHex = this.customColors.bgSurface;
      isDark = this.isColorDark(this.customColors.bgMain);
    }

    // Update theme meta color
    const metaTheme = document.getElementById('themeColorMeta');
    if (metaTheme) metaTheme.setAttribute('content', statusBarHex);

    // Sync native Android system bars if in APK wrapper
    if (window.AndroidBridge && window.AndroidBridge.setSystemBarColors) {
      try {
        window.AndroidBridge.setSystemBarColors(statusBarHex, navBarHex, isDark);
      } catch (e) {
        console.warn('AndroidBridge error:', e);
      }
    }
  }

  applyCustomColors(colors) {
    const root = document.documentElement;
    this.customColors = Object.assign(this.customColors, colors);
    localStorage.setItem('cardex_custom_colors', JSON.stringify(this.customColors));

    root.style.setProperty('--bg-main', this.customColors.bgMain);
    root.style.setProperty('--bg-surface', this.customColors.bgSurface);
    root.style.setProperty('--accent', this.customColors.accent);
    root.style.setProperty('--text-primary', this.customColors.textPrimary);

    const isDark = this.isColorDark(this.customColors.bgMain);
    if (isDark) {
      root.style.setProperty('--bg-elevated', this.lightenDarkenColor(this.customColors.bgSurface, 14));
      root.style.setProperty('--bg-subtle', this.lightenDarkenColor(this.customColors.bgSurface, 8));
      root.style.setProperty('--text-secondary', 'rgba(255, 255, 255, 0.65)');
      root.style.setProperty('--border-subtle', 'rgba(255, 255, 255, 0.12)');
      root.style.setProperty('--text-inverse', '#000000');
    } else {
      root.style.setProperty('--bg-elevated', this.lightenDarkenColor(this.customColors.bgSurface, -10));
      root.style.setProperty('--bg-subtle', this.lightenDarkenColor(this.customColors.bgSurface, -8));
      root.style.setProperty('--text-secondary', 'rgba(0, 0, 0, 0.62)');
      root.style.setProperty('--border-subtle', 'rgba(0, 0, 0, 0.10)');
      root.style.setProperty('--text-inverse', '#FFFFFF');
    }

    this.syncPickers();
  }

  setCustomColor(key, value) {
    this.customColors[key] = value;
    this.applyCustomColors(this.customColors);
  }

  applyPreset(presetId) {
    const preset = this.presets.find(p => p.id === presetId);
    if (!preset) return;
    this.applyCustomColors({
      bgMain: preset.bgMain,
      bgSurface: preset.bgSurface,
      accent: preset.accent,
      textPrimary: preset.textPrimary
    });
  }

  syncPickers() {
    const pBgMain = document.getElementById('pickerBgMain');
    const pBgSurface = document.getElementById('pickerBgSurface');
    const pAccent = document.getElementById('pickerAccent');
    const pText = document.getElementById('pickerText');

    if (pBgMain) pBgMain.value = this.customColors.bgMain;
    if (pBgSurface) pBgSurface.value = this.customColors.bgSurface;
    if (pAccent) pAccent.value = this.customColors.accent;
    if (pText) pText.value = this.customColors.textPrimary;
  }

  isColorDark(hex) {
    const c = hex.replace('#', '');
    const r = parseInt(c.substr(0, 2), 16) || 0;
    const g = parseInt(c.substr(2, 2), 16) || 0;
    const b = parseInt(c.substr(4, 2), 16) || 0;
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance < 0.5;
  }

  lightenDarkenColor(col, amt) {
    let usePound = false;
    if (col[0] === '#') {
      col = col.slice(1);
      usePound = true;
    }
    const num = parseInt(col, 16);
    let r = (num >> 16) + amt;
    if (r > 255) r = 255; else if (r < 0) r = 0;
    let b = ((num >> 8) & 0x00FF) + amt;
    if (b > 255) b = 255; else if (b < 0) b = 0;
    let g = (num & 0x0000FF) + amt;
    if (g > 255) g = 255; else if (g < 0) g = 0;
    return (usePound ? '#' : '') + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
  }
}

window.themeManager = new CarThemeManager();
