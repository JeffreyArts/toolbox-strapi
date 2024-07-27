import { jwtDecode } from "jwt-decode"
import axios, { AxiosError } from "axios"
import Strapi from "@/service/strapi"

export interface AuthModel {
    baseUrl: string
    refreshTimeout: number |  NodeJS.Timeout
    refreshToken: string
    authToken: string
}

class AuthenticationError extends Error {
    constructor(type: string, message?: string) {
        if (typeof type != "string") {
            return
        }

        const errorMessages = {
            missing_credentials: "Please enter your username and password",
            missing_username: "Please enter your username",
            missing_password: "Please enter your password",
            invalid_credentials: "Invalid username or password",
            blocked:  "Your account has been blocked, please contact an administrator",
            not_confirmed: "To complete your registration, please confirm your account via the e-mail we have send you",
            unknown: "Unknown server error, please try again later"
        }

        if (!message && typeof errorMessages[type as keyof typeof errorMessages] === "string") {
            message = errorMessages[type as keyof typeof errorMessages]
        }
        
        super(type)
        this.name = type

        if (message) {
            this.message = message
        }
    }
}

export class AuthModel {

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl
        this.refreshTimeout = 0
        this.refreshToken = localStorage.getItem("refreshToken") || ""
        this.authToken = localStorage.getItem("authToken") || ""
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
    
    autoRefreshToken(delay: number) {
        this.refreshTimeout = setTimeout(this.requestAuthToken, delay)
    }
    
    clearAutoRefreshToken(delay: number) {
        clearTimeout(this.refreshTimeout)
    }
    
    requestAuthToken() {
        // Strapi.GET("")
    }
    
    authenticate(options: {identifier:string, password: string}) {
        let error = {} as AuthenticationError
        
        return new Promise(async (resolve, reject) => {
            try {
                const credentials = { identifier: options.identifier, password: options.password }
                const response = await axios.post(`${this.baseUrl}/auth/local`, credentials)                
                if (!response.data) {
                    throw new AuthenticationError("unknown", "Missing response data")
                }
                
                if (!response.data.user.confirmed) {
                    throw new AuthenticationError("not_confirmed")
                }
                
                if (response.data.user.blocked) {
                    throw new AuthenticationError("blocked")
                }
                
                localStorage.setItem("authToken", response.data.jwt)
                resolve(response.data)
                
            } catch (err) {
                
                if (err instanceof AxiosError && err.response && err.response.data && err.response.data.error) {
                    const serverError = err.response.data.error
                    
                    if (serverError.details && serverError.details.errors && serverError.details.errors.length === 2) {
                        error = new AuthenticationError("missing_credentials")
                    } else if (serverError.details && serverError.details.errors && serverError.details.errors.length === 1) {
                        if (serverError.details.errors[0].message.includes("password")) {
                            error = new AuthenticationError("missing_password")
                        } else {
                            error = new AuthenticationError("missing_username")
                        }
                    } else {
                        error = new AuthenticationError("invalid_credentials")
                    }
                }
                reject(error)
            }
        })
        
    }

    register(options: {username?:string, email: string, password:string}){
        if (!options) {
            throw new Error("Missing options parameter")
        }
        const errorMessages = {
            not_confirmed: "To complete your registration, please confirm your account via the e-mail we have send you to the provided e-mailaddress",
            unknown: "Unknown server error, please try again later"
        }

        const errors = [] as Array<string>

        return new Promise(async (resolve, reject) => {
            try {
                const request = {
                    email: options.email,
                    password: options.password
                } as {email: string, password: string, username?:string}

                if (options.username) {
                    request.username = options.username
                }

                const response = await Strapi.POST(`${this.baseUrl}/auth/local/register`, request)

                if (!response.data) {
                    throw new AuthenticationError("unknown", "Missing response data")
                }
                
                // You can remove this check if you want the user to automatically login after registration
                if (!response.data.user.confirmed) {
                    throw new AuthenticationError("not_confirmed")
                }
                
                localStorage.setItem("authToken", response.data.jwt)
                resolve(response.data)

            } catch (err: unknown | any) {

                if (err instanceof AxiosError && err.response && err.response.data && err.response.data.error) {
                    const serverError = err.response.data.error

                    if (serverError.details && serverError.details.errors.length >= 1 ) {
                        for (const err of serverError.details.errors) {
                            errors.push(err)
                        }
                    } else {
                        errors.push(serverError)
                    }
                } else if (err?.name ) {
                    errors.push(err)
                } 

                reject(errors)
            }
        })
    }
}

export default AuthModel