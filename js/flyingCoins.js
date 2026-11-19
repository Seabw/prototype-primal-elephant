/**
 * FlyingCoins & Fire Core Animator for Fire Primal Elephant™
 * Handles:
 * 1. Pot trigger symbols flying to Pots 0..3 and leaving blank behind on the reels.
 * 2. Fire Cores flying to Reel 1 & Reel 5 Collectors and leaving blank behind on the reels.
 * Includes absolute timeout guarantees so animations never hang the game loop.
 */
export class FlyingAnimator {
  constructor(appRootElement, particlesLayer) {
    this.appRoot = appRootElement || document.getElementById('app-root');
    this.container = particlesLayer || document.getElementById('flying-particles-layer');
    this.activeTimers = new Set();
    this.activeFrames = new Set();
  }

  clearAll() {
    this.activeTimers.forEach(t => clearTimeout(t));
    this.activeTimers.clear();

    this.activeFrames.forEach(f => cancelAnimationFrame(f));
    this.activeFrames.clear();

    if (this.container) {
      this.container.innerHTML = '';
    }
  }

  /**
   * Make any landed pot trigger symbols fly to their respective top pots.
   * Immediately leaves a blank cell behind on the reels.
   */
  animatePotCoinsFlight(potCoinsList, soundSynth, isTurbo = false) {
    if (!potCoinsList || potCoinsList.length === 0) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      let completedCount = 0;
      let hasResolved = false;
      const total = potCoinsList.length;
      const staggerDelay = isTurbo ? 35 : 75;
      const duration = isTurbo ? 220 : 420;

      const finish = () => {
        if (!hasResolved) {
          hasResolved = true;
          this.clearAll();
          resolve();
        }
      };

      // Absolute safety timeout
      const safetyTimer = setTimeout(finish, total * staggerDelay + duration + 600);
      this.activeTimers.add(safetyTimer);

      potCoinsList.forEach((coin, idx) => {
        const timer = setTimeout(() => {
          this.activeTimers.delete(timer);
          try {
            this._flySinglePotCoin(coin, soundSynth, duration, () => {
              completedCount++;
              if (completedCount >= total) {
                if (safetyTimer) {
                  clearTimeout(safetyTimer);
                  this.activeTimers.delete(safetyTimer);
                }
                finish();
              }
            });
          } catch (e) {
            completedCount++;
            if (completedCount >= total) finish();
          }
        }, idx * staggerDelay);

        this.activeTimers.add(timer);
      });
    });
  }

  _flySinglePotCoin(coin, soundSynth, duration, onComplete) {
    const originCell = document.getElementById(`cell-${coin.r}-${coin.row}`);
    const targetPot = document.getElementById(`pot-card-${coin.potIndex}`);

    if (!originCell || !targetPot || !this.container) {
      if (originCell) this._setCellBlank(originCell);
      onComplete();
      return;
    }

    // Immediately leave blank behind on the reels
    this._setCellBlank(originCell);

    const appRect = this.appRoot.getBoundingClientRect();
    const startRect = originCell.getBoundingClientRect();
    const endRect = targetPot.getBoundingClientRect();

    const startX = (startRect.left + startRect.width / 2) - appRect.left;
    const startY = (startRect.top + startRect.height / 2) - appRect.top;

    const endX = (endRect.left + endRect.width / 2) - appRect.left;
    const endY = (endRect.top + endRect.height / 2) - appRect.top;

    const animalMap = ['elephant', 'tiger', 'rhino', 'gorilla'];
    const animal = animalMap[coin.potIndex] || 'elephant';

    const particle = document.createElement('div');
    particle.className = `flying-particle pot-particle-${coin.potIndex}`;
    particle.innerHTML = `
      <div class="flying-pot-coin">
        <img src="assets/pot_${animal}.png" alt="${animal} pot coin" />
      </div>
    `;

    particle.style.left = `${startX}px`;
    particle.style.top = `${startY}px`;
    this.container.appendChild(particle);

    if (soundSynth && soundSynth.playFlightToPot) {
      soundSynth.playFlightToPot();
    }

    const startTime = performance.now();
    const midX = (startX + endX) / 2 + (Math.random() - 0.5) * 50;
    const midY = Math.min(startY, endY) - 55 - Math.random() * 25;

    let frameId = null;

    const animate = currentTime => {
      try {
        const elapsed = (currentTime || performance.now()) - startTime;
        const t = Math.min(1, Math.max(0, elapsed / duration));

        const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * midX + Math.pow(t, 2) * endX;
        const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * midY + Math.pow(t, 2) * endY;
        const scale = 1.0 + Math.sin(t * Math.PI) * 0.35 - t * 0.25;
        const rotate = (t * 360) * (coin.potIndex % 2 === 0 ? 1 : -1);

        particle.style.transform = `translate(-50%, -50%) translate(${x - startX}px, ${y - startY}px) scale(${scale}) rotate(${rotate}deg)`;

        if (t < 1) {
          frameId = requestAnimationFrame(animate);
          this.activeFrames.add(frameId);
        } else {
          if (frameId) this.activeFrames.delete(frameId);
          particle.remove();

          if (targetPot) {
            targetPot.classList.add('pot-pulse-hit');
            if (soundSynth && soundSynth.playPotDing) soundSynth.playPotDing();

            const potTimer = setTimeout(() => {
              targetPot.classList.remove('pot-pulse-hit');
              this.activeTimers.delete(potTimer);
            }, 260);
            this.activeTimers.add(potTimer);
          }

          onComplete();
        }
      } catch (e) {
        if (frameId) this.activeFrames.delete(frameId);
        particle.remove();
        onComplete();
      }
    };

    frameId = requestAnimationFrame(animate);
    this.activeFrames.add(frameId);
  }

  /**
   * Make all cash Fire Cores fly to Collector symbols (Reel 1 and/or Reel 5).
   * Immediately leaves a blank cell behind on the reels.
   * If dual collectors are present, fire cores fly to both!
   */
  animateFireCoresCollection(fireCoreCells, collectorCells, soundSynth, isTurbo = false, onCashCollected = null) {
    if (!fireCoreCells || fireCoreCells.length === 0 || !collectorCells || collectorCells.length === 0) {
      return Promise.resolve();
    }

    return new Promise(resolve => {
      // Total flights = fireCoreCells.length * collectorCells.length (dual collectors collect twice)
      const flightPairs = [];
      fireCoreCells.forEach(fc => {
        collectorCells.forEach(col => {
          flightPairs.push({ fireCore: fc, collector: col });
        });
      });

      let completedCount = 0;
      let hasResolved = false;
      const total = flightPairs.length;
      const staggerDelay = isTurbo ? 40 : 90;
      const duration = isTurbo ? 240 : 460;

      const finish = () => {
        if (!hasResolved) {
          hasResolved = true;
          this.clearAll();
          resolve();
        }
      };

      const safetyTimer = setTimeout(finish, total * staggerDelay + duration + 700);
      this.activeTimers.add(safetyTimer);

      // Immediately mark all origin Fire Core cells as blank on the grid
      fireCoreCells.forEach(fc => {
        const originCell = document.getElementById(`cell-${fc.r}-${fc.row}`);
        if (originCell) this._setCellBlank(originCell);
      });

      flightPairs.forEach((pair, idx) => {
        const timer = setTimeout(() => {
          this.activeTimers.delete(timer);
          try {
            this._flySingleFireCore(pair.fireCore, pair.collector, soundSynth, duration, (cashWon, targetCol) => {
              if (onCashCollected) onCashCollected(cashWon);
              completedCount++;
              if (completedCount >= total) {
                if (safetyTimer) {
                  clearTimeout(safetyTimer);
                  this.activeTimers.delete(safetyTimer);
                }
                finish();
              }
            });
          } catch (e) {
            completedCount++;
            if (completedCount >= total) finish();
          }
        }, idx * staggerDelay);

        this.activeTimers.add(timer);
      });
    });
  }

  _flySingleFireCore(fireCore, collector, soundSynth, duration, onComplete) {
    const originCell = document.getElementById(`cell-${fireCore.r}-${fireCore.row}`);
    const targetCollector = document.getElementById(`cell-${collector.r}-${collector.row}`);

    if (!targetCollector || !this.container) {
      onComplete(fireCore.cashWin, null);
      return;
    }

    const appRect = this.appRoot.getBoundingClientRect();
    const startRect = originCell ? originCell.getBoundingClientRect() : targetCollector.getBoundingClientRect();
    const endRect = targetCollector.getBoundingClientRect();

    const startX = (startRect.left + startRect.width / 2) - appRect.left;
    const startY = (startRect.top + startRect.height / 2) - appRect.top;

    const endX = (endRect.left + endRect.width / 2) - appRect.left;
    const endY = (endRect.top + endRect.height / 2) - appRect.top;

    const particle = document.createElement('div');
    particle.className = 'flying-particle fire-core-particle';
    particle.innerHTML = `
      <div class="flying-fire-core">
        <img src="assets/sym_fire_core.svg" class="flying-core-orb" alt="Fire Core" />
        <div class="flying-core-badge">$${fireCore.cashWin.toFixed(2)}</div>
      </div>
    `;

    particle.style.left = `${startX}px`;
    particle.style.top = `${startY}px`;
    this.container.appendChild(particle);

    if (soundSynth && soundSynth.playFlightToPot) {
      soundSynth.playFlightToPot();
    }

    const startTime = performance.now();
    const midX = (startX + endX) / 2;
    const midY = Math.min(startY, endY) - 50 - Math.random() * 20;

    let frameId = null;

    const animate = currentTime => {
      try {
        const elapsed = (currentTime || performance.now()) - startTime;
        const t = Math.min(1, Math.max(0, elapsed / duration));

        const x = Math.pow(1 - t, 2) * startX + 2 * (1 - t) * t * midX + Math.pow(t, 2) * endX;
        const y = Math.pow(1 - t, 2) * startY + 2 * (1 - t) * t * midY + Math.pow(t, 2) * endY;
        const scale = 1.0 + Math.sin(t * Math.PI) * 0.35 - t * 0.15;

        particle.style.transform = `translate(-50%, -50%) translate(${x - startX}px, ${y - startY}px) scale(${scale})`;

        if (t < 1) {
          frameId = requestAnimationFrame(animate);
          this.activeFrames.add(frameId);
        } else {
          if (frameId) this.activeFrames.delete(frameId);
          particle.remove();

          // Collector absorbs cash
          const collectorWrapper = targetCollector.querySelector('.collector-wrapper');
          if (collectorWrapper) {
            collectorWrapper.classList.add('collector-absorbing');
            const cTimer = setTimeout(() => {
              collectorWrapper.classList.remove('collector-absorbing');
              this.activeTimers.delete(cTimer);
            }, 350);
            this.activeTimers.add(cTimer);
          }

          if (soundSynth && soundSynth.playCollectCash) {
            soundSynth.playCollectCash();
          }

          // Spawn floating +$XX.XX text popup above collector
          this._spawnCashFloatText(endX, endY - 20, fireCore.cashWin);

          onComplete(fireCore.cashWin, targetCollector);
        }
      } catch (e) {
        if (frameId) this.activeFrames.delete(frameId);
        particle.remove();
        onComplete(fireCore.cashWin, null);
      }
    };

    frameId = requestAnimationFrame(animate);
    this.activeFrames.add(frameId);
  }

  _spawnCashFloatText(x, y, cashVal) {
    if (!this.container) return;
    const floatEl = document.createElement('div');
    floatEl.className = 'flying-cash-float';
    floatEl.innerText = `+$${cashVal.toFixed(2)}`;
    floatEl.style.left = `${x}px`;
    floatEl.style.top = `${y}px`;
    this.container.appendChild(floatEl);

    const timer = setTimeout(() => {
      floatEl.remove();
      this.activeTimers.delete(timer);
    }, 850);
    this.activeTimers.add(timer);
  }

  _setCellBlank(cell) {
    if (!cell) return;
    cell.className = 'slot-cell blank-cell';
    cell.innerHTML = '<div class="blank-recess"></div>';
  }
}

