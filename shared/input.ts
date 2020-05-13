/**
 * low-level input handling
 */

export enum KeyState {
    Up,
    Down
}

export class Input {
    private _click: boolean = false
    private _clickX: number = 0
    private _clickY: number = 0
    private prevKeys: Map<string, KeyState> = new Map<string, KeyState>()
    private keys: Map<string, KeyState> = new Map<string, KeyState>()

    constructor(canvas: HTMLCanvasElement) {
        canvas.addEventListener("keydown", (ev) => this.handleKeyDown(ev))
        canvas.addEventListener("keyup", (ev) => this.handleKeyUp(ev))
        canvas.addEventListener("click", (ev) => this.handleClick(ev))
    }

    get click(): boolean {
        return this._click
    }

    get clickX(): number {
        return this._clickX
    }

    get clickY(): number {
        return this._clickY
    }

    get(key: string): KeyState {
        const kst = this.keys.get(key)
        if (!kst) {
            return KeyState.Up
        }

        return kst
    }

    private getPrev(key: string): KeyState {
        const kst = this.prevKeys.get(key)
        if (!kst) {
            return KeyState.Up
        }

        return kst
    }

    up(key: string): boolean {
        return this.get(key) === KeyState.Up
    }

    down(key: string): boolean {
        return this.get(key) == KeyState.Down;
    }

    pressed(key: string): boolean {
        return this.getPrev(key) === KeyState.Up && this.get(key) === KeyState.Down
    }

    held(key: string): boolean {
        return this.getPrev(key) === KeyState.Down && this.get(key) === KeyState.Down
    }

    released(key: string): boolean {
        return this.getPrev(key) === KeyState.Down && this.get(key) === KeyState.Up
    }

    /**
     * update key states, determining which are being held, released etc...
     * this should be done AFTER current input is checked
     */
    flush(): void {
        // process event list, updating key state
        this.prevKeys = new Map<string, KeyState>(this.keys)

        // reset click info
        this._click = false
        this._clickX = 0
        this._clickY = 0
    }

    private handleKeyDown(ev: KeyboardEvent) {
        this.keys.set(ev.key, KeyState.Down)
    }

    private handleKeyUp(ev: KeyboardEvent) {
        this.keys.set(ev.key, KeyState.Up)
    }

    private handleClick(ev: MouseEvent) {
        this._click = true;
        this._clickX = ev.clientX
        this._clickY = ev.clientY
    }
}