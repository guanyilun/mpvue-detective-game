<template>
  <div class="page">
    <div class="page__bd">
      <div class="weui-tab">
        <div class="weui-navbar">
          <block v-for="(item,index) in tabs" :key="index">
            <div :id="index" :class="{'weui-bar__item_on':activeIndex == index}" class="weui-navbar__item" @click="tabClick">1
              <div class="weui-navbar__title">{{item}}</div>
            </div>
          </block>
        </div>
        <div class="weui-tab__panel">
          <div class="weui-tab__content" :hidden="activeIndex != 0">
            <div class="weui-cells__title">房间号</div>
            <div class="weui-cells weui-cells_after-title">
              <div class="weui-cell">
                <div class="weui-cell__bd">{{roomData.id}}</div>
                <div class="weui-cell__ft">主持人： {{roomData.host}}</div>
              </div>
            </div>
            <div class="weui-cells__title">玩家</div>
            <div class="weui-cells weui-cells_after-title">
              <div class="weui-cell" v-for="(player, p) in roomData.players" :key="p">
                <div class="weui-cell__bd"> {{player.username}}</div>
                <div class="weui-cell__ft" v-if="player.role !== ''">饰：{{player.role}}</div>
              </div>
            </div>
          </div>
          <div class="weui-tab__content" :hidden="activeIndex != 1"><div class="weui-article"><wxParse :content="intro"></wxParse></div></div>
          <div class="weui-tab__content" :hidden="activeIndex != 2"><div class="weui-article" v-if="roomData.stage<1">内容尚未开启</div><CharacterStory v-else="roomData.stage<1" v-bind:story="story"></CharacterStory></div>
          <div class="weui-tab__content" :hidden="activeIndex != 3"><div class="weui-article" v-if="roomData.stage<2">内容尚未开启</div><FindEvidence v-else="roomData.stage<2" v-bind:roomData="roomData"></FindEvidence></div>
          <div class="weui-tab__content" :hidden="activeIndex != 4"><div class="weui-article" v-if="roomData.stage<3">内容尚未开启</div><Votes v-else="roomData.stage<3" v-bind:roomData="roomData"></Votes></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import wxParse from 'mpvue-wxparse'
  import CharacterStory from "./CharacterStory";
  import FindEvidence from "./FindEvidence";
  import Votes from "./Votes";
  export default {
    name: "GameControl",
    components: {Votes, FindEvidence, CharacterStory, wxParse},
    props: ['story', 'roomData', 'intro'],
    data() {
      return {
        tabs: ["房间信息", "故事介绍", "人物故事", "搜证", "投票"],
        activeIndex: 0,
        fontSize: 30
      }
    },
    methods: {
      tabClick(e) {
        console.log(e);
        this.activeIndex = e.currentTarget.id;
      }
    }
  }
</script>

<style scoped>
  page,
  .page,
  .page__bd {
    height: 100%;
  }
  .page__bd {
    padding-bottom: 0;
  }
  .weui-tab__content {
    /*padding: 20px;*/
    text-align: justify;
  }
</style>
