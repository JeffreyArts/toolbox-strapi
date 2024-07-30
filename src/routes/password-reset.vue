<template>
    <div class="page">
        <header class="title">
            <h1>Password reset</h1>
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
                <div class="option-group" name="Reset Password" >
                    <div class="option">
                        <label for="options-test">API Endpoint<i class="info"><span class="info-icon">?</span><span class="info-details">Configure this path via the .env file</span></i></label>
                        <input type="text" disabled id="options-test" v-model="Strapi.baseUrl" />
                    </div>
                    <div class="option">
                        <label for="options-email">E-mail</label>
                        <input type="text" id="options-email" v-model="options.email" />
                    </div>
                    <div class="option __isSubmit">
                        <button class="button" id="submit-request" @click="forgotPassword">Reset</button>
                    </div>
                    <small v-if="status === 500">
                        Are you sure that you've configured the mailserver correctly?<br>
                        <ul style="margin: 8px 0 0 10px;padding:0;">
                            <li><a :href="Strapi.baseUrl + '/admin/settings/email'" target="_blank">Strapi mail configuration</a></li>
                            <li>Configuration for the default <a href="https://www.npmjs.com/package/sendmail" target="_blank">Sendmail</a> plugin</li>
                            <li>Configuration for a <a href="https://docs.strapi.io/cloud/advanced/email" target="_blank">third-party e-mailprovider</a> (like <a href="https://market.strapi.io/providers/@strapi-provider-email-mailgun" target="_blank">Mailgun</a>, <a href="https://market.strapi.io/providers/@strapi-provider-email-nodemailer" target="_blank">Nodemailer</a> or <a href="https://market.strapi.io/providers/@strapi-provider-email-sendgrid" target="_blank">Sendgrid</a>)</li>
                        </ul>
                        <br>
                        <br>
                    </small>
                    <small v-if="status === 200 && forgotPasswordTry > 1">
                        Not receiving e-mails? Are you sure you have configured everything correctly? Like the shipment email address of the <a :href="Strapi.baseUrl.replace('/api','') + '/admin/settings/users-permissions/email-templates'" target="_blank">forgot password template</a>?
                        Or <a :href="Strapi.baseUrl.replace('/api','') + '/admin/settings/users-permissions/advanced-settings'" target="_blank">configuring the URL</a> that it should redirect the user to in the e-mail>
                        See also <a href="https://forum.strapi.io/t/forgot-password-no-email-received-strapi-v4/34361/9?u=sjeffff">this thread</a> for more relevant context.
                        <br>
                        <br>
                    </small>
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

                <form class="option __isSubmit" @submit="logout">
                    <button class="button" id="submit-request">Logout</button>
                </form>
            </div>  
        </aside>
        <div class="dialog" v-if="passwordReset" @click="closeDialog($event)">
            <form @submit="resetPassword(passwordResetCode, password, $event)" class="dialog-wrapper">
                <p>Use the form below to get yourself a new password</p>
                <div class="option">
                    <label for="password">New password</label>
                    <input id="password" type="password" v-model="password">
                    <span class="error" v-if="passwordResetError"> {{ passwordResetError }}</span>
                </div>
                <div class="option">
                    <button class="button">Reset password</button>
                </div>
            </form>
        </div>
    </div>
</template>


<script lang="ts">
import { defineComponent } from "vue"
import _, { upperCase } from "lodash"
import StrapiStore  from "@/store/strapi"
import { UserModel } from "@/model/strapi/user"
import { LocationQueryValue } from "vue-router"

interface Options {
    email: string
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
            password: "",
            statusText: "",
            passwordReset: false,
            passwordResetCode: "",
            passwordResetError: "",
            forgotPasswordTry: 0,
            headers: {},
            options: {
                email: "",
            } as Partial<Options>,
            ignoreOptionsUpdate: true,
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
        this.loadOptions()
        this.processPasswordResetToken()

        if (this.Strapi.auth) {
            this.user = this.Strapi.auth.self
        }
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
        forgotPassword(e:Event) {
            e.preventDefault()
            this.forgotPasswordTry++
            this.body = ""
            this.headers = ""
            this.status = 0
            this.statusText = ""

            if (!this.Strapi.auth) {
                throw new Error("Missing Strapi.auth model")
            }
            this.options.email = this.options.email || ""
            
            this.Strapi.auth.forgotPassword({
                email: this.options.email
            }).then((response) => {
                this.body = response.data
                this.headers = response.headers
                this.status = response.status
                this.statusText = response.statusText
            }).catch(err => {
                this.body = err.response.data
                this.headers = err.response.headers
                this.status = err.response.status
                this.statusText = err.response.statusText
            })

        },
        processPasswordResetToken() {
            console.log(this.$route.query)
            const parameter = "code" 
            if (this.$route.query && this.$route.query.code) {
                this.passwordReset = true
                this.passwordResetCode = this.$route.query.code as string
            }
        },
        resetPassword(code: string, password: string, e: Event) {
            e.preventDefault()
            console.log(code, password)
            if (this.Strapi.auth) {
                this.Strapi.auth.resetPassword({paswordForgotCode: code, newPassword: password})
                .then((response) => {
                    delete this.$route.query.code
                    this.passwordReset = false
                    this.passwordResetCode = ""
                })
                .catch((err) => {
                    console.log(err)
                    this.passwordResetError = err.response.data.error.message

                })
            }
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
        },
        closeDialog(e: Event) {
            console.log(e)
            const target = e.target as HTMLElement
            if (!target) {
                return
            }
            if (target.className === "dialog") {
                this.$router.push( "/password-reset")
                this.passwordReset = false
                this.passwordResetCode = ""
                console.log("Change path")
            }
        }
    },
})
</script>


<style lang="scss" scoped>
    .dialog {
        position: fixed;
        inset: 0;
        background-color: rgba(0,0,0,.9);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 2024;
    }

    .dialog-wrapper {
        background-color: #222;
        border-radius: 4px;
        padding: 8px 24px;

        input {
            min-width: 50%;
        }
    }

    .error {
        display: block;
        font-size: 12px;
        padding-top: 8px;
        color: tomato;
    }
</style>