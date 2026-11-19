/**
 * Fire Primal Elephant™ Slot Engine
 * Direct JavaScript implementation faithful to C# PrimalSlotEngine & Google Sheet math.
 */
import { GAME_CONFIG } from './config.js';

export class PrimalEngine {
  constructor(config = GAME_CONFIG) {
    this.config = config;
    this.stageIndex = 0;
    this.spinsInCurrentStage = 0;
    this.totalSpins = 0;
    this.potPowers = [0, 0, 0, 0]; // Pot 0: Lock & Win, Pot 1: Apex Spins, Pot 2: Extra Wilds (Colossal), Pot 3: Multiplier (Primal Zone)
    this.balance = 15200.00;
    this.currentBet = 10.00;
  }

  getCurrentStage() {
    return this.config.stages[this.stageIndex] || this.config.stages[0];
  }

  setStage(targetStageIndex) {
    this.stageIndex = Math.max(0, Math.min(6, targetStageIndex));
    this.spinsInCurrentStage = 0;
  }

  setPotPower(potIndex, power) {
    if (potIndex >= 0 && potIndex < 4) {
      this.potPowers[potIndex] = Math.max(0, Math.min(12, power));
    }
  }

  /**
   * Main Base Game Spin
   * @param {Object} options Optional override cheats (e.g. forceColossal, forceBonus, forceCollect)
   */
  spin(options = {}) {
    this.totalSpins++;
    this.spinsInCurrentStage++;
    const currentStageObj = this.getCurrentStage();
    let powerUpTriggered = false;

    // 1. Base Game Progressive Stage Advancement
    if (this.spinsInCurrentStage > currentStageObj.spins) {
      if (this.stageIndex < 6) {
        this.stageIndex++;
        if (this.stageIndex === 6) {
          powerUpTriggered = true; // Just unlocked Stage 6!
        }
      } else if (this.stageIndex === 6) {
        // Every 100 spins in Stage 6 unlocks Max Power Boost
        powerUpTriggered = true;
      }
      this.spinsInCurrentStage = 1;
    }

    // Power-up trigger in Stage 6: sets a random pot to maximum
    let maxPowerPotChosen = -1;
    if (powerUpTriggered) {
      maxPowerPotChosen = Math.floor(Math.random() * 4);
      this.potPowers[maxPowerPotChosen] = 12;
    }

    // 2. Select Reelset based on Stage Weights
    const stageKey = `Stage${this.stageIndex}`;
    const weights = this.config.stageWeights[stageKey] || this.config.stageWeights['Stage0'];
    let chosenReelsetIndex = this._sampleWeightedIndex(weights);

    // Cheats / Overrides
    if (options.forceStampede && this.stageIndex >= 4) {
      chosenReelsetIndex = 11 + Math.floor(Math.random() * 3);
    } else if (options.forceCollector || options.forceDualCollector) {
      chosenReelsetIndex = 8 + Math.floor(Math.random() * 3);
    } else if (options.forcePotBonus !== undefined) {
      chosenReelsetIndex = 3 + options.forcePotBonus;
    }

    const reelsetName = `Reelset${chosenReelsetIndex}`;
    const reelset = this.config.reelsets[reelsetName] || this.config.reelsets['Reelset0'];

    // 3. Roll reel stops (5 reels x 3 rows)
    const screenSymbols = [[], [], [], [], []];
    const stopIndexes = [];

    for (let r = 0; r < 5; r++) {
      const strip = reelset[r];
      const stop = Math.floor(Math.random() * strip.length);
      stopIndexes.push(stop);
      for (let row = 0; row < 3; row++) {
        screenSymbols[r].push(strip[(stop + row) % strip.length]);
      }
    }

    // 3b. Stampede Spin check (Reelsets 11, 12, 13)
    let isStampedeSpin = (chosenReelsetIndex === 11 || chosenReelsetIndex === 12 || chosenReelsetIndex === 13);
    let stampedeAddedCount = 0;
    const stampedeAddedPots = [];

    if (isStampedeSpin) {
      stampedeAddedCount = 3 + Math.floor(Math.random() * 5); // 3 to 7 pot coins dropped
      const availableCells = [];
      for (let r = 0; r < 5; r++) {
        for (let row = 0; row < 3; row++) {
          availableCells.push({ r, row });
        }
      }
      this._shuffleArray(availableCells);

      for (let i = 0; i < stampedeAddedCount && i < availableCells.length; i++) {
        const cell = availableCells[i];
        const potType = Math.floor(Math.random() * 4); // 0..3
        const symId = 10 + potType;
        screenSymbols[cell.r][cell.row] = symId;
        stampedeAddedPots.push({ r: cell.r, row: cell.row, potType, symbolId: symId });
      }
    }

    // 3c. Colossal Feature Check
    // Can trigger naturally when Colossal Spin feature triggers or forced via debug
    let isColossalSpin = !!options.forceColossal;
    let colossalAnimal = options.colossalAnimal || 'elephant'; // 'elephant', 'tiger', 'rhino', 'gorilla'
    let colossalSymbolId = 7; // H1 Elephant by default
    if (colossalAnimal === 'tiger') colossalSymbolId = 6;
    if (colossalAnimal === 'gorilla') colossalSymbolId = 5;
    if (colossalAnimal === 'rhino') colossalSymbolId = 4;

    if (isColossalSpin) {
      // Reels 1, 2, 3 (center 3 reels) are overridden by the Colossal Animal!
      for (let r = 1; r <= 3; r++) {
        for (let row = 0; row < 3; row++) {
          screenSymbols[r][row] = colossalSymbolId;
        }
      }
    }

    // 4. Fire Core Cash Values Assignment
    const fireCoreCells = [];
    for (let r = 0; r < 5; r++) {
      for (let row = 0; row < 3; row++) {
        if (screenSymbols[r][row] === 14) {
          const cashVal = this._sampleFireCoreValue();
          fireCoreCells.push({ r, row, value: cashVal, cashWin: cashVal * this.currentBet });
        }
      }
    }

    // Force Fire Core for testing if requested
    if (options.forceFireCore && fireCoreCells.length === 0) {
      screenSymbols[0][2] = 14;
      screenSymbols[4][0] = 14;
      fireCoreCells.push(
        { r: 0, row: 2, value: 5.0, cashWin: 5.0 * this.currentBet },
        { r: 4, row: 0, value: 15.0, cashWin: 15.0 * this.currentBet }
      );
    }

    // 5. Evaluate Payline Wins
    const lineWins = this._evaluateLineWins(screenSymbols);
    let totalLineWin = 0;
    lineWins.forEach(lw => totalLineWin += lw.payout);

    // 6. Evaluate Fire Core Collections (Ground Stomp)
    let collectorsReel0 = 0;
    let collectorsReel4 = 0;
    for (let row = 0; row < 3; row++) {
      if (screenSymbols[0][row] === 9) collectorsReel0++;
      if (screenSymbols[4][row] === 9) collectorsReel4++;
    }

    if (options.forceDualCollector) {
      screenSymbols[0][1] = 9;
      collectorsReel0 = 1;
      screenSymbols[4][1] = 9;
      collectorsReel4 = 1;
      if (fireCoreCells.length === 0) {
        screenSymbols[1][1] = 14;
        screenSymbols[2][0] = 14;
        screenSymbols[3][2] = 14;
        fireCoreCells.push(
          { r: 1, row: 1, value: 5.0, cashWin: 5.0 * this.currentBet },
          { r: 2, row: 0, value: 10.0, cashWin: 10.0 * this.currentBet },
          { r: 3, row: 2, value: 15.0, cashWin: 15.0 * this.currentBet }
        );
      }
    } else if (options.forceCollector && collectorsReel0 + collectorsReel4 === 0) {
      screenSymbols[4][1] = 9;
      collectorsReel4 = 1;
    }

    if (options.forceAllPotCoins) {
      screenSymbols[0][0] = 10; // Pot 0: Elephant
      screenSymbols[1][1] = 11; // Pot 1: Tiger
      screenSymbols[3][1] = 12; // Pot 2: Rhino
      screenSymbols[4][2] = 13; // Pot 3: Gorilla
    }

    const totalCollectors = collectorsReel0 + collectorsReel4;
    let collectionWin = 0;
    let collectorTriggered = false;
    let jackpotWon = null;

    if (fireCoreCells.length > 0) {
      if (totalCollectors > 0) {
        // Dual Collectors collect twice!
        const multiplier = totalCollectors;
        const sumMultiplier = fireCoreCells.reduce((acc, c) => acc + c.value, 0);
        collectionWin = multiplier * sumMultiplier * this.currentBet;
        collectorTriggered = true;
      } else {
        // Small chance for direct Jackpot Wheel trigger when Fire Cores land without collector
        if (Math.random() < 0.05 || options.forceJackpot) {
          jackpotWon = this._sampleJackpot();
          collectionWin += jackpotWon.multiplier * this.currentBet;
        }
      }
    } else if (options.forceJackpot) {
      jackpotWon = this._sampleJackpot();
      collectionWin += jackpotWon.multiplier * this.currentBet;
    }

    // 7. Evaluate Pot Coins & Pot Triggers
    const potPowersBefore = [...this.potPowers];
    const landedPotCounts = [0, 0, 0, 0];
    const triggeredPotBonuses = [];

    for (let p = 0; p < 4; p++) {
      const symId = 10 + p;
      let count = 0;
      for (let r = 0; r < 5; r++) {
        for (let row = 0; row < 3; row++) {
          if (screenSymbols[r][row] === symId) count++;
        }
      }
      landedPotCounts[p] = count;

      if (count > 0 || options.forcePotBonus === p) {
        const potConfig = this.config.pots[p];
        const currentPower = this.potPowers[p];
        // Trigger chance increases with power
        const triggerChance = (count * 0.08) + (currentPower * 0.04);
        const didTrigger = (Math.random() < triggerChance) || (options.forcePotBonus === p);

        if (didTrigger) {
          const triggeredPower = Math.min(12, currentPower + Math.max(0, count - 1));
          triggeredPotBonuses.push({
            potIndex: p,
            name: potConfig.name,
            sub: potConfig.sub,
            animal: potConfig.animal,
            power: triggeredPower
          });
          // Reset power after trigger
          this.potPowers[p] = 0;
        } else {
          // Increment power level
          this.potPowers[p] = Math.min(12, currentPower + count);
        }
      }
    }

    const totalSpinWin = totalLineWin + collectionWin;
    this.balance = this.balance - this.currentBet + totalSpinWin;

    return {
      screenSymbols,
      stopIndexes,
      lineWins,
      totalLineWin,
      fireCoreCells,
      collectorTriggered,
      collectorsReel0,
      collectorsReel4,
      totalCollectors,
      collectionWin,
      jackpotWon,
      isStampedeSpin,
      stampedeAddedCount,
      stampedeAddedPots,
      isColossalSpin,
      colossalAnimal,
      colossalSymbolId,
      potPowersBefore,
      potPowersAfter: [...this.potPowers],
      landedPotCounts,
      triggeredPotBonuses,
      powerUpTriggered,
      maxPowerPotChosen,
      stageIndex: this.stageIndex,
      spinsInCurrentStage: this.spinsInCurrentStage,
      totalSpins: this.totalSpins,
      totalSpinWin,
      newBalance: this.balance
    };
  }

