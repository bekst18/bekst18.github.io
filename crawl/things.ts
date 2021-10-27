import * as rl from "./rl.js"
import * as gfx from "./gfx.js"

export const db = new rl.ThingDB()

export const brickWall = db.insert(new rl.Tile({
    id: "brick_wall",
    name: "Brick Wall",
    image: "./assets/wall.png",
    passable: false,
    transparent: false
}))

export const floor = db.insert(new rl.Tile({
    id: "floor",
    name: "Floor",
    image: "./assets/floor.png",
    color: new gfx.Color(.2, .2, .2, 1),
    passable: true,
    transparent: true
}))

export const water = db.insert(new rl.Tile({
    id: "water",
    name: "Water",
    image: "./assets/water.png",
    passable: false,
    transparent: true
}))

export const grass = db.insert(new rl.Tile({
    id: "grass",
    name: "Grass",
    image: "./assets/grass.png",
    passable: true,
    transparent: true
}))

export const dirt = db.insert(new rl.Tile({
    id: "dirt",
    name: "Dirt",
    image: "./assets/dirt.png",
    passable: true,
    transparent: true
}))

export const sand = db.insert(new rl.Tile({
    id: "sand",
    name: "Sand",
    image: "./assets/sand.png",
    passable: true,
    transparent: true
}))


export const trees = db.insert(new rl.Fixture({
    id: "trees",
    name: "Trees",
    image: "./assets/trees.png",
    passable: true,
    transparent: false
}))

export const hills = db.insert(new rl.Fixture({
    id: "hills",
    name: "Hills",
    image: "./assets/hills.png",
    passable: true,
    transparent: true
}))

export const mountains = db.insert(new rl.Fixture({
    id: "mountains",
    name: "Mountains",
    image: "./assets/mountain.png",
    passable: false,
    transparent: false
}))

export const snow = db.insert(new rl.Fixture({
    id: "snow",
    name: "Snow",
    image: "./assets/snow.png",
    passable: true,
    transparent: true
}))

export const door = db.insert(new rl.Door({
    id: "door",
    name: "A Closed Wooden Door",
    image: "./assets/closed.png",
    passable: false,
    transparent: false
}))

export const stairsUp = db.insert(new rl.Exit({
    id: "stairs_up",
    name: "Stairs Up",
    image: "./assets/up.png",
    direction: rl.ExitDirection.Up,
}))

export const stairsDown = db.insert(new rl.Exit({
    id: "stairs_down",
    name: "Stairs Down",
    image: "./assets/down.png",
    direction: rl.ExitDirection.Down,
}))

export const rat = db.insert(new rl.Monster({
    id: "rat",
    name: "Rat",
    maxHealth: 3,
    image: "./assets/rat.png",
    experience: 1,
    agility: 0,
    defense: 0,
    level: 1,
    attacks: [
        new rl.Attack({
            attack: 0,
            damage: new rl.Dice(1, 1),
            action: 1,
            verb: "gnaws at"
        })
    ]
}))

export const bat = db.insert(new rl.Monster({
    id: "bat",
    name: "Bat",
    maxHealth: 3,
    image: "./assets/bat.png",
    level: 1,
    experience: 1,
    agility: 0,
    defense: 0,
    attacks: [
        new rl.Attack({
            attack: 0,
            damage: new rl.Dice(1, 1),
            action: 1,
            verb: "nips at"
        })
    ]
}))

export const greenSlime = db.insert(new rl.Monster({
    id: "green_slime",
    name: "Green Slime",
    maxHealth: 3,
    color: gfx.Color.green,
    image: "./assets/slime.png",
    level: 1,
    experience: 1,
    agility: 0,
    defense: 0,
    attacks: [
        new rl.Attack({
            attack: 0,
            damage: new rl.Dice(1, 1),
            action: 1,
            verb: "oozes onto"
        })
    ]
}))

export const redSlime = db.insert(new rl.Monster({
    id: "red_slime",
    name: "Red Slime",
    maxHealth: 5,
    color: gfx.Color.red,
    image: "./assets/slime.png",
    level: 2,
    experience: 2,
    agility: 1,
    defense: 1,
    attacks: [
        new rl.Attack({
            attack: 1,
            damage: new rl.Dice(1, 2),
            action: 1,
            verb: "oozes onto"
        })
    ]
}))

export const spider = db.insert(new rl.Monster({
    id: "spider",
    name: "Spider",
    maxHealth: 3,
    image: "./assets/spider.png",
    level: 1,
    experience: 1,
    agility: 1,
    defense: 0,
    attacks: [
        new rl.Attack({
            attack: 1,
            damage: new rl.Dice(1, 1),
            action: 1,
            verb: "bites"
        })
    ]
}))

export const skeleton = db.insert(new rl.Monster({
    id: "skeleton",
    name: "Skeleton",
    maxHealth: 5,
    image: "./assets/skeleton.png",
    experience: 2,
    level: 1,
    agility: 0,
    defense: 0,
    attacks: [
        new rl.Attack({
            attack: 1,
            damage: new rl.Dice(1, 3),
            action: 1,
            verb: "slashes at"
        }),
        new rl.Attack({
            attack: 2,
            damage: new rl.Dice(1, 4),
            action: 1,
            verb: "thrusts at"
        })
    ]
}))

