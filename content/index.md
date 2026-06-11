---
title: About
---
<img class="about-image" id="daily-photo" src="photos/3.jpg" alt="">

<div id="about-lightbox">
  <img id="about-lightbox-img" src="" alt="">
</div>

<script>
(function () {
  var img = document.getElementById("daily-photo");
  if (img) img.src = "photos/3.jpg";

  var lightbox = document.getElementById("about-lightbox");
  var lightboxImg = document.getElementById("about-lightbox-img");

  img.addEventListener("dblclick", function () {
    lightboxImg.src = img.src;
    lightbox.classList.add("active");
  });

  lightbox.addEventListener("click", function () {
    lightbox.classList.remove("active");
  });
})();
</script>

你好！
欢迎来到我的个人网站。

这里会慢慢堆积起很多东西。
它们可能是日记，  
可能是对于爱与正义的思考，
可能是一些杂学考究，
可能是对喜欢的作品的随想，
偶尔也有可能是情绪片段。

我不知道这些文字最终会被谁读到，  
但我不希望它们脱离原本的语境，
因为有些东西一旦被带走，  
好像就会慢慢变得不像原来的样子。
所以至少在这里，  
它们可以只是安静地存在着。