  _evaluateLineWins(screenSymbols) {
    const lineWins = [];
    const paylines = this.config.paylines;
    const symbols = this.config.symbols;

    for (let lineId = 0; lineId < paylines.length; lineId++) {
      const payline = paylines[lineId];
      let maxPayout = 0;
      let bestSym = null;
      let bestMatch = 0;

      for (const sym of symbols) {
        if (sym.type === 'wild' || sym.type === 'collector' || sym.type === 'pot' || sym.type === 'cash') {
          continue;
        }

        let matchCount = 0;
        for (let reel = 0; reel < 5; reel++) {
          const row = payline[reel];
          const symOnScreen = screenSymbols[reel][row];

          if (symOnScreen === sym.id || symOnScreen === 8) { // 8 is Wild
            matchCount++;
          } else {
            break;
          }
        }

        // H1 Elephant pays from 2-of-a-kind (0.5x), others from 3
        const mult = sym.pays[matchCount] || 0;
        const payout = mult * this.currentBet;
        if (payout > maxPayout) {
          maxPayout = payout;
          bestSym = sym;
          bestMatch = matchCount;
        }
      }

      if (maxPayout > 0) {
        lineWins.push({
          lineId: lineId + 1,
          symbolId: bestSym.id,
          symbolName: bestSym.name,
          symbolLabel: bestSym.label,
          matchCount: bestMatch,
          multiplier: maxPayout / this.currentBet,
          payout: maxPayout,
          coords: payline.slice(0, bestMatch).map((row, r) => ({ r, row }))
        });
      }
    }

    return lineWins;
  }

  _sampleWeightedIndex(weights) {
    const total = weights.reduce((acc, w) => acc + w, 0);
    if (total <= 0) return 0;
    let roll = Math.random() * total;
    for (let i = 0; i < weights.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return i;
    }
    return weights.length - 1;
  }

  _sampleFireCoreValue() {
    const vals = this.config.fireCore.values;
    const weights = this.config.fireCore.weights;
    const idx = this._sampleWeightedIndex(weights);
    return vals[idx] || 1.0;
  }

  _sampleJackpot() {
    const idx = this._sampleWeightedIndex(this.config.jackpots.weights);
    return {
      name: this.config.jackpots.names[idx],
      multiplier: this.config.jackpots.multipliers[idx]
    };
  }

  _shuffleArray(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
}
