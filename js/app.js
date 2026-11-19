/**
 * Fire Primal Elephant™ - Playable Web Prototype
 * Main UI Controller & Lifecycle Coordinator
 */
import { GAME_CONFIG } from './config.js';
import { PrimalEngine } from './engine.js';
import { PrimalAudio } from './audio.js';
import { FlyingAnimator } from './flyingCoins.js';
import { LockSlingoModal } from './bonus/lockSlingo.js';
import { ApexSpinsModal } from './bonus/apexSpins.js';
import { ColossalSpinsModal } from './bonus/colossalSpins.js';
import { PrimalZoneModal } from './bonus/primalZone.js';

class PrimalApp {
  constructor() {
    this.engine = new PrimalEngine(GAME_CONFIG);
    this.audio = new PrimalAudio();
    this.flyingAnimator = null;
    this.lockSlingo = new LockSlingoModal(this.audio);
    this.apexSpins = new ApexSpinsModal(this.audio);
    this.colossalSpins = new ColossalSpinsModal(this.audio);
    this.primalZone = new PrimalZoneModal(this.audio);

    this.isSpinning = false;
    this.isTurbo = false;
    this.autoSpinsRemaining = 0;
    this.activeLineTimeout = null;

    this.bets = [1.00, 2.00, 5.00, 10.00, 20.00, 50.00, 100.00];
    this.currentBetIndex = 0; // $1.00 default stake
    this.engine.currentBet = this.bets[this.currentBetIndex];

    // Starting screen: standard random stop position configuration of normal reels (no colossal)
    this.currentScreen = this.engine.getRandomBaseScreen();
    this.isCurrentColossal = false;
    this.currentColossalAnimal = null;
  }

  init() {
    this.flyingAnimator = new FlyingAnimator(
      document.getElementById('app-root'),
      document.getElementById('flying-particles-layer')
    );
    this._bindEvents();
    this._renderInitialReels();
    this._updateHUD();
    this._updatePotsUI();
    this._updateStageTotemUI();
    this._updateJackpotsUI();
    console.log('Fire Primal Elephant™ Prototype initialized successfully.');

    // Query params for automated testing & QA inspection
    const params = new URLSearchParams(window.location.search);
    if (params.get('test') === 'collect') {
      setTimeout(() => this.handleSpin({ forceDualCollector: true }), 400);
    } else if (params.get('test') === 'pots') {
      setTimeout(() => this.handleSpin({ forceAllPotCoins: true }), 400);
    } else if (params.get('test') === 'unlock') {
      setTimeout(() => {
        this.engine.setStage(1);
        this._updateStageTotemUI();
        this._updatePotsUI();
        this._showStageUnlockNotification({
          stageIndex: 1,
          title: "Primal Roar",
          unlock: "Bonus 2 (Apex Spins) Unlocked"
        });
      }, 400);
    }
  }

