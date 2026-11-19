/**
 * Primal Zone Bonus Feature
 * 5x5 Grid with dynamic Roaming Primal Zone expanding from 2x2 -> 3x3 -> 4x4 -> 5x5,
 * vacuuming all Fire Core cash multipliers within its glowing zone boundaries!
 */
export class PrimalZoneModal {
  constructor(audio) {
    this.audio = audio;
    this.active = false;
  }

  start(power, currentBet, onComplete) {
    this.active = true;
    this.power = power;
    this.bet = currentBet;
    this.onComplete = onComplete;
    this.totalSpins = 4 + power; // 4 to 16 spins
    this.spinsLeft = this.totalSpins;
    this.zoneSize = 2; // starts 2x2
    this.bananasCollected = 0;
    this.bananasNeeded = 4;
    this.zoneR = 1;
    this.zoneC = 1;
    this.totalWin = 0;

    this._renderModal();
    if (this.audio) this.audio.playColossalRoar();
  }

  _renderModal() {
    let overlay = document.getElementById('primal-zone-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'primal-zone-overlay';
      overlay.className = 'feature-modal-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="slingo-modal-content zone-theme">
        <div class="modal-header">
          <div class="modal-title">PRIMAL ZONE BONUS</div>
          <div class="modal-subtitle">ROAMING HERD ZONE • CURRENT SIZE: ${this.zoneSize}×${this.zoneSize} • ${this.totalSpins} SPINS</div>
        </div>

        <div class="zone-bonus-body">
          <div class="zone-progress-bar">
            <span>EXPANSION TO ${Math.min(5, this.zoneSize + 1)}×${Math.min(5, this.zoneSize + 1)}:</span>
            <div class="zone-meter-fill">
              <div id="zone-fill" style="width: ${(this.bananasCollected / this.bananasNeeded) * 100}%"></div>
            </div>
            <span id="zone-banana-text">${this.bananasCollected} / ${this.bananasNeeded} BANANAS</span>
          </div>

          <div id="zone-grid" class="zone-grid-5x5">
            ${this._renderGridHTML([])}
          </div>
        </div>

        <div class="modal-footer">
          <div class="modal-stat">
            <span class="stat-label">SPINS REMAINING</span>
            <span id="zone-spins-left" class="stat-value highlight">${this.spinsLeft} / ${this.totalSpins}</span>
          </div>
          <div class="modal-stat">
            <span class="stat-label">TOTAL ACCUMULATED CASH</span>
            <span id="zone-total-win" class="stat-value win-glow">$0.00</span>
          </div>
          <button id="zone-spin-btn" class="modal-action-btn">SPIN ZONE</button>
        </div>
      </div>
    `;

    overlay.style.display = 'flex';
    document.getElementById('zone-spin-btn').onclick = () => this._playZoneSpin();
  }

  _renderGridHTML(coins = []) {
    let html = '';
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const inZone = (r >= this.zoneR && r < this.zoneR + this.zoneSize &&
                        c >= this.zoneC && c < this.zoneC + this.zoneSize);
        const coin = coins.find(k => k.r === r && k.c === c);

        html += `
          <div class="zone-cell ${inZone ? 'in-primal-zone' : ''}">
            ${coin ? (coin.type === 'banana' ? '<div class="sym-banana">🍌</div>' : `<div class="mini-fire-core"><span class="core-val">$${(coin.val * this.bet).toFixed(2)}</span></div>`) : ''}
          </div>
        `;
      }
    }
    return html;
  }

  _playZoneSpin() {
    const btn = document.getElementById('zone-spin-btn');
    if (!btn || btn.disabled) return;
    btn.disabled = true;

    this.spinsLeft--;
    if (this.audio) this.audio.playSpin();

    // Roam the zone randomly
    const maxR = 5 - this.zoneSize;
    const maxC = 5 - this.zoneSize;
    this.zoneR = Math.floor(Math.random() * (maxR + 1));
    this.zoneC = Math.floor(Math.random() * (maxC + 1));

    // Scatter 3-5 random coins/bananas on board
    const coins = [];
    const count = 3 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const cr = Math.floor(Math.random() * 5);
      const cc = Math.floor(Math.random() * 5);
      if (!coins.some(x => x.r === cr && x.c === cc)) {
        const isBanana = Math.random() < 0.35;
        coins.push({
          r: cr,
          c: cc,
          type: isBanana ? 'banana' : 'coin',
          val: isBanana ? 0 : [1, 2, 5, 10, 25][Math.floor(Math.random() * 5)]
        });
      }
    }

    // Collect what lands inside the zone!
    let spinCash = 0;
    let bananasThisSpin = 0;
    coins.forEach(item => {
      const inZone = (item.r >= this.zoneR && item.r < this.zoneR + this.zoneSize &&
                      item.c >= this.zoneC && item.c < this.zoneC + this.zoneSize);
      if (inZone) {
        if (item.type === 'banana') {
          bananasThisSpin++;
          this.bananasCollected++;
        } else {
          spinCash += item.val * this.bet;
        }
      }
    });

    if (spinCash > 0) {
      this.totalWin += spinCash;
      if (this.audio) this.audio.playFireCoreLand();
    }

    // Check zone size expansion
    if (this.bananasCollected >= this.bananasNeeded && this.zoneSize < 5) {
      this.zoneSize++;
      this.bananasCollected = 0;
      this.bananasNeeded = Math.max(2, this.bananasNeeded - 1);
      // Re-clamp position
      this.zoneR = Math.min(this.zoneR, 5 - this.zoneSize);
      this.zoneC = Math.min(this.zoneC, 5 - this.zoneSize);
      if (this.audio) this.audio.playElephantStomp();
    }

    // Update UI
    document.getElementById('zone-grid').innerHTML = this._renderGridHTML(coins);
    document.getElementById('zone-spins-left').innerText = `${this.spinsLeft} / ${this.totalSpins}`;
    document.getElementById('zone-total-win').innerText = `$${this.totalWin.toFixed(2)}`;
    document.getElementById('zone-fill').style.width = `${(this.bananasCollected / this.bananasNeeded) * 100}%`;
    document.getElementById('zone-banana-text').innerText = `${this.bananasCollected} / ${this.bananasNeeded} BANANAS`;

    if (this.spinsLeft <= 0) {
      btn.innerText = 'COLLECT PRIMAL ZONE WIN';
      btn.disabled = false;
      btn.onclick = () => this._closeModal();
    } else {
      btn.disabled = false;
    }
  }

  _closeModal() {
    const overlay = document.getElementById('primal-zone-overlay');
    if (overlay) overlay.style.display = 'none';
    this.active = false;
    if (this.onComplete) this.onComplete(this.totalWin);
  }
}
