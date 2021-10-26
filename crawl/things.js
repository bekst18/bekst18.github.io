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
}));
export const redy = db.insert(new rl.Monster({
    id: "redy",
    name: "Redy",
    maxHealth: 3,
    image: "./assets/redy.png",
    experience: 2,
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
}));
export const fider = db.insert(new rl.Monster({
    id: "fider",
    name: "Fider",
    maxHealth: 4,
    image: "./assets/fider.png",
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
    verb: "punches at"
}));
export const sharpStick = db.insert(new rl.MeleeWeapon({
    id: "sharp_stick",
    name: "Sharp Stick",
    attack: 1,
    action: 1,
    damage: new rl.Dice(1, 2),
    verb: "swings at"
}));
export const dagger = db.insert(new rl.MeleeWeapon({
    id: "dagger",
    name: "Dagger",
    attack: 1,
    action: 1,
    damage: new rl.Dice(1, 3),
    verb: "jabs at"
}));
export const ironSword = db.insert(new rl.MeleeWeapon({
    id: "iron_sword",
    name: "Iron Sword",
    attack: 2,
    action: 1,
    damage: new rl.Dice(2, 4),
    verb: "thrusts at"
}));
export const steelSword = db.insert(new rl.MeleeWeapon({
    id: "steel_sword",
    name: "Steel Sword",
    attack: 3,
    damage: new rl.Dice(3, 5),
    action: 1,
    verb: "thrusts at"
}));
export const slingShot = db.insert(new rl.RangedWeapon({
    id: "slingshot",
    name: "Slingshot",
    attack: 1,
    range: 3,
    damage: new rl.Dice(1, 2),
    action: 1,
    verb: "shoots at"
}));
export const woodenBow = db.insert(new rl.RangedWeapon({
    id: "wooden_bow",
    name: "Wooden Bow",
    attack: 2,
    range: 5,
    damage: new rl.Dice(2, 5),
    action: 1,
    verb: "shoots at"
}));
export const clothArmor = db.insert(new rl.Armor({
    id: "cloth_armor",
    name: "Cloth Armor",
    defense: 1
}));
export const leatherArmor = db.insert(new rl.Armor({
    id: "leather_armor",
    name: "Leather Armor",
    defense: 2
}));
export const paddedArmor = db.insert(new rl.Armor({
    id: "padded_armor",
    name: "Padded Armor",
    defense: 3
}));
export const chainArmor = db.insert(new rl.Armor({
    id: "chain_armor",
    name: "Chain Armor",
    defense: 4
}));
export const scaleArmor = db.insert(new rl.Armor({
    id: "scale_armor",
    name: "Scale Armor",
    defense: 5
}));
export const plateArmor = db.insert(new rl.Armor({
    id: "plate_armor",
    name: "Plate Armor",
    defense: 6
}));
export const steelPlateArmor = db.insert(new rl.Armor({
    id: "steel_plate_armor",
    name: "Steel Plate Armor",
    defense: 7
}));
export const woodenShield = db.insert(new rl.Shield({
    id: "wooden_shield",
    name: "Wooden Shield",
    defense: 1
}));
export const ironShield = db.insert(new rl.Shield({
    id: "iron_shield",
    name: "Iron Shield",
    defense: 2
}));
export const steelShield = db.insert(new rl.Shield({
    id: "steel_shield",
    name: "Steel Shield",
    defense: 3
}));
export const towerShield = db.insert(new rl.Shield({
    id: "tower_shield",
    name: "Tower Shield",
    defense: 4
}));
export const weakHealthPotion = db.insert(new rl.Usable({
    id: "weak_health_potion",
    name: "Weak Health Potion",
    health: 4
}));
export const healthPotion = db.insert(new rl.Usable({
    id: "health_potion",
    name: "Health Potion",
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
    lightRadius: 5
}));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhpbmdzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGhpbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxFQUFFLE1BQU0sU0FBUyxDQUFBO0FBQzdCLE9BQU8sS0FBSyxHQUFHLE1BQU0sVUFBVSxDQUFBO0FBRS9CLE1BQU0sQ0FBQyxNQUFNLEVBQUUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxPQUFPLEVBQUUsQ0FBQTtBQUVsQyxNQUFNLENBQUMsTUFBTSxTQUFTLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUM7SUFDM0MsRUFBRSxFQUFFLFlBQVk7SUFDaEIsSUFBSSxFQUFFLFlBQVk7SUFDbEIsS0FBSyxFQUFFLG1CQUFtQjtJQUMxQixRQUFRLEVBQUUsS0FBSztJQUNmLFdBQVcsRUFBRSxLQUFLO0NBQ3JCLENBQUMsQ0FBQyxDQUFBO0FBRUgsTUFBTSxDQUFDLE1BQU0sS0FBSyxHQUFHLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDO0lBQ3ZDLEVBQUUsRUFBRSxPQUFPO0lBQ1gsSUFBSSxFQUFFLE9BQU87SUFDYixLQUFLLEVBQUUsb0JBQW9CO0lBQzNCLEtBQUssRUFBRSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ25DLFFBQVEsRUFBRSxJQUFJO0lBQ2QsV0FBVyxFQUFFLElBQUk7Q0FDcEIsQ0FBQyxDQUFDLENBQUE7QUFFSCxNQUFNLENBQUMsTUFBTSxLQUFLLEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUM7SUFDdkMsRUFBRSxFQUFFLE9BQU87SUFDWCxJQUFJLEVBQUUsT0FBTztJQUNiLEtBQUssRUFBRSxvQkFBb0I7SUFDM0IsUUFBUSxFQUFFLEtBQUs7SUFDZixXQUFXLEVBQUUsSUFBSTtDQUNwQixDQUFD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LEdBQUcsRUFBRSxDQUFDLE1BQU0sQ0FBQyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUM7SUFDMUMsRUFBRSxFQUFFLFFBQVE7SUFDWixJQUFJLEVBQUUsUUFBUTtJQUNkLEtBQUssRUFBRSxtQkFBbUI7SUFDMUIsU0FBUyxFQUFFLENBQUM7SUFDWixXQUFXLEVBQUUsQ0FBQztDQUNqQixDQUFDLENBQUMsQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIHJsIGZyb20gXCIuL3JsLmpzXCJcclxuaW1wb3J0ICogYXMgZ2Z4IGZyb20gXCIuL2dmeC5qc1wiXHJcblxyXG5leHBvcnQgY29uc3QgZGIgPSBuZXcgcmwuVGhpbmdEQigpXHJcblxyXG5leHBvcnQgY29uc3QgYnJpY2tXYWxsID0gZGIuaW5zZXJ0KG5ldyBybC5UaWxlKHtcclxuICAgIGlkOiBcImJyaWNrX3dhbGxcIixcclxuICAgIG5hbWU6IFwiQnJpY2sgV2FsbFwiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvd2FsbC5wbmdcIixcclxuICAgIHBhc3NhYmxlOiBmYWxzZSxcclxuICAgIHRyYW5zcGFyZW50OiBmYWxzZVxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBmbG9vciA9IGRiLmluc2VydChuZXcgcmwuVGlsZSh7XHJcbiAgICBpZDogXCJmbG9vclwiLFxyXG4gICAgbmFtZTogXCJGbG9vclwiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvZmxvb3IucG5nXCIsXHJcbiAgICBjb2xvcjogbmV3IGdmeC5Db2xvciguMiwgLjIsIC4yLCAxKSxcclxuICAgIHBhc3NhYmxlOiB0cnVlLFxyXG4gICAgdHJhbnNwYXJlbnQ6IHRydWVcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3Qgd2F0ZXIgPSBkYi5pbnNlcnQobmV3IHJsLlRpbGUoe1xyXG4gICAgaWQ6IFwid2F0ZXJcIixcclxuICAgIG5hbWU6IFwiV2F0ZXJcIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL3dhdGVyLnBuZ1wiLFxyXG4gICAgcGFzc2FibGU6IGZhbHNlLFxyXG4gICAgdHJhbnNwYXJlbnQ6IHRydWVcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3QgZ3Jhc3MgPSBkYi5pbnNlcnQobmV3IHJsLlRpbGUoe1xyXG4gICAgaWQ6IFwiZ3Jhc3NcIixcclxuICAgIG5hbWU6IFwiR3Jhc3NcIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL2dyYXNzLnBuZ1wiLFxyXG4gICAgcGFzc2FibGU6IHRydWUsXHJcbiAgICB0cmFuc3BhcmVudDogdHJ1ZVxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBkaXJ0ID0gZGIuaW5zZXJ0KG5ldyBybC5UaWxlKHtcclxuICAgIGlkOiBcImRpcnRcIixcclxuICAgIG5hbWU6IFwiRGlydFwiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvZGlydC5wbmdcIixcclxuICAgIHBhc3NhYmxlOiB0cnVlLFxyXG4gICAgdHJhbnNwYXJlbnQ6IHRydWVcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3Qgc2FuZCA9IGRiLmluc2VydChuZXcgcmwuVGlsZSh7XHJcbiAgICBpZDogXCJzYW5kXCIsXHJcbiAgICBuYW1lOiBcIlNhbmRcIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL3NhbmQucG5nXCIsXHJcbiAgICBwYXNzYWJsZTogdHJ1ZSxcclxuICAgIHRyYW5zcGFyZW50OiB0cnVlXHJcbn0pKVxyXG5cclxuXHJcbmV4cG9ydCBjb25zdCB0cmVlcyA9IGRiLmluc2VydChuZXcgcmwuRml4dHVyZSh7XHJcbiAgICBpZDogXCJ0cmVlc1wiLFxyXG4gICAgbmFtZTogXCJUcmVlc1wiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvdHJlZXMucG5nXCIsXHJcbiAgICBwYXNzYWJsZTogdHJ1ZSxcclxuICAgIHRyYW5zcGFyZW50OiBmYWxzZVxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBoaWxscyA9IGRiLmluc2VydChuZXcgcmwuRml4dHVyZSh7XHJcbiAgICBpZDogXCJoaWxsc1wiLFxyXG4gICAgbmFtZTogXCJIaWxsc1wiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvaGlsbHMucG5nXCIsXHJcbiAgICBwYXNzYWJsZTogdHJ1ZSxcclxuICAgIHRyYW5zcGFyZW50OiB0cnVlXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IG1vdW50YWlucyA9IGRiLmluc2VydChuZXcgcmwuRml4dHVyZSh7XHJcbiAgICBpZDogXCJtb3VudGFpbnNcIixcclxuICAgIG5hbWU6IFwiTW91bnRhaW5zXCIsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9tb3VudGFpbi5wbmdcIixcclxuICAgIHBhc3NhYmxlOiBmYWxzZSxcclxuICAgIHRyYW5zcGFyZW50OiBmYWxzZVxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBzbm93ID0gZGIuaW5zZXJ0KG5ldyBybC5GaXh0dXJlKHtcclxuICAgIGlkOiBcInNub3dcIixcclxuICAgIG5hbWU6IFwiU25vd1wiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvc25vdy5wbmdcIixcclxuICAgIHBhc3NhYmxlOiB0cnVlLFxyXG4gICAgdHJhbnNwYXJlbnQ6IHRydWVcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3QgZG9vciA9IGRiLmluc2VydChuZXcgcmwuRG9vcih7XHJcbiAgICBpZDogXCJkb29yXCIsXHJcbiAgICBuYW1lOiBcIkEgQ2xvc2VkIFdvb2RlbiBEb29yXCIsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9jbG9zZWQucG5nXCIsXHJcbiAgICBwYXNzYWJsZTogZmFsc2UsXHJcbiAgICB0cmFuc3BhcmVudDogZmFsc2VcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3Qgc3RhaXJzVXAgPSBkYi5pbnNlcnQobmV3IHJsLkV4aXQoe1xyXG4gICAgaWQ6IFwic3RhaXJzX3VwXCIsXHJcbiAgICBuYW1lOiBcIlN0YWlycyBVcFwiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvdXAucG5nXCIsXHJcbiAgICBkaXJlY3Rpb246IHJsLkV4aXREaXJlY3Rpb24uVXAsXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IHN0YWlyc0Rvd24gPSBkYi5pbnNlcnQobmV3IHJsLkV4aXQoe1xyXG4gICAgaWQ6IFwic3RhaXJzX2Rvd25cIixcclxuICAgIG5hbWU6IFwiU3RhaXJzIERvd25cIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL2Rvd24ucG5nXCIsXHJcbiAgICBkaXJlY3Rpb246IHJsLkV4aXREaXJlY3Rpb24uRG93bixcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3QgcmF0ID0gZGIuaW5zZXJ0KG5ldyBybC5Nb25zdGVyKHtcclxuICAgIGlkOiBcInJhdFwiLFxyXG4gICAgbmFtZTogXCJSYXRcIixcclxuICAgIG1heEhlYWx0aDogMyxcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL3JhdC5wbmdcIixcclxuICAgIGV4cGVyaWVuY2U6IDEsXHJcbiAgICBhZ2lsaXR5OiAwLFxyXG4gICAgZGVmZW5zZTogMCxcclxuICAgIGF0dGFja3M6IFtcclxuICAgICAgICBuZXcgcmwuQXR0YWNrKHtcclxuICAgICAgICAgICAgYXR0YWNrOiAwLFxyXG4gICAgICAgICAgICBkYW1hZ2U6IG5ldyBybC5EaWNlKDEsIDEpLFxyXG4gICAgICAgICAgICBhY3Rpb246IDEsXHJcbiAgICAgICAgICAgIHZlcmI6IFwiZ25hd3MgYXRcIlxyXG4gICAgICAgIH0pXHJcbiAgICBdXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IGJhdCA9IGRiLmluc2VydChuZXcgcmwuTW9uc3Rlcih7XHJcbiAgICBpZDogXCJiYXRcIixcclxuICAgIG5hbWU6IFwiQmF0XCIsXHJcbiAgICBtYXhIZWFsdGg6IDMsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9iYXQucG5nXCIsXHJcbiAgICBleHBlcmllbmNlOiAxLFxyXG4gICAgYWdpbGl0eTogMCxcclxuICAgIGRlZmVuc2U6IDAsXHJcbiAgICBhdHRhY2tzOiBbXHJcbiAgICAgICAgbmV3IHJsLkF0dGFjayh7XHJcbiAgICAgICAgICAgIGF0dGFjazogMCxcclxuICAgICAgICAgICAgZGFtYWdlOiBuZXcgcmwuRGljZSgxLCAxKSxcclxuICAgICAgICAgICAgYWN0aW9uOiAxLFxyXG4gICAgICAgICAgICB2ZXJiOiBcIm5pcHMgYXRcIlxyXG4gICAgICAgIH0pXHJcbiAgICBdXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IGdyZWVuU2xpbWUgPSBkYi5pbnNlcnQobmV3IHJsLk1vbnN0ZXIoe1xyXG4gICAgaWQ6IFwiZ3JlZW5fc2xpbWVcIixcclxuICAgIG5hbWU6IFwiR3JlZW4gU2xpbWVcIixcclxuICAgIG1heEhlYWx0aDogMyxcclxuICAgIGNvbG9yOiBnZnguQ29sb3IuZ3JlZW4sXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9zbGltZS5wbmdcIixcclxuICAgIGV4cGVyaWVuY2U6IDEsXHJcbiAgICBhZ2lsaXR5OiAwLFxyXG4gICAgZGVmZW5zZTogMCxcclxuICAgIGF0dGFja3M6IFtcclxuICAgICAgICBuZXcgcmwuQXR0YWNrKHtcclxuICAgICAgICAgICAgYXR0YWNrOiAwLFxyXG4gICAgICAgICAgICBkYW1hZ2U6IG5ldyBybC5EaWNlKDEsIDEpLFxyXG4gICAgICAgICAgICBhY3Rpb246IDEsXHJcbiAgICAgICAgICAgIHZlcmI6IFwib296ZXMgb250b1wiXHJcbiAgICAgICAgfSlcclxuICAgIF1cclxufSkpXHJcblxyXG5leHBvcnQgY29uc3QgcmVkU2xpbWUgPSBkYi5pbnNlcnQobmV3IHJsLk1vbnN0ZXIoe1xyXG4gICAgaWQ6IFwicmVkX3NsaW1lXCIsXHJcbiAgICBuYW1lOiBcIlJlZCBTbGltZVwiLFxyXG4gICAgbWF4SGVhbHRoOiA1LFxyXG4gICAgY29sb3I6IGdmeC5Db2xvci5yZWQsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9zbGltZS5wbmdcIixcclxuICAgIGV4cGVyaWVuY2U6IDIsXHJcbiAgICBhZ2lsaXR5OiAxLFxyXG4gICAgZGVmZW5zZTogMSxcclxuICAgIGF0dGFja3M6IFtcclxuICAgICAgICBuZXcgcmwuQXR0YWNrKHtcclxuICAgICAgICAgICAgYXR0YWNrOiAxLFxyXG4gICAgICAgICAgICBkYW1hZ2U6IG5ldyBybC5EaWNlKDEsIDIpLFxyXG4gICAgICAgICAgICBhY3Rpb246IDEsXHJcbiAgICAgICAgICAgIHZlcmI6IFwib296ZXMgb250b1wiXHJcbiAgICAgICAgfSlcclxuICAgIF1cclxufSkpXHJcblxyXG5leHBvcnQgY29uc3Qgc3BpZGVyID0gZGIuaW5zZXJ0KG5ldyBybC5Nb25zdGVyKHtcclxuICAgIGlkOiBcInNwaWRlclwiLFxyXG4gICAgbmFtZTogXCJTcGlkZXJcIixcclxuICAgIG1heEhlYWx0aDogMyxcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL3NwaWRlci5wbmdcIixcclxuICAgIGV4cGVyaWVuY2U6IDEsXHJcbiAgICBhZ2lsaXR5OiAxLFxyXG4gICAgZGVmZW5zZTogMCxcclxuICAgIGF0dGFja3M6IFtcclxuICAgICAgICBuZXcgcmwuQXR0YWNrKHtcclxuICAgICAgICAgICAgYXR0YWNrOiAxLFxyXG4gICAgICAgICAgICBkYW1hZ2U6IG5ldyBybC5EaWNlKDEsIDEpLFxyXG4gICAgICAgICAgICBhY3Rpb246IDEsXHJcbiAgICAgICAgICAgIHZlcmI6IFwiYml0ZXNcIlxyXG4gICAgICAgIH0pXHJcbiAgICBdXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IHNrZWxldG9uID0gZGIuaW5zZXJ0KG5ldyBybC5Nb25zdGVyKHtcclxuICAgIGlkOiBcInNrZWxldG9uXCIsXHJcbiAgICBuYW1lOiBcIlNrZWxldG9uXCIsXHJcbiAgICBtYXhIZWFsdGg6IDUsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9za2VsZXRvbi5wbmdcIixcclxuICAgIGV4cGVyaWVuY2U6IDIsXHJcbiAgICBhZ2lsaXR5OiAxLFxyXG4gICAgZGVmZW5zZTogMCxcclxuICAgIGF0dGFja3M6IFtcclxuICAgICAgICBuZXcgcmwuQXR0YWNrKHtcclxuICAgICAgICAgICAgYXR0YWNrOiAxLFxyXG4gICAgICAgICAgICBkYW1hZ2U6IG5ldyBybC5EaWNlKDEsIDMpLFxyXG4gICAgICAgICAgICBhY3Rpb246IDEsXHJcbiAgICAgICAgICAgIHZlcmI6IFwic2xhc2hlcyBhdFwiXHJcbiAgICAgICAgfSksXHJcbiAgICAgICAgbmV3IHJsLkF0dGFjayh7XHJcbiAgICAgICAgICAgIGF0dGFjazogMixcclxuICAgICAgICAgICAgZGFtYWdlOiBuZXcgcmwuRGljZSgxLCA0KSxcclxuICAgICAgICAgICAgYWN0aW9uOiAxLFxyXG4gICAgICAgICAgICB2ZXJiOiBcInRocnVzdHMgYXRcIlxyXG4gICAgICAgIH0pXHJcbiAgICBdXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IHJlZHkgPSBkYi5pbnNlcnQobmV3IHJsLk1vbnN0ZXIoe1xyXG4gICAgaWQ6IFwicmVkeVwiLFxyXG4gICAgbmFtZTogXCJSZWR5XCIsXHJcbiAgICBtYXhIZWFsdGg6IDMsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9yZWR5LnBuZ1wiLFxyXG4gICAgZXhwZXJpZW5jZTogMixcclxuICAgIGFnaWxpdHk6IDEsXHJcbiAgICBkZWZlbnNlOiAwLFxyXG4gICAgYXR0YWNrczogW1xyXG4gICAgICAgIG5ldyBybC5BdHRhY2soe1xyXG4gICAgICAgICAgICBhdHRhY2s6IDAsXHJcbiAgICAgICAgICAgIGRhbWFnZTogbmV3IHJsLkRpY2UoMSwgMSksXHJcbiAgICAgICAgICAgIGFjdGlvbjogMSxcclxuICAgICAgICAgICAgdmVyYjogXCJ0b3VjaGVzXCJcclxuICAgICAgICB9KVxyXG4gICAgXVxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBmaWRlciA9IGRiLmluc2VydChuZXcgcmwuTW9uc3Rlcih7XHJcbiAgICBpZDogXCJmaWRlclwiLFxyXG4gICAgbmFtZTogXCJGaWRlclwiLFxyXG4gICAgbWF4SGVhbHRoOiA0LFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvZmlkZXIucG5nXCIsXHJcbiAgICBleHBlcmllbmNlOiAyLFxyXG4gICAgYWdpbGl0eTogMSxcclxuICAgIGRlZmVuc2U6IDIsXHJcbiAgICBhdHRhY2tzOiBbXHJcbiAgICAgICAgbmV3IHJsLkF0dGFjayh7XHJcbiAgICAgICAgICAgIGF0dGFjazogMCxcclxuICAgICAgICAgICAgZGFtYWdlOiBuZXcgcmwuRGljZSgxLCAyKSxcclxuICAgICAgICAgICAgYWN0aW9uOiAxLFxyXG4gICAgICAgICAgICB2ZXJiOiBcImJ1cm5zXCJcclxuICAgICAgICB9KSxcclxuICAgICAgICBuZXcgcmwuQXR0YWNrKHtcclxuICAgICAgICAgICAgYXR0YWNrOiAwLFxyXG4gICAgICAgICAgICBkYW1hZ2U6IG5ldyBybC5EaWNlKDIsIDMpLFxyXG4gICAgICAgICAgICBhY3Rpb246IDEsXHJcbiAgICAgICAgICAgIHZlcmI6IFwic3BpbnMgYW5kIHNob290cyBmaXJlXCJcclxuICAgICAgICB9KVxyXG4gICAgXVxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBmaXN0cyA9IGRiLmluc2VydChuZXcgcmwuTWVsZWVXZWFwb24oe1xyXG4gICAgaWQ6IFwiZmlzdHNcIixcclxuICAgIG5hbWU6IFwiRmlzdHNcIixcclxuICAgIGF0dGFjazogMCxcclxuICAgIGRhbWFnZTogbmV3IHJsLkRpY2UoMSwgMiksXHJcbiAgICBhY3Rpb246IDEsXHJcbiAgICB2ZXJiOiBcInB1bmNoZXMgYXRcIlxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBzaGFycFN0aWNrID0gZGIuaW5zZXJ0KG5ldyBybC5NZWxlZVdlYXBvbih7XHJcbiAgICBpZDogXCJzaGFycF9zdGlja1wiLFxyXG4gICAgbmFtZTogXCJTaGFycCBTdGlja1wiLFxyXG4gICAgYXR0YWNrOiAxLFxyXG4gICAgYWN0aW9uOiAxLFxyXG4gICAgZGFtYWdlOiBuZXcgcmwuRGljZSgxLCAyKSxcclxuICAgIHZlcmI6IFwic3dpbmdzIGF0XCJcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3QgZGFnZ2VyID0gZGIuaW5zZXJ0KG5ldyBybC5NZWxlZVdlYXBvbih7XHJcbiAgICBpZDogXCJkYWdnZXJcIixcclxuICAgIG5hbWU6IFwiRGFnZ2VyXCIsXHJcbiAgICBhdHRhY2s6IDEsXHJcbiAgICBhY3Rpb246IDEsXHJcbiAgICBkYW1hZ2U6IG5ldyBybC5EaWNlKDEsIDMpLFxyXG4gICAgdmVyYjogXCJqYWJzIGF0XCJcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3QgaXJvblN3b3JkID0gZGIuaW5zZXJ0KG5ldyBybC5NZWxlZVdlYXBvbih7XHJcbiAgICBpZDogXCJpcm9uX3N3b3JkXCIsXHJcbiAgICBuYW1lOiBcIklyb24gU3dvcmRcIixcclxuICAgIGF0dGFjazogMixcclxuICAgIGFjdGlvbjogMSxcclxuICAgIGRhbWFnZTogbmV3IHJsLkRpY2UoMiwgNCksXHJcbiAgICB2ZXJiOiBcInRocnVzdHMgYXRcIlxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBzdGVlbFN3b3JkID0gZGIuaW5zZXJ0KG5ldyBybC5NZWxlZVdlYXBvbih7XHJcbiAgICBpZDogXCJzdGVlbF9zd29yZFwiLFxyXG4gICAgbmFtZTogXCJTdGVlbCBTd29yZFwiLFxyXG4gICAgYXR0YWNrOiAzLFxyXG4gICAgZGFtYWdlOiBuZXcgcmwuRGljZSgzLCA1KSxcclxuICAgIGFjdGlvbjogMSxcclxuICAgIHZlcmI6IFwidGhydXN0cyBhdFwiXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IHNsaW5nU2hvdCA9IGRiLmluc2VydChuZXcgcmwuUmFuZ2VkV2VhcG9uKHtcclxuICAgIGlkOiBcInNsaW5nc2hvdFwiLFxyXG4gICAgbmFtZTogXCJTbGluZ3Nob3RcIixcclxuICAgIGF0dGFjazogMSxcclxuICAgIHJhbmdlOiAzLFxyXG4gICAgZGFtYWdlOiBuZXcgcmwuRGljZSgxLCAyKSxcclxuICAgIGFjdGlvbjogMSxcclxuICAgIHZlcmI6IFwic2hvb3RzIGF0XCJcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3Qgd29vZGVuQm93ID0gZGIuaW5zZXJ0KG5ldyBybC5SYW5nZWRXZWFwb24oe1xyXG4gICAgaWQ6IFwid29vZGVuX2Jvd1wiLFxyXG4gICAgbmFtZTogXCJXb29kZW4gQm93XCIsXHJcbiAgICBhdHRhY2s6IDIsXHJcbiAgICByYW5nZTogNSxcclxuICAgIGRhbWFnZTogbmV3IHJsLkRpY2UoMiwgNSksXHJcbiAgICBhY3Rpb246IDEsXHJcbiAgICB2ZXJiOiBcInNob290cyBhdFwiXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IGNsb3RoQXJtb3IgPSBkYi5pbnNlcnQobmV3IHJsLkFybW9yKHtcclxuICAgIGlkOiBcImNsb3RoX2FybW9yXCIsXHJcbiAgICBuYW1lOiBcIkNsb3RoIEFybW9yXCIsXHJcbiAgICBkZWZlbnNlOiAxXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IGxlYXRoZXJBcm1vciA9IGRiLmluc2VydChuZXcgcmwuQXJtb3Ioe1xyXG4gICAgaWQ6IFwibGVhdGhlcl9hcm1vclwiLFxyXG4gICAgbmFtZTogXCJMZWF0aGVyIEFybW9yXCIsXHJcbiAgICBkZWZlbnNlOiAyXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IHBhZGRlZEFybW9yID0gZGIuaW5zZXJ0KG5ldyBybC5Bcm1vcih7XHJcbiAgICBpZDogXCJwYWRkZWRfYXJtb3JcIixcclxuICAgIG5hbWU6IFwiUGFkZGVkIEFybW9yXCIsXHJcbiAgICBkZWZlbnNlOiAzXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IGNoYWluQXJtb3IgPSBkYi5pbnNlcnQobmV3IHJsLkFybW9yKHtcclxuICAgIGlkOiBcImNoYWluX2FybW9yXCIsXHJcbiAgICBuYW1lOiBcIkNoYWluIEFybW9yXCIsXHJcbiAgICBkZWZlbnNlOiA0XHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IHNjYWxlQXJtb3IgPSBkYi5pbnNlcnQobmV3IHJsLkFybW9yKHtcclxuICAgIGlkOiBcInNjYWxlX2FybW9yXCIsXHJcbiAgICBuYW1lOiBcIlNjYWxlIEFybW9yXCIsXHJcbiAgICBkZWZlbnNlOiA1XHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IHBsYXRlQXJtb3IgPSBkYi5pbnNlcnQobmV3IHJsLkFybW9yKHtcclxuICAgIGlkOiBcInBsYXRlX2FybW9yXCIsXHJcbiAgICBuYW1lOiBcIlBsYXRlIEFybW9yXCIsXHJcbiAgICBkZWZlbnNlOiA2XHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IHN0ZWVsUGxhdGVBcm1vciA9IGRiLmluc2VydChuZXcgcmwuQXJtb3Ioe1xyXG4gICAgaWQ6IFwic3RlZWxfcGxhdGVfYXJtb3JcIixcclxuICAgIG5hbWU6IFwiU3RlZWwgUGxhdGUgQXJtb3JcIixcclxuICAgIGRlZmVuc2U6IDdcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3Qgd29vZGVuU2hpZWxkID0gZGIuaW5zZXJ0KG5ldyBybC5TaGllbGQoe1xyXG4gICAgaWQ6IFwid29vZGVuX3NoaWVsZFwiLFxyXG4gICAgbmFtZTogXCJXb29kZW4gU2hpZWxkXCIsXHJcbiAgICBkZWZlbnNlOiAxXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IGlyb25TaGllbGQgPSBkYi5pbnNlcnQobmV3IHJsLlNoaWVsZCh7XHJcbiAgICBpZDogXCJpcm9uX3NoaWVsZFwiLFxyXG4gICAgbmFtZTogXCJJcm9uIFNoaWVsZFwiLFxyXG4gICAgZGVmZW5zZTogMlxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBzdGVlbFNoaWVsZCA9IGRiLmluc2VydChuZXcgcmwuU2hpZWxkKHtcclxuICAgIGlkOiBcInN0ZWVsX3NoaWVsZFwiLFxyXG4gICAgbmFtZTogXCJTdGVlbCBTaGllbGRcIixcclxuICAgIGRlZmVuc2U6IDNcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3QgdG93ZXJTaGllbGQgPSBkYi5pbnNlcnQobmV3IHJsLlNoaWVsZCh7XHJcbiAgICBpZDogXCJ0b3dlcl9zaGllbGRcIixcclxuICAgIG5hbWU6IFwiVG93ZXIgU2hpZWxkXCIsXHJcbiAgICBkZWZlbnNlOiA0XHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IHdlYWtIZWFsdGhQb3Rpb24gPSBkYi5pbnNlcnQobmV3IHJsLlVzYWJsZSh7XHJcbiAgICBpZDogXCJ3ZWFrX2hlYWx0aF9wb3Rpb25cIixcclxuICAgIG5hbWU6IFwiV2VhayBIZWFsdGggUG90aW9uXCIsXHJcbiAgICBoZWFsdGg6IDRcclxufSkpXHJcblxyXG5leHBvcnQgY29uc3QgaGVhbHRoUG90aW9uID0gZGIuaW5zZXJ0KG5ldyBybC5Vc2FibGUoe1xyXG4gICAgaWQ6IFwiaGVhbHRoX3BvdGlvblwiLFxyXG4gICAgbmFtZTogXCJIZWFsdGggUG90aW9uXCIsXHJcbiAgICBoZWFsdGg6IDEwXHJcbn0pKVxyXG5cclxuZXhwb3J0IGNvbnN0IGNoZXN0ID0gZGIuaW5zZXJ0KG5ldyBybC5Db250YWluZXIoe1xyXG4gICAgaWQ6IFwiY2hlc3RcIixcclxuICAgIG5hbWU6IFwiQ2hlc3RcIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL2NoZXN0LnBuZ1wiLFxyXG59KSlcclxuXHJcbmV4cG9ydCBjb25zdCBwbGF5ZXIgPSBkYi5pbnNlcnQobmV3IHJsLlBsYXllcih7XHJcbiAgICBpZDogXCJwbGF5ZXJcIixcclxuICAgIG5hbWU6IFwiUGxheWVyXCIsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9jaGFyLnBuZ1wiLFxyXG4gICAgbWF4SGVhbHRoOiA2LFxyXG4gICAgbGlnaHRSYWRpdXM6IDVcclxufSkpIl19