<template>
    <div class="page">
        <header class="title">
            <h1>Authorization</h1>
        </header>

        <hr>
        <section class="viewport">
            <div class="viewport-content rest-body" ratio="4x3" >
                <h3 class="rest-header">Body</h3>
                <div class="rest-content">
                    <pre>{{ body }}</pre>
                </div>
            </div>
            <br>
            <div class="viewport-content rest-header" ratio="16x9" >
                <h3 class="rest-header">
                    Header 
                    <span v-if="status">{{ status }} - {{ statusText }}</span>
                </h3>
                <div class="rest-content">
                    <pre>{{  headers }}</pre>
                </div>
            </div>
        </section>

        <aside class="sidebar">
            <div class="options">
                <div class="option-group" name="Request" >
                    <div class="option">
                        <label for="options-test">API Endpoint<i class="info"><span class="info-icon">?</span><span class="info-details">Configure this path via the .env file</span></i></label>
                        <input type="text" disabled id="options-test" v-model="Strapi.baseUrl" />
                    </div>
                    <div class="option">
                        <label for="options-email">E-mail</label>
                        <input type="text" id="options-email" v-model="options.email" />
                    </div>
                    <div class="option">
                        <label for="options-password">Password</label>
                        <input type="password" id="options-password" v-model="options.password" />
                    </div>
                    <div class="option __isSubmit">
                        <button class="button" id="submit-request" @click="authenticate">Login</button>
                        <button class="button" id="submit-request" @click="register">Register</button>
                    </div>
                    <small v-if="status === 403 && jwt">Try to logout first before creating or authenticating a (new) user. <br><br></small>
                    <small v-if="status === 405">Are you sure that {{ location }} is added to Strapi's CORS config? See also: <a href="https://docs.strapi.io/dev-docs/configurations/middlewares#cors" target="_blank">https://docs.strapi.io/dev-docs/configurations/middlewares#cors</a><br><br></small>
                </div>
            </div>

            <div class="option-group" name="User" v-if="jwt">
                <div class="option">
                    <label for="options-jwt">JWT</label>
                    <input type="text" id="options-jwt" v-model="authToken"/>
                </div>
                <div class="option">
                    <table>
                        <tr>
                            <td>id</td>
                            <td>{{ jwt.id}}</td>
                        </tr>
                        <tr>
                            <td>iat</td>
                            <td>{{ jwt.iat}}</td>
                        </tr>
                        <tr>
                            <td>exp</td>
                            <td>{{ jwt.exp}}</td>
                        </tr>
                    </table>
                </div>

                <div class="option" v-if="user && user.id">
                    <label for="options-jwt">User</label>
                    <table>
                        <tr>
                            <td>id</td>
                            <td>{{ user.id}}</td>
                        </tr>
                        <tr>
                            <td>username</td>
                            <td>{{ user.username}}</td>
                        </tr>
                        <tr>
                            <td>email</td>
                            <td>{{ user.email}}</td>
                        </tr>
                    </table>
                </div>

                <form class="option __isSubmit" @submit="logout">
                    <button class="button" id="submit-request">Logout</button>
                </form>
            </div>  

        </aside>
    </div>
</template>


<script lang="ts">
import { defineComponent } from "vue"
import _, { upperCase } from "lodash"
import StrapiStore  from "@/store/strapi"
import { UserModel } from "@/model/strapi/user"

interface Options {
    email: string
    password: string
}

export default defineComponent ({ 
    components: {},
    props: [],
    setup() {
        const Strapi = StrapiStore()
        
        return { Strapi }
    },
    data() {
        return {
            strapiUrl: "",
            body: "",
            authToken: "" as string || null,
            status: 0,
            user: undefined as undefined | UserModel,
            jwt: undefined as undefined | {id: string, iat: string, exp: string},
            statusText: "",
            headers: {},
            options: {
                email: "",
                password: "",
            } as Partial<Options>,
            ignoreOptionsUpdate: true,
        }
    },
    computed: {
        location() {
            return window.location.host
        }  
    },
    watch: {
        "options": {
            handler(){
                if (this.ignoreOptionsUpdate) {
                    return
                }
                
                let newOptions = {} as any
                const localStorageOptions = localStorage.getItem("options")
                if (localStorageOptions) {
                    newOptions = _.cloneDeep(JSON.parse(localStorageOptions))
                }
                _.forOwn(this.options, (value, key) => {
                    if (_.isObject(value)) {
                        if (!_.isObject(newOptions[key])) {
                            newOptions[key] = {}
                        }
                        _.forOwn(value, (v, k) => {
                            newOptions[key][k] = v
                        })
                    } else {
                        newOptions[key] = value
                    }
                })
                localStorage.setItem("options", JSON.stringify(newOptions))
            },
            deep: true
        },
    },
    mounted() {
        this.authToken = localStorage.getItem("authToken")

        if (this.authToken && this.Strapi.auth) {
            this.jwt = this.Strapi.auth.decodeJWT(this.authToken)
            this.user = this.Strapi.auth.self
        }
        this.loadOptions()
    },
    unmounted() {
        //
    },
    methods: {
        upperCase: upperCase,
        loadOptions() {
            this.ignoreOptionsUpdate = true
            const optionsString = localStorage.getItem("options")
            if (optionsString) {
                const localOptions = JSON.parse(optionsString)
                _.forOwn(this.options, (value,key) => {
                    const typedKey = key as keyof Options
                    if (localOptions[typedKey]) {
                        this.options[typedKey] = localOptions[key]
                    }
                })
            }
            setTimeout(() => {
                this.ignoreOptionsUpdate = false
            })
        },
        register(e:Event) {
            e.preventDefault()
            if (!this.Strapi.auth) {
                throw new Error("Missing Strapi.auth model")
            }
            this.options.email = this.options.email || ""
            this.options.password = this.options.password || ""
            
            this.Strapi.auth.register({
                username: this.options.email,
                email: this.options.email,
                password: this.options.password,
            }).then((response) => {
                console.log(response)
                this.body = response.data
                this.headers = response.headers
                this.status = response.status
                this.statusText = response.statusText

                this.authToken = response.data.jwt as string
                this.user = response.data.user
            
                if (this.Strapi.auth) {
                    this.jwt = this.Strapi.auth.decodeJWT(this.authToken)
                }
            }).catch(err => {
                this.body = err.response.data
                this.headers = err.response.headers
                this.status = err.response.status
                this.statusText = err.response.statusText
            })
        },
        authenticate(e:Event) {
            e.preventDefault()
            if (!this.Strapi.auth) {
                throw new Error("Missing Strapi.auth model")
            }
            this.options.email = this.options.email || ""
            this.options.password = this.options.password || ""
            
            this.Strapi.auth.authenticate({
                identifier: this.options.email,
                password: this.options.password,
            }).then((response) => {
                this.body = response.data
                this.headers = response.headers
                this.status = response.status
                this.statusText = response.statusText

                this.authToken = response.data.jwt as string
                this.user = response.data.user
            
                if (this.Strapi.auth) {
                    this.jwt = this.Strapi.auth.decodeJWT(this.authToken)
                }
            }).catch(err => {
                this.body = err.response.data
                this.headers = err.response.headers
                this.status = err.response.status
                this.statusText = err.response.statusText
            })
        },
        logout(e:Event) {
            e.preventDefault()
            if (!this.Strapi.auth) {
                throw new Error("Missing Strapi.auth model")
            }
            this.Strapi.auth.logout()
            this.authToken = localStorage.getItem("authToken") || ""

            this.jwt = undefined
            this.user = undefined
        }
    }
})
</script>


<style lang="scss" scoped>
</style>