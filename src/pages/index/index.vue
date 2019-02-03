<template>
  <div class="container">
    <div class="userinfo">
      <img class="userinfo-avatar" v-if="userInfo.avatarUrl" :src="userInfo.avatarUrl" background-size="cover" />
      <div class="userinfo-nickname">
        <p :text="userInfo.nickName"></p>
      </div>
    </div>
    <div class="weui-cells__title">剧本测试</div>
    <div class="weui-cells weui-cells_after-title">
      <div class="weui-cell weui-cell_input">
        <div class="weui-cell__hd">
          <div class="weui-label">用户名</div>
        </div>
        <div class="weui-cell__bd">
          <input class="weui-input" placeholder="请输入用户名" v-model="username"/>
        </div>
      </div>
      <div class="weui-cell weui-cell_input">
        <div class="weui-cell__hd">
          <div class="weui-label">房间号</div>
        </div>
        <div class="weui-cell__bd">
          <input class="weui-input" placeholder="请输入房间号" v-model="room"/>
        </div>
      </div>
      <div class="weui-cell weui-cell_input">
        <div class="weui-cell__hd">
          <div class="weui-label">房间密码</div>
        </div>
        <div class="weui-cell__bd">
          <input class="weui-input" v-model="passcode" placeholder="请输入房间密码" />
        </div>
      </div>
      <div class="weui-btn-area">
        <button class="weui-btn" type="primary" @click="joinRoom">加入</button>
      </div>
    </div>
  </div>
</template>

<script>
  export default {
    data () {
      return {
        userInfo: {},
        username: "",
        room: null,
        passcode: null,
      }
    },
    methods: {
      getUserInfo() {
        // 调用登录接
        wx.login({
          success: () => {
            wx.getUserInfo({
              success: (res) => {
                this.userInfo = res.userInfo
                this.username = this.userInfo.nickName
              }
            })
          }
        })
      },
      joinRoom() {
        let user_info = {
          username: this.username,
          passcode: this.passcode,
          room: this.room
        };
        console.log(user_info)
        this.$store.user_info = user_info // update store
        wx.navigateTo({
          url: "../room/main"
        })
      },
    },
    created() {
      // 调用应用实例的方法获取全局数据
      this.getUserInfo()
    }
  }
</script>

<style scoped>
  .userinfo {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .userinfo-avatar {
    width: 128rpx;
    height: 128rpx;
    margin: 20rpx;
    border-radius: 50%;
  }

  .userinfo-nickname {
    color: #aaa;
  }

</style>
