export class Channel<T extends any[]> {
    private readonly subscribers = new Set<(...args: T) => void>()

    public subcribe(subscriber: (...args: T) => void) {
        this.subscribers.add(subscriber)
    }

    public unsubscribe(subscriber: (...args: T) => void) {
        this.subscribers.delete(subscriber)
    }

    public publish(...args: T): void {
        for (const subscriber of this.subscribers) {
            subscriber(...args)
        }
    }
}