/**
 * Fire Primal Elephant™ - Playable Web Prototype
 * Main UI Controller & Lifecycle Coordinator
 */
import { GAME_CONFIG } from './config.js';
import { PrimalEngine } from './engine.js';
import { PrimalAudio } from './audio.js';
import { LockSlingoModal } from './bonus/lockSlingo.js';
import { ApexSpinsModal } from './bonus/apexSpins.js';
import { ColossalSpinsModal } from './bonus/colossalSpins.js';
import { PrimalZoneModal } from './bonus/primalZone.js';

class PrimalApp {
  constructor() {
    this.engine = new PrimalEngine(GAME_CONFIG);
    this.audio = new PrimalAudio();
    this.lockSlingo = new LockSlingoModal(this.audio);
    this.apexSpins = new ApexSpinsModal(this.audio);
    this.colossalSpins = new ColossalSpinsModal(this.audio);
    this.primalZone = new PrimalZoneModal(this.audio);

    this.isSpinning = false;
    this.isTurbo = false;
    this.autoSpinsRemaining = 0;
    this.activeLineTimeout = null;

    this.bets = [1.00, 2.00, 5.00, 10.00, 20.00, 50.00, 100.00];
    this.currentBetIndex = 3; // $10.00 default
    this.engine.currentBet = this.bets[this.currentBetIndex];
  }

