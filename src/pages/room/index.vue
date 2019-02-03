<template>
  <div id="app" class="row">
    <GameControl id="game-control" v-bind:intro="intro" v-bind:story="story" v-bind:roomData="roomData"></GameControl>
  </div>
</template>

<script>
  import io from '../../../node_modules/weapp.socket.io/dist/weapp.socket.io.js'
  import GameControl from '../../components/GameControl'

  export default {
    data() {
      return {
        roomData: {},
        story: '内容尚未开启',
        intro: '内容尚未开启',
      }
    },

    components: {
      GameControl
    },

    onShow() {
      // Connect to socket server
      this.$socket = this.$store.socket
      console.log("User shows, calling onShow handler ...")
      if (!this.$store.connected) {
        if (this.$socket) {
          console.log("Disconnecting existing socket connection ...")
          this.$socket.disconnect()
        }
        console.log("Connecting to socket server ...")
        this.$socket = io.connect("https://kunicloud.com")
        wx.showLoading({
          title: "正在连接服务器"
        })
        // setup
        this.$socket.on('connect', () => {
          this.$store.connected = true
          console.log("Connected to socket server")
          this.$socket.emit('join-room', this.$store.user_info)
          wx.showLoading({
            title: "正在加入房间"
          })
        })

        this.$socket.on('disconnect', () => {
          this.$store.connected = false
        })

        this.$socket.on('room-update', res => {
          console.log("Received room updates")
          this.roomData = res.roomData;
        })

        this.$socket.on('join-room', res => {
          let { status, message } = res;
          if (status === 1) {
            console.log("Successfully joined a room");
            wx.hideLoading()
            wx.showToast({
              title: '成功加入房间',
              icon: 'success',
              duration: 2000
            })
          } else {
            console.log("Failed to join a room");
            console.log(message);
            wx.showToast({
              title: "失败：" + message,
              icon: 'none',
              duration: 2000
            })
            // disconnect socket server
            console.log("Closing socket connection ... ")
            this.$socket.disconnect()
            setTimeout(() => {
              wx.navigateTo({
                url: "../index/main"
              })
            }, 2000)
          }
        })
        this.$socket.on('story', data => {
          console.log("Receive story")
          this.story = data.story
          wx.showToast({
            title: '人物剧本已开启',
            icon: 'success',
            duration: 2000
          })
        })

        this.$socket.on('intro', data => {
          console.log("Receive intro")
          this.intro = data.story
        })

        this.$socket.on('game-update', data => {
          console.log("Receive game update")
          let {msg} = data
          wx.showToast({
            title: msg,
            icon: 'success',
            duration: 2000
          })
        })

        this.$store.socket = this.$socket
      }
    },
    onHide() {
      this.$socket = this.$store.socket
      console.log("User minimizes, calling onHide handler ...")
      this.$socket.emit('on-hide', this.$store.user_info)
    }
  }
</script>

<style scoped>

</style>
