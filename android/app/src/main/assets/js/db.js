/**
 * CarDex Database Module (IndexedDB)
 * High-performance offline database for car spots, garage, photo galleries & telemetry
 */

class CarDexDB {
  constructor() {
    this.dbName = 'CarDexDB';
    this.version = 1;
    this.db = null;
  }

  async init() {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);

      req.onupgradeneeded = (e) => {
        const db = e.target.result;

        // 1. Cars Store
        if (!db.objectStoreNames.contains('cars')) {
          const carStore = db.createObjectStore('cars', { keyPath: 'id' });
          carStore.createIndex('brand', 'brand', { unique: false });
          carStore.createIndex('category', 'category', { unique: false });
          carStore.createIndex('rating', 'rating', { unique: false });
          carStore.createIndex('createdAt', 'createdAt', { unique: false });
          carStore.createIndex('date', 'date', { unique: false });
        }

        // 2. Settings & Profiles Store
        if (!db.objectStoreNames.contains('settings')) {
          db.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      req.onsuccess = async (e) => {
        this.db = e.target.result;
        await this.seedDemoCarsIfEmpty();
        resolve(this.db);
      };

      req.onerror = (e) => {
        console.error('IndexedDB CarDex error:', e);
        reject(e);
      };
    });
  }

  // Determine default nickname according to platform:
  // "Ваня" for Android APK, "Ragazzo_15" for Web / Pages
  getDefaultNickname() {
    if (window.AndroidBridge !== undefined) {
      return 'Ваня';
    }
    return 'Ragazzo_15';
  }

  // --- Seed Demo Cars with Realistic Data ---
  async seedDemoCarsIfEmpty() {
    const list = await this.getAllCars();
    if (list.length === 0) {
      const demoSpots = [
        {
          id: 'car-demo-porsche-911',
          brand: 'Porsche',
          model: '911 GT3 RS',
          generation: '992',
          year: 2023,
          category: 'supercar',
          color: 'Lava Orange',
          plate: 'Х 911 ТР 799',
          power: 525,
          drivetrain: 'RWD',
          transmission: 'PDK (Робот)',
          location: 'Москва, Патриаршие пруды',
          lat: 55.7645,
          lng: 37.5925,
          date: '2026-10-18T16:30',
          rating: 5,
          sound: 'Спортивный рев атмо V6 (9000 об/мин)',
          notes: 'Огромное антикрыло с DRS, магниевые диски, углепластиковый капот. Звук на переключениях просто пушка!',
          photo: '',
          photoThumb: '',
          photos: [],
          createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString()
        },
        {
          id: 'car-demo-nissan-skyline',
          brand: 'Nissan',
          model: 'Skyline GT-R',
          generation: 'BNR34 V-Spec II',
          year: 2001,
          category: 'jdm',
          color: 'Bayside Blue',
          plate: 'JDM 034 R34',
          power: 450,
          drivetrain: 'AWD (ATTESA E-TS)',
          transmission: '6-МКПП Getrag',
          location: 'Санкт-Петербург, Севкабель Порт',
          lat: 59.9242,
          lng: 30.2412,
          date: '2026-10-15T19:15',
          rating: 5,
          sound: 'Прямоток HKS, сочный бас RB26DETT + пшики блоу-оффа',
          notes: 'Легенда в музейном сохране! Диски Volk Racing TE37 Bronze, оригинальный дисплей MFD в торпеде работает.',
          photo: '',
          photoThumb: '',
          photos: [],
          createdAt: new Date(Date.now() - 3600000 * 24 * 5).toISOString()
        },
        {
          id: 'car-demo-bmw-m5',
          brand: 'BMW',
          model: 'M5',
          generation: 'E39',
          year: 2002,
          category: 'sport',
          color: 'Carbon Black Metallic',
          plate: 'О 005 ММ 77',
          power: 400,
          drivetrain: 'RWD',
          transmission: '6-МКПП',
          location: 'Москва, Воробьевы горы (Смотра)',
          lat: 55.7101,
          lng: 37.5422,
          date: '2026-10-12T21:40',
          rating: 4,
          sound: 'Басовитый V8 S62 без катализаторов с отстрелами',
          notes: 'Культовая М-ка на оригинальных разношироких дисках Style 65. Состояние кузова как с завода.',
          photo: '',
          photoThumb: '',
          photos: [],
          createdAt: new Date(Date.now() - 3600000 * 24 * 8).toISOString()
        },
        {
          id: 'car-demo-dodge-charger',
          brand: 'Dodge',
          model: 'Charger R/T 440',
          generation: 'B-Body 1969',
          year: 1969,
          category: 'muscle',
          color: 'Plum Crazy Purple',
          plate: 'V8 1969 RT',
          power: 375,
          drivetrain: 'RWD',
          transmission: 'TorqueFlite 727',
          location: 'Москва, ВДНХ',
          lat: 55.8263,
          lng: 37.6377,
          date: '2026-10-08T14:20',
          rating: 5,
          sound: 'Глубокий рокот настоящего американского Big-Block',
          notes: 'Скрытые фары Hideaway, задняя белая полоса Bumblebee, невероятный хардтоп силуэт.',
          photo: '',
          photoThumb: '',
          photos: [],
          createdAt: new Date(Date.now() - 3600000 * 24 * 12).toISOString()
        }
      ];

      for (const car of demoSpots) {
        await this.saveCar(car);
      }
    }
  }

  // =========================================================================
  // Car Spots CRUD Operations
  // =========================================================================

  async getAllCars() {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('cars', 'readonly');
      const store = tx.objectStore('cars');
      const req = store.getAll();
      req.onsuccess = () => {
        const list = req.result || [];
        // Sort newest date first
        list.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
        resolve(list);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async getCar(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('cars', 'readonly');
      const store = tx.objectStore('cars');
      const req = store.get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async saveCar(car) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('cars', 'readwrite');
      const store = tx.objectStore('cars');

      if (!car.id) {
        car.id = 'car-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
      }
      if (!car.createdAt) {
        car.createdAt = new Date().toISOString();
      }
      if (!car.date) {
        car.date = new Date().toISOString().slice(0, 16);
      }
      if (!Array.isArray(car.photos)) {
        car.photos = [];
      }

      const req = store.put(car);
      req.onsuccess = () => resolve(car);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteCar(id) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('cars', 'readwrite');
      const store = tx.objectStore('cars');
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async addPhotoToCar(carId, photoObj) {
    const car = await this.getCar(carId);
    if (!car) throw new Error('Автомобиль не найден');
    if (!Array.isArray(car.photos)) car.photos = [];
    
    photoObj.id = 'photo-' + Date.now() + '-' + Math.random().toString(36).substr(2, 6);
    photoObj.createdAt = new Date().toISOString();
    car.photos.push(photoObj);

    return this.saveCar(car);
  }

  async removePhotoFromCar(carId, photoId) {
    const car = await this.getCar(carId);
    if (!car) throw new Error('Автомобиль не найден');
    if (Array.isArray(car.photos)) {
      car.photos = car.photos.filter(p => p.id !== photoId);
    }
    return this.saveCar(car);
  }

  // =========================================================================
  // Settings & Profile Operations
  // =========================================================================

  async getSetting(key, defaultValue = null) {
    await this.init();
    return new Promise((resolve) => {
      const tx = this.db.transaction('settings', 'readonly');
      const store = tx.objectStore('settings');
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && req.result.value !== undefined) {
          resolve(req.result.value);
        } else {
          resolve(defaultValue);
        }
      };
      req.onerror = () => resolve(defaultValue);
    });
  }

  async setSetting(key, value) {
    await this.init();
    return new Promise((resolve, reject) => {
      const tx = this.db.transaction('settings', 'readwrite');
      const store = tx.objectStore('settings');
      const req = store.put({ key, value });
      req.onsuccess = () => resolve(value);
      req.onerror = () => reject(req.error);
    });
  }

  async getSpotterProfile() {
    const defaultNickname = this.getDefaultNickname();
    const defaultProfile = {
      nickname: defaultNickname,
      bio: 'Охотник за редкими спорткарами, JDM легендами и суперкарами 🏎️',
      avatar: null,
      city: 'Москва / Санкт-Петербург',
      links: {
        drive2: '',
        telegram: '@' + defaultNickname.toLowerCase(),
        vk: '',
        youtube: '',
        website: ''
      },
      personalGarage: []
    };

    const saved = await this.getSetting('spotter_profile', null);
    if (!saved) return defaultProfile;
    return Object.assign(defaultProfile, saved);
  }

  async saveSpotterProfile(profile) {
    await this.setSetting('spotter_profile', profile);
    if (profile.nickname) {
      localStorage.setItem('cardex_spotter_name', profile.nickname);
    }
    return profile;
  }

  // =========================================================================
  // Backup Export & Import (JSON)
  // =========================================================================

  async exportAll() {
    const cars = await this.getAllCars();
    const profile = await this.getSpotterProfile();
    const exportData = {
      app: 'CarDex',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      spotterProfile: profile,
      cars
    };
    return JSON.stringify(exportData, null, 2);
  }

  async importAll(jsonStr) {
    const data = JSON.parse(jsonStr);
    if (!data.cars && !data.spotterProfile) {
      throw new Error('Некорректный формат файла резервной копии CarDex');
    }

    if (data.spotterProfile) {
      await this.saveSpotterProfile(data.spotterProfile);
    }

    if (Array.isArray(data.cars)) {
      for (const car of data.cars) {
        await this.saveCar(car);
      }
    }

    return true;
  }
}

window.carDb = new CarDexDB();
