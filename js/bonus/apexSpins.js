/**
 * Apex Free Spins Bonus Feature
 * Free Spins featuring Tiger Sticky Wild accumulation and climbing top award multiplier targets.
 */
export class ApexSpinsModal {
  constructor(audio) {
    this.audio = audio;
    this.active = false;
  }

  start(power, currentBet, onComplete) {
    this.active = true;
    this.power = power;
    this.bet = currentBet;
    this.onComplete = onComplete;
    this.topMultiplier = 3 + power; // 3x to 15x bet target
    this.totalWin = 0;
    this.spinCount = 0;
    this.stickyWilds = []; // Array of {r, row}

    this._renderModal();
    if (this.audio) this.audio.playColossalRoar();
  }

  _renderModal() {
    let overlay = document.getElementById('apex-spins-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'apex-spins-overlay';
      overlay.className = 'feature-modal-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="slingo-modal-content apex-theme">
        <button id="apex-close-btn" class="modal-close-btn" title="Collect & Return to Game">✕</button>
        <div class="modal-header">
          <div class="modal-title">APEX FREE SPINS</div>
          <div class="modal-subtitle">STICKY TIGER WILDS • TARGET WIN: ${this.topMultiplier}× BET ($${(this.topMultiplier * this.bet).toFixed(2)})</div>
        </div>

        <div class="apex-bonus-body">
          <div class="apex-status-banner">
            SPINS PLAYED: <span id="apex-spin-count">0</span> • STICKY WILDS ACTIVE: <span id="apex-wild-count">0</span>
          </div>
          <div id="apex-grid" class="apex-grid-5x3">
            ${this._renderGridHTML([])}
          </div>
        </div>

        <div class="modal-footer">
          <div class="modal-stat">
            <span class="stat-label">TOTAL BONUS ACCUMULATION</span>
            <span id="apex-total-win" class="stat-value win-glow">$0.00</span>
          </div>
          <button id="apex-auto-btn" class="modal-auto-btn">⚡ QUICK RESOLVE</button>
          <button id="apex-spin-btn" class="modal-action-btn">SPIN APEX</button>
        </div>
      </div>
    `;

    overlay.style.display = 'flex';
    document.getElementById('apex-spin-btn').onclick = () => this._playApexSpin();
    document.getElementById('apex-auto-btn').onclick = () => this._quickResolve();
    document.getElementById('apex-close-btn').onclick = () => this._closeModal();
  }

  _renderGridHTML(screen) {
    let html = '';
    for (let row = 0; row < 3; row++) {
      for (let r = 0; r < 5; r++) {
        const isSticky = this.stickyWilds.some(w => w.r === r && w.row === row);
        const sym = screen.length > 0 ? screen[r][row] : 6; // H2 Tiger
        html += `
          <div class="apex-cell ${isSticky ? 'sticky-wild' : ''}">
            ${isSticky ? '<div class="wild-tag">STICKY WILD</div>' : `<div class="sym-thumb sym-${sym}"></div>`}
          </div>
        `;
      }
    }
    return html;
  }

  _playApexSpin() {
    const btn = document.getElementById('apex-spin-btn');
    if (!btn || btn.disabled) return;
    btn.disabled = true;

    this.spinCount++;
    if (this.audio) this.audio.playSpin();

    // Random new sticky wild chance
    if (Math.random() < 0.45 && this.stickyWilds.length < 15) {
      const r = Math.floor(Math.random() * 5);
      const row = Math.floor(Math.random() * 3);
      if (!this.stickyWilds.some(w => w.r === r && w.row === row)) {
        this.stickyWilds.push({ r, row });
        if (this.audio) this.audio.playColossalRoar();
      }
    }

    // Calculate simulated spin payout with sticky wilds
    const baseMult = (1 + this.stickyWilds.length * 0.8) + (Math.random() * 2);
    const spinWin = baseMult * this.bet;
    this.totalWin += spinWin;

    // Generate mock visual screen
    const screen = [];
    for (let r = 0; r < 5; r++) {
      screen[r] = [];
      for (let row = 0; row < 3; row++) {
        screen[r][row] = Math.random() < 0.3 ? 6 : Math.floor(Math.random() * 5);
      }
    }

    // Update UI
    document.getElementById('apex-grid').innerHTML = this._renderGridHTML(screen);
    document.getElementById('apex-spin-count').innerText = this.spinCount;
    document.getElementById('apex-wild-count').innerText = this.stickyWilds.length;
    document.getElementById('apex-total-win').innerText = `$${this.totalWin.toFixed(2)}`;

    // Termination condition: top multiplier exceeded or minimum 6 spins
    const reachedTarget = (spinWin >= this.topMultiplier * this.bet);
    if ((reachedTarget && this.spinCount >= 4) || this.spinCount >= 10) {
      btn.innerText = 'COLLECT APEX WIN';
      btn.disabled = false;
      btn.onclick = () => this._closeModal();
    } else {
      btn.disabled = false;
    }
  }

  _quickResolve() {
    // Quickly simulate remaining spins
    while (this.spinCount < 10) {
      this.spinCount++;
      if (Math.random() < 0.45 && this.stickyWilds.length < 15) {
        const r = Math.floor(Math.random() * 5);
        const row = Math.floor(Math.random() * 3);
        if (!this.stickyWilds.some(w => w.r === r && w.row === row)) {
          this.stickyWilds.push({ r, row });
        }
      }
      const baseMult = (1 + this.stickyWilds.length * 0.8) + (Math.random() * 2);
      const spinWin = baseMult * this.bet;
      this.totalWin += spinWin;
      if (spinWin >= this.topMultiplier * this.bet && this.spinCount >= 4) break;
    }
    this._closeModal();
  }

  _closeModal() {
    const overlay = document.getElementById('apex-spins-overlay');
    if (overlay) overlay.style.display = 'none';
    this.active = false;
    if (this.onComplete) this.onComplete(this.totalWin);
  }
}
