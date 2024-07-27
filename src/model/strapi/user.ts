import { jwtDecode } from "jwt-decode"
import { AxiosError } from "axios"
import Strapi from "@/service/strapi"

export interface UserModel {
    name: string
    email: string
}
export class UserModel {

    constructor(properties: {
        name: string,
        email: string
    }) {
        this.name = properties.name
        this.email = properties.email
    }   
}

export default UserModel