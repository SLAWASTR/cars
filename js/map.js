/**
 * CarDex Interactive Map & Geolocation Module
 * Supports OpenStreetMap / Leaflet, GPS auto-detect, reverse geocoding & EXIF reading
 */

class CarMapManager {
  constructor() {
    this.map = null;
    this.markersLayer = null;
    this.isInitialized = false;
    this.currentCenter = [55.751244, 37.618423]; // Default: Moscow
    this.currentZoom = 11;
  }

  initMap() {
    const container = document.getElementById('carsMapContainer');
    if (!container || this.isInitialized) return;

    if (typeof L === 'undefined') {
      console.warn('Leaflet is not loaded yet');
      return;
    }

    try {
      this.map = L.map('carsMapContainer', {
        zoomControl: true,
        attributionControl: false
      }).setView(this.currentCenter, this.currentZoom);

      // Dark Matter CartoDB tiles for dark/AMOLED theme, standard for light
      this.tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(this.map);

      this.markersLayer = L.layerGroup().addTo(this.map);
      this.isInitialized = true;

      // Update markers
      this.updateMarkers();

      // Invalidate size after layout renders
      setTimeout(() => {
        if (this.map) this.map.invalidateSize();
      }, 300);
    } catch (e) {
      console.error('Failed to init map:', e);
    }
  }

  async updateMarkers() {
    if (!this.map || !this.markersLayer) return;
    this.markersLayer.clearLayers();

    const cars = (window.app && window.app.cars) || [];
    const validSpots = cars.filter(c => c.lat && c.lng && !isNaN(c.lat) && !isNaN(c.lng));

    if (validSpots.length === 0) return;

    const bounds = [];

    validSpots.forEach(car => {
      const lat = parseFloat(car.lat);
      const lng = parseFloat(car.lng);
      bounds.push([lat, lng]);

      const photoSrc = car.photoThumb || car.photo || 'icons/app-icon.svg';
      const brandLogo = window.app ? window.app.getBrandIcon(car.brand) : '🏎️';

      // Custom neon pin HTML
      const pinHtml = `
        <div class="map-car-pin" title="${car.brand} ${car.model}">
          <div class="map-pin-inner">
            <img src="${photoSrc}" class="map-pin-img" alt="${car.brand}" />
            <span class="map-pin-badge">${brandLogo}</span>
          </div>
          <div class="map-pin-tip"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-car-pin-wrap',
        html: pinHtml,
        iconSize: [44, 52],
        iconAnchor: [22, 50],
        popupAnchor: [0, -46]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      const popupHtml = `
        <div class="map-popup-card">
          <div class="map-popup-photo-wrap" onclick="window.app.openDetailModal('${car.id}')">
            <img src="${photoSrc}" class="map-popup-img" alt="${car.brand} ${car.model}" />
            <span class="map-popup-category">${window.app ? window.app.getCategoryBadge(car.category).label : car.category}</span>
          </div>
          <div class="map-popup-info">
            <h4 class="map-popup-title">${car.brand} ${car.model}</h4>
            <div class="map-popup-sub">${car.generation || ''} ${car.year ? '• ' + car.year : ''}</div>
            <div class="map-popup-loc">📍 ${car.location || 'Координаты точки'}</div>
            <div class="map-popup-actions">
              <button class="map-popup-btn" onclick="window.app.openDetailModal('${car.id}')">Подробнее</button>
              <button class="map-popup-btn-nav" onclick="window.mapManager.openExternalNav(${lat}, ${lng}, '${encodeURIComponent(car.brand + ' ' + car.model)}')">🧭 Навигатор</button>
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(popupHtml, { maxWidth: 280, className: 'cardex-leaflet-popup' });
      this.markersLayer.addLayer(marker);
    });

    if (bounds.length > 0) {
      try {
        this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
      } catch (e) {
        console.warn('fitBounds error:', e);
      }
    }
  }

  // Focus single car on map
  focusCar(lat, lng) {
    if (!this.map) return;
    this.map.setView([lat, lng], 15, { animate: true });
    setTimeout(() => {
      if (this.map) this.map.invalidateSize();
    }, 200);
  }