export const redy = db.insert(new rl.Monster({
    id: "redy",
    name: "Redy",
    maxHealth: 3,
    image: "./assets/redy.png",
    experience: 2,
    level: 1,
    agility: 1,
    defense: 0,
    attacks: [
        new rl.Attack({
            attack: 0,
            damage: new rl.Dice(1, 1),
            action: 1,
            verb: "touches"
        })
    ]
}))

export const fider = db.insert(new rl.Monster({
    id: "fider",
    name: "Fider",
    maxHealth: 4,
    image: "./assets/fider.png",
    level: 2,
    experience: 2,
    agility: 1,
    defense: 2,
    attacks: [
        new rl.Attack({
            attack: 0,
            damage: new rl.Dice(1, 2),
            action: 1,
            verb: "burns"
        }),
        new rl.Attack({
            attack: 0,
            damage: new rl.Dice(2, 3),
            action: 1,
            verb: "spins and shoots fire"
        })
    ]
}))

export const fists = db.insert(new rl.MeleeWeapon({
    id: "fists",
    name: "Fists",
    attack: 0,
    damage: new rl.Dice(1, 2),
    action: 1,
    verb: "punches at",
    level: 0,
    freq: 0,
}))

export const sharpStick = db.insert(new rl.MeleeWeapon({
    id: "sharp_stick",
    name: "Sharp Stick",
    attack: 1,
    action: 1,
    damage: new rl.Dice(1, 2),
    verb: "swings at",
    level: 0,
    freq: 0
}))

export const dagger = db.insert(new rl.MeleeWeapon({
    id: "dagger",
    name: "Dagger",
    attack: 1,
    action: 1,
    damage: new rl.Dice(1, 3),
    verb: "jabs at",
    level: 1,
}))

export const ironSword = db.insert(new rl.MeleeWeapon({
    id: "iron_sword",
    name: "Iron Sword",
    attack: 2,
    action: 1,
    damage: new rl.Dice(2, 4),
    verb: "thrusts at",
    level: 1,
}))

export const steelSword = db.insert(new rl.MeleeWeapon({
    id: "steel_sword",
    name: "Steel Sword",
    attack: 3,
    damage: new rl.Dice(3, 5),
    action: 1,
    verb: "thrusts at",
    level: 2,
}))

export const slingShot = db.insert(new rl.RangedWeapon({
    id: "slingshot",
    name: "Slingshot",
    attack: 1,
    range: 3,
    damage: new rl.Dice(1, 2),
    action: 1,
    verb: "shoots at",
    level: 1,
}))

export const woodenBow = db.insert(new rl.RangedWeapon({
    id: "wooden_bow",
    name: "Wooden Bow",
    attack: 2,
    range: 5,
    damage: new rl.Dice(2, 5),
    action: 1,
    verb: "shoots at",
    level: 2,
}))

export const clothArmor = db.insert(new rl.Armor({
    id: "cloth_armor",
    name: "Cloth Armor",
    defense: 1,
    level: 1,
}))

export const leatherArmor = db.insert(new rl.Armor({
    id: "leather_armor",
    name: "Leather Armor",
    defense: 2,
    level: 1,
}))

export const paddedArmor = db.insert(new rl.Armor({
    id: "padded_armor",
    name: "Padded Armor",
    defense: 3,
    level: 2,
}))

export const chainArmor = db.insert(new rl.Armor({
    id: "chain_armor",
    name: "Chain Armor",
    defense: 4,
    level: 2,
}))

export const scaleArmor = db.insert(new rl.Armor({
    id: "scale_armor",
    name: "Scale Armor",
    defense: 5,
    level: 3,
}))

export const plateArmor = db.insert(new rl.Armor({
    id: "plate_armor",
    name: "Plate Armor",
    defense: 6,
    level: 3,
}))

export const steelPlateArmor = db.insert(new rl.Armor({
    id: "steel_plate_armor",
    name: "Steel Plate Armor",
    defense: 7,
    level: 4,
}))

export const woodenShield = db.insert(new rl.Shield({
    id: "wooden_shield",
    name: "Wooden Shield",
    defense: 1,
    level: 2,
}))

export const ironShield = db.insert(new rl.Shield({
    id: "iron_shield",
    name: "Iron Shield",
    defense: 2,
    level: 2,
}))

export const steelShield = db.insert(new rl.Shield({
    id: "steel_shield",
    name: "Steel Shield",
    defense: 3,
    level: 3,
}))

export const towerShield = db.insert(new rl.Shield({
    id: "tower_shield",
    name: "Tower Shield",
    defense: 4,
    level: 4,
}))

export const weakHealthPotion = db.insert(new rl.Usable({
    id: "weak_health_potion",
    name: "Weak Health Potion",
    level: 1,
    health: 4,
}))

export const healthPotion = db.insert(new rl.Usable({
    id: "health_potion",
    name: "Health Potion",
    level: 2,
    health: 10
}))

export const chest = db.insert(new rl.Container({
    id: "chest",
    name: "Chest",
    image: "./assets/chest.png",
}))

export const player = db.insert(new rl.Player({
    id: "player",
    name: "Player",
    image: "./assets/char.png",
    maxHealth: 6,
    lightRadius: 4,
    level: 1,
}))