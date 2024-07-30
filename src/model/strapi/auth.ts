import { jwtDecode } from "jwt-decode"
import axios, { AxiosError, AxiosResponse } from "axios"
import UserModel from "./user"
import Strapi from "@/service/strapi"
import _ from "lodash"

export interface AuthModel {
    self: UserModel | undefined
    baseUrl: string
    refreshTimeout: number |  NodeJS.Timeout
    refreshToken: string
    authToken: string
}

export class AuthModel {

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl
        this.refreshTimeout = 0
        this.refreshToken = localStorage.getItem("refreshToken") || ""
        this.authToken = localStorage.getItem("authToken") || ""

        if (localStorage.getItem("self")) {
            this.self = new UserModel({self: true})
        }
    }
    
    validateAuthToken(token:string) : boolean {
        if (token) {
            const authData = jwtDecode(token) as {
                exp: number,
                iat: number,
                id: number
            }
            
            if (authData) {
                // get difference in minutes
                const expiration = authData.exp -  Math.floor(Date.now() / 1000)
                return expiration > 0
            }
        }
        return false
    }

    decodeJWT(token:string) : any {
        return jwtDecode(token)
    }
    
    autoRefreshToken(delay: number) {
        this.refreshTimeout = setTimeout(this.requestAuthToken, delay)
    }
    
    clearAutoRefreshToken(delay: number) {
        clearTimeout(this.refreshTimeout)
    }
    
    requestAuthToken() {
        // Strapi.GET("")
    }
    
    authenticate(options: {identifier:string, password: string}) : Promise<AxiosResponse<any, any>> {
        
        return new Promise(async (resolve, reject) => {
            try {
                const credentials = { identifier: options.identifier, password: options.password }
                const response = await axios.post(`${this.baseUrl}/auth/local`, credentials)                
                
                if (response.data) {
                    localStorage.setItem("self", JSON.stringify(_.pick(response.data.user, ["id", "username", "email"])))
                    localStorage.setItem("authToken", response.data.jwt)
                    
                    this.self = new UserModel({
                        id: response.data.user.id,
                        username: response.data.user.username,
                        email:response.data.user.email,
                        self: true
                    })
                    return resolve(response)
                }

                reject(response)
                // localStorage.setItem("authToken", response.data.jwt)
                
            } catch (err) {
                
                if (err instanceof AxiosError && err.response && err.response.data && err.response.data.error) {
                    // const serverError = err.response.data.error
                    return reject(err)
                }

                reject(err)
            }
        })
        
    }
    
    register(options: {username:string, email: string, password:string}) : Promise<AxiosResponse<any, any>> {
        if (!options) {
            throw new Error("Missing options parameter")
        }
                
        return new Promise(async (resolve, reject) => {
            try {
                const request = {
                    email: options.email,
                    password: options.password,
                    username: options.username
                }
                
                const response = await Strapi.POST(`${this.baseUrl}/auth/local/register`, request)
                
                localStorage.setItem("self", JSON.stringify(_.pick(response.data.user, ["id", "username", "email"])))
                localStorage.setItem("authToken", response.data.jwt)
                
                this.self = new UserModel({
                    id: response.data.user.id,
                    username: response.data.user.username,
                    email:response.data.user.email,
                    self: true
                })
                
                resolve(response)
                
            } catch (err: unknown | any) {
                reject(err)
            }
        })
    }

    forgotPassword(options: {email?:string, username?: string}) : Promise<AxiosResponse<any, any>> {
        return new Promise(async (resolve, reject) => {
            try {
                const credentials =  { 
                } as { email?:string, username?:string }

                if (options.email) {
                    credentials.email = options.email
                } else if (options.username) {
                    credentials.username = options.username
                }
                
                const response = await axios.post(`${this.baseUrl}/auth/forgot-password`, credentials)                
                
                if (response.data) {
                    return resolve(response)
                }

                reject(response)
            } catch (err) {
                if (err instanceof AxiosError && err.response) {
                    // const serverError = err.response.data.error
                    return reject(err)
                }
                reject(err)
            }
        })
    }

    resetPassword(options: {paswordForgotCode:string, newPassword: string}) : Promise<AxiosResponse<any, any>> {
        return new Promise(async (resolve, reject) => {
            try {
                const requestBody =  { 
                    code: options.paswordForgotCode,
                    password: options.newPassword,
                    passwordConfirmation: options.newPassword
                }

                
                const response = await axios.post(`${this.baseUrl}/auth/reset-password`, requestBody)
                
                if (response.data) {
                    return resolve(response)
                }

                reject(response)
            } catch (err) {
                if (err instanceof AxiosError && err.response) {
                    // const serverError = err.response.data.error
                    return reject(err)
                }
                reject(err)
            }
        })
    }
    
    logout() {
        localStorage.removeItem("authToken")
    }
}

export default AuthModel