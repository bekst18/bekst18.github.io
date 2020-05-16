/**
 * low-level input handling
 */

export enum KeyState {
    Up,
    Down
}

export class Input {
    private _mouseLeft: KeyState = KeyState.Up
    private _prevMouseLeft: KeyState = KeyState.Up
    private _mouseX: number = 0
    private _mouseY: number = 0
    private prevKeys: Map<string, KeyState> = new Map<string, KeyState>()
    private keys: Map<string, KeyState> = new Map<string, KeyState>()

    constructor(canvas: HTMLCanvasElement) {
        canvas.addEventListener("keydown", ev => this.handleKeyDown(ev))
        canvas.addEventListener("keyup", ev => this.handleKeyUp(ev))
        canvas.addEventListener("mousedown", ev => this.handleMouseDown(ev))
        canvas.addEventListener("mouseup", ev => this.handleMouseUp(ev))
        canvas.addEventListener("mousemove", ev => this.handleMouseMove(ev))
        canvas.addEventListener("touchstart", ev => this.handleTouchStart(ev))
        canvas.addEventListener("touchend", ev => this.handleTouchEnd(ev))
        canvas.addEventListener("touchmove", ev => this.handleTouchMove(ev))
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

    // mouse
    get mouseX(): number {
        return this._mouseX
    }

    get mouseY(): number {
        return this._mouseY
    }

    get mouseLeftUp(): boolean {
        return this._mouseLeft === KeyState.Up
    }

    get mouseLeftDown(): boolean {
        return this._mouseLeft == KeyState.Down;
    }

    get mouseLeftPressed(): boolean {
        return this._prevMouseLeft === KeyState.Up && this._mouseLeft === KeyState.Down
    }

    get mouseLeftHeld(): boolean {
        return this._prevMouseLeft === KeyState.Down && this._mouseLeft === KeyState.Down
    }

    get mouseLeftReleased(): boolean {
        return this._prevMouseLeft === KeyState.Down && this._mouseLeft === KeyState.Up
    }

    /**
     * update key states, determining which are being held, released etc...
     * this should be done AFTER current input is checked
     */
    flush(): void {
        // process event list, updating key state
        this.prevKeys = new Map<string, KeyState>(this.keys)
        this._prevMouseLeft = this._mouseLeft
    }

    private handleKeyDown(ev: KeyboardEvent) {
        this.keys.set(ev.key, KeyState.Down)
    }

    private handleKeyUp(ev: KeyboardEvent) {
        this.keys.set(ev.key, KeyState.Up)
    }

    private handleMouseDown(ev: MouseEvent) {
        switch (ev.button) {
            case 0:
                this._mouseLeft = KeyState.Down
                break
        }
    }

    private handleMouseUp(ev: MouseEvent) {
        switch (ev.button) {
            case 0:
                this._mouseLeft = KeyState.Up
                break;
        }
    }

    private handleMouseMove(ev: MouseEvent) {
        this._mouseX = ev.offsetX
        this._mouseY = ev.offsetY
    }

    private handleTouchStart(ev: TouchEvent) {
        // prevent default here will stop sinulated mouse events
        ev.preventDefault()
        this._mouseLeft = KeyState.Down
    }

    private handleTouchEnd(ev: TouchEvent) {
        // prevent default here will stop sinulated mouse events
        ev.preventDefault()
        this._mouseLeft = KeyState.Up
    }

    private handleTouchMove(ev: TouchEvent) {
        // prevent default here will stop sinulated mouse events
        const rect = (ev.target as HTMLElement).getBoundingClientRect();
        const offsetX = ev.targetTouches[0].pageX - rect.left;
        const offsetY = ev.targetTouches[0].pageY - rect.top;
        this._mouseX = offsetX
        this._mouseY = offsetY
    }
}