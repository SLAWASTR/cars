/**
 * CarDex Main Application Controller
 * Manages car spots collection, photo pipelines, telemetry, GT card generation & sharing
 */

class CarDexApp {
  constructor() {
    this.cars = [];
    this.currentTab = 'garage'; // 'garage' | 'map' | 'themes' | 'profile'
    this.currentViewLayout = 'grid'; // 'grid' | 'cards'
    this.searchQuery = '';
    this.filterCategory = 'all';
    this.filterBrand = 'all';
    this.sortBy = 'newest';

    this.profile = null;
    this.spotterName = window.carDb ? window.carDb.getDefaultNickname() : 'Ragazzo_15';

    this.tempMainPhoto = null;
    this.tempMainPhotoThumb = null;
    this.tempExtraPhotos = [];
    this.currentCarDetailId = null;
    this.currentViewerImage = null;
    this.currentViewerGarageId = null;

    // Brand icons & badges
    this.brandLogos = {
      'Porsche': '🛡️',
      'Ferrari': '🐎',
      'Lamborghini': '🐂',
      'BMW': '🔵',
      'Mercedes-Benz': '⭐',
      'Audi': '⚪',
      'Nissan': '🔴',
      'Toyota': '🔰',
      'Subaru': '🌌',
      'Mazda': '🕊️',
      'Dodge': '⚡',
      'Ford': '🐎',
      'Chevrolet': '✨',
      'Aston Martin': '🦅',
      'McLaren': '🧡',
      'Rolls-Royce': '👑',
      'Bentley': '🪽',
      'Lada': '⛵',
      'ВАЗ': '⛵',
      'ГАЗ': '🦌',
      'Москвич': '🏰'
    };

    this.categories = {
      supercar: { label: 'Суперкар', icon: '🏎️', class: 'cat-supercar' },
      jdm: { label: 'JDM Легенда', icon: '🔰', class: 'cat-jdm' },
      muscle: { label: 'Muscle Car', icon: '🦅', class: 'cat-muscle' },
      retro: { label: 'Ретро / Олдтаймер', icon: '🏛️', class: 'cat-retro' },
      tuning: { label: 'Тюнинг / Корч', icon: '🛠️', class: 'cat-tuning' },
      luxury: { label: 'Люкс / Премиум', icon: '💼', class: 'cat-luxury' },
      sport: { label: 'Спорткупе', icon: '⚡', class: 'cat-sport' },
      offroad: { label: 'Внедорожник 4x4', icon: '🚙', class: 'cat-offroad' },
      rare_daily: { label: 'Необычный спот', icon: '🚗', class: 'cat-rare' }
    };
  }

  async init() {
    // 1. Initialize Theme Manager
    if (window.themeManager) {
      await window.themeManager.init();
    }

    // 2. Initialize Database
    await window.carDb.init();

    // 3. Load Profile
    this.profile = await window.carDb.getSpotterProfile();
    this.spotterName = this.profile.nickname || window.carDb.getDefaultNickname();

    // 4. Load Cars
    await this.loadCars();

    // 5. Setup Listeners
    this.setupEventListeners();
    this.renderProfile();
    this.updateStats();

    console.log(`🏎️ CarDex initialized for spotter: ${this.spotterName}`);
  }

