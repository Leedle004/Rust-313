//! Game entities and their per-frame integration.
//!
//! These types hold no rendering state — only the data the simulation needs.
//! The renderer reads them each frame to draw the world.

use crate::util::{rand_range, rand_unit, wrap_position};
use glam::Vec2;

/// Asteroid size tier. Large asteroids split into mediums, mediums into smalls,
/// and smalls are destroyed outright.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AstSize {
    Large,
    Medium,
    Small,
}

impl AstSize {
    pub fn radius(self) -> f32 {
        match self {
            AstSize::Large => 46.0,
            AstSize::Medium => 26.0,
            AstSize::Small => 14.0,
        }
    }

    /// Score awarded for destroying an asteroid of this size.
    pub fn score(self) -> u32 {
        match self {
            AstSize::Large => 20,
            AstSize::Medium => 50,
            AstSize::Small => 100,
        }
    }

    /// The smaller tier this asteroid breaks into, if any.
    pub fn smaller(self) -> Option<AstSize> {
        match self {
            AstSize::Large => Some(AstSize::Medium),
            AstSize::Medium => Some(AstSize::Small),
            AstSize::Small => None,
        }
    }

    /// Speed range (units/sec) for a freshly spawned asteroid of this tier.
    fn speed_range(self) -> (f32, f32) {
        match self {
            AstSize::Large => (35.0, 80.0),
            AstSize::Medium => (60.0, 130.0),
            AstSize::Small => (90.0, 190.0),
        }
    }
}

#[derive(Clone, Debug)]
pub struct Ship {
    pub pos: Vec2,
    pub vel: Vec2,
    /// Facing angle in radians (0 == +x / right).
    pub angle: f32,
    pub thrusting: bool,
    pub radius: f32,
    /// Remaining invulnerability time after (re)spawn, in seconds.
    pub invuln: f32,
    /// Seconds until the ship may fire again.
    pub fire_cd: f32,
}

impl Ship {
    pub const TURN_SPEED: f32 = 4.2;
    pub const THRUST: f32 = 360.0;
    pub const MAX_SPEED: f32 = 430.0;
    pub const DRAG: f32 = 0.45;
    pub const FIRE_COOLDOWN: f32 = 0.17;
    pub const SPAWN_INVULN: f32 = 2.5;

    pub fn new(pos: Vec2) -> Self {
        Ship {
            pos,
            vel: Vec2::ZERO,
            angle: -std::f32::consts::FRAC_PI_2, // pointing up
            thrusting: false,
            radius: 13.0,
            invuln: Self::SPAWN_INVULN,
            fire_cd: 0.0,
        }
    }

    pub fn is_invulnerable(&self) -> bool {
        self.invuln > 0.0
    }

    /// Advance the ship one step. Returns nothing; firing is handled by `World`.
    pub fn integrate(&mut self, dt: f32, turn: f32, thrust: bool, w: f32, h: f32) {
        self.angle += turn * Self::TURN_SPEED * dt;
        self.thrusting = thrust;
        if thrust {
            let dir = Vec2::new(self.angle.cos(), self.angle.sin());
            self.vel += dir * Self::THRUST * dt;
        }
        // Velocity damping so the ship eventually coasts to a stop.
        self.vel *= 1.0 - (Self::DRAG * dt).min(1.0);
        let speed = self.vel.length();
        if speed > Self::MAX_SPEED {
            self.vel = self.vel / speed * Self::MAX_SPEED;
        }
        self.pos = wrap_position(self.pos + self.vel * dt, w, h);

        if self.invuln > 0.0 {
            self.invuln -= dt;
        }
        if self.fire_cd > 0.0 {
            self.fire_cd -= dt;
        }
    }

    /// The world-space muzzle position at the ship's nose.
    pub fn nose(&self) -> Vec2 {
        self.pos + Vec2::new(self.angle.cos(), self.angle.sin()) * (self.radius + 4.0)
    }
}

#[derive(Clone, Debug)]
pub struct Bullet {
    pub pos: Vec2,
    pub vel: Vec2,
    pub life: f32,
    pub radius: f32,
    /// True if fired by the player, false if fired by a UFO.
    pub from_player: bool,
}

impl Bullet {
    pub const SPEED: f32 = 540.0;
    pub const LIFE: f32 = 0.95;

    pub fn integrate(&mut self, dt: f32, w: f32, h: f32) {
        self.pos = wrap_position(self.pos + self.vel * dt, w, h);
        self.life -= dt;
    }

    pub fn alive(&self) -> bool {
        self.life > 0.0
    }
}

