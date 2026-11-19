/**
 * Lock & Slingo™ Hold & Spin Bonus Feature
 * 5x5 Grid with Hold-and-Spin mechanics, 12-tier Slingo Ladder, and Fire Core cash accumulation.
 */
export class LockSlingoModal {
  constructor(audio) {
    this.audio = audio;
    this.active = false;
  }

  start(power, currentBet, onComplete) {
    this.active = true;
    this.power = power;
    this.bet = currentBet;
    this.onComplete = onComplete;
    this.spinsRemaining = 3;
    this.totalCashWin = 0;
    this.completedSlingos = 0;
    this.grid = Array(5).fill(null).map(() => Array(5).fill(null));

    // Seed 4 initial coins
    for (let i = 0; i < 4; i++) {
      const r = Math.floor(Math.random() * 5);
      const c = Math.floor(Math.random() * 5);
      if (!this.grid[r][c]) {
        const val = this._getRandomCashMultiplier();
        this.grid[r][c] = { val, locked: true };
        this.totalCashWin += val * this.bet;
      }
    }

    this._renderModal();
    if (this.audio) this.audio.playJackpotFanfare();
  }

  _getRandomCashMultiplier() {
    const vals = [0.5, 1.0, 1.5, 2.0, 3.0, 5.0, 10.0, 25.0, 50.0];
    const weights = [35, 30, 15, 10, 5, 3, 1, 0.5, 0.1];
    let sum = weights.reduce((a, b) => a + b, 0);
    let r = Math.random() * sum;
    for (let i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r <= 0) return vals[i];
    }
    return vals[0];
  }

  _renderModal() {
    let overlay = document.getElementById('lock-slingo-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'lock-slingo-overlay';
      overlay.className = 'feature-modal-overlay';
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="slingo-modal-content">
        <div class="modal-header">
          <div class="modal-title">LOCK & SLINGO™ (ELEPHANT)</div>
          <div class="modal-subtitle">5×5 HOLD & SPIN • ELEPHANT CASH & LADDER • POWER LEVEL ${this.power}</div>
        </div>

        <div class="slingo-bonus-body">
          <div class="slingo-ladder-pane">
            <div class="ladder-title">SLINGO LADDER</div>
            <div id="slingo-ladder-ranks" class="ladder-ranks">
              ${this._renderLadderHTML()}
            </div>
          </div>

          <div class="slingo-grid-pane">
            <div id="slingo-grid" class="slingo-grid-5x5">
              ${this._renderGridCellsHTML()}
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <div class="modal-stat">
            <span class="stat-label">RESPINS REMAINING</span>
            <span id="slingo-spins-left" class="stat-value highlight">${this.spinsRemaining} / 3</span>
          </div>
          <div class="modal-stat">
            <span class="stat-label">TOTAL BONUS WIN</span>
            <span id="slingo-total-win" class="stat-value win-glow">$${this.totalCashWin.toFixed(2)}</span>
          </div>
          <button id="slingo-spin-btn" class="modal-action-btn">SPIN RESPIN</button>
        </div>
      </div>
    `;

    overlay.style.display = 'flex';
    document.getElementById('slingo-spin-btn').onclick = () => this._playRespin();
  }

  _renderLadderHTML() {
    const ladderPrizes = [
      { lines: 12, prize: '500x FULL HOUSE' },
      { lines: 10, prize: '100x ULTRA' },
      { lines: 8,  prize: '50x MEGA' },
      { lines: 6,  prize: '25x MAJOR' },
      { lines: 5,  prize: '15x MULT' },
      { lines: 4,  prize: '10x MULT' },
      { lines: 3,  prize: '5x MULT' },
      { lines: 2,  prize: '2x MULT' },
      { lines: 1,  prize: '1x MULT' }
    ];

    return ladderPrizes.map(item => `
      <div class="ladder-step ${this.completedSlingos >= item.lines ? 'achieved' : ''}">
        <span class="step-lines">${item.lines} LINES</span>
        <span class="step-prize">${item.prize}</span>
      </div>
    `).join('');
  }

  _renderGridCellsHTML() {
    let html = '';
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        const cell = this.grid[r][c];
        if (cell) {
          html += `
            <div class="slingo-cell coin-locked" data-r="${r}" data-c="${c}">
              <div class="mini-fire-core">
                <span class="core-val">$${(cell.val * this.bet).toFixed(2)}</span>
              </div>
            </div>
          `;
        } else {
          html += `<div class="slingo-cell empty" data-r="${r}" data-c="${c}"></div>`;
        }
      }
    }
    return html;
  }

  _playRespin() {
    const btn = document.getElementById('slingo-spin-btn');
    if (!btn || btn.disabled) return;
    btn.disabled = true;

    if (this.audio) this.audio.playSpin();

    // Roll chances for empty cells
    let newCoinsAdded = 0;
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (!this.grid[r][c]) {
          if (Math.random() < 0.16) {
            const val = this._getRandomCashMultiplier();
            this.grid[r][c] = { val, locked: true };
            this.totalCashWin += val * this.bet;
            newCoinsAdded++;
          }
        }
      }
    }

    if (newCoinsAdded > 0) {
      this.spinsRemaining = 3; // Reset lives!
      if (this.audio) this.audio.playElephantStomp();
    } else {
      this.spinsRemaining--;
      if (this.audio) this.audio.playReelStop();
    }

    // Check completed slingos (rows, cols, diagonals)
    this._calculateSlingos();

    // Update UI
    document.getElementById('slingo-grid').innerHTML = this._renderGridCellsHTML();
    document.getElementById('slingo-spins-left').innerText = `${this.spinsRemaining} / 3`;
    document.getElementById('slingo-total-win').innerText = `$${this.totalCashWin.toFixed(2)}`;
    document.getElementById('slingo-ladder-ranks').innerHTML = this._renderLadderHTML();

    if (this.spinsRemaining <= 0 || this._isGridFull()) {
      btn.innerText = 'COLLECT BONUS WIN';
      btn.disabled = false;
      btn.onclick = () => this._closeModal();
    } else {
      btn.disabled = false;
    }
  }

  _calculateSlingos() {
    let lines = 0;
    // 5 Rows
    for (let r = 0; r < 5; r++) {
      if (this.grid[r].every(c => c !== null)) lines++;
    }
    // 5 Cols
    for (let c = 0; c < 5; c++) {
      let full = true;
      for (let r = 0; r < 5; r++) {
        if (!this.grid[r][c]) { full = false; break; }
      }
      if (full) lines++;
    }
    // 2 Diagonals
    let diag1 = true, diag2 = true;
    for (let i = 0; i < 5; i++) {
      if (!this.grid[i][i]) diag1 = false;
      if (!this.grid[i][4 - i]) diag2 = false;
    }
    if (diag1) lines++;
    if (diag2) lines++;

    this.completedSlingos = lines;
  }

  _isGridFull() {
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) {
        if (!this.grid[r][c]) return false;
      }
    }
    return true;
  }

  _closeModal() {
    const overlay = document.getElementById('lock-slingo-overlay');
    if (overlay) overlay.style.display = 'none';
    this.active = false;
    if (this.onComplete) this.onComplete(this.totalCashWin);
  }
}
