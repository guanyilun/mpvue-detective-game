<template>
  <div class="page">
    <div class="page" v-for="(evidences, key) in roomData.evidences" :key="key">
      <div class="weui-cells__title weui-flex">
        <div class="weui-flex__item">{{key}}</div>
        <div class="weui-flex__item weui-cell__ft">
          <button class="weui-btn" type="primary" size="mini" @click="findEvidence(key)">搜证</button>
        </div>
      </div>
      <div class="weui-cells weui-cells_after-title">
        <div class="weui-cell" v-for="(evidence, index) in evidences" :key="index">
          <div class="weui-cell__bd">
            <div class="weui-flex">
              <span class="weui-flex__item">{{evidence.msg}}</span>
              <span v-if="evidence.deeper" class="weui-flex__item weui-cell__ft"><button class="weui-btn" type="default" size="mini" @click="findEvidence(evidence.msg)">深入</button></span>
            </div>
            <div class="weui-flex weui-cell" v-if="evidence.deeper" v-for="(ev, i) in evidence.evidences" :key="i">
              <span class="weui-flex__item">{{ev.msg}}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    name: "FindEvidence",
    props: ["roomData"],
    methods: {
      findEvidence: function(key) {
        this.$socket = this.$store.socket
        this.$socket.emit("find-evidence", {
          room: this.roomData.id,
          key: key
        })
      }
    }
  }
</script>

<style scoped>

</style>