#[derive(Clone, Debug)]
pub struct Asteroid {
    pub pos: Vec2,
    pub vel: Vec2,
    pub size: AstSize,
    pub radius: f32,
    /// Current visual rotation (radians) and its angular velocity.
    pub spin: f32,
    pub spin_vel: f32,
    /// Per-vertex radius jitter (0.7..1.0 multipliers) giving each rock a
    /// distinct lumpy silhouette. Length is the polygon vertex count.
    pub shape: Vec<f32>,
}

impl Asteroid {
    pub fn new(pos: Vec2, size: AstSize) -> Self {
        let (lo, hi) = size.speed_range();
        let vel = rand_unit() * rand_range(lo, hi);
        let verts = 10 + (quad_rand::gen_range(0u32, 4u32)) as usize;
        let shape = (0..verts).map(|_| rand_range(0.74, 1.0)).collect();
        Asteroid {
            pos,
            vel,
            size,
            radius: size.radius(),
            spin: rand_range(0.0, std::f32::consts::TAU),
            spin_vel: rand_range(-1.6, 1.6),
            shape,
        }
    }

    pub fn integrate(&mut self, dt: f32, w: f32, h: f32) {
        self.pos = wrap_position(self.pos + self.vel * dt, w, h);
        self.spin += self.spin_vel * dt;
    }
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum UfoSize {
    Big,
    Small,
}

#[derive(Clone, Debug)]
pub struct Ufo {
    pub pos: Vec2,
    pub vel: Vec2,
    pub size: UfoSize,
    pub radius: f32,
    /// Seconds until the next shot.
    pub shoot_cd: f32,
    /// Seconds until the UFO changes vertical drift direction.
    pub turn_cd: f32,
}

impl Ufo {
    pub fn radius_for(size: UfoSize) -> f32 {
        match size {
            UfoSize::Big => 22.0,
            UfoSize::Small => 13.0,
        }
    }

    pub fn score(&self) -> u32 {
        match self.size {
            UfoSize::Big => 200,
            UfoSize::Small => 1000,
        }
    }

    pub fn integrate(&mut self, dt: f32, w: f32, h: f32) {
        // UFOs wrap vertically but travel straight across horizontally; the
        // caller removes them once they exit the far side.
        let mut pos = self.pos + self.vel * dt;
        if pos.y < 0.0 {
            pos.y += h;
        } else if pos.y >= h {
            pos.y -= h;
        }
        self.pos = pos;
        let _ = w;
        self.shoot_cd -= dt;
        self.turn_cd -= dt;
    }
}

/// A short-lived visual spark used for thrust trails and explosions.
#[derive(Clone, Debug)]
pub struct Particle {
    pub pos: Vec2,
    pub vel: Vec2,
    pub life: f32,
    pub max_life: f32,
    /// 0 == cool/white spark, 1 == warm/orange spark (renderer interprets).
    pub warm: f32,
    pub size: f32,
}

impl Particle {
    pub fn integrate(&mut self, dt: f32, w: f32, h: f32) {
        self.pos = wrap_position(self.pos + self.vel * dt, w, h);
        self.vel *= 1.0 - (2.0 * dt).min(1.0);
        self.life -= dt;
    }

    pub fn alive(&self) -> bool {
        self.life > 0.0
    }

    /// Remaining life as a 0..1 fraction (for fade-out).
    pub fn fade(&self) -> f32 {
        (self.life / self.max_life).clamp(0.0, 1.0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn ship_thrust_accelerates_along_facing() {
        let mut s = Ship::new(Vec2::new(100.0, 100.0));
        s.angle = 0.0; // facing +x
        s.invuln = 0.0;
        s.integrate(0.1, 0.0, true, 800.0, 600.0);
        assert!(s.vel.x > 0.0, "should accelerate along +x, got {:?}", s.vel);
        assert!(s.vel.y.abs() < 1e-3);
    }

    #[test]
    fn ship_speed_is_capped() {
        let mut s = Ship::new(Vec2::new(100.0, 100.0));
        s.angle = 0.0;
        s.invuln = 0.0;
        for _ in 0..600 {
            s.integrate(0.016, 0.0, true, 800.0, 600.0);
        }
        assert!(s.vel.length() <= Ship::MAX_SPEED + 1.0);
    }

    #[test]
    fn bullet_expires() {
        let mut b = Bullet {
            pos: Vec2::ZERO,
            vel: Vec2::new(10.0, 0.0),
            life: 0.05,
            radius: 2.0,
            from_player: true,
        };
        assert!(b.alive());
        b.integrate(0.1, 800.0, 600.0);
        assert!(!b.alive());
    }

    #[test]
    fn size_tiers_split_downward() {
        assert_eq!(AstSize::Large.smaller(), Some(AstSize::Medium));
        assert_eq!(AstSize::Medium.smaller(), Some(AstSize::Small));
        assert_eq!(AstSize::Small.smaller(), None);
    }
}
