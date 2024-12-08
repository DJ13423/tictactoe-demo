class Client {
    constructor(url, version = 'v1') {
        this.url = url
        this.version = version
    }

    Database(id) {
        return new Database(this, id)
    }

    LimitedDatabase(id) {
        return new LimitedDatabase(this, id)
    }

    ArrayDatabase(id) {
        return new ArrayDatabase(this, id)
    }

    LimitedArrayDatabase(id) {
        return new LimitedArrayDatabase(this, id)
    }

    Broadcast(id) {
        return new Broadcast(this, id)
    }
}

class Database {
    constructor(client, id) {
        this.client = client
        this.id = id
    }

    async getKeys() {
        return (await fetch(`${this.client.url}/api/${this.client.version}/database/${this.id}`)).json()
    }

    async getKey(key) {
        return fetch(`${this.client.url}/api/${this.client.version}/database/${this.id}/${key}`)
    }

    async setKey(key, value) {
        return fetch(`${this.client.url}/api/${this.client.version}/database/${this.id}/${key}`, {
            method: 'PUT',
            body: value
        })
    }

    async deleteKey(key) {
        return fetch(`${this.client.url}/api/${this.client.version}/database/${this.id}/${key}`, {
            method: 'DELETE'
        })
    }
}

class LimitedDatabase {
    constructor(client, id) {
        this.client = client
        this.id = id
    }

    async getKeys() {
        return (await fetch(`${this.client.url}/api/${this.client.version}/limited-database/${this.id}`)).json()
    }

    async setKey(key, value) {
        return fetch(`${this.client.url}/api/${this.client.version}/limited-database/${this.id}/${key}`, {
            method: 'PUT',
            body: value
        })
    }
}

class ArrayDatabase {
    constructor(client, id) {
        this.client = client
        this.id = id
    }

    async getElements() {
        return (await fetch(`${this.client.url}/api/${this.client.version}/array-database/${this.id}`)).json()
    }

    async getElement(index) {
        return fetch(`${this.client.url}/api/${this.client.version}/array-database/${this.id}/${index}`)
    }

    async setElement(index, value) {
        return fetch(`${this.client.url}/api/${this.client.version}/array-database/${this.id}/${index}`, {
            method: 'PUT',
            body: value
        })
    }

    async appendElement(value) {
        return fetch(`${this.client.url}/api/${this.client.version}/array-database/${this.id}`, {
            method: 'PUT',
            body: value
        })
    }

    async deleteElement(index) {
        return fetch(`${this.client.url}/api/${this.client.version}/array-database/${this.id}/${index}`, {
            method: 'DELETE'
        })
    }
}

class LimitedArrayDatabase {
    constructor(client, id) {
        this.client = client
        this.id = id
    }

    async getElements() {
        return (await fetch(`${this.client.url}/api/${this.client.version}/limited-array-database/${this.id}`)).json()
    }

    async setElement(index, value) {
        return fetch(`${this.client.url}/api/${this.client.version}/limited-array-database/${this.id}/${index}`, {
            method: 'PUT',
            body: value
        })
    }

    async appendElement(value) {
        return fetch(`${this.client.url}/api/${this.client.version}/limited-array-database/${this.id}`, {
            method: 'PUT',
            body: value
        })
    }
}

class Broadcast {
    constructor(client, id) {
        this.client = client
        this.id = id
        this.websocket = null
    }

    connect() {
        this.websocket = new WebSocket(`ws://${this.client.url}/api/${this.client.version}/broadcast/${this.id}`)
    }

    send(message) {
        this.websocket.send(message)
    }

    disconnect() {
        this.websocket.close()
    }

    addEventListener(event, callback) {
        this.websocket.addEventListener(event, callback)
    }
}

export default { Client }