  // Current GPS Geolocation
  async detectCurrentPosition() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Геолокация не поддерживается вашим устройством'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          let address = '';

          try {
            address = await this.reverseGeocode(lat, lng);
          } catch (e) {
            address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          }

          resolve({ lat, lng, address });
        },
        (err) => {
          reject(err);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    });
  }

  // Reverse Geocoding with OpenStreetMap Nominatim
  async reverseGeocode(lat, lng) {
    try {
      const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1&accept-language=ru`;
      const resp = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!resp.ok) throw new Error('Network error');
      const data = await resp.json();

      if (data && data.address) {
        const a = data.address;
        const city = a.city || a.town || a.village || a.county || '';
        const road = a.road || a.pedestrian || a.street || '';
        const house = a.house_number ? `, ${a.house_number}` : '';

        if (city && road) {
          return `${city}, ${road}${house}`;
        } else if (data.display_name) {
          const parts = data.display_name.split(',');
          return parts.slice(0, 3).join(',').trim();
        }
      }
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    } catch (e) {
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  }

  // Open in External Navigators
  openExternalNav(lat, lng, label = '') {
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    const yandexUrl = `https://yandex.ru/maps/?rtext=~${lat},${lng}&rtt=auto`;
    const googleUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

    if (window.AndroidBridge && window.AndroidBridge.openExternalUrl) {
      window.AndroidBridge.openExternalUrl(yandexUrl);
      return;
    }

    if (confirm('Открыть маршрут в Яндекс.Картах?\n(Нажмите "Отмена" для Google Maps)')) {
      window.open(yandexUrl, '_blank');
    } else {
      window.open(googleUrl, '_blank');
    }
  }

  // =========================================================================
  // EXIF Metadata Parser (Extract Date & GPS from car photo)
  // =========================================================================

  async extractExifFromImage(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const buffer = e.target.result;
          const view = new DataView(buffer);

          // Check JPEG magic 0xFFD8
          if (view.getUint16(0, false) !== 0xFFD8) {
            resolve({ date: null, lat: null, lng: null });
            return;
          }

          let offset = 2;
          const length = buffer.byteLength;
          let date = null;
          let lat = null;
          let lng = null;

          while (offset < length) {
            if (view.getUint8(offset) !== 0xFF) break;
            const marker = view.getUint8(offset + 1);

            // APP1 marker containing Exif (0xFFE1)
            if (marker === 0xE1) {
              const exifResult = this.parseApp1Exif(view, offset + 4);
              if (exifResult) {
                date = exifResult.date || null;
                lat = exifResult.lat || null;
                lng = exifResult.lng || null;
              }
              break;
            } else {
              offset += 2 + view.getUint16(offset + 2, false);
            }
          }

          resolve({ date, lat, lng });
        } catch (err) {
          console.warn('EXIF parse error:', err);
          resolve({ date: null, lat: null, lng: null });
        }
      };
      reader.onerror = () => resolve({ date: null, lat: null, lng: null });
      // Read first 128KB of image where EXIF header lives
      reader.readAsArrayBuffer(file.slice(0, 131072));
    });
  }

  parseApp1Exif(view, offset) {
    try {
      // Check for 'Exif\0\0' string
      const str = String.fromCharCode(
        view.getUint8(offset),
        view.getUint8(offset + 1),
        view.getUint8(offset + 2),
        view.getUint8(offset + 3)
      );
      if (str !== 'Exif') return null;

      const tiffOffset = offset + 6;
      const littleEndian = view.getUint16(tiffOffset, false) === 0x4949;

      // First IFD offset
      const ifdOffset = tiffOffset + view.getUint32(tiffOffset + 4, littleEndian);
      const numEntries = view.getUint16(ifdOffset, littleEndian);

      let exifSubIFDOffset = 0;
      let gpsIFDOffset = 0;
      let date = null;

      for (let i = 0; i < numEntries; i++) {
        const entryOffset = ifdOffset + 2 + i * 12;
        const tag = view.getUint16(entryOffset, littleEndian);

        // 0x8769: Exif SubIFD
        if (tag === 0x8769) {
          exifSubIFDOffset = tiffOffset + view.getUint32(entryOffset + 8, littleEndian);
        }
        // 0x8825: GPS Info IFD
        if (tag === 0x8825) {
          gpsIFDOffset = tiffOffset + view.getUint32(entryOffset + 8, littleEndian);
        }
        // 0x0132: DateTime
        if (tag === 0x0132) {
          const valOffset = tiffOffset + view.getUint32(entryOffset + 8, littleEndian);
          date = this.readExifDate(view, valOffset);
        }
      }

      // Check Exif SubIFD for DateTimeOriginal (0x9003)
      if (exifSubIFDOffset > 0) {
        const subEntries = view.getUint16(exifSubIFDOffset, littleEndian);
        for (let j = 0; j < subEntries; j++) {
          const entryOffset = exifSubIFDOffset + 2 + j * 12;
          const tag = view.getUint16(entryOffset, littleEndian);
          if (tag === 0x9003 || tag === 0x9004) {
            const valOffset = tiffOffset + view.getUint32(entryOffset + 8, littleEndian);
            const d = this.readExifDate(view, valOffset);
            if (d) date = d;
          }
        }
      }

      // Check GPS IFD
      let lat = null;
      let lng = null;
      if (gpsIFDOffset > 0) {
        const gpsResult = this.parseGpsIFD(view, tiffOffset, gpsIFDOffset, littleEndian);
        if (gpsResult) {
          lat = gpsResult.lat;
          lng = gpsResult.lng;
        }
      }

      return { date, lat, lng };
    } catch (e) {
      return null;
    }
  }

  readExifDate(view, offset) {
    try {
      let str = '';
      for (let i = 0; i < 19; i++) {
        const ch = view.getUint8(offset + i);
        if (ch === 0) break;
        str += String.fromCharCode(ch);
      }
      // EXIF date format: "YYYY:MM:DD HH:MM:SS" -> convert to "YYYY-MM-DDTHH:MM"
      if (/^\d{4}:\d{2}:\d{2} \d{2}:\d{2}/.test(str)) {
        const parts = str.split(' ');
        const datePart = parts[0].replace(/:/g, '-');
        const timePart = parts[1].slice(0, 5);
        return `${datePart}T${timePart}`;
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  parseGpsIFD(view, tiffOffset, gpsOffset, littleEndian) {
    try {
      const numEntries = view.getUint16(gpsOffset, littleEndian);
      let lat = null;
      let latRef = 'N';
      let lng = null;
      let lngRef = 'E';

      for (let i = 0; i < numEntries; i++) {
        const entryOffset = gpsOffset + 2 + i * 12;
        const tag = view.getUint16(entryOffset, littleEndian);

        if (tag === 1) { // GPSLatitudeRef
          latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
        } else if (tag === 2) { // GPSLatitude
          const valOffset = tiffOffset + view.getUint32(entryOffset + 8, littleEndian);
          lat = this.readGpsCoordinate(view, valOffset, littleEndian);
        } else if (tag === 3) { // GPSLongitudeRef
          lngRef = String.fromCharCode(view.getUint8(entryOffset + 8));
        } else if (tag === 4) { // GPSLongitude
          const valOffset = tiffOffset + view.getUint32(entryOffset + 8, littleEndian);
          lng = this.readGpsCoordinate(view, valOffset, littleEndian);
        }
      }

      if (lat !== null && lng !== null) {
        if (latRef === 'S') lat = -lat;
        if (lngRef === 'W') lng = -lng;
        return { lat, lng };
      }
      return null;
    } catch (e) {
      return null;
    }
  }

  readGpsCoordinate(view, offset, littleEndian) {
    try {
      const degNum = view.getUint32(offset, littleEndian);
      const degDen = view.getUint32(offset + 4, littleEndian) || 1;
      const minNum = view.getUint32(offset + 8, littleEndian);
      const minDen = view.getUint32(offset + 12, littleEndian) || 1;
      const secNum = view.getUint32(offset + 16, littleEndian);
      const secDen = view.getUint32(offset + 20, littleEndian) || 1;

      const deg = degNum / degDen;
      const min = minNum / minDen;
      const sec = secNum / secDen;

      return deg + min / 60 + sec / 3600;
    } catch (e) {
      return null;
    }
  }
}

window.mapManager = new CarMapManager();
