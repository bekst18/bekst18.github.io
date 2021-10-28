import * as rl from "./rl.js";
import * as gfx from "./gfx.js";
export const db = new rl.ThingDB();
export const brickWall = db.insert(new rl.Tile({
    id: "brick_wall",
    name: "Brick Wall",
    image: "./assets/wall.png",
    passable: false,
    transparent: false
}));
export const floor = db.insert(new rl.Tile({
    id: "floor",
    name: "Floor",
    image: "./assets/floor.png",
    color: new gfx.Color(.2, .2, .2, 1),
    passable: true,
    transparent: true
}));
export const water = db.insert(new rl.Tile({
    id: "water",
    name: "Water",
    image: "./assets/water.png",
    passable: false,
    transparent: true
}));
export const grass = db.insert(new rl.Tile({
    id: "grass",
    name: "Grass",
    image: "./assets/grass.png",
    passable: true,
    transparent: true
}));
export const dirt = db.insert(new rl.Tile({
    id: "dirt",
    name: "Dirt",
    image: "./assets/dirt.png",
    passable: true,
    transparent: true
}));
export const sand = db.insert(new rl.Tile({
    id: "sand",
    name: "Sand",
    image: "./assets/sand.png",
    passable: true,
    transparent: true
}));
export const trees = db.insert(new rl.Fixture({
    id: "trees",
    name: "Trees",
    image: "./assets/trees.png",
    passable: true,
    transparent: false
}));
export const hills = db.insert(new rl.Fixture({
    id: "hills",
    name: "Hills",
    image: "./assets/hills.png",
    passable: true,
    transparent: true
}));
export const mountains = db.insert(new rl.Fixture({
    id: "mountains",
    name: "Mountains",
    image: "./assets/mountain.png",
    passable: false,
    transparent: false
}));
export const snow = db.insert(new rl.Fixture({
    id: "snow",
    name: "Snow",
    image: "./assets/snow.png",
    passable: true,
    transparent: true
}));
export const door = db.insert(new rl.Door({
    id: "door",
    name: "A Closed Wooden Door",
    image: "./assets/closed.png",
    passable: false,
    transparent: false
}));
export const stairsUp = db.insert(new rl.Exit({
    id: "stairs_up",
    name: "Stairs Up",
    image: "./assets/up.png",
    direction: rl.ExitDirection.Up,
}));
export const stairsDown = db.insert(new rl.Exit({
    id: "stairs_down",
    name: "Stairs Down",
    image: "./assets/down.png",
    direction: rl.ExitDirection.Down,
}));
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
}));
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
}));
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
}));
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
}));
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
}));
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
}));
export const redy = db.insert(new rl.Monster({
    id: "redy",
    name: "Redy",
    maxHealth: 5,
    image: "./assets/redy.png",
    experience: 2,
    level: 2,
    agility: 2,
    defense: 0,
    attacks: [
        new rl.Attack({
            attack: 0,
            damage: new rl.Dice(1, 1),
            action: 1,
            verb: "touches"
        }),
        new rl.Attack({
            attack: 0,
            damage: new rl.Dice(1, 1),
            action: 1,
            verb: "licks"
        })
    ]
}));
export const fider = db.insert(new rl.Monster({
    id: "fider",
    name: "Fider",
    maxHealth: 5,
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
}));
export const fists = db.insert(new rl.MeleeWeapon({
    id: "fists",
    name: "Fists",
    attack: 0,
    damage: new rl.Dice(1, 2),
    action: 1,
    verb: "punches at",
    level: 0,
    freq: 0,
}));
export const sharpStick = db.insert(new rl.MeleeWeapon({
    id: "sharp_stick",
    name: "Sharp Stick",
    attack: 1,
    action: 1,
    damage: new rl.Dice(1, 2),
    verb: "swings at",
    level: 0,
    freq: 0
}));
export const dagger = db.insert(new rl.MeleeWeapon({
    id: "dagger",
    name: "Dagger",
    attack: 1,
    action: 1,
    damage: new rl.Dice(1, 3),
    verb: "jabs at",
    level: 1,
}));
export const ironSword = db.insert(new rl.MeleeWeapon({
    id: "iron_sword",
    name: "Iron Sword",
    attack: 2,
    action: 1,
    damage: new rl.Dice(2, 4),
    verb: "thrusts at",
    level: 1,
}));
export const steelSword = db.insert(new rl.MeleeWeapon({
    id: "steel_sword",
    name: "Steel Sword",
    attack: 3,
    damage: new rl.Dice(3, 5),
    action: 1,
    verb: "thrusts at",
    level: 2,
}));
export const slingShot = db.insert(new rl.RangedWeapon({
    id: "slingshot",
    name: "Slingshot",
    attack: 1,
    range: 3,
    damage: new rl.Dice(1, 2),
    action: 1,
    verb: "shoots at",
    level: 1,
}));
export const woodenBow = db.insert(new rl.RangedWeapon({
    id: "wooden_bow",
    name: "Wooden Bow",
    attack: 2,
    range: 5,
    damage: new rl.Dice(2, 5),
    action: 1,
    verb: "shoots at",
    level: 2,
}));
export const clothArmor = db.insert(new rl.Armor({
    id: "cloth_armor",
    name: "Cloth Armor",
    defense: 1,
    level: 1,
}));
export const leatherArmor = db.insert(new rl.Armor({
    id: "leather_armor",
    name: "Leather Armor",
    defense: 2,
    level: 1,
}));
export const paddedArmor = db.insert(new rl.Armor({
    id: "padded_armor",
    name: "Padded Armor",
    defense: 3,
    level: 2,
}));
export const chainArmor = db.insert(new rl.Armor({
    id: "chain_armor",
    name: "Chain Armor",
    defense: 4,
    level: 2,
}));
export const scaleArmor = db.insert(new rl.Armor({
    id: "scale_armor",
    name: "Scale Armor",
    defense: 5,
    level: 3,
}));
export const plateArmor = db.insert(new rl.Armor({
    id: "plate_armor",
    name: "Plate Armor",
    defense: 6,
    level: 3,
}));
export const steelPlateArmor = db.insert(new rl.Armor({
    id: "steel_plate_armor",
    name: "Steel Plate Armor",
    defense: 7,
    level: 4,
}));
export const woodenShield = db.insert(new rl.Shield({
    id: "wooden_shield",
    name: "Wooden Shield",
    defense: 1,
    level: 2,
}));
export const ironShield = db.insert(new rl.Shield({
    id: "iron_shield",
    name: "Iron Shield",
    defense: 2,
    level: 2,
}));
export const steelShield = db.insert(new rl.Shield({
    id: "steel_shield",
    name: "Steel Shield",
    defense: 3,
    level: 3,
}));
export const towerShield = db.insert(new rl.Shield({
    id: "tower_shield",
    name: "Tower Shield",
    defense: 4,
    level: 4,
}));
export const weakHealthPotion = db.insert(new rl.Usable({
    id: "weak_health_potion",
    name: "Weak Health Potion",
    level: 1,
    health: 4,
}));
export const healthPotion = db.insert(new rl.Usable({
    id: "health_potion",
    name: "Health Potion",
    level: 2,
    health: 10
}));
export const chest = db.insert(new rl.Container({
    id: "chest",
    name: "Chest",
    image: "./assets/chest.png",
}));
export const player = db.insert(new rl.Player({
    id: "player",
    name: "Player",
    image: "./assets/char.png",
    maxHealth: 6,
    lightRadius: 4,
    level: 1,
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhpbmdzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGhpbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxFQUFFLE1BQU0sU0FBUyxDQUFBO0FBQzdCLE9BQU8sS0FBSyxHQUFHLE1BQU0sVUFBVSxDQUFBO0FBRS9CLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtBQUVsQyxNQUFNLENBQUMsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUM7SUFDM0MsRUFBRSxFQUFFLFlBQVk7SUFDaEIsSUFBSSxFQUFFLFlBQVk7SUFDbEIsS0FBSyxFQUFFLG1CQUFtQjtJQUMxQixRQUFRLEVBQUUsS0FBSztJQUNmLFdBQVcsRUFBRSxLQUFLO0NBQ3JCLENBQUMsQ0FBQyxDQUFBO0FBRUgsTUFBTSxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDO0lBQ3ZDLEVBQUUsRUFBRSxPQUFPO0lBQ1gsSUFBSSxFQUFFLE9BQU87SUFDYixLQUFLLEVBQUUsb0JBQW9CO0lBQzNCLEtBQUssRUFBRSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ25DLFFBQVEsRUFBRSxJQUFJO0lBQ2QsV0FBVyxFQUFFLElBQUk7Q0FDcEIsQ0FBQyxDQUFDLENBQUE7QUFFSCxNQUFNLENBQUMsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUM7SUFDdkMsRUFBRSxFQUFFLE9BQU87SUFDWCxJQUFJLEVBQUUsT0FBTztJQUNiLEtBQUssRUFBRSxvQkFBb0I7SUFDM0IsUUFBUSxFQUFFLEtBQUs7SUFDZixXQUFXLEVBQUUsSUFBSTtDQUNwQixDQUFD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LFdBQVcsRUFBRSxDQUFDO0lBQ2QsS0FBSyxFQUFFLENBQUM7Q0FDWCxDQUFDLENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHJsIGZyb20gXCIuL3JsLmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcblxyXG5leHBvcnQgY29uc3QgZGIgPSBuZXcgcmwuVGhpbmdEQigpXHJcblxyXG5leHBvcnQgY29uc3QgYnJpY2tXYWxsID0gZGIuaW5zZXJ0KG5ldyBybC5UaWxlKHtcclxuICAgIGlkOiBcImJyaWNrX3dhbGxcIixcclxuICAgIG5hbWU6IFwiQnJpY2sgV2FsbFwiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvd2FsbC5wbmdcIixcclxuICAgIHBhc3NhYmxlOiBmYWxzZSxcclxuICAgIHRyYW5zcGFyZW50OiBmYWxzZVxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBmbG9vciA9IGRiLmluc2VydChuZXcgcmwuVGlsZSh7XHJcbiAgICBpZDogXCJmbG9vclwiLFxyXG4gICAgbmFtZTogXCJGbG9vclwiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvZmxvb3IucG5nXCIsXHJcbiAgICBjb2xvcjogbmV3IGdmeC5Db2xvciguMiwgLjIsIC4yLCAxKSxcclxuICAgIHBhc3NhYmxlOiB0cnVlLFxyXG4gICAgdHJhbnNwYXJlbnQ6IHRydWVcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3Qgd2F0ZXIgPSBkYi5pbnNlcnQobmV3IHJsLlRpbGUoe1xyXG4gICAgaWQ6IFwid2F0ZXJcIixcclxuICAgIG5hbWU6IFwiV2F0ZXJcIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL3dhdGVyLnBuZ1wiLFxyXG4gICAgcGFzc2FibGU6IGZhbHNlLFxyXG4gICAgdHJhbnNwYXJlbnQ6IHRydWVcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3QgZ3Jhc3MgPSBkYi5pbnNlcnQobmV3IHJsLlRpbGUoe1xyXG4gICAgaWQ6IFwiZ3Jhc3NcIixcclxuICAgIG5hbWU6IFwiR3Jhc3NcIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL2dyYXNzLnBuZ1wiLFxyXG4gICAgcGFzc2FibGU6IHRydWUsXHJcbiAgICB0cmFuc3BhcmVudDogdHJ1ZVxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBkaXJ0ID0gZGIuaW5zZXJ0KG5ldyBybC5UaWxlKHtcclxuICAgIGlkOiBcImRpcnRcIixcclxuICAgIG5hbWU6IFwiRGlydFwiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvZGlydC5wbmdcIixcclxuICAgIHBhc3NhYmxlOiB0cnVlLFxyXG4gICAgdHJhbnNwYXJlbnQ6IHRydWVcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3Qgc2FuZCA9IGRiLmluc2VydChuZXcgcmwuVGlsZSh7XHJcbiAgICBpZDogXCJzYW5kXCIsXHJcbiAgICBuYW1lOiBcIlNhbmRcIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL3NhbmQucG5nXCIsXHJcbiAgICBwYXNzYWJsZTogdHJ1ZSxcclxuICAgIHRyYW5zcGFyZW50OiB0cnVlXHJcbn0pKVxyXG5cclxuXHJcbmV4cG9ydCBjb25zdCB0cmVlcyA9IGRiLmluc2VydChuZXcgcmwuRml4dHVyZSh7XHJcbiAgICBpZDogXCJ0cmVlc1wiLFxyXG4gICAgbmFtZTogXCJUcmVlc1wiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvdHJlZXMucG5nXCIsXHJcbiAgICBwYXNzYWJsZTogdHJ1ZSxcclxuICAgIHRyYW5zcGFyZW50OiBmYWxzZVxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBoaWxscyA9IGRiLmluc2VydChuZXcgcmwuRml4dHVyZSh7XHJcbiAgICBpZDogXCJoaWxsc1wiLFxyXG4gICAgbmFtZTogXCJIaWxsc1wiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvaGlsbHMucG5nXCIsXHJcbiAgICBwYXNzYWJsZTogdHJ1ZSxcclxuICAgIHRyYW5zcGFyZW50OiB0cnVlXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IG1vdW50YWlucyA9IGRiLmluc2VydChuZXcgcmwuRml4dHVyZSh7XHJcbiAgICBpZDogXCJtb3VudGFpbnNcIixcclxuICAgIG5hbWU6IFwiTW91bnRhaW5zXCIsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9tb3VudGFpbi5wbmdcIixcclxuICAgIHBhc3NhYmxlOiBmYWxzZSxcclxuICAgIHRyYW5zcGFyZW50OiBmYWxzZVxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBzbm93ID0gZGIuaW5zZXJ0KG5ldyBybC5GaXh0dXJlKHtcclxuICAgIGlkOiBcInNub3dcIixcclxuICAgIG5hbWU6IFwiU25vd1wiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvc25vdy5wbmdcIixcclxuICAgIHBhc3NhYmxlOiB0cnVlLFxyXG4gICAgdHJhbnNwYXJlbnQ6IHRydWVcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3QgZG9vciA9IGRiLmluc2VydChuZXcgcmwuRG9vcih7XHJcbiAgICBpZDogXCJkb29yXCIsXHJcbiAgICBuYW1lOiBcIkEgQ2xvc2VkIFdvb2RlbiBEb29yXCIsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9jbG9zZWQucG5nXCIsXHJcbiAgICBwYXNzYWJsZTogZmFsc2UsXHJcbiAgICB0cmFuc3BhcmVudDogZmFsc2VcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3Qgc3RhaXJzVXAgPSBkYi5pbnNlcnQobmV3IHJsLkV4aXQoe1xyXG4gICAgaWQ6IFwic3RhaXJzX3VwXCIsXHJcbiAgICBuYW1lOiBcIlN0YWlycyBVcFwiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvdXAucG5nXCIsXHJcbiAgICBkaXJlY3Rpb246IHJsLkV4aXREaXJlY3Rpb24uVXAsXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IHN0YWlyc0Rvd24gPSBkYi5pbnNlcnQobmV3IHJsLkV4aXQoe1xyXG4gICAgaWQ6IFwic3RhaXJzX2Rvd25cIixcclxuICAgIG5hbWU6IFwiU3RhaXJzIERvd25cIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL2Rvd24ucG5nXCIsXHJcbiAgICBkaXJlY3Rpb246IHJsLkV4aXREaXJlY3Rpb24uRG93bixcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3QgcmF0ID0gZGIuaW5zZXJ0KG5ldyBybC5Nb25zdGVyKHtcclxuICAgIGlkOiBcInJhdFwiLFxyXG4gICAgbmFtZTogXCJSYXRcIixcclxuICAgIG1heEhlYWx0aDogMyxcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL3JhdC5wbmdcIixcclxuICAgIGV4cGVyaWVuY2U6IDEsXHJcbiAgICBhZ2lsaXR5OiAwLFxyXG4gICAgZGVmZW5zZTogMCxcclxuICAgIGxldmVsOiAxLFxyXG4gICAgYXR0YWNrczogW1xyXG4gICAgICAgIG5ldyBybC5BdHRhY2soe1xyXG4gICAgICAgICAgICBhdHRhY2s6IDAsXHJcbiAgICAgICAgICAgIGRhbWFnZTogbmV3IHJsLkRpY2UoMSwgMSksXHJcbiAgICAgICAgICAgIGFjdGlvbjogMSxcclxuICAgICAgICAgICAgdmVyYjogXCJnbmF3cyBhdFwiXHJcbiAgICAgICAgfSlcclxuICAgIF1cclxufSkpXHJcblxyXG5leHBvcnQgY29uc3QgYmF0ID0gZGIuaW5zZXJ0KG5ldyBybC5Nb25zdGVyKHtcclxuICAgIGlkOiBcImJhdFwiLFxyXG4gICAgbmFtZTogXCJCYXRcIixcclxuICAgIG1heEhlYWx0aDogMyxcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL2JhdC5wbmdcIixcclxuICAgIGxldmVsOiAxLFxyXG4gICAgZXhwZXJpZW5jZTogMSxcclxuICAgIGFnaWxpdHk6IDAsXHJcbiAgICBkZWZlbnNlOiAwLFxyXG4gICAgYXR0YWNrczogW1xyXG4gICAgICAgIG5ldyBybC5BdHRhY2soe1xyXG4gICAgICAgICAgICBhdHRhY2s6IDAsXHJcbiAgICAgICAgICAgIGRhbWFnZTogbmV3IHJsLkRpY2UoMSwgMSksXHJcbiAgICAgICAgICAgIGFjdGlvbjogMSxcclxuICAgICAgICAgICAgdmVyYjogXCJuaXBzIGF0XCJcclxuICAgICAgICB9KVxyXG4gICAgXVxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBncmVlblNsaW1lID0gZGIuaW5zZXJ0KG5ldyBybC5Nb25zdGVyKHtcclxuICAgIGlkOiBcImdyZWVuX3NsaW1lXCIsXHJcbiAgICBuYW1lOiBcIkdyZWVuIFNsaW1lXCIsXHJcbiAgICBtYXhIZWFsdGg6IDMsXHJcbiAgICBjb2xvcjogZ2Z4LkNvbG9yLmdyZWVuLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvc2xpbWUucG5nXCIsXHJcbiAgICBsZXZlbDogMSxcclxuICAgIGV4cGVyaWVuY2U6IDEsXHJcbiAgICBhZ2lsaXR5OiAwLFxyXG4gICAgZGVmZW5zZTogMCxcclxuICAgIGF0dGFja3M6IFtcclxuICAgICAgICBuZXcgcmwuQXR0YWNrKHtcclxuICAgICAgICAgICAgYXR0YWNrOiAwLFxyXG4gICAgICAgICAgICBkYW1hZ2U6IG5ldyBybC5EaWNlKDEsIDEpLFxyXG4gICAgICAgICAgICBhY3Rpb246IDEsXHJcbiAgICAgICAgICAgIHZlcmI6IFwib296ZXMgb250b1wiXHJcbiAgICAgICAgfSlcclxuICAgIF1cclxufSkpXHJcblxyXG5leHBvcnQgY29uc3QgcmVkU2xpbWUgPSBkYi5pbnNlcnQobmV3IHJsLk1vbnN0ZXIoe1xyXG4gICAgaWQ6IFwicmVkX3NsaW1lXCIsXHJcbiAgICBuYW1lOiBcIlJlZCBTbGltZVwiLFxyXG4gICAgbWF4SGVhbHRoOiA1LFxyXG4gICAgY29sb3I6IGdmeC5Db2xvci5yZWQsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9zbGltZS5wbmdcIixcclxuICAgIGxldmVsOiAyLFxyXG4gICAgZXhwZXJpZW5jZTogMixcclxuICAgIGFnaWxpdHk6IDEsXHJcbiAgICBkZWZlbnNlOiAxLFxyXG4gICAgYXR0YWNrczogW1xyXG4gICAgICAgIG5ldyBybC5BdHRhY2soe1xyXG4gICAgICAgICAgICBhdHRhY2s6IDEsXHJcbiAgICAgICAgICAgIGRhbWFnZTogbmV3IHJsLkRpY2UoMSwgMiksXHJcbiAgICAgICAgICAgIGFjdGlvbjogMSxcclxuICAgICAgICAgICAgdmVyYjogXCJvb3plcyBvbnRvXCJcclxuICAgICAgICB9KVxyXG4gICAgXVxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBzcGlkZXIgPSBkYi5pbnNlcnQobmV3IHJsLk1vbnN0ZXIoe1xyXG4gICAgaWQ6IFwic3BpZGVyXCIsXHJcbiAgICBuYW1lOiBcIlNwaWRlclwiLFxyXG4gICAgbWF4SGVhbHRoOiAzLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvc3BpZGVyLnBuZ1wiLFxyXG4gICAgbGV2ZWw6IDEsXHJcbiAgICBleHBlcmllbmNlOiAxLFxyXG4gICAgYWdpbGl0eTogMSxcclxuICAgIGRlZmVuc2U6IDAsXHJcbiAgICBhdHRhY2tzOiBbXHJcbiAgICAgICAgbmV3IHJsLkF0dGFjayh7XHJcbiAgICAgICAgICAgIGF0dGFjazogMSxcclxuICAgICAgICAgICAgZGFtYWdlOiBuZXcgcmwuRGljZSgxLCAxKSxcclxuICAgICAgICAgICAgYWN0aW9uOiAxLFxyXG4gICAgICAgICAgICB2ZXJiOiBcImJpdGVzXCJcclxuICAgICAgICB9KVxyXG4gICAgXVxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBza2VsZXRvbiA9IGRiLmluc2VydChuZXcgcmwuTW9uc3Rlcih7XHJcbiAgICBpZDogXCJza2VsZXRvblwiLFxyXG4gICAgbmFtZTogXCJTa2VsZXRvblwiLFxyXG4gICAgbWF4SGVhbHRoOiA1LFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvc2tlbGV0b24ucG5nXCIsXHJcbiAgICBleHBlcmllbmNlOiAyLFxyXG4gICAgbGV2ZWw6IDEsXHJcbiAgICBhZ2lsaXR5OiAwLFxyXG4gICAgZGVmZW5zZTogMCxcclxuICAgIGF0dGFja3M6IFtcclxuICAgICAgICBuZXcgcmwuQXR0YWNrKHtcclxuICAgICAgICAgICAgYXR0YWNrOiAxLFxyXG4gICAgICAgICAgICBkYW1hZ2U6IG5ldyBybC5EaWNlKDEsIDMpLFxyXG4gICAgICAgICAgICBhY3Rpb246IDEsXHJcbiAgICAgICAgICAgIHZlcmI6IFwic2xhc2hlcyBhdFwiXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgbmV3IHJsLkF0dGFjayh7XHJcbiAgICAgICAgICAgIGF0dGFjazogMixcclxuICAgICAgICAgICAgZGFtYWdlOiBuZXcgcmwuRGljZSgxLCA0KSxcclxuICAgICAgICAgICAgYWN0aW9uOiAxLFxyXG4gICAgICAgICAgICB2ZXJiOiBcInRocnVzdHMgYXRcIlxyXG4gICAgICAgIH0pXHJcbiAgICBdXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IHJlZHkgPSBkYi5pbnNlcnQobmV3IHJsLk1vbnN0ZXIoe1xyXG4gICAgaWQ6IFwicmVkeVwiLFxyXG4gICAgbmFtZTogXCJSZWR5XCIsXHJcbiAgICBtYXhIZWFsdGg6IDUsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9yZWR5LnBuZ1wiLFxyXG4gICAgZXhwZXJpZW5jZTogMixcclxuICAgIGxldmVsOiAyLFxyXG4gICAgYWdpbGl0eTogMixcclxuICAgIGRlZmVuc2U6IDAsXHJcbiAgICBhdHRhY2tzOiBbXHJcbiAgICAgICAgbmV3IHJsLkF0dGFjayh7XHJcbiAgICAgICAgICAgIGF0dGFjazogMCxcclxuICAgICAgICAgICAgZGFtYWdlOiBuZXcgcmwuRGljZSgxLCAxKSxcclxuICAgICAgICAgICAgYWN0aW9uOiAxLFxyXG4gICAgICAgICAgICB2ZXJiOiBcInRvdWNoZXNcIlxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIG5ldyBybC5BdHRhY2soe1xyXG4gICAgICAgICAgICBhdHRhY2s6IDAsXHJcbiAgICAgICAgICAgIGRhbWFnZTogbmV3IHJsLkRpY2UoMSwgMSksXHJcbiAgICAgICAgICAgIGFjdGlvbjogMSxcclxuICAgICAgICAgICAgdmVyYjogXCJsaWNrc1wiXHJcbiAgICAgICAgfSlcclxuICAgIF1cclxufSkpXHJcblxyXG5leHBvcnQgY29uc3QgZmlkZXIgPSBkYi5pbnNlcnQobmV3IHJsLk1vbnN0ZXIoe1xyXG4gICAgaWQ6IFwiZmlkZXJcIixcclxuICAgIG5hbWU6IFwiRmlkZXJcIixcclxuICAgIG1heEhlYWx0aDogNSxcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL2ZpZGVyLnBuZ1wiLFxyXG4gICAgbGV2ZWw6IDIsXHJcbiAgICBleHBlcmllbmNlOiAyLFxyXG4gICAgYWdpbGl0eTogMSxcclxuICAgIGRlZmVuc2U6IDIsXHJcbiAgICBhdHRhY2tzOiBbXHJcbiAgICAgICAgbmV3IHJsLkF0dGFjayh7XHJcbiAgICAgICAgICAgIGF0dGFjazogMCxcclxuICAgICAgICAgICAgZGFtYWdlOiBuZXcgcmwuRGljZSgxLCAyKSxcclxuICAgICAgICAgICAgYWN0aW9uOiAxLFxyXG4gICAgICAgICAgICB2ZXJiOiBcImJ1cm5zXCJcclxuICAgICAgICB9KSxcclxuICAgICAgICBuZXcgcmwuQXR0YWNrKHtcclxuICAgICAgICAgICAgYXR0YWNrOiAwLFxyXG4gICAgICAgICAgICBkYW1hZ2U6IG5ldyBybC5EaWNlKDIsIDMpLFxyXG4gICAgICAgICAgICBhY3Rpb246IDEsXHJcbiAgICAgICAgICAgIHZlcmI6IFwic3BpbnMgYW5kIHNob290cyBmaXJlXCJcclxuICAgICAgICB9KVxyXG4gICAgXVxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBmaXN0cyA9IGRiLmluc2VydChuZXcgcmwuTWVsZWVXZWFwb24oe1xyXG4gICAgaWQ6IFwiZmlzdHNcIixcclxuICAgIG5hbWU6IFwiRmlzdHNcIixcclxuICAgIGF0dGFjazogMCxcclxuICAgIGRhbWFnZTogbmV3IHJsLkRpY2UoMSwgMiksXHJcbiAgICBhY3Rpb246IDEsXHJcbiAgICB2ZXJiOiBcInB1bmNoZXMgYXRcIixcclxuICAgIGxldmVsOiAwLFxyXG4gICAgZnJlcTogMCxcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3Qgc2hhcnBTdGljayA9IGRiLmluc2VydChuZXcgcmwuTWVsZWVXZWFwb24oe1xyXG4gICAgaWQ6IFwic2hhcnBfc3RpY2tcIixcclxuICAgIG5hbWU6IFwiU2hhcnAgU3RpY2tcIixcclxuICAgIGF0dGFjazogMSxcclxuICAgIGFjdGlvbjogMSxcclxuICAgIGRhbWFnZTogbmV3IHJsLkRpY2UoMSwgMiksXHJcbiAgICB2ZXJiOiBcInN3aW5ncyBhdFwiLFxyXG4gICAgbGV2ZWw6IDAsXHJcbiAgICBmcmVxOiAwXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IGRhZ2dlciA9IGRiLmluc2VydChuZXcgcmwuTWVsZWVXZWFwb24oe1xyXG4gICAgaWQ6IFwiZGFnZ2VyXCIsXHJcbiAgICBuYW1lOiBcIkRhZ2dlclwiLFxyXG4gICAgYXR0YWNrOiAxLFxyXG4gICAgYWN0aW9uOiAxLFxyXG4gICAgZGFtYWdlOiBuZXcgcmwuRGljZSgxLCAzKSxcclxuICAgIHZlcmI6IFwiamFicyBhdFwiLFxyXG4gICAgbGV2ZWw6IDEsXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IGlyb25Td29yZCA9IGRiLmluc2VydChuZXcgcmwuTWVsZWVXZWFwb24oe1xyXG4gICAgaWQ6IFwiaXJvbl9zd29yZFwiLFxyXG4gICAgbmFtZTogXCJJcm9uIFN3b3JkXCIsXHJcbiAgICBhdHRhY2s6IDIsXHJcbiAgICBhY3Rpb246IDEsXHJcbiAgICBkYW1hZ2U6IG5ldyBybC5EaWNlKDIsIDQpLFxyXG4gICAgdmVyYjogXCJ0aHJ1c3RzIGF0XCIsXHJcbiAgICBsZXZlbDogMSxcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3Qgc3RlZWxTd29yZCA9IGRiLmluc2VydChuZXcgcmwuTWVsZWVXZWFwb24oe1xyXG4gICAgaWQ6IFwic3RlZWxfc3dvcmRcIixcclxuICAgIG5hbWU6IFwiU3RlZWwgU3dvcmRcIixcclxuICAgIGF0dGFjazogMyxcclxuICAgIGRhbWFnZTogbmV3IHJsLkRpY2UoMywgNSksXHJcbiAgICBhY3Rpb246IDEsXHJcbiAgICB2ZXJiOiBcInRocnVzdHMgYXRcIixcclxuICAgIGxldmVsOiAyLFxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBzbGluZ1Nob3QgPSBkYi5pbnNlcnQobmV3IHJsLlJhbmdlZFdlYXBvbih7XHJcbiAgICBpZDogXCJzbGluZ3Nob3RcIixcclxuICAgIG5hbWU6IFwiU2xpbmdzaG90XCIsXHJcbiAgICBhdHRhY2s6IDEsXHJcbiAgICByYW5nZTogMyxcclxuICAgIGRhbWFnZTogbmV3IHJsLkRpY2UoMSwgMiksXHJcbiAgICBhY3Rpb246IDEsXHJcbiAgICB2ZXJiOiBcInNob290cyBhdFwiLFxyXG4gICAgbGV2ZWw6IDEsXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IHdvb2RlbkJvdyA9IGRiLmluc2VydChuZXcgcmwuUmFuZ2VkV2VhcG9uKHtcclxuICAgIGlkOiBcIndvb2Rlbl9ib3dcIixcclxuICAgIG5hbWU6IFwiV29vZGVuIEJvd1wiLFxyXG4gICAgYXR0YWNrOiAyLFxyXG4gICAgcmFuZ2U6IDUsXHJcbiAgICBkYW1hZ2U6IG5ldyBybC5EaWNlKDIsIDUpLFxyXG4gICAgYWN0aW9uOiAxLFxyXG4gICAgdmVyYjogXCJzaG9vdHMgYXRcIixcclxuICAgIGxldmVsOiAyLFxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBjbG90aEFybW9yID0gZGIuaW5zZXJ0KG5ldyBybC5Bcm1vcih7XHJcbiAgICBpZDogXCJjbG90aF9hcm1vclwiLFxyXG4gICAgbmFtZTogXCJDbG90aCBBcm1vclwiLFxyXG4gICAgZGVmZW5zZTogMSxcclxuICAgIGxldmVsOiAxLFxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBsZWF0aGVyQXJtb3IgPSBkYi5pbnNlcnQobmV3IHJsLkFybW9yKHtcclxuICAgIGlkOiBcImxlYXRoZXJfYXJtb3JcIixcclxuICAgIG5hbWU6IFwiTGVhdGhlciBBcm1vclwiLFxyXG4gICAgZGVmZW5zZTogMixcclxuICAgIGxldmVsOiAxLFxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBwYWRkZWRBcm1vciA9IGRiLmluc2VydChuZXcgcmwuQXJtb3Ioe1xyXG4gICAgaWQ6IFwicGFkZGVkX2FybW9yXCIsXHJcbiAgICBuYW1lOiBcIlBhZGRlZCBBcm1vclwiLFxyXG4gICAgZGVmZW5zZTogMyxcclxuICAgIGxldmVsOiAyLFxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBjaGFpbkFybW9yID0gZGIuaW5zZXJ0KG5ldyBybC5Bcm1vcih7XHJcbiAgICBpZDogXCJjaGFpbl9hcm1vclwiLFxyXG4gICAgbmFtZTogXCJDaGFpbiBBcm1vclwiLFxyXG4gICAgZGVmZW5zZTogNCxcclxuICAgIGxldmVsOiAyLFxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBzY2FsZUFybW9yID0gZGIuaW5zZXJ0KG5ldyBybC5Bcm1vcih7XHJcbiAgICBpZDogXCJzY2FsZV9hcm1vclwiLFxyXG4gICAgbmFtZTogXCJTY2FsZSBBcm1vclwiLFxyXG4gICAgZGVmZW5zZTogNSxcclxuICAgIGxldmVsOiAzLFxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBwbGF0ZUFybW9yID0gZGIuaW5zZXJ0KG5ldyBybC5Bcm1vcih7XHJcbiAgICBpZDogXCJwbGF0ZV9hcm1vclwiLFxyXG4gICAgbmFtZTogXCJQbGF0ZSBBcm1vclwiLFxyXG4gICAgZGVmZW5zZTogNixcclxuICAgIGxldmVsOiAzLFxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBzdGVlbFBsYXRlQXJtb3IgPSBkYi5pbnNlcnQobmV3IHJsLkFybW9yKHtcclxuICAgIGlkOiBcInN0ZWVsX3BsYXRlX2FybW9yXCIsXHJcbiAgICBuYW1lOiBcIlN0ZWVsIFBsYXRlIEFybW9yXCIsXHJcbiAgICBkZWZlbnNlOiA3LFxyXG4gICAgbGV2ZWw6IDQsXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IHdvb2RlblNoaWVsZCA9IGRiLmluc2VydChuZXcgcmwuU2hpZWxkKHtcclxuICAgIGlkOiBcIndvb2Rlbl9zaGllbGRcIixcclxuICAgIG5hbWU6IFwiV29vZGVuIFNoaWVsZFwiLFxyXG4gICAgZGVmZW5zZTogMSxcclxuICAgIGxldmVsOiAyLFxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBpcm9uU2hpZWxkID0gZGIuaW5zZXJ0KG5ldyBybC5TaGllbGQoe1xyXG4gICAgaWQ6IFwiaXJvbl9zaGllbGRcIixcclxuICAgIG5hbWU6IFwiSXJvbiBTaGllbGRcIixcclxuICAgIGRlZmVuc2U6IDIsXHJcbiAgICBsZXZlbDogMixcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3Qgc3RlZWxTaGllbGQgPSBkYi5pbnNlcnQobmV3IHJsLlNoaWVsZCh7XHJcbiAgICBpZDogXCJzdGVlbF9zaGllbGRcIixcclxuICAgIG5hbWU6IFwiU3RlZWwgU2hpZWxkXCIsXHJcbiAgICBkZWZlbnNlOiAzLFxyXG4gICAgbGV2ZWw6IDMsXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IHRvd2VyU2hpZWxkID0gZGIuaW5zZXJ0KG5ldyBybC5TaGllbGQoe1xyXG4gICAgaWQ6IFwidG93ZXJfc2hpZWxkXCIsXHJcbiAgICBuYW1lOiBcIlRvd2VyIFNoaWVsZFwiLFxyXG4gICAgZGVmZW5zZTogNCxcclxuICAgIGxldmVsOiA0LFxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCB3ZWFrSGVhbHRoUG90aW9uID0gZGIuaW5zZXJ0KG5ldyBybC5Vc2FibGUoe1xyXG4gICAgaWQ6IFwid2Vha19oZWFsdGhfcG90aW9uXCIsXHJcbiAgICBuYW1lOiBcIldlYWsgSGVhbHRoIFBvdGlvblwiLFxyXG4gICAgbGV2ZWw6IDEsXHJcbiAgICBoZWFsdGg6IDQsXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IGhlYWx0aFBvdGlvbiA9IGRiLmluc2VydChuZXcgcmwuVXNhYmxlKHtcclxuICAgIGlkOiBcImhlYWx0aF9wb3Rpb25cIixcclxuICAgIG5hbWU6IFwiSGVhbHRoIFBvdGlvblwiLFxyXG4gICAgbGV2ZWw6IDIsXHJcbiAgICBoZWFsdGg6IDEwXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IGNoZXN0ID0gZGIuaW5zZXJ0KG5ldyBybC5Db250YWluZXIoe1xyXG4gICAgaWQ6IFwiY2hlc3RcIixcclxuICAgIG5hbWU6IFwiQ2hlc3RcIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL2NoZXN0LnBuZ1wiLFxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBwbGF5ZXIgPSBkYi5pbnNlcnQobmV3IHJsLlBsYXllcih7XHJcbiAgICBpZDogXCJwbGF5ZXJcIixcclxuICAgIG5hbWU6IFwiUGxheWVyXCIsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9jaGFyLnBuZ1wiLFxyXG4gICAgbWF4SGVhbHRoOiA2LFxyXG4gICAgbGlnaHRSYWRpdXM6IDQsXHJcbiAgICBsZXZlbDogMSxcclxufSkpIl19