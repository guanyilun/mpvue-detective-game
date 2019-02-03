<template>
  <div class="page">
    <div class="weui-cells__title">请投票:</div>
    <div class="weui-cells weui-cells_after-title">
      <div class="weui-cell" v-for="(value, key) in roomData.votes" :key="key">
        <div class="weui-cell__bd">{{key}}</div> <button class="weui-btn weui-cell__ft" type="primary" size="mini" v-on:click="vote(key)">投票 ({{value}})</button>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: "Votes",
    props: ['roomData'],
    methods: {
      vote: function(key) {
        this.$socket = this.$store.socket
        this.$socket.emit("vote", {
          room: this.roomData.id,
          key: key
        });
      }
    }
  }
</script>

<style scoped>

</style>
