import * as dom from "../shared/dom.js"
import * as array from "../shared/array.js"
import * as gfx from "./gfx.js"
import * as gen from "./gen.js"
import * as input from "../shared/input.js"
import * as rl from "./rl.js"
import * as geo from "../shared/geo2d.js"
import * as output from "./output.js"
import * as things from "./things.js"

const canvas = dom.byId("canvas") as HTMLCanvasElement
const modalBackground = dom.byId("modalBackground") as HTMLDivElement
const statsDialog = dom.byId("statsDialog") as HTMLDivElement
const statsCloseButton = dom.byId("statsCloseButton") as HTMLDivElement

async function generateMap(player: rl.Player, renderer: gfx.Renderer, width: number, height: number): Promise<gen.MapData> {
    const map = gen.generateMap(width, height, player)

    // bake all 24x24 tile images to a single array texture
    // store mapping from image url to index
    let imageUrls: string[] = []
    imageUrls.push(...array.map(map.tiles, t => t.image))
    imageUrls.push(...array.map(map.fixtures, t => t.image))
    imageUrls.push(...array.map(map.monsters, c => c.image))
    imageUrls.push(player.image)
    imageUrls = imageUrls.filter(url => url)
    imageUrls = array.distinct(imageUrls)

    const layerMap = new Map<string, number>(imageUrls.map((url, i) => [url, i]))
    const images = await Promise.all(imageUrls.map(url => dom.loadImage(url)))
    const texture = renderer.bakeTextureArray(rl.tileSize, rl.tileSize, images)

    for (const th of map) {
        if (!th.image) {
            th.textureLayer = -1
            th.texture = null
            continue
        }

        const layer = layerMap.get(th.image)
        if (layer === undefined) {
            throw new Error(`texture index not found for ${th.image}`)
        }

        th.texture = texture
        th.textureLayer = layer
    }

    return map
}

function tick(renderer: gfx.Renderer, inp: input.Input, map: gen.MapData) {
    for (const monster of map.monsters) {
        tickMonster(map, monster)
    }

    handleInput(renderer.canvas, map, inp)
    drawFrame(renderer, map)
    requestAnimationFrame(() => tick(renderer, inp, map))
}

function getScrollOffset(playerPosition: geo.Point): geo.Point {
    // convert map point to canvas point, noting that canvas is centered on player
    const canvasCenter = new geo.Point(canvas.width / 2, canvas.height / 2)
    const offset = canvasCenter.subPoint(playerPosition.addScalar(.5).mulScalar(rl.tileSize))
    return offset.floor()
}

function canvasToMapPoint(playerPosition: geo.Point, cxy: geo.Point) {
    const scrollOffset = getScrollOffset(playerPosition)
    const mxy = cxy.subPoint(scrollOffset).divScalar(rl.tileSize)
    return mxy
}

function mapToCanvasPoint(playerPosition: geo.Point, mxy: geo.Point) {
    const scrollOffset = getScrollOffset(playerPosition)
    const cxy = mxy.mulScalar(rl.tileSize).addPoint(scrollOffset)
    return cxy
}

function handleInput(canvas: HTMLCanvasElement, map: gen.MapData, inp: input.Input) {
    const player = map.player
    if (!player.position) {
        return
    }

    const position = player.position.clone()

    if (inp.mouseLeftPressed) {
        // determine the map coordinates the user clicked on
        const mxy = canvasToMapPoint(player.position, new geo.Point(inp.mouseX, inp.mouseY)).floor()

        const clickFixture = map.fixtureAt(mxy)
        if (clickFixture) {
            output.info(`You see ${clickFixture.name}`)
            inp.flush()
            return
        }

        const clickCreature = map.monsterAt(mxy)
        if (clickCreature) {
            output.info(`You see ${clickCreature.name}`)
            inp.flush()
            return
        }

        const dxy = mxy.subPoint(player.position)
        const sgn = dxy.sign()
        const abs = dxy.abs()

        if (abs.x > 0 && abs.x >= abs.y) {
            position.x += sgn.x
        }

        if (abs.y > 0 && abs.y > abs.x) {
            position.y += sgn.y
        }

    }
    else if (inp.pressed("w")) {
        position.y -= 1
    }
    else if (inp.pressed("s")) {
        position.y += 1
    }
    else if (inp.pressed("a")) {
        position.x -= 1
    }
    else if (inp.pressed("d")) {
        position.x += 1
    } else if (inp.pressed("z")) {
        showStats(player)
    }

    inp.flush()

    // no move - flush & exit
    if (position.equal(player.position)) {
        return
    }

    const tile = map.tileAt(position)
    if (tile && !tile.passable) {
        return
    }

    const fixture = map.fixtureAt(position)
    if (fixture instanceof rl.Door) {
        output.info("Door opened")
        map.fixtures.delete(fixture)
    } else if (fixture && !fixture.passable) {
        return
    }

    const creature = map.monsterAt(position)
    if (creature && !creature.passable) {
        return
    }

    player.position = position
}

function drawFrame(renderer: gfx.Renderer, map: gen.MapData) {
    const player = map.player
    if (!player.position) {
        return
    }

    handleResize(renderer.canvas)

    // center the grid around the playerd
    const offset = getScrollOffset(player.position)

    // note - drawing order matters - draw from bottom to top

    // draw various layers of sprites
    for (const tile of map.tiles) {
        drawThing(renderer, offset, tile)
    }

    for (const fixture of map.fixtures) {
        drawThing(renderer, offset, fixture)
    }

    for (const creature of map.monsters) {
        drawThing(renderer, offset, creature)
    }

    drawThing(renderer, offset, player)
    drawHealthBar(renderer, player, offset)

    renderer.flush(rl.lightRadius * rl.tileSize)
}

