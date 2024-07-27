import { defineStore } from "pinia"
import UserModel from "@/model/strapi/user"
import AuthModel from "@/model/strapi/auth"
import StrapiService from "@/service/strapi"
import { AxiosRequestConfig, AxiosResponse,AxiosError } from "axios"
import axios from "axios"
import _ from "lodash"
import jwt_decode from "jwt-decode"

export interface StrapiHTTPHeader {
    "Content-Type": string;
    "Authorization"?: string;
}

export interface StrapiUser {
    id: number;
    username: string;
    email: string;
    provider: string;
    confirmed: boolean;
    blocked: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface StrapiAuthenticationError {
    status?: number;
    name: string;
    message: string;
    details?: {
        errors?: Array<{
            message: string,
            name: string,
            path: Array<string>
        }>
    };
}

export const Strapi = defineStore({
    id: "strapi",
    state: () => ({
        baseUrl: "",
        self: null as UserModel | null,
        auth: undefined as AuthModel | undefined 
    }),
    actions: {
        init() {
            this.baseUrl = ""
            
            
            // Set url
            let url = import.meta.env.VITE_STRAPI_REST_ENDPOINT
            // if last char is a slash, remove it
            if (url[url.length - 1] === "/") {
                url = url.slice(0, -1)
            }
            
            // if first char is not a slash, add it
            if (import.meta.env.VITE_STRAPI_REST_ENDPOINT[0] !== "/") {
                url = `${url}/`
            } 
            
            if (url[url.length - 1] !== "/") {
                url = url + "/"
            }
            
            this.baseUrl = url
            this.auth = new AuthModel(this.baseUrl)

            // this.authToken = localStorage.getItem("auth_token")
            const authToken = localStorage.getItem("auth_token")
            if (authToken) {
                if (this.auth.validateAuthToken(authToken)) {
                    this.GET("/users/me").then((res) => {
                        this.self = _.pick(res.data, [
                            "name",
                            "email"
                        ])
                    })
                }
            }
        },
        GET(path: string) {
            return this.REST("GET", path)
        },
        DELETE(path: string) {
            return this.REST("DELETE", path)
        },
        POST(path: string, data?: object | string) {
            return this.REST("POST", path, data)
        },
        PUT(path: string, data?: object | string) {
            if (typeof data === "object") {
                data = JSON.stringify(data)
            }
            return this.REST("PUT", path, data)
        },
        REST(method: string, path: string, data?: object | string) : Promise<AxiosResponse<any, any>> {
            const headers = {
                "Content-Type": "application/json",
            } as StrapiHTTPHeader
            
            if (path[0] === "/") {
                path = path.slice(1)
            }
            path = this.baseUrl + path
             
            if (localStorage.getItem("authToken")) {
                headers["Authorization"] = `Bearer ${localStorage.getItem("authToken")}`
            }

            const request = {
                method: method,
                headers: headers
            } as AxiosRequestConfig
            
            if (typeof data !== "string" && typeof data !== "undefined") {
                request.data = JSON.stringify(data, null, 2)
            }

            return axios(path, request)
        },
        authenticateUser(identifier: string, password: string) {
            if (!this.auth) {
                throw new Error("Missing auth")
            }

            return this.auth.authenticate({
                identifier,
                password
            })
        },
        registerUser(email: string, password:string) {
            if (!this.auth) {
                throw new Error("Missing auth")
            }
    
            return this.auth.register({
                email,
                password
            })
            
        },
        requestPasswordReset(email: string) {
            const errorMessages = {
                missing_required_fields: "Missing required fields",
                invalid_email: "Please enter a valid e-mailaddress",
                unknown: "Unknown server error, please try again later"
            }

            const errors = [] as Array<string>

            return new Promise(async (resolve, reject) => {
                try {
                    if (!email) {
                        throw {
                            name: "missing_required_fields",
                            message: errorMessages["missing_required_fields"],
                            details: "Missing email input"
                        } as StrapiAuthenticationError
                    }
                    
                    const response = await this.POST("/auth/forgot-password", {
                        email: email
                    })
    
                    if (!response.data) {
                        throw {
                            name: "unknown",
                            message: errorMessages["unknown"],
                            details: "Missing response data"
                        } as StrapiAuthenticationError
                    }
    
                    resolve(response.data)
    
                } catch (err: StrapiAuthenticationError | unknown) {
    
                    if (err instanceof AxiosError && err.response && err.response.data && err.response.data.error) {
                        const serverError = err.response.data.error
                        
                        if (serverError.message) {
                            for (const err of serverError.details.errors) {
                                errors.push(err)
                            }
                        } else {
                            errors.push(errorMessages["unknown"])
                        }
                    }
                    reject(errors)
                }
            })
        },
        resetPassword(password: string, code: string) {
            const errorMessages = {
                missing_required_fields: "Missing required fields",
                incorrect_code: "The provided code is (no longer) valid",
                duplicate_entry: "An user already exist with this e-mailaddres or username",
                not_confirmed: "To complete your registration, please confirm your account via the e-mail we have send you to the provided e-mailaddress",
                unknown: "Unknown server error, please try again later"
            }
            let error: StrapiAuthenticationError | undefined

            return new Promise(async (resolve, reject) => {
                try {
                    const response = await this.POST("/auth/reset-password", {
                        code: code,
                        passwordConfirmation: password,
                        password: password
                    })
    
    
                    if (!response.data) {
                        throw {
                            type: "unknown",
                            message: errorMessages["unknown"],
                            details: "Missing response data"
                        }
                    }
    
                    if (error && error.type) {
                        throw error
                    }
    
                    this._saveUserData(response)
                    resolve(response.data)
    
                } catch (err) {
    
                    if (err instanceof AxiosError && err.response && err.response.data && err.response.data.error) {
                        const serverError = err.response.data.error
                        
                        if (serverError.message.toLowerCase().includes("incorrect code")) {
                            error = {
                                type: "incorrect_code",
                                message: errorMessages["incorrect_code"],
                            }
                        } else {
                            error = {
                                type: "unknown",
                                message: errorMessages["unknown"]
                            }
                        }
                    }
                    reject(error)
                }
            })
        },
        logout() {
            this.self = undefined
            this.authToken = null
            
            localStorage.removeItem("auth_token")
        }
    },
    getters: {
    }
})

export default Strapi