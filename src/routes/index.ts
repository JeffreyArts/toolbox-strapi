import Authorization from "./authorization.vue"
import Home from "./home.vue"
import OptionsOverview from "./options-overview.vue"
import PasswordReset from "./password-reset.vue"
import Rest from "./rest.vue"
import { createWebHistory, createRouter } from "vue-router"

const routes = [
    {
        path: "/",
        name: "Home",
        component: Home
    },
    {
        path: "/authorization",
        name: "Authorization",
        component: Authorization
    },
    {
        path: "/options-overview",
        name: "Options overview",
        component: OptionsOverview
    },
    {
        path: "/password-reset",
        name: "Password reset",
        component: PasswordReset
    },
    {
        path: "/rest",
        name: "REST",
        component: Rest
    }
]

// 
const router = createRouter({
    history: createWebHistory(),
    routes,
})

////////////////////////////////////////////////////////////////////////
// IMPORTANT NOTICE
// The code above will be updated via the `yarn new-route` command
// Be cautious when you make custom modifications (it should just work, 
// but just pay extra attention during your commits)
//
// - Jeffrey Arts, July 2024
////////////////////////////////////////////////////////////////////////


export default router
