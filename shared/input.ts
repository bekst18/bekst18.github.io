/**
 * low-level input handling
 */

export enum KeyState {
    Up,
    Down
}

export class Keys {
    private prevKeys: Map<string, KeyState> = new Map<string, KeyState>()
    private keys: Map<string, KeyState> = new Map<string, KeyState>()

    constructor() {
        document.addEventListener("keydown", (ev) => this.handleKeyDown(ev))
        document.addEventListener("keyup", (ev) => this.handleKeyUp(ev))
    }

    get(key: string): KeyState {
        const kst = this.keys.get(key)
        if (!kst) {
            return KeyState.Up
        }

        return kst
    }

    private getPrev(key: string) : KeyState {
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

    released(key: string) : boolean {
        return this.getPrev(key) === KeyState.Down && this.get(key) === KeyState.Up
    }

    /**
     * update key states, determining which are being held, released etc...
     * this should be done AFTER current input is checked
     */
    update(): void {
        // process event list, updating key state
        this.prevKeys = new Map<string, KeyState>(this.keys)
    }

    private handleKeyDown(ev: KeyboardEvent) {
        this.keys.set(ev.key, KeyState.Down)
    }

    private handleKeyUp(ev: KeyboardEvent) {
        this.keys.set(ev.key, KeyState.Up)
    }
}