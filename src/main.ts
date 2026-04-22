import Phaser from "phaser";
import "./style.css";

type EnemyKind = "zombie" | "ender" | "dragon";

type EnemyStats = {
  health: number;
  speed: number;
  damage: number;
  scale: number;
  tint: number;
  score: number;
};

const ENEMY_CONFIG: Record<EnemyKind, EnemyStats> = {
  zombie: { health: 28, speed: 64, damage: 6, scale: 0.2, tint: 0xa3ff87, score: 5 },
  ender: { health: 40, speed: 84, damage: 8, scale: 0.2, tint: 0xa66bff, score: 9 },
  dragon: { health: 80, speed: 44, damage: 14, scale: 0.24, tint: 0xff7a7a, score: 16 },
};

class SurvivalScene extends Phaser.Scene {
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;

  private player!: Phaser.Physics.Arcade.Sprite;
  private enemies!: Phaser.Physics.Arcade.Group;
  private fireballs!: Phaser.Physics.Arcade.Group;

  private health = 100;
  private score = 0;
  private wave = 1;
  private enemiesToSpawn = 0;
  private aliveEnemies = 0;
  private gameOver = false;

  private healthText!: Phaser.GameObjects.Text;
  private scoreText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private hintText!: Phaser.GameObjects.Text;
  private gameOverText!: Phaser.GameObjects.Text;

  private spawnEvent?: Phaser.Time.TimerEvent;
  private fireEvent?: Phaser.Time.TimerEvent;

  constructor() {
    super("survival-scene");
  }

  preload(): void {
    this.load.image("ninja", "/visuals/ninja.png");
    this.load.image("zombie", "/visuals/zombie.png");
    this.load.image("ender", "/visuals/ender.png");
    this.load.image("dragon", "/visuals/dragon.png");
  }

  create(): void {
    this.add.rectangle(480, 270, 960, 540, 0x151025).setOrigin(0.5);
    this.add
      .rectangle(480, 270, 900, 500, 0x201735)
      .setStrokeStyle(2, 0xffb55e, 0.55)
      .setOrigin(0.5);

    this.player = this.physics.add.sprite(480, 270, "ninja");
    this.player.setScale(0.2);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(3);

    this.enemies = this.physics.add.group();
    this.fireballs = this.physics.add.group();

    this.cursors = this.input.keyboard!.createCursorKeys();
    this.wasd = this.input.keyboard!.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as Record<"up" | "down" | "left" | "right", Phaser.Input.Keyboard.Key>;

    this.healthText = this.add.text(18, 16, "Health: 100", { fontSize: "22px", color: "#ffe5c2" }).setDepth(5);
    this.scoreText = this.add.text(18, 46, "Score: 0", { fontSize: "22px", color: "#ffe5c2" }).setDepth(5);
    this.waveText = this.add.text(18, 76, "Wave: 1", { fontSize: "22px", color: "#ffe5c2" }).setDepth(5);

    this.hintText = this.add
      .text(480, 28, "Move: WASD / Arrows | Survive the waves", {
        fontSize: "18px",
        color: "#f9d3a3",
      })
      .setOrigin(0.5, 0)
      .setDepth(5);

    this.gameOverText = this.add
      .text(480, 270, "", {
        fontSize: "52px",
        color: "#ffd27a",
        align: "center",
      })
      .setOrigin(0.5)
      .setDepth(6);

    this.physics.add.overlap(
      this.fireballs,
      this.enemies,
      (fireballObj, enemyObj) => {
        const fireball = fireballObj as Phaser.Physics.Arcade.Image;
        const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
        const enemyHealth = (enemy.getData("health") as number) - 20;
        enemy.setData("health", enemyHealth);
        fireball.destroy();

        if (enemyHealth <= 0) {
          this.score += enemy.getData("score") as number;
          this.scoreText.setText(`Score: ${this.score}`);
          this.aliveEnemies -= 1;
          enemy.destroy();
          this.tryStartNextWave();
        }
      },
      undefined,
      this,
    );

    this.physics.add.overlap(
      this.player,
      this.enemies,
      (_, enemyObj) => {
        const enemy = enemyObj as Phaser.Physics.Arcade.Sprite;
        const now = this.time.now;
        const nextHitAt = (enemy.getData("nextHitAt") as number) ?? 0;
        if (now < nextHitAt || this.gameOver) {
          return;
        }

        enemy.setData("nextHitAt", now + 350);
        const damage = enemy.getData("damage") as number;
        this.health = Math.max(0, this.health - damage);
        this.healthText.setText(`Health: ${this.health}`);
        this.cameras.main.shake(90, 0.004);

        if (this.health <= 0) {
          this.endRun();
        }
      },
      undefined,
      this,
    );

    this.fireEvent = this.time.addEvent({
      delay: 240,
      loop: true,
      callback: this.autoShoot,
      callbackScope: this,
    });

    this.startWave();
  }

