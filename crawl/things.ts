import * as rl from "./rl.js"
import * as gfx from "./gfx.js"

export const brickWall = new rl.Tile({
    name: "Brick Wall",
    image: "./assets/wall.png",
    passable: false,
    transparent: false
})

export const floor = new rl.Tile({
    name: "Floor",
    image: "./assets/floor.png",
    color: new gfx.Color(.2, .2, .2, 1),
    passable: true,
    transparent: true
})

export const water = new rl.Tile({
    name: "Water",
    image: "./assets/water.png",
    passable: false,
    transparent: true
})

export const grass = new rl.Tile({
    name: "Grass",
    image: "./assets/grass.png",
    passable: true,
    transparent: true
})

export const dirt = new rl.Tile({
    name: "Dirt",
    image: "./assets/dirt.png",
    passable: true,
    transparent: true
})

export const sand = new rl.Tile({
    name: "Sand",
    image: "./assets/sand.png",
    passable: true,
    transparent: true
})

export const trees = new rl.Fixture({
    name: "Trees",
    image: "./assets/trees.png",
    passable: true,
    transparent: false
})

export const hills = new rl.Fixture({
    name: "Hills",
    image: "./assets/hills.png",
    passable: true,
    transparent: true
})

export const mountains = new rl.Fixture({
    name: "Mountaihs",
    image: "./assets/mountain.png",
    passable: false,
    transparent: false
})

export const door = new rl.Door({
    name: "A Closed Wooden Door",
    image: "./assets/closed.png",
    passable: false,
    transparent: false
})

export const stairsUp = new rl.StairsUp({
    name: "Stairs Up",
    image: "./assets/up.png",
    passable: false,
    transparent: true,
})

export const stairsDown = new rl.StairsDown({
    name: "Stairs Down",
    image: "./assets/down.png",
    passable: false,
    transparent: true,
})

export const rat = new rl.Monster({
    name: "Rat",
    maxHealth: 3,
    image: "./assets/rat.png",
    experience: 1,
    agility: 0,
    defense: 0,
    attacks: [
        new rl.Attack({
            attack: 0,
            damage: new rl.Dice(1, 1),
            action: 1,
            verb: "gnaws at"
        })
    ]
})

export const bat = new rl.Monster({
    name: "Bat",
    maxHealth: 3,
    image: "./assets/bat.png",
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
})

export const greenSlime = new rl.Monster({
    name: "Green Slime",
    maxHealth: 3,
    color: gfx.Color.green,
    image: "./assets/slime.png",
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
})

export const redSlime = new rl.Monster({
    name: "Red Slime",
    maxHealth: 5,
    color: gfx.Color.red,
    image: "./assets/slime.png",
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
})

export const spider = new rl.Monster({
    name: "Spider",
    maxHealth: 3,
    image: "./assets/spider.png",
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
})

export const skeleton = new rl.Monster({
    name: "Skeleton",
    maxHealth: 5,
    image: "./assets/skeleton.png",
    experience: 2,
    agility: 1,
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
})

export const fists = new rl.MeleeWeapon({
    name: "Fists",
    attack: 0,
    damage: new rl.Dice(1, 2),
    action: 1,
    verb: "punches at"
})

export const sharpStick = new rl.MeleeWeapon({
    name: "Sharp Stick",
    attack: 1,
    action: 1,
    damage: new rl.Dice(1, 2),
    verb: "swings at"
})

export const dagger = new rl.MeleeWeapon({
    name: "Dagger",
    attack: 1,
    action: 1,
    damage: new rl.Dice(1, 3),
    verb: "jabs at"
})

export const ironSword = new rl.MeleeWeapon({
    name: "Iron Sword",
    attack: 2,
    action: 1,
    damage: new rl.Dice(2, 4),
    verb: "thrusts at"
})

export const steelSword = new rl.MeleeWeapon({
    name: "Steel Sword",
    attack: 3,
    damage: new rl.Dice(3, 5),
    action: 1,
    verb: "thrusts at"
})

export const slingShot = new rl.RangedWeapon({
    name: "Slingshot",
    attack: 1,
    range: 3,
    damage: new rl.Dice(1, 2),
    action: 1,
    verb: "shoots at"
})

export const woodenBow = new rl.RangedWeapon({
    name: "Wooden Bow",
    attack: 2,
    range: 5,
    damage: new rl.Dice(2, 5),
    action: 1,
    verb: "shoots at"
})

export const clothArmor = new rl.Armor({
    name: "Cloth Armor",
    defense: 1
})

export const leatherArmor = new rl.Armor({
    name: "Leather Armor",
    defense: 2
})

export const paddedArmor = new rl.Armor({
    name: "Padded Armor",
    defense: 3
})

export const chainArmor = new rl.Armor({
    name: "Chain Armor",
    defense: 4
})

export const scaleArmor = new rl.Armor({
    name: "Scale Armor",
    defense: 5
})

export const plateArmor = new rl.Armor({
    name: "Plate Armor",
    defense: 6
})

export const steelPlateArmor = new rl.Armor({
    name: "Steel Plate Armor",
    defense: 7
})

export const woodenShield = new rl.Shield({
    name: "Wooden Shield",
    defense: 1
})

export const ironShield = new rl.Shield({
    name: "Iron Shield",
    defense: 2
})

export const steelShield = new rl.Shield({
    name: "Steel Shield",
    defense: 3
})

export const towerShield = new rl.Shield({
    name: "Tower Shield",
    defense: 4
})

export const weakHealthPotion = new rl.Usable({
    name: "Weak Health Potion",
    health: 4
})

export const healthPotion = new rl.Usable({
    name: "Health Potion",
    health: 10
})

export const chest = new rl.Container({
    name: "Chest",
    image: "./assets/chest.png",
})

export const player = new rl.Player({
    name: "Player",
    image: "./assets/char.png",
    maxHealth: 6,
    lightRadius: 5
})
