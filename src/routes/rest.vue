<template>
    <div class="page">
        <header class="title">
            <h1>REST Test page</h1>
        </header>

        <hr>
        <section class="viewport">
            <div class="viewport-content rest-body" ratio="4x3" >
                <h3>Body</h3>
                <pre>{{ body }}</pre>
            </div>
            <br>
            <div class="viewport-content rest-header" ratio="16x9" >
                <h3>Header <span v-if="status">{{ status }} - {{ statusText }}</span></h3>
                <pre>{{  headers }}</pre>
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
                        <label for="options-restPath">Path</label>
                        <input type="text" id="options-restPath" v-model="options.restPath" />
                    </div>

                    <div class="option">
                        <label for="name">Method</label>
                        <select name="name" id="name" v-model="options.restMethod">
                            <option v-for="(c,k) in restMethods" :key="k" :value="c">{{upperCase(c)}}</option>
                        </select>
                    </div>

                    <!-- <div class="option">
                        <label for="name">Body</label>
                        <div id="requestBody"></div>
                    </div> -->

                    <div class="option">
                        <label>Include Authentication Code</label>
                        <input type="radio" id="includeAuthToken-false" :disabled="!authToken" :value="false" v-model="options.includeAuthToken">
                        <label for="includeAuthToken-false">
                            No
                        </label>

                        <input type="radio" id="includeAuthToken-true" :disabled="!authToken" :value="true" v-model="options.includeAuthToken">
                        <label for="includeAuthToken-true">
                            Yes
                        </label>

                        <i class="info" v-if="!authToken"><span class="info-icon">?</span><span class="info-details">No authToken found in localStorage</span></i>
                    </div>
                    <div class="option">
                        <small>
                            Run the following command in the terminal to list all possible endpoints in your Strapi application <code>yarn strapi routes:list</code>
                        </small>
                    </div>
                    <form class="option" @submit="submitRequest">
                        <label for="submit-request">Submit request</label>
                        <button class="button" id="submit-request">Submit</button>
                    </form>
                </div>
            </div>
        </aside>
    </div>
</template>


<script lang="ts">
import { defineComponent } from "vue"
import { AxiosResponseHeaders } from "axios"
import _, { upperCase } from "lodash"
import StrapiStore  from "@/store/strapi"

interface Options {
    headers: AxiosResponseHeaders
    restPath: string
    includeAuthToken: boolean
    restMethod: "GET" | "PUT" | "POST" | "DELETE"
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
            statusText: "",
            headers: {},
            restMethods: ["GET", "POST", "PUT", "DELETE"],
            options: {
                restPath: "/",
                restMethod: "GET",
                includeAuthToken: true,
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
        // this.strapiUrl = this.Strapi.baseUrl
        this.authToken = localStorage.getItem("authToken")
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
        submitRequest(e:Event) {
            e.preventDefault()
            const path = this.options.restPath || "/"
            if (this.options.restMethod) {
                this.Strapi.REST(this.options.restMethod, path).then((response) => {
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
            }
        }
    }
})
</script>


<style lang="scss" scoped>
</style>