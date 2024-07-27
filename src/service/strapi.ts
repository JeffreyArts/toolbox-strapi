import axios, { AxiosRequestConfig, AxiosResponse } from "axios"

interface StrapiHTTPHeader {
    "Content-Type": string;
    "Authorization"?: string;
}

const Strapi = {
    GET(path: string) {
        return Strapi.REST("GET", path)
    },
    DELETE(path: string) {
        return Strapi.REST("DELETE", path)
    },
    POST(path: string, data?: object | string) {
        return Strapi.REST("POST", path, data)
    },
    PUT(path: string, data?: object | string) {
        if (typeof data === "object") {
            data = JSON.stringify(data)
        }
        return Strapi.REST("PUT", path, data)
    },
    REST(method: string, path: string, data?: object | string) : Promise<AxiosResponse<any, any>> {
        const headers = {
            "Content-Type": "application/json",
        } as StrapiHTTPHeader
        
        if (path[0] === "/") {
            path = path.slice(1)
        }
        
        
        if (localStorage.getItem("authToken")) {
            headers["Authorization"] = `Bearer ${localStorage.getItem("authToken")}`
        }
        
        const request = {
            method: method,
            headers: headers
        } as AxiosRequestConfig
        
        if (typeof data !== "string") {
            request.data = JSON.stringify(data, null, 2)
        }
        return axios(path, request)
    },
}
export default Strapi