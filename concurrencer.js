
export class Concurrencer {

    constructor() {

        this.pendingPromise = []
        this.resultPromise = []
    }

    add(promise) {
        return (this.pendingPromise.push(promise) - 1)
    }

    async wait() {
        this.resultPromise = await Promise.all(this.pendingPromise)
    }

    getResult(index) {
        return this.resultPromise[index]
    }
}