  update(): void {
    if (this.gameOver) {
      this.player.setVelocity(0, 0);
      return;
    }

    const speed = 220;
    let vx = 0;
    let vy = 0;

    if (this.cursors.left.isDown || this.wasd.left.isDown) {
      vx -= speed;
    }
    if (this.cursors.right.isDown || this.wasd.right.isDown) {
      vx += speed;
    }
    if (this.cursors.up.isDown || this.wasd.up.isDown) {
      vy -= speed;
    }
    if (this.cursors.down.isDown || this.wasd.down.isDown) {
      vy += speed;
    }

    this.player.setVelocity(vx, vy);
    if (vx !== 0 && vy !== 0) {
      const playerBody = this.player.body as Phaser.Physics.Arcade.Body;
      playerBody.velocity.normalize().scale(speed);
    }

    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) {
        return;
      }
      this.physics.moveToObject(enemy, this.player, enemy.getData("speed") as number);
    });
  }

  private startWave(): void {
    this.enemiesToSpawn = 6 + this.wave * 4;
    this.waveText.setText(`Wave: ${this.wave}`);
    this.hintText.setText(`Wave ${this.wave} incoming`);

    this.spawnEvent?.remove(false);
    this.spawnEvent = this.time.addEvent({
      delay: Math.max(260, 600 - this.wave * 24),
      repeat: this.enemiesToSpawn - 1,
      callback: this.spawnEnemy,
      callbackScope: this,
    });
  }

  private spawnEnemy(): void {
    if (this.gameOver) {
      return;
    }

    const roll = Phaser.Math.Between(1, 100);
    const type: EnemyKind = roll <= 60 ? "zombie" : roll <= 85 ? "ender" : "dragon";
    const cfg = ENEMY_CONFIG[type];

    const pos = this.randomEdgePoint();
    const enemy = this.physics.add.sprite(pos.x, pos.y, type);
    enemy.setScale(cfg.scale + this.wave * 0.004);
    enemy.setTint(cfg.tint);
    enemy.setData("health", cfg.health + this.wave * 8);
    enemy.setData("damage", cfg.damage + Math.floor(this.wave / 3));
    enemy.setData("speed", cfg.speed + this.wave * 2.5);
    enemy.setData("score", cfg.score + this.wave);
    enemy.setData("nextHitAt", 0);

    this.enemies.add(enemy);
    this.aliveEnemies += 1;
  }

  private autoShoot(): void {
    if (this.gameOver) {
      return;
    }

    const closest = this.getClosestEnemy();
    if (!closest) {
      return;
    }

    const fireball = this.physics.add.image(this.player.x, this.player.y, "ninja");
    fireball.setScale(0.08);
    fireball.setTint(0xff8a00);
    fireball.setAlpha(0.9);
    fireball.setDepth(4);

    this.fireballs.add(fireball);
    this.physics.moveToObject(fireball, closest, 420);

    this.time.delayedCall(1200, () => fireball.destroy());
  }

  private getClosestEnemy(): Phaser.Physics.Arcade.Sprite | null {
    let nearest: Phaser.Physics.Arcade.Sprite | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Phaser.Physics.Arcade.Sprite;
      if (!enemy.active) {
        return;
      }
      const dist = Phaser.Math.Distance.Between(this.player.x, this.player.y, enemy.x, enemy.y);
      if (dist < nearestDistance) {
        nearestDistance = dist;
        nearest = enemy;
      }
    });

    return nearest;
  }

  private tryStartNextWave(): void {
    if (this.gameOver) {
      return;
    }

    if (this.spawnEvent && this.spawnEvent.getOverallProgress() < 1) {
      return;
    }

    if (this.aliveEnemies > 0) {
      return;
    }

    this.wave += 1;
    this.time.delayedCall(1400, () => this.startWave());
  }

  private randomEdgePoint(): { x: number; y: number } {
    const edge = Phaser.Math.Between(0, 3);
    if (edge === 0) {
      return { x: Phaser.Math.Between(40, 920), y: 24 };
    }
    if (edge === 1) {
      return { x: 936, y: Phaser.Math.Between(40, 500) };
    }
    if (edge === 2) {
      return { x: Phaser.Math.Between(40, 920), y: 516 };
    }
    return { x: 24, y: Phaser.Math.Between(40, 500) };
  }

  private endRun(): void {
    this.gameOver = true;
    this.spawnEvent?.remove(false);
    this.fireEvent?.remove(false);

    this.enemies.getChildren().forEach((obj) => {
      const enemy = obj as Phaser.Physics.Arcade.Sprite;
      enemy.setVelocity(0, 0);
    });

    this.player.setTint(0xff4444);
    this.gameOverText.setText(`GAME OVER\nWave: ${this.wave}\nScore: ${this.score}\nPress R to restart`);

    this.input.keyboard?.once("keydown-R", () => {
      this.scene.restart();
      this.health = 100;
      this.score = 0;
      this.wave = 1;
      this.aliveEnemies = 0;
      this.gameOver = false;
    });
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: "game-root",
  width: 960,
  height: 540,
  backgroundColor: "#140f23",
  physics: {
    default: "arcade",
    arcade: {
      debug: false,
    },
  },
  scene: [SurvivalScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
});

window.addEventListener("beforeunload", () => {
  game.destroy(true);
});
