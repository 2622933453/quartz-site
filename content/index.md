---
title: About
---
<img class="about-image" id="daily-photo" src="photos/1.jpg" alt="">
<script>
(function () {
  var images = ["photos/1.jpg", "photos/2.jpg", "photos/3.jpg", "photos/4.jpg", "photos/5.jpg", "photos/6.jpg", "photos/7.jpg", "photos/8.jpg", "photos/9.jpg", "photos/10.jpg", "photos/11.jpg"];
  var dayNum = Math.floor(Date.now() / 86400000);
  var img = document.getElementById("daily-photo");
  if (img) img.src = images[dayNum % images.length];
})();
</script>

你好！
欢迎来到我的个人网站。

这里会慢慢堆积起很多东西。
它们可能是日记，  
可能是对于爱与正义的思考，
可能是对存在与时间、自我与世界的探讨，
可能是我对喜欢的作品的感想，
偶尔也有可能是我的情绪片段。

我希望这里的内容能永远停留在这里，
外面的世界太快，也太复杂了，  
有些东西一旦被带走，  
好像就会慢慢变得不像原来的样子。

所以至少在这里，  
它们可以只是安静地存在着。