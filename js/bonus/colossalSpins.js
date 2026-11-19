/**
 * Colossal Free Spins Feature
 * Merges center reels 2, 3, 4 into giant 3x3 Colossal Animal Block for guaranteed payline connections.
 */
export class ColossalSpinsModal {
  constructor(audio) {
    this.audio = audio;
    this.active = false;
  }

  start(power, currentBet, onComplete) {
    this.active = true;
    this.power = power;
    this.bet = currentBet;
    this.onComplete = onComplete;
    this.totalSpins = 8 + power; // 8 to 20 spins
    this.spinsLeft = this.totalSpins;
    this.totalWin = 0;
    this.beasts = ['elephant', 'tiger', 'rhino', 'gorilla'];
    this.currentBeast = 'elephant';

    this._renderModal();
    if (this.audio) this.audio.playElephantStomp();
  }

  _renderModal() {
    let overlay = document.getElementById('colossal-spins-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'colossal-spins-overlay';
      overlay.className = 'feature-modal-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="slingo-modal-content colossal-theme">
        <div class="modal-header">
          <div class="modal-title">COLOSSAL TITAN SPINS</div>
          <div class="modal-subtitle">REELS 2, 3, 4 MERGED INTO 3×3 COLOSSAL BEAST BLOCK • ${this.totalSpins} SPINS</div>
        </div>

        <div class="colossal-bonus-body">
          <div class="colossal-grid-layout">
            <div class="colossal-reel-col reel-left" id="colossal-reel-0">
              <div class="sym-box sym-7"></div>
              <div class="sym-box sym-7"></div>
              <div class="sym-box sym-14"></div>
            </div>

            <div class="colossal-center-block" id="colossal-center-3x3">
              <img id="colossal-beast-img" src="assets/colossal_elephant.svg" alt="Colossal Titan" />
            </div>

            <div class="colossal-reel-col reel-right" id="colossal-reel-4">
              <div class="sym-box sym-7"></div>
              <div class="sym-box sym-8"></div>
              <div class="sym-box sym-9"></div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="modal-stat">
            <span class="stat-label">FREE SPINS REMAINING</span>
            <span id="colossal-spins-left" class="stat-value highlight">${this.spinsLeft} / ${this.totalSpins}</span>
          </div>
          <div class="modal-stat">
            <span class="stat-label">TOTAL ACCUMULATED WIN</span>
            <span id="colossal-total-win" class="stat-value win-glow">$0.00</span>
          </div>
          <button id="colossal-spin-btn" class="modal-action-btn">SPIN COLOSSAL</button>
        </div>
      </div>
    `;

    overlay.style.display = 'flex';
    document.getElementById('colossal-spin-btn').onclick = () => this._playColossalSpin();
  }

  _playColossalSpin() {
    const btn = document.getElementById('colossal-spin-btn');
    if (!btn || btn.disabled) return;
    btn.disabled = true;

    this.spinsLeft--;
    this.currentBeast = this.beasts[Math.floor(Math.random() * this.beasts.length)];

    if (this.audio) {
      this.audio.playSpin();
      setTimeout(() => this.audio.playElephantStomp(), 300);
    }

    // Calculate spin payout: 3x3 block guarantees at least 3-of-a-kind on multiple lines
    const matchMult = (this.currentBeast === 'elephant' ? 4 : 2.5) + (Math.random() * 3);
    const spinWin = matchMult * this.bet;
    this.totalWin += spinWin;

    // Trigger screenshake on colossal impact
    const grid = document.querySelector('.colossal-grid-layout');
    if (grid) {
      grid.classList.add('screen-shake');
      setTimeout(() => grid.classList.remove('screen-shake'), 400);
    }

    // Update beast image
    const beastImg = document.getElementById('colossal-beast-img');
    if (beastImg) {
      beastImg.src = `assets/colossal_${this.currentBeast}.svg`;
    }

    // Update left & right reels
    this._randomizeSideReels();

    // Update stats
    document.getElementById('colossal-spins-left').innerText = `${this.spinsLeft} / ${this.totalSpins}`;
    document.getElementById('colossal-total-win').innerText = `$${this.totalWin.toFixed(2)}`;

    if (this.spinsLeft <= 0) {
      btn.innerText = 'COLLECT COLOSSAL WIN';
      btn.disabled = false;
      btn.onclick = () => this._closeModal();
    } else {
      btn.disabled = false;
    }
  }

  _randomizeSideReels() {
    const syms = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 14];
    ['colossal-reel-0', 'colossal-reel-4'].forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.innerHTML = `
          <div class="sym-box sym-${syms[Math.floor(Math.random() * syms.length)]}"></div>
          <div class="sym-box sym-${syms[Math.floor(Math.random() * syms.length)]}"></div>
          <div class="sym-box sym-${syms[Math.floor(Math.random() * syms.length)]}"></div>
        `;
      }
    });
  }

  _closeModal() {
    const overlay = document.getElementById('colossal-spins-overlay');
    if (overlay) overlay.style.display = 'none';
    this.active = false;
    if (this.onComplete) this.onComplete(this.totalWin);
  }
}
