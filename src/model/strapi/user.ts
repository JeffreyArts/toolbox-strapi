import { jwtDecode } from "jwt-decode"
import { AxiosError } from "axios"
import Strapi from "@/service/strapi"

export interface UserModel {
    self: boolean
    id: number
    email: string
    username: string
}
export interface UserOptions {
    id: number
    username: string
    email: string
    provider?: string
}

export class UserModel {
    constructor(properties: {
        id?: number,
        username?: string,
        email?: string,
        self?: boolean,
    }) {
        if (!properties) {
            throw new Error("Missing options for UserModel")
        }

        this.id = properties.id || 0
        this.username = properties.username || ""
        this.email = properties.email || ""
        this.self = (typeof properties.self !== "undefined") ? properties.self : false
        
        if (this.self && (!this.id && !this.email && !this.username)) {
            this.loadFromLocalStorage()
        }

    }

    loadFromLocalStorage() {
        const self = JSON.parse(localStorage.getItem("self") || "")
        if (!self) {
            throw new Error("No user found in localStorage")
        }

        this.id = self.id
        this.username = self.username
        this.email = self.email

        return self
    }
}

export default UserModel