<template >
  <site-menu></site-menu>
  <section class="outlet-full"><router-view /></section>
</template>


<script setup>
import siteMenu from "./components/site-menu.vue"
import Strapi from "./store/strapi"
const strapi = Strapi()

if (typeof window !== "undefined") {
    strapi.init()
}

</script>

<style src="./app.scss"></style>