  setupEventListeners() {
    // Bottom Nav Tabs
    document.querySelectorAll('.bottom-nav .nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });

    // FAB Add Car Spot
    const fab = document.getElementById('fabAddCar');
    if (fab) {
      fab.addEventListener('click', () => this.openAddModal());
    }

    // Search Input
    const searchInput = document.getElementById('carSearchInput');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value.toLowerCase().trim();
        this.renderGallery();
      });
    }

    // Category Filter Chips
    document.querySelectorAll('#categoryFilterChips .filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#categoryFilterChips .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.filterCategory = chip.dataset.category;
        this.renderGallery();
      });
    });

    // Layout Toggle
    const layoutBtn = document.getElementById('layoutToggleBtn');
    if (layoutBtn) {
      layoutBtn.addEventListener('click', () => {
        this.currentViewLayout = this.currentViewLayout === 'grid' ? 'cards' : 'grid';
        this.renderGallery();
      });
    }

    // Sort & Brand Selects
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.renderGallery();
      });
    }

    const filterBrandSelect = document.getElementById('filterBrandSelect');
    if (filterBrandSelect) {
      filterBrandSelect.addEventListener('change', (e) => {
        this.filterBrand = e.target.value;
        this.renderGallery();
      });
    }

    // Main Photo Upload Trigger
    const photoBox = document.getElementById('mainPhotoUploadBox');
    const photoInput = document.getElementById('mainPhotoInput');
    if (photoBox && photoInput) {
      photoBox.addEventListener('click', () => photoInput.click());
      photoInput.addEventListener('change', (e) => this.handleMainPhotoSelect(e));
    }

    // Extra Photos Upload Trigger
    const extraPhotosInput = document.getElementById('extraPhotosInput');
    if (extraPhotosInput) {
      extraPhotosInput.addEventListener('change', (e) => this.handleExtraPhotosSelect(e));
    }

    // Car Spot Form Submit
    const addCarForm = document.getElementById('addCarForm');
    if (addCarForm) {
      addCarForm.addEventListener('submit', (e) => this.handleSaveCar(e));
    }

    // Profile & Garage File Inputs
    const avatarInput = document.getElementById('profileAvatarFileInput');
    if (avatarInput) {
      avatarInput.addEventListener('change', (e) => this.handleAvatarFileInput(e));
    }

    const garageArtInput = document.getElementById('personalGarageFileInput');
    if (garageArtInput) {
      garageArtInput.addEventListener('change', (e) => this.handlePersonalGarageFileInput(e));
    }

    // Color Pickers in Theme Screen
    ['pickerBgMain', 'pickerBgSurface', 'pickerAccent', 'pickerText'].forEach(id => {
      const picker = document.getElementById(id);
      if (picker) {
        picker.addEventListener('input', (e) => {
          const keyMap = {
            pickerBgMain: 'bgMain',
            pickerBgSurface: 'bgSurface',
            pickerAccent: 'accent',
            pickerText: 'textPrimary'
          };
          window.themeManager.setCustomColor(keyMap[id], e.target.value);
        });
      }
    });
  }

  // =========================================================================
  // Navigation & Tabs
  // =========================================================================

  switchTab(tab) {
    this.currentTab = tab;

    document.querySelectorAll('.bottom-nav .nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.tab === tab);
    });

    document.querySelectorAll('.tab-screen').forEach(screen => {
      screen.classList.remove('active');
    });

    const target = document.getElementById(tab + 'Screen');
    if (target) target.classList.add('active');

    if (tab === 'map') {
      if (!window.mapManager.isInitialized) {
        window.mapManager.initMap();
      } else {
        window.mapManager.updateMarkers();
        setTimeout(() => {
          if (window.mapManager.map) window.mapManager.map.invalidateSize();
        }, 200);
      }
    }
    if (tab === 'profile') {
      this.updateStats();
      this.renderProfile();
    }
    if (tab === 'themes' && window.themeManager) {
      window.themeManager.syncPickers();
    }
  }

  // =========================================================================
  // Cars Loading & Filtering
  // =========================================================================

  async loadCars() {
    this.cars = await window.carDb.getAllCars();
    this.populateBrandFilter();
    this.renderGallery();
    this.updateStats();
    if (window.mapManager && window.mapManager.isInitialized) {
      window.mapManager.updateMarkers();
    }
  }

  populateBrandFilter() {
    const select = document.getElementById('filterBrandSelect');
    if (!select) return;

    const currentVal = select.value;
    const brands = Array.from(new Set(this.cars.map(c => c.brand).filter(Boolean))).sort();

    select.innerHTML = '<option value="all">Все марки</option>';
    brands.forEach(b => {
      const opt = document.createElement('option');
      opt.value = b;
      opt.textContent = `${this.getBrandIcon(b)} ${b}`;
      select.appendChild(opt);
    });

    if (brands.includes(currentVal)) {
      select.value = currentVal;
    }
  }

  getFilteredCars() {
    return this.cars.filter(car => {
      // 1. Search Query
      if (this.searchQuery) {
        const haystack = [
          car.brand,
          car.model,
          car.generation,
          car.plate,
          car.location,
          car.notes,
          car.color
        ].filter(Boolean).join(' ').toLowerCase();

        if (!haystack.includes(this.searchQuery)) return false;
      }

      // 2. Category Filter
      if (this.filterCategory !== 'all' && car.category !== this.filterCategory) {
        return false;
      }

      // 3. Brand Filter
      if (this.filterBrand !== 'all' && car.brand !== this.filterBrand) {
        return false;
      }

      return true;
    }).sort((a, b) => {
      if (this.sortBy === 'newest') {
        return new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt);
      }
      if (this.sortBy === 'power') {
        return (parseFloat(b.power) || 0) - (parseFloat(a.power) || 0);
      }
      if (this.sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      }
      if (this.sortBy === 'brand') {
        return (a.brand || '').localeCompare(b.brand || '');
      }
      return 0;
    });
  }

  renderGallery() {
    const container = document.getElementById('carsGalleryGrid');
    const countEl = document.getElementById('carsCountSub');
    if (!container) return;

    const filtered = this.getFilteredCars();
    if (countEl) countEl.textContent = `Найдено спотов: ${filtered.length}`;

    container.className = `cars-gallery-container layout-${this.currentViewLayout}`;

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="gallery-empty-state">
          <div class="empty-icon">🏎️</div>
          <div class="empty-title">Споты не найдены</div>
          <div class="empty-sub">Попробуйте изменить фильтры или добавьте первую встреченную тачку!</div>
          <button class="btn-primary-compact" style="margin-top:12px;" onclick="window.app.openAddModal()">
            <span>➕</span> Заспоттить авто
          </button>
        </div>
      `;
      return;
    }

    container.innerHTML = filtered.map(car => this.renderCarCardHtml(car)).join('');
  }

  renderCarCardHtml(car) {
    const brandLogo = this.getBrandIcon(car.brand);
    const catBadge = this.getCategoryBadge(car.category);
    const photoSrc = car.photoThumb || car.photo || 'icons/app-icon.svg';
    const photosCount = (car.photos && car.photos.length > 0) ? `📸 +${car.photos.length}` : '';
    const ratingStars = '★'.repeat(car.rating || 4);

    return `
      <div class="car-card" onclick="window.app.openDetailModal('${car.id}')">
        <div class="car-card-photo-wrap">
          <img src="${photoSrc}" class="car-card-img" loading="lazy" alt="${this.escapeHtml(car.brand)} ${this.escapeHtml(car.model)}" />
          <div class="car-card-top-badges">
            <span class="badge-cat ${catBadge.class}">${catBadge.icon} ${catBadge.label}</span>
            ${photosCount ? `<span class="badge-photos-count">${photosCount}</span>` : ''}
          </div>
          <div class="car-card-bottom-plate">
            <span class="car-card-brand-logo">${brandLogo}</span>
            <span class="car-card-stars">${ratingStars}</span>
          </div>
        </div>

        <div class="car-card-body">
          <div class="car-card-header-row">
            <h3 class="car-card-title">${this.escapeHtml(car.brand)} ${this.escapeHtml(car.model)}</h3>
            ${car.generation ? `<span class="car-card-gen-pill">${this.escapeHtml(car.generation)}</span>` : ''}
          </div>

          <div class="car-card-specs-row">
            ${car.power ? `<span class="spec-pill">⚡ ${car.power} л.с.</span>` : ''}
            ${car.drivetrain ? `<span class="spec-pill">⚙️ ${car.drivetrain}</span>` : ''}
            ${car.year ? `<span class="spec-pill">📅 ${car.year}</span>` : ''}
          </div>

          ${car.location ? `<div class="car-card-location">📍 ${this.escapeHtml(car.location)}</div>` : ''}
          ${car.plate ? `<div class="car-card-plate">🇷🇺 ${this.escapeHtml(car.plate)}</div>` : ''}
        </div>
      </div>
    `;
  }

  // =========================================================================
  // Detail Modal & Car Card Generator
  // =========================================================================

  async openDetailModal(carId) {
    const car = await window.carDb.getCar(carId);
    if (!car) return;

    this.currentCarDetailId = carId;

    const modal = document.getElementById('carDetailModal');
    const heroImg = document.getElementById('detailHeroImg');
    const titleEl = document.getElementById('detailTitle');
    const genEl = document.getElementById('detailGeneration');
    const catBadge = document.getElementById('detailCategoryBadge');
    const ratingEl = document.getElementById('detailRatingStars');
    const locationEl = document.getElementById('detailLocation');
    const dateEl = document.getElementById('detailDate');
    const plateEl = document.getElementById('detailPlate');
    const powerEl = document.getElementById('detailPower');
    const driveEl = document.getElementById('detailDrivetrain');
    const transEl = document.getElementById('detailTransmission');
    const soundEl = document.getElementById('detailSound');
    const notesEl = document.getElementById('detailNotes');

    const photoSrc = car.photo || car.photoThumb || 'icons/app-icon.svg';
    if (heroImg) {
      heroImg.src = photoSrc;
      heroImg.onclick = () => this.viewFullArt(photoSrc);
    }

    if (titleEl) titleEl.textContent = `${car.brand} ${car.model}`;
    if (genEl) genEl.textContent = car.generation ? `Кузов / Поколение: ${car.generation}` : '';

    const catInfo = this.getCategoryBadge(car.category);
    if (catBadge) {
      catBadge.textContent = `${catInfo.icon} ${catInfo.label}`;
      catBadge.className = `detail-badge ${catInfo.class}`;
    }

    if (ratingEl) ratingEl.textContent = '★'.repeat(car.rating || 5);
    if (locationEl) locationEl.textContent = car.location || 'Место не указано';
    if (dateEl) {
      const d = car.date ? new Date(car.date) : new Date(car.createdAt);
      dateEl.textContent = d.toLocaleString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    }

    if (plateEl) {
      plateEl.parentElement.style.display = car.plate ? 'flex' : 'none';
      plateEl.textContent = car.plate;
    }

    if (powerEl) powerEl.textContent = car.power ? `${car.power} л.с.` : '—';
    if (driveEl) driveEl.textContent = car.drivetrain || '—';
    if (transEl) transEl.textContent = car.transmission || '—';
    if (soundEl) {
      soundEl.parentElement.style.display = car.sound ? 'flex' : 'none';
      soundEl.textContent = car.sound;
    }
    if (notesEl) {
      notesEl.parentElement.style.display = car.notes ? 'block' : 'none';
      notesEl.textContent = car.notes;
    }

    // Render Extra Photos
    this.renderDetailPhotosGallery(car);

    // Map button
    const mapBtn = document.getElementById('detailMapBtn');
    if (mapBtn) {
      if (car.lat && car.lng) {
        mapBtn.style.display = 'inline-flex';
        mapBtn.onclick = () => {
          this.closeDetailModal();
          this.switchTab('map');
          window.mapManager.focusCar(car.lat, car.lng);
        };
      } else {
        mapBtn.style.display = 'none';
      }
    }

    if (modal) modal.classList.add('open');
  }

  closeDetailModal() {
    const modal = document.getElementById('carDetailModal');
    if (modal) modal.classList.remove('open');
    this.currentCarDetailId = null;
  }

  renderDetailPhotosGallery(car) {
    const container = document.getElementById('detailExtraPhotosRow');
    if (!container) return;

    container.innerHTML = '';
    const photos = car.photos || [];

    photos.forEach(p => {
      const wrap = document.createElement('div');
      wrap.className = 'extra-photo-pill-wrap';
      wrap.innerHTML = `
        <img src="${p.thumb || p.data}" class="extra-photo-thumb" loading="lazy" alt="Ракурс" />
        <button class="btn-delete-photo" title="Удалить фото" onclick="event.stopPropagation(); window.app.deletePhoto('${car.id}', '${p.id}')">✕</button>
      `;
      wrap.onclick = () => this.viewFullArt(p.data);
      container.appendChild(wrap);
    });
  }

  async addExtraPhotoToCurrentCar() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.multiple = true;
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (!files.length || !this.currentCarDetailId) return;

      for (const file of files) {
        const { full, thumb } = await this.processImage(file);
        await window.carDb.addPhotoToCar(this.currentCarDetailId, { data: full, thumb });
      }

      const updated = await window.carDb.getCar(this.currentCarDetailId);
      this.renderDetailPhotosGallery(updated);
      await this.loadCars();
      this.showToast('Фото добавлены к споту!');
    };
    input.click();
  }

  async deletePhoto(carId, photoId) {
    if (!confirm('Удалить эту фотографию?')) return;
    const updated = await window.carDb.removePhotoFromCar(carId, photoId);
    this.renderDetailPhotosGallery(updated);
    await this.loadCars();
    this.showToast('Фото удалено');
  }

  // =========================================================================
  // Gran Turismo / NFS Car Spot Trading Card Generator (Canvas 1200x800)
  // =========================================================================

  async generateCarTradingCard(carId = null) {
    const targetId = carId || this.currentCarDetailId;
    const car = await window.carDb.getCar(targetId);
    if (!car) return;

    this.showToast('Генерация коллекционной карточки GT...');

    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // 1. Carbon Dark Gradient Background
    const bgGrad = ctx.createLinearGradient(0, 0, 1200, 800);
    bgGrad.addColorStop(0, '#0A0A0A');
    bgGrad.addColorStop(0.5, '#121212');
    bgGrad.addColorStop(1, '#050505');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1200, 800);

    // Subtle Carbon Mesh pattern
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x < 1200; x += 16) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, 800);
      ctx.stroke();
    }
    for (let y = 0; y < 800; y += 16) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(1200, y);
      ctx.stroke();
    }

    // Outer Neon Border
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 4;
    ctx.strokeRect(30, 30, 1140, 740);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(38, 38, 1124, 724);

    // 2. Load Car Photo
    const photoImg = new Image();
    photoImg.crossOrigin = 'anonymous';
    photoImg.src = car.photo || car.photoThumb || 'icons/app-icon.svg';

    await new Promise((resolve) => {
      photoImg.onload = resolve;
      photoImg.onerror = resolve;
    });

    // Draw Photo in Left Box (700x680)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(50, 50, 680, 680, 20);
    ctx.clip();
    
    // Cover image logic
    const imgAspect = photoImg.width / photoImg.height;
    const boxAspect = 680 / 680;
    let sW, sH, sX, sY;
    if (imgAspect > boxAspect) {
      sH = photoImg.height;
      sW = sH * boxAspect;
      sX = (photoImg.width - sW) / 2;
      sY = 0;
    } else {
      sW = photoImg.width;
      sH = sW / boxAspect;
      sX = 0;
      sY = (photoImg.height - sH) / 2;
    }
    ctx.drawImage(photoImg, sX, sY, sW, sH, 50, 50, 680, 680);

    // Dark bottom vignette on photo
    const vigGrad = ctx.createLinearGradient(50, 500, 50, 730);
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(50, 500, 680, 230);

    ctx.restore();

    // Photo Border
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.roundRect(50, 50, 680, 680, 20);
    ctx.stroke();

    // 3. Right Info Panel (x: 760 to 1140)
    // Brand & Logo
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 24px -apple-system, sans-serif';
    ctx.fillText(`${this.getBrandIcon(car.brand)} CARDEX SPOTTED`, 770, 95);

    // Car Brand & Model
    ctx.font = '900 44px -apple-system, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(car.brand.toUpperCase(), 770, 160);

    ctx.font = '800 36px -apple-system, sans-serif';
    ctx.fillStyle = '#E0E0E0';
    ctx.fillText(car.model, 770, 205);

    if (car.generation) {
      ctx.font = '600 20px -apple-system, sans-serif';
      ctx.fillStyle = '#9E9E9E';
      ctx.fillText(`Кузов: ${car.generation} ${car.year ? '• ' + car.year : ''}`, 770, 240);
    }

    // Category Badge Box
    const cat = this.getCategoryBadge(car.category);
    ctx.fillStyle = '#1E1E1E';
    ctx.beginPath();
    ctx.roundRect(770, 260, 360, 44, 22);
    ctx.fill();
    ctx.strokeStyle = '#444444';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 18px -apple-system, sans-serif';
    ctx.fillText(`${cat.icon} ${cat.label.toUpperCase()}`, 790, 288);

    // Specs Grid
    const drawSpecBar = (label, value, y) => {
      ctx.fillStyle = '#777777';
      ctx.font = '600 16px -apple-system, sans-serif';
      ctx.fillText(label, 770, y);

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '800 20px -apple-system, sans-serif';
      ctx.fillText(value || '—', 770, y + 26);

      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(770, y + 36);
      ctx.lineTo(1130, y + 36);
      ctx.stroke();
    };

    drawSpecBar('МОЩНОСТЬ ДВИГАТЕЛЯ', car.power ? `${car.power} HP (л.с.)` : 'Классика', 345);
    drawSpecBar('ПРИВОД / КПП', `${car.drivetrain || 'RWD'} • ${car.transmission || 'МКПП'}`, 415);
    drawSpecBar('ЛОКАЦИЯ СПОТА', car.location || 'Городские улицы', 485);
    drawSpecBar('ДАТА ВСТРЕЧИ', new Date(car.date || car.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }), 555);

    // Verified Stamp Box at bottom
    ctx.save();
    ctx.translate(950, 675);
    ctx.rotate(-0.06);
    ctx.strokeStyle = '#FF3B30';
    ctx.lineWidth = 3;
    ctx.strokeRect(-160, -35, 320, 70);

    ctx.fillStyle = '#FF3B30';
    ctx.font = '900 24px -apple-system, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('VERIFIED SPOT', 0, -5);

    const spotter = this.profile.nickname || this.spotterName;
    ctx.font = '700 14px -apple-system, sans-serif';
    ctx.fillText(`BY ${spotter.toUpperCase()}`, 0, 20);
    ctx.restore();

    // Export Canvas to DataURL & Save
    const dataUrl = canvas.toDataURL('image/png');
    const filename = `cardex_${car.brand}_${car.model}_${Date.now()}.png`.replace(/\s+/g, '_');

    if (window.AndroidBridge && window.AndroidBridge.saveBase64Image) {
      window.AndroidBridge.saveBase64Image(dataUrl, filename);
    } else {
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = filename;
      a.click();
      this.showToast('Карточка спота сохранена!');
    }
  }

  // Share to Telegram
  shareCarToTelegram(carId = null) {
    const targetId = carId || this.currentCarDetailId;
    const car = this.cars.find(c => c.id === targetId);
    if (!car) return;

    const brandIcon = this.getBrandIcon(car.brand);
    const cat = this.getCategoryBadge(car.category);
    const spotter = this.profile.nickname || this.spotterName;

    const text = `🏎️ Автоспоттинг в CarDex!\n\n` +
      `${brandIcon} ${car.brand} ${car.model} ${car.generation ? '(' + car.generation + ')' : ''}\n` +
      `📌 Категория: ${cat.icon} ${cat.label}\n` +
      (car.power ? `⚡ Мощность: ${car.power} л.с.\n` : '') +
      (car.plate ? `🔢 Номер: ${car.plate}\n` : '') +
      (car.location ? `📍 Место: ${car.location}\n` : '') +
      (car.notes ? `💬 Заметки: ${car.notes}\n` : '') +
      `\n👤 Заспоттил: ${spotter}\n#CarDex #Spotting #${car.brand.replace(/\s+/g, '')}`;

    const webUrl = window.location.href.split('#')[0];

    if (window.AndroidBridge && window.AndroidBridge.shareToTelegram) {
      window.AndroidBridge.shareToTelegram(text, webUrl);
    } else {
      const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(webUrl)}&text=${encodeURIComponent(text)}`;
      window.open(shareUrl, '_blank');
    }
  }

  // Delete current car
  async deleteCurrentCar() {
    if (!this.currentCarDetailId) return;
    if (!confirm('Вы уверены, что хотите удалить этот автомобиль из коллекции?')) return;

    await window.carDb.deleteCar(this.currentCarDetailId);
    this.closeDetailModal();
    await this.loadCars();
    this.showToast('Автомобиль удален из коллекции');
  }

  // =========================================================================
  // Add / Edit Modal Flow
  // =========================================================================

  openAddModal() {
    this.tempMainPhoto = null;
    this.tempMainPhotoThumb = null;
    this.tempExtraPhotos = [];

    const form = document.getElementById('addCarForm');
    if (form) form.reset();

    // Default current datetime
    const now = new Date();
    const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    const dateInput = document.getElementById('carDateInput');
    if (dateInput) dateInput.value = localIso;

    // Reset preview
    const previewImg = document.getElementById('mainPhotoPreviewImg');
    const placeholder = document.getElementById('mainPhotoPlaceholder');
    if (previewImg) previewImg.style.display = 'none';
    if (placeholder) placeholder.style.display = 'flex';

    const extraRow = document.getElementById('extraPhotosPreviewRow');
    if (extraRow) extraRow.innerHTML = '';

    const modal = document.getElementById('addCarModal');
    if (modal) modal.classList.add('open');
  }

  closeAddModal() {
    const modal = document.getElementById('addCarModal');
    if (modal) modal.classList.remove('open');
  }

  async handleMainPhotoSelect(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    // 1. Process image for display (Full + Thumb)
    const { full, thumb } = await this.processImage(file);
    this.tempMainPhoto = full;
    this.tempMainPhotoThumb = thumb;

    const previewImg = document.getElementById('mainPhotoPreviewImg');
    const placeholder = document.getElementById('mainPhotoPlaceholder');
    if (previewImg && placeholder) {
      previewImg.src = full;
      previewImg.style.display = 'block';
      placeholder.style.display = 'none';
    }

    // 2. Automatically parse EXIF for date & GPS
    if (window.mapManager) {
      const exif = await window.mapManager.extractExifFromImage(file);
      if (exif.date) {
        const dateInp = document.getElementById('carDateInput');
        if (dateInp) dateInp.value = exif.date;
      }
      if (exif.lat && exif.lng) {
        const latInp = document.getElementById('carLatInput');
        const lngInp = document.getElementById('carLngInput');
        const locInp = document.getElementById('carLocationInput');
        if (latInp) latInp.value = exif.lat.toFixed(6);
        if (lngInp) lngInp.value = exif.lng.toFixed(6);

        // Auto reverse geocode address
        const address = await window.mapManager.reverseGeocode(exif.lat, exif.lng);
        if (locInp) locInp.value = address;
        this.showToast('📍 Дата и GPS координаты считаны из фото!');
      }
    }
  }

  async handleExtraPhotosSelect(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const previewRow = document.getElementById('extraPhotosPreviewRow');
    for (const file of files) {
      const { full, thumb } = await this.processImage(file);
      this.tempExtraPhotos.push({ data: full, thumb });

      const thumbEl = document.createElement('div');
      thumbEl.className = 'extra-photo-thumb-pill';
      thumbEl.innerHTML = `<img src="${thumb}" alt="Ракурс" />`;
      previewRow.appendChild(thumbEl);
    }
  }

  // Auto GPS Location button in Add Modal
  async autoDetectLocationInForm() {
    const btn = document.getElementById('btnDetectGps');
    if (btn) btn.textContent = '⏳ Поиск GPS...';

    try {
      const pos = await window.mapManager.detectCurrentPosition();
      const latInp = document.getElementById('carLatInput');
      const lngInp = document.getElementById('carLngInput');
      const locInp = document.getElementById('carLocationInput');

      if (latInp) latInp.value = pos.lat.toFixed(6);
      if (lngInp) lngInp.value = pos.lng.toFixed(6);
      if (locInp) locInp.value = pos.address;

      this.showToast('Геолокация определена!');
    } catch (err) {
      alert('Не удалось определить координаты: ' + err.message);
    } finally {
      if (btn) btn.textContent = '📍 Мое место';
    }
  }

  async handleSaveCar(e) {
    e.preventDefault();

    const brand = document.getElementById('carBrandInput').value.trim();
    const model = document.getElementById('carModelInput').value.trim();
    if (!brand || !model) {
      alert('Пожалуйста, укажите марку и модель авто');
      return;
    }

    const generation = document.getElementById('carGenerationInput').value.trim();
    const category = document.getElementById('carCategorySelect').value;
    const year = document.getElementById('carYearInput').value;
    const color = document.getElementById('carColorInput').value.trim();
    const plate = document.getElementById('carPlateInput').value.trim();
    const power = document.getElementById('carPowerInput').value;
    const drivetrain = document.getElementById('carDrivetrainSelect').value;
    const transmission = document.getElementById('carTransmissionSelect').value;
    const location = document.getElementById('carLocationInput').value.trim();
    const lat = parseFloat(document.getElementById('carLatInput').value) || null;
    const lng = parseFloat(document.getElementById('carLngInput').value) || null;
    const date = document.getElementById('carDateInput').value;
    const rating = parseInt(document.getElementById('carRatingSelect').value, 10) || 5;
    const sound = document.getElementById('carSoundInput').value.trim();
    const notes = document.getElementById('carNotesInput').value.trim();

    const carData = {
      brand,
      model,
      generation,
      category,
      year: year ? parseInt(year, 10) : null,
      color,
      plate,
      power: power ? parseInt(power, 10) : null,
      drivetrain,
      transmission,
      location,
      lat,
      lng,
      date,
      rating,
      sound,
      notes,
      photo: this.tempMainPhoto || '',
      photoThumb: this.tempMainPhotoThumb || '',
      photos: this.tempExtraPhotos
    };

    await window.carDb.saveCar(carData);
    this.closeAddModal();
    await this.loadCars();
    this.showToast(`Авто ${brand} ${model} добавлено в коллекцию!`);
  }

  // =========================================================================
  // Telemetry & Stats Calculator
  // =========================================================================

  updateStats() {
    // Total spots
    const totalEl = document.getElementById('statTotalCars');
    if (totalEl) totalEl.textContent = this.cars.length;

    // Total Garage Horsepower
    let totalHp = 0;
    this.cars.forEach(c => {
      const hp = parseFloat(c.power);
      if (!isNaN(hp) && hp > 0) totalHp += hp;
    });
    const hpEl = document.getElementById('statTotalHp');
    if (hpEl) hpEl.textContent = totalHp > 0 ? totalHp.toLocaleString() + ' л.с.' : '—';

    // Total Brands
    const brandsSet = new Set(this.cars.map(c => c.brand).filter(Boolean));
    const brandsEl = document.getElementById('statTotalBrands');
    if (brandsEl) brandsEl.textContent = brandsSet.size;

    // Supercars count
    const supercarsCount = this.cars.filter(c => c.category === 'supercar').length;
    const supercarsEl = document.getElementById('statSupercars');
    if (supercarsEl) supercarsEl.textContent = supercarsCount;

    // Personal Garage count
    const garageEl = document.getElementById('statPersonalGarage');
    if (garageEl) {
      garageEl.textContent = (this.profile && this.profile.personalGarage && this.profile.personalGarage.length) || 0;
    }
  }

  // =========================================================================
  // Profile & Personal Garage
  // =========================================================================

  renderProfile() {
    if (!this.profile) return;

    const nick = this.profile.nickname || this.spotterName;
    const headerEl = document.getElementById('headerSpotterDisplay');
    const profileEl = document.getElementById('profileSpotterDisplay');
    if (headerEl) headerEl.textContent = nick;
    if (profileEl) profileEl.textContent = nick;

    const bioEl = document.getElementById('profileBioDisplay');
    if (bioEl) {
      bioEl.textContent = this.profile.bio || 'Охотник за редкими спорткарами, JDM легендами и суперкарами 🏎️';
    }

    // Avatar
    const avatarImg = document.getElementById('profileAvatarImg');
    const avatarFallback = document.getElementById('profileAvatarFallback');
    if (avatarImg && avatarFallback) {
      if (this.profile.avatar) {
        avatarImg.src = this.profile.avatar;
        avatarImg.style.display = 'block';
        avatarFallback.style.display = 'none';
      } else {
        avatarImg.style.display = 'none';
        avatarFallback.style.display = 'block';
      }
    }

    // Links
    this.renderProfileLinks();

    // Personal Garage
    this.renderPersonalGarage();
  }

  renderProfileLinks() {
    const listEl = document.getElementById('profileSocialLinksList');
    if (!listEl) return;
    listEl.innerHTML = '';

    const links = this.profile.links || {};
    let count = 0;

    // Drive2
    if (links.drive2 && links.drive2.trim()) {
      count++;
      const val = links.drive2.trim();
      const url = val.startsWith('http') ? val : `https://drive2.ru/users/${val}`;
      const a = document.createElement('a');
      a.className = 'profile-link-chip drive2-chip';
      a.href = url;
      a.target = '_blank';
      a.innerHTML = `<span>🏎️</span> Drive2: <b>${this.escapeHtml(val)}</b>`;
      listEl.appendChild(a);
    }

    // Telegram
    if (links.telegram && links.telegram.trim()) {
      count++;
      const val = links.telegram.trim();
      const url = val.startsWith('http') ? val : `https://t.me/${val.replace('@', '')}`;
      const a = document.createElement('a');
      a.className = 'profile-link-chip tg-chip';
      a.href = url;
      a.target = '_blank';
      a.innerHTML = `<span>✈️</span> Telegram: <b>${this.escapeHtml(val)}</b>`;
      listEl.appendChild(a);
    }

    // VK
    if (links.vk && links.vk.trim()) {
      count++;
      const val = links.vk.trim();
      const url = val.startsWith('http') ? val : `https://vk.com/${val.replace(/^@/, '')}`;
      const a = document.createElement('a');
      a.className = 'profile-link-chip vk-chip';
      a.href = url;
      a.target = '_blank';
      a.innerHTML = `<span>🔷</span> ВКонтакте`;
      listEl.appendChild(a);
    }

    // YouTube
    if (links.youtube && links.youtube.trim()) {
      count++;
      const val = links.youtube.trim();
      const url = val.startsWith('http') ? val : `https://youtube.com/@${val.replace(/^@/, '')}`;
      const a = document.createElement('a');
      a.className = 'profile-link-chip yt-chip';
      a.href = url;
      a.target = '_blank';
      a.innerHTML = `<span>▶️</span> YouTube`;
      listEl.appendChild(a);
    }

    // Website
    if (links.website && links.website.trim()) {
      count++;
      const val = links.website.trim();
      const url = val.startsWith('http') ? val : `https://${val}`;
      const a = document.createElement('a');
      a.className = 'profile-link-chip web-chip';
      a.href = url;
      a.target = '_blank';
      a.innerHTML = `<span>🌐</span> Сайт / Блог`;
      listEl.appendChild(a);
    }

    if (count === 0) {
      listEl.innerHTML = `<div style="font-size:0.78rem; color:var(--text-tertiary); padding: 4px 0;">Нажмите карандаш справа, чтобы привязать профили Drive2, Telegram, VK, YouTube или блог</div>`;
    }
  }

  renderPersonalGarage() {
    const gridEl = document.getElementById('personalGarageGrid');
    const badgeEl = document.getElementById('personalGarageCount');
    if (!gridEl) return;

    const garage = (this.profile && this.profile.personalGarage) || [];
    if (badgeEl) badgeEl.textContent = garage.length;

    gridEl.innerHTML = '';
    if (garage.length === 0) {
      gridEl.innerHTML = `<div class="personal-garage-empty">Ваш личный гараж пуст.<br>Нажмите «➕ Добавить авто в гараж», чтобы сохранить фото своей машины или проекта мечты!</div>`;
      return;
    }

    garage.forEach(item => {
      const thumb = document.createElement('div');
      thumb.className = 'personal-garage-thumb';
      thumb.onclick = () => this.openPersonalGarageViewer(item.id);
      thumb.innerHTML = `
        <img src="${item.thumb || item.image}" loading="lazy" alt="${item.title || 'Авто в гараже'}" />
        <div class="garage-thumb-title">${this.escapeHtml(item.title || 'Моя тачка')}</div>
      `;
      gridEl.appendChild(thumb);
    });
  }

  triggerAvatarUpload() {
    const input = document.getElementById('profileAvatarFileInput');
    if (input) input.click();
  }

  async handleAvatarFileInput(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    try {
      const { full } = await this.processImage(file);
      this.profile.avatar = full;
      await window.carDb.saveSpotterProfile(this.profile);
      this.renderProfile();
      this.showToast('Аватар обновлен!');
    } catch (err) {
      alert('Ошибка при сохранении аватара: ' + err.message);
    }
    e.target.value = '';
  }

  triggerPersonalGarageUpload() {
    const title = prompt('Название вашей машины в гараже (например: Мой проект / Daily / Dream Car):', 'Мой автомобиль');
    if (!title) return;

    const input = document.getElementById('personalGarageFileInput');
    input.dataset.title = title;
    input.click();
  }

  async handlePersonalGarageFileInput(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    const title = e.target.dataset.title || 'Мой автомобиль';

    try {
      if (!this.profile.personalGarage) this.profile.personalGarage = [];
      const { full, thumb } = await this.processImage(file);

      this.profile.personalGarage.unshift({
        id: 'gar-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6),
        title,
        image: full,
        thumb,
        createdAt: new Date().toISOString()
      });

      await window.carDb.saveSpotterProfile(this.profile);
      this.renderProfile();
      this.updateStats();
      this.showToast(`Авто «${title}» добавлено в ваш гараж!`);
    } catch (err) {
      alert('Ошибка при сохранении фото: ' + err.message);
    }
    e.target.value = '';
  }

  openPersonalGarageViewer(garageId) {
    const item = this.profile.personalGarage.find(p => p.id === garageId);
    if (!item) return;

    this.currentViewerImage = item.image;
    this.currentViewerGarageId = item.id;

    const modal = document.getElementById('fullPhotoViewerModal');
    const img = document.getElementById('fullViewerImg');
    const delBtn = document.getElementById('btnDeleteViewerPersonalGarage');
    if (img) img.src = item.image;
    if (delBtn) delBtn.style.display = 'inline-flex';
    if (modal) modal.classList.add('open');
  }

  async deleteCurrentPersonalGarageFromViewer() {
    if (!this.currentViewerGarageId) return;
    if (!confirm('Удалить эту машину из личного гаража?')) return;

    this.profile.personalGarage = this.profile.personalGarage.filter(p => p.id !== this.currentViewerGarageId);
    await window.carDb.saveSpotterProfile(this.profile);
    this.closeFullViewer();
    this.renderProfile();
    this.updateStats();
    this.showToast('Машина удалена из гаража');
  }

  openProfileEditModal() {
    if (!this.profile) return;
    const nickInp = document.getElementById('editProfileNick');
    const bioInp = document.getElementById('editProfileBio');
    const drive2Inp = document.getElementById('editProfileDrive2');
    const tgInp = document.getElementById('editProfileTg');
    const vkInp = document.getElementById('editProfileVK');
    const ytInp = document.getElementById('editProfileYT');
    const webInp = document.getElementById('editProfileWeb');

    if (nickInp) nickInp.value = this.profile.nickname || this.spotterName;
    if (bioInp) bioInp.value = this.profile.bio || '';
    if (drive2Inp) drive2Inp.value = (this.profile.links && this.profile.links.drive2) || '';
    if (tgInp) tgInp.value = (this.profile.links && this.profile.links.telegram) || '';
    if (vkInp) vkInp.value = (this.profile.links && this.profile.links.vk) || '';
    if (ytInp) ytInp.value = (this.profile.links && this.profile.links.youtube) || '';
    if (webInp) webInp.value = (this.profile.links && this.profile.links.website) || '';

    const modal = document.getElementById('profileEditModal');
    if (modal) modal.classList.add('open');
  }

  closeProfileEditModal() {
    const modal = document.getElementById('profileEditModal');
    if (modal) modal.classList.remove('open');
  }

  async saveProfileFromModal() {
    const nickInp = document.getElementById('editProfileNick');
    const bioInp = document.getElementById('editProfileBio');
    const drive2Inp = document.getElementById('editProfileDrive2');
    const tgInp = document.getElementById('editProfileTg');
    const vkInp = document.getElementById('editProfileVK');
    const ytInp = document.getElementById('editProfileYT');
    const webInp = document.getElementById('editProfileWeb');

    this.profile.nickname = (nickInp && nickInp.value.trim()) || this.spotterName;
    this.spotterName = this.profile.nickname;
    this.profile.bio = bioInp ? bioInp.value.trim() : '';
    this.profile.links = {
      drive2: drive2Inp ? drive2Inp.value.trim() : '',
      telegram: tgInp ? tgInp.value.trim() : '',
      vk: vkInp ? vkInp.value.trim() : '',
      youtube: ytInp ? ytInp.value.trim() : '',
      website: webInp ? webInp.value.trim() : ''
    };

    await window.carDb.saveSpotterProfile(this.profile);
    this.closeProfileEditModal();
    this.renderProfile();
    this.showToast('Профиль сохранен!');
  }

  // =========================================================================
  // Fullscreen Viewer & Backup
  // =========================================================================

  viewFullArt(imgUrl) {
    this.currentViewerImage = imgUrl;
    this.currentViewerGarageId = null;

    const modal = document.getElementById('fullPhotoViewerModal');
    const img = document.getElementById('fullViewerImg');
    const delBtn = document.getElementById('btnDeleteViewerPersonalGarage');

    if (modal && img) {
      img.src = imgUrl;
      if (delBtn) delBtn.style.display = 'none';
      modal.classList.add('open');
    }
  }

  closeFullViewer() {
    const modal = document.getElementById('fullPhotoViewerModal');
    if (modal) modal.classList.remove('open');
    this.currentViewerImage = null;
    this.currentViewerGarageId = null;
  }

  downloadCurrentViewerImage() {
    if (!this.currentViewerImage) return;
    const filename = `car_spot_${Date.now()}.jpg`;
    if (window.AndroidBridge && window.AndroidBridge.saveBase64Image) {
      window.AndroidBridge.saveBase64Image(this.currentViewerImage, filename);
    } else {
      const a = document.createElement('a');
      a.href = this.currentViewerImage;
      a.download = filename;
      a.click();
      this.showToast('Фото сохранено');
    }
  }

  async exportBackup() {
    try {
      const jsonStr = await window.carDb.exportAll();
      const filename = `cardex_backup_${Date.now()}.json`;

      if (window.AndroidBridge && window.AndroidBridge.saveBackupJson) {
        window.AndroidBridge.saveBackupJson(jsonStr, filename);
        if (window.AndroidBridge.shareBackupFile) {
          window.AndroidBridge.shareBackupFile(filename);
        }
      } else {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
      }
      this.showToast('Резервная копия сохранена!');
    } catch (e) {
      alert('Ошибка при экспорте: ' + e.message);
    }
  }

  async importBackup() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          await window.carDb.importAll(evt.target.result);
          this.profile = await window.carDb.getSpotterProfile();
          this.spotterName = this.profile.nickname || window.carDb.getDefaultNickname();
          await this.loadCars();
          this.renderProfile();
          this.updateStats();
          this.showToast('Коллекция и профиль восстановлены!');
        } catch (err) {
          alert('Ошибка при импорте: ' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  // =========================================================================
  // Utilities & Image Processing
  // =========================================================================

  async processImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // 1. Full Photo (max 2048px Retina)
          const fullCanvas = document.createElement('canvas');
          let fW = img.width;
          let fH = img.height;
          const maxDim = 2048;

          if (fW > maxDim || fH > maxDim) {
            if (fW > fH) {
              fH = Math.round((fH * maxDim) / fW);
              fW = maxDim;
            } else {
              fW = Math.round((fW * maxDim) / fH);
              fH = maxDim;
            }
          }

          fullCanvas.width = fW;
          fullCanvas.height = fH;
          const fCtx = fullCanvas.getContext('2d');
          fCtx.drawImage(img, 0, 0, fW, fH);
          const fullData = fullCanvas.toDataURL('image/jpeg', 0.88);

          // 2. Square Thumbnail (512x512)
          const thumbCanvas = document.createElement('canvas');
          thumbCanvas.width = 512;
          thumbCanvas.height = 512;
          const tCtx = thumbCanvas.getContext('2d');

          const sSide = Math.min(img.width, img.height);
          const sx = (img.width - sSide) / 2;
          const sy = (img.height - sSide) / 2;
          tCtx.drawImage(img, sx, sy, sSide, sSide, 0, 0, 512, 512);
          const thumbData = thumbCanvas.toDataURL('image/jpeg', 0.82);

          resolve({ full: fullData, thumb: thumbData });
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  getBrandIcon(brand) {
    if (!brand) return '🏎️';
    for (const [key, icon] of Object.entries(this.brandLogos)) {
      if (brand.toLowerCase().includes(key.toLowerCase())) return icon;
    }
    return '🏎️';
  }

  getCategoryBadge(category) {
    return this.categories[category] || { label: 'Авто', icon: '🚗', class: 'cat-sport' };
  }

  showToast(message) {
    let toast = document.getElementById('cardexToastNotice');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'cardexToastNotice';
      toast.className = 'toast-notice';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 3200);
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.toString().replace(/[&<>"']/g, (m) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }
}

window.app = new CarDexApp();
document.addEventListener('DOMContentLoaded', () => window.app.init());