  init() {
    this._bindEvents();
    this._renderInitialReels();
    this._updateHUD();
    this._updatePotsUI();
    this._updateStageTotemUI();
    this._updateJackpotsUI();
    console.log('Fire Primal Elephant™ Prototype initialized successfully.');
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
    bindClick('cheat-colossal-elephant', () => this.handleSpin({ forceColossal: true, colossalAnimal: 'elephant' }));
    bindClick('cheat-colossal-tiger', () => this.handleSpin({ forceColossal: true, colossalAnimal: 'tiger' }));
    bindClick('cheat-colossal-rhino', () => this.handleSpin({ forceColossal: true, colossalAnimal: 'rhino' }));
    bindClick('cheat-colossal-gorilla', () => this.handleSpin({ forceColossal: true, colossalAnimal: 'gorilla' }));

    bindClick('cheat-pot-1', () => this.handleSpin({ forcePotBonus: 0 }));
    bindClick('cheat-pot-2', () => this.handleSpin({ forcePotBonus: 1 }));
    bindClick('cheat-pot-3', () => this.handleSpin({ forcePotBonus: 2 }));
    bindClick('cheat-pot-4', () => this.handleSpin({ forcePotBonus: 3 }));

    bindClick('cheat-stampede', () => this.handleSpin({ forceStampede: true }));
    bindClick('cheat-jackpot', () => this.handleSpin({ forceJackpot: true }));

    // Stage Selector dropdown
    const stageSelect = document.getElementById('cheat-stage-select');
    if (stageSelect) {
      stageSelect.addEventListener('change', (e) => {
        const val = parseInt(e.target.value, 10);
        this.engine.setStage(val);
        this._updateStageTotemUI();
        this._showBannerMessage(`STAGE JUMPED TO ${this.engine.getCurrentStage().stage.toUpperCase()}: ${this.engine.getCurrentStage().title}`);
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

      if (fillEl) fillEl.style.width = `${(pLevel / 12) * 100}%`;
      if (valEl) valEl.innerText = `${pLevel}/12`;
      if (cardEl) {
        cardEl.classList.toggle('high-power', pLevel >= 8);
        cardEl.classList.toggle('max-power', pLevel >= 12);
      }
    }
  }

  _updateStageTotemUI() {
    const stage = this.engine.getCurrentStage();
    const stageTag = document.getElementById('totem-stage-tag');
    const spinMeter = document.getElementById('totem-spin-meter');
    const fillEl = document.getElementById('totem-fill-bar');
    const unlockEl = document.getElementById('totem-unlock-desc');

    if (stageTag) stageTag.innerText = `STAGE ${this.engine.stageIndex}`;
    if (spinMeter) spinMeter.innerText = `${this.engine.spinsInCurrentStage} / ${stage.spins}`;
    if (fillEl) {
      const pct = Math.min(100, (this.engine.spinsInCurrentStage / stage.spins) * 100);
      fillEl.style.width = `${pct}%`;
    }
    if (unlockEl) unlockEl.innerText = stage.unlock;
  }

  _renderInitialReels() {
    // Initial attractive presentation grid matching screenshot (Elephant colossal in center!)
    const initialScreen = [
      [0, 1, 14], // Reel 0: Spade, Heart, Fire Core
      [7, 7, 7],  // Reels 1, 2, 3: Colossal Elephant
      [7, 7, 7],
      [7, 7, 7],
      [14, 2, 3]  // Reel 4: Fire Core, Club, Diamond
    ];
    this._renderScreenGrid(initialScreen, true, 'elephant');
  }

  _renderScreenGrid(screenSymbols, isColossal = false, colossalAnimal = 'elephant') {
    const gridContainer = document.getElementById('reels-grid');
    if (!gridContainer) return;
    gridContainer.innerHTML = '';

    if (isColossal) {
      // 3-section layout: Reel 0, Colossal Center 3x3, Reel 4
      const leftCol = document.createElement('div');
      leftCol.className = 'reel-column reel-0';
      for (let row = 0; row < 3; row++) {
        leftCol.appendChild(this._createSymbolElement(screenSymbols[0][row], 0, row));
      }
      gridContainer.appendChild(leftCol);

      const centerColossal = document.createElement('div');
      centerColossal.className = 'colossal-block-wrapper';
      centerColossal.innerHTML = `
        <div class="colossal-inner-frame">
          <img src="assets/colossal_${colossalAnimal}.svg" alt="Colossal ${colossalAnimal}" class="colossal-img" />
          <div class="colossal-flame-halo"></div>
        </div>
      `;
      gridContainer.appendChild(centerColossal);

      const rightCol = document.createElement('div');
      rightCol.className = 'reel-column reel-4';
      for (let row = 0; row < 3; row++) {
        rightCol.appendChild(this._createSymbolElement(screenSymbols[4][row], 4, row));
      }
      gridContainer.appendChild(rightCol);
    } else {
      // Standard 5 reels
      for (let r = 0; r < 5; r++) {
        const reelCol = document.createElement('div');
        reelCol.className = `reel-column reel-${r}`;
        reelCol.id = `reel-col-${r}`;
        for (let row = 0; row < 3; row++) {
          reelCol.appendChild(this._createSymbolElement(screenSymbols[r][row], r, row));
        }
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
    } else if (symId === 9) { // Collector
      el.innerHTML = `
        <div class="collector-wrapper">
          <img src="assets/sym_collector.svg" class="collector-img" alt="Elephant Collector" />
          <div class="collector-aura"></div>
        </div>
      `;
    } else if (symId >= 10 && symId <= 13) { // Pot trigger coins
      const animalMap = ['tiger', 'gorilla', 'elephant', 'rhino'];
      const animal = animalMap[symId - 10];
      el.innerHTML = `
        <div class="pot-coin-wrapper">
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
      // Standard symbol
      const symImgMap = {
        0: 'sym_spade.svg',
        1: 'sym_heart.svg',
        2: 'sym_club.svg',
        3: 'sym_diamond.svg',
        4: 'sym_rhino.svg',
        5: 'sym_gorilla.svg',
        6: 'sym_tiger.svg',
        7: 'sym_elephant.svg'
      };
      const imgSrc = symImgMap[symId] || 'sym_elephant.svg';
      el.innerHTML = `<img src="assets/${imgSrc}" class="sym-img" alt="Symbol ${symId}" />`;
    }

    return el;
  }

  async handleSpin(options = {}) {
    if (this.isSpinning) return;
    this.isSpinning = true;

    // Clear previous paylines and win display
    this._clearPaylines();
    const winValEl = document.getElementById('win-val');
    if (winValEl) winValEl.innerText = '$0.00';

    const spinBtn = document.getElementById('spin-btn');
    if (spinBtn) spinBtn.disabled = true;

    // Run Engine Math
    const result = this.engine.spin(options);

    // Audio cue
    if (this.audio) this.audio.playSpin();

    // Visual Reel Spinning
    const gridWrapper = document.getElementById('reels-wrapper');
    if (gridWrapper) gridWrapper.classList.add('reels-spinning');

    const spinDuration = this.isTurbo ? 350 : 800;
    await new Promise(r => setTimeout(r, spinDuration));

    if (gridWrapper) gridWrapper.classList.remove('reels-spinning');

    // Render Landed Symbols
    this._renderScreenGrid(result.screenSymbols, result.isColossalSpin, result.colossalAnimal);

    // Play reel stop sound
    if (this.audio) this.audio.playReelStop(4);

    // Screen shake if Colossal block landed
    if (result.isColossalSpin) {
      if (this.audio) this.audio.playElephantStomp();
      this._triggerScreenShake();
      this._showBannerMessage(`COLOSSAL ${result.colossalAnimal.toUpperCase()} TITAN LANDED!`);
    }

    // Check Stampede Spin animation
    if (result.isStampedeSpin) {
      this._showBannerMessage(`🐘 ELEPHANT STAMPEDE ACTIVE! +${result.stampedeAddedCount} POT COINS DROPPED!`);
      if (this.audio) this.audio.playColossalRoar();
      await new Promise(r => setTimeout(r, 600));
    }

    // Check Ground Stomp / Fire Core collection
    if (result.collectorTriggered) {
      await this._animateGroundStomp(result);
    }

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

    // Check Stage Advance Fanfare
    if (result.spinsInCurrentStage === 1 && result.totalSpins > 1) {
      this._showBannerMessage(`🎉 ADVANCED TO ${this.engine.getCurrentStage().stage.toUpperCase()}: ${this.engine.getCurrentStage().title}!`);
      if (this.audio) this.audio.playJackpotFanfare();
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
        setTimeout(() => this.handleSpin(), this.isTurbo ? 400 : 1200);
      } else {
        if (autoBtn) {
          autoBtn.innerText = 'AUTO SPIN';
          autoBtn.classList.remove('active');
        }
      }
    }
  }

  async _animateGroundStomp(result) {
    this._showBannerMessage(`🔥 GROUND STOMP! ELEPHANT COLLECTED $${result.collectionWin.toFixed(2)} CASH CORES!`);
    if (this.audio) {
      this.audio.playElephantStomp();
      setTimeout(() => this.audio.playColossalRoar(), 200);
    }
    this._triggerScreenShake(700);

    // Pulse collectors and fire cores
    document.querySelectorAll('.collector-wrapper, .fire-core-wrapper').forEach(el => {
      el.classList.add('stomp-pulse');
    });

    await new Promise(r => setTimeout(r, 900));
    document.querySelectorAll('.collector-wrapper, .fire-core-wrapper').forEach(el => {
      el.classList.remove('stomp-pulse');
    });
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
      this._showBannerMessage(`⚡ ${item.name.toUpperCase()} BONUS TRIGGERED! (POWER LEVEL ${item.power})`);
      if (this.audio) this.audio.playJackpotFanfare();
      await new Promise(r => setTimeout(r, 1000));

      await new Promise(resolve => {
        if (item.potIndex === 0) {
          this.lockSlingo.start(item.power, this.engine.currentBet, (win) => {
            this.engine.balance += win;
            this._updateHUD();
            this._animateWinCounter(win);
            resolve();
          });
        } else if (item.potIndex === 1) {
          this.apexSpins.start(item.power, this.engine.currentBet, (win) => {
            this.engine.balance += win;
            this._updateHUD();
            this._animateWinCounter(win);
            resolve();
          });
        } else if (item.potIndex === 2) {
          this.colossalSpins.start(item.power, this.engine.currentBet, (win) => {
            this.engine.balance += win;
            this._updateHUD();
            this._animateWinCounter(win);
            resolve();
          });
        } else if (item.potIndex === 3) {
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
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / duration);
      const current = totalWin * progress;
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
}

window.addEventListener('DOMContentLoaded', () => {
  window.app = new PrimalApp();
  window.app.init();
});
