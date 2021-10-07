import * as rl from "./rl.js";
import * as gfx from "./gfx.js";
export const brickWall = new rl.Tile({
    name: "Brick Wall",
    image: "./assets/wall.png",
    passable: false,
    transparent: false
});
export const floor = new rl.Tile({
    name: "Floor",
    image: "./assets/floor.png",
    color: new gfx.Color(.2, .2, .2, 1),
    passable: true,
    transparent: true
});
export const water = new rl.Tile({
    name: "Water",
    image: "./assets/water.png",
    passable: false,
    transparent: true
});
export const grass = new rl.Tile({
    name: "Grass",
    image: "./assets/grass.png",
    passable: true,
    transparent: true
});
export const dirt = new rl.Tile({
    name: "Dirt",
    image: "./assets/dirt.png",
    passable: true,
    transparent: true
});
export const sand = new rl.Tile({
    name: "Sand",
    image: "./assets/sand.png",
    passable: true,
    transparent: true
});
export const trees = new rl.Fixture({
    name: "Trees",
    image: "./assets/trees.png",
    passable: true,
    transparent: false
});
export const hills = new rl.Fixture({
    name: "Hills",
    image: "./assets/hills.png",
    passable: true,
    transparent: true
});
export const mountains = new rl.Fixture({
    name: "Mountains",
    image: "./assets/mountain.png",
    passable: false,
    transparent: false
});
export const snow = new rl.Fixture({
    name: "snow",
    image: "./assets/snow.png",
    passable: true,
    transparent: true
});
export const door = new rl.Door({
    name: "A Closed Wooden Door",
    image: "./assets/closed.png",
    passable: false,
    transparent: false
});
export const stairsUp = new rl.StairsUp({
    name: "Stairs Up",
    image: "./assets/up.png",
    passable: false,
    transparent: true,
});
export const stairsDown = new rl.StairsDown({
    name: "Stairs Down",
    image: "./assets/down.png",
    passable: false,
    transparent: true,
});
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
});
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
});
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
});
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
});
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
});
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
});
export const redy = new rl.Monster({
    name: "Redy",
    maxHealth: 9,
    image: "./assets/redy.png",
    experience: 4,
    agility: 2,
    defense: 2,
    attacks: [
        new rl.Attack({
            attack: 0,
            damage: new rl.Dice(5, 6),
            action: 1,
            verb: "punches"
        })
    ]
});
export const fists = new rl.MeleeWeapon({
    name: "Fists",
    attack: 0,
    damage: new rl.Dice(1, 2),
    action: 1,
    verb: "punches at"
});
export const sharpStick = new rl.MeleeWeapon({
    name: "Sharp Stick",
    attack: 1,
    action: 1,
    damage: new rl.Dice(1, 2),
    verb: "swings at"
});
export const dagger = new rl.MeleeWeapon({
    name: "Dagger",
    attack: 1,
    action: 1,
    damage: new rl.Dice(1, 3),
    verb: "jabs at"
});
export const ironSword = new rl.MeleeWeapon({
    name: "Iron Sword",
    attack: 2,
    action: 1,
    damage: new rl.Dice(2, 4),
    verb: "thrusts at"
});
export const steelSword = new rl.MeleeWeapon({
    name: "Steel Sword",
    attack: 3,
    damage: new rl.Dice(3, 5),
    action: 1,
    verb: "thrusts at"
});
export const slingShot = new rl.RangedWeapon({
    name: "Slingshot",
    attack: 1,
    range: 3,
    damage: new rl.Dice(1, 2),
    action: 1,
    verb: "shoots at"
});
export const woodenBow = new rl.RangedWeapon({
    name: "Wooden Bow",
    attack: 2,
    range: 5,
    damage: new rl.Dice(2, 5),
    action: 1,
    verb: "shoots at"
});
export const clothArmor = new rl.Armor({
    name: "Cloth Armor",
    defense: 1
});
export const leatherArmor = new rl.Armor({
    name: "Leather Armor",
    defense: 2
});
export const paddedArmor = new rl.Armor({
    name: "Padded Armor",
    defense: 3
});
export const chainArmor = new rl.Armor({
    name: "Chain Armor",
    defense: 4
});
export const scaleArmor = new rl.Armor({
    name: "Scale Armor",
    defense: 5
});
export const plateArmor = new rl.Armor({
    name: "Plate Armor",
    defense: 6
});
export const steelPlateArmor = new rl.Armor({
    name: "Steel Plate Armor",
    defense: 7
});
export const woodenShield = new rl.Shield({
    name: "Wooden Shield",
    defense: 1
});
export const ironShield = new rl.Shield({
    name: "Iron Shield",
    defense: 2
});
export const steelShield = new rl.Shield({
    name: "Steel Shield",
    defense: 3
});
export const towerShield = new rl.Shield({
    name: "Tower Shield",
    defense: 4
});
export const weakHealthPotion = new rl.Usable({
    name: "Weak Health Potion",
    health: 4
});
export const healthPotion = new rl.Usable({
    name: "Health Potion",
    health: 10
});
export const chest = new rl.Container({
    name: "Chest",
    image: "./assets/chest.png",
});
export const player = new rl.Player({
    name: "Player",
    image: "./assets/char.png",
    maxHealth: 6,
    lightRadius: 5
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGhpbmdzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidGhpbmdzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBLE9BQU8sS0FBSyxFQUFFLE1BQU0sU0FBUyxDQUFBO0FBQzdCLE9BQU8sS0FBSyxHQUFHLE1BQU0sVUFBVSxDQUFBO0FBRS9CLE1BQU0sQ0FBQyxNQUFNLFNBQVMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUM7SUFDakMsSUFBSSxFQUFFLFlBQVk7SUFDbEIsS0FBSyxFQUFFLG1CQUFtQjtJQUMxQixRQUFRLEVBQUUsS0FBSztJQUNmLFdBQVcsRUFBRSxLQUFLO0NBQ3JCLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLEtBQUssR0FBRyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUM7SUFDN0IsSUFBSSxFQUFFLE9BQU87SUFDYixLQUFLLEVBQUUsb0JBQW9CO0lBQzNCLEtBQUssRUFBRSxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQ25DLFFBQVEsRUFBRSxJQUFJO0lBQ2QsV0FBVyxFQUFFLElBQUk7Q0FDcEIsQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sS0FBSyxHQUFHLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQztJQUM3QixJQUFJLEVBQUUsT0FBTztJQUNiLEtBQUssRUFBRSxvQkFBb0I7SUFDM0IsUUFBUSxFQUFFLEtBQUs7SUFDZixXQUFXLEVBQUUsSUFBSTtDQUNwQixDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDO0lBQzdCLElBQUksRUFBRSxPQUFPO0lBQ2IsS0FBSyxFQUFFLG9CQUFvQjtJQUMzQixRQUFRLEVBQUUsSUFBSTtJQUNkLFdBQVcsRUFBRSxJQUFJO0NBQ3BCLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLElBQUksR0FBRyxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUM7SUFDNUIsSUFBSSxFQUFFLE1BQU07SUFDWixLQUFLLEVBQUUsbUJBQW1CO0lBQzFCLFFBQVEsRUFBRSxJQUFJO0lBQ2QsV0FBVyxFQUFFLElBQUk7Q0FDcEIsQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sSUFBSSxHQUFHLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQztJQUM1QixJQUFJLEVBQUUsTUFBTTtJQUNaLEtBQUssRUFBRSxtQkFBbUI7SUFDMUIsUUFBUSxFQUFFLElBQUk7SUFDZCxXQUFXLEVBQUUsSUFBSTtDQUNwQixDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSxLQUFLLEdBQUcsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDO0lBQ2hDLElBQUksRUFBRSxPQUFPO0lBQ2IsS0FBSyxFQUFFLG9CQUFvQjtJQUMzQixRQUFRLEVBQUUsSUFBSTtJQUNkLFdBQVcsRUFBRSxLQUFLO0NBQ3JCLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLEtBQUssR0FBRyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUM7SUFDaEMsSUFBSSxFQUFFLE9BQU87SUFDYixLQUFLLEVBQUUsb0JBQW9CO0lBQzNCLFFBQVEsRUFBRSxJQUFJO0lBQ2QsV0FBVyxFQUFFLElBQUk7Q0FDcEIsQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQztJQUNwQyxJQUFJLEVBQUUsV0FBVztJQUNqQixLQUFLLEVBQUUsdUJBQXVCO0lBQzlCLFFBQVEsRUFBRSxLQUFLO0lBQ2YsV0FBVyxFQUFFLEtBQUs7Q0FDckIsQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sSUFBSSxHQUFHLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQztJQUMvQixJQUFJLEVBQUUsTUFBTTtJQUNaLEtBQUssRUFBRSxtQkFBbUI7SUFDMUIsUUFBUSxFQUFFLElBQUk7SUFDZCxXQUFXLEVBQUUsSUFBSTtDQUNwQixDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDO0lBQzVCLElBQUksRUFBRSxzQkFBc0I7SUFDNUIsS0FBSyxFQUFFLHFCQUFxQjtJQUM1QixRQUFRLEVBQUUsS0FBSztJQUNmLFdBQVcsRUFBRSxLQUFLO0NBQ3JCLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyxJQUFJLEVBQUUsQ0FBQyxRQUFRLENBQUM7SUFDcEMsSUFBSSxFQUFFLFdBQVc7SUFDakIsS0FBSyxFQUFFLGlCQUFpQjtJQUN4QixRQUFRLEVBQUUsS0FBSztJQUNmLFdBQVcsRUFBRSxJQUFJO0NBQ3BCLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxVQUFVLENBQUM7SUFDeEMsSUFBSSxFQUFFLGFBQWE7SUFDbkIsS0FBSyxFQUFFLG1CQUFtQjtJQUMxQixRQUFRLEVBQUUsS0FBSztJQUNmLFdBQVcsRUFBRSxJQUFJO0NBQ3BCLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLEdBQUcsR0FBRyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUM7SUFDOUIsSUFBSSxFQUFFLEtBQUs7SUFDWCxTQUFTLEVBQUUsQ0FBQztJQUNaLEtBQUssRUFBRSxrQkFBa0I7SUFDekIsVUFBVSxFQUFFLENBQUM7SUFDYixPQUFPLEVBQUUsQ0FBQztJQUNWLE9BQU8sRUFBRSxDQUFDO0lBQ1YsT0FBTyxFQUFFO1FBQ0wsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO1lBQ1YsTUFBTSxFQUFFLENBQUM7WUFDVCxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDekIsTUFBTSxFQUFFLENBQUM7WUFDVCxJQUFJLEVBQUUsVUFBVTtTQUNuQixDQUFDO0tBQ0w7Q0FDSixDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSxHQUFHLEdBQUcsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDO0lBQzlCLElBQUksRUFBRSxLQUFLO0lBQ1gsU0FBUyxFQUFFLENBQUM7SUFDWixLQUFLLEVBQUUsa0JBQWtCO0lBQ3pCLFVBQVUsRUFBRSxDQUFDO0lBQ2IsT0FBTyxFQUFFLENBQUM7SUFDVixPQUFPLEVBQUUsQ0FBQztJQUNWLE9BQU8sRUFBRTtRQUNMLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztZQUNWLE1BQU0sRUFBRSxDQUFDO1lBQ1QsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sRUFBRSxDQUFDO1lBQ1QsSUFBSSxFQUFFLFNBQVM7U0FDbEIsQ0FBQztLQUNMO0NBQ0osQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQztJQUNyQyxJQUFJLEVBQUUsYUFBYTtJQUNuQixTQUFTLEVBQUUsQ0FBQztJQUNaLEtBQUssRUFBRSxHQUFHLENBQUMsS0FBSyxDQUFDLEtBQUs7SUFDdEIsS0FBSyxFQUFFLG9CQUFvQjtJQUMzQixVQUFVLEVBQUUsQ0FBQztJQUNiLE9BQU8sRUFBRSxDQUFDO0lBQ1YsT0FBTyxFQUFFLENBQUM7SUFDVixPQUFPLEVBQUU7UUFDTCxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUM7WUFDVixNQUFNLEVBQUUsQ0FBQztZQUNULE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUN6QixNQUFNLEVBQUUsQ0FBQztZQUNULElBQUksRUFBRSxZQUFZO1NBQ3JCLENBQUM7S0FDTDtDQUNKLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLFFBQVEsR0FBRyxJQUFJLEVBQUUsQ0FBQyxPQUFPLENBQUM7SUFDbkMsSUFBSSxFQUFFLFdBQVc7SUFDakIsU0FBUyxFQUFFLENBQUM7SUFDWixLQUFLLEVBQUUsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHO0lBQ3BCLEtBQUssRUFBRSxvQkFBb0I7SUFDM0IsVUFBVSxFQUFFLENBQUM7SUFDYixPQUFPLEVBQUUsQ0FBQztJQUNWLE9BQU8sRUFBRSxDQUFDO0lBQ1YsT0FBTyxFQUFFO1FBQ0wsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO1lBQ1YsTUFBTSxFQUFFLENBQUM7WUFDVCxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDekIsTUFBTSxFQUFFLENBQUM7WUFDVCxJQUFJLEVBQUUsWUFBWTtTQUNyQixDQUFDO0tBQ0w7Q0FDSixDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSxNQUFNLEdBQUcsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDO0lBQ2pDLElBQUksRUFBRSxRQUFRO0lBQ2QsU0FBUyxFQUFFLENBQUM7SUFDWixLQUFLLEVBQUUscUJBQXFCO0lBQzVCLFVBQVUsRUFBRSxDQUFDO0lBQ2IsT0FBTyxFQUFFLENBQUM7SUFDVixPQUFPLEVBQUUsQ0FBQztJQUNWLE9BQU8sRUFBRTtRQUNMLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztZQUNWLE1BQU0sRUFBRSxDQUFDO1lBQ1QsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sRUFBRSxDQUFDO1lBQ1QsSUFBSSxFQUFFLE9BQU87U0FDaEIsQ0FBQztLQUNMO0NBQ0osQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sUUFBUSxHQUFHLElBQUksRUFBRSxDQUFDLE9BQU8sQ0FBQztJQUNuQyxJQUFJLEVBQUUsVUFBVTtJQUNoQixTQUFTLEVBQUUsQ0FBQztJQUNaLEtBQUssRUFBRSx1QkFBdUI7SUFDOUIsVUFBVSxFQUFFLENBQUM7SUFDYixPQUFPLEVBQUUsQ0FBQztJQUNWLE9BQU8sRUFBRSxDQUFDO0lBQ1YsT0FBTyxFQUFFO1FBQ0wsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO1lBQ1YsTUFBTSxFQUFFLENBQUM7WUFDVCxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDekIsTUFBTSxFQUFFLENBQUM7WUFDVCxJQUFJLEVBQUUsWUFBWTtTQUNyQixDQUFDO1FBQ0YsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO1lBQ1YsTUFBTSxFQUFFLENBQUM7WUFDVCxNQUFNLEVBQUUsSUFBSSxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDekIsTUFBTSxFQUFFLENBQUM7WUFDVCxJQUFJLEVBQUUsWUFBWTtTQUNyQixDQUFDO0tBQ0w7Q0FDSixDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSxJQUFJLEdBQUcsSUFBSSxFQUFFLENBQUMsT0FBTyxDQUFDO0lBQy9CLElBQUksRUFBRSxNQUFNO0lBQ1osU0FBUyxFQUFFLENBQUM7SUFDWixLQUFLLEVBQUUsbUJBQW1CO0lBQzFCLFVBQVUsRUFBRSxDQUFDO0lBQ2IsT0FBTyxFQUFFLENBQUM7SUFDVixPQUFPLEVBQUUsQ0FBQztJQUNWLE9BQU8sRUFBRTtRQUNMLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztZQUNWLE1BQU0sRUFBRSxDQUFDO1lBQ1QsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3pCLE1BQU0sRUFBRSxDQUFDO1lBQ1QsSUFBSSxFQUFFLFNBQVM7U0FDbEIsQ0FBQztLQUNMO0NBQ0osQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sS0FBSyxHQUFHLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQztJQUNwQyxJQUFJLEVBQUUsT0FBTztJQUNiLE1BQU0sRUFBRSxDQUFDO0lBQ1QsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3pCLE1BQU0sRUFBRSxDQUFDO0lBQ1QsSUFBSSxFQUFFLFlBQVk7Q0FDckIsQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLElBQUksRUFBRSxDQUFDLFdBQVcsQ0FBQztJQUN6QyxJQUFJLEVBQUUsYUFBYTtJQUNuQixNQUFNLEVBQUUsQ0FBQztJQUNULE1BQU0sRUFBRSxDQUFDO0lBQ1QsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3pCLElBQUksRUFBRSxXQUFXO0NBQ3BCLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUM7SUFDckMsSUFBSSxFQUFFLFFBQVE7SUFDZCxNQUFNLEVBQUUsQ0FBQztJQUNULE1BQU0sRUFBRSxDQUFDO0lBQ1QsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3pCLElBQUksRUFBRSxTQUFTO0NBQ2xCLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLFNBQVMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxXQUFXLENBQUM7SUFDeEMsSUFBSSxFQUFFLFlBQVk7SUFDbEIsTUFBTSxFQUFFLENBQUM7SUFDVCxNQUFNLEVBQUUsQ0FBQztJQUNULE1BQU0sRUFBRSxJQUFJLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztJQUN6QixJQUFJLEVBQUUsWUFBWTtDQUNyQixDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsSUFBSSxFQUFFLENBQUMsV0FBVyxDQUFDO0lBQ3pDLElBQUksRUFBRSxhQUFhO0lBQ25CLE1BQU0sRUFBRSxDQUFDO0lBQ1QsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3pCLE1BQU0sRUFBRSxDQUFDO0lBQ1QsSUFBSSxFQUFFLFlBQVk7Q0FDckIsQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQztJQUN6QyxJQUFJLEVBQUUsV0FBVztJQUNqQixNQUFNLEVBQUUsQ0FBQztJQUNULEtBQUssRUFBRSxDQUFDO0lBQ1IsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3pCLE1BQU0sRUFBRSxDQUFDO0lBQ1QsSUFBSSxFQUFFLFdBQVc7Q0FDcEIsQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sU0FBUyxHQUFHLElBQUksRUFBRSxDQUFDLFlBQVksQ0FBQztJQUN6QyxJQUFJLEVBQUUsWUFBWTtJQUNsQixNQUFNLEVBQUUsQ0FBQztJQUNULEtBQUssRUFBRSxDQUFDO0lBQ1IsTUFBTSxFQUFFLElBQUksRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3pCLE1BQU0sRUFBRSxDQUFDO0lBQ1QsSUFBSSxFQUFFLFdBQVc7Q0FDcEIsQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQztJQUNuQyxJQUFJLEVBQUUsYUFBYTtJQUNuQixPQUFPLEVBQUUsQ0FBQztDQUNiLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLFlBQVksR0FBRyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUM7SUFDckMsSUFBSSxFQUFFLGVBQWU7SUFDckIsT0FBTyxFQUFFLENBQUM7Q0FDYixDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDO0lBQ3BDLElBQUksRUFBRSxjQUFjO0lBQ3BCLE9BQU8sRUFBRSxDQUFDO0NBQ2IsQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sVUFBVSxHQUFHLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQztJQUNuQyxJQUFJLEVBQUUsYUFBYTtJQUNuQixPQUFPLEVBQUUsQ0FBQztDQUNiLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxLQUFLLENBQUM7SUFDbkMsSUFBSSxFQUFFLGFBQWE7SUFDbkIsT0FBTyxFQUFFLENBQUM7Q0FDYixDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSxVQUFVLEdBQUcsSUFBSSxFQUFFLENBQUMsS0FBSyxDQUFDO0lBQ25DLElBQUksRUFBRSxhQUFhO0lBQ25CLE9BQU8sRUFBRSxDQUFDO0NBQ2IsQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sZUFBZSxHQUFHLElBQUksRUFBRSxDQUFDLEtBQUssQ0FBQztJQUN4QyxJQUFJLEVBQUUsbUJBQW1CO0lBQ3pCLE9BQU8sRUFBRSxDQUFDO0NBQ2IsQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztJQUN0QyxJQUFJLEVBQUUsZUFBZTtJQUNyQixPQUFPLEVBQUUsQ0FBQztDQUNiLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLFVBQVUsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUM7SUFDcEMsSUFBSSxFQUFFLGFBQWE7SUFDbkIsT0FBTyxFQUFFLENBQUM7Q0FDYixDQUFDLENBQUE7QUFFRixNQUFNLENBQUMsTUFBTSxXQUFXLEdBQUcsSUFBSSxFQUFFLENBQUMsTUFBTSxDQUFDO0lBQ3JDLElBQUksRUFBRSxjQUFjO0lBQ3BCLE9BQU8sRUFBRSxDQUFDO0NBQ2IsQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sV0FBVyxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztJQUNyQyxJQUFJLEVBQUUsY0FBYztJQUNwQixPQUFPLEVBQUUsQ0FBQztDQUNiLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLGdCQUFnQixHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztJQUMxQyxJQUFJLEVBQUUsb0JBQW9CO0lBQzFCLE1BQU0sRUFBRSxDQUFDO0NBQ1osQ0FBQyxDQUFBO0FBRUYsTUFBTSxDQUFDLE1BQU0sWUFBWSxHQUFHLElBQUksRUFBRSxDQUFDLE1BQU0sQ0FBQztJQUN0QyxJQUFJLEVBQUUsZUFBZTtJQUNyQixNQUFNLEVBQUUsRUFBRTtDQUNiLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLEtBQUssR0FBRyxJQUFJLEVBQUUsQ0FBQyxTQUFTLENBQUM7SUFDbEMsSUFBSSxFQUFFLE9BQU87SUFDYixLQUFLLEVBQUUsb0JBQW9CO0NBQzlCLENBQUMsQ0FBQTtBQUVGLE1BQU0sQ0FBQyxNQUFNLE1BQU0sR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUM7SUFDaEMsSUFBSSxFQUFFLFFBQVE7SUFDZCxLQUFLLEVBQUUsbUJBQW1CO0lBQzFCLFNBQVMsRUFBRSxDQUFDO0lBQ1osV0FBVyxFQUFFLENBQUM7Q0FDakIsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgcmwgZnJvbSBcIi4vcmwuanNcIlxyXG5pbXBvcnQgKiBhcyBnZnggZnJvbSBcIi4vZ2Z4LmpzXCJcclxuXHJcbmV4cG9ydCBjb25zdCBicmlja1dhbGwgPSBuZXcgcmwuVGlsZSh7XHJcbiAgICBuYW1lOiBcIkJyaWNrIFdhbGxcIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL3dhbGwucG5nXCIsXHJcbiAgICBwYXNzYWJsZTogZmFsc2UsXHJcbiAgICB0cmFuc3BhcmVudDogZmFsc2VcclxufSlcclxuXHJcbmV4cG9ydCBjb25zdCBmbG9vciA9IG5ldyBybC5UaWxlKHtcclxuICAgIG5hbWU6IFwiRmxvb3JcIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL2Zsb29yLnBuZ1wiLFxyXG4gICAgY29sb3I6IG5ldyBnZnguQ29sb3IoLjIsIC4yLCAuMiwgMSksXHJcbiAgICBwYXNzYWJsZTogdHJ1ZSxcclxuICAgIHRyYW5zcGFyZW50OiB0cnVlXHJcbn0pXHJcblxyXG5leHBvcnQgY29uc3Qgd2F0ZXIgPSBuZXcgcmwuVGlsZSh7XHJcbiAgICBuYW1lOiBcIldhdGVyXCIsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy93YXRlci5wbmdcIixcclxuICAgIHBhc3NhYmxlOiBmYWxzZSxcclxuICAgIHRyYW5zcGFyZW50OiB0cnVlXHJcbn0pXHJcblxyXG5leHBvcnQgY29uc3QgZ3Jhc3MgPSBuZXcgcmwuVGlsZSh7XHJcbiAgICBuYW1lOiBcIkdyYXNzXCIsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9ncmFzcy5wbmdcIixcclxuICAgIHBhc3NhYmxlOiB0cnVlLFxyXG4gICAgdHJhbnNwYXJlbnQ6IHRydWVcclxufSlcclxuXHJcbmV4cG9ydCBjb25zdCBkaXJ0ID0gbmV3IHJsLlRpbGUoe1xyXG4gICAgbmFtZTogXCJEaXJ0XCIsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9kaXJ0LnBuZ1wiLFxyXG4gICAgcGFzc2FibGU6IHRydWUsXHJcbiAgICB0cmFuc3BhcmVudDogdHJ1ZVxyXG59KVxyXG5cclxuZXhwb3J0IGNvbnN0IHNhbmQgPSBuZXcgcmwuVGlsZSh7XHJcbiAgICBuYW1lOiBcIlNhbmRcIixcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL3NhbmQucG5nXCIsXHJcbiAgICBwYXNzYWJsZTogdHJ1ZSxcclxuICAgIHRyYW5zcGFyZW50OiB0cnVlXHJcbn0pXHJcblxyXG5leHBvcnQgY29uc3QgdHJlZXMgPSBuZXcgcmwuRml4dHVyZSh7XHJcbiAgICBuYW1lOiBcIlRyZWVzXCIsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy90cmVlcy5wbmdcIixcclxuICAgIHBhc3NhYmxlOiB0cnVlLFxyXG4gICAgdHJhbnNwYXJlbnQ6IGZhbHNlXHJcbn0pXHJcblxyXG5leHBvcnQgY29uc3QgaGlsbHMgPSBuZXcgcmwuRml4dHVyZSh7XHJcbiAgICBuYW1lOiBcIkhpbGxzXCIsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9oaWxscy5wbmdcIixcclxuICAgIHBhc3NhYmxlOiB0cnVlLFxyXG4gICAgdHJhbnNwYXJlbnQ6IHRydWVcclxufSlcclxuXHJcbmV4cG9ydCBjb25zdCBtb3VudGFpbnMgPSBuZXcgcmwuRml4dHVyZSh7XHJcbiAgICBuYW1lOiBcIk1vdW50YWluc1wiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvbW91bnRhaW4ucG5nXCIsXHJcbiAgICBwYXNzYWJsZTogZmFsc2UsXHJcbiAgICB0cmFuc3BhcmVudDogZmFsc2VcclxufSlcclxuXHJcbmV4cG9ydCBjb25zdCBzbm93ID0gbmV3IHJsLkZpeHR1cmUoe1xyXG4gICAgbmFtZTogXCJzbm93XCIsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9zbm93LnBuZ1wiLFxyXG4gICAgcGFzc2FibGU6IHRydWUsXHJcbiAgICB0cmFuc3BhcmVudDogdHJ1ZVxyXG59KVxyXG5cclxuZXhwb3J0IGNvbnN0IGRvb3IgPSBuZXcgcmwuRG9vcih7XHJcbiAgICBuYW1lOiBcIkEgQ2xvc2VkIFdvb2RlbiBEb29yXCIsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9jbG9zZWQucG5nXCIsXHJcbiAgICBwYXNzYWJsZTogZmFsc2UsXHJcbiAgICB0cmFuc3BhcmVudDogZmFsc2VcclxufSlcclxuXHJcbmV4cG9ydCBjb25zdCBzdGFpcnNVcCA9IG5ldyBybC5TdGFpcnNVcCh7XHJcbiAgICBuYW1lOiBcIlN0YWlycyBVcFwiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvdXAucG5nXCIsXHJcbiAgICBwYXNzYWJsZTogZmFsc2UsXHJcbiAgICB0cmFuc3BhcmVudDogdHJ1ZSxcclxufSlcclxuXHJcbmV4cG9ydCBjb25zdCBzdGFpcnNEb3duID0gbmV3IHJsLlN0YWlyc0Rvd24oe1xyXG4gICAgbmFtZTogXCJTdGFpcnMgRG93blwiLFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvZG93bi5wbmdcIixcclxuICAgIHBhc3NhYmxlOiBmYWxzZSxcclxuICAgIHRyYW5zcGFyZW50OiB0cnVlLFxyXG59KVxyXG5cclxuZXhwb3J0IGNvbnN0IHJhdCA9IG5ldyBybC5Nb25zdGVyKHtcclxuICAgIG5hbWU6IFwiUmF0XCIsXHJcbiAgICBtYXhIZWFsdGg6IDMsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9yYXQucG5nXCIsXHJcbiAgICBleHBlcmllbmNlOiAxLFxyXG4gICAgYWdpbGl0eTogMCxcclxuICAgIGRlZmVuc2U6IDAsXHJcbiAgICBhdHRhY2tzOiBbXHJcbiAgICAgICAgbmV3IHJsLkF0dGFjayh7XHJcbiAgICAgICAgICAgIGF0dGFjazogMCxcclxuICAgICAgICAgICAgZGFtYWdlOiBuZXcgcmwuRGljZSgxLCAxKSxcclxuICAgICAgICAgICAgYWN0aW9uOiAxLFxyXG4gICAgICAgICAgICB2ZXJiOiBcImduYXdzIGF0XCJcclxuICAgICAgICB9KVxyXG4gICAgXVxyXG59KVxyXG5cclxuZXhwb3J0IGNvbnN0IGJhdCA9IG5ldyBybC5Nb25zdGVyKHtcclxuICAgIG5hbWU6IFwiQmF0XCIsXHJcbiAgICBtYXhIZWFsdGg6IDMsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9iYXQucG5nXCIsXHJcbiAgICBleHBlcmllbmNlOiAxLFxyXG4gICAgYWdpbGl0eTogMCxcclxuICAgIGRlZmVuc2U6IDAsXHJcbiAgICBhdHRhY2tzOiBbXHJcbiAgICAgICAgbmV3IHJsLkF0dGFjayh7XHJcbiAgICAgICAgICAgIGF0dGFjazogMCxcclxuICAgICAgICAgICAgZGFtYWdlOiBuZXcgcmwuRGljZSgxLCAxKSxcclxuICAgICAgICAgICAgYWN0aW9uOiAxLFxyXG4gICAgICAgICAgICB2ZXJiOiBcIm5pcHMgYXRcIlxyXG4gICAgICAgIH0pXHJcbiAgICBdXHJcbn0pXHJcblxyXG5leHBvcnQgY29uc3QgZ3JlZW5TbGltZSA9IG5ldyBybC5Nb25zdGVyKHtcclxuICAgIG5hbWU6IFwiR3JlZW4gU2xpbWVcIixcclxuICAgIG1heEhlYWx0aDogMyxcclxuICAgIGNvbG9yOiBnZnguQ29sb3IuZ3JlZW4sXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9zbGltZS5wbmdcIixcclxuICAgIGV4cGVyaWVuY2U6IDEsXHJcbiAgICBhZ2lsaXR5OiAwLFxyXG4gICAgZGVmZW5zZTogMCxcclxuICAgIGF0dGFja3M6IFtcclxuICAgICAgICBuZXcgcmwuQXR0YWNrKHtcclxuICAgICAgICAgICAgYXR0YWNrOiAwLFxyXG4gICAgICAgICAgICBkYW1hZ2U6IG5ldyBybC5EaWNlKDEsIDEpLFxyXG4gICAgICAgICAgICBhY3Rpb246IDEsXHJcbiAgICAgICAgICAgIHZlcmI6IFwib296ZXMgb250b1wiXHJcbiAgICAgICAgfSlcclxuICAgIF1cclxufSlcclxuXHJcbmV4cG9ydCBjb25zdCByZWRTbGltZSA9IG5ldyBybC5Nb25zdGVyKHtcclxuICAgIG5hbWU6IFwiUmVkIFNsaW1lXCIsXHJcbiAgICBtYXhIZWFsdGg6IDUsXHJcbiAgICBjb2xvcjogZ2Z4LkNvbG9yLnJlZCxcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL3NsaW1lLnBuZ1wiLFxyXG4gICAgZXhwZXJpZW5jZTogMixcclxuICAgIGFnaWxpdHk6IDEsXHJcbiAgICBkZWZlbnNlOiAxLFxyXG4gICAgYXR0YWNrczogW1xyXG4gICAgICAgIG5ldyBybC5BdHRhY2soe1xyXG4gICAgICAgICAgICBhdHRhY2s6IDEsXHJcbiAgICAgICAgICAgIGRhbWFnZTogbmV3IHJsLkRpY2UoMSwgMiksXHJcbiAgICAgICAgICAgIGFjdGlvbjogMSxcclxuICAgICAgICAgICAgdmVyYjogXCJvb3plcyBvbnRvXCJcclxuICAgICAgICB9KVxyXG4gICAgXVxyXG59KVxyXG5cclxuZXhwb3J0IGNvbnN0IHNwaWRlciA9IG5ldyBybC5Nb25zdGVyKHtcclxuICAgIG5hbWU6IFwiU3BpZGVyXCIsXHJcbiAgICBtYXhIZWFsdGg6IDMsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9zcGlkZXIucG5nXCIsXHJcbiAgICBleHBlcmllbmNlOiAxLFxyXG4gICAgYWdpbGl0eTogMSxcclxuICAgIGRlZmVuc2U6IDAsXHJcbiAgICBhdHRhY2tzOiBbXHJcbiAgICAgICAgbmV3IHJsLkF0dGFjayh7XHJcbiAgICAgICAgICAgIGF0dGFjazogMSxcclxuICAgICAgICAgICAgZGFtYWdlOiBuZXcgcmwuRGljZSgxLCAxKSxcclxuICAgICAgICAgICAgYWN0aW9uOiAxLFxyXG4gICAgICAgICAgICB2ZXJiOiBcImJpdGVzXCJcclxuICAgICAgICB9KVxyXG4gICAgXVxyXG59KVxyXG5cclxuZXhwb3J0IGNvbnN0IHNrZWxldG9uID0gbmV3IHJsLk1vbnN0ZXIoe1xyXG4gICAgbmFtZTogXCJTa2VsZXRvblwiLFxyXG4gICAgbWF4SGVhbHRoOiA1LFxyXG4gICAgaW1hZ2U6IFwiLi9hc3NldHMvc2tlbGV0b24ucG5nXCIsXHJcbiAgICBleHBlcmllbmNlOiAyLFxyXG4gICAgYWdpbGl0eTogMSxcclxuICAgIGRlZmVuc2U6IDAsXHJcbiAgICBhdHRhY2tzOiBbXHJcbiAgICAgICAgbmV3IHJsLkF0dGFjayh7XHJcbiAgICAgICAgICAgIGF0dGFjazogMSxcclxuICAgICAgICAgICAgZGFtYWdlOiBuZXcgcmwuRGljZSgxLCAzKSxcclxuICAgICAgICAgICAgYWN0aW9uOiAxLFxyXG4gICAgICAgICAgICB2ZXJiOiBcInNsYXNoZXMgYXRcIlxyXG4gICAgICAgIH0pLFxyXG4gICAgICAgIG5ldyBybC5BdHRhY2soe1xyXG4gICAgICAgICAgICBhdHRhY2s6IDIsXHJcbiAgICAgICAgICAgIGRhbWFnZTogbmV3IHJsLkRpY2UoMSwgNCksXHJcbiAgICAgICAgICAgIGFjdGlvbjogMSxcclxuICAgICAgICAgICAgdmVyYjogXCJ0aHJ1c3RzIGF0XCJcclxuICAgICAgICB9KVxyXG4gICAgXVxyXG59KVxyXG5cclxuZXhwb3J0IGNvbnN0IHJlZHkgPSBuZXcgcmwuTW9uc3Rlcih7XHJcbiAgICBuYW1lOiBcIlJlZHlcIixcclxuICAgIG1heEhlYWx0aDogOSxcclxuICAgIGltYWdlOiBcIi4vYXNzZXRzL3JlZHkucG5nXCIsXHJcbiAgICBleHBlcmllbmNlOiA0LFxyXG4gICAgYWdpbGl0eTogMixcclxuICAgIGRlZmVuc2U6IDIsXHJcbiAgICBhdHRhY2tzOiBbXHJcbiAgICAgICAgbmV3IHJsLkF0dGFjayh7XHJcbiAgICAgICAgICAgIGF0dGFjazogMCxcclxuICAgICAgICAgICAgZGFtYWdlOiBuZXcgcmwuRGljZSg1LCA2KSxcclxuICAgICAgICAgICAgYWN0aW9uOiAxLFxyXG4gICAgICAgICAgICB2ZXJiOiBcInB1bmNoZXNcIlxyXG4gICAgICAgIH0pXHJcbiAgICBdXHJcbn0pXHJcblxyXG5leHBvcnQgY29uc3QgZmlzdHMgPSBuZXcgcmwuTWVsZWVXZWFwb24oe1xyXG4gICAgbmFtZTogXCJGaXN0c1wiLFxyXG4gICAgYXR0YWNrOiAwLFxyXG4gICAgZGFtYWdlOiBuZXcgcmwuRGljZSgxLCAyKSxcclxuICAgIGFjdGlvbjogMSxcclxuICAgIHZlcmI6IFwicHVuY2hlcyBhdFwiXHJcbn0pXHJcblxyXG5leHBvcnQgY29uc3Qgc2hhcnBTdGljayA9IG5ldyBybC5NZWxlZVdlYXBvbih7XHJcbiAgICBuYW1lOiBcIlNoYXJwIFN0aWNrXCIsXHJcbiAgICBhdHRhY2s6IDEsXHJcbiAgICBhY3Rpb246IDEsXHJcbiAgICBkYW1hZ2U6IG5ldyBybC5EaWNlKDEsIDIpLFxyXG4gICAgdmVyYjogXCJzd2luZ3MgYXRcIlxyXG59KVxyXG5cclxuZXhwb3J0IGNvbnN0IGRhZ2dlciA9IG5ldyBybC5NZWxlZVdlYXBvbih7XHJcbiAgICBuYW1lOiBcIkRhZ2dlclwiLFxyXG4gICAgYXR0YWNrOiAxLFxyXG4gICAgYWN0aW9uOiAxLFxyXG4gICAgZGFtYWdlOiBuZXcgcmwuRGljZSgxLCAzKSxcclxuICAgIHZlcmI6IFwiamFicyBhdFwiXHJcbn0pXHJcblxyXG5leHBvcnQgY29uc3QgaXJvblN3b3JkID0gbmV3IHJsLk1lbGVlV2VhcG9uKHtcclxuICAgIG5hbWU6IFwiSXJvbiBTd29yZFwiLFxyXG4gICAgYXR0YWNrOiAyLFxyXG4gICAgYWN0aW9uOiAxLFxyXG4gICAgZGFtYWdlOiBuZXcgcmwuRGljZSgyLCA0KSxcclxuICAgIHZlcmI6IFwidGhydXN0cyBhdFwiXHJcbn0pXHJcblxyXG5leHBvcnQgY29uc3Qgc3RlZWxTd29yZCA9IG5ldyBybC5NZWxlZVdlYXBvbih7XHJcbiAgICBuYW1lOiBcIlN0ZWVsIFN3b3JkXCIsXHJcbiAgICBhdHRhY2s6IDMsXHJcbiAgICBkYW1hZ2U6IG5ldyBybC5EaWNlKDMsIDUpLFxyXG4gICAgYWN0aW9uOiAxLFxyXG4gICAgdmVyYjogXCJ0aHJ1c3RzIGF0XCJcclxufSlcclxuXHJcbmV4cG9ydCBjb25zdCBzbGluZ1Nob3QgPSBuZXcgcmwuUmFuZ2VkV2VhcG9uKHtcclxuICAgIG5hbWU6IFwiU2xpbmdzaG90XCIsXHJcbiAgICBhdHRhY2s6IDEsXHJcbiAgICByYW5nZTogMyxcclxuICAgIGRhbWFnZTogbmV3IHJsLkRpY2UoMSwgMiksXHJcbiAgICBhY3Rpb246IDEsXHJcbiAgICB2ZXJiOiBcInNob290cyBhdFwiXHJcbn0pXHJcblxyXG5leHBvcnQgY29uc3Qgd29vZGVuQm93ID0gbmV3IHJsLlJhbmdlZFdlYXBvbih7XHJcbiAgICBuYW1lOiBcIldvb2RlbiBCb3dcIixcclxuICAgIGF0dGFjazogMixcclxuICAgIHJhbmdlOiA1LFxyXG4gICAgZGFtYWdlOiBuZXcgcmwuRGljZSgyLCA1KSxcclxuICAgIGFjdGlvbjogMSxcclxuICAgIHZlcmI6IFwic2hvb3RzIGF0XCJcclxufSlcclxuXHJcbmV4cG9ydCBjb25zdCBjbG90aEFybW9yID0gbmV3IHJsLkFybW9yKHtcclxuICAgIG5hbWU6IFwiQ2xvdGggQXJtb3JcIixcclxuICAgIGRlZmVuc2U6IDFcclxufSlcclxuXHJcbmV4cG9ydCBjb25zdCBsZWF0aGVyQXJtb3IgPSBuZXcgcmwuQXJtb3Ioe1xyXG4gICAgbmFtZTogXCJMZWF0aGVyIEFybW9yXCIsXHJcbiAgICBkZWZlbnNlOiAyXHJcbn0pXHJcblxyXG5leHBvcnQgY29uc3QgcGFkZGVkQXJtb3IgPSBuZXcgcmwuQXJtb3Ioe1xyXG4gICAgbmFtZTogXCJQYWRkZWQgQXJtb3JcIixcclxuICAgIGRlZmVuc2U6IDNcclxufSlcclxuXHJcbmV4cG9ydCBjb25zdCBjaGFpbkFybW9yID0gbmV3IHJsLkFybW9yKHtcclxuICAgIG5hbWU6IFwiQ2hhaW4gQXJtb3JcIixcclxuICAgIGRlZmVuc2U6IDRcclxufSlcclxuXHJcbmV4cG9ydCBjb25zdCBzY2FsZUFybW9yID0gbmV3IHJsLkFybW9yKHtcclxuICAgIG5hbWU6IFwiU2NhbGUgQXJtb3JcIixcclxuICAgIGRlZmVuc2U6IDVcclxufSlcclxuXHJcbmV4cG9ydCBjb25zdCBwbGF0ZUFybW9yID0gbmV3IHJsLkFybW9yKHtcclxuICAgIG5hbWU6IFwiUGxhdGUgQXJtb3JcIixcclxuICAgIGRlZmVuc2U6IDZcclxufSlcclxuXHJcbmV4cG9ydCBjb25zdCBzdGVlbFBsYXRlQXJtb3IgPSBuZXcgcmwuQXJtb3Ioe1xyXG4gICAgbmFtZTogXCJTdGVlbCBQbGF0ZSBBcm1vclwiLFxyXG4gICAgZGVmZW5zZTogN1xyXG59KVxyXG5cclxuZXhwb3J0IGNvbnN0IHdvb2RlblNoaWVsZCA9IG5ldyBybC5TaGllbGQoe1xyXG4gICAgbmFtZTogXCJXb29kZW4gU2hpZWxkXCIsXHJcbiAgICBkZWZlbnNlOiAxXHJcbn0pXHJcblxyXG5leHBvcnQgY29uc3QgaXJvblNoaWVsZCA9IG5ldyBybC5TaGllbGQoe1xyXG4gICAgbmFtZTogXCJJcm9uIFNoaWVsZFwiLFxyXG4gICAgZGVmZW5zZTogMlxyXG59KVxyXG5cclxuZXhwb3J0IGNvbnN0IHN0ZWVsU2hpZWxkID0gbmV3IHJsLlNoaWVsZCh7XHJcbiAgICBuYW1lOiBcIlN0ZWVsIFNoaWVsZFwiLFxyXG4gICAgZGVmZW5zZTogM1xyXG59KVxyXG5cclxuZXhwb3J0IGNvbnN0IHRvd2VyU2hpZWxkID0gbmV3IHJsLlNoaWVsZCh7XHJcbiAgICBuYW1lOiBcIlRvd2VyIFNoaWVsZFwiLFxyXG4gICAgZGVmZW5zZTogNFxyXG59KVxyXG5cclxuZXhwb3J0IGNvbnN0IHdlYWtIZWFsdGhQb3Rpb24gPSBuZXcgcmwuVXNhYmxlKHtcclxuICAgIG5hbWU6IFwiV2VhayBIZWFsdGggUG90aW9uXCIsXHJcbiAgICBoZWFsdGg6IDRcclxufSlcclxuXHJcbmV4cG9ydCBjb25zdCBoZWFsdGhQb3Rpb24gPSBuZXcgcmwuVXNhYmxlKHtcclxuICAgIG5hbWU6IFwiSGVhbHRoIFBvdGlvblwiLFxyXG4gICAgaGVhbHRoOiAxMFxyXG59KVxyXG5cclxuZXhwb3J0IGNvbnN0IGNoZXN0ID0gbmV3IHJsLkNvbnRhaW5lcih7XHJcbiAgICBuYW1lOiBcIkNoZXN0XCIsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9jaGVzdC5wbmdcIixcclxufSlcclxuXHJcbmV4cG9ydCBjb25zdCBwbGF5ZXIgPSBuZXcgcmwuUGxheWVyKHtcclxuICAgIG5hbWU6IFwiUGxheWVyXCIsXHJcbiAgICBpbWFnZTogXCIuL2Fzc2V0cy9jaGFyLnBuZ1wiLFxyXG4gICAgbWF4SGVhbHRoOiA2LFxyXG4gICAgbGlnaHRSYWRpdXM6IDVcclxufSkiXX0=