function drawThing(renderer: gfx.Renderer, offset: geo.Point, th: rl.Thing) {
    // don't draw things that aren't positioned
    if (!th.position) {
        return
    }

    const spritePosition = th.position.mulScalar(rl.tileSize).addPoint(offset)
    const sprite = new gfx.Sprite({
        position: spritePosition,
        color: th.color,
        width: rl.tileSize,
        height: rl.tileSize,
        texture: th.texture,
        layer: th.textureLayer,
        flags: gfx.SpriteFlags.Lit | gfx.SpriteFlags.ArrayTexture | gfx.SpriteFlags.CastsShadows
    })

    renderer.drawSprite(sprite)
}

function drawHealthBar(renderer: gfx.Renderer, creature: rl.Creature, offset: geo.Point) {
    if (!creature.position) {
        return
    }

    const width = creature.maxHealth * 4 + 2
    const spritePosition = creature.position.mulScalar(rl.tileSize).addPoint(offset).subPoint(new geo.Point(0, rl.tileSize / 2))
    renderer.drawSprite(new gfx.Sprite({
        position: spritePosition,
        color: gfx.Color.white,
        width: width,
        height: 8
    }))

    renderer.drawSprite(new gfx.Sprite({
        position: spritePosition.addPoint(new geo.Point(1, 1)),
        color: gfx.Color.red,
        width: width - 2,
        height: 6
    }))
}

function handleResize(canvas: HTMLCanvasElement) {
    if (canvas.width === canvas.clientWidth && canvas.height === canvas.clientHeight) {
        return
    }

    canvas.width = canvas.clientWidth
    canvas.height = canvas.clientHeight
}

function showDialog(dialog: HTMLDivElement) {
    modalBackground.hidden = false
    dialog.hidden = false
    dialog.focus()
}

function hideDialog(dialog: HTMLDivElement) {
    modalBackground.hidden = true
    dialog.hidden = true
    canvas.focus()
}

function showStats(player: rl.Player) {
    const healthSpan = dom.byId("statsHealth") as HTMLSpanElement
    const attackSpan = dom.byId("statsAttack") as HTMLSpanElement
    const defenseSpan = dom.byId("statsDefense") as HTMLSpanElement
    const agilitySpan = dom.byId("statsAgility") as HTMLSpanElement
    const levelSpan = dom.byId("statsLevel") as HTMLSpanElement
    const experienceSpan = dom.byId("statsExperience") as HTMLSpanElement
    const experienceRequirement = rl.getExperienceRequirement(player.level + 1)

    healthSpan.textContent = `${player.health} / ${player.maxHealth}`
    attackSpan.textContent = `${player.attack}`
    defenseSpan.textContent = `${player.defense}`
    agilitySpan.textContent = `${player.agility}`
    levelSpan.textContent = `${player.level}`
    experienceSpan.textContent = `${player.experience} / ${experienceRequirement}`

    showDialog(statsDialog)
}

function toggleStats(player: rl.Player) {
    if (statsDialog.hidden) {
        showStats(player)
    } else {
        hideDialog(statsDialog)
    }
}

function tickMonster(map: gen.MapData, monster: rl.Monster) {
    // determine whether monster can see player
    if (!monster.position) {
        return
    }

    if (!map.player.position) {
        return
    }

    if (canSee(map, monster.position, map.player.position) && monster.state !== rl.MonsterState.aggro) {
        output.warning(`${monster.name} has spotted you!`)
        monster.state = rl.MonsterState.aggro
    }

    if (!canSee(map, monster.position, map.player.position) && monster.state === rl.MonsterState.aggro) {
        output.warning(`${monster.name} has lost sight of you!`)
        monster.state = rl.MonsterState.idle
    }
}

function canSee(map: gen.MapData, eye: geo.Point, target: geo.Point): boolean {
    for (const pt of march(eye, target)) {
        // ignore start point
        if (pt.equal(eye)) {
            continue
        }

        for (const th of map.thingsAt(pt)) {
            if (!th.transparent) {
                return false
            }
        }
    }

    return true
}

function* march(start: geo.Point, end: geo.Point): Generator<geo.Point> {
    const cur = start.clone()
    const dy = Math.abs(end.y - start.y);
    const sy = start.y < end.y ? 1 : -1;
    const dx = -Math.abs(end.x - start.x);
    const sx = start.x < end.x ? 1 : -1;
    let err = dy + dx;

    while (true) {
        yield cur

        if (cur.equal(end)) {
            break;
        }

        const e2 = 2 * err;
        if (e2 >= dx) {
            err += dx;
            cur.y += sy;
        }

        if (e2 <= dy) {
            err += dy;
            cur.x += sx;
        }
    }
}

async function main() {
    const statsButton = dom.byId("statsButton") as HTMLButtonElement

    const renderer = new gfx.Renderer(canvas)

    const player = things.player.clone()

    const map = await generateMap(player, renderer, 24, 24)
    const inp = new input.Input(canvas)

    output.write("Your adventure begins")
    requestAnimationFrame(() => tick(renderer, inp, map))

    statsButton.addEventListener("click", () => toggleStats(player))
    statsCloseButton.addEventListener("click", () => hideDialog(statsDialog))

    statsDialog.addEventListener("keypress", (ev) => {
        if (ev.key.toUpperCase() === "Z") {
            hideDialog(statsDialog)
        }
    })
}

main()