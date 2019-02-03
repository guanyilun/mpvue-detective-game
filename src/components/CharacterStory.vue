<template>
  <div class="weui-article">
    <wxParse :content="story"></wxParse>
  </div>
</template>

<script>
  import wxParse from 'mpvue-wxparse'

  export default {
    name: "CharacterStory",
    components: {
      wxParse
    },
    props: ['story']
  }
</script>

<style scoped>
</style>
