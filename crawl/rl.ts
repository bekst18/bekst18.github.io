/**
 * rogue-like library
 */
export type Coords = [number, number]

export interface Thing {
    position: Coords
    passable: boolean
    transparent: boolean
    name: string
    image: string
    texture: WebGLTexture | null
    textureLayer: number | null
}

export interface Tile extends Thing { }
export interface Fixture extends Thing { }
export interface Player extends Thing { }