  _bindEvents() {
    // Spin button
    const spinBtn = document.getElementById('spin-btn');
    if (spinBtn) {
      spinBtn.addEventListener('click', () => this.handleSpin());
    }

    // Keyboard Spacebar for Spin
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.target.matches('input, textarea, select, button')) {
        e.preventDefault();
        this.handleSpin();
      }
    });

    // Bet controls
    const betMinus = document.getElementById('bet-minus');
    const betPlus = document.getElementById('bet-plus');
    if (betMinus) betMinus.addEventListener('click', () => this.changeBet(-1));
    if (betPlus) betPlus.addEventListener('click', () => this.changeBet(1));

    // Max Bet
    const maxBetBtn = document.getElementById('btn-maxbet');
    if (maxBetBtn) {
      maxBetBtn.addEventListener('click', () => {
        this.currentBetIndex = this.bets.length - 1;
        this.engine.currentBet = this.bets[this.currentBetIndex];
        this._updateHUD();
        this._updateJackpotsUI();
      });
    }

    // Audio toggle
    const muteBtn = document.getElementById('mute-btn');
    if (muteBtn) {
      muteBtn.addEventListener('click', () => {
        const isMuted = this.audio.toggleMute();
        muteBtn.innerText = isMuted ? '🔇 MUTED' : '🔊 SOUND';
        muteBtn.classList.toggle('muted', isMuted);
      });
    }

    // Turbo toggle
    const turboBtn = document.getElementById('turbo-btn');
    if (turboBtn) {
      turboBtn.addEventListener('click', () => {
        this.isTurbo = !this.isTurbo;
        turboBtn.classList.toggle('active', this.isTurbo);
        turboBtn.innerText = this.isTurbo ? '⚡ TURBO ON' : '⚡ TURBO';
      });
    }

    // Auto Spin toggle
    const autoBtn = document.getElementById('btn-auto');
    if (autoBtn) {
      autoBtn.addEventListener('click', () => {
        if (this.autoSpinsRemaining > 0) {
          this.autoSpinsRemaining = 0;
          autoBtn.innerText = 'AUTO SPIN';
          autoBtn.classList.remove('active');
        } else {
          this.autoSpinsRemaining = 25;
          autoBtn.innerText = `STOP (${this.autoSpinsRemaining})`;
          autoBtn.classList.add('active');
          if (!this.isSpinning) this.handleSpin();
        }
      });
    }

    // QA Debug panel toggle
    const debugBtn = document.getElementById('debug-toggle-btn');
    const debugDrawer = document.getElementById('debug-drawer');
    if (debugBtn && debugDrawer) {
      debugBtn.addEventListener('click', () => {
        debugDrawer.classList.toggle('open');
        debugBtn.classList.toggle('active');
      });
    }

    // Debug Action Cheats
    this._bindDebugControls();
  }

  _bindDebugControls() {
    const bindClick = (id, fn) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', fn);
    };

    bindClick('cheat-force-stomp', () => this.handleSpin({ forceCollector: true, forceFireCore: true }));
    bindClick('cheat-dual-collect', () => this.handleSpin({ forceDualCollector: true }));
    bindClick('cheat-drop-all-pots', () => this.handleSpin({ forceAllPotCoins: true }));
    bindClick('cheat-colossal-elephant', () => this.handleSpin({ forceColossal: true, colossalAnimal: 'elephant' }));
    bindClick('cheat-colossal-tiger', () => this.handleSpin({ forceColossal: true, colossalAnimal: 'tiger' }));
    bindClick('cheat-colossal-rhino', () => this.handleSpin({ forceColossal: true, colossalAnimal: 'rhino' }));
    bindClick('cheat-colossal-gorilla', () => this.handleSpin({ forceColossal: true, colossalAnimal: 'gorilla' }));

    bindClick('cheat-pot-1', () => this.handleSpin({ forcePotBonus: 0 }));
    bindClick('cheat-pot-2', () => {
      if (this.engine.stageIndex < 1) {
        this.engine.setStage(1);
        this._updateStageTotemUI();
        this._updatePotsUI();
      }
      this.handleSpin({ forcePotBonus: 1 });
    });
    bindClick('cheat-pot-3', () => {
      if (this.engine.stageIndex < 2) {
        this.engine.setStage(2);
        this._updateStageTotemUI();
        this._updatePotsUI();
      }
      this.handleSpin({ forcePotBonus: 2 });
    });
    bindClick('cheat-pot-4', () => {
      if (this.engine.stageIndex < 3) {
        this.engine.setStage(3);
        this._updateStageTotemUI();
        this._updatePotsUI();
      }
      this.handleSpin({ forcePotBonus: 3 });
    });

    bindClick('cheat-stampede', () => this.handleSpin({ forceStampede: true }));
    bindClick('cheat-jackpot', () => this.handleSpin({ forceJackpot: true }));

    // Stage Selector dropdown
    const stageSelect = document.getElementById('cheat-stage-select');
    if (stageSelect) {
      stageSelect.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        this.engine.setStage(val);
        this._updateStageTotemUI();
        this._updatePotsUI();
        if (!this.isSpinning) this._renderInitialReels();
        const stage = this.engine.getCurrentStage();
        this._showStageUnlockNotification({
          stageIndex: val,
          title: stage.title,
          unlock: stage.unlock
        });
      });
    }
  }

  changeBet(delta) {
    if (this.isSpinning) return;
    this.currentBetIndex = Math.max(0, Math.min(this.bets.length - 1, this.currentBetIndex + delta));
    this.engine.currentBet = this.bets[this.currentBetIndex];
    this._updateHUD();
    this._updateJackpotsUI();
    if (this.audio) this.audio.playCountUpTick();
  }

  _updateHUD() {
    const creditsEl = document.getElementById('credits-val');
    const betEl = document.getElementById('bet-val');
    if (creditsEl) creditsEl.innerText = `$${this.engine.balance.toFixed(2)}`;
    if (betEl) betEl.innerText = `$${this.engine.currentBet.toFixed(2)}`;
  }

  _updateJackpotsUI() {
    const bet = this.engine.currentBet;
    const ids = {
      'jp-mega': 1520.0 * bet,
      'jp-grand': 300.0 * bet,
      'jp-major': 150.0 * bet,
      'jp-minor': 50.0 * bet,
      'jp-mini': 25.0 * bet
    };
    for (const [id, val] of Object.entries(ids)) {
      const el = document.getElementById(id);
      if (el) el.innerText = `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
  }

  _updatePotsUI() {
    for (let p = 0; p < 4; p++) {
      const pLevel = this.engine.potPowers[p];
      const fillEl = document.getElementById(`pot-${p}-fill`);
      const valEl = document.getElementById(`pot-${p}-power-val`);
      const cardEl = document.getElementById(`pot-card-${p}`);

      // Bonus unlocking progression:
      // Pot 0: Elephant (Lock & Slingo) -> Stage 0 (always unlocked)
      // Pot 1: Tiger (Apex Spins) -> Stage 1
      // Pot 2: Rhino (Colossal Spins) -> Stage 2
      // Pot 3: Gorilla (Primal Zone) -> Stage 3
      const isLocked = this.engine.stageIndex < p;

      if (isLocked) {
        if (cardEl) {
          cardEl.classList.add('pot-locked');
          cardEl.classList.remove('high-power', 'max-power');
          cardEl.title = `Pot ${p + 1}: Unlocks at Stage ${p}`;
        }
        if (fillEl) fillEl.style.width = '0%';
        if (valEl) valEl.innerText = `🔒 Stg ${p}`;
      } else {
        if (cardEl) {
          cardEl.classList.remove('pot-locked');
          cardEl.classList.toggle('high-power', pLevel >= 8);
          cardEl.classList.toggle('max-power', pLevel >= 12);
          cardEl.title = `Pot ${p + 1}: Active (Power ${pLevel}/12)`;
        }
        if (fillEl) fillEl.style.width = `${(pLevel / 12) * 100}%`;
        if (valEl) valEl.innerText = `${pLevel}/12`;
      }
    }
  }

  _updateStageTotemUI() {
    const stage = this.engine.getCurrentStage();
    const stageTag = document.getElementById('totem-stage-tag');
    const spinMeter = document.getElementById('totem-spin-meter');
    const fillEl = document.getElementById('totem-fill-bar');
    const nextDescEl = document.getElementById('totem-next-desc');

    if (stageTag) stageTag.innerText = `STAGE ${this.engine.stageIndex}`;
    if (spinMeter) spinMeter.innerText = `${this.engine.spinsInCurrentStage} / ${stage.spins} SPINS`;
    if (fillEl) {
      const pct = Math.min(100, (this.engine.spinsInCurrentStage / stage.spins) * 100);
      fillEl.style.width = `${pct}%`;
    }

    // Next Stage Unlock feature mapping (prominently displayed)
    const nextUnlockMap = {
      0: "Bonus 2: Apex Spins (Tiger)",
      1: "Bonus 3: Colossal Spins (Rhino)",
      2: "Bonus 4: Primal Zone (Gorilla)",
      3: "Titan Stampede Spin",
      4: "Guaranteed Bonus Minimums",
      5: "Primal Ascendancy Max Boost",
      6: "Ascendancy Boost (Every 100 Spins)"
    };
    const nextUnlock = nextUnlockMap[this.engine.stageIndex] || "Max Stage Reached!";
    if (nextDescEl) nextDescEl.innerText = nextUnlock;
  }

  _renderInitialReels() {
    this._renderScreenGrid(this.currentScreen, this.isCurrentColossal, this.currentColossalAnimal);
  }

  _renderScreenGrid(screenSymbols, isColossal = false, colossalAnimal = 'elephant') {
    const gridContainer = document.getElementById('reels-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    const gridH = gridContainer.clientHeight || 364;
    const cellH = gridH / 3;
    gridContainer.style.setProperty('--cell-h', `${cellH}px`);

    if (isColossal) {
      // Reel 0 (Left standard reel)
      const leftCol = document.createElement('div');
      leftCol.className = 'reel-column reel-0';
      leftCol.id = 'reel-col-0';
      const leftTrack = document.createElement('div');
      leftTrack.className = 'reel-strip-track';
      leftTrack.id = 'reel-track-0';
      for (let row = 0; row < 3; row++) {
        leftTrack.appendChild(this._createSymbolElement(screenSymbols[0][row], 0, row));
      }
      leftCol.appendChild(leftTrack);
      gridContainer.appendChild(leftCol);

      // Colossal Center Block (Reels 1, 2, 3 merged)
      const centerColossal = document.createElement('div');
      centerColossal.className = 'colossal-block-wrapper';
      centerColossal.id = 'colossal-block';
      const colossalTrack = document.createElement('div');
      colossalTrack.className = 'colossal-strip-track';
      colossalTrack.id = 'colossal-track';
      colossalTrack.innerHTML = `
        <div class="colossal-inner-frame">
          <img src="assets/colossal_${colossalAnimal}.jpg" alt="Colossal ${colossalAnimal}" class="colossal-img" />
          <div class="colossal-flame-halo"></div>
        </div>
      `;
      centerColossal.appendChild(colossalTrack);
      gridContainer.appendChild(centerColossal);

      // Reel 4 (Right standard reel)
      const rightCol = document.createElement('div');
      rightCol.className = 'reel-column reel-4';
      rightCol.id = 'reel-col-4';
      const rightTrack = document.createElement('div');
      rightTrack.className = 'reel-strip-track';
      rightTrack.id = 'reel-track-4';
      for (let row = 0; row < 3; row++) {
        rightTrack.appendChild(this._createSymbolElement(screenSymbols[4][row], 4, row));
      }
      rightCol.appendChild(rightTrack);
      gridContainer.appendChild(rightCol);
    } else {
      // Standard 5 reels
      for (let r = 0; r < 5; r++) {
        const reelCol = document.createElement('div');
        reelCol.className = `reel-column reel-${r}`;
        reelCol.id = `reel-col-${r}`;
        const track = document.createElement('div');
        track.className = 'reel-strip-track';
        track.id = `reel-track-${r}`;
        for (let row = 0; row < 3; row++) {
          track.appendChild(this._createSymbolElement(screenSymbols[r][row], r, row));
        }
        reelCol.appendChild(track);
        gridContainer.appendChild(reelCol);
      }
    }
  }

  _createSymbolElement(symId, reel, row, cashVal = null) {
    const el = document.createElement('div');
    el.className = `slot-cell sym-${symId}`;
    el.dataset.reel = reel;
    el.dataset.row = row;

    if (symId === 14) { // Fire Core
      const displayVal = cashVal !== null ? cashVal : (this.engine.currentBet * 15.0);
      el.innerHTML = `
        <div class="fire-core-wrapper">
          <img src="assets/sym_fire_core.svg" class="fire-orb-img" alt="Fire Core" />
          <div class="fire-badge-container">
            <span class="badge-val">$${displayVal.toFixed(2)}</span>
          </div>
        </div>
      `;
    } else if (symId === 9) { // Elephant Collector
      el.innerHTML = `
        <div class="collector-wrapper">
          <img src="assets/sym_collector.svg" class="collector-img" alt="Elephant Collector" />
          <div class="collector-aura"></div>
        </div>
      `;
    } else if (symId >= 10 && symId <= 13) { // 4 Pot Trigger Coins
      // Bonus 1: Elephant (0), Bonus 2: Tiger (1), Bonus 3: Rhino (2), Bonus 4: Gorilla (3)
      const animalMap = ['elephant', 'tiger', 'rhino', 'gorilla'];
      const potIndex = symId - 10;
      const animal = animalMap[potIndex];
      const isLocked = this.engine.stageIndex < potIndex;

      el.innerHTML = `
        <div class="pot-coin-wrapper ${isLocked ? 'pot-coin-locked' : ''}" title="${animal.toUpperCase()} Pot Trigger ${isLocked ? '(Locked - Unlocks Stage ' + potIndex + ')' : ''}">
          <img src="assets/sym_pot_${animal}.svg" class="pot-coin-img" alt="${animal} Pot Trigger" />
        </div>
      `;
    } else if (symId === 8) { // Wild
      el.innerHTML = `
        <div class="wild-wrapper">
          <img src="assets/sym_wild.svg" class="wild-img" alt="Wild" />
        </div>
      `;
    } else {
      // Standard symbols: Realistic Animal Facial Portraits (H1..H4) & Low Card Suits
      const symImgMap = {
        0: 'sym_spade.svg',
        1: 'sym_heart.svg',
        2: 'sym_club.svg',
        3: 'sym_diamond.svg',
        4: 'sym_rhino.jpg',    // H4 Prehistoric Magma Rhino
        5: 'sym_gorilla.jpg',  // H3 Silverback Fire Gorilla
        6: 'sym_tiger.jpg',    // H2 Royal Bengal Tiger
        7: 'sym_elephant.jpg'  // H1 Ancient Golden Elephant
      };
      const imgSrc = symImgMap[symId] || 'sym_elephant.jpg';
      el.innerHTML = `<img src="assets/${imgSrc}" class="sym-img" alt="Symbol ${symId}" />`;
    }

    return el;
  }

  async handleSpin(options = {}) {
    if (this.isSpinning) return;
    this.isSpinning = true;

    // Clear previous paylines, win display, and collector badges
    this._clearPaylines();
    document.querySelectorAll('.collector-total-badge').forEach(b => b.remove());
    const winValEl = document.getElementById('win-val');
    if (winValEl) winValEl.innerText = '$0.00';

    const spinBtn = document.getElementById('spin-btn');
    if (spinBtn) spinBtn.disabled = true;

    // Run Engine Math
    const result = this.engine.spin(options);

    // Audio cue
    if (this.audio) this.audio.playSpin();

    // Smooth physical reel strip spinning animation with elastic deceleration
    await this._animateReels(result);

    // Screen shake if Colossal block landed
    if (result.isColossalSpin) {
      this._showBannerMessage(`COLOSSAL ${result.colossalAnimal.toUpperCase()} TITAN LANDED!`);
    }

    // Check Stampede Spin animation
    if (result.isStampedeSpin) {
      this._showBannerMessage(`🐘 ELEPHANT STAMPEDE ACTIVE! +${result.stampedeAddedCount} POT COINS DROPPED!`);
      if (this.audio) this.audio.playColossalRoar();
      await new Promise(r => setTimeout(r, 600));
    }

    // Check Ground Stomp / Fire Core collection
    if (result.collectorTriggered && result.fireCoreCells && result.fireCoreCells.length > 0) {
      const collectorCells = [];
      for (let row = 0; row < 3; row++) {
        if (result.screenSymbols[0] && result.screenSymbols[0][row] === 9) collectorCells.push({ r: 0, row });
        if (result.screenSymbols[4] && result.screenSymbols[4][row] === 9) collectorCells.push({ r: 4, row });
      }
      if (collectorCells.length > 0) {
        await this._animateGroundStomp(result, collectorCells);
      }
    }

    // Check Pot Trigger Coins flight (all pot coins fly to top pots and leave blank)
    await this._animatePotCoinsFlight(result);

    // Check Direct Jackpot Wheel Award
    if (result.jackpotWon) {
      await this._showJackpotAward(result.jackpotWon);
    }

    // Highlight Payline Wins
    if (result.lineWins.length > 0) {
      this._highlightLineWins(result.lineWins);
      if (this.audio) this.audio.playLineWin();
    }

    // Update Totem & Pots UI
    this._updateStageTotemUI();
    this._updatePotsUI();
    this._updateHUD();

    // Animate Win Counter
    if (result.totalSpinWin > 0) {
      this._animateWinCounter(result.totalSpinWin);
    }

    // Check Stage Advance & Feature Unlock Notification
    if (result.stageJustUnlocked) {
      this._showStageUnlockNotification(result.stageJustUnlocked);
    }

    // Check Pot Bonuses Trigger
    if (result.triggeredPotBonuses.length > 0) {
      await this._launchPotBonuses(result.triggeredPotBonuses);
    }

    // Spin Complete
    this.isSpinning = false;
    if (spinBtn) spinBtn.disabled = false;

    // Check Auto Spin loop
    if (this.autoSpinsRemaining > 0) {
      this.autoSpinsRemaining--;
      const autoBtn = document.getElementById('btn-auto');
      if (autoBtn) autoBtn.innerText = `STOP (${this.autoSpinsRemaining})`;

      if (this.autoSpinsRemaining > 0) {
        setTimeout(() => this.handleSpin(), this.isTurbo ? 300 : 900);
      } else {
        if (autoBtn) {
          autoBtn.innerText = 'AUTO SPIN';
          autoBtn.classList.remove('active');
        }
      }
    }
  }

  async _animateReels(result) {
    const gridContainer = document.getElementById('reels-grid');
    if (!gridContainer) return;

    const isColossal = result.isColossalSpin;
    const colossalAnimal = result.colossalAnimal;

    // If colossal layout changed between spins, rebuild container layout
    if (isColossal !== this.isCurrentColossal) {
      this._renderScreenGrid(this.currentScreen, isColossal, colossalAnimal);
      this.isCurrentColossal = isColossal;
    }

    // Compute exact cell height for pixel-perfect strip alignment
    const gridH = gridContainer.clientHeight || 364;
    const cellH = gridH / 3;
    gridContainer.style.setProperty('--cell-h', `${cellH}px`);

    const promises = [];

    if (isColossal) {
      // Reel 0 (Left standard reel)
      const dur0 = this.isTurbo ? 200 : 500;
      promises.push(this._spinReelStrip(0, result.screenSymbols[0], cellH, dur0, result.fireCoreCells));

      // Colossal Center Block (Reels 1, 2, 3)
      const durColossal = this.isTurbo ? 320 : 850;
      promises.push(this._spinColossalBlock(colossalAnimal, cellH, durColossal));

      // Reel 4 (Right standard reel)
      const dur4 = this.isTurbo ? 440 : 1200;
      promises.push(this._spinReelStrip(4, result.screenSymbols[4], cellH, dur4, result.fireCoreCells));
    } else {
      // 5 standard reels with staggered stop times (authentic casino feel)
      const baseDuration = this.isTurbo ? 180 : 500;
      const stagger = this.isTurbo ? 70 : 180;

      for (let r = 0; r < 5; r++) {
        const duration = baseDuration + r * stagger;
        promises.push(this._spinReelStrip(r, result.screenSymbols[r], cellH, duration, result.fireCoreCells));
      }
    }

    await Promise.all(promises);

    // Save state
    this.currentScreen = result.screenSymbols;
    this.currentColossalAnimal = colossalAnimal;
  }

  _spinReelStrip(r, targetSymbols, cellH, duration, fireCoreCells = []) {
    return new Promise(resolve => {
      const reelCol = document.getElementById(`reel-col-${r}`);
      if (!reelCol) {
        resolve();
        return;
      }

      let track = reelCol.querySelector('.reel-strip-track');
      if (!track) {
        track = document.createElement('div');
        track.className = 'reel-strip-track';
        track.id = `reel-track-${r}`;
        reelCol.appendChild(track);
      }

      // Previous 3 visible symbols on this reel
      const prevSymbols = (this.currentScreen && this.currentScreen[r]) || [0, 1, 2];

      // Assemble strip:
      // Index 0, 1, 2: target landed symbols
      // Index 3..17: 15 randomized buffer symbols for smooth downward blur strip
      // Index 18, 19, 20: previous symbols matching current view exactly
      const stripFrag = document.createDocumentFragment();

      // Target landed cells (0..2)
      for (let row = 0; row < 3; row++) {
        const symId = targetSymbols[row];
        const fc = fireCoreCells ? fireCoreCells.find(f => f.r === r && f.row === row) : null;
        const cell = this._createSymbolElement(symId, r, row, fc ? fc.cashWin : null);
        stripFrag.appendChild(cell);
      }

      // Buffer symbols (3..17) - sanitized so locked pot coins never appear in spin strips
      const bufferPool = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
      const bufferCount = 15;
      for (let b = 0; b < bufferCount; b++) {
        const rndSym = bufferPool[Math.floor(Math.random() * bufferPool.length)];
        const cleanSym = this.engine._sanitizeSymbolForStage(rndSym, this.engine.stageIndex);
        const bufCell = this._createSymbolElement(cleanSym, r, -1);
        stripFrag.appendChild(bufCell);
      }

      // Previous visible cells (18..20)
      for (let row = 0; row < 3; row++) {
        const symId = prevSymbols[row];
        const cell = this._createSymbolElement(symId, r, row);
        stripFrag.appendChild(cell);
      }

      track.innerHTML = '';
      track.appendChild(stripFrag);

      // Start position: showing the bottom 3 symbols (previous symbols)
      const offsetCount = bufferCount + 3; // 18 items
      const startY = -offsetCount * cellH;

      track.style.transition = 'none';
      track.style.transform = `translate3d(0, ${startY}px, 0)`;
      track.classList.add('spinning');

      // Force reflow
      void track.offsetHeight;

      // Start downward spin with elastic physical bounce deceleration
      track.style.transition = `transform ${duration}ms cubic-bezier(0.12, 0.85, 0.28, 1.15)`;
      track.style.transform = 'translate3d(0, 0px, 0)';

      setTimeout(() => {
        // Landing audio effects
        if (this.audio) {
          this.audio.playReelStop(r);
          // Check if fire core landed on this reel
          if (targetSymbols.includes(14)) this.audio.playFireCoreLand();
          // Check if pot coin landed on this reel
          if (targetSymbols.some(s => s >= 10 && s <= 13)) this.audio.playPotDing();
        }

        track.classList.remove('spinning');
        track.style.transition = 'none';

        // Trim track down to only the 3 landed symbols to keep DOM lightweight
        while (track.children.length > 3) {
          track.removeChild(track.lastChild);
        }

        // Ensure landed cells have exact IDs and data attributes
        for (let row = 0; row < 3; row++) {
          const child = track.children[row];
          if (child) {
            child.id = `cell-${r}-${row}`;
            child.dataset.reel = r;
            child.dataset.row = row;
          }
        }

        resolve();
      }, duration);
    });
  }

  _spinColossalBlock(targetAnimal, cellH, duration) {
    return new Promise(resolve => {
      const blockWrapper = document.getElementById('colossal-block');
      if (!blockWrapper) {
        resolve();
        return;
      }

      let track = blockWrapper.querySelector('.colossal-strip-track');
      if (!track) {
        track = document.createElement('div');
        track.className = 'colossal-strip-track';
        track.id = 'colossal-track';
        blockWrapper.appendChild(track);
      }

      const beasts = ['rhino', 'tiger', 'gorilla', 'elephant'];
      const prevAnimal = this.currentColossalAnimal || 'elephant';

      // Build colossal vertical strip: Target + intermediate slabs + Previous
      track.innerHTML = `
        <div class="colossal-inner-frame">
          <img src="assets/colossal_${targetAnimal}.jpg" alt="Colossal ${targetAnimal}" class="colossal-img" />
          <div class="colossal-flame-halo"></div>
        </div>
        <div class="colossal-inner-frame">
          <img src="assets/colossal_${beasts[(beasts.indexOf(targetAnimal) + 1) % beasts.length]}.jpg" alt="Colossal Beast" class="colossal-img" />
        </div>
        <div class="colossal-inner-frame">
          <img src="assets/colossal_${beasts[(beasts.indexOf(targetAnimal) + 2) % beasts.length]}.jpg" alt="Colossal Beast" class="colossal-img" />
        </div>
        <div class="colossal-inner-frame">
          <img src="assets/colossal_${prevAnimal}.jpg" alt="Colossal ${prevAnimal}" class="colossal-img" />
        </div>
      `;

      const blockH = cellH * 3;
      const startY = -3 * blockH;

      track.style.transition = 'none';
      track.style.transform = `translate3d(0, ${startY}px, 0)`;
      track.classList.add('spinning');

      void track.offsetHeight;

      // Drop and stomp with elastic bounce
      track.style.transition = `transform ${duration}ms cubic-bezier(0.12, 0.85, 0.28, 1.15)`;
      track.style.transform = 'translate3d(0, 0px, 0)';

      setTimeout(() => {
        if (this.audio) {
          this.audio.playElephantStomp();
          this.audio.playColossalRoar();
        }
        this._triggerScreenShake(500);

        track.classList.remove('spinning');
        track.style.transition = 'none';

        // Keep only top landed frame
        while (track.children.length > 1) {
          track.removeChild(track.lastChild);
        }

        resolve();
      }, duration);
    });
  }

  async _animateGroundStomp(result, collectorCells = []) {
    this._showBannerMessage(`🔥 GROUND STOMP! ELEPHANT COLLECTED $${result.collectionWin.toFixed(2)} CASH CORES!`);
    if (this.audio) {
      this.audio.playElephantStomp();
      setTimeout(() => this.audio.playColossalRoar(), 200);
    }
    this._triggerScreenShake(700);

    // Initial stomp shock on collectors
    collectorCells.forEach(col => {
      const colEl = document.getElementById(`cell-${col.r}-${col.row}`);
      if (colEl) {
        const wrap = colEl.querySelector('.collector-wrapper');
        if (wrap) wrap.classList.add('stomp-pulse');
      }
    });

    await new Promise(r => setTimeout(r, 300));

    // Make all cash Fire Cores fly to the collectors and leave blank behind on the reels
    await this.flyingAnimator.animateFireCoresCollection(
      result.fireCoreCells,
      collectorCells,
      this.audio,
      this.isTurbo
    );

    // Calculate amount gathered by each collector symbol
    const sumCoreMultiplier = result.fireCoreCells.reduce((acc, c) => acc + c.value, 0);
    const collectorTotalVal = sumCoreMultiplier * this.engine.currentBet;

    collectorCells.forEach(col => {
      const colEl = document.getElementById(`cell-${col.r}-${col.row}`);
      if (colEl) {
        const wrap = colEl.querySelector('.collector-wrapper');
        if (wrap) wrap.classList.remove('stomp-pulse');

        // Render prominent total collected badge on top of the collector symbol
        const prevBadge = colEl.querySelector('.collector-total-badge');
        if (prevBadge) prevBadge.remove();

        const badge = document.createElement('div');
        badge.className = 'collector-total-badge';
        badge.innerHTML = `
          <span class="collector-badge-title">COLLECTED</span>
          <span class="collector-badge-val">+$${collectorTotalVal.toFixed(2)}</span>
        `;
        colEl.appendChild(badge);
      }
    });
  }

  async _animatePotCoinsFlight(result) {
    const landedPotCoins = [];
    for (let r = 0; r < 5; r++) {
      if (result.isColossalSpin && r >= 1 && r <= 3) continue;
      for (let row = 0; row < 3; row++) {
        const symId = result.screenSymbols[r] ? result.screenSymbols[r][row] : null;
        if (symId >= 10 && symId <= 13) {
          const potIndex = symId - 10;
          if (potIndex <= this.engine.stageIndex) {
            landedPotCoins.push({ r, row, potIndex, symbolId: symId });
          }
        }
      }
    }

    // Include stampede added coins if any (only for unlocked pots)
    if (result.stampedeAddedPots && result.stampedeAddedPots.length > 0) {
      result.stampedeAddedPots.forEach(p => {
        if (p.potType <= this.engine.stageIndex && !landedPotCoins.some(c => c.r === p.r && c.row === p.row)) {
          landedPotCoins.push({ r: p.r, row: p.row, potIndex: p.potType, symbolId: p.symbolId });
        }
      });
    }

    if (landedPotCoins.length > 0) {
      await this.flyingAnimator.animatePotCoinsFlight(landedPotCoins, this.audio, this.isTurbo);
    }
  }

  async _showJackpotAward(jackpot) {
    if (this.audio) this.audio.playJackpotFanfare();
    const val = jackpot.multiplier * this.engine.currentBet;
    this._showBannerMessage(`🏆 ${jackpot.name.toUpperCase()} JACKPOT WON! +$${val.toFixed(2)}!`);
    this._triggerScreenShake(800);
    await new Promise(r => setTimeout(r, 1500));
  }

  async _launchPotBonuses(triggeredList) {
    for (const item of triggeredList) {
      // Bonus must be unlocked to trigger
      if (item.potIndex > this.engine.stageIndex) continue;
      this._showBannerMessage(`⚡ ${item.name.toUpperCase()} BONUS TRIGGERED! (POWER LEVEL ${item.power})`);
      if (this.audio) this.audio.playJackpotFanfare();
      await new Promise(r => setTimeout(r, 1000));

      await new Promise(resolve => {
        if (item.potIndex === 0) {
          // Bonus 1: Elephant Lock & Slingo
          this.lockSlingo.start(item.power, this.engine.currentBet, (win) => {
            this.engine.balance += win;
            this._updateHUD();
            this._animateWinCounter(win);
            resolve();
          });
        } else if (item.potIndex === 1) {
          // Bonus 2: Tiger Apex Spins
          this.apexSpins.start(item.power, this.engine.currentBet, (win) => {
            this.engine.balance += win;
            this._updateHUD();
            this._animateWinCounter(win);
            resolve();
          });
        } else if (item.potIndex === 2) {
          // Bonus 3: Rhino Colossal Spins
          this.colossalSpins.start(item.power, this.engine.currentBet, (win) => {
            this.engine.balance += win;
            this._updateHUD();
            this._animateWinCounter(win);
            resolve();
          });
        } else if (item.potIndex === 3) {
          // Bonus 4: Gorilla Primal Zone
          this.primalZone.start(item.power, this.engine.currentBet, (win) => {
            this.engine.balance += win;
            this._updateHUD();
            this._animateWinCounter(win);
            resolve();
          });
        } else {
          resolve();
        }
      });
    }
  }

  _highlightLineWins(lineWins) {
    const svgOverlay = document.getElementById('paylines-svg');
    if (!svgOverlay) return;
    svgOverlay.innerHTML = '';

    lineWins.forEach((lw, idx) => {
      const color = ['#ffcc00', '#ff4444', '#00ffcc', '#ff00ff', '#44ff44'][idx % 5];
      let pathStr = '';

      lw.coords.forEach((coord, i) => {
        const cell = document.querySelector(`.slot-cell[data-reel="${coord.r}"][data-row="${coord.row}"]`);
        if (cell) {
          cell.classList.add('win-cell');
          const rect = cell.getBoundingClientRect();
          const gridRect = svgOverlay.getBoundingClientRect();
          const x = rect.left - gridRect.left + rect.width / 2;
          const y = rect.top - gridRect.top + rect.height / 2;

          if (i === 0) pathStr += `M ${x} ${y} `;
          else pathStr += `L ${x} ${y} `;
        }
      });

      if (pathStr) {
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathStr);
        path.setAttribute('stroke', color);
        path.setAttribute('stroke-width', '4');
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('class', 'payline-anim');
        svgOverlay.appendChild(path);
      }
    });
  }

  _clearPaylines() {
    const svgOverlay = document.getElementById('paylines-svg');
    if (svgOverlay) svgOverlay.innerHTML = '';
    document.querySelectorAll('.slot-cell').forEach(c => c.classList.remove('win-cell'));
  }

  _animateWinCounter(totalWin) {
    const winEl = document.getElementById('win-val');
    if (!winEl) return;
    const duration = 600;
    const start = performance.now();

    const update = (now) => {
      const elapsed = Math.max(0, now - start);
      const progress = Math.min(1, elapsed / duration);
      const current = Math.max(0, totalWin * progress);
      winEl.innerText = `$${current.toFixed(2)}`;
      if (this.audio && progress < 1) this.audio.playCountUpTick();

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        winEl.innerText = `$${totalWin.toFixed(2)}`;
        winEl.classList.add('win-pulse');
        setTimeout(() => winEl.classList.remove('win-pulse'), 400);
      }
    };
    requestAnimationFrame(update);
  }

  _triggerScreenShake(duration = 400) {
    const appEl = document.getElementById('app-root');
    if (appEl) {
      appEl.classList.add('screen-shake');
      setTimeout(() => appEl.classList.remove('screen-shake'), duration);
    }
  }

  _showBannerMessage(msg) {
    const banner = document.getElementById('status-banner');
    if (banner) {
      banner.innerText = msg;
      banner.classList.add('banner-glow');
      setTimeout(() => banner.classList.remove('banner-glow'), 1200);
    }
  }

  _showStageUnlockNotification(stageInfo) {
    const toast = document.getElementById('stage-unlock-toast');
    const toastTitle = document.getElementById('toast-stage-num');
    const toastDesc = document.getElementById('toast-feature-desc');

    if (toastTitle) toastTitle.innerText = `STAGE ${stageInfo.stageIndex}: ${stageInfo.title.toUpperCase()}`;
    if (toastDesc) toastDesc.innerText = `🔓 UNLOCKED: ${stageInfo.unlock}`;

    if (toast) {
      toast.classList.remove('hidden');
      toast.classList.add('toast-active');
      setTimeout(() => {
        toast.classList.remove('toast-active');
        toast.classList.add('hidden');
      }, 4000);
    }

    this._showBannerMessage(`⭐ STAGE ${stageInfo.stageIndex} UNLOCKED: ${stageInfo.title.toUpperCase()} — ${stageInfo.unlock.toUpperCase()}! ⭐`);
    if (this.audio) this.audio.playJackpotFanfare();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new PrimalApp();
  window.app.init